import {Button} from 'antd';
import {Icon} from '../../../assets/shared/icon.jsx';
import CanvasStepTitle from '../../components/canvas-step-title.jsx';
import ResponsiveBeam from '../../components/responsive-beam/index.jsx';
import {matchingBeamPaletteCss} from '../mapping-card/beam-palette.js';
import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {useApp} from '../../context.jsx';
import './index.css';


function GraphAction({label,icon,source,onActivate,disabled=false,className=''}){
 return <span className={className} role="button" tabIndex={disabled?-1:0} aria-label={label} aria-disabled={disabled||undefined} onKeyDown={event=>{if(!disabled&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onActivate();}}}><Icon name={icon} src={source} size="0.875rem" title={label} onClick={()=>{if(!disabled)onActivate();}}/></span>;
}

function RuleGlyph({icon,className=''}){
 const assets={'file-text':'scope','circle-slash':'exclude',filter:'limit','alarm-clock':'decision','circle-x':'fail','circle-check':'pass','clipboard-check':'result','book-open':'command',settings:'defaults','sliders-horizontal':'threshold'};
 return <img className={'uc3-design-icon '+className} src={'./assets/uploads/uc3-rule/'+assets[icon]+'.svg'} alt="" aria-hidden="true"/>;
}

const nodes=[
 {key:'scope',title:'检查范围',icon:'file-text',x:38,y:240,w:160,lines:['全部配置','遍历全部视图块']},
 {key:'exclude',title:'排除检查',icon:'circle-slash',x:258,y:24,w:240,lines:['NETCONF / RESTCONF / gRPC','同名 idle-timeout 不检查']},
 {key:'limit',title:'限定检查范围',icon:'filter',x:258,y:240,w:240,lines:['user-interface','VTY / CONSOLE / AUX','直接子命令 idle-timeout']},
 {key:'decision',title:'超过 10 分钟？',icon:'alarm-clock',x:558,y:240,w:240,lines:['仅判断显式配置','分钟与秒数共同判定']},
 {key:'fail',title:'不合规条件',icon:'circle-x',x:898,y:24,w:240,tone:'fail',lines:['分钟 ≥ 11','或分钟 = 10 且秒 ≠ 0','示例 15 0 / 100 / 10 30']},
 {key:'pass',title:'合规条件',icon:'circle-check',x:898,y:240,w:240,tone:'pass',lines:['仅判断显式配置','分钟与秒数共同判定']},
 {key:'result',title:'整份配置结果',icon:'clipboard-check',x:898,y:464,w:240,lines:['任一 FAIL → FAIL，否则 PASS']}
];
const evidence=[
 {title:'命令依据',icon:'book-open',tone:'blue',lines:['华为命令手册 · 用户接口视图','idle-timeout minutes [seconds]','省略秒数按 0 处理']},
 {title:'默认值依据',icon:'settings',tone:'cyan',lines:['VTY 10 分钟 · CONSOLE 5 分钟','AUX 默认值依据待补充','未配置按当前规则判 PASS']},
 {title:'阈值口径',icon:'sliders-horizontal',tone:'violet',lines:['10 分 30 秒 > 10 分钟 → FAIL','按实际时长判断，包含秒数','依据所提供规则整理']}
];

