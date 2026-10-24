import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp, highlightLocate } from "../../context.jsx";
import { v7WorkflowSteps, v7WorkflowRunning, recs } from "../../mock/workflow.js";
import { ArtifactTag } from "../../components/status-marks/index.jsx";
import { SummaryCopy } from "../report-card/index.jsx";
import { affectedBy } from "../../mock/audit.js";
import Uc2Chat from "./uc2-chat.jsx";
import Ic from "../../components/icon-el/index.jsx";
import Composer from "./composer.jsx";

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
      const tag = stepsRef.current?.querySelector(`[data-step-index="${index}"] [data-lui-artifact="${luiFocus.kind}"]`);
      const step = tag?.closest('.step'), main = tag?.closest('#luiMain');
      if (!tag || !step || !main || !tag.getClientRects().length) return;
      const rect = main.getBoundingClientRect();
      const scale = rect.height / main.offsetHeight || 1;
      main.scrollTo({ top: Math.max(0, main.scrollTop + (step.getBoundingClientRect().top - rect.top) / scale - 16), behavior: 'smooth' });
      highlightLocate(tag);
      highlightedSeq.current = luiFocus.seq;
    });
    return () => cancelAnimationFrame(frame);
  }, [luiFocus, groupExpanded, openSteps]);
  const products = { 0: "network", 2: "artifact", 3: "report" };
  const toggle = index => { setSelectedStep(index); setOpenSteps(steps => ({ ...steps, [index]: !steps[index] })); };
  return (
    <div className="steps workflow-steps" ref={stepsRef}>
      {v7WorkflowSteps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        const available = done || current;
        const expanded = available && !!openSteps[index];
        const product = products[index];
        const body = done ? step.description : current ? v7WorkflowRunning[index] : "";
        return (
          <div key={step.title} className={"step " + (done ? "is-done" : current ? "is-running" : "pending") + (selectedStep === index ? " is-selected" : "")} data-step-index={index}>
            <span className={"status " + (done ? "done" : current ? "running" : "")} aria-label={done ? "已完成" : current ? "进行中" : "待执行"}>
              {done ? <svg className="workflow-node-check" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6.5 2.2 5.3 4.4 7.5 9.8 2.1 11 3.3 4.4 9.9Z" /></svg> : current ? <i className="v7-step-spinner" /> : index + 1}
            </span>
            <div className="step-heading">
              <button type="button" className="step-title" disabled={!available} aria-expanded={expanded} aria-controls={`workflowStep${index}`} onClick={() => toggle(index)}>{step.title}</button>
              {available && <div className="step-actions">
                {product && <><button type="button" className="step-action" aria-label={`定位步骤：${step.title}`} title="定位到画布" onClick={() => { setSelectedStep(index); locate(product, "step"); }}><Ic variant={isDark ? "filled" : "lined"} icon="locate-fixed" /></button><span className="step-action-divider" aria-hidden="true" /></>}
                <button type="button" className="step-action" aria-label={`${expanded ? "收起" : "展开"}步骤：${step.title}`} aria-expanded={expanded} aria-controls={`workflowStep${index}`} onClick={() => toggle(index)}><Ic variant={isDark ? "filled" : "lined"} icon={expanded ? "chevron-up" : "chevron-down"} /></button>
              </div>}
            </div>
            {body ? (
              <div className="step-content" id={`workflowStep${index}`} hidden={!expanded}>
                {body}
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
                {index === 3 && done ? <div className="v7-step-artifact"><ArtifactTag title="HCS1 区基线检查报告" type="process" shape="report" onLocate={() => locate("report")} /></div> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// 完成态汇报（最终文案口径）
function Completion({ onLocateReport }) {
  return (
    <>
      <section className="completion audit-completion">
        <h2>已完成 HCS1 区的全量基线检查</h2>
        <p><SummaryCopy/></p>
        <h3>处理建议</h3>
        <ul className="audit-advice">
          <li><strong>登录安全：</strong>{affectedBy("timeout").length}台设备存在空闲超时超限，3台设备使用不符合基线的 SSH 算法，建议核验后调整。</li>
          <li><strong>规划一致性：</strong>2台管理 IP、2台 NTP 时钟源与规划不一致，建议核对变更审批，再恢复配置或更新台账。</li>
          <li><strong>网络访问范围：</strong>1台设备额外放通未规划 VLAN，建议核验业务依赖后收敛放通范围。</li>
        </ul>
        <div className="small muted">以上为建议，尚未执行；具体配置与修复命令按设备、规则分别查看。</div>
        <div className="v7-step-artifact">
          <ArtifactTag title="HCS1 区基线检查报告" type="conclusion" shape="report" onLocate={onLocateReport} />
        </div>
      </section>
    </>
  );
}

// Keep the same response card mounted while execution progresses and completes.
function InspectionConversation({ running, active, prompt, onLocateReport }) {
  const { isDark, luiFocus } = useApp();
  const [expanded, setExpanded] = useState(true);
  useEffect(() => { if (!running) setExpanded(false); }, [running]);
  useEffect(() => { if (luiFocus) setExpanded(true); }, [luiFocus]);
  const title = running ? "正在执行处置步骤" : "已完成基线检查 · 4个步骤";
  return (
    <>
      <div className="user-msg">{prompt}</div>
      <article className="generated-card" aria-label="基线检查回答">
        <div className="response-process">
          <button type="button" className="response-title" aria-expanded={expanded} aria-controls="uc4WorkflowSteps" onClick={() => setExpanded(value => !value)}>
            <span>{title}</span><Ic variant={isDark ? "filled" : "lined"} icon={expanded ? "chevron-up" : "chevron-down"} />
          </button>
          <div className="response-steps" id="uc4WorkflowSteps" hidden={!expanded}>
            <WorkflowSteps active={running ? active : 4} groupExpanded={expanded} />
          </div>
        </div>
        {!running && <Completion onLocateReport={onLocateReport} />}
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
  const detailTitle = luiView === "home" ? "网络运维智能体" : luiView === "uc2" ? "黄金基线挖掘" : "检查基线要求";

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
    <aside className={"lui" + (luiView !== "uc2" ? " lui-refresh" : "") + (luiOpen ? "" : " closed")} id="lui">
      <div className="lui-head between">
        <div className="lui-detail-heading">
          <button className="lui-header-icon" aria-label={luiView === "home" ? "返回首页" : "返回智能体首页"} onClick={luiView === "home" ? goCockpit : openAgentHome}><Ic variant={isDark ? "filled" : "lined"} icon="arrow-left" /></button>
          <span className="lui-detail-title">{detailTitle}</span>
        </div>
        <div className="lui-more" ref={menuRef}>
          <button className="lui-header-icon" title="更多" aria-label="更多" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><Ic variant={isDark ? "filled" : "lined"} icon="ellipsis" /></button>
          {menuOpen && <div className="lui-more-menu" role="menu" aria-label="LUI 更多操作">
            <button role="menuitem" onClick={() => { setMenuOpen(false); openAgentHome(); }}>新对话</button>
            <button role="menuitem" onClick={() => { setMenuOpen(false); goCockpit(); }}>关闭面板</button>
          </div>}
        </div>
      </div>
      <LuiScrollArea scrollRef={mainRef} enhanced={luiView !== "uc2"}>
        {luiView === "home" ? (
          <div className="landing">
            <div className="aico-icon hero-icon"><Ic variant={isDark ? "filled" : "lined"} icon="sparkles" /></div>
            <h2>你好，我是 Aico</h2>
            <div className="secondary">从配置洞察到基线检查，<br />我可以协助你完成网络运维任务。</div>
            <div className="recommendations">
              {recs.map((r, i) => (
                <button key={i} className="rec" onClick={() => chooseUC(i)}>
                  <span className="rec-title">{r[0]}</span>
                  <span className="rec-sub">{r[1]}</span>
                </button>
              ))}
            </div>
            <span className="small muted" style={{ marginTop: "20px" }}>试试描述设备、区域或需要检查的配置</span>
          </div>
        ) : luiView === "running" || luiView === "done" ? (
          <InspectionConversation running={luiView === "running"} active={runningIndex} prompt={taskPrompt} onLocateReport={() => locate("report")} />
        ) : luiView === "uc2" ? (
          <>
            <Uc2Chat />
            {uc2Extra.map((m, i) => (
              <div key={i} className={m.user !== undefined ? "user-msg" : "secondary small"} style={m.user !== undefined ? undefined : { margin: "12px 0" }}>
                {m.user !== undefined ? m.user : m.reply}
              </div>
            ))}
          </>
        ) : (
          <InspectionConversation running={false} active={4} prompt={taskPrompt} onLocateReport={() => locate("report")} />
        )}
      </LuiScrollArea>
      <Composer />
    </aside>
  );
}
