/**
 * DataGrid Types
 * 智能数据网格类型定义
 */

import type { TableProps } from 'antd';

export interface DataGridColumn<T = any> {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  hidden?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  editRender?: (value: any, record: T, onChange: (value: any) => void) => React.ReactNode;
}

export interface DataGridProps<T = any> extends Omit<TableProps<T>, 'columns'> {
  columns: DataGridColumn<T>[];
  dataSource: T[];
  editable?: boolean;
  batchOperable?: boolean;
  configurable?: boolean;
  draggable?: boolean;
  onRowEdit?: (record: T) => Promise<void>;
  onBatchDelete?: (ids: string[]) => Promise<void>;
  onBatchExport?: (ids: string[]) => void;
  onRowReorder?: (newOrder: T[]) => void;
  storageKey?: string;
  rowKey?: string;
  loading?: boolean;
  // BaseTable props
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  exportable?: boolean;
  onExport?: () => void;
  refreshable?: boolean;
  onRefresh?: () => void;
  toolbarExtra?: React.ReactNode;
}

export interface ColumnConfig {
  key: string;
  visible: boolean;
  order: number;
}

