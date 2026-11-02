import {Input} from 'antd';
import {Icon} from '../../../assets/shared/icon.jsx';
import './index.css';

// 即时筛选仍回传字符串；Enter 作为可选提交事件，不改变调用方原有搜索节奏。
export default function SearchInput({id,value,onChange,placeholder,ariaLabel,clearable=true,className='',onPressEnter,disabled=false}){
 return <span className={'ict-search-field '+className}>
  <Input id={id} className="ict-search-input" style={{width:'100%'}} value={value} aria-label={ariaLabel} placeholder={placeholder}
   disabled={disabled} allowClear={clearable} suffix={<Icon name="search" size="0.875rem"/>}
   onChange={event=>onChange(event.target.value)} onPressEnter={event=>onPressEnter?.(event)}/>
 </span>;
}
