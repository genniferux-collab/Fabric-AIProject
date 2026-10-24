import { useRef, useState } from "react";
import OptionGroup from "../../components/option-group/index.jsx";
import SearchInput from "../../components/search-input/index.jsx";
import "./report.css";
import { useApp } from "../../context.jsx";
import { uc2Rules, uc2DeviationDevices, uc2Actual, uc2ExportCsv } from "../../mock/uc2.js";
import { Uc2Title } from "./topology.jsx";
import MetricCard from "../../components/metric-card/index.jsx";
import EmptyState from "../../components/empty-state/index.jsx";
import Ic from "../../components/icon-el/index.jsx";

const reviewLabels = { pending: "待审阅", accepted: "已采用", rejected: "暂不采用" };

// 模块 3：候选报告 — 与 UC4 共用摘要 / TOP 概览 / 明细的信息层级。
export function Uc2Report() {
  const { uc2, uc2SetFilter, uc2OpenRule, uc2Reviews, toast } = useApp();
  const [lens, setLens] = useState("rules");
  const [page, setPage] = useState(1);
  const detailsRef = useRef(null);
  const reviewOf = (r) => uc2Reviews[r.id] || "pending";
  const accepted = uc2Rules.filter((r) => reviewOf(r) === "accepted").length;
  const highConfidence = uc2Rules.filter((r) => r.confidence === "高").length;
  const categories = [...new Set(uc2Rules.map((r) => r.category))];
  const rs = uc2Rules.filter((r) =>
    (uc2.role === "全部角色" || !uc2.role || r.role === uc2.role) &&
    (uc2.category === "全部功能" || !uc2.category || r.category === uc2.category) &&
    (uc2.status === "all" || !uc2.status || reviewOf(r) === uc2.status) &&
    (r.name + " " + r.id + " " + r.category).toLowerCase().includes((uc2.query || "").trim().toLowerCase())
  );
  const ranked = [...uc2Rules].sort((a, b) => b.deviations - a.deviations || b.support / b.scope - a.support / a.scope).slice(0, 5);
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(rs.length / pageSize));
  const current = Math.min(page, pages);
  const setFilter = (filter) => { uc2SetFilter(filter); setPage(1); };
  const showRole = (role) => {
    setFilter({ role, category: "全部功能", status: "all", query: "" });
    requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return (
    <div className="uc2-report v7-report">
      <div className="v7-report-heading">
        <div className="row"><Ic icon="file-text" /><h2>西三旗 DC · 黄金基线候选报告</h2></div>
        <span className="uc2-tag">待客户审阅</span>
      </div>
      <div className="v7-report-meta">西三旗 DC · 本轮分析 100 / 1,980 台交换机 · 18 条候选规则 · 基于本轮配置样本</div>
      <div className="v7-summary v11-summary">
        <section className="v7-compliance">
          <div className="uc2-report-ring" style={{ "--candidate-ratio": `${highConfidence / uc2Rules.length * 100}%` }} role="img" aria-label={`${highConfidence}条高置信候选，共${uc2Rules.length}条`}>
            <div><strong>{highConfidence}<small> / {uc2Rules.length}</small></strong><span>高置信候选</span></div>
          </div>
          <div className="v7-summary-counts"><span>待验证 <strong>{uc2Rules.length - highConfidence}</strong> 条</span><span>已采用 <strong>{accepted}</strong> 条</span></div>
        </section>
        <section className="v7-conclusion v11-conclusion">
          <div className="v7-conclusion-label"><Ic icon="sparkles" />挖掘结论</div>
          <p className="v12-summary-copy">分析 <strong>100 台样本设备</strong>，发现 <strong>18 条候选规则</strong>，其中 {highConfidence} 条高置信、{uc2Rules.length - highConfidence} 条待验证。<strong>9 台样本设备存在候选偏离</strong>，集中在超时、算法、VLAN 和接口描述，建议优先核验登录安全与核心冗余配置。</p>
          <div className="uc2-report-notice">候选偏离不等于正式违规。采用仅保存审阅结果，不会发布正式基线或执行设备变更。</div>
        </section>
      </div>
      <section className="v7-overview-section">
        <div className="v7-result-toolbar"><h3 className="v7-section-title">TOP概览</h3><OptionGroup cls="v7-lens" ariaLabel="候选概览维度" options={[["rules", "按候选规则"], ["roles", "按适用角色"]]} value={lens} onChange={setLens} /></div>
        <div className={"v7-top-grid " + (lens === "roles" ? "by-role" : "")}>
          {lens === "rules" ? ranked.map((r, i) => <article className="v7-top-card v8-overview-card v9-overview-card" key={r.id}>
            <div className="v7-card-title"><span className="v7-rank">{i + 1}</span><h3><button onClick={() => uc2OpenRule(r.id)}>{r.name}</button></h3></div>
            <div className="v7-device-ip">{r.role} · {r.confidence === "高" ? "高置信" : "待验证"}</div>
            <div className="v7-card-number"><strong>{r.deviations}</strong><span>台样本偏离</span></div>
            <div className="uc2-report-support"><span style={{ width: `${r.support / r.scope * 100}%` }} /></div>
            <div className="v7-device-ip">配置支持 {r.support} / {r.scope} 台</div>
            <section><h5>候选要求</h5><code>{r.cmd}</code></section>
            <a className="uc2-report-review" onClick={() => uc2OpenRule(r.id)}>审阅候选 <Ic icon="arrow-right" /></a>
          </article>) : ["通用", "核心交换机", "Leaf 交换机", "防火墙"].map((role) => {
            const rules = uc2Rules.filter((r) => r.role === role);
            return <article className="v7-top-card v8-overview-card v9-overview-card" key={role}><div className="v7-card-title"><h3>{role}</h3></div><div className="v7-card-number"><strong>{rules.length}</strong><span>条候选规则</span></div><p>{role === "防火墙" ? "未纳入本轮交换机分析范围" : role === "通用" ? "跨角色共性，单独统计不重复计入角色" : "基于同角色设备的配置共性提取"}</p><a className="uc2-report-review" onClick={() => showRole(role)}>查看候选 <Ic icon="arrow-right" /></a></article>;
          })}
        </div>
        <p className="uc2-report-footnote">{lens === "rules" ? "展示偏离样本数最高的 5 条候选；相同时按配置支持比例排序。设备可能命中多条规则，偏离数不可直接相加。" : "按适用角色互斥统计；防火墙 0 条表示未分析。"}</p>
      </section>
      <section className="v7-check-details" ref={detailsRef}>
        <div className="v7-result-toolbar"><h3 className="v7-section-title">候选规则明细</h3><button className="btn" onClick={() => { uc2ExportCsv(uc2Reviews); toast("候选规则已导出为 CSV。"); }}><Ic icon="download" /> 导出候选规则</button></div>
        <OptionGroup cls="v7-status-filters" ariaLabel="候选审阅状态筛选" options={[["all", "全部"], ["pending", "待审阅"], ["accepted", "已采用"], ["rejected", "暂不采用"]]} value={uc2.status || "all"} onChange={(status) => setFilter({ status })} renderOption={(opt) => <>{opt[1]} <strong>{opt[0] === "all" ? uc2Rules.length : uc2Rules.filter((r) => reviewOf(r) === opt[0]).length}</strong></>} />
        <div className="uc2-filter v7-table-tools">
          <select aria-label="候选规则角色筛选" value={uc2.role || "全部角色"} onChange={(e) => setFilter({ role: e.target.value })}>{["全部角色", "通用", "核心交换机", "Leaf 交换机", "防火墙"].map((c) => <option key={c}>{c}</option>)}</select>
          <select aria-label="候选规则功能筛选" value={uc2.category || "全部功能"} onChange={(e) => setFilter({ category: e.target.value })}>{["全部功能", ...categories].map((c) => <option key={c}>{c}</option>)}</select>
          <SearchInput value={uc2.query || ""} onChange={(query) => setFilter({ query })} placeholder="搜索规则名称、编号或功能" ariaLabel="搜索候选规则" clearable />
        </div>
        <div className="v7-table-scroll"><table className="rule-table v7-table"><thead><tr><th>候选规则名称</th><th>适用角色</th><th>配置支持</th><th>偏离样本</th><th>置信度</th><th>审阅状态</th><th>操作</th></tr></thead><tbody>
          {rs.slice((current - 1) * pageSize, current * pageSize).map((r) => <tr key={r.id}><td><a onClick={() => uc2OpenRule(r.id)}>{r.name}</a><br /><span className="muted small">{r.id} · {r.category}</span></td><td>{r.role}</td><td>{r.support} / {r.scope}</td><td>{r.deviations ? <a onClick={() => uc2OpenRule(r.id)}>{r.deviations} 台 ›</a> : "0 台"}</td><td><span className={"uc2-report-confidence " + (r.confidence === "高" ? "high" : "")}>{r.confidence}</span></td><td><span className={"uc2-status " + reviewOf(r)}>{reviewLabels[reviewOf(r)]}</span></td><td><a onClick={() => uc2OpenRule(r.id)}>审阅 →</a></td></tr>)}
          {!rs.length && <tr><td colSpan="7"><EmptyState cls="uc2-empty" text="没有匹配的候选规则；防火墙未纳入本轮分析。" /></td></tr>}
        </tbody></table></div>
        <div className="v7-pagination"><span>共 {rs.length} 条 · {pageSize} 条/页 · 配置支持为满足候选配置 / 适用样本数</span><div className="row"><button className="btn" disabled={current === 1} onClick={() => setPage(current - 1)}>上一页</button>{Array.from({ length: pages }, (_, i) => <button key={i} className={"v7-page " + (current === i + 1 ? "active" : "")} aria-label={`候选规则第${i + 1}页`} aria-current={current === i + 1 ? "page" : undefined} onClick={() => setPage(i + 1)}>{i + 1}</button>)}<button className="btn" disabled={current === pages} onClick={() => setPage(current + 1)}>下一页</button></div></div>
      </section>
    </div>
  );
}

