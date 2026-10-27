import {affectedBy} from './audit.js';
import {streamDuration} from '../views/lui-panel/motion.jsx';
function completionLines(summary) {
  return [
    ['h2','已完成 HCS1 区的全量基线检查'],
    ['p',`已对 ${summary.total}台设备执行全部 24条适用规则检查，${summary.passed}台通过、${summary.failed}台不通过，整网合规度为 ${summary.compliance}%。`],
    ['p',`发现 ${summary.rules}条规则不通过，包括${summary.top}等。单台设备最多有 4条规则不通过，详情见右侧报告。`],
    ['h3','处理建议'],
    ['li',`${affectedBy('timeout').length}台设备存在空闲超时超限，3台设备使用不符合基线的 SSH 算法，建议核验后调整。`,'登录安全：'],
    ['li','2台管理 IP、2台 NTP 时钟源与规划不一致，建议核对变更审批，再恢复配置或更新台账。','规划一致性：'],
    ['li','1台设备额外放通未规划 VLAN，建议核验业务依赖后收敛放通范围。','网络访问范围：'],
    ['div','以上为建议，尚未执行；具体配置与修复命令按设备、规则分别查看。']
  ];
}
export function completionTimeline(summary) {
  let delay=0;
  return completionLines(summary).map(([as,text,leading])=>{const item={as,text,leading,delay};delay+=streamDuration(text)+80;return item;});
}
