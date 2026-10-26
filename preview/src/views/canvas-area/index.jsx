import { useEffect, useRef, useLayoutEffect } from "react";
import { useApp, scrollCanvasTo } from "../../context.jsx";
import { deviceById } from "../../mock/devices.js";
import NetworkOverview from "../network-overview/index.jsx";
import MappingCard from "../mapping-card/index.jsx";
import { GeneratingCanvas } from "../lui-panel/thinking.jsx";
import ReportCard from "../report-card/index.jsx";
import DevicePane from "../device-pane/index.jsx";
import Uc2Pane from "../uc2-canvas/index.jsx";
import Ic from "../../components/icon-el/index.jsx";

function CanvasTabs() {
  const { activePane, openDevices, switchPane, closeDevice, uc2, uc2Show, artifactTabs, activeArtifact, openArtifact, closeArtifact, isDark } = useApp();
  if (uc2.active) {
    return (
      <div className="canvas-tabs" id="canvasTabs" role="tablist" aria-label="画布页签">
        <div className="canvas-tab panorama-tab active">
          <button role="tab" aria-selected="true" onClick={() => uc2Show(uc2.max)}>
            <Ic variant={isDark ? "filled" : "lined"} icon="layout-panel-top" />全景画布
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="canvas-tabs" id="canvasTabs" role="tablist" aria-label="画布页签">
      <div className={"canvas-tab panorama-tab" + (activePane === "task" && !activeArtifact ? " active" : "")}>
        <button role="tab" aria-selected={activePane === "task" && !activeArtifact} onClick={() => switchPane("task")}>
          <Ic variant={isDark ? "filled" : "lined"} icon="layout-panel-top" />全景画布
        </button>
      </div>
      {(artifactTabs.length > 0 || openDevices.length > 0) && <span className="canvas-tab-divider" aria-hidden="true" />}
      {artifactTabs.map(t=><div key={'artifact:'+t.kind} className={'canvas-tab'+(activeArtifact===t.kind?' active':'')}><button role="tab" aria-selected={activeArtifact===t.kind} onClick={()=>openArtifact(t.kind,t.title)}><Ic variant={isDark ? "filled" : "lined"} icon={t.kind==='network'?'map':t.kind==='artifact'?'network':'file-text'}/>{t.title}</button><button className="close-tab" aria-label={'关闭'+t.title+'页签'} onClick={()=>closeArtifact(t.kind)}><Ic variant={isDark ? "filled" : "lined"} icon="x"/></button></div>)}
      {openDevices.map((id) => {
        const d = deviceById(id);
        return (
          <div key={id} className={"canvas-tab" + (activePane === id ? " active" : "")}>
            <button role="tab" aria-selected={activePane === id} onClick={() => switchPane(id)}><Ic variant={isDark ? "filled" : "lined"} icon="server" />{d.name}</button>
            <button className="close-tab" aria-label={"关闭" + d.name + "页签"} onClick={() => closeDevice(id)}>
              <Ic variant={isDark ? "filled" : "lined"} icon="x" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function CanvasArea() {
  const { canvasHidden, full, setFull, activePane, stage, cardRefs, reportScrollRef, activeArtifact, luiView, focusLuiArtifact } = useApp();
  const contentRef = useRef(null);
  const innerRef = useRef(null);
  const artifactRef=useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const scrollbarDragRef = useRef(null);
  const followedStepRef = useRef(null);

  // Follow the active workflow inside the canvas, accounting for the scaled UC4 shell.
  useLayoutEffect(() => {
    if (canvasHidden || activePane !== "task" || activeArtifact || !["running", "done"].includes(luiView)) return;
    const key = `${stage}:${luiView}`;
    if (followedStepRef.current === key) return;
    let cancelScroll;
    const frame = requestAnimationFrame(() => {
      const step = stage < 0 ? -1 : stage < 2 ? 0 : stage === 2 ? 2 : 3;
      const target = innerRef.current?.querySelector(`[data-canvas-step="${step}"]`);
      if (target && !target.classList.contains("hidden")) { cancelScroll = scrollCanvasTo(target, "linear"); followedStepRef.current = key; }
    });
    return () => { cancelAnimationFrame(frame); cancelScroll?.(); };
  }, [stage, luiView, canvasHidden, activePane, activeArtifact]);

  useLayoutEffect(()=>{
    if(!activeArtifact)return;
    const card=cardRefs.current[activeArtifact],host=artifactRef.current;
    if(!card||!host)return;
    const anchor=document.createComment('UC4 artifact source');card.before(anchor);host.appendChild(card);
    return ()=>{if(anchor.parentNode)anchor.replaceWith(card)};
  },[activeArtifact,activePane,cardRefs]);

  // 自定义滚动条同步
  const syncScroll = () => {
    const c = contentRef.current, t = trackRef.current, thumb = thumbRef.current;
    if (!c || !t || !thumb) return;
    const h = t.clientHeight;
    const ratio = c.clientHeight / c.scrollHeight;
    if (ratio >= 1) { t.style.display = "none"; return; }
    t.style.display = "block";
    const th = Math.max(32, h * ratio);
    thumb.style.height = th + "px";
    thumb.style.top = ((h - th) * c.scrollTop) / Math.max(1, c.scrollHeight - c.clientHeight) + "px";
  };

  useEffect(() => {
    const c = contentRef.current, inner = innerRef.current;
    if (!c || !inner) return;
    const ro = new ResizeObserver(syncScroll);
    ro.observe(inner);
    window.addEventListener("resize", syncScroll);
    return () => { ro.disconnect(); window.removeEventListener("resize", syncScroll); };
  }, []);

  // 切回任务画布时恢复报告滚动位置
  useEffect(() => {
    if (activePane === "task" && contentRef.current) {
      contentRef.current.scrollTop = reportScrollRef.current;
      requestAnimationFrame(syncScroll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePane,activeArtifact]);

  const onScroll = () => {
    if (activePane === "task") reportScrollRef.current = contentRef.current?.scrollTop || 0;
    syncScroll();
  };

  const onScrollbarPointerDown = event => {
    const content = contentRef.current, track = trackRef.current, thumb = thumbRef.current;
    if (!content || !track || !thumb) return;
    const travel = track.clientHeight - thumb.clientHeight;
    const overflow = content.scrollHeight - content.clientHeight;
    if (travel <= 0 || overflow <= 0) return;
    event.preventDefault();
    const rect = track.getBoundingClientRect(), scale = rect.height / track.clientHeight;
    if (event.target !== thumb) {
      content.scrollTop = Math.max(0, Math.min(travel, (event.clientY - rect.top) / scale - thumb.clientHeight / 2)) / travel * overflow;
      syncScroll();
    }
    scrollbarDragRef.current = { y:event.clientY, scroll:content.scrollTop, ratio:overflow / travel / scale };
    track.setPointerCapture(event.pointerId);
  };

  const register = (kind) => (el) => { if (el) { cardRefs.current[kind] = el; el.dataset.artifactKind = kind; el.tabIndex = 0; } };
  const onCanvasClick = event => {
    if (event.target.closest('button,a,input,textarea,select,[role="button"],[role="tab"],[role="checkbox"]')) return;
    const card = event.target.closest('.card[data-artifact-kind]');
    if (card && event.currentTarget.contains(card)) focusLuiArtifact(card.dataset.artifactKind);
  };
  const onCanvasKeyDown = event => {
    if (!['Enter', ' '].includes(event.key) || !event.target.matches('.card[data-artifact-kind]')) return;
    event.preventDefault();
    focusLuiArtifact(event.target.dataset.artifactKind);
  };

  return (
    <main className={"canvas" + (canvasHidden ? " hidden" : "") + (full ? " full" : "")} id="canvas" onClickCapture={onCanvasClick} onKeyDown={onCanvasKeyDown}>
      <div className="canvas-head between">
        <CanvasTabs />
        <button className="icon-btn" id="expandBtn" title={full ? "还原画布" : "放大画布"} aria-label={full ? "还原画布" : "放大画布"} onClick={() => setFull(!full)}>
          <svg className="canvas-expand-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={full ? "M2.3 3.7 7.6 9H3v2h8V3H9v4.6L3.7 2.3zM21.7 20.3 16.4 15H21v-2h-8v8h2v-4.6l5.3 5.3z" : "M2 2h8v2H5.4l5.3 5.3-1.4 1.4L4 5.4V10H2zM22 22h-8v-2h4.6l-5.3-5.3 1.4-1.4 5.3 5.3V14h2z"}/></svg>
        </button>
      </div>
      {activePane === "task" && !activeArtifact ? (
        <div className="scroll-track" id="scrollTrack" ref={trackRef} onPointerDown={onScrollbarPointerDown} onPointerMove={event => { const drag = scrollbarDragRef.current; if (drag) { contentRef.current.scrollTop = drag.scroll + (event.clientY - drag.y) * drag.ratio; syncScroll(); } }} onPointerUp={() => { scrollbarDragRef.current = null; }} onPointerCancel={() => { scrollbarDragRef.current = null; }} onLostPointerCapture={() => { scrollbarDragRef.current = null; }}>
          <div className="scroll-thumb" id="scrollThumb" ref={thumbRef} />
        </div>
      ) : null}
      <div className={"canvas-content" + (activePane === "task" && !activeArtifact ? "" : " hidden")} id="canvasContent" ref={contentRef} onScroll={onScroll}>
        <div ref={innerRef} className="workflow-canvas-flow">
          {luiView === "running" && stage < 0 && <section className="workflow-canvas-step" data-canvas-step="-1" aria-label="思考阶段：正在生成画布"><GeneratingCanvas/></section>}
          <section className={"workflow-canvas-step" + (stage < 0 ? " hidden" : "")} data-canvas-step="0" aria-label="步骤1：全网设备概览">
            <div id="networkOverviewStep" className="v7-artifact-step-title">{luiView === "running" && stage === 0 ? "正在扫描拓扑并识别全网设备" : "全网设备概览已获取"}</div>
            {stage >= 0 && <NetworkOverview cardRef={register("network")} />}
          </section>
          <section className={"workflow-canvas-step" + (stage < 2 ? " hidden" : "")} data-canvas-step="2" aria-label="步骤3：规则选择与自动推荐">
            <div className="v7-artifact-step-title">规则选择与自动推荐<img className="artifact-step-locate" src="./assets/uploads/artifact-locate-panel.svg" width="12" height="12" alt="" aria-hidden="true" /></div>
            <MappingCard cardRef={register("artifact")} />
          </section>
          <section className={"workflow-canvas-step" + (stage < 3 ? " hidden" : "")} data-canvas-step="3" aria-label="步骤4：设备基线检查">
            <div className="v7-artifact-step-title">对HCS1区内的380台设备进行基线检查</div>
            {stage === 3 && <div className="card workflow-checking" role="status"><i className="v7-step-spinner" />正在对 HCS1 区的 380 台设备执行基线检查…</div>}
            <div className={stage < 4 ? " hidden" : ""}><ReportCard cardRef={register("report")} /></div>
          </section>
        </div>
      </div>
      <section className={"device-pane" + (activePane === "task" || activeArtifact ? " hidden" : "")} id="devicePane" aria-label="设备检查详情">
        {activePane !== "task" ? <DevicePane deviceId={activePane} /> : null}
      </section>
      <section ref={artifactRef} className={"v7-artifact-pane"+(activeArtifact?"":" hidden")} aria-label="独立卡片页签"/>
      <Uc2Pane />
    </main>
  );
}
