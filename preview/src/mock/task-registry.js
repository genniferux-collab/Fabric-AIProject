import {uc2CandidateStats} from "./uc2.js";
import {sourceGroups} from "./devices.js";

// Shared prototype task ledger. Counts represent task records, never rule/device counts.
export const centerNames={xisanqi:"西三旗",jiading:"嘉定",waigaoqiao:"外高桥"};
const hcsGroupCount=label=>sourceGroups.filter(group=>group.name.includes(label)).reduce((total,group)=>total+group.count,0);
// Spine/Leaf labels map the prototype's core/access device groups for display.
// Servers remain a separate resource category, outside the network-check scope.
export const networkCenterInventory={
  xisanqi:{spine:hcsGroupCount("核心"),leaf:hcsGroupCount("接入"),servers:320,firewalls:hcsGroupCount("防火墙")},
  jiading:{spine:8,leaf:64,servers:256,firewalls:4},
  waigaoqiao:{spine:12,leaf:72,servers:288,firewalls:6},
};
export function centerNetworkDeviceCount(centerId){
  const devices=networkCenterInventory[centerId];
  return devices?devices.spine+devices.leaf+devices.firewalls:0;
}
export const ucTaskDefinitions={
  uc1:{kind:"rule-query",category:"inspection",centerId:null,scope:"全网检查规则库",title:"全网检查规则查询",prompt:"当前全网有哪些检查规则？",steps:["意图分析","出厂预置规则查询","AI挖掘规则查询","用户自定义规则查询"],result:{ruleCount:92}},
  uc2:{kind:"baseline-mining",category:"inspection",centerId:"xisanqi",scope:"西三旗DC",title:"黄金基线挖掘",prompt:"帮我自动挖掘一下西三旗DC的黄金基线，看看现网有哪些不合规？",steps:["意图分析","设备还原","黄金基线挖掘","生成报告"],result:{deviceCount:100,ruleCount:uc2CandidateStats.total}},
  uc3:{kind:"rule-creation",category:"generation",centerId:"xisanqi",scope:"西三旗DC检查规则",title:"生成检查规则",prompt:"帮我创建规则：用户接口空闲超时时间不能超过10分钟",steps:["意图分析","明确检查目标","生成检查逻辑","模拟测试"],result:{ruleCount:1,testCount:7}},
  // Explicit design-source mapping: the station tip names 西三旗数据中心 HCS.
  // This does not change UC4's HCS1 report, inventory or compliance calculations.
  uc4:{kind:"compliance-check",category:"inspection",centerId:"xisanqi",scope:"西三旗DC · HCS1",title:"配置基线检查",prompt:"检查HCS1的设备是否符合基线要求，并给出修复建议",steps:["扫描现网拓扑","定位设备配置","匹配检查规则","执行基线检查"],result:{deviceCount:380,ruleCount:24,passedDevices:375,failedDevices:5}},
};

