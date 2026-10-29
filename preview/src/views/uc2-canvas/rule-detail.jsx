import { useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import { uc2Rules, miningImpact, fusionImpact } from "../../mock/uc2.js";
import SearchInput from "../../components/search-input/index.jsx";
import EmptyState from "../../components/empty-state/index.jsx";
import {samplesFor,evidenceFor} from "./rule-detail-model.js";
import "./rule-detail.css";

const reviewLabels = {pending:"待审阅",accepted:"已采纳",rejected:"暂不采用"};
function ConfigLine({line}) {
  if(!line.highlight)return <code>{line.text||" "}</code>;
  const index=line.text.indexOf(line.highlight);
  if(index<0)return <code>{line.text}</code>;
  return <code>{line.text.slice(0,index)}<mark>{line.highlight}</mark>{line.text.slice(index+line.highlight.length)}</code>;
}
function CodePanel({lines,onCopy,mode,onModeChange,repair=false}) {
  return <div className={"uc2-code-panel"+(repair?" is-repair":"")}><header><span><img src="./assets/uploads/detail-terminal.svg" alt=""/>命令行</span><div className="uc2-code-tools">{onModeChange&&<button type="button" className="uc2-code-mode" aria-label={mode==="full"?"仅看相关配置":"查看完整配置"} onClick={onModeChange}><img src="./assets/uploads/detail-expand.svg" alt=""/>{mode==="full"?"仅看相关":"切换全部"}</button>}<button type="button" aria-label={repair?"复制建议命令":"复制当前配置片段"} title="复制命令" onClick={onCopy}><img src="./assets/uploads/detail-copy.svg" alt=""/></button></div></header><div className="uc2-code-lines">{lines.map((line,index)=><div className={"uc2-code-line "+(line.kind||"")} key={index} data-evidence={line.kind==="bad"?"selected":undefined}>{!repair&&<span className="uc2-code-number">{index+1}</span>}<ConfigLine line={line}/>{line.annotation&&<span className="uc2-code-annotation">{line.annotation}</span>}</div>)}</div></div>;
}
function differentTokens(expected,actual){const left=expected.split(/\s+/),right=actual.split(/\s+/);const first=right.findIndex((token,index)=>token!==left[index]);return first<0?"":right.slice(first).join(" ");}

// Pixso UC2-识别完成-规则详情: rule metadata + device list + configuration evidence.
export function Uc2RuleDetail({ruleId}) {
  const {uc2,uc2Review,uc2Reviews,uc2RuleDetailsRef,uc2EditRule,uc2RuleConfigs,toast} = useApp();
  const sourceRule = uc2Rules.find(item=>item.id === (ruleId || uc2.rule));
  const saved=sourceRule?uc2RuleConfigs[sourceRule.id]:null;
  const rule=sourceRule?{...sourceRule,name:saved?.name||sourceRule.name}:null;
  const [,setVersion] = useState(0),navRef=useRef(null);
  const devices = rule ? samplesFor(rule) : [];
  const initial = devices.find(device=>device.bad) || devices[0];
  const state = rule ? uc2RuleDetailsRef.current[rule.id] || (uc2RuleDetailsRef.current[rule.id]={status:rule.deviations?"failed":"all",query:"",selected:initial?.id,mode:"related",navScroll:0}) : null;
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
  const fullLines=device?[{text:"sysname "+device.name},{text:"#"},...(!rule.cmd.startsWith("info-center ")?[{text:"info-center loghost 10.10.0.20"}]:[]),...(!rule.cmd.startsWith("ntp-service ")?[{text:"ntp-service unicast-server 10.10.0.10"}]:[]),{text:"#"},{text:contextLine},{text:evidence.command,kind:device.bad?"bad":"good",highlight,annotation:device.bad?annotation:null},{text:"#"},{text:"lldp enable"},{text:"#"}]:[];
  const priority=saved?.priority||(impact==="高"?"高优先级":impact==="中"?"中优先级":"低优先级");

  const lines=state.mode==="full"?fullLines:relatedLines;
  return <div className="uc2-rule-workspace" data-rule-detail={rule.id} data-design-node="2:321802">
    <header className="uc2-rule-overview"><span className="uc2-rule-overview-icon" aria-hidden="true"><img src="./assets/uploads/uc2-rule-detail/rule-overview.svg" alt=""/></span><div className="uc2-rule-overview-copy"><div className="uc2-rule-heading"><h2>{rule.name}</h2><span className={"uc2-rule-state "+(rule.deviations?"failed":"passed")}>{rule.deviations?"存在配置差异":"样本配置一致"}</span></div>
      <dl className="uc2-rule-metadata">{[["范围","西三旗 DC"],["分类",rule.category],["规则类型",review==="accepted"&&saved?"已采纳规则":"候选规则"],["差异设备",rule.deviations+"台"],["规则编号",saved?.ruleId||rule.id],["适用规则",rule.role==="通用"?"共性规则":rule.role],["配置一致",rule.support+"/"+rule.scope+"台"],["覆盖率",(rule.support/rule.scope*100).toFixed(1).replace(/\.0$/,"")+"%"]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
    </header>
    <div className="uc2-rule-body"><aside className="uc2-rule-devices" aria-label="设备配置核验"><h3>设备配置核验</h3><div className="uc2-device-filters" role="group" aria-label="样本设备配置核验状态">{[["all","全部",rule.scope],["failed","不通过",rule.deviations],["passed","通过",rule.support]].map(([id,label,count])=><button type="button" key={id} aria-pressed={state.status===id} onClick={()=>selectStatus(id)}><i className={id}/>{label}<strong>{count}</strong></button>)}</div><SearchInput value={state.query} onChange={query=>patch({query,selected:null,navScroll:0})} placeholder="请输入搜索内容" ariaLabel="搜索核验设备" clearable/><div className="uc2-device-list" ref={navRef} onScroll={e=>{state.navScroll=e.currentTarget.scrollTop;}}>{visible.map(item=><button type="button" className={"uc2-device-item "+(item.bad?"failed":"passed")+(device?.id===item.id?" selected":"")} key={item.id} aria-label={"查看样本设备："+item.name} aria-pressed={device?.id===item.id} onClick={()=>patch({selected:item.id})}><i/><span><strong>西三旗 · {item.name}</strong><small><span>{priority}</span><span>{item.bad?"本规则异常 1 项":"本规则异常 0 项"}</span></small></span></button>)}{!visible.length&&<EmptyState text="没有匹配的设备"/>}</div></aside>
      <article className="uc2-rule-evidence" aria-label="样本设备配置详情">{device?<><div className="uc2-evidence-heading"><h3>西三旗 · {device.name}</h3></div><div className="uc2-candidate-requirement">规则 <span>{rule.cmd}</span></div>
        <div className="uc2-evidence-checks" role="group" aria-label="当前候选规则核验结果"><section className={"uc2-evidence-check selected "+(device.bad?"failed":"passed")} data-rule-id={rule.id} data-device-id={device.id} data-anomaly-count={evidence.anomalyCount} aria-label={device.name+" 本规则异常 "+evidence.anomalyCount+" 项"}><span><i/>{device.bad?"配置差异信息 1":"配置一致性信息"}</span><code title={evidence.actual}>{evidence.actual}</code></section></div>
        <section className="uc2-evidence-section"><h4>{device.bad?"影响说明":"核验说明"}</h4><p className="uc2-evidence-summary">{device.bad?(miningImpact[rule.id]?.impact||evidence.reason):"当前设备配置与此候选规则一致，本规则未发现异常。"}</p><CodePanel lines={lines} mode={state.mode} onModeChange={()=>patch({mode:state.mode==="full"?"related":"full"})} onCopy={()=>copy(lines.map(line=>line.text).join("\n"))}/></section>
        <section className="uc2-evidence-section"><h4>修复建议</h4><p className="uc2-evidence-summary">{device.bad?evidence.next:"该设备无需针对本规则调整配置。"}</p>{device.bad&&<CodePanel repair lines={[...(!evidence.command.startsWith("# ")?[{text:"- "+evidence.command,kind:"bad"}]:[]),{text:"+ "+evidence.expected,kind:"good"}]} onCopy={()=>copy(evidence.expected)}/>}</section>
        <div className="uc2-rule-disclaimer">{rule.cmd.includes("<")?"命令中的规划参数已填入示例值，使用前须结合设备与网络规划确认。":"当前为交互原型示例配置，核验后再决定是否调整。"}此处仅展示建议，未下发设备变更。</div>
      </>:<EmptyState text="没有匹配的设备，请调整左侧筛选条件。"/>}</article>
    </div>
    <footer className="uc2-rule-review"><span>候选审阅状态：<strong>{reviewLabels[review]}</strong><small>{review==="accepted"&&saved?"规则配置已保存到本地规则库":"编辑确认后采纳，不下发设备配置"}</small></span><div><button type="button" className="btn" onClick={()=>uc2Review(rule.id,"pending")}>恢复待审阅</button><button type="button" className="btn" onClick={()=>uc2Review(rule.id,"rejected")}>暂不采用</button><button type="button" className="btn primary" onClick={()=>uc2EditRule(rule.id)}>{review==="accepted"?"编辑已采纳规则":"采纳此候选"}</button></div></footer>
  </div>;
}
