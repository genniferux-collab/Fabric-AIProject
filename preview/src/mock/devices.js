// 设备清单 — 5 台演示设备 + 375 台生成的全量设备（V7 口径）
// 语义键：id/name/ip/planned/model/group/fails/groupId/vendor/deviceType

const combinations = [
  ["timeout", "ssh", "mgmt", "ntp2"],
  ["timeout", "ssh", "vlan3"],
  ["timeout", "ssh"],
  ["timeout", "ntp2"],
  ["mgmt"],
];

const baseDevices = [
  { id: "d1", name: "SW-HCS1-01", ip: "10.10.1.11", planned: "10.10.1.21", model: "CE12800", group: "华为核心交换机组" },
  { id: "d2", name: "SW-HCS1-02", ip: "10.10.1.22", planned: "10.10.1.22", model: "CE12800", group: "华为核心交换机组" },
  { id: "d3", name: "SW-HCS1-03", ip: "10.10.1.23", planned: "10.10.1.23", model: "CE12800", group: "华为核心交换机组" },
  { id: "d4", name: "SW-HCS1-04", ip: "10.10.1.24", planned: "10.10.1.24", model: "CE12800", group: "华为核心交换机组" },
  { id: "d5", name: "SW-HCS1-05", ip: "10.10.1.15", planned: "10.10.1.25", model: "CE12800", group: "华为核心交换机组" },
];

const generated = [];
for (let n = 6; n <= 380; n++) {
  const offset = n - 6;
  const ip = `10.10.${2 + Math.floor(offset / 250)}.${(offset % 250) + 1}`;
  generated.push({ id: "d" + n, name: "SW-HCS1-" + String(n).padStart(2, "0"), ip, planned: ip, model: "CE12800", group: "华为核心交换机组" });
}

export const devices = [...baseDevices, ...generated];
devices.forEach((d, i) => { d.fails = i < 5 ? combinations[i] : []; });

// 设备组归属（V5 口径：按原始 6 组顺序切片分配）
export const sourceGroups = [
  { id: "g1", vendor: "Huawei", name: "华为核心交换机组", type: "Switch · CE12800", count: 100, files: 30 },
  { id: "g2", vendor: "Huawei", name: "华为接入交换机组", type: "Switch · CE6800", count: 80, files: 26 },
  { id: "g3", vendor: "Huawei", name: "华为防火墙组", type: "FW · USG6600", count: 40, files: 14 },
  { id: "g4", vendor: "H3C", name: "H3C 核心交换机组", type: "Switch · S12500", count: 60, files: 20 },
  { id: "g5", vendor: "H3C", name: "H3C 接入交换机组", type: "Switch · S6800", count: 60, files: 18 },
  { id: "g6", vendor: "H3C", name: "H3C 防火墙组", type: "FW · SecPath", count: 40, files: 12 },
];

let assignedOffset = 0;
for (const group of sourceGroups) {
  const model = group.type.split(" · ")[1];
  devices.slice(assignedOffset, assignedOffset + group.count).forEach((d) =>
    Object.assign(d, {
      groupId: group.id,
      group: group.name,
      vendor: group.vendor,
      model,
      deviceType: group.type.startsWith("FW") ? "防火墙" : "交换机",
    })
  );
  assignedOffset += group.count;
}

export const deviceById = (id) => devices.find((d) => d.id === id);
export const failFor = (d, r) => d.fails.includes(r.id);
