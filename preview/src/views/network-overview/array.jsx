import { devices } from "../../mock/devices.js";
import { networkLayoutGroups } from "../../mock/graph.js";

// Layout follows Pixso 8:516394; counts come from the shared UC4 inventory.
const columns = [{ x: 141, width: 204.4, columns: 8 }, { x: 377.4, width: 366.4, columns: 17 }, { x: 775.8, width: 330.4, columns: 15 }];
const roles = ["防火墙组", "核心交换机组", "接入交换机组"];
export const arrayGroups = networkLayoutGroups.map((group, index) => ({ ...group, ...columns[index % 3], y: index < 3 ? 219 : 551, role: roles[index % 3], members: devices.filter(d => d.groupId === group.id) }));

export function DeviceGlyph({ x, y, type = 0 }) {
  return <image x={x} y={y} width="16" height="16" href={"./assets/uploads/overview-" + (type === 0 ? "firewall" : type === 1 ? "core" : "access") + ".svg"} />;
}

export function OverviewHeader({ countProgress, phase }) {
  const count = type => countProgress > 0 ? arrayGroups.filter(g => !type || g.members[0]?.deviceType === type).reduce((n,g) => n + Math.floor(g.members.length * countProgress), 0) : "--";
  return <g className="network-array-header">
    <text x="16" y="76">已识别/总设备:</text><text x="120" y="77" className="array-total">{count()}</text><text x="158" y="77" className="array-muted">/{countProgress === 1 ? devices.length : "--"}台</text>
    <DeviceGlyph x={240} y={62} type={1} /><text x="258" y="76">交换机:</text><text x="314" y="77" className="array-total">{count("交换机")}</text>
    <DeviceGlyph x={380} y={62} /><text x="398" y="76">防火墙:</text><text x="454" y="77" className="array-total">{count("防火墙")}</text>
    {!["regions", "focus", "topology"].includes(phase) && <g className="array-legend"><circle cx="1116" cy="72" r="4" fill="#00B886" /><text x="1124" y="76">已识别</text><circle cx="1188" cy="72" r="4" fill="#777777" /><text x="1196" y="76">未识别</text></g>}
  </g>;
}

export default function NetworkArray({ morph, countProgress }) {
  return <g className="network-array" aria-label="按厂商和设备类型聚类统计">
    <defs><filter id="array-panel-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="16" stdDeviation="10" floodColor="#000" floodOpacity=".35" /></filter></defs>
    <g opacity={morph}>
      <rect x="110" y="131" width="1028" height="662" className="array-enclosure" /><path d="M110 465H1138" className="array-enclosure" />
      {[0, 1].map(row => <g key={row}><path d={`M110 ${131 + row * 334}h110l-9 23q-3 9-14 9h-87z`} fill="#ffffff08" /><text x="120" y={152 + row * 334} className="array-vendor">{row ? "H3C" : "华为"}: {countProgress > 0 ? Math.floor(arrayGroups.slice(row * 3, row * 3 + 3).reduce((n, g) => n + g.count, 0) * countProgress) : "--"}台</text></g>)}
    </g>
    {arrayGroups.map((group, index) => {
      const knownCount = Math.floor(group.members.length * countProgress);
      return <g key={group.id} data-network-group={group.id}>
        <g opacity={morph}><DeviceGlyph x={group.x + 2} y={group.y - 31} type={index % 3} /><text x={group.x + 22} y={group.y - 16} className="array-group-title">{group.role} {countProgress > 0 ? knownCount : "--"}/{countProgress === 1 ? group.count : "--"}台</text>
          <rect x={group.x} y={group.y} width={group.width} height="209.6" rx="16" className="array-panel" />
          <text x={group.x + 32} y={group.y + 189} className="array-model">{group.type}</text>
        </g>
        {group.members.map((device, i) => {
          // Each block is a paired row; the last pair shortens symmetrically.
          const block = Math.floor(i / (group.columns * 2));
          const blockSize = Math.min(group.columns * 2, group.members.length - block * group.columns * 2);
          const pairColumns = Math.ceil(blockSize / 2), inBlock = i - block * group.columns * 2;
          const row = Math.floor(inBlock / pairColumns), col = inBlock % pairColumns;
          const targetX = group.x + 32 + col * 18, targetY = group.y + 28 + block * 54 + row * 18;
          // Keep blocks within their own group lane instead of crossing neighboring panels.
          const fromX = targetX + (col - (pairColumns - 1) / 2) * 2;
          const fromY = targetY - 28 - row * 6;
          const settle = Math.max(0, Math.min(1, (morph - index * .012) / (1 - index * .012)));
          return <g key={device.id} className={"v7-network-device" + (i < knownCount ? " identified" : "")} data-overview-device={device.id} transform={`translate(${fromX + (targetX - fromX) * settle} ${fromY + (targetY - fromY) * settle})`}><title>{`${device.name} · ${device.ip} · ${device.model}`}</title><rect width="14.4" height="14.4" rx="2" /></g>;
        })}
      </g>;
    })}
  </g>;
}
