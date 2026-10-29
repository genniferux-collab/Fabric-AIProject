import {useId} from 'react';

// Shared by UC2 and UC4: one straight sweep with a soft multicolour dot-grid tail.
export default function RegionSweep({progress=0,x=73,y=154,width=1083,height=698}){
  const id='region-sweep-'+useId().replace(/:/g,'');
  const offset=y-80+Math.max(0,Math.min(1,progress))*(height-60);
  return <g className="network-region-intelligence-pulses network-region-smart-sweep" data-scan-effect="shared-region-sweep" aria-hidden="true" transform={'translate(0 '+offset+')'}>
    <defs>
      <linearGradient id={id+'-palette'} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#288cff"/><stop offset=".3" stopColor="#9169f5"/><stop offset=".6" stopColor="#b428f0"/><stop offset=".86" stopColor="#ee4b73"/><stop offset="1" stopColor="#f4a05b"/></linearGradient>
      <linearGradient id={id+'-fade'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="white" stopOpacity="0"/><stop offset=".45" stopColor="white" stopOpacity=".18"/><stop offset=".9" stopColor="white" stopOpacity=".7"/><stop offset="1" stopColor="white"/></linearGradient>
      <pattern id={id+'-grid'} patternUnits="userSpaceOnUse" width="10" height="10"><rect x="4" y="4" width="2" height="2" rx=".3" fill="white"/></pattern>
      <mask id={id+'-tail'} maskUnits="userSpaceOnUse" x={x} y="0" width={width} height="82"><rect x={x} y="0" width={width} height="82" fill={'url(#'+id+'-fade)'}/></mask>
      <mask id={id+'-dots'} maskUnits="userSpaceOnUse" x={x} y="0" width={width} height="82"><rect x={x} y="0" width={width} height="82" fill={'url(#'+id+'-grid)'}/></mask>
    </defs>
    <g mask={'url(#'+id+'-tail)'}><rect x={x} y="0" width={width} height="82" fill={'url(#'+id+'-palette)'} opacity=".18"/><g mask={'url(#'+id+'-dots)'}><rect x={x} y="0" width={width} height="80" fill={'url(#'+id+'-palette)'} opacity=".62"/></g></g>
    <rect x={x} y="80.8" width={width} height="1.2" fill={'url(#'+id+'-palette)'} opacity=".42"/>
  </g>;
}
