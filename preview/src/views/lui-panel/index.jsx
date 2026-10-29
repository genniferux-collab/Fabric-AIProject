import LuiScrollArea from '../../components/follow-scroll/index.jsx';
import StepAnalysis from '../../components/step-analysis/index.jsx';
import Uc3Chat from './uc3-chat.jsx';
import {completionTimeline} from '../../mock/uc4-completion.js';
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp, highlightLocate } from "../../context.jsx";
import { v7WorkflowSteps, v7WorkflowRunning, v7WorkflowThoughts } from "../../mock/workflow.js";
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

// 四阶段执行步骤（active = 当前进行到第几步，0 基）
function WorkflowSteps({ active, groupExpanded }) {
  const { locate, isDark, luiFocus, workflowSettled } = useApp();
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
        const done = index < active || workflowSettled.includes(index);
        const current = index === active && !done;
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
                <StepAnalysis active={current} thought={v7WorkflowThoughts[index]} conclusion={step.description} conclusionReady={done} progressCopy={v7WorkflowRunning[index]}/>
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
      <LuiScrollArea scrollRef={mainRef} enhanced={true} followKey={(luiView==="home"?"home":taskPrompt)+":"+(app.uc2.active?app.uc2.runId:"")} focusSignal={(app.luiFocus?.seq||0)+":"+(app.uc2Scroll?.seq||0)}>
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
