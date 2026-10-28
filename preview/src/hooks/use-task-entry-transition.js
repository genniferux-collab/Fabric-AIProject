import {useCallback,useEffect,useRef,useState} from "react";

// Keep one navigation request: returning home cancels a pending drill-down.
export default function useTaskEntryTransition(){
  const [taskEntry,setTaskEntry]=useState(null);
  const timers=useRef([]);
  const clear=useCallback(()=>{timers.current.forEach(clearTimeout);timers.current=[];},[]);
  const cancelTaskEntry=useCallback(()=>{clear();setTaskEntry(null);},[clear]);
  useEffect(()=>clear,[clear]);
  const enterTaskDetail=useCallback((task,open,fromMap)=>{
    clear();
    if(!fromMap||window.matchMedia("(prefers-reduced-motion: reduce)").matches){setTaskEntry(null);open();return;}
    const entry={taskId:task.id,centerId:task.centerId};
    setTaskEntry({...entry,phase:"focusing"});
    timers.current.push(setTimeout(()=>{
      open();
      setTaskEntry({...entry,phase:"entering"});
      timers.current.push(setTimeout(()=>{setTaskEntry(null);timers.current=[];},520));
    },360));
  },[clear]);
  return {taskEntry,enterTaskDetail,cancelTaskEntry};
}
