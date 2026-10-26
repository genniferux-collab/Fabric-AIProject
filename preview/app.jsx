// App entry — HCS1 基线合规检查 · 智能画布（由 config-agent-merged.html 迁移）
// Layering convention:
//   Layer 1 global state  → src/context.jsx        (AppProvider: 主题 + 任务流 + 页签)
//   Layer 2 mock data     → src/mock/              (devices / checks / audit / graph / workflow)
//   Layer 3 reusable      → src/components/status-marks/
//   Layer 4 views         → src/views/{stage,top-bar,left-rail,cockpit,lui-panel,canvas-area,
//                                      network-overview,mapping-card,report-card,device-pane}
//   Layer 5 layout        → app.jsx (本文件)

// 样式按原 HTML 中 <style> 块的级联顺序导入（stage 基础令牌最先）
import "./src/views/stage/index.css";
import "./src/views/top-bar/index.css";
import "./src/views/cockpit/index.css";
import "./src/views/lui-panel/index.css";
import "./src/views/canvas-area/index.css";
import "./src/views/network-overview/index.css";
import "./src/views/mapping-card/index.css";
import "./src/views/report-card/index.css";
import "./src/views/device-pane/index.css";
import "./src/views/uc2-canvas/uc2.css";
import "./src/views/uc4-sync.css";
import "./src/views/process-animation.css";
import "./src/views/stage/desktop.css";
import "./src/views/cockpit/responsive.css";
import "./src/views/artifact-surfaces/index.css";
import "./src/views/stage/typography.css";
import "./src/views/device-pane/design.css";

import { ConfigProvider } from "antd";
import zhCN from "./assets/shared/antd-zh.js";
import { AppProvider } from "./src/context.jsx";
import Stage from "./src/views/stage/index.jsx";

export default function App() {
  return (
    <AppProvider>
      <ConfigProvider locale={zhCN} wave={{ disabled: true }}>
        <Stage />
      </ConfigProvider>
    </AppProvider>
  );
}
