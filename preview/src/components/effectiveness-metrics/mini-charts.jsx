import EChart from "../echart/index.jsx";
import {workflowOption,complianceTrendOption} from "./chart-options.js";

// 只替换绘图区；尺寸、原稿文字轮廓和外部指标布局保持不变。
export function WorkflowDistribution(){
  return <div className="effectiveness-distribution" role="img" aria-label="工作流分布：人工与 AI 辅助生成"><EChart option={workflowOption} exactSize/></div>;
}

export function ComplianceTrend(){
  return <div className="effectiveness-trend" role="img" aria-label="近期合规率趋势，比上一周期上升 2%"><EChart option={complianceTrendOption} exactSize/></div>;
}
