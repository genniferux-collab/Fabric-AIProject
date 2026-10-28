const TIP_WIDTH=212,TIP_HEIGHT=56,NODE_SIZE=40,LABEL_WIDTH=64,LABEL_HEIGHT=22,GAP=12,EPSILON=1e-7;

function overlapsWithGap(a,b){
  return a.left<b.right-EPSILON&&a.right>b.left+EPSILON&&a.top<b.bottom+GAP-EPSILON&&a.bottom>b.top-GAP+EPSILON;
}

// Coordinates and output offsets are logical CSS pixels, before the outer PC preview scale.
// The returned lift includes the normal 12px top gap: align.offset = [0,-lifts[id]].
export function computeTipLifts(centers,visibleIds,scale,heightById={},widthById={},xOffsetById={}){
  if(!Number.isFinite(scale)||scale<=0)throw new RangeError("Map scale must be positive and finite.");
  const visible=new Set(visibleIds),obstacles=[],lifts={};
  for(const center of centers){
    const x=center.x*scale,y=center.y*scale,half=NODE_SIZE*scale/2;
    obstacles.push({left:x-half,right:x+half,top:y-half,bottom:y+half});
    obstacles.push({left:x-LABEL_WIDTH*scale/2,right:x+LABEL_WIDTH*scale/2,top:y+half,bottom:y+half+LABEL_HEIGHT*scale});
  }
  const ordered=centers.filter(center=>visible.has(center.id)).sort((a,b)=>a.y-b.y||a.x-b.x||a.id.localeCompare(b.id));
  for(const center of ordered){
    const offsetX=xOffsetById[center.id]??0;
    if(!Number.isFinite(offsetX))throw new RangeError(`Tip horizontal offset must be finite: ${center.id}`);
    const x=center.x*scale+offsetX,nodeTop=(center.y-NODE_SIZE/2)*scale;
    const height=heightById[center.id]??TIP_HEIGHT,width=widthById[center.id]??TIP_WIDTH;
    if(!Number.isFinite(height)||height<=0)throw new RangeError(`Tip height must be positive and finite: ${center.id}`);
    if(!Number.isFinite(width)||width<=0)throw new RangeError(`Tip width must be positive and finite: ${center.id}`);
    let bottom=nodeTop-GAP;
    const tip={left:x-width/2,right:x+width/2,top:bottom-height,bottom};
    // Each lift permanently clears at least one obstacle; later lifts only move upward.
    for(let pass=0;pass<=obstacles.length;pass++){
      const conflicts=obstacles.filter(obstacle=>overlapsWithGap(tip,obstacle));
      if(!conflicts.length)break;
      bottom=Math.min(...conflicts.map(obstacle=>obstacle.top-GAP));
      tip.bottom=bottom;tip.top=bottom-height;
    }
    lifts[center.id]=Math.max(GAP,nodeTop-bottom);
    obstacles.push(tip);
  }
  return lifts;
}
