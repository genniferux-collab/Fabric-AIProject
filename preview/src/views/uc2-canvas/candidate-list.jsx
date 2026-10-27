import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import { uc2Rules, uc2ExportCsv } from "../../mock/uc2.js";
import OptionGroup from "../../components/option-group/index.jsx";
import SearchInput from "../../components/search-input/index.jsx";
import EmptyState from "../../components/empty-state/index.jsx";
import Ic from "../../components/icon-el/index.jsx";
import { ArtifactIcon } from "../../components/status-marks/index.jsx";
import "./report.css";
import "../report-card/design.css";

const reviewLabels = { pending:"待审阅", accepted:"已采用", rejected:"暂不采用" };
const roles = ["通用", "核心交换机", "Leaf 交换机"];

export default function Uc2CandidateList({embedded=false}) {
  const { uc2, uc2SetFilter, uc2OpenRule, uc2Reviews, toast, activeArtifact, openArtifact } = useApp();
  const [sort,setSort] = useState(null);
  const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(embedded?(typeof window!=="undefined"&&window.innerHeight>=1200?5:3):10);
  const tableRef=useRef(null), tableScrollRef=useRef(0);
  useEffect(()=>{const frame=requestAnimationFrame(()=>{if(tableRef.current?.clientHeight)tableRef.current.scrollTop=tableScrollRef.current;});return()=>cancelAnimationFrame(frame);},[activeArtifact]);
  useEffect(()=>{setPage(1);tableScrollRef.current=0;},[uc2.role,uc2.category,uc2.confidence,uc2.status,uc2.query]);
  const reviewOf = rule => uc2Reviews[rule.id] || "pending";
  const categories = [...new Set(uc2Rules.map(r => r.category))];
  const filtered = uc2Rules.filter(r =>
    (!uc2.role || uc2.role === "全部角色" || r.role === uc2.role) &&
    (!uc2.category || uc2.category === "全部功能" || r.category === uc2.category) &&
    (!uc2.confidence || uc2.confidence === "全部置信度" || r.confidence === uc2.confidence) &&
    (!uc2.status || uc2.status === "all" || reviewOf(r) === uc2.status) &&
    (r.name + " " + r.id + " " + r.category).toLowerCase().includes((uc2.query || "").trim().toLowerCase())
  );
  const rs = [...filtered].sort((a,b) => sort ? (sort.key === "support" ? a.support/a.scope - b.support/b.scope : a.deviations - b.deviations) * (sort.direction === "asc" ? 1 : -1) || a.id.localeCompare(b.id) : a.id.localeCompare(b.id));
  const pages=Math.max(1,Math.ceil(rs.length/pageSize)),current=Math.min(page,pages);
  const resetScroll=()=>{tableScrollRef.current=0;if(tableRef.current)tableRef.current.scrollTop=0;};
  const selectPage=value=>{setPage(value);resetScroll();};
  const origin=embedded?"uc2-report":"uc2-rules";
  const setFilter=value=>{setPage(1);tableScrollRef.current=0;uc2SetFilter(value);if(tableRef.current)tableRef.current.scrollTop=0;};
  const toggleSort=key=>{setSort(value=>({key,direction:value?.key===key&&value.direction==="desc"?"asc":"desc"}));selectPage(1);};
  const exportReport=()=>{uc2ExportCsv(uc2Reviews);toast("黄金基线候选规则已导出为 CSV");};
  return <div className={"uc2-report v7-report report-design "+(embedded?"uc2-embedded-rules":"uc2-rules-workspace")} id={embedded?"uc2ReportRuleList":"uc2RuleList"}>
    {!embedded&&<>
    <div className="v7-report-heading"><div className="row"><ArtifactIcon type="conclusion" shape="report"/><h2 className="card-title">全部候选规则</h2></div><div className="uc2-report-actions"><button type="button" className="uc2-list-back" onClick={()=>openArtifact("uc2-report","黄金基线候选报告")}><Ic icon="arrow-left"/>返回报告</button><button type="button" className="icon-btn" aria-label="导出全部候选规则 CSV" title="导出候选规则（CSV）" onClick={exportReport}><Ic icon="download"/></button></div></div>
    <div className="v7-report-meta"><span><Ic icon="map-pin"/>西三旗 DC</span><span>共 {uc2Rules.length} 条候选规则</span></div>
    </>}
    <div className="uc2-report-body">
    <section className="v7-check-details" id={embedded?"uc2EmbeddedCandidateDetails":"uc2CandidateDetails"}>
      <div className="v7-result-toolbar"><h3 className="v7-section-title">候选规则明细</h3>{embedded?<SearchInput value={uc2.query || ""} onChange={query=>setFilter({query})} placeholder="搜索规则名称、编号" ariaLabel="搜索报告内候选规则" clearable/>:<span className="uc2-section-hint">共 {uc2Rules.length} 条候选规则</span>}</div>
      {!embedded&&<>
      <div className="v7-status-row"><OptionGroup cls="v7-status-filters" ariaLabel="候选审阅状态筛选" options={[["all","全部"],["pending","待审阅"],["accepted","已采用"],["rejected","暂不采用"]]} value={uc2.status || "all"} onChange={status=>setFilter({status})} renderOption={opt=><><i className={opt[0]}/>{opt[1]} <strong>{opt[0]==="all"?uc2Rules.length:uc2Rules.filter(rule=>reviewOf(rule)===opt[0]).length}</strong></>}/></div>
      <div className="uc2-filter v7-table-tools"><SearchInput value={uc2.query || ""} onChange={query=>setFilter({query})} placeholder="搜索规则名称、编号或功能" ariaLabel="搜索候选规则" clearable/><label className="v7-rule-select"><select aria-label="候选规则角色筛选" value={uc2.role || "全部角色"} onChange={e=>setFilter({role:e.target.value})}>{["全部角色",...roles].map(value=><option key={value}>{value}</option>)}</select></label><label className="v7-rule-select"><select aria-label="规则功能筛选" value={uc2.category || "全部功能"} onChange={e=>setFilter({category:e.target.value})}>{["全部功能",...categories].map(value=><option key={value}>{value}</option>)}</select></label><label className="v7-rule-select"><select aria-label="候选规则置信度筛选" value={uc2.confidence || "全部置信度"} onChange={e=>setFilter({confidence:e.target.value})}>{["全部置信度","高","待验证"].map(value=><option key={value} value={value}>{value==="高"?"高置信":value}</option>)}</select></label></div>
      </>}
      <div className="v7-table-scroll" ref={tableRef} onScroll={event=>{if(event.currentTarget.clientHeight)tableScrollRef.current=event.currentTarget.scrollTop;}} role="region" aria-label={embedded?"报告候选规则分页明细":"全量候选规则分页明细"} tabIndex={0}><table className="rule-table v7-table uc2-candidate-table"><colgroup>{[30,13,13,10,10,12,12].map((width,index)=><col key={index} style={{width:width+"%"}}/>)}</colgroup><thead><tr><th>候选规则名称</th><th>适用角色</th><th className="uc2-number" aria-sort={sort?.key==="support"?(sort.direction==="asc"?"ascending":"descending"):"none"}><button className="report-sort-button" onClick={()=>toggleSort("support")}>配置支持<Ic icon="arrow-down-up"/></button></th><th className="uc2-number" aria-sort={sort?.key==="deviations"?(sort.direction==="asc"?"ascending":"descending"):"none"}><button className="report-sort-button" onClick={()=>toggleSort("deviations")}>偏离样本<Ic icon="arrow-down-up"/></button></th><th>置信度</th><th>审阅状态</th><th>操作</th></tr></thead><tbody>
        {rs.slice((current-1)*pageSize,current*pageSize).map(rule=><tr key={rule.id} data-rule-id={rule.id}><td><a href="#" className="uc2-rule-name" title={rule.name} onClick={e=>{e.preventDefault();uc2OpenRule(rule.id,origin);}}>{rule.name}</a><span className="uc2-rule-subtitle" title={rule.id+" · "+rule.category}>{rule.id} · {rule.category}</span></td><td>{rule.role}</td><td className="uc2-number">{rule.support} / {rule.scope}</td><td className="uc2-number">{rule.deviations?<a href="#" aria-label={`查看${rule.name}的${rule.deviations}台偏离样本`} onClick={e=>{e.preventDefault();uc2OpenRule(rule.id,origin);}}>{rule.deviations} 台</a>:<span className="muted">0 台</span>}</td><td><span className={"uc2-report-confidence "+(rule.confidence==="高"?"high":"")}><i/>{rule.confidence==="高"?"高置信":"待验证"}</span></td><td><span className={"uc2-status "+reviewOf(rule)}>{reviewLabels[reviewOf(rule)]}</span></td><td><button type="button" className="uc2-detail-action" aria-label={`新页签审阅：${rule.name}`} onClick={()=>uc2OpenRule(rule.id,origin)}>审阅<Ic icon="arrow-up-right"/></button></td></tr>)}
        {!rs.length&&<tr><td colSpan="7"><EmptyState cls="uc2-empty" text="没有匹配的候选规则，请调整筛选条件。"/></td></tr>}
      </tbody></table></div>
      <div className="v7-pagination uc2-table-pagination"><span>共 {rs.length} 条 · {rs.length?(current-1)*pageSize+1:0}–{Math.min(current*pageSize,rs.length)} 条</span><div className="row"><select className="report-page-size" aria-label={embedded?"报告明细每页条数":"全部规则每页条数"} value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));selectPage(1);}}>{(embedded?[3,5,10]:[10,20,50]).map(size=><option key={size} value={size}>{size} 条/页</option>)}</select><button type="button" className="btn report-page-arrow" aria-label={embedded?"报告明细上一页":"全部规则上一页"} disabled={current===1} onClick={()=>selectPage(current-1)}><Ic icon="chevron-left"/></button>{Array.from({length:pages},(_,index)=><button type="button" key={index} className={"v7-page "+(current===index+1?"active":"")} aria-label={`${embedded?"报告明细":"全部规则"}第${index+1}页`} aria-current={current===index+1?"page":undefined} onClick={()=>selectPage(index+1)}>{index+1}</button>)}<button type="button" className="btn report-page-arrow" aria-label={embedded?"报告明细下一页":"全部规则下一页"} disabled={current===pages} onClick={()=>selectPage(current+1)}><Ic icon="chevron-right"/></button></div></div>
    </section>
    </div>
  </div>;
}
