import { useEffect, useRef } from "react";
import { uc2Timing } from "../../mock/uc2.js";
import { useApp } from "../../context.jsx";

export default function Uc2ReportGeneration({ children }) {
  const { uc2, uc2CanvasStart, uc2CanvasComplete } = useApp();
  const headerRef = useRef(null);
  const generating = uc2.stage === 3 && uc2.phase === "canvas";
  useEffect(() => {
    if (!generating || uc2.canvasStarted) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { uc2CanvasStart(3); observer.disconnect(); }
    });
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [generating, uc2.canvasStarted, uc2CanvasStart]);
  useEffect(() => {
    if (generating && uc2.canvasStarted && window.matchMedia("(prefers-reduced-motion: reduce)").matches) uc2CanvasComplete(3);
  }, [generating, uc2.canvasStarted, uc2CanvasComplete]);
  return <div className={"uc2-report-generation" + (generating ? uc2.canvasStarted ? " is-generating" : " is-waiting" : "")} style={{"--uc2-report-duration":`${uc2Timing.canvas[3]}ms`,"--uc2-report-play-state":uc2.running?"running":"paused"}} onAnimationEnd={event=>{if(event.animationName==="uc2ReportGenerate"&&event.target===event.currentTarget)uc2CanvasComplete(3);}}><span className="uc2-report-generation-anchor" ref={headerRef} aria-hidden="true"/>{children}</div>;
}
