import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useApp} from '../../context.jsx';
import Ic from '../icon-el/index.jsx';
import {NativeSelect} from '../form-controls/select.jsx';
import {getReportExportScopes,downloadReportExcel} from '../../lib/report-export.js';
import './index.css';

export default function ReportExport({uc,reviews,ruleConfigs,disabled=false}){
 const {toast}=useApp(),uid=useId(),buttonRef=useRef(null),panelRef=useRef(null),timer=useRef(null);
 const [open,setOpen]=useState(false),[pinned,setPinned]=useState(false),[busy,setBusy]=useState(false),[position,setPosition]=useState({position:'fixed',left:-9999,top:0});
 const [resultMode,setResultMode]=useState('violations'),[scopeMode,setScopeMode]=useState('all'),[scopeValue,setScopeValue]=useState(''),[groupBy,setGroupBy]=useState('device');
 const scopes=getReportExportScopes(uc),options=scopeMode==='institution'?scopes.institutions:scopeMode==='region'?scopes.regions:[];
 const title=uc==='uc2'?'黄金基线报告':'基线检查报告';
 const close=(focus=false)=>{clearTimeout(timer.current);setOpen(false);setPinned(false);if(focus)buttonRef.current?.focus({preventScroll:true});};
 const place=()=>{const rect=buttonRef.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(344,window.innerWidth-24),height=panelRef.current?.offsetHeight||410;setPosition({position:'fixed',left:Math.max(12,Math.min(rect.right-width,window.innerWidth-width-12)),top:rect.bottom+height+12<window.innerHeight?rect.bottom+8:Math.max(12,rect.top-height-8),width,maxHeight:window.innerHeight-24});};
 useEffect(()=>{if(!open)return;place();const outside=e=>{if(!buttonRef.current?.contains(e.target)&&!panelRef.current?.contains(e.target)&&!e.target.closest?.('.ui-kit-options'))close();};const key=e=>{if(e.key==='Escape'){e.preventDefault();close(true);}};window.addEventListener('resize',place);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{window.removeEventListener('resize',place);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};},[open]);
 useEffect(()=>{if(open)place();},[scopeMode]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const leave=()=>{if(!pinned&&!busy)timer.current=setTimeout(()=>setOpen(false),240);};
 const enter=()=>{clearTimeout(timer.current);if(!disabled)setOpen(true);};
 const scope=next=>{setScopeMode(next);setScopeValue((next==='institution'?scopes.institutions:scopes.regions)[0]?.value||'');};
 const download=async()=>{if(busy)return;setBusy(true);try{const result=await downloadReportExcel({uc,resultMode,scopeMode,scopeValue,groupBy,reviews,ruleConfigs});toast(`${title}已导出为 Excel`);close();}catch(error){toast(error?.message||'导出失败，请重试');}finally{setBusy(false);}};
 const radios=(name,value,onChange,items)=><div className="report-export-choices">{items.map(([key,label])=><label key={key} className={value===key?'is-selected':''}><input type="radio" name={`${uid}-${name}`} value={key} checked={value===key} onChange={()=>onChange(key)}/><span>{label}</span></label>)}</div>;
 return <><button ref={buttonRef} type="button" className="report-export-trigger" data-export-uc={uc} aria-label={`下载${title} Excel`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?`${uid}-panel`:undefined} disabled={disabled||busy} onPointerEnter={enter} onPointerLeave={leave} onClick={()=>{clearTimeout(timer.current);if(open&&pinned)close();else{setOpen(true);setPinned(true);}}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setPinned(true);requestAnimationFrame(()=>panelRef.current?.querySelector('input')?.focus());}}}><Ic icon="download"/></button>
 {open&&createPortal(<section ref={panelRef} id={`${uid}-panel`} className="report-export-panel" role="dialog" aria-modal="false" aria-labelledby={`${uid}-title`} style={position} onPointerDown={()=>setPinned(true)} onPointerEnter={()=>clearTimeout(timer.current)} onPointerLeave={leave}><header><strong id={`${uid}-title`}>导出 Excel</strong><span>.xlsx</span></header>
  <fieldset><legend>导出内容</legend>{radios('result',resultMode,setResultMode,[['violations','仅导出违规'],['all','导出所有']])}</fieldset>
  <fieldset><legend>导出范围</legend>{radios('scope',scopeMode,scope,[['all','全部范围'],['institution','指定机构'],['region','指定区域']])}{scopeMode!=='all'&&<div className="report-export-scope-field"><NativeSelect aria-label={scopeMode==='institution'?'选择导出机构':'选择导出区域'} value={scopeValue} onChange={e=>setScopeValue(e.target.value)} style={{width:'100%'}}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></div>}</fieldset>
  <fieldset><legend>生成维度</legend>{radios('group',groupBy,setGroupBy,[['device','按设备生成'],['rule','按规则生成']])}</fieldset>
  <footer><small>当前报告范围 · 支持离线导出</small><button type="button" className="report-export-submit" disabled={busy||(scopeMode!=='all'&&!scopeValue)} onClick={download}>{busy?'正在生成…':'下载 Excel'}</button></footer>
 </section>,document.body)}</>;
}
