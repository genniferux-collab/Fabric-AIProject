const order=[0,2,1];
const radians=degrees=>degrees*Math.PI/180;
const brighten=color=>`rgb(${color.slice(1).match(/../g).map(channel=>Math.min(255,parseInt(channel,16)*1.08)).join(',')})`;

// Sector 会把所有圆角限制为半环宽；单独绘制内侧相切圆弧以保留实际 rem 圆角。
function innerRoundedBandPath(cx,cy,r0,r,start,end,requestedRadius){
  const halfAngle=Math.min((end-start)/2,Math.PI/2),sine=Math.sin(halfAngle);
  const radius=Math.min(Math.max(0,requestedRadius),(r*r-r0*r0)/(2*r0),r0*sine/Math.max(1-sine,1e-9));
  const delta=Math.asin(radius/(r0+radius)),tangent=Math.sqrt(r0*r0+2*r0*radius);
  const point=(distance,angle)=>[cx+distance*Math.cos(angle),cy+distance*Math.sin(angle)].join(' ');
  return [
    'M',point(r,start),'A',r,r,0,end-start>Math.PI?1:0,1,point(r,end),
    'L',point(tangent,end),'A',radius,radius,0,0,1,point(r0,end-delta),
    'A',r0,r0,0,end-start-2*delta>Math.PI?1:0,0,point(r0,start+delta),
    'A',radius,radius,0,0,1,point(tangent,start),'Z'
  ].join(' ');
}

// Keep the source SVG's 160-unit geometry. A conventional pie would change
// the two independent radii, rounded gaps and inset translucent bands.
export function createRoleDonutOption({width,height},{counts,colors,selectedIndex=-1,highlightedIndex=-1,brightenedIndex=-1,focusedIndex=-1,bandCornerRadius=8,reducedMotion=false}){
  const total=counts.reduce((sum,count)=>sum+count,0),scale=Math.min(width,height)/160;
  let offset=0;
  const data=order.map(index=>{
    const share=total?counts[index]/total*100:0,start=offset;
    offset+=share;
    return {id:`role-${index}`,value:[index,counts[index],start,share]};
  }).filter(item=>item.value[3]>0);
  return {
    animation:!reducedMotion,animationDuration:0,animationDurationUpdate:180,
    animationEasingUpdate:'cubic-bezier(0.25,0.1,0.25,1)',
    tooltip:{show:false},aria:{enabled:false},
    series:[{
      id:'uc2-role-distribution',type:'custom',coordinateSystem:'none',silent:true,data,
      renderItem:(params)=>{
        const [index,,start,share]=data[params.dataIndex].value;
        const hidden=index===selectedIndex||index===highlightedIndex||index===focusedIndex;
        const arc=(name,radius,lineWidth,inset,opacity,color)=>({
          type:'arc',name,silent:true,
          shape:{cx:width/2,cy:height/2,r:radius*scale,startAngle:radians(-125+(start+inset)*3.6),endAngle:radians(-125+(start+share-inset)*3.6),clockwise:true},
          style:{fill:null,stroke:color,lineWidth:lineWidth*scale,lineCap:'round',opacity},
          transition:['style']
        });
        // rem 换算值只用于内侧两角，外侧保留原圆弧与直角交点。
        const halfBand=14.5/2,capAngle=Math.asin(halfBand/60);
        const band={
          type:'path',name:'inset-band',silent:true,
          shape:{pathData:innerRoundedBandPath(width/2,height/2,(60-halfBand)*scale,(60+halfBand)*scale,radians(-125+(start+2.75)*3.6)-capAngle,radians(-125+(start+share-2.75)*3.6)+capAngle,bandCornerRadius)},
          style:{fill:colors[index],opacity:hidden?0:.18},transition:['style']
        };
        return {type:'group',children:[
          band,
          arc('outer-ring',69,3.2,1,1,(index===brightenedIndex||index===focusedIndex)?brighten(colors[index]):colors[index])
        ]};
      }
    }]
  };
}
