import {useEffect,useRef,useState} from "react";

export default function LiveMetricValue({value,minDigits=1}){
  const previousValue=useRef(value);
  const [change,setChange]=useState(null);
  useEffect(()=>{
    if(previousValue.current===value)return;
    const from=previousValue.current;
    previousValue.current=value;
    setChange({from,to:value});
    const timer=setTimeout(()=>setChange(null),640);
    return()=>clearTimeout(timer);
  },[value]);
  const updating=change?.to===value;
  return <span className={`fabric-live-number${updating?" is-updating":""}${updating&&value<change.from?" is-decreasing":""}`} style={{minWidth:`${minDigits}ch`}}>
    {updating&&<span className="fabric-live-number-previous" aria-hidden="true">{change.from}</span>}
    <span className="fabric-live-number-current" key={value}>{value}</span>
  </span>;
}
