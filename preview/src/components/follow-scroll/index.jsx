import {useCallback,useEffect,useRef,useState} from 'react';
import './index.css';

export default function LuiScrollArea({children,scrollRef,enhanced,followKey,focusSignal}){
  const flowRef=useRef(null),trackRef=useRef(null),thumbRef=useRef(null),dragRef=useRef(null),following=useRef(true);
  const [paused,setPaused]=useState(false),[overflowing,setOverflowing]=useState(false);
  const pause=useCallback(()=>{following.current=false;setPaused(true);},[]);
  const sync=useCallback(()=>{
    const main=scrollRef.current,track=trackRef.current,thumb=thumbRef.current;if(!main||!track||!thumb)return;
    const overflow=main.scrollHeight-main.clientHeight;setOverflowing(overflow>1);track.style.display=overflow>1?'block':'none';if(overflow<=1)return;
    const height=Math.min(track.clientHeight,Math.max(32,track.clientHeight*main.clientHeight/main.scrollHeight));
    thumb.style.height=height+'px';thumb.style.transform=`translateY(${(track.clientHeight-height)*main.scrollTop/overflow}px)`;track.setAttribute('aria-valuenow',String(Math.round(main.scrollTop/overflow*100)));
  },[scrollRef]);
  const resume=useCallback(()=>{following.current=true;setPaused(false);const main=scrollRef.current;if(main)main.scrollTop=main.scrollHeight;sync();},[scrollRef,sync]);
  useEffect(()=>{resume();},[followKey,resume]);
  useEffect(()=>{if(focusSignal!=='0:0')pause();},[focusSignal,pause]);
  useEffect(()=>{
    const main=scrollRef.current,flow=flowRef.current;if(!main||!flow)return;
    let frame=0;const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(following.current)main.scrollTop=main.scrollHeight;sync();});};
    const resize=new ResizeObserver(update),mutations=new MutationObserver(update);resize.observe(main);resize.observe(flow);mutations.observe(flow,{childList:true,subtree:true,characterData:true});update();
    return()=>{cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();};
  },[scrollRef,sync]);
  const wheel=event=>{if(event.deltaY<0)pause();};
  const key=event=>{if(['ArrowUp','PageUp','Home'].includes(event.key))pause();};
  const interact=event=>{const button=event.target.closest('button');if(button?.getAttribute('aria-label')?.startsWith('重新生成'))resume();else if(event.target.closest('summary,.step-title,.step-action,.response-title,[data-lui-artifact]'))pause();};
  const onPointerDown=event=>{
    const main=scrollRef.current,track=trackRef.current,thumb=thumbRef.current;if(!main||!track||!thumb)return;
    pause();event.preventDefault();const rect=track.getBoundingClientRect(),scale=rect.height/track.clientHeight,travel=track.clientHeight-thumb.clientHeight,overflow=main.scrollHeight-main.clientHeight;if(travel<=0||overflow<=0)return;
    if(event.target!==thumb){main.scrollTop=Math.max(0,Math.min(travel,(event.clientY-rect.top)/scale-thumb.clientHeight/2))/travel*overflow;sync();}
    dragRef.current={y:event.clientY,scroll:main.scrollTop,ratio:overflow/travel/scale};track.setPointerCapture(event.pointerId);
  };
  const onKeyDown=event=>{const main=scrollRef.current;if(!main)return;key(event);const delta={ArrowDown:40,ArrowUp:-40,PageDown:main.clientHeight*.8,PageUp:-main.clientHeight*.8}[event.key];if(delta!==undefined)main.scrollTop+=delta;else if(event.key==='Home')main.scrollTop=0;else if(event.key==='End'){resume();}else return;event.preventDefault();sync();};
  return <div className="lui-main-shell" data-follow-output={paused?'paused':'following'}>
    <div className="lui-main" id="luiMain" ref={scrollRef} onScroll={sync} onWheelCapture={wheel} onTouchStart={pause} onKeyDownCapture={key} onClickCapture={interact}><div className="lui-flow" ref={flowRef}>{children}</div></div>
    {paused&&overflowing&&<button type="button" className="lui-resume-follow" onClick={resume}>↓ 回到最新内容</button>}
    {enhanced&&<div className="lui-scroll-track" ref={trackRef} role="scrollbar" tabIndex={0} aria-label="LUI 内容滚动条" aria-controls="luiMain" aria-orientation="vertical" aria-valuemin={0} aria-valuemax={100} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={event=>{if(dragRef.current){scrollRef.current.scrollTop=dragRef.current.scroll+(event.clientY-dragRef.current.y)*dragRef.current.ratio;sync();}}} onPointerUp={()=>{dragRef.current=null;}} onPointerCancel={()=>{dragRef.current=null;}} onLostPointerCapture={()=>{dragRef.current=null;}}><div className="lui-scroll-thumb" ref={thumbRef}/></div>}
  </div>;
}
