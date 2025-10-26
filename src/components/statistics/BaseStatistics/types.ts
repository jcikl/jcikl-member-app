/**
 * BaseStatistics Types
 * 基础统计组件类型定义
 */

export interface StatisticItem {
  title: string;
  value: number | string;
  precision?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  valueStyle?: React.CSSProperties;
  color?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
}

export interface BaseStatisticsProps {
  title?: string;
  items: StatisticItem[];
  loading?: boolean;
  // 布局相关
  columns?: number;
  gutter?: number | [number, number];
  // 操作相关
  showExport?: boolean;
  showRefresh?: boolean;
  onExport?: () => void;
  onRefresh?: () => void;
  // 样式相关
  className?: string;
  style?: React.CSSProperties;
  cardProps?: any;
}

export interface FinancialStatisticsProps extends Omit<BaseStatisticsProps, 'items'> {
  data: {
    totalIncome: number;
    totalExpense: number;
    netIncome: number;
    transactionCount: number;
  };
  currency?: string;
  showTrend?: boolean;
}

export interface MemberStatisticsProps extends Omit<BaseStatisticsProps, 'items'> {
  data: {
    totalMembers: number;
    activeMembers: number;
    newMembers: number;
    alumniMembers: number;
  };
  showTrend?: boolean;
}

export interface EventStatisticsProps extends Omit<BaseStatisticsProps, 'items'> {
  data: {
    totalEvents: number;
    publishedEvents: number;
    draftEvents: number;
    totalParticipants: number;
  };
  showTrend?: boolean;
}

export interface BaseStatisticsRef {
  refresh: () => void;
  export: () => void;
}
