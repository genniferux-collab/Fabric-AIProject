import { useState } from "react";
import ArtifactOpen from "../../components/artifact-open/index.jsx";
import "./report.css";
import Uc2CandidateList from "./candidate-list.jsx";
import { useApp } from "../../context.jsx";
import { uc2Rules, uc2DeviationDevices, uc2ExportCsv } from "../../mock/uc2.js";
import { Uc2RuleDetail } from "./rule-detail.jsx";
import Ic from "../../components/icon-el/index.jsx";
import { ArtifactIcon } from "../../components/status-marks/index.jsx";
import "../report-card/design.css";

const roles = ["通用", "核心交换机", "Leaf 交换机"];
const roleColors = ["#9b85ef", "#347fe8", "#79a7fb"];
const deviationCount = new Set(Object.values(uc2DeviationDevices).flat()).size;

export function Uc2Report() {
  const { uc2, uc2SetFilter, uc2OpenRule, uc2Reviews, toast, openArtifact } = useApp();
  const [statsOpen,setStatsOpen] = useState(false);
  const roleCounts = roles.map(role => uc2Rules.filter(r => r.role === role).length);
  const highConfidence = uc2Rules.filter(r => r.confidence === "高").length;
  const roleStops = roleCounts.map((count,i)=>`${roleColors[i]} ${roleCounts.slice(0,i).reduce((a,b)=>a+b,0)/uc2Rules.length*100}% ${roleCounts.slice(0,i+1).reduce((a,b)=>a+b,0)/uc2Rules.length*100}%`).join(",");
  const ranked = [...uc2Rules].sort((a,b)=>b.deviations-a.deviations || b.support/b.scope-a.support/a.scope).slice(0,5);
  const showRules=(role="全部角色")=>{uc2SetFilter({role,query:"",category:"全部功能",status:"all",confidence:"全部置信度"});openArtifact("uc2-rules","全部候选规则");};
  const exportReport = () => { uc2ExportCsv(uc2Reviews); toast("黄金基线候选规则已导出为 CSV"); };

  return <div className="uc2-report v7-report report-design" id="uc2Report">
    <div className="v7-report-heading">
      <div className="row"><ArtifactIcon type="conclusion" shape="report"/><h2 className="card-title">西三旗 DC · 黄金基线候选报告</h2></div>
      <div className="uc2-report-actions"><button type="button" className="icon-btn" aria-label="导出黄金基线候选规则 CSV" title="导出候选规则（CSV）" onClick={exportReport}><Ic icon="download"/></button><ArtifactOpen kind="uc2-report" title="黄金基线候选报告"/></div>
    </div>
    <div className="v7-report-meta"><span><Ic icon="map-pin"/>西三旗 DC</span></div>
    <div className="uc2-report-body">
    <section className="v7-summary uc2-candidate-summary" aria-label="候选规则总览">
      <div className="v7-compliance" role="group" aria-label="候选规则与设备统计">
        <div className="uc2-role-ring" role="img" aria-label={`候选规则共${uc2Rules.length}条，共性规则${roleCounts[0]}条，核心交换机${roleCounts[1]}条，Leaf交换机${roleCounts[2]}条`} style={{"--uc2-role-segments":roleStops}}><div><strong>{uc2Rules.length}<small>条</small></strong><span>候选规则总数</span></div></div>
        <div className="v7-summary-counts uc2-summary-roles">{roles.map((role,i)=><button key={role} type="button" aria-pressed={uc2.role===role} title={`筛选${role}候选规则`} onClick={()=>showRules(role)}><i style={{background:roleColors[i]}}/>{role==="通用"?"共性规则":role}<strong>{roleCounts[i]}</strong></button>)}</div>
        <details className="uc2-device-statistics" open={statsOpen} onToggle={e=>{if(e.currentTarget.open!==statsOpen)setStatsOpen(e.currentTarget.open);}}>
          <summary aria-label="设备总数1980台，展开或收起设备统计"><span className="uc2-device-total-label">设备总数</span><span className="uc2-device-total-value"><strong>1,980</strong><small>台</small><Ic icon={statsOpen?"chevron-up":"chevron-down"}/></span></summary>
          <div className="uc2-device-stat-grid"><div><span>本轮分析样本</span><strong>100<small>台</small></strong></div><div><span>核心交换机样本</span><strong>20<small>台</small></strong></div><div><span>Leaf 交换机样本</span><strong>80<small>台</small></strong></div></div>
        </details>
      </div>
      <div className="uc2-summary-right">
        <div className="v11-conclusion"><h3 className="v7-conclusion-label"><img src="./assets/uploads/report-conclusion-sparkle.svg" width="18" height="18" alt=""/>黄金基线挖掘洞察</h3><p className="v12-summary-copy"><strong>{highConfidence} 条规则具备高置信度</strong>，{uc2Rules.length-highConfidence} 条仍待验证；{deviationCount} 台设备存在候选偏离，建议优先核验登录安全与核心冗余配置。</p></div>

      </div>
    </section>
    <section className="v7-overview-section">
      <div className="v7-result-toolbar"><h3 className="v7-section-title">TOP 候选规则 <span className="uc2-top-count">TOP 5</span></h3><div className="uc2-top-actions"><span className="uc2-section-hint">按偏离样本数排序</span><a href="#" className="uc2-all-rules-link" aria-label="新页签查看全部候选规则" onClick={event=>{event.preventDefault();showRules();}}>全部规则<Ic icon="arrow-up-right"/></a></div></div>
      <div className="v7-top-grid">{ranked.map((rule,index)=><article className="v7-top-card uc2-candidate-card" key={rule.id} data-rule-id={rule.id}>
        <button type="button" className="uc2-candidate-open" aria-label={`去审阅：${rule.name}`} onClick={()=>uc2OpenRule(rule.id)}>
          <span className="uc2-candidate-eyebrow"><span className="uc2-candidate-rank">TOP {String(index+1).padStart(2,"0")}</span><span className={"uc2-candidate-confidence "+(rule.confidence==="高"?"high":"pending")}><i/>{rule.confidence==="高"?"高置信":"待验证"}</span></span>
          <span className="uc2-candidate-title" title={rule.name}>{rule.name}</span>
          <span className="uc2-candidate-role">{rule.role}</span>
          <span className="uc2-candidate-metric"><strong>{rule.deviations}</strong><span>台样本偏离</span></span>
          <span className="uc2-candidate-support"><span>配置支持</span><strong>{rule.support}<span> / {rule.scope} 台</span></strong></span>
          <span className="uc2-candidate-track" role="img" aria-label={`配置支持 ${rule.support} / ${rule.scope} 台`}><i style={{width:rule.support/rule.scope*100+"%"}}/></span>
          <span className="uc2-candidate-review">去审阅<Ic icon="arrow-up-right"/></span>
        </button>
      </article>)}</div>
    </section>
    <Uc2CandidateList embedded/>
    </div>
  </div>;
}

export { Uc2RuleDetail };
