import {Children,useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
const text=value=>Array.isArray(value)?value.map(text).join(''):value?.props?text(value.props.children):String(value??'');
const priorityColor=value=>String(value).includes('最高')||value==='高优先级'?'#f24751':value==='中优先级'?'#f59313':'#939393';

// Shared Pixso selector. The panel is portaled so card/table overflow cannot clip it.
export default function Select({label,value,onChange,options,priority=false,disabled=false,id:providedId,className='',style,placeholder='请选择',invalid=false}){
 const root=useRef(null),trigger=useRef(null),list=useRef(null),search=useRef({value:'',at:0});const uid=useId(),id=providedId||uid;
 const [open,setOpen]=useState(false),[active,setActive]=useState(0),[position,setPosition]=useState({});
 const items=options.map(item=>typeof item==='string'?{value:item,label:item}:item),selected=items.findIndex(item=>String(item.value)===String(value));
 const enabled=items.map((item,index)=>!item.disabled?index:-1).filter(index=>index>=0);
 useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target)&&!list.current?.contains(e.target))setOpen(false);};const scroll=e=>{if(!list.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',outside);document.addEventListener('scroll',scroll,true);window.addEventListener('resize',scroll);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',scroll);};},[open]);
 useEffect(()=>{if(open)list.current?.children[active]?.scrollIntoView({block:'nearest'});},[open,active]);
 useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
 const show=()=>{if(disabled||!enabled.length)return;const rect=trigger.current.getBoundingClientRect(),height=Math.min(items.length*36+8,248),up=window.innerHeight-rect.bottom<height+8&&rect.top>height+8;setPosition({position:'fixed',left:Math.min(rect.left,window.innerWidth-rect.width-8),width:rect.width,maxHeight:Math.min(248,Math.max(80,(up?rect.top:window.innerHeight-rect.bottom)-12)),...(up?{bottom:window.innerHeight-rect.top+4}:{top:rect.bottom+4})});setActive(selected>=0&&!items[selected].disabled?selected:enabled[0]);setOpen(true);};
 const choose=index=>{if(!items[index]||items[index].disabled)return;onChange(items[index].value);setOpen(false);trigger.current?.focus({preventScroll:true});};
 const keyboard=e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();return;}if(e.key==='Tab'){setOpen(false);return;}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(!open){show();if(e.key==='End')setActive(enabled.at(-1));return;}setActive(i=>e.key==='Home'?enabled[0]:e.key==='End'?enabled.at(-1):enabled[(enabled.indexOf(i)+(e.key==='ArrowDown'?1:-1)+enabled.length)%enabled.length]);return;}if((e.key==='Enter'||e.key===' ')&&open){e.preventDefault();choose(active);return;}if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key!==' '){const now=Date.now();search.current={value:(now-search.current.at<700?search.current.value:'')+e.key.toLowerCase(),at:now};const found=items.findIndex(item=>!item.disabled&&text(item.label).toLowerCase().startsWith(search.current.value));if(found>=0){if(open)setActive(found);else choose(found);}}};
 return <span ref={root} className={'ui-kit-select uc3-kit-select '+className+(open?' is-open':'')+(disabled?' is-disabled':'')} style={style}>
  <button ref={trigger} id={id} type="button" className="ui-kit-trigger uc3-kit-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={open?id+'-options':undefined} aria-activedescendant={open?id+'-'+active:undefined} aria-invalid={invalid||undefined} disabled={disabled} onKeyDown={keyboard} onBlur={e=>{if(!root.current?.contains(e.relatedTarget)&&!list.current?.contains(e.relatedTarget))setOpen(false);}} onClick={()=>open?setOpen(false):show()}>
   {priority&&<i className="uc3-kit-priority-dot" style={{background:priorityColor(value)}}/>}<span className={selected<0?'is-placeholder':undefined} title={text(items[selected]?.label||value||placeholder)}>{items[selected]?.label??(value||placeholder)}</span><svg className="ui-kit-chevron uc3-kit-chevron" width="10" height="10" viewBox="0 0 10.0042 10" aria-hidden="true"><path d="M9.86304 2.98398L5.36304 7.67963C5.24271 7.79495 5.10859 7.8664 4.99076 7.86389C4.87294 7.86139 4.75637 7.79997 4.64105 7.67963L0.141049 2.98398C-0.0526843 2.78183 -0.0460661 2.47077 0.156091 2.27704C0.358247 2.0833 0.669304 2.08992 0.863037 2.29208L5.00204 6.61104L9.14105 2.29208C9.33478 2.08992 9.64584 2.0833 9.848 2.27704C10.0502 2.47077 10.0568 2.78183 9.86304 2.98398Z" fill="currentColor"/></svg>
  </button>
  {open&&createPortal(<span ref={list} id={id+'-options'} className="ui-kit-options" style={position} role="listbox" aria-label={label+'选项'}>{items.map((item,index)=><button key={item.value} type="button" id={id+'-'+index} role="option" aria-selected={String(item.value)===String(value)} disabled={item.disabled} tabIndex={-1} className={'ui-kit-option'+(active===index?' is-active':'')} onPointerEnter={()=>!item.disabled&&setActive(index)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(index)}>{priority&&<i className="uc3-kit-priority-dot" style={{background:priorityColor(item.value)}}/>}<span title={text(item.label)}>{item.label}</span></button>)}</span>,document.body)}
 </span>;
}

// Keep the existing native-select event contract and option data when migrating views.
export function NativeSelect({children,onChange,value,defaultValue,'aria-label':label,...props}){
 const [internal,setInternal]=useState(defaultValue);
 const options=Children.toArray(children).filter(child=>child?.type==='option').map(child=>({value:child.props.value??text(child.props.children),label:child.props.children,disabled:child.props.disabled}));
 return <Select {...props} label={label} value={value??internal??options[0]?.value} options={options} onChange={next=>{setInternal(next);onChange?.({target:{value:String(next),name:props.name},currentTarget:{value:String(next),name:props.name}});}}/>;
}
