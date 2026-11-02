import {useLayoutEffect,useRef,useState} from 'react';
import {BorderBeam} from 'border-beam';
import {observeCssUnits,readCssLength,resolveCssLength} from '../../utils/css-length.js';

// 光效库只接收数字；从实际卡片读取圆角，避免卡片 rem 与流光 px 脱节。
export default function ResponsiveBeam({borderRadius='var(--radius-xl)',radiusSelector,style,...props}){
  const ref=useRef(null);
  const [radius,setRadius]=useState(typeof borderRadius==='number'?borderRadius:12);
  useLayoutEffect(()=>{
    const element=ref.current,parent=element?.parentElement;
    if(!parent)return;
    const source=(radiusSelector&&parent.querySelector(radiusSelector))||parent;
    const sync=()=>{
      const fallback=resolveCssLength(source,borderRadius,12);
      const next=readCssLength(source,'border-top-left-radius',fallback);
      setRadius(previous=>Math.abs(previous-next)<.001?previous:next);
    };
    sync();
    const resize=new ResizeObserver(sync);resize.observe(source);
    const unobserve=observeCssUnits(source,sync);
    return ()=>{resize.disconnect();unobserve();};
  },[borderRadius,radiusSelector]);
  return <BorderBeam {...props} ref={ref} borderRadius={radius} style={style}/>;
}
