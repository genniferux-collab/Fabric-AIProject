import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import { fusionRelevant, fusionTopRules, fusionImpact, uc2RuleById, miningImpact, uc2DeviationDevices, uc2Actual } from "../../mock/uc2.js";
import "./mining-reference.css";

const art = "./assets/uploads/pixso-uc2-mining/";
const nodes = [
  {id:"core",x:105,y:373,label:"核心角色簇",sub:"20台·CE12800",type:"role"},
  {id:"leaf",x:105,y:627,label:"Leaf 角色簇",sub:"80台·CE6800",type:"role"},
  {id:"core1",x:330,y:287,label:"CoreSwitch-01",sub:"核心代表设备",type:"device"},
  {id:"core2",x:330,y:450,label:"CoreSwitch-02",sub:"核心代表设备",type:"device"},
  {id:"leafsample",x:330,y:627,label:"Leaf 配置样本",sub:"同角色标准化分析",type:"device"},
];
const anchors = [872,900,924,934,944,944,936,923,900,876];
const links = [
  ["core","core1","M134 373C211 369 249 287 301 287"],
  ["core","core2","M134 373C215 381 250 450 301 450"],
  ["leaf","leafsample","M134 627H301"],
  ["core1","engine","M359 287C430 287 449 450 508 470"],
  ["core2","engine","M359 450C424 450 458 480 508 487"],
  ["leafsample","engine","M359 627C430 627 455 528 508 508"],
];

function RuleTags({ rule }) {
  return <div className="golden-tags"><span className="confidence">{rule.confidence === "高" ? "高置信" : "待验证"}</span><span className="impact">{fusionImpact[rule.id]}影响</span><span>{rule.role}</span></div>;
}

function RuleSummary({ rule, position, onOpen, onEnter, onLeave }) {
  return <aside className="golden-summary" role="dialog" aria-label="候选规则摘要" style={{left:position.left,top:position.top}} onMouseEnter={onEnter} onMouseLeave={onLeave}>
    <div className="golden-meta">候选规则·{rule.id}</div><h3>{rule.name}</h3><RuleTags rule={rule}/>
    <div className="golden-summary-line"/>
    <div className="golden-summary-counts"><span>依据 <b>{rule.support}台</b></span><span>适用 <b>{rule.scope}台</b></span><span>偏离 <b>{rule.deviations}台</b></span></div>
    <pre>{rule.cmd}</pre><a href="#uc2MiningRule" onClick={e=>{e.preventDefault();onOpen(rule.id);}}>规则详情</a>
  </aside>;
}

function RulePanel({ rule, onClose }) {
  const { uc2, uc2Next, uc2OpenRule, toast, setPromptText } = useApp();
  const meta = miningImpact[rule.id], devices = uc2DeviationDevices[rule.id] || [];
  const copy = async () => { try { await navigator.clipboard.writeText(rule.cmd); toast("候选配置已复制"); } catch { toast("浏览器未允许复制，请选中配置手动复制"); } };
  const review = () => { onClose(); if(uc2.stage < 3)uc2Next(); uc2OpenRule(rule.id); };
  return <aside className="golden-rule-panel" id="uc2MiningRule" aria-label="单规则详情">
    <header><h3>单规则详情</h3><button type="button" aria-label="关闭单规则详情" onClick={onClose}><svg className="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg></button></header>
    <div className="golden-rule-body">
      <div className="golden-meta">{rule.id}·{rule.category}</div><h4>{rule.name}</h4><RuleTags rule={rule}/>
      <div className="golden-rule-counts"><div><span>设备支持度</span><strong>{rule.support}<small>/{rule.scope}</small></strong></div><div><span>偏离设备</span><strong>{rule.deviations}</strong></div></div>
      <section><h5>候选判断条件</h5><pre>{rule.cmd}</pre></section>
      <section><h5>配置证据</h5><h6>共性配置</h6><pre>{rule.cmd}</pre>{rule.deviations ? <><h6>偏离样本</h6><pre className="deviation">{meta?.actual || uc2Actual(rule)}</pre></> : <p>当前适用样本未发现偏离。</p>}<h5 className="golden-impact-heading">影响与核验</h5><p>{meta ? meta.impact+meta.next : "当前样本显示该配置模式具有共性，请结合设备角色、业务规划和安全规范核验后采用候选规则。"}</p></section>
      {devices.length > 0 && <section><h5>偏离设备·{devices.length}台</h5><div className="golden-device-chips">{devices.map(name=><button key={name} type="button" onClick={()=>{setPromptText("检查设备 "+name+" 的候选配置偏离");toast("已将设备问题填入 AI 输入框");}}>{name}</button>)}</div></section>}
    </div>
    <footer><button type="button" className="btn" onClick={copy}>复制配置</button><button type="button" className="btn primary" onClick={review}>报告中审阅</button></footer>
  </aside>;
}

