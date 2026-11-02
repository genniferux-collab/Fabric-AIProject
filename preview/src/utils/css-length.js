// 仅在浏览器/API 边界转为未缩放的 CSS px，业务样式仍以 rem/token 为来源。
export function resolveCssLength(element,value,fallback=0){
  if(typeof value==='number')return Number.isFinite(value)?value:fallback;
  if(!element||typeof value!=='string'||!value.trim())return fallback;
  const document=element.ownerDocument,view=document.defaultView,text=value.trim();
  const simple=text.match(/^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em)?$/);
  if(simple){
    const amount=Number(simple[1]),unit=simple[2]||'px';
    if(unit==='px')return amount;
    const font=view.getComputedStyle(unit==='rem'?document.documentElement:element).fontSize;
    return amount*(parseFloat(font)||16);
  }
  // 由 CSS 引擎解析嵌套 var()/calc()/clamp()，不把 parseFloat 的局部结果当长度。
  const probe=document.createElement('span');
  probe.style.cssText='all:initial;position:absolute;display:block;visibility:hidden;pointer-events:none;height:0;min-width:0;max-width:none;padding:0;border:0;margin:0;box-sizing:content-box;font:inherit;';
  probe.style.width=text;
  if(!probe.style.width)return fallback;
  element.appendChild(probe);
  const pixels=parseFloat(view.getComputedStyle(probe).width);
  probe.remove();
  return Number.isFinite(pixels)?pixels:fallback;
}

export function readCssLength(element,property,fallback=0){
  if(!element)return fallback;
  const value=element.ownerDocument.defaultView.getComputedStyle(element).getPropertyValue(property);
  return resolveCssLength(element,value,fallback);
}

// 每个 document 共用一个 1rem 探针；根字号或主题/token 变化才通知，不轮询。
const documentUnits=new WeakMap();
export function observeCssUnits(element,listener){
  const document=element.ownerDocument,view=document.defaultView;
  let record=documentUnits.get(document);
  if(!record){
    const listeners=new Set(),probe=document.createElement('span');
    probe.setAttribute('aria-hidden','true');
    probe.style.cssText='all:initial;position:fixed;left:0;top:0;display:block;width:1rem;height:1rem;visibility:hidden;pointer-events:none;contain:strict;overflow:hidden;';
    document.body.appendChild(probe);
    const notify=()=>{for(const callback of listeners)callback();};
    const resize=new view.ResizeObserver(notify);resize.observe(probe);
    const mutation=new view.MutationObserver(notify);
    mutation.observe(document.documentElement,{attributes:true,attributeFilter:['class','style']});
    mutation.observe(document.body,{attributes:true,attributeFilter:['class','style']});
    record={listeners,probe,resize,mutation};documentUnits.set(document,record);
  }
  record.listeners.add(listener);
  const local=new view.MutationObserver(listener);
  local.observe(element,{attributes:true,attributeFilter:['class','style']});
  return ()=>{
    local.disconnect();record.listeners.delete(listener);
    if(!record.listeners.size){record.resize.disconnect();record.mutation.disconnect();record.probe.remove();documentUnits.delete(document);}
  };
}
