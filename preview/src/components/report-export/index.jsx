import {useEffect,useId,useRef,useState} from 'react';
import {Button,Popover,Radio} from 'antd';
import {Icon} from '../../../assets/shared/icon.jsx';
import {useApp} from '../../context.jsx';
import {NativeSelect} from '../form-controls/select.jsx';
import {getReportExportScopes,downloadReportExcel} from '../../utils/report-export.js';
import './index.css';

// UC2/UC4 共用导出选项；弹层只负责收集受控字段，Excel 模型仍由 utils/report-export 生成。
export default function ReportExport({uc,reviews,ruleConfigs,disabled=false}){
 const {toast}=useApp(),uid=useId(),buttonRef=useRef(null),panelRef=useRef(null),timer=useRef(null);
 const pinned=useRef(false),busyRef=useRef(false);
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 const [resultMode,setResultMode]=useState('violations'),[scopeMode,setScopeMode]=useState('all'),[scopeValue,setScopeValue]=useState(''),[groupBy,setGroupBy]=useState('device');
 const scopes=getReportExportScopes(uc),options=scopeMode==='institution'?scopes.institutions:scopeMode==='region'?scopes.regions:[];
 const title=uc==='uc2'?'黄金基线报告':'基线检查报告';
 const close=(focus=false)=>{clearTimeout(timer.current);setOpen(false);pinned.current=false;if(focus)buttonRef.current?.focus({preventScroll:true});};
 const pin=()=>{clearTimeout(timer.current);pinned.current=true;};
 useEffect(()=>{
  if(!open)return;
  const outside=e=>{if(!buttonRef.current?.contains(e.target)&&!panelRef.current?.contains(e.target)&&!e.target.closest?.('.ant-select-dropdown,.ui-kit-options'))close();};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();close(true);}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
 },[open]);
 useEffect(()=>{if(disabled)close();},[disabled]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 // Popover 只承担定位和渲染；悬浮暂开、点击固定及离开延迟仍使用同一组受控状态。
 const leave=()=>{clearTimeout(timer.current);if(!pinned.current&&!busyRef.current)timer.current=setTimeout(()=>{if(!pinned.current&&!busyRef.current)setOpen(false);},240);};
 const enter=()=>{clearTimeout(timer.current);if(!disabled)setOpen(true);};
 const scope=next=>{setScopeMode(next);setScopeValue((next==='institution'?scopes.institutions:scopes.regions)[0]?.value||'');};
 // 同步锁先于 React 更新生效，防止同一帧触发两次离线文件生成。
 const download=async()=>{
  if(busyRef.current||disabled||(scopeMode!=='all'&&!scopeValue))return;
  busyRef.current=true;clearTimeout(timer.current);setBusy(true);
  try{await downloadReportExcel({uc,resultMode,scopeMode,scopeValue,groupBy,reviews,ruleConfigs});toast(`${title}已导出为 Excel`);close();}
  catch(error){toast(error?.message||'导出失败，请重试');}
  finally{busyRef.current=false;setBusy(false);}
 };
 const content=<section ref={panelRef} id={`${uid}-panel`} className="report-export-panel" role="dialog" aria-modal="false" aria-labelledby={`${uid}-title`} onPointerDown={pin} onPointerEnter={()=>clearTimeout(timer.current)} onPointerLeave={leave}>
  <header><strong id={`${uid}-title`}>导出 Excel</strong><span>.xlsx</span></header>
  <fieldset><legend id={`${uid}-result`}>导出内容</legend><Radio.Group className="report-export-choices" aria-labelledby={`${uid}-result`} name={`${uid}-result`} value={resultMode} onChange={e=>setResultMode(e.target.value)} disabled={busy} options={[{value:'violations',label:'仅导出违规'},{value:'all',label:'导出所有'}]}/></fieldset>
  <fieldset><legend id={`${uid}-scope`}>导出范围</legend><Radio.Group className="report-export-choices" aria-labelledby={`${uid}-scope`} name={`${uid}-scope`} value={scopeMode} onChange={e=>scope(e.target.value)} disabled={busy} options={[{value:'all',label:'全部范围'},{value:'institution',label:'指定机构'},{value:'region',label:'指定区域'}]}/>{scopeMode!=='all'&&<div className="report-export-scope-field"><NativeSelect aria-label={scopeMode==='institution'?'选择导出机构':'选择导出区域'} value={scopeValue} onChange={e=>setScopeValue(e.target.value)} style={{width:'100%'}} disabled={busy}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></div>}</fieldset>
  <fieldset><legend id={`${uid}-group`}>生成维度</legend><Radio.Group className="report-export-choices" aria-labelledby={`${uid}-group`} name={`${uid}-group`} value={groupBy} onChange={e=>setGroupBy(e.target.value)} disabled={busy} options={[{value:'device',label:'按设备生成'},{value:'rule',label:'按规则生成'}]}/></fieldset>
  <footer><small>当前报告范围 · 支持离线导出</small><Button type="primary" loading={busy} disabled={busy||(scopeMode!=='all'&&!scopeValue)} onClick={download}>{busy?'正在生成…':'下载 Excel'}</Button></footer>
 </section>;
 return <Popover open={open&&!disabled} trigger={[]} placement="bottomRight" autoAdjustOverflow arrow={false} content={content} destroyOnHidden>
  <button ref={buttonRef} type="button" className="report-export-trigger" data-export-uc={uc} aria-label={`下载${title} Excel`} aria-haspopup="dialog" aria-expanded={open&&!disabled} aria-controls={open?`${uid}-panel`:undefined} disabled={disabled||busy} onPointerEnter={enter} onPointerLeave={leave} onClick={()=>{clearTimeout(timer.current);if(open&&pinned.current)close();else{setOpen(true);pin();}}} onKeyDown={e=>{if(e.key==='ArrowDown'&&!disabled){e.preventDefault();setOpen(true);pin();requestAnimationFrame(()=>panelRef.current?.querySelector('input')?.focus());}}}><Icon name="download" size="1rem"/></button>
 </Popover>;
}
