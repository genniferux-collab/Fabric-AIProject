import { useState } from "react";
import { useApp } from "../../context.jsx";
import LuiGlyph from "./glyph.jsx";

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
      <button type="button" title="重新生成" aria-label={`重新生成${subject}回答`} onClick={()=>onRegenerate ? onRegenerate() : runTask(taskPrompt)}><LuiGlyph name="regenerate" size={20}/></button>
      <button type="button" title="复制" aria-label={`复制${subject}回答`} onClick={copy}><LuiGlyph name="copy" size={20}/></button>
      <button type="button" title="点赞" aria-label={`点赞${subject}回答`} aria-pressed={feedback === "like"} onClick={()=>setFeedback(value=>value === "like" ? null : "like")}><LuiGlyph name="like" size={20}/></button>
      <button type="button" title="点踩" aria-label={`点踩${subject}回答`} aria-pressed={feedback === "dislike"} onClick={()=>setFeedback(value=>value === "dislike" ? null : "dislike")}><LuiGlyph name="dislike" size={20}/></button>
      <div className="response-more"><button type="button" title="更多" aria-label={`${subject}回答更多操作`} aria-expanded={more} onClick={()=>setMore(!more)}><LuiGlyph name="more" size={20}/></button>{more&&<div className="response-more-menu"><button type="button" onClick={()=>{setMore(false);if(onLocate)onLocate();else locate("report");}}>{locateLabel}</button></div>}</div>
    </div>
  </div>;
}
