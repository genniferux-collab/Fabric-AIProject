import {useEffect,useRef,useState} from 'react';
import {useApp} from '../../context.jsx';
import './index.css';

const icon=name=>'./assets/uploads/navigation/nav-'+name+'.svg';
export default function LeftRail(){
  const {agentActive,toggleAgent,goCockpit,toast,luiView,locate,focusLuiArtifact}=useApp();
  const [expanded,setExpanded]=useState(false),[pinned,setPinned]=useState(false);
  const root=useRef(null),timer=useRef(null),trigger=useRef(null);
  const close=()=>{clearTimeout(timer.current);setExpanded(false);setPinned(false);};
  useEffect(()=>{
    const outside=e=>{if(!root.current?.contains(e.target))close();};
    const escape=e=>{if(e.key==='Escape'&&expanded){close();trigger.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{clearTimeout(timer.current);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[expanded]);
  const showReport=()=>{if(luiView==='done'){focusLuiArtifact('report');locate('report');}else toast('完成基线检查后可从此处查看报告。');};
  const navigate=action=>{action();close();};
  const items=[{icon:'home',label:'首页',aria:'健康看板',active:!agentActive,action:goCockpit},{icon:'chat',label:'智能体对话',aria:'智能体对话',active:agentActive,action:toggleAgent},{icon:'resource',label:'网络资源',aria:'查看网络资源',action:goCockpit},{icon:'report',label:'检查报告',aria:'查看检查报告',action:showReport}];
  return <aside ref={root} className={'rail shell-rail floating-navigation'+(expanded?' is-expanded':'')} aria-label="主导航" onPointerEnter={e=>{if(e.pointerType==='mouse'){clearTimeout(timer.current);setExpanded(true);}}} onPointerLeave={()=>{if(!pinned)timer.current=setTimeout(()=>setExpanded(false),180);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)&&!pinned)setExpanded(false);}}>
    <button className="shell-assistant-button" aria-label="智能体 Aico" title="智能体 Aico" onClick={()=>navigate(toggleAgent)}><img src={icon('assistant')} width="24" height="24" alt=""/><span className="floating-nav-label floating-nav-title">数据中心网络智能体</span></button>
    <nav className="shell-rail-items" aria-label="功能导航">{items.map(item=><button key={item.icon} className={'shell-rail-item'+(item.active?' active':'')} id={item.icon==='chat'?'agentNav':undefined} aria-label={item.aria} title={!expanded?item.label:undefined} aria-current={item.active?'page':undefined} onClick={()=>navigate(item.action)}><img src={icon(item.icon)} width="16" height="16" alt=""/><span className="floating-nav-label">{item.label}</span></button>)}</nav>
    <button ref={trigger} className="floating-nav-toggle shell-rail-item" type="button" aria-label={expanded?'收起侧边导航':'展开侧边导航'} aria-expanded={expanded} onClick={()=>{clearTimeout(timer.current);setPinned(!expanded);setExpanded(!expanded);}}><img src={icon('collapse')} width="16" height="16" alt=""/><span className="floating-nav-label">收起导航</span></button>
  </aside>;
}
