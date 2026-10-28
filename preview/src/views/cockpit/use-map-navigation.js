import {useCallback,useEffect,useRef,useState} from "react";
import {clamp,logicalMapPoint} from "../../components/map-network-overlay/map-coordinates.js";

const MIN_ZOOM=.7,MAX_ZOOM=3,DEFAULT_MAP_MAGNIFICATION=1.15;
const CHINA={left:0,top:16,right:1354.487,bottom:992,cx:677.244,cy:504};
const initialView={scale:1,x:0,y:0};
const mix=(a,b,t)=>({scale:a.scale+(b.scale-a.scale)*t,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const reduced=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function constrain(view,scene){
  if(!scene.width)return view;
  const bounds=[
    [scene.left+CHINA.left*scene.scale,scene.left+CHINA.right*scene.scale,0,scene.width],
    [scene.top+CHINA.top*scene.scale,scene.top+CHINA.bottom*scene.scale,scene.bottom,scene.height]
  ];
  const offsets=bounds.map(([start,end,near,far],axis)=>{
    const padding=Math.min(200,(far-near)*.2);
    let min=far-padding-end*view.scale,max=near+padding-start*view.scale;
    if(min>max){const middle=(min+max)/2;min=middle-padding;max=middle+padding;}
    return clamp(axis===0?view.x:view.y,min,max);
  });
  return {...view,x:offsets[0],y:offsets[1]};
}

export default function useMapNavigation(mapRef,metricsRef){
  const [view,setView]=useState(initialView),[isPanning,setIsPanning]=useState(false);
  const [scene,setScene]=useState({scale:1,left:-274,top:-120,maskHeight:224,width:1280,height:1032,bottom:154});
  const state=useRef({view:initialView,target:initialView,scene}),pointers=useRef(new Map()),gesture=useRef(null),motion=useRef({frame:0,mode:null});
  const commit=useCallback(next=>{state.current.view=next;setView(next);},[]);
  const stopMotion=useCallback(()=>{cancelAnimationFrame(motion.current.frame);motion.current={frame:0,mode:null};state.current.target=state.current.view;},[]);
  const apply=useCallback(next=>{const bounded=constrain(next,state.current.scene);state.current.target=bounded;commit(bounded);},[commit]);
  const animateTo=useCallback((next,duration=620)=>{
    stopMotion();
    const from=state.current.view,to=constrain(next,state.current.scene);state.current.target=to;
    if(reduced()){commit(to);return;}
    let started=null;
    motion.current.mode="camera";
    const tick=now=>{
      started??=now;
      const t=Math.min(1,(now-started)/duration),ease=t*t*t*(t*(t*6-15)+10);
      commit(mix(from,to,ease));
      if(t<1)motion.current.frame=requestAnimationFrame(tick);else motion.current={frame:0,mode:null};
    };
    motion.current.frame=requestAnimationFrame(tick);
  },[stopMotion,commit]);
  const dampTo=useCallback(next=>{
    const target=constrain(next,state.current.scene);
    if(reduced()){stopMotion();state.current.target=target;commit(target);return;}
    if(motion.current.mode!=="wheel")stopMotion();
    state.current.target=target;
    if(motion.current.mode==="wheel")return;
    motion.current.mode="wheel";
    let previous=performance.now();
    const tick=now=>{
      const current=state.current.view,to=state.current.target,dt=Math.min(48,now-previous);previous=now;
      const done=Math.abs(to.scale-current.scale)<.0001&&Math.hypot(to.x-current.x,to.y-current.y)<.08;
      commit(done?to:mix(current,to,1-Math.exp(-dt/72)));
      if(!done)motion.current.frame=requestAnimationFrame(tick);else motion.current={frame:0,mode:null};
    };
    motion.current.frame=requestAnimationFrame(tick);
  },[stopMotion,commit]);
  const zoom=useCallback((scale,point,wheel=false)=>{
    const current=state.current.target,s=state.current.scene,anchor=point||{x:s.width/2,y:(s.bottom+s.height)/2};
    const nextScale=clamp(scale,MIN_ZOOM,MAX_ZOOM),ratio=nextScale/current.scale;
    const next={scale:nextScale,x:anchor.x-(anchor.x-current.x)*ratio,y:anchor.y-(anchor.y-current.y)*ratio};
    if(wheel)dampTo(next);else animateTo(next,360);
  },[dampTo,animateTo]);
  const point=useCallback(event=>{const map=mapRef.current;return logicalMapPoint(event.clientX,event.clientY,map.getBoundingClientRect(),map.clientWidth,map.clientHeight);},[]);
  useEffect(()=>{
    const map=mapRef.current;
    const fit=()=>{
      stopMotion();
      const width=map.clientWidth,height=map.clientHeight,bottom=24+(metricsRef.current?.offsetHeight||130),padding=24,areaHeight=Math.max(1,height-bottom-2*padding);
      const scale=Math.max(.05,Math.min(Math.max(1,width-2*padding)/(CHINA.right-CHINA.left),areaHeight/(CHINA.bottom-CHINA.top)))*DEFAULT_MAP_MAGNIFICATION;
      const next={scale,left:width/2-CHINA.cx*scale,top:(bottom+height)/2-CHINA.cy*scale,maskHeight:bottom+padding,width,height,bottom};
      const previous=state.current.scene,current=state.current.view;state.current.scene=next;setScene(next);
      if(current.scale!==1||current.x||current.y){
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
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?map.clientHeight:1);
      zoom(state.current.target.scale*Math.exp(-clamp(delta,-160,160)*.002),point(event),true);
    };
    map.addEventListener("wheel",wheel,{passive:false});
    return()=>{observer.disconnect();map.removeEventListener("wheel",wheel);stopMotion();};
  },[stopMotion,apply,zoom,point]);
  const rebase=()=>{
    const values=[...pointers.current.values()],current=state.current.view;
    if(!values.length){gesture.current=null;setIsPanning(false);return;}
    const center=values.length>1?{x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2}:values[0];
    gesture.current={view:current,center,distance:values.length>1?Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y):0};setIsPanning(true);
  };
  const release=event=>{pointers.current.delete(event.pointerId);rebase();};
  const handlers={
    onPointerDown:event=>{
      if(event.target.closest("button,[role=menu],.map-dc-card,.map-dc-events-popup,.site-task-tip")||event.button>0)return;
      stopMotion();pointers.current.set(event.pointerId,point(event));event.currentTarget.setPointerCapture(event.pointerId);rebase();
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
    onDoubleClick:event=>{if(!event.target.closest("button,[role=menu],.map-dc-card,.map-dc-events-popup,.site-task-tip"))zoom(state.current.target.scale*1.4,point(event));}
  };
  const focusSite=useCallback(center=>{
    const s=state.current.scene,current=state.current.view,scale=Math.max(current.scale,1.65);
    animateTo({scale,x:s.width*.53-(s.left+center.x*s.scale)*scale,y:s.bottom+(s.height-s.bottom)*.57-(s.top+center.y*s.scale)*scale});
  },[animateTo]);
  return {view,scene,isPanning,handlers,minZoom:MIN_ZOOM,maxZoom:MAX_ZOOM,stopMotion,focusSite,
    changeScale:amount=>zoom(state.current.target.scale+amount),reset:()=>animateTo(initialView,480),
    focusCenters:()=>{const s=state.current.scene;animateTo({scale:1.35,x:s.width/2-(s.left+980*s.scale)*1.35,y:(s.bottom+s.height)/2-(s.top+590*s.scale)*1.35});}
  };
}
