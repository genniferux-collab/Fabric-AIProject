import {useEffect,useRef,useState} from 'react';
import {useApp} from '../../context.jsx';
import './editor.css';
import './form-kit.css';
import Select from './form-select.jsx';
import './save-controls.css';

function Svg({name,size=14,className=''}){return <img src={'./assets/uploads/uc3-rule/editor-'+name+'.svg'} width={size} height={size} className={className} alt="" aria-hidden="true"/>;}
function Row({label,children,className='',error}){return <div className={'uc3-edit-row '+className}><span className="uc3-edit-label">{label}</span><div className="uc3-edit-field"><div className="uc3-edit-control">{children}</div>{error&&<p className="uc3-edit-error" role="alert">{error}</p>}</div></div>;}
function Section({title,children}){const [open,setOpen]=useState(true);return <section className="uc3-edit-section"><button type="button" className="uc3-edit-section-title" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Svg name="collapse" className={open?'':'is-collapsed'}/><h2>{title}</h2></button><div hidden={!open}>{children}</div></section>;}

export default function Uc3RuleEditor(){
 const {uc3EditorDraft:draft,setUc3EditorDraft:setDraft,uc3Phase,uc3SaveRule,uc3CancelEdit}=useApp();const timer=useRef(null);const [testing,setTesting]=useState(false),[errors,setErrors]=useState({});const form=useRef(null);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const update=(field,value)=>{setErrors({});clearTimeout(timer.current);setTesting(false);setDraft(d=>({...d,[field]:value,changed:true,testResult:null,...(field==='trigger'?{conditions:d.conditions.map(c=>({...c,relation:value==='全部满足'?'且':'或'}))}:{})}));};
 const updateCondition=(id,key,value)=>key==='relation'?update('trigger',value==='且'?'全部满足':'任一满足'):update('conditions',draft.conditions.map(c=>c.id===id?{...c,[key]:value,...(key==='field'?{expression:c.expression.split('{{'+c.field+'}}').join('{{'+value+'}}')}:{})}:c));
 const addCondition=()=>update('conditions',[...draft.conditions,{id:Date.now(),field:'time',operator:'大于',value:'全部满足',relation:draft.trigger==='全部满足'?'且':'或',expression:'idle-timeout  {{time}} 30'}]);
 const validate=()=>{const next={};if(!draft.name.trim())next.name='请输入规则名称';if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(draft.ruleId.trim()))next.ruleId='以字母开头，仅支持字母、数字、下划线和短横线';if(!draft.type.trim())next.type='请输入规则类型';if(draft.method==='指定视图'&&!draft.viewPath?.trim())next.viewPath='请输入指定视图路径';if(draft.mode==='满足条件时执行'&&!draft.precondition?.trim())next.precondition='请输入执行前提';draft.conditions.forEach(c=>{if(!/^[A-Za-z_][\w]*$/.test(c.field)||!c.expression.trim()||!c.expression.includes('{{'+c.field+'}}'))next['condition-'+c.id]='请填写有效字段，并在表达式中引用该字段变量';});setErrors(next);if(Object.keys(next).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return false;}return true;};
 const save=event=>{event.preventDefault();if(validate())uc3SaveRule(draft);};
 const runTests=()=>{if(!validate())return;clearTimeout(timer.current);setTesting(true);timer.current=setTimeout(()=>{const examples=[{minutes:10,seconds:0,expected:false},{minutes:5,seconds:0,expected:false},{missing:true,expected:false},{outside:true,minutes:30,seconds:0,expected:false},{minutes:15,seconds:0,expected:true},{minutes:10,seconds:30,expected:true},{minutes:0,seconds:0,expected:true}];const failed=sample=>{if(sample.missing||sample.outside)return false;if(sample.minutes===0&&sample.seconds===0)return true;const values=draft.conditions.map(c=>{const threshold=c.value==='全部满足'?600:Number(c.value)*60;const seconds=sample.minutes*60+sample.seconds;return c.operator==='大于'?seconds>threshold:c.operator==='大于等于'?seconds>=threshold:c.operator==='小于'?seconds<threshold:c.operator==='小于等于'?seconds<=threshold:seconds===threshold;});return draft.trigger==='全部满足'?values.every(Boolean):values.some(Boolean);};const passed=examples.filter(s=>failed(s)===s.expected).length;setDraft(d=>({...d,testResult:passed}));setTesting(false);},1100);};
 const result=draft.testResult??(uc3Phase>=4&&!draft.changed?7:null);
 const change=(field,value)=>{setDraft(d=>({...d,changed:true}));update(field,value);};
 return <form ref={form} className="uc3-rule-editor-shell" aria-label="规则配置编辑" onSubmit={save} noValidate><article className="uc3-rule-editor">
  <Section title="基本信息"><div className="uc3-edit-rows">
   <Row label="规则名称" error={errors.name}><input aria-label="规则名称" aria-required="true" aria-invalid={Boolean(errors.name)} value={draft.name} onChange={e=>change('name',e.target.value)}/></Row>
   <Row label="影响级别"><Select label="影响级别" priority value={draft.priority} onChange={v=>change('priority',v)} options={['最高优先级','高优先级','中优先级','低优先级']}/></Row>
   <Row label="规则ID" error={errors.ruleId}><input aria-label="规则ID" aria-required="true" aria-invalid={Boolean(errors.ruleId)} value={draft.ruleId} onChange={e=>change('ruleId',e.target.value)}/></Row>
   <Row label="类型" error={errors.type}><input aria-label="类型" aria-required="true" aria-invalid={Boolean(errors.type)} value={draft.type} onChange={e=>change('type',e.target.value)}/></Row>
   <Row label="测试" className="uc3-edit-test-row"><span role="status" className={'uc3-edit-test-status'+(result!==null&&result<7?' has-fail':'')}><i/>{testing?'正在测试…':result===null?'待测试':result===7?'测试通过（7/7）':`测试未通过（${result}/7）`}</span><button type="button" className="uc3-edit-retest" onClick={runTests} disabled={testing}><Svg name="rerun" size={16} className={testing?'is-spinning':''}/>{testing?'正在执行':'再次执行'}</button></Row>
  </div></Section>
  <Section title="执行细则"><div className="uc3-edit-rows">
   <Row label="使用模式"><Select label="使用模式" value={draft.mode} onChange={v=>change('mode',v)} options={['始终执行','满足条件时执行']}/></Row>{draft.mode==='满足条件时执行'&&<Row label="执行前提" error={errors.precondition}><input aria-label="执行前提" aria-invalid={Boolean(errors.precondition)} value={draft.precondition||''} onChange={e=>change('precondition',e.target.value)}/></Row>}
   <Row label="检查方式"><Select label="检查方式" value={draft.method} onChange={v=>change('method',v)} options={['全局','指定视图']}/></Row>{draft.method==='指定视图'&&<Row label="视图路径" error={errors.viewPath}><input aria-label="视图路径" aria-invalid={Boolean(errors.viewPath)} value={draft.viewPath||''} onChange={e=>change('viewPath',e.target.value)}/></Row>}
   <Row label="判断条件" className="uc3-edit-conditions-row"><div className="uc3-edit-trigger"><span>触发方式</span><Select label="触发方式" value={draft.trigger} onChange={v=>change('trigger',v)} options={['全部满足','任一满足']}/></div>
    {draft.conditions.map((condition,index)=><section className="uc3-edit-condition" key={condition.id} aria-label={'条件'+(index+1)}><header><h3>条件{index+1}</h3>{index===0?<button type="button" aria-label="添加条件" onClick={addCondition}><Svg name="add"/></button>:<button type="button" className="uc3-remove-condition" aria-label={'移除条件'+(index+1)} onClick={()=>update('conditions',draft.conditions.filter(c=>c.id!==condition.id))}>×</button>}</header>
     <div className="uc3-edit-condition-grid"><label>字段<input aria-label={'条件'+(index+1)+'字段'} aria-invalid={Boolean(errors['condition-'+condition.id])} value={condition.field} onChange={e=>updateCondition(condition.id,'field',e.target.value)}/></label><label>运算符号<Select label={'条件'+(index+1)+'运算符号'} value={condition.operator} onChange={v=>updateCondition(condition.id,'operator',v)} options={['大于','大于等于','等于','小于','小于等于']}/></label><label>值<Select label={'条件'+(index+1)+'值'} value={condition.value} onChange={v=>updateCondition(condition.id,'value',v)} options={['全部满足','5','10','15','30']}/></label><fieldset><legend>条件关系</legend><div>{['或','且'].map(relation=><label key={relation}><input type="radio" name={'uc3-condition-'+condition.id} value={relation} checked={condition.relation===relation} onChange={()=>updateCondition(condition.id,'relation',relation)}/>{relation}</label>)}</div></fieldset></div>
     <label className="uc3-edit-expression">表达式预览<textarea aria-label={'条件'+(index+1)+'表达式预览'} value={condition.expression} onChange={e=>updateCondition(condition.id,'expression',e.target.value)}/></label>
     {errors['condition-'+condition.id]&&<p className="uc3-condition-error" role="alert">{errors['condition-'+condition.id]}</p>}
    </section>)}
   </Row>
  </div></Section>
 </article><footer className="uc3-rule-editor-footer"><span>规则配置<small>{draft.changed?"有未保存的修改":"当前配置"}</small></span><div><button type="button" className="btn" onClick={uc3CancelEdit}>取消</button><button type="submit" className="btn primary" disabled={testing}>保存规则</button></div></footer></form>;
}
