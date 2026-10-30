import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useApp} from '../../context.jsx';
import {centerNames} from '../../mock/task-registry.js';
import OptionGroup from '../option-group/index.jsx';
import CanvasPagination from '../canvas-pagination/index.jsx';
import {NativeSelect} from '../form-controls/select.jsx';
import './index.css';

function Ic({icon}){const paths={x:'M6 6l12 12M18 6L6 18',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0','chevron-down':'M6 9l6 6 6-6','chevron-up':'M6 15l6-6 6 6','arrow-down-up':'M7 3v18m-4-4 4 4 4-4M17 21V3m-4 4 4-4 4 4'};return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[icon]}/></svg>;}
const names={inspection:'网络配置检查',generation:'网络配置生成',fault:'网络故障治理'};
const states={all:'全部状态','awaiting-review':'待人工核验',analyzing:'分析中',running:'执行中',paused:'已暂停',completed:'已完成'};
const initial={query:'',status:'all',center:'all',uc:'all',skill:'all',focus:'all',from:'',to:''};
const dateText=value=>new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
export default function SkillExecutionDrawer({category,onClose}){
 const {networkTasks}=useApp();
 const statusLabels={all:'全部',manual:'待您接管',processing:'处置中',completed:'已完成'};
 const taskStatus=task=>task.status==='awaiting-review'?'manual':task.status==='completed'?'completed':'processing';
 const entryFilters=()=>({...initial,skill:names[category]?category:'all',focus:category==='attention'?'open':'all'});
 const [filters,setFilters]=useState(entryFilters),[draft,setDraft]=useState(entryFilters),[advanced,setAdvanced]=useState(false),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[sort,setSort]=useState('desc'),[detail,setDetail]=useState(null),[closing,setClosing]=useState(false);
 const panel=useRef(null),closeButton=useRef(null),timer=useRef(null),returnFocus=useRef(null);
 const close=()=>{if(closing)return;setClosing(true);timer.current=setTimeout(onClose,200);};
 useEffect(()=>{returnFocus.current=document.activeElement;closeButton.current?.focus({preventScroll:true});const key=e=>{if(e.key==='Escape'&&!document.querySelector('.ui-kit-options')){e.preventDefault();close();}if(e.key==='Tab'&&panel.current&&!document.querySelector('.ui-kit-options')){const controls=[...panel.current.querySelectorAll('button,input,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{clearTimeout(timer.current);document.removeEventListener('keydown',key);returnFocus.current?.focus({preventScroll:true});};},[]);
 const eventMap=new Map(networkTasks.events.filter(event=>event.status!=='completed').map(event=>[event.id,event]));
 const allTasks=networkTasks.tasks.filter(task=>task.status!=='cancelled');
 const tasks=allTasks.filter(task=>(filters.skill==='all'||task.category===filters.skill)&&(filters.focus!=='open'||eventMap.has(task.id)));
 const filterLabel=(key,value)=>key==='skill'?names[value]:key==='focus'?'待您关注':statusLabels[value]||centerNames[value]||value;
 const rows=useMemo(()=>tasks.filter(task=>{
  if(filters.status!=='all'&&taskStatus(task)!==filters.status)return false;
  if(filters.center!=='all'&&(task.centerId||'global')!==filters.center)return false;
  if(filters.uc!=='all'&&(task.uc||'fault')!==filters.uc)return false;
  if(filters.from&&task.updatedAt<new Date(filters.from+'T00:00:00').getTime())return false;
  if(filters.to&&task.updatedAt>=new Date(filters.to+'T00:00:00').getTime()+86400000)return false;
  const text=[task.id,task.title,task.scope,task.phase,task.prompt].join(' ').toLowerCase();return text.includes(filters.query.trim().toLowerCase());
 }).sort((a,b)=>(Number(b.status==='awaiting-review')-Number(a.status==='awaiting-review'))||(sort==='desc'?-1:1)*(a.updatedAt-b.updatedAt)||a.id.localeCompare(b.id)),[networkTasks,filters,sort]);
 const safePage=Math.min(page,Math.max(1,Math.ceil(rows.length/pageSize))),visible=rows.slice((safePage-1)*pageSize,safePage*pageSize),active=Object.entries(filters).filter(([key,value])=>value&&value!=='all');
 const invalid=Boolean(draft.from&&draft.to&&draft.from>draft.to);
 const apply=e=>{e?.preventDefault();if(invalid)return;setFilters({...draft});setPage(1);setDetail(null);};
 const reset=()=>{setDraft(initial);setFilters(initial);setPage(1);setDetail(null);};
 const selectStatus=value=>{setFilters(old=>({...old,status:value}));setDraft(old=>({...old,status:value}));setPage(1);setDetail(null);};
 const patch=(key,value)=>setDraft(old=>({...old,[key]:value}));
 return createPortal(<div className={'skill-execution-overlay'+(closing?' is-closing':'')} onPointerDown={e=>{if(e.target===e.currentTarget)close();}}>
  <section ref={panel} className="skill-execution-drawer" role="dialog" aria-modal="true" aria-labelledby="skill-execution-title">
   <header className="skill-execution-header"><div><span>任务中心</span><h2 id="skill-execution-title">任务执行列表</h2></div><button ref={closeButton} type="button" aria-label="关闭任务执行列表" onClick={close}><Ic icon="x"/></button></header>
   <div className="skill-attention-statusbar"><OptionGroup cls="skill-attention-status-filters" ariaLabel="任务状态筛选" options={Object.entries(statusLabels).map(([value,label])=>[value,label,value==='all'?tasks.length:tasks.filter(task=>taskStatus(task)===value).length])} value={filters.status} onChange={selectStatus} renderOption={option=><><i className={option[0]}/>{option[1]}<strong>{option[2]}</strong></>}/></div>
   <form className="skill-execution-search" onSubmit={apply}>
    <div className="skill-execution-tools"><label className="skill-execution-query"><Ic icon="search"/><input aria-label="搜索技能任务" placeholder="搜索任务名称、编号或执行范围" value={draft.query} onChange={e=>patch('query',e.target.value)}/></label><NativeSelect aria-label="任务技能筛选" value={filters.skill} onChange={e=>{const skill=e.target.value;setFilters(old=>({...old,skill,uc:'all'}));setDraft(old=>({...old,skill,uc:'all'}));setPage(1);setDetail(null);}}><option value="all">全部技能</option>{Object.entries(names).map(([id,label])=><option key={id} value={id}>{label}</option>)}</NativeSelect><button className="skill-primary" type="submit" disabled={invalid}>搜索</button><button type="button" aria-expanded={advanced} aria-controls="skill-advanced-search" onClick={()=>setAdvanced(!advanced)}>高级搜索<Ic icon={advanced?'chevron-up':'chevron-down'}/></button></div>
    {advanced&&<div id="skill-advanced-search" className="skill-execution-advanced"><label>数据中心<NativeSelect aria-label="技能任务数据中心" value={draft.center} onChange={e=>patch('center',e.target.value)}><option value="all">全部数据中心</option><option value="global">全网</option>{Object.entries(centerNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</NativeSelect></label><label>任务类型<NativeSelect aria-label="技能任务类型" value={draft.uc} onChange={e=>patch('uc',e.target.value)}><option value="all">全部类型</option>{[...new Map(allTasks.map(t=>[t.uc||'fault',t.kind==='rule-query'?'规则查询':t.kind==='baseline-mining'?'黄金基线挖掘':t.kind==='rule-creation'?'规则生成':t.kind==='compliance-check'?'配置基线检查':'故障治理'])).entries()].map(([id,name])=><option key={id} value={id}>{name}</option>)}</NativeSelect></label><label>更新时间 · 开始<input type="date" aria-label="任务开始日期" value={draft.from} onChange={e=>patch('from',e.target.value)}/></label><label>更新时间 · 结束<input type="date" aria-label="任务结束日期" value={draft.to} min={draft.from||undefined} onChange={e=>patch('to',e.target.value)}/></label>{invalid&&<p role="alert">结束日期不能早于开始日期</p>}</div>}
   </form>
   <label className="skill-attention-toggle"><input type="checkbox" checked={filters.focus==='open'} onChange={e=>{const focus=e.target.checked?'open':'all';setFilters(old=>({...old,focus}));setDraft(old=>({...old,focus}));setPage(1);setDetail(null);}}/>仅待您关注</label>
   <div className="skill-execution-filterline"><span role="status">匹配 <b>{rows.length}</b> 条任务</span>{active.map(([key,value])=><button type="button" key={key} onClick={()=>{setFilters(old=>({...old,[key]:initial[key]}));setDraft(old=>({...old,[key]:initial[key]}));setPage(1);}} aria-label={'移除筛选：'+(filterLabel(key,value))}>{key==='from'?'起始：':key==='to'?'截止：':''}{filterLabel(key,value)}<Ic icon="x"/></button>)}{active.length>0&&<button type="button" className="skill-clear" onClick={reset}>清除筛选</button>}</div>
   <div className="skill-execution-table-wrap" role="region" aria-label="技能执行任务表格" tabIndex="0"><table className="skill-execution-table"><colgroup><col style={{width:'28%'}}/><col style={{width:'16%'}}/><col style={{width:'15%'}}/><col style={{width:'17%'}}/><col style={{width:'16%'}}/><col style={{width:'8%'}}/></colgroup><thead><tr><th>任务名称 / 编号</th><th>执行范围</th><th>执行状态</th><th>执行进度</th><th aria-sort={sort==='desc'?'descending':'ascending'}><button type="button" onClick={()=>{setSort(sort==='desc'?'asc':'desc');setPage(1);}}>更新时间<Ic icon="arrow-down-up"/></button></th><th>操作</th></tr></thead><tbody>{visible.map(task=><TaskRow key={task.id} task={task} event={eventMap.get(task.id)} expanded={detail===task.id} onToggle={()=>setDetail(detail===task.id?null:task.id)}/>)}{!visible.length&&<tr><td colSpan="6"><div className="skill-execution-empty"><Ic icon="search"/><h3>没有匹配的任务</h3><p>请调整搜索条件，或清除筛选查看全部任务。</p><button type="button" onClick={reset}>清除筛选</button></div></td></tr>}</tbody></table></div>
   <CanvasPagination total={rows.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} label="任务"/>
  </section>
 </div>,document.getElementById('stage')||document.body);
}
function TaskRow({task,event,expanded,onToggle}){
 const progress=Math.min(100,Math.max(0,Number(task.progress)||0));
 return <><tr className={expanded?'is-selected':''}><td><button className="skill-task-name" onClick={onToggle} type="button" aria-expanded={expanded}>{event?.title||task.title}</button><small title={task.id}>{task.id}</small></td><td>{task.scope||'全网'}</td><td><span className={'skill-task-state '+task.status}><i/>{states[task.status]||task.status}</span></td><td><div className="skill-task-progress"><span><i style={{width:progress+'%'}}/></span><b>{progress}%</b></div><small>{task.phase}</small></td><td>{dateText(task.updatedAt)}</td><td><button type="button" className="skill-task-link" aria-label={(expanded?'收起任务：':'查看任务：')+task.id} onClick={onToggle}>{expanded?'收起':'详情'}</button></td></tr>{expanded&&<tr className="skill-execution-detail"><td colSpan="6"><dl><div><dt>任务描述</dt><dd>{event?.detail||task.prompt||task.title}</dd></div><div><dt>当前阶段</dt><dd>{task.phase} · {states[task.status]||task.status}</dd></div><div><dt>执行结果</dt><dd>{task.result?Object.entries(task.result).filter(([key])=>({deviceCount:1,ruleCount:1,testCount:1,passedDevices:1,failedDevices:1})[key]).map(([key,value])=>({deviceCount:'设备',ruleCount:'规则',testCount:'测试样本',passedDevices:'通过设备',failedDevices:'异常设备'})[key]+' '+value).join(' · ')||'任务已完成，结果摘要已保留':task.status==='paused'?'任务已暂停，等待继续处理':'任务执行中，结果生成后更新'}</dd></div></dl></td></tr>}</>;
}
