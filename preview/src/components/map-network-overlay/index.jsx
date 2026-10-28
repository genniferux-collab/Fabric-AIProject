import {Fragment,useEffect,useRef,useState} from "react";
import {Popover} from "antd";
import {mapCenterDetails} from "../../mock/map-center-details.js";
import {useApp} from "../../context.jsx";
import SiteTaskTip,{SiteTaskCluster} from "../site-task-tip/index.jsx";
import {branchLayerSvg,connectionLayerSvg,referenceCenters} from "./map-vector-layers.js";
import {computeTipLifts} from "./tip-layout.js";
import "./index.css";

const MAP_WIDTH=1354.487061,MAP_HEIGHT=1000.278442;

const deviceTypes=[{id:"spine",label:"Spine"},{id:"leaf",label:"Leaf"},{id:"servers",label:"服务器"},{id:"firewalls",label:"防火墙"}];
const popupBody={body:{padding:0,background:"transparent",boxShadow:"none"}};
const popupContainer=trigger=>trigger.closest(".figma-map")||document.body;

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

export default function MapNetworkOverlay({displayScale=1}){
  const {networkTasks,openNetworkTask}=useApp();
  const [detailId,setDetailId]=useState(null),[eventListId,setEventListId]=useState(null);
  const listCloseTimer=useRef(null),listPinned=useRef(false);
  useEffect(()=>()=>clearTimeout(listCloseTimer.current),[]);
  const closeEvents=()=>{clearTimeout(listCloseTimer.current);listPinned.current=false;setEventListId(null);};
  const showEvents=(id,pinned=false)=>{clearTimeout(listCloseTimer.current);listPinned.current=pinned;setDetailId(null);setEventListId(id);};
  const keepEvents=()=>clearTimeout(listCloseTimer.current);
  const leaveEvents=()=>{clearTimeout(listCloseTimer.current);if(!listPinned.current)listCloseTimer.current=setTimeout(()=>setEventListId(null),240);};
  const openTask=id=>{setDetailId(null);closeEvents();openNetworkTask(id);};
  const tasksFor=center=>networkTasks.centers[center.id].runningTasks;
  const primaryTask=center=>tasksFor(center).find(task=>task.source==="workflow")||tasksFor(center)[0]||networkTasks.centers[center.id].activeTask;
  const visibleIds=referenceCenters.filter(center=>tasksFor(center).length||detailId===center.id).map(center=>center.id);
  const heightById=Object.fromEntries(referenceCenters.map(center=>[center.id,tasksFor(center).length>1?40:56]));
  const widthById=Object.fromEntries(referenceCenters.map(center=>[center.id,tasksFor(center).length>1?68:212]));
  const xOffsetById={};
  if(visibleIds.includes("jiading")&&visibleIds.includes("waigaoqiao")){
    const sourceGap=(referenceCenters.find(center=>center.id==="waigaoqiao").x-referenceCenters.find(center=>center.id==="jiading").x)*displayScale;
    const spread=Math.max(0,((widthById.jiading+widthById.waigaoqiao)/2+16-sourceGap)/2);
    xOffsetById.jiading=-spread;xOffsetById.waigaoqiao=spread;
  }
  const tipLifts=computeTipLifts(referenceCenters,visibleIds,displayScale,heightById,widthById,xOffsetById);
  const position=center=>({left:`${center.x/MAP_WIDTH*100}%`,top:`${center.y/MAP_HEIGHT*100}%`});
  return <div className="map-network-overlay" aria-label="数据中心、支行、连接线路与任务状态">
    <div className="map-network-vector map-network-branches" role="img" aria-label="精简展示的支行矢量节点" dangerouslySetInnerHTML={{__html:branchLayerSvg}}/>
    <div className="map-site-ai-layer" aria-hidden="true">{referenceCenters.filter(center=>networkTasks.centers[center.id].counts.running>0).map(center=><img key={center.id} className="map-site-ai-node" src="./assets/uploads/pixso-site-tips/animations/site-ai-processing.gif" alt="" data-center-id={center.id} style={position(center)}/>)}</div>
    <div className="map-network-vector map-network-connections" role="img" aria-label="聚焦的数据中心与支行关系、原稿建筑图标及名称" dangerouslySetInnerHTML={{__html:connectionLayerSvg}}/>
    <div className="map-network-hit-layer" aria-label="数据中心交互热点">
      {referenceCenters.map(center=><Fragment key={center.id}>
        <Popover overlayClassName="map-site-popup" content={<div className="map-site-status-surface" style={{width:widthById[center.id],height:heightById[center.id]}}>{tasksFor(center).length>1?<SiteTaskCluster centerName={center.name} centerId={center.id} tasks={tasksFor(center)} running={networkTasks.centers[center.id].counts.running>0} onOpen={()=>showEvents(center.id,true)} onPeek={()=>showEvents(center.id)} onLeave={leaveEvents}/>:<SiteTaskTip centerName={center.name} centerId={center.id} task={primaryTask(center)} onOpen={openTask}/>}</div>}
          open={visibleIds.includes(center.id)} trigger={[]} placement="top" align={{offset:[xOffsetById[center.id]||0,-(tipLifts[center.id]||12)]}} autoAdjustOverflow arrow={false} color="transparent" styles={popupBody} getPopupContainer={popupContainer}>
          <span className="map-site-anchor" style={position(center)} aria-hidden="true"/>
        </Popover>
        <Popover overlayClassName="map-site-popup" content={<CenterInfoCard center={center} summary={networkTasks.centers[center.id]} onOpenTask={openTask} onClose={()=>setDetailId(null)}/>}
          open={detailId===center.id} onOpenChange={open=>{if(open){closeEvents();setDetailId(center.id);}else setDetailId(current=>current===center.id?null:current);}} trigger={["hover","focus"]} placement="right" align={{offset:[12,0]}} autoAdjustOverflow mouseEnterDelay={.22} mouseLeaveDelay={.2} arrow={false} color="transparent" styles={popupBody} getPopupContainer={popupContainer}>
          <button type="button" className={`map-reference-hotspot${detailId===center.id?" is-highlighted":""}`} style={position(center)} aria-label={`查看${center.name}数据中心`} aria-expanded={detailId===center.id} data-center-id={center.id} onClick={()=>{closeEvents();setDetailId(center.id);}} onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();setDetailId(null);closeEvents();}}}/>
        </Popover>
        <Popover overlayClassName="map-site-popup" content={<section className="map-dc-events-popup" aria-label={`${center.name}处置中事件`} onMouseEnter={keepEvents} onMouseLeave={leaveEvents} onWheel={event=>event.stopPropagation()}><header><h3>{center.name} · 处置中 {tasksFor(center).length}</h3><button type="button" className="map-dc-close" onClick={closeEvents}>关闭</button></header><div className="map-dc-task-list">{tasksFor(center).map(task=><SiteTaskTip key={task.id} task={task} centerName={center.name} onOpen={openTask}/>)}</div></section>}
          open={eventListId===center.id} trigger={[]} placement="right" align={{offset:[12,0]}} autoAdjustOverflow arrow={false} color="transparent" styles={popupBody} getPopupContainer={popupContainer}>
          <span className="map-site-anchor" style={position(center)} aria-hidden="true"/>
        </Popover>
      </Fragment>)}
    </div>
  </div>;
}
