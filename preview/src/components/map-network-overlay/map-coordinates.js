export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Geometry and screen-space popups use the same camera frame.
export function projectSite(center,scene,view){
  return {x:(scene.left+center.x*scene.scale)*view.scale+view.x,y:(scene.top+center.y*scene.scale)*view.scale+view.y};
}

// The PC preview itself is scaled; pointer coordinates must return to logical pixels.
export function logicalMapPoint(clientX,clientY,rect,width,height){
  return {x:(clientX-rect.left)*width/rect.width,y:(clientY-rect.top)*height/rect.height};
}

export function fitPopup(point,size,scene,radius,placement="top",offset={x:0,y:12}){
  const pad=12,width=Math.min(size.width,Math.max(1,scene.width-2*pad));
  const height=Math.min(size.height,Math.max(1,scene.height-scene.bottom-2*pad));
  let left,top;
  if(placement==="right"){
    left=point.x+radius+12;
    if(left+width>scene.width-pad)left=point.x-radius-12-width;
    top=point.y-height/2;
  }else{
    left=point.x-width/2+offset.x;
    top=point.y-radius-offset.y-height;
    if(top<scene.bottom+pad&&point.y+radius+12+height<=scene.height-pad)top=point.y+radius+12;
  }
  left=clamp(left,pad,Math.max(pad,scene.width-pad-width));
  top=clamp(top,scene.bottom+pad,Math.max(scene.bottom+pad,scene.height-pad-height));
  return {x:left-point.x,y:top-point.y,width,height};
}
