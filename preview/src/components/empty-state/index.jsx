// 空态原子组件 — 列表/表格无匹配时的占位提示
export default function EmptyState({ text, cls = "device-empty" }) {
  return <div className={cls}>{text}</div>;
}
