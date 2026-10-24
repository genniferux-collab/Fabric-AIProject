// 检查规则（V1 基础 + V4 增补 + V7 优先级/SSH 覆盖后的最终口径）
// 及规则实例/配置快照推导逻辑（instancesFor / snapshotFor / 原始值标记）

export const checks = [
  { id: "mgmt", name: "管理IP地址必须与规划地址一致", expected: "管理IP地址 = 规划地址", view: "interface MEth0/0/0", line: 44, cmd: "ip address", value: "10.10.1.11 255.255.255.0", target: "10.10.1.21 255.255.255.0" },
  { id: "addr2", name: "业务接口IP地址与规划一致", expected: "业务接口地址 = 规划地址", view: "interface Vlanif100", line: 63, cmd: "ip address", value: "172.16.100.1 255.255.255.0" },
  { id: "addr3", name: "接口子网掩码符合规划", expected: "业务网段前缀长度 = 24", view: "interface Vlanif100", line: 63, cmd: "ip address", value: "172.16.100.1 255.255.255.0" },
  { id: "addr4", name: "业务网关地址符合规划", expected: "业务网关地址 = 172.16.100.1", view: "interface Vlanif100", line: 63, cmd: "ip address", value: "172.16.100.1 255.255.255.0" },
  { id: "ntp1", name: "NTP 服务处于启用状态", expected: "已配置NTP时间同步服务", view: "系统视图", line: 30, cmd: "ntp-service unicast-server", value: "10.10.0.10" },
  { id: "ntp2", name: "NTP 时钟源地址符合规划", expected: "NTP服务器地址 = 10.10.0.10", view: "系统视图", line: 30, cmd: "ntp-service unicast-server", value: "10.10.0.10", target: "10.10.0.10" },
  { id: "ntp3", name: "NTP 备用时钟源符合规划", expected: "备用NTP服务器地址 = 10.10.0.11", view: "系统视图", line: 31, cmd: "ntp-service unicast-server", value: "10.10.0.11" },
  { id: "sec1", name: "本地用户权限符合分级策略", expected: "运维用户权限等级 = 3", view: "aaa", line: 86, cmd: "local-user netops privilege level", value: "3" },
  { id: "ssh", name: "SSH加密算法存在弱加密", expected: "SSH 加密套件仅允许 aes256_ctr / aes192_ctr；禁用 CBC 与 MD5 系列，HMAC 使用 SHA2。", view: "系统视图", line: 3, cmd: "ssh server cipher", value: "aes128_cbc 3des_cbc", target: "aes256_ctr aes192_ctr" },
  { id: "sec3", name: "账户密码复杂度检查", expected: "启用密码复杂度检查", view: "aaa / local-aaa-user password policy administrator", line: 90, cmd: "password complexity", value: "three-of-kinds" },
  { id: "timeout", name: "用户接口空闲超时时间不能超过10分钟", expected: "空闲超时时间 ≤ 10分钟（600秒）", view: "user-interface", line: 122, cmd: "idle-timeout", value: "15 0", target: "10 0" },
  { id: "sec5", name: "管理登录已配置AAA认证", expected: "authentication-mode = aaa", view: "user-interface vty 0 4", line: 121, cmd: "authentication-mode", value: "aaa" },
  { id: "vlan1", name: "业务VLAN已按规划创建", expected: "包含业务VLAN 100、200", view: "系统视图", line: 40, cmd: "vlan batch", value: "100 200" },
  { id: "vlan2", name: "业务接口模式符合规划", expected: "上联接口模式 = trunk", view: "interface 100GE1/0/1", line: 72, cmd: "port link-type", value: "trunk" },
  { id: "vlan3", name: "Trunk 仅放通规划VLAN", expected: "允许VLAN集合 = {100, 200}", view: "interface 100GE1/0/1", line: 73, cmd: "port trunk allow-pass vlan", value: "100 200", target: "100 200" },
  { id: "vlan4", name: "二层环路保护已启用", expected: "STP模式 = mstp", view: "系统视图", line: 36, cmd: "stp mode", value: "mstp" },
  { id: "route1", name: "默认路由下一跳符合规划", expected: "默认路由下一跳 = 10.10.1.1", view: "系统视图", line: 98, cmd: "ip route-static", value: "0.0.0.0 0.0.0.0 10.10.1.1" },
  { id: "route2", name: "BGP 对端地址符合规划", expected: "BGP对端地址 = 172.16.0.1", view: "bgp 65001", line: 102, cmd: "peer", value: "172.16.0.1 as-number 65000" },
  { id: "route3", name: "冗余组优先级符合规划", expected: "VRRP主设备优先级 = 120", view: "interface Vlanif100", line: 65, cmd: "vrrp vrid 1 priority", value: "120" },
  { id: "route4", name: "规划的出口路由策略已配置", expected: "存在EXPORT-DC路由策略", view: "route-policy EXPORT-DC permit node 10", line: 105, cmd: "apply local-preference", value: "100" },
  { id: "sshEnable", name: "SSH 远程管理服务已启用", expected: "已启用SSH远程管理服务", view: "系统视图", line: 5, cmd: "stelnet server", value: "enable" },
  { id: "loginType", name: "运维账户仅允许SSH登录", expected: "本地运维用户service-type = ssh", view: "aaa", line: 85, cmd: "local-user netops service-type", value: "ssh" },
  { id: "authConsole", name: "控制台登录已配置AAA认证", expected: "authentication-mode = aaa", view: "user-interface console 0", line: 131, cmd: "authentication-mode", value: "aaa" },
  { id: "routerId", name: "BGP Router ID 与规划一致", expected: "Router ID = 设备规划地址", view: "bgp 65001", line: 101, cmd: "router-id", value: "10.10.1.21" },
];

