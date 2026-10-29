import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp, highlightLocate } from "../../context.jsx";
import { uc2Prompt, uc2Names,uc2CandidateStats } from "../../mock/uc2.js";
import { ArtifactTag } from "../../components/status-marks/index.jsx";
import Ic from "../../components/icon-el/index.jsx";
import LuiGlyph from "./glyph.jsx";
import Uc2TypedCopy from "./uc2-typed-copy.jsx";
import { ThinkingDetails } from "./thinking.jsx";
import { MotionTitle, SoftHeight } from "./motion.jsx";
import Uc2Completion from "./uc2-completion.jsx";

const thoughts = [
  "先确认挖掘意图、数据中心与设备类型，识别一致性区间等约束，确定本次黄金基线挖掘的分析范围。",
  "获取设备清单与拓扑关系，识别核心与 Leaf 角色。先确认设备范围，再选择代表样本，避免将不同角色的配置混为一谈。",
  "按设备角色对齐配置，提取共性模式并计算一致性。区分跨角色共性、核心与 Leaf 专属规则，再核验偏离样本。",
  "汇总候选规则、支持样本及配置偏离，核对角色分布和置信度，形成可追溯、待人工审阅的挖掘报告。",
];

export default function Uc2Chat() {
  const { uc2, uc2Show, uc2Scroll, isDark, resultTask } = useApp();
  const done = uc2.max === 3 && uc2.phase === "complete";
  const [expanded, setExpanded] = useState(true);
  const [openSteps, setOpenSteps] = useState({ 0: true });
  const [selectedStep, setSelectedStep] = useState(0);
  const started = useRef(Date.now());
  const answerRef = useRef(null), focusedSeq = useRef(0);
  const [finished, setFinished] = useState(null);

  // Match UC4: reveal the current step, collapse past steps, then keep the result outside the process.
  useEffect(() => {
    setOpenSteps(done ? {} : { [uc2.max]: true });
    setSelectedStep(done ? null : uc2.max);
    setExpanded(!done);
    if (done) setFinished({ at: new Date(resultTask?.uc==="uc2"?resultTask.completedAt:Date.now()), duration: ((Date.now() - started.current) / 1000).toFixed(1) });
  }, [uc2.max, done,resultTask]);
  // Canvas -> conversation is distinct from conversation -> canvas, so reviewing never causes a scroll loop.
  useEffect(() => {
    if (!uc2Scroll || uc2Scroll.target !== "conversation") return;
    if (uc2Scroll.module !== 3 || !done) setExpanded(true);
    setOpenSteps(steps => ({ ...steps, [uc2Scroll.module]: true }));
    setSelectedStep(uc2Scroll.module);
  }, [uc2Scroll, done]);
  useLayoutEffect(() => {
    if (!uc2Scroll || uc2Scroll.target !== "conversation" || focusedSeq.current === uc2Scroll.seq) return;
    const index = uc2Scroll.module;
    if (!(done && index === 3) && (!expanded || !openSteps[index])) return;
    const frame = requestAnimationFrame(() => {
      const target = done && index === 3 ? answerRef.current?.querySelector('.v7-conclusion-card') || answerRef.current?.querySelector('#uc2Conclusion') : answerRef.current?.querySelector(`[data-step-index="${index}"]`);
      const main = target?.closest('#luiMain');
      if (!target || !main) return;
      const scale = main.getBoundingClientRect().height / main.offsetHeight || 1;
      main.scrollTo({ top: Math.max(0, main.scrollTop + (target.getBoundingClientRect().top - main.getBoundingClientRect().top) / scale - 16), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      highlightLocate(target.querySelector('[data-lui-artifact]') || target);
      focusedSeq.current = uc2Scroll.seq;
    });
    return () => cancelAnimationFrame(frame);
  }, [uc2Scroll, expanded, openSteps, done]);
  const copy = {
    0: <><p className="uc2-intent-summary">已识别本次任务为黄金基线自动挖掘，并匹配对应的 Skill。分析范围锁定西三旗 DC 交换机设备，重点关注一致性处于 95%～99.9% 的配置规则。</p><div>自动挖掘西三旗 DC 的黄金基线</div><ul className="uc2-intent-fields"><li>数据中心：西三旗 DC</li><li>设备范围：核心区、外联区、业务1区、业务2区</li><li>设备类型：交换机</li><li>约束条件：重点关注一致性处于 95%～99.9% 的配置规则</li></ul></>,
    1: <><p className="uc2-step-result">调用数字地图接口，获取西三旗 DC 的设备清单及拓扑关系，并根据设备角色进行分组，为后续基线挖掘建立分析对象。</p>共为您找到西三旗 DC 下 <strong>1980 台</strong>满足条件的交换机设备；定位 <strong>2 台核心交换机 Coreswitch_01、Coreswitch_02</strong>，开始还原黄金配置基线。</>,
    2: <><p className="uc2-step-result">分析设备配置，按设备角色提取共性配置项，计算各规则的一致性，形成候选黄金基线，并识别偏离主流配置的设备。</p><ul className="uc2-mining-stats"><li>分析设备：1980 台</li><li>共性配置项：47 条</li><li>高置信候选：{uc2CandidateStats.high} 条（95%–99%）</li><li>中置信度候选：{uc2CandidateStats.medium} 条（90%–94%）</li><li>完全重合配置不纳入候选规则</li></ul><p className="uc2-mining-scope">1980 台配置初筛后，本轮以 20 台核心交换机、80 台 Leaf 交换机作为角色样本，形成 {uc2CandidateStats.total} 条候选规则。</p></>,
    3: <>已生成 <strong>{uc2CandidateStats.total} 条候选规则</strong>，其中 {uc2CandidateStats.high} 条高置信、{uc2CandidateStats.medium} 条中置信度；100 台分析样本中有 <strong>9 台</strong>存在候选规则偏离，仍需审阅确认。</>,
  };
  const artifacts = { 1: "网络拓扑图", 2: "基线挖掘图谱" };
  const timestamp = finished ? `${finished.at.getFullYear()}-${String(finished.at.getMonth() + 1).padStart(2, "0")}-${String(finished.at.getDate()).padStart(2, "0")} ${finished.at.toTimeString().slice(0, 8)}` : "";
  const toggleStep = step => { setSelectedStep(step); setOpenSteps(value => ({ ...value, [step]: !value[step] })); };
  const toggleProcess = () => { setExpanded(value => !value); };
  const title = done ? "已完成思考" : uc2.running ? "正在执行" + uc2Names[uc2.stage] : uc2Names[uc2.stage] + "已暂停";

  return <>
    <div className="uc2-task-time">{new Date(started.current).toLocaleString("zh-CN", { year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false })}</div>
    <div className="user-msg">{uc2Prompt}</div>
    <article ref={answerRef} className={"generated-card uc2-answer" + (expanded ? "" : " is-process-collapsed") + (!uc2.running && !done ? " uc2-chat-paused" : "")} aria-label="黄金基线挖掘回答">
      <SoftHeight>
      <div className="response-process">
        <button type="button" className="response-title" aria-expanded={expanded} aria-controls="uc2WorkflowSteps" onClick={toggleProcess}>
          <LuiGlyph name={done ? "completed" : "processing"} size={14} /><MotionTitle text={title} active={!done && uc2.running}/><Ic variant={isDark ? "filled" : "lined"} icon={expanded ? "chevron-up" : "chevron-down"} />
        </button>
        <div className="response-steps" id="uc2WorkflowSteps" hidden={!expanded}>
          <p className="response-intent">已理解您的需求并明确实施路径。我将通过黄金基线挖掘 Skill，依次完成意图识别、设备发现、基线挖掘和结果呈现，下面开始执行。</p>
          <div className="steps workflow-steps uc2-workflow-steps">
            {[0, 1, 2, 3].slice(0, uc2.max + 1).map(step => {
              const completed = step < uc2.max || (step === uc2.stage && uc2.phase === "complete");
              const current = !completed && step === uc2.max;
              const open = !!openSteps[step];
              return <div key={step} data-step-index={step} className={"step " + (completed ? "is-done" : "is-running") + (selectedStep === step ? " is-selected" : "") + (current && !uc2.running ? " is-paused" : "")}>
                <span className={"status " + (completed ? "done" : "running")} aria-label={completed ? "已完成" : uc2.running ? "进行中" : "已暂停"}><LuiGlyph name={completed ? selectedStep === step ? "step-selected" : "step-done" : "step-running"} size={16} /></span>
                <div className="step-heading">
                  <button type="button" className="step-title" aria-expanded={open} aria-controls={`uc2WorkflowStep${step}`} onClick={() => toggleStep(step)}><MotionTitle text={uc2Names[step]} active={current && uc2.running}/></button>
                  <div className="step-actions">
                    {(completed || current && (step===0 || uc2.phase!=="text")) && <><button type="button" className="step-action" aria-label={`定位步骤：${uc2Names[step]}`} title="定位到画布" onClick={() => { setSelectedStep(step); uc2Show(step); }}><img className="lui-glyph" src="./assets/uploads/lui-step-locate.svg" width="12" height="12" alt="" /></button><span className="step-action-divider" aria-hidden="true" /></>}
                    <button type="button" className="step-action" aria-label={`${open ? "收起" : "展开"}步骤：${uc2Names[step]}`} aria-expanded={open} aria-controls={`uc2WorkflowStep${step}`} onClick={() => toggleStep(step)}><Ic variant={isDark ? "filled" : "lined"} icon={open ? "chevron-up" : "chevron-down"} /></button>
                  </div>
                </div>
                <SoftHeight><div className="step-content" id={`uc2WorkflowStep${step}`} hidden={!open}>
                  <ThinkingDetails thinking={current && uc2.phase === "text"} isDark={isDark}><Uc2TypedCopy step={step} kind="thought">{thoughts[step]}</Uc2TypedCopy></ThinkingDetails>
                  {!(step === uc2.stage && uc2.phase === "text") && <div className="uc2-step-conclusion"><span className="uc2-copy-label">分析结论</span><Uc2TypedCopy step={step} kind="conclusion">{copy[step]}</Uc2TypedCopy></div>}
                  {step === uc2.stage && uc2.phase === "complete" && step < 3 && <p className="uc2-step-settle" role="status">本步分析已完成，稍后继续下一步</p>}
                  {current && uc2.phase === "canvas" && <p className="uc2-canvas-progress" role="status"><MotionTitle text="正在生成对应画布…" active={uc2.running}/></p>}
                  {completed && step > 0 && step < 3 && <div className="v7-step-artifact"><ArtifactTag title={artifacts[step]} type="process" shape={step === 1 ? "overview" : "mapping"} onLocate={() => uc2Show(step)} /></div>}
                </div></SoftHeight>
              </div>;
            })}
          </div>
        </div>
      </div>
      {done && <Uc2Completion timestamp={timestamp} duration={finished?.duration || "0.0"}/>}
      </SoftHeight>
    </article>
  </>;
}
