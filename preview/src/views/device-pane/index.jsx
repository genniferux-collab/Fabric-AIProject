import { useEffect, useRef } from "react";
import { useApp, stateFor } from "../../context.jsx";
import { deviceById, failFor } from "../../mock/devices.js";
import { checks, checkById, instancesFor } from "../../mock/checks.js";
import { priorityLabels, priorityIndex, detailRulePosition } from "../../mock/audit.js";
import { ArtifactIcon } from "../../components/status-marks/index.jsx";
import RuleDetail from "./rule-detail.jsx";
import Ic from "../../components/icon-el/index.jsx";
import SearchInput from "../../components/search-input/index.jsx";
import EmptyState from "../../components/empty-state/index.jsx";

const CONCLUSION_STEP = "对HCS1区内的380台设备进行基线检查";

export function sshStatusSummary(d) {
  const records = instancesFor(d, checkById("ssh"));
  const failed = records.filter((i) => i.bad).length;
  return failed ? `${failed}处不通过 · ${records.length}个配置位置` : `通过 · ${records.length}个配置位置`;
}

function ruleSub(d, r) {
  if (r.id === "ssh") return sshStatusSummary(d);
  if (r.id === "timeout") return failFor(d, r) ? "2处不通过 · 3个配置位置" : "通过 · 3个配置位置";
  return failFor(d, r) ? "1处不通过 · 1个检查位置" : "通过 · 1个检查位置";
}

export default function DevicePane({ deviceId }) {
  const { deviceStatesRef, deviceVersion, bumpDevices, locate } = useApp();
  const detailRef = useRef(null);
  const d = deviceById(deviceId);
  const s = stateFor(deviceStatesRef.current, deviceId);

  const list = checks
    .filter((r) => (s.filter !== "failed" || failFor(d, r)) && r.name.toLowerCase().includes(s.search.toLowerCase()))
    .sort((a, b) => Number(failFor(d, b)) - Number(failFor(d, a)) || priorityIndex(a.priority) - priorityIndex(b.priority) || detailRulePosition(d, a.id) - detailRulePosition(d, b.id));

  const patch = (fn) => { fn(s); bumpDevices(); };

  const chooseRule = (id) => patch((st) => { st.rule = id; st.instance = id === "timeout" ? "vty" : "single"; st.scroll = 0; });
  const setRuleFilter = (f) => patch((st) => {
    st.filter = f;
    const visible = checks.filter((r) => (f !== "failed" || failFor(d, r)) && r.name.toLowerCase().includes(st.search.toLowerCase()));
    if (!visible.some((r) => r.id === st.rule)) st.rule = visible[0]?.id || null;
    st.instance = st.rule === "timeout" ? "vty" : "single";
    st.scroll = 0;
  });
  const searchRules = (q) => patch((st) => {
    st.search = q;
    const visible = checks.filter((r) => (st.filter !== "failed" || failFor(d, r)) && r.name.toLowerCase().includes(q.toLowerCase()));
    if (!visible.some((r) => r.id === st.rule)) {
      st.rule = visible[0]?.id || null;
      st.instance = st.rule === "timeout" ? "vty" : "single";
      st.scroll = 0;
    }
  });

  // 详情区滚动：恢复位置 / 完整配置定位证据行
  useEffect(() => {
    const el = detailRef.current;
    if (!el) return;
    if (s.mode === "full") {
      requestAnimationFrame(() => {
        const ev = el.querySelector("#selectedEvidence");
        const code = el.querySelector("#codeScroll");
        if (ev && code) code.scrollTop = Math.max(0, ev.offsetTop - code.offsetTop - 40);
      });
    } else {
      el.scrollTop = s.scroll;
    }
  }, [deviceVersion, deviceId, s.rule, s.instance, s.mode, s.excluded, s.filter, s.search]);

  if (!d) return null;

  return (
    <>
      <div className="v7-artifact-step-title">{CONCLUSION_STEP}</div>
      <section className="card device-overview artifact-card conclusion-artifact">
        <div className="between">
          <div className="row">
            <ArtifactIcon type="conclusion" shape="server" />
            <h2 className="device-title">{d.name}</h2>
            <span className={d.fails.length ? "bad-tag" : "good-tag"}>{d.fails.length ? "检查不通过" : "检查通过"}</span>
          </div>
          <button className="link small" onClick={() => locate("report")}>返回检查报告 →</button>
        </div>
        <div className="device-meta">
          <span>管理IP <strong>{d.ip}</strong></span>
          <span>厂商/型号 <strong>{d.vendor === "H3C" ? "H3C" : "华为"} / {d.model}</strong></span>
          <span>区域 <strong>西三旗 DC / HCS1</strong></span>
          <span>检查时间 <strong>14:20:00</strong></span>
          <span>规则版本 <strong>V1.2</strong></span>
        </div>
        <div className="device-result">
          <div className="result-head">
            <span className="bad">{d.fails.length}条不通过</span>
            <span className="muted">/</span>
            <span className="good">{checks.length - d.fails.length}条通过</span>
            <span className="muted">共{checks.length}条规则</span>
          </div>
        </div>
      </section>
      <div className="v7-artifact-step-title">{CONCLUSION_STEP}</div>
      <section className="card device-workspace artifact-card conclusion-artifact">
        <aside className="rule-navigation">
          <h3 className="rule-navigation-title v7-artifact-title">
            <ArtifactIcon type="conclusion" shape="rules" />规则检查结果
          </h3>
          <div className="rule-status-tabs">
            <button className={s.filter === "failed" ? "active" : ""} onClick={() => setRuleFilter("failed")}>不通过 {d.fails.length}</button>
            <button className={s.filter === "all" ? "active" : ""} onClick={() => setRuleFilter("all")}>全部 {checks.length}</button>
          </div>
          <SearchInput id="ruleSearch" className="rule-nav-search" value={s.search} onChange={searchRules} placeholder="搜索规则名称" ariaLabel="搜索检查规则" />
          {list.length ? list.map((r) => (
            <button
              key={r.id}
              className={"rule-list-item " + (failFor(d, r) ? "failed" : "") + (s.rule === r.id ? " active" : "")}
              aria-label={"查看规则：" + r.name}
              aria-pressed={s.rule === r.id}
              onClick={() => chooseRule(r.id)}
            >
              <span className="state-dot" />
              <span>
                <span className="rule-name">{r.name}</span>
                <span className="rule-sub">{priorityLabels[r.priority]}优先级 · {ruleSub(d, r)}</span>
              </span>
            </button>
          )) : <EmptyState text="无匹配规则" />}
        </aside>
        <article className="rule-detail" id="ruleDetail" ref={detailRef} onScroll={(e) => { s.scroll = e.currentTarget.scrollTop; }}>
          <RuleDetail d={d} s={s} patch={patch} detailRef={detailRef} />
        </article>
      </section>
    </>
  );
}
