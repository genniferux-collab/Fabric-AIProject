import { useApp } from "../../context.jsx";
import { uc2Prompt, uc2Names } from "../../mock/uc2.js";
import Ic from "../../components/icon-el/index.jsx";

// UC2 黄金基线挖掘 — LUI 对话视图
export default function Uc2Chat() {
  const { uc2, uc2Pause, uc2Next, uc2Start, uc2Show } = useApp();
  const done = uc2.max === 3;
  const stepCopy = {
    1: <>已找到西三旗 DC 下 <strong>32 个区域、1,980 台</strong>满足条件的交换机。拓扑按区域和角色还原，设备范围已确认。</>,
    2: <>基于角色与配置特征聚类，本轮接入分析 <strong>100 台设备</strong>。核心角色定位代表设备 <strong>CoreSwitch-01、CoreSwitch-02</strong>，提取全网共性与分角色候选规则。</>,
    3: <>已生成 <strong>18 条候选规则</strong>，其中 12 条高置信、6 条待验证；100 台分析样本中有 <strong>9 台</strong>存在候选规则偏离，仍需审阅确认。</>,
  };

  return (
    <>
      <div className="task-label">
        <span className="dot" style={{ background: done ? "var(--success)" : "var(--blue)" }} />
        黄金基线自动挖掘
        <span style={{ marginLeft: "auto" }}>{done ? "任务已完成" : uc2.running ? "正在执行" : "已暂停"}</span>
      </div>
      <div className="user-msg">{uc2Prompt}</div>
      <div className="agent-caption">
        <span className="aico-icon"><Ic icon="sparkles" /></span>Aico
        <span className={"ai-chat-dots" + (uc2.running ? " active" : "")} aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </div>
      <details className="thought" open={uc2.stage === 0}>
        <summary>已理解挖掘意图 · 西三旗 DC</summary>
        <p>开始自动挖掘西三旗 DC 的黄金基线。先定位满足条件的交换机，再按设备角色与配置特征聚类，提取共性并形成候选规则，最后生成报告供审阅与检查。</p>
        <ol className="uc2-planlist">
          <li>设备还原：定位西三旗 DC 下满足条件的交换机。</li>
          <li>黄金基线挖掘：聚类并选择代表设备，提取、对比配置。</li>
          <li>生成报告：汇总候选规则与偏离项，供客户审阅。</li>
        </ol>
      </details>
      <div className="uc2-run-controls">
        {!done ? (
          <>
            <button className="btn" onClick={uc2Pause}>{uc2.running ? "暂停演示" : "继续执行"}</button>
            <button className="btn" onClick={uc2Next}>下一步 →</button>
          </>
        ) : (
          <button className="btn" onClick={uc2Start}>重新演示</button>
        )}
      </div>
      <div style={{ margin: "20px 10px" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={"uc2-taskstep " + (uc2.max >= i ? "done" : "") + " " + (uc2.stage === i ? "active" : "")} data-n={i}>
            <button style={{ padding: 0, textAlign: "left" }} onClick={() => uc2Show(i)} disabled={uc2.max < i}>{uc2Names[i]}</button>
            {uc2.max >= i ? (
              <>
                <p>{stepCopy[i]}</p>
                <button className="artifact" onClick={() => uc2Show(i)}>
                  <span className="doc-icon"><Ic icon="file-text" /></span>
                  <span>
                    <span className="artifact-name">{i === 1 ? "西三旗 DC 网络拓扑" : i === 2 ? "黄金基线挖掘架构" : "黄金基线候选报告"}</span><br />
                    <span className="small muted">{i === 1 ? "32 个区域 · 1,980 台交换机" : i === 2 ? "角色聚类 · 代表设备 · 配置共性" : "18 条候选规则 · 9 台偏离设备"}</span>
                  </span>
                  <Ic icon="chevron-right" />
                </button>
              </>
            ) : null}
          </div>
        ))}
      </div>
      {done ? (
        <section className="uc2-bubble-summary">
          <h2>黄金基线候选报告已生成</h2>
          <p>发现的共性可用于建立候选基线。请重点审阅低样本支持项，以及 VLAN 范围、接口描述等与角色或规划相关的变量。</p>
          <p>候选规则尚未发布，也未向设备下发任何变更。</p>
        </section>
      ) : null}
    </>
  );
}
