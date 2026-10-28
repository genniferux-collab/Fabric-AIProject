// Derive a focused homepage map from the unmodified original Pixso SVG artwork.
const fs=require('node:fs'),path=require('node:path');
const previewRoot=process.env.FABRIC_PREVIEW_ROOT?path.resolve(process.env.FABRIC_PREVIEW_ROOT):path.resolve(__dirname,'..');
const assetRoot=path.join(previewRoot,'assets/uploads/pixso-home-map');
const referenceCenters=[
  {id:'xisanqi',name:'西三旗',x:946.19165,y:426.261047},
  {id:'jiading',name:'嘉定',x:1038.19067-26,y:672.260315},
  {id:'waigaoqiao',name:'外高桥',x:1077.75854+26,y:688.433411},
];
const keepOuterBranches=new Set([100,102,104,106,108,110,112,118]);
const keepInnerBranches=new Set([156,162,166,168,176,178,180]);
const keepAggregates=new Set([144,150]);
const keepRoutes=new Set([1,2,3,5,6,7,8,12,13,16,18,19,22,23,30,31,33,34,35,36,37,42]);
const labelRoutes=new Map([[121,34],[131,19],[135,2],[137,6]]);
const shiftedRouteStarts=new Map([[16,-26],[22,-26],[23,-26],[30,26]]);
const shiftedRouteEnds=new Map([[1,26],[2,26],[3,26],[6,26],[7,26],[8,26],[12,26],[13,26],[37,26],[5,-26],[31,-26],[36,-26],[42,-26]]);
const number=value=>Number(value.toFixed(6));
function attributes(tag){
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match=>[match[1],(match[2]??match[3]).replace(/&(?:amp|quot|apos|lt|gt);/g,entity=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'})[entity]) ]));
}
// Track actual element boundaries so nested, repeated Pixso group IDs are safe.
function elements(svg){
  const document={children:[]},stack=[document];
  for(const match of svg.matchAll(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z][^>]*>/g)){
    const raw=match[0];
    if(raw.startsWith('<!--')||raw.startsWith('<?'))continue;
    const tag=raw.match(/^<\/?([^\s/>]+)/)[1];
    if(raw.startsWith('</')){
      const node=stack.pop();
      if(node===document||node.tag!==tag)throw Error('Malformed SVG element nesting: '+tag);
      node.closeStart=match.index;node.end=match.index+raw.length;
    }else{
      const node={tag,attrs:attributes(raw),start:match.index,openEnd:match.index+raw.length,children:[]};
      stack.at(-1).children.push(node);
      if(/\/\s*>$/.test(raw)){node.closeStart=node.openEnd;node.end=node.openEnd;}
      else stack.push(node);
    }
  }
  if(stack.length!==1)throw Error('Unclosed SVG elements');
  return document.children.find(node=>node.tag==='svg');
}
const child=(node,id)=>node.children.find(item=>item.tag==='g'&&item.attrs.id===id);
const clipId=node=>Number(node.attrs.customFrame?.match(/clipPath_(\d+)/)?.[1]);
function setAttribute(tag,key,value){
  const pattern=new RegExp('\\s'+key+'\\s*=\\s*(?:"[^"]*"|\'[^\']*\')');
  tag=tag.replace(pattern,'');
  return value==null?tag:tag.replace(/(\s*\/?\s*>)$/,` ${key}="${value}"$1`);
}
function editOpening(svg,node,attrs){
  let tag=svg.slice(node.start,node.openEnd);
  for(const [key,value] of Object.entries(attrs))tag=setAttribute(tag,key,value);
  return {start:node.start,end:node.openEnd,text:tag};
}
function applyEdits(svg,edits){
  edits.sort((a,b)=>b.start-a.start);
  let boundary=svg.length;
  for(const edit of edits){
    if(edit.end>boundary)throw Error('Overlapping SVG edits');
    svg=svg.slice(0,edit.start)+edit.text+svg.slice(edit.end);boundary=edit.start;
  }
  return svg;
}
function matrix(value){
  const result=value?.match(/^matrix\(([^)]+)\)$/)?.[1].split(/[\s,]+/).map(Number);
  if(result?.length!==6||result.some(value=>!Number.isFinite(value)))throw Error('Unexpected source matrix: '+value);
  return result;
}
function endpoints(node){
  const [a,b,,,x,y]=matrix(node.attrs.transform),length=Number(node.attrs.d.match(/^M0 0L([\d.]+) 0$/)?.[1]);
  if(!Number.isFinite(length))throw Error('Unexpected source route: '+node.attrs.d);
  return {x1:x,y1:y,x2:x+a*length,y2:y+b*length};
}
function focusBranches(svg){
  const root=elements(svg),group=child(root,'地区小绿圆点');
  if(!group||group.children.length!==10)throw Error('Pixso outer branch structure changed');
  return applyEdits(svg,group.children.map(node=>keepOuterBranches.has(clipId(node))?editOpening(svg,node,{'data-map-branch':clipId(node)}):{start:node.start,end:node.end,text:''}));
}
function focusConnections(svg){
  const root=elements(svg),group=child(root,'站点&线'),line=child(group,'line'),nodes=child(group,'站点与线路数量');
  if(!line||!nodes)throw Error('Pixso connections structure changed');
  const paths=[];
  function visit(node){if(node.tag==='path')paths.push(node);for(const item of node.children)visit(item);}
  visit(line);
  if(paths.length!==43)throw Error('Pixso route count changed');
  const edits=[],routePositions=new Map();
  paths.forEach((node,index)=>{
    if(!keepRoutes.has(index)){edits.push({start:node.start,end:node.end,text:''});return;}
    const before=endpoints(node),after={...before,x1:before.x1+(shiftedRouteStarts.get(index)||0),x2:before.x2+(shiftedRouteEnds.get(index)||0)};
    routePositions.set(index,{before,after});
    edits.push(editOpening(svg,node,{transform:null,d:`M${number(after.x1)} ${number(after.y1)}L${number(after.x2)} ${number(after.y2)}`,'data-map-route':index}));
  });
  let branchCount=0,aggregateCount=0,labelCount=0,centerCount=0;
  for(const node of nodes.children){
    if(node.tag!=='g')continue;
    const clip=clipId(node);
    const centerId=node.attrs.id==='前海'?'xisanqi':node.attrs.id==='嘉定'?'jiading':node.attrs.id==='外高桥'?'waigaoqiao':null;
    if(centerId){
      centerCount++;
      const offset=centerId==='jiading'?-26:centerId==='waigaoqiao'?26:0;
      edits.push(editOpening(svg,node,{'data-center-id':centerId,...(offset?{transform:`translate(${offset} 0)`}:{})}));
    }else if(keepInnerBranches.has(clip)){
      branchCount++;edits.push(editOpening(svg,node,{'data-map-branch':clip}));
    }else if(keepAggregates.has(clip)){
      aggregateCount++;edits.push(editOpening(svg,node,{'data-map-aggregate':clip}));
    }else if(labelRoutes.has(clip)){
      labelCount++;
      const route=labelRoutes.get(clip),{before,after}=routePositions.get(route),rect=node.children.find(item=>item.tag==='rect');
      const [a,b,c,d,e,f]=matrix(rect.attrs.transform),cx=e+a*Number(rect.attrs.width)/2+c*Number(rect.attrs.height)/2,cy=f+b*Number(rect.attrs.width)/2+d*Number(rect.attrs.height)/2;
      const vx=before.x2-before.x1,vy=before.y2-before.y1,t=((cx-before.x1)*vx+(cy-before.y1)*vy)/(vx*vx+vy*vy);
      const angle=Math.atan2(after.y2-after.y1,after.x2-after.x1)-Math.atan2(vy,vx);
      const ox=cx-(before.x1+t*vx),oy=cy-(before.y1+t*vy);
      const targetX=after.x1+t*(after.x2-after.x1)+ox*Math.cos(angle)-oy*Math.sin(angle);
      const targetY=after.y1+t*(after.y2-after.y1)+ox*Math.sin(angle)+oy*Math.cos(angle);
      const attrs={'data-map-route-label':route};
      if(shiftedRouteStarts.has(route)||shiftedRouteEnds.has(route))attrs.transform=`translate(${number(targetX-cx)} ${number(targetY-cy)}) rotate(${number(angle*180/Math.PI)} ${number(cx)} ${number(cy)})`;
      edits.push(editOpening(svg,node,attrs));
    }else edits.push({start:node.start,end:node.end,text:''});
  }
  if(branchCount!==7||aggregateCount!==2||labelCount!==4||centerCount!==3)throw Error('Unexpected focused map contents');
  return applyEdits(svg,edits);
}
function inlineLayer(file,prefix,derive){
  let svg=fs.readFileSync(path.join(assetRoot,file),'utf8');
  if(/<(?:image|script|foreignObject)\b/i.test(svg))throw Error('Map layer must be pure SVG: '+file);
  svg=derive(svg);
  svg=svg.replace(/\sid="([^"]+)"/g,(_,id)=>` id="${prefix}-${id}"`)
    .replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix}-${id})`)
    .replace(/\b(href|xlink:href)="#([^"]+)"/g,(_,attribute,id)=>`${attribute}="#${prefix}-${id}"`)
    .replace(/<(?:path|line|polyline|circle|ellipse)\b[^>]*>/g,tag=>tag.includes('stroke=')&&!tag.includes('vector-effect=')?tag.replace(/\s*\/>$/,' vector-effect="non-scaling-stroke"/>'):tag);
  return svg;
}
const output='// Generated focused layers from unmodified Pixso SVG assets by preview/scripts/build-map-vectors.cjs.\n'+
  'export const referenceCenters='+JSON.stringify(referenceCenters)+';\n'+
  'export const branchLayerSvg='+JSON.stringify(inlineLayer('map-branches.svg','map-branches',focusBranches))+';\n'+
  'export const connectionLayerSvg='+JSON.stringify(inlineLayer('map-connections.svg','map-connections',focusConnections))+';\n';
const target=path.join(previewRoot,'src/components/map-network-overlay/map-vector-layers.js');
if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==output)fs.writeFileSync(target,output);
