// Original Pixso artwork. Group exports are cropped to their icon bounds in SVG.
const inputOffsets = { attachment:0, microphone:36, send:72, "send-active":72 };
const toolOffsets = { regenerate:256, copy:296, like:336, dislike:376, more:416 };
export default function LuiGlyph({ name, size = 14, className = "" }) {
  const cls = "lui-glyph " + className;
  if (name in inputOffsets) return <svg className={cls} width={size} height={size} viewBox={`${inputOffsets[name]} 0 32 32`} aria-hidden="true"><image href={`./assets/uploads/${name === "send-active" ? "lui-input-active.svg" : "lui-input-actions.svg"}`} width="104" height="32" /></svg>;
  if (name in toolOffsets) return <svg className={cls} width={size} height={size} viewBox={`${toolOffsets[name]} 0 20 20`} aria-hidden="true"><image href="./assets/uploads/lui-response-tools.svg" width="452" height="20" /></svg>;
  if (name === "info") return <svg className={cls} width={size} height={size} viewBox="298 4 12 12" aria-hidden="true"><image href="./assets/uploads/lui-disclaimer.svg" width="316" height="20" /></svg>;
  return <img className={cls} src={`./assets/uploads/lui-${name}.svg`} width={size} height={size} alt="" aria-hidden="true" />;
}
