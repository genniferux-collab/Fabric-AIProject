import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import ChatComposer from "../chat-composer/index.jsx";
import OrangePurpleBeam from "../orange-purple-beam/index.jsx";
import useLiveMetrics from "./use-live-metrics.js";
import LiveMetricValue from "./live-metric-value.jsx";
import useAttentionAutoCollapse from "./use-attention-auto-collapse.js";
import "./index.css";

const assetRoot = "./assets/uploads/pixso-home/";
const tabs = [{label:"全部",filter:null},{label:"待您接管",filter:"manual"},{label:"处置中",filter:"processing"}];
const metricShortcuts = [{id:"inspection",glyph:"inspection",title:"网络配置检查"},{id:"generation",glyph:"generation",title:"网络配置生成"},{id:"fault",glyph:"fault",title:"网络故障治理"}];
const inspectionLabels = [{id:"verification",label:"待验证"},{id:"analyzing",label:"分析中"},{id:"completed",label:"已完成"}];
const periods = ["最近三小时", "最近一天", "最近一周", "最近半个月"];

export default function DataCenterNetworkAgent({onOpenAgent,onFocusEvent,onBlurEvent,focusedEventId}) {
  const {networkTasks,openNetworkTask}=useApp();
  const events=networkTasks.events.filter(event=>event.status!=="completed");
  const liveMetrics=useLiveMetrics();
  const inspectionStates=inspectionLabels.map(status=>({...status,value:liveMetrics.inspection[status.id]}));
  const inspectionTotal=inspectionStates.reduce((total,status)=>total+status.value,0);
  const inspectionDescription=inspectionStates.map(status=>`${status.label}${status.value}`).join("，");
  const [activeTab,setActiveTab]=useState(0);
  const [attentionBeam,setAttentionBeam]=useState(null);
  const attentionBeamTimer=useRef(null);
  const [metricsCollapsed,setMetricsCollapsed]=useState(false);
  const [focusedMetric,setFocusedMetric]=useState(null);
  const eventsRef=useRef(null);
  const attentionRef=useRef(null);
  const attentionScroll=useAttentionAutoCollapse({collapsed:metricsCollapsed,onCollapse:()=>setMetricsCollapsed(true),onExpand:()=>setMetricsCollapsed(false),scrollRef:attentionRef});
  const metricsExpandRef=useRef(null);
  const collapseMetrics=()=>{attentionScroll.protectManualToggle(attentionRef.current?.scrollTop||0);setMetricsCollapsed(true);requestAnimationFrame(()=>metricsExpandRef.current?.focus({preventScroll:true}));};
  const expandMetrics=(id=null)=>{attentionScroll.protectManualToggle(attentionRef.current?.scrollTop||0);setMetricsCollapsed(false);setFocusedMetric(id);requestAnimationFrame(()=>document.getElementById(id?`fabric-home-metric-${id}`:"fabric-home-collapse-metrics")?.focus({preventScroll:true}));};
  const [period,setPeriod]=useState("最近一周");
  const [periodOpen,setPeriodOpen]=useState(false);
  const periodRef=useRef(null);
  useEffect(()=>{
    if(!periodOpen)return;
    const close=(event)=>{if(event.type==="keydown" ? event.key==="Escape" : !periodRef.current?.contains(event.target))setPeriodOpen(false);};
    document.addEventListener("pointerdown",close);document.addEventListener("keydown",close);
    return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",close);};
  },[periodOpen]);
  useEffect(()=>()=>clearTimeout(attentionBeamTimer.current),[]);
  const selectAttentionTab=(index)=>{
    setActiveTab(index);
    setAttentionBeam(index);
    clearTimeout(attentionBeamTimer.current);
    attentionBeamTimer.current=setTimeout(()=>setAttentionBeam(null),1600);
  };
  const filtered=events.filter(event=>!tabs[activeTab].filter||event.status===tabs[activeTab].filter);
  useAttentionEventMotion({listRef:eventsRef,scrollRef:attentionRef,events:filtered,activeTab,metricsCollapsed});
  return <div className="fabric-home-sidebar">
    <header className="fabric-home-header">
      <h1>DCN网络智能体</h1>
      <div className="fabric-home-period-wrap" ref={periodRef}>
        <button type="button" className="fabric-home-period" aria-label="时间范围" aria-expanded={periodOpen} aria-haspopup="listbox" onClick={()=>setPeriodOpen(!periodOpen)}>{period}<span className={`fabric-home-caret${periodOpen?" is-open":""}`}><img src={`${assetRoot}period.svg`} alt="" /></span></button>
        {periodOpen&&<div className="fabric-home-period-menu" role="listbox" aria-label="时间范围">{periods.map(option=><button type="button" role="option" aria-selected={period===option} key={option} onClick={()=>{setPeriod(option);setPeriodOpen(false);}}>{option}</button>)}</div>}
      </div>
    </header>
    <div className="fabric-home-content" onWheel={attentionScroll.onWheel}>
      <section className="fabric-home-intro" aria-label="网络守护概览">
        <h2>NetMaster正在进行网络守护</h2>
        <p>本周累计生成<b><LiveMetricValue value={liveMetrics.generatedTotal}/></b>个工作流，<b><LiveMetricValue value={liveMetrics.runningTotal}/></b>个正在处置中，<b><LiveMetricValue value={liveMetrics.completedTotal}/></b>个已处置</p>
        <img src={`${assetRoot}summary-art.png`} alt="" draggable="false" />
      </section>
      <section className={`fabric-home-metrics${metricsCollapsed?" is-collapsed":""}`} aria-label="网络运行指标">
        <div className="fabric-home-metrics-header">
        <div className="fabric-home-metric-capsule" aria-label="已收起的指标卡片" aria-hidden={!metricsCollapsed} inert={!metricsCollapsed?"":undefined}>
          <div className="fabric-home-metric-shortcuts">{metricShortcuts.map(metric=><button type="button" key={metric.id} className={`fabric-home-metric-shortcut${focusedMetric===metric.id?" is-selected":""}`} aria-label={`展开并聚焦${metric.title}`} aria-controls="fabric-home-metric-cards" aria-expanded="false" aria-describedby={`fabric-home-tip-${metric.id}`} onClick={()=>expandMetrics(metric.id)}><img src={`${assetRoot}${metric.glyph}.svg`} alt=""/><span className="fabric-home-metric-tooltip" role="tooltip" id={`fabric-home-tip-${metric.id}`}>{metric.title}</span></button>)}</div>
          <button type="button" className="fabric-home-metrics-expand" ref={metricsExpandRef} aria-label="展开指标卡片" aria-expanded="false" aria-controls="fabric-home-metric-cards" onClick={()=>expandMetrics()}><img src={`${assetRoot}metrics-chevron.svg`} alt=""/></button>
        </div>
        <div className="fabric-home-metrics-toolbar" aria-hidden={metricsCollapsed} inert={metricsCollapsed?"":undefined}><h2 className="fabric-home-metrics-title">技能统计</h2><button type="button" className="fabric-home-metrics-collapse" id="fabric-home-collapse-metrics" aria-label="收起指标卡片" title="收起指标卡片" aria-expanded={!metricsCollapsed} aria-controls="fabric-home-metric-cards" onClick={collapseMetrics}><img src={`${assetRoot}metrics-chevron.svg`} alt=""/></button></div>
        </div>
        <div className="fabric-home-stats-reveal" aria-hidden={metricsCollapsed} inert={metricsCollapsed?"":undefined}><div className="fabric-home-stats-clip">
        <div className="fabric-home-stats" id="fabric-home-metric-cards">
          <button type="button" id="fabric-home-metric-inspection" className={`fabric-home-stat fabric-home-inspection${focusedMetric==="inspection"?" is-selected":""}`} onClick={onOpenAgent} aria-label={`网络配置检查，总任务数${inspectionTotal}，${inspectionDescription}，打开AI对话`}>
            <h3><img src={`${assetRoot}inspection.svg`} alt=""/>网络配置检查</h3>
            <div className="fabric-home-inspection-detail"><div className="fabric-home-inspection-total"><strong><LiveMetricValue value={inspectionTotal} minDigits={2}/></strong><span>总任务数</span></div><div className="fabric-home-inspection-distribution"><div className="fabric-home-inspection-track"><div className="fabric-home-inspection-bar" role="img" aria-label={`任务分布：${inspectionDescription}`}>{inspectionStates.map(status=><span key={status.id} className={status.id} style={{flex:status.value}}/>)}</div></div><ul aria-label="配置检查任务状态">{inspectionStates.map(status=><li key={status.id}><i className={status.id}/><span>{status.label}</span><b><LiveMetricValue value={status.value}/></b></li>)}</ul></div></div>
            <HomeCardBeam duration={6.8}/>
          </button>
          <Stat glyph="generation" title="网络配置生成" primary={liveMetrics.generation.processing} secondary={liveMetrics.generation.completed} note="处理中 / 处理完成" selected={focusedMetric==="generation"} onClick={onOpenAgent} beamDuration={7.6}/>
          <Stat glyph="fault" title="网络故障治理" primary={liveMetrics.fault.processing} secondary={liveMetrics.fault.completed} note="进行中 / 处理完成" selected={focusedMetric==="fault"} onClick={onOpenAgent} beamDuration={8.4}/>
        </div>
        </div></div>
      </section>
      <section className="fabric-home-attention" ref={attentionRef} tabIndex={0} aria-labelledby="fabric-home-attention-heading" onScroll={attentionScroll.onScroll} onKeyDown={attentionScroll.onKeyDown} onTouchStart={attentionScroll.onTouchStart} onTouchMove={attentionScroll.onTouchMove} onPointerDown={attentionScroll.onPointerDown}>
        <div className="fabric-home-section-title"><h2 id="fabric-home-attention-heading">待您关注</h2><a role="button" tabIndex={0} onClick={onOpenAgent} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onOpenAgent?.();}}}>更多</a></div>
        <div className="fabric-home-tabs" role="tablist" aria-label="关注任务状态" style={{"--active-tab":activeTab}}><span className="fabric-home-tabs-indicator" aria-hidden="true"/>{tabs.map((tab,index)=><button type="button" key={tab.label} role="tab" id={`fabric-home-tab-${index}`} aria-controls="fabric-home-events" aria-selected={activeTab===index} className={activeTab===index?"is-active":""} onClick={()=>selectAttentionTab(index)}>{tab.label}<b className={tab.filter||""}>{events.filter(event=>!tab.filter||event.status===tab.filter).length}</b>{attentionBeam===index&&<OrangePurpleBeam className="fabric-home-tab-beam" duration={4.8} borderRadius={20} strength={.84}/>}</button>)}</div>
        <div className="fabric-home-events" id="fabric-home-events" ref={eventsRef} role="tabpanel" aria-labelledby={`fabric-home-tab-${activeTab}`}>
          {filtered.map(event=><button className={`fabric-home-event${event.status==="manual"?" is-priority":""}${focusedEventId===event.id?" is-map-focused":""}`} type="button" key={event.id} data-task-id={event.id} data-center-id={event.centerId||"all"} data-event-status={event.status} onMouseEnter={()=>onFocusEvent?.(event)} onMouseLeave={()=>onBlurEvent?.(event)} onFocus={()=>onFocusEvent?.(event)} onBlur={()=>onBlurEvent?.(event)} onClick={()=>openNetworkTask(event.id)}>
            <div className="fabric-home-event-head"><img src={event.status==="completed"?"./assets/uploads/pixso-site-tips/icons/completed.svg":`${assetRoot}${event.status==="manual"?"manual":"robot"}.svg`} alt=""/><b title={event.title}>{event.title}</b>{event.reviewLabel&&<span className="fabric-home-event-review-state">{event.reviewLabel}</span>}{event.status==="completed"&&<span className="fabric-home-event-completed">已完成</span>}</div>
            <p className="fabric-home-event-body">{event.location&&<><span className="fabric-home-location"><img src={`${assetRoot}pin.svg`} alt=""/>{event.location}</span>{"  "}</>}{event.detail}</p>
          </button>)}
        </div>
      </section>
    </div>
    <ChatComposer onOpen={onOpenAgent}/>
  </div>;
}

