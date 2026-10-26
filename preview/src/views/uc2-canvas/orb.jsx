import { useEffect, useRef } from "react";

const points = Array.from({ length: 72 }, (_, index) => {
  const y = 1 - (index / 71) * 2, radius = Math.sqrt(1 - y * y), theta = index * Math.PI * (3 - Math.sqrt(5));
  return { x: Math.cos(theta) * radius * 67, y: y * 67, z: Math.sin(theta) * radius * 67 };
});

export default function MiningOrb({ paused, loading }) {
  const cloudRef = useRef(null), angleRef = useRef(0);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0, previous = 0;
    const tick = now => {
      const delta = previous ? Math.min(50, now - previous) : 0;
      if (!previous || delta >= 28) {
        angleRef.current += delta * (loading ? .00055 : .00018); previous = now;
        const angle = angleRef.current, cos = Math.cos(angle), sin = Math.sin(angle);
        points.forEach((point, index) => {
          const x = point.x * cos + point.z * sin, z = -point.x * sin + point.z * cos, depth = (z + 67) / 134;
          const dot = cloudRef.current?.children[index];
          if (dot) { dot.setAttribute("cx", x.toFixed(2)); dot.setAttribute("cy", point.y.toFixed(2)); dot.setAttribute("r", (.65 + depth * 1.1).toFixed(2)); dot.setAttribute("opacity", (.12 + depth * .7).toFixed(2)); }
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [paused, loading]);
  return <g className={"golden-sphere-loading" + (loading ? " is-loading" : "")} pointerEvents="none" aria-hidden="true">
    <g transform="translate(604 488)"><ellipse className="golden-orb-meridian" rx="27" ry="70" transform="rotate(28)"/><ellipse className="golden-orb-meridian is-purple" rx="31" ry="70" transform="rotate(-38)"/><g className="golden-sphere-cloud" ref={cloudRef}>{points.map((point,index)=><circle key={index} cx={point.x} cy={point.y} r="1" fill={index%4===0?"#b9a9ff":"#94e6ff"} opacity=".5"/>)}</g><g className="golden-latitude-scan"><ellipse rx="68" ry="12"/></g></g>
    <circle className="golden-engine-breath" cx="604" cy="488" r="26"/>
  </g>;
}
