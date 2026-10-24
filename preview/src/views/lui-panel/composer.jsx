import { useEffect, useId, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import Ic from "../../components/icon-el/index.jsx";

const commands = [
  { kind: "change", label: "配置变更", prompt: "请根据变更目标生成配置变更方案，并给出风险与回退建议。", colors: ["#6fd6ff", "#9d7aff"] },
  { kind: "check", label: "配置检查", prompt: "检查HCS1的设备是否符合基线要求，并给出修复建议。", colors: ["#7decc7", "#5ca2e9"] },
  { kind: "document", label: "MOP文档变更", prompt: "请帮我修改MOP文档，补充操作步骤、验证方法和回退方案。", colors: ["#ffcf83", "#ee83bb"] },
];

function CommandIcon({ command }) {
  const id = "command-" + useId().replace(/:/g, "");
  const paths = {
    change: "M5 5h10V2l6 5-6 5V9H5zm14 10H9v-3l-6 5 6 5v-3h10z",
    check: "M5 3h14v18H5zm4 5v2h7V8zm-1 6 3 3 6-6-1.5-1.5-4.5 4.5-1.5-1.5z",
    document: "M6 2h9l5 5v15H6zm8 2v5h5zM9 12v2h8v-2zm0 5v2h6v-2z",
  };
  return <svg className="command-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor={command.colors[0]} /><stop offset="1" stopColor={command.colors[1]} /></linearGradient></defs>
    <rect x="1" y="1" width="22" height="22" rx="5" fill={`url(#${id})`} opacity=".18" />
    <path d={paths[command.kind]} fill={`url(#${id})`} fillRule="evenodd" />
    <path d="M4 2h12" stroke="#fff" strokeOpacity=".35" strokeLinecap="round" />
  </svg>;
}

export default function Composer() {
  const { promptText, setPromptText, submitPrompt, toast } = useApp();
  const promptRef = useRef(null), fileRef = useRef(null), speechRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [recording, setRecording] = useState(false);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const [selected, setSelected] = useState(0);
  const canSend = promptText.trim().length > 0;
  const query = promptText.trimStart();
  const slashOpen = query.startsWith("/") && !slashDismissed;
  const matches = commands.filter(command => command.label.toLowerCase().includes(query.slice(1).toLowerCase()));

  useEffect(() => () => { speechRef.current?.abort(); }, []);

  const choose = command => {
    setPromptText(command.prompt);
    setSlashDismissed(true);
    promptRef.current?.focus();
  };
  const send = () => {
    if (!canSend) return;
    speechRef.current?.stop();
    submitPrompt(promptText);
    setAttachments([]);
  };
  const onKeyDown = event => {
    if (event.nativeEvent.isComposing) return;
    if (slashOpen && event.key === "Escape") { event.preventDefault(); setSlashDismissed(true); return; }
    if (slashOpen && matches.length && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault(); setSelected(index => (index + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length); return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (slashOpen && matches.length) choose(matches[selected % matches.length]);
      else send();
    }
  };
  const toggleSpeech = () => {
    if (recording) { speechRef.current?.stop(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { toast("当前浏览器不支持语音输入，请使用文本输入。"); return; }
    const speech = new Recognition();
    speech.lang = "zh-CN";
    speech.continuous = false;
    speech.interimResults = true;
    const existingPrompt = promptText;
    speech.onresult = event => {
      const transcript = Array.from(event.results).map(result => result[0].transcript).join("");
      setPromptText((existingPrompt + transcript).slice(0, 2000));
    };
    speech.onend = () => { setRecording(false); speechRef.current = null; };
    speech.onerror = event => { setRecording(false); if (event.error !== "aborted") toast(event.error === "not-allowed" ? "麦克风未获授权，请在浏览器中允许访问后重试。" : "语音识别暂不可用，请重试或使用文本输入。"); };
    speechRef.current = speech;
    try { speech.start(); setRecording(true); } catch { speechRef.current = null; toast("语音输入暂不可用，请稍后重试。"); }
  };

  return <div className="composer-wrap">
    <div className="command-capsules" aria-label="快捷指令">
      {commands.map(command => <button key={command.kind} type="button" className="command-capsule" onClick={() => choose(command)}><CommandIcon command={command} /><span>{command.label}</span></button>)}
    </div>
    {attachments.length > 0 && <div className="composer-attachments" aria-label="已选择的附件">{attachments.map((file, index) => <span key={file.name + index} title={file.name}><span>{file.name}</span><button type="button" aria-label={`移除附件 ${file.name}`} onClick={() => setAttachments(files => files.filter((_, i) => i !== index))}><Ic variant="filled" icon="x" /></button></span>)}</div>}
    <div className="composer-box">
      {slashOpen && <div className="composer-prompts" role="listbox" aria-label="提示词">{matches.length ? matches.map((command, index) => <button key={command.kind} type="button" role="option" aria-selected={index === selected % matches.length} onMouseDown={event => event.preventDefault()} onClick={() => choose(command)}><CommandIcon command={command} />{command.label}</button>) : <span>暂无匹配提示词</span>}</div>}
      <form className="composer" id="promptForm" onSubmit={event => { event.preventDefault(); send(); }}>
        <textarea ref={promptRef} id="prompt" aria-label="向 Aico 发送问题" placeholder={'输入问题或输入“/”触发提示词'} maxLength={2000} value={promptText} onChange={event => { setPromptText(event.target.value.slice(0, 2000)); setSlashDismissed(false); setSelected(0); }} onKeyDown={onKeyDown} />
        <div className="composer-bottom">
          <span className="composer-count" aria-label={`已输入 ${promptText.length} 字符，最多 2000 字符`}>{promptText.length}/2000</span>
          <div className="composer-actions">
            <input className="composer-file-input" ref={fileRef} type="file" multiple tabIndex={-1} aria-label="选择附件" onChange={event => { setAttachments(files => [...files, ...Array.from(event.target.files || [])]); event.target.value = ""; }} />
            <button type="button" className="composer-tool" title="上传附件" aria-label="上传附件" onClick={() => fileRef.current?.click()}><Ic variant="filled" icon="upload" /></button>
            <button type="button" className={"composer-tool" + (recording ? " is-recording" : "")} title={recording ? "停止语音输入" : "语音输入"} aria-label={recording ? "停止语音输入" : "语音输入"} aria-pressed={recording} onClick={toggleSpeech}><Ic variant="filled" icon="mic" /></button>
            <button type="submit" className="composer-send" aria-label="发送问题" disabled={!canSend}><Ic variant="filled" icon="send" /></button>
          </div>
        </div>
      </form>
    </div>
    <div className="composer-hint">内容由AI生成，无法确保准确性和完整性，仅供参考</div>
  </div>;
}
