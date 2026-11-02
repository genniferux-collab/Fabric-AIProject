// Original Pixso artwork. Group exports are cropped to their icon bounds in SVG.
const inputOffsets = { attachment:0, microphone:36, send:72, "send-active":72 };
const toolOffsets = { regenerate:256, copy:296, like:336, dislike:376, more:416 };
export default function LuiGlyph({ name, size = "0.875rem", className = "" }) {
  const cls = "lui-glyph " + className;
  // CSS controls the displayed size; the SVG sprite keeps its native crop coordinates.
  const dimensions = {width:size,height:size};
  if (name in inputOffsets) return <svg className={cls} style={dimensions} viewBox={`${inputOffsets[name]} 0 32 32`} aria-hidden="true"><image href={`./assets/uploads/${name === "send-active" ? "lui-input-active.svg" : "lui-input-actions.svg"}`} width="104" height="32" /></svg>;
  if (name in toolOffsets) return <svg className={cls} style={dimensions} viewBox={`${toolOffsets[name]} 0 20 20`} aria-hidden="true"><image href="./assets/uploads/lui-response-tools.svg" width="452" height="20" /></svg>;
  if (name === "info") return <svg className={cls} style={dimensions} viewBox="298 4 12 12" aria-hidden="true"><image href="./assets/uploads/lui-disclaimer.svg" width="316" height="20" /></svg>;
  return <img className={cls} src={`./assets/uploads/lui-${name}.svg`} style={dimensions} alt="" aria-hidden="true" />;
}
