// Prototype rule catalog: counts follow UC1; the first four names follow the Pixso reference.
const base = [
['设备基础配置', ['IP地址与规划地址匹配检查(FW/Switch)','设备主控板内存使用率检查(Switch)','统计故障端口光模块信息(Switch)','Sysname命名规范检查','NTP主服务器配置检查','NTP备服务器配置检查','NTP时区配置检查','NTP认证配置检查','设备管理IP唯一性检查','设备系统版本检查','设备补丁版本检查','设备启动配置检查','设备配置保存检查','设备时间同步检查','设备温度检查','设备风扇状态检查','设备电源状态检查','设备CPU使用率检查','设备存储空间检查','设备主备板状态检查','接口描述规范检查','接口地址掩码检查','Loopback地址配置检查','管理地址可达性检查','设备域名配置检查','设备配置备份检查']],
['安全管理网络与服务配置', ['SSH安全登录配置检查','SSH加密算法检查','SSH认证方式检查','SSH访问控制检查','SSH会话超时检查','Telnet服务禁用检查','Console认证方式检查','Console权限级别检查','VTY认证方式检查','VTY权限级别检查','VTY访问协议检查','VTY最大会话数检查','用户接口空闲超时检查','本地账号权限检查','本地账号密码复杂度检查','本地账号密码有效期检查','本地账号锁定策略检查','默认账号检查','闲置账号检查','AAA认证域配置检查','AAA授权方式检查','AAA计费配置检查','RADIUS服务器配置检查','HWTACACS服务器配置检查','登录失败告警检查','管理ACL配置检查','HTTP服务禁用检查','HTTPS服务配置检查','FTP服务禁用检查','SFTP服务配置检查','密码存储方式检查','安全审计日志配置检查']],
['管理网络与服务配置', ['管理VRF配置检查','SNMP版本配置检查','SNMP团体名安全检查','SNMP用户访问控制检查','SNMP认证算法检查','SNMP加密算法检查','SNMP Trap目的地址检查','SNMP源接口配置检查','日志服务器地址检查','日志源接口配置检查','日志级别配置检查','网管服务可达性检查']],
['网络冗余与故障切换', ['上行端口环网隐患检查','M-LAG双归配置检查','M-LAG主备角色检查','M-LAG Peer-link配置检查','M-LAG双活检测检查','Monitor Link链路联动检查','Eth-Trunk成员接口检查','Eth-Trunk协商模式检查','链路聚合负载分担检查','VRRP主备角色检查','VRRP抢占延迟检查','BFD会话配置检查','STP模式配置检查','STP根桥优先级检查','STP边缘端口检查','STP BPDU保护检查','环路检测配置检查','路由冗余配置检查','ECMP路径配置检查','故障切换联动检查']]
];
const presets=base.flatMap(([category,names])=>names.map(name=>({name,category,source:'factory'})));
const first=['IP地址与规划地址匹配检查(FW/Switch)','上行端口环网隐患检查','设备主控板内存使用率检查(Switch)','统计故障端口光模块信息(Switch)'];
const ordered=[...first.map(name=>presets.find(x=>x.name===name)),...presets.filter(x=>!first.includes(x.name))];
const custom=[{name:'西三旗DC NTP主备服务器配置检查',scope:'西三旗DC交换机',category:'设备基础配置',source:'custom'},{name:'业务区日志服务器地址配置检查',scope:'业务区交换机',category:'管理网络与服务配置',source:'custom'}];
export const uc1Rules=[...ordered.slice(0,4),custom[0],...ordered.slice(4),custom[1]].map((r,i)=>({...r,id:'uc1-rule-'+i,version:'V1.0',description:r.scope||'--',creator:'admin',vendor:'HUAWEI',model:'GE100v800',priority:'严重',createdAt:'2026/10/12 10:00:00',referenced:true,reviewed:true}));
export const uc1Categories=base.map(x=>x[0]);
export const uc1Sources=[{key:'all',label:'全部规则',count:92},{key:'factory',label:'出厂预置',count:90},{key:'ai',label:'AI挖掘',count:0},{key:'custom',label:'用户自定义',count:2}];
