import { Icon } from "../../../assets/shared/icon.jsx";
import "./index.css";

export default function ChatComposer({ onOpen }) {
  return <div className="home-composer-region">
    <button type="button" className="home-composer home-composer-launcher" aria-label="打开 AI 对话侧边栏" aria-controls="lui" onClick={onOpen}>
      <span className="home-composer-placeholder">描述运维任务，或向 Aico 提问…</span>
      <span className="home-composer-send" aria-hidden="true"><Icon name="arrow-up" size="1rem" /></span>
    </button>
  </div>;
}
