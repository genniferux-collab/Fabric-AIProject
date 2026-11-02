import { useApp } from "../../context.jsx";
import "./index.css";

const assetRoot="./assets/uploads/pixso-home/";
// 首页按钮只唤起侧栏并展示共享草稿，下一帧再将焦点交给真实输入框。
export default function ChatComposer({onOpen}){
  const {promptText,luiOpen,openAgentHome}=useApp();
  const open=()=>{
    (onOpen||openAgentHome)();
    requestAnimationFrame(()=>document.getElementById("prompt")?.focus({preventScroll:true}));
  };
  return <div className="fabric-home-composer-region">
    <button type="button" className="fabric-home-composer fabric-home-composer-entry" aria-label="打开 AI 对话框" aria-controls="lui" aria-expanded={luiOpen} onClick={open}>
      <span className={`fabric-home-composer-placeholder${promptText?" has-draft":""}`}>{promptText||'输入问题或输入“/”触发提示词'}</span>
      <span className="fabric-home-composer-send" aria-hidden="true"><img src={`${assetRoot}send.svg`} alt=""/></span>
    </button>
  </div>;
}
