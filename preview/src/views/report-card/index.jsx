import EChart from "../../components/echart/index.jsx";
import DataTable from "../../components/data-table/index.jsx";
import { Icon } from "../../../assets/shared/icon.jsx";
import ReportExport from '../../components/report-export/index.jsx';
import {NativeSelect} from '../../components/form-controls/select.jsx';
import {completionTimeline} from '../../mock/uc4-completion.js';
import {streamDuration} from '../lui-panel/motion.jsx';
import './generation.css';
import ArtifactOpen from "../../components/artifact-open/index.jsx";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp, scrollCanvasTo } from "../../context.jsx";
import { devices } from "../../mock/devices.js";
import { checks, checkById, deviceRuleTotal, applicableChecks } from "../../mock/checks.js";
import {
  summaryParts, audit, compliance, failedDevices, overviewDevices, priorityRankedRules, comparePriorityDevices,
  priorityLabels, priorityOf, priorityCounts, ruleShort, v7RuleRequirements,
  v7RepairDirections, deviceTypeLabel, deviceVendorLabel,
} from "../../mock/audit.js";
import { ArtifactIcon, PriorityBadge, PriorityDistribution } from "../../components/status-marks/index.jsx";
import Ic from "../../components/icon-el/index.jsx";
import SearchInput from "../../components/search-input/index.jsx";
import OptionGroup from "../../components/option-group/index.jsx";
import EmptyState from "../../components/empty-state/index.jsx";
import "./design.css";
import "./table-layout.css";
import "./compliance-ring.css";


export function SummaryCopy(){const s=summaryParts();return <>已检查 HCS1 区 <strong>{s.total} 台设备</strong>，其中 <strong>{s.failed} 台未通过</strong>、{s.passed} 台通过，整网合规度 <strong>{s.compliance}%</strong>。发现共计 <strong>{s.rules} 条规则不通过</strong>，包括{s.top}等。建议优先核验高优先级项，结合变更记录确认后修复。</>}
// Match the former 104×104 SVG exactly; the old -90° rotation makes its gradient vertical.
function complianceRingOption({width,height}){
 const scale=Math.min(width,height)/104,cx=width/2,cy=height/2,r=44*scale;
 const start=-Math.PI/2,share=audit.total?audit.passed/audit.total:0;
 const stroke={fill:'none',lineWidth:6.5*scale,lineCap:'butt'};
 return {animation:false,tooltip:{show:false},series:[{
  type:'custom',coordinateSystem:'none',silent:true,data:[[audit.passed,audit.total]],
  renderItem:()=>({type:'group',children:[
   {type:'circle',shape:{cx,cy,r},style:{fill:'none',stroke:'#ffffff04',lineWidth:22*scale}},
   {type:'circle',shape:{cx,cy,r},style:{...stroke,stroke:'#ef454f'}},
   {type:'arc',shape:{cx,cy,r,startAngle:start,endAngle:start+Math.PI*2*share,clockwise:true},style:{...stroke,stroke:{type:'linear',x:cx,y:cy+r,x2:cx,y2:cy-r,global:true,colorStops:[{offset:0,color:'#25bc91'},{offset:.72,color:'#36c9a0'},{offset:1,color:'#d7fff2'}]}}}
  ]})
 }]};
}
function ratioBarOption({width,height},ratio){
 const filled=width*ratio;
 return {animation:false,tooltip:{show:false},series:[{type:'custom',coordinateSystem:'none',silent:true,data:[ratio],renderItem:()=>({type:'rect',shape:{x:0,y:0,width:filled,height,r:Math.min(6,filled/2,height/2)},style:{fill:'#ef454f'}})}]};
}
function RatioBar({failed,total,unit="条"}){const percent=total?failed/total*100:0;return <div className="report-ratio"><div className="report-ratio-track" role="img" aria-label={failed+unit+'不通过，'+(total-failed)+unit+'通过'}><EChart className="uc4-ratio-chart" option={size=>ratioBarOption(size,percent/100)}/></div><span>不通过率<strong>{Number(percent.toFixed(1))}%</strong></span></div>}
function RuleCard({r,index,onShowList}){
  const total = devices.filter(d => applicableChecks(d).some(rule => rule.id === r.id)).length;
  const requirement = v7RuleRequirements[r.id] || checkById(r.id).expected;
  const repair = v7RepairDirections[r.id];
  return <article className="v7-top-card report-rule-card" data-rule-card={r.id}>
    <div className="report-device-main">
      <div className="report-device-heading report-rule-heading"><h3 title={r.name}><button aria-label={"查看"+r.name+"的检查明细"} onClick={()=>onShowList(r.id)}>{r.name}</button></h3><span className="report-device-rank">{index+1}</span></div>
      <div className="report-rule-priority"><PriorityBadge priority={r.priority}/></div>
      <div className="v7-card-number"><strong>{r.devices.length}</strong><span>台设备不通过</span></div>
      <RatioBar failed={r.devices.length} total={total} unit="台设备"/>
    </div>
    <div className="report-rule-guidance">
      <section><h4><img src="./assets/uploads/report-rule-requirement.svg" width="14" height="14" alt=""/>检查要求</h4><p title={requirement}>{requirement}</p></section>
      <section><h4><img src="./assets/uploads/report-rule-repair.svg" width="14" height="14" alt=""/>修复方向</h4><p title={repair}>{repair}</p></section>
    </div>
  </article>;
}
function DeviceCard({d,index,revealed=true}){const {openDevice}=useApp();return <article className={"v7-top-card report-device-card"+(!revealed?" report-reveal-skeleton":"")}><div className="report-device-main"><div className="report-device-heading"><h3><button onClick={()=>openDevice(d.id)}>{d.name}</button></h3><span className="report-device-rank">{index+1}</span></div><div className="report-device-ip"><img src="./assets/uploads/report-ip-address.svg" width="14" height="14" alt=""/><span>{d.ip}</span></div><div className="v7-card-number"><strong>{d.fails.length}</strong><span>条规则不通过</span></div><RatioBar failed={d.fails.length} total={deviceRuleTotal(d)}/></div><div className="report-device-priority"><span>规则优先级分布</span><PriorityDistribution device={d}/></div></article>}

