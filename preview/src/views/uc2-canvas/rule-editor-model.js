import {fusionImpact,uc2Actual} from '../../mock/uc2.js';

export function createRuleDraft(rule){
  const words=rule.cmd.split(' '),value=words.pop(),prefix=words.join(' ');
  return {name:rule.name,priority:fusionImpact[rule.id]==='高'?'高优先级':fusionImpact[rule.id]==='中'?'中优先级':'低优先级',ruleId:'golden_'+rule.id.toLowerCase().replace('-','_'),type:'单条 Rule（非 Policy）',mode:'始终执行',method:'全局',trigger:'全部满足',conditions:[{id:1,field:'value',operator:'包含',value,relation:'且',expression:(prefix?prefix+' ':'')+'{{value}}'}]};
}
export function expandCondition(condition){return condition.expression.replace(/\{\{\s*([\w]+)\s*\}\}/g,(whole,name)=>name===condition.field?condition.value:whole);}
export function validateRuleDraft(draft,others={},sourceId){
 const errors={};
 if(!draft.name.trim())errors.name='请输入规则名称';
 if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(draft.ruleId.trim()))errors.ruleId='以字母开头，仅支持字母、数字、下划线和短横线';
 else if(Object.entries(others).some(([id,item])=>id!==sourceId&&item.ruleId===draft.ruleId.trim()))errors.ruleId='规则ID已被其他规则使用';
 if(draft.method==='指定视图'&&!draft.viewPath?.trim())errors.viewPath='请输入指定视图路径';
 if(draft.mode==='满足条件时执行'&&!draft.precondition?.trim())errors.precondition='请输入执行前提';
 if(!draft.conditions?.length)errors.conditions='至少保留一个判断条件';
 draft.conditions?.forEach((condition,index)=>{
  const key='condition-'+condition.id,expanded=expandCondition(condition);
  if(!/^[A-Za-z_][\w]*$/.test(condition.field))errors[key]='字段使用字母、数字或下划线，并以字母或下划线开头';
  else if(!condition.value.trim()||!condition.expression.trim())errors[key]='请补充值和表达式';
  else if(/\{\{|\}\}/.test(expanded))errors[key]='表达式中的变量名称需与字段一致';
  else if(/<[^>]+>/.test(expanded))errors[key]='请将规划参数替换为实际值';
  else if(condition.operator==='正则匹配'){try{new RegExp(expanded);}catch{errors[key]='正则表达式格式不正确';}}
 });
 return errors;
}
const normalize=text=>text.trim().replace(/\s+/g,' ');
export function matchesDraft(draft,configuration){
 const outcomes=draft.conditions.map(condition=>{
  const expression=expandCondition(condition),content=normalize(configuration),expected=normalize(expression);
  if(condition.operator==='正则匹配')return new RegExp(expression,'m').test(configuration);
  if(condition.operator==='不包含')return !content.includes(expected);
  if(condition.operator==='等于')return configuration.split('\n').some(line=>normalize(line)===expected);
  return content.includes(expected);
 });
 return draft.trigger==='全部满足'?outcomes.every(Boolean):outcomes.some(Boolean);
}
export function testRuleDraft(draft,rule){
 const samples=[{name:'支持样本配置',configuration:rule.cmd,expected:true},{name:'偏离样本配置',configuration:uc2Actual(rule),expected:false}];
 const results=samples.map(sample=>({...sample,passed:matchesDraft(draft,sample.configuration)===sample.expected}));
 return {passed:results.filter(item=>item.passed).length,total:results.length,results};
}
