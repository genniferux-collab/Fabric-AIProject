import {useEffect,useState} from "react";
import { useApp } from "../../context.jsx";
import TopBar from "../top-bar/index.jsx";
import LeftRail from "../left-rail/index.jsx";
import Cockpit from "../cockpit/index.jsx";
import LuiPanel from "../lui-panel/index.jsx";
import CanvasArea from "../canvas-area/index.jsx";

// 全流程共用固定设计画布，只由视口尺寸决定缩放。
export default function Stage() {
  const { toastText, uc2, uc2Fusion, luiView } = useApp();

  const isUc4=!uc2.active&&(luiView==='running'||luiView==='done');
  const [scale,setScale]=useState(()=>Math.min(window.innerWidth/1920,window.innerHeight/1080));
  useEffect(()=>{const resize=()=>setScale(Math.min(window.innerWidth/1920,window.innerHeight/1080));window.addEventListener('resize',resize);resize();return()=>window.removeEventListener('resize',resize)},[]);
  const stageCls = [
    "stage-root", "design-canvas", isUc4 ? "uc4" : "",
    uc2.active ? "uc2" : "",
    uc2.active && uc2.max === 0 ? "uc2-intent" : "",
    uc2.active && uc2.max >= 2 && uc2Fusion.drawer ? "uc2-rule-drawer" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="stage-viewport">
      <div className={stageCls} id="stage" style={{"--canvas-scale":scale}}>
        <TopBar />
        <LeftRail />
        <Cockpit />
        <LuiPanel />
        <CanvasArea />
        <div className="toast" id="toast" role="status" style={{ display: toastText ? "block" : "none" }}>{toastText}</div>
      </div>
    </div>
  );
}
