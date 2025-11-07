import React, { useMemo } from 'react';

// 类型定义
import type { DataGridProps } from './types';
import { BaseTable } from '../BaseTable';

// 样式
import './styles.css';

/**
 * DataGrid Component
 * 智能数据网格组件(基于BaseTable)
 * 
 * @description 增强版表格，支持批量操作、列配置等功能
 */
export function DataGrid<T extends { id?: string }>({
  columns,
  dataSource,
  editable = false,
  batchOperable = true,
  configurable = false,
  draggable = false,
  onRowEdit,
  onBatchDelete,
  onBatchExport,
  onRowReorder,
  storageKey = 'data-grid-config',
  rowKey = 'id',
  loading = false,
  // BaseTable props
  searchable,
  searchPlaceholder,
  onSearch,
  exportable,
  onExport,
  refreshable,
  onRefresh,
  toolbarExtra,
  ...restProps
}: DataGridProps<T>) {
  /**
   * 转换列配置为 Ant Design Table 格式
   */
  const tableColumns = useMemo(() => {
    return columns
      .filter(col => !col.hidden)
      .map(col => ({
        key: col.key,
        title: col.title,
        dataIndex: col.dataIndex,
        width: col.width,
        align: col.align,
        fixed: col.fixed,
        sorter: col.sortable ? (a: any, b: any) => {
          const aVal = a[col.dataIndex];
          const bVal = b[col.dataIndex];
          if (typeof aVal === 'number') return aVal - bVal;
          return String(aVal).localeCompare(String(bVal));
        } : undefined,
        render: col.render,
      }));
  }, [columns]);

  return (
    <div className="data-grid">
      <BaseTable
        columns={tableColumns as any}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        onSearch={onSearch}
        exportable={exportable}
        onExport={onExport}
        refreshable={refreshable}
        onRefresh={onRefresh}
        toolbarExtra={toolbarExtra}
        batchOperable={batchOperable}
        onBatchDelete={onBatchDelete}
        onBatchExport={onBatchExport}
        className="data-grid__table"
        {...restProps}
      />
    </div>
  );
}

export default DataGrid;