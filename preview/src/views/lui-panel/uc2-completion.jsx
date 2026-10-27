import { useApp } from "../../context.jsx";
import { ArtifactTag } from "../../components/status-marks/index.jsx";
import { StreamText, RevealAfter, streamDuration } from "./motion.jsx";
import ResponseTools from "./response-tools.jsx";

const lines = [
  {as:"h2", text:"黄金基线候选报告已生成"},
  {as:"p", text:"本轮分析 100 台样本设备，发现 18 条候选规则，其中 12 条高置信、6 条待验证；9 台设备存在候选偏离，详情见右侧报告。"},
  {as:"h3", text:"审阅建议"},
  {as:"li", leading:"重点核验：", text:"优先审阅登录安全、核心冗余配置及低样本支持项。"},
  {as:"li", leading:"角色与规划：", text:"核对 VLAN 范围、接口描述等与角色或规划相关的变量。"},
  {as:"div", className:"small muted", text:"候选规则尚未发布，也未向设备下发任何变更。"},
];
let delay = 0;
const timeline = lines.map(line => { const item = {...line, delay}; delay += streamDuration(line.text, 18) + 180; return item; });
const end = delay + 100;

// UC4's completion reveal, mounted once; opening history never restarts the answer.
export default function Uc2Completion({timestamp,duration}) {
  const {uc2Show,uc2Start} = useApp();
  return <>
    <section className="completion audit-completion" id="uc2Conclusion" data-report-result="true" aria-label="黄金基线挖掘结论">
      {timeline.slice(0,3).map((line,index)=><StreamText key={index} {...line} speed={18}/>)}
      <ul className="audit-advice">{timeline.slice(3,5).map((line,index)=><StreamText key={index} {...line} speed={18}/>)}</ul>
      <StreamText {...timeline[5]} speed={18}/>
      <RevealAfter delay={end}><div className="v7-step-artifact"><ArtifactTag title="黄金基线候选报告" type="conclusion" shape="report" timestamp={timestamp} onLocate={()=>uc2Show(3)}/></div></RevealAfter>
    </section>
    <RevealAfter delay={end}><ResponseTools timestamp={timestamp.slice(5)} duration={duration} subject="挖掘" text="本轮分析100台样本设备，发现18条候选规则，其中12条高置信、6条待验证，9台设备存在候选偏离。候选规则尚未发布。" onRegenerate={uc2Start} onLocate={()=>uc2Show(3)} locateLabel="定位候选报告"/></RevealAfter>
  </>;
}
