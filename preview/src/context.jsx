import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { devices } from "./mock/devices.js";
import { checks } from "./mock/checks.js";
import { sortedFailedRules } from "./mock/audit.js";
import { recs, DEFAULT_PROMPT } from "./mock/workflow.js";
import { uc2RestorationDuration } from "./mock/uc2.js";

// Layer 1: 全局状态 — 主题（单轨 .dark）+ 画布/任务流/页签/设备详情状态
const AppContext = createContext(null);

export function scrollCanvasTo(element, behavior = 'smooth') {
  const container = element?.closest('#canvasContent');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const scale = container.offsetHeight ? rect.height / container.offsetHeight : 1;
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  const top = container.scrollTop + (element.getBoundingClientRect().top - rect.top) / (scale || 1) - container.clientTop - margin;
  container.scrollTo({ top: Math.max(0, top), behavior });
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

export function AppProvider({ children }) {
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
  const [runningIndex, setRunningIndex] = useState(0);
  const [scanSeq, setScanSeq] = useState(0);
  const [promptText, setPromptText] = useState("");
  const runningRef = useRef(false);
  const timerRef = useRef(0);
  const taskPromptRef = useRef(DEFAULT_PROMPT);
  const scanCtlRef = useRef(null);

  // 画布页签
  const [openDevices, setOpenDevices] = useState([]);
  const [activePane, setActivePane] = useState("task");
  const activePaneRef = useRef("task");
  activePaneRef.current = activePane;
  const reportScrollRef = useRef(0);

  // UC4 card tabs retain the same mounted card and its filters/scroll position.
  const [artifactTabs,setArtifactTabs]=useState([]);
  const [activeArtifact,setActiveArtifact]=useState(null);
  const openArtifact=useCallback((kind,title)=>{setArtifactTabs(xs=>xs.some(x=>x.kind===kind)?xs:[...xs,{kind,title}]);setActivePane('task');setActiveArtifact(kind)},[]);
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
  const focusLuiArtifact = useCallback(kind => {
    setLuiOpen(true);
    setAgentActive(true);
    setFull(false);
    setLuiFocus({ kind, seq: ++luiFocusSeq.current });
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
  }, [stopScan]);

  const goCockpit = useCallback(() => {
    uc2LeaveRef.current();
    setLuiOpen(false);
    setCanvasHidden(true);
    setAgentActive(false);
  }, []);

  const toggleAgent = useCallback(() => {
    if (luiOpen && agentActive) goCockpit();
    else openAgentHome();
  }, [luiOpen, agentActive, goCockpit, openAgentHome]);

  const completeTask = useCallback((prompt) => {
    runningRef.current = false;
    clearTimeout(timerRef.current);
    stopScan();
    taskPromptRef.current = prompt;
    setTaskPrompt(prompt);
    setLuiView("done");
    setStage(4);
    setLuiOpen(true);
    setCanvasHidden(false);
    setAgentActive(true);
  }, [stopScan]);

  const advanceRef = useRef(() => {});
  advanceRef.current = (index) => {
    if (index >= 4) {
      completeTask(taskPromptRef.current);
      locateRef.current("report", "step");
      return;
    }
    setStage(index);
    setRunningIndex(index);
    // Matching owns completion, so its connections can finish before advancing.
    if (index !== 2) timerRef.current = setTimeout(() => advanceRef.current(index + 1), 1200);
  };

  // ---- UC2 黄金基线挖掘状态机 ----
  const [uc2, setUc2] = useState({ active: false, stage: 0, max: 0, restoration: 0, restorationElapsed: 0, restorationStartedAt: null, running: false, view: "stage", rule: null, node: null });
  const uc2Ref = useRef(uc2);
  uc2Ref.current = uc2;
  const uc2TimerRef = useRef(0);
  const uc2ScrollSeqRef = useRef(0);
  const [uc2Scroll, setUc2Scroll] = useState(null); // {seq, module}
  const [uc2Reviews, setUc2Reviews] = useState({}); // 规则 id -> pending/accepted/rejected
  const [uc2Fusion, setUc2Fusion] = useState({ selected: "engine", rule: null, drawer: null });
  const [uc2Extra, setUc2Extra] = useState([]); // 挖掘中追加的对话消息

  const uc2ScheduleRef = useRef(() => {});
  uc2ScheduleRef.current = () => {
    clearTimeout(uc2TimerRef.current);
    const s = uc2Ref.current;
    if (!s.active || !s.running) return;
    const elapsed = (s.restorationElapsed || 0) + (s.restorationStartedAt ? Date.now() - s.restorationStartedAt : 0);
    const delay = s.stage === 0 ? 4500 : s.stage === 1 ? s.restoration === 2 ? 900 : Math.max(0, uc2RestorationDuration - elapsed) : 8000;
    uc2TimerRef.current = setTimeout(() => {
      const cur = uc2Ref.current;
      if (!cur.active || !cur.running) return;
      if (cur.stage < 3) {
        const next = cur.stage === 1 && cur.restoration !== 2
          ? { ...cur, restoration: 2, restorationElapsed: uc2RestorationDuration, restorationStartedAt: null, view: "stage", node: null }
          : { ...cur, stage: cur.stage + 1, max: Math.max(cur.max, cur.stage + 1), view: "stage", node: null };
        if (next.stage === 1 && next.restoration !== 2) next.restorationStartedAt = next.running ? Date.now() : null;
        if (next.stage === 3) next.running = false;
        uc2Ref.current = next;
        setUc2(next);
        uc2ScheduleRef.current();
      }
    }, delay);
  };

  const uc2Leave = useCallback(() => {
    clearTimeout(uc2TimerRef.current);
    const cur = uc2Ref.current;
    if (cur.active || cur.running) {
      const next = { ...cur, active: false, running: false };
      uc2Ref.current = next;
      setUc2(next);
    }
    setUc2Fusion({ selected: "engine", rule: null, drawer: null });
  }, []);
  uc2LeaveRef.current = uc2Leave;

  const uc2Start = useCallback(() => {
    setActiveArtifact(null);
    stopScan();
    clearTimeout(timerRef.current);
    runningRef.current = false;
    clearTimeout(uc2TimerRef.current);
    setUc2Fusion({ selected: "engine", rule: null, drawer: null });
    setUc2Extra([]);
    const next = { active: true, stage: 0, max: 0, restoration: 0, restorationElapsed: 0, restorationStartedAt: null, running: true, view: "stage", rule: null, node: null };
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
    const next = { ...cur, running: !cur.running };
    if (cur.stage === 1 && cur.restoration !== 2) {
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
    if (!cur.active || cur.stage >= 3) return;
    const next = cur.stage === 1 && cur.restoration !== 2
          ? { ...cur, restoration: 2, restorationElapsed: uc2RestorationDuration, restorationStartedAt: null, view: "stage", node: null }
          : { ...cur, stage: cur.stage + 1, max: Math.max(cur.max, cur.stage + 1), view: "stage", node: null };
        if (next.stage === 1 && next.restoration !== 2) next.restorationStartedAt = next.running ? Date.now() : null;
    if (next.stage === 3) next.running = false;
    uc2Ref.current = next;
    setUc2(next);
    uc2ScheduleRef.current();
  }, []);

  const uc2Show = useCallback((targetStage) => {
    const cur = uc2Ref.current;
    if (targetStage > cur.max || targetStage < 0) return;
    uc2Ref.current = { ...cur, view: targetStage === 0 ? "intent" : "stage", rule: null };
    setUc2(uc2Ref.current);
    setUc2Scroll({ seq: ++uc2ScrollSeqRef.current, module: targetStage });
  }, []);

  const uc2OpenRule = useCallback((id) => {
    const cur = uc2Ref.current;
    uc2Ref.current = { ...cur, rule: id, view: "rule" };
    setUc2(uc2Ref.current);
    setUc2Scroll({ seq: ++uc2ScrollSeqRef.current, module: 3 });
  }, []);

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
    setLuiFocus(null);
    setActiveArtifact(null);setArtifactTabs([]);
    uc2Leave();
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
    setRunningIndex(0);
    setStage(0);
    setPromptText("");
    setScanSeq((s) => s + 1);
  }, [stopScan]);

  const chooseUC = useCallback((i) => {
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
  }, [runTask, toast]);

  const submitPrompt = useCallback((p0) => {
    const p = p0.trim();
    if (!p) return;
    if (/黄金|挖掘/.test(p)) { uc2StartRef.current(); return; }
    if (uc2Ref.current.active) {
      setUc2Extra((xs) => [...xs, { user: p }, { reply: "你可以在画布中查看候选规则的共性证据、偏离设备与适用角色，审阅后将规则标记为可用或暂不采用。当前为交互演示。" }]);
      setPromptText("");
      return;
    }
    if (/HCS1|基线|修复/i.test(p)) { runTask(p); setResetMapSignal((s) => s + 1); return; }
    toast("当前原型支持 HCS1 设备基线检查，请点击第 4 个推荐问题体验。");
  }, [runTask, toast]);

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
  const locateRef = useRef(() => {});
  locateRef.current = locate;

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
    isDark, toggleDark: () => setIsDark((d) => !d),
    luiOpen, canvasHidden, agentActive, full, setFull,
    luiView, taskPrompt, stage, runningIndex, scanSeq, promptText, setPromptText,
    scanCtlRef, notifyScanComplete, notifyMappingComplete,
    openAgentHome, goCockpit, toggleAgent, runTask, chooseUC, submitPrompt,
    openDevices, activePane, switchPane, openDevice, closeDevice,
    reportScrollRef, deviceStatesRef, deviceVersion, bumpDevices,
    toast, toastText,
    resetMapSignal, clearSelSignal,
    cardRefs, locate, luiFocus, focusLuiArtifact, artifactTabs, activeArtifact, openArtifact, closeArtifact,
    uc2, uc2Start, uc2Pause, uc2Next, uc2Show, uc2OpenRule, uc2SelectNode,
    uc2Review, uc2Reviews, uc2Fusion, uc2FusionPick, uc2FusionCloseDrawer,
    uc2SetFilter, uc2Scroll, uc2Extra, setUc2Extra,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
