import ArtifactOpen from "../../components/artifact-open/index.jsx";
import { useMemo, useRef, useState } from "react";
import { useApp, scrollCanvasTo } from "../../context.jsx";
import { devices } from "../../mock/devices.js";
import { checks, checkById, deviceRuleTotal } from "../../mock/checks.js";
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

const detailPageSize = 10;

export function SummaryCopy(){const s=summaryParts();return <>已检查 HCS1 区 <strong>{s.total} 台设备</strong>，其中 <strong>{s.failed} 台未通过</strong>、{s.passed} 台通过，整网合规度 <strong>{s.compliance}%</strong>。发现共计 <strong>{s.rules} 条规则不通过</strong>，包括{s.top}等。建议优先核验高优先级项，结合变更记录确认后修复。</>}
function RatioBar({failed,total}){const percent=total?failed/total*100:0;return <div className="v8-ratio"><div className="v8-ratio-track" role="img" aria-label={failed+'条不通过，'+(total-failed)+'条通过'}><span className="v8-ratio-failed" style={{width:percent+'%'}}/><span className="v8-ratio-passed" style={{width:(100-percent)+'%'}}/></div><div className="v8-ratio-labels"><span><i/>不通过 {Number(percent.toFixed(1))}%</span><span>共 {total}条</span></div></div>}
function RuleCard({r,index}){return <article className="v7-top-card v8-overview-card v9-overview-card" data-rule-card={r.id}><div className="v7-card-title"><span className="v7-rank">{index+1}</span><div className="v7-rule-heading"><h3 title={checkById(r.id).name}>{r.name}</h3><PriorityBadge priority={r.priority}/></div></div><div className="v7-card-number"><strong>{r.devices.length}</strong><span>台设备不通过</span></div><div className="v7-rule-context"><section className="v7-check-requirement"><h4>检查要求</h4><p>{v7RuleRequirements[r.id]||checkById(r.id).expected}</p></section><section className="v7-repair-direction"><h4>修复方向</h4><p>{v7RepairDirections[r.id]}</p></section></div></article>}
function DeviceCard({d,index}){const {openDevice}=useApp();return <article className="v7-top-card v8-overview-card v9-overview-card"><div className="v7-card-title"><span className="v7-rank">{index+1}</span><h3><button onClick={()=>openDevice(d.id)}>{d.name}</button></h3></div><div className="v7-device-ip">{d.ip}</div><div className="v7-card-number"><strong>{d.fails.length}</strong><span>条规则不通过</span></div><RatioBar failed={d.fails.length} total={deviceRuleTotal(d)}/><div className="v7-device-priority"><span className="v7-viz-note">规则优先级分布</span><PriorityDistribution device={d}/></div></article>}

