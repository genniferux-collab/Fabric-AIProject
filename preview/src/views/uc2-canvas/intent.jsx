import { useEffect } from "react";

export default function Uc2Intent() {
  useEffect(() => {
    // Decode both restoration layers while the intent GIF is playing.
    for (const name of ["overview.png", "topology.png"]) {
      const image = new Image();
      image.src = "./assets/uploads/pixso-uc2-restoration/" + name;
      image.decode().catch(() => {});
    }
  }, []);
  return <section className="uc2-intent-view" id="uc2Module0" aria-label="意图分析">
    <h2 className="uc2-reference-label">意图分析</h2>
    <img className="uc2-intent-dots" src="./assets/uploads/pixso-uc2-restoration/intent-dots.gif" width="1233" height="845" alt="彩色点阵，正在分析黄金基线挖掘任务" />
  </section>;
}
