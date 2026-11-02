import { useEffect, useRef, useState } from 'react';
import { useApp, highlightLocate } from '../../context.jsx';
import LuiGlyph from './glyph.jsx';
import ResponseTools from './response-tools.jsx';
import {uc1SummaryCues,uc1SummaryEnd} from '../../mock/uc1-summary.js';
import Ic from '../../components/icon-el/index.jsx';
import DataTable from '../../components/data-table/index.jsx';
import { StreamText, MotionTitle, SoftHeight, RevealAfter, streamDuration } from './motion.jsx';
import './uc1-chat.css';

const thought='用户希望了解当前全网已有的检查规则。我需要从出厂预置、AI挖掘和用户自定义三个来源查询规则库，梳理规则分类、适用设备及管理状态，汇总现有规则体系，并识别可进一步完善的方向。';
const intro='已理解您的需求。我将从出厂预置、AI挖掘和用户自定义三个维度查询检查规则，汇总规则分布、适用范围及完善建议，下面开始执行。';
const conclusion='已完成规则查询任务，当前规则体系以出厂预置规则为主，尚缺少基于现网实际配置的AI挖掘规则。建议开展黄金基线自动挖掘，进一步完善规则覆盖。';
const steps=[
 {title:'意图分析',text:'已识别本次任务为全网检查规则查询，正在匹配规则管理能力，确定规则查询范围及统计维度。'},
 {title:'出厂预置规则查询',text:'基于华为长期网络运维经验沉淀的预置检查规则，查询到共90条预置规则。'},
 {title:'AI挖掘规则查询',text:'查询历史AI黄金基线挖掘记录及规则采纳情况，识别基于现网设备配置共性自动生成的检查规则，查询到共0条AI挖掘规则。'},
 {title:'用户自定义规则查询',text:'检索客户自主创建的检查规则，分析规则适用范围、检查条件及管理要求，识别客户特有的配置规范，查询到共2条自定义规则。'}
];
const factory=[['设备基础配置','26条','Sysname命名规范、NTP配置'],['安全管理网络与服务配置','32条','SSH安全登录、Telnet禁用、账号权限'],['管理网络与服务配置','12条','管理VRF、SNMP及日志服务配置'],['网络冗余与故障切换','20条','M-LAG双归、Monitor Link链路联动']];
const custom=[['西三旗DC NTP主备服务器配置检查','西三旗DC交换机'],['业务区日志服务器地址配置检查','业务区交换机']];
function RuleTable({headers,rows,label}){
 const data=rows.map((cells,index)=>({key:index,cells}));
 const columns=headers.map((header,index)=>({
  title:header,key:header,dataIndex:['cells',index],align:/数量|规则数/.test(header)?'right':'left',
  sorter:(a,b)=>String(a.cells[index]).localeCompare(String(b.cells[index]),'zh-CN',{numeric:true}),
  ...(/分类|范围/.test(header)?{filters:[...new Set(rows.map(row=>row[index]))].map(value=>({text:value,value})),onFilter:(value,row)=>row.cells[index]===value}:{})
 }));
 return <div className="uc1-table-wrap" role="region" aria-label={label}><DataTable columns={columns} dataSource={data} rowKey="key" pagination={false} size="middle" sortDirections={['ascend','descend','ascend']} showSorterTooltip={false}/></div>;
}
const sourceStats=[
 {key:'factory',source:'出厂预置规则',count:'90条'},
 {key:'ai',source:'AI挖掘规则',count:'0条'},
 {key:'custom',source:'用户自定义规则',count:'2条'}
];
function SourceSummaryTable(){
 const heading=uc1SummaryCues.find(c=>c.key==='tableHeading');
 const [readyCount,setReadyCount]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches?sourceStats.length:0);
 // 沿用结论 cue 的行级时序；只向 dataSource 增加已就绪行，让 Table 自己管理 tr。
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setReadyCount(sourceStats.length);return;}
  const timers=sourceStats.map((row,index)=>setTimeout(()=>setReadyCount(index+1),uc1SummaryCues.find(c=>c.key===row.key).delay-heading.delay));
  return()=>timers.forEach(clearTimeout);
 },[heading.delay]);
 const columns=[
  {key:'source',dataIndex:'source',title:<StreamText text="规则来源" granularity="character"/>,sorter:(a,b)=>a.source.localeCompare(b.source,'zh-CN'),filters:sourceStats.map(row=>({text:row.source,value:row.source})),onFilter:(value,row)=>row.source===value,render:value=><StreamText text={value} granularity="character"/>},
  {key:'count',dataIndex:'count',title:<StreamText text="规则数" delay={100} granularity="character"/>,align:'left',sorter:(a,b)=>parseInt(a.count,10)-parseInt(b.count,10),render:(value,row)=><StreamText text={value} delay={Math.ceil(row.source.length/48*1000)} granularity="character"/>}
 ];
 return <div className="uc1-table-wrap" role="region" aria-label="规则来源统计"><DataTable columns={columns} dataSource={sourceStats.slice(0,readyCount)} rowKey="key" pagination={false} size="middle" sortDirections={['ascend','descend','ascend']} showSorterTooltip={false} locale={{emptyText:null}}/></div>;
}
function StepExtra({index}){
 if(index===0)return <dl className="uc1-query-scope">{[['查询范围','全网检查规则库'],['规则来源','出厂预置、AI挖掘、用户自定义'],['查询维度','规则分类、数量、适用设备及管理状态'],['输出目标','规则清单、分类统计及完善建议']].map(([a,b])=><div key={a}><dt>{a}：</dt><dd>{b}</dd></div>)}</dl>;
 if(index===1)return <RuleTable headers={['规则分类','数量','典型检查内容']} rows={factory} label="出厂预置规则分类"/>;
 if(index===3)return <RuleTable headers={['规则名','适用范围']} rows={custom} label="用户自定义规则"/>;
 return null;
}
export default function Uc1Chat(){
 const {isDark,taskPrompt,locate,setUc1Phase,setUc1SummaryStage,luiFocus}=useApp();
 // -2 thinking, -1 transition copy, 0..3 sequential steps, 4 conclusion.
 const [phase,setPhase]=useState(-2),[expanded,setExpanded]=useState(true),[thoughtOpen,setThoughtOpen]=useState(true),[openSteps,setOpenSteps]=useState({}),[selected,setSelected]=useState(null);
 const root=useRef(null),startedAt=useRef(Date.now());
 const [replay,setReplay]=useState(0),[completedAt,setCompletedAt]=useState(null);
 const regenerate=()=>{startedAt.current=Date.now();setCompletedAt(null);setPhase(-2);setExpanded(true);setReplay(n=>n+1);};
 useEffect(()=>{const deadlines=[Math.max(2600,streamDuration(thought)+500),Math.max(2200,streamDuration(intro)+500),3500,4400,3200,4200];let elapsed=0;const timers=deadlines.map((ms,index)=>{elapsed+=ms;return setTimeout(()=>setPhase(index-1),elapsed);});return()=>timers.forEach(clearTimeout);},[replay]);
 useEffect(()=>{setThoughtOpen(phase===-2);setOpenSteps(phase>=0&&phase<4?{[phase]:true}:{});setSelected(phase>=0&&phase<4?phase:null);if(phase===4){setExpanded(false);setCompletedAt(Date.now());}},[phase]);
 // 将分析阶段通知画布；结论内统计的逐步呈现另由 summaryStage 同步。
 useEffect(()=>setUc1Phase(phase),[phase,setUc1Phase]);
 useEffect(()=>{if(luiFocus?.kind==='uc1Rules'&&luiFocus.target==='step'){setExpanded(true);setOpenSteps(value=>({...value,3:true}));setSelected(3);}},[luiFocus]);
 useEffect(()=>{if(luiFocus?.kind!=='uc1Rules')return;if(luiFocus.target==='step'&&(!expanded||!openSteps[3]))return;let frame=requestAnimationFrame(()=>{const target=root.current?.querySelector(luiFocus.target==='step'?'[data-step-index="3"]':'.uc1-rules-artifact');if(target){highlightLocate(target);target.scrollIntoView({block:'nearest',behavior:'smooth'});}});return()=>cancelAnimationFrame(frame);},[luiFocus,expanded,openSteps]);
 const done=phase===4;
 useEffect(()=>{if(!done){setUc1SummaryStage(-1);return;}const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced){setUc1SummaryStage(11);return;}setUc1SummaryStage(0);const timers=uc1SummaryCues.slice(1).map(c=>setTimeout(()=>setUc1SummaryStage(c.index),c.delay));timers.push(setTimeout(()=>setUc1SummaryStage(11),uc1SummaryEnd));return()=>timers.forEach(clearTimeout);},[done,setUc1SummaryStage]);
 const cue=key=>uc1SummaryCues.find(c=>c.key===key);
 const stream=(key,as='span')=><StreamText as={as} text={cue(key).text} delay={cue(key).delay} granularity="character"/>;
 return <div ref={root} className="uc1-conversation"><div className="user-msg">{taskPrompt}</div><article className={'generated-card'+(!expanded?' is-process-collapsed':'')} aria-label="全网检查规则查询回答"><SoftHeight>
  <div className="response-process"><button type="button" className="response-title" aria-expanded={expanded} aria-controls="uc1Workflow" onClick={()=>setExpanded(x=>!x)}><LuiGlyph name={done?'completed':'processing'} size="0.875rem"/><MotionTitle text={done?'已完成思考':'正在执行处置步骤'} active={!done}/><Ic variant={isDark?'filled':'lined'} icon={expanded?'chevron-up':'chevron-down'}/></button>
  <div className="response-steps" id="uc1Workflow" hidden={!expanded}>
   <details className="response-thought uc1-thought" open={thoughtOpen} onToggle={e=>{if(e.currentTarget.open!==thoughtOpen)setThoughtOpen(e.currentTarget.open);}}><summary><LuiGlyph name="thought" size="0.875rem"/><MotionTitle text={phase===-2?'正在思考':'已思考'} active={phase===-2}/><Ic variant={isDark?'filled':'lined'} icon="chevron-down"/></summary><StreamText as="p" text={thought} animate={phase===-2}/></details>
   {phase>=-1&&<StreamText as="p" className="response-intent" text={intro} animate={phase===-1}/>}
   <div className="steps workflow-steps uc1-workflow-steps">{steps.slice(0,Math.max(0,Math.min(phase+1,4))).map((step,index)=>{const current=phase===index,finished=phase>index,open=!!openSteps[index];const toggle=()=>{setSelected(index);setOpenSteps(x=>({...x,[index]:!x[index]}));};return <div className={'step '+(finished?'is-done':'is-running')+(selected===index?' is-selected':'')} key={step.title} data-step-index={index}><span className={'status '+(finished?'done':'running')} aria-label={finished?'已完成':'进行中'}><LuiGlyph name={finished?(selected===index?'step-selected':'step-done'):'step-running'} size="1rem"/></span><div className="step-heading"><button type="button" className="step-title" aria-expanded={open} onClick={toggle}><MotionTitle text={step.title} active={current}/></button><div className="step-actions"><button type="button" className="step-action" aria-label={(open?'收起':'展开')+'步骤：'+step.title} aria-expanded={open} onClick={toggle}><Ic variant={isDark?'filled':'lined'} icon={open?'chevron-up':'chevron-down'}/></button></div></div><div className="step-content" hidden={!open}><StreamText text={step.text} animate={current}/>{current?<RevealAfter delay={streamDuration(step.text)+150}><StepExtra index={index}/></RevealAfter>:<StepExtra index={index}/>}</div></div>;})}</div>
  </div></div>
  {done&&<section className="completion uc1-completion" aria-label="规则查询结论">{stream('conclusion','p')}{stream('heading','h3')}<ul className="uc1-stream-results">{['success','count','coverage'].map(key=><StreamText key={key} as="li" text={cue(key).text} delay={cue(key).delay} granularity="character"/>)}</ul><RevealAfter delay={cue('tableHeading').delay}><SourceSummaryTable/></RevealAfter><RevealAfter delay={cue('artifact').delay}><button type="button" className="v7-conclusion-card uc1-rules-artifact" onClick={()=>locate('uc1Rules')}><img className="v7-artifact-icon conclusion" src="./assets/uploads/lui-report-file.svg" style={{width:"1.75rem",height:"1.75rem"}} alt=""/><span className="v7-conclusion-copy"><strong>检查规则详情 <small>V1.0.1</small></strong><span>92条检查规则 · 分类统计与适用范围</span></span></button></RevealAfter><StreamText as="p" className="uc1-followup" text={cue('followup').text} delay={cue('followup').delay} granularity="character"/><RevealAfter delay={uc1SummaryEnd}><ResponseTools timestamp={completedAt?new Date(completedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).replace(/\//g,'-'):''} duration={completedAt?((completedAt-startedAt.current)/1000).toFixed(1):'0'} text={conclusion+'\n规则统计：共匹配92条检查规则。出厂预置90条，AI挖掘0条，用户自定义2条。'} onRegenerate={regenerate} onLocate={()=>locate('uc1Rules')} subject="规则查询" locateLabel="定位检查规则详情"/></RevealAfter></section>}
 </SoftHeight></article></div>;
}
