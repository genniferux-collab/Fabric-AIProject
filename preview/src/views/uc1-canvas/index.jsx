import {Checkbox,Input,Pagination} from 'antd';
import {Icon} from '../../../assets/shared/icon.jsx';
import EmptyState from '../../components/empty-state/index.jsx';
import CanvasStepTitle from '../../components/canvas-step-title.jsx';
import {NativeSelect} from '../../components/form-controls/select.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import {useApp} from '../../context.jsx';
import ArtifactOpen from '../../components/artifact-open/index.jsx';
import { uc1Categories, uc1Rules, uc1Sources } from '../../mock/uc1-rules.js';
import './index.css';
const sourceLabel={factory:'出厂预置',ai:'AI挖掘',custom:'用户自定义'};
function RuleCheckbox({label,checked,mixed,onChange,disabled=false,children}){return <Checkbox className="uc1-rule-checkbox" aria-label={label} checked={checked} indeterminate={Boolean(mixed)} onChange={onChange} disabled={disabled}>{children}</Checkbox>;}
export default function Uc1RulesCanvas({cardRef}){
 // 左侧流式结论同步控制骨架与可操作状态，避免画布提前解除 inert。
 const {uc1SummaryStage}=useApp();const ready=uc1SummaryStage>=11;const [revealedRows,setRevealedRows]=useState(0);
 useEffect(()=>{if(uc1SummaryStage<8){setRevealedRows(0);return;}const timers=Array.from({length:10},(_,i)=>setTimeout(()=>setRevealedRows(i+1),i*140));return()=>timers.forEach(clearTimeout);},[uc1SummaryStage>=8]);
 const [source,setSource]=useState('all'),[search,setSearch]=useState(''),[category,setCategory]=useState('all'),[selected,setSelected]=useState(()=>new Set()),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10);
 const filtered=useMemo(()=>uc1Rules.filter(r=>(source==='all'||r.source===source)&&(category==='all'||r.category===category)&&(!search.trim()||[r.name,r.category,r.vendor,r.model,r.description].join(' ').toLowerCase().includes(search.trim().toLowerCase()))),[source,category,search]);
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const visible=filtered.slice((page-1)*pageSize,page*pageSize);
 useEffect(()=>setPage(1),[source,category,search,pageSize]);
 useEffect(()=>{if(page>pages)setPage(pages);},[page,pages]);
 const count=filtered.filter(r=>selected.has(r.id)).length,all=filtered.length>0&&count===filtered.length;
 // 全选面向全部筛选结果而非当前分页；切换筛选仍保留已选规则 ID。
 const selectAll=()=>setSelected(prev=>{const next=new Set(prev);for(const r of filtered)all?next.delete(r.id):next.add(r.id);return next;});
 const toggle=id=>setSelected(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});
 const listRef=useRef(null);
 const navigate=(next,size=pageSize)=>{setPageSize(size);setPage(size===pageSize?Math.max(1,Math.min(Math.ceil(filtered.length/size)||1,next)):1);listRef.current?.scrollTo({top:0});};
 return <section className="workflow-canvas-step uc1-rules-step" aria-label="检查规则详情"><CanvasStepTitle kind="uc1Rules">规则检查完成</CanvasStepTitle>
 <section className={"card uc1-rules-canvas"+(!ready?" is-loading":"")} aria-busy={!ready} ref={cardRef} data-artifact-kind="uc1Rules" tabIndex={0} aria-label="检查规则详情 V1.0.1">
  <header className="uc1-rules-heading"><img src="./assets/uploads/lui-report-file.svg" width="16" height="16" alt=""/><h2>检查规则详情</h2><span className="uc1-rule-version">V1.0.1</span><ArtifactOpen kind="uc1Rules" title="检查规则详情"/></header>
  <div inert={!ready?"":undefined} className="uc1-source-cards" aria-label="按规则来源筛选">{uc1Sources.map((item,i)=><button type="button" className={'uc1-source-card'+(source===item.key?' selected':'')+(uc1SummaryStage<([3,6,7,8][i])?' is-skeleton':' is-revealed')} aria-pressed={source===item.key} key={item.key} onClick={()=>setSource(item.key)}><img src={'./assets/uploads/uc1-rules/'+item.key+'.svg'} width="36" height="36" alt=""/><span><strong>{item.count}</strong><span>{item.label}</span></span></button>)}</div>
  <div inert={!ready?"":undefined} className={"uc1-rules-toolbar"+(uc1SummaryStage<5?" is-skeleton":" is-revealed")}><Input className="uc1-rules-keyword" style={{width:"100%"}} aria-label="搜索检查规则" placeholder="搜索规则名称、分类、厂商或型号" value={search} onChange={e=>setSearch(e.target.value)} onPressEnter={()=>{setPage(1);listRef.current?.scrollTo({top:0});}} suffix={<Icon name="search" size="0.875rem"/>} allowClear/><NativeSelect aria-label="规则类别" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">全部类别</option>{uc1Categories.map(c=><option key={c}>{c}</option>)}</NativeSelect><div className={"uc1-select-all"+(!filtered.length?" is-disabled":"")}><RuleCheckbox label="全部选择检查规则" checked={all} mixed={count>0&&!all} onChange={selectAll} disabled={!filtered.length}>全部选择</RuleCheckbox></div></div>
  <div ref={listRef} inert={!ready?"":undefined} className="uc1-rule-list" aria-live="polite">{visible.length?visible.map((rule,index)=><article className={'uc1-rule-row'+(selected.has(rule.id)?' selected':'')+(!ready&&index>=revealedRows?' is-skeleton':' is-revealed')} key={rule.id} aria-label={rule.name}><div className="uc1-rule-row-heading"><RuleCheckbox label={'选择规则：'+rule.name} checked={selected.has(rule.id)} onChange={()=>toggle(rule.id)}/><h3>{rule.name}</h3><div className="uc1-rule-badges"><span>已引用</span><span>已审核</span></div></div><dl className="uc1-rule-metadata"><div><dt>类型：</dt><dd>{sourceLabel[rule.source]}</dd><dt>版本：</dt><dd>{rule.version}</dd></div><div><dt>描述：</dt><dd title={rule.description}>{rule.description}</dd><dt>创建人：</dt><dd>{rule.creator}</dd></div><div><dt>设备厂商：</dt><dd>{rule.vendor}</dd><dt>设备型号：</dt><dd>{rule.model}</dd></div><div><dt>违反规则等级：</dt><dd><i/>{rule.priority}</dd><dt>创建时间：</dt><dd>{rule.createdAt}</dd></div></dl></article>):<EmptyState text="暂无数据" cls="uc1-rule-empty"/>}</div>
  {filtered.length>0&&<footer inert={!ready?"":undefined} className={"uc1-rule-pagination"+(!ready?" is-skeleton":" is-revealed")}><Pagination style={{width:'100%',margin:0}} current={page} total={filtered.length} pageSize={pageSize} pageSizeOptions={[10,20,50]} showTotal={total=>`总记录数：${total} 已选中行数：${selected.size}`} showSizeChanger showQuickJumper={{goButton:'跳转'}} onChange={navigate}/></footer>}
 </section></section>;
}
