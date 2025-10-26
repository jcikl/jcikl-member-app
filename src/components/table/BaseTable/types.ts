/**
 * BaseTable Types
 * 基础表格组件类型定义
 */

import type { TableProps, ColumnType } from 'antd/es/table';

export interface BaseTableProps<T extends { id?: string }> extends Omit<TableProps<T>, 'columns'> {
  columns: ColumnType<T>[];
  // 搜索功能
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  // 导出功能
  exportable?: boolean;
  onExport?: () => void;
  // 刷新功能
  refreshable?: boolean;
  onRefresh?: () => void;
  // 批量操作
  batchOperable?: boolean;
  onBatchDelete?: (selectedKeys: React.Key[]) => Promise<void>;
  onBatchExport?: (selectedKeys: React.Key[]) => Promise<void>;
  // 工具栏
  toolbarExtra?: React.ReactNode;
  // 配置
  storageKey?: string;
  rowKey?: string;
}

export interface BaseTableRef {
  refresh: () => void;
  clearSelection: () => void;
  getSelectedRows: () => any[];
}
