// UC2 黄金基线挖掘 — 数据与纯逻辑（最终口径：fusion 图 + 候选报告）
export const uc2RestorationDuration = 8000;
export const uc2Timing = { text: [3600, 3200, 3200, 2400], canvas: [6500, uc2RestorationDuration, 8160, 3600], settle: 2200 };
export const uc2Prompt = "帮我自动挖掘一下西三旗DC的黄金基线，看看现网有哪些不合规？";
export const uc2Names = ["意图分析", "设备还原", "黄金基线挖掘", "生成报告"];

export const uc2Rules = [
  ["SNMP访问控制", "通用", "账户与访问安全", "snmp-agent acl 2000", 100, 98, 2],
  ["VTY仅允许 SSH", "通用", "账户与访问安全", "protocol inbound ssh", 100, 96, 4],
  ["SSH 使用安全加密算法", "通用", "账户与访问安全", "ssh server cipher aes256_ctr", 100, 98, 2],
  ["NTP服务配置", "通用", "运维可观测性", "ntp-service unicast-server 10.10.0.10", 100, 100, 0],
  ["核心冗余组一致性", "核心交换机", "路由与冗余", "vrrp vrid 1 virtual-ip <按规划>", 20, 18, 2],
  ["核心交换机开启 BFD 联动", "核心交换机", "路由与冗余", "bfd <session> bind peer-ip <peer>", 20, 19, 1],
  ["核心交换机配置路由策略", "核心交换机", "路由与冗余", "route-policy EXPORT-DC permit node 10", 20, 20, 0],
  ["核心交换机配置 AAA 认证", "核心交换机", "账户与访问安全", "authentication-mode aaa", 20, 20, 0],
  ["管理日志上报", "通用", "运维可观测性", "info-center loghost 10.10.0.20", 100, 98, 2],
  ["端口错误告警", "通用", "接口可靠性", "snmp-agent trap enable", 100, 100, 0],
  ["Leaf 上联端口使用 Trunk", "Leaf 交换机", "VLAN 与二层网络", "port link-type trunk", 80, 80, 0],
  ["Leaf下联VLAN范围", "Leaf 交换机", "VLAN 与二层网络", "port trunk allow-pass vlan <角色集合>", 80, 77, 3],
  ["Leaf 开启 STP 环路保护", "Leaf 交换机", "VLAN 与二层网络", "stp enable", 80, 80, 0],
  ["Leaf 接入口启用边缘端口", "Leaf 交换机", "VLAN 与二层网络", "stp edged-port enable", 80, 79, 1],
  ["设备登录认证策略", "通用", "账户与访问安全", "authentication-mode aaa", 100, 100, 0],
  ["本地用户分级权限", "通用", "账户与访问安全", "local-user netops privilege level 3", 100, 100, 0],
  ["Leaf 接口描述遵循角色模板", "Leaf 交换机", "接口可靠性", "description <连接对象-端口>", 80, 76, 4],
  ["Leaf 配置统一 LLDP 发现", "Leaf 交换机", "运维可观测性", "lldp enable", 80, 80, 0],
].map((r, i) => ({
  id: "GB-" + String(i + 1).padStart(3, "0"),
  name: r[0], role: r[1], category: r[2], cmd: r[3],
  scope: r[4], support: r[5], deviations: r[6],
  confidence: i < 12 ? "高" : "待验证",
}));

export const uc2DeviationDevices = {
  "GB-001": ["CoreSwitch-03", "LeafSwitch-06"],
  "GB-002": ["LeafSwitch-03", "LeafSwitch-04", "LeafSwitch-05", "LeafSwitch-06"],
  "GB-003": ["CoreSwitch-03", "LeafSwitch-06"],
  "GB-005": ["CoreSwitch-03", "CoreSwitch-04"],
  "GB-009": ["LeafSwitch-06", "LeafSwitch-07"],
  "GB-006": ["CoreSwitch-04"],
  "GB-012": ["LeafSwitch-03", "LeafSwitch-04", "LeafSwitch-08"],
  "GB-014": ["LeafSwitch-05"],
  "GB-017": ["LeafSwitch-03", "LeafSwitch-06", "LeafSwitch-08", "LeafSwitch-09"],
};

