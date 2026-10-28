import "./index.css";

const assetRoot="./assets/uploads/pixso-site-tips/icons/";
const kindLabels={"rule-query":"规则查询","baseline-mining":"黄金基线挖掘","rule-creation":"规则生成","compliance-check":"合规检查","fault-governance":"故障治理"};

export function siteTaskState(task){
  if(!task)return "idle";
  if(task.status==="paused")return "paused";
  if(task.status==="awaiting-review")return "review";
  if(task.status==="completed")return "completed";
  if(task.status==="cancelled")return "idle";
  return "running";
}

export function SiteTaskCluster({centerName,centerId,tasks,onOpen,onPeek,onLeave,running=true}){
  const copy=`${centerName}数据中心${tasks.length}项任务${running?"处置中":"等待继续"}`;
  return <button type="button" className={`site-task-tip site-task-cluster is-${running?"running":"paused"}`} data-center-id={centerId} data-task-ids={tasks.map(task=>task.id).join(" ")} data-task-count={tasks.length} aria-label={`${copy}，查看事件`} onClick={onOpen} onMouseEnter={onPeek} onMouseLeave={onLeave} onFocus={onPeek} onBlur={onLeave}>
    <span className="site-task-tip-symbol" aria-hidden="true"><span className="site-task-tip-orbit"/><img src={`${assetRoot}${running?"ai-running.svg":"timer-running-cyan.svg"}`} width="16" height="16" alt=""/></span><strong>{tasks.length}</strong>
  </button>;
}

export default function SiteTaskTip({task,centerName,onOpen,expanded=false,taskCount,aggregateState,centerId,taskIds}){
  const state=aggregateState||siteTaskState(task);
  const kind=kindLabels[task?.kind]||task?.title||"AI";
  const scope=task?.scope?.includes("HCS1")?"HCS1":"";
  const ending={running:"任务进行中",paused:"任务已暂停",review:"任务完成，待审阅",completed:"任务已完成",idle:"暂无执行中任务"}[state];
  const copy=taskCount>0?`${centerName}数据中心${taskCount}项任务${state==="paused"?"等待继续":"处置中"}`:task?`${centerName}数据中心${scope}的${kind}${ending}`:`${centerName}数据中心${ending}`;
  const icon=state==="running"?"ai-running.svg":state==="paused"?"timer-running-cyan.svg":"completed.svg";
  return <button type="button" className={`site-task-tip is-${state}${expanded?" is-wide":""}`} data-center-id={centerId} data-task-ids={taskIds?.join(" ")} data-task-count={taskCount} data-task-id={task?.id} data-task-status={task?.status||"idle"} onClick={()=>task&&onOpen?.(task.id)} disabled={!task||!onOpen} aria-label={`${copy}${task&&onOpen?taskCount>0?"，查看站点任务":"，查看任务":""}`} title={copy}>
    <span className="site-task-tip-symbol" aria-hidden="true"><span className="site-task-tip-orbit"/><img src={`${assetRoot}${icon}`} width="16" height="16" alt=""/></span>
    <span className="site-task-tip-copy">{copy}</span>
  </button>;
}
