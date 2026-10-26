import {useEffect,useRef,useState} from "react";

const assetRoot="./assets/uploads/pixso-ai-welcome/";
const categories=["全部","检查任务","检查项/集","信息查询"];
const templates=[
  {id:"rule",icon:"template-rule",label:"创建规则：用户接口空闲超时时间不能超过十分钟",category:"检查项/集",prompt:"帮我建一条规则：用户接口空闲超时时间不能超过10分钟"},
  {id:"device",icon:"template-device",label:"创建设备健康度巡检项",category:"检查任务",prompt:"创建设备健康度巡检项"},
  {id:"change",icon:"template-change",label:"检查最近一次变更任务的配置是否合规",category:"检查任务",prompt:"检查最近一次变更任务的配置是否合规"},
  {id:"query",icon:"template-query",label:"查询全网所有的检查项",category:"信息查询",prompt:"查询全网所有的检查项"},
  {id:"set",icon:"template-set",label:"查询全网所有的检查集",category:"信息查询",prompt:"查询全网所有的检查集"}
];

export default function WelcomeTemplates({onChoose,onClose}){
  const [category,setCategory]=useState("全部"),[active,setActive]=useState(0);
  const panelRef=useRef(null);
  const filtered=templates.filter(item=>category==="全部"||item.category===category);
  useEffect(()=>{
    const close=event=>{if(event.type==="keydown"){if(event.key==="Escape"){event.preventDefault();onClose();}}else if(!panelRef.current?.contains(event.target)&&!event.target.closest(".welcome-template-trigger"))onClose();};
    document.addEventListener("pointerdown",close);document.addEventListener("keydown",close);
    const frame=requestAnimationFrame(()=>panelRef.current?.querySelector('[role="option"]')?.focus({preventScroll:true}));
    return()=>{cancelAnimationFrame(frame);document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",close);};
  },[onClose]);
  const onListKeyDown=event=>{
    if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
    event.preventDefault();
    const next=event.key==="Home"?0:event.key==="End"?filtered.length-1:(active+(event.key==="ArrowDown"?1:-1)+filtered.length)%filtered.length;
    setActive(next);panelRef.current?.querySelectorAll('[role="option"]')[next]?.focus();
  };
  return <section className="welcome-template-panel" id="welcomeTemplates" role="dialog" aria-label="模板列表" ref={panelRef}>
    <header><h2>模板列表</h2><button type="button" aria-label="关闭模板列表" onClick={onClose}><img src={`${assetRoot}close.svg`} alt=""/></button></header>
    <div className="welcome-template-tabs" role="tablist" aria-label="模板分类">{categories.map(item=><button type="button" role="tab" aria-selected={category===item} key={item} onClick={()=>{setCategory(item);setActive(0);}}>{item}</button>)}</div>
    <div className="welcome-template-list" role="listbox" aria-label="可用模板" onKeyDown={onListKeyDown}>{filtered.map((item,index)=><button type="button" role="option" aria-selected={active===index} tabIndex={active===index?0:-1} key={item.id} onFocus={()=>setActive(index)} onPointerMove={()=>setActive(index)} onClick={()=>onChoose(item.prompt)}><img src={`${assetRoot}${item.icon}.svg`} alt=""/><span>{item.label}</span></button>)}</div>
  </section>;
}
