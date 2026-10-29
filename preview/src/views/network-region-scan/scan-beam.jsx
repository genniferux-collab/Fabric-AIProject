import {BorderBeam} from "border-beam";
import {matchingBeamPaletteCss} from "../mapping-card/beam-palette.js";
import "./scan-beam.css";

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


// Both UC2 and UC4 use this exact palette, inward feathering and 2.6s rotation.
export default function TopologyScanBeam({isDark=true,opacity=1,paused=false,className="",style}){
  if(opacity<=0)return null;
  return <div className={"topology-scan-beam "+className+(paused?" is-paused":"")} data-scan-effect="topology-inner-glow" style={{...style,opacity:Math.max(0,Math.min(1,opacity))}} aria-hidden="true">
        <BorderBeam size="md" colorVariant="colorful" hueRange={0} strength={1} brightness={1.7} saturation={0.45} glowSize={2} duration={2.6} theme={isDark?"dark":"light"} borderRadius={0} active css={'[data-beam="{id}"][data-active]{animation:beam-spin-{id} 2.6s linear infinite,beam-fade-in-{id} .2s ease forwards;}'+matchingBeamPaletteCss(isDark).replace(/ellipse (\d+)px (\d+)px/g,(_,w,h)=>`ellipse ${Number(w)*1.5}px ${Number(h)*1.5}px`)+regionScanGlowCss} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}><span className="topology-scan-surface"/></BorderBeam>
  </div>;
}
