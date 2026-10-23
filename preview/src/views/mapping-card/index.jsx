import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../../assets/shared/icon.jsx";
import { useApp } from "../../context.jsx";
import { devices } from "../../mock/devices.js";
import { mapGroups, mapSets, mapRelations, mapRelated } from "../../mock/graph.js";
import { ArtifactIcon } from "../../components/status-marks/index.jsx";
import Ic from "../../components/icon-el/index.jsx";
import SearchInput from "../../components/search-input/index.jsx";
import OptionGroup from "../../components/option-group/index.jsx";

const mapPageSize = 5;
const NODE_H = 68, GAP = 14, TOP = 20, HEADER = 40;

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
  let ss = mapSets.filter((s) => gs.some((g) => mapRelations.some(([gid, sid]) => gid === g.id && sid === s.id)));
  if (query) {
    const q = query.toLowerCase();
    const directG = gs.filter((g) => (g.name + g.type + g.vendor).toLowerCase().includes(q));
    const directS = ss.filter((s) => (s.name + s.scope + s.vendor).toLowerCase().includes(q));
    gs = gs.filter((g) => directG.includes(g) || directS.some((s) => mapRelated(g.id).includes(s.id)));
    ss = ss.filter((s) => directS.includes(s) || directG.some((g) => mapRelated(s.id).includes(g.id)));
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
    const linkedSets = visible.ss.filter((s) => members.some((g) => mapRelated(g.id).includes(s.id)));
    const setsHeight = linkedSets.length * NODE_H + Math.max(0, linkedSets.length - 1) * GAP;
    vendors.push({ vendor: brand, y: cursor, count: members.reduce((sum, g) => sum + g.count, 0), groups: members.length });
    let groupCursor = cursor + HEADER;
    for (const node of members) {
      const height = expanded.has(node.id) ? 36 + membersOf(node.id, pages).items.length * 82 - 14 : NODE_H;
      gl.push({ node, y: groupCursor, height });
      groupCursor += height + GAP;
    }
    cursor = Math.max(groupCursor - GAP, cursor + setsHeight) + GAP;
  }
  const groupSpan = gl.length ? cursor - GAP - TOP : 0;
  const anchor = (s) => {
    const linked = gl.filter((g) => mapRelated(s.id).includes(g.node.id));
    return linked.length ? linked.reduce((n, g) => n + g.y + g.height / 2, 0) / linked.length : TOP;
  };
  const orderedSets = [...visible.ss].sort((a, b) => anchor(a) - anchor(b) || mapSets.indexOf(a) - mapSets.indexOf(b));
  const setMinimumSpan = orderedSets.length * NODE_H + Math.max(0, orderedSets.length - 1) * GAP;
  const span = Math.max(groupSpan, setMinimumSpan);
  const setStep = orderedSets.length > 1 ? (span - NODE_H) / (orderedSets.length - 1) : 0;
  const sl = orderedSets.map((node, index) => ({ node, y: TOP + index * setStep, height: NODE_H, anchor: anchor(node) }));
  return { groups: gl, sets: sl, vendors, height: Math.max(160, TOP + span + 12) };
}

function groupPorts(record, expanded, pages) {
  if (!expanded.has(record.node.id)) return [{ y: record.y + 34, device: null }];
  return membersOf(record.node.id, pages).items.map((d, index) => ({ y: record.y + 36 + index * 82 + 34, device: d.id }));
}

