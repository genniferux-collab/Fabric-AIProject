import { useRef, useState } from "react";
import OptionGroup from "../../components/option-group/index.jsx";
import SearchInput from "../../components/search-input/index.jsx";
import ArtifactOpen from "../../components/artifact-open/index.jsx";
import "./report.css";
import { useApp } from "../../context.jsx";
import { uc2Rules, uc2DeviationDevices, uc2ExportCsv, miningImpact } from "../../mock/uc2.js";
import { Uc2RuleDetail } from "./rule-detail.jsx";
import EmptyState from "../../components/empty-state/index.jsx";
import Ic from "../../components/icon-el/index.jsx";
import { ArtifactIcon } from "../../components/status-marks/index.jsx";
import "../report-card/design.css";

const reviewLabels = { pending: "待审阅", accepted: "已采用", rejected: "暂不采用" };
const roles = ["通用", "核心交换机", "Leaf 交换机"];
const roleColors = ["#9b85ef", "#347fe8", "#79a7fb"];
const deviationCount = new Set(Object.values(uc2DeviationDevices).flat()).size;

export function Uc2Report() {
  const { uc2, uc2SetFilter, uc2OpenRule, uc2Reviews, toast } = useApp();
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [statsOpen, setStatsOpen] = useState(true), [sort, setSort] = useState(null);
  const detailsRef = useRef(null);
  const reviewOf = r => uc2Reviews[r.id] || "pending";
  const roleCounts = roles.map(role => uc2Rules.filter(r => r.role === role).length);
  const highConfidence = uc2Rules.filter(r => r.confidence === "高").length;
  const categories = [...new Set(uc2Rules.map(r => r.category))];
  const filtered = uc2Rules.filter(r =>
    (!uc2.role || uc2.role === "全部角色" || r.role === uc2.role) &&
    (!uc2.category || uc2.category === "全部功能" || r.category === uc2.category) &&
    (!uc2.confidence || uc2.confidence === "全部置信度" || r.confidence === uc2.confidence) &&
    (!uc2.status || uc2.status === "all" || reviewOf(r) === uc2.status) &&
    (r.name + " " + r.id + " " + r.category).toLowerCase().includes((uc2.query || "").trim().toLowerCase())
  );
  const rs = [...filtered].sort((a,b) => sort ? (sort.key === "support" ? a.support/a.scope - b.support/b.scope : a.deviations - b.deviations) * (sort.direction === "asc" ? 1 : -1) || a.id.localeCompare(b.id) : a.id.localeCompare(b.id));
  const ranked = [...uc2Rules].sort((a,b)=>b.deviations-a.deviations || b.support/b.scope-a.support/a.scope).slice(0,5);
  const pages = Math.max(1, Math.ceil(rs.length/pageSize)), current = Math.min(page,pages);
  const setFilter = value => { uc2SetFilter(value); setPage(1); };
  const locateDetails = value => { setFilter(value); requestAnimationFrame(()=>detailsRef.current?.scrollIntoView({behavior:"smooth",block:"start"})); };
  const selectCandidate = id => locateDetails({ query:id, role:"全部角色",category:"全部功能",status:"all",confidence:"全部置信度" });
  const toggleSort = key => { setSort(value=>({key,direction:value?.key===key&&value.direction==="desc"?"asc":"desc"}));setPage(1); };
  const exportReport = () => { uc2ExportCsv(uc2Reviews); toast("黄金基线候选规则已导出为 CSV"); };

  return <div className="uc2-report v7-report report-design" id="uc2Report">
    <div className="v7-report-heading">
      <div className="row"><ArtifactIcon type="conclusion" shape="report"/><h2 className="card-title">西三旗 DC · 黄金基线候选报告</h2></div>
      <div className="uc2-report-actions"><span className="uc2-tag">待客户审阅</span><button type="button" className="icon-btn" aria-label="导出黄金基线候选规则 CSV" title="导出候选规则（CSV）" onClick={exportReport}><Ic icon="download"/></button><ArtifactOpen kind="uc2-report" title="黄金基线候选报告"/></div>
    </div>
    <div className="v7-report-meta"><span><Ic icon="map-pin"/>西三旗 DC</span><span>已发现 1,980 台交换机</span><span>本轮分析 100 台样本</span></div>
    <section className="uc2-report-insight" aria-label="黄金基线挖掘洞察">
      <h3><img src="./assets/uploads/report-conclusion-sparkle.svg" width="18" height="18" alt=""/>黄金基线挖掘洞察</h3>
      <p>发现 <strong>{roleCounts[0]} 条跨角色共性规则</strong>、<strong>{roleCounts[1]} 条核心角色规则</strong>和 <strong>{roleCounts[2]} 条 Leaf 角色规则</strong>。其中 {highConfidence} 条高置信、{uc2Rules.length-highConfidence} 条待验证，建议优先审阅登录安全与核心冗余配置。</p>
      <p className="uc2-insight-secondary">{deviationCount} 台样本存在候选偏离，集中在超时、算法、VLAN 和接口描述。偏离可能来自业务差异或例外配置，需结合网络规划核验；候选规则尚未发布，也未向设备下发变更。</p>
    </section>
    <details className="uc2-report-statistics" open={statsOpen} onToggle={e=>{if(e.currentTarget.open!==statsOpen)setStatsOpen(e.currentTarget.open);}}>
      <summary aria-label="展开或收起挖掘统计"><span>挖掘统计</span><span className="uc2-stat-overview">100 台样本 · {uc2Rules.length} 条候选规则</span><Ic icon={statsOpen?"chevron-up":"chevron-down"}/></summary>
      <div className="uc2-stat-grid">
        <section className="uc2-stat-device"><span className="uc2-stat-label">挖掘分析设备</span><div className="uc2-stat-value">100<small>台</small></div><div className="uc2-sample-bars"><div><span><i style={{background:"#40bf93"}}/>核心 20</span><span className="uc2-sample-track"><i style={{width:"20%",background:"#40bf93"}}/></span></div><div><span><i style={{background:"#79a7fb"}}/>Leaf 80</span><span className="uc2-sample-track"><i style={{width:"80%",background:"#79a7fb"}}/></span></div></div></section>
        <section><span className="uc2-stat-label">候选规则</span><div className="uc2-stat-value">{uc2Rules.length}<small>条</small></div><div className="uc2-stat-caption"><span>高置信 <strong>{highConfidence}</strong></span><span>待验证 <strong>{uc2Rules.length-highConfidence}</strong></span></div></section>
        <section><span className="uc2-stat-label">候选规则角色分布</span><div className="uc2-role-stack" role="img" aria-label={`共性规则${roleCounts[0]}条，核心交换机${roleCounts[1]}条，Leaf交换机${roleCounts[2]}条`}>{roles.map((role,i)=><i key={role} style={{width:roleCounts[i]/uc2Rules.length*100+"%",background:roleColors[i]}}/>)}</div><div className="uc2-role-legend">{roles.map((role,i)=><button key={role} type="button" title={`筛选${role}候选规则`} onClick={()=>locateDetails({role,query:"",category:"全部功能",status:"all",confidence:"全部置信度"})}><i style={{background:roleColors[i]}}/>{role==="通用"?"共性规则":role} <strong>{roleCounts[i]}</strong></button>)}</div></section>
      </div>
      <div className="uc2-consistency-summary"><span>初筛共性配置 <strong>47</strong> 项</span><span><i className="good-dot"/>一致性 100% <strong>44</strong> 项</span><span>一致性 99% <strong>2</strong> 项</span><span>一致性 97% <strong>1</strong> 项</span></div>
    </details>
    <section className="v7-overview-section">
      <div className="v7-result-toolbar"><h3 className="v7-section-title">TOP 候选规则 <span className="uc2-top-count">TOP 5</span></h3><span className="uc2-section-hint">按偏离样本数排序</span></div>
      <div className="v7-top-grid">{ranked.map((rule,index)=><article className="v7-top-card report-rule-card" key={rule.id}>
        <div className="report-device-main"><div className="report-device-heading report-rule-heading"><h3 title={rule.name}><button aria-label={`查看待选明细：${rule.name}`} onClick={()=>selectCandidate(rule.id)}>{rule.name}</button></h3><span className="report-device-rank">{index+1}</span></div><div className="report-rule-priority"><span className={"uc2-report-confidence "+(rule.confidence==="高"?"high":"")}><i/>{rule.confidence==="高"?"高置信":"待验证"} · {rule.role}</span></div><div className="v7-card-number"><strong>{rule.deviations}</strong><span>台样本偏离</span></div><div className="report-ratio uc2-support-ratio"><div className="report-ratio-track" role="img" aria-label={`配置支持 ${rule.support} / ${rule.scope} 台`}><i style={{width:rule.support/rule.scope*100+"%"}}/></div><span>配置支持 <strong>{rule.support}/{rule.scope}</strong></span></div></div>
        <div className="report-rule-guidance"><section><h4><img src="./assets/uploads/report-rule-requirement.svg" width="14" height="14" alt=""/>候选要求</h4><p title={rule.cmd}><code>{rule.cmd}</code></p></section><section><h4><img src="./assets/uploads/report-rule-repair.svg" width="14" height="14" alt=""/>核验建议</h4><p title={miningImpact[rule.id]?.next || "结合安全规范、设备角色与业务规划确认候选要求。"}>{miningImpact[rule.id]?.next || "结合安全规范、设备角色与业务规划确认候选要求。"}</p></section></div>
      </article>)}</div>
      <p className="uc2-report-footnote">点击规则名称定位下方明细；设备可能命中多条规则，偏离数不可直接相加。</p>
    </section>
    <section className="v7-check-details" id="uc2CandidateDetails" ref={detailsRef}>
      <div className="v7-result-toolbar"><h3 className="v7-section-title">待选规则明细</h3><span className="uc2-section-hint">共 {uc2Rules.length} 条候选规则</span></div>
      <div className="v7-status-row"><OptionGroup cls="v7-status-filters" ariaLabel="候选审阅状态筛选" options={[["all","全部"],["pending","待审阅"],["accepted","已采用"],["rejected","暂不采用"]]} value={uc2.status || "all"} onChange={status=>setFilter({status})} renderOption={opt=><><i className={opt[0]}/>{opt[1]} <strong>{opt[0]==="all"?uc2Rules.length:uc2Rules.filter(rule=>reviewOf(rule)===opt[0]).length}</strong></>}/></div>
      <div className="uc2-filter v7-table-tools"><SearchInput value={uc2.query || ""} onChange={query=>setFilter({query})} placeholder="搜索规则名称、编号或功能" ariaLabel="搜索候选规则" clearable/><label className="v7-rule-select"><select aria-label="候选规则角色筛选" value={uc2.role || "全部角色"} onChange={e=>setFilter({role:e.target.value})}>{["全部角色",...roles].map(value=><option key={value}>{value}</option>)}</select></label><label className="v7-rule-select"><select aria-label="规则功能筛选" value={uc2.category || "全部功能"} onChange={e=>setFilter({category:e.target.value})}>{["全部功能",...categories].map(value=><option key={value}>{value}</option>)}</select></label><label className="v7-rule-select"><select aria-label="候选规则置信度筛选" value={uc2.confidence || "全部置信度"} onChange={e=>setFilter({confidence:e.target.value})}>{["全部置信度","高","待验证"].map(value=><option key={value} value={value}>{value==="高"?"高置信":value}</option>)}</select></label></div>
      <div className="v7-table-scroll"><table className="rule-table v7-table uc2-candidate-table"><colgroup>{[30,13,13,10,10,12,12].map((width,index)=><col key={index} style={{width:width+"%"}}/>)}</colgroup><thead><tr><th>候选规则名称</th><th>适用角色</th><th className="uc2-number" aria-sort={sort?.key==="support"?(sort.direction==="asc"?"ascending":"descending"):"none"}><button className="report-sort-button" onClick={()=>toggleSort("support")}>配置支持<Ic icon="arrow-down-up"/></button></th><th className="uc2-number" aria-sort={sort?.key==="deviations"?(sort.direction==="asc"?"ascending":"descending"):"none"}><button className="report-sort-button" onClick={()=>toggleSort("deviations")}>偏离样本<Ic icon="arrow-down-up"/></button></th><th>置信度</th><th>审阅状态</th><th>操作</th></tr></thead><tbody>
        {rs.slice((current-1)*pageSize,current*pageSize).map(rule=><tr key={rule.id} data-rule-id={rule.id}><td><a href="#" className="uc2-rule-name" title={rule.name} onClick={e=>{e.preventDefault();uc2OpenRule(rule.id);}}>{rule.name}</a><span className="uc2-rule-subtitle" title={rule.id+" · "+rule.category}>{rule.id} · {rule.category}</span></td><td>{rule.role}</td><td className="uc2-number">{rule.support} / {rule.scope}</td><td className="uc2-number">{rule.deviations?<a href="#" aria-label={`查看${rule.name}的${rule.deviations}台偏离样本`} onClick={e=>{e.preventDefault();uc2OpenRule(rule.id);}}>{rule.deviations} 台</a>:<span className="muted">0 台</span>}</td><td><span className={"uc2-report-confidence "+(rule.confidence==="高"?"high":"")}><i/>{rule.confidence==="高"?"高置信":"待验证"}</span></td><td><span className={"uc2-status "+reviewOf(rule)}>{reviewLabels[reviewOf(rule)]}</span></td><td><button type="button" className="uc2-detail-action" aria-label={`新页签审阅：${rule.name}`} onClick={()=>uc2OpenRule(rule.id)}>审阅<Ic icon="arrow-up-right"/></button></td></tr>)}
        {!rs.length&&<tr><td colSpan="7"><EmptyState cls="uc2-empty" text="没有匹配的候选规则，请调整筛选条件。"/></td></tr>}
      </tbody></table></div>
      <div className="v7-pagination"><span>总计：{rs.length} 条</span><div className="row"><select className="report-page-size" aria-label="候选规则每页条数" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(size=><option key={size} value={size}>{size} 条/页</option>)}</select><button className="btn report-page-arrow" aria-label="候选规则上一页" disabled={current===1} onClick={()=>setPage(current-1)}><Ic icon="chevron-left"/></button>{Array.from({length:pages},(_,index)=><button key={index} className={"v7-page "+(current===index+1?"active":"")} aria-label={`候选规则第${index+1}页`} aria-current={current===index+1?"page":undefined} onClick={()=>setPage(index+1)}>{index+1}</button>)}<button className="btn report-page-arrow" aria-label="候选规则下一页" disabled={current===pages} onClick={()=>setPage(current+1)}><Ic icon="chevron-right"/></button></div></div>
    </section>
  </div>;
}

export { Uc2RuleDetail };
