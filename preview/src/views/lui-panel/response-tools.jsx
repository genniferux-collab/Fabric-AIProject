import {Dropdown,Tooltip} from "antd";
import { useState } from "react";
import { useApp } from "../../context.jsx";
import LuiGlyph from "./glyph.jsx";

// 默认动作面向配置检查；其他用例通过回调覆盖重放和产物定位，复用同一工具栏。
export default function ResponseTools({ timestamp, duration, text, onRegenerate, onLocate, subject = "检查", locateLabel = "定位检查报告" }) {
  const { runTask, taskPrompt, locate, toast } = useApp();
  const [feedback, setFeedback] = useState(null), [more, setMore] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast(`已复制${subject}结论`); }
    catch { toast("复制暂不可用，请选择回答文字复制。"); }
  };
  return <div className="response-footer">
    <span>{timestamp}｜用时{duration}秒</span>
    <div className="response-tools">
      <Tooltip trigger={['hover','focus']} title="重新生成"><button type="button" aria-label={`重新生成${subject}回答`} onClick={()=>onRegenerate ? onRegenerate() : runTask(taskPrompt)}><LuiGlyph name="regenerate" size="1.25rem"/></button></Tooltip>
      <Tooltip trigger={['hover','focus']} title="复制"><button type="button" aria-label={`复制${subject}回答`} onClick={copy}><LuiGlyph name="copy" size="1.25rem"/></button></Tooltip>
      <Tooltip trigger={['hover','focus']} title="点赞"><button type="button" aria-label={`点赞${subject}回答`} aria-pressed={feedback === "like"} onClick={()=>setFeedback(value=>value === "like" ? null : "like")}><LuiGlyph name="like" size="1.25rem"/></button></Tooltip>
      <Tooltip trigger={['hover','focus']} title="点踩"><button type="button" aria-label={`点踩${subject}回答`} aria-pressed={feedback === "dislike"} onClick={()=>setFeedback(value=>value === "dislike" ? null : "dislike")}><LuiGlyph name="dislike" size="1.25rem"/></button></Tooltip>
      <div className="response-more"><Dropdown trigger={['click']} placement="topRight" open={more} onOpenChange={setMore} menu={{items:[{key:'locate',label:locateLabel}],onClick:()=>{setMore(false);if(onLocate)onLocate();else locate("report");}}}><Tooltip trigger={['hover','focus']} title="更多"><button type="button" aria-label={`${subject}回答更多操作`} aria-haspopup="menu" aria-expanded={more}><LuiGlyph name="more" size="1.25rem"/></button></Tooltip></Dropdown></div>
    </div>
  </div>;
}
