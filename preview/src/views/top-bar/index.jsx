import {NativeSelect} from '../../components/form-controls/select.jsx';
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context.jsx";
import Ic from "../../components/icon-el/index.jsx";
import "./shell.css";

export default function TopBar() {
  const { toggleDark, goCockpit, toggleAgent, toast } = useApp();
  const [searchOpen, setSearchOpen] = useState(false), [query, setQuery] = useState("");
  const searchRef = useRef(null);
  useEffect(() => {
    const close = e => { if (!searchRef.current?.contains(e.target)) setSearchOpen(false); };
    const escape = e => { if (e.key === "Escape") setSearchOpen(false); };
    document.addEventListener("pointerdown",close); document.addEventListener("keydown",escape);
    return () => { document.removeEventListener("pointerdown",close); document.removeEventListener("keydown",escape); };
  },[]);
  const help = () => toast("点击节点查看关联关系，点击产物标签可定位到画布；点击卡片可定位到对应回答。");
  const closeMenu = e => e.currentTarget.closest("details")?.removeAttribute("open");
  const items = [{name:"健康看板",action:goCockpit},{name:"网络资源",action:goCockpit},{name:"智能体 Aico",action:toggleAgent}];
  return <header className="top shell-top">
    <div className="left">
      <details className="shell-main-menu"><summary aria-label="打开导航菜单" title="导航菜单"><img src="./assets/uploads/shell-menu.svg" width="20" height="20" alt=""/></summary>
        <nav className="shell-menu-panel" aria-label="导航菜单">{items.map(item=><button key={item.name} onClick={e=>{item.action();closeMenu(e);}}>{item.name}</button>)}
          <div className="shell-menu-divider"/><span className="shell-menu-caption">方案对比</span>
          <a href="https://baseline-compliance-canvas.blithe-fir-3798.chatgpt.site/classic.html">原版 · V2</a>
          <a href="https://baseline-compliance-canvas.blithe-fir-3798.chatgpt.site/fusion/">融合版</a>
          <a href="./index.page.html" aria-current="page">新版本</a>
        </nav>
      </details>
      <span className="shell-brand"><img src="./assets/uploads/shell-brand.svg" width="136" height="24" alt="iMaster NCE"/></span>
    </div>
    <div className="right">
      <label className="shell-mode"><NativeSelect aria-label="驾驶模式" defaultValue="auto"><option value="auto">智驾模式</option><option value="normal">常规模式</option></NativeSelect><Ic icon="chevron-down"/></label>
      <div className="shell-search-anchor" ref={searchRef}>
        <button className="shell-top-icon" title="搜索" aria-label="搜索导航" aria-expanded={searchOpen} onClick={()=>setSearchOpen(!searchOpen)}><img src="./assets/uploads/shell-search.svg" width="20" height="20" alt=""/></button>
        {searchOpen && <div className="shell-menu-panel shell-search-panel" role="dialog" aria-label="搜索导航菜单"><input autoFocus aria-label="搜索导航项" placeholder="搜索导航" value={query} onChange={e=>setQuery(e.target.value)}/>{items.filter(item=>item.name.toLowerCase().includes(query.toLowerCase())).map(item=><button key={item.name} onClick={()=>{item.action();setSearchOpen(false);setQuery("");}}>{item.name}</button>)}{!items.some(item=>item.name.toLowerCase().includes(query.toLowerCase()))&&<span className="shell-menu-caption">未找到匹配导航</span>}</div>}
      </div>
      <button className="shell-top-icon" title="帮助" aria-label="帮助" onClick={help}><img src="./assets/uploads/shell-help.svg" width="20" height="20" alt=""/></button>
      <button className="shell-top-icon" title="切换主题" aria-label="切换主题" onClick={toggleDark}><img src="./assets/uploads/shell-sun.svg" width="20" height="20" alt=""/></button>
      <span className="shell-account"><img src="./assets/uploads/shell-user.svg" width="20" height="20" alt=""/><span>Admin</span></span>
    </div>
  </header>;
}
