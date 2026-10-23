import { useState } from "react";
import { Icon } from "../../../assets/shared/icon.jsx";
import { useApp } from "../../context.jsx";
import { fusionNodes, fusionEdges, fusionRelevant, fusionTopRules, fusionImpact, uc2RuleById, miningImpact, uc2DeviationDevices, uc2Actual } from "../../mock/uc2.js";
import Ic from "../../components/icon-el/index.jsx";

// 悬浮提示（原版追加到 body；经 portal 保持与 stage 缩放解耦）
function RuleTooltip({ rule, rect, onOpen }) {
  const r = uc2RuleById(rule);
  if (!r || !rect) return null;
  const left = Math.max(12, Math.min(rect.left - 260 - 16, window.innerWidth - 280 - 12));
  const top = Math.max(12, Math.min(rect.top - 35, window.innerHeight - 240));
  return ReactDOM.createPortal(
    <div id="fusionRuleTooltip" className="fusion-rule-tooltip" role="tooltip" style={{ left: left + "px", top: top + "px" }}>
      <div className="fusion-tooltip-label">候选规则 · {r.id}</div>
      <b>{r.name}</b>
      <div className="fusion-tooltip-meta">{r.confidence === "高" ? "高置信" : "待验证"} · {fusionImpact[r.id]}影响 · {r.role}</div>
      <div className="fusion-tooltip-counts">
        <span>依据 <strong>{r.support}</strong> 台</span><span>适用 {r.scope} 台</span><span>偏离 {r.deviations} 台</span>
      </div>
      <code>{r.cmd}</code>
      <small>点击打开规则详情</small>
    </div>,
    document.body
  );
}

