import { useEffect, useRef } from "react";
import { useApp } from "../../context.jsx";
import { v7WorkflowSteps, v7WorkflowRunning, recs } from "../../mock/workflow.js";
import { ArtifactTag } from "../../components/status-marks/index.jsx";
import { SummaryCopy } from "../report-card/index.jsx";
import { affectedBy } from "../../mock/audit.js";
import Uc2Chat from "./uc2-chat.jsx";
import Ic from "../../components/icon-el/index.jsx";

// 四阶段执行步骤（active = 当前进行到第几步，0 基）
function WorkflowSteps({ active }) {
  const { locate } = useApp();
  return (
    <div className="steps">
      {v7WorkflowSteps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        const body = done ? step.description : current ? v7WorkflowRunning[index] : "";
        return (
          <div key={step.title} className={"step " + (done ? "" : current ? "is-running" : "pending")}>
            <span className={"status " + (done ? "done" : current ? "running" : "")} aria-label={done ? "已完成" : current ? "进行中" : "待执行"}>
              {done ? "✓" : current ? <i className="v7-step-spinner" /> : index + 1}
            </span>
            <div className="step-title">{step.title}</div>
            {body ? (
              <div className="step-content">
                {body}
                {index === 0 && (done || current) ? (
                  <div className="v7-step-artifact">
                    <ArtifactTag title="全网设备概览" type="process" shape="overview" onLocate={() => locate("network")} />
                  </div>
                ) : null}
                {index === 2 && done ? (
                  <div className="v7-step-artifact">
                    <ArtifactTag title="HCS1合规检查规则&设备匹配" type="process" shape="mapping" onLocate={() => locate("artifact")} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// 完成态汇报（最终文案口径）
function Completion({ prompt, onLocateReport }) {
  return (
    <>
      <div className="task-label"><span className="dot" style={{ background: "var(--good)" }} />配置合规检查 <span style={{ marginLeft: "auto" }}>任务已完成</span></div>
      <div className="user-msg">{prompt}</div>
      <div className="agent-caption">
        <span className="aico-icon"><Ic icon="sparkles" /></span>Aico
      </div>
      <details className="task-process" open>
        <summary><Ic icon="check" />已完成基线检查 · 4个步骤</summary>
        <WorkflowSteps active={4} />
      </details>
      <section className="completion audit-completion">
        <h2>已完成 HCS1 区的全量基线检查</h2>
        <p><SummaryCopy/></p>
        <h3>处理建议</h3>
        <ul className="audit-advice">
          <li><strong>登录安全：</strong>{affectedBy("timeout").length}台设备存在空闲超时超限，3台设备使用不符合基线的 SSH 算法，建议核验后调整。</li>
          <li><strong>规划一致性：</strong>2台管理 IP、2台 NTP 时钟源与规划不一致，建议核对变更审批，再恢复配置或更新台账。</li>
          <li><strong>网络访问范围：</strong>1台设备额外放通未规划 VLAN，建议核验业务依赖后收敛放通范围。</li>
        </ul>
        <div className="small muted">以上为建议，尚未执行；具体配置与修复命令按设备、规则分别查看。</div>
        <div className="v7-step-artifact">
          <ArtifactTag title="HCS1 区基线检查报告" type="conclusion" shape="report" onLocate={onLocateReport} />
        </div>
      </section>
    </>
  );
}

export default function LuiPanel() {
  const app = useApp();
  const { luiOpen, luiView, taskPrompt, runningIndex, promptText, setPromptText, submitPrompt, chooseUC, openAgentHome, goCockpit, toast, locate, uc2Extra } = app;
  const mainRef = useRef(null);

  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [luiView]);
  // UC2 挖掘中追加对话 → 滚到底部
  useEffect(() => {
    if (uc2Extra.length && mainRef.current) mainRef.current.scrollTop = mainRef.current.scrollHeight;
  }, [uc2Extra.length]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submitPrompt(promptText);
    }
  };

  return (
    <aside className={"lui" + (luiOpen ? "" : " closed")} id="lui">
      <div className="lui-head between">
        <div className="row">
          <span className="aico-icon"><Ic icon="sparkles" /></span>
          <span className="lui-name">Aico</span>
          <span className="small muted">网络运维智能体</span>
        </div>
        <div className="row">
          <button className="icon-btn" title="新对话" aria-label="新对话" onClick={openAgentHome}><Ic icon="plus" /></button>
          <button className="icon-btn" title="关闭面板" aria-label="关闭LUI面板" onClick={goCockpit}><Ic icon="x" /></button>
        </div>
      </div>
      <div className="lui-main" id="luiMain" ref={mainRef}>
        {luiView === "home" ? (
          <div className="landing">
            <div className="aico-icon hero-icon"><Ic icon="sparkles" /></div>
            <h2>你好，我是 Aico</h2>
            <div className="secondary">从配置洞察到基线检查，<br />我可以协助你完成网络运维任务。</div>
            <div className="recommendations">
              {recs.map((r, i) => (
                <button key={i} className="rec" onClick={() => chooseUC(i)}>
                  <span className="rec-title">{r[0]}</span>
                  <span className="rec-sub">{r[1]}</span>
                </button>
              ))}
            </div>
            <span className="small muted" style={{ marginTop: "20px" }}>试试描述设备、区域或需要检查的配置</span>
          </div>
        ) : luiView === "running" ? (
          <>
            <div className="task-label"><span className="dot" />配置合规检查 <span style={{ marginLeft: "auto" }}>执行步骤 {runningIndex + 1} / 4</span></div>
            <div className="user-msg">{taskPrompt}</div>
            <div className="agent-caption">
              <span className="aico-icon"><Ic icon="sparkles" /></span>Aico
            </div>
            <div className="v7-running-process"><WorkflowSteps active={runningIndex} /></div>
          </>
        ) : luiView === "uc2" ? (
          <>
            <Uc2Chat />
            {uc2Extra.map((m, i) => (
              <div key={i} className={m.user !== undefined ? "user-msg" : "secondary small"} style={m.user !== undefined ? undefined : { margin: "12px 0" }}>
                {m.user !== undefined ? m.user : m.reply}
              </div>
            ))}
          </>
        ) : (
          <Completion prompt={taskPrompt} onLocateReport={() => locate("report")} />
        )}
      </div>
      <div className="composer-wrap">
        <form className="composer" id="promptForm" onSubmit={(e) => { e.preventDefault(); submitPrompt(promptText); }}>
          <textarea id="prompt" aria-label="向 Aico 发送问题" placeholder="向 Aico 提问，或描述你的运维任务…" value={promptText} onChange={(e) => setPromptText(e.target.value)} onKeyDown={onKeyDown} />
          <div className="composer-bottom">
            <div className="row">
              <button type="button" className="icon-btn" title="添加上下文" aria-label="添加上下文" onClick={() => toast("当前任务上下文：西三旗 DC / HCS1 区")}>
                <Ic icon="plus" />
              </button>
              <span className="small muted">西三旗 DC</span>
            </div>
            <button type="submit" className="send" aria-label="发送问题"><Ic icon="arrow-up" /></button>
          </div>
        </form>
        <div className="composer-hint">AI 生成内容仅供参考，请结合实际网络情况核验</div>
      </div>
    </aside>
  );
}
