import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import { uc2Prompt, uc2Names } from "../../mock/uc2.js";
import { ArtifactTag } from "../../components/status-marks/index.jsx";
import Ic from "../../components/icon-el/index.jsx";
import LuiGlyph from "./glyph.jsx";
import ResponseTools from "./response-tools.jsx";
import Uc2TypedCopy from "./uc2-typed-copy.jsx";

// UC2 uses the same answer, progressive steps and artifact controls as UC4.
export default function Uc2Chat() {
  const { uc2, uc2Pause, uc2Next, uc2Start, uc2Show, uc2Scroll, isDark } = useApp();
  const done = uc2.max === 3 && uc2.phase === "complete";
  const [expanded, setExpanded] = useState(true);
  const [openSteps, setOpenSteps] = useState({ 0: true });
  const [selectedStep, setSelectedStep] = useState(0);
  const started = useRef(Date.now());
  const followOutput = useRef(true);
  const [finished, setFinished] = useState(null);

  useEffect(() => {
    setOpenSteps({ 0: true, 1: uc2.max >= 1, 2: uc2.max >= 2, 3: uc2.max >= 3 });
    setSelectedStep(done ? null : uc2.max);
    if (uc2.max === 0) { started.current = Date.now(); setFinished(null); setExpanded(true); }

    if (done) setFinished({ at: new Date(), duration: ((Date.now() - started.current) / 1000).toFixed(1) });
  }, [uc2.max, done]);
  useLayoutEffect(() => {
    const main = document.getElementById("luiMain"), flow = main?.firstElementChild;
    if (!main || !flow) return;
    followOutput.current = true;
    let frame = 0;
    const align = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (followOutput.current) main.scrollTop = main.scrollHeight; });
    };
    const wheel = event => { if (event.deltaY < 0) followOutput.current = false; };
    const observer = new ResizeObserver(align);
    observer.observe(flow); observer.observe(main); main.addEventListener("wheel", wheel, { passive: true }); align();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); main.removeEventListener("wheel", wheel); };
  }, [uc2.max, uc2.phase, done, finished]);
  useEffect(() => {
    if (!uc2Scroll) return;
    const step = uc2Scroll.module;
    if (step < uc2.stage) followOutput.current = false;
    setOpenSteps(value => ({ ...value, [step]: true }));
    setSelectedStep(step);
  }, [uc2Scroll]);

  const copy = {
    0: <><p className="uc2-intent-summary">已识别本次任务为黄金基线自动挖掘，并匹配对应的 Skill。分析范围锁定西三旗 DC 交换机设备，重点关注一致性处于 95%～99.9% 的配置规则。</p><div>自动挖掘西三旗 DC 的黄金基线</div><ul className="uc2-intent-fields"><li>数据中心：西三旗 DC</li><li>设备范围：核心区、外联区、业务1区、业务2区</li><li>设备类型：交换机</li><li>约束条件：重点关注一致性处于 95%～99.9% 的配置规则</li></ul></>,
    1: <><p className="uc2-step-result">调用数字地图接口，获取西三旗 DC 的设备清单及拓扑关系，并根据设备角色进行分组，为后续基线挖掘建立分析对象。</p>共为您找到西三旗 DC 下 <strong>1980 台</strong>满足条件的交换机设备；定位 <strong>2 台核心交换机 Coreswitch_01、Coreswitch_02</strong>，开始还原黄金配置基线。</>,
    2: <><p className="uc2-step-result">分析设备配置，按设备角色提取共性配置项，计算各规则的一致性，形成候选黄金基线，并识别偏离主流配置的设备。</p><ul className="uc2-mining-stats"><li>分析设备：1980 台</li><li>共性配置项：47 条</li><li>一致性 100%：44 条</li><li>一致性 99%：2 条</li><li>一致性 97%：1 条</li></ul><p className="uc2-mining-scope">1980 台配置初筛后，本轮以 20 台核心交换机、80 台 Leaf 交换机作为角色样本，形成 18 条候选规则。</p></>,
    3: <>已生成 <strong>18 条候选规则</strong>，其中 12 条高置信、6 条待验证；100 台分析样本中有 <strong>9 台</strong>存在候选规则偏离，仍需审阅确认。</>,
  };
  const artifacts = { 1: "网络拓扑图", 2: "基线挖掘图谱" };
  const timestamp = finished ? `${finished.at.getFullYear()}-${String(finished.at.getMonth() + 1).padStart(2, "0")}-${String(finished.at.getDate()).padStart(2, "0")} ${finished.at.toTimeString().slice(0, 8)}` : "";
  const toggleStep = step => { followOutput.current = false; setSelectedStep(step); setOpenSteps(value => ({ ...value, [step]: !value[step] })); };

  return <>
    <div className="uc2-task-time">{new Date(started.current).toLocaleString("zh-CN", { year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false })}</div>
    <div className="user-msg">{uc2Prompt}</div>
    <article className="generated-card" aria-label="黄金基线挖掘回答">
      <div className="response-process">
        <button type="button" className="response-title" aria-expanded={expanded} aria-controls="uc2WorkflowSteps" onClick={() => setExpanded(value => !value)}>
          <LuiGlyph name={done ? "completed" : "processing"} size={14} /><span>{done ? "已完成思考" : uc2.running ? "正在执行" + uc2Names[uc2.stage] : uc2Names[uc2.stage] + "已暂停"}</span><Ic variant={isDark ? "filled" : "lined"} icon={expanded ? "chevron-up" : "chevron-down"} />
        </button>
        <div className="response-steps" id="uc2WorkflowSteps" hidden={!expanded}>
          <p className="uc2-analysis-brief">用户希望自动挖掘西三旗 DC 的黄金配置基线，并识别现网配置偏差。需要先结合用户指定的设备类型和一致性区间，确定分析范围；再通过数字地图获取设备及拓扑信息，按设备角色进行配置共性分析，最终形成黄金基线规则，并识别潜在不合规设备。</p>
          <p className="response-intent">已理解您的需求并明确实施路径。我将通过黄金基线挖掘 Skill，依次完成意图识别、设备发现、基线挖掘和结果呈现，下面开始执行。</p>
          <div className="steps workflow-steps uc2-workflow-steps">
            {[0, 1, 2, 3].slice(0, uc2.max + 1).map(step => {
              const completed = step < uc2.max || (step === uc2.stage && uc2.phase === "complete");
              const current = !completed && step === uc2.max;
              const open = !!openSteps[step];
              return <div key={step} className={"step " + (completed ? "is-done" : "is-running") + (selectedStep === step ? " is-selected" : "") + (current && !uc2.running ? " is-paused" : "")}>
                <span className={"status " + (completed ? "done" : "running")} aria-label={completed ? "已完成" : uc2.running ? "进行中" : "已暂停"}><LuiGlyph name={completed ? selectedStep === step ? "step-selected" : "step-done" : "step-running"} size={16} /></span>
                <div className="step-heading">
                  <button type="button" className="step-title" aria-expanded={open} aria-controls={`uc2WorkflowStep${step}`} onClick={() => toggleStep(step)}>{uc2Names[step]}</button>
                  <div className="step-actions">
                    {completed && <><button type="button" className="step-action" aria-label={`定位步骤：${uc2Names[step]}`} title="定位到画布" onClick={() => { setSelectedStep(step); uc2Show(step); }}><img className="lui-glyph" src="./assets/uploads/lui-step-locate.svg" width="12" height="12" alt="" /></button><span className="step-action-divider" aria-hidden="true" /></>}
                    <button type="button" className="step-action" aria-label={`${open ? "收起" : "展开"}步骤：${uc2Names[step]}`} aria-expanded={open} aria-controls={`uc2WorkflowStep${step}`} onClick={() => toggleStep(step)}><Ic icon={open ? "chevron-up" : "chevron-down"} /></button>
                  </div>
                </div>
                <div className="step-content" id={`uc2WorkflowStep${step}`} hidden={!open}>
                  <Uc2TypedCopy step={step}>{copy[step]}</Uc2TypedCopy>
                  {current && uc2.phase === "canvas" && <p className="uc2-canvas-progress" role="status">正在生成对应画布…</p>}
                  {completed && step > 0 && step < 3 && <div className="v7-step-artifact"><ArtifactTag title={artifacts[step]} type="process" shape={step === 1 ? "overview" : "mapping"} onLocate={() => uc2Show(step)} /></div>}
                </div>
              </div>;
            })}
          </div>
          {!done && <div className="uc2-run-controls"><button type="button" className="btn" onClick={uc2Pause}>{uc2.running ? "暂停演示" : "继续执行"}</button><button type="button" className="btn" onClick={uc2Next}>下一步 <Ic icon="arrow-right" /></button></div>}
        </div>
      </div>
      {!done && <ResponseTools timestamp={new Date(started.current).toLocaleTimeString("zh-CN", {hour12:false})} subject="分析" duration={((Date.now() - started.current) / 1000).toFixed(1)} text="已识别黄金基线挖掘意图，分析西三旗DC交换机，重点关注一致性95%～99.9%的配置规则。" onRegenerate={uc2Start} onLocate={()=>uc2Show(uc2.max)} locateLabel="定位当前分析画布" />}
      {done && <>
        <section className="completion audit-completion" id="uc2Conclusion" data-report-result="true">
          <h2>黄金基线候选报告已生成</h2>
          <p>本轮分析 <strong>100 台样本设备</strong>，发现 <strong>18 条候选规则</strong>，其中 12 条高置信、6 条待验证；<strong>9 台设备</strong>存在候选偏离，详情见右侧报告。</p>
          <h3>审阅建议</h3>
          <ul className="audit-advice"><li><strong>重点核验：</strong><span>优先审阅登录安全、核心冗余配置及低样本支持项。</span></li><li><strong>角色与规划：</strong><span>核对 VLAN 范围、接口描述等与角色或规划相关的变量。</span></li></ul>
          <div className="small muted">候选规则尚未发布，也未向设备下发任何变更。</div>
          <div className="v7-step-artifact"><ArtifactTag title="黄金基线候选报告" type="conclusion" shape="report" timestamp={timestamp} onLocate={() => uc2Show(3)} /></div>
        </section>
        <ResponseTools timestamp={timestamp.slice(5)} duration={finished?.duration || "0.0"} subject="挖掘" text="本轮分析100台样本设备，发现18条候选规则，其中12条高置信、6条待验证，9台设备存在候选偏离。候选规则尚未发布。" onRegenerate={uc2Start} onLocate={() => uc2Show(3)} locateLabel="定位候选报告" />
      </>}
    </article>
  </>;
}
