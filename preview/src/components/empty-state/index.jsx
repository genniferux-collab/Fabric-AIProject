import {Empty} from 'antd';

// 空态资源由入口 ConfigProvider 统一提供，业务只传说明文字。
export default function EmptyState({text,cls='device-empty',children}) {
  return <div className={cls}><Empty description={text}>{children}</Empty></div>;
}
