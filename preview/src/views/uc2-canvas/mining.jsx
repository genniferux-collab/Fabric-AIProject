import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import ArtifactOpen from "../../components/artifact-open/index.jsx";
import { uc2Rules,uc2Timing, fusionRelevant, fusionTopRules, fusionImpact, uc2RuleById, miningImpact, uc2DeviationDevices, uc2Actual } from "../../mock/uc2.js";
import "./mining-reference.css";
import FlowLight from "./flow-light.jsx";

const art = "./assets/uploads/pixso-uc2-mining/";
const vectors = "./assets/uploads/pixso-uc2-v2/";
const nodes = [
  {id:"core",x:105,y:373,label:"核心角色簇",sub:"20台·CE12800",type:"role"},
  {id:"leaf",x:105,y:627,label:"Leaf 角色簇",sub:"80台·CE6800",type:"role"},
  {id:"core1",x:330,y:287,label:"CoreSwitch-01",sub:"核心代表设备",type:"device"},
  {id:"core2",x:330,y:450,label:"CoreSwitch-02",sub:"核心代表设备",type:"device"},
  {id:"leafsample",x:330,y:627,label:"Leaf 配置样本",sub:"同角色标准化分析",type:"device"},
];
const reveal = delay => ({ "--mining-delay": `${Math.round(delay * uc2Timing.canvas[2] / 4800)}ms` });
const nodeDelays = { core: 120, leaf: 300, core1: 1000, core2: 1200, leafsample: 1400 };
const anchors = [872,900,924,934,944,944,936,923,900,876];
const ruleY = index => 202 + index * 64;
// Pixso 2:339144: close the original outer-arc outline toward the left.
// A shared fixed curve keeps every selected row attached to the outer rim.
const outerRuleBoundary = "M83.5691 648.245C56.4938 600.178 35.9042 550.756 21.8002 499.98C8.01518 450.353 0.625542 400.168 -0.368755 349.425C-1.64313 287.901 6.28815 227.32 23.4251 167.683C40.1004 109.652 65.1504 53.6701 98.575 -.263389L1188 -.263389L1188 648.245Z";

function RuleSelection({ x, y }) {
  return <g className="golden-rule-selection" aria-hidden="true">
    <defs><linearGradient id="goldenSelectedBandGradient" gradientUnits="userSpaceOnUse" x1={x+211.6110725} y1={y-13.5327148} x2={x-37.804962} y2={y+5.5055084}><stop stopColor="#aaa9a9"/><stop offset="1" stopColor="#000" stopOpacity="0"/></linearGradient></defs>
    <g clipPath="url(#goldenRuleOuterClip)"><path className="golden-rule-highlight" d={`M${x+11.008789} ${y-30}H1232V${y+25.88916}H${x+21.635}Z`} fill="url(#goldenSelectedBandGradient)" fillOpacity=".24" filter="url(#goldenRuleBandSoft)"/></g>
    <image className="golden-rule-selected-node" href={vectors+"selected-rule-node.svg"} x={x-40} y={y-40} width="80" height="80"/>
  </g>;
}
const links = [
  ["core","core1","M134 373C211 369 249 287 301 287"],
  ["core","core2","M134 373C215 381 250 450 301 450"],
  ["leaf","leafsample","M134 627H301"],
  ["core1","engine","M359 287C430 287 449 450 508 470"],
  ["core2","engine","M359 450C424 450 458 480 508 487"],
  ["leafsample","engine","M359 627C430 627 455 528 508 508"],
];

function RuleTags({ rule }) {
  return <div className="golden-tags"><span className="confidence">{rule.confidence === "高" ? "高置信" : "中置信度"}</span><span className="impact">{fusionImpact[rule.id]}影响</span><span>{rule.role}</span></div>;
}

