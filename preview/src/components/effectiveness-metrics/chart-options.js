import {workflowLegend,trendBadge,trendSeries,trendAreas} from "./chart-data.js";

const quiet={animation:false,tooltip:{show:false},aria:{enabled:false}};
const color=(element,token,fallback)=>getComputedStyle(element).getPropertyValue(token).trim()||fallback;
const rgba=(value,alpha)=>{
  const hex=value.match(/^#([\da-f]{6})$/i);
  const channels=hex?hex[1].match(/../g).map(v=>parseInt(v,16)):value.match(/[\d.]+/g)?.slice(0,3);
  return channels?`rgba(${channels.join(',')},${alpha})`:value;
};
const vector=(entry,sx,sy)=>({type:'path',silent:true,scaleX:sx,scaleY:sy,shape:{pathData:entry.path},style:{fill:entry.fill||null,stroke:entry.stroke||null,lineWidth:entry.lineWidth||0,lineCap:entry.lineCap||'butt',lineJoin:entry.lineJoin||'miter'}});

export function workflowOption({width,height,element}){
  const sx=width/142.65,sy=height/52,scale=Math.min(sx,sy);
  const blue=color(element,'--blue-50','#2070f3'),green=color(element,'--mint-40','#36c18d');
  // 保留原稿 SVG 的两段角度和描边，不在渲染器迁移时修改演示数据口径。
  const share=.5128198542350485;
  return {...quiet,series:[{id:'home-workflow-legend',type:'custom',coordinateSystem:'none',silent:true,data:[1],z:3,renderItem:()=>({type:'group',children:workflowLegend.map(entry=>vector(entry,sx,sy))})},{
    id:'home-workflow-distribution',type:'pie',silent:true,animation:false,
    center:[24.6505*sx,26*sy],radius:[17.50376*scale,24*scale],startAngle:90,clockwise:true,
    selectedMode:false,legendHoverLink:false,avoidLabelOverlap:false,
    label:{show:false},labelLine:{show:false},emphasis:{disabled:true},
    itemStyle:{borderColor:'#2e2d2f',borderWidth:1.246753*scale,borderJoin:'round'},
    data:[{name:'AI辅助生成',value:share,itemStyle:{color:blue}},{name:'人工',value:1-share,itemStyle:{color:green}}]
  }]};
}

export function complianceTrendOption({width,height,element}){
  const sx=width/101,sy=height/69.7837,scale=Math.min(sx,sy);
  const blue=color(element,'--blue-50','#2070f3'),green=color(element,'--mint-40','#36c18d'),areaBlue=color(element,'--brand-40','#2e86de');
  const gradient=(fill,top,bottom,a,b)=>({type:'linear',x:0,x2:0,y:top*sy,y2:bottom*sy,global:true,colorStops:[{offset:0,color:rgba(fill,a)},{offset:1,color:rgba(fill,b)}]});
  const filledAreas=trendAreas.map((area,index)=>({type:'polygon',silent:true,shape:{points:area.points.map(([x,y])=>[x*sx,y*sy])},style:{fill:index===0?gradient(green,25,44.2832031,.25,0):gradient(areaBlue,42.7836914,index===1?55.7836914:54.2836914,0,index===1?.4:.35)}}));
  const greenLine={
    id:'home-compliance-green',type:'line',data:trendSeries[0],silent:true,
    showSymbol:false,symbol:'none',smooth:false,clip:false,connectNulls:false,
    lineStyle:{color:green,width:2*scale,cap:'butt',join:'miter'},
    emphasis:{disabled:true},z:2
  };
  return {...quiet,grid:{left:0,right:0,top:0,bottom:0,containLabel:false},
    xAxis:{type:'value',min:0,max:101,show:false,boundaryGap:false},
    yAxis:{type:'value',min:0,max:69.7837,inverse:true,show:false,boundaryGap:false},
    graphic:[
      {type:'line',silent:true,z:3,shape:{x1:1.08997*sx,y1:42.8394*sy,x2:100.111*sx,y2:42.8404*sy},style:{stroke:'rgba(243,243,243,.3)',lineWidth:scale,lineDash:[2*scale,2*scale]}}
    ],series:[
      {id:'home-compliance-badge',type:'custom',coordinateSystem:'none',silent:true,data:[1],z:8,renderItem:()=>({type:'group',children:trendBadge.map(entry=>vector(entry,sx,sy))})},
      {id:'home-compliance-area',type:'custom',coordinateSystem:'none',silent:true,data:[1],z:1,renderItem:()=>filledAreas[0]},
      greenLine,
      // 原稿蓝线和两块蓝色渐变共用参考线以下的硬裁切，不能盖住上部绿线。
      {id:'home-compliance-below-reference',type:'custom',coordinateSystem:'none',silent:true,data:trendSeries[1],z:4,renderItem:params=>params.dataIndex===0?({type:'group',clipPath:{type:'rect',shape:{x:.54126*sx,y:42.7836914*sy,width:100.458717*sx,height:27*sy}},children:[...filledAreas.slice(1),{type:'polyline',silent:true,shape:{points:trendSeries[1].map(([x,y])=>[x*sx,y*sy])},style:{fill:null,stroke:blue,lineWidth:2*scale,lineCap:'butt',lineJoin:'miter'}}]}):null}
    ]
  };
}
