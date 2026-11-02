import {Button,Input,Radio} from 'antd';
import {useEffect,useRef,useState} from 'react';
import {useApp} from '../../context.jsx';
import {uc2RuleById} from '../../mock/uc2.js';
import Select from '../uc3-canvas/form-select.jsx';
import '../uc3-canvas/editor.css';
import '../uc3-canvas/form-kit.css';
import './rule-editor.css';
import {createRuleDraft,validateRuleDraft,testRuleDraft} from './rule-editor-model.js';

function Svg({name,size="0.875rem",className=''}){return <img src={'./assets/uploads/uc3-rule/editor-'+name+'.svg'} style={{width:size,height:size}} className={className} alt=""/>;}
function Row({label,children,error,fieldId,required=false}){return <div className="uc3-edit-row"><label className={"uc3-edit-label"+(required?" is-required":"")} htmlFor={fieldId}>{label}</label><div className="uc2-editor-field"><div className="uc3-edit-control">{children}</div>{error&&<p className="uc2-editor-field-error" id={fieldId?fieldId+"-error":undefined} role="alert" title={error}>{error}</p>}</div></div>;}
function Section({title,children}){const [open,setOpen]=useState(true);return <section className="uc3-edit-section"><button type="button" className="uc3-edit-section-title" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Svg name="collapse" className={open?'':'is-collapsed'}/><h2>{title}</h2></button><div hidden={!open}>{children}</div></section>;}
export default function Uc2RuleEditor({ruleId}){
 const {uc2RuleConfigs,uc2RuleEditorDraftsRef,uc2SaveRule,openArtifact,closeArtifact}=useApp();
 const rule=uc2RuleById(ruleId),timer=useRef(null),form=useRef(null);
 const [draft,setDraft]=useState(()=>uc2RuleEditorDraftsRef.current[ruleId]||uc2RuleConfigs[ruleId]||createRuleDraft(rule));
 const [errors,setErrors]=useState({}),[testing,setTesting]=useState(false),[testResult,setTestResult]=useState(null);
 // 草稿缓存与已保存配置分开，未保存输入不得直接改变候选的审阅状态。
 useEffect(()=>{uc2RuleEditorDraftsRef.current[ruleId]=draft;},[draft,ruleId]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 // 任何编辑都使此前测试失效，避免以旧测试结论采纳新条件。
 const update=(field,value)=>{clearTimeout(timer.current);setTesting(false);setTestResult(null);setErrors({});setDraft(current=>({...current,[field]:value,...(field==='trigger'?{conditions:current.conditions.map(condition=>({...condition,relation:value==='全部满足'?'且':'或'}))}:{})}));};
 const changeCondition=(id,key,value)=>key==='relation'?update('trigger',value==='且'?'全部满足':'任一满足'):update('conditions',draft.conditions.map(condition=>condition.id!==id?condition:{...condition,[key]:value,...(key==='field'?{expression:condition.expression.split('{{'+condition.field+'}}').join('{{'+value+'}}')}: {})}));
 const validate=()=>{const next=validateRuleDraft(draft,uc2RuleConfigs,ruleId);setErrors(next);if(Object.keys(next).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return false;}return true;};
 const runTest=()=>{if(!validate())return;setTesting(true);clearTimeout(timer.current);timer.current=setTimeout(()=>{setTestResult(testRuleDraft(draft,rule));setTesting(false);},750);};
 // 取消仅丢弃草稿并回到详情；保存须先校验，再由 context 完成采纳闭环。
 const cancel=()=>{delete uc2RuleEditorDraftsRef.current[ruleId];closeArtifact('uc2-edit:'+ruleId);openArtifact('uc2-rule:'+ruleId,uc2RuleConfigs[ruleId]?.name||rule.name);};
 const save=event=>{event.preventDefault();if(!validate())return;uc2SaveRule(ruleId,{...draft,name:draft.name.trim(),ruleId:draft.ruleId.trim()});};
 return <form ref={form} className="uc2-rule-editor-shell" aria-label="采纳候选规则编辑" onSubmit={save} noValidate data-design-node="76:350723">
  <div className="uc3-rule-editor uc2-rule-editor">
   <Section title="基本信息"><div className="uc3-edit-rows">
    <Row fieldId="uc2-rule-name" required label="规则名称" error={errors.name}><Input style={{width:"100%"}} id="uc2-rule-name" aria-label="规则名称" aria-required="true" status={errors.name?'error':undefined} aria-describedby={errors.name?'uc2-rule-name-error':undefined} aria-invalid={Boolean(errors.name)} maxLength={100} value={draft.name} onChange={e=>update('name',e.target.value)}/></Row>
    <Row label="影响级别"><Select style={{width:"100%"}} label="影响级别" priority value={draft.priority} onChange={value=>update('priority',value)} options={['最高优先级','高优先级','中优先级','低优先级']}/></Row>
    <Row fieldId="uc2-rule-id" required label="规则ID" error={errors.ruleId}><Input style={{width:"100%"}} id="uc2-rule-id" aria-label="规则ID" aria-required="true" status={errors.ruleId?'error':undefined} aria-describedby={errors.ruleId?'uc2-rule-id-error':undefined} aria-invalid={Boolean(errors.ruleId)} maxLength={80} value={draft.ruleId} onChange={e=>update('ruleId',e.target.value)}/></Row>
    <Row fieldId="uc2-rule-type" label="类型"><Input style={{width:"100%"}} id="uc2-rule-type" aria-label="类型" value={draft.type} readOnly/></Row>
    <Row label="测试"><span role="status" className={'uc3-edit-test-status'+(!testResult?' is-pending':'')+(testResult&&testResult.passed<testResult.total?' has-fail':'')}><i/>{testing?'正在测试…':testResult?`${testResult.passed===testResult.total?'测试通过':'测试未通过'}（${testResult.passed}/${testResult.total}）`:'待测试'}</span><Button className="uc3-edit-retest" disabled={testing} onClick={runTest} icon={<Svg name="rerun" size="1rem" className={testing?'is-spinning':''}/>}>{testing?'正在执行':testResult?'再次执行':'执行测试'}</Button></Row>
    {testResult&&testResult.passed<testResult.total&&<div className="uc2-editor-test-feedback" role="status">{testResult.results.filter(item=>!item.passed).map(item=><p key={item.name}>{item.name}与当前条件不一致，请检查判断条件或表达式。</p>)}</div>}
   </div></Section>
   <Section title="执行细则"><div className="uc3-edit-rows">
    <Row label="使用模式"><Select style={{width:"100%"}} label="使用模式" value={draft.mode} onChange={value=>update('mode',value)} options={['始终执行','满足条件时执行']}/></Row>
    <Row label="检查方式"><Select style={{width:"100%"}} label="检查方式" value={draft.method} onChange={value=>update('method',value)} options={['全局','指定视图']}/></Row>
    {draft.method==='指定视图'&&<Row fieldId="uc2-rule-view" label="视图路径" error={errors.viewPath}><Input style={{width:"100%"}} id="uc2-rule-view" aria-label="视图路径" status={errors.viewPath?'error':undefined} aria-describedby={errors.viewPath?'uc2-rule-view-error':undefined} aria-invalid={Boolean(errors.viewPath)} value={draft.viewPath||''} onChange={e=>update('viewPath',e.target.value)} placeholder="例如 user-interface vty 0 4"/></Row>}
    {draft.mode==='满足条件时执行'&&<Row fieldId="uc2-rule-precondition" label="执行前提" error={errors.precondition}><Input style={{width:"100%"}} id="uc2-rule-precondition" aria-label="执行前提" status={errors.precondition?'error':undefined} aria-describedby={errors.precondition?'uc2-rule-precondition-error':undefined} aria-invalid={Boolean(errors.precondition)} value={draft.precondition||''} onChange={e=>update('precondition',e.target.value)} placeholder="例如 设备角色为 Leaf 交换机"/></Row>}
    <Row label="判断条件" error={errors.conditions}><div className="uc2-editor-conditions"><div className="uc3-edit-trigger"><span>触发方式</span><Select style={{width:"100%"}} label="触发方式" value={draft.trigger} onChange={value=>update('trigger',value)} options={['全部满足','任一满足']}/></div>
     {draft.conditions.map((condition,index)=><section className="uc3-edit-condition" key={condition.id} aria-label={'条件'+(index+1)}><header><h3>条件{index+1}</h3><div className="uc2-editor-condition-actions">{draft.conditions.length>1&&<button type="button" aria-label={'移除条件'+(index+1)} onClick={()=>update('conditions',draft.conditions.filter(item=>item.id!==condition.id))}>×</button>}{index===0&&<button type="button" aria-label="添加条件" onClick={()=>update('conditions',[...draft.conditions,{id:Date.now(),field:'value',operator:'包含',value:'',relation:'且',expression:'{{value}}'}])}><Svg name="add"/></button>}</div></header>
      <div className="uc3-edit-condition-grid"><label>字段<Input style={{width:"100%"}} status={errors['condition-'+condition.id]?'error':undefined} aria-label={'条件'+(index+1)+'字段'} value={condition.field} onChange={e=>changeCondition(condition.id,'field',e.target.value)}/></label><label>运算符号<Select style={{width:"100%"}} label={'条件'+(index+1)+'运算符号'} value={condition.operator} onChange={value=>changeCondition(condition.id,'operator',value)} options={['包含','不包含','等于','正则匹配']}/></label><label>值<Input style={{width:"100%"}} status={errors['condition-'+condition.id]?'error':undefined} aria-label={'条件'+(index+1)+'值'} value={condition.value} onChange={e=>changeCondition(condition.id,'value',e.target.value)}/></label><fieldset><legend>条件关系</legend><Radio.Group className="uc3-edit-condition-relations" name={'uc2-rule-relation-'+condition.id} value={condition.relation} onChange={event=>changeCondition(condition.id,'relation',event.target.value)} options={['或','且'].map(value=>({label:value,value}))}/></fieldset></div>
      <div className="uc3-edit-expression"><label htmlFor={'uc2-expression-'+ruleId+'-'+condition.id}>表达式预览</label><Input.TextArea id={'uc2-expression-'+ruleId+'-'+condition.id} style={{width:"100%",height:"4rem",resize:"vertical"}} aria-label={'条件'+(index+1)+'表达式预览'} status={errors['condition-'+condition.id]?'error':undefined} aria-invalid={Boolean(errors['condition-'+condition.id])} value={condition.expression} onChange={e=>changeCondition(condition.id,'expression',e.target.value)}/>
      {errors['condition-'+condition.id]&&<p className="uc2-editor-field-error" role="alert" title={errors['condition-'+condition.id]}>{errors['condition-'+condition.id]}</p>}</div>
     </section>)}
    </div></Row>
   </div></Section>
  </div>
  <footer className="uc2-rule-editor-footer"><span>来源：{rule.id} · {rule.role==='通用'?'共性':rule.role}<small>保存到本地规则库并更新候选审阅状态</small></span><div><Button onClick={cancel}>取消</Button><Button type="primary" htmlType="submit" disabled={testing}>保存并采纳</Button></div></footer>
 </form>;
}
