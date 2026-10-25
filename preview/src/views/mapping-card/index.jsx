import ArtifactOpen from "../../components/artifact-open/index.jsx";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "../../../assets/shared/icon.jsx";
import { useApp } from "../../context.jsx";
import { devices } from "../../mock/devices.js";
import { mapGroups, mapSets, mapRelations, mapRelated } from "../../mock/graph.js";
import { ArtifactIcon } from "../../components/status-marks/index.jsx";
import Ic from "../../components/icon-el/index.jsx";
import SearchInput from "../../components/search-input/index.jsx";
import OptionGroup from "../../components/option-group/index.jsx";
import "./design.css";

// The shared safety check appears once per vendor, as in the design; its rules stay shared.
const mappingSets = mapSets.flatMap(s => s.id === "s6" ? ["Huawei", "H3C"].map(vendor => ({ ...s, id: s.id + "-" + vendor, sourceSetId: s.id, vendor })) : [s]);
const mappingRelations = mapRelations.map(([gid, sid]) => [gid, sid === "s6" ? sid + "-" + mapGroups.find(g => g.id === gid).vendor : sid]);
const mappingRelated = id => mappingRelations.filter(r => r.includes(id)).map(r => r[0] === id ? r[1] : r[0]);

const mapPageSize = 5;
const NODE_H = 66, GAP = 12, TOP = 0, HEADER = 34;
const MATCH_LEAD = 650, GROUP_DURATION = 1250, EDGE_GROW = 680, EDGE_STAGGER = 90;
const MATCH_DURATION = MATCH_LEAD + mapGroups.length * GROUP_DURATION + 400;
const clamp = (n) => Math.max(0, Math.min(1, n));

const mapGroupMembers = (id) => {
  const group = mapGroups.find((g) => g.id === id);
  return group ? devices.filter((d) => group.sourceGroupIds.includes(d.groupId)) : [];
};

function membersOf(id, pages) {
  const all = mapGroupMembers(id);
  const total = Math.max(1, Math.ceil(all.length / mapPageSize));
  const page = Math.max(1, Math.min(pages[id] || 1, total));
  return { all, page, pages: total, items: all.slice((page - 1) * mapPageSize, page * mapPageSize) };
}

function visibilityOf(vendor, query) {
  let gs = mapGroups.filter((g) => vendor === "all" || g.vendor === vendor);
  let ss = mappingSets.filter((s) => gs.some((g) => mappingRelations.some(([gid, sid]) => gid === g.id && sid === s.id)));
  if (query) {
    const q = query.toLowerCase();
    const directG = gs.filter((g) => (g.name + g.type + g.vendor).toLowerCase().includes(q));
    const directS = ss.filter((s) => (s.name + s.scope + s.vendor).toLowerCase().includes(q));
    gs = gs.filter((g) => directG.includes(g) || directS.some((s) => mappingRelated(g.id).includes(s.id)));
    ss = ss.filter((s) => directS.includes(s) || directG.some((g) => mappingRelated(s.id).includes(g.id)));
  }
  return { gs, ss };
}

// 关系驱动布局（V7 原算法移植）
function computeMapLayout(vendor, query, expanded, pages) {
  const visible = visibilityOf(vendor, query);
  const orderedGroups = [...visible.gs].sort((a, b) => mapGroups.indexOf(a) - mapGroups.indexOf(b));
  let cursor = TOP;
  const vendors = [], gl = [];
  for (const brand of [...new Set(orderedGroups.map((g) => g.vendor))]) {
    const members = orderedGroups.filter((g) => g.vendor === brand);
    const linkedSets = visible.ss.filter((s) => members.some((g) => mappingRelated(g.id).includes(s.id)));
    const setsHeight = 0;
    vendors.push({ vendor: brand, y: cursor, count: members.reduce((sum, g) => sum + g.count, 0), groups: members.length });
    let groupCursor = cursor + HEADER;
    for (const node of members) {
      const height = expanded.has(node.id) ? 36 + membersOf(node.id, pages).items.length * 82 - 14 : NODE_H;
      gl.push({ node, y: groupCursor, height });
      groupCursor += height + GAP;
    }
    cursor = Math.max(groupCursor - GAP, cursor + setsHeight) + 48;
  }
  const groupSpan = gl.length ? Math.max(...gl.map(g => g.y + g.height)) : 0;
  const orderedSets = [...visible.ss].sort((a,b) => mappingSets.indexOf(a) - mappingSets.indexOf(b));
  const setSpan = orderedSets.length * NODE_H + Math.max(0, orderedSets.length - 1) * GAP;
  const span = Math.max(560, groupSpan, setSpan + 26);
  const sl = orderedSets.map((node,index) => ({ node, y: 26 + index * (NODE_H + GAP), height: NODE_H }));
  return { groups: gl, sets: sl, vendors, height: span };

}

