import {completionTimeline} from '../../mock/uc4-completion.js';
import {streamDuration} from '../lui-panel/motion.jsx';
import './generation.css';
import ArtifactOpen from "../../components/artifact-open/index.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, scrollCanvasTo } from "../../context.jsx";
import { devices } from "../../mock/devices.js";
import { checks, checkById, deviceRuleTotal, applicableChecks } from "../../mock/checks.js";
import {
  summaryParts, audit, compliance, failedDevices, overviewDevices, priorityRankedRules, comparePriorityDevices,
  priorityLabels, priorityOf, priorityCounts, ruleShort, sortedFailedRules, v7RuleRequirements,
  v7RepairDirections, v7RuleDeviation, deviceTypeLabel, deviceVendorLabel,
} from "../../mock/audit.js";
import { ArtifactIcon, PriorityBadge, PriorityDistribution } from "../../components/status-marks/index.jsx";
import Ic from "../../components/icon-el/index.jsx";
import SearchInput from "../../components/search-input/index.jsx";
import OptionGroup from "../../components/option-group/index.jsx";
import EmptyState from "../../components/empty-state/index.jsx";
import "./design.css";


export function SummaryCopy(){const s=summaryParts();return <>已检查 HCS1 区 <strong>{s.total} 台设备</strong>，其中 <strong>{s.failed} 台未通过</strong>、{s.passed} 台通过，整网合规度 <strong>{s.compliance}%</strong>。发现共计 <strong>{s.rules} 条规则不通过</strong>，包括{s.top}等。建议优先核验高优先级项，结合变更记录确认后修复。</>}
function RatioBar({failed,total,unit="条"}){const percent=total?failed/total*100:0;return <div className="report-ratio"><div className="report-ratio-track" role="img" aria-label={failed+unit+'不通过，'+(total-failed)+unit+'通过'}><i style={{width:percent+'%'}} /></div><span>不通过率<strong>{Number(percent.toFixed(1))}%</strong></span></div>}
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
  const [sortKey, setSortKey] = useState("priority");
  const [sortDirection, setSortDirection] = useState("desc");
  const overviewRef = useRef(null);
  const detailsRef = useRef(null);

  const rules = priorityRankedRules();
  const ranked = overviewDevices();

  const rows = useMemo(() => (
    [...devices]
      .filter((d) => (
        (status === "all" || (status === "failed" ? d.fails.length > 0 : d.fails.length === 0)) &&
        (!ruleFilter || d.fails.includes(ruleFilter)) &&
        (d.name + " " + d.ip + " " + d.model + " " + deviceTypeLabel(d) + " " + deviceVendorLabel(d)).toLowerCase().includes(query.toLowerCase())
      ))
      .sort((a,b) => {
        if(sortKey === "priority") return (sortDirection === "desc" ? 1 : -1) * comparePriorityDevices(a,b);
        const value = d => sortKey === "name" ? d.name : sortKey === "ip" ? d.ip : sortKey === "type" ? deviceTypeLabel(d) : sortKey === "vendor" ? deviceVendorLabel(d) : d.fails.length ? "不通过" : "通过";
        return value(a).localeCompare(value(b), "zh-CN", {numeric:true}) * (sortDirection === "asc" ? 1 : -1) || comparePriorityDevices(a,b);
      })
  ), [status, ruleFilter, query, sortKey, sortDirection]);

  const sortHeader = (label, key) => <th aria-sort={sortKey === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}><button className="report-sort-button" aria-label={"按"+label+"排序"} onClick={() => {setSortKey(key);setSortDirection(sortKey === key && sortDirection === "asc" ? "desc" : "asc");setPage(1);}}>{label}<Ic icon="arrow-down-up" /></button></th>;

  const pages = Math.max(1, Math.ceil(rows.length / detailPageSize));
  const current = Math.max(1, Math.min(page, pages));
  const near = [...new Set([1, Math.max(1, current - 1), current, Math.min(pages, current + 1), pages])].sort((a, b) => a - b);

  const showDeviceList = (rule = null) => {
    setStatus("failed");
    setRuleFilter(rule);
    setQuery("");
    setPage(1);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollCanvasTo(detailsRef.current)));
  };

  const closeDeviceList = () => {
    scrollCanvasTo(overviewRef.current);
  };

  return (
    <section className="card report-card v7-report artifact-card conclusion-artifact v7-card-tabbed report-design" id="reportCard" ref={cardRef} aria-busy={!ready} inert={!ready?"":undefined}>
      <ArtifactOpen kind="report" title="HCS1 区基线检查报告"/>
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
            <svg viewBox="0 0 104 104" aria-hidden="true">
              <defs><linearGradient id="report-compliance-green"><stop stopColor="#25bc91"/><stop offset=".72" stopColor="#36c9a0"/><stop offset="1" stopColor="#d7fff2"/></linearGradient><filter id="report-ring-glow"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="52" cy="52" r="44" fill="none" stroke="#ffffff04" strokeWidth="22"/><circle cx="52" cy="52" r="44" pathLength="100" fill="none" stroke="#ef454f" strokeWidth="6.5" />
              <circle cx="52" cy="52" r="44" pathLength="100" fill="none" stroke="url(#report-compliance-green)" strokeWidth="6.5" strokeDasharray={`${(audit.passed / audit.total) * 100} 100`} />
            </svg>
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
              <select id="v7RuleFilter" aria-label="规则筛选" value={ruleFilter || ""} onChange={(e) => { setRuleFilter(e.target.value || null); setPage(1); }}>
                <option value="">全部规则</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>{priorityLabels[priorityOf(r.id)]}优先级 · {ruleShort[r.id]}</option>
                ))}
              </select>
            </label>
          </div>
          {ruleFilter ? (
            <div className="v7-filter-context">
              <span>规则筛选：{ruleShort[ruleFilter]}</span>
              <button onClick={() => { setRuleFilter(null); setPage(1); }} aria-label="清除规则筛选"><Ic icon="x" /></button>
            </div>
          ) : null}
          <div className="v7-table-scroll">
            <table className="rule-table v7-table">
              <thead>
                <tr>
                  {sortHeader("设备名称","name")}{sortHeader("设备IP","ip")}{sortHeader("设备类型","type")}{sortHeader("厂商","vendor")}<th>不通过规则数量</th>
                  {sortHeader("优先级分布","priority")}{sortHeader("检查结果","result")}
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * detailPageSize, current * detailPageSize).map((d,i) => (
                  <tr key={d.id} className={loadingClass(detailsAt+120+i*80)}>
                    <td><a href="#" className="link" onClick={(e) => { e.preventDefault(); openDevice(d.id, ruleFilter || undefined); }}>{d.name}</a></td>
                    <td>{d.ip}</td>
                    <td>{deviceTypeLabel(d)}</td>
                    <td>{deviceVendorLabel(d)}</td>
                    <td><span className={d.fails.length ? "bad" : "muted"}>{d.fails.length}</span></td>
                    <td><PriorityDistribution device={d} /></td>
                    <td><span className={d.fails.length ? "bad-tag" : "good-tag"}>{d.fails.length ? "不通过" : "通过"}</span></td>
                  </tr>
                ))}
                {!rows.length ? <tr><td colSpan="7"><EmptyState text="未找到匹配设备" /></td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="v7-pagination">
            <span>总计：{rows.length}</span>
            <div className="row">
              <select className="report-page-size" aria-label="每页条数" value={detailPageSize} onChange={e => {setDetailPageSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(size=><option key={size} value={size}>{size} 条/页</option>)}</select>
              <button className="btn report-page-arrow" aria-label="上一页" disabled={current === 1} onClick={() => setPage(current - 1)}><Ic icon="chevron-left"/></button>
              {near.map((n, i) => (
                <span key={n} style={{ display: "contents" }}>
                  {i && n - near[i - 1] > 1 ? <span>…</span> : null}
                  <button className={"v7-page" + (n === current ? " active" : "")} aria-label={"第" + n + "页"} aria-current={n === current ? "page" : undefined} onClick={() => setPage(n)}>{n}</button>
                </span>
              ))}
              {near.length === 1 && <span className="report-page-total">/ {pages}</span>}
              <button className="btn report-page-arrow" aria-label="下一页" disabled={current === pages} onClick={() => setPage(current + 1)}><Ic icon="chevron-right"/></button>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
