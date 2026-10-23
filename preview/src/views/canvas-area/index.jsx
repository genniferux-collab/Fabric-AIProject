import { useEffect, useRef } from "react";
import { Icon } from "../../../assets/shared/icon.jsx";
import { useApp } from "../../context.jsx";
import { deviceById } from "../../mock/devices.js";
import NetworkOverview from "../network-overview/index.jsx";
import MappingCard from "../mapping-card/index.jsx";
import ReportCard from "../report-card/index.jsx";
import DevicePane from "../device-pane/index.jsx";
import Uc2Pane from "../uc2-canvas/index.jsx";
import Ic from "../../components/icon-el/index.jsx";

function CanvasTabs() {
  const { activePane, openDevices, switchPane, closeDevice, uc2, uc2Show } = useApp();
  if (uc2.active) {
    return (
      <div className="canvas-tabs" id="canvasTabs" role="tablist" aria-label="画布页签">
        <div className="canvas-tab active">
          <button role="tab" aria-selected="true" onClick={() => uc2Show(uc2.max)}>
            <Ic icon="layout-panel-top" />智能画布
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="canvas-tabs" id="canvasTabs" role="tablist" aria-label="画布页签">
      <div className={"canvas-tab" + (activePane === "task" ? " active" : "")}>
        <button role="tab" aria-selected={activePane === "task"} onClick={() => switchPane("task")}>
          <Ic icon="layout-panel-top" />智能画布
        </button>
      </div>
      {openDevices.map((id) => {
        const d = deviceById(id);
        return (
          <div key={id} className={"canvas-tab" + (activePane === id ? " active" : "")}>
            <button role="tab" aria-selected={activePane === id} onClick={() => switchPane(id)}>{d.name}</button>
            <button className="close-tab" aria-label={"关闭" + d.name + "页签"} onClick={() => closeDevice(id)}>
              <Ic icon="x" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function CanvasArea() {
  const { canvasHidden, full, setFull, activePane, stage, cardRefs, reportScrollRef } = useApp();
  const contentRef = useRef(null);
  const innerRef = useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);

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
  }, [activePane]);

  const onScroll = () => {
    if (activePane === "task") reportScrollRef.current = contentRef.current?.scrollTop || 0;
    syncScroll();
  };

  const register = (kind) => (el) => { if (el) cardRefs.current[kind] = el; };

  return (
    <main className={"canvas" + (canvasHidden ? " hidden" : "") + (full ? " full" : "")} id="canvas">
      <div className="canvas-head between">
        <CanvasTabs />
        <button className="icon-btn" id="expandBtn" title={full ? "还原画布" : "放大画布"} aria-label={full ? "还原画布" : "放大画布"} onClick={() => setFull(!full)}>
          <Icon name={full ? "minimize" : "maximize"} className="ic" strokeWidth={1.6} />
        </button>
      </div>
      {activePane === "task" ? (
        <div className="scroll-track" id="scrollTrack" ref={trackRef}>
          <div className="scroll-thumb" id="scrollThumb" ref={thumbRef} />
        </div>
      ) : null}
      <div className={"canvas-content" + (activePane === "task" ? "" : " hidden")} id="canvasContent" ref={contentRef} onScroll={onScroll}>
        <div ref={innerRef}>
          <div id="networkOverviewStep" className="v7-artifact-step-title">全网设备概览已获取</div>
          <NetworkOverview cardRef={register("network")} />
          <div className={"mapping-fold v7-artifact-step-title" + (stage < 2 ? " hidden" : "")}>规则选择与自动推荐</div>
          <div className={stage < 2 ? " hidden" : ""}>
            <MappingCard cardRef={register("artifact")} />
          </div>
          <div className={"v7-artifact-step-title" + (stage < 4 ? " hidden" : "")}>对HCS1区内的380台设备进行基线检查</div>
          <div className={stage < 4 ? " hidden" : ""}>
            <ReportCard cardRef={register("report")} />
          </div>
        </div>
      </div>
      <section className={"device-pane" + (activePane === "task" ? " hidden" : "")} id="devicePane" aria-label="设备检查详情">
        {activePane !== "task" ? <DevicePane deviceId={activePane} /> : null}
      </section>
      <Uc2Pane />
    </main>
  );
}