export const miningImpact = {
  "GB-005": {actual:"未匹配到统一的VRRP冗余组配置",path:"核心路由冗余",reason:"2台设备存在差异，需核验角色与组网。",impact:"核心冗余组配置可能与规划不一致，需确认主备角色与业务依赖。",next:"对照冗余规划、设备角色及组网拓扑核验，再采用候选配置。"},
  "GB-009": {actual:"info-center loghost 10.10.0.21",path:"系统视图",reason:"2台设备存在差异，需确认日志用途。",impact:"管理日志上报目的地址不同，可能属于独立审计域。",next:"核对日志采集与审计规划，再确认是否统一上报地址。"},
  "GB-001": { actual: "snmp-agent acl 2001", path: "系统视图", reason: "2台设备的管理访问控制列表与候选ACL 2000不同。", impact: "管理访问来源范围可能与候选规划不一致。", next: "核验ACL条目与网管访问规划，再决定是否采用候选配置。" },
  "GB-002": { actual: "protocol inbound all", path: "user-interface vty 0 4", reason: "4台设备仍允许其他管理协议，需核验遗留管理访问需求。", impact: "管理入口未统一收敛为SSH，可能扩大访问暴露面。", next: "确认遗留网管与终端均支持SSH后，再收敛VTY允许的协议。" },
  "GB-003": { actual: "ssh server cipher aes128_cbc", path: "系统视图", reason: "实际使用 aes128_cbc，与样本共性算法 aes256_ctr 不一致。", impact: "管理访问加密方式偏离候选安全模式；调整前需确认客户端算法兼容性。", next: "核对安全基线与运维客户端兼容性，确认是否采用该候选。" },
  "GB-006": { actual: "未配置 BFD 联动", path: "核心路由冗余", reason: "未匹配到核心角色常见的 BFD 联动配置。", impact: "故障检测与路由收敛策略可能不同；是否影响业务需结合路由协议和定时器核验。", next: "核验路由邻居、设备能力和业务收敛目标，再确认是否要求 BFD。" },
  "GB-012": { actual: "port trunk allow-pass vlan 100 200 300", path: "interface 10GE1/0/1", reason: "实际放通 VLAN 300，超出同角色候选集合 VLAN 100、200。", impact: "二层业务放通范围可能扩大，也可能属于合法的角色变量或已批准业务。", next: "对照 VLAN 规划和业务依赖确认额外放通是否必要。" },
  "GB-004": { actual: "ntp-service unicast-server 10.10.0.99", path: "系统视图", reason: "时钟源地址偏离规划候选值。", impact: "可能采用不同时间源，需要核验时钟源规划和可用性。", next: "对照时间源规划确认主、备关系。" },
};

export const fusionImpact = { "GB-001": "高", "GB-002": "中", "GB-003": "高", "GB-004": "中", "GB-005": "高", "GB-006": "高", "GB-007": "中", "GB-008": "高", "GB-009": "中", "GB-010": "低", "GB-011": "中", "GB-012": "高", "GB-013": "高", "GB-014": "中", "GB-015": "高", "GB-016": "高", "GB-017": "低", "GB-018": "低" };

export function fusionTopRules() {
  const conf = { "高": 2, "待验证": 1 }, impact = { "高": 3, "中": 2, "低": 1 };
  return [...uc2Rules].sort((a, b) =>
    conf[b.confidence] - conf[a.confidence] ||
    impact[fusionImpact[b.id]] - impact[fusionImpact[a.id]] ||
    b.support - a.support ||
    a.id.localeCompare(b.id)
  ).slice(0, 10);
}

