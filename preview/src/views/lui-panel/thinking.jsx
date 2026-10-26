import { useEffect, useState } from 'react';
import { StreamText, MotionTitle } from './motion.jsx';
import { thoughtCopy } from './thought-copy.js';
import LuiGlyph from './glyph.jsx';
import Ic from '../../components/icon-el/index.jsx';
import './thinking.css';

export function ThinkingDetails({thinking,isDark}){
  const [expanded,setExpanded]=useState(thinking);
  useEffect(()=>setExpanded(thinking),[thinking]);
  return <details className="response-thought uc4-thinking" open={expanded} onToggle={event=>{if(event.currentTarget.open!==expanded)setExpanded(event.currentTarget.open);}}>
    <summary><LuiGlyph name="thought" size={14}/><MotionTitle text={thinking?'正在思考':'已思考'} active={thinking}/><Ic variant={isDark?'filled':'lined'} icon={expanded?'chevron-up':'chevron-down'}/></summary>
    <StreamText as="div" className="uc4-thinking-content" text={thoughtCopy} animate={thinking}/>
  </details>;
}
export function GeneratingCanvas(){
  return <section className="card uc4-generating-card" id="generatingCanvasCard" role="status" aria-label="画布生成中" aria-busy="true">
    <div className="uc4-generating-cloud" aria-hidden="true"/>
    <p className="uc4-generating-label">内容生成中...</p>
  </section>;
}
