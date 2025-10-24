/**
 * Smart Fiscal Year Selector Component
 * 智能财年选择器组件
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Radio,
  Alert,
  Space,
  Typography,
  Button,
  Tooltip,
  Tag,
  Row,
  Col,
  Statistic,
  Progress
} from 'antd';
import {
  CalendarOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { 
  FiscalYearPeriod, 
  FiscalYearStatus,
  FiscalYearSuggestion 
} from '../types/fiscalYear';
import { smartFiscalYearService } from '../services/smartFiscalYearService';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface SmartFiscalYearSelectorProps {
  onFiscalYearChange?: (period: FiscalYearPeriod) => void;
  onStatisticsTypeChange?: (type: 'fiscal' | 'calendar') => void;
  defaultStatisticsType?: 'fiscal' | 'calendar';
  showSuggestions?: boolean;
  showProgress?: boolean;
  compact?: boolean;
}

const SmartFiscalYearSelector: React.FC<SmartFiscalYearSelectorProps> = ({
  onFiscalYearChange,
  onStatisticsTypeChange,
  defaultStatisticsType = 'fiscal',
  showSuggestions = true,
  showProgress = true,
  compact = false
}) => {
  const [statisticsType, setStatisticsType] = useState<'fiscal' | 'calendar'>(defaultStatisticsType);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [fiscalYearStatus, setFiscalYearStatus] = useState<FiscalYearStatus | null>(null);
  const [fiscalYearOptions, setFiscalYearOptions] = useState<Array<{ label: string; value: string; period: FiscalYearPeriod }>>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('');

  useEffect(() => {
    loadFiscalYearData();
  }, []);

  useEffect(() => {
    if (statisticsType === 'fiscal' && fiscalYearOptions.length > 0) {
      // 默认选择当前财年
      const currentOption = fiscalYearOptions.find(option => option.period.isCurrent);
      if (currentOption) {
        setSelectedFiscalYear(currentOption.value);
        onFiscalYearChange?.(currentOption.period);
      }
    }
  }, [statisticsType, fiscalYearOptions]);

  const loadFiscalYearData = async () => {
    try {
      // 检测财年状态
      const status = smartFiscalYearService.detectCurrentFiscalYearStatus();
      setFiscalYearStatus(status);
      
      // 获取财年选项
      const options = smartFiscalYearService.getFiscalYearOptions(10);
      setFiscalYearOptions(options);
      
      // 设置默认选择
      if (options.length > 0) {
        const currentOption = options.find(option => option.period.isCurrent);
        if (currentOption) {
          setSelectedFiscalYear(currentOption.value);
        }
      }
    } catch (error) {
      console.error('Failed to load fiscal year data:', error);
    }
  };

  const handleStatisticsTypeChange = (e: any) => {
    const type = e.target.value;
    setStatisticsType(type);
    onStatisticsTypeChange?.(type);
  };

  const handleFiscalYearChange = (value: string) => {
    setSelectedFiscalYear(value);
    const option = fiscalYearOptions.find(opt => opt.value === value);
    if (option) {
      onFiscalYearChange?.(option.period);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const getCurrentPeriod = (): FiscalYearPeriod | null => {
    if (statisticsType === 'fiscal') {
      const option = fiscalYearOptions.find(opt => opt.value === selectedFiscalYear);
      return option?.period || null;
    } else {
      // 自然年
      return {
        fiscalYear: `${selectedYear}`,
        displayName: `${selectedYear}年`,
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
        year: selectedYear,
        isCurrent: selectedYear === dayjs().year(),
        isCompleted: selectedYear < dayjs().year(),
        progressPercentage: selectedYear === dayjs().year() ? 
          Math.round((dayjs().diff(dayjs(`${selectedYear}-01-01`), 'day') / 365) * 100) : 
          (selectedYear < dayjs().year() ? 100 : 0),
        daysRemaining: selectedYear === dayjs().year() ? 
          dayjs(`${selectedYear}-12-31`).diff(dayjs(), 'day') : 0,
        daysElapsed: selectedYear === dayjs().year() ? 
          dayjs().diff(dayjs(`${selectedYear}-01-01`), 'day') : 
          (selectedYear < dayjs().year() ? 365 : 0),
        totalDays: 365
      };
    }
  };

  const getTopSuggestion = (): FiscalYearSuggestion | null => {
    if (!fiscalYearStatus?.suggestions || fiscalYearStatus.suggestions.length === 0) {
      return null;
    }
    return fiscalYearStatus.suggestions[0];
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'current': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'next': return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'previous': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default: return <BulbOutlined style={{ color: '#722ed1' }} />;
    }
  };

  const currentPeriod = getCurrentPeriod();
  const topSuggestion = getTopSuggestion();

  if (compact) {
    return (
      <Space>
        <Radio.Group value={statisticsType} onChange={handleStatisticsTypeChange}>
          <Radio.Button value="calendar">自然年</Radio.Button>
          <Radio.Button value="fiscal">财年</Radio.Button>
        </Radio.Group>
        
        {statisticsType === 'fiscal' ? (
          <Select
            value={selectedFiscalYear}
            onChange={handleFiscalYearChange}
            style={{ width: 200 }}
            placeholder="选择财年"
          >
            {fiscalYearOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        ) : (
          <Select
            value={selectedYear}
            onChange={handleYearChange}
            style={{ width: 120 }}
            placeholder="选择年份"
          >
            {Array.from({ length: 10 }, (_, i) => {
              const year = dayjs().year() - i;
              return (
                <Option key={year} value={year}>
                  {year}年
                </Option>
              );
            })}
          </Select>
        )}
      </Space>
    );
  }

  return (
    <Card title="统计设置" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 统计类型选择 */}
        <div>
          <Text strong>统计类型</Text>
          <Radio.Group 
            value={statisticsType} 
            onChange={handleStatisticsTypeChange}
            style={{ marginTop: 8 }}
          >
            <Radio value="calendar">自然年 (1月1日-12月31日)</Radio>
            <Radio value="fiscal">财年 (10月1日-9月30日)</Radio>
          </Radio.Group>
        </div>

        {/* 年份/财年选择 */}
        <div>
          <Text strong>
            {statisticsType === 'fiscal' ? '财年选择' : '年份选择'}
          </Text>
          <div style={{ marginTop: 8 }}>
            {statisticsType === 'fiscal' ? (
              <Select
                value={selectedFiscalYear}
                onChange={handleFiscalYearChange}
                style={{ width: '100%' }}
                placeholder="选择财年"
              >
                {fiscalYearOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            ) : (
              <Select
                value={selectedYear}
                onChange={handleYearChange}
                style={{ width: '100%' }}
                placeholder="选择年份"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = dayjs().year() - i;
                  return (
                    <Option key={year} value={year}>
                      {year}年
                    </Option>
                  );
                })}
              </Select>
            )}
          </div>
        </div>

        {/* 统计范围显示 */}
        {currentPeriod && (
          <div>
            <Text strong>统计范围</Text>
            <div style={{ marginTop: 8 }}>
              <Alert
                message={`${currentPeriod.displayName}`}
                description={`${currentPeriod.startDate} 至 ${currentPeriod.endDate}`}
                type="info"
                showIcon
                icon={<CalendarOutlined />}
              />
            </div>
          </div>
        )}

        {/* 财年进度 */}
        {showProgress && currentPeriod && statisticsType === 'fiscal' && (
          <div>
            <Text strong>财年进度</Text>
            <div style={{ marginTop: 8 }}>
              <Progress 
                percent={currentPeriod.progressPercentage}
                status={currentPeriod.isCompleted ? 'success' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {currentPeriod.daysElapsed} 天 / {currentPeriod.totalDays} 天
                {currentPeriod.isCurrent && ` (剩余 ${currentPeriod.daysRemaining} 天)`}
              </Text>
            </div>
          </div>
        )}

        {/* 智能建议 */}
        {showSuggestions && topSuggestion && (
          <div>
            <Text strong>智能建议</Text>
            <div style={{ marginTop: 8 }}>
              <Alert
                message={topSuggestion.reason}
                description={`建议查看 ${topSuggestion.period.displayName} 的数据`}
                type={topSuggestion.priority === 'high' ? 'success' : topSuggestion.priority === 'medium' ? 'info' : 'warning'}
                showIcon
                icon={getSuggestionIcon(topSuggestion.type)}
              />
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default SmartFiscalYearSelector;
