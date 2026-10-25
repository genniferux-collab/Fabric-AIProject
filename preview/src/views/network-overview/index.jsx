import NetworkArray, { OverviewHeader } from "./array.jsx";
import ArtifactOpen from "../../components/artifact-open/index.jsx";
import { ArtifactIcon } from "../../components/status-marks/index.jsx";
import "./array.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import NetworkRegionScan from "../network-region-scan/index.jsx";

const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (n) => n * n * (3 - 2 * n);
const REGION_DURATION = 4600, FOCUS_DURATION = 3400, TOPOLOGY_DURATION = 8200;
const SCAN_DURATION = REGION_DURATION + FOCUS_DURATION + TOPOLOGY_DURATION;
export default function NetworkOverview({ cardRef }) {
  const { scanSeq, notifyScanComplete, scanCtlRef, luiView } = useApp();
  const [busy, setBusy] = useState(false), [fraction, setFraction] = useState(0);
  const animRef = useRef(0), genRef = useRef(0);
  const elapsed = fraction * SCAN_DURATION;
  const topologyFraction = clamp((elapsed - REGION_DURATION - FOCUS_DURATION) / TOPOLOGY_DURATION);
  const morph = ease(clamp((topologyFraction - .29) / .27)), countProgress = clamp((topologyFraction - .58) / .36);
  const phase = elapsed < REGION_DURATION ? "regions" : elapsed < REGION_DURATION + FOCUS_DURATION ? "focus" : fraction === 1 ? "complete" : topologyFraction < .29 ? "topology" : topologyFraction < .58 ? "clustering" : "counting";
  const status = { topology: "正在扫描物理拓扑", clustering: "网络架构已明确 · 正在聚类设备", counting: "正在识别设备类型与数量", complete: "设备识别完成" }[phase];

  const runScan = (onDone) => {
    cancelAnimationFrame(animRef.current);
    const generation = ++genRef.current;
    setBusy(true); setFraction(0);
    let started = null, lastPaint = -Infinity;
    const tick = (now) => {
      if (generation !== genRef.current) return;
      started ??= now;
      const f = clamp((now - started) / SCAN_DURATION);
      if (now - lastPaint >= 32 || f === 1) { setFraction(f); lastPaint = now; }
      if (f < 1) animRef.current = requestAnimationFrame(tick);
      else { setBusy(false); onDone?.(); }
    };
    animRef.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    const controller = { cancel: () => { genRef.current++; cancelAnimationFrame(animRef.current); setBusy(false); } };
    scanCtlRef.current = controller;
    return () => { genRef.current++; cancelAnimationFrame(animRef.current); if (scanCtlRef.current === controller) scanCtlRef.current = null; };
  }, [scanCtlRef]);
  useLayoutEffect(() => {
    if (scanSeq > 0) runScan(notifyScanComplete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanSeq]);
  useEffect(() => {
    if (luiView === "done") { genRef.current++; cancelAnimationFrame(animRef.current); setBusy(false); setFraction(1); }
  }, [luiView]);

  const nativeOpacity = ease(clamp((topologyFraction - .29) / .09));
  const artworkVisible = phase !== "complete" && nativeOpacity < 1;
  const nativeVisible = ["clustering", "counting", "complete"].includes(phase);

  return (
    <section className="card artifact-card process-artifact v7-card-tabbed network-overview-stable-card" id="networkOverviewCard" ref={cardRef} data-scan-phase={phase} aria-busy={busy}>
      {artworkVisible && <div className="v7-network-art-layer" style={{ opacity: 1 - nativeOpacity }}>
        <NetworkRegionScan progress={elapsed / REGION_DURATION} lockProgress={ease(clamp((elapsed - REGION_DURATION) / 700))} topologyProgress={ease(clamp((elapsed - REGION_DURATION - FOCUS_DURATION) / 650))} />
      </div>}
      <svg className="network-array-art" viewBox="0 0 1248 885" role="group" aria-label="HCS1全量设备概览">
        <OverviewHeader countProgress={countProgress} phase={phase} />
        {nativeVisible && <g opacity={nativeOpacity}><NetworkArray morph={morph} countProgress={countProgress} /></g>}
      </svg>
      <div className="v7-artifact-title network-overview-heading"><ArtifactIcon type="process" shape="overview" /><h2 className="card-title">HCS1全量设备概览</h2></div>
      <ArtifactOpen kind="network" title="全网设备概览" />
      <button type="button" className="network-array-rescan" disabled={busy} onClick={() => runScan()}>{busy ? "识别中" : "重新识别"}</button>
      <span className="network-region-scan-caption" role="status">{status}</span>
    </section>
  );
}
