import { useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import { uc2Rules, uc2DeviationDevices, miningImpact, fusionImpact, uc2Actual } from "../../mock/uc2.js";
import SearchInput from "../../components/search-input/index.jsx";
import EmptyState from "../../components/empty-state/index.jsx";
import Ic from "../../components/icon-el/index.jsx";
import "./rule-detail.css";

const reviewLabels = {pending:"待审阅",accepted:"已采纳",rejected:"暂不采用"};
function samplesFor(rule) {
  const names = rule.role === "核心交换机" ? Array.from({length:20},(_,i)=>"CoreSwitch-"+String(i+1).padStart(2,"0")) : rule.role === "Leaf 交换机" ? Array.from({length:80},(_,i)=>"LeafSwitch-"+String(i+1).padStart(2,"0")) : [...Array.from({length:20},(_,i)=>"CoreSwitch-"+String(i+1).padStart(2,"0")),...Array.from({length:80},(_,i)=>"LeafSwitch-"+String(i+1).padStart(2,"0"))];
  const bad = new Set(uc2DeviationDevices[rule.id] || []);
  return names.map(name=>({id:name,name,role:name.startsWith("Core")?"核心交换机":"Leaf 交换机",bad:bad.has(name)})).sort((a,b)=>Number(b.bad)-Number(a.bad)||a.name.localeCompare(b.name,"zh-CN",{numeric:true}));
}
function exampleCommand(rule) {
  return rule.cmd.replace("<角色集合>","100 200").replace("<按规划>","10.10.10.1").replace("<session>","core-peer").replace("<peer>","10.10.0.2").replace("<连接对象-端口>","To-LeafSwitch-01-10GE1/0/1");
}
function evidenceFor(rule,device) {
  const expected = exampleCommand(rule), meta = miningImpact[rule.id];
  const actual = !device.bad ? expected : rule.id === "GB-014" ? "undo stp edged-port enable" : rule.id === "GB-017" ? "description Uplink-Temporary" : meta?.actual || uc2Actual(rule);
  const path = meta?.path || (rule.category === "VLAN 与二层网络" || rule.id === "GB-017" ? "interface 10GE1/0/1" : "系统视图");
  const command = actual.startsWith("未") ? "# "+actual : actual;
  return {expected,actual,command,path,reason:meta?.reason || (rule.id === "GB-014" ? "接入口未启用候选要求的边缘端口配置。" : rule.id === "GB-017" ? "接口描述未符合当前角色的候选模板，需要结合连接关系核对。" : "当前配置与同角色样本提取的候选模式存在差异。"),next:meta?.next || "请结合设备角色、业务规划和变更记录确认后，再决定是否采用该候选要求。"};
}
function ConfigLine({line}) {
  if(!line.highlight)return <code>{line.text||" "}</code>;
  const index=line.text.indexOf(line.highlight);
  if(index<0)return <code>{line.text}</code>;
  return <code>{line.text.slice(0,index)}<mark>{line.highlight}</mark>{line.text.slice(index+line.highlight.length)}</code>;
}
function CodePanel({lines,onCopy,mode,onModeChange,repair=false}) {
  return <div className={"uc2-code-panel"+(repair?" is-repair":"")}><header><span><img src="./assets/uploads/detail-terminal.svg" alt=""/>命令行</span><div className="uc2-code-tools">{!repair&&<span className="uc2-code-range">L1–L{lines.length} · {mode==="full"?"完整配置":"相关配置"}</span>}<button type="button" aria-label={repair?"复制建议命令":"复制当前配置片段"} title="复制命令" onClick={onCopy}><img src="./assets/uploads/detail-copy.svg" alt=""/></button>{onModeChange&&<button type="button" aria-label={mode==="full"?"仅看相关配置":"查看完整配置"} title={mode==="full"?"仅看相关配置":"查看完整配置"} onClick={onModeChange}><img src="./assets/uploads/detail-expand.svg" alt=""/></button>}</div></header><div className="uc2-code-lines">{lines.map((line,index)=><div className={"uc2-code-line "+(line.kind||"")} key={index} data-evidence={line.kind==="bad"?"selected":undefined}>{!repair&&<span className="uc2-code-number">{index+1}</span>}<ConfigLine line={line}/>{line.annotation&&<span className="uc2-code-annotation">{line.annotation}</span>}</div>)}</div>{!repair&&<div className="uc2-code-legend">{lines.some(line=>line.kind==="bad")?"红色行：配置存在偏离 ｜ 高亮：与候选要求不一致的配置":"绿色行：与候选配置一致"}</div>}</div>;
}
function differentTokens(expected,actual){const left=expected.split(/\s+/),right=actual.split(/\s+/);const first=right.findIndex((token,index)=>token!==left[index]);return first<0?"":right.slice(first).join(" ");}

// Pixso UC2-识别完成-规则详情: rule metadata + device list + configuration evidence.
export function Uc2RuleDetail({ruleId,onBack,returnLabel="返回报告"}) {
  const {uc2,uc2SetFilter,uc2Review,uc2Reviews,uc2RuleDetailsRef,uc2EditRule,uc2RuleConfigs,toast} = useApp();
  const sourceRule = uc2Rules.find(item=>item.id === (ruleId || uc2.rule));
  const saved=sourceRule?uc2RuleConfigs[sourceRule.id]:null;
  const rule=sourceRule?{...sourceRule,name:saved?.name||sourceRule.name}:null;
  const [,setVersion] = useState(0),navRef=useRef(null);
  const devices = rule ? samplesFor(rule) : [];
  const initial = devices.find(device=>device.bad) || devices[0];
  const state = rule ? uc2RuleDetailsRef.current[rule.id] || (uc2RuleDetailsRef.current[rule.id]={status:rule.deviations?"failed":"all",query:"",selected:initial?.id,check:"configuration",mode:"related",navScroll:0}) : null;
  const visible = state ? devices.filter(device=>(state.status==="all" || (state.status==="failed"?device.bad:!device.bad)) && ("西三旗 "+device.name+" "+device.role).toLowerCase().includes(state.query.trim().toLowerCase())) : [];
  const device = visible.find(item=>item.id===state?.selected) || visible[0];
  const patch = value => { Object.assign(state,value); setVersion(version=>version+1); };
  useLayoutEffect(()=>{if(navRef.current&&state)navRef.current.scrollTop=state.navScroll;},[ruleId,state?.status,state?.query]);
  if(!rule)return <EmptyState text="未找到对应的候选规则"/>;
  const review=uc2Reviews[rule.id] || "pending",impact=fusionImpact[rule.id] || (rule.deviations?"中":"低");
  const evidence=device?evidenceFor(rule,device):null;
  const selectStatus=status=>patch({status,selected:null,navScroll:0});
  const copy=async text=>{try{await navigator.clipboard.writeText(text);toast("已复制示例配置，请核验设备与规划后使用");}catch{toast("复制暂不可用，请选择代码文字复制。");}};
  const highlight=device?.bad?differentTokens(evidence.expected,evidence.command):"";
  const annotation=rule.id==="GB-003"?"命中候选基线未允许的 CBC 算法":"当前配置与候选要求存在差异";
  const contextLine=rule.id==="GB-003"?"ssh authentication-type default password":evidence?.path==="系统视图"?"# 系统配置":evidence?.path;
  const relatedLines=device?[{text:"sysname "+device.name},{text:contextLine},{text:evidence.command,kind:device.bad?"bad":"good",highlight,annotation:device.bad?annotation:null}]:[];
  const fullLines=device?[{text:"sysname "+device.name},{text:"#"},{text:"info-center loghost 10.10.0.20"},{text:"ntp-service unicast-server 10.10.0.10"},{text:"#"},{text:contextLine},{text:evidence.command,kind:device.bad?"bad":"good",highlight,annotation:device.bad?annotation:null},{text:"#"},{text:"lldp enable"},{text:"#"}]:[];
  const priority=saved?.priority||(impact==="高"?"高优先级":impact==="中"?"中优先级":"低优先级");

  const lines=state.mode==="full"?fullLines:relatedLines;
  return <div className="uc2-rule-workspace" data-rule-detail={rule.id} data-design-node="2:469426">
    <header className="uc2-rule-overview"><div className="uc2-rule-heading"><h2>{rule.name}</h2><span className="uc2-rule-kind">{review==="accepted"&&saved?"已采纳规则":"候选规则"}</span><span className={"uc2-rule-state "+(rule.deviations?"failed":"passed")}>{rule.deviations?"存在配置差异":"样本配置一致"}</span><button type="button" className="uc2-rule-return" aria-label={returnLabel} title={returnLabel} onClick={onBack || (()=>uc2SetFilter({view:"stage",rule:null}))}><Ic icon="arrow-left"/>{returnLabel}</button></div>
      <dl className="uc2-rule-metadata">{[["范围","西三旗 DC"],["分类",rule.category],["差异设备",rule.deviations+"台"],["规则编号",saved?.ruleId||rule.id],["适用规则",rule.role==="通用"?"共性规则":rule.role],["配置一致",rule.support+"/"+rule.scope+"台"],["覆盖率",(rule.support/rule.scope*100).toFixed(1).replace(/\.0$/,"")+"%"]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </header>
    <div className="uc2-rule-body"><aside className="uc2-rule-devices" aria-label="设备配置核验"><h3>设备配置核验</h3><div className="uc2-device-filters" role="group" aria-label="样本设备配置核验状态">{[["all","全部",rule.scope],["failed","不通过",rule.deviations],["passed","通过",rule.support]].map(([id,label,count])=><button type="button" key={id} aria-pressed={state.status===id} onClick={()=>selectStatus(id)}><i className={id}/>{label}<strong>{count}</strong></button>)}</div><SearchInput value={state.query} onChange={query=>patch({query,selected:null,navScroll:0})} placeholder="请输入搜索内容" ariaLabel="搜索核验设备" clearable/><div className="uc2-device-list" ref={navRef} onScroll={e=>{state.navScroll=e.currentTarget.scrollTop;}}>{visible.map(item=><button type="button" className={"uc2-device-item "+(item.bad?"failed":"passed")+(device?.id===item.id?" selected":"")} key={item.id} aria-label={"查看样本设备："+item.name} aria-pressed={device?.id===item.id} onClick={()=>patch({selected:item.id,check:"configuration"})}><i/><span><strong>西三旗 · {item.name}</strong><small>{item.bad?"差异待核验":"与候选配置一致"} · 配置快照示例</small></span></button>)}{!visible.length&&<EmptyState text="没有匹配的设备"/>}</div></aside>
      <article className="uc2-rule-evidence" aria-label="样本设备配置详情">{device?<><div className="uc2-evidence-heading"><h3>西三旗 · {device.name}</h3><span className={"uc2-impact "+(priority.includes("高")?"is-high":priority.includes("中")?"is-medium":"is-low")}><i/>{priority}</span><span className={"uc2-check-result "+(device.bad?"failed":"passed")}>{device.bad?"不通过":"通过"}</span></div><div className="uc2-candidate-requirement">候选规则要求 <code>{rule.cmd}</code></div>
        <div className="uc2-evidence-checks"><button type="button" className={"uc2-evidence-check "+(state.check==="configuration"?"selected ":"")+(device.bad?"failed":"passed")} aria-pressed={state.check==="configuration"} onClick={()=>patch({check:"configuration"})}><span><i/>{device.bad?"配置差异信息1":"配置一致性信息1"}</span><code title={evidence.actual}>{evidence.actual}</code></button><button type="button" className={"uc2-evidence-check passed "+(state.check==="scope"?"selected":"")} aria-pressed={state.check==="scope"} onClick={()=>patch({check:"scope"})}><span><i/>角色适用性核验</span><small>{device.role} · 本轮分析样本</small></button></div>
        {state.check==="scope"?<section className="uc2-evidence-section"><h4>样本适用性说明</h4><div className="uc2-evidence-alert info"><Ic icon="info"/>所选设备属于{device.role}，与当前候选规则的适用范围一致，已纳入本轮 {rule.scope} 台样本。</div><div className="uc2-scope-explanation"><span>设备角色<strong>{device.role}</strong></span><span>规则适用范围<strong>{rule.role==="通用"?"核心与 Leaf 共用":rule.role}</strong></span><span>候选配置支持<strong>{rule.support} / {rule.scope} 台</strong></span></div></section>:<>
          <section className="uc2-evidence-section"><h4>当前配置命中片段</h4><div className={"uc2-evidence-alert "+(device.bad?"warning":"success")}><img src={device.bad?"./assets/uploads/detail-warning.svg":"./assets/uploads/uc3-rule/pass.svg"} alt=""/><span>{device.bad?"影响说明："+(miningImpact[rule.id]?.impact||evidence.reason):"核验说明：当前样本配置与候选模式一致，未发现该项配置偏离。"}</span></div><CodePanel lines={lines} mode={state.mode} onModeChange={()=>patch({mode:state.mode==="full"?"related":"full"})} onCopy={()=>copy(lines.map(line=>line.text).join("\n"))}/></section>
          <section className="uc2-evidence-section"><h4>修复建议</h4><div className="uc2-evidence-alert info"><Ic icon="info"/><span>修复建议：{device.bad?evidence.next:"该设备无需生成配置修复建议；请继续核对其他设备及候选规则的业务适用性。"}</span></div>{device.bad&&<CodePanel repair lines={[{text:"- "+evidence.command,kind:"bad"},{text:"+ "+evidence.expected,kind:"good"}]} onCopy={()=>copy(evidence.expected)}/>}</section>
        </>}
        <div className="uc2-rule-disclaimer">{rule.cmd.includes("<")?"命令中的规划参数已填入示例值，使用前须结合设备与网络规划确认。":"当前为交互原型示例配置，核验后再决定是否调整。"}此处仅展示建议，未下发设备变更。</div>
      </>:<EmptyState text="没有匹配的设备，请调整左侧筛选条件。"/>}</article>
    </div>
    <footer className="uc2-rule-review"><span>候选审阅状态：<strong>{reviewLabels[review]}</strong><small>{review==="accepted"&&saved?"规则配置已保存到本地规则库":"编辑确认后采纳，不下发设备配置"}</small></span><div><button type="button" className="btn" onClick={()=>uc2Review(rule.id,"pending")}>恢复待审阅</button><button type="button" className="btn" onClick={()=>uc2Review(rule.id,"rejected")}>暂不采用</button><button type="button" className="btn primary" onClick={()=>uc2EditRule(rule.id)}>{review==="accepted"?"编辑已采纳规则":"采纳此候选"}</button></div></footer>
  </div>;
}
