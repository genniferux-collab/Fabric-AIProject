// 分段选项组原子组件 — .filters / .v7-lens / .v7-status-filters 等
// "选项数组 + 选中态" 按钮组的同构封装
// options: [id, label, ...rest]；renderOption(opt) 可自定义按钮内容（如状态筛选的图标与计数）
export default function OptionGroup({ cls, buttonCls = "", options, value, onChange, ariaLabel, renderOption }) {
  return (
    <div className={cls} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const id = opt[0];
        const selected = value === id;
        return (
          <button
            key={id}
            className={(buttonCls ? buttonCls + " " : "") + (selected ? "selected" : "")}
            data-value={id}
            aria-pressed={selected}
            onClick={() => onChange(id)}
          >
            {renderOption ? renderOption(opt) : opt[1]}
          </button>
        );
      })}
    </div>
  );
}
