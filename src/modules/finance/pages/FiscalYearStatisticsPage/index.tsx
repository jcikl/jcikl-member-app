/**
 * Fiscal Year Statistics Page
 * 财年统计页面示例 - 简化版
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Space,
  Typography,
  Button,
  Alert
} from 'antd';
import {
  BarChartOutlined,
  DownloadOutlined,
  PrinterOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import SmartFiscalYearSelector from '@/modules/finance/components/SmartFiscalYearSelector';
import { 
  FiscalYearPeriod
} from '@/modules/finance/types/fiscalYear';
import { smartFiscalYearService } from '@/modules/finance/services/smartFiscalYearService';

const { Title, Text } = Typography;

const FiscalYearStatisticsPage: React.FC = () => {
  const [statisticsType, setStatisticsType] = useState<'fiscal' | 'calendar'>('fiscal');
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalYearPeriod | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
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
        updatedAt: new Date().toISOString()
      };

      smartFiscalYearService.setConfig(defaultConfig);
    } catch (error) {
      console.error('Failed to initialize fiscal year service:', error);
    }
  };

  const handleFiscalYearChange = async (period: FiscalYearPeriod) => {
    setSelectedPeriod(period);
    console.log('Selected fiscal year period:', period);
  };

  const handleStatisticsTypeChange = (type: 'fiscal' | 'calendar') => {
    setStatisticsType(type);
    console.log('Statistics type changed to:', type);
  };

  const handleExportReport = () => {
    // 导出报告逻辑
    console.log('Exporting report for period:', selectedPeriod);
  };

  const handlePrintReport = () => {
    // 打印报告逻辑
    window.print();
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        财年统计报告
      </Title>

      <Row gutter={24}>
        {/* 左侧：财年选择器 */}
        <Col span={8}>
          <SmartFiscalYearSelector
            onFiscalYearChange={handleFiscalYearChange}
            onStatisticsTypeChange={handleStatisticsTypeChange}
            defaultStatisticsType={statisticsType}
            showSuggestions={true}
            showProgress={true}
          />
        </Col>

        {/* 右侧：统计卡片 */}
        <Col span={16}>
          {selectedPeriod ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 主要统计卡片 */}
              <Card title={`${selectedPeriod.displayName} 统计报告`}>
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
                          日期范围: <Text strong>{selectedPeriod.startDate} 至 {selectedPeriod.endDate}</Text>
                        </Text>
                        <Text>
                          财年进度: <Text strong>{selectedPeriod.progressPercentage}%</Text>
                          {selectedPeriod.isCurrent && (
                            <Text type="secondary"> (剩余 {selectedPeriod.daysRemaining} 天)</Text>
                          )}
                        </Text>
                      </Space>
                    }
                    type="info"
                    showIcon
                    icon={<CalendarOutlined />}
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
                    <Button icon={<DownloadOutlined />} onClick={handleExportReport}>
                      导出报告
                    </Button>
                    <Button icon={<PrinterOutlined />} onClick={handlePrintReport}>
                      打印报告
                    </Button>
                  </Space>
                </Space>
              </Card>
            </Space>
          ) : (
            <Card>
              <Alert
                message="请选择财年或年份"
                description="使用左侧的选择器选择要查看的财年或年份，系统将自动生成相应的统计报告。"
                type="info"
                showIcon
                icon={<CalendarOutlined />}
              />
            </Card>
          )}
        </Col>
      </Row>

      {/* 使用说明 */}
      <Card title="使用说明" style={{ marginTop: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>财年统计功能说明：</Text>
          <ol>
            <li>
              <Text>选择统计类型：财年统计或自然年统计</Text>
            </li>
            <li>
              <Text>选择具体的财年或年份</Text>
            </li>
            <li>
              <Text>系统将自动显示该期间的财务统计信息</Text>
            </li>
            <li>
              <Text>可以导出报告或打印统计结果</Text>
            </li>
          </ol>
          
          <Alert
            message="注意"
            description="财年统计基于财年配置页面设置的起始月份和日期进行计算。"
            type="info"
            showIcon
          />
        </Space>
      </Card>
    </div>
  );
};

export default FiscalYearStatisticsPage;
