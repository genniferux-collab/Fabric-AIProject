import { BorderBeam } from "border-beam";

const orangePurpleBeamCss = `
[data-beam="{id}"][data-active]::after,
[data-beam="{id}"][data-fading]::after{
  background:conic-gradient(from var(--beam-angle-{id}),transparent 0%,transparent 48%,rgba(255,142,72,.04) 55%,rgba(255,142,72,.38) 62%,rgba(255,164,86,.9) 67%,rgba(211,116,255,.92) 72%,rgba(150,86,255,.38) 78%,rgba(150,86,255,.04) 84%,transparent 90%,transparent 100%);
}
[data-beam="{id}"][data-active]::before,
[data-beam="{id}"][data-fading]::before{
  background:conic-gradient(from var(--beam-angle-{id}),transparent 0%,transparent 44%,rgba(255,138,70,.05) 53%,rgba(255,151,76,.3) 63%,rgba(221,126,255,.46) 73%,rgba(145,78,255,.14) 82%,transparent 91%,transparent 100%);
}
[data-beam="{id}"] [data-beam-bloom]{
  background:conic-gradient(from var(--beam-angle-{id}),transparent 0%,transparent 52%,rgba(255,143,72,.08) 59%,rgba(255,163,86,.58) 67%,rgba(214,112,255,.72) 73%,rgba(151,83,255,.18) 81%,transparent 89%,transparent 100%);
}
`;

export default function OrangePurpleBeam({className,duration=8.6,borderRadius=12,strength=.72,active=true}){
  return <BorderBeam className={className} size="md" colorVariant="colorful" staticColors duration={duration} strength={strength} brightness={1.08} saturation={1.08} glowSize={1.1} theme="dark" borderRadius={borderRadius} active={active} css={orangePurpleBeamCss} aria-hidden="true"><span className="orange-purple-beam-surface"/></BorderBeam>;
}
