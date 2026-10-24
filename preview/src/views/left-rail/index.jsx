import { useApp } from "../../context.jsx";
import Ic from "../../components/icon-el/index.jsx";

// 左侧工具栏
export default function LeftRail() {
  const { agentActive, toggleAgent, goCockpit, toast, isDark } = useApp();
  return (
    <aside className="rail">
      <button className="icon-btn" aria-label="健康看板" title="健康看板" onClick={goCockpit}>
        <Ic variant={isDark ? "filled" : "lined"} icon="layout-dashboard" />
      </button>
      <button className="icon-btn" title="网络资源" aria-label="查看网络资源" onClick={goCockpit}>
        <Ic variant={isDark ? "filled" : "lined"} icon="network" />
      </button>
      <button className={"icon-btn" + (agentActive ? " active" : "")} id="agentNav" title="智能体 Aico" aria-label="智能体 Aico" onClick={toggleAgent}>
        <Ic variant={isDark ? "filled" : "lined"} icon="sparkles" />
      </button>
      <div className="rail-bottom">
        <button className="icon-btn" title="帮助" aria-label="帮助" onClick={() => toast("点击节点查看关联关系，点击产物标签可回到匹配图。")}>
          <Ic variant={isDark ? "filled" : "lined"} icon="circle-question-mark" />
        </button>
      </div>
    </aside>
  );
}
