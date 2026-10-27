import { useEffect } from "react";
import { useApp } from "../../context.jsx";

export default function Uc2Intent() {
  const { uc2 } = useApp();
  useEffect(() => {
    // Decode both restoration layers while the intent analysis is running.
    for (const name of ["overview.png", "topology.png"]) {
      const image = new Image();
      image.src = "./assets/uploads/pixso-uc2-restoration/" + name;
      image.decode().catch(() => {});
    }
  }, []);
  return <section className="uc2-intent-view" id="uc2Module0" aria-label="意图分析">
    <h2 className="uc2-reference-label">意图分析</h2>
    <div className="uc2-intent-loading" style={{ "--uc2-intent-play-state": uc2.running ? "running" : "paused" }} role="status" aria-live="polite" aria-busy="true">
      <div className="uc2-intent-halo uc2-intent-halo-primary" aria-hidden="true" />
      <div className="uc2-intent-halo uc2-intent-halo-secondary" aria-hidden="true" />
      <div className="uc2-intent-loading-copy">
        <span>正在理解任务意图</span>
        <span>分析对象、范围与执行路径</span>
      </div>
    </div>
  </section>;
}
