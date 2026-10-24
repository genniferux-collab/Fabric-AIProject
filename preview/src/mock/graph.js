// 检查集/匹配关系（映射画布 V7 模型）+ 网络拓扑布局
import { sourceGroups } from "./devices.js";

export const groups = sourceGroups;

export const sets = [
  { id: "s1", name: "IP地址与规划地址匹配检查", scope: "FW / Switch", rules: 4, items: [["管理IP地址匹配", "设备管理IP应与规划地址一致", "display current-configuration interface"], ["业务接口IP匹配", "接口地址与业务网络规划一致", "display ip interface brief"], ["接口子网掩码匹配", "接口掩码应符合规划前缀长度", "display current-configuration interface"], ["地址冲突检查", "同一网络内设备地址不重复", "display arp all"]] },
  { id: "s2", name: "NTP 时间同步检查", scope: "FW / Switch", rules: 3, items: [["NTP服务启用", "已启用NTP时间同步服务", "display ntp-service status"], ["时钟源地址匹配", "NTP服务器地址符合规划", "display ntp-service sessions"], ["时间同步状态", "设备时钟处于同步状态", "display clock"]] },
  { id: "s3", name: "账户与访问安全检查", scope: "FW / Switch", rules: 5, items: [["本地用户权限", "运维账户权限符合分级策略", "display local-user"], ["远程访问协议", "仅允许安全远程访问协议", "display ssh server status"], ["密码复杂度", "账户密码满足复杂度要求", "display current-configuration"], ["会话超时配置", "空闲会话超时时间符合基线", "display user-interface"], ["登录认证方式", "管理登录已配置AAA认证", "display current-configuration configuration aaa"]] },
  { id: "s4", name: "VLAN 与二层网络检查", scope: "Switch", rules: 4, items: [["业务VLAN匹配", "已配置规划中的业务VLAN", "display vlan"], ["接口模式检查", "接口接入模式符合规划", "display port vlan"], ["Trunk允许列表", "仅放通规划的VLAN范围", "display port vlan"], ["环路保护检查", "已启用相应环路保护机制", "display stp brief"]] },
  { id: "s5", name: "路由与冗余配置检查", scope: "Switch", rules: 4, items: [["默认路由检查", "默认路由下一跳与规划一致", "display ip routing-table"], ["动态路由邻居", "已建立规划中的路由邻居", "display bgp peer"], ["冗余组配置", "主备角色与规划一致", "display vrrp brief"], ["路由策略检查", "已配置规划中的路由策略", "display route-policy"]] },
  { id: "s6", name: "安全策略合规检查", scope: "FW", rules: 4, items: [["安全域划分", "接口安全域归属符合规划", "display zone"], ["访问控制策略", "访问控制策略符合业务基线", "display security-policy rule all"], ["日志记录策略", "关键安全策略已启用日志", "display current-configuration"], ["默认拒绝策略", "未匹配流量按基线处理", "display security-policy rule all"]] },
];

export const relations = [["g1", "s1"], ["g1", "s2"], ["g1", "s3"], ["g1", "s4"], ["g1", "s5"], ["g2", "s1"], ["g2", "s2"], ["g2", "s3"], ["g2", "s4"], ["g3", "s1"], ["g3", "s2"], ["g3", "s3"], ["g3", "s6"], ["g4", "s1"], ["g4", "s2"], ["g4", "s3"], ["g4", "s4"], ["g4", "s5"], ["g5", "s1"], ["g5", "s2"], ["g5", "s3"], ["g5", "s4"], ["g6", "s1"], ["g6", "s2"], ["g6", "s3"], ["g6", "s6"]];
export const related = (id) => relations.filter((r) => r.includes(id)).map((r) => (r[0] === id ? r[1] : r[0]));

export const mapGroups=groups.map(g=>({...g,sourceGroupIds:[g.id]}));
export const mapCheckDefinitions=sets;
export const mapSets=sets.map(s=>({...s,baseId:s.id,vendor:'shared'}));
export const mapRelations=mapGroups.flatMap(g=>mapSets.filter(s=>g.type.startsWith('FW')?['s1','s2','s3','s6'].includes(s.id):['s1','s2','s3','s4','s5'].includes(s.id)).map(s=>[g.id,s.id]));
export const mapRelated=id=>mapRelations.filter(r=>r.includes(id)).map(r=>r[0]===id?r[1]:r[0]);

// 数字地图布局：华为防火墙/核心/接入 + H3C 防火墙/核心/接入
export const networkLayoutGroups = [groups[2], groups[0], groups[1], groups[5], groups[3], groups[4]];
