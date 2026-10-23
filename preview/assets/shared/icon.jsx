import React, { useState, useEffect, useRef, useLayoutEffect } from "react";

// ---- Lucide (offline fallback, table injected at build time) ----
const ICONS = typeof LUCIDE !== "undefined" ? LUCIDE : {};

function camelToKebab(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function lookupIcon(name) {
  if (!name) return null;
  return (
    ICONS[name] ||
    ICONS[camelToKebab(name)] ||
    ICONS[name.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())] ||
    null
  );
}

// ---- icon-plus (联通) online flow, same as packages/previewpc ----
const ICON_API_BASE = "https://octo.hdesign.huawei.com";
const GET_CONFIG = `${ICON_API_BASE}/assetRepository/iconPlus/getConfig`;
const GET_ICON_INFO = `${ICON_API_BASE}/assetRepository/iconPlus/getIconInfo`;
const GET_ICON = `${ICON_API_BASE}/assetRepository/iconPlus/getIcon`;

let plusState = null; // null = probing, true = icon-plus available, false = fall back to Lucide
let plusPromise = null; // singleton getConfig probe promise
let iconConfig = null;
let defaultColorId = "";
const iconInfoMap = {}; // name -> { name, url } (结果缓存)
const iconInfoPromiseMap = {}; // name -> 进行中 Promise (in-flight 去重)
const svgCache = new Map(); // "name&variant&color&size" -> svg text (结果缓存)
const svgPromiseMap = new Map(); // "name&variant&color&size" -> 进行中 Promise (in-flight 去重)

// 动态获取当前 rem 基准 px（html font-size 随视口媒体查询变化：12/14/16/20px）
function getRootFontSize() {
  if (typeof document === "undefined") return 16;
  const fs = getComputedStyle(document.documentElement).fontSize;
  return parseFloat(fs) || 16;
}

// 将 getComputedStyle 返回的 rgb()/rgba() 字符串转为 #RRGGBB，用于 icon-plus API 颜色匹配
function rgbToHex(rgb) {
  if (!rgb) return null;
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  return "#" + [1, 2, 3].map(function (i) { return parseInt(m[i], 10).toString(16).padStart(2, "0"); }).join("").toUpperCase();
}

