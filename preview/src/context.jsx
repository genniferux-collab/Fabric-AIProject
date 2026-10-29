import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { THINKING_DURATION } from './views/lui-panel/thought-copy.js';
import { devices } from "./mock/devices.js";
import { checks } from "./mock/checks.js";
import { sortedFailedRules } from "./mock/audit.js";
import { recs, DEFAULT_PROMPT } from "./mock/workflow.js";
import { uc2RestorationDuration, uc2Timing, uc2RuleById, uc2InitialReviews } from "./mock/uc2.js";
import useNetworkTasks from "./hooks/use-network-tasks.js";
import useTaskEntryTransition from "./hooks/use-task-entry-transition.js";
import {ucTaskDefinitions} from "./mock/task-registry.js";

function uc2StageState(cur, stage, phase = "text") {
  return { ...cur, stage, max: Math.max(cur.max, stage), phase, phaseElapsed: 0, canvasStarted: phase === "complete" || (phase === "canvas" && stage < 2),
    phaseStartedAt: cur.running && (phase !== "canvas" || stage < 2) ? Date.now() : null, view: "stage", node: null,
    ...(stage === 1 ? { restoration: phase === "complete" ? 2 : 0, restorationElapsed: phase === "complete" ? uc2RestorationDuration : 0,
      restorationStartedAt: phase === "canvas" && cur.running ? Date.now() : null } : {}) };
}
function uc2PhaseState(cur, phase) {
  return { ...cur, phase, phaseElapsed: 0, canvasStarted: phase === "complete" || (phase === "canvas" && cur.stage < 2), phaseStartedAt: cur.running && (phase !== "canvas" || cur.stage < 2) ? Date.now() : null,
    ...(cur.stage === 1 && phase === "canvas" ? { restoration: 0, restorationElapsed: 0, restorationStartedAt: cur.running ? Date.now() : null } : {}),
    ...(cur.stage === 1 && phase === "complete" ? { restoration: 2, restorationElapsed: uc2RestorationDuration, restorationStartedAt: null } : {}),
    ...(cur.stage === 3 && phase === "complete" ? { running: false, phaseStartedAt: null } : {}) };
}

// Layer 1: 全局状态 — 主题（单轨 .dark）+ 画布/任务流/页签/设备详情状态
const AppContext = createContext(null);

const canvasScrollAnimations = new WeakMap();
export function scrollCanvasTo(element, behavior = 'smooth') {
  const container = element?.closest('#canvasContent, #uc2Pane, .v7-artifact-pane');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const scale = container.offsetHeight ? rect.height / container.offsetHeight : 1;
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  const top = container.scrollTop + (element.getBoundingClientRect().top - rect.top) / (scale || 1) - container.clientTop - margin;
  canvasScrollAnimations.get(container)?.();
  const destination = Math.max(0, Math.min(top, container.scrollHeight - container.clientHeight));
  if (behavior !== 'linear' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    container.scrollTo({ top: destination, behavior: behavior === 'linear' ? 'instant' : behavior });
    return;
  }
  const start = container.scrollTop, distance = destination - start;
  if (Math.abs(distance) < 1) return;
  const duration = Math.max(350, Math.min(900, Math.abs(distance) / 2));
  let frame, started;
  const inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  const cancel = () => {
    cancelAnimationFrame(frame);
    inputs.forEach(type => container.removeEventListener(type, cancel));
    if (canvasScrollAnimations.get(container) === cancel) canvasScrollAnimations.delete(container);
  };
  const tick = now => {
    started ??= now;
    const progress = Math.min(1, (now - started) / duration);
    container.scrollTo({ top: start + distance * progress, behavior: 'instant' });
    if (progress < 1) frame = requestAnimationFrame(tick);
    else cancel();
  };
  inputs.forEach(type => container.addEventListener(type, cancel, { passive: true }));
  canvasScrollAnimations.set(container, cancel);
  frame = requestAnimationFrame(tick);
  return cancel;
}

const locateHighlightTimers = new WeakMap();
export function highlightLocate(element) {
  if (!element) return;
  clearTimeout(locateHighlightTimers.get(element));
  element.classList.remove('flash', 'locate-highlight');
  void element.offsetWidth;
  element.classList.add('locate-highlight');
  locateHighlightTimers.set(element, setTimeout(() => {
    element.classList.remove('locate-highlight');
    locateHighlightTimers.delete(element);
  }, 2400));
}

export function stateFor(map, id) {
  return map[id] || (map[id] = { rule: "timeout", instance: "vty", filter: "failed", search: "", excluded: false, mode: "related", scroll: 0 });
}