const centers=Object.keys(centerNames);
export const isTaskRunning=task=>task.status==="running"||task.status==="analyzing";
export const isTaskProcessing=task=>isTaskRunning(task)||task.status==="paused";
export const isTaskOpen=task=>isTaskRunning(task)||task.status==="paused"||task.status==="awaiting-review";
export const networkDemoIntervals=[8000,10000,12000,9000,11000,10000];
// Attention order changes for a genuine state transition, not every progress tick.
export function patchNetworkTask(task,patch,now=Date.now()){
  const statusChanged=patch.status!==undefined&&patch.status!==task.status;
  return {...task,...patch,updatedAt:statusChanged?now:task.updatedAt};
}
// Finished prototype checks stay in attention until a person validates the report.
export function completeWorkflowForReview(task,now=Date.now()){
  if(task.source!=="workflow"||!["uc2","uc4"].includes(task.uc)||["completed","cancelled"].includes(task.status))return task;
  return patchNetworkTask(task,{status:"awaiting-review",phase:"待人工核验",progress:100,result:task.result||{...ucTaskDefinitions[task.uc].result},resultReady:true,completedAt:task.completedAt||now},now);
}
function demoTaskResult(task){
  const result={...(task.result||ucTaskDefinitions[task.uc]?.result||{})},networkTotal=centerNetworkDeviceCount(task.centerId);
  if(task.uc==="uc4"&&networkTotal){
    const failed=Number.isFinite(result.failedDevices)?Math.min(networkTotal,Math.max(0,Math.floor(result.failedDevices))):0;
    return {...result,deviceCount:networkTotal,failedDevices:failed,passedDevices:networkTotal-failed};
  }
  if(task.uc==="uc2"&&networkTotal){
    const sample=Number.isFinite(result.deviceCount)?Math.max(0,Math.floor(result.deviceCount)):100;
    return {...result,deviceCount:Math.min(sample,networkTotal)};
  }
  return result;
}
export function makeNetworkTask({id,uc="uc4",centerId,status="running",source="demo",updatedAt=Date.now(),...patch}){
  const definition=ucTaskDefinitions[uc]||{kind:"fault-governance",category:"fault",centerId:"jiading",scope:"嘉定DC",title:"网络故障治理",prompt:"",steps:["定位故障","分析影响","处置验证"],result:{}};
  const site=centerId===undefined?definition.centerId:centerId;
  const task={id,uc,kind:definition.kind,category:definition.category,centerId:site,scope:site?`${centerNames[site]}DC`:definition.scope,status,phase:status==="completed"?"已完成":status==="awaiting-review"?"待人工审阅":"正在分析",progress:status==="completed"||status==="awaiting-review"?100:20,title:definition.title,prompt:definition.prompt,result:status==="completed"||status==="awaiting-review"?{...definition.result}:null,updatedAt,source,...patch};
  if(source==="demo"&&(status==="completed"||status==="awaiting-review"))task.result=demoTaskResult(task);
  return task;
}

export function createWorkflowNetworkTask(uc,prompt,id,existingTask=null,now=Date.now()){
  const definition=ucTaskDefinitions[uc];
  if(uc==="uc4"&&existingTask&&existingTask.centerId!==definition.centerId)throw new Error("HCS1 workflow is available only for 西三旗; other center tasks remain read-only.");
  const retained=existingTask?.uc===uc?{centerId:existingTask.centerId,scope:existingTask.scope,title:existingTask.title}:{};
  return makeNetworkTask({id,uc,status:"analyzing",source:"workflow",prompt:prompt||existingTask?.prompt||definition.prompt,phase:"意图分析",progress:0,result:null,scope:definition.scope,updatedAt:now,...retained});
}

export function createInitialNetworkTasks(now=Date.now()){
  const tasks=[];
  const add=(uc,status,index,patch={})=>tasks.push(makeNetworkTask({id:`demo-${uc||"fault"}-${status}-${index}`,uc,status,centerId:centers[index%centers.length],updatedAt:now-index*1000,...patch}));
  add("uc4","awaiting-review",0,{centerId:"jiading",scope:"嘉定DC · 核心区",title:"核心区交换机配置检查",result:{...ucTaskDefinitions.uc4.result,failedDevices:2}});
  ["uc2","uc4","uc4"].forEach((uc,i)=>add(uc,"analyzing",i,{centerId:centers[i],phase:uc==="uc2"?"黄金基线挖掘":"配置分析",progress:24+i*19}));
  add("uc1","completed",0,{centerId:null,scope:"全网检查规则库"});
  for(let i=1;i<8;i++)add(i%2?"uc4":"uc2","completed",i);
  add("uc3","running",0,{centerId:"xisanqi",phase:"生成检查规则",progress:36});
  for(let i=0;i<293;i++)add("uc3","completed",i+10);
  add(null,"running",0,{centerId:"jiading",phase:"分析故障影响",progress:46});
  for(let i=0;i<2;i++)add(null,"completed",i+1);
  return tasks;
}

