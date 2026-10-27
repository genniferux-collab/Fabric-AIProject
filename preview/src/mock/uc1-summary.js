// One timeline drives both the streamed answer and the canvas reveal.
export const uc1SummaryText={
 conclusion:'已完成规则查询任务，当前规则体系以出厂预置规则为主，尚缺少基于现网实际配置的AI挖掘规则。建议开展黄金基线自动挖掘，进一步完善规则覆盖。',
 heading:'执行结果',success:'✅ 全网检查规则查询成功',count:'规则统计： 共匹配92条检查规则。',coverage:'规则覆盖： 涵盖设备基础配置、设备管理与访问安全、管理网络与服务配置、网络冗余与故障切换四大类。',
 tableHeading:'规则来源 规则数',factory:'出厂预置规则 90条',ai:'AI挖掘规则 0条',custom:'用户自定义规则 2条',artifact:'检查规则详情 V1.0.1',followup:'是否需要我为您创建新的检查规则，或者通过AI自动挖掘现网黄金基线？'};
let cursor=0;export const uc1SummaryCues=Object.entries(uc1SummaryText).map(([key,text],index)=>{const duration=Math.ceil(Array.from(text).length/48*1000);const cue={key,text,index,delay:cursor,duration};cursor+=duration+120;return cue;});
export const uc1SummaryEnd=cursor;