// 模块 3（规则视图）：单条候选审阅
export function Uc2RuleDetail() {
  const { uc2, uc2SetFilter, uc2Review, uc2Reviews, toast } = useApp();
  const r = uc2Rules.find((x) => x.id === uc2.rule);
  if (!r) return null;
  const review = uc2Reviews[r.id] || "pending";
  const back = () => uc2SetFilter({ view: "stage", rule: null });
  const doReview = (status) => { uc2Review(r.id, status); toast("候选规则审阅状态已更新，尚未发布正式基线。"); };
  return (
    <>
      <button className="link uc2-back" onClick={back}>← 返回候选报告</button>
      <Uc2Title stage={3} title={r.name} sub={`${r.id} · ${r.role} · ${r.category}`} tag="候选规则" />
      <div className="uc2-metrics">
        <MetricCard label="适用样本" value={r.scope} unit="台" />
        <MetricCard label="配置支持" value={r.support} unit="台" />
        <MetricCard label="偏离样本" value={r.deviations} unit="台 · 待核验" />
        <MetricCard label="置信度" value={r.confidence} unit="基于示例样本" />
      </div>
      <div className="uc2-review">
        <h3>候选规则与配置证据</h3>
        <p className="uc2-note">来源：{r.role === "核心交换机" ? "核心角色样本及 CoreSwitch-01 / CoreSwitch-02 代表配置" : r.role === "Leaf 交换机" ? "Leaf 角色样本配置聚类" : "核心与 Leaf 样本的跨角色共性"}。</p>
        <code>{r.cmd}</code>
        <p className="uc2-note">{r.cmd.includes("<") ? "此项含角色或规划变量，需审阅变量范围后再定义判定条件。" : "候选配置为样本中的常见模式，需要结合安全规范和业务目标确认。"}</p>
      </div>
      <div className="uc2-review">
        <h3>偏离样本详情</h3>
        {r.deviations ? (
          <table className="rule-table">
            <thead><tr><th>设备</th><th>实际配置</th><th>候选要求</th></tr></thead>
            <tbody>
              {Array.from({ length: r.deviations }, (_, i) => (
                <tr key={i}>
                  <td>{uc2DeviationDevices[r.id]?.[i] || "待核验设备"}</td>
                  <td><code>{uc2Actual(r)}</code></td>
                  <td><code>{r.cmd}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="uc2-note">当前适用样本内未发现偏离，仍需验证业务正确性及更大范围的适用性。</p>}
      </div>
      <div className="uc2-review">
        <h3>审阅决定</h3>
        <p className="uc2-note">采用后仅保存候选审阅状态，不会直接发布正式基线或执行设备变更。</p>
        <button className="btn primary" onClick={() => doReview("accepted")}>采用此候选</button>
        <button className="btn" onClick={() => doReview("rejected")}>暂不采用</button>
        <button className="btn" onClick={() => doReview("pending")}>恢复待审阅</button>
        <span className="uc2-tag">{reviewLabels[review]}</span>
      </div>
    </>
  );
}
