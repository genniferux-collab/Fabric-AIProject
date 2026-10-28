import { useEffect } from "react";
import { useApp } from "../../context.jsx";
import {GeneratingCanvas} from "../lui-panel/thinking.jsx";

export default function Uc2Intent() {
  const { uc2 } = useApp();
  useEffect(() => {
    // Decode the three source-vector states before restoration begins.
    for (const name of ["topology-scan.svg", "topology-area.svg", "topology-devices.svg"]) {
      const image = new Image();
      image.src = "./assets/uploads/pixso-uc2-v2/" + name;
      image.decode().catch(() => {});
    }
  }, []);
  return <section className="uc2-intent-view" id="uc2Module0" aria-label="意图分析">
    <h2 className="uc2-reference-label">意图分析</h2>
    <GeneratingCanvas id="uc2IntentLoading" paused={!uc2.running} className="uc2-intent-generating"/>
  </section>;
}
