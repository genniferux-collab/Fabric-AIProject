import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import { uc2Names, uc2RestorationDuration } from "../../mock/uc2.js";
import { Icon } from "../../../assets/shared/icon.jsx";

export function Uc2Title({ stage, title, sub, tag }) {
  return <div className="uc2-head"><div><div className="uc2-screen-label">西三旗 DC · {uc2Names[stage]}</div><h2>{title}</h2><p>{sub}</p></div><span className="uc2-tag">{tag}</span></div>;
}

const assets = "./assets/uploads/pixso-uc2-restoration/";
const vectors = "./assets/uploads/pixso-uc2-v2/";
const areas = [
  { id:"internet", name:"互联网接入区", x:73, y:180, width:379, height:249 },
  { id:"external", name:"外联区", x:655, y:180, width:287, height:394 },
  { id:"headquarters", name:"外联区2", x:942, y:180, width:213, height:394 },
  { id:"business", name:"业务区", x:73, y:408, width:582, height:466 },
];
const devices = [
  {id:"border1",name:"Leaf 1",role:"边界 Leaf 交换机",x:345,y:501},
  {id:"border2",name:"Leaf 2",role:"边界 Leaf 交换机",x:416,y:501},
  {id:"spine1",name:"Spine 1",role:"Spine 交换机",x:122,y:298},
  {id:"spine2",name:"Spine 2",role:"Spine 交换机",x:180,y:298},
  {id:"leaf1",name:"Leaf 1-2（左）",role:"Leaf 交换机",x:345,y:693},
  {id:"leaf2",name:"Leaf 1-2（右）",role:"Leaf 交换机",x:416,y:693},
  {id:"firewall1",name:"Firewall 1",role:"防火墙",x:1020,y:259},
];

// Same continuous clock and smoothstep easing as UC4; only this card repaints.
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => value * value * (3 - 2 * value);
function useRestorationProgress(uc2) {
  const [fraction, setFraction] = useState(0);
  const animation = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(animation.current);
    const tick = () => {
      const elapsed = (uc2.restorationElapsed || 0) + (uc2.running && uc2.restorationStartedAt ? Date.now() - uc2.restorationStartedAt : 0);
      const progress = uc2.stage > 1 || uc2.restoration === 2 ? 1 : clamp(elapsed / uc2RestorationDuration);
      setFraction(progress);
      if (uc2.stage === 1 && uc2.running && progress < 1) animation.current = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(animation.current);
  }, [uc2.stage, uc2.running, uc2.restoration, uc2.restorationElapsed, uc2.restorationStartedAt]);
  return uc2.stage > 1 || uc2.restoration === 2 ? 1 : fraction;
}

