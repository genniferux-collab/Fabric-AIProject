import { useApp } from "../../context.jsx";

export default function LeftRail() {
  const { agentActive, toggleAgent, goCockpit, toast, luiView, locate, focusLuiArtifact } = useApp();
  const closeMenu = e => e.currentTarget.closest("details")?.removeAttribute("open");
  const showReport = () => {
    if(luiView === "done"){focusLuiArtifact("report");locate("report");}
    else toast("完成基线检查后可从此处查看报告。");
  };
  return <aside className="rail shell-rail" aria-label="主导航">
    <button className="shell-assistant-button" title="智能体 Aico" aria-label="智能体 Aico" onClick={toggleAgent}><img src="./assets/uploads/shell-assistant.png" width="24" height="24" alt=""/></button>
    <div className="shell-rail-items">
      <button className={"shell-rail-item"+(!agentActive?" active":"")} aria-label="健康看板" title="健康看板" aria-current={!agentActive?"page":undefined} onClick={goCockpit}><img src="./assets/uploads/shell-home.svg" width="16" height="16" alt=""/></button>
      <button className={"shell-rail-item"+(agentActive?" active":"")} id="agentNav" title="智能体对话" aria-label="智能体对话" aria-current={agentActive?"page":undefined} onClick={toggleAgent}><img src="./assets/uploads/shell-chat.svg" width="16" height="16" alt=""/></button>
      <button className="shell-rail-item" title="网络资源" aria-label="查看网络资源" onClick={goCockpit}><img src="./assets/uploads/shell-resource.svg" width="16" height="16" alt=""/></button>
      <button className="shell-rail-item" title="检查报告" aria-label="查看检查报告" onClick={showReport}><img src="./assets/uploads/shell-checks.svg" width="16" height="16" alt=""/></button>
    </div>
    <details className="shell-rail-more"><summary className="shell-rail-item" title="导航菜单" aria-label="打开侧边导航菜单"><img src="./assets/uploads/shell-navigation.svg" width="16" height="16" alt=""/></summary>
      <nav className="shell-menu-panel" aria-label="侧边导航菜单"><button onClick={e=>{goCockpit();closeMenu(e);}}>健康看板</button><button onClick={e=>{toggleAgent();closeMenu(e);}}>智能体对话</button><button onClick={e=>{showReport();closeMenu(e);}}>检查报告</button></nav>
    </details>
  </aside>;
}
