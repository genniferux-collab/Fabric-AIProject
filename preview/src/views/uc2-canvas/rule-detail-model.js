import {uc2DeviationDevices,miningImpact,uc2Actual} from "../../mock/uc2.js";

// Each result is scoped to one candidate and one device.
export function samplesFor(rule) {
  const names = rule.role === "核心交换机" ? Array.from({length:20},(_,i)=>"CoreSwitch-"+String(i+1).padStart(2,"0")) : rule.role === "Leaf 交换机" ? Array.from({length:80},(_,i)=>"LeafSwitch-"+String(i+1).padStart(2,"0")) : [...Array.from({length:20},(_,i)=>"CoreSwitch-"+String(i+1).padStart(2,"0")),...Array.from({length:80},(_,i)=>"LeafSwitch-"+String(i+1).padStart(2,"0"))];
  const bad = new Set(uc2DeviationDevices[rule.id] || []);
  return names.map(name=>({id:name,name,role:name.startsWith("Core")?"核心交换机":"Leaf 交换机",bad:bad.has(name),ruleId:rule.id,anomalyCount:bad.has(name)?1:0})).sort((a,b)=>Number(b.bad)-Number(a.bad)||a.name.localeCompare(b.name,"zh-CN",{numeric:true}));
}
function exampleCommand(rule) {
  return rule.cmd.replace("<角色集合>","100 200").replace("<按规划>","10.10.10.1").replace("<session>","core-peer").replace("<peer>","10.10.0.2").replace("<连接对象-端口>","To-LeafSwitch-01-10GE1/0/1");
}
export function evidenceFor(rule,device) {
  const expected = exampleCommand(rule), meta = miningImpact[rule.id];
  const actual = !device.bad ? expected : rule.id === "GB-014" ? "undo stp edged-port enable" : rule.id === "GB-017" ? "description Uplink-Temporary" : meta?.actual || uc2Actual(rule);
  const path = meta?.path || (rule.category === "VLAN 与二层网络" || rule.id === "GB-017" ? "interface 10GE1/0/1" : "系统视图");
  const command = actual.startsWith("未") ? "# "+actual : actual;
  return {ruleId:rule.id,deviceId:device.id,anomalyCount:device.bad?1:0,expected,actual,command,path,reason:meta?.reason || (rule.id === "GB-014" ? "接入口未启用候选要求的边缘端口配置。" : rule.id === "GB-017" ? "接口描述未符合当前角色的候选模板，需要结合连接关系核对。" : "当前配置与同角色样本提取的候选模式存在差异。"),next:meta?.next || "请结合设备角色、业务规划和变更记录确认后，再决定是否采用该候选要求。"};
}
