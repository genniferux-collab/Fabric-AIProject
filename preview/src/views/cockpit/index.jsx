import { useRef, useState } from "react";
import DataCenterNetworkAgent from "../../components/network-agent-dashboard/index.jsx";
import { useApp } from "../../context.jsx";
import EffectivenessMetrics from "../../components/effectiveness-metrics/index.jsx";
import MapNetworkOverlay from "../../components/map-network-overlay/index.jsx";
import "./index.css";

export default function Cockpit() {
  const { openAgentHome } = useApp();
  const [mapScale, setMapScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStart = useRef(null);
  const changeScale = (amount) => setMapScale((value) => Math.min(2.4, Math.max(1, Number((value + amount).toFixed(2)))));

  return (
    <main className="figma-network-page">
      <EffectivenessMetrics />
      <div
        className="figma-map"
        aria-label="可缩放的中国区域地图"
        onWheel={(event) => {
          event.preventDefault();
          changeScale(event.deltaY < 0 ? 0.1 : -0.1);
        }}
        onPointerDown={(event) => {
          if (event.target.closest("button")) return;
          dragStart.current = { x: event.clientX, y: event.clientY, offsetX: mapOffset.x, offsetY: mapOffset.y, scale: event.currentTarget.getBoundingClientRect().width / event.currentTarget.offsetWidth };
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsPanning(true);
        }}
        onPointerMove={(event) => {
          if (!dragStart.current) return;
          setMapOffset({
            x: dragStart.current.offsetX + (event.clientX - dragStart.current.x) / dragStart.current.scale,
            y: dragStart.current.offsetY + (event.clientY - dragStart.current.y) / dragStart.current.scale,
          });
        }}
        onPointerUp={() => {
          dragStart.current = null;
          setIsPanning(false);
        }}
        onPointerCancel={() => {
          dragStart.current = null;
          setIsPanning(false);
        }}
      >
        <div className={`figma-map-canvas${isPanning ? " is-panning" : ""}`} style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapScale})` }}>
          <div className="figma-map-plane">
          <img
            className="figma-map-image"
            src="./assets/uploads/figma/china-dark-map.png"
            alt="以中国为中心的深色地图"
          />
          <MapNetworkOverlay />
          </div>
        </div>
        <div className="map-network-legend" aria-label="地图图例"><span><i className="dc-key" />4 个数据中心</span><span><i className="branch-key" />31 个支行</span><span><i className="connection-key" />124 条直连</span></div>
        <div className="figma-map-controls" aria-label="地图缩放控制">
          <button type="button" onClick={() => changeScale(0.2)} aria-label="放大地图">+</button>
          <button type="button" onClick={() => changeScale(-0.2)} aria-label="缩小地图">−</button>
          <button type="button" onClick={() => { setMapScale(1); setMapOffset({ x: 0, y: 0 }); }} aria-label="重置地图视图">⌂</button>
        </div>
      </div>
      <aside className="figma-dashboard"><DataCenterNetworkAgent onOpenAgent={openAgentHome} /></aside>
    </main>
  );
}
