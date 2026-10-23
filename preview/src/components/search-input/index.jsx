import Ic from "../icon-el/index.jsx";

// 搜索输入原子组件（.search 结构：input + 搜索图标，可选清空钮）
// 受控组件：value + onChange(value)
export default function SearchInput({ id, value, onChange, placeholder, ariaLabel, clearable = false, className = "" }) {
  return (
    <label className={"search" + (className ? " " + className : "")}>
      <input id={id} placeholder={placeholder} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} />
      {clearable && value ? (
        <button className="icon-btn" aria-label="清空搜索" title="清空搜索" style={{ width: "16px", height: "20px", display: "flex" }} onClick={() => onChange("")}>
          <Ic icon="x" />
        </button>
      ) : null}
      <Ic icon="search" />
    </label>
  );
}