function groupPorts(record, expanded, pages) {
  if (!expanded.has(record.node.id)) return [{ y: record.y + NODE_H / 2, device: null }];
  return membersOf(record.node.id, pages).items.map((d, index) => ({ y: record.y + 36 + index * 82 + 34, device: d.id }));
}

export default function MappingCard({ cardRef }) {
  const { resetMapSignal, clearSelSignal, luiView, stage, scanSeq, notifyMappingComplete } = useApp();
  const [elapsed, setElapsed] = useState(0);
  const effectId = useId().replace(/:/g, "");
  const [vendor, setVendor] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [hoverDevice, setHoverDevice] = useState(null);
  const [picked, setPicked] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [pages, setPages] = useState({});
  const [width, setWidth] = useState(1200);
  const graphRef = useRef(null);

  useEffect(() => {
    if (luiView === "done" || (luiView === "running" && stage > 2)) { setElapsed(MATCH_DURATION); return; }
    setElapsed(0);
    if (luiView !== "running" || stage !== 2) return;
    let frame = 0, started = null, lastPaint = -Infinity;
    const tick = (now) => {
      started ??= now;
      const ms = Math.min(MATCH_DURATION, now - started);
      if (now - lastPaint >= 32 || ms === MATCH_DURATION) { setElapsed(ms); lastPaint = now; }
      if (ms < MATCH_DURATION) frame = requestAnimationFrame(tick);
      else notifyMappingComplete();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [luiView, stage, scanSeq, notifyMappingComplete]);

  const matching = luiView === "running" && stage === 2 && elapsed < MATCH_DURATION;
  const activeGroupIndex = matching && elapsed >= MATCH_LEAD ? Math.floor((elapsed - MATCH_LEAD) / GROUP_DURATION) : -1;
  const activeGroup = mapGroups[activeGroupIndex];
  const activeNodes = new Set(activeGroup ? [activeGroup.id, ...mappingRelated(activeGroup.id)] : []);
  const completedGroups = elapsed >= MATCH_DURATION ? mapGroups.length : Math.max(0, Math.min(mapGroups.length, Math.floor((elapsed - MATCH_LEAD) / GROUP_DURATION)));

  // 容器宽度测量（连线坐标依赖）
  useEffect(() => {
    const el = graphRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 1200));
    ro.observe(el);
    setWidth(el.clientWidth || 1200);
    return () => ro.disconnect();
  }, []);

  // 外部信号：重置 / Esc 清除选中
  useEffect(() => {
    if (resetMapSignal === 0) return;
    setVendor("all");
    setSearchText("");
    setSelected(null); setHovered(null); setHoverDevice(null); setPicked(null);
    setExpanded(new Set());
    setPages({});
  }, [resetMapSignal]);

  useEffect(() => {
    if (clearSelSignal === 0) return;
    setSelected(null); setHovered(null); setHoverDevice(null); setPicked(null);
  }, [clearSelSignal]);

  const query = searchText.trim().toLowerCase();
  const layout = useMemo(() => computeMapLayout(vendor, query, expanded, pages), [vendor, query, expanded, pages]);

  const focus = hovered || selected;
  const connected = focus ? new Set([focus, ...mappingRelated(focus)]) : null;
  const details = hovered ? { device: hoverDevice } : picked ? { device: picked } : null;

  const stateClasses = (id) => ({
    dim: !matching && !!connected && !connected.has(id),
    pinned: id === selected,
    focused: id === hovered,
    related: !!connected && connected.has(id) && id !== focus,
    matching: activeNodes.has(id),
  });

  const x1 = width * 405 / 1216, x2 = width * 811 / 1216;
  const edges = [];
  for (const [gid, sid] of mappingRelations) {
    const g = layout.groups.find((r) => r.node.id === gid);
    const s = layout.sets.find((r) => r.node.id === sid);
    if (!g || !s) continue;
    for (const from of groupPorts(g, expanded, pages)) {
      let hot = !!focus && (gid === focus || sid === focus);
      if (hot && details?.device) hot = from.device === details.device;
      const groupIndex = mapGroups.findIndex((group) => group.id === gid);
      const relationIndex = mappingRelated(gid).indexOf(sid);
      const progress = clamp((elapsed - MATCH_LEAD - groupIndex * GROUP_DURATION - relationIndex * EDGE_STAGGER) / EDGE_GROW);
      edges.push({ gid, sid, vendor: g.node.vendor, from: from.y, to: s.y + NODE_H / 2, device: from.device, hot, progress });
    }
  }

  const selectNode = (id) => {
    if (!mapGroups.some((g) => g.id === id) && !mappingSets.some((s) => s.id === id)) return;
    setSelected((cur) => (cur === id ? null : id));
    setPicked(null); setHovered(null); setHoverDevice(null);
  };
  const toggleMapGroup = (id) => {
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    setSelected(id); setPicked(null); setHovered(null); setHoverDevice(null);
  };
  const pickDevice = (groupId, deviceId) => {
    setSelected(groupId);
    setPicked((p) => (p === deviceId ? null : deviceId));
    setHovered(null); setHoverDevice(null);
  };
  const pageGroup = (groupId, page) => {
    setPages((p) => ({ ...p, [groupId]: page }));
    setSelected(groupId); setPicked(null); setHovered(null); setHoverDevice(null);
  };
  const chooseVendor = (v) => {
    setVendor(v);
    setSelected(null); setHovered(null); setHoverDevice(null); setPicked(null);
  };
  const onSearch = (v) => {
    setSearchText(v);
    setSelected(null); setHovered(null); setHoverDevice(null); setPicked(null);
  };
  const onBlankClick = (e) => {
    if (!selected && !hovered && !picked) return;
    if (e.target?.closest?.(".v7-map-node,.v7-map-split,button,a,input,select,textarea,label,summary,[role='tab']")) return;
    setSelected(null); setHovered(null); setHoverDevice(null); setPicked(null);
  };

  const visibleGroupCount = layout.groups.length;
  const visibleSetCount = layout.sets.length;

  const renderGroupBody = (g) => {
    const data = membersOf(g.id, pages);
    return (
      <>
        <div className="v7-map-split-toolbar">
          <button className="link" onClick={() => toggleMapGroup(g.id)} aria-label={"收起" + g.name}>‹ {g.name}</button>
          <div className="v7-map-pager">
            <button disabled={data.page === 1} aria-label={g.name + "上一页"} onClick={() => pageGroup(g.id, data.page - 1)}>‹</button>
            <span>{data.page} / {data.pages}</span>
            <button disabled={data.page === data.pages} aria-label={g.name + "下一页"} onClick={() => pageGroup(g.id, data.page + 1)}>›</button>
          </div>
        </div>
        {data.items.map((d, index) => {
          const chosen = picked === d.id;
          const dim = !!details?.device && g.id === focus && !chosen && d.id !== details.device;
          return (
            <button
              key={d.id}
              className={"node group v7-map-device-card" + (chosen ? " pinned" : "") + (dim ? " dim" : "")}
              data-map-device={d.id}
              style={{ top: 36 + index * 82 + "px" }}
              aria-pressed={chosen}
              onClick={() => pickDevice(g.id, d.id)}
              onMouseEnter={() => { setHovered(g.id); setHoverDevice(d.id); }}
              onMouseLeave={() => { setHovered(null); setHoverDevice(null); }}
              onFocus={() => { setHovered(g.id); setHoverDevice(d.id); }}
              onBlur={() => { setHovered(null); setHoverDevice(null); }}
            >
              <span className="node-icon"><Icon name={d.deviceType === "防火墙" ? "shield" : "server"} className="ic" strokeWidth={1.6} /></span>
              <span className="v7-map-node-copy">
                <span className="node-name">{d.name}</span>
                <span className="node-meta"><span>{d.ip}</span><span>{d.model}</span></span>
              </span>
            </button>
          );
        })}
      </>
    );
  };

  const renderShell = (record, type) => {
    const n = record.node;
    const isGroup = type === "group";
    const isOpen = isGroup && expanded.has(n.id);
    const cls = stateClasses(n.id);
    const shellCls = ["v7-map-node", isGroup ? "map-group-shell" : "map-set-shell", isOpen ? "expanded" : "", cls.dim ? "dim" : "", cls.pinned ? "pinned" : "", cls.focused ? "focused" : "", cls.related ? "related" : "", cls.matching ? "is-matching" : ""].filter(Boolean).join(" ");
    const nodeCls = ["node", isGroup ? "group" : "ruleset", cls.pinned ? "pinned" : "", cls.focused ? "focused" : "", cls.related ? "related" : ""].filter(Boolean).join(" ");
    const linkedGroups = isGroup ? [] : mapGroups.filter((g) => mappingRelated(n.id).includes(g.id));
    const meta = isGroup ? n.type : `${n.scope} · ${visibilityOf(vendor, query).gs.filter((g) => mappingRelated(n.id).includes(g.id)).length}个设备组`;
    if (isOpen) {
      return (
        <div key={n.id} className={"v7-map-split" + (cls.matching ? " is-matching" : "")} data-map-node={n.id} data-vendor={n.vendor} style={{ top: record.y + "px", height: record.height + "px" }}>
          {renderGroupBody(n)}
        </div>
      );
    }
    return (
      <div key={n.id} className={shellCls} data-map-node={n.id} data-vendor={n.vendor} style={{ top: record.y + "px", height: record.height + "px" }}>
        <button
          className={nodeCls}
          data-id={n.id}
          title={isGroup ? n.name : "关联设备组：" + linkedGroups.map((g) => g.name).join("、")}
          aria-expanded={isGroup ? isOpen : undefined}
          aria-label={(isGroup ? "单击高亮，双击展开" : "") + n.name}
          aria-pressed={n.id === selected}
          onClick={() => selectNode(n.id)}
          onDoubleClick={isGroup ? () => toggleMapGroup(n.id) : undefined}
          onKeyDown={isGroup ? (e) => { if (e.key === "Enter") { e.preventDefault(); toggleMapGroup(n.id); } } : undefined}
          onMouseEnter={() => setHovered(n.id)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(n.id)}
          onBlur={() => setHovered(null)}
        >
          <span className="node-icon"><img src={"./assets/uploads/mapping-" + (isGroup ? (n.type.startsWith("FW") ? "firewall" : n.name.includes("核心") ? "core" : "access") : "rules") + ".svg"} alt="" /></span>
          <span className="v7-map-node-copy">
            <span className="node-name">{n.name}</span>
            <span className="node-meta">{meta}</span>
          </span>
          <span className="node-count">{isGroup ? n.count : n.rules}<span>{isGroup ? "台" : "条"}</span></span>
        </button>
      </div>
    );
  };

  return (
    <section className="card artifact-card process-artifact v7-card-tabbed mapping-design" id="mappingCard" ref={cardRef} aria-busy={matching} data-match-phase={elapsed === 0 ? "waiting" : elapsed >= MATCH_DURATION ? "complete" : "matching"}>
      <ArtifactOpen kind="artifact" title="HCS1合规检查规则&设备匹配"/>
      <div className="between">
        <div className="v7-artifact-title">
          <ArtifactIcon type="process" shape="mapping" />
          <h2 className="card-title">合规检查规则&amp;设备匹配图</h2>
        </div>
      </div>
      <div className="mapping-design-toolbar">
        <div className="summary-strip">
          <div className="summary-item"><strong>{devices.length}</strong><span>台设备</span></div>
          <div className="summary-item"><strong>120</strong><span>个配置文件</span></div>
          <div className="summary-item"><strong>{mapSets.reduce((n,s) => n + s.rules, 0)}</strong><span>条规则</span></div>
        </div>
        <OptionGroup cls="filters" buttonCls="filter" ariaLabel="厂商筛选" options={[["all","全部厂商"],["Huawei","华为"],["H3C","H3C"]]} value={vendor} onChange={chooseVendor} />
      </div>
      <div className="mapping-design-search">
        <SearchInput id="graphSearch" value={searchText} onChange={onSearch} placeholder="请输入搜索设备组或检查集" ariaLabel="搜索设备组或检查集" clearable />
      </div>
      <div className="graph-head">
        <div className="column-title">设备组（<span id="groupCount">{visibleGroupCount}</span>）</div>
        <div className={"match-caption" + (matching ? " is-active" : "")} role="status">{matching && activeGroup ? `正在匹配第 ${activeGroupIndex + 1} 组` : ""}</div>
        <div className="column-title">规则检查集（<span id="setCount">{visibleSetCount}</span>）</div>
      </div>
      <div className="graph" id="graph" ref={graphRef} style={{ height: layout.height + "px" }} onClick={onBlankClick}>
        <svg className="connections" id="connections" aria-hidden="true" viewBox={`0 0 ${width} ${layout.height}`}>
          <defs>
            <linearGradient id={`${effectId}-intelligence`} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#329d7c" /><stop offset="46%" stopColor="#7bdfb5" /><stop offset="78%" stopColor="#64c6c2" /><stop offset="100%" stopColor="#329d7c" /></linearGradient>
          </defs>
          {edges.filter((e) => e.progress > 0).map((e, i) => {
            const d = `M ${x1} ${e.from} C ${x1 + (x2 - x1) * 0.46} ${e.from},${x2 - (x2 - x1) * 0.46} ${e.to},${x2} ${e.to}`;
            const maskId = `${effectId}-${e.gid}-${e.sid}-${e.device || "group"}`;
            return (
              <g key={maskId} className={"v7-match-route" + (!matching && focus ? (e.hot ? " hot" : " fade") : "") + (e.progress < 1 ? " is-growing" : "")} data-group={e.gid} data-set={e.sid} data-vendor={e.vendor} data-progress={e.progress.toFixed(3)}>
                <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={layout.height}><path d={d} pathLength="1" fill="none" stroke="white" strokeWidth="8" strokeDasharray="1" strokeDashoffset={1 - e.progress} /></mask></defs>
                <path className="edge v7-match-base" d={d} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - e.progress} />
                <g mask={`url(#${maskId})`}><path className="v7-match-flow" d={d} pathLength="1" stroke={`url(#${effectId}-intelligence)`} style={{ animationDelay: `${-i * .17}s` }} /></g>
              </g>
            );
          })}
        </svg>
        {layout.vendors.map((v) => (
          <div key={v.vendor} className={"vendor" + (v.vendor === "H3C" ? " h3c" : "")} data-brand={v.vendor} style={{ top: v.y + "px" }}>
            <img className="mapping-vendor-mark" src={v.vendor === "Huawei" ? "./assets/uploads/mapping-huawei.svg" : "./assets/uploads/mapping-h3c.svg"} alt={v.vendor === "Huawei" ? "HUAWEI" : "H3C"} />
            <span>（{v.count}台·{v.groups}组）</span>
          </div>
        ))}
        {layout.groups.map((r) => renderShell(r, "group"))}
        {layout.sets.map((r) => renderShell(r, "set"))}
        <div className="empty" id="empty" style={{ display: visibleGroupCount && visibleSetCount ? "none" : "flex" }}>没有找到匹配的设备组或检查集</div>
      </div>
      <div className="v7-matching-status">
        <span className={matching ? "is-active" : ""}><i />{elapsed >= MATCH_DURATION ? `设备组与检查集匹配完成 · 已建立 ${mappingRelations.length} 条关联` : completedGroups === mapGroups.length ? "全部关联已建立 · 正在确认匹配结果" : activeGroup ? `${activeGroup.name} · 正在建立检查集关联` : "设备组与检查集已就绪 · 等待建立关联"}</span>
        <span>{completedGroups} / {mapGroups.length} 组</span>
      </div>
    </section>
  );
}
