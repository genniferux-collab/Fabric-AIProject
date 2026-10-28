import { createContext, useContext, useEffect, useRef, useState } from "react";
import { uc2Timing } from "../../mock/uc2.js";
import { useApp } from "../../context.jsx";
import "../report-card/generation.css";

const ReportRevealContext=createContext({classAt:()=>"",loading:false});
export const useUc2ReportReveal=()=>useContext(ReportRevealContext);
const milestones=[0,.1,.24,.38,.54,.68,.78,...Array.from({length:10},(_,index)=>.78+index*.018),1];

// Share UC4's skeleton / reveal styles while keeping UC2's existing phase clock.
export default function Uc2ReportGeneration({ children }) {
  const { uc2, uc2CanvasStart, uc2CanvasComplete } = useApp();
  const headerRef=useRef(null);
  const loading=uc2.stage===3&&uc2.phase!=="complete",generating=uc2.stage===3&&uc2.phase==="canvas";
  const [progress,setProgress]=useState(loading?0:1);
  useEffect(()=>{
    if(!generating||uc2.canvasStarted)return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){uc2CanvasStart(3);observer.disconnect();}});
    if(headerRef.current)observer.observe(headerRef.current);
    return()=>observer.disconnect();
  },[generating,uc2.canvasStarted,uc2CanvasStart]);
  useEffect(()=>{
    if(!loading){setProgress(1);return;}
    if(!generating||!uc2.canvasStarted){setProgress(0);return;}
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setProgress(1);return;}
    let frame=0,last=-1;
    const tick=()=>{
      const elapsed=uc2.phaseElapsed+(uc2.running&&uc2.phaseStartedAt?Date.now()-uc2.phaseStartedAt:0);
      const fraction=Math.min(1,elapsed/uc2Timing.canvas[3]);
      const reached=milestones.filter(point=>point<=fraction).length-1;
      if(reached!==last){setProgress(fraction);last=reached;}
      if(uc2.running&&fraction<1)frame=requestAnimationFrame(tick);
    };
    tick();return()=>cancelAnimationFrame(frame);
  },[loading,generating,uc2.canvasStarted,uc2.running,uc2.phaseElapsed,uc2.phaseStartedAt]);
  useEffect(()=>{if(generating&&uc2.canvasStarted&&progress>=1)uc2CanvasComplete(3);},[generating,uc2.canvasStarted,progress,uc2CanvasComplete]);
  const reveal={loading,classAt:point=>loading&&progress<point?" report-reveal-skeleton":" report-reveal-content"};
  return <ReportRevealContext.Provider value={reveal}><div className="uc2-report-generation" data-report-state={loading?"generating":"complete"} data-report-progress={progress.toFixed(3)} aria-busy={loading} style={{"--report-skeleton-play-state":uc2.running?"running":"paused"}}><span className="uc2-report-generation-anchor" ref={headerRef} aria-hidden="true"/>{children}</div></ReportRevealContext.Provider>;
}
