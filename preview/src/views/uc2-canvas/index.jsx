import { useEffect, useRef } from "react";
import { Icon } from "../../../assets/shared/icon.jsx";
import { useApp } from "../../context.jsx";
import Uc2Topology from "./topology.jsx";
import Uc2Intent from "./intent.jsx";
import "./restoration.css";
import Uc2Mining from "./mining.jsx";
import { Uc2Report, Uc2RuleDetail } from "./report.jsx";

// UC2 画布：三级瀑布模块（设备还原 → 黄金基线挖掘 → 生成报告）
export default function Uc2Pane() {
  const { uc2, uc2Scroll } = useApp();
  const renderedMaxRef = useRef(0);

  // 新模块出现 → 平滑定位
  useEffect(() => {
    if (uc2.max > 1 && uc2.max > renderedMaxRef.current) {
      requestAnimationFrame(() => document.getElementById("uc2Module" + uc2.max)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    renderedMaxRef.current = uc2.max;
  }, [uc2.max]);

  // 定位信号（步骤跳转 / 打开规则 / 抽屉滚动）
  useEffect(() => {
    if (!uc2Scroll) return;
    requestAnimationFrame(() => document.getElementById("uc2Module" + uc2Scroll.module)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [uc2Scroll]);

  if (!uc2.active) return null;
  if (uc2.max === 0 || uc2.view === "intent") return <section id="uc2Pane" aria-label="黄金基线挖掘画布"><Uc2Intent /></section>;

  const headings = { 1: "设备还原", 2: "黄金基线挖掘", 3: "生成报告 · 黄金基线候选结果" };
  const modules = [];
  for (let i = 1; i <= uc2.max; i++) {
    const content = i === 1 ? <Uc2Topology /> : i === 2 ? <Uc2Mining /> : uc2.view === "rule" ? <Uc2RuleDetail /> : <Uc2Report />;
    modules.push(
      <section key={i} className="uc2-waterfall-module" id={"uc2Module" + i} aria-label={headings[i]}>
        <h2 className="uc2-module-name">
          <Icon name={i === 1 ? "network" : i === 2 ? "sparkles" : "file-text"} className="ic" strokeWidth={1.6} />
          {headings[i]}
        </h2>
        <div className={(i === 1 ? "uc2-restoration-host" : "card") + (i === 3 ? " artifact-card uc2-report-card" : "")} {...(i === 3 ? { id: "uc2StageContent" } : {})}>{content}</div>
      </section>
    );
  }

  return (
    <section id="uc2Pane" aria-label="黄金基线挖掘画布">
      {modules}
    </section>
  );
}
