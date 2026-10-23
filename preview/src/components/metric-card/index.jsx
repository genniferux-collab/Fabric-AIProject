// 指标卡原子组件（label / value / unit 三段结构）
export default function MetricCard({ label, value, unit, cls = "uc2-metric" }) {
  return (
    <div className={cls}><label>{label}</label><strong>{value}</strong><small>{unit}</small></div>
  );
}