// #RGB / #RRGGBB -> [r,g,b]；非法输入返回 null
function hexToRgb(hex) {
  if (!hex) return null;
  let h = String(hex).replace(/^#/, "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 两个 hex 颜色的欧氏距离（RGB 空间），用于 icon-plus 颜色就近匹配
function colorDistance(a, b) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return Infinity;
  return Math.sqrt(
    (ra[0] - rb[0]) ** 2 + (ra[1] - rb[1]) ** 2 + (ra[2] - rb[2]) ** 2
  );
}

// getIcon 接口的 size 参数需数字 px。源 size 可能是 rem/px/数字，转 px 后吸附到 icon-plus 标准尺寸。
const API_SIZES = [12, 14, 16, 20, 24, 32, 36, 40, 48, 60];
function toApiSize(size) {
  let n = null;
  if (size != null) {
    const m = String(size).trim().match(/(-?\d+(?:\.\d+)?)\s*(rem|px)?/i);
    if (m) {
      n = Number(m[1]);
      if (m[2] && m[2].toLowerCase() === "rem") n = n * getRootFontSize();
    }
  }
  if (n == null || Number.isNaN(n)) return 16;
  let best = API_SIZES[0], bestDiff = Math.abs(n - best);
  for (const s of API_SIZES) {
    const d = Math.abs(n - s);
    if (d < bestDiff) { bestDiff = d; best = s; }
  }
  return best;
}

// variant prop -> getConfig style key (matches previewpc's shapeToStyleKey)
const STYLE_KEY = {
  lined: "border",
  filled: "filled",
  "two-tone": "two_colors1",
  circle: "round_bottom2",
  square: "square_bottom2",
};

function getStyleValue(styleKey) {
  return iconConfig?.style?.find((s) => s.key === styleKey)?.value || styleKey;
}

// resolve an API color id from the requested hex against getConfig colors
// 精确命中 → 就近匹配（RGB 欧氏距离最小）→ defaultColorId 兜底
function resolveColorId(variant, colorHex) {
  const styleValue = getStyleValue(STYLE_KEY[variant] || "border");
  const colors = (iconConfig?.colors || []).filter((c) => c.style === styleValue);
  if (colorHex) {
    const target = colorHex.toUpperCase();
    // 1. 精确匹配：某个 color 的 value 列表里直接包含目标色
    const exact = colors.find((c) =>
      String(c.value).split(",").map((v) => v.trim().toUpperCase()).includes(target)
    );
    if (exact) return exact.id;
    // 2. 就近匹配：取与目标色 RGB 距离最小的 color（多色值取其中最近的）
    let best = null;
    let bestDist = Infinity;
    for (const c of colors) {
      for (const v of String(c.value).split(",")) {
        const d = colorDistance(target, v.trim());
        if (d < bestDist) { bestDist = d; best = c; }
      }
    }
    if (best) return best.id;
  }
  // 3. 兜底：线性通用色 → 该 style 下第一个 → 空串
  return defaultColorId || colors[0]?.id || "";
}

// getConfig probe == 联通可用性验证 (same as previewpc fetchIconConfig)
function ensurePlus() {
  if (plusPromise) return plusPromise;
  plusPromise = (async () => {
    try {
      const resp = await fetch(GET_CONFIG);
      if (!resp.ok) {
        plusState = false;
        return false;
      }
      iconConfig = await resp.json();
      const linear = iconConfig.colors?.find(
        (c) => c.type === "linear" || c.type === "通用色"
      );
      defaultColorId =
        linear?.id || iconConfig.colors?.[0]?.id || "";
      plusState = true;
      return true;
    } catch (e) {
      plusState = false;
      return false;
    }
  })();
  return plusPromise;
}

// pick the best icon-plus match for a keyword (prefer system-icon group, then name contains keyword, else first)
function selectBestIcon(icons, keyword) {
  return (
    icons.find(
      (i) => Array.isArray(i.group) && i.group.some((g) => g.includes("系统图标"))
    ) ||
    icons.find((i) => i.name?.toLowerCase().includes(keyword.toLowerCase())) ||
    icons[0]
  );
}

// name -> { name, url } via getIconInfo (结果缓存在 iconInfoMap；并发去重靠 iconInfoPromiseMap)
async function resolveIconInfo(name) {
  if (iconInfoMap[name]) return iconInfoMap[name];
  // 同 name 并发请求共享同一个进行中 Promise，避免 N 个相同图标各发一次 getIconInfo
  if (iconInfoPromiseMap[name]) return iconInfoPromiseMap[name];
  const p = (async () => {
    try {
      const resp = await fetch(
        `${GET_ICON_INFO}?keyword=${encodeURIComponent(name)}&topK=2&source_id=6`
      );
      const data = await resp.json(); // [{ keyword, icons: [{ icon_id, name, category, group[], url }] }]
      const entry = (Array.isArray(data) ? data : [data]).find(
        (d) => d.icons?.length
      );
      const selected = selectBestIcon(entry?.icons || [], name);
      if (!selected?.url) return null;
      iconInfoMap[name] = { name: selected.name, url: selected.url };
      return iconInfoMap[name];
    } catch (e) {
      return null;
    }
  })();
  iconInfoPromiseMap[name] = p;
  // 落定后清除 in-flight 条目（失败也清除，允许下次重试，不永久缓存 rejected 结果）
  p.finally(() => {
    delete iconInfoPromiseMap[name];
  });
  return p;
}

// fetch the SVG text for a name via getIcon (url + size + variant + colorId + fileType=svg)
// 结果缓存在 svgCache；并发去重靠 svgPromiseMap，相同 key 共享同一进行中 Promise
// key 含 size：不同尺寸取回的 SVG 不同，不可复用
function fetchSvg(name, variant, colorHex, size) {
  const key = `${name}&${variant}&${colorHex}&${size}`;
  if (svgCache.has(key)) return Promise.resolve(svgCache.get(key));
  if (svgPromiseMap.has(key)) return svgPromiseMap.get(key);
  const p = (async () => {
    const info = await resolveIconInfo(name);
    if (!info) return "";
    const styleValue = getStyleValue(STYLE_KEY[variant] || "border");
    const colorId = resolveColorId(variant, colorHex);
    try {
      const resp = await fetch(
        `${GET_ICON}?url=${encodeURIComponent(info.url)}&size=${toApiSize(size)}&style=${encodeURIComponent(
          styleValue
        )}&color=${encodeURIComponent(colorId)}&fileType=svg`
      );
      const data = await resp.json(); // { url, name, data } or array
      const item = Array.isArray(data) ? data[0] : data;
      return item?.data || ""; // raw SVG text, injected as-is
    } catch (e) {
      return "";
    }
  })();
  svgPromiseMap.set(key, p);
  // 落定后写入结果缓存并清除 in-flight 条目；空结果（失败）不缓存，允许下次重试
  p.then((s) => {
    if (s) svgCache.set(key, s);
  }).finally(() => {
    svgPromiseMap.delete(key);
  });
  return p;
}

// size → rem 字符串;数字(设计画布 px)兜底转换为 rem
function resolveSize(size) {
  if (typeof size === "number") {
    console.warn(`[Icon] size={${size}} is a number — use rem string instead (e.g. size="${(size / 16).toFixed(4).replace(/\.?0+$/, "")}rem")`);
    const rootFontSize = getRootFontSize();
    const rem = size / rootFontSize;
    return `${parseFloat(rem.toFixed(4))}rem`;
  }
  return size;
}

export function Icon({
  name,
  src,
  size = "1rem",
  color,
  className = "",
  style,
  strokeWidth = 2,
  variant = "lined",
  onClick,
  title,
  id,
}) {
  const resolvedSize = resolveSize(size);
  const mergedStyle = onClick ? { cursor: "pointer", ...style } : style;
  const wrapRef = useRef(null);
  const [inheritedColor, setInheritedColor] = useState(null);
  const effectiveColor = color || inheritedColor;
  const [plus, setPlus] = useState(plusState); // reuse already-probed result

    // 仅 icon-plus 模式（plus 就绪、非 src 资源、无显式 color）才需要继承父元素颜色；
  // Lucide / img 模式颜色由 CSS（currentColor）或属性直接处理，不读计算色、不监听主题
  useLayoutEffect(function () {
    if (src || plus !== true || color) return;
    const el = wrapRef.current;
    if (!el) return; // 尚未挂载（首次 plus===null 返回 null）
    const hex = rgbToHex(getComputedStyle(el).color);
    if (hex && hex !== inheritedColor) setInheritedColor(hex);
  });

  const [svg, setSvg] = useState(
    () => svgCache.get(`${name}&${variant}&${effectiveColor}&${size}`) || ""
  );

    // 主题切换时 <html> class 变化不会触发 React 重渲染，需 MutationObserver 主动监听。
  // antd Button 等组件有 transition: color 0.2s，getComputedStyle 在 transition 期间返回中间色值；
  // 立即读一次覆盖无 transition 的图标，200ms 后再读一次覆盖 Button 等带 transition 的图标。
  // 仅 icon-plus 模式（plus 就绪、非 src 资源、无显式 color）才挂观察者，依赖变化时重建
  useEffect(() => {
    if (src || plus !== true || color) return;
    const readColor = () => {
      const el = wrapRef.current;
      if (!el) return;
      const hex = rgbToHex(getComputedStyle(el).color);
      if (hex) setInheritedColor(function (prev) { return hex !== prev ? hex : prev; });
    };
    let timer = null;
    const observer = new MutationObserver(() => {
      readColor();
      if (timer) clearTimeout(timer);
      timer = setTimeout(readColor, 300);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return function () {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [plus, src, color]);

  useEffect(() => {
    if (src) return; // user-asset mode: no network needed
    let alive = true;
    ensurePlus().then((ok) => {
      if (!alive) return;
      setPlus(ok);
      if (!ok) return; // getConfig probe failed → Lucide branch
      const key = `${name}&${variant}&${effectiveColor}&${size}`;
      if (svgCache.has(key)) {
        setSvg(svgCache.get(key));
        return;
      }
      fetchSvg(name, variant, effectiveColor, size).then((s) => {
        if (!alive || !s) return; // 空结果（失败）不写入 state，允许下次重试
        setSvg(s);
      });
    });
    return () => {
      alive = false;
    };
  }, [src, name, variant, effectiveColor, size]);

  // user-provided asset (svg/png/jpg) via relative path — overrides name when both are set
  if (src) {
    return React.createElement("img", {
      src: src,
      id,
      width: resolvedSize,
      height: resolvedSize,
      className: className,
      alt: "",
      "aria-hidden": true,
      onClick,
      title,
      style: { ...mergedStyle, display: "inline-block", verticalAlign: "middle" },
    });
  }

  // probe not finished yet → render nothing
  if (plus === null) return null;

  // icon-plus unavailable (offline) → Lucide fallback (original behavior)
  if (plus === false) {
    const nodes = lookupIcon(name);
    if (!nodes) return null;
    return React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: resolvedSize,
        height: resolvedSize,
        viewBox: "0 0 24 24",
        fill: "none",
        strokeWidth: strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: className,
        "aria-hidden": true,
        id,
        onClick,
        title,
        style: { ...mergedStyle, stroke: color || "currentColor" },
      },
      nodes.map(([tag, attrs], i) =>
        React.createElement(tag, { key: i, ...attrs })
      )
    );
  }

  // icon-plus available → render fetched SVG text as-is (only width/height on the wrapper)
  if (!svg) {
    return React.createElement("span", {
      ref: wrapRef,
      id,
      className,
      "aria-hidden": true,
      onClick,
      title,
      style: { ...mergedStyle, width: resolvedSize, height: resolvedSize },
    });
  }

  return React.createElement("span", {
    ref: wrapRef,
    id,
    className,
    "aria-hidden": true,
    onClick,
    title,
    style: { ...mergedStyle, width: resolvedSize, height: resolvedSize },
    dangerouslySetInnerHTML: { __html: svg },
  });
}
