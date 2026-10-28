import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {advanceNetworkDemo,completeWorkflowForReview,createInitialNetworkTasks,createWorkflowNetworkTask,networkDemoIntervals,patchNetworkTask,selectNetworkTasks,ucTaskDefinitions} from "../mock/task-registry.js";

export default function useNetworkTasks(){
  const [tasks,setTasks]=useState(createInitialNetworkTasks);
  const [revision,setRevision]=useState(0);
  const tasksRef=useRef(tasks),activeTaskRef=useRef(null),sequence=useRef(0);
  tasksRef.current=tasks;
  const commit=useCallback(update=>{
    setTasks(current=>{const next=update(current);tasksRef.current=next;return next;});
    setRevision(value=>value+1);
  },[]);
  useEffect(()=>{
    let timer,eventIndex=0,disposed=false;
    const tick=()=>{
      if(disposed)return;
      if(document.visibilityState!=="hidden"){const index=eventIndex++;commit(current=>advanceNetworkDemo(current,index));}
      timer=setTimeout(tick,networkDemoIntervals[eventIndex%networkDemoIntervals.length]);
    };
    timer=setTimeout(tick,networkDemoIntervals[0]);
    return()=>{disposed=true;clearTimeout(timer);};
  },[commit]);
  const patchTask=useCallback((id,patch)=>{
    commit(current=>current.map(task=>task.id===id?patchNetworkTask(task,patch):task));
  },[commit]);
  const pauseActive=useCallback((uc=null)=>{
    const id=activeTaskRef.current;
    if(id)commit(current=>current.map(task=>task.id===id&&(!uc||task.uc===uc)&&["running","analyzing"].includes(task.status)?{...task,status:"paused",updatedAt:Date.now()}:task));
  },[commit]);
  const finishActiveReview=useCallback(()=>{
    const task=tasksRef.current.find(item=>item.id===activeTaskRef.current);
    if(!task)return null;
    const next=completeWorkflowForReview(task);
    if(next===task)return null;
    patchTask(task.id,next);
    return next;
  },[patchTask]);
  const beginWorkflow=useCallback((uc,prompt,existingId=null)=>{
    const definition=ucTaskDefinitions[uc];
    if(!definition)return null;
    const id=existingId||`workflow-${uc}-${Date.now()}-${++sequence.current}`;
    activeTaskRef.current=id;
    const existingTask=existingId?tasksRef.current.find(task=>task.id===existingId):null;
    const next=createWorkflowNetworkTask(uc,prompt,id,existingTask);
    commit(current=>{
      const paused=current.map(task=>task.id!==id&&task.source==="workflow"&&["running","analyzing","paused"].includes(task.status)?["uc2","uc4"].includes(task.uc)?completeWorkflowForReview(task):{...task,status:"paused",updatedAt:Date.now()}:task);
      return paused.some(task=>task.id===id)?paused.map(task=>task.id===id?next:task):[...paused,next];
    });
    return id;
  },[commit]);
  const syncWorkflow=useCallback((uc,patch)=>{
    const id=activeTaskRef.current,task=tasksRef.current.find(item=>item.id===id);
    if(!task||task.uc!==uc||task.source!=="workflow")return;
    const update=patch.status==="awaiting-review"&&["uc2","uc4"].includes(uc)?{...patch,phase:"待人工核验",resultReady:true,completedAt:task.completedAt||Date.now()}:patch;
    const changed=Object.keys(update).some(key=>JSON.stringify(task[key])!==JSON.stringify(update[key]));
    if(changed)patchTask(id,update);
  },[patchTask]);
  const networkTasks=useMemo(()=>selectNetworkTasks(tasks,revision),[tasks,revision]);
  return {networkTasks,tasksRef,activeTaskRef,beginWorkflow,syncWorkflow,pauseActive,finishActiveReview,patchTask};
}