const createUc3EditorDraft=()=>({name:'用户接口空闲超时时间不能超过 10 分钟',priority:'最高优先级',ruleId:'user_interface_idle_timeout_10min',type:'单条 Rule（非 Policy）',mode:'始终执行',method:'全局',trigger:'全部满足',changed:false,testResult:null,conditions:[{id:1,field:'time',operator:'大于',value:'全部满足',relation:'或',expression:'idle-timeout  {{time}} 30'}]});

export function AppProvider({ children }) {
  const {networkTasks,tasksRef:networkTasksRef,activeTaskRef:activeNetworkTaskRef,beginWorkflow,syncWorkflow,pauseActive,finishActiveReview}=useNetworkTasks();
  const {taskEntry,enterTaskDetail,cancelTaskEntry}=useTaskEntryTransition();
  const [resultTask,setResultTask]=useState(null);
  const finishTaskOnExitRef=useRef(()=>{});
  const pendingNetworkTaskRef=useRef(null);
  const beginNetworkWorkflow=useCallback((uc,prompt)=>{
    setResultTask(null);
    const existingId=pendingNetworkTaskRef.current;
    pendingNetworkTaskRef.current=null;
    return beginWorkflow(uc,prompt,existingId);
  },[beginWorkflow]);
  const [isDark, setIsDark] = useState(true);
  useEffect(() => { document.documentElement.classList.toggle("dark", isDark); }, [isDark]);

  // 布局
  const [luiOpen, setLuiOpen] = useState(false);
  const [canvasHidden, setCanvasHidden] = useState(true);
  const [agentActive, setAgentActive] = useState(false);
  const [full, setFull] = useState(false);
  const fullRef = useRef(false);
  fullRef.current = full;

  // 任务流
  const [luiView, setLuiView] = useState("home");
  const [taskPrompt, setTaskPrompt] = useState(DEFAULT_PROMPT);
  const [stage, setStage] = useState(4);
  const [reportRevealStartedAt,setReportRevealStartedAt]=useState(null);
  const [runningIndex, setRunningIndex] = useState(0);
  const [scanSeq, setScanSeq] = useState(0);
  const [promptText, setPromptText] = useState("");
  const runningRef = useRef(false);
  const timerRef = useRef(0);
  const taskPromptRef = useRef(DEFAULT_PROMPT);
  const scanCtlRef = useRef(null);

  const [uc1Phase,setUc1Phase] = useState(-2);
  const [uc3Phase,setUc3Phase] = useState(-2);
  const [uc3EditorDraft,setUc3EditorDraft]=useState(createUc3EditorDraft);
  const [uc1SummaryStage,setUc1SummaryStage]=useState(-1);

  // 画布页签
  const [openDevices, setOpenDevices] = useState([]);
  const [activePane, setActivePane] = useState("task");
  const activePaneRef = useRef("task");
  activePaneRef.current = activePane;
  const reportScrollRef = useRef(0);

  // UC4 card tabs retain the same mounted card and its filters/scroll position.
  const [artifactTabs,setArtifactTabs]=useState([]);
  const [activeArtifact,setActiveArtifact]=useState(null);
  const openArtifact=useCallback((kind,title)=>{setArtifactTabs(xs=>xs.some(x=>x.kind===kind)?xs.map(x=>x.kind===kind?{...x,title}:x):[...xs,{kind,title}]);setActivePane('task');setActiveArtifact(kind)},[]);
  const closeArtifact=useCallback(kind=>{setArtifactTabs(xs=>xs.filter(x=>x.kind!==kind));setActiveArtifact(x=>x===kind?null:x)},[]);

  // 设备详情状态（跨页签保留）
  const deviceStatesRef = useRef({});
  const [deviceVersion, setDeviceVersion] = useState(0);
  const bumpDevices = useCallback(() => setDeviceVersion((v) => v + 1), []);

  // toast / 信号
  const [toastText, setToastText] = useState(null);
  const toastTimer = useRef(0);
  const [resetMapSignal, setResetMapSignal] = useState(0);
  const [clearSelSignal, setClearSelSignal] = useState(0);

  // 卡片定位注册表（CanvasArea 填充）
  const cardRefs = useRef({});
  const [luiFocus, setLuiFocus] = useState(null);
  const luiFocusSeq = useRef(0);
  const focusLuiArtifact = useCallback((kind, target = "artifact") => {
    setLuiOpen(true);
    setAgentActive(true);
    setFull(false);
    document.getElementById('luiMain')?.dispatchEvent(new Event('lui-review'));
    setLuiFocus({ kind, target, seq: ++luiFocusSeq.current });
  }, []);

  const toast = useCallback((t) => {
    clearTimeout(toastTimer.current);
    setToastText(t);
    toastTimer.current = setTimeout(() => setToastText(null), 3200);
  }, []);

  const stopScan = useCallback(() => { scanCtlRef.current?.cancel(); }, []);

  // UC2 桥（定义顺序在后的句柄经 ref 引用）
  const uc2LeaveRef = useRef(() => {});
  const uc2StartRef = useRef(() => {});

  const openAgentHome = useCallback(() => {
    cancelTaskEntry();
    finishTaskOnExitRef.current();
    setResultTask(null);
    pauseActive();
    setLuiFocus(null);
    setActiveArtifact(null);
    uc2LeaveRef.current();
    clearTimeout(timerRef.current);
    runningRef.current = false;
    stopScan();
    setLuiView("home");
    setLuiOpen(true);
    setCanvasHidden(true);
    setFull(false);
    setAgentActive(true);
  }, [stopScan,cancelTaskEntry]);

  const goCockpit = useCallback(() => {
    cancelTaskEntry();
    finishTaskOnExitRef.current();
    setResultTask(null);
    uc2LeaveRef.current();
    setLuiOpen(false);
    setCanvasHidden(true);
    setAgentActive(false);
  }, [cancelTaskEntry]);

  const toggleAgent = useCallback(() => {
    if (luiOpen && agentActive) goCockpit();
    else openAgentHome();
  }, [luiOpen, agentActive, goCockpit, openAgentHome]);

  const completeTask = useCallback((prompt) => {
    syncWorkflow("uc4",{status:"awaiting-review",phase:"基线检查已完成，待审阅",progress:100,result:{...ucTaskDefinitions.uc4.result}});
    runningRef.current = false;
    clearTimeout(timerRef.current);
    stopScan();
    taskPromptRef.current = prompt;
    setTaskPrompt(prompt);
    setLuiView("done");
    setReportRevealStartedAt(Date.now());
    setStage(4);
    setLuiOpen(true);
    setCanvasHidden(false);
    setAgentActive(true);
  }, [stopScan]);

  const advanceRef = useRef(() => {});
  advanceRef.current = (index) => {
    if (index >= 4) {
      completeTask(taskPromptRef.current);

      return;
    }
    setStage(index);
    setRunningIndex(index);
    // Matching owns completion, so its connections can finish before advancing.
    if (index !== 2) timerRef.current = setTimeout(() => advanceRef.current(index + 1), 1200);
  };

  // ---- UC2 黄金基线挖掘状态机 ----
  const [uc2, setUc2] = useState({ active: false, stage: 0, max: 0, phase: "text", phaseElapsed: 0, canvasStarted: false, phaseStartedAt: null, restoration: 0, restorationElapsed: 0, restorationStartedAt: null, running: false, view: "stage", rule: null, node: null });
  const uc2Ref = useRef(uc2);
  uc2Ref.current = uc2;
  const uc2TimerRef = useRef(0);
  const uc2ScrollSeqRef = useRef(0);
  const [uc2Scroll, setUc2Scroll] = useState(null); // {seq, module}
  const [uc2Reviews, setUc2Reviews] = useState(()=>{try{return {...uc2InitialReviews,...JSON.parse(localStorage.getItem("fabric.uc2.reviews.v2")||"{}")};}catch{return {...uc2InitialReviews};}});
  useEffect(()=>{try{localStorage.setItem("fabric.uc2.reviews.v2",JSON.stringify(uc2Reviews));}catch{}},[uc2Reviews]);
  useEffect(()=>{const sync=event=>{if(event.key==="fabric.uc2.reviews.v2"&&event.newValue){try{setUc2Reviews({...uc2InitialReviews,...JSON.parse(event.newValue)});}catch{}}};window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync);},[]);
  const [uc2RuleConfigs,setUc2RuleConfigs]=useState(()=>{try{return JSON.parse(localStorage.getItem("fabric.uc2.rule-configs.v1")||"{}");}catch{return {};}});
  const uc2RuleEditorDraftsRef=useRef({});
  useEffect(()=>{try{localStorage.setItem("fabric.uc2.rule-configs.v1",JSON.stringify(uc2RuleConfigs));}catch{}},[uc2RuleConfigs]);
  const uc2EditRule=useCallback(id=>{const rule=uc2RuleById(id);if(rule)openArtifact("uc2-edit:"+id,"编辑规则 · "+(uc2RuleConfigs[id]?.name||rule.name));},[openArtifact,uc2RuleConfigs]);
  const uc2SaveRule=useCallback((id,configuration)=>{
    setUc2RuleConfigs(previous=>({...previous,[id]:{...configuration,sourceId:id,savedAt:new Date().toISOString()}}));
    setUc2Reviews(previous=>({...previous,[id]:"accepted"}));
    delete uc2RuleEditorDraftsRef.current[id];
    closeArtifact("uc2-edit:"+id);
    openArtifact("uc2-rule:"+id,configuration.name);
    toast("规则已保存并采纳，可返回报告查看审阅状态");
  },[closeArtifact,openArtifact,toast]);
  const [uc2Fusion, setUc2Fusion] = useState({ selected: "engine", rule: null, drawer: null });
  const uc2RuleDetailsRef = useRef({});
  const uc2RuleOriginsRef = useRef({});
  const [uc2Extra, setUc2Extra] = useState([]); // 挖掘中追加的对话消息

  const uc2ScheduleRef = useRef(() => {});
  uc2ScheduleRef.current = () => {
    clearTimeout(uc2TimerRef.current);
    const s = uc2Ref.current;
    if (!s.active || !s.running) return;
    // The mining canvas reports its real animation end instead of a second fixed timer.
    if (s.phase === "canvas" && (s.stage >= 2 || !s.canvasStarted)) return;
    const elapsed = s.phaseElapsed + (s.phaseStartedAt ? Date.now() - s.phaseStartedAt : 0);
    const duration = s.phase === "text" ? uc2Timing.text[s.stage] : s.phase === "canvas" ? uc2Timing.canvas[s.stage] : uc2Timing.settle;
    uc2TimerRef.current = setTimeout(() => {
      const cur = uc2Ref.current;
      if (!cur.active || !cur.running) return;
      const next = cur.phase === "text" ? uc2PhaseState(cur, "canvas")
        : cur.phase === "canvas" ? uc2PhaseState(cur, "complete")
        : uc2StageState(cur, cur.stage + 1);
      uc2Ref.current = next; setUc2(next); uc2ScheduleRef.current();
    }, Math.max(0, duration - elapsed));
  };

  const uc2CanvasStart = useCallback((stage) => {
    const cur = uc2Ref.current;
    if (!cur.active || cur.stage !== stage || cur.phase !== "canvas" || cur.canvasStarted) return;
    const next = { ...cur, canvasStarted: true, phaseElapsed: 0, phaseStartedAt: cur.running ? Date.now() : null };
    uc2Ref.current = next; setUc2(next); uc2ScheduleRef.current();
  }, []);

  const uc2CanvasComplete = useCallback((stage) => {
    const cur = uc2Ref.current;
    if (!cur.active || cur.stage !== stage || cur.phase !== "canvas") return;
    clearTimeout(uc2TimerRef.current);
    const next = uc2PhaseState(cur, "complete");
    uc2Ref.current = next; setUc2(next); uc2ScheduleRef.current();
  }, []);

  const uc2Leave = useCallback(() => {
    clearTimeout(uc2TimerRef.current);
    const cur = uc2Ref.current;
    if (cur.active || cur.running) {
      pauseActive("uc2");
      const next = { ...cur, active: false, running: false };
      uc2Ref.current = next;
      setUc2(next);
    }
    setUc2Fusion({ selected: "engine", rule: null, drawer: null });
  }, []);
  uc2LeaveRef.current = uc2Leave;

  const uc2Start = useCallback(() => {
    beginNetworkWorkflow("uc2",ucTaskDefinitions.uc2.prompt);
    setActiveArtifact(null);
    stopScan();
    clearTimeout(timerRef.current);
    runningRef.current = false;
    clearTimeout(uc2TimerRef.current);
    setUc2Fusion({ selected: "engine", rule: null, drawer: null });
    setUc2Extra([]);
    uc2RuleDetailsRef.current = {};
    uc2RuleOriginsRef.current = {};
    setArtifactTabs([]);
    setUc2Scroll(null);
    const next = { runId: Date.now(), active: true, stage: 0, max: 0, phase: "text", phaseElapsed: 0, canvasStarted: false, phaseStartedAt: Date.now(), restoration: 0, restorationElapsed: 0, restorationStartedAt: null, running: true, view: "stage", rule: null, node: null };
    uc2Ref.current = next;
    setUc2(next);
    setActivePane("task");
    setLuiOpen(true);
    setCanvasHidden(false);
    setAgentActive(true);
    setLuiView("uc2");
    setPromptText("");
    uc2ScheduleRef.current();
  }, [stopScan]);
  uc2StartRef.current = uc2Start;

  const uc2Pause = useCallback(() => {
    clearTimeout(uc2TimerRef.current);
    const cur = uc2Ref.current;
    if (!cur.active) return;
    const next = { ...cur, running: !cur.running,
      phaseElapsed: cur.phaseElapsed + (cur.running && cur.phaseStartedAt ? Date.now() - cur.phaseStartedAt : 0),
      phaseStartedAt: !cur.running && (cur.phase !== "canvas" || cur.canvasStarted) ? Date.now() : null };
    if (cur.stage === 1 && cur.phase === "canvas" && cur.restoration !== 2) {
      next.restorationElapsed = Math.min(uc2RestorationDuration, (cur.restorationElapsed || 0) + (cur.restorationStartedAt ? Date.now() - cur.restorationStartedAt : 0));
      next.restorationStartedAt = next.running ? Date.now() : null;
    }
    uc2Ref.current = next;
    setUc2(next);
    if (next.running) uc2ScheduleRef.current();
  }, []);

  const uc2Next = useCallback(() => {
    clearTimeout(uc2TimerRef.current);
    const cur = uc2Ref.current;
    if (!cur.active || (cur.stage === 3 && cur.phase === "complete")) return;
    const next = cur.stage === 3 ? uc2PhaseState(cur, "complete")
      : cur.stage === 1 && cur.restoration !== 2 ? uc2PhaseState(cur, "complete")
      : uc2StageState(cur, cur.stage + 1, cur.running ? "text" : cur.stage + 1 === 1 ? "canvas" : "complete");
    if (next.stage === 3 && next.phase === "complete") next.running = false;
    uc2Ref.current = next;
    setUc2(next);
    uc2ScheduleRef.current();
  }, []);

  const uc2Show = useCallback((targetStage) => {
    const cur = uc2Ref.current;
    if (targetStage > cur.max || targetStage < 0) return;
    setActiveArtifact(null);
    setCanvasHidden(false);
    uc2Ref.current = { ...cur, view: targetStage === 0 ? "intent" : "stage", rule: null };
    setUc2(uc2Ref.current);
    setUc2Scroll({ seq: ++uc2ScrollSeqRef.current, module: targetStage });
  }, []);

  const uc2FocusStep = useCallback((module) => {
    if (module < 0 || module > uc2Ref.current.max) return;
    setLuiOpen(true); setAgentActive(true); setFull(false);
    setUc2Scroll({ seq: ++uc2ScrollSeqRef.current, module, target: "conversation" });
  }, []);

  const uc2OpenRule = useCallback((id,origin="uc2-report") => {
    const rule = uc2RuleById(id);
    if (!rule) return;
    const cur = uc2Ref.current;
    uc2Ref.current = { ...cur, rule: id, view: "stage" };
    setUc2(uc2Ref.current);
    setCanvasHidden(false);
    uc2RuleOriginsRef.current[id] = origin;
    openArtifact("uc2-rule:" + id, uc2RuleConfigs[id]?.name||rule.name);
  }, [openArtifact,uc2RuleConfigs]);

  const uc2SelectNode = useCallback((nodeId) => {
    const cur = uc2Ref.current;
    uc2Ref.current = { ...cur, node: nodeId };
    setUc2(uc2Ref.current);
  }, []);

  const uc2Review = useCallback((id, status) => {
    setUc2Reviews((prev) => ({ ...prev, [id]: status }));
  }, []);

  const uc2FusionPick = useCallback((id) => {
    const rule = id.startsWith("rule:") ? id.slice(5) : null;
    setUc2Fusion((f) => ({ ...f, selected: id, rule, drawer: rule }));
    if (rule) setUc2Scroll({ seq: ++uc2ScrollSeqRef.current, module: 2 });
  }, []);

  const uc2FusionCloseDrawer = useCallback(() => {
    setUc2Fusion((f) => ({ ...f, drawer: null }));
  }, []);

  const uc2SetFilter = useCallback((patch) => {
    const cur = uc2Ref.current;
    uc2Ref.current = { ...cur, ...patch };
    setUc2(uc2Ref.current);
  }, []);

  const notifyScanComplete = useCallback(() => {
    if (runningRef.current) advanceRef.current(1);
  }, []);

  const notifyMappingComplete = useCallback(() => {
    if (runningRef.current) advanceRef.current(3);
  }, []);

  const runTask = useCallback((prompt) => {
    setReportRevealStartedAt(null);
    setLuiFocus(null);
    setActiveArtifact(null);setArtifactTabs([]);
    uc2Leave();
    beginNetworkWorkflow("uc4",prompt);
    clearTimeout(timerRef.current);
    stopScan();
    runningRef.current = true;
    taskPromptRef.current = prompt;
    setTaskPrompt(prompt);
    setOpenDevices([]);
    setActivePane("task");
    reportScrollRef.current = 0;
    setLuiOpen(true);
    setCanvasHidden(false);
    setAgentActive(true);
    setLuiView("running");
    // Preparation has no real canvas artifact; start the scan only after thinking finishes.
    setRunningIndex(-1);
    setStage(-1);
    setPromptText("");
    timerRef.current = setTimeout(() => {
      if (!runningRef.current) return;
      setRunningIndex(0);
      setStage(0);
      setScanSeq(s => s + 1);
    }, THINKING_DURATION);
  }, [stopScan]);

  const runUc1 = useCallback((prompt = "当前全网有哪些检查规则？") => {
    uc2Leave();clearTimeout(timerRef.current);runningRef.current=false;stopScan();
    beginNetworkWorkflow("uc1",prompt);
    setUc1SummaryStage(-1);setUc1Phase(-2);setTaskPrompt(prompt);setPromptText("");setLuiView("uc1");setLuiOpen(true);setCanvasHidden(false);setAgentActive(true);
    setStage(-1);setRunningIndex(-1);setActivePane("task");setOpenDevices([]);setArtifactTabs([]);setActiveArtifact(null);setLuiFocus(null);
  }, [stopScan]);

  const runUc3=useCallback((prompt='帮我创建规则：用户接口空闲超时时间不能超过10分钟')=>{
    uc2Leave();clearTimeout(timerRef.current);runningRef.current=false;stopScan();setLuiFocus(null);setUc3Phase(-2);setUc3EditorDraft(createUc3EditorDraft());
    beginNetworkWorkflow("uc3",prompt);
    setTaskPrompt(prompt);setPromptText('');setLuiView('uc3');setLuiOpen(true);setCanvasHidden(false);setAgentActive(true);
    setStage(-1);setRunningIndex(-1);setActivePane('task');setOpenDevices([]);setArtifactTabs([]);setActiveArtifact(null);
  },[stopScan]);
  const chooseUC = useCallback((i) => {
    if (i === 0) { runUc1(); return; }
    if(i===2){runUc3();return;}
    if (i === 3) {
      runTask(recs[3][2]);
      setResetMapSignal((s) => s + 1);
      return;
    }
    if (i === 1) {
      uc2StartRef.current();
      return;
    }
    setPromptText(recs[i][2]);
    toast("提示词已填入；本次交互稿重点展示第 4 个用例。");
  }, [runTask, runUc1, runUc3, toast]);

  const submitPrompt = useCallback((p0) => {
    const p = p0.trim();
    if (!p) return;
    if (/(当前全网.*(检查规则|规则)|查询当前全量配置检查项)/.test(p)) { runUc1(p === "查询当前全量配置检查项" ? "当前全网有哪些检查规则？" : p); return; }
    if(/(创建.*规则|建一条.*规则|帮我建.*检查规则)/.test(p)){runUc3(p==='帮我建一条检查规则'?'帮我创建规则：用户接口空闲超时时间不能超过10分钟':p);return;}
    if (/黄金|挖掘/.test(p)) { uc2StartRef.current(); return; }
    if (uc2Ref.current.active) {
      setUc2Extra((xs) => [...xs, { user: p }, { reply: "你可以在画布中查看候选规则的共性证据、偏离设备与适用角色，审阅后将规则标记为可用或暂不采用。当前为交互演示。" }]);
      setPromptText("");
      return;
    }
    if (/HCS1|基线|修复/i.test(p)) { runTask(p); setResetMapSignal((s) => s + 1); return; }
    toast("当前原型支持 HCS1 设备基线检查，请点击第 4 个推荐问题体验。");
  }, [runTask, runUc1, runUc3, toast]);

  // The task ledger observes real UC stage changes; it never drives canvas timing.
  useEffect(()=>{
    if(luiView==="uc1"||luiView==="uc3"){
      const uc=luiView,phase=uc==="uc1"?uc1Phase:uc3Phase,definition=ucTaskDefinitions[uc];
      const done=phase>=4;
      syncWorkflow(uc,{status:done?"completed":phase<0?"analyzing":"running",phase:done?`${definition.title}已完成`:phase<0?"意图分析":definition.steps[Math.min(phase,3)],progress:done?100:Math.max(4,Math.min(92,(phase+2)*16)),result:done?{...definition.result}:null});
    }else if(luiView==="uc2"){
      const done=uc2.stage===3&&uc2.phase==="complete",definition=ucTaskDefinitions.uc2;
      syncWorkflow("uc2",{status:done?"awaiting-review":!uc2.running?"paused":uc2.stage===0?"analyzing":"running",phase:done?"黄金基线候选报告待审阅":definition.steps[uc2.stage]||"意图分析",progress:done?100:Math.min(96,uc2.stage*25+(uc2.phase==="complete"?23:uc2.phase==="canvas"?14:4)),result:done?{...definition.result}:null});
    }else if(luiView==="running"||luiView==="done"){
      const done=luiView==="done",definition=ucTaskDefinitions.uc4;
      syncWorkflow("uc4",{status:done?"awaiting-review":stage<0?"analyzing":"running",phase:done?"基线检查已完成，待审阅":stage<0?"意图分析":definition.steps[Math.min(stage,3)],progress:done?100:Math.max(4,Math.min(96,(stage+1)*23)),result:done?{...definition.result}:null});
    }
  },[agentActive,luiView,uc1Phase,uc3Phase,uc2.stage,uc2.phase,uc2.running,stage,syncWorkflow]);

  finishTaskOnExitRef.current=()=>{
    if(canvasHidden)return;
    const task=finishActiveReview();
    if(!task)return;
    clearTimeout(timerRef.current);clearTimeout(uc2TimerRef.current);runningRef.current=false;stopScan();
    if(task.uc==="uc2"){
      const next={...uc2StageState(uc2Ref.current,3,"complete"),running:false,phaseStartedAt:null,restoration:2};
      uc2Ref.current=next;setUc2(next);
    }else{setLuiView("done");setStage(4);setRunningIndex(3);setReportRevealStartedAt(null);}
  };

  const openReviewResult=useCallback(task=>{
    clearTimeout(timerRef.current);clearTimeout(uc2TimerRef.current);runningRef.current=false;stopScan();
    uc2Leave();
    activeNetworkTaskRef.current=task.id;
    setResultTask({...task,openedAt:Date.now()});
    setTaskPrompt(task.prompt);taskPromptRef.current=task.prompt;
    setLuiFocus(null);setActiveArtifact(null);setArtifactTabs([]);setOpenDevices([]);setActivePane("task");setFull(false);
    setLuiOpen(true);setCanvasHidden(false);setAgentActive(true);setReportRevealStartedAt(null);
    if(task.uc==="uc2"){
      const next={...uc2StageState(uc2Ref.current,3,"complete"),runId:task.id,active:true,running:false,phaseStartedAt:null,restoration:2};
      uc2Ref.current=next;setUc2(next);setLuiView("uc2");
      setUc2Fusion({selected:"engine",rule:null,drawer:null});
      setUc2Scroll({seq:++uc2ScrollSeqRef.current,module:3});
    }else{setStage(4);setRunningIndex(3);setLuiView("done");reportScrollRef.current=0;}
  },[stopScan,uc2Leave]);

  const openNetworkTask=useCallback(id=>{
    const task=networkTasksRef.current.find(item=>item.id===id);
    if(!task)return;
    if(task.uc==="uc4"&&task.centerId!=="xisanqi"){
      toast(`${task.scope} · ${task.title}：仅保留任务摘要。当前HCS1检查画布对应西三旗，未切换站点或重新执行。`);return;
    }
    const enter=open=>enterTaskDetail(task,open,canvasHidden);
    if(task.source==="workflow"&&task.status==="awaiting-review"&&task.result&&["uc2","uc4"].includes(task.uc)){
      enter(()=>openReviewResult(task));return;
    }
    const isCurrent=activeNetworkTaskRef.current===id&&task.source==="workflow";
    if(isCurrent&&task.uc==="uc2"){
      enter(()=>{
        setActiveArtifact(null);setActivePane("task");setLuiView("uc2");setLuiOpen(true);setCanvasHidden(false);setAgentActive(true);
        const cur=uc2Ref.current;
        if(!cur.active){const next={...cur,active:true};uc2Ref.current=next;setUc2(next);}
      });return;
    }
    if(isCurrent&&task.uc==="uc4"&&(task.status==="completed"||task.status==="awaiting-review")){
      enter(()=>{setLuiView("done");setStage(4);setActivePane("task");setActiveArtifact(null);setLuiOpen(true);setCanvasHidden(false);setAgentActive(true);});return;
    }
    const currentView=task.uc==="uc4"?(luiView==="running"||luiView==="done"):luiView===task.uc;
    if(isCurrent&&currentView){enter(()=>{setLuiOpen(true);setCanvasHidden(false);setAgentActive(true);});return;}
    if(task.status==="completed"||task.status==="awaiting-review"||task.source==="workflow"){
      toast(`${task.title} · ${task.phase}。历史任务仅保留摘要，未重新执行。`);return;
    }
    if(!task.uc){toast("网络故障治理为演示任务，当前四个用例未包含故障处置详情。");return;}
    enter(()=>{
      pendingNetworkTaskRef.current=id;
      if(task.uc==="uc1")runUc1(task.prompt);
      else if(task.uc==="uc2")uc2StartRef.current();
      else if(task.uc==="uc3")runUc3(task.prompt);
      else runTask(task.prompt);
    });
  },[luiView,canvasHidden,enterTaskDetail,openReviewResult,runUc1,runUc3,runTask,toast]);

  // 画布页签/设备
  const switchPane = useCallback((id) => { setActiveArtifact(null);setActivePane(id); }, []);

  const openDevice = useCallback((id, rule) => {
    const d = devices.find((x) => x.id === id);
    if (!d) return;
    const first = !openDevices.includes(id);
    if (first) setOpenDevices((ods) => [...ods, id]);
    const s = stateFor(deviceStatesRef.current, id);
    if (rule || first || id === "d1") {
      s.search = "";
      s.rule = rule || sortedFailedRules(d)[0] || checks[0].id;
      s.instance = s.rule === "timeout" ? "vty" : "single";
      s.filter = d.fails.length ? "failed" : "all";
      s.scroll = 0;
      if (id === "d1" && !rule) s.mode = "related";
    }
    bumpDevices();
    setActiveArtifact(null);
    setCanvasHidden(false);
    setActivePane(id);
  }, [openDevices, bumpDevices]);

  const closeDevice = useCallback((id) => {
    const i = openDevices.indexOf(id);
    const remaining = openDevices.filter((x) => x !== id);
    setOpenDevices(remaining);
    if (activePaneRef.current === id) switchPane(remaining[Math.max(0, i - 1)] || "task");
  }, [openDevices, switchPane]);

  // 定位 + 闪动
  const locate = useCallback((kind, target = 'card') => {
    setCanvasHidden(false);
    setActiveArtifact(null);
    setActivePane("task");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const card = cardRefs.current[kind];
      const el = target === 'step' ? card?.closest('.workflow-canvas-step') || card : card;
      if (!el) return;
      scrollCanvasTo(el);
      highlightLocate(card);
    }));
  }, []);



  const escape = useCallback(() => {
    if (uc2Fusion.drawer) {
      uc2FusionCloseDrawer();
      setUc2Scroll({ seq: ++uc2ScrollSeqRef.current, module: 2 });
      return;
    }
    if (fullRef.current) { setFull(false); return; }
    setClearSelSignal((s) => s + 1);
  }, [uc2Fusion, uc2FusionCloseDrawer]);

  // 全局键盘
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") escape(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [escape]);

  const value = {
    networkTasks,openNetworkTask,taskEntry,resultTask,
    isDark, toggleDark: () => setIsDark((d) => !d),
    luiOpen, canvasHidden, agentActive, full, setFull,
    uc3EditorDraft,setUc3EditorDraft,uc3Phase, setUc3Phase, uc1Phase, setUc1Phase, uc1SummaryStage, setUc1SummaryStage, luiView, taskPrompt, stage, reportRevealStartedAt, runningIndex, scanSeq, promptText, setPromptText,
    scanCtlRef, notifyScanComplete, notifyMappingComplete,
    openAgentHome, goCockpit, toggleAgent, runTask, chooseUC, submitPrompt,
    openDevices, activePane, switchPane, openDevice, closeDevice,
    reportScrollRef, deviceStatesRef, deviceVersion, bumpDevices,
    toast, toastText,
    resetMapSignal, clearSelSignal,
    cardRefs, locate, luiFocus, focusLuiArtifact, artifactTabs, activeArtifact, openArtifact, closeArtifact,
    uc2, uc2Start, uc2Pause, uc2Next, uc2CanvasStart, uc2CanvasComplete, uc2Show, uc2FocusStep, uc2OpenRule, uc2SelectNode,
    uc2EditRule,uc2SaveRule,uc2RuleConfigs,uc2RuleEditorDraftsRef,
    uc2Review, uc2Reviews, uc2Fusion, uc2FusionPick, uc2FusionCloseDrawer,
    uc2SetFilter, uc2Scroll, uc2Extra, setUc2Extra, uc2RuleDetailsRef, uc2RuleOriginsRef,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
