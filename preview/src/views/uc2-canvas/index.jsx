import { useEffect, useRef } from "react";
import { Icon } from "../../../assets/shared/icon.jsx";
import { useApp, highlightLocate, scrollCanvasTo } from "../../context.jsx";
import Uc2Topology from "./topology.jsx";
import Uc2Intent from "./intent.jsx";
import "./restoration.css";
import Uc2Mining from "./mining.jsx";
import Uc2ReportGeneration from "./report-generation.jsx";
import "./generation.css";
import { Uc2Report } from "./report.jsx";
import {GeneratingCanvas} from "../lui-panel/thinking.jsx";

function CanvasPreparing({ stage, paused }) {
  return <GeneratingCanvas id={"uc2PreparingStage"+stage} paused={paused}/>;
}

// UC2 画布：三级瀑布模块（设备还原 → 黄金基线挖掘 → 生成报告）
export default function Uc2Pane() {
  const { uc2, uc2Scroll, uc2FocusStep, cardRefs, activeArtifact, resultTask } = useApp();
  const renderedMaxRef = useRef(0);

  // 新模块出现 → 平滑定位
  useEffect(() => {
    if ((uc2.max > 1 && uc2.max > renderedMaxRef.current) || uc2.phase === "canvas") {
      requestAnimationFrame(() => document.getElementById("uc2Module" + uc2.max)?.scrollIntoView({ behavior: resultTask?.uc==="uc2"?"instant":"smooth", block: "start" }));
    }
    renderedMaxRef.current = uc2.max;
  }, [uc2.max, uc2.phase, uc2.stage]);

  // 定位信号（步骤跳转 / 打开规则 / 抽屉滚动）
  useEffect(() => {
    if (!uc2Scroll || uc2Scroll.target === "conversation") return;
    requestAnimationFrame(() => {
      const module = document.getElementById("uc2Module" + uc2Scroll.module);
      if (!module) return;
      scrollCanvasTo(module,resultTask?.uc==="uc2"?"instant":"smooth");
      highlightLocate(module.querySelector('.uc2-restoration-host,.card') || module);
    });
  }, [uc2Scroll,resultTask]);

  if (!uc2.active) return null;
  if (uc2.max === 0) return <section id="uc2Pane" data-generation-phase={uc2.phase} data-generation-stage={uc2.stage} aria-label="黄金基线挖掘画布"><Uc2Intent /></section>;

  const headings = { 1: "设备还原", 2: "黄金基线挖掘", 3: "生成报告 · 黄金基线候选结果" };
  const artifactKinds = { 1: "uc2-topology", 2: "uc2-mining", 3: "uc2-report" };
  const modules = [];
  for (let i = 1; i <= uc2.max; i++) {
    const pendingText = i === uc2.stage && uc2.phase === "text";
    const content = pendingText ? <CanvasPreparing stage={i} paused={!uc2.running}/> : i === 3 ? <Uc2ReportGeneration><Uc2Report /></Uc2ReportGeneration> : i === 1 ? <Uc2Topology /> : <Uc2Mining />;
    modules.push(
      <section key={i} hidden={uc2.view === "intent"} className="uc2-waterfall-module" id={"uc2Module" + i} aria-label={headings[i]}>
        <h2 className="uc2-module-name">
          <Icon name={i === 1 ? "network" : i === 2 ? "sparkles" : "file-text"} className="ic" strokeWidth={1.6} />
          {headings[i]}
          <button type="button" className="uc2-locate-conversation" aria-label={`定位分析对话：${headings[i]}`} title="定位到 AI 对话" onClick={() => uc2FocusStep(i)}><img src="./assets/uploads/artifact-locate-panel.svg" width="12" height="12" alt=""/></button>
        </h2>
        <div className={(i === 1 ? "uc2-restoration-host" : "card") + " uc2-module-artifact" + (pendingText ? " is-preparing" : "") + (i === 2 ? " uc2-mining-artifact" : "") + (i === 3 ? " artifact-card uc2-report-card" : "")} data-artifact-kind={artifactKinds[i]} ref={element => { if (element) cardRefs.current[artifactKinds[i]] = element; }} {...(i === 3 ? { id: "uc2StageContent" } : {})}>{content}</div>
      </section>
    );
  }

  return (
    <section id="uc2Pane" className={activeArtifact ? "uc2-source-hidden" : ""} data-generation-phase={uc2.phase} data-generation-stage={uc2.stage} aria-label="黄金基线挖掘画布">
      {uc2.view === "intent" && <Uc2Intent/>}
      {modules}
    </section>
  );
}