export function countNetworkTasks(tasks){
  const metrics={inspection:{verification:0,analyzing:0,completed:0},generation:{processing:0,completed:0},fault:{processing:0,completed:0},generatedTotal:0,runningTotal:0,completedTotal:0,pausedTotal:0,verificationTotal:0};
  for(const task of tasks){
    if(task.status==="cancelled")continue;
    metrics.generatedTotal++;
    if(task.status==="completed")metrics.completedTotal++;
    if(isTaskRunning(task))metrics.runningTotal++;
    if(task.status==="paused")metrics.pausedTotal++;
    if(task.status==="awaiting-review")metrics.verificationTotal++;
    if(task.category==="inspection"){
      const key=task.status==="completed"?"completed":task.status==="awaiting-review"?"verification":"analyzing";
      metrics.inspection[key]++;
    }else if(metrics[task.category])metrics[task.category][task.status==="completed"?"completed":"processing"]++;
  }
  return metrics;
}

const eventKinds={
  "rule-query":{label:"规则查询",object:"全网检查规则清单",work:"查询出厂预置、AI挖掘与用户自定义检查规则",next:"汇总规则分类、适用范围与覆盖情况，供您查看规则清单及完善建议"},
  "baseline-mining":{label:"基线挖掘",object:"交换机配置共性与候选规则",work:"分析现网设备配置与角色共性",next:"提取黄金基线候选规则并汇总偏离项，生成报告后请确认适用范围与采纳建议"},
  "rule-creation":{label:"规则生成",object:"用户自定义检查规则",work:"根据检查目标生成可执行的检查规则",next:"核验检查条件并测试配置样本，完成后可查看规则示意图、执行逻辑与测试结果"},
  "compliance-check":{label:"周期检查",object:"交换机配置基线检查任务",work:"核对设备配置与适用的基线检查规则",next:"整理不合规项、影响说明与修复建议，完成后请审阅检查报告并确认后续处置"},
  "fault-governance":{label:"故障治理",object:"网络故障影响分析与处置任务",work:"关联网络告警并分析故障影响与可能原因",next:"整理受影响范围与处置建议，结合处置结果进行验证并更新任务状态"},
};
const resultNumber=(result,key)=>Number.isFinite(result?.[key])&&result[key]>=0?result[key]:null;
function networkEventDetail(task,kind){
  const phase=task.phase||"任务分析",progress=Math.max(0,Math.min(100,Number(task.progress)||0));
  if(task.status==="paused")return `任务已在“${phase}”阶段暂停，当前进度${progress}%，已保留本次任务的范围与处理步骤。继续处理后将${kind.next}。`;
  if(task.status!=="awaiting-review"&&task.status!=="completed")return `正在${kind.work}，当前阶段为“${phase}”，任务进度${progress}%。后续将${kind.next}。`;
  const result=task.result,devices=resultNumber(result,"deviceCount"),rules=resultNumber(result,"ruleCount"),failed=resultNumber(result,"failedDevices"),tests=resultNumber(result,"testCount");
  const completed=task.status==="completed";
  if(task.kind==="compliance-check"){
    const facts=[devices===null?null:`已检查${devices}台设备`,rules===null?null:`核验${rules}条适用规则`,failed===null?null:`${failed}台设备未通过检查`].filter(Boolean);
    if(completed)return `${facts.length?facts.join("，"):"设备配置检查结果已整理完成"}。本次检查任务已完成，可查看设备检查结果、适用规则与修复建议，后续需要复查时可基于相同范围发起新的检查任务。`;
    return `${facts.length?facts.join("，"):"设备配置检查结果已整理完成"}。检查报告已生成，当前等待人工审阅，请查看不合规详情、影响说明与修复建议，确认后继续处置。`;
  }
  if(task.kind==="baseline-mining"){
    const facts=[devices===null?null:`已分析${devices}台设备配置`,rules===null?null:`提取${rules}条候选规则`].filter(Boolean);
    if(completed)return `${facts.length?facts.join("，"):"黄金基线候选规则已整理完成"}。本次共性分析与候选规则整理已完成，可查看角色适用范围、支持样本与偏离项，为后续基线维护和配置检查提供参考。`;
    return `${facts.length?facts.join("，"):"黄金基线候选规则已整理完成"}。当前报告待审阅，请核对角色适用范围、支持样本与偏离项，确认后再采纳候选规则并完善黄金基线。`;
  }
  if(completed&&task.kind==="rule-creation")return `${rules===null?"检查规则已生成":`已生成${rules}条检查规则`}${tests===null?"":`，完成${tests}组模拟测试`}。本次规则生成任务已完成，可查看检查条件、执行逻辑与测试结果，并结合设备适用范围安排后续配置检查。`;
  if(completed&&task.kind==="rule-query")return `${rules===null?"检查规则查询结果已整理完成":`已查询${rules}条检查规则`}。本次查询任务已完成，已汇总规则来源、分类分布及适用范围，可查看现有规则覆盖情况，并按需继续创建规则或开展黄金基线挖掘。`;
  if(completed)return "本次网络故障分析与处置任务已完成，相关任务状态与处理结果已更新。可查看受影响范围、分析结论与处置建议，并结合后续网络运行情况安排复核与持续观察。";
  if(task.kind==="rule-creation")return `${rules===null?"检查规则已生成":`已生成${rules}条检查规则`}${tests===null?"":`，完成${tests}组模拟测试`}。当前等待人工审阅，请核对检查条件、执行逻辑与适用范围，确认测试结果后再将规则加入规则库。`;
  if(task.kind==="rule-query")return `${rules===null?"检查规则查询结果已整理完成":`已查询${rules}条检查规则`}。当前结果待确认，请查看规则来源、分类分布与适用范围，核对现有规则覆盖情况，并按需继续创建规则或开展黄金基线挖掘。`;
  return "网络故障分析结果与处置建议已整理完成，当前等待人工审阅。请确认受影响范围、可能原因与建议操作，完成处置并验证结果后更新任务状态。";
}
function networkEvent(task){
  const kind=eventKinds[task.kind]||eventKinds["fault-governance"];
  const label=task.kind==="compliance-check"&&task.source==="workflow"?"单次检查":kind.label;
  const defaultTitle=ucTaskDefinitions[task.uc]?.title||(task.kind==="fault-governance"?"网络故障治理":null);
  const namedObject=task.title&&task.title!==defaultTitle?`${task.title}${task.title.endsWith("任务")?"":"任务"}`:task.kind==="compliance-check"&&task.scope?.includes("HCS1")?"HCS1区设备基线检查任务":kind.object;
  return {id:task.id,uc:task.uc,centerId:task.centerId,reviewLabel:task.status==="awaiting-review"?"待人工核验":null,status:task.status==="awaiting-review"?"manual":task.status==="completed"?"completed":"processing",title:`【${label}】${namedObject}`,location:task.scope,detail:networkEventDetail(task,kind),updatedAt:task.updatedAt};
}

