import { useApp } from "../../context.jsx";
import TopBar from "../top-bar/index.jsx";
import LeftRail from "../left-rail/index.jsx";
import Cockpit from "../cockpit/index.jsx";
import LuiPanel from "../lui-panel/index.jsx";
import CanvasArea from "../canvas-area/index.jsx";

// Layer 5: 页面壳 — 常规自适应布局（视口宽高驱动，画布区内部滚动）
export default function Stage() {
  const { toastText, uc2, uc2Fusion } = useApp();

  const stageCls = [
    "stage-root",
    uc2.active ? "uc2" : "",
    uc2.active && uc2.max === 0 ? "uc2-intent" : "",
    uc2.active && uc2.max >= 2 && uc2Fusion.drawer ? "uc2-rule-drawer" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="stage-viewport">
      <div className={stageCls} id="stage">
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
