import {useEffect,useRef} from "react";
import {observeCssUnits} from "../../utils/css-length.js";

// Use the local ECharts SVG renderer without replacing the existing layout/controls.
// Factories receive unscaled CSS dimensions, so the PC preview's outer transform
// does not shrink chart geometry a second time.
export default function EChart({option,className,style,onReady,onEvents,ariaLabel,notMerge=true,exactSize=false}) {
  const elementRef=useRef(null);
  const chartRef=useRef(null);
  const propsRef=useRef({option,onReady,onEvents,notMerge,exactSize});
  const drawRef=useRef(null);
  propsRef.current={option,onReady,onEvents,notMerge,exactSize};

  useEffect(()=>{
    const element=elementRef.current;
    if(!element)return;
    const chart=window.echarts.init(element,null,{renderer:"svg"});
    chartRef.current=chart;
    let frame=0,lastWidth=-1,lastHeight=-1;
    const listeners=new Map();
    const draw=()=>{
      if(chart.isDisposed())return;
      const current=propsRef.current;
      // 原稿素材使用小数尺寸时保留未缩放 CSS 小数，不取外层 transform 后的矩形。
      const box=current.exactSize?getComputedStyle(element):null;
      const width=box?(parseFloat(box.width)||element.clientWidth):element.clientWidth;
      const height=box?(parseFloat(box.height)||element.clientHeight):element.clientHeight;
      if(!width||!height)return; // ResizeObserver will retry when a hidden tab opens.
      if(width!==lastWidth||height!==lastHeight){chart.resize({width,height,silent:true});lastWidth=width;lastHeight=height;}
      const next=typeof current.option==="function"?current.option({width,height,element}):current.option;
      chart.setOption(next,{notMerge:current.notMerge,lazyUpdate:false,silent:true});
      for(const [name,listener] of listeners){if(!current.onEvents?.[name]){chart.off(name,listener);listeners.delete(name);}}
      for(const name of Object.keys(current.onEvents||{})){
        if(listeners.has(name))continue;
        const listener=params=>propsRef.current.onEvents?.[name]?.(params,chart);
        chart.on(name,listener);listeners.set(name,listener);
      }
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
    drawRef.current=draw;
    draw();
    propsRef.current.onReady?.(chart);
    const resize=new ResizeObserver(schedule);
    resize.observe(element);
    const unobserveUnits=observeCssUnits(element,schedule);
    return()=>{
      cancelAnimationFrame(frame);resize.disconnect();unobserveUnits();
      drawRef.current=null;chartRef.current=null;chart.dispose();
    };
  },[]);

  // Keep renderItem functions and fresh filter callbacks; JSON serialization
  // would drop custom-series renderers and freeze their interaction state.
  useEffect(()=>{drawRef.current?.();},[option,onEvents,notMerge,exactSize]);
  return <div ref={elementRef} className={className} style={{width:"100%",height:"100%",minWidth:0,minHeight:0,...style}} data-chart-engine="echarts" role={ariaLabel?"img":undefined} aria-label={ariaLabel} aria-hidden={ariaLabel?undefined:true}/>;
}
