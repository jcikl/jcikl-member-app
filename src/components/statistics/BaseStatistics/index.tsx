import React from 'react';
import { Card, Statistic, Row, Col, Space, Button } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

// 全局配置
import { globalComponentService } from '@/config/globalComponentSettings';

// 类型定义
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

/**
 * BaseStatistics Component
 * 基础统计组件
 * 
 * @description 统一的统计展示基础组件，提供标准化的统计行为
 */
export const BaseStatistics: React.FC<BaseStatisticsProps> = ({
  title,
  items,
  loading = false,
  columns = 4,
  gutter = [16, 16],
  showExport = false,
  showRefresh = false,
  onExport,
  onRefresh,
  className = '',
  style = {},
  cardProps = {},
}) => {
  /**
   * 渲染趋势图标
   */
  const renderTrendIcon = (trend: StatisticItem['trend']) => {
    if (!trend) return null;

    const iconProps = {
      style: { fontSize: '14px', color: trend.direction === 'up' ? '#52c41a' : '#ff4d4f' },
    };

    switch (trend.direction) {
      case 'up':
        return <ArrowUpOutlined {...iconProps} />;
      case 'down':
        return <ArrowDownOutlined {...iconProps} />;
      default:
        return null;
    }
  };

  /**
   * 渲染趋势文本
   */
  const renderTrendText = (trend: StatisticItem['trend']) => {
    if (!trend) return null;

    const color = trend.direction === 'up' ? '#52c41a' : '#ff4d4f';
    return (
      <span style={{ color, fontSize: '12px' }}>
        {trend.value}% {trend.label || '较上期'}
      </span>
    );
  };

  /**
   * 渲染操作按钮
   */
  const renderActions = () => {
    if (!showExport && !showRefresh) return null;

    return (
      <Space>
        {showRefresh && onRefresh && (
          <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
            刷新
          </Button>
        )}
        {showExport && onExport && (
          <Button icon={<ExportOutlined />} onClick={onExport}>
            导出
          </Button>
        )}
      </Space>
    );
  };

  /**
   * 渲染统计项
   */
  const renderStatisticItem = (item: StatisticItem, index: number) => {
    return (
      <Col key={index} span={24 / columns}>
        <Card
          {...cardProps}
          className="base-statistics-item"
          style={{ height: '100%', ...cardProps.style }}
        >
          <Statistic
            title={item.title}
            value={item.value}
            precision={item.precision}
            prefix={item.prefix}
            suffix={item.suffix}
            valueStyle={{
              color: item.color,
              ...item.valueStyle,
            }}
            loading={loading}
          />
          
          {/* 趋势信息 */}
          {item.trend && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              {renderTrendIcon(item.trend)}
              {renderTrendText(item.trend)}
            </div>
          )}
        </Card>
      </Col>
    );
  };

  return (
    <Card
      title={title}
      extra={renderActions()}
      className={`base-statistics ${className}`}
      style={style}
    >
      <Row gutter={gutter}>
        {items.map(renderStatisticItem)}
      </Row>
    </Card>
  );
};

/**
 * FinancialStatistics Component
 * 财务统计组件
 */
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

export const FinancialStatistics: React.FC<FinancialStatisticsProps> = ({
  data,
  currency = 'RM',
  showTrend = false,
  ...props
}) => {
  const items: StatisticItem[] = [
    {
      title: '总收入',
      value: data.totalIncome,
      precision: 2,
      prefix: currency,
      color: '#52c41a',
    },
    {
      title: '总支出',
      value: data.totalExpense,
      precision: 2,
      prefix: currency,
      color: '#ff4d4f',
    },
    {
      title: '净收入',
      value: data.netIncome,
      precision: 2,
      prefix: currency,
      color: data.netIncome >= 0 ? '#52c41a' : '#ff4d4f',
    },
    {
      title: '交易笔数',
      value: data.transactionCount,
      suffix: '笔',
      color: '#1890ff',
    },
  ];

  return <BaseStatistics items={items} {...props} />;
};

/**
 * MemberStatistics Component
 * 会员统计组件
 */
export interface MemberStatisticsProps extends Omit<BaseStatisticsProps, 'items'> {
  data: {
    totalMembers: number;
    activeMembers: number;
    newMembers: number;
    alumniMembers: number;
  };
  showTrend?: boolean;
}

export const MemberStatistics: React.FC<MemberStatisticsProps> = ({
  data,
  showTrend = false,
  ...props
}) => {
  const items: StatisticItem[] = [
    {
      title: '总会员数',
      value: data.totalMembers,
      suffix: '人',
      color: '#1890ff',
    },
    {
      title: '活跃会员',
      value: data.activeMembers,
      suffix: '人',
      color: '#52c41a',
    },
    {
      title: '新会员',
      value: data.newMembers,
      suffix: '人',
      color: '#faad14',
    },
    {
      title: '校友会员',
      value: data.alumniMembers,
      suffix: '人',
      color: '#722ed1',
    },
  ];

  return <BaseStatistics items={items} {...props} />;
};

/**
 * EventStatistics Component
 * 活动统计组件
 */
export interface EventStatisticsProps extends Omit<BaseStatisticsProps, 'items'> {
  data: {
    totalEvents: number;
    publishedEvents: number;
    draftEvents: number;
    totalParticipants: number;
  };
  showTrend?: boolean;
}

export const EventStatistics: React.FC<EventStatisticsProps> = ({
  data,
  showTrend = false,
  ...props
}) => {
  const items: StatisticItem[] = [
    {
      title: '总活动数',
      value: data.totalEvents,
      suffix: '个',
      color: '#1890ff',
    },
    {
      title: '已发布',
      value: data.publishedEvents,
      suffix: '个',
      color: '#52c41a',
    },
    {
      title: '草稿',
      value: data.draftEvents,
      suffix: '个',
      color: '#faad14',
    },
    {
      title: '总参与人数',
      value: data.totalParticipants,
      suffix: '人',
      color: '#722ed1',
    },
  ];

  return <BaseStatistics items={items} {...props} />;
};

export default BaseStatistics;
