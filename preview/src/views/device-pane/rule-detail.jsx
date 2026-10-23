import { useApp } from "../../context.jsx";
import { failFor } from "../../mock/devices.js";
import { checkById, instancesFor, snapshotFor, rawSegments, sshCommands, SSH_TARGET_HMAC } from "../../mock/checks.js";
import { PriorityBadge, StatusMark } from "../../components/status-marks/index.jsx";

// 原始值高亮（mark 形态 — 配置快照行内标记）
function RawMarks({ r, i }) {
  return (
    <>
      {rawSegments(r, i).map((seg, idx) => (seg.bad ? <mark key={idx}>{seg.text}</mark> : <span key={idx}>{seg.text}</span>))}
    </>
  );
}
function RawInline({ r, i }) {
  return (
    <>
      {rawSegments(r, i).map((seg, idx) => (seg.bad ? <span key={idx} className="fail-param">{seg.text}</span> : <span key={idx}>{seg.text}</span>))}
    </>
  );
}

function CodeLine({ num, content, cls = "", note = "", noteClass = "", id }) {
  return (
    <div id={id} className={"code-line " + cls}>
      <span className="gutter">{cls === "bad-line" ? "!" : ""}</span>
      <span className="lineno">{num}</span>
      <span className="code-text">{content}</span>
      {note ? <span className={"annotation " + noteClass}>{note}</span> : null}
    </div>
  );
}

// 语义对比（规则要求 vs 设备实际 + 阈值可视化）
function SemanticComparison({ d, r, i }) {
  if (i.excluded) {
    return (
      <div className="semantic-comparison">
        <span className="small muted">判定：不在本规则检查范围内，不参与数值比较。</span>
        <span className="tag">已排除</span>
      </div>
    );
  }
  const time = r.id === "timeout";
  const expected = time ? "≤10分钟" : r.id === "mgmt" ? d.planned : r.expected;
  return (
    <div className="semantic-comparison">
      <div className="compare-values">
        <div><label>{time ? "规则上限" : "规则要求"}</label><strong>{expected}</strong></div>
        <span className="muted">→</span>
        <div><label>设备实际</label><strong className={i.bad ? "bad" : "good"}>{i.actual}</strong></div>
        <div><label>判定说明</label><strong className={"delta " + (i.bad ? "bad" : "good")}>{i.delta}</strong></div>
      </div>
      {time ? (
        <div className="threshold-viz" aria-label={`规则上限10分钟，实际${i.actual}`}>
          <div className="threshold-track" />
          <div className="threshold-safe" />
          <div className="threshold-limit" />
          <span className="threshold-limit-label">10分钟上限</span>
          <span className="threshold-dot" style={{ left: ((i.minutes + i.seconds / 60) / 20) * 100 + "%", background: i.bad ? undefined : "var(--good)" }} />
          <span className="threshold-current" style={{ left: ((i.minutes + i.seconds / 60) / 20) * 100 + "%", color: i.bad ? undefined : "var(--good)" }}>{i.actual}</span>
        </div>
      ) : null}
    </div>
  );
}

