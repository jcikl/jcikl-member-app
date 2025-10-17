/**
 * MetricCard Types
 * 指标卡片类型定义
 */

export type TrendDirection = 'up' | 'down' | 'neutral';

export type ChartType = 'line' | 'bar' | 'none';

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  prefix?: React.ReactNode;
  suffix?: string;
  trend?: TrendDirection;
  trendValue?: string | number;
  trendLabel?: string;
  chartData?: ChartDataPoint[];
  chartType?: ChartType;
  loading?: boolean;
  onClick?: () => void;
  format?: 'number' | 'currency' | 'percentage';
  precision?: number;
  color?: string;
  className?: string;
}

export interface TrendIndicatorProps {
  direction: TrendDirection;
  value: string | number;
  label?: string;
}

export interface MiniChartProps {
  data: ChartDataPoint[];
  type: ChartType;
  color?: string;
  height?: number;
}

