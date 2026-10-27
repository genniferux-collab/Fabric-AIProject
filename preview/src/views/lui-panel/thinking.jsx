import {InlineLoader} from 'generative-loaders';
import 'generative-loaders/styles.css';
import { useEffect, useState } from 'react';
import { StreamText, MotionTitle } from './motion.jsx';
import { thoughtCopy } from './thought-copy.js';
import LuiGlyph from './glyph.jsx';
import Ic from '../../components/icon-el/index.jsx';
import './thinking.css';

export function ThinkingDetails({thinking,isDark,children}){
  const [expanded,setExpanded]=useState(thinking);
  useEffect(()=>setExpanded(thinking),[thinking]);
  return <details className="response-thought uc4-thinking" open={expanded} onToggle={event=>{if(event.currentTarget.open!==expanded)setExpanded(event.currentTarget.open);}}>
    <summary><LuiGlyph name="thought" size={14}/><MotionTitle text={thinking?'正在思考':'已思考'} active={thinking}/><Ic variant={isDark?'filled':'lined'} icon={expanded?'chevron-up':'chevron-down'}/></summary>
    {children ? <div className="uc4-thinking-content">{children}</div> : <StreamText as="div" className="uc4-thinking-content" text={thoughtCopy} animate={thinking}/>}
  </details>;
}
export function GeneratingCanvas(){
  return <section className="card uc4-generating-card" id="generatingCanvasCard" role="status" aria-label="画布生成中" aria-busy="true">
    <div className="uc4-generating-cloud" aria-hidden="true"><span className="uc4-generating-orb orb-rose"/><span className="uc4-generating-orb orb-violet"/><span className="uc4-generating-orb orb-blue"/></div>
    <p className="uc4-generating-label"><InlineLoader variant="spark" size={32} color="#DFDFDF" className="uc4-generating-spark"/><span>内容生成中...</span></p>
  </section>;
}
