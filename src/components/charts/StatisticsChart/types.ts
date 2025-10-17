/**
 * StatisticsChart Types
 */

export type ChartType = 'line' | 'bar' | 'pie' | 'area';

export interface ChartDataPoint {
  [key: string]: any;
}

export interface StatisticsChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  xAxisKey: string;
  yAxisKey: string | string[];
  title?: string;
  loading?: boolean;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  onExport?: () => void;
  className?: string;
}