export default function Uc2Mining() {
  const { uc2, uc2Fusion, uc2FusionPick, uc2FusionCloseDrawer, uc2Pause, full, setFull } = useApp();
  const [hover, setHover] = useState(null), [summary, setSummary] = useState(null);
  const sceneRef = useRef(null), clearRef = useRef(0);
  const rules = fusionTopRules(), drawerRule = uc2RuleById(uc2Fusion.drawer);
  const activeId = hover || uc2Fusion.selected || "engine", related = fusionRelevant(activeId);
  const all = activeId === "engine";
  useEffect(()=>()=>clearTimeout(clearRef.current),[]);
  useEffect(()=>{if(drawerRule){setSummary(null);setHover(null);}},[drawerRule?.id]);
  const open = id => { clearTimeout(clearRef.current);setSummary(null);setHover(null);if(uc2.running&&uc2.stage===2)uc2Pause();uc2FusionPick("rule:"+id); };
  const leave = () => {clearTimeout(clearRef.current);clearRef.current=setTimeout(()=>{setHover(null);setSummary(null);},160);};
  const enter = () => clearTimeout(clearRef.current);
  const inspect = (id, event, rule) => {
    if(drawerRule)return;enter();setHover(id);
    if(rule){const node=event.currentTarget.getBoundingClientRect(),host=sceneRef.current.getBoundingClientRect();const width=Math.min(354,host.width-32);setSummary({rule,position:{left:Math.max(16,Math.min(host.width-width-54,node.left-host.left-87)),top:Math.max(16,Math.min(host.height-262,node.top-host.top+114))}});}
    else setSummary(null);
  };
  const handlers = (id, rule) => ({onMouseEnter:e=>inspect(id,e,rule),onMouseLeave:leave,onFocus:e=>inspect(id,e,rule),onBlur:leave,onClick:e=>{e.stopPropagation();if(rule)open(rule.id);else uc2FusionPick(id);},onKeyDown:e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();if(rule)open(rule.id);else uc2FusionPick(id);}}});
  const drawEdge = (from,to,path,key) => {const hot=related.has(from)&&related.has(to);return <g key={key} className={"golden-edge"+(hot?" is-related":" is-muted")+(all?" is-default":"")} data-edge-from={from} data-edge-to={to}><path className="golden-edge-tube" d={path}/><path className="golden-edge-line" d={path}/>{!all&&hot&&<path className="golden-edge-selected" d={path}/>}</g>;};
  return <div className={"mining-reference"+(drawerRule?" has-rule-panel":"")} onKeyDown={e=>{if(e.key==="Escape"){uc2FusionCloseDrawer();setSummary(null);setHover(null);}}}>
    <header className="golden-header"><h2><img src={art+"title-icon.svg"} alt=""/>西三旗DC黄金基线挖掘 <span>检索交换机设备：<strong>1980</strong> 台</span></h2><button type="button" aria-label={full?"还原基线挖掘画布":"放大基线挖掘画布"} onClick={()=>setFull(!full)}><img src="./assets/uploads/pixso-uc2-restoration/expand-icon.svg" alt=""/></button></header>
    <div className="golden-scene" ref={sceneRef}>
      <svg className="golden-diagram" viewBox="0 56 1232 842" role="group" aria-label="黄金基线挖掘图谱" onClick={e=>{if(e.target===e.currentTarget){uc2FusionPick("engine");setSummary(null);setHover(null);}}}>
        <defs><linearGradient id="goldenFlow" x1="0" x2="1"><stop stopColor="#6d9ab5"/><stop offset="1" stopColor="#9582cb"/></linearGradient><radialGradient id="goldenGlow"><stop stopColor="#154dab" stopOpacity=".22"/><stop offset="1" stopColor="#154dab" stopOpacity="0"/></radialGradient></defs>
        <g className="golden-columns"><text x={drawerRule?30:77} y="104">角色聚类</text><text x={drawerRule?167:289} y="104">代表配置对比</text><text x={drawerRule?374:576} y="104">共性提取</text><text x={drawerRule?585:915} y="104">候选规则 TOP10</text><text className="golden-columns-sub" x={drawerRule?558:889} y="126">置信度·影响级别·支持设备数</text></g>
        <g className="golden-flow">
          <ellipse cx="604" cy="486" rx="260" ry="250" fill="url(#goldenGlow)"/>
          <path className="golden-candidate-arc" d="M850 167Q1044 491 850 815"/>
          {links.map(([a,b,d],i)=>drawEdge(a,b,d,"in-"+i))}
          {rules.map((r,i)=>drawEdge("engine","rule:"+r.id,`M${698-Math.abs(i-4.5)*1.5} ${486+(i-4.5)*8}C764 ${486+(i-4.5)*8} ${anchors[i]-76} ${203+i*64} ${anchors[i]} ${203+i*64}`,r.id))}
          {nodes.map(n=><g key={n.id} className={"golden-node"+(!all&&!related.has(n.id)?" is-muted":"")+(!all&&related.has(n.id)?" is-related":"")} role="button" tabIndex={0} aria-label={"挖掘过程："+n.label} data-fusion-node={n.id} {...handlers(n.id)}><image href={art+(n.type==="role"?"role-node.svg":"device-node.svg")} x={n.x-84.67} y={n.y-84.67} width="169.34" height="169.34"/>{!all&&related.has(n.id)&&<circle className="golden-node-selected" cx={n.x} cy={n.y} r="29"/>}<text className="golden-node-title" x={n.x} y={n.y+59} textAnchor="middle">{n.label}</text><text className="golden-node-sub" x={n.x} y={n.y+83} textAnchor="middle">{n.sub}</text><rect className="golden-hit" x={n.x-58} y={n.y-40} width="116" height="130" fill="transparent"/></g>)}
          <g className="golden-engine" role="button" tabIndex={0} aria-label="挖掘过程：AI配置共性提取" data-fusion-node="engine" {...handlers("engine")}><image href={art+"engine-reference.png"} x="504" y="388" width="200" height="200"/><text x="604" y="593" textAnchor="middle" className="golden-engine-title">AI配置共性提取</text><text x="604" y="619" textAnchor="middle" className="golden-engine-sub">标准化·对比·样本回看</text></g>
          {rules.map((rule,i)=>{const id="rule:"+rule.id,x=anchors[i],y=203+i*64,hot=related.has(id);return <g key={rule.id} className={"golden-rule-node"+(!all&&!hot?" is-muted":"")+(!all&&hot?" is-related":"")} role="button" tabIndex={0} aria-label={"候选规则："+rule.name} data-fusion-node={id} {...handlers(id,rule)}><circle className="golden-rule-dot" cx={x} cy={y} r={!all&&hot?6.5:5}/><text className="golden-rule-name" x={x+30} y={y-7}>{rule.name.length>19?rule.name.slice(0,18)+"…":rule.name}</text><text className="golden-rule-sub" x={x+30} y={y+13}>{rule.confidence==="高"?"高置信":"待验证"}·{fusionImpact[rule.id]}影响·依据{rule.support}台</text><rect className="golden-hit" x={x-14} y={y-27} width="270" height="52" fill="transparent"/></g>;})}
        </g>
        <g className="golden-candidate-total"><path d={drawerRule?"M558 854H582M711 854H736":"M895 854H919M1048 854H1073"}/><text x={drawerRule?591:923} y="860">18条候选规则</text></g>
      </svg>
      {summary&&!drawerRule&&<RuleSummary rule={summary.rule} position={summary.position} onOpen={open} onEnter={enter} onLeave={leave}/>}
      {drawerRule&&<RulePanel rule={drawerRule} onClose={uc2FusionCloseDrawer}/>}
    </div>
  </div>;
}
