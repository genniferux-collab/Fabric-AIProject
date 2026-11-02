import ReportExport from '../../components/report-export/index.jsx';
import DataTable from '../../components/data-table/index.jsx';
import SegmentedBar from '../../components/segmented-bar/index.jsx';
import {Input,Select,Empty} from 'antd';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useApp} from '../../context.jsx';
import {uc2Rules,uc2ReportEvidence} from '../../mock/uc2.js';
import {Icon} from '../../../assets/shared/icon.jsx';
import {resolveCssLength} from '../../utils/css-length.js';
import './report-visual.css';
import './table-layout.css';
import {useUc2ReportReveal} from './report-generation.jsx';

const statuses={pending:'待审阅',accepted:'已采纳',rejected:'暂不采用'};
const order=['GB-002','GB-005','GB-012','GB-001','GB-004','GB-009'];
const roles=['通用','核心交换机','Leaf 交换机'];
const roleLabel=role=>role==='通用'?'共性':role;
const scopeLabel=rule=>rule.role==='通用'?'全部设备':rule.role==='Leaf 交换机'?'业务区Leaf':rule.role;
const confirmation=rule=>uc2ReportEvidence[rule.id]?.note||(rule.deviations?`${rule.deviations}台存在配置差异，需核验角色与业务规划`:'—');
const compareText=(left,right)=>String(left).localeCompare(String(right),'zh-CN',{numeric:true});
const defaultFilters={role:'全部角色',confidence:'全部置信度',status:'all',query:''};