function HomeCardBeam({duration}){
  return <OrangePurpleBeam className="fabric-home-border-beam" duration={duration+1.8}/>;
}

function Stat({glyph,title,primary,secondary,note,alert,selected,onClick,beamDuration}){
  const vertical=`${primary}/${secondary}`.length>8;
  return <button type="button" id={`fabric-home-metric-${glyph}`} className={`fabric-home-stat${vertical?" is-vertical":""}${selected?" is-selected":""}`} onClick={onClick}>
    <h3><img src={`${assetRoot}${glyph}.svg`} alt=""/>{title}</h3>
    <div className="fabric-home-stat-detail"><strong><span className={alert?"is-alert":""}><LiveMetricValue value={primary}/></span><i>/</i><LiveMetricValue value={secondary}/></strong><p>{note}{alert&&<img src={`${assetRoot}info.svg`} alt="告警数量 / 合规数量" title="告警数量 / 合规数量"/>}</p></div>
    <HomeCardBeam duration={beamDuration}/>
  </button>;
}

// Animate task changes in the list's own coordinates, never the sidebar's moving frame.
function useAttentionEventMotion({listRef,scrollRef,events,activeTab,metricsCollapsed}){
  const motion=useRef({snapshot:null,quietUntil:0,animations:new Set()});
  const sequence=JSON.stringify(events.map(event=>event.id));
  const cancelMotion=()=>{for(const animation of motion.current.animations)animation.cancel();motion.current.animations.clear();};
  useEffect(()=>{
    const list=listRef.current,scroller=scrollRef.current;
    if(!list||!scroller)return;
    const markReading=()=>{motion.current.quietUntil=performance.now()+300;cancelMotion();};
    const markKey=event=>{if(["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "].includes(event.key))markReading();};
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPreference=()=>{if(preference.matches)cancelMotion();};
    scroller.addEventListener("scroll",markReading,{passive:true});
    scroller.addEventListener("wheel",markReading,{passive:true});
    scroller.addEventListener("touchstart",markReading,{passive:true});
    scroller.addEventListener("keydown",markKey);
    preference.addEventListener("change",onPreference);
    return()=>{
      scroller.removeEventListener("scroll",markReading);scroller.removeEventListener("wheel",markReading);
      scroller.removeEventListener("touchstart",markReading);scroller.removeEventListener("keydown",markKey);
      preference.removeEventListener("change",onPreference);cancelMotion();
    };
  },[listRef,scrollRef]);
  useLayoutEffect(()=>{
    const list=listRef.current,scroller=scrollRef.current;
    if(!list||!scroller)return;
    const current=motion.current,previous=current.snapshot,now=performance.now();
    const nodes=Array.from(list.children).filter(node=>node.dataset.taskId);
    const scrollTop=scroller.scrollTop-list.offsetTop,height=scroller.clientHeight;
    const positions=new Map(nodes.map(node=>[node.dataset.taskId,{top:node.offsetTop,height:node.offsetHeight}]));
    current.snapshot={sequence,activeTab,metricsCollapsed,positions,scrollTop,width:list.clientWidth,height};
    cancelMotion();
    if(!previous)return;
    if(previous.activeTab!==activeTab||previous.metricsCollapsed!==metricsCollapsed){current.quietUntil=now+650;return;}
    if(previous.sequence===sequence||now<current.quietUntil||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    // No large compensation after reading scrolls, viewport changes or multi-row reorderings.
    if(Math.abs(previous.scrollTop-scrollTop)>1||previous.width!==list.clientWidth)return;
    const visible=(position,scrollTop,height)=>position.top+position.height>scrollTop&&position.top<scrollTop+height;
    const animate=(node,keyframes,duration)=>{
      if(typeof node.animate!=="function")return;
      const animation=node.animate(keyframes,{duration,easing:"cubic-bezier(.2,.6,.3,1)",fill:"none"});
      current.animations.add(animation);
      animation.onfinish=()=>current.animations.delete(animation);
      animation.oncancel=()=>current.animations.delete(animation);
    };
    for(const node of nodes){
      const position=positions.get(node.dataset.taskId),before=previous.positions.get(node.dataset.taskId);
      if(!visible(position,scrollTop,height))continue;
      if(!before){animate(node,[{opacity:0,transform:"translateY(2px)"},{opacity:1,transform:"translateY(0)"}],300);continue;}
      const distance=before.top-position.top;
      if(Math.abs(distance)<1||Math.abs(distance)>Math.min(180,height*.5)||!visible(before,previous.scrollTop,previous.height))continue;
      animate(node,[{transform:`translateY(${distance}px)`},{transform:"translateY(0)"}],220);
    }
  },[sequence,activeTab,metricsCollapsed,listRef,scrollRef]);
}