const rulePriorities = { mgmt: "high", addr2: "high", addr3: "medium", addr4: "high", ntp1: "low", ntp2: "medium", ntp3: "low", sec1: "high", ssh: "high", sec3: "high", timeout: "high", sec5: "high", vlan1: "medium", vlan2: "medium", vlan3: "medium", vlan4: "high", route1: "high", route2: "high", route3: "medium", route4: "medium", sshEnable: "high", loginType: "medium", authConsole: "medium", routerId: "medium" };
checks.forEach((r) => { r.priority = rulePriorities[r.id] || "low"; });

const extraValues={sec3:{bad:'disable',good:'three-of-kinds'},ntp3:{bad:'10.10.0.99',good:'10.10.0.11'},addr2:{bad:'172.16.101.1 255.255.255.0',good:'172.16.100.1 255.255.255.0'},sec5:{bad:'password',good:'aaa'}};
for(const [id,value] of Object.entries(extraValues))checks.find(r=>r.id===id).target=value.good;
export const applicableChecks=d=>checks.filter(r=>!d.checkIds||d.checkIds.includes(r.id));
export const deviceRuleTotal=d=>applicableChecks(d).length;

export const checkById = (id) => checks.find((r) => r.id === id);

export const SSH_TARGET_HMAC = "sha2_256 sha2_512";

export function timeoutInstances() {
  return [
    { id: "vty", name: "VTY 0–4", path: "user-interface vty 0 4", cmd: "idle-timeout", raw: "15 0", minutes: 15, seconds: 0, line: 122, bad: true, actual: "15分钟", delta: "超出5分钟" },
    { id: "console", name: "Console 0", path: "user-interface console 0", cmd: "idle-timeout", raw: "10 30", minutes: 10, seconds: 30, line: 132, bad: true, actual: "10分30秒", delta: "超出30秒" },
    { id: "aux", name: "AUX 0", path: "user-interface aux 0", cmd: "idle-timeout", raw: "5 0", minutes: 5, seconds: 0, line: 142, bad: false, actual: "5分钟", delta: "通过检查" },
    { id: "restconf", name: "RESTCONF", path: "restconf", cmd: "idle-timeout", raw: "30", minutes: 30, seconds: 0, line: 152, bad: false, excluded: true, actual: "—", delta: "不属于检查范围" },
  ];
}

// 最终实例模型（V1 → V4 → V7-SSH 叠加后的口径）
export function instancesFor(d, r) {
  if (r.id === "ssh") {
    const failed = d.fails.includes("ssh");
    const cipher = failed ? (d.id === "d1" ? "aes128_cbc 3des_cbc" : "aes128_cbc") : r.target;
    const hmac = failed && d.id === "d1" ? "md5 sha1" : SSH_TARGET_HMAC;
    return [
      { id: "single", name: "Cipher 加密算法", path: "系统视图", cmd: "ssh server cipher", raw: cipher, line: 3, bad: failed, actual: cipher, delta: failed ? "命中基线禁止的 CBC 算法" : "通过检查" },
      { id: "hmac", name: "HMAC 完整性校验", path: "系统视图", cmd: "ssh server hmac", raw: hmac, line: 108, bad: failed && d.id === "d1", actual: hmac, delta: failed && d.id === "d1" ? "含 MD5，未使用基线要求的 SHA2 套件" : "通过检查" },
    ];
  }
  if (r.id === "timeout") {
    return timeoutInstances().map((i) => {
      if (i.excluded || !i.bad || d.fails.includes("timeout")) return i;
      return { ...i, bad: false, raw: "10 0", minutes: 10, seconds: 0, actual: "10分钟", delta: "通过检查" };
    });
  }
  const bad = d.fails.includes(r.id);
  let value = r.value;
  if (r.id === "mgmt") value = d.ip + " 255.255.255.0";
  const row = { id: "single", name: r.view === "系统视图" ? "系统视图" : r.view, path: r.view, cmd: r.cmd, raw: value, line: r.line, bad, actual: value, delta: bad ? (r.id === "mgmt" ? "与规划地址不一致" : "命中不允许的算法") : "通过检查" };
  if (r.id === "ntp2") Object.assign(row, { raw: bad ? "10.10.0.99" : r.target, actual: bad ? "10.10.0.99" : r.target, delta: bad ? "与规划时钟源地址不一致" : "通过检查" });
  if (r.id === "vlan3") Object.assign(row, { raw: bad ? "100 200 300" : r.target, actual: bad ? "100、200、300" : "100、200", delta: bad ? "额外放通未规划的VLAN 300" : "通过检查" });
  if (r.id === "routerId") Object.assign(row, { raw: d.planned, actual: d.planned });
  if (!["mgmt", "ssh", "ntp2", "vlan3", "routerId"].includes(r.id)) row.actual = row.raw;
  if(extraValues[r.id]){const value=extraValues[r.id];Object.assign(row,{raw:bad?value.bad:value.good,actual:bad?value.bad:value.good,delta:bad?"当前配置与本规则要求不一致":"通过检查"})}
  return [row];
}