export function selectNetworkTasks(tasks,revision=0){
  const ordered=[...tasks].sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id));
  const eventOrder={manual:0,processing:1,completed:2};
  const eventLimit=Math.max(20,ordered.filter(isTaskOpen).length);
  const events=ordered.filter(task=>task.status!=="cancelled").map(networkEvent).sort((a,b)=>eventOrder[a.status]-eventOrder[b.status]||b.updatedAt-a.updatedAt||a.id.localeCompare(b.id)).slice(0,eventLimit);
  const byCenter={};
  for(const id of centers){
    const centerTasks=ordered.filter(task=>task.centerId===id&&task.status!=="cancelled");
    const metrics=countNetworkTasks(centerTasks);
    const activeTask=centerTasks.find(task=>task.source==="workflow")||centerTasks.find(isTaskRunning)||centerTasks.find(task=>task.status==="awaiting-review")||centerTasks.find(task=>task.status==="paused")||centerTasks.find(task=>task.status==="completed")||null;
    const runningTasks=centerTasks.filter(isTaskProcessing);
    byCenter[id]={id,name:centerNames[id],tasks:centerTasks,runningTasks,activeTask,counts:{total:metrics.generatedTotal,running:metrics.runningTotal,processing:runningTasks.length,paused:metrics.pausedTotal,verification:metrics.verificationTotal,awaitingReview:metrics.verificationTotal,completed:metrics.completedTotal,inspection:metrics.inspection,generation:metrics.generation,fault:metrics.fault}};
  }
  return {tasks:ordered,metrics:countNetworkTasks(tasks),events,centers:byCenter,revision};
}

