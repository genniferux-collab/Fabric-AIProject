import { useApp } from "../../context.jsx";
import TopBar from "../top-bar/index.jsx";
import LeftRail from "../left-rail/index.jsx";
import Cockpit from "../cockpit/index.jsx";
import LuiPanel from "../lui-panel/index.jsx";
import CanvasArea from "../canvas-area/index.jsx";

// 桌面工作台填满可用窗口，内容区按自身宽度重排。
export default function Stage() {
  const { toastText, uc2, uc2Fusion, luiView } = useApp();

  const isUc4=!uc2.active&&(luiView==='running'||luiView==='done');
  const stageCls = [
    "stage-root", "pc-layout", isUc4 ? "uc4" : "", luiView === "uc1" ? "uc1" : "", luiView === "uc3" ? "uc3" : "",
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