function FusionGraph({ active }) {
  const { uc2, uc2Fusion, uc2FusionPick } = useApp();
  const [hoverId, setHoverId] = useState(null);
  const [tooltip, setTooltip] = useState(null); // {rule, rect}
  const selected = uc2Fusion.selected;
  const relevant = fusionRelevant(selected);
  const showRel = hoverId ? fusionRelevant(hoverId) : relevant;

  const edges = fusionEdges.map(([a, b], i) => {
    const f = fusionNodes.find((n) => n.id === a), t = fusionNodes.find((n) => n.id === b);
    const start = f.x + (a === "engine" ? 46 : 25);
    const end = t.x - (b === "engine" ? 46 : b.startsWith("rule:") ? 13 : 25);
    const d = a === "engine"
      ? `M${start} ${f.y} H725 C770 ${f.y} 770 ${t.y} ${end} ${t.y}`
      : `M${start} ${f.y} C${start + (end - start) * 0.53} ${f.y} ${start + (end - start) * 0.47} ${t.y} ${end} ${t.y}`;
    const hot = showRel.has(a) && showRel.has(b);
    return (
      <g key={a + ":" + b} className={"fusion-edge " + (hot ? "related" : "dim")} data-fusion-from={a} data-fusion-to={b}>
        <path d={d} className="fusion-flow-width" strokeWidth={a === "leaf" || a === "leafsample" ? 9 : 4} />
        <path d={d} className="fusion-flow-line" />
        {active && hot ? <circle r="2" fill="#a1d3d1"><animateMotion dur={3.5 + i * 0.2 + "s"} begin={-i * 0.3 + "s"} repeatCount="indefinite" path={d} /></circle> : null}
      </g>
    );
  });

  const engineDots = [];
  for (let i = 0; i < 110; i++) {
    const a = i * 2.39996, r = Math.sqrt(i / 110) * 38;
    engineDots.push(<circle key={i} cx={(595 + Math.cos(a) * r).toFixed(1)} cy={(285 + Math.sin(a) * r).toFixed(1)} r={i % 3 === 0 ? 1.5 : 1} fill={i % 12 === 0 ? "#b6a5c9" : "#80c9c5"} opacity={(0.35 + (i % 5) * 0.12).toFixed(2)} />);
  }

  const nodeHandlers = (n) => ({
    onClick: () => uc2FusionPick(n.id),
    onMouseEnter: (e) => {
      setHoverId(n.id);
      if (n.rule) setTooltip({ rule: n.rule.id, rect: e.currentTarget.getBoundingClientRect() });
    },
    onMouseLeave: () => { setHoverId(null); setTooltip(null); },
    onFocus: (e) => {
      setHoverId(n.id);
      if (n.rule) setTooltip({ rule: n.rule.id, rect: e.currentTarget.getBoundingClientRect() });
    },
    onBlur: () => { setHoverId(null); setTooltip(null); },
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); uc2FusionPick(n.id); } },
  });

  return (
    <>
      <svg className={"fusion-graph" + (active ? " active" : "")} viewBox="0 0 1180 565" role="img" aria-label="黄金基线挖掘过程：角色聚类、代表配置对比、AI共性提取、候选规则形成">
        <defs>
          <radialGradient id="fusionGlow"><stop stopColor="#557c7e" stopOpacity=".16" /><stop offset="1" stopColor="#557c7e" stopOpacity="0" /></radialGradient>
          <pattern id="fusionDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r=".5" fill="#95a8b1" opacity=".13" /></pattern>
        </defs>
        <rect width="1180" height="565" fill="url(#fusionDots)" />
        <ellipse cx="595" cy="285" rx="190" ry="180" fill="url(#fusionGlow)" />
        <g className="fusion-lane-labels">
          <text x="105" y="40" textAnchor="middle">角色聚类</text>
          <text x="324" y="40" textAnchor="middle">代表配置对比</text>
          <text x="595" y="40" textAnchor="middle">共性提取</text>
          <text x="985" y="33" textAnchor="middle">候选规则 · TOP{fusionTopRules().length}</text>
          <text x="985" y="55" textAnchor="middle" className="fusion-comparison-sub">置信度 → 影响级别 → 支持设备数</text>
        </g>
        <path d="M215 58V505M448 58V505M790 58V520" className="fusion-lane-divider" />
        {edges}
        {fusionNodes.map((n) => {
          const isEngine = n.id === "engine";
          const isRule = !!n.rule;
          const dim = !showRel.has(n.id);
          const cls = ["fusion-node", selected === n.id ? "selected" : "", dim ? "dim" : "", hoverId === n.id ? "hovered" : "", isEngine ? "engine" : "", isRule ? "rule" : ""].filter(Boolean).join(" ");
          return (
            <g key={n.id} className={cls} data-fusion-node={n.id} role="button" tabIndex={0} aria-label={"挖掘过程：" + n.label} {...nodeHandlers(n)}>
              {!isRule ? <title>{n.label} · {n.sub}</title> : null}
              <rect x={n.x - (isRule ? 18 : 65)} y={n.y - (isRule ? 18 : 40)} width={isRule ? 370 : 140} height={isRule ? 42 : 115} fill="transparent" />
              {isEngine ? (
                <>
                  <circle className="fusion-engine-aura" cx={n.x} cy={n.y} r="66" />
                  <circle className="fusion-engine-ring" cx={n.x} cy={n.y} r="53" />
                  <g className="fusion-engine-dots">{engineDots}</g>
                </>
              ) : isRule ? (
                <>
                  <circle className="fusion-rank-circle" cx={n.x} cy={n.y} r="14" />
                  <g className="fusion-rule-glyph" transform={`translate(${n.x - 9} ${n.y - 9}) scale(.75)`}>
                    <Ic icon="clipboard-list" style={{ width: "18px", height: "18px" }} />
                  </g>
                </>
              ) : (
                <>
                  <circle className="fusion-node-halo" cx={n.x} cy={n.y} r="29" />
                  <circle className="fusion-node-center" cx={n.x} cy={n.y} r="21" />
                  <g transform={`translate(${n.x - 10} ${n.y - 10})`}>
                    <Icon name={n.icon === "rules" ? "clipboard-list" : n.icon} className="ic" strokeWidth={1.6} style={{ width: "20px", height: "20px" }} />
                  </g>
                  <circle className="fusion-ready" cx={n.x + 17} cy={n.y - 16} r="3" />
                </>
              )}
              <text className={"fusion-node-title" + (isRule ? " fusion-top-title" : "")} x={isRule ? n.x + 24 : n.x} y={isRule ? n.y - 3 : n.y + (isEngine ? 91 : 50)} textAnchor={isRule ? "start" : "middle"}>{n.label}</text>
              <text className={"fusion-node-sub" + (isRule ? " fusion-top-sub" : "")} x={isRule ? n.x + 24 : n.x} y={isRule ? n.y + 15 : n.y + (isEngine ? 113 : 70)} textAnchor={isRule ? "start" : "middle"}>{n.sub}</text>
            </g>
          );
        })}
        <text x="324" y="345" textAnchor="middle" className="fusion-comparison">同角色配置对比</text>
        <text x="324" y="366" textAnchor="middle" className="fusion-comparison-sub">SSH · AAA · VRRP</text>
        <g className="fusion-output-total">
          <text x="985" y="548" textAnchor="middle"><tspan className="fusion-candidate-total">18</tspan> 条候选 · 12 高置信 · 6 待验证</text>
        </g>
      </svg>
      <RuleTooltip rule={tooltip?.rule} rect={tooltip?.rect} onOpen={uc2FusionPick} />
    </>
  );
}

