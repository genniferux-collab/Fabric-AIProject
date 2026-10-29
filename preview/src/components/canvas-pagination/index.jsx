import Ic from '../icon-el/index.jsx';
import {NativeSelect} from '../form-controls/select.jsx';
import './index.css';

export default function CanvasPagination({total,page,pageSize,onPageChange,onPageSizeChange,label='规则'}){
  const pages=Math.max(1,Math.ceil(total/pageSize)),current=Math.max(1,Math.min(page,pages));
  const near=[...new Set([1,Math.max(1,current-1),current,Math.min(pages,current+1),pages])].sort((a,b)=>a-b);
  return <footer className="canvas-pagination" aria-label={label+'分页'}><span>总计：{total}</span><div>
    <NativeSelect aria-label={label+'每页条数'} value={pageSize} onChange={event=>{onPageSizeChange(Number(event.target.value));onPageChange(1);}}>{[10,20,50].map(size=><option value={size} key={size}>{size} 条/页</option>)}</NativeSelect>
    <button type="button" aria-label={label+'上一页'} disabled={current===1} onClick={()=>onPageChange(current-1)}><Ic icon="chevron-left"/></button>
    {near.map((n,index)=><span className="canvas-page-item" key={n}>{index>0&&n-near[index-1]>1&&<span>…</span>}<button type="button" className={n===current?'is-current':''} aria-label={label+'第'+n+'页'} aria-current={n===current?'page':undefined} onClick={()=>onPageChange(n)}>{n}</button></span>)}
    {pages===1&&<span className="canvas-page-total">/ 1</span>}
    <button type="button" aria-label={label+'下一页'} disabled={current===pages} onClick={()=>onPageChange(current+1)}><Ic icon="chevron-right"/></button>
  </div></footer>;
}
