import { useEffect, useRef, useState } from "react";
import { Icon } from "../../../assets/shared/icon.jsx";
import { branches, dataCenters } from "../../mock/map-network.js";
import "./index.css";

export default function MapNetworkOverlay() {
  const layerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const focus = hovered || selected;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(layerRef.current);
    return () => observer.disconnect();
  }, []);
  const isRelated = (center, branch) => !focus || (focus.type === "center" ? focus.id === center.id : focus.id === branch.id);
  const point = item => ({ x: item.x * size.width / 100, y: item.y * size.height / 100 });
  const endpoint = center => ({ x: center.x * size.width / 100 + center.dx, y: center.y * size.height / 100 + center.dy + 12 });

  return <div className="map-network-overlay" ref={layerRef} aria-label="全国支行到四个数据中心的连接示意">
    {size.width > 0 && <svg className="map-network-connections" width="100%" height="100%" aria-hidden="true">
      {dataCenters.map(center => {
        const end = endpoint(center);
        const anchor = point(center);
        return <g key={center.id} data-center-id={center.id}>
          {branches.map(branch => {
            const start = point(branch);
            return <line key={branch.id} className={`map-network-connection${focus ? isRelated(center, branch) ? " is-emphasized" : " is-muted" : ""}`} data-branch-id={branch.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeWidth="1" vectorEffect="non-scaling-stroke" />;
          })}
          <line className="map-dc-anchor-line" x1={anchor.x} y1={anchor.y} x2={end.x} y2={end.y} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle className="map-dc-anchor" cx={anchor.x} cy={anchor.y} r="2" />
        </g>;
      })}
    </svg>}
    {branches.map(branch => <span key={branch.id} className={`map-branch-marker${focus?.type === "branch" && focus.id === branch.id ? " is-active" : ""}`} style={{ left: `${branch.x}%`, top: `${branch.y}%` }} role="img" aria-label={`${branch.name}支行`} title={`${branch.name}支行 · 连接四个数据中心`} onMouseEnter={() => setHovered({ type: "branch", id: branch.id })} onMouseLeave={() => setHovered(null)} />)}
    {dataCenters.map(center => <button key={center.id} type="button" className={`map-dc-marker${focus?.type === "center" && focus.id === center.id ? " is-active" : ""}`} style={{ left: `calc(${center.x}% + ${center.dx}px)`, top: `calc(${center.y}% + ${center.dy}px)` }} aria-label={`高亮${center.name}数据中心的${branches.length}条支行连接`} aria-pressed={selected?.type === "center" && selected.id === center.id} title={`${center.name}数据中心`} onMouseEnter={() => setHovered({ type: "center", id: center.id })} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered({ type: "center", id: center.id })} onBlur={() => setHovered(null)} onClick={() => setSelected(selected?.id === center.id ? null : { type: "center", id: center.id })} onKeyDown={event => { if (event.key === "Escape") { setSelected(null); setHovered(null); } }}>
      <span className="map-dc-base" />
      <span className="map-dc-building"><Icon name="server" size="1.5rem" strokeWidth={1.6} /></span>
      <span className={`map-dc-label map-dc-label--${center.labelSide}`}>{center.name}<small>DC</small></span>
    </button>)}
  </div>;
}
