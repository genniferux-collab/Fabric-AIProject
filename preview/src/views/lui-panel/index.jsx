import Uc3Chat from './uc3-chat.jsx';
import {completionTimeline} from '../../mock/uc4-completion.js';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp, highlightLocate } from "../../context.jsx";
import { v7WorkflowSteps, v7WorkflowRunning } from "../../mock/workflow.js";
import { ArtifactTag } from "../../components/status-marks/index.jsx";
import { summaryParts } from "../../mock/audit.js";
import LuiGlyph from "./glyph.jsx";
import ResponseTools from "./response-tools.jsx";
import "./design.css";
import Uc2Chat from "./uc2-chat.jsx";
import Uc1Chat from "./uc1-chat.jsx";
import Ic from "../../components/icon-el/index.jsx";
import Composer from "./composer.jsx";
import WelcomeHome from "./welcome.jsx";
import { ThinkingDetails } from "./thinking.jsx";
import { StreamText, RevealAfter, MotionTitle, SoftHeight, streamDuration } from "./motion.jsx";

function LuiScrollArea({ children, scrollRef, enhanced }) {
  const flowRef = useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const dragRef = useRef(null);
  const sync = useCallback(() => {
    const main = scrollRef.current, track = trackRef.current, thumb = thumbRef.current;
    if (!main || !track || !thumb) return;
    const overflow = main.scrollHeight - main.clientHeight;
    track.style.display = overflow > 1 ? "block" : "none";
    if (overflow <= 1) return;
    const height = Math.min(track.clientHeight, Math.max(32, track.clientHeight * main.clientHeight / main.scrollHeight));
    thumb.style.height = `${height}px`;
    thumb.style.transform = `translateY(${(track.clientHeight - height) * main.scrollTop / overflow}px)`;
    track.setAttribute("aria-valuenow", String(Math.round(main.scrollTop / overflow * 100)));
  }, [scrollRef]);

  useEffect(() => {
    const observer = new ResizeObserver(sync);
    if (scrollRef.current) observer.observe(scrollRef.current);
    if (flowRef.current) observer.observe(flowRef.current);
    const frame = requestAnimationFrame(sync);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [enhanced, sync, scrollRef]);

  useEffect(() => {
    const main=scrollRef.current, flow=flowRef.current;
    if(!main||!flow)return;
    let frame=0, previousHeight=flow.getBoundingClientRect().height;
    const follow=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{main.scrollTop=main.scrollHeight;sync();});};
    const resize=new ResizeObserver(()=>{const height=flow.getBoundingClientRect().height;if(height>previousHeight+.1)follow();previousHeight=height;});
    const mutations=new MutationObserver(records=>{if(records.some(record=>record.type==='characterData'||record.addedNodes.length))follow();});
    resize.observe(flow);mutations.observe(flow,{subtree:true,childList:true,characterData:true});
    return()=>{resize.disconnect();mutations.disconnect();cancelAnimationFrame(frame);};
  },[scrollRef,sync]);

  const onPointerDown = event => {
    const main = scrollRef.current, track = trackRef.current, thumb = thumbRef.current;
    if (!main || !track || !thumb) return;
    event.preventDefault();
    const rect = track.getBoundingClientRect();
    const scale = rect.height / track.clientHeight;
    const travel = track.clientHeight - thumb.clientHeight;
    const overflow = main.scrollHeight - main.clientHeight;
    if (travel <= 0 || overflow <= 0) return;
    if (event.target !== thumb) {
      main.scrollTop = Math.max(0, Math.min(travel, (event.clientY - rect.top) / scale - thumb.clientHeight / 2)) / travel * overflow;
      sync();
    }
    dragRef.current = { y: event.clientY, scroll: main.scrollTop, ratio: overflow / travel / scale };
    track.setPointerCapture(event.pointerId);
  };

  const onKeyDown = event => {
    const main = scrollRef.current;
    if (!main) return;
    const delta = { ArrowDown: 40, ArrowUp: -40, PageDown: main.clientHeight * .8, PageUp: -main.clientHeight * .8 }[event.key];
    if (delta !== undefined) main.scrollTop += delta;
    else if (event.key === "Home") main.scrollTop = 0;
    else if (event.key === "End") main.scrollTop = main.scrollHeight;
    else return;
    event.preventDefault(); sync();
  };

  return <div className="lui-main-shell">
    <div className="lui-main" id="luiMain" ref={scrollRef} onScroll={sync}><div className="lui-flow" ref={flowRef}>{children}</div></div>
    {enhanced && <div className="lui-scroll-track" ref={trackRef} role="scrollbar" tabIndex={0} aria-label="LUI 内容滚动条" aria-controls="luiMain" aria-orientation="vertical" aria-valuemin={0} aria-valuemax={100} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={event => { if (dragRef.current) { scrollRef.current.scrollTop = dragRef.current.scroll + (event.clientY - dragRef.current.y) * dragRef.current.ratio; sync(); } }} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onLostPointerCapture={() => { dragRef.current = null; }}><div className="lui-scroll-thumb" ref={thumbRef} /></div>}
  </div>;
}

