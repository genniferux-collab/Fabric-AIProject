import {Children,useId,useState} from 'react';
import {Select} from 'antd';
import './index.css';

const text=value=>Array.isArray(value)?value.map(text).join(''):value?.props?text(value.props.children):String(value??'');
const priorityColor=value=>String(value).includes('最高')||value==='高优先级'?'var(--error)':value==='中优先级'?'var(--critical)':'var(--on-surface-variant)';
const popupContainer=trigger=>trigger?.closest('.ant-popover,.skill-execution-drawer')||document.body;

// 保留业务层的直接值回调；选项导航、浮层和错误态由标准 Select 管理。
export default function FormSelect({label,value,onChange,options=[],priority=false,disabled=false,id:providedId,className='',style,placeholder='请选择',invalid=false,...props}){
 const uid=useId();
 const items=options.map(item=>typeof item==='string'?{value:item,label:item}:item).map(item=>({...item,searchText:text(item.label),label:priority?<span className="ict-select-priority-label"><i style={{background:priorityColor(item.value)}}/>{item.label}</span>:item.label}));
 // 旧调用方允许数字/字符串混用；传给 Select 的值与 option 的真实类型对齐，避免显示裸值。
 const canonicalValue=candidate=>{const item=items.find(option=>String(option.value)===String(candidate));return item?item.value:candidate===''?undefined:candidate;};
 const selectedValue=Array.isArray(value)?value.map(canonicalValue):canonicalValue(value);
 return <span className={'ui-kit-select uc3-kit-select '+className} style={style}>
  <Select {...props} className="ict-select-control" id={providedId||uid} aria-label={label||props['aria-label']} aria-invalid={invalid||undefined}
   value={selectedValue} onChange={onChange} options={items} disabled={disabled} placeholder={placeholder} status={invalid?'error':props.status}
   optionFilterProp="searchText" getPopupContainer={props.getPopupContainer||popupContainer} style={{width:'100%'}}/>
 </span>;
}

// 旧页面仍接收原生 select 形状的事件，避免批量改变筛选和分页调用方。
export function NativeSelect({children,onChange,value,defaultValue,'aria-label':label,...props}){
 const [internal,setInternal]=useState(defaultValue);
 const options=Children.toArray(children).filter(child=>child?.type==='option').map(child=>({value:child.props.value??text(child.props.children),label:child.props.children,disabled:child.props.disabled}));
 return <FormSelect {...props} label={label} value={value??internal??options[0]?.value} options={options} onChange={next=>{const nativeValue=next==null?'':String(next);setInternal(next??'');onChange?.({target:{value:nativeValue,name:props.name},currentTarget:{value:nativeValue,name:props.name}});}}/>;
}
