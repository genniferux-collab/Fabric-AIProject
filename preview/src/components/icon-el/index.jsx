import { Icon } from "../../../assets/shared/icon.jsx";

// 图标原子组件 — 统一 .ic 规格描边（20px / strokeWidth 1.6 / 尺寸与配色交给 .ic CSS）
// 注意：prop 必须命名为 `icon` 且传字符串字面量（构建期按 icon="x" 属性静态提取 Lucide 名）；
// 条件图标名无法被静态提取，此类场景请直接使用 assets/shared/icon.jsx 的 Icon 组件并自行传 className="ic"。
export default function Ic({ icon, className = "ic", style, title, onClick }) {
  return <Icon name={icon} className={className} strokeWidth={1.6} style={style} title={title} onClick={onClick} />;
}
