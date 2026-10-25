import {useId} from "react";
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

// Exact Pixso artwork for the three UC4 artifact headings and their LUI tags.
export function ArtifactIcon({type='process',shape='report'}) {
  const id='uc4-artifact-'+useId().replace(/:/g,''),conclusion=type==='conclusion';
  const artwork={overview:'artifact-network-title.svg',mapping:'artifact-mapping-title.svg',report:'artifact-report-title.svg'};
  if(artwork[shape])return <img className={'v7-artifact-icon '+type} src={'./assets/uploads/'+artwork[shape]} alt="" aria-hidden="true" />;
  const paths={overview:'M3 3h6l6-2 6 2v18l-6-2-6 2-6-2zm7 2v13l4-1.3V3.7zm6-1v13l3 1V5z',mapping:'M3 2h7v6H3zM14 2h7v6h-7zM3 16h7v6H3zM14 16h7v6h-7zM5 8h3v3h8V8h3v6h-3v2h-3v-2H8v2H5z',report:'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 2v5h5zM8 12v2h8v-2zm0 4v2h8v-2z',server:'M4 3h16a1 1 0 0 1 1 1v6H3V4a1 1 0 0 1 1-1zm2 3v2h2V6zM3 13h18v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm3 3v2h2v-2z',rules:'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm1 5 2 2 3-3-1.4-1.4L9 6.2l-.6-.6zm6 0v2h4V7zm-6 7 2 2 3-3-1.4-1.4L9 13.2l-.6-.6zm6 0v2h4v-2z'};
  return <svg className={'v7-artifact-icon '+type} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{conclusion&&<defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#5CA2E9"/><stop offset="1" stopColor="#A18BFA"/></linearGradient></defs>}<path fill={conclusion?'url(#'+id+')':'currentColor'} fillRule="evenodd" d={paths[shape]||paths.report}/></svg>;
}

// 产物标签按钮（LUI 内嵌，点击定位画布卡片）
export function ArtifactTag({ title, type, shape, onLocate, timestamp }) {
  const kind = shape === 'overview' ? 'network' : shape === 'mapping' ? 'artifact' : 'report';
  if(type==='conclusion')return <button type="button" className="v7-conclusion-card" data-lui-artifact={kind} onClick={onLocate}><img className="v7-artifact-icon conclusion" src="./assets/uploads/lui-report-file.svg" width="28" height="28" alt=""/><span className="v7-conclusion-copy"><strong>{title}</strong><span>{timestamp || "整网合规度 · 违规设备 · 检查明细"}</span></span><span className="v7-conclusion-preview">预览</span></button>;
  return (
    <button type="button" className="v7-artifact-tag" data-lui-artifact={kind} onClick={onLocate}>
      {shape === "overview" ? <img className="v7-artifact-icon process" src="./assets/uploads/lui-tag-network.svg" width="12" height="12" alt=""/> : <ArtifactIcon type={type} shape={shape} />}
      <span>{title}</span>
    </button>
  );
}
