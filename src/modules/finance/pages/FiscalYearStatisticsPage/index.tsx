/**
 * Fiscal Year Statistics Page
 * 财年统计页面示例
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Space,
  Typography,
  Button,
  Spin,
  Alert,
  Divider
} from 'antd';
import {
  BarChartOutlined,
  DownloadOutlined,
  PrinterOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import SmartFiscalYearSelector from '../components/SmartFiscalYearSelector';
import FiscalYearStatisticsCard from '../components/FiscalYearStatisticsCard';
import { 
  FiscalYearPeriod, 
  FiscalYearStatistics 
} from '../types/fiscalYear';
import { smartFiscalYearService } from '../services/smartFiscalYearService';
import { Transaction } from '../types';
import { transactionService } from '../services/transactionService';

const { Title, Text } = Typography;

const FiscalYearStatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statisticsType, setStatisticsType] = useState<'fiscal' | 'calendar'>('fiscal');
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalYearPeriod | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<FiscalYearStatistics | null>(null);
  const [previousStatistics, setPreviousStatistics] = useState<FiscalYearStatistics | null>(null);

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
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system'
      };

      smartFiscalYearService.setConfig(defaultConfig);
    } catch (error) {
      console.error('Failed to initialize fiscal year service:', error);
    }
  };

  const handleFiscalYearChange = async (period: FiscalYearPeriod) => {
    setSelectedPeriod(period);
    await loadTransactionsForPeriod(period);
  };

  const handleStatisticsTypeChange = (type: 'fiscal' | 'calendar') => {
    setStatisticsType(type);
  };

  const loadTransactionsForPeriod = async (period: FiscalYearPeriod) => {
    setLoading(true);
    try {
      // 获取指定期间的交易数据
      const result = await transactionService.getTransactions({
        startDate: period.startDate,
        endDate: period.endDate,
        limit: 10000 // 获取所有交易
      });

      setTransactions(result.data);

      // 计算统计信息
      const stats = await smartFiscalYearService.calculateFiscalYearStatistics(period, result.data);
      setStatistics(stats);

      // 如果是财年，尝试获取上一财年的数据用于对比
      if (statisticsType === 'fiscal') {
        try {
          const previousYear = period.year - 1;
          const previousPeriod = smartFiscalYearService.detectFiscalYearPeriod(previousYear);
          const previousResult = await transactionService.getTransactions({
            startDate: previousPeriod.startDate,
            endDate: previousPeriod.endDate,
            limit: 10000
          });
          
          const prevStats = await smartFiscalYearService.calculateFiscalYearStatistics(
            previousPeriod, 
            previousResult.data
          );
          setPreviousStatistics(prevStats);
        } catch (error) {
          console.warn('Failed to load previous year data:', error);
          setPreviousStatistics(null);
        }
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
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
          {loading ? (
            <Card>
              <Spin size="large" style={{ width: '100%', textAlign: 'center', padding: '40px' }} />
            </Card>
          ) : selectedPeriod ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 主要统计卡片 */}
              <FiscalYearStatisticsCard
                period={selectedPeriod}
                transactions={transactions}
                loading={loading}
                showDetails={true}
                showComparison={statisticsType === 'fiscal'}
                previousPeriodStats={previousStatistics || undefined}
              />

              {/* 操作按钮 */}
              <Card size="small">
                <Space>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={handleExportReport}
                  >
                    导出报告
                  </Button>
                  <Button 
                    icon={<PrinterOutlined />}
                    onClick={handlePrintReport}
                  >
                    打印报告
                  </Button>
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

      {/* 详细统计信息 */}
      {statistics && selectedPeriod && (
        <Card title="详细统计信息" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                    {statistics.totalTransactions}
                  </div>
                  <Text type="secondary">总交易笔数</Text>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                    {Math.round(statistics.totalIncome / statistics.totalTransactions || 0)}
                  </div>
                  <Text type="secondary">平均交易金额 (RM)</Text>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                    {Math.round(statistics.totalTransactions / 12)}
                  </div>
                  <Text type="secondary">月均交易笔数</Text>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                    {statistics.completionRate}%
                  </div>
                  <Text type="secondary">财年完成率</Text>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default FiscalYearStatisticsPage;
