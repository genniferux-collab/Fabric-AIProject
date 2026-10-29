import {useEffect,useState} from 'react';
import {ThinkingDetails} from '../../views/lui-panel/thinking.jsx';
import {StreamText,RevealAfter} from '../../views/lui-panel/motion.jsx';
import {analysisThoughtDuration,analysisConclusionDuration} from './timing.js';
import './index.css';
import {useApp} from '../../context.jsx';

export default function StepAnalysis({active,thought,conclusion,children,conclusionReady,progressCopy}){
  const {isDark}=useApp();
  const [ready,setReady]=useState(!active);
  useEffect(()=>{
    if(!active||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setReady(true);return;}
    setReady(false);const timer=setTimeout(()=>setReady(true),analysisThoughtDuration(thought));
    return()=>clearTimeout(timer);
  },[active,thought]);
  const showConclusion=conclusionReady===undefined?(!active||ready):conclusionReady;
  return <div className="step-analysis" data-analysis-phase={showConclusion?'conclusion':ready?'executing':'thought'}>
    <ThinkingDetails thinking={active&&!ready} isDark={isDark}><StreamText text={thought} speed={32} granularity="character" animate={active&&!ready}/></ThinkingDetails>
    {showConclusion?<div className="step-analysis-conclusion"><span className="step-analysis-label">分析结论</span><StreamText text={conclusion} speed={32} granularity="character" animate={active}/>{active?<RevealAfter delay={analysisConclusionDuration(conclusion)}>{children}</RevealAfter>:children}</div>:ready&&progressCopy?<p className="step-analysis-progress" role="status">{progressCopy}</p>:null}
  </div>;
}
