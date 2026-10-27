import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const SPEED = 48;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const textUnits = text => typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('zh-CN', {granularity:'word'}).segment(text)].map(x=>x.segment) : Array.from(text);
export const streamDuration = (text, speed = SPEED) => Math.ceil(textUnits(text).length / speed * 1000);

// Keep each mounted message's progress independent of expand/collapse state.
export function StreamText({text, as:Tag='span', delay=0, animate=true, leading='', className='', speed=SPEED}) {
  const units=useMemo(()=>textUnits(text),[text]);
  const [shown,setShown]=useState(()=>animate && !reducedMotion() ? -1 : units.length);
  useEffect(()=>{
    if(!animate || reducedMotion()){setShown(units.length);return;}
    let frame=0,started=null,last=-1;
    setShown(-1);
    const tick=now=>{started ??= now;const elapsed=now-started-delay;if(elapsed>=0){const count=Math.min(units.length,Math.floor(elapsed/1000*speed));if(count!==last){setShown(count);last=count;}if(count>=units.length)return;}frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[text,delay,animate,units,speed]);
  if(shown<0)return null;
  const typing=shown<units.length;
  return <Tag className={'lui-stream-text '+className} aria-busy={typing}>{leading && <strong>{leading}</strong>}<span className="lui-stream-body">{units.slice(0,shown).map((word,index)=><span key={index} className={animate?'lui-stream-unit':undefined}>{word}</span>)}{typing&&<span className="lui-stream-caret" aria-hidden="true"/>}</span></Tag>;
}

export function RevealAfter({delay,children}){
  const [ready,setReady]=useState(()=>reducedMotion() || delay<=0);
  useEffect(()=>{if(reducedMotion() || delay<=0){setReady(true);return;}const timer=setTimeout(()=>setReady(true),delay);return()=>clearTimeout(timer);},[delay]);
  return ready?children:null;
}
export function MotionTitle({text,active}){
  return <span key={text} className={'lui-motion-title'+(active?' is-streaming':'')} data-text={text}>{text}</span>;
}
export function SoftHeight({children}){
  const outer=useRef(null),inner=useRef(null);
  useLayoutEffect(()=>{const update=()=>{if(outer.current&&inner.current)outer.current.style.height=inner.current.offsetHeight+'px';};update();const observer=new ResizeObserver(update);observer.observe(inner.current);return()=>observer.disconnect();},[]);
  return <div className="lui-motion-height" ref={outer}><div className="lui-motion-inner" ref={inner}>{children}</div></div>;
}
