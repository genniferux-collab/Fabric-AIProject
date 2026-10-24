import { useApp } from "../../context.jsx";
import { v7RuleRequirements,v7RepairDirections } from "../../mock/audit.js";
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
          : (v7RepairDirections[r.id] || "核对规划与变更记录后调整配置。");
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


function ConfigView({d,r,i,s,records,onSetMode}) {
  const expanded=s.mode==='full',snapshot=snapshotFor(d);
  const start=Math.max(1,i.line-2),end=Math.min(snapshot.length,i.line+1);
  return <div className={'config-view v13-evidence '+(expanded?'expanded':'')}>
    <div className="source-line"><span>{d.name}.cfg <span className="v13-snapshot">· 快照 2026-10-21 14:19:55</span></span><button className="v13-expand-config" aria-label={expanded?'收起配置':'展开配置'} aria-expanded={expanded} onClick={()=>onSetMode(expanded?'related':'full')}>{expanded?'收起':'展开'}<span aria-hidden="true">{expanded?'⌃':'⌄'}</span></button></div>
    <div className="v13-evidence-context">{i.name} · {expanded?snapshot.length+' 行配置，可滚动查看':'L'+start+'–L'+end}</div>
    <div className="code-scroll" id="codeScroll" tabIndex="0" aria-label="配置命中片段">{snapshot.map((text,index)=>({text,line:index+1})).filter(row=>expanded||(row.line>=start&&row.line<=end)).map(({text,line})=>{
      const match=records.find(x=>x.line===line);
      if(!match)return <CodeLine key={line} num={line} content={text} note={r.id==='ssh'&&line===2?'认证上下文，不参与弱算法判定':''} noteClass="muted"/>;
      return <CodeLine key={line} id={i.id===match.id?'selectedEvidence':undefined} num={line} content={<>{match.cmd} <RawMarks r={r} i={match}/></>} cls={match.excluded?'excluded-line':match.bad?'bad-line':'good-line'} note={match.excluded?'未纳入本规则检查':match.delta} noteClass={match.excluded?'muted':match.bad?'':'good'}/>;
    })}</div>
    <div className="config-footer"><span>{i.excluded?'灰色：未参与本规则检查':i.bad?'红色行：不通过 · 高亮：触发判定的值':'绿色行：通过'}</span></div>
  </div>;
}

function InstanceCards({d,r,s,records,onChoose}) {
  const shown=records.filter(i=>!i.excluded||s.excluded),chosen=shown.find(i=>i.id===s.instance)||shown[0];
  return <div className="v13-instance-cards" role="group" aria-label="具体检查项">{shown.map(i=><button key={i.id} className={'v13-instance-card '+(chosen?.id===i.id?'selected ':'')+(i.excluded?'excluded':i.bad?'failed':'passed')} aria-pressed={chosen?.id===i.id} aria-label={'切换检查项：'+i.name} onClick={()=>onChoose(i.id)}><span className="v13-instance-top"><strong>{i.name}</strong><span><i/>{i.excluded?'已排除':i.bad?'不通过':'通过'}</span></span><code><RawInline r={r} i={i}/></code><span className="v13-instance-location">{i.excluded?'未参与本规则检查':i.path==='系统视图'?'系统视图 · L'+i.line:'L'+i.line+' · '+i.path}</span></button>)}</div>;
}

function SshRepair({d,i,onCopy,onCopyRollback}) {
  const r=checkById('ssh'),cipher=i.id==='single';
  return <section className="fix-section v7-ssh-fix">
    <div className="between"><h4 className="fix-heading">修复建议</h4><div className="v14-fix-actions"><span className="small muted">尚未执行</span><button className="v14-copy-command" onClick={onCopy}>复制整改命令</button></div></div>
    <p className="fix-text">{cipher?'将当前 Cipher 加密算法替换为允许的 CTR 套件。':'将当前 HMAC 完整性校验替换为 SHA2 套件。'}建议在凌晨维护窗口执行，执行前核验 SSH 客户端兼容性。</p>
    <div className="v7-ssh-change"><span>变更单 <strong>CH20261021-003</strong></span><span>建议窗口：凌晨</span><span>含回退命令</span></div>
    <div className="fix-diff"><div className="minus">− {i.cmd} {i.raw}</div><div className="plus">+ {i.cmd} {cipher?r.target:SSH_TARGET_HMAC}</div></div>
    <details className="v7-ssh-rollback"><summary>回退命令</summary><p className="small muted">变更异常时恢复本次快照中的原配置。</p><pre><code>{sshCommands(d,true,i.id)}</code></pre><button className="link" onClick={onCopyRollback}>复制回退命令</button></details>
  </section>;
}

