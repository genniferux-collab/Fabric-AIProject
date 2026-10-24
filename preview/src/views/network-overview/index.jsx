import ArtifactOpen from "../../components/artifact-open/index.jsx";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import { devices } from "../../mock/devices.js";
import { networkLayoutGroups } from "../../mock/graph.js";
import { deviceTypeLabel } from "../../mock/audit.js";
import { ArtifactIcon } from "../../components/status-marks/index.jsx";
import Ic from "../../components/icon-el/index.jsx";

const inventoryIndex = new Map(devices.map((d, i) => [d.id, i + 1]));
const networkMembers = (id) => devices.filter((d) => d.groupId === id);

function Cluster({ group, index, recognized }) {
  const members = networkMembers(group.id);
  const x = 40 + (index % 3) * 410;
  const y = 40 + Math.floor(index / 3) * 220;
  const identified = members.filter((d) => inventoryIndex.get(d.id) <= recognized).length;
  const role = group.type.startsWith("FW") ? "防火墙" : group.name.includes("核心") ? "核心交换机" : "接入交换机";
  return (
    <g className="v7-network-cluster" data-network-group={group.id}>
      <rect x={x} y={y} width="300" height="160" rx="12" />
      <text className="v7-network-group-title" x={x + 16} y={y + 25}>{role}</text>
      <text className="v7-network-group-count" textAnchor="end" x={x + 284} y={y + 25}>{identified}/{members.length}台</text>
      {members.map((d, i) => {
        const dx = x + 16 + (i % 20) * 13.4;
        const dy = y + 50 + Math.floor(i / 20) * 16;
        const recognizedNow = inventoryIndex.get(d.id) <= recognized;
        return (
          <g key={d.id} className={"v7-network-device" + (recognizedNow ? " identified" : "")} data-overview-device={d.id}>
            <title>{`${d.name} · ${d.ip} · ${deviceTypeLabel(d)}`}</title>
            <rect x={dx} y={dy} width="9" height="8" rx="1.5" />
          </g>
        );
      })}
      <text className="v7-network-model" x={x + 16} y={y + 145}>{group.type}</text>
    </g>
  );
}

export default function NetworkOverview({ cardRef }) {
  const { scanSeq, notifyScanComplete, scanCtlRef, luiView } = useApp();
  const [busy, setBusy] = useState(false);
  const [recognized, setRecognized] = useState(devices.length);
  const [fraction, setFraction] = useState(1);
  const animRef = useRef(0);
  const genRef = useRef(0);

  const runScan = (onDone) => {
    cancelAnimationFrame(animRef.current);
    const generation = ++genRef.current;
    setBusy(true);
    setRecognized(0);
    setFraction(0);
    let started = null, previous = 0;
    const duration = 3600;
    const tick = (now) => {
      if (generation !== genRef.current) return;
      started ??= now;
      const f = Math.max(previous, Math.min(1, Math.max(0,(now - started) / duration)));
      previous=f;
      setFraction(f);
      setRecognized(Math.floor(f * devices.length));
      if (f < 1) animRef.current = requestAnimationFrame(tick);
      else {
        setBusy(false);
        setRecognized(devices.length);
        onDone?.();
      }
    };
    animRef.current = requestAnimationFrame(tick);
  };

  // 注册扫描控制句柄（context 用于中止）
  useEffect(() => {
    scanCtlRef.current = {
      cancel: () => {
        genRef.current++;
        cancelAnimationFrame(animRef.current);
        setBusy(false);
      },
    };
    return () => { genRef.current++; cancelAnimationFrame(animRef.current); };
  }, [scanCtlRef]);

  // 任务启动 → 自动扫描；完成回调推进流程
  useEffect(() => {
    if (scanSeq === 0) return;
    runScan(notifyScanComplete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanSeq]);

  // 任务完成态 → 静态全量
  useEffect(() => {
    if (luiView === "done") {
      genRef.current++;
      cancelAnimationFrame(animRef.current);
      setBusy(false);
      setRecognized(devices.length);
      setFraction(1);
    }
  }, [luiView]);

  const switchCount = devices.filter((d) => d.deviceType === "交换机").length;
  const fwCount = devices.filter((d) => d.deviceType === "防火墙").length;

  return (
    <section className="card artifact-card process-artifact v7-card-tabbed" id="networkOverviewCard" ref={cardRef}>
      <div className="between">
        <div className="v7-artifact-title">
          <ArtifactIcon type="process" shape="overview" />
          <h2 className="card-title">全网设备概览</h2>
        </div>
        <div className="v7-network-header-actions">
        <button className="btn v7-network-rescan" disabled={busy} onClick={() => runScan()}>
          <Ic icon="rotate-ccw" />{busy ? "识别中" : "重新识别"}
        </button>
        <ArtifactOpen kind="network" title="全网设备概览"/>
        </div>
      </div>
      <div className="v7-network-summary">
        <span>西三旗 DC / <strong>HCS1</strong></span>
        <span>现网设备 <strong>{devices.length}</strong></span>
        <span>交换机 <strong>{switchCount}</strong></span>
        <span>防火墙 <strong>{fwCount}</strong></span>
        <span className="v7-network-source">数字地图 · 拓扑示意</span>
      </div>
      <div className="v7-network-progress">
        <span className={busy ? "" : "good"}>{busy ? "正在识别拓扑设备" : "设备识别完成"}</span>
        <div role="progressbar" aria-label="设备识别进度" aria-valuemin="0" aria-valuemax={devices.length} aria-valuenow={recognized}>
          <i style={{ transform: `scaleX(${fraction})` }} />
        </div>
        <strong><b className="v7-network-total">{recognized}</b><span> / {devices.length}台</span></strong>
      </div>
      <div className="v7-network-map">
        <svg viewBox="0 0 1200 440" role="group" aria-label="HCS1设备识别拓扑示意，按厂商及设备角色聚合">
          <g className="v7-network-links">
            <path d="M340 120H450M750 120H860M340 340H450M750 340H860" />
          </g>
          <text className="v7-network-vendor" x="40" y="24">华为 · 220台</text>
          <text className="v7-network-vendor" x="40" y="244">H3C · 160台</text>
          {networkLayoutGroups.map((g, i) => <Cluster key={g.id} group={g} index={i} recognized={recognized} />)}
        </svg>
        <div className="v7-network-sweep" style={{ transform: `translate3d(${fraction * 100 - 100}%,0,0)`, display: busy ? "block" : "none" }} />
      </div>
      <div className="v7-network-footer">
        <div className="v7-network-legend">
          <span><i className="identified" />已识别</span>
          <span><i />待识别</span>
          <span className="muted">每个节点代表1台设备</span>
        </div>
      </div>
    </section>
  );
}
