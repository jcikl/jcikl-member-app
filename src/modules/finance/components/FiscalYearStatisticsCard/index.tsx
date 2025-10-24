/**
 * Fiscal Year Statistics Component
 * 财年统计组件
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Space,
  Tag,
  Tooltip,
  Alert,
  Spin
} from 'antd';
import {
  DollarOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { 
  FiscalYearPeriod, 
  FiscalYearStatistics 
} from '../types/fiscalYear';
import { smartFiscalYearService } from '../services/smartFiscalYearService';
import { Transaction } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface FiscalYearStatisticsCardProps {
  period: FiscalYearPeriod;
  transactions: Transaction[];
  loading?: boolean;
  showDetails?: boolean;
  showComparison?: boolean;
  previousPeriodStats?: FiscalYearStatistics;
}

const FiscalYearStatisticsCard: React.FC<FiscalYearStatisticsCardProps> = ({
  period,
  transactions,
  loading = false,
  showDetails = true,
  showComparison = false,
  previousPeriodStats
}) => {
  const [statistics, setStatistics] = useState<FiscalYearStatistics | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    calculateStatistics();
  }, [period, transactions]);

  const calculateStatistics = async () => {
    if (!transactions.length) {
      setStatistics(null);
      return;
    }

    setCalculating(true);
    try {
      const stats = await smartFiscalYearService.calculateFiscalYearStatistics(period, transactions);
      
      // 计算增长率
      if (showComparison && previousPeriodStats) {
        const incomeGrowthRate = previousPeriodStats.totalIncome > 0 ? 
          ((stats.totalIncome - previousPeriodStats.totalIncome) / previousPeriodStats.totalIncome) * 100 : 0;
        const expenseGrowthRate = previousPeriodStats.totalExpense > 0 ? 
          ((stats.totalExpense - previousPeriodStats.totalExpense) / previousPeriodStats.totalExpense) * 100 : 0;
        
        stats.growthRate = incomeGrowthRate;
      }
      
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to calculate statistics:', error);
    } finally {
      setCalculating(false);
    }
  };

  const getStatusIcon = () => {
    if (period.isCompleted) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    } else if (period.isCurrent) {
      return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
    } else {
      return <CalendarOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = () => {
    if (period.isCompleted) return 'success';
    if (period.isCurrent) return 'processing';
    return 'default';
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  if (loading || calculating) {
    return (
      <Card>
        <Spin size="large" style={{ width: '100%', textAlign: 'center', padding: '40px' }} />
      </Card>
    );
  }

  if (!statistics) {
    return (
      <Card>
        <Alert
          message="暂无数据"
          description="该财年期间没有交易记录"
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          {getStatusIcon()}
          <span>{period.displayName}</span>
          <Tag color={getStatusColor()}>
            {period.isCompleted ? '已完成' : period.isCurrent ? '进行中' : '未开始'}
          </Tag>
        </Space>
      }
      extra={
        showDetails && (
          <Tooltip title={`${period.startDate} 至 ${period.endDate}`}>
            <Text type="secondary">
              {period.startDate} - {period.endDate}
            </Text>
          </Tooltip>
        )
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 财年进度 */}
        {period.isCurrent && (
          <div>
            <Text strong>财年进度</Text>
            <Progress 
              percent={period.progressPercentage}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {period.daysElapsed} 天 / {period.totalDays} 天
              {period.daysRemaining > 0 && ` (剩余 ${period.daysRemaining} 天)`}
            </Text>
          </div>
        )}

        {/* 主要统计指标 */}
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="总收入"
              value={statistics.totalIncome}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<TrendingUpOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总支出"
              value={statistics.totalExpense}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<TrendingDownOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="净收入"
              value={statistics.netIncome}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<DollarOutlined />}
              valueStyle={{ color: statistics.netIncome >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Col>
        </Row>

        {/* 详细统计 */}
        {showDetails && (
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="交易笔数"
                value={statistics.totalTransactions}
                suffix="笔"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="月均收入"
                value={statistics.averageMonthlyIncome}
                formatter={(value) => formatCurrency(Number(value))}
                suffix="/月"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="月均支出"
                value={statistics.averageMonthlyExpense}
                formatter={(value) => formatCurrency(Number(value))}
                suffix="/月"
              />
            </Col>
          </Row>
        )}

        {/* 增长率对比 */}
        {showComparison && statistics.growthRate !== undefined && (
          <Alert
            message="财年对比"
            description={
              <Space>
                <Text>
                  相比上一财年收入变化: 
                  <Text 
                    style={{ 
                      color: statistics.growthRate >= 0 ? '#52c41a' : '#ff4d4f',
                      fontWeight: 'bold'
                    }}
                  >
                    {formatPercentage(statistics.growthRate)}
                  </Text>
                </Text>
              </Space>
            }
            type={statistics.growthRate >= 0 ? 'success' : 'warning'}
            showIcon
            icon={<InfoCircleOutlined />}
          />
        )}

        {/* 财年完成率 */}
        {period.isCurrent && (
          <Alert
            message="财年完成率"
            description={`当前财年已完成 ${statistics.completionRate}%，预计财年结束时净收入为 ${formatCurrency(statistics.netIncome * (100 / statistics.completionRate))}`}
            type="info"
            showIcon
          />
        )}
      </Space>
    </Card>
  );
};

export default FiscalYearStatisticsCard;
