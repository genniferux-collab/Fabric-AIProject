import {useEffect,useLayoutEffect,useRef,useState} from "react";
import DataCenterNetworkAgent from "../../components/network-agent-dashboard/index.jsx";
import {useApp} from "../../context.jsx";
import EffectivenessMetrics from "../../components/effectiveness-metrics/index.jsx";
import MapNetworkOverlay from "../../components/map-network-overlay/index.jsx";
import "./index.css";
import "./event-map-glow.css";
import {referenceCenters} from "../../components/map-network-overlay/map-vector-layers.js";

import useMapNavigation from "./use-map-navigation.js";

const assetRoot="./assets/uploads/pixso-home-map/";
const MAP_WIDTH=1354.487061,MAP_HEIGHT=1000.278442;
export default function Cockpit(){
  const {openAgentHome,taskEntry,networkTasks}=useApp();
  const [floatingRoot,setFloatingRoot]=useState(null),[eventFocus,setEventFocus]=useState(null);
  const hoverTimers=useRef({enter:null,leave:null});
  const [drillOrigin,setDrillOrigin]=useState({x:"50%",y:"50%"});
  const [gisOpen,setGisOpen]=useState(false),[mapView,setMapView]=useState("全国视图");
  const mapRef=useRef(null),metricsRef=useRef(null),gisRef=useRef(null);
  const {view,scene,isPanning,handlers,changeScale,reset:resetMap,focusCenters,focusSite,stopMotion,minZoom,maxZoom}=useMapNavigation(mapRef,metricsRef);
  const focusEvent=event=>{
    clearTimeout(hoverTimers.current.enter);clearTimeout(hoverTimers.current.leave);
    if(!referenceCenters.some(center=>center.id===event.centerId)){setEventFocus(null);return;}
    hoverTimers.current.enter=setTimeout(()=>setEventFocus(current=>current?.taskId===event.id?current:{taskId:event.id,centerId:event.centerId}),150);
  };
  const blurEvent=event=>{
    clearTimeout(hoverTimers.current.enter);clearTimeout(hoverTimers.current.leave);
    hoverTimers.current.leave=setTimeout(()=>setEventFocus(current=>current?.taskId===event.id?null:current),220);
  };
  useEffect(()=>()=>{clearTimeout(hoverTimers.current.enter);clearTimeout(hoverTimers.current.leave);},[]);
  useEffect(()=>{
    const center=referenceCenters.find(center=>center.id===eventFocus?.centerId);
    if(center)focusSite(center);
  },[eventFocus?.centerId,eventFocus?.taskId,focusSite]);
  useEffect(()=>{
    if(eventFocus&&!networkTasks.events.some(event=>event.id===eventFocus.taskId&&event.status!=="completed"))setEventFocus(null);
  },[networkTasks.events,eventFocus]);
  useEffect(()=>{if(taskEntry){clearTimeout(hoverTimers.current.enter);clearTimeout(hoverTimers.current.leave);setEventFocus(null);stopMotion();}},[taskEntry,stopMotion]);
  useEffect(()=>{
    if(!gisOpen)return;
    const close=event=>{if(event.type==="keydown"?event.key==="Escape":!gisRef.current?.contains(event.target))setGisOpen(false);};
    document.addEventListener("pointerdown",close);document.addEventListener("keydown",close);
    return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",close);};
  },[gisOpen]);
  useLayoutEffect(()=>{
    if(!taskEntry||taskEntry.phase!=="focusing")return;
    const map=mapRef.current,node=map?.querySelector(`.map-reference-hotspot[data-center-id="${taskEntry.centerId}"]`);
    if(!map||!node)return;
    const bounds=map.getBoundingClientRect(),site=node.getBoundingClientRect();
    setDrillOrigin({x:`${(site.left+site.width/2-bounds.left)/bounds.width*100}%`,y:`${(site.top+site.height/2-bounds.top)/bounds.height*100}%`});
  },[taskEntry]);
  const reset=()=>{resetMap();setMapView("全国视图");};
  return <main className="figma-network-page">
    <EffectivenessMetrics panelRef={metricsRef}/>
    <div className="figma-map" data-map-scale={view.scale.toFixed(4)} data-focused-center={eventFocus?.centerId||""} ref={mapRef} aria-label="可缩放的中国区域地图" {...handlers}>
      <div className="figma-map-edges" aria-hidden="true"/>
      <div className="figma-map-drilldown" style={{transformOrigin:`${drillOrigin.x} ${drillOrigin.y}`}}>
      <div className={`figma-map-canvas${isPanning?" is-panning":""}`} style={{transform:`translate(${view.x}px,${view.y}px) scale(${view.scale})`}}>
        <div className="figma-map-plane" style={{width:MAP_WIDTH*scene.scale,height:MAP_HEIGHT*scene.scale,left:scene.left,top:scene.top,"--source-map-scale":scene.scale}}>
          <div className="figma-map-vector-stack">
            <img className="figma-map-base" src={`${assetRoot}map-geography.svg`} alt="Pixso 原始中国地图、省界与地名" draggable="false"/>
          </div>
          <MapNetworkOverlay displayScale={scene.scale*view.scale} view={view} scene={scene} floatingRoot={floatingRoot} focusedEvent={eventFocus}/>
        </div>
      </div>
      </div>
      <div className="map-floating-layer" ref={setFloatingRoot} aria-label="站点信息悬浮层"/>
      <div className="figma-map-top-mask" style={{height:scene.maskHeight}} aria-hidden="true"/>
      <div className="map-gis-region" ref={gisRef}>
        <button type="button" className="map-gis-switch" aria-label="GIS 地图视图" aria-haspopup="menu" aria-expanded={gisOpen} onClick={()=>setGisOpen(!gisOpen)}><img src={`${assetRoot}gis.svg`} alt=""/></button>
        {gisOpen&&<div className="map-gis-menu" role="menu" aria-label="地图视图">{["全国视图","数据中心视图"].map(view=><button type="button" role="menuitemradio" aria-checked={mapView===view} key={view} onClick={()=>{if(view==="全国视图")reset();else{focusCenters();setMapView(view);}setGisOpen(false);}}>{view}</button>)}</div>}
      </div>
      <div className="figma-map-controls" aria-label="地图缩放控制">
        <button type="button" disabled={view.scale>=maxZoom} onClick={()=>changeScale(.2)} aria-label="放大地图"><img src={`${assetRoot}zoom-plus.svg`} alt=""/></button>
        <button type="button" disabled={view.scale<=minZoom} onClick={()=>changeScale(-.2)} aria-label="缩小地图"><img src={`${assetRoot}zoom-minus.svg`} alt=""/></button>
        <button type="button" onClick={reset} aria-label="重置地图视图"><img src={`${assetRoot}zoom-reset.svg`} alt=""/></button>
      </div>
    </div>
    <aside className="figma-dashboard"><DataCenterNetworkAgent onOpenAgent={openAgentHome} onFocusEvent={focusEvent} onBlurEvent={blurEvent} focusedEventId={eventFocus?.taskId}/></aside>
  </main>;
}