export default function MappingCard({ cardRef }) {
  const { resetMapSignal, clearSelSignal } = useApp();
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
  const connected = focus ? new Set([focus, ...mapRelated(focus)]) : null;
  const details = hovered ? { device: hoverDevice } : picked ? { device: picked } : null;

  const stateClasses = (id) => ({
    dim: !!connected && !connected.has(id),
    pinned: id === selected,
    focused: id === hovered,
    related: !!connected && connected.has(id) && id !== focus,
  });

  const x1 = 360, x2 = width - 420;
  const edges = [];
  for (const [gid, sid] of mapRelations) {
    const g = layout.groups.find((r) => r.node.id === gid);
    const s = layout.sets.find((r) => r.node.id === sid);
    if (!g || !s) continue;
    for (const from of groupPorts(g, expanded, pages)) {
      let hot = !!focus && (gid === focus || sid === focus);
      if (hot && details?.device) hot = from.device === details.device;
      edges.push({ gid, sid, vendor: g.node.vendor, from: from.y, to: s.y + 34, device: from.device, hot });
    }
  }

  const selectNode = (id) => {
    if (!mapGroups.some((g) => g.id === id) && !mapSets.some((s) => s.id === id)) return;
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
  const vendorLabel = (v) => (v === "Huawei" ? "华为" : "新华三");

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
                <span className="node-name">{d.name} <small>{d.ip}</small></span>
                <span className="node-meta">{d.model}</span>
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
    const shellCls = ["v7-map-node", isGroup ? "map-group-shell" : "map-set-shell", isOpen ? "expanded" : "", cls.dim ? "dim" : "", cls.pinned ? "pinned" : "", cls.focused ? "focused" : "", cls.related ? "related" : ""].filter(Boolean).join(" ");
    const nodeCls = ["node", isGroup ? "group" : "ruleset", cls.pinned ? "pinned" : "", cls.focused ? "focused" : "", cls.related ? "related" : ""].filter(Boolean).join(" ");
    const linkedGroups = isGroup ? [] : mapGroups.filter((g) => mapRelated(n.id).includes(g.id));
    const meta = isGroup ? n.type : `${n.scope} · ${visibilityOf(vendor, query).gs.filter((g) => mapRelated(n.id).includes(g.id)).length}个设备组`;
    if (isOpen) {
      return (
        <div key={n.id} className="v7-map-split" data-map-node={n.id} data-vendor={n.vendor} style={{ top: record.y + "px", height: record.height + "px" }}>
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
          <span className="node-icon"><Icon name={isGroup ? (n.type.startsWith("FW") ? "shield" : "server") : "clipboard-list"} className="ic" strokeWidth={1.6} /></span>
          <span className="v7-map-node-copy">
            <span className="node-name">{n.name}</span>
            <span className="node-meta">{meta}</span>
          </span>
          <span className="node-count">{isGroup ? n.count : n.rules}<span>{isGroup ? "台" : "条"}</span></span>
          {isGroup ? <span className="v7-map-toggle">{isOpen ? "−" : "+"}</span> : null}
        </button>
      </div>
    );
  };

  return (
    <section className="card artifact-card process-artifact" id="mappingCard" ref={cardRef}>
      <div className="between">
        <div className="v7-artifact-title">
          <ArtifactIcon type="process" shape="mapping" />
          <h2 className="card-title">HCS1合规检查规则&amp;设备匹配</h2>
        </div>
      </div>
      <div className="summary-strip">
        <div className="scope row"><Ic icon="map-pin" />西三旗 DC / HCS1</div>
        <div className="summary-item"><strong>380</strong><span>台设备</span></div>
        <div className="summary-item"><strong>120</strong><span>个配置文件</span></div>
        <div className="summary-item"><strong>4</strong><span>个设备组</span></div>
        <div className="summary-item"><strong>8</strong><span>个检查集</span></div>
        <div className="summary-item"><strong>24</strong><span>条规则</span></div>
      </div>
      <div className="between">
        <OptionGroup cls="filters" buttonCls="filter" ariaLabel="厂商筛选"
          options={[["all", "全部厂商"], ["Huawei", "华为"], ["H3C", "H3C"]]}
          value={vendor} onChange={chooseVendor} />
        <div className="toolbar">
          <SearchInput id="graphSearch" value={searchText} onChange={onSearch} placeholder="搜索设备组或检查集" ariaLabel="搜索设备组或检查集" clearable />
          <button className="btn" style={{ fontSize: "12px" }} onClick={() => { onSearch(""); setVendor("all"); setSelected(null); setHovered(null); setHoverDevice(null); setPicked(null); setExpanded(new Set()); setPages({}); }}>
            <Ic icon="rotate-ccw" style={{ width: "14px", height: "14px" }} />重置
          </button>
        </div>
      </div>
      <div className="graph-head">
        <div className="column-title"><Ic icon="network" />设备组 <span className="small" id="groupCount">{visibleGroupCount} 组</span></div>
        <div className="match-caption"><span />已匹配关系<span /></div>
        <div className="column-title"><Ic icon="clipboard-list" />规则检查集 <span className="small" id="setCount">{visibleSetCount} 个</span></div>
      </div>
      <div className="graph" id="graph" ref={graphRef} style={{ height: layout.height + "px" }} onClick={onBlankClick}>
        <svg className="connections" id="connections" aria-hidden="true" viewBox={`0 0 ${width} ${layout.height}`}>
          {edges.map((e, i) => (
            <path
              key={i}
              className={"edge " + (focus ? (e.hot ? "hot" : "fade") : "")}
              data-group={e.gid} data-set={e.sid} data-vendor={e.vendor}
              d={`M ${x1} ${e.from} C ${x1 + (x2 - x1) * 0.46} ${e.from},${x2 - (x2 - x1) * 0.46} ${e.to},${x2} ${e.to}`}
            />
          ))}
        </svg>
        {layout.vendors.map((v) => (
          <div key={v.vendor} className={"vendor" + (v.vendor === "H3C" ? " h3c" : "")} data-brand={v.vendor} style={{ top: v.y + "px" }}>
            <span className="vendor-mark">{v.vendor === "Huawei" ? "HUAWEI" : "H3C"}</span>
            <strong>{vendorLabel(v.vendor)}</strong>
            <span>{v.count} 台 · {v.groups} 组</span>
          </div>
        ))}
        {layout.groups.map((r) => renderShell(r, "group"))}
        {layout.sets.map((r) => renderShell(r, "set"))}
        <div className="empty" id="empty" style={{ display: visibleGroupCount && visibleSetCount ? "none" : "flex" }}>没有找到匹配的设备组或检查集</div>
      </div>
    </section>
  );
}
