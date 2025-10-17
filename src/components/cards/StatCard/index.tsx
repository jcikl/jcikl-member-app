import React from 'react';
import { Card, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import './styles.css';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  loading?: boolean;
  precision?: number;
}

/**
 * Statistic Card Component
 * 统计卡片组件
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  trend,
  trendValue,
  loading = false,
  precision,
}) => {
  const getTrendColor = () => {
    if (!trend) return undefined;
    return trend === 'up' ? '#3f8600' : '#cf1322';
  };

  return (
    <Card loading={loading} bordered={false} className="stat-card">
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        precision={precision}
        valueStyle={{ color: getTrendColor() }}
      />
      
      {trendValue && (
        <div className="stat-card-trend">
          {trend === 'up' ? (
            <ArrowUpOutlined style={{ color: '#3f8600' }} />
          ) : (
            <ArrowDownOutlined style={{ color: '#cf1322' }} />
          )}
          <span style={{ marginLeft: 4, color: getTrendColor() }}>
            {trendValue}
          </span>
        </div>
      )}
    </Card>
  );
};

export default StatCard;


