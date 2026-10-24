import { useApp } from "../../context.jsx";
import Ic from "../../components/icon-el/index.jsx";

// 顶栏：品牌 + 导航 + 方案对比 + 主题切换 + 用户
export default function TopBar() {
  const { toggleDark, isDark } = useApp();
  return (
    <header className="top">
      <div className="left">
        <span className="secondary"><Ic variant={isDark ? "filled" : "lined"} icon="menu" /></span>
        <span className="brand">iMaster FabricInsight</span>
        <span className="divider" />
        <span className="topnav active"><Ic variant={isDark ? "filled" : "lined"} icon="house" />健康看板</span>
        <span className="topnav"><Ic variant={isDark ? "filled" : "lined"} icon="monitor" />大屏</span>
      </div>
      <div className="right">
        <nav className="version-compare" aria-label="报告方案对比">
          <span>方案对比</span>
          <a href="https://baseline-compliance-canvas.blithe-fir-3798.chatgpt.site/classic.html">原版 · V2</a>
          <a href="https://baseline-compliance-canvas.blithe-fir-3798.chatgpt.site/fusion/">融合版</a>
          <a href="./index.page.html" aria-current="page">新版本</a>
        </nav>
        <span className="tag">演示数据</span>
        <button className="icon-btn" title="切换主题" aria-label="切换主题" onClick={toggleDark}>
          <Ic variant={isDark ? "filled" : "lined"} icon="sun" />
        </button>
        <span className="row"><span className="avatar">A</span><span>admin</span></span>
      </div>
    </header>
  );
}
