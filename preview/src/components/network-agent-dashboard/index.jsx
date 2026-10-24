import { useState } from "react";
import ChatComposer from "../chat-composer/index.jsx";
import "./index.css";

const defaultSummary = { weekCount: 465, healthyDays: 158, totalEvents: 1465 };
const defaultFaultStats = { pending: 12, processing: 4, resolved: 244 };
const defaultConfigStats = { processing: 4, resolved: 12 };
const defaultTabs = [
  { label: "全部" }, { label: "人工待接管", color: "red" }, { label: "自动处置中", color: "blue" },
];
const defaultEvents = [
  { type: "highlight", iconType: "red", title: "重保业务自诊断", tag: "【重保业务自诊断】", detail: "用户提交消费贷申请出现概率性失败，正在进行故障修复" },
  ...Array.from({ length: 3 }, () => ({ type: "normal", iconType: "blue", title: "【网络配置辅助生成】嘉定DC的互联网区域的Leaf1-2…", tag: "【设备扩容】", detail: "", time: "2025-06-03 15:36 | 嘉定DC的互联网区域的Leaf1-2设备扩容" })),
];
const timeOptions = ["最近三小时", "最近一天", "最近一周", "最近半个月"];

export default function DataCenterNetworkAgent({
  summary = defaultSummary, faultStats = defaultFaultStats, configStats = defaultConfigStats,
  tabs = defaultTabs, events = defaultEvents, onOpenAgent,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [period, setPeriod] = useState("最近一周");
  const filter = tabs[activeTab]?.color;
  const visibleEvents = filter ? events.filter((event) => event.iconType === filter) : events;
  const count = (tab) => tab.color ? events.filter((event) => event.iconType === tab.color).length : events.length;

  return <div className="dcna-container dark">
    <div className="dcna-glow" />
    <header className="dcna-header">
      <h1>数据中心网络智能体</h1>
      <div className="dcna-period-wrap">
        <button className="dcna-period" type="button" aria-haspopup="listbox" aria-expanded={periodOpen} onClick={() => setPeriodOpen(!periodOpen)}>
          {period} <Symbol name="keyboard_arrow_down" className={periodOpen ? "dcna-period-chevron-open" : ""} />
        </button>
        {periodOpen && <div className="dcna-period-menu" role="listbox" aria-label="时间范围">
          {timeOptions.map((option) => <button type="button" role="option" aria-selected={option === period} className={option === period ? "dcna-period-option-selected" : ""} key={option} onClick={() => { setPeriod(option); setPeriodOpen(false); }}>{option}</button>)}
        </div>}
      </div>
    </header>
    <section className="dcna-summary">
      <div><p>本周处理 <em>{summary.weekCount}</em> 件</p><span>当前网络状态良好，已经连续守护 <b>{summary.healthyDays}</b> 天，<br />累计共处置 <b>{summary.totalEvents}</b> 个事件。</span></div>
      <img src="./assets/uploads/summary-icon.png" alt="" />
    </section>
    <div className="dcna-stats">
      <Stat icon="build" title="故障自处置" number={`${faultStats.pending} / ${faultStats.processing} / ${faultStats.resolved}`} note="待处置 / 处置中 / 已处置" />
      <button className="dcna-agent-entry" type="button" aria-label="打开网络配置智能体" onClick={onOpenAgent}><Stat icon="settings_ethernet" title="网络配置辅助生成" number={`${configStats.processing} / ${configStats.resolved}`} note="处置中 / 已处置" /></button>
    </div>
    <div className="dcna-section-title"><h2>待您关注</h2><a onClick={onOpenAgent} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpenAgent(); }}>更多</a></div>
    <div className="dcna-tabs" role="tablist">{tabs.map((tab, index) => <button key={tab.label} className={activeTab === index ? "active" : ""} onClick={() => setActiveTab(index)} role="tab" aria-selected={activeTab === index}>{tab.label}<strong className={tab.color || ""}>{count(tab)}</strong></button>)}</div>
    <div className="dcna-events">{visibleEvents.length ? visibleEvents.map((event, index) => <Event event={event} key={`${event.title}-${index}`} />) : <div className="dcna-empty"><Symbol name="description" /><p>暂无事件</p></div>}</div>
    <ChatComposer onOpen={onOpenAgent} />
  </div>;
}

function Symbol({ name, className = "" }) { return <span className={`dcna-material-symbol ${className}`.trim()} aria-hidden="true">{name}</span>; }
function Stat({ icon, title, number, note }) {
  const values = number.split(" / ");
  return <div className="dcna-stat"><p><Symbol name={icon} className={`dcna-stat-icon dcna-stat-icon--${icon}`} />{title}</p><strong>{values.map((value, index) => <span key={`${value}-${index}`}>{index > 0 && <i className="dcna-stat-separator"> / </i>}<em className="dcna-stat-number">{value}</em></span>)}</strong><span>{note}</span></div>;
}
function Event({ event }) { const isAlert = event.iconType === "red"; return <article className={`dcna-event ${event.type === "highlight" ? "highlight" : ""}`}><div className="dcna-event-head"><Symbol name={isAlert ? "notifications" : "storage"} className={isAlert ? "dcna-alert-icon" : "dcna-network-icon"} /><b>{event.title}</b></div><div className="dcna-event-body"><Symbol name="location_on" className="dcna-location-icon" /><span>{event.tag && <strong>{event.tag}</strong>}{event.detail}{event.time && <i>{event.time}</i>}</span></div></article>; }
