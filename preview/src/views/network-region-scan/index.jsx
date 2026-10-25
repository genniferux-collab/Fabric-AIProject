import "./index.css";

// Pixso stages share one fixed 1248 × 885 card viewport; only artwork changes.
export default function NetworkRegionScan({ progress = 0, lockProgress = 0, topologyProgress = 0 }) {
  const offset = -80 + Math.max(0, Math.min(1, progress)) * 638;
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
      <svg className="network-region-scan-art" viewBox="0 30 1248 885" role="img" aria-label={description}>
        {/* The exported floor includes a dark outer matte; retain only its framed area. */}
        <defs><clipPath id="region-floor-clip"><rect x="110" y="160" width="1028" height="664" /></clipPath></defs>
        <g clipPath="url(#region-floor-clip)">
        <g opacity={1 - blend}>
          <image href="./assets/uploads/network-regions.svg" width="1248" height="890" />
          <image href="./assets/uploads/network-regions-scan.svg" y={offset} width="1248" height="890" />
        </g>
        <image href="./assets/uploads/network-regions-locked.png" width="1248" height="915" opacity={blend * (1 - topologyBlend)} />
        <image href="./assets/uploads/network-hcs1-topology.png" width="1248" height="915" opacity={topologyBlend} />
        </g>
      </svg>
      <figcaption className="network-region-scan-caption" role="status">{description}</figcaption>
    </figure>
  );
}
