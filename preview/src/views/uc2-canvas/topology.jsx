import { useApp } from "../../context.jsx";
import { uc2Names } from "../../mock/uc2.js";
import MetricCard from "../../components/metric-card/index.jsx";

export function Uc2Title({ stage, title, sub, tag }) {
  return (
    <div className="uc2-head">
      <div>
        <div className="uc2-screen-label">西三旗 DC · {uc2Names[stage]}</div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      <span className="uc2-tag">{tag}</span>
    </div>
  );
}

// 模块 1：设备还原拓扑
function TopoNode({ id, x, y, w, h, name, sub, selected, onSelect }) {
  return (
    <g role="button" tabIndex={0} aria-label={"查看" + name} className={"uc2-node" + (selected === id ? " selected" : "")}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(id); }}>
      <rect x={x} y={y} width={w} height={h} rx="7" fill="#202a33" stroke="#496174" />
      <text x={x + w / 2} y={y + 26} textAnchor="middle" fontSize="16">{name}</text>
      <text x={x + w / 2} y={y + 47} textAnchor="middle" fontSize="12" opacity=".6">{sub}</text>
    </g>
  );
}

export default function Uc2Topology() {
  const { uc2, uc2SelectNode } = useApp();
  const selected = uc2.node;
  const selName = selected === "dc" ? "西三旗 DC" : selected?.startsWith("core") ? (selected === "core1" ? "CoreSwitch-01" : "CoreSwitch-02") : selected ? "区域组 " + selected.toUpperCase() : "";
  const selDesc = selected === "dc"
    ? "32 个区域 · 1,980 台交换机，满足角色可识别与配置快照可用条件。"
    : selected?.startsWith("core")
      ? "核心交换机 · 华为 CE12800 · 当前快照可用 · 纳入核心角色聚类代表设备。"
      : selected
        ? "8 个区域的 Leaf 交换机聚合范围；本轮按角色抽样分析，非全量检查。"
        : "";

  return (
    <>
      <Uc2Title stage={1} title="正在还原数据中心网络拓扑" sub="32 个区域已定位 · 1,980 台交换机满足条件 · 下图为角色与区域聚合视图" tag="扫描完成" />
      <div className="uc2-metrics">
        <MetricCard label="区域范围" value="32" unit="个区域" />
        <MetricCard label="满足条件设备" value="1,980" unit="台交换机" />
        <MetricCard label="核心 / Leaf" value="80 / 1,900" unit="台 · 按角色聚合" />
        <MetricCard label="本轮分析样本" value="100" unit="台 · 核心20 / Leaf80" />
      </div>
      <div className={"uc2-topology " + (uc2.running && uc2.max === 1 ? "" : "complete")}>
        <svg viewBox="0 0 1200 490" role="img" aria-label="西三旗DC按核心、Leaf和区域聚合的网络拓扑">
          <defs>
            <linearGradient id="scan">
              <stop stopColor="#3775b6" stopOpacity="0" />
              <stop offset="1" stopColor="#4c95db" stopOpacity=".3" />
            </linearGradient>
          </defs>
          <rect className="scan-line" y="0" width="170" height="490" fill="url(#scan)" />
          <g stroke="#56718a" fill="none" strokeWidth="1.3">
            <path d="M600 90V135H315V185M600 135H885V185M315 245V285H170V330M315 285H455V330M885 245V285H745V330M885 285H1030V330" />
            <path d="M315 245L745 330M885 245L455 330" strokeDasharray="5 6" opacity=".5" />
          </g>
          <TopoNode id="dc" x={475} y={30} w={250} h={60} name="西三旗 DC" sub="32 区域 · 1,980 台交换机" selected={selected} onSelect={uc2SelectNode} />
          <TopoNode id="core1" x={185} y={185} w={260} h={60} name="CoreSwitch-01" sub="核心角色 · 代表设备" selected={selected} onSelect={uc2SelectNode} />
          <TopoNode id="core2" x={755} y={185} w={260} h={60} name="CoreSwitch-02" sub="核心角色 · 代表设备" selected={selected} onSelect={uc2SelectNode} />
          {[["a", 55, "区域组 A · 8 区域", "Leaf · 480 台"], ["b", 340, "区域组 B · 8 区域", "Leaf · 470 台"], ["c", 625, "区域组 C · 8 区域", "Leaf · 480 台"], ["d", 910, "区域组 D · 8 区域", "Leaf · 470 台"]].map(([id, x, name, sub]) => (
            <TopoNode key={id} id={id} x={x} y={330} w={230} h={72} name={name} sub={sub} selected={selected} onSelect={uc2SelectNode} />
          ))}
          <text x="600" y="465" textAnchor="middle" fontSize="13" fill="#888">核心层 80 台 · Leaf 层 1,900 台 · 连线表示聚合关系</text>
        </svg>
        <div className="uc2-legend">
          <span><i />配置快照可用</span>
          <span>实线：层级关联</span>
          <span>虚线：双归属示意</span>
          <span>点击节点查看范围</span>
        </div>
      </div>
      {selected ? (
        <div className="uc2-selection">
          <h3>{selName}</h3>
          <p>{selDesc}</p>
        </div>
      ) : null}
      <p className="uc2-note">拓扑为任务范围可视化：32 个区域聚合为 4 组。设备与连线为演示数据，不代表真实生产拓扑。</p>
    </>
  );
}