export const fusionNodes = [
  { id: "core", x: 105, y: 185, label: "核心角色簇", sub: "20 台 · CE12800", icon: "network" },
  { id: "leaf", x: 105, y: 410, label: "Leaf 角色簇", sub: "80 台 · CE6800", icon: "network" },
  { id: "core1", x: 324, y: 132, label: "CoreSwitch-01", sub: "核心代表设备", icon: "server" },
  { id: "core2", x: 324, y: 248, label: "CoreSwitch-02", sub: "核心代表设备", icon: "server" },
  { id: "leafsample", x: 324, y: 410, label: "Leaf 配置样本", sub: "同角色标准化分析", icon: "server" },
  { id: "engine", x: 595, y: 285, label: "AI 配置共性提取", sub: "标准化 · 对比 · 样本回看", icon: "sparkles" },
  ...fusionTopRules().map((r, i) => ({
    id: "rule:" + r.id, x: 825, y: 92 + i * 44, label: r.name,
    sub: `${r.confidence === "高" ? "高置信" : "待验证"} · ${fusionImpact[r.id]}影响 · 依据 ${r.support} 台`,
    icon: "rules", rank: i + 1, rule: r,
  })),
];

export const fusionEdges = [
  ["core", "core1"], ["core", "core2"], ["leaf", "leafsample"],
  ["core1", "engine"], ["core2", "engine"], ["leafsample", "engine"],
  ...fusionNodes.filter((n) => n.rule).map((n) => ["engine", n.id]),
];

export function fusionRelevant(id) {
  if (id === "engine") return new Set(fusionNodes.map((n) => n.id));
  const up = new Set([id]), down = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of fusionEdges) {
      if (up.has(b) && !up.has(a)) { up.add(a); changed = true; }
      if (down.has(a) && !down.has(b)) { down.add(b); changed = true; }
    }
  }
  const result = new Set([...up, ...down]);
  const r = fusionNodes.find((n) => n.id === id)?.rule;
  const core = ["core", "core1", "core2"].includes(id) || r?.role === "核心交换机";
  const leaf = ["leaf", "leafsample"].includes(id) || r?.role === "Leaf 交换机";
  if (core) { ["leaf", "leafsample"].forEach((x) => result.delete(x)); fusionNodes.filter((n) => n.rule?.role === "Leaf 交换机").forEach((n) => result.delete(n.id)); }
  if (leaf) { ["core", "core1", "core2"].forEach((x) => result.delete(x)); fusionNodes.filter((n) => n.rule?.role === "核心交换机").forEach((n) => result.delete(n.id)); }
  return result;
}

export const uc2RuleById = (id) => uc2Rules.find((r) => r.id === id);

export function uc2Actual(r) {
  if (r.id === "GB-002") return "protocol inbound all";
  if (r.id === "GB-003") return "ssh server cipher aes128_cbc";
  if (r.id === "GB-004") return "ntp-service unicast-server 10.10.0.99";
  if (r.id === "GB-012") return "port trunk allow-pass vlan 100 200 300";
  return "未匹配到候选配置模式（示例）";
}

export function uc2ExportCsv(reviews) {
  const rows = [
    ["编号", "规则名称", "适用角色", "功能", "支持样本", "适用样本", "偏离设备", "置信度", "审阅状态"],
    ...uc2Rules.map((r) => [r.id, r.name, r.role, r.category, r.support, r.scope, r.deviations, r.confidence, ({pending:"待审阅",accepted:"已采纳",rejected:"暂不采用"})[reviews[r.id] || "pending"]]),
  ];
  const csv = "\uFEFF" + rows.map((row) => row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "西三旗DC-黄金基线候选规则.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Pixso 5:162385: the report, full list and individual review share one data source.
export const uc2InitialReviews = Object.fromEntries(["GB-004","GB-007","GB-008","GB-009","GB-011","GB-013"].map(id=>[id,"accepted"]));
export const uc2ReportEvidence = {
 "GB-002":{category:"登录安全",note:"4台存在差异，需核验遗留管理访问"},
 "GB-005":{category:"核心冗余",note:"2台存在差异，需核验角色与组网"},
 "GB-012":{category:"业务分区",note:"3台可能属于其他业务分区"},
 "GB-001":{category:"管理访问",note:"2台访问控制列表不同"},
 "GB-004":{category:"时间同步",note:"—"},
 "GB-009":{category:"审计记录",note:"2台存在差异，需确认用途"}
};
