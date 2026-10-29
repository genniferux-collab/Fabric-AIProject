import {BorderBeam} from "border-beam";
import {useApp} from "../../context.jsx";
import {matchingBeamPaletteCss} from "../mapping-card/beam-palette.js";
import "./index.css";

// A broad feathered band gives the rotating beam a visible inward scanning footprint.
const regionScanGlowCss = `
[data-beam="{id}"][data-active]::before,
[data-beam="{id}"][data-fading]::before{
  padding:0;
  background:conic-gradient(from var(--beam-angle-{id}),
    transparent 0deg,transparent 145deg,
    rgba(65,85,255,.08) 175deg,rgba(65,85,255,.6) 210deg,
    rgba(145,85,245,.65) 250deg,rgba(238,65,105,.5) 280deg,rgba(255,125,65,.18) 305deg,
    rgba(180,40,240,.12) 320deg,transparent 350deg);
  -webkit-mask-image:linear-gradient(to bottom,#fff 0,rgba(255,255,255,.5) 25px,transparent 95px),linear-gradient(to top,#fff 0,rgba(255,255,255,.5) 25px,transparent 95px),linear-gradient(to right,#fff 0,rgba(255,255,255,.5) 25px,transparent 95px),linear-gradient(to left,#fff 0,rgba(255,255,255,.5) 25px,transparent 95px);
  -webkit-mask-composite:source-over;
  mask-image:linear-gradient(to bottom,#fff 0,rgba(255,255,255,.5) 25px,transparent 95px),linear-gradient(to top,#fff 0,rgba(255,255,255,.5) 25px,transparent 95px),linear-gradient(to right,#fff 0,rgba(255,255,255,.5) 25px,transparent 95px),linear-gradient(to left,#fff 0,rgba(255,255,255,.5) 25px,transparent 95px);
  mask-composite:add;
  animation:none;
  filter:blur(18px) saturate(.45);
  opacity:calc(var(--beam-opacity-{id}) * .95);
  mix-blend-mode:screen;
}`;

// Region and topology exports retain their own coordinates inside one stable card.
export default function NetworkRegionScan({ progress = 0, lockProgress = 0, topologyProgress = 0 }) {
  const {isDark}=useApp();
  const blend = Math.max(0, Math.min(1, lockProgress));
  const topologyBlend = Math.max(0, Math.min(1, topologyProgress));
  const locked = blend > 0;
  const topology = topologyBlend > 0;
  const description = topology
    ? "已展开HCS1区网络架构，包含DB-1、DB-2的Spine组，以及Leaf、防火墙和接入设备的连接关系。正在识别架构，设备数量仍为--。"
    : locked
    ? "已锁定核心区和HCS1区，其他区域压暗，蓝白发光边框聚焦目标范围。设备数量仍为--。"
    : "正在识别全网区域。已识别与总设备数量：-- / -- 台；交换机：--；防火墙：--。";
  return (
    <figure className="network-region-scan" aria-label={topology ? "HCS1区网络架构" : locked ? "锁定核心区和HCS1区" : "全网区域识别"} data-region-stage={topology ? "topology" : locked ? "locked" : "scanning"} data-lock-progress={blend.toFixed(3)} data-topology-progress={topologyBlend.toFixed(3)}>
      <svg className="network-region-scan-art" viewBox="0 0 1232 909" preserveAspectRatio="none" role="img" aria-label={description}>
        {/* The exported floor includes a dark outer matte; retain only its framed area. */}
        <defs><clipPath id="region-floor-clip"><rect x="73" y="154" width="1083" height="698" /></clipPath></defs>
        <g clipPath="url(#region-floor-clip)">
        <g opacity={1 - blend}>
          <image href="./assets/uploads/network-regions-v2.svg" width="1232" height="909" />

        </g>
        <image href="./assets/uploads/network-regions-locked-v2.svg" width="1232" height="909" opacity={blend * (1 - topologyBlend)} />
        </g>
        {/* The topology frame uses its own 1248 × 860 coordinates. Keep its header native. */}
        <svg x="0" y="0" width="1232" height="909" viewBox="0 0 1248 860" preserveAspectRatio="none" opacity={topologyBlend}>
          <defs><clipPath id="hcs1-topology-body-clip"><rect x="0" y="115" width="1248" height="745" /></clipPath></defs>
          <image href="./assets/uploads/network-hcs1-topology-v2.svg" width="1248" height="860" clipPath="url(#hcs1-topology-body-clip)" />
        </svg>
      </svg>
      {blend<1&&<div className="network-region-inner-beam" style={{opacity:1-blend}} aria-hidden="true">
        <BorderBeam size="md" colorVariant="colorful" hueRange={0} strength={1} brightness={1.7} saturation={0.45} glowSize={2} duration={2.6} theme={isDark?"dark":"light"} borderRadius={0} active css={'[data-beam="{id}"][data-active]{animation:beam-spin-{id} 2.6s linear infinite,beam-fade-in-{id} .2s ease forwards;}'+matchingBeamPaletteCss(isDark).replace(/ellipse (\d+)px (\d+)px/g,(_,w,h)=>`ellipse ${Number(w)*1.5}px ${Number(h)*1.5}px`)+regionScanGlowCss} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}><span className="network-region-beam-surface"/></BorderBeam>
      </div>}
      <figcaption className="network-region-scan-caption" role="status">{description}</figcaption>
    </figure>
  );
}
