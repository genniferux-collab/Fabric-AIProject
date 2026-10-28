import {useEffect,useRef,useState} from "react";

const MIN_ZOOM=.7,MAX_ZOOM=3,DEFAULT_MAP_MAGNIFICATION=1.15;
// Visible China outline in Pixso node 2:165206 (1354.487×1000.278 SVG).
const CHINA={left:0,top:16,right:1354.487,bottom:992,cx:677.244,cy:504};
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const initialView={scale:1,x:0,y:0};

// Keep a meaningful part of the source geography in view, including at minimum zoom.
function constrain(view,scene){
  if(!scene.width)return view;
  const bounds=[
    [scene.left+CHINA.left*scene.scale,scene.left+CHINA.right*scene.scale,0,scene.width],
    [scene.top+CHINA.top*scene.scale,scene.top+CHINA.bottom*scene.scale,scene.bottom,scene.height]
  ];
  const offsets=bounds.map(([start,end,near,far],axis)=>{
    const padding=Math.min(64,(far-near)*.12);
    let min=far-padding-end*view.scale,max=near+padding-start*view.scale;
    if(min>max){const middle=(min+max)/2;min=middle-padding;max=middle+padding;}
    return clamp(axis===0?view.x:view.y,min,max);
  });
  return {...view,x:offsets[0],y:offsets[1]};
}

export default function useMapNavigation(mapRef,metricsRef){
  const [view,setView]=useState(initialView),[isPanning,setIsPanning]=useState(false);
  const [scene,setScene]=useState({scale:1,left:-274,top:-120,maskHeight:224,width:1280,height:1032,bottom:154});
  const state=useRef({view:initialView,scene}),pointers=useRef(new Map()),gesture=useRef(null);
  const apply=next=>{const bounded=constrain(next,state.current.scene);state.current.view=bounded;setView(bounded);};
  const zoom=(scale,point)=>{
    const current=state.current.view,s=state.current.scene;
    const anchor=point||{x:s.width/2,y:(s.bottom+s.height)/2};
    const nextScale=clamp(scale,MIN_ZOOM,MAX_ZOOM),ratio=nextScale/current.scale;
    apply({scale:nextScale,x:anchor.x-(anchor.x-current.x)*ratio,y:anchor.y-(anchor.y-current.y)*ratio});
  };
  useEffect(()=>{
    const map=mapRef.current;
    const fit=()=>{
      const width=map.clientWidth,height=map.clientHeight,bottom=24+(metricsRef.current?.offsetHeight||130);
      const padding=24,areaHeight=Math.max(1,height-bottom-2*padding);
      const scale=Math.max(.05,Math.min(Math.max(1,width-2*padding)/(CHINA.right-CHINA.left),areaHeight/(CHINA.bottom-CHINA.top)))*DEFAULT_MAP_MAGNIFICATION;
      const next={scale,left:width/2-CHINA.cx*scale,top:(bottom+height)/2-CHINA.cy*scale,maskHeight:bottom+padding,width,height,bottom};
      const previous=state.current.scene,current=state.current.view;
      state.current.scene=next;setScene(next);
      if(current.scale!==1||current.x||current.y){
        // Preserve the user's geographic focus when resizing; the default view stays centered.
        const sourceX=((previous.width/2-current.x)/current.scale-previous.left)/previous.scale;
        const sourceY=(((previous.bottom+previous.height)/2-current.y)/current.scale-previous.top)/previous.scale;
        apply({...current,x:width/2-(next.left+sourceX*scale)*current.scale,y:(bottom+height)/2-(next.top+sourceY*scale)*current.scale});
      }
      pointers.current.clear();gesture.current=null;setIsPanning(false);
    };
    const observer=new ResizeObserver(fit);observer.observe(map);observer.observe(metricsRef.current);fit();
    const wheel=event=>{
      if(event.target.closest("button,[role=menu],.map-dc-card,.map-dc-events-popup,.site-task-tip"))return;
      event.preventDefault();
      const rect=map.getBoundingClientRect(),delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?rect.height:1);
      zoom(state.current.view.scale*Math.exp(-clamp(delta,-160,160)*.002),{x:event.clientX-rect.left,y:event.clientY-rect.top});
    };
    map.addEventListener("wheel",wheel,{passive:false});
    return()=>{observer.disconnect();map.removeEventListener("wheel",wheel);};
  },[]);
  const point=event=>{const rect=mapRef.current.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};};
  const rebase=()=>{
    const values=[...pointers.current.values()],current=state.current.view;
    if(!values.length){gesture.current=null;setIsPanning(false);return;}
    const center=values.length>1?{x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2}:values[0];
    gesture.current={view:current,center,distance:values.length>1?Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y):0};
    setIsPanning(true);
  };
  const release=event=>{pointers.current.delete(event.pointerId);rebase();};
  const handlers={
    onPointerDown:event=>{
      if(event.target.closest("button,[role=menu],.map-dc-card,.map-dc-events-popup,.site-task-tip")||event.button>0)return;
      pointers.current.set(event.pointerId,point(event));event.currentTarget.setPointerCapture(event.pointerId);rebase();
    },
    onPointerMove:event=>{
      if(!pointers.current.has(event.pointerId)||!gesture.current)return;
      pointers.current.set(event.pointerId,point(event));
      const values=[...pointers.current.values()],start=gesture.current;
      const center=values.length>1?{x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2}:values[0];
      const distance=values.length>1?Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y):0;
      const scale=start.distance?clamp(start.view.scale*distance/start.distance,MIN_ZOOM,MAX_ZOOM):start.view.scale,ratio=scale/start.view.scale;
      apply({scale,x:center.x-(start.center.x-start.view.x)*ratio,y:center.y-(start.center.y-start.view.y)*ratio});
    },
    onPointerUp:release,onPointerCancel:release,onLostPointerCapture:release,
    onDoubleClick:event=>{if(!event.target.closest("button,[role=menu],.map-dc-card,.map-dc-events-popup,.site-task-tip"))zoom(state.current.view.scale*1.4,point(event));}
  };
  return {view,scene,isPanning,handlers,minZoom:MIN_ZOOM,maxZoom:MAX_ZOOM,
    changeScale:amount=>zoom(state.current.view.scale+amount),
    reset:()=>{state.current.view=initialView;setView(initialView);},
    focusCenters:()=>{const s=state.current.scene;apply({scale:1.35,x:s.width/2-(s.left+980*s.scale)*1.35,y:(s.bottom+s.height)/2-(s.top+590*s.scale)*1.35});}
  };
}
