/**
 * TimelineCard Types
 * 时间线卡片类型定义
 */

export type OperationType = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'other';

export interface TimelineItem {
  id: string;
  timestamp: Date | string;
  type: OperationType;
  operator: string;
  operatorId: string;
  operatorAvatar?: string;
  title: string;
  description?: string;
  detail?: React.ReactNode | string;
  metadata?: Record<string, any>;
}

export interface TimelineCardProps {
  data: TimelineItem[];
  loading?: boolean;
  filterable?: boolean;
  filterTypes?: OperationType[];
  pagination?: boolean;
  pageSize?: number;
  onLoadMore?: () => void;
  onExport?: (format: 'pdf' | 'csv') => void;
  showOperatorFilter?: boolean;
  className?: string;
}

export interface TimelineFilterConfig {
  operationType?: OperationType;
  operator?: string;
  dateRange?: [Date, Date];
}