// 配置证据（相关配置 / 完整配置）
function ConfigView({ d, r, i, s, records, onMoveInstance, onSetMode }) {
  const full = s.mode === "full";
  const lines = [];
  if (full) {
    snapshotFor(d).forEach((text, index) => {
      const line = index + 1;
      const match = records.find((x) => x.line === line);
      if (!match) { lines.push(<CodeLine key={line} num={line} content={text} />); return; }
      const cls = match.excluded ? "excluded-line" : match.bad ? "bad-line" : "good-line";
      const leading = text.startsWith(" ") ? " " : "";
      lines.push(
        <CodeLine
          key={line}
          id={match.id === i.id ? "selectedEvidence" : undefined}
          num={line}
          content={<>{leading}{match.cmd} <RawMarks r={r} i={match} /></>}
          cls={cls}
          note={match.excluded ? "未纳入本规则检查" : match.delta}
          noteClass={match.excluded ? "muted" : match.bad ? "" : "good"}
        />
      );
    });
  } else {
    const base = i.line;
    const system = i.path === "系统视图";
    if (!system) lines.push(<CodeLine key="p" num={base - 2} content={i.path} />);
    if (r.id === "timeout" && !i.excluded) lines.push(<CodeLine key="a" num={base - 1} content=" authentication-mode aaa" />);
    else if (!system) lines.push(<CodeLine key="a" num={base - 1} content={r.id === "mgmt" ? " description Management" : " # 配置上下文"} />);
    const cls = i.excluded ? "excluded-line" : i.bad ? "bad-line" : "good-line";
    lines.push(
      <CodeLine
        key="m"
        id="selectedEvidence"
        num={base}
        content={<>{system ? "" : " "}{i.cmd} <RawMarks r={r} i={i} /></>}
        cls={cls}
        note={i.excluded ? "未纳入本规则检查" : i.delta}
        noteClass={i.excluded ? "muted" : i.bad ? "" : "good"}
      />
    );
    lines.push(<CodeLine key="e" num={base + 1} content="#" />);
  }
  return (
    <div className="config-view">
      <div className="source-line">
        <span>{d.name}.cfg · 快照 2026-10-21 14:19:55</span>
        <span>{full ? "完整配置 · 180行 · 标记当前规则结果" : `当前检查位置 · L${i.line - 2}–L${i.line + 1}`}</span>
      </div>
      <div className="code-scroll" id="codeScroll">{lines}</div>
      <div className="config-footer">
        <span>{i.excluded ? "灰色：未参与本规则检查" : i.bad ? "红色行：不通过 · 参数高亮：触发判定的值" : "绿色：该检查位置已检查且通过"}</span>
        {r.id === "timeout" ? (          <span>
            检查位置 {(records.filter((x) => !x.excluded).findIndex((x) => x.id === i.id) + 1) || "—"} / 3
            <button aria-label="上一个检查位置" onClick={() => onMoveInstance(-1)}>↑</button>
            <button aria-label="下一个检查位置" onClick={() => onMoveInstance(1)}>↓</button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

// 修复建议（非 SSH）
function FixSection({ d, r, i, onCopy }) {
  const target = r.id === "mgmt" ? d.planned + " 255.255.255.0" : r.target;
  const context = i.path === "系统视图" ? "system-view" : i.path;
  const ntp = r.id === "ntp2", vlan = r.id === "vlan3";
  const reason = ntp
    ? "将主时钟源恢复为规划地址10.10.0.10，保留备用时钟源。"
    : vlan
      ? "移除未规划的VLAN 300，保留业务VLAN 100、200。"
      : r.id === "timeout"
        ? `建议将${i.name}的空闲超时时间调整为10分钟；本规则允许所有不超过10分钟的有效取值，此处提供10分钟作为建议目标。`
        : r.id === "mgmt"
          ? `建议将设备管理IP恢复为${d.planned}；若实际地址变更已获批准，应先更新规划台账及关联策略。`
          : `建议将SSH加密算法调整为${r.target}，使其符合本次安全基线。`;
  const minus = ntp ? `− ntp-service unicast-server ${i.raw}` : `− ${i.cmd} ${i.raw}`;
  const plus = ntp ? `+ ntp-service unicast-server ${r.target}` : `+ ${i.cmd} ${target}`;
  return (
    <section className="fix-section">
      <div className="between"><h4 className="fix-heading">修复建议</h4><span className="small muted">建议修改 · 尚未执行</span></div>
      <p className="fix-text">{reason}</p>
      <div className="fix-diff">
        <div className="context">{ntp ? "system-view" : context}</div>
        <div className="minus">{minus}</div>
        <div className="plus">{plus}</div>
      </div>
      <div className="fix-actions">
        <span className="small muted">红/绿表示拟删除与新增内容</span>
        <button className="btn" onClick={onCopy}>复制修复命令</button>
      </div>
    </section>
  );
}

// SSH 证据
function SshEvidence({ d, s, records, onSetMode }) {
  const r = checkById("ssh");
  const chosen = records.find((x) => x.id === s.instance) || records[0];
  const full = s.mode === "full";
  const lines = [];
  snapshotFor(d).forEach((text, index) => {
    const line = index + 1;
    if (!full && line > 4) return;
    const match = records.find((x) => x.line === line);
    if (!match) {
      lines.push(<CodeLine key={line} num={line} content={text} note={line === 2 ? "认证上下文，不参与弱算法判定" : ""} noteClass="muted" />);
      return;
    }
    lines.push(
      <CodeLine
        key={line}
        id={chosen.id === match.id ? "selectedEvidence" : undefined}
        num={line}
        content={<>{match.cmd} <RawMarks r={r} i={match} /></>}
        cls={match.bad ? "bad-line" : "good-line"}
        note={match.delta}
        noteClass={match.bad ? "" : "good"}
      />
    );
  });
  return (
    <>
      <div className="evidence-heading">
        <h4>当前配置命中片段</h4>
        <div className="config-modes">
          <button className={full ? "" : "active"} onClick={() => onSetMode("related")}>相关配置</button>
          <button className={full ? "active" : ""} onClick={() => onSetMode("full")}>完整配置</button>
        </div>
      </div>
      <div className="config-view">
        <div className="source-line">
          <span>{d.name}.cfg · 快照 2026-10-21 14:19:55</span>
          <span>{full ? "完整配置 · 180行" : "L1–L4 · Cipher / HMAC"}</span>
        </div>
        <div className="code-scroll" id="codeScroll">{lines}</div>
        <div className="config-footer">
          <span>{failFor(d, r) ? "红色行：不通过 · 高亮：基线禁止或未允许的算法" : "绿色行：通过"}</span>
        </div>
      </div>
    </>
  );
}

// SSH 修复
function SshRepair({ d, onCopy, onCopyRollback }) {
  const r = checkById("ssh");
  const records = instancesFor(d, r);
  return (
    <section className="fix-section v7-ssh-fix">
      <div className="between"><h4 className="fix-heading">修复建议</h4><span className="small muted">命令已生成 · 尚未执行</span></div>
      <p className="fix-text">替换为 CTR + SHA2 套件，建议在凌晨维护窗口执行，执行前核验 SSH 客户端兼容性。</p>
      <div className="v7-ssh-change">
        <span>变更单 <strong>CH20261021-003</strong></span>
        <span>建议窗口：凌晨</span>
        <span>含回退命令</span>
      </div>
      <div className="fix-diff">
        {records.map((i) => (
          <div key={i.id + "-d"}>
            <div className="minus">− {i.cmd} {i.raw}</div>
            <div className="plus">+ {i.cmd} {i.id === "single" ? r.target : SSH_TARGET_HMAC}</div>
          </div>
        ))}
      </div>
      <div className="v7-ssh-command">
        <div className="between"><h5>整改命令 · 华为 VRP</h5><button className="link" onClick={onCopy}>复制整改命令</button></div>
        <pre><code>{sshCommands(d)}</code></pre>
      </div>
      <details className="v7-ssh-rollback">
        <summary>回退命令</summary>
        <p className="small muted">变更异常时恢复本次快照中的原配置。</p>
        <pre><code>{sshCommands(d, true)}</code></pre>
        <button className="link" onClick={onCopyRollback}>复制回退命令</button>
      </details>
    </section>
  );
}

export default function RuleDetail({ d, s, patch }) {
  const { toast } = useApp();
  const r = checkById(s.rule);
  if (!r) return <div className="rule-view-empty">请选择要查看的规则</div>;

  const bad = failFor(d, r);
  const instances = instancesFor(d, r);
  const shown = instances.filter((i) => !i.excluded || s.excluded);
  const chosen = instances.find((i) => i.id === s.instance) || instances[0];
  const isTime = r.id === "timeout";
  const isSsh = r.id === "ssh";

  const chooseInstance = (id) => patch((st) => { st.instance = id; });
  const toggleExcluded = () => patch((st) => {
    st.excluded = !st.excluded;
    if (!st.excluded && st.instance === "restconf") st.instance = "vty";
  });
  const setConfigMode = (m) => patch((st) => { st.mode = m; });
  const moveInstance = (dir) => {
    const ids = ["vty", "console", "aux"];
    const n = ids.indexOf(s.instance);
    chooseInstance(ids[(n + dir + ids.length) % ids.length]);
  };

  const copyText = async (text, okMsg) => {
    try { await navigator.clipboard.writeText(text); toast(okMsg); }
    catch { toast("浏览器未允许复制，请选中建议命令手动复制。"); }
  };
  const onCopyRepair = () => {
    if (isSsh) return copyText(sshCommands(d), "整改命令已复制，未下发到设备。");
    if (r.id === "ntp2") return copyText(`system-view\nundo ntp-service unicast-server ${instances[0].raw}\nntp-service unicast-server ${r.target}`, "修复命令已复制，未下发到设备。");
    if (r.id === "vlan3") return copyText(`system-view\n${instances[0].path}\nundo port trunk allow-pass vlan 300`, "修复命令已复制，未下发到设备。");
    const target = r.id === "mgmt" ? d.planned + " 255.255.255.0" : r.target;
    const text = "system-view\n" + (chosen.path === "系统视图" ? "" : chosen.path + "\n") + chosen.cmd + " " + target;
    return copyText(text, "修复命令已复制，未下发到设备。");
  };

  const instanceRowProps = (i) => ({
    "data-instance": i.id,
    className: (chosen.id === i.id ? "is-selected " : "") + (i.excluded ? "excluded" : ""),
    tabIndex: 0,
    "aria-selected": chosen.id === i.id,
    "aria-label": `检查位置 ${i.name}，${i.excluded ? "已排除" : i.bad ? "不通过" : "通过"}`,
    onClick: () => chooseInstance(i.id),
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); chooseInstance(i.id); } },
  });

  if (isSsh) {
    const weakFamilies = instances.filter((i) => i.bad).map((i) => (i.id === "single" ? "CBC" : "MD5")).join("、");
    return (
      <>
        <div className="rule-detail-heading">
          <h3>{r.name}</h3>
          <PriorityBadge priority={r.priority} />
          <StatusMark failed={bad} />
        </div>
        <div className="criterion v7-ssh-criterion"><span>规则要求</span><div>{r.expected}</div></div>
        <div className="instance-heading"><span>{instances.filter((i) => i.bad).length ? `${instances.filter((i) => i.bad).length}处不通过 · ${instances.length}个配置位置` : `通过 · ${instances.length}个配置位置`}</span></div>
        <table className="instance-table v7-ssh-instances">
          <thead><tr><th>检查项</th><th>当前配置</th><th>结果</th></tr></thead>
          <tbody>
            {instances.map((i) => (
              <tr key={i.id} {...instanceRowProps(i)} aria-label={`${i.name}，${i.bad ? "不通过" : "通过"}`}>
                <td>{i.name}</td>
                <td><code><RawInline r={r} i={i} /></code></td>
                <td><StatusMark failed={i.bad} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <SshEvidence d={d} s={s} records={instances} onSetMode={setConfigMode} />
        {bad ? (
          <>
            <section className="v7-ssh-impact">
              <h4>影响说明</h4>
              <p>当前启用了基线禁止的 {weakFamilies} 算法，增加 SSH 会话的密码安全与完整性保护风险。建议按组织密码安全基线整改，并复核相关合规要求。</p>
            </section>
            <SshRepair d={d} onCopy={onCopyRepair} onCopyRollback={() => copyText(sshCommands(d, true), "回退命令已复制，未执行。")} />
          </>
        ) : <div className="passed-note">✓ Cipher 与 HMAC 均通过当前基线检查，无需修复。</div>}
      </>
    );
  }

  return (
    <>
      <div className="rule-detail-heading">
        <h3>{r.name}</h3>
        <PriorityBadge priority={r.priority} />
        <StatusMark failed={bad} />
      </div>
      <div className="criterion"><span>判定条件</span><code>{r.id === "mgmt" ? "管理IP地址 = " + d.planned : r.expected}</code></div>
      <details className="scope-details">
        <summary>检查范围与判定说明</summary>
        <p>{isTime
          ? "检查范围：所有 user-interface 视图块（VTY / CONSOLE / AUX）下的直接子命令 idle-timeout。排除：NETCONF、RESTCONF、gRPC视图下的同名命令。判断：分钟×60＋秒≤600秒为通过，省略秒数按0计算。"
          : `检查范围：${r.view}。基于当前配置快照解析参数后，与本规则条件比较。`}</p>
      </details>
      <div className="instance-heading">
        <span>{isTime
          ? (bad ? "2处不通过 · 1处通过 · 共3个配置位置" : "3处通过 · 共3个配置位置")
          : `${bad ? "1处不通过" : "1处通过"} · 共1个检查位置`}</span>
        {isTime ? <button onClick={toggleExcluded}>{s.excluded ? "收起" : "查看"}已排除项（1）</button> : null}
      </div>
      <table className="instance-table">
        <thead><tr><th style={{ width: "20%" }}>检查位置</th><th style={{ width: "34%" }}>原始配置</th><th style={{ width: "23%" }}>{isTime ? "解析后的时间" : "实际值"}</th><th style={{ width: "23%" }}>结果</th></tr></thead>
        <tbody>
          {shown.map((i) => (
            <tr key={i.id} {...instanceRowProps(i)}>
              <td title={i.path}>{i.name}</td>
              <td title={i.cmd + " " + i.raw}><code>{i.cmd} <RawInline r={r} i={i} /></code></td>
              <td className={i.excluded ? "" : i.bad ? "failed-value" : "ok-value"}>{i.actual}</td>
              <td>{i.excluded ? <span className="muted">— 已排除</span> : <StatusMark failed={i.bad} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="evidence-heading">
        <h4>配置证据 <span className="small muted" style={{ fontWeight: 400, marginLeft: "8px" }}>{chosen.name}</span></h4>
        <div className="config-modes">
          <button className={s.mode === "related" ? "active" : ""} onClick={() => setConfigMode("related")}>相关配置</button>
          <button className={s.mode === "full" ? "active" : ""} onClick={() => setConfigMode("full")}>完整配置</button>
        </div>
      </div>
      <SemanticComparison d={d} r={r} i={chosen} />
      <ConfigView d={d} r={r} i={chosen} s={s} records={instances} onMoveInstance={moveInstance} onSetMode={setConfigMode} />
      {chosen.excluded ? (
        <div className="excluded-note">已排除：该命令位于 RESTCONF 视图下，不属于 user-interface 视图块下的直接子命令；未参与本规则的通过/不通过统计。</div>
      ) : chosen.bad ? (
        <FixSection d={d} r={r} i={chosen} onCopy={onCopyRepair} />
      ) : (
        <div className="passed-note">✓ 当前检查位置通过检查，无需修复。</div>
      )}
    </>
  );
}