function FusionContext() {
  const { uc2, uc2Fusion, uc2OpenRule } = useApp();
  const id = uc2Fusion.selected;
  const r = uc2Fusion.rule ? uc2RuleById(uc2Fusion.rule) : null;
  let title, desc, evidence, source;
  if (r) {
    title = "候选依据 · " + r.name;
    desc = r.id === "GB-012"
      ? "80 台 Leaf 样本中，77 台遵循相同角色 VLAN 模式；3 台存在差异，需结合规划确认。"
      : "候选模式来自适用样本的配置共性，需结合业务和规划审阅后采用。";
    evidence = r.cmd;
    source = `${r.confidence === "高" ? "高置信" : "待验证"} · ${fusionImpact[r.id]}影响（示例分级） · 依据 ${r.support} 台设备`;
  } else if (id === "core1" || id === "core2") {
    title = (id === "core1" ? "CoreSwitch-01" : "CoreSwitch-02") + " · 代表配置";
    desc = "将两台同角色代表设备进行配置对比，识别共同的功能片段；设备地址、主机名、优先级保留为差异。";
    evidence = "protocol inbound ssh\nauthentication-mode aaa\nvrrp vrid 1 virtual-ip <按规划>";
    source = "CE12800 · 核心角色 · 配置快照";
  } else if (id === "core" || id === "leaf" || id === "leafsample") {
    title = id === "core" ? "核心角色聚类" : "Leaf 角色聚类";
    desc = id === "core"
      ? "从 20 台核心交换机中选取 CoreSwitch-01、CoreSwitch-02 作为代表，提取可比较的配置特征。"
      : "80 台 Leaf 样本独立聚类、标准化并对比；Leaf 规则不从核心设备直接推断。";
    evidence = "角色 → 型号 / 版本 → 配置特征";
    source = "本轮 100 台分析样本 · 20 Core / 80 Leaf";
  } else {
    title = "共性提取如何形成候选";
    desc = "标准化设备变量 → 对比跨设备配置片段 → 回看适用样本支持度。将通用模式与角色专属模式分别形成候选规则。";
    evidence = "保留角色变量，剔除设备唯一值\n输出：通用模式 + 核心角色模式 + Leaf 角色模式";
    source = "代表配置发现模式 · 适用样本验证";
  }
  return (
    <section className="fusion-context" aria-label="当前挖掘节点依据">
      <div className="fusion-context-caption">
        <span>分析上下文</span>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      <div className="fusion-context-proof">
        <span>{source}</span>
        <pre>{evidence}</pre>
        {r ? (
          <div className="fusion-rule-context">
            <span>支持 {r.support} / {r.scope} · {r.deviations} 台差异待核验</span>
            {uc2.max === 3 ? <button onClick={() => uc2OpenRule(r.id)}>在报告中审阅 →</button> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FusionDrawer() {
  const { uc2, uc2Fusion, uc2FusionCloseDrawer, uc2OpenRule, toast } = useApp();
  const r = uc2RuleById(uc2Fusion.drawer);
  if (!r) return null;
  const meta = miningImpact[r.id];
  const ds = uc2DeviationDevices[r.id] || [];
  const source = r.role === "Leaf 交换机" ? "Leaf 样本配置" : r.role === "核心交换机" ? "CoreSwitch-01 / CoreSwitch-02" : "核心与 Leaf 样本";
  const copy = async () => {
    try { await navigator.clipboard.writeText(r.cmd); toast("候选配置已复制"); }
    catch { toast("浏览器未允许复制，请选中配置手动复制"); }
  };
  return (
    <aside className="fusion-rule-drawer" role="region" aria-label="单规则详情">
      <div className="fusion-drawer-header">
        <span>单规则详情</span>
        <button aria-label="关闭单规则详情" onClick={uc2FusionCloseDrawer}>×</button>
      </div>
      <div className="fusion-drawer-body">
        <div className="fusion-drawer-id">{r.id} · {r.category}</div>
        <h3>{r.name}</h3>
        <div className="fusion-drawer-tags">
          <span>{r.confidence === "高" ? "高置信" : "待验证"}</span>
          <span>{fusionImpact[r.id]}影响</span>
          <span>{r.role}</span>
        </div>
        <div className="fusion-drawer-metrics">
          <div><b>{r.support}<small>/{r.scope}</small></b><label>设备支持度</label></div>
          <div><b>{r.deviations}</b><label>偏离设备</label></div>
        </div>
        <section>
          <h4>候选判定条件</h4>
          <pre>{r.cmd}</pre>
          <p>由适用样本的配置共性形成，影响级别为示例分级。</p>
        </section>
        <section>
          <h4>配置证据</h4>
          <div className="fusion-drawer-source">{source} · 配置快照示例</div>
          <label className="fusion-drawer-code-label">共性配置</label>
          <pre>{r.cmd}</pre>
          {r.deviations ? (
            <>
              <label className="fusion-drawer-code-label">偏离样本</label>
              <pre className="deviation">{meta?.actual || uc2Actual(r)}</pre>
            </>
          ) : <p>当前适用样本未发现偏离。</p>}
        </section>
        <section>
          <h4>影响与核验</h4>
          <p>{meta?.impact || "当前样本显示该配置模式具有共性，需确认角色范围、规划变量和业务例外。"}</p>
          <p>{meta?.next || "请结合业务规划和安全规范核验后采用候选规则。"}</p>
        </section>
        {ds.length ? (
          <section>
            <h4>偏离设备 · {ds.length} 台</h4>
            <div className="fusion-drawer-devices">{ds.map((d) => <span key={d}>{d}</span>)}</div>
          </section>
        ) : null}
        <div className="fusion-drawer-note">候选尚未发布为正式基线，未执行设备变更。</div>
        <div className="fusion-drawer-actions">
          <button className="btn" onClick={copy}>复制候选配置</button>
          {uc2.max === 3 ? <button className="btn primary" onClick={() => uc2OpenRule(r.id)}>报告中审阅 →</button> : <span>报告生成后可审阅</span>}
        </div>
      </div>
    </aside>
  );
}

// 模块 2：黄金基线挖掘（fusion 图）
export default function Uc2Mining() {
  const { uc2, uc2Fusion } = useApp();
  const done = uc2.max === 3;
  const active = uc2.running && !done;
  return (
    <div className="fusion-mining">
      <div className="unified-heading">
        <div>
          <h2>黄金基线挖掘</h2>
          <p>西三旗 DC · 100 台样本 · 核心 20 / Leaf 80 · 点击节点追踪挖掘依据</p>
        </div>
        <div className={"unified-status" + (active ? " running" : "")}><i />{done ? "候选已形成" : active ? "正在提取配置共性" : "分析已暂停"}</div>
      </div>
      <div className={"fusion-scene" + (uc2Fusion.drawer ? " with-rule-drawer" : "")}>
        <div className="fusion-workspace">
          <div className="fusion-visual">
            <FusionGraph active={active} />
            <FusionContext />
          </div>
          {uc2Fusion.drawer ? <FusionDrawer /> : null}
        </div>
      </div>
      <div className="fusion-process-caption">
        <span>代表设备发现模式，适用样本回看验证。</span>
        <small>完整结果与审阅操作见下方报告</small>
      </div>
    </div>
  );
}
