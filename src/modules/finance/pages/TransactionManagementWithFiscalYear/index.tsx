/**
 * Integration Example: Transaction Management Page with Smart Fiscal Year
 * 集成示例：交易管理页面使用智能财年选择器
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Space,
  Typography,
  Button,
  Select,
  DatePicker,
  Alert
} from 'antd';
import {
  BarChartOutlined,
  CalendarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import SmartFiscalYearSelector from '../components/SmartFiscalYearSelector';
import { 
  FiscalYearPeriod 
} from '../types/fiscalYear';
import { smartFiscalYearService } from '../services/smartFiscalYearService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * 示例：如何在现有页面中集成智能财年选择器
 * 这个组件展示了如何将智能财年选择器集成到现有的交易管理页面中
 */
const TransactionManagementWithFiscalYear: React.FC = () => {
  const [statisticsType, setStatisticsType] = useState<'fiscal' | 'calendar'>('fiscal');
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalYearPeriod | null>(null);
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  useEffect(() => {
    // 初始化财年服务
    const defaultConfig = {
      id: 'jci-kl-fy',
      name: 'JCI KL 财年',
      startMonth: 10,
      startDay: 1,
      isActive: true,
      isDefault: true,
      description: 'JCI KL 财年从每年10月1日开始',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system'
    };

    smartFiscalYearService.setConfig(defaultConfig);
  }, []);

  const handleFiscalYearChange = (period: FiscalYearPeriod) => {
    setSelectedPeriod(period);
    console.log('Selected fiscal year period:', period);
  };

  const handleStatisticsTypeChange = (type: 'fiscal' | 'calendar') => {
    setStatisticsType(type);
    console.log('Statistics type changed to:', type);
  };

  const handleCustomDateRangeChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    setCustomDateRange(dates);
    console.log('Custom date range:', dates);
  };

  const getCurrentDateRange = () => {
    if (statisticsType === 'fiscal' && selectedPeriod) {
      return `${selectedPeriod.startDate} 至 ${selectedPeriod.endDate}`;
    } else if (customDateRange) {
      return `${customDateRange[0].format('YYYY-MM-DD')} 至 ${customDateRange[1].format('YYYY-MM-DD')}`;
    }
    return '未选择日期范围';
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        交易管理 - 智能财年集成示例
      </Title>

      <Row gutter={24}>
        {/* 左侧：智能财年选择器 */}
        <Col span={8}>
          <SmartFiscalYearSelector
            onFiscalYearChange={handleFiscalYearChange}
            onStatisticsTypeChange={handleStatisticsTypeChange}
            defaultStatisticsType={statisticsType}
            showSuggestions={true}
            showProgress={true}
          />

          {/* 自定义日期范围选择器 */}
          <Card title="自定义日期范围" size="small" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">选择自定义日期范围进行统计</Text>
              <RangePicker
                value={customDateRange}
                onChange={handleCustomDateRangeChange}
                style={{ width: '100%' }}
                placeholder={['开始日期', '结束日期']}
              />
            </Space>
          </Card>
        </Col>

        {/* 右侧：统计结果 */}
        <Col span={16}>
          <Card title="统计结果">
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 当前选择显示 */}
              <Alert
                message="当前统计设置"
                description={
                  <Space direction="vertical">
                    <Text>
                      统计类型: <Text strong>{statisticsType === 'fiscal' ? '财年' : '自然年'}</Text>
                    </Text>
                    <Text>
                      日期范围: <Text strong>{getCurrentDateRange()}</Text>
                    </Text>
                    {selectedPeriod && (
                      <Text>
                        财年进度: <Text strong>{selectedPeriod.progressPercentage}%</Text>
                        {selectedPeriod.isCurrent && (
                          <Text type="secondary"> (剩余 {selectedPeriod.daysRemaining} 天)</Text>
                        )}
                      </Text>
                    )}
                  </Space>
                }
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
              />

              {/* 模拟统计卡片 */}
              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                        RM 125,430
                      </div>
                      <Text type="secondary">总收入</Text>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                        RM 98,750
                      </div>
                      <Text type="secondary">总支出</Text>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        RM 26,680
                      </div>
                      <Text type="secondary">净收入</Text>
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 操作按钮 */}
              <Space>
                <Button type="primary" icon={<BarChartOutlined />}>
                  生成报告
                </Button>
                <Button icon={<CalendarOutlined />}>
                  导出数据
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 使用说明 */}
      <Card title="集成说明" style={{ marginTop: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>如何在现有页面中集成智能财年选择器：</Text>
          <ol>
            <li>
              <Text>导入组件：</Text>
              <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
{`import SmartFiscalYearSelector from '../components/SmartFiscalYearSelector';
import { FiscalYearPeriod } from '../types/fiscalYear';
import { smartFiscalYearService } from '../services/smartFiscalYearService';`}
              </pre>
            </li>
            <li>
              <Text>初始化财年服务：</Text>
              <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
{`useEffect(() => {
  const config = { /* 财年配置 */ };
  smartFiscalYearService.setConfig(config);
}, []);`}
              </pre>
            </li>
            <li>
              <Text>添加事件处理：</Text>
              <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
{`const handleFiscalYearChange = (period: FiscalYearPeriod) => {
  // 处理财年变化
  setSelectedPeriod(period);
  // 重新加载数据
};`}
              </pre>
            </li>
            <li>
              <Text>在JSX中使用组件：</Text>
              <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
{`<SmartFiscalYearSelector
  onFiscalYearChange={handleFiscalYearChange}
  onStatisticsTypeChange={handleStatisticsTypeChange}
  showSuggestions={true}
  showProgress={true}
/>`}
              </pre>
            </li>
          </ol>
        </Space>
      </Card>
    </div>
  );
};

export default TransactionManagementWithFiscalYear;
