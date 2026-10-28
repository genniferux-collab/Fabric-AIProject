import { useEffect, useRef, useState } from "react";

// Pixso 02: a 64 px white-to-transparent light, 6 px wide, following the actual curve.
// Closely spaced samples keep that gradient aligned with the path at every bend.
export default function FlowLight({ path, phase = .64 }) {
  const probe = useRef(null);
  const [geometry, setGeometry] = useState({ length: 240, points: [] });
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = 25, spacing = 64 / (count - 1);

  useEffect(() => {
    const line = probe.current;
    if (!line) return;
    const length = line.getTotalLength();
    const points = Array.from({ length: count }, (_, index) => {
      const distance = (length * phase - index * spacing + length) % length;
      const point = line.getPointAtLength(distance);
      return { x: point.x, y: point.y };
    });
    setGeometry({ length, points });
  }, [path, phase]);

  const duration = Math.max(1.8, geometry.length / 96);
  const speed = geometry.length / duration;
  return <g className="golden-flow-light" aria-hidden="true" data-flow-duration={duration.toFixed(3)} data-flow-length={geometry.length.toFixed(2)}>
    <path ref={probe} d={path} fill="none" stroke="none"/>
    {Array.from({ length: count }, (_, index) => {
      const point = geometry.points[index];
      return <circle key={index} className="golden-flow-light-sample" r="3" fill="#fff" opacity={1 - index / (count - 1)}
        cx={reduced ? point?.x || 0 : 0} cy={reduced ? point?.y || 0 : 0}>
        {!reduced && <animateMotion path={path} calcMode="paced" dur={`${duration}s`} begin={`${-phase * duration + index * spacing / speed}s`} repeatCount="indefinite"/>}
      </circle>;
    })}
  </g>;
}
