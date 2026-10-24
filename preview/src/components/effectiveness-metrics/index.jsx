import Chart from "../../../assets/shared/chart.jsx";
import "./index.css";

const workflowDistribution = [
  { name: "人工生成", value: 96 },
  { name: "AI 辅助生成", value: 100 },
];
const complianceTrend = [
  { 日期: "10/18", 合规率: 82 }, { 日期: "10/19", 合规率: 85 },
  { 日期: "10/20", 合规率: 84 }, { 日期: "10/21", 合规率: 88 },
  { 日期: "10/22", 合规率: 86 }, { 日期: "10/23", 合规率: 89 },
  { 日期: "10/24", 合规率: 90 },
];

export default function EffectivenessMetrics() {
  return (
    <section className="effectiveness-metrics" aria-labelledby="effectiveness-title">
      <h2 id="effectiveness-title">成效指标</h2>
      <div className="effectiveness-metrics-grid">
        <div className="effectiveness-metric-group" aria-label="配置生成成效">
          <div className="effectiveness-metric">
            <div className="effectiveness-metric-copy"><strong>95<span>%</span></strong><span>AI 辅助生成率</span></div>
          </div>
          <div className="effectiveness-metric">
            <div className="effectiveness-metric-copy"><strong>96<span className="effectiveness-ratio-separator">/</span>100</strong><span>人工 / AI 辅助生成工作流</span></div>
            <div className="effectiveness-distribution" role="img" aria-label="工作流分布：蓝色人工生成 96，绿色 AI 辅助生成 100">
              <Chart name="PieChart" option={{
                data: workflowDistribution, a2ui: false, adaptive: false,
                title: { text: "" }, legendPosition: "centerRight",
                legend: { show: true, orient: "vertical", left: 52, right: "auto", top: "middle", itemWidth: 6, itemHeight: 6, itemGap: 8, icon: "circle", textStyle: { fontSize: 10 } },
                label: { show: false }, position: { radius: [14, 20], center: [20, 26] },
                series: [{ name: "工作流分布", type: "pie", radius: [14, 20], center: [20, 26], label: { show: false }, labelLine: { show: false }, emphasis: { scale: false } }],
              }} />
            </div>
          </div>
        </div>
        <span className="effectiveness-group-divider" aria-hidden="true" />
        <div className="effectiveness-metric-group" aria-label="配置检查成效">
          <div className="effectiveness-metric">
            <div className="effectiveness-metric-copy"><strong>90<span>%</span></strong><span>近期检查合规率</span></div>
            <div className="effectiveness-trend" role="img" aria-label="近期合规率示意趋势：82%、85%、84%、88%、86%、89%、90%">
              <Chart name="LineChart" option={{ data: complianceTrend, xAxis: { data: "日期" }, yAxisTitle: "合规率 (%)", mini: true, smooth: true, area: true }} />
            </div>
          </div>
          <div className="effectiveness-metric">
            <div className="effectiveness-metric-copy"><strong>3280</strong><span>累计检查设备</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
