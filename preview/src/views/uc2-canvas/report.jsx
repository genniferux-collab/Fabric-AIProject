import EChart from "../../components/echart/index.jsx";
import {readCssLength} from "../../utils/css-length.js";
import ReportExport from '../../components/report-export/index.jsx';
import {useState} from "react";
import {createRoleDonutOption} from "./role-donut-chart.js";
import { useApp } from "../../context.jsx";
import { uc2Rules, uc2DeviationDevices } from "../../mock/uc2.js";
import Uc2CandidateList from "./candidate-list.jsx";
import { Uc2RuleDetail } from "./rule-detail.jsx";
import ArtifactOpen from "../../components/artifact-open/index.jsx";
import "./report-visual.css";
import {useUc2ReportReveal} from "./report-generation.jsx";

const roles=["通用","核心交换机","Leaf 交换机"], colors=["#438fff","#8472ff","#15d2a1"];
// 图表只修改下方候选列表的筛选条件，总览统计始终保留完整规则集口径。
const allCandidateFilters={role:"全部角色",confidence:"全部置信度",status:"all",query:""};
const roleLabel=role=>role==="通用"?"共性":role;
function RoleDonut(){
  const {classAt}=useUc2ReportReveal();
  const {uc2,uc2SetFilter}=useApp();
  const [hovered,setHovered]=useState(null);
  const [directHover,setDirectHover]=useState(null),[focusedRole,setFocusedRole]=useState(null);
  const counts=roles.map(role=>uc2Rules.filter(rule=>rule.role===role).length),active=uc2.role||"全部角色";
  const shown=hovered||(roles.includes(active)?active:null),shownIndex=roles.indexOf(shown);
  const toggle=role=>uc2SetFilter({role});
  const option=size=>{
    // 按当前 CSS token 解析圆角；ECharts 的几何输入保持未缩放 CSS px。
    const bandCornerRadius=readCssLength(size.element,"--baseline-band-radius",8);
    return createRoleDonutOption(size,{counts,colors,selectedIndex:roles.indexOf(active),highlightedIndex:roles.indexOf(shown),brightenedIndex:roles.indexOf(directHover),focusedIndex:roles.indexOf(focusedRole),bandCornerRadius,reducedMotion:window.matchMedia("(prefers-reduced-motion: reduce)").matches});
  };
  let offset=0;
  return <div className={"baseline-role-summary"+classAt(.24)}><div className={"baseline-donut"+(shown?" has-role-caption":"")} data-filtered={active!=="全部角色"}>
    <EChart className="baseline-role-chart" option={option} notMerge={false}/>
    {/* 仅保留透明命中层，延续原点击范围、键盘和无障碍语义；可见弧形全部由 ECharts 绘制。 */}
    <svg className="baseline-donut-hit-layer" viewBox="0 0 160 160" role="group" aria-label="候选规则角色分布，可点击筛选">
    {[0,2,1].map(index=>{const count=counts[index],start=offset,share=count/uc2Rules.length*100;offset+=share;const geometry={cx:80,cy:80,pathLength:100,fill:"none",strokeLinecap:"round",transform:"rotate(-125 80 80)"};return <g key={roles[index]} className="baseline-donut-segment" role="button" tabIndex="0" aria-label={`按角色筛选：${roleLabel(roles[index])}${count}条`} aria-pressed={active===roles[index]} data-highlighted={shown===roles[index]} onMouseEnter={()=>{setHovered(roles[index]);setDirectHover(roles[index]);}} onMouseLeave={()=>{setHovered(null);setDirectHover(null);}} onFocus={event=>{setHovered(roles[index]);setFocusedRole(event.currentTarget.matches(":focus-visible")?roles[index]:null);}} onBlur={()=>{setHovered(null);setFocusedRole(null);}} onPointerDown={()=>setFocusedRole(null)} onClick={()=>toggle(roles[index])} onKeyDown={event=>{setFocusedRole(roles[index]);if(event.key==="Enter"||event.key===" "){event.preventDefault();toggle(roles[index]);}}}><title>{roleLabel(roles[index])} {count}条，占比{(share).toFixed(1)}%，点击筛选</title><circle {...geometry} r="65" stroke="transparent" strokeWidth="24" strokeDasharray={`${share-2} 100`} strokeDashoffset={-(start+1)} className="baseline-donut-hit"/></g>;})}
    </svg><button type="button" className="baseline-donut-total" aria-label="恢复全部候选规则" title="点击清除筛选，查看全部候选规则" onClick={()=>{setHovered(null);uc2SetFilter(allCandidateFilters);}}><span>{shown?roleLabel(shown):"候选规则"}</span><strong>{shown?counts[shownIndex]:uc2Rules.length}<small>{shown?`[${Math.round(counts[shownIndex]/uc2Rules.length*100)}%]`:"条"}</small></strong></button></div>
    <div className="baseline-role-legend">{roles.map((role,index)=><button type="button" key={role} aria-pressed={active===role} onMouseEnter={()=>setHovered(role)} onMouseLeave={()=>setHovered(null)} onClick={()=>toggle(role)}><i style={{background:colors[index]}}/><span>{roleLabel(role)}</span><b>{counts[index]}</b></button>)}</div></div>;
}
// 保留原分组按钮的比例、悬浮滤镜与键盘语义，仅将可见条纹交给 ECharts 绘制。
function ConfidenceStripe({color,count,label}){
  const option=({width,height,element})=>{
    const fill=getComputedStyle(element).color,children=[];
    for(let x=0;x<width;x+=7)children.push({type:'rect',silent:true,shape:{x,y:0,width:Math.min(5,width-x),height},style:{fill}});
    return {animation:false,tooltip:{show:false},aria:{enabled:false},series:[{type:'custom',coordinateSystem:'none',silent:true,data:[{name:label,value:count}],renderItem:()=>({type:'group',children})}]};
  };
  // 多绘制 1px 再由原有圆角容器裁切，避免分数组宽度在 clientWidth 取整时漏掉边缘。
  return <span className="baseline-confidence-chart-host" aria-hidden="true"><EChart option={option} style={{color,width:'calc(100% + 1px)',height:'100%'}}/></span>;
}

