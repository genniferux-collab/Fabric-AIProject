import {useId} from "react";
import "./index.css";

// Region and topology exports retain their own coordinates inside one stable card.
export default function NetworkRegionScan({ progress = 0, lockProgress = 0, topologyProgress = 0 }) {
  const pulseId = 'region-pulse-' + useId().replace(/:/g, '');
  const scanProgress = Math.max(0, Math.min(1, progress));
  const offset = -80 + scanProgress * 638;
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
        <defs>
          <linearGradient id={pulseId+'-palette'} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#288cff"/><stop offset=".3" stopColor="#9169f5"/>
            <stop offset=".6" stopColor="#b428f0"/><stop offset=".86" stopColor="#ee4b73"/><stop offset="1" stopColor="#f4a05b"/>
          </linearGradient>
          <linearGradient id={pulseId+'-fade'} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="white" stopOpacity="0"/><stop offset=".45" stopColor="white" stopOpacity=".18"/>
            <stop offset=".9" stopColor="white" stopOpacity=".7"/><stop offset="1" stopColor="white" stopOpacity="1"/>
          </linearGradient>
          <pattern id={pulseId+'-grid'} patternUnits="userSpaceOnUse" width="10" height="10">
            <rect x="4" y="4" width="2" height="2" rx=".3" fill="white"/>
          </pattern>
          <mask id={pulseId+'-tail'} maskUnits="userSpaceOnUse" x="73" y="0" width="1083" height="82">
            <rect x="73" y="0" width="1083" height="82" fill={'url(#'+pulseId+'-fade)'}/>
          </mask>
          <mask id={pulseId+'-dots'} maskUnits="userSpaceOnUse" x="73" y="0" width="1083" height="82">
            <rect x="73" y="0" width="1083" height="82" fill={'url(#'+pulseId+'-grid)'}/>
          </mask>
          <clipPath id="region-floor-clip"><rect x="73" y="154" width="1083" height="698" /></clipPath>
        </defs>
        <g clipPath="url(#region-floor-clip)">
        <g opacity={1 - blend}>
          <image href="./assets/uploads/network-regions-v2.svg" width="1232" height="909" />
          {/* Original straight top-to-bottom sweep, with an ordered 10px dot-grid tail. */}
          <g className="network-region-intelligence-pulses network-region-smart-sweep" aria-hidden="true" transform={'translate(0 '+(154+offset)+')'}>
            <g mask={'url(#'+pulseId+'-tail)'}>
              <rect x="73" y="0" width="1083" height="82" fill={'url(#'+pulseId+'-palette)'} opacity=".18"/>
              <g mask={'url(#'+pulseId+'-dots)'}>
                <rect x="73" y="0" width="1083" height="80" fill={'url(#'+pulseId+'-palette)'} opacity=".62"/>
              </g>
            </g>
            <rect x="73" y="80.8" width="1083" height="1.2" fill={'url(#'+pulseId+'-palette)'} opacity=".42"/>
          </g>
        </g>
        <image href="./assets/uploads/network-regions-locked-v2.svg" width="1232" height="909" opacity={blend * (1 - topologyBlend)} />
        </g>
        {/* The topology frame uses its own 1248 × 860 coordinates. Keep its header native. */}
        <svg x="0" y="0" width="1232" height="909" viewBox="0 0 1248 860" preserveAspectRatio="none" opacity={topologyBlend}>
          <defs><clipPath id="hcs1-topology-body-clip"><rect x="0" y="115" width="1248" height="745" /></clipPath></defs>
          <image href="./assets/uploads/network-hcs1-topology-v2.svg" width="1248" height="860" clipPath="url(#hcs1-topology-body-clip)" />
        </svg>
      </svg>
      <figcaption className="network-region-scan-caption" role="status">{description}</figcaption>
    </figure>
  );
}
