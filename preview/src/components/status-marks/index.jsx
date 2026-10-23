import { Icon } from "../../../assets/shared/icon.jsx";
import { priorityLevels, priorityLabels, priorityCounts } from "../../mock/audit.js";

// 检查结果状态标记（最终口径：不通过/通过）
export function StatusMark({ failed, label }) {
  return (
    <span className={"status-label " + (failed ? "bad" : "good")}>
      <Icon name={failed ? "x" : "check"} className="ic" strokeWidth={1.6} />
      {label || (failed ? "不通过" : "通过")}
    </span>
  );
}

// 优先级徽章
export function PriorityBadge({ priority }) {
  return (
    <span className={"v7-priority-badge " + priority} aria-label={priorityLabels[priority] + "优先级"}>
      <i />
      {priorityLabels[priority]}优先级
    </span>
  );
}

// 优先级分布（设备维度）
export function PriorityDistribution({ device }) {
  const counts = priorityCounts(device);
  return (
    <div className="v7-priority-distribution" aria-label={`不通过规则：高${counts.high}条、中${counts.medium}条、低${counts.low}条`}>
      {priorityLevels.map((p) => (
        <span key={p} className={"v7-priority-count " + p + (counts[p] ? "" : " zero")} title={`${priorityLabels[p]}优先级不通过规则${counts[p]}条`}>
          <i /><span>{priorityLabels[p]}</span><strong>{counts[p]}</strong>
        </span>
      ))}
    </div>
  );
}

// 产物图标（Lucide 近似替代原填充字形；conclusion 用品牌蓝紫单色近似渐变）
export function ArtifactIcon({ type = "process", shape = "report" }) {
  return (
    <Icon
      name={shape === "overview" ? "map" : shape === "mapping" ? "grid-2x2" : shape === "server" ? "server" : shape === "rules" ? "clipboard-list" : "file-text"}
      className={"v7-artifact-icon " + type}
      strokeWidth={1.6}
    />
  );
}

// 产物标签按钮（LUI 内嵌，点击定位画布卡片）
export function ArtifactTag({ title, type, shape, onLocate }) {
  return (
    <button type="button" className="v7-artifact-tag" onClick={onLocate}>
      <ArtifactIcon type={type} shape={shape} />
      <span>{title}</span>
    </button>
  );
}