const nodeDelays={scope:0,limit:850,exclude:1550,decision:2350,fail:3200,pass:3950,result:4800};
function Graph({ready}){
 const {isDark}=useApp();
 const ref=useRef(null),markerPrefix='uc3-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const [width,setWidth]=useState(1192),[manualScale,setManualScale]=useState(null);
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const measure=()=>setWidth(el.clientWidth);const ro=new ResizeObserver(measure);ro.observe(el);measure();return()=>ro.disconnect();},[]);
 // Scale this diagram only. A readable floor prevents labels shrinking with a narrow pane.
 const scale=manualScale??Math.min(1,Math.max(.86,width/1192));
 const changeZoom=delta=>setManualScale(Math.max(.5,Math.min(1.5,Math.round((scale+delta)*100)/100)));
 const showTools=width<1192||manualScale!==null;
 return <div className={'uc3-graph'+(showTools?' has-zoom-tools':'')}>
  {showTools&&<div className="uc3-graph-controls" aria-label="规则图谱缩放"><span>规则图谱</span><div><GraphAction className="uc3-zoom-action" label="缩小规则图谱" icon="minus" disabled={scale<=.5} onActivate={()=>changeZoom(-.1)}/><output aria-label="图谱缩放比例">{Math.round(scale*100)}%</output><GraphAction className="uc3-zoom-action" label="放大规则图谱" icon="plus" disabled={scale>=1.5} onActivate={()=>changeZoom(.1)}/><Button onClick={()=>setManualScale(Math.min(1,width/1192))}>适应宽度</Button><Button onClick={()=>setManualScale(null)}>重置</Button></div></div>}
  <div ref={ref} className={'uc3-graph-viewport'+(!ready?' is-building':'')} style={{height:620*scale}} tabIndex={0} aria-label="空闲超时检查规则流程图，可横向滚动" aria-busy={!ready}>
  <div className="uc3-graph-extent" style={{width:1192*scale,height:620*scale}}>
  <div className="uc3-graph-layout" style={{transform:`scale(${scale})`}}>
   <svg className="uc3-graph-edges" width="1192" height="620" viewBox="0 0 1192 620" fill="none" aria-hidden="true">
    <defs>{['neutral','fail','pass'].map((tone,i)=><marker key={tone} id={markerPrefix+'-arrow-'+tone} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6Z" fill={['#777','#a73c46','#308365'][i]}/></marker>)}</defs>
    <g stroke="#777" strokeWidth="1" markerEnd={'url(#'+markerPrefix+'-arrow-neutral)'}><path className="uc3-growing-edge" pathLength="1" style={{"--edge-delay":"350ms"}} d="M198 312H258"/><path className="uc3-growing-edge" pathLength="1" style={{"--edge-delay":"1850ms"}} d="M498 312H558"/><path className="uc3-growing-edge" pathLength="1" style={{"--edge-delay":"1900ms"}} d="M378 168V240" strokeDasharray="2 3"/><path className="uc3-growing-edge" pathLength="1" style={{"--edge-delay":"3300ms"}} d="M378 384V440Q378 460 398 460H828Q848 460 848 440V356Q848 336 868 336H898"/><path className="uc3-growing-edge" pathLength="1" style={{"--edge-delay":"4250ms"}} d="M1138 92H1164Q1184 92 1184 112V498Q1184 518 1164 518H1138"/><path className="uc3-growing-edge" pathLength="1" style={{"--edge-delay":"4250ms"}} d="M1018 384V464"/></g>
    <path className="uc3-growing-edge" pathLength="1" style={{"--edge-delay":"2700ms"}} d="M798 288H828Q848 288 848 268V150Q848 130 868 130H898" stroke="#a73c46" markerEnd={'url(#'+markerPrefix+'-arrow-fail)'}/>
    <path className="uc3-growing-edge" pathLength="1" style={{"--edge-delay":"3450ms"}} d="M798 312H898" stroke="#308365" markerEnd={'url(#'+markerPrefix+'-arrow-pass)'}/>
   </svg>
   {nodes.map((node,i)=><section key={node.key} className={'uc3-graph-node '+(node.tone||'neutral')} style={{left:node.x,top:node.y,width:node.w,'--reveal-delay':`${nodeDelays[node.key]}ms`}} aria-label={node.title}>
    {!ready&&<div className="uc3-node-intelligence" aria-hidden="true"><ResponsiveBeam size="md" colorVariant="colorful" strength={0.7} duration={1.6} borderRadius="1rem" active theme={isDark?"dark":"light"} css={matchingBeamPaletteCss(isDark)} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}><span/></ResponsiveBeam></div>}<header><RuleGlyph icon={node.icon}/><h3>{node.title}</h3></header><div className="uc3-graph-node-body">{node.lines.map(line=><p key={line}>{line}</p>)}</div>
   </section>)}
   <span className="uc3-edge-label" style={{left:835,top:201,'--label-delay':'3100ms'}}><span>是</span></span><span className="uc3-edge-label" style={{left:835,top:300,'--label-delay':'3800ms'}}><span>否</span></span><span className="uc3-edge-label pill" style={{left:573,top:450,'--label-delay':'3750ms'}}><span>未显式配置</span></span>
  </div>
  </div>
  </div>
 </div>;
}

export default function Uc3RuleCanvas({cardRef}){
 const {uc3Phase,openArtifact}=useApp();const [ready,setReady]=useState(false);const name='用户接口空闲超时时间检查规则图谱';
 // ready 只控制本图谱的构建光效收尾，不推进外部工作流阶段。
 useEffect(()=>{if(uc3Phase<3){setReady(false);return;}const timer=setTimeout(()=>setReady(true),6600);return()=>clearTimeout(timer);},[uc3Phase>=3]);
 return <section className="workflow-canvas-step uc3-rule-step" aria-label="规则图谱"><CanvasStepTitle kind="uc3Rule">规则图谱</CanvasStepTitle>
  <section ref={cardRef} className="card uc3-rule-canvas" data-artifact-kind="uc3Rule" tabIndex={0} aria-label={name}>
   <header className="uc3-rule-heading"><img src="./assets/uploads/uc3-rule/title.svg" style={{width:"1rem",height:"1rem"}} alt=""/><h2>{name}</h2><span className="uc3-rule-version">V1.0.1</span><div className="uc3-rule-tools"><span className="uc3-rule-tests">{uc3Phase>=4?'正反测试：7/7':'正反测试中…'}</span><GraphAction className="icon-btn" label="编辑规则配置" source="./assets/uploads/uc3-rule/edit.svg" onActivate={()=>openArtifact("uc3-editor","规则配置编辑")}/><GraphAction className="icon-btn v7-open-card-tab" label="新开页签：巡检规则示意图" source="./assets/uploads/uc3-rule/open.svg" onActivate={()=>openArtifact("uc3Rule","巡检规则示意图")}/></div></header>
   <Graph ready={ready}/>
   <section className={'uc3-rule-evidence'+(!ready?' is-building':'')} aria-labelledby="uc3EvidenceTitle"><h3 id="uc3EvidenceTitle">依据与假设</h3><div className="uc3-evidence-grid">{evidence.map(item=><section className="uc3-evidence-card" key={item.title}><header><RuleGlyph icon={item.icon} className={item.tone}/><h4>{item.title}</h4></header>{item.lines.map(line=><p key={line}>{line}</p>)}</section>)}</div></section>
  </section>
 </section>;
}
