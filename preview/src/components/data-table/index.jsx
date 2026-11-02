import {Table} from 'antd';
import {useEffect,useRef} from 'react';
import './index.css';

// 项目统一约定：所有表头和单元格左对齐，包括数值列；保留排序、筛选与业务渲染。
const leftAlignedColumns=columns=>columns?.map(column=>({...column,align:'left',...(column.children?{children:leftAlignedColumns(column.children)}:{})}));

// 仅统一 ICT 表格契约；业务数据、筛选状态和分页仍由调用方控制。
export default function DataTable({className='',size='large',density,fillHeight=false,style,pagination,rowSelection,...props}) {
  const tableRef=useRef(null);
  // 官方皮肤以背景图呈现筛选图标，给原生触发器补名称，保留读屏与键盘语义。
  useEffect(()=>{tableRef.current?.nativeElement?.querySelectorAll('.ant-table-filter-trigger').forEach(trigger=>{const title=trigger.closest('th')?.textContent?.trim()||'当前列';trigger.setAttribute('aria-label','筛选'+title);});});
  const pager = pagination === false ? false : {
    ...pagination,
    showTotal: total => '总记录数：' + total + (rowSelection ? ' 已选中行数：' + (rowSelection.selectedRowKeys?.length || 0) : ''),
    showSizeChanger: true,
    showQuickJumper: {goButton: '跳转'},
    pageSizeOptions: pagination?.pageSizeOptions || ['10','20','50','100'],
  };
  // 抽屉中的菜单留在抽屉内，避免被遮罩压住，也保留其键盘焦点范围。
  const popupContainer = trigger => trigger?.closest('.skill-execution-drawer') || document.body;
  return <Table {...props} columns={leftAlignedColumns(props.columns)} ref={tableRef} className={['ict-data-table',density==='comfortable'?'ict-table-comfortable':'',fillHeight?'is-fill-height':'',className].filter(Boolean).join(' ')} style={{...style,...(fillHeight&&props.scroll?.y?{'--ict-table-body-height':typeof props.scroll.y==='number'?props.scroll.y+'px':props.scroll.y}:{})}} size={size} rowSelection={rowSelection}
    pagination={pager} sortDirections={['ascend','descend','ascend']} showSorterTooltip={false}
    getPopupContainer={props.getPopupContainer || popupContainer} />;
}
