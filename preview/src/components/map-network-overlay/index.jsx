import {Fragment,useEffect,useLayoutEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {mapCenterDetails} from "../../mock/map-center-details.js";
import {useApp} from "../../context.jsx";
import SiteTaskTip,{SiteTaskCluster} from "../site-task-tip/index.jsx";
import {branchLayerSvg,connectionLayerSvg,referenceCenters} from "./map-vector-layers.js";
import {computeTipLifts} from "./tip-layout.js";
import {projectSite,fitPopup} from "./map-coordinates.js";
import "./index.css";

const MAP_WIDTH=1354.487061,MAP_HEIGHT=1000.278442;

const deviceTypes=[{id:"spine",label:"Spine"},{id:"leaf",label:"Leaf"},{id:"servers",label:"服务器"},{id:"firewalls",label:"防火墙"}];

function CenterInfoCard({center,summary,onOpenTask,onClose}){
  const detail=mapCenterDetails[center.id],deviceTotal=Object.values(detail.devices).reduce((total,value)=>total+value,0);
  return <section className="map-dc-card" aria-label={`${center.name}数据中心基本信息`} onPointerDown={event=>event.stopPropagation()} onDoubleClick={event=>event.stopPropagation()} onWheel={event=>event.stopPropagation()}>
    <header className="map-dc-card-header"><h3>{detail.name}<span>数据中心</span></h3><span className="map-dc-online"><i/>在线</span><button type="button" className="map-dc-close" onClick={onClose}>关闭</button></header>
    <div className={`map-dc-alarm${detail.alarms===0?" is-clear":""}`}><span>当前告警</span><strong>{detail.alarms}<small>项</small></strong></div>
    <section className="map-dc-tasks" aria-label="AI 任务执行状态">
      <h4>AI 任务执行状态<span>共 {summary.counts.total} 项</span></h4>
      <div className="map-dc-task-counts"><span>处置中<b>{summary.counts.processing}</b></span><span>待审阅<b>{summary.counts.awaitingReview}</b></span><span>已完成<b>{summary.counts.completed}</b></span></div>
      <div className="map-dc-task-list">{(summary.runningTasks.length?summary.runningTasks:[summary.activeTask].filter(Boolean)).map(task=><SiteTaskTip key={task.id} task={task} centerName={center.name} onOpen={onOpenTask} expanded/>)}</div>
    </section>
    <section className="map-dc-devices" aria-label="设备资源数量"><h4>设备资源<span>共 {deviceTotal} 台</span></h4><dl>{deviceTypes.map(type=><div key={type.id}><dd>{detail.devices[type.id]}</dd><dt>{type.label}</dt></div>)}</dl></section>
  </section>;
}

// Screen-space bodies track a projected geographic point on every camera frame.
function MapPopup({center,scene,view,displayScale,placement="top",size,offset,className="",kind,children}){
  const body=useRef(null),[measured,setMeasured]=useState(size);
  useLayoutEffect(()=>{
    if(!body.current)return;
    const observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;setMeasured(current=>Math.abs(current.width-r.width)<.5&&Math.abs(current.height-r.height)<.5?current:{width:r.width,height:r.height});});
    observer.observe(body.current);return()=>observer.disconnect();
  },[]);
  const point=projectSite(center,scene,view),radius=20*displayScale;
  const onScreen=point.x>=-radius&&point.x<=scene.width+radius&&point.y>=scene.bottom-radius&&point.y<=scene.height+radius;
  const layout=fitPopup(point,placement==="top"?size:measured,scene,radius,placement,offset);
  return <div className={"map-site-popup map-site-tracker "+className} data-center-id={center.id} data-popup-kind={kind} data-site-x={point.x.toFixed(3)} data-site-y={point.y.toFixed(3)} style={{transform:`translate3d(${point.x}px,${point.y}px,0)`,visibility:onScreen?"visible":"hidden"}}>
    <div className="map-popup-offset" style={{transform:`translate3d(${layout.x}px,${layout.y}px,0)`,width:layout.width,"--map-popup-max-height":`${Math.max(80,scene.height-scene.bottom-24)}px`}}><div ref={body} className="map-popup-body">{children}</div></div>
  </div>;
}

