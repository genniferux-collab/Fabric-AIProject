import CanvasPagination from '../../components/canvas-pagination/index.jsx';
import {NativeSelect} from '../../components/form-controls/select.jsx';
import { useEffect, useMemo, useState } from 'react';
import {useApp} from '../../context.jsx';
import Ic from '../../components/icon-el/index.jsx';
import ArtifactOpen from '../../components/artifact-open/index.jsx';
import { uc1Categories, uc1Rules, uc1Sources } from '../../mock/uc1-rules.js';
import './index.css';
const sourceLabel={factory:'出厂预置',ai:'AI挖掘',custom:'用户自定义'};
export default function Uc1RulesCanvas({cardRef}){
 const {uc1SummaryStage}=useApp();const ready=uc1SummaryStage>=11;const [revealedRows,setRevealedRows]=useState(0);
 useEffect(()=>{if(uc1SummaryStage<8){setRevealedRows(0);return;}const timers=Array.from({length:10},(_,i)=>setTimeout(()=>setRevealedRows(i+1),i*140));return()=>timers.forEach(clearTimeout);},[uc1SummaryStage>=8]);
 const [source,setSource]=useState('all'),[search,setSearch]=useState(''),[category,setCategory]=useState('all'),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10);
 const filtered=useMemo(()=>uc1Rules.filter(r=>(source==='all'||r.source===source)&&(category==='all'||r.category===category)&&(!search.trim()||[r.name,r.category,r.vendor,r.model,r.description].join(' ').toLowerCase().includes(search.trim().toLowerCase()))),[source,category,search]);
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const visible=filtered.slice((page-1)*pageSize,page*pageSize);
 useEffect(()=>setPage(1),[source,category,search,pageSize]);
 useEffect(()=>{if(page>pages)setPage(pages);},[page,pages]);
 return <section className="workflow-canvas-step uc1-rules-step" aria-label="检查规则详情"><div className="v7-artifact-step-title">规则检查完成</div>
 <section className={"card uc1-rules-canvas"+(!ready?" is-loading":"")} aria-busy={!ready} ref={cardRef} data-artifact-kind="uc1Rules" tabIndex={0} aria-label="检查规则详情 V1.0.1">
  <header className="uc1-rules-heading"><img src="./assets/uploads/lui-report-file.svg" width="16" height="16" alt=""/><h2>检查规则详情</h2><span className="uc1-rule-version">V1.0.1</span><ArtifactOpen kind="uc1Rules" title="检查规则详情"/></header>
  <div inert={!ready?"":undefined} className="uc1-source-cards" aria-label="按规则来源筛选">{uc1Sources.map((item,i)=><button type="button" className={'uc1-source-card'+(source===item.key?' selected':'')+(uc1SummaryStage<([3,6,7,8][i])?' is-skeleton':' is-revealed')} aria-pressed={source===item.key} key={item.key} onClick={()=>setSource(item.key)}><img src={'./assets/uploads/uc1-rules/'+item.key+'.svg'} width="36" height="36" alt=""/><span><strong>{item.count}</strong><span>{item.label}</span></span></button>)}</div>
  <div inert={!ready?"":undefined} className={"uc1-rules-toolbar"+(uc1SummaryStage<5?" is-skeleton":" is-revealed")}><label className="uc1-rules-search"><Ic icon="search"/><input type="search" aria-label="搜索检查规则" placeholder="请输入搜索内容" value={search} onChange={e=>setSearch(e.target.value)}/></label><NativeSelect aria-label="规则类别" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">全部类别</option>{uc1Categories.map(c=><option key={c}>{c}</option>)}</NativeSelect></div>
  <div inert={!ready?"":undefined} className="uc1-rule-list" aria-live="polite">{visible.length?visible.map((rule,index)=><article className={'uc1-rule-row'+(!ready&&index>=revealedRows?' is-skeleton':' is-revealed')} key={rule.id} aria-label={rule.name}><div className="uc1-rule-row-heading"><h3>{rule.name}</h3><div className="uc1-rule-badges"><span>已引用</span><span>已审核</span></div></div><dl className="uc1-rule-metadata"><div><dt>类型：</dt><dd>{sourceLabel[rule.source]}</dd><dt>版本：</dt><dd>{rule.version}</dd></div><div><dt>描述：</dt><dd title={rule.description}>{rule.description}</dd><dt>创建人：</dt><dd>{rule.creator}</dd></div><div><dt>设备厂商：</dt><dd>{rule.vendor}</dd><dt>设备型号：</dt><dd>{rule.model}</dd></div><div><dt>违反规则等级：</dt><dd><i/>{rule.priority}</dd><dt>创建时间：</dt><dd>{rule.createdAt}</dd></div></dl></article>):<div className="uc1-rule-empty" role="status"><img src="./assets/uploads/uc1-rules/no-data.svg" width="124" height="100" alt=""/><p>暂无数据</p></div>}</div>
  <CanvasPagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} label="检查规则"/>
 </section></section>;
}
