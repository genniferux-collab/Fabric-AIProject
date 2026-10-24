// 审计汇总口径 + 优先级模型（V4/V7 叠加后的最终态）
import { devices } from "./devices.js";
import { checks, checkById, instancesFor } from "./checks.js";

export const audit = { total: 380, passed: 375, ruleVersion: "V1.2", time: "2026-10-21 14:20" };

export const ruleShort = {
  timeout: "用户接口空闲超时时间超限",
  ssh: "SSH加密算法存在弱加密",
  mgmt: "管理 IP 与规划地址不一致",
  ntp2: "NTP 时钟源地址与规划不一致",
  vlan3: "Trunk 放通范围超出规划 VLAN",
  sec3:"账户密码复杂度检查不通过", ntp3:"NTP 备用时钟源与规划不一致", addr2:"业务接口 IP 与规划不一致", sec5:"管理登录认证方式不符合要求",
};
export const ruleOrder = ["timeout", "ssh", "mgmt", "ntp2", "vlan3", "sec3", "ntp3", "addr2", "sec5"];

export const priorityLevels = ["high", "medium", "low"];
export const priorityLabels = { high: "高", medium: "中", low: "低" };

export const v7RuleRequirements = {
  "ssh": "SSH 加密套件仅允许 aes256_ctr / aes192_ctr；禁用 CBC 与 MD5 系列，HMAC 使用 SHA2。",
  "mgmt": "设备管理 IP 地址必须与该设备的规划地址一致。",
  "timeout": "适用用户接口的空闲超时时间不得超过10分钟（600秒）。",
  "ntp2": "NTP 时钟源地址必须与规划的时钟源地址一致。",
  "vlan3": "Trunk 接口仅允许放通规划范围内的 VLAN。"
};
export const v7RepairDirections = {
  timeout: "将超限位置的空闲超时调整至10分钟以内。",
  ssh: "替换为 CTR + SHA2 套件，在维护窗口执行并保留回退命令。",
  mgmt: "核对变更审批，恢复规划IP或更新规划台账。",
  ntp2: "将主时钟源恢复为规划地址，保留备用源。",
  vlan3:"核验业务依赖后，移除未纳入规划的 VLAN。",
  sec3:"启用账户密码复杂度校验，并核验存量账户策略。",ntp3:"将备用时钟源恢复为规划地址。",addr2:"核对业务接口地址规划与变更记录，再调整配置。",sec5:"将管理登录认证方式恢复为 AAA，并确认认证链路可用。",
};

export const compliance = () => ((audit.passed / audit.total) * 100).toFixed(1);
export const affectedBy = (id) => devices.filter((d) => d.fails.includes(id));
export const failedDevices = () => devices.filter((d) => d.fails.length > 0);
export const priorityOf = (id) => checkById(id)?.priority || "low";
export const priorityIndex = (p) => priorityLevels.indexOf(p);

export function priorityCounts(d) {
  const counts = { high: 0, medium: 0, low: 0 };
  new Set(d.fails).forEach((id) => { counts[priorityOf(id)]++; });
  return counts;
}
export function comparePriorityDevices(a, b) {
  const ac = priorityCounts(a), bc = priorityCounts(b);
  return (bc.high + bc.medium + bc.low) - (ac.high + ac.medium + ac.low) || bc.high - ac.high || bc.medium - ac.medium || bc.low - ac.low || Number(a.id.slice(1)) - Number(b.id.slice(1));
}
export function priorityRankedRules() {
  return ruleOrder
    .map((id) => ({ id, name: ruleShort[id], devices: affectedBy(id), priority: priorityOf(id) }))
    .sort((a, b) => b.devices.length - a.devices.length || priorityIndex(a.priority) - priorityIndex(b.priority) || ruleOrder.indexOf(a.id) - ruleOrder.indexOf(b.id));
}
export const overviewDevices = () => failedDevices().sort(comparePriorityDevices).slice(0, 5);
export function detailRulePosition(d, id) {
  const demoOrder = ["ssh", "timeout", "mgmt", "ntp2"];
  return d.id === "d1" && demoOrder.includes(id) ? demoOrder.indexOf(id) : demoOrder.length + checks.findIndex((r) => r.id === id);
}
export function sortedFailedRules(d) {
  return [...new Set(d.fails)].sort((a, b) => priorityIndex(priorityOf(a)) - priorityIndex(priorityOf(b)) || detailRulePosition(d, a) - detailRulePosition(d, b));
}
export const deviceTypeLabel = (d) => d.deviceType || (d.group?.includes("防火墙") ? "防火墙" : "交换机");
export const deviceVendorLabel = (d) => (d.vendor === "H3C" ? "H3C" : "华为");

// 规则偏差摘要（仅 timeout 有可用共性度量）
export function v7RuleDeviation(id) {
  if (id !== "timeout") return "";
  const rule = checkById(id);
  const violations = affectedBy(id).flatMap((d) => instancesFor(d, rule).filter((i) => i.bad && !i.excluded));
  const durations = violations.map((i) => i.minutes * 60 + (i.seconds || 0)).filter(Number.isFinite);
  if (!durations.length) return "";
  const maximum = Math.max(...durations);
  const minutes = Math.floor(maximum / 60);
  const seconds = maximum % 60;
  return `${violations.length}处配置超限，最大${minutes}分钟${seconds ? seconds + "秒" : ""}。`;
}

export function summaryParts(){const ranked=priorityRankedRules().filter(r=>r.devices.length);return {total:audit.total,failed:failedDevices().length,passed:audit.passed,compliance:compliance(),rules:ranked.length,top:ranked.slice(0,3).map(r=>r.name).join('、')}}
