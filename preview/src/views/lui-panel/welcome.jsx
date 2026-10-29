import {useState} from "react";
import "./welcome.css";

const assetRoot="./assets/uploads/pixso-ai-welcome/";
const scenarios=[
  {icon:"scenario-query",title:"查询当前全量配置检查项",description:"搜索当前全网有多少巡检项",prompt:"当前全网有哪些检查规则？"},
  {icon:"scenario-mining",title:"帮我自动挖掘一下西三旗DC的黄金基线",description:"自动挖掘西三旗DC黄金基线，针对交换机角色设备，查看不合规项",prompt:"帮我自动挖掘一下西三旗DC的黄金基线，看看现网有哪些不合规？"},
  {icon:"scenario-rule",title:"帮我建一条检查规则",description:"帮我创建规则：用户接口空闲超时时间不能超过10分钟",prompt:"帮我创建规则：用户接口空闲超时时间不能超过10分钟"},
  {icon:"scenario-check",title:"检查设备是否负责基线要求，出修复建议",description:"检查HCS1的设备是否负责基线要求，并给出修复建议",prompt:"检查HCS1的设备是否符合基线要求，并给出修复建议。"}
];

// One welcome entry is shared by UC1–UC4; scenario selection prepares a draft.
export default function WelcomeHome({onChoose}){
  const [batch,setBatch]=useState(0);
  const ordered=scenarios.map((_,index)=>scenarios[(index+batch)%scenarios.length]);
  return <section className="ai-welcome-screen" aria-label="AI 智能运维欢迎页">
    <div className="ai-welcome-brand"><img src={`${assetRoot}brand.svg`} alt="Aico" draggable="false"/></div>
    <p className="ai-welcome-description">我是Aico，可以帮你解决以下问题</p>
    <div className="ai-welcome-scenarios-heading"><span>智能运维场景</span><button type="button" onClick={()=>setBatch(value=>(value+1)%scenarios.length)}><img src={`${assetRoot}refresh.svg`} alt=""/>换一批</button></div>
    <div className="ai-welcome-scenarios">{ordered.map(scenario=><button type="button" className="ai-welcome-scenario" key={scenario.icon} onClick={()=>onChoose(scenario.prompt,"check")}>
      <span className="ai-welcome-scenario-title"><img src={`${assetRoot}${scenario.icon}.svg`} alt=""/>{scenario.title}</span>
      <span className="ai-welcome-scenario-description">{scenario.description}</span>
    </button>)}</div>
  </section>;
}