export default function Uc2Topology() {
  const { uc2, uc2SelectNode, setFull, full } = useApp();
  const [focused, setFocused] = useState(null);
  const progress = useRestorationProgress(uc2);
  const [artReady, setArtReady] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all(["topology-scan.svg", "topology-area.svg", "topology-final@2x.png"].map(name => {
      const image = new Image(); image.src = vectors + name; return image.decode();
    })).then(() => { if (active) setArtReady(true); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const elapsed = progress * uc2RestorationDuration;
  const areaBlend = focused ? 1 : artReady ? ease(clamp((elapsed - 2800) / 800)) : 0;
  const topologyBlend = focused ? 1 : artReady ? ease(clamp((elapsed - 4700) / 900)) : 0;
  const countProgress = focused ? 1 : ease(clamp((elapsed - 4800) / 1200));
  const phase = progress === 1 ? 2 : 0;
  const motionPhase = progress === 1 ? "complete" : elapsed < 2800 ? "scanning" : elapsed < 4700 ? "locating" : "revealing";
  const count = value => countProgress > 0 ? Math.floor(value * countProgress) : "--";
  const selected = devices.find(d => d.id === uc2.node);
  const detail = topologyBlend >= .98;
  const activate = (area) => { setFocused(area); uc2SelectNode(null); };
  return <article className="uc2-restoration-card uc2-pixso-v2" aria-label="西三旗 DC 网络拓扑图" data-restoration-phase={phase} data-motion-phase={motionPhase} aria-busy={phase !== 2}>
    <header className="uc2-restoration-header"><h3><img src={assets+"topology-icon.svg"} alt="" />网络拓扑图</h3><button type="button" aria-label={full ? "还原拓扑画布" : "放大拓扑画布"} onClick={() => setFull(!full)}><img src={assets+"expand-icon.svg"} alt="" /></button></header>
    <div className="uc2-restoration-overview">
      <div className="uc2-restoration-copy"><h4>还原数据中心网络拓扑</h4><p>{phase === 2 ? "32个区域已定位，1980台交换机满足条件，下图为角色区域聚合视图" : "正在扫描全网区域，识别设备角色并逐步展开网络拓扑"}</p></div>
      <dl className="uc2-restoration-metrics">
        <div><dt><img src={assets+"region-icon.svg"} alt="" />区域范围</dt><dd>{count(32)}</dd></div>
        <div><dt><img src={assets+"device-icon.svg"} alt="" />满足条件设备</dt><dd>{count(1980)}<small>台</small></dd></div>
        <div><dt><img src={assets+"role-icon.svg"} alt="" />核心/Leaf</dt><dd>{count(80)}<small>/{count(1900)}台</small></dd></div>
        <div><dt><img src={assets+"sample-icon.svg"} alt="" />本轮样本分析</dt><dd>{count(100)}<small>台</small></dd></div>
      </dl>
    </div>
    <div className={"uc2-restoration-scene" + (!uc2.running ? " is-paused" : "")}>
      <svg viewBox="0 160 1232 749" className="uc2-native-topology" role="img" aria-label={detail ? "已定位核心交换机的详细网络拓扑" : "蓝色光效自上而下扫描全网区域，连续展开设备拓扑"}>
        <g className="uc2-overview-layer" opacity={1 - areaBlend}>
          <image href={vectors + "topology-scan.svg"} x="0" y="160" width="1232" height="749" />
          <g className="uc2-restoration-scan" transform={"translate(0 " + (clamp(elapsed / 2800) * 648) + ")"}>
            <defs><linearGradient id="uc2RestorationScanGradient" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#5ca2e9" stopOpacity="0"/><stop offset="1" stopColor="#5ca2e9" stopOpacity=".28"/></linearGradient></defs>
            <rect x="74" y="182" width="1080" height="42" fill="url(#uc2RestorationScanGradient)"/>
            <rect x="74" y="224" width="1080" height="2" fill="#64b2ff"/>
          </g>
        </g>
        <image className="uc2-topology-area" href={vectors + "topology-area.svg"} x="0" y="160" width="1232" height="749" opacity={areaBlend * (1 - topologyBlend)} />
        <image className="uc2-topology-detail" href={vectors + "topology-final@2x.png"} x="0" y="160" width="1232" height="749" opacity={topologyBlend} />
        {!detail && <>
          {areas.map(area=><g key={area.id} role="button" tabIndex={0} aria-label={"查看"+area.name+"详细拓扑"} className="uc2-topology-hit" onClick={()=>activate(area.name)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();activate(area.name);}}}><rect x={area.x} y={area.y} width={area.width} height={area.height} rx="4" fill="transparent" /><title>{area.name} · 查看详细拓扑</title></g>)}
        </>}
        {detail && devices.map(device=><g key={device.id} role="button" tabIndex={0} aria-label={"查看设备 "+device.name} className={"uc2-topology-hit"+(uc2.node===device.id?" is-selected":"")} onClick={()=>uc2SelectNode(device.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();uc2SelectNode(device.id);}}}><rect x={device.x-12} y={device.y-12} width="52" height="60" rx="4" fill="transparent"/><title>{device.name}</title></g>)}
      </svg>
      {focused && <button className="uc2-topology-back" type="button" onClick={()=>{setFocused(null);uc2SelectNode(null);}}><Icon className="ic" name="arrow-left" size={12} />返回区域视图</button>}
      {selected && <aside className="uc2-device-popover" aria-label="设备信息"><button type="button" aria-label="关闭设备信息" onClick={()=>uc2SelectNode(null)}><Icon className="ic" name="x" size={14}/></button><strong>{selected.name}</strong><span>{selected.role} · 西三旗 DC</span><p>配置快照可用，已纳入本轮分析范围。</p></aside>}
    </div>
  </article>;
}