export default function MapNetworkOverlay({displayScale=1,scene,view,floatingRoot,focusedEvent}){
  const {networkTasks,openNetworkTask}=useApp();
  const [detailId,setDetailId]=useState(null),[eventListId,setEventListId]=useState(null);
  const listCloseTimer=useRef(null),listPinned=useRef(false),detailTimers=useRef({open:null,close:null}),detailPinned=useRef(false);
  useEffect(()=>()=>{clearTimeout(listCloseTimer.current);clearTimeout(detailTimers.current.open);clearTimeout(detailTimers.current.close);},[]);
  const closeEvents=()=>{clearTimeout(listCloseTimer.current);listPinned.current=false;setEventListId(null);};
  const closeDetail=()=>{clearTimeout(detailTimers.current.open);clearTimeout(detailTimers.current.close);detailPinned.current=false;setDetailId(null);};
  const showEvents=(id,pinned=false)=>{clearTimeout(listCloseTimer.current);listPinned.current=pinned;closeDetail();setEventListId(id);};
  const keepEvents=()=>clearTimeout(listCloseTimer.current);
  const leaveEvents=()=>{clearTimeout(listCloseTimer.current);if(!listPinned.current)listCloseTimer.current=setTimeout(()=>setEventListId(null),240);};
  const keepDetail=()=>clearTimeout(detailTimers.current.close);
  const leaveDetail=()=>{clearTimeout(detailTimers.current.open);clearTimeout(detailTimers.current.close);if(!detailPinned.current)detailTimers.current.close=setTimeout(()=>setDetailId(null),220);};
  const showDetail=(id,pinned=false)=>{
    keepDetail();clearTimeout(detailTimers.current.open);closeEvents();
    if(pinned){detailPinned.current=true;setDetailId(id);}
    else detailTimers.current.open=setTimeout(()=>{detailPinned.current=false;setDetailId(id);},180);
  };
  useEffect(()=>{
    const close=event=>{
      if(event.type==="keydown"&&event.key!=="Escape")return;
      if(event.type==="pointerdown"&&event.target.closest(".figma-map"))return;
      closeEvents();closeDetail();
    };
    document.addEventListener("pointerdown",close);document.addEventListener("keydown",close);
    return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",close);};
  },[]);
  useEffect(()=>{if(focusedEvent){closeDetail();closeEvents();}},[focusedEvent?.taskId]);
  const openTask=id=>{closeDetail();closeEvents();openNetworkTask(id);};
  const tasksFor=center=>networkTasks.centers[center.id].runningTasks;
  const focusedTask=networkTasks.tasks.find(task=>task.id===focusedEvent?.taskId);
  const highlighted=center=>center.id===focusedEvent?.centerId;
  const primaryTask=center=>highlighted(center)&&focusedTask?focusedTask:tasksFor(center).find(task=>task.source==="workflow")||tasksFor(center)[0]||networkTasks.centers[center.id].activeTask;
  const clustered=center=>tasksFor(center).length>1&&!highlighted(center);
  const visibleIds=referenceCenters.filter(center=>tasksFor(center).length||detailId===center.id||highlighted(center)).map(center=>center.id);
  const heightById=Object.fromEntries(referenceCenters.map(center=>[center.id,clustered(center)?40:56]));
  const widthById=Object.fromEntries(referenceCenters.map(center=>[center.id,clustered(center)?68:212]));
  const xOffsetById={};
  if(visibleIds.includes("jiading")&&visibleIds.includes("waigaoqiao")){
    const sourceGap=(referenceCenters.find(center=>center.id==="waigaoqiao").x-referenceCenters.find(center=>center.id==="jiading").x)*displayScale;
    const spread=Math.max(0,((widthById.jiading+widthById.waigaoqiao)/2+16-sourceGap)/2);
    xOffsetById.jiading=-spread;xOffsetById.waigaoqiao=spread;
  }
  const lifts=computeTipLifts(referenceCenters,visibleIds,displayScale,heightById,widthById,xOffsetById);
  const position=center=>({left:`${center.x/MAP_WIDTH*100}%`,top:`${center.y/MAP_HEIGHT*100}%`});
  const popups=referenceCenters.map(center=><Fragment key={center.id}>
    {visibleIds.includes(center.id)&&<MapPopup center={center} view={view} scene={scene} displayScale={displayScale} size={{width:widthById[center.id],height:heightById[center.id]}} offset={{x:xOffsetById[center.id]||0,y:lifts[center.id]||12}} kind="status" className={highlighted(center)?"is-focused":focusedEvent?"is-muted":""}>
      <div className="map-site-status-surface" key={highlighted(center)?focusedEvent.taskId:"summary"} style={{width:widthById[center.id],height:heightById[center.id]}}>{clustered(center)?<SiteTaskCluster centerName={center.name} centerId={center.id} tasks={tasksFor(center)} running={networkTasks.centers[center.id].counts.running>0} onOpen={()=>showEvents(center.id,true)} onPeek={()=>showEvents(center.id)} onLeave={leaveEvents}/>:<SiteTaskTip centerName={center.name} centerId={center.id} task={primaryTask(center)} onOpen={openTask}/>}</div>
    </MapPopup>}
    {detailId===center.id&&<MapPopup center={center} view={view} scene={scene} displayScale={displayScale} placement="right" size={{width:320,height:420}} kind="detail">
      <div onMouseEnter={keepDetail} onMouseLeave={leaveDetail} onFocusCapture={keepDetail} onBlurCapture={leaveDetail}><CenterInfoCard center={center} summary={networkTasks.centers[center.id]} onOpenTask={openTask} onClose={closeDetail}/></div>
    </MapPopup>}
    {eventListId===center.id&&<MapPopup center={center} view={view} scene={scene} displayScale={displayScale} placement="right" size={{width:236,height:200}} kind="events">
      <section className="map-dc-events-popup" aria-label={`${center.name}处置中事件`} onMouseEnter={keepEvents} onMouseLeave={leaveEvents} onPointerDown={event=>event.stopPropagation()} onWheel={event=>event.stopPropagation()}><header><h3>{center.name} · 处置中 {tasksFor(center).length}</h3><button type="button" className="map-dc-close" onClick={closeEvents}>关闭</button></header><div className="map-dc-task-list">{tasksFor(center).map(task=><SiteTaskTip key={task.id} task={task} centerName={center.name} onOpen={openTask}/>)}</div></section>
    </MapPopup>}
  </Fragment>);
  return <div className="map-network-overlay" aria-label="数据中心、支行、连接线路与任务状态">
    <div className="map-network-vector map-network-branches" role="img" aria-label="精简展示的支行矢量节点" dangerouslySetInnerHTML={{__html:branchLayerSvg}}/>
    <div className="map-site-ai-layer" aria-hidden="true">{referenceCenters.filter(center=>networkTasks.centers[center.id].counts.running>0).map(center=><img key={center.id} className="map-site-ai-node" src="./assets/uploads/pixso-site-tips/animations/site-ai-processing-orbit.gif" alt="" data-center-id={center.id} style={position(center)}/>)}</div>
    <div className="map-network-vector map-network-connections" role="img" aria-label="聚焦的数据中心与支行关系、原稿建筑图标及名称" dangerouslySetInnerHTML={{__html:connectionLayerSvg}}/>
    <div className="map-network-hit-layer" aria-label="数据中心交互热点">{referenceCenters.map(center=><button key={center.id} type="button" className={`map-reference-hotspot${detailId===center.id||highlighted(center)?" is-highlighted":""}`} style={position(center)} aria-label={`查看${center.name}数据中心`} aria-expanded={detailId===center.id} data-center-id={center.id} onMouseEnter={()=>showDetail(center.id)} onMouseLeave={leaveDetail} onFocus={()=>showDetail(center.id)} onBlur={leaveDetail} onClick={()=>showDetail(center.id,true)} onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();closeDetail();closeEvents();}}}/>)}</div>
    {floatingRoot&&createPortal(popups,floatingRoot)}
  </div>;
}