// 四阶段执行步骤（active = 当前进行到第几步，0 基）
function WorkflowSteps({ active, groupExpanded }) {
  const { locate, isDark, luiFocus } = useApp();
  const [openSteps, setOpenSteps] = useState({});
  const [selectedStep, setSelectedStep] = useState(null);
  const stepsRef = useRef(null);
  const revealedSeq = useRef(0);
  const highlightedSeq = useRef(0);
  useEffect(() => {
    setOpenSteps(active < 4 && groupExpanded ? { [active]: true } : {});
    setSelectedStep(active < 4 ? active : null);
  }, [active, groupExpanded]);
  useEffect(() => {
    if (!luiFocus || !groupExpanded || revealedSeq.current === luiFocus.seq) return;
    const index = { network: 0, artifact: 2, report: 3 }[luiFocus.kind];
    if (index === undefined || index > active) return;
    revealedSeq.current = luiFocus.seq;
    setOpenSteps(steps => ({ ...steps, [index]: true }));
    setSelectedStep(index);
  }, [luiFocus, groupExpanded, active]);
  useLayoutEffect(() => {
    if (!luiFocus || !groupExpanded || highlightedSeq.current === luiFocus.seq) return;
    const index = { network: 0, artifact: 2, report: 3 }[luiFocus.kind];
    if (!openSteps[index]) return;
    const frame = requestAnimationFrame(() => {
      const tag = luiFocus.kind === "report"
        ? stepsRef.current?.closest(".generated-card")?.querySelector(".v7-conclusion-card")
        : stepsRef.current?.querySelector(`[data-step-index="${index}"] [data-lui-artifact="${luiFocus.kind}"]`);
      const step = tag?.closest('.step') || tag, main = tag?.closest('#luiMain');
      if (!tag || !step || !main || !tag.getClientRects().length) return;
      const rect = main.getBoundingClientRect();
      const scale = rect.height / main.offsetHeight || 1;
      main.scrollTo({ top: Math.max(0, main.scrollTop + (step.getBoundingClientRect().top - rect.top) / scale - 16), behavior: 'smooth' });
      highlightLocate(tag);
      highlightedSeq.current = luiFocus.seq;
    });
    return () => cancelAnimationFrame(frame);
  }, [luiFocus, groupExpanded, openSteps]);
  const products = { 0: "network", 1: "network", 2: "artifact", 3: "report" };
  const toggle = index => { setSelectedStep(index); setOpenSteps(steps => ({ ...steps, [index]: !steps[index] })); };
  return (
    <div className="steps workflow-steps" ref={stepsRef}>
      {v7WorkflowSteps.slice(0, Math.min(active + 1, v7WorkflowSteps.length)).map((step, index) => {
        const done = index < active;
        const current = index === active;
        const available = done || current;
        const expanded = available && !!openSteps[index];
        const product = products[index];
        const body = done ? step.description : current ? v7WorkflowRunning[index] : "";
        return (
          <div key={step.title} className={"step " + (done ? "is-done" : current ? "is-running" : "pending") + (selectedStep === index ? " is-selected" : "")} data-step-index={index}>
            <span className={"status " + (done ? "done" : current ? "running" : "")} aria-label={done ? "已完成" : current ? "进行中" : "待执行"}>
              {done ? <LuiGlyph name={selectedStep === index ? "step-selected" : "step-done"} size={16}/> : current ? <LuiGlyph name="step-running" size={16}/> : index + 1}
            </span>
            <div className="step-heading">
              <button type="button" className="step-title" disabled={!available} aria-expanded={expanded} aria-controls={`workflowStep${index}`} onClick={() => toggle(index)}><MotionTitle text={index === 0 && current ? "扫描拓扑并识别全网设备" : step.title} active={current}/></button>
              {available && <div className="step-actions">
                {product && <><button type="button" className="step-action" aria-label={`定位步骤：${step.title}`} title="定位到画布" onClick={() => { setSelectedStep(index); locate(product, "step"); }}><img className="lui-glyph" src="./assets/uploads/lui-step-locate.svg" width="12" height="12" alt=""/></button><span className="step-action-divider" aria-hidden="true" /></>}
                <button type="button" className="step-action" aria-label={`${expanded ? "收起" : "展开"}步骤：${step.title}`} aria-expanded={expanded} aria-controls={`workflowStep${index}`} onClick={() => toggle(index)}><Ic variant={isDark ? "filled" : "lined"} icon={expanded ? "chevron-up" : "chevron-down"} /></button>
              </div>}
            </div>
            {body ? (
              <div className="step-content" id={`workflowStep${index}`} hidden={!expanded}>
                <StreamText text={body} animate={current}/>
                {index === 0 && (done || current) ? (
                  <div className="v7-step-artifact">
                    <ArtifactTag title="全网设备概览" type="process" shape="overview" onLocate={() => locate("network")} />
                  </div>
                ) : null}
                {index === 2 && done ? (
                  <div className="v7-step-artifact">
                    <ArtifactTag title="HCS1合规检查规则&设备匹配" type="process" shape="mapping" onLocate={() => locate("artifact")} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// Stream completion content without changing the workflow completion/collapse rules.
function Completion({ onLocateReport, timestamp }) {
  const lines=completionTimeline(summaryParts());
  const end=lines.at(-1).delay+streamDuration(lines.at(-1).text)+180;
  return <section className="completion audit-completion" aria-label="基线检查结论">
    {lines.slice(0,4).map((line,index)=><StreamText key={index} {...line}/>)}
    <ul className="audit-advice">{lines.slice(4,7).map((line,index)=><StreamText key={index} {...line}/>)}</ul>
    <StreamText {...lines[7]} className="small muted"/>
    <RevealAfter delay={end}><div className="v7-step-artifact"><ArtifactTag title="HCS1 区基线检查报告" type="conclusion" shape="report" timestamp={timestamp} onLocate={onLocateReport}/></div></RevealAfter>
  </section>;
}

// Keep the same response card mounted while execution progresses and completes.
function InspectionConversation({ running, active, prompt, onLocateReport }) {
  const { isDark, luiFocus } = useApp();
  const [expanded, setExpanded] = useState(true);
  const started = useRef(Date.now());
  const [finished, setFinished] = useState(null);
  useEffect(() => { setExpanded(running); if(running){started.current=Date.now();setFinished(null);} else {setFinished({at:new Date(),duration:((Date.now()-started.current)/1000).toFixed(1)});} }, [running]);
  useEffect(() => { if (luiFocus) setExpanded(true); }, [luiFocus]);
  const title = running ? "正在执行处置步骤" : "已完成思考";
  const timestamp = finished ? `${finished.at.getFullYear()}-${String(finished.at.getMonth()+1).padStart(2,"0")}-${String(finished.at.getDate()).padStart(2,"0")} ${finished.at.toTimeString().slice(0,8)}` : "";
  const summary = summaryParts();
  return (
    <>
      <div className="user-msg">{prompt}</div>
      <article className={"generated-card" + (expanded ? "" : " is-process-collapsed")} aria-label="基线检查回答">
        <SoftHeight>
        <div className="response-process">
          <button type="button" className="response-title" aria-expanded={expanded} aria-controls="uc4WorkflowSteps" onClick={() => setExpanded(value => !value)}>
            <LuiGlyph name={running ? "processing" : "completed"} size={14}/><MotionTitle text={title} active={running}/><Ic variant={isDark ? "filled" : "lined"} icon={expanded ? "chevron-up" : "chevron-down"} />
          </button>
          <div className="response-steps" id="uc4WorkflowSteps" hidden={!expanded}>
            <ThinkingDetails thinking={running && active < 0} isDark={isDark}/>
            {active >= 0 && <p className="response-intent">已理解您的意图，开始为您检查设备配置。</p>}
            {active >= 0 && <WorkflowSteps active={running ? active : 4} groupExpanded={expanded} />}
          </div>
        </div>
        {!running && <><Completion onLocateReport={onLocateReport} timestamp={timestamp}/><RevealAfter delay={completionTimeline(summary).reduce((end,line)=>line.delay+streamDuration(line.text),0)+180}><ResponseTools timestamp={timestamp.slice(5)} duration={finished?.duration || "0.0"} text={`已检查 HCS1 区 ${summary.total} 台设备，${summary.passed} 台通过、${summary.failed} 台不通过，整网合规度 ${summary.compliance}%。发现 ${summary.rules} 条规则不通过。`}/></RevealAfter></>}
        </SoftHeight>
      </article>
    </>
  );
}

export default function LuiPanel() {
  const app = useApp();
  const { luiOpen, luiView, taskPrompt, runningIndex, promptText, setPromptText, submitPrompt, chooseUC, openAgentHome, goCockpit, toast, locate, uc2Extra, isDark } = app;
  const mainRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [welcomeFeature,setWelcomeFeature]=useState(null);
  const detailTitle = luiView === "home" ? "网络运维智能体" : luiView === "uc1" ? "查询检查规则" : luiView === "uc3" ? "创建检查规则" : luiView === "uc2" ? "挖掘黄金基线" : "检查基线要求";

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = event => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const closeOnEscape = event => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [menuOpen]);
  useEffect(() => { setMenuOpen(false); }, [luiView, luiOpen]);

  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [luiView]);
  // UC2 挖掘中追加对话 → 滚到底部
  useEffect(() => {
    if (uc2Extra.length && mainRef.current) mainRef.current.scrollTop = mainRef.current.scrollHeight;
  }, [uc2Extra.length]);

  return (
    <aside className={"lui lui-refresh" + (luiView === "home" ? " lui-welcome" : "") + (luiOpen ? "" : " closed")} id="lui">
      <div className="lui-head between">
        <div className="lui-detail-heading">
          <button className="lui-header-icon" aria-label={luiView === "home" ? "返回首页" : "返回智能体首页"} onClick={luiView === "home" ? goCockpit : openAgentHome}><LuiGlyph name="back" size={20}/></button>
          <span className="lui-detail-title">{detailTitle}</span>
        </div>
        <div className="lui-more" ref={menuRef}>
          <button className="lui-header-icon" title="更多" aria-label="更多" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><img className="lui-glyph" src="./assets/uploads/lui-more.svg" width="20" height="20" alt=""/></button>
          {menuOpen && <div className="lui-more-menu" role="menu" aria-label="LUI 更多操作">
            <button role="menuitem" onClick={() => { setMenuOpen(false); openAgentHome(); }}>新对话</button>
            <button role="menuitem" onClick={() => { setMenuOpen(false); goCockpit(); }}>关闭面板</button>
          </div>}
        </div>
      </div>
      <LuiScrollArea scrollRef={mainRef} enhanced={true}>
        {luiView === "home" ? (
          <WelcomeHome onChoose={(prompt,feature)=>{setWelcomeFeature(feature);setPromptText(prompt);requestAnimationFrame(()=>document.getElementById("prompt")?.focus({preventScroll:true}));}}/>
        ) : luiView === "uc1" ? (
          <Uc1Chat key={taskPrompt}/>
        ) : luiView === "uc3" ? (
          <Uc3Chat key={taskPrompt}/>
        ) : luiView === "running" || luiView === "done" ? (
          <InspectionConversation running={luiView === "running"} active={runningIndex} prompt={taskPrompt} onLocateReport={() => locate("report")} />
        ) : luiView === "uc2" ? (
          <>
            <Uc2Chat key={app.uc2.runId} />
            {uc2Extra.map((m, i) => (
              <div key={i} className={m.user !== undefined ? "user-msg uc2-followup" : "generated-card uc2-followup"}>
                {m.user !== undefined ? m.user : m.reply}
              </div>
            ))}
          </>
        ) : (
          <InspectionConversation running={false} active={4} prompt={taskPrompt} onLocateReport={() => locate("report")} />
        )}
      </LuiScrollArea>
      <Composer welcome={luiView === "home"} feature={welcomeFeature} onFeatureChange={setWelcomeFeature}/>
    </aside>
  );
}
