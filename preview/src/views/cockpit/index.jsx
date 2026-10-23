import { useApp } from "../../context.jsx";
import Ic from "../../components/icon-el/index.jsx";

// 网络自治驾驶舱（欢迎页，被智能体面板/画布覆盖）
export default function Cockpit() {
  const { openAgentHome } = useApp();
  return (
    <section className="cockpit">
      <div className="small muted">网络自治驾驶舱</div>
      <h1>你好，今天网络运行平稳</h1>
      <div className="welcome">Aico 持续守护网络，协助你发现风险、核验配置与处置故障。</div>
      <div className="cockpit-cards">
        <div className="cockpit-card">
          网络健康度
          <strong>98.6<span className="small muted"> 分</span></strong>
          <span className="small secondary">较昨日保持稳定</span>
        </div>
        <div className="cockpit-card">
          网络故障治理
          <strong>24</strong>
          <span className="small secondary">已处置 18 · 待人工决策 6</span>
        </div>
        <div className="cockpit-card">
          配置合规
          <strong>待检查</strong>
          <button className="btn" onClick={openAgentHome}>让 Aico 帮我检查 <Ic icon="arrow-right" /></button>
        </div>
      </div>
      <div className="cockpit-map">
        <div style={{ textAlign: "center" }}>
          <span><Ic icon="network" /></span>
          <p>全网资源 · 西三旗 DC</p>
          <button className="btn primary" onClick={openAgentHome}>打开智能体</button>
        </div>
      </div>
    </section>
  );
}