export default function ReportCard({ cardRef }) {
  const { openDevice } = useApp();
  const [lens, setLens] = useState("devices");
  const [status, setStatus] = useState("failed");
  const [ruleFilter, setRuleFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
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
      .sort(comparePriorityDevices)
  ), [status, ruleFilter, query]);

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
    <section className="card report-card v7-report artifact-card conclusion-artifact v7-card-tabbed" id="reportCard" ref={cardRef}>
      <ArtifactOpen kind="report" title="HCS1 区基线检查报告"/>
      <div className="v7-report-heading">
        <div className="row">
          <ArtifactIcon type="conclusion" shape="report" />
          <h2 className="card-title">HCS1 区基线检查报告</h2>
        </div>
      </div>
      <div className="v7-report-meta">西三旗 DC / HCS1 · 已检查{audit.total}台设备 · {checks.length}条适用规则 · 基于本次配置快照</div>
      <div className="v7-summary v11-summary">
        <section className="v7-compliance">
          <div className="v7-ring" role="img" aria-label={`整网合规度${compliance()}%，${audit.passed}台通过，${failedDevices().length}台不通过`}>
            <svg viewBox="0 0 104 104" aria-hidden="true">
              <circle cx="52" cy="52" r="44" pathLength="100" fill="none" stroke="var(--fail)" strokeWidth="7" />
              <circle cx="52" cy="52" r="44" pathLength="100" fill="none" stroke="var(--good)" strokeWidth="7" strokeDasharray={`${(audit.passed / audit.total) * 100} 100`} />
            </svg>
            <div>
              <strong>{compliance()}<small>%</small></strong>
              <span title="全部适用规则均通过的设备数 ÷ 已检查设备数">整网合规度</span>
            </div>
          </div>
          <div className="v7-summary-counts">
            <span><i className="good-dot" /><strong>{audit.passed}</strong> 台通过</span>
            <button title="定位不通过设备的检查明细" onClick={() => showDeviceList()}>
              <i className="bad-dot" /><strong>{failedDevices().length}</strong> 台不通过 ›
            </button>
          </div>
        </section>
        <section className="v7-conclusion v11-conclusion"><div className="v7-conclusion-label"><Ic icon="sparkles"/>检查结论</div><p className="v12-summary-copy"><SummaryCopy/></p></section>
      </div>
      <section id="v7TopOverview" className="v7-overview-section" ref={overviewRef}>
        <div className="v7-result-toolbar">
          <h3 className="v7-section-title">TOP概览</h3>
          <OptionGroup cls="v7-lens" ariaLabel="TOP5观察维度"
            options={[["devices", "按设备"], ["rules", "按规则"]]}
            value={lens} onChange={setLens} />
        </div>
        <div id="v7ResultContent">
          <div className="v7-top-grid">
            {lens === "rules"
              ? rules.slice(0, 5).map((r, i) => <RuleCard key={r.id} r={r} index={i} onShowList={showDeviceList} />)
              : ranked.map((d, i) => <DeviceCard key={d.id} d={d} index={i} />)}
          </div>
        </div>
      </section>
      <section id="v7CheckDetails" className="v7-check-details" ref={detailsRef}>
        <h3 className="v7-section-title">检查明细</h3>
        <div className="v7-device-details">
          <div className="v7-status-row">
            <OptionGroup cls="v7-status-filters" ariaLabel="设备检查状态筛选"
              options={[["all", "全部", devices.length], ["failed", "不通过", failedDevices().length], ["passed", "通过", audit.passed]]}
              value={status} onChange={(id) => { setStatus(id); setPage(1); }}
              renderOption={(opt) => <><i className={opt[0]} />{opt[1]} <strong>{opt[2]}</strong></>} />
          </div>
          <div className="v7-table-tools">
            <label className="v7-rule-select">
              <select id="v7RuleFilter" aria-label="规则筛选" value={ruleFilter || ""} onChange={(e) => { setRuleFilter(e.target.value || null); setPage(1); }}>
                <option value="">全部规则</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>{priorityLabels[priorityOf(r.id)]}优先级 · {ruleShort[r.id]}</option>
                ))}
              </select>
            </label>
            <SearchInput id="v7DeviceSearch" value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="搜索设备名称、IP、类型或厂商" ariaLabel="搜索设备明细" />
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
                  <th>设备名称</th><th>设备IP</th><th>设备类型</th><th>厂商</th><th>不通过规则数</th>
                  <th title="先按不通过规则数降序；数量相同时依次比较高、中、低优先级数量">优先级分布</th><th>检查结果</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * detailPageSize, current * detailPageSize).map((d) => (
                  <tr key={d.id}>
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
            <span>共{rows.length}台 · {detailPageSize}条/页 · 按不通过规则数排序</span>
            <div className="row">
              <button className="btn" disabled={current === 1} onClick={() => setPage(current - 1)}>上一页</button>
              {near.map((n, i) => (
                <span key={n} style={{ display: "contents" }}>
                  {i && n - near[i - 1] > 1 ? <span>…</span> : null}
                  <button className={"v7-page" + (n === current ? " active" : "")} aria-label={"第" + n + "页"} aria-current={n === current ? "page" : undefined} onClick={() => setPage(n)}>{n}</button>
                </span>
              ))}
              <button className="btn" disabled={current === pages} onClick={() => setPage(current + 1)}>下一页</button>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