export default function ReportCard({ cardRef }) {
  const { openDevice, reportRevealStartedAt } = useApp();
  const [reveal,setReveal]=useState({stamp:null,elapsed:Infinity});
  const elapsed=!reportRevealStartedAt?Infinity:reveal.stamp===reportRevealStartedAt?reveal.elapsed:0;
  // 骨架揭示与左侧完成结论共用时间线，右侧不要另起固定延时。
  const lines=completionTimeline(summaryParts());
  const end=lines.at(-1).delay+streamDuration(lines.at(-1).text)+180;
  const summaryAt=lines[2].delay, conclusionAt=lines[3].delay;
  const topAt=i=>lines[3].delay+(lines[7].delay-lines[3].delay)*i/5;
  const detailsAt=lines[7].delay;
  const ready=elapsed>=end;
  useEffect(()=>{if(!reportRevealStartedAt)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){setReveal({stamp:reportRevealStartedAt,elapsed:Infinity});return;}
    const points=[0,summaryAt,conclusionAt,...Array.from({length:5},(_,i)=>topAt(i)),detailsAt,...Array.from({length:10},(_,i)=>detailsAt+120+i*80),end].sort((a,b)=>a-b);
    const update=()=>setReveal({stamp:reportRevealStartedAt,elapsed:Date.now()-reportRevealStartedAt});update();
    const timers=points.map(t=>setTimeout(update,Math.max(0,reportRevealStartedAt+t-Date.now())+20));return()=>timers.forEach(clearTimeout);
  },[reportRevealStartedAt]);
  const loadingClass=(at)=>elapsed<at?' report-reveal-skeleton':' report-reveal-content';
  const [lens, setLens] = useState("devices");
  const [status, setStatus] = useState("failed");
  const [ruleFilter, setRuleFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);
  const [tableFilters, setTableFilters] = useState({});
  const overviewRef = useRef(null);
  const detailsRef = useRef(null);
  const tableSurfaceRef = useRef(null);
  const [tableBodyHeight, setTableBodyHeight] = useState(undefined);

  const rules = priorityRankedRules();
  const ranked = overviewDevices();

  // 状态、规则与搜索仅筛选设备明细，报告总览统计继续使用全量设备口径。
  const rows = useMemo(() => (
    [...devices]
      .filter((d) => (
        (status === "all" || (status === "failed" ? d.fails.length > 0 : d.fails.length === 0)) &&
        (!ruleFilter || d.fails.includes(ruleFilter)) &&
        (d.name + " " + d.ip + " " + d.model + " " + deviceTypeLabel(d) + " " + deviceVendorLabel(d)).toLowerCase().includes(query.toLowerCase())
      ))
      .sort(comparePriorityDevices)
  ), [status, ruleFilter, query]);

  // 表头排序、有限取值多选筛选和分页统一交给共享 Table；总览仍保持全量口径。
  const columns = useMemo(() => {
    const compareText = value => (a,b) => value(a).localeCompare(value(b), "zh-CN", {numeric:true});
    const options = value => [...new Set(devices.map(value))].map(text => ({text,value:text}));
    const openDetail = (event,device) => { event.preventDefault(); openDevice(device.id, ruleFilter || undefined); };
    return [
      {title:"设备名称",key:"name",dataIndex:"name",sorter:compareText(device => device.name),
        render:(name,device)=><a href="#" className="uc4-report-table-link uc4-report-device-name" title={name} onClick={event=>openDetail(event,device)}>{name}</a>},
      {title:"设备IP",key:"ip",dataIndex:"ip",sorter:compareText(device => device.ip),render:ip=><span className="uc4-report-single-value">{ip}</span>},
      {title:"设备类型",key:"type",sorter:compareText(deviceTypeLabel),filters:options(deviceTypeLabel),filteredValue:tableFilters.type || null,
        onFilter:(value,device)=>deviceTypeLabel(device)===value,render:(_,device)=><span className="uc4-report-cell-copy" title={deviceTypeLabel(device)}>{deviceTypeLabel(device)}</span>},
      {title:"厂商",key:"vendor",sorter:compareText(deviceVendorLabel),filters:options(deviceVendorLabel),filteredValue:tableFilters.vendor || null,
        onFilter:(value,device)=>deviceVendorLabel(device)===value,render:(_,device)=><span className="uc4-report-cell-copy" title={deviceVendorLabel(device)}>{deviceVendorLabel(device)}</span>},
      {title:"不通过规则数量",key:"failedCount",align:'left',sorter:(a,b)=>a.fails.length-b.fails.length,render:(_,device)=>device.fails.length},
      {title:"优先级分布",key:"priority",align:'left',defaultSortOrder:"descend",sorter:(a,b)=>-comparePriorityDevices(a,b),
        filters:Object.entries(priorityLabels).map(([value,text])=>({value,text:text+"优先级"})),filteredValue:tableFilters.priority || null,
        onFilter:(value,device)=>priorityCounts(device)[value]>0,render:(_,device)=><div className="uc4-report-priority-values"><PriorityDistribution device={device}/></div>},
      {title:"检查结果",key:"result",sorter:(a,b)=>Number(a.fails.length>0)-Number(b.fails.length>0),
        filters:[{text:"不通过",value:"failed"},{text:"通过",value:"passed"}],filteredValue:tableFilters.result || null,
        onFilter:(value,device)=>value==="failed"?device.fails.length>0:device.fails.length===0,
        render:(_,device)=><span className={"uc4-report-table-result "+(device.fails.length?"is-failed":"is-passed")}><Icon name={device.fails.length?"circle-x":"circle-check"} size="0.875rem"/>{device.fails.length?"不通过":"通过"}</span>},
      {title:"操作",key:"actions",width:"4rem",align:"left",render:(_,device)=><div className="uc4-report-table-actions"><a href="#" aria-label={"查看设备检查详情："+device.name} title={"查看设备检查详情："+device.name} onClick={event=>openDetail(event,device)}><Icon name="external-link" size="0.875rem"/></a></div>},
    ];
  }, [openDevice,ruleFilter,tableFilters]);
  const hasColumnFilters = Object.values(tableFilters).some(values=>values?.length);
  const matchingRowCount = rows.filter(device=>columns.every(column=>!column.onFilter||!tableFilters[column.key]?.length||tableFilters[column.key].some(value=>column.onFilter(value,device)))).length;
  // 少量记录沿正常内容流展示；较多记录的表体上限取自当前画布，而非固定像素高度。
  useLayoutEffect(()=>{
    const surface=tableSurfaceRef.current;
    if(!surface)return;
    const report=surface.closest('.report-card'),viewport=surface.closest('.canvas-content,.v7-artifact-pane')||document.documentElement;
    const measure=()=>{
      if(!surface.clientWidth||!report)return;
      let next;
      if(Math.min(detailPageSize,matchingRowCount)>5){
        const header=surface.querySelector('.ant-table-header,.ant-table-thead'),pager=surface.querySelector('.ant-pagination');
        const pagerStyle=pager?getComputedStyle(pager):null,viewportStyle=getComputedStyle(viewport),reportStyle=getComputedStyle(report);
        const pagerHeight=pager?pager.getBoundingClientRect().height+(parseFloat(pagerStyle.marginTop)||0)+(parseFloat(pagerStyle.marginBottom)||0):0;
        const beforeTable=surface.getBoundingClientRect().top-report.getBoundingClientRect().top;
        const insets=(parseFloat(viewportStyle.paddingTop)||0)+(parseFloat(viewportStyle.paddingBottom)||0)+(parseFloat(reportStyle.paddingBottom)||0);
        const available=Math.floor(viewport.clientHeight-beforeTable-(header?.getBoundingClientRect().height||40)-pagerHeight-insets);
        // 至少容纳四行才启用内层滚动，否则沿报告滚动，避免出现狭窄的表格窗口。
        if(available>=160)next=available;
      }
      setTableBodyHeight(current=>current===next?current:next);
    };
    const observer=new ResizeObserver(measure);
    for(const node of new Set([viewport,report,surface,...surface.querySelectorAll('.ant-table-header,.ant-table-thead,.ant-pagination')]))observer.observe(node);
    measure();return()=>observer.disconnect();
  },[detailPageSize,matchingRowCount,lens,ruleFilter,ready]);


  const showDeviceList = (rule = null) => {
    setStatus("failed");
    setRuleFilter(rule);
    setQuery("");
    setTableFilters({});
    setPage(1);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollCanvasTo(detailsRef.current)));
  };

  const closeDeviceList = () => {
    scrollCanvasTo(overviewRef.current);
  };

  return (
    <section className="card report-card v7-report artifact-card conclusion-artifact v7-card-tabbed report-design" id="reportCard" ref={cardRef} aria-busy={!ready} inert={!ready?"":undefined}>
      <div className="report-export-actions"><ReportExport uc="uc4" disabled={!ready}/><ArtifactOpen kind="report" title="HCS1 区基线检查报告"/></div>
      <div className="v7-report-heading">
        <div className="row">
          <ArtifactIcon type="conclusion" shape="report" />
          <h2 className="card-title">HCS1 区基线检查报告</h2>
        </div>
      </div>
      <div className={"v7-report-meta"+loadingClass(lines[1].delay)}><span><Ic icon="map-pin"/>西三旗 DC / HCS1</span><span>已检查{audit.total}台设备</span><span>{checks.length}条适用规则</span></div>
      <div className="v7-summary v11-summary">
        <section className={"v7-compliance"+loadingClass(summaryAt)}>
          <div className="v7-ring" role="img" aria-label={`整网合规度${compliance()}%，${audit.passed}台通过，${failedDevices().length}台不通过`}>
            <EChart className="uc4-compliance-chart" option={complianceRingOption} style={{width:'10.4375rem',height:'10.4375rem',marginLeft:'var(--spacing-2-5)'}}/>
            <div>
              <strong>{compliance()}<small>%</small></strong>
              <span title="全部适用规则均通过的设备数 ÷ 已检查设备数">整网合规度</span>
            </div>
          </div>
          <div className="v7-summary-counts">
            <span><i className="good-dot" />已通过 <strong>{audit.passed}</strong></span>
            <button title="定位不通过设备的检查明细" onClick={() => showDeviceList()}>
              <i className="bad-dot" />不通过 <strong>{failedDevices().length}</strong>
            </button>
          </div>
        </section>
        <section className={"v7-conclusion v11-conclusion"+loadingClass(conclusionAt)}><div className="v7-conclusion-label"><img src="./assets/uploads/report-conclusion-sparkle.svg" width="20" height="20" alt=""/>检查结论</div><p className="v12-summary-copy">已检查 HCS1 区 <strong>{audit.total}</strong> 台设备，其中 <strong>{failedDevices().length}</strong> 台未通过、<strong>{audit.passed}</strong> 台通过，整网合规度 <strong>{compliance()}%</strong>。发现共计 <strong>{rules.length}</strong> 条规则不通过，包括{summaryParts().top}等。建议<span className="report-advice-primary">优先核验高优先级项</span>，<span className="report-advice-confirm">结合变更记录确认后修复。</span></p></section>
      </div>
      <section id="v7TopOverview" className="v7-overview-section" ref={overviewRef}>
        <div className={"v7-result-toolbar"+loadingClass(topAt(0))}>
          <h3 className="v7-section-title">TOP概览</h3>
          <OptionGroup cls="v7-lens" ariaLabel="TOP5观察维度"
            options={[["devices", "按设备"], ["rules", "按规则"]]}
            value={lens} onChange={setLens} />
        </div>
        <div id="v7ResultContent">
          <div className="v7-top-grid">
            {lens === "rules"
              ? rules.slice(0, 5).map((r, i) => <RuleCard key={r.id} r={r} index={i} onShowList={showDeviceList} />)
              : ranked.map((d, i) => <DeviceCard key={d.id} d={d} index={i} revealed={elapsed>=topAt(i)} />)}
          </div>
        </div>
      </section>
      <section id="v7CheckDetails" className={"v7-check-details"+loadingClass(detailsAt)} ref={detailsRef}>
        <h3 className="v7-section-title">检查明细</h3>
        <div className="v7-device-details">
          <div className="v7-status-row">
            <OptionGroup cls="v7-status-filters" ariaLabel="设备检查状态筛选"
              options={[["all", "全部", devices.length], ["failed", "不通过", failedDevices().length], ["passed", "通过", audit.passed]]}
              value={status} onChange={(id) => { setStatus(id); setPage(1); }}
              renderOption={(opt) => <><i className={opt[0]} />{opt[1]} <strong>{opt[2]}</strong></>} />
          </div>
          <div className="v7-table-tools">
            <SearchInput id="v7DeviceSearch" value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="请输入设备名称/管理IP/型号" ariaLabel="搜索设备明细" />
            <label className="v7-rule-select">
              <NativeSelect id="v7RuleFilter" aria-label="规则筛选" value={ruleFilter || ""} onChange={(e) => { setRuleFilter(e.target.value || null); setPage(1); }}>
                <option value="">全部规则</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>{priorityLabels[priorityOf(r.id)]}优先级 · {ruleShort[r.id]}</option>
                ))}
              </NativeSelect>
            </label>
            {hasColumnFilters && <a href="#" className="uc4-report-table-link" onClick={event=>{event.preventDefault();setTableFilters({});setPage(1);}}>清除表头筛选</a>}
          </div>
          {ruleFilter ? (
            <div className="v7-filter-context">
              <span>规则筛选：{ruleShort[ruleFilter]}</span>
              <button onClick={() => { setRuleFilter(null); setPage(1); }} aria-label="清除规则筛选"><Ic icon="x" /></button>
            </div>
          ) : null}
          <div className="uc4-report-table-surface" ref={tableSurfaceRef}>
            <DataTable
              className="uc4-report-device-table"
              rowKey="id"
              columns={columns}
              dataSource={rows}
              tableLayout="auto"
              density="comfortable"
              scroll={{x:true,...(tableBodyHeight?{y:tableBodyHeight}:{})}}
              locale={{emptyText:<EmptyState text="未找到匹配设备"/>}}
              rowClassName={(_,index)=>loadingClass(detailsAt+120+index*80).trim()}
              pagination={{current:page,pageSize:detailPageSize,pageSizeOptions:[10,20,50]}}
              onChange={(pagination,filters)=>{setPage(pagination.current || 1);setDetailPageSize(pagination.pageSize || 10);setTableFilters(filters);}}
            />
          </div>
        </div>
      </section>
    </section>
  );
}
