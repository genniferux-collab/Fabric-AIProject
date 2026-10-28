import {useState} from "react";
import { useApp } from "../../context.jsx";
import { uc2Rules, uc2DeviationDevices, uc2ExportCsv } from "../../mock/uc2.js";
import Uc2CandidateList from "./candidate-list.jsx";
import { Uc2RuleDetail } from "./rule-detail.jsx";
import Ic from "../../components/icon-el/index.jsx";
import "./report-visual.css";
import {useUc2ReportReveal} from "./report-generation.jsx";

const roles=["通用","核心交换机","Leaf 交换机"], colors=["#438fff","#8472ff","#15d2a1"];
const allCandidateFilters={role:"全部角色",confidence:"全部置信度",status:"all",query:""};
const roleLabel=role=>role==="通用"?"共性":role;
function RoleDonut(){
  const {classAt}=useUc2ReportReveal();
  const {uc2,uc2SetFilter}=useApp();
  const [hovered,setHovered]=useState(null);
  const counts=roles.map(role=>uc2Rules.filter(rule=>rule.role===role).length),active=uc2.role||"全部角色";
  const shown=hovered||(roles.includes(active)?active:null),shownIndex=roles.indexOf(shown);
  const toggle=role=>uc2SetFilter({role:active===role?"全部角色":role});
  let offset=0;
  return <div className={"baseline-role-summary"+classAt(.24)}><div className={"baseline-donut"+(shown?" has-role-caption":"")} data-filtered={active!=="全部角色"}>
    <svg viewBox="0 0 160 160" role="group" aria-label="候选规则角色分布，可点击筛选">
    {[0,2,1].map(index=>{const count=counts[index],start=offset,share=count/uc2Rules.length*100;offset+=share;const geometry={cx:80,cy:80,pathLength:100,fill:"none",strokeLinecap:"round",transform:"rotate(-125 80 80)"};return <g key={roles[index]} className="baseline-donut-segment" role="button" tabIndex="0" aria-label={`按角色筛选：${roleLabel(roles[index])}${count}条`} aria-pressed={active===roles[index]} data-highlighted={shown===roles[index]} onMouseEnter={()=>setHovered(roles[index])} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(roles[index])} onBlur={()=>setHovered(null)} onClick={()=>toggle(roles[index])} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();toggle(roles[index]);}}}><title>{roleLabel(roles[index])} {count}条，占比{(share).toFixed(1)}%，点击筛选</title><circle {...geometry} className="baseline-role-softband" r="60" stroke={colors[index]} strokeWidth="14.5" strokeDasharray={`${share-5.5} 100`} strokeDashoffset={-(start+2.75)}/><circle {...geometry} className="baseline-role-outline" r="69" stroke={colors[index]} strokeWidth="3.2" strokeDasharray={`${share-2} 100`} strokeDashoffset={-(start+1)}/><circle {...geometry} r="65" stroke="transparent" strokeWidth="24" strokeDasharray={`${share-2} 100`} strokeDashoffset={-(start+1)} className="baseline-donut-hit"/></g>;})}
    </svg><button type="button" className="baseline-donut-total" aria-label="恢复全部候选规则" title="点击清除筛选，查看全部候选规则" onClick={()=>{setHovered(null);uc2SetFilter(allCandidateFilters);}}><span>{shown?roleLabel(shown):"候选规则"}</span><strong>{shown?counts[shownIndex]:uc2Rules.length}<small>{shown?`[${Math.round(counts[shownIndex]/uc2Rules.length*100)}%]`:"条"}</small></strong></button></div>
    <div className="baseline-role-legend">{roles.map((role,index)=><button type="button" key={role} aria-pressed={active===role} onMouseEnter={()=>setHovered(role)} onMouseLeave={()=>setHovered(null)} onClick={()=>toggle(role)}><i style={{background:colors[index]}}/><span>{roleLabel(role)}</span><b>{counts[index]}</b></button>)}</div></div>;
}
export function Uc2Report(){
  const {classAt,loading}=useUc2ReportReveal();
  const {uc2,uc2Reviews,uc2SetFilter,toast,openArtifact}=useApp();
  const toggleEvidence=value=>uc2SetFilter({confidence:uc2.confidence===value?"全部置信度":value});
  const showAllRules=()=>{uc2SetFilter({role:"全部角色",status:"all",query:"",confidence:"全部置信度"});openArtifact("uc2-rules","全部候选规则");};
  const high=uc2Rules.filter(rule=>rule.confidence==="高").length,total=uc2Rules.length;
  const devices=new Set(Object.values(uc2DeviationDevices).flat()).size;
  return <article className="baseline-report" id="uc2Report" aria-busy={loading} data-design-file="EK7Fip1D5gCfj8ZkWp3wzQ" data-design-node="5:162385">
    <header className="baseline-report-heading"><div><img src="./assets/uploads/artifact-report-title.svg" alt=""/><h2>西三旗 DC · 黄金基线候选报告</h2><span className="baseline-phase">候选阶段</span></div><div className="baseline-report-actions"><button type="button" aria-label="导出黄金基线候选规则 CSV" title="导出候选规则" onClick={()=>{uc2ExportCsv(uc2Reviews);toast("黄金基线候选规则已导出为 CSV");}}><Ic icon="download"/></button><button type="button" onClick={showAllRules} title="新页签查看全部候选规则" aria-label="新页签查看全部候选规则"><img src="./assets/uploads/artifact-open-tab.svg" alt=""/></button></div></header>
    <div className={"baseline-report-meta"+classAt(.1)}><span>配置快照 S-1027</span><span>挖掘完成</span><span>待审阅</span></div>
    <section className="baseline-report-overview" aria-label="黄金基线候选规则总览"><div className="baseline-evidence-overview"><RoleDonut/><div className={"baseline-evidence-summary"+classAt(.38)}><div className="baseline-evidence-layout"><div className="baseline-evidence-chart"><div className="baseline-evidence-bar" role="group" aria-label="候选证据分布，可点击筛选">{[["高",high,"证据较充分","var(--baseline-support-blue)"],["待验证",total-high,"待验证","#f1848b"]].map(([value,count,label,color])=><button type="button" key={value} style={{flexGrow:count,"--evidence-color":color}} aria-label={`按证据筛选：${label}${count}条`} aria-pressed={uc2.confidence===value} title={`${label} ${count}条，点击筛选`} onClick={()=>toggleEvidence(value)}><span className="baseline-evidence-segment-caption"><i/><span>{label}</span><b>{count}<small>条</small></b></span><span className="baseline-evidence-bars" aria-hidden="true">{Array.from({length:count*3},(_,index)=><i key={index}/>)}</span></button>)}</div></div>
      </div>
</div></div><aside className={"baseline-insight"+classAt(.54)}><h3><img src="./assets/uploads/report-conclusion-sparkle.svg" alt=""/>黄金基线挖掘洞察</h3><p><b>{high}</b> 条规则具备高置信度，<b>{total-high}</b> 条仍待验证；<b>{devices}</b> 台设备存在候选偏离，建议<span>优先核验登录安全与核心冗余配置</span>。</p></aside></section>
    <Uc2CandidateList embedded/>
  </article>;
}
export { Uc2RuleDetail };
