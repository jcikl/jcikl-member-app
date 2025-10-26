import React from 'react';
import type { TableProps, ColumnType } from 'antd/es/table';
import { BaseTable } from '../BaseTable';
import './styles.css';

interface DataTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: ColumnType<T>[];
  searchable?: boolean;
  exportable?: boolean;
  refreshable?: boolean;
  onSearch?: (value: string) => void;
  onExport?: () => void;
  onRefresh?: () => void;
  toolbarExtra?: React.ReactNode;
}

/**
 * Data Table Component
 * 数据表格组件（基于BaseTable）
 * 
 * @description 简化的数据表格组件，提供基础的搜索、导出、刷新功能
 */
export function DataTable<T extends object>({
  columns,
  dataSource,
  loading,
  pagination,
  searchable = true,
  exportable = false,
  refreshable = true,
  onSearch,
  onExport,
  onRefresh,
  toolbarExtra,
  ...restProps
}: DataTableProps<T>) {
  return (
    <BaseTable
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      pagination={pagination}
      searchable={searchable}
      exportable={exportable}
      refreshable={refreshable}
      onSearch={onSearch}
      onExport={onExport}
      onRefresh={onRefresh}
      toolbarExtra={toolbarExtra}
      {...restProps}
    />
  );
}

export default DataTable;