// 原始配置值分段（用于 <mark> / fail-param 高亮）：返回 [{text, bad}]
export function rawSegments(r, i) {
  if (!i.bad) return [{ text: i.raw, bad: false }];
  if (r.id === "timeout") {
    const [m, sec] = i.raw.split(" ");
    return i.minutes > 10
      ? [{ text: m, bad: true }, { text: " " + (sec || "0"), bad: false }]
      : [{ text: m + " ", bad: false }, { text: sec || "0", bad: true }];
  }
  if (r.id === "mgmt") return [{ text: i.raw.split(" ")[0], bad: true }, { text: " 255.255.255.0", bad: false }];
  if (r.id === "vlan3") return [{ text: "100 200 ", bad: false }, { text: "300", bad: true }];
  return [{ text: i.raw, bad: true }];
}

export const esc = (s) => String(s);

// 最终配置快照（V1 骨架 → V4 全规则覆写 → V7 SSH 头部覆写）
export function snapshotFor(d) {
  const lines = Array(180).fill("#");
  const mapping = {
    5: "stelnet server enable", 30: "ntp-service unicast-server 10.10.0.10", 31: "ntp-service unicast-server 10.10.0.11",
    36: "stp mode mstp", 40: "vlan batch 100 200", 42: "interface MEth0/0/0", 43: " description Management",
    44: " ip address " + d.ip + " 255.255.255.0", 61: "interface Vlanif100", 62: " description Business-Gateway",
    63: " ip address 172.16.100.1 255.255.255.0", 64: " vrrp vrid 1 virtual-ip 172.16.100.254", 65: " vrrp vrid 1 priority 120",
    70: "interface 100GE1/0/1", 71: " description Uplink", 72: " port link-type trunk", 73: " port trunk allow-pass vlan 100 200",
    84: "aaa", 85: " local-user netops service-type ssh", 86: " local-user netops privilege level 3",
    88: "local-aaa-user password policy administrator", 90: "  password complexity three-of-kinds",
    98: "ip route-static 0.0.0.0 0.0.0.0 10.10.1.1", 100: "bgp 65001", 101: " router-id " + d.ip,
    102: " peer 172.16.0.1 as-number 65000", 104: "route-policy EXPORT-DC permit node 10", 105: " apply local-preference 100",
    108: "ssh server cipher " + (d.fails.includes("ssh") ? "aes128_cbc" : "aes256_ctr"),
    120: "user-interface vty 0 4", 121: " authentication-mode aaa", 122: " idle-timeout 15 0",
    130: "user-interface console 0", 131: " authentication-mode aaa", 132: " idle-timeout 10 30",
    140: "user-interface aux 0", 141: " authentication-mode aaa", 142: " idle-timeout 5 0",
    150: "restconf", 151: " server enable", 152: " idle-timeout 30",
    160: "netconf", 161: " protocol inbound ssh", 170: "grpc", 171: " grpc server", 180: "return",
  };
  Object.entries(mapping).forEach(([n, text]) => { lines[Number(n) - 1] = text; });
  // V4：以实例模型覆写所有规则命中的行
  checks.forEach((r) => {
    if (r.id === "ssh") return;
    const i = instancesFor(d, r)[0];
    if (!i) return;
    lines[r.line - 1] = (r.view === "系统视图" ? "" : " ") + i.cmd + " " + i.raw;
  });
  if (!d.fails.includes("timeout")) { lines[121] = " idle-timeout 10 0"; lines[131] = " idle-timeout 10 0"; }
  // V7：SSH 演示头部
  lines[0] = "sysname " + d.name;
  lines[1] = "ssh authentication-type default password";
  const sshRule = checkById("ssh");
  instancesFor(d, sshRule).forEach((i) => { lines[i.line - 1] = i.cmd + " " + i.raw; });
  lines[3] = "#";
  return lines;
}

export function sshCommands(d,rollback=false,instance='single') {
  const records=instancesFor(d,checkById('ssh')),chosen=records.find(i=>i.id===instance)||records[0];
  return ['system-view',chosen.cmd+' '+(rollback?chosen.raw:chosen.id==='single'?checkById('ssh').target:SSH_TARGET_HMAC)].join('\n');
}
