import {useRef} from "react";

const transitionGuard=580;
const atTop=target=>target.scrollTop<=2;

export default function useAttentionAutoCollapse({collapsed,onCollapse,onExpand,scrollRef}){
  const gesture=useRef({wheel:0,scroll:0,previousTop:0,holdUntil:0,autoCollapsed:false,direction:0,inputUntil:0,touchY:null,pointerUntil:0});
  const ready=()=>performance.now()>=gesture.current.holdUntil;
  const noteDirection=delta=>{
    const current=gesture.current,direction=Math.sign(delta);
    if(current.direction!==direction){current.wheel=0;current.scroll=0;}
    current.direction=direction;
    current.inputUntil=performance.now()+650;
  };
  const transition=(nextCollapsed,target)=>{
    Object.assign(gesture.current,{wheel:0,scroll:0,previousTop:target.scrollTop,holdUntil:performance.now()+transitionGuard,autoCollapsed:nextCollapsed,direction:0,inputUntil:0});
    if(nextCollapsed)onCollapse();else onExpand();
  };
  const handleIntent=(target,delta,threshold=48)=>{
    if(!delta||!ready())return;
    noteDirection(delta);
    const current=gesture.current;
    current.wheel+=Math.abs(delta);
    if(collapsed){
      // A larger reading area can fit every card: upward intent still works without a scrollbar.
      if(current.autoCollapsed&&delta<0&&atTop(target)&&current.wheel>=threshold)transition(false,target);
    }else if(delta>0&&target.scrollHeight>target.clientHeight+1&&current.wheel>=threshold)transition(true,target);
  };
  const onWheel=event=>{
    if(event.ctrlKey)return;
    const target=scrollRef?.current||event.currentTarget;
    if(event.deltaY<0&&event.currentTarget!==target&&event.currentTarget.scrollTop>2)return;
    const insideList=target===event.currentTarget||target.contains(event.target);
    if(event.deltaY>0&&!insideList)return;
    const unit=event.deltaMode===1?16:event.deltaMode===2?target.clientHeight:1;
    const delta=event.deltaY*unit;
    handleIntent(target,delta,delta<0?24:48);
    // The whole left content region accepts upward input; keep the list's real scroll position.
    if(delta<0&&!insideList&&target.scrollTop>0)target.scrollBy({top:delta,behavior:"auto"});
  };
  const onScroll=event=>{
    const target=event.currentTarget,current=gesture.current,top=target.scrollTop,delta=top-current.previousTop;
    current.previousTop=top;
    if(!ready())return;
    const hasUpIntent=(current.direction<0&&performance.now()<current.inputUntil)||performance.now()<current.pointerUntil;
    if(collapsed){
      // Never interpret scrollTop clamping during the layout transition as a user scrolling up.
      if(current.autoCollapsed&&delta<0&&atTop(target)&&hasUpIntent)transition(false,target);
    }else{
      // Focusing a task may scroll it into view; only a real downward gesture folds metrics.
      const hasDownIntent=(current.direction>0&&performance.now()<current.inputUntil)||performance.now()<current.pointerUntil;
      if(!hasDownIntent)return;
      current.scroll=delta>0?current.scroll+delta:0;
      if(current.scroll>=32&&target.scrollHeight>target.clientHeight+1)transition(true,target);
    }
  };
  const onKeyDown=event=>{
    if(event.target!==event.currentTarget)return;
    const direction=["ArrowUp","PageUp","Home"].includes(event.key)?-1:["ArrowDown","PageDown","End"].includes(event.key)?1:0;
    if(direction)handleIntent(event.currentTarget,direction*48);
  };
  const onTouchStart=event=>{gesture.current.touchY=event.touches[0]?.clientY??null;};
  const onTouchMove=event=>{
    const y=event.touches[0]?.clientY,current=gesture.current;
    if(y==null||current.touchY==null)return;
    const delta=current.touchY-y;
    current.touchY=y;
    handleIntent(event.currentTarget,delta);
  };
  const onPointerDown=()=>{gesture.current.pointerUntil=performance.now()+1800;};
  const protectManualToggle=(scrollTop=0)=>{
    Object.assign(gesture.current,{wheel:0,scroll:0,previousTop:scrollTop,holdUntil:performance.now()+900,autoCollapsed:false,direction:0,inputUntil:0});
  };
  return {onWheel,onScroll,onKeyDown,onTouchStart,onTouchMove,onPointerDown,protectManualToggle};
}
