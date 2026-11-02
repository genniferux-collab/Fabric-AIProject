import EChart from '../echart/index.jsx';
import {readCssLength,resolveCssLength} from '../../utils/css-length.js';

// Match flex-grow ratios while freezing minimum-size segments before sharing
// the remaining space. Tiny values never push the chart past its container.
function distribute(width,values,minimums){
  const widths=new Array(values.length).fill(0),minimumTotal=minimums.reduce((sum,value)=>sum+value,0);
  if(minimumTotal>width)return minimums.map(value=>minimumTotal?value*width/minimumTotal:0);
  let remaining=width,active=values.map((value,index)=>value>0?index:-1).filter(index=>index>=0);
  values.forEach((value,index)=>{if(!value){widths[index]=minimums[index];remaining-=widths[index];}});
  while(active.length){
    const total=active.reduce((sum,index)=>sum+values[index],0);
    const frozen=active.filter(index=>remaining*values[index]/total<minimums[index]);
    if(!frozen.length){for(const index of active)widths[index]=remaining*values[index]/total;break;}
    for(const index of frozen){widths[index]=minimums[index];remaining-=widths[index];}
    const fixed=new Set(frozen);active=active.filter(index=>!fixed.has(index));
  }
  return widths;
}

function resolveColors(element,segments){
  const document=element.ownerDocument,probe=document.createElement('span');
  probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;';
  element.appendChild(probe);
  const colors=segments.map(segment=>{
    probe.style.color='';
    probe.style.color=segment.color||'currentColor';
    return document.defaultView.getComputedStyle(probe).color;
  });
  probe.remove();return colors;
}

// CSS's original repeating-linear-gradient(132deg, transparent 0 7px,
// #ffffff1f 7px 10px), clipped independently inside each colored segment.
function stripes(width,height){
  const angle=132*Math.PI/180,nx=Math.sin(angle),ny=-Math.cos(angle),extent=(width+height+20)*2;
  const points=(offset,side)=>[nx*offset-ny*extent*side,ny*offset+nx*extent*side];
  const children=[];
  for(let start=7;start<width*nx+height*ny;start+=10){
    children.push({type:'polygon',name:'stripe-'+children.length,silent:true,shape:{points:[points(start,-1),points(start+3,-1),points(start+3,1),points(start,1)]},style:{fill:'#ffffff1f'}});
  }
  return children;
}

// The parent owns sizing, track background and outer clipping. Optional CSS
// variables --segmented-bar-gap / --segmented-bar-radius preserve small cells.
// A segment may override minWidth when one data category needs a visible sliver.
export default function SegmentedBar({segments,minSegmentWidth='0px',stripe=false,className,ariaLabel}){
  const option=({width,height,element})=>{
    const values=segments.map(segment=>{const value=Number(segment.value);return Number.isFinite(value)?Math.max(0,value):0;});
    const minimums=segments.map(segment=>Math.max(0,resolveCssLength(element,segment.minWidth??minSegmentWidth,0)));
    const visible=values.map((value,index)=>value>0||minimums[index]>0?index:-1).filter(index=>index>=0);
    const gap=Math.min(Math.max(0,readCssLength(element,'--segmented-bar-gap',0)),width/Math.max(1,visible.length-1));
    const radius=Math.max(0,readCssLength(element,'--segmented-bar-radius',0));
    const widths=distribute(Math.max(0,width-gap*Math.max(0,visible.length-1)),values,minimums);
    const colors=resolveColors(element,segments),positions=new Map();
    const animate=stripe&&!element.ownerDocument.defaultView.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let x=0;
    visible.forEach((index,order)=>{positions.set(index,{x,width:widths[index],order});x+=widths[index]+gap;});
    return {animation:animate,animationDuration:0,animationDurationUpdate:700,animationEasingUpdate:'cubic-bezier(0.2,0.75,0.2,1)',tooltip:{show:false},aria:{enabled:false},series:[{
      id:'segmented-bar',type:'custom',coordinateSystem:'none',silent:true,
      data:segments.map((segment,index)=>({id:segment.id,name:segment.id,value:values[index]})),
      renderItem:params=>{
        const index=params.dataIndex,position=positions.get(index);
        if(!position||position.width<=0)return null;
        const shape={x:0,y:0,width:position.width,height,r:Math.min(radius,position.width/2,height/2)};
        const children=[{type:'rect',name:'segment-fill',silent:true,shape,style:{fill:colors[index]},transition:['shape']}];
        if(stripe)children.push({type:'group',name:'segment-stripes',silent:true,$mergeChildren:'byName',clipPath:{type:'rect',shape,transition:['shape']},children:stripes(position.width,height)});
        if(stripe&&position.order>0)children.push({type:'rect',name:'segment-separator',silent:true,shape:{x:0,y:0,width:Math.min(1,position.width),height},style:{fill:'#19191999'},transition:['shape']});
        return {type:'group',name:'segment-'+segments[index].id,silent:true,$mergeChildren:'byName',x:position.x,transition:['x'],children};
      }
    }]};
  };
  return <EChart className={className} option={option} ariaLabel={ariaLabel} exactSize notMerge={false}/>;
}
