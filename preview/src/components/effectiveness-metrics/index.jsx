import OrangePurpleBeam from "../orange-purple-beam/index.jsx";
import "./index.css";

const assetRoot="./assets/uploads/pixso-home-map/";
export default function EffectivenessMetrics({panelRef}) {
  return <section className="effectiveness-metrics" ref={panelRef} aria-labelledby="effectiveness-title" tabIndex={0}>
    <h2 id="effectiveness-title">数据总览</h2>
    <div className="effectiveness-metrics-grid">
      <div className="effectiveness-metric-group" aria-label="配置生成成效">
        <Metric value="95" unit="%" label="AI辅助生成率" help="AI 辅助生成工作流占比"/>
        <div className="effectiveness-metric effectiveness-workflow">
          <Metric value="95/100" label="人工/AI辅助生成工作流" help="人工与 AI 辅助生成工作流数量"/>
          <img className="effectiveness-distribution" src={`${assetRoot}distribution.svg`} alt="工作流分布：人工与 AI 辅助生成"/>
        </div>
      </div>
      <span className="effectiveness-group-divider" aria-hidden="true"/>
      <div className="effectiveness-metric-group" aria-label="配置检查成效">
        <div className="effectiveness-metric effectiveness-compliance">
          <Metric value="90" unit="%" label="近期检查合规率" help="近期设备配置检查的合规率"/>
          <img className="effectiveness-trend" src={`${assetRoot}trend.svg`} alt="近期合规率趋势，比上一周期上升 2%"/>
        </div>
        <Metric value="3280" label="累计检查设备" help="累计完成配置检查的设备数量"/>
      </div>
    </div>
    <OrangePurpleBeam className="effectiveness-border-beam" duration={10.8} borderRadius={16} strength={.78}/>
  </section>;
}
function Metric({value,unit,label,help}) {
  return <div className="effectiveness-metric-copy"><strong>{value}{unit&&<span>{unit}</span>}</strong><span>{label}<img src={`${assetRoot}metric-info.svg`} alt="" title={help}/></span></div>;
}
