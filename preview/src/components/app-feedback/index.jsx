import {useEffect} from 'react';
import {message} from 'antd';
import {Icon} from '../../../assets/shared/icon.jsx';
import {useApp} from '../../context.jsx';

// 保留 toast() 业务入口，单条消息通过固定 key 更新，避免连续操作堆叠提示。
export default function AppFeedback(){
  const {toastText,toastVersion}=useApp();
  const [api,holder]=message.useMessage({maxCount:1,top:64});
  useEffect(()=>{
    if(toastText)api.open({key:'fabric-feedback',type:'info',content:toastText,duration:3.2,icon:<Icon name="info" size="1rem"/>});
    else api.destroy('fabric-feedback');
  },[api,toastText,toastVersion]);
  return holder;
}
