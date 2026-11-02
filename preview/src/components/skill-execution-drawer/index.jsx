import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Button,Checkbox,DatePicker,Empty,Input} from 'antd';
import dayjs from 'dayjs';
import {useApp} from '../../context.jsx';
import {centerNames} from '../../mock/task-registry.js';
import OptionGroup from '../option-group/index.jsx';
import DataTable from '../data-table/index.jsx';
import {Icon} from '../../../assets/shared/icon.jsx';
import {NativeSelect} from '../form-controls/select.jsx';
import {resolveCssLength,readCssLength} from '../../lib/css-length.js';
import './index.css';
import './table-layout.css';

function Ic({icon}){return <Icon name={icon} size="1rem"/>;}
const names={inspection:'网络配置检查',generation:'网络配置生成',fault:'网络故障治理'};
const states={all:'全部状态','awaiting-review':'待人工核验',analyzing:'分析中',running:'执行中',paused:'已暂停',completed:'已完成'};
const initial={query:'',status:'all',center:'all',uc:'all',skill:'all',focus:'all',from:'',to:''};
const dateText=value=>new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
// 技能统计与“待您关注”复用同一任务列表，category 只决定入口的初始筛选。
export default function SkillExecutionDrawer({category,onClose}){
 const {networkTasks}=useApp();
 const statusLabels={all:'全部',manual:'待您接管',processing:'处置中',completed:'已完成'};
 const taskStatus=task=>task.status==='awaiting-review'?'manual':task.status==='completed'?'completed':'processing';
 const entryFilters=()=>({...initial,skill:names[category]?category:'all',focus:category==='attention'?'open':'all'});
 // draft 保存待提交查询，filters 驱动列表；状态和技能快捷筛选同时更新两者。
 const [filters,setFilters]=useState(entryFilters),[draft,setDraft]=useState(entryFilters),[advanced,setAdvanced]=useState(false),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[tableSort,setTableSort]=useState({columnKey:'updatedAt',order:'descend'}),[detail,setDetail]=useState(null),[closing,setClosing]=useState(false);
 const panel=useRef(null),closeButton=useRef(null),timer=useRef(null),returnFocus=useRef(null),tableRef=useRef(null);
 const [tableHeight,setTableHeight]=useState(320),[tableMinWidth,setTableMinWidth]=useState(1040);
 const close=()=>{if(closing)return;setClosing(true);timer.current=setTimeout(onClose,200);};
 // 抽屉接管并归还焦点；下拉菜单打开时，先让菜单处理 Escape 和 Tab。
 useEffect(()=>{returnFocus.current=document.activeElement;closeButton.current?.focus({preventScroll:true});const key=e=>{if(e.key==='Escape'&&!document.querySelector('.ui-kit-options,.ant-dropdown:not(.ant-dropdown-hidden),.ant-select-dropdown:not(.ant-select-dropdown-hidden),.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')){e.preventDefault();close();}if(e.key==='Tab'&&panel.current&&!document.querySelector('.ui-kit-options,.ant-dropdown:not(.ant-dropdown-hidden),.ant-select-dropdown:not(.ant-select-dropdown-hidden),.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')){const controls=[...panel.current.querySelectorAll('button,input,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{clearTimeout(timer.current);document.removeEventListener('keydown',key);returnFocus.current?.focus({preventScroll:true});};},[]);
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
 }).sort((a,b)=>(Number(b.status==='awaiting-review')-Number(a.status==='awaiting-review'))||(b.updatedAt-a.updatedAt)||a.id.localeCompare(b.id)),[networkTasks,filters]);
 const safePage=Math.min(page,Math.max(1,Math.ceil(rows.length/pageSize))),active=Object.entries(filters).filter(([key,value])=>value&&value!=='all');
 const invalid=Boolean(draft.from&&draft.to&&draft.from>draft.to);
 const apply=e=>{e?.preventDefault();if(invalid)return;setFilters({...draft});setPage(1);setDetail(null);};
 const reset=()=>{setDraft(initial);setFilters(initial);setPage(1);setDetail(null);};
 const selectStatus=value=>{setFilters(old=>({...old,status:value}));setDraft(old=>({...old,status:value}));setPage(1);setDetail(null);};
 const patch=(key,value)=>setDraft(old=>({...old,[key]:value}));
 // 只测量剩余空间；排序、列筛选、展开行与分页交给标准 Table。
 useEffect(()=>{
  const host=tableRef.current;if(!host)return;
  const update=()=>{
   const header=host.querySelector('.ant-table-thead'),pager=host.querySelector('.ant-pagination');
   const margins=pager?parseFloat(getComputedStyle(pager).marginTop)+parseFloat(getComputedStyle(pager).marginBottom):0;
   // Measure unscaled layout pixels, then resolve semantic spacing for the remaining gutter.
   const height=Math.max(resolveCssLength(host,'2.5rem',40),host.clientHeight-(header?.offsetHeight||resolveCssLength(host,'2.5rem',40))-(pager?.offsetHeight||resolveCssLength(host,'2rem',32))-margins-readCssLength(host,'--spacing-3',12));
   setTableMinWidth(resolveCssLength(host,'65rem',1040));
   setTableHeight(old=>Math.abs(old-height)>1?height:old);
  };
  const observer=new ResizeObserver(update);observer.observe(host);for(const node of host.querySelectorAll('.ant-table-thead,.ant-pagination'))observer.observe(node);update();return()=>observer.disconnect();
 },[advanced,rows.length,pageSize]);
 const toggleDetail=task=>setDetail(current=>current===task.id?null:task.id);
 const order=key=>tableSort.columnKey===key?tableSort.order:null;
 const compare=key=>(a,b)=>String(a[key]||'').localeCompare(String(b[key]||''),'zh-CN');
 const columns=[
  {title:'任务名称',dataIndex:'title',key:'title',sorter:compare('title'),sortOrder:order('title'),render:(_,task)=><div className="skill-task-title-cell"><a className="skill-task-name" title={eventMap.get(task.id)?.title||task.title} href="#task-detail" aria-expanded={detail===task.id} onClick={event=>{event.preventDefault();toggleDetail(task);}}>{eventMap.get(task.id)?.title||task.title}</a></div>},
  {title:'执行范围',dataIndex:'scope',key:'center',sorter:compare('scope'),sortOrder:order('center'),filters:[{text:'全网',value:'global'},...Object.entries(centerNames).map(([value,text])=>({value,text}))],filterMultiple:false,filteredValue:filters.center==='all'?null:[filters.center],onFilter:(value,task)=>(task.centerId||'global')===value},
  {title:'执行状态',dataIndex:'status',key:'status',sorter:compare('status'),sortOrder:order('status'),filters:Object.entries(statusLabels).filter(([value])=>value!=='all').map(([value,text])=>({value,text})),filterMultiple:false,filteredValue:filters.status==='all'?null:[filters.status],onFilter:(value,task)=>taskStatus(task)===value,render:(_,task)=><span className={'skill-task-state '+task.status}><i/>{states[task.status]||task.status}</span>},
  {title:'执行进度',dataIndex:'progress',key:'progress',align:'left',onHeaderCell:()=>({style:{textAlign:'left'}}),sorter:(a,b)=>(Number(a.progress)||0)-(Number(b.progress)||0),sortOrder:order('progress'),render:(value,task)=><div className="skill-task-progress-cell"><div className="skill-task-progress"><span><i style={{width:Math.min(100,Math.max(0,Number(value)||0))+'%'}}/></span><b>{Math.min(100,Math.max(0,Number(value)||0))}%</b></div><small title={task.phase}>{task.phase}</small></div>},
  {title:'更新时间',dataIndex:'updatedAt',key:'updatedAt',width:'10rem',sortOrder:order('updatedAt'),sorter:(a,b,direction)=>{const priority=Number(b.status==='awaiting-review')-Number(a.status==='awaiting-review');return priority*(direction==='descend'?-1:1)||a.updatedAt-b.updatedAt;},render:dateText},
  {title:'操作',key:'action',width:'4.5rem',render:(_,task)=><a className="skill-task-action" href="#task-detail" aria-label={(detail===task.id?'收起任务：':'查看任务：')+task.id} title={detail===task.id?'收起任务详情':'查看任务详情'} onClick={event=>{event.preventDefault();toggleDetail(task);}}><Icon name={detail===task.id?'chevron-up':'eye'} size="0.875rem"/></a>},
 ];
 const changeTable=(pagination,columnFilters,sorter,extra)=>{
  setDetail(null);
  if(extra.action==='filter'){
   const patch={center:columnFilters.center?.[0]||'all',status:columnFilters.status?.[0]||'all'};
   setFilters(old=>({...old,...patch}));setDraft(old=>({...old,...patch}));setPage(1);
  }else if(extra.action==='sort'){setTableSort({columnKey:sorter.columnKey,order:sorter.order});setPage(1);}
  else{setPage(pagination.current||1);setPageSize(pagination.pageSize||10);}
 };
 return createPortal(<div className={'skill-execution-overlay'+(closing?' is-closing':'')} onPointerDown={e=>{if(e.target===e.currentTarget)close();}}>
  <section ref={panel} className="skill-execution-drawer" role="dialog" aria-modal="true" aria-labelledby="skill-execution-title">
   <header className="skill-execution-header"><div><span>任务中心</span><h2 id="skill-execution-title">任务执行列表</h2></div><button ref={closeButton} type="button" aria-label="关闭任务执行列表" onClick={close}><Ic icon="x"/></button></header>
   <div className="skill-attention-statusbar"><OptionGroup cls="skill-attention-status-filters" ariaLabel="任务状态筛选" options={Object.entries(statusLabels).map(([value,label])=>[value,label,value==='all'?tasks.length:tasks.filter(task=>taskStatus(task)===value).length])} value={filters.status} onChange={selectStatus} renderOption={option=><><i className={option[0]}/>{option[1]}<strong>{option[2]}</strong></>}/></div>
   <form className="skill-execution-search" onSubmit={apply}>
    <div className="skill-execution-tools"><Input className="skill-execution-query" style={{width:'100%'}} aria-label="搜索技能任务" placeholder="搜索任务名称或执行范围" value={draft.query} allowClear suffix={<Icon name="search" size="0.875rem"/>} onChange={event=>patch('query',event.target.value)} onPressEnter={apply}/><NativeSelect aria-label="任务技能筛选" value={filters.skill} onChange={e=>{const skill=e.target.value;setFilters(old=>({...old,skill,uc:'all'}));setDraft(old=>({...old,skill,uc:'all'}));setPage(1);setDetail(null);}}><option value="all">全部技能</option>{Object.entries(names).map(([id,label])=><option key={id} value={id}>{label}</option>)}</NativeSelect><Button className="skill-execution-action" type="primary" htmlType="submit" disabled={invalid}>搜索</Button><Button className="skill-execution-action" htmlType="button" aria-expanded={advanced} aria-controls="skill-advanced-search" onClick={()=>setAdvanced(!advanced)}>高级搜索</Button></div>
    {advanced&&<div id="skill-advanced-search" className="skill-execution-advanced">
     <div className="skill-execution-advanced-field"><label htmlFor="skill-task-center">数据中心</label><NativeSelect id="skill-task-center" aria-label="技能任务数据中心" value={draft.center} onChange={e=>patch('center',e.target.value)}><option value="all">全部数据中心</option><option value="global">全网</option>{Object.entries(centerNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</NativeSelect></div>
     <div className="skill-execution-advanced-field"><label htmlFor="skill-task-type">任务类型</label><NativeSelect id="skill-task-type" aria-label="技能任务类型" value={draft.uc} onChange={e=>patch('uc',e.target.value)}><option value="all">全部类型</option>{[...new Map(allTasks.map(t=>[t.uc||'fault',t.kind==='rule-query'?'规则查询':t.kind==='baseline-mining'?'黄金基线挖掘':t.kind==='rule-creation'?'规则生成':t.kind==='compliance-check'?'配置基线检查':'故障治理'])).entries()].map(([id,name])=><option key={id} value={id}>{name}</option>)}</NativeSelect></div>
     <div className="skill-execution-advanced-field skill-execution-date-field"><label htmlFor="skill-task-date-from">更新时间</label><DatePicker.RangePicker id={{start:'skill-task-date-from',end:'skill-task-date-to'}} aria-label="任务更新时间范围" style={{width:'100%'}} format="YYYY-MM-DD" placeholder={['开始日期','结束日期']} allowClear allowEmpty={[true,true]}
      value={draft.from||draft.to?[draft.from?dayjs(draft.from):null,draft.to?dayjs(draft.to):null]:null} status={invalid?'error':undefined}
      onChange={(_,dates)=>setDraft(old=>({...old,from:dates?.[0]||'',to:dates?.[1]||''}))} getPopupContainer={trigger=>trigger?.closest('.skill-execution-drawer')||document.body}/>
      {invalid&&<p className="skill-execution-date-error" role="alert">结束日期不能早于开始日期</p>}
     </div>
    </div>}
   </form>
   <div className="skill-execution-filterline"><Checkbox className="skill-attention-toggle" checked={filters.focus==='open'} onChange={e=>{const focus=e.target.checked?'open':'all';setFilters(old=>({...old,focus}));setDraft(old=>({...old,focus}));setPage(1);setDetail(null);}}>仅待您关注</Checkbox><span role="status">匹配 <b>{rows.length}</b> 条任务</span>{active.map(([key,value])=><button type="button" key={key} onClick={()=>{setFilters(old=>({...old,[key]:initial[key]}));setDraft(old=>({...old,[key]:initial[key]}));setPage(1);}} aria-label={'移除筛选：'+(filterLabel(key,value))}>{key==='from'?'起始：':key==='to'?'截止：':''}{filterLabel(key,value)}<Ic icon="x"/></button>)}{active.length>0&&<button type="button" className="skill-clear" onClick={reset}>清除筛选</button>}</div>
   <div className="skill-execution-table-wrap" ref={tableRef} role="region" aria-label="技能执行任务表格">
    <DataTable className="skill-execution-data-table" density="comfortable" fillHeight tableLayout="auto" rowKey="id" columns={columns} dataSource={rows}
     scroll={{x:tableMinWidth,y:tableHeight}} onChange={changeTable}
     pagination={{current:safePage,pageSize,total:rows.length}}
     expandable={{showExpandColumn:false,expandedRowKeys:detail?[detail]:[],expandedRowRender:task=><TaskDetail task={task} event={eventMap.get(task.id)}/>}}
     locale={{emptyText:<Empty description="没有匹配的任务"><a href="#clear-filters" onClick={event=>{event.preventDefault();reset();}}>清除筛选</a></Empty>}}/>
   </div>
  </section>
 </div>,document.getElementById('stage')||document.body);
}
function TaskDetail({task,event}){
 const resultLabels={deviceCount:'设备',ruleCount:'规则',testCount:'测试样本',passedDevices:'通过设备',failedDevices:'异常设备'};
 const result=task.result?Object.entries(task.result).filter(([key])=>resultLabels[key]).map(([key,value])=>resultLabels[key]+' '+value).join(' · ')||'任务已完成，结果摘要已保留':task.status==='paused'?'任务已暂停，等待继续处理':'任务执行中，结果生成后更新';
 return <dl className="skill-task-detail-content"><div><dt>任务描述</dt><dd>{event?.detail||task.prompt||task.title}</dd></div><div><dt>当前阶段</dt><dd>{task.phase} · {states[task.status]||task.status}</dd></div><div><dt>执行结果</dt><dd>{result}</dd></div></dl>;
}
