import React from 'react';
import { Card, Statistic, Skeleton } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';


// 类型定义
import type { MetricCardProps, TrendDirection, ChartDataPoint } from './types';

// 样式
import './styles.css';

/**
 * 趋势指示器组件
 */
const TrendIndicator: React.FC<{
  direction: TrendDirection;
  value: string | number;
  label?: string;
}> = ({ direction, value, label }) => {
  const getIconAndColor = () => {
    switch (direction) {
      case 'up':
        return {
          icon: <ArrowUpOutlined />,
          color: '#52c41a',
        };
      case 'down':
        return {
          icon: <ArrowDownOutlined />,
          color: '#ff4d4f',
        };
      case 'neutral':
        return {
          icon: <MinusOutlined />,
          color: '#8c8c8c',
        };
      default:
        return {
          icon: null,
          color: '#8c8c8c',
        };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <div className="metric-card__trend">
      <span className="metric-card__trend-icon" style={{ color }}>
        {icon}
      </span>
      <span className="metric-card__trend-value" style={{ color }}>
        {value}
      </span>
      {label && (
        <span className="metric-card__trend-label">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * 迷你图表组件(简化版 SVG)
 */
const MiniChart: React.FC<{
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'none';
  color?: string;
  height?: number;
}> = ({ data, type, color = '#1890ff', height = 60 }) => {
  if (type === 'none' || !data || data.length === 0) {
    return null;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  if (type === 'bar') {
    return (
      <div className="metric-card__chart metric-card__chart--bar" style={{ height: `${height}px` }}>
        {data.map((point, index) => {
          const heightPercent = ((point.value - minValue) / range) * 100;
          return (
            <div
              key={index}
              className="metric-card__bar"
              style={{
                height: `${heightPercent}%`,
                background: index === data.length - 1 ? color : `${color}33`,
              }}
            />
          );
        })}
      </div>
    );
  }

  // Line chart using SVG
  const width = 300;
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((point.value - minValue) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const pathD = `M ${points}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="metric-card__chart metric-card__chart--line" style={{ height: `${height}px` }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* 渐变定义 */}
        <defs>
          <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* 填充区域 */}
        <path
          d={areaD}
          fill="url(#lineGradient)"
        />
        
        {/* 线条 */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/**
 * MetricCard Component
 * 指标卡片组件
 * 
 * @description 展示关键业务指标，支持趋势图、点击交互等功能
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  prefix,
  suffix,
  trend,
  trendValue,
  trendLabel = '较上月',
  chartData = [],
  chartType = 'none',
  loading = false,
  onClick,
  format = 'number',
  precision = 0,
  color = '#1890ff',
  className = '',
}) => {
  /**
   * 格式化数值
   */
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') {
      return val;
    }

    if (format === 'currency') {
      return `RM ${val.toLocaleString('en-MY', { minimumFractionDigits: precision, maximumFractionDigits: precision })}`;
    }

    if (format === 'percentage') {
      return `${val.toFixed(precision)}%`;
    }

    return val.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision });
  };

  /**
   * 渲染卡片内容
   */
  const renderContent = () => {
    if (loading) {
      return <Skeleton active paragraph={{ rows: 3 }} />;
    }

    return (
      <div className="metric-card__content">
        {/* 标题 */}
        <div className="metric-card__title">{title}</div>

        {/* 数值 */}
        <div className="metric-card__value-wrapper">
          {prefix && <span className="metric-card__prefix">{prefix}</span>}
          <Statistic
            value={typeof value === 'number' ? formatValue(value) : value}
            suffix={suffix || unit}
            valueStyle={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#262626',
            }}
          />
        </div>

        {/* 趋势指示器 */}
        {trend && trendValue !== undefined && (
          <TrendIndicator
            direction={trend}
            value={trendValue}
            label={trendLabel}
          />
        )}

        {/* 迷你图表 */}
        {chartData.length > 0 && chartType !== 'none' && (
          <div className="metric-card__chart-wrapper">
            <MiniChart
              data={chartData}
              type={chartType}
              color={color}
              height={80}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      className={`metric-card ${onClick ? 'metric-card--clickable' : ''} ${className}`}
      onClick={onClick}
      variant="borderless"
      hoverable={!!onClick}
      loading={loading}
    >
      {renderContent()}
    </Card>
  );
};

export default MetricCard;