export default function Uc2CandidateList({embedded=false}){
  const {classAt}=useUc2ReportReveal();
  const {uc2,uc2SetFilter,uc2OpenRule,uc2Reviews,uc2RuleConfigs}=useApp();
  const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[scopeFilters,setScopeFilters]=useState([]);
  const tableHost=useRef(null),[bodyHeight,setBodyHeight]=useState(240),[tableMinWidth,setTableMinWidth]=useState(1000);
  const status=uc2.status||'all',query=uc2.query||'',confidence=uc2.confidence||'全部置信度',role=uc2.role||'全部角色';
  const review=rule=>uc2Reviews[rule.id]||'pending';
  // 报告内嵌与独立页签共用图表筛选和审阅状态；Table 管理当前列表的排序与分页。
  const rows=uc2Rules.map(rule=>({...rule,name:uc2RuleConfigs[rule.id]?.name||rule.name,reviewStatus:review(rule)}))
    .filter(rule=>(status==='all'||rule.reviewStatus===status)&&(confidence==='全部置信度'||rule.confidence===confidence)&&(role==='全部角色'||rule.role===role)&&(rule.name+' '+rule.id+' '+rule.category).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99)||a.id.localeCompare(b.id));
  const total=rows.filter(rule=>!scopeFilters.length||scopeFilters.includes(scopeLabel(rule))).length;
  const current=Math.min(page,Math.max(1,Math.ceil(total/pageSize)));
  useEffect(()=>setPage(1),[status,query,confidence,role]);
  // 只测量可用表体高度，标准表头、列筛选和分页继续由 Antd 渲染。
  useLayoutEffect(()=>{
    const host=tableHost.current;if(!host)return;
    const measure=()=>{
      if(!host.clientHeight)return;
      const header=host.querySelector('.ant-table-header'),pagination=host.querySelector('.ant-pagination');
      const style=pagination?getComputedStyle(pagination):null;
      // offsetHeight is in layout pixels; the outer PC preview may apply a transform.
      const reserved=(header?.offsetHeight||resolveCssLength(host,'3.5rem',56))+(pagination?pagination.offsetHeight+parseFloat(style.marginTop||0)+parseFloat(style.marginBottom||0):resolveCssLength(host,'4rem',64));
      setBodyHeight(Math.max(resolveCssLength(host,'2.5rem',40),Math.floor(host.clientHeight-reserved-2)));
      setTableMinWidth(resolveCssLength(host,'62.5rem',1000));
    };
    const observer=new ResizeObserver(measure);observer.observe(host);
    for(const node of host.querySelectorAll('.ant-table-header,.ant-pagination'))observer.observe(node);
    measure();return()=>observer.disconnect();
  },[embedded,pageSize,total]);
  const patch=value=>{uc2SetFilter(value);setPage(1);};
  const clearFilters=()=>{setScopeFilters([]);patch(defaultFilters);};
  const open=rule=>uc2OpenRule(rule.id,embedded?'uc2-report':'uc2-rules');
  const changeTable=(pagination,filters,sorter,extra)=>{
    const nextRole=filters.role?.[0]||'全部角色',nextStatus=filters.reviewStatus?.[0]||'all';
    setScopeFilters(filters.scope||[]);
    if(nextRole!==role||nextStatus!==status)uc2SetFilter({role:nextRole,status:nextStatus});
    setPage(extra.action==='paginate'?pagination.current||1:1);
    setPageSize(pagination.pageSize||pageSize);
  };
  const columns=[
    {title:'候选规则',key:'name',dataIndex:'name',sorter:(a,b)=>compareText(a.name,b.name),render:(name,rule)=><div className="uc2-candidate-name"><div><a href="#" onClick={event=>{event.preventDefault();open(rule);}} title={name}>{name}</a>{['GB-002','GB-005','GB-012'].includes(rule.id)&&<span className="baseline-rule-priority">优先</span>}</div><small>{uc2ReportEvidence[rule.id]?.category||rule.category}</small></div>},
    {title:'类型',key:'role',dataIndex:'role',sorter:(a,b)=>compareText(roleLabel(a.role),roleLabel(b.role)),filters:roles.map(value=>({text:roleLabel(value),value})),filterMultiple:false,filteredValue:role==='全部角色'?null:[role],onFilter:(value,rule)=>rule.role===value,render:roleLabel},
    {title:'适用范围',key:'scope',sorter:(a,b)=>compareText(scopeLabel(a),scopeLabel(b)),filters:roles.map(role=>({text:scopeLabel({role}),value:scopeLabel({role})})),filteredValue:scopeFilters.length?scopeFilters:null,onFilter:(value,rule)=>scopeLabel(rule)===value,render:(_,rule)=>scopeLabel(rule)},
    {title:'支持样本',key:'support',dataIndex:'support',align:'left',sorter:(a,b)=>a.support/a.scope-b.support/b.scope,render:(_,rule)=><div className="uc2-candidate-support"><span className="uc2-candidate-support-track" role="img" aria-label={`${rule.support}台支持，${rule.deviations}台存在差异`}><SegmentedBar segments={[{id:'support',value:rule.support,color:'var(--baseline-support-blue)',minWidth:'1px'},...(rule.deviations>0?[{id:'deviation',value:rule.deviations,color:'var(--error)',minWidth:'4px'}]:[])]}/></span><strong>{rule.support}<em>/{rule.scope}</em></strong></div>},
    {title:'待确认事项',key:'confirmation',sorter:(a,b)=>compareText(confirmation(a),confirmation(b)),render:(_,rule)=><span className="uc2-candidate-confirmation" title={confirmation(rule)}>{confirmation(rule)}</span>},
    {title:'审阅状态',key:'reviewStatus',dataIndex:'reviewStatus',sorter:(a,b)=>compareText(statuses[a.reviewStatus],statuses[b.reviewStatus]),filters:Object.entries(statuses).map(([value,text])=>({text,value})),filterMultiple:false,filteredValue:status==='all'?null:[status],onFilter:(value,rule)=>rule.reviewStatus===value,render:value=><span className={'baseline-review-state '+value}><i/>{statuses[value]}</span>},
    {title:'操作',key:'actions',width:'5.5rem',align:'left',render:(_,rule)=><span className="uc2-candidate-actions" role="button" tabIndex={0} aria-label={`审阅候选规则：${rule.name}`} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open(rule);}}}><Icon name="square-pen" size="0.875rem" title={`审阅候选规则：${rule.name}`} onClick={()=>open(rule)}/></span>},
  ];
  const activeFilters=query||role!=='全部角色'||confidence!=='全部置信度'||status!=='all'||scopeFilters.length>0;
  return <section className={'baseline-rule-list baseline-antd-list'+(embedded?' is-embedded':'')+classAt(.68)} id={embedded?'uc2ReportRuleList':'uc2RuleList'} aria-label={embedded?'报告候选规则':'全部候选规则'}>
    {!embedded&&<header className="baseline-list-heading"><div><Icon name="file-text" size="0.875rem"/><h2>全部候选规则</h2><span>西三旗 DC · 配置快照 S-1027</span></div><div><ReportExport uc="uc2" reviews={uc2Reviews} ruleConfigs={uc2RuleConfigs}/></div></header>}
    <h3>候选规则</h3><p className="baseline-rule-scope"><span>本轮样本 <b>100</b></span><span aria-hidden="true">/</span><span>全网 <b>1980</b> 台</span></p>
    <div className="baseline-rule-status" role="group" aria-label="候选规则审阅状态筛选">{[['all','全部'],['pending','待审阅'],['accepted','已采纳'],...(uc2Rules.some(rule=>review(rule)==='rejected')?[['rejected','暂不采用']]:[])].map(([value,label])=><button type="button" key={value} aria-pressed={status===value} className={value} onClick={()=>patch({status:value})}>{value!=='all'&&<i/>}{label}<b>{value==='all'?uc2Rules.length:uc2Rules.filter(rule=>review(rule)===value).length}</b></button>)}</div>
    <div className="baseline-rule-tools"><Input className="uc2-candidate-search" aria-label={embedded?'搜索报告候选规则':'搜索全部候选规则'} value={query} onChange={event=>patch({query:event.target.value})} onPressEnter={()=>setPage(1)} placeholder="搜索规则名称、编号或分类" allowClear suffix={<Icon name="search" size="0.875rem"/>}/><Select className="uc2-candidate-confidence" aria-label="候选规则置信度筛选" value={confidence} onChange={value=>patch({confidence:value})} options={[{value:'全部置信度',label:'全部规则'},{value:'高',label:'高置信（95%–99%）'},{value:'中',label:'中置信度（94%–90%）'}]}/>{role!=='全部角色'&&<button type="button" className="baseline-filter-chip" aria-label="清除角色筛选" onClick={()=>patch({role:'全部角色'})}>{roleLabel(role)}<Icon name="x" size="0.75rem"/></button>}{activeFilters&&<a href="#" className="baseline-clear-filters" onClick={event=>{event.preventDefault();clearFilters();}}>清除筛选 · {total} 条</a>}</div>
    <div className="uc2-candidate-table-region" ref={tableHost} role="region" aria-label={embedded?'报告候选规则明细':'全部候选规则明细'}>
      <DataTable className="uc2-candidate-table" density="comfortable" fillHeight columns={columns} dataSource={rows} rowKey="id" tableLayout="auto" scroll={{x:tableMinWidth,y:bodyHeight}} pagination={{current,pageSize,total,pageSizeOptions:[10,20,50]}} onChange={changeTable} rowClassName={(rule,index)=>classAt(.78+index*.018).trim()} onRow={rule=>({'data-rule-id':rule.id})} locale={{emptyText:<Empty description="没有匹配的候选规则"><a href="#" onClick={event=>{event.preventDefault();clearFilters();}}>清除筛选，查看全部</a></Empty>}}/>
    </div>
  </section>;
}
