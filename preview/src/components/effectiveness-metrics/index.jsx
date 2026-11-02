import {Tooltip} from "antd";
import OrangePurpleBeam from "../orange-purple-beam/index.jsx";
import {WorkflowDistribution,ComplianceTrend} from "./mini-charts.jsx";
import "./index.css";

const assetRoot="./assets/uploads/pixso-home-map/";
// panelRef 供地图测量指标栏高度，为聚焦位置和悬浮提示预留空间。
export default function EffectivenessMetrics({panelRef}) {
  return <section className="effectiveness-metrics" ref={panelRef} aria-labelledby="effectiveness-title" tabIndex={0}>
    <h2 id="effectiveness-title">数据总览</h2>
    <div className="effectiveness-metrics-grid">
      <div className="effectiveness-metric-group" aria-label="配置生成成效">
        <Metric value="95" unit="%" label="AI辅助生成率" help="AI 辅助生成工作流占比"/>
        <div className="effectiveness-metric effectiveness-workflow">
          <Metric value="95/100" label="人工/AI辅助生成工作流" help="人工与 AI 辅助生成工作流数量"/>
          <WorkflowDistribution/>
        </div>
      </div>
      <span className="effectiveness-group-divider" aria-hidden="true"/>
      <div className="effectiveness-metric-group" aria-label="配置检查成效">
        <div className="effectiveness-metric effectiveness-compliance">
          <Metric value="90" unit="%" label="近期检查合规率" help="近期设备配置检查的合规率"/>
          <ComplianceTrend/>
        </div>
        <Metric value="3280" label="累计检查设备" help="累计完成配置检查的设备数量"/>
      </div>
    </div>
    <OrangePurpleBeam className="effectiveness-border-beam" duration={10.8} strength={.78}/>
  </section>;
}
function Metric({value,unit,label,help}) {
  return <div className="effectiveness-metric-copy"><strong>{value}{unit&&<span>{unit}</span>}</strong><span>{label}<Tooltip trigger={['hover','focus']} title={help}><img src={`${assetRoot}metric-info.svg`} alt={help} tabIndex={0}/></Tooltip></span></div>;
}