function RuleSummary({ rule, position, onOpen, onEnter, onLeave }) {
  return <aside className="golden-summary" role="dialog" aria-label="候选规则摘要" style={{left:position.left,top:position.top}} data-design-node="2:339144" onMouseEnter={onEnter} onMouseLeave={onLeave}>
    <div className="golden-meta">候选规则·{rule.id}</div><h3 title={rule.name}>{rule.name}</h3><RuleTags rule={rule}/>
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
  const { uc2, uc2Fusion, uc2FusionPick, uc2FusionCloseDrawer, uc2CanvasStart, uc2CanvasComplete } = useApp();
  const [hover, setHover] = useState(null), [summary, setSummary] = useState(null);
  const sceneRef = useRef(null), clearRef = useRef(0);
  const [motionMode, setMotionMode] = useState(() => uc2.running && uc2.stage === 2 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "waiting" : "complete");
  const [motionKey, setMotionKey] = useState(0);
  const revealing = motionMode !== "complete";
  const playState = motionMode === "waiting" || (motionMode === "workflow" && !uc2.running) ? "paused" : "running";
  useEffect(() => { if (uc2.stage > 2 && (motionMode === "workflow" || motionMode === "waiting")) setMotionMode("complete"); }, [uc2.stage, motionMode]);
  // Start once the smooth-scrolling canvas is actually in view.
  useEffect(() => {
    if (motionMode !== "waiting") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.intersectionRatio >= .9)) { uc2CanvasStart(2); setMotionMode("workflow"); observer.disconnect(); }
    }, { threshold: [.9] });
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => observer.disconnect();
  }, [motionMode, uc2CanvasStart]);
  useEffect(() => { if (motionMode === "complete") uc2CanvasComplete(2); }, [motionMode, uc2CanvasComplete]);
  const replay = () => {
    uc2FusionPick("engine"); setHover(null); setSummary(null); clearTimeout(clearRef.current);
    setMotionKey(value => value + 1);
    setMotionMode(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "complete" : "replay");
  };
  const rules = fusionTopRules(), drawerRule = uc2RuleById(uc2Fusion.drawer);
  const activeId = hover || uc2Fusion.selected || "engine", related = fusionRelevant(activeId);
  const all = activeId === "engine";
  useEffect(()=>()=>clearTimeout(clearRef.current),[]);
  useEffect(()=>{if(drawerRule){setSummary(null);setHover(null);}},[drawerRule?.id]);
  const open = id => { setMotionMode("complete"); clearTimeout(clearRef.current);setSummary(null);setHover(null);uc2FusionPick("rule:"+id); };
  const leave = () => {clearTimeout(clearRef.current);clearRef.current=setTimeout(()=>{setHover(null);setSummary(null);},160);};
  const enter = () => clearTimeout(clearRef.current);
  const inspect = (id, event, rule) => {
    if(drawerRule || revealing)return;enter();setHover(id);
    if(rule){
      const scene=sceneRef.current,node=event.currentTarget.getBoundingClientRect(),host=scene.getBoundingClientRect();
      const width=Math.min(354,scene.clientWidth-32),scaleX=host.width/scene.clientWidth,scaleY=host.height/scene.clientHeight;
      // Keep the source-design placement in logical canvas pixels at every preview scale.
      setSummary({rule,position:{left:Math.max(16,Math.min(scene.clientWidth-width-16,(node.left-host.left)/scaleX-width-12)),top:Math.max(16,Math.min(scene.clientHeight-262,(node.top-host.top)/scaleY-90))}});
    }
    else setSummary(null);
  };
  const handlers = (id, rule) => ({onMouseEnter:e=>inspect(id,e,rule),onMouseLeave:leave,onFocus:e=>inspect(id,e,rule),onBlur:leave,onClick:e=>{e.stopPropagation();setMotionMode("complete");if(rule)open(rule.id);else uc2FusionPick(id);},onKeyDown:e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setMotionMode("complete");if(rule)open(rule.id);else uc2FusionPick(id);}}});
  const drawEdge = (from,to,path,key,delay) => {const hot=related.has(from)&&related.has(to);return <g key={key} className={"golden-edge"+(hot?" is-related":" is-muted")+(all?" is-default":"")} data-edge-from={from} data-edge-to={to}><g className="golden-edge-reveal" style={reveal(delay)}><path className="golden-edge-tube" pathLength="1" d={path}/><path className="golden-edge-line" pathLength="1" d={path}/>{!all&&hot&&<FlowLight path={path} phase={from==="engine"?.84:from==="leafsample"?.57:.64}/>}</g></g>;};
  return <div className={"mining-reference uc2-pixso-v2"+(drawerRule?" has-rule-panel":"")+(revealing?" is-revealing":"")} data-motion-mode={motionMode} style={{"--mining-time-scale":uc2Timing.canvas[2]/4800,"--mining-reveal-state":playState,"--mining-ambient-state":playState}} onAnimationEnd={e=>{if(e.animationName==="goldenReveal"&&e.target.dataset.motionLast==="true")setMotionMode("complete");}} onKeyDown={e=>{if(e.key==="Escape"){uc2FusionCloseDrawer();setSummary(null);setHover(null);}}}>
    <header className="golden-header"><h2><img src={art+"title-icon.svg"} alt=""/>西三旗DC黄金基线挖掘 <span>检索交换机设备：<strong>1980</strong> 台</span></h2><div className="golden-header-actions"><button type="button" aria-label="重播挖掘动效" title="重播挖掘动效" onClick={replay}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 5a5.2 5.2 0 1 1-.1 5.8M3 1.8V5h3.2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg></button><ArtifactOpen kind="uc2-mining" title="黄金基线挖掘"/></div></header>
    <div className="golden-scene" ref={sceneRef}>
      <svg key={motionKey} className="golden-diagram" aria-busy={revealing} viewBox="0 56 1232 842" role="group" aria-label="黄金基线挖掘图谱" onClick={e=>{if(e.target===e.currentTarget){uc2FusionPick("engine");setSummary(null);setHover(null);}}}>
        <defs><clipPath id="goldenRuleOuterClip" clipPathUnits="userSpaceOnUse"><path d={outerRuleBoundary} transform="matrix(-1,0,0,1,1188,167)"/></clipPath><filter id="goldenRuleBandSoft" x="-1%" y="-2%" width="102%" height="104%"><feGaussianBlur stdDeviation=".166666672"/></filter><linearGradient id="goldenFlow" x1="0" x2="1"><stop stopColor="#6d9ab5"/><stop offset="1" stopColor="#9582cb"/></linearGradient><radialGradient id="goldenEnergyGlow"><stop stopColor="#419eff" stopOpacity=".26"/><stop offset=".65" stopColor="#47c7ff" stopOpacity=".12"/><stop offset="1" stopColor="#68a7ff" stopOpacity="0"/></radialGradient><radialGradient id="goldenNodeFade"><stop offset=".9" stopColor="white"/><stop offset="1" stopColor="black"/></radialGradient><mask id="goldenNodeMask" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1"><rect width="1" height="1" fill="url(#goldenNodeFade)"/></mask><radialGradient id="goldenEngineFade" gradientUnits="userSpaceOnUse" cx="604" cy="488" r="100"><stop offset=".78" stopColor="white"/><stop offset=".96" stopColor="black"/></radialGradient><mask id="goldenEngineMask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="504" y="388" width="200" height="200"><circle cx="604" cy="488" r="100" fill="url(#goldenEngineFade)"/></mask></defs>
        <image className="golden-material" href={vectors+"canvas-material.svg"} x="0" y="56" width="1232" height="842" pointerEvents="none"/><g className="golden-columns"><text className="golden-reveal" style={reveal(0)} x={drawerRule?30:77} y="104">角色聚类</text><text className="golden-reveal" style={reveal(850)} x={drawerRule?167:289} y="104">代表配置对比</text><text className="golden-reveal" style={reveal(1950)} x={drawerRule?374:576} y="104">共性提取</text><g className="golden-reveal" style={reveal(2750)}><text x={drawerRule?585:915} y="104">候选规则 TOP10</text><text className="golden-columns-sub" x={drawerRule?558:889} y="126">置信度·影响级别·支持设备数</text></g></g>
        <g className="golden-flow">
          <path style={reveal(2750)} className="golden-candidate-arc golden-reveal" d="M850 167Q1044 491 850 815"/>
          {links.map(([a,b,d],i)=>drawEdge(a,b,d,"in-"+i,i<3?500+i*200:1700+(i-3)*100))}
          {rules.map((r,i)=>drawEdge("engine","rule:"+r.id,`M${698-Math.abs(i-4.5)*1.5} ${486+(i-4.5)*8}C764 ${486+(i-4.5)*8} ${anchors[i]-76} ${ruleY(i)} ${anchors[i]} ${ruleY(i)}`,r.id,2900+i*115))}
          {nodes.map(n=><g key={n.id} className={"golden-node"+(!all&&!related.has(n.id)?" is-muted":"")+(!all&&related.has(n.id)?" is-related":"")} role="button" tabIndex={revealing?-1:0} aria-label={"挖掘过程："+n.label} data-fusion-node={n.id} {...handlers(n.id)}><g className="golden-reveal" data-motion-stage={n.type==="role"?"role":"device"} style={reveal(nodeDelays[n.id])}><image href={vectors+(n.type==="role"?"role-node.svg":"device-node.svg")} x={n.x-84.67} y={n.y-84.67} width="169.34" height="169.34"/>{!all&&related.has(n.id)&&<image className="golden-active-node" href={vectors+(n.type==="role"?"role-active@2x.png":"device-active@2x.png")} x={n.x-40} y={n.y-40} width="80" height="80" mask="url(#goldenNodeMask)"/>}<text className="golden-node-title" x={n.x} y={n.y+59} textAnchor="middle">{n.label}</text><text className="golden-node-sub" x={n.x} y={n.y+83} textAnchor="middle">{n.sub}</text><rect className="golden-hit" x={n.x-58} y={n.y-40} width="116" height="130" fill="transparent"/></g></g>)}
          <g className="golden-engine" role="button" tabIndex={revealing?-1:0} aria-label="挖掘过程：AI配置共性提取" data-fusion-node="engine" {...handlers("engine")}><g className="golden-reveal golden-engine-reveal" data-motion-stage="engine" style={reveal(2300)}><circle className="golden-engine-halo" cx="604" cy="488" r="112" fill="url(#goldenEnergyGlow)"/><image href={vectors+"engine-reference@2x.png"} x="504" y="388" width="200" height="188" mask="url(#goldenEngineMask)"/>
<text x="604" y="593" textAnchor="middle" className="golden-engine-title">AI配置共性提取</text><text x="604" y="619" textAnchor="middle" className="golden-engine-sub">标准化·对比·样本回看</text></g></g>
          {rules.map((rule,i)=>{
            const id="rule:"+rule.id,x=anchors[i],y=ruleY(i),hot=related.has(id),selected=activeId===id;
            return <g key={rule.id} className={"golden-rule-node"+(!all&&!hot?" is-muted":"")+(!all&&hot?" is-related":"")+(selected?" is-selected":"")} role="button" tabIndex={revealing?-1:0} aria-label={"候选规则："+rule.name} aria-pressed={selected} data-fusion-node={id} {...handlers(id,rule)}>
              <g className="golden-reveal" data-motion-stage="rule" style={reveal(3150+i*115)}>
                {selected?<RuleSelection x={x} y={y}/>:<circle className="golden-rule-dot" cx={x} cy={y} r="5"/>}
                <g className="golden-rule-copy" clipPath="url(#goldenRuleOuterClip)"><text className="golden-rule-name" x={x+33} y={y-6}>{rule.name.length>19?rule.name.slice(0,18)+"…":rule.name}</text><text className="golden-rule-sub" x={x+33} y={y+14}>{rule.confidence==="高"?"高置信":"中置信度"}·{fusionImpact[rule.id]}影响·依据{rule.support}台</text></g>
                <rect className="golden-hit" x={x-14} y={y-30} width="270" height="56" fill="transparent" clipPath="url(#goldenRuleOuterClip)"/>
              </g>
            </g>;
          })}
          <image className="golden-rule-outer-arc golden-reveal" style={reveal(2750)} href={vectors+"selected-rule-outer-arc.svg"} x="0" y="56" width="1232" height="842" aria-hidden="true"/>

        </g>
        <g className="golden-candidate-total golden-reveal" data-motion-last="true" style={reveal(4400)}><path d={drawerRule?"M558 854H582M711 854H736":"M895 854H919M1048 854H1073"}/><text x={drawerRule?591:923} y="860">{uc2Rules.length}条候选规则</text></g>
      </svg>
      {summary&&!drawerRule&&<RuleSummary rule={summary.rule} position={summary.position} onOpen={open} onEnter={enter} onLeave={leave}/>}
      {drawerRule&&<RulePanel rule={drawerRule} onClose={uc2FusionCloseDrawer}/>}
    </div>
  </div>;
}
