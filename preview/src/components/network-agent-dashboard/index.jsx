import { useEffect, useRef, useState } from "react";
import ChatComposer from "../chat-composer/index.jsx";
import "./index.css";

const assetRoot = "./assets/uploads/pixso-home/";
const tabs = [{label:"全部",filter:null},{label:"人工待接管",filter:"manual"},{label:"处置中",filter:"processing"}];
const events = [
  {id:"core-check",status:"manual",title:"【周期检查】核心区交换机检查任务-2项不合规配置",location:"嘉定-核心区",detail:"2025-06-03 15:36｜检查到2项不合规项，请人工接管处置。"},
  {id:"business-check",status:"processing",title:"【周期检查】业务区核心交换机检查任务",location:"设备检查",detail:"2025-06-03 15:36｜对核心区设备，采用模板2，每周一凌晨2点检查。"},
  {id:"management-check",status:"processing",title:"【单次检查】带外管理区核心交换机检查任务",location:"设备检查",detail:"2025-06-03 15:36｜对核心区设备，采用模板2，每周一凌晨2点检查。"},
  {id:"leaf-expansion",status:"processing",title:"【设备扩容】嘉定DC的互联网区域的Leaf1-2设备扩容",detail:"【设备扩容】2025-06-03 15:36｜嘉定DC的互联网区域中的Leaf 1-2 设备需要进行扩容。"},
];
const metricShortcuts = [{id:"fault",glyph:"fault",title:"网络故障治理"},{id:"generation",glyph:"generation",title:"网络配置辅助生成"},{id:"inspection",glyph:"inspection",title:"网络配置检查"}];
const faultStates = [{id:"resolved",label:"已处置"},{id:"processing",label:"处置中"},{id:"automatic",label:"待自动处置"},{id:"manual",label:"待人工接管"},{id:"failed",label:"处置失败"}];
const periods = ["最近三小时", "最近一天", "最近一周", "最近半个月"];

