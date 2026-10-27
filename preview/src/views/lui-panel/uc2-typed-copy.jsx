import { cloneElement, isValidElement, useEffect, useState } from "react";
import { useApp } from "../../context.jsx";
import { uc2Timing } from "../../mock/uc2.js";

function textLength(node) {
  if (typeof node === "string" || typeof node === "number") return Array.from(String(node)).length;
  if (Array.isArray(node)) return node.reduce((sum, child) => sum + textLength(child), 0);
  return isValidElement(node) ? textLength(node.props.children) : 0;
}
function revealText(node, budget) {
  if (typeof node === "string" || typeof node === "number") {
    const chars = Array.from(String(node)), shown = chars.slice(0, Math.max(0, budget.left)).join("");
    budget.left -= chars.length; return Array.from(shown).map((char, index) => <span className="lui-stream-unit" key={index}>{char}</span>);
  }
  if (Array.isArray(node)) return node.map(child => revealText(child, budget));
  if (!isValidElement(node) || budget.left <= 0) return null;
  return cloneElement(node, undefined, revealText(node.props.children, budget));
}

export default function Uc2TypedCopy({ step, kind = "conclusion", children }) {
  const { uc2 } = useApp();
  const [fraction, setFraction] = useState(0);
  const typing = step === uc2.stage && uc2.phase === (kind === "thought" ? "text" : "canvas");
  useEffect(() => {
    if (!typing) return;
    let frame = 0, lastPaint = 0;
    const tick = now => {
      const elapsed = uc2.phaseElapsed + (uc2.running && uc2.phaseStartedAt ? Date.now() - uc2.phaseStartedAt : 0);
      if (now - lastPaint >= 32 || !uc2.running) { const progress = kind === "thought" ? Math.min(1, elapsed / uc2Timing.text[step])
        : uc2.canvasStarted ? Math.min(1, elapsed / uc2Timing.canvas[step]) : 0;
        setFraction(progress); lastPaint = now; }
      if (uc2.running) frame = requestAnimationFrame(tick);
    };
    tick(0); return () => cancelAnimationFrame(frame);
  }, [typing, step, kind, uc2.running, uc2.phaseElapsed, uc2.phaseStartedAt, uc2.phase, uc2.canvasStarted]);
  const content = typing ? revealText(children, { left: Math.floor(textLength(children) * fraction) }) : children;
  return <div className="uc2-typed-copy" data-copy-kind={kind} data-text-state={typing ? "typing" : "complete"} aria-busy={typing}>{content}{typing && <span className="uc2-typing-cursor" aria-hidden="true" />}</div>;
}
