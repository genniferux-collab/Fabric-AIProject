import {useEffect,useId,useRef,useState} from 'react';

const priorityColor=value=>value.includes('最高')||value==='高优先级'?'#f24751':value==='中优先级'?'#f59313':'#939393';
export default function Select({label,value,onChange,options,priority=false}){
 const root=useRef(null),trigger=useRef(null),list=useRef(null);const id=useId();const [open,setOpen]=useState(false),[active,setActive]=useState(0),[up,setUp]=useState(false);
 const items=options.map(item=>typeof item==='string'?{value:item,label:item}:item);const selected=items.findIndex(item=>item.value===value);
 useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 useEffect(()=>{if(open)list.current?.children[active]?.scrollIntoView({block:'nearest'});},[open,active]);
 const show=()=>{const rect=trigger.current.getBoundingClientRect(),host=root.current.closest('.v7-artifact-pane')?.getBoundingClientRect();const space=(host?.bottom||window.innerHeight)-rect.bottom;setUp(space<Math.min(items.length*36+8,248)&&rect.top>(host?.top||0)+150);setActive(Math.max(selected,0));setOpen(true);};
 const choose=index=>{onChange(items[index].value);setOpen(false);trigger.current?.focus({preventScroll:true});};
 const keyboard=e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();return;}if(e.key==='Tab'){setOpen(false);return;}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(!open){show();if(e.key==='End')setActive(items.length-1);return;}setActive(i=>e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length);return;}if((e.key==='Enter'||e.key===' ')&&open){e.preventDefault();choose(active);}};
 return <span ref={root} className={'uc3-kit-select'+(open?' is-open':'')+(up?' opens-up':'')}>
  <button ref={trigger} type="button" className="uc3-kit-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={open?id:undefined} aria-activedescendant={open?id+'-'+active:undefined} onKeyDown={keyboard} onClick={()=>open?setOpen(false):show()}>
   {priority&&<i className="uc3-kit-priority-dot" style={{background:priorityColor(value)}}/>}<span>{items[selected]?.label||value||'请选择'}</span><svg className="uc3-kit-chevron" viewBox="0 0 10.0042 10" aria-hidden="true" focusable="false"><path d="M9.86304 2.98398L5.36304 7.67963C5.24271 7.79495 5.10859 7.8664 4.99076 7.86389C4.87294 7.86139 4.75637 7.79997 4.64105 7.67963L0.141049 2.98398C-0.0526843 2.78183 -0.0460661 2.47077 0.156091 2.27704C0.358247 2.0833 0.669304 2.08992 0.863037 2.29208L5.00204 6.61104L9.14105 2.29208C9.33478 2.08992 9.64584 2.0833 9.848 2.27704C10.0502 2.47077 10.0568 2.78183 9.86304 2.98398Z" fill="currentColor" fillRule="evenodd"/></svg>
  </button>
  {open&&<span ref={list} id={id} className="uc3-kit-options" role="listbox" aria-label={label+'选项'}>{items.map((item,index)=><button key={item.value} type="button" id={id+'-'+index} role="option" aria-selected={item.value===value} tabIndex={-1} className={'uc3-kit-option'+(active===index?' is-active':'')} onPointerEnter={()=>setActive(index)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(index)}>{priority&&<i className="uc3-kit-priority-dot" style={{background:priorityColor(item.value)}}/>}<span>{item.label}</span></button>)}</span>}
 </span>;
}
