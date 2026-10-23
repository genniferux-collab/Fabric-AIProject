import React, { useState, useEffect } from "react";

// IPInput — IP / IPv6 / MAC 分段输入控件（antd 无此组件，skill 内置）
// mode 决定段数/分隔符/字符集：ipv4 = 4段"."十进制，ipv6 = 8段":"十六进制小写，mac = 6段"-"十六进制大写
// value/onChange 均为完整字符串（如 "192.168.1.1"）；分段 blur 时归一化钳制。

const MODES = {
  ipv4: { sep: ".", count: 4, maxLen: 3, dotSep: true, filter: (s) => s.replace(/[^0-9]/g, "") },
  ipv6: { sep: ":", count: 8, maxLen: 4, filter: (s) => s.replace(/[^0-9a-fA-F]/g, "").toLowerCase() },
  mac: { sep: "-", count: 6, maxLen: 2, filter: (s) => s.replace(/[^0-9a-fA-F]/g, "").toUpperCase() },
};

// size 刻度对齐设计系统 Input/Button/InputNumber：large=2.5rem/16px，middle=2rem/14px，small=1.75rem/12px
const SIZES = {
  large: { height: "2.5rem", padding: "0 0.75rem", gap: "0.375rem", font: "var(--font-body-l)", dot: "0.25rem" },
  middle: { height: "2rem", padding: "0 0.75rem", gap: "0.25rem", font: "var(--font-body-m)", dot: "0.1875rem" },
  small: { height: "1.75rem", padding: "0 0.75rem", gap: "0.1875rem", font: "var(--font-body-s)", dot: "0.125rem" },
};

function segmentsFromValue(value, cfg) {
  const parts = String(value ?? "").split(cfg.sep);
  const segs = [];
  for (let i = 0; i < cfg.count; i++) segs.push(parts[i] ?? "");
  return segs;
}

export default function IpInput({ type = "ipv4", size = "middle", value, onChange, onFocus, onBlur, status, disabled, id, className = "", style }) {
  const cfg = MODES[type] || MODES.ipv4;
  const sz = SIZES[size] || SIZES.middle;
  const [segs, setSegs] = useState(() => segmentsFromValue(value, cfg));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setSegs(segmentsFromValue(value, cfg));
  }, [value, type]);

  const emit = (next) => {
    if (onChange) onChange(next.join(cfg.sep));
  };

  function handleInput(i, raw) {
    const next = [...segs];
    next[i] = cfg.filter(raw).slice(0, cfg.maxLen);
    setSegs(next);
    emit(next);
  }

  function handleBlur(i) {
    const next = [...segs];
    const s = next[i];
    if (type === "ipv4") {
      let n = parseInt(s, 10);
      if (Number.isNaN(n)) n = 0;
      next[i] = String(Math.min(255, Math.max(0, n)));
    } else if (type === "mac") {
      next[i] = (s || "0").padStart(2, "0");
    } else {
      next[i] = (s || "0").toLowerCase();
    }
    setSegs(next);
    emit(next);
    return next.join(cfg.sep);
  }

  const borderColor = status === "error" ? "var(--color-error)" : focused ? "var(--color-border-focus)" : "var(--gray-20)";

  const children = [];
  for (let i = 0; i < cfg.count; i++) {
    children.push(
      React.createElement("input", {
        key: i,
        id: i === 0 ? id : undefined,
        value: segs[i],
        disabled,
        maxLength: cfg.maxLen,
        onChange: (e) => handleInput(i, e.target.value),
        onBlur: () => {
          const v = handleBlur(i);
          if (onBlur) onBlur(v);
        },
        style: {
          width: `${cfg.maxLen + 1}ch`,
          border: "none",
          outline: "none",
          background: "var(--color-fill-subtle)",
          padding: 0,
          textAlign: "center",
          color: "var(--color-text-primary)",
          font: sz.font,
        },
      })
    );
    if (i < cfg.count - 1) {
      children.push(
        cfg.dotSep
          ? React.createElement("span", {
              key: `sep-${i}`,
              style: {
                width: sz.dot,
                height: sz.dot,
                borderRadius: "50%",
                background: "var(--color-text-secondary)",
                flexShrink: 0,
              },
            })
          : React.createElement(
              "span",
              {
                key: `sep-${i}`,
                style: { color: "var(--color-text-secondary)", userSelect: "none", font: sz.font },
              },
              cfg.sep
            )
      );
    }
  }

  return React.createElement(
    "div",
    {
      className,
      onFocusCapture: () => {
        setFocused(true);
        if (onFocus) onFocus(segs.join(cfg.sep));
      },
      onBlurCapture: () => setFocused(false),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: sz.gap,
        height: sz.height,
        padding: sz.padding,
        border: `1px solid ${borderColor}`,
        borderRadius: "4px",
        boxShadow: focused ? "0 0 0 1px var(--color-brand-disabled)" : "none",
        background: disabled ? "var(--color-fill-disabled-subtle)" : "var(--color-fill-subtle)",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "text",
        ...style,
      },
    },
    children
  );
}