export default function DataCenterNetworkAgent({onOpenAgent}) {
  const [activeTab,setActiveTab]=useState(0);
  const [metricsCollapsed,setMetricsCollapsed]=useState(false);
  const [focusedMetric,setFocusedMetric]=useState(null);
  const metricsExpandRef=useRef(null);
  const collapseMetrics=()=>{setMetricsCollapsed(true);requestAnimationFrame(()=>metricsExpandRef.current?.focus({preventScroll:true}));};
  const expandMetrics=(id=null)=>{setMetricsCollapsed(false);setFocusedMetric(id);requestAnimationFrame(()=>document.getElementById(id?`fabric-home-metric-${id}`:"fabric-home-collapse-metrics")?.focus({preventScroll:true}));};
  const [period,setPeriod]=useState("最近一周");
  const [periodOpen,setPeriodOpen]=useState(false);
  const periodRef=useRef(null);
  useEffect(()=>{
    if(!periodOpen)return;
    const close=(event)=>{if(event.type==="keydown" ? event.key==="Escape" : !periodRef.current?.contains(event.target))setPeriodOpen(false);};
    document.addEventListener("pointerdown",close);document.addEventListener("keydown",close);
    return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",close);};
  },[periodOpen]);
  const filtered=events.filter(event=>!tabs[activeTab].filter||event.status===tabs[activeTab].filter);
  return <div className="fabric-home-sidebar">
    <header className="fabric-home-header">
      <h1>DCN网络智能体</h1>
      <div className="fabric-home-period-wrap" ref={periodRef}>
        <button type="button" className="fabric-home-period" aria-label="时间范围" aria-expanded={periodOpen} aria-haspopup="listbox" onClick={()=>setPeriodOpen(!periodOpen)}>{period}<span className={`fabric-home-caret${periodOpen?" is-open":""}`}><img src={`${assetRoot}period.svg`} alt="" /></span></button>
        {periodOpen&&<div className="fabric-home-period-menu" role="listbox" aria-label="时间范围">{periods.map(option=><button type="button" role="option" aria-selected={period===option} key={option} onClick={()=>{setPeriod(option);setPeriodOpen(false);}}>{option}</button>)}</div>}
      </div>
    </header>
    <div className="fabric-home-content">
      <section className="fabric-home-intro" aria-label="网络守护概览">
        <h2>NetMaster正在进行网络守护</h2>
        <p>本周累计生成<b>295</b>个工作流，<b>4</b>个正在处置中，<b>290</b>个已处置</p>
        <img src={`${assetRoot}summary-art.png`} alt="" draggable="false" />
      </section>
      <section className={`fabric-home-metrics${metricsCollapsed?" is-collapsed":""}`} aria-label="网络运行指标">
        {metricsCollapsed&&<div className="fabric-home-metric-capsule" aria-label="已收起的指标卡片">
          <div className="fabric-home-metric-shortcuts">{metricShortcuts.map(metric=><button type="button" key={metric.id} className={`fabric-home-metric-shortcut${focusedMetric===metric.id?" is-selected":""}`} aria-label={`展开并聚焦${metric.title}`} aria-controls="fabric-home-metric-cards" aria-expanded="false" aria-describedby={`fabric-home-tip-${metric.id}`} onClick={()=>expandMetrics(metric.id)}><img src={`${assetRoot}${metric.glyph}.svg`} alt=""/><span className="fabric-home-metric-tooltip" role="tooltip" id={`fabric-home-tip-${metric.id}`}>{metric.title}</span></button>)}</div>
          <button type="button" className="fabric-home-metrics-expand" ref={metricsExpandRef} aria-label="展开指标卡片" aria-expanded="false" aria-controls="fabric-home-metric-cards" onClick={()=>expandMetrics()}><img src={`${assetRoot}metrics-chevron.svg`} alt=""/></button>
        </div>}
        <div className="fabric-home-stats" id="fabric-home-metric-cards" hidden={metricsCollapsed}>
          <button type="button" id="fabric-home-metric-fault" className={`fabric-home-stat fabric-home-fault${focusedMetric==="fault"?" is-selected":""}`} onClick={onOpenAgent} aria-label="网络故障治理，目标总数3，打开AI对话">
            <h3><img src={`${assetRoot}fault.svg`} alt=""/>网络故障治理</h3>
            <div className="fabric-home-fault-detail"><div className="fabric-home-fault-total"><strong>3</strong><span>目标总数</span></div><div className="fabric-home-fault-distribution"><img className="fabric-home-fault-strip" src={`${assetRoot}fault-status-strip.svg`} alt="目标处置状态分布"/><ul aria-label="故障处置状态图例">{faultStates.map(status=><li key={status.id}><i className={status.id}/>{status.label}</li>)}</ul></div></div>
          </button>
          <Stat glyph="generation" title="网络配置辅助生成" primary="4" secondary="290" note="处理中 / 处理完成" selected={focusedMetric==="generation"} onClick={onOpenAgent}/>
          <Stat glyph="inspection" title="网络配置检查" primary="1" secondary="32" note="告警 / 合规" alert selected={focusedMetric==="inspection"} onClick={onOpenAgent}/>
        </div>
        {!metricsCollapsed&&<button type="button" className="fabric-home-metrics-collapse" id="fabric-home-collapse-metrics" aria-label="收起指标卡片" title="收起指标卡片" aria-expanded="true" aria-controls="fabric-home-metric-cards" onClick={collapseMetrics}><img src={`${assetRoot}metrics-chevron.svg`} alt=""/></button>}
      </section>
      <section className="fabric-home-attention" aria-labelledby="fabric-home-attention-heading">
        <div className="fabric-home-section-title"><h2 id="fabric-home-attention-heading">待您关注</h2><a role="button" tabIndex={0} onClick={onOpenAgent} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onOpenAgent?.();}}}>更多</a></div>
        <div className="fabric-home-tabs" role="tablist" aria-label="关注任务状态">{tabs.map((tab,index)=><button type="button" key={tab.label} role="tab" id={`fabric-home-tab-${index}`} aria-controls="fabric-home-events" aria-selected={activeTab===index} className={activeTab===index?"is-active":""} onClick={()=>setActiveTab(index)}>{tab.label}<b className={tab.filter||""}>{events.filter(event=>!tab.filter||event.status===tab.filter).length}</b></button>)}</div>
        <div className="fabric-home-events" id="fabric-home-events" role="tabpanel" aria-labelledby={`fabric-home-tab-${activeTab}`}>
          {filtered.map(event=><button className={`fabric-home-event${event.status==="manual"?" is-priority":""}`} type="button" key={event.id} onClick={onOpenAgent}>
            <div className="fabric-home-event-head"><img src={`${assetRoot}${event.status==="manual"?"manual":"robot"}.svg`} alt=""/><b title={event.title}>{event.title}</b>{event.status==="manual"&&<span className="fabric-home-priority"><i/>优先</span>}</div>
            <p className="fabric-home-event-body">{event.location&&<><span className="fabric-home-location"><img src={`${assetRoot}pin.svg`} alt=""/>{event.location}</span>{"  "}</>}{event.detail}</p>
          </button>)}
        </div>
      </section>
    </div>
    <ChatComposer onOpen={onOpenAgent}/>
  </div>;
}

function Stat({glyph,title,primary,secondary,note,alert,selected,onClick}){
  const vertical=`${primary}/${secondary}`.length>8;
  return <button type="button" id={`fabric-home-metric-${glyph}`} className={`fabric-home-stat${vertical?" is-vertical":""}${selected?" is-selected":""}`} onClick={onClick}>
    <h3><img src={`${assetRoot}${glyph}.svg`} alt=""/>{title}</h3>
    <div className="fabric-home-stat-detail"><strong><span className={alert?"is-alert":""}>{primary}</span><i>/</i>{secondary}</strong><p>{note}{alert&&<img src={`${assetRoot}info.svg`} alt="告警数量 / 合规数量" title="告警数量 / 合规数量"/>}</p></div>
  </button>;
}
