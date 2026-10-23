import { useApp } from "../../context.jsx";
import { uc2Rules, uc2DeviationDevices, uc2Actual, uc2ExportCsv } from "../../mock/uc2.js";
import { Uc2Title } from "./topology.jsx";
import MetricCard from "../../components/metric-card/index.jsx";
import EmptyState from "../../components/empty-state/index.jsx";
import Ic from "../../components/icon-el/index.jsx";

const reviewLabels = { pending: "待审阅", accepted: "已采用", rejected: "暂不采用" };

function Uc2Bar({ label, n, max }) {
  return (
    <div className="uc2-bar"><label>{label}</label><span><i style={{ width: (n / max) * 100 + "%" }} /></span><b>{n}</b></div>
  );
}

// 模块 3：候选报告
export function Uc2Report() {
  const { uc2, uc2SetFilter, uc2OpenRule, uc2Reviews, toast } = useApp();
  const accepted = uc2Rules.filter((r) => (uc2Reviews[r.id] || "pending") === "accepted").length;
  const rs = uc2Rules.filter((r) =>
    (uc2.role === "全部角色" || !uc2.role || r.role === uc2.role) &&
    (uc2.category === "全部功能" || !uc2.category || r.category === uc2.category) &&
    (uc2.status === "all" || !uc2.status || (uc2Reviews[r.id] || "pending") === uc2.status) &&
    r.name.includes(uc2.query || "")
  );
  const categories = [...new Set(uc2Rules.map((r) => r.category))];

  return (
    <>
      <Uc2Title stage={3} title="西三旗 DC · 黄金基线候选报告" sub="本轮分析 100 / 1,980 台交换机 · 候选规则尚未发布为正式基线" tag="待客户审阅" />
      <div className="uc2-metrics">
        <MetricCard label="接入分析设备" value="100" unit="核心 20 · Leaf 80" />
        <MetricCard label="候选可用规则" value="18" unit="12 条高置信 · 6 条待验证" />
        <MetricCard label="存在候选偏离" value="9" unit="台样本设备 · 可重叠命中规则" />
        <MetricCard label="审阅已采用" value={accepted} unit="条 · 尚未发布" />
      </div>
      <div className="uc2-selection">
        <h3><Ic icon="sparkles" /> 黄金挖掘洞察</h3>
        <p>发现 4 条跨角色共性、6 条核心角色规则、8 条 Leaf 角色规则。优先审阅登录安全、核心冗余等高一致性配置模式。</p>
        <p>偏离集中在超时、算法、VLAN 和接口描述；可能是业务差异或例外配置，应结合规划核验。9 台设备仅表示偏离候选规则，尚不能认定为正式违规。</p>
      </div>
      <div className="uc2-split">
        <div>
          <h3>按功能统计 · 18 条</h3>
          {["账户与访问安全", "VLAN 与二层网络", "路由与冗余", "运维可观测性", "接口可靠性"].map((c) => (
            <Uc2Bar key={c} label={c} n={uc2Rules.filter((r) => r.category === c).length} max={6} />
          ))}
        </div>
        <div>
          <h3>按适用角色统计 · 互斥口径</h3>
          {[["通用", 4], ["核心交换机", 6], ["Leaf 交换机", 8], ["防火墙", 0]].map(([c, n]) => (
            <Uc2Bar key={c} label={c} n={n} max={8} />
          ))}
          <p className="uc2-note">通用规则单独统计，不重复计入角色；防火墙未纳入本轮交换机范围，0 表示未分析。</p>
        </div>
      </div>
      <div className="between">
        <h3 style={{ fontSize: "16px", fontWeight: 500 }}>候选结果详情</h3>
        <button className="btn" onClick={() => { uc2ExportCsv(uc2Reviews); toast("候选规则已导出为 CSV。"); }}>导出候选规则</button>
      </div>
      <div className="uc2-filter">
        <select aria-label="候选规则角色筛选" value={uc2.role || "全部角色"} onChange={(e) => uc2SetFilter({ role: e.target.value })}>
          {["全部角色", "通用", "核心交换机", "Leaf 交换机", "防火墙"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="候选规则功能筛选" value={uc2.category || "全部功能"} onChange={(e) => uc2SetFilter({ category: e.target.value })}>
          {["全部功能", ...categories].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="候选审阅状态筛选" value={uc2.status || "all"} onChange={(e) => uc2SetFilter({ status: e.target.value })}>
          {[["all", "全部审阅状态"], ["pending", "待审阅"], ["accepted", "已采用"], ["rejected", "暂不采用"]].map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
        <input aria-label="搜索候选规则" placeholder="搜索规则名称" value={uc2.query || ""} onChange={(e) => uc2SetFilter({ query: e.target.value })} />
      </div>
      <table className="rule-table uc2-table">
        <thead><tr><th>候选规则名称</th><th>适用角色</th><th>支持度</th><th>偏离设备</th><th>置信度</th><th>审阅状态</th><th>操作</th></tr></thead>
        <tbody>
          {rs.map((r) => (
            <tr key={r.id}>
              <td>
                <button onClick={() => uc2OpenRule(r.id)}>{r.name}</button><br />
                <span className="muted small">{r.id} · {r.category}</span>
              </td>
              <td>{r.role}</td>
              <td>{r.support} / {r.scope}</td>
              <td>{r.deviations ? <button onClick={() => uc2OpenRule(r.id)}>{r.deviations} 台 ›</button> : "0 台"}</td>
              <td>{r.confidence}</td>
              <td><span className={"uc2-status " + (uc2Reviews[r.id] || "pending")}>{reviewLabels[uc2Reviews[r.id] || "pending"]}</span></td>
              <td><button onClick={() => uc2OpenRule(r.id)}>审阅 →</button></td>
            </tr>
          ))}
          {!rs.length ? <tr><td colSpan="7"><EmptyState cls="uc2-empty" text="没有匹配的候选规则；防火墙未纳入本轮分析。" /></td></tr> : null}
        </tbody>
      </table>
      <div className="uc2-note" style={{ marginTop: "12px" }}>当前 {rs.length} / 18 条候选规则 · 支持度为满足候选配置的样本数 / 适用样本数</div>
    </>
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