export default function RuleDetail({d,s,patch}) {
  const {toast}=useApp(),r=checkById(s.rule);
  if(!r)return <div className="rule-view-empty">请选择要查看的规则</div>;
  const records=instancesFor(d,r),chosen=records.find(i=>i.id===s.instance)||records[0],isTime=r.id==='timeout',isSsh=r.id==='ssh',bad=failFor(d,r);
  const choose=id=>patch(st=>{st.instance=id});
  const setMode=mode=>patch(st=>{st.mode=mode});
  const toggleExcluded=()=>patch(st=>{st.excluded=!st.excluded;if(!st.excluded&&st.instance==='restconf')st.instance='vty'});
  const copy=async(text,kind)=>{try{await navigator.clipboard.writeText(text);toast(kind+'已复制，未下发到设备。')}catch{toast('浏览器未允许复制，请选中建议命令手动复制。')}};
  const repair=()=>{
    if(isSsh)return copy(sshCommands(d,false,chosen.id),'整改命令');
    if(r.id==='ntp2')return copy('system-view\nundo ntp-service unicast-server '+chosen.raw+'\nntp-service unicast-server '+r.target,'修复命令');
    if(r.id==='vlan3')return copy('system-view\n'+chosen.path+'\nundo port trunk allow-pass vlan 300','修复命令');
    const target=r.id==='mgmt'?d.planned+' 255.255.255.0':r.target;
    return copy('system-view\n'+(chosen.path==='系统视图'?'':chosen.path+'\n')+chosen.cmd+' '+target,'修复命令');
  };
  const status=isSsh?(records.filter(i=>i.bad).length?records.filter(i=>i.bad).length+'处不通过 · '+records.length+'个配置位置':'通过 · '+records.length+'个配置位置'):isTime?(bad?'2处不通过 · 1处通过 · 共3个配置位置':'3处通过 · 共3个配置位置'):(bad?'1处不通过':'1处通过')+' · 共1个检查位置';
  return <>
    <div className="rule-detail-heading"><h3>{r.name}</h3><PriorityBadge priority={r.priority}/><StatusMark failed={bad}/></div>
    <div className={'criterion '+(isSsh?'v7-ssh-criterion':'v7-unified-criterion')}><span>检查要求</span><div>{v7RuleRequirements[r.id]||r.expected}</div></div>
    {!isSsh&&<details className="scope-details"><summary>检查范围与判定说明</summary><p>{isTime?'检查范围：所有 user-interface 视图块（VTY / CONSOLE / AUX）下的直接子命令 idle-timeout。排除 NETCONF、RESTCONF、gRPC 视图。分钟×60＋秒≤600秒为通过，省略秒数按0计算。':'检查范围：'+r.view+'。基于当前配置快照解析参数后，与本规则条件比较。'}</p></details>}
    <div className="instance-heading"><span className="v14-section-label">检查项</span><span>{status}</span>{isTime&&<button onClick={toggleExcluded}>{s.excluded?'收起':'查看'}已排除项（1）</button>}</div>
    <InstanceCards d={d} r={r} s={s} records={records} onChoose={choose}/>
    {isSsh&&chosen.bad&&<section className="v7-ssh-impact"><h4>影响说明</h4><p>当前启用了基线禁止的 {chosen.id==='single'?'CBC':'MD5'} 算法，增加 SSH 会话的密码安全与完整性保护风险。建议按组织密码安全基线整改，并复核相关合规要求。</p></section>}
    <div className="evidence-heading"><h4>{isSsh?'当前配置命中片段':<>配置证据 <span className="small muted" style={{fontWeight:400,marginLeft:8}}>{chosen.name}</span></>}</h4></div>
    {!isSsh&&<SemanticComparison d={d} r={r} i={chosen}/>}
    <ConfigView d={d} r={r} i={chosen} s={s} records={records} onSetMode={setMode}/>
    {chosen.excluded?<div className="excluded-note">已排除：不属于本规则检查范围，未参与通过/不通过统计。</div>:chosen.bad?(isSsh?<SshRepair d={d} i={chosen} onCopy={repair} onCopyRollback={()=>copy(sshCommands(d,true,chosen.id),'回退命令')}/>:<FixSection d={d} r={r} i={chosen} onCopy={repair}/>):<div className="passed-note">✓ 当前检查位置通过检查，无需修复。</div>}
  </>;
}