// One app-level clock migrates task records; workflow-owned records are excluded.
export function advanceNetworkDemo(tasks,eventIndex,now=Date.now()){
  const next=tasks.map(task=>({...task}));
  const update=(task,patch)=>{if(task)Object.assign(task,patchNetworkTask(task,patch,now));};
  const finish=task=>update(task,{status:"completed",phase:"任务已完成",progress:100,result:demoTaskResult(task)});
  const demoProcessing=()=>next.filter(task=>task.source==="demo"&&isTaskProcessing(task));
  const demoReview=()=>next.filter(task=>task.source==="demo"&&task.status==="awaiting-review");
  const actualProcessing=next.filter(task=>task.source==="workflow"&&isTaskProcessing(task)).length;
  const actualReview=next.filter(task=>task.source==="workflow"&&task.status==="awaiting-review").length;
  // Actual workflow records always win; only demonstration records are balanced.
  const reviewTarget=actualReview?0:1;
  const processingTarget=Math.max(0,[5,5,4,5,5,6][eventIndex%6]-actualProcessing);
  const progressing=demoProcessing()[eventIndex%Math.max(1,demoProcessing().length)];
  if(progressing){
    const progress=Math.min(96,progressing.progress+8),definition=ucTaskDefinitions[progressing.uc];
    const step=definition?Math.max(definition.steps.indexOf(progressing.phase),Math.min(3,Math.floor(progress/25))):-1;
    update(progressing,{phase:definition?.steps[step]||progressing.phase,progress,status:progress>=50?"running":progressing.status});
  }
  const centerLoad=id=>next.filter(task=>task.centerId===id&&isTaskProcessing(task)).length;
  const nextToFinish=()=>[...demoProcessing()].sort((a,b)=>centerLoad(b.centerId)-centerLoad(a.centerId)||a.updatedAt-b.updatedAt)[0];
  if(eventIndex%2===1&&demoProcessing().length===processingTarget){const task=nextToFinish();if(task)finish(task);}
  while(demoReview().length>reviewTarget)finish(demoReview()[0]);
  if(demoReview().length<reviewTarget){
    const task=demoProcessing().find(item=>["compliance-check","baseline-mining"].includes(item.kind));
    if(task)update(task,{status:"awaiting-review",phase:"报告待审阅",progress:100,result:demoTaskResult(task)});
    else next.push(makeNetworkTask({id:`demo-review-${eventIndex}-${now}`,uc:"uc4",centerId:centers[eventIndex%centers.length],status:"awaiting-review",phase:"报告待审阅",updatedAt:now}));
  }
  while(demoProcessing().length>processingTarget)finish(nextToFinish());
  while(demoProcessing().length<processingTarget){
    const offset=demoProcessing().length,start=(eventIndex+offset)%centers.length;
    const leastLoad=Math.min(...centers.map(centerLoad));
    const rotated=[...centers.slice(start),...centers.slice(0,start)];
    const centerId=rotated.find(id=>centerLoad(id)===leastLoad);
    let uc=["uc4","uc3",null,"uc2"][(eventIndex+offset)%4];
    if(uc==="uc2"&&centerId!=="xisanqi")uc="uc4";
    next.push(makeNetworkTask({id:`demo-live-${eventIndex}-${now}-${offset}`,uc,centerId,status:"running",phase:ucTaskDefinitions[uc]?.steps[0]||"故障影响分析",progress:18+offset*5,updatedAt:now}));
  }
  return next;
}