export function Uc2Report(){
  const {classAt,loading}=useUc2ReportReveal();
  const {uc2,uc2Reviews,uc2SetFilter,uc2RuleConfigs}=useApp();
  const toggleEvidence=value=>uc2SetFilter({confidence:value});
  const high=uc2Rules.filter(rule=>rule.confidence==="高").length,total=uc2Rules.length;
  const devices=new Set(Object.values(uc2DeviationDevices).flat()).size;
  const confidenceGroups=[{value:"高",count:high,label:"高置信",range:"95%–99%",color:"var(--baseline-support-blue)",tint:"#4872ba26"},{value:"中",count:total-high,label:"中置信度",range:"94%–90%",color:"#f1848b",tint:"#f1848b21"}];
  const confidenceSelected=confidenceGroups.some(group=>group.value===uc2.confidence);
  return <article className="baseline-report" id="uc2Report" aria-busy={loading} data-design-file="EK7Fip1D5gCfj8ZkWp3wzQ" data-design-node="5:162385">
    <header className="baseline-report-heading"><div><img src="./assets/uploads/artifact-report-title.svg" alt=""/><h2>西三旗 DC · 黄金基线候选报告</h2><span className="baseline-phase">候选阶段</span></div><div className="baseline-report-actions"><ReportExport uc="uc2" reviews={uc2Reviews} ruleConfigs={uc2RuleConfigs} disabled={loading}/><ArtifactOpen kind="uc2-report" title="黄金基线候选报告"/></div></header>
    <div className={"baseline-report-meta"+classAt(.1)}><span>配置快照 S-1027</span><span>挖掘完成</span><span>待审阅</span></div>
    <section className="baseline-report-overview" aria-label="黄金基线候选规则总览"><div className="baseline-evidence-overview"><RoleDonut/><div className={"baseline-evidence-summary"+classAt(.38)}><div className="baseline-evidence-layout"><div className={"baseline-confidence-chart"+(confidenceSelected?" has-selection":"")} role="group" aria-label="候选规则置信度分布，可点击筛选">
      <div className="baseline-confidence-labels">{confidenceGroups.map(group=><button type="button" key={group.value} className="baseline-confidence-label" style={{"--confidence-color":group.color,"--confidence-tint":group.tint}} aria-label={`按置信度筛选：${group.label}（${group.range}）${group.count}条`} aria-pressed={uc2.confidence===group.value} title="点击筛选对应候选规则；通过全部入口恢复" onClick={()=>toggleEvidence(group.value)}><i/><span className="baseline-confidence-copy"><span>{group.label}</span><small>{group.range}</small></span><b>{group.count}<small>条</small></b></button>)}</div>
      <div className="baseline-confidence-track">{confidenceGroups.map(group=><button type="button" key={group.value} style={{flexGrow:group.count,"--confidence-color":group.color}} aria-label={`按条形筛选：${group.label}${group.count}条`} aria-pressed={uc2.confidence===group.value} title={`${group.label} ${group.count}条，占比${Math.round(group.count/total*100)}%`} onClick={()=>toggleEvidence(group.value)}><ConfidenceStripe color={group.color} count={group.count} label={group.label}/></button>)}</div>
    </div>
      </div>
</div></div><aside className={"baseline-insight"+classAt(.54)}><h3><img src="./assets/uploads/report-conclusion-sparkle.svg" alt=""/>黄金基线挖掘洞察</h3><p><b>{high}</b> 条规则具备高置信度，<b>{total-high}</b> 条为中置信度候选；<b>{devices}</b> 台设备存在候选偏离，建议<span>优先核验登录安全与核心冗余配置</span>。</p></aside></section>
    <Uc2CandidateList embedded/>
  </article>;
}
export { Uc2RuleDetail };
