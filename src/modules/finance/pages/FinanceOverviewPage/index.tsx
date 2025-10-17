/**
 * Finance Overview Page
 * 财务概览页面 - 统一财务管理入口
 * 
 * Displays comprehensive financial overview with tabbed interface for:
 * - Overview (概览)
 * - Member Fees (会员费用)
 * - Event Finance (活动财务)
 * - General Accounts (日常账户)
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Card, Row, Col, Statistic, Button, DatePicker, message, Table, Tag, Tabs } from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  WalletOutlined,
  FileTextOutlined,
  TeamOutlined,
  CalendarOutlined,
  BankOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Dayjs } from 'dayjs';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getTransactions, getTransactionStatistics } from '../../services/transactionService';
import { getMemberFeeStatistics } from '../../services/memberFeeService';
import { getTotalBalance } from '../../services/bankAccountService';
import type { Transaction, FinancialStatistics } from '../../types';
import './styles.css';

// Lazy load tab components
const MemberFeeManagementPage = lazy(() => import('../MemberFeeManagementPage'));
const EventFinancialPage = lazy(() => import('../EventFinancialPage'));
const GeneralAccountsPage = lazy(() => import('../GeneralAccountsPage'));

const { RangePicker } = DatePicker;

type PeriodType = 'fiscal' | 'calendar' | 'custom';
type TabKey = 'overview' | 'member-fees' | 'event-finance' | 'general-accounts';

const FinanceOverviewPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<FinancialStatistics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [periodType, setPeriodType] = useState<PeriodType>('fiscal');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (activeTab === 'overview') {
      loadFinancialData();
    }
  }, [periodType, dateRange, activeTab]);

  const loadFinancialData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Determine date range based on period type
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (periodType === 'fiscal') {
        // Use fiscal year date range (Oct 1 - Sep 30)
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        const fyYear = month >= 10 ? year : year - 1;
        startDate = `${fyYear}-10-01`;
        endDate = `${fyYear + 1}-09-30`;
      } else if (periodType === 'calendar') {
        const year = new Date().getFullYear();
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      } else if (periodType === 'custom' && dateRange) {
        startDate = globalDateService.formatDate(dateRange[0].toDate(), 'api');
        endDate = globalDateService.formatDate(dateRange[1].toDate(), 'api');
      }

      // Load statistics
      const [
        transactionStats,
        memberFeeStats,
        totalBalance,
      ] = await Promise.all([
        getTransactionStatistics(startDate, endDate),
        getMemberFeeStatistics(),
        getTotalBalance(),
      ]);

      // Compile statistics
      const compiledStats: FinancialStatistics = {
        totalBalance,
        totalIncome: transactionStats.totalIncome,
        totalExpense: transactionStats.totalExpense,
        netIncome: transactionStats.netIncome,
        
        memberFeesCollected: memberFeeStats.totalCollected,
        memberFeesOutstanding: memberFeeStats.totalOutstanding,
        memberFeesTotal: memberFeeStats.totalExpected,
        
        eventRevenue: 0, // Will be calculated from event transactions when implemented
        eventExpense: 0,
        eventNetIncome: 0,
        
        generalOperationIncome: transactionStats.totalIncome - memberFeeStats.totalCollected,
        generalOperationExpense: transactionStats.totalExpense,
        
        pendingTransactions: 0, // Will be calculated from transactions
        pendingAmount: 0,
        
        upcomingObligations: 0, // Will be calculated from pending payments when implemented
        
        transactionCount: transactionStats.transactionCount,
        
        periodStart: startDate || '',
        periodEnd: endDate || '',
        
        lastUpdated: new Date().toISOString(),
      };

      setStatistics(compiledStats);

      // Load recent transactions
      const transactionsResult = await getTransactions({
        page: 1,
        limit: 10,
        sortBy: 'transactionDate',
        sortOrder: 'desc',
        startDate,
        endDate,
      });

      setRecentTransactions(transactionsResult.data);

    } catch (error: any) {
      message.error('加载财务数据失败');
      console.error('[Finance] Failed to load financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value: PeriodType) => {
    setPeriodType(value);
    if (value !== 'custom') {
      setDateRange(null);
    }
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
      setPeriodType('custom');
    } else {
      setDateRange(null);
    }
  };

  // Transaction table columns
  const columns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date: string) => globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '交易编号',
      dataIndex: 'transactionNumber',
      key: 'transactionNumber',
      width: 160,
    },
    {
      title: '描述',
      dataIndex: 'mainDescription',
      key: 'mainDescription',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'income' ? 'green' : 'red'}>
          {type === 'income' ? '收入' : '支出'}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number, record: Transaction) => (
        <span className={record.transactionType === 'income' ? 'text-success' : 'text-danger'}>
          {record.transactionType === 'income' ? '+' : '-'}RM {amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          completed: { color: 'success', text: '已完成' },
          pending: { color: 'warning', text: '待审核' },
          cancelled: { color: 'default', text: '已取消' },
          rejected: { color: 'error', text: '已拒绝' },
        };
        const config = statusConfig[status] || statusConfig.pending;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  // Overview Tab Content
  const renderOverviewTab = () => {
    if (loading) {
      return <LoadingSpinner />;
    }

    if (!statistics) {
      return (
        <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
          <p>无法加载财务数据</p>
        </div>
      );
    }

    return (
      <div>
        {/* Period Selection */}
        <Card className="mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                type={periodType === 'fiscal' ? 'primary' : 'default'}
                onClick={() => handlePeriodChange('fiscal')}
              >
                财年
              </Button>
              <Button
                type={periodType === 'calendar' ? 'primary' : 'default'}
                onClick={() => handlePeriodChange('calendar')}
              >
                日历年
              </Button>
              <Button
                type={periodType === 'custom' ? 'primary' : 'default'}
                onClick={() => handlePeriodChange('custom')}
              >
                自定义范围
              </Button>
            </div>

            {periodType === 'custom' && (
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="DD-MMM-YYYY"
              />
            )}
          </div>
        </Card>

        {/* Financial Overview Cards */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">财务概览</h2>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总余额"
                  value={statistics.totalBalance}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#3f8600' }}
                  suffix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="会员费已收"
                  value={statistics.memberFeesCollected}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#10b981' }}
                  suffix={<RiseOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="活动收入"
                  value={statistics.eventRevenue}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#10b981' }}
                  suffix={<WalletOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="日常运营"
                  value={statistics.generalOperationExpense}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#333' }}
                  suffix={<FileTextOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Activity Overview Cards */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">活动概览</h2>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="待处理付款"
                  value={statistics.memberFeesOutstanding}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="本期汇总"
                  value={statistics.netIncome}
                  precision={2}
                  valueStyle={{ color: statistics.netIncome >= 0 ? '#10b981' : '#ef4444' }}
                  formatter={(value) => `${statistics.netIncome >= 0 ? '+' : ''}RM ${value}`}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="即将到期义务"
                  value={statistics.upcomingObligations}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#ef4444' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="快速统计"
                  value={statistics.transactionCount}
                  suffix="笔交易"
                  valueStyle={{ color: '#333' }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Recent Transactions */}
        <Card
          title={
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">最近交易</span>
              <Button type="link" href="/finance/transactions">
                查看全部
              </Button>
            </div>
          }
        >
          <Table
            {...tableConfig}
            columns={columns}
            dataSource={recentTransactions}
            rowKey="id"
            pagination={false}
          />
        </Card>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="finance-overview-page">
        <PageHeader
          title="财务概览"
          subtitle="组织财务状况综合视图"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '财务概览' },
          ]}
        />

        {/* Tabbed Interface */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            items={[
              {
                key: 'overview',
                label: (
                  <span>
                    <FileTextOutlined />
                    概览
                  </span>
                ),
                children: renderOverviewTab(),
              },
              {
                key: 'member-fees',
                label: (
                  <span>
                    <TeamOutlined />
                    会员费用
                  </span>
                ),
                children: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <MemberFeeManagementPage />
                  </Suspense>
                ),
              },
              {
                key: 'event-finance',
                label: (
                  <span>
                    <CalendarOutlined />
                    活动财务
                  </span>
                ),
                children: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <EventFinancialPage />
                  </Suspense>
                ),
              },
              {
                key: 'general-accounts',
                label: (
                  <span>
                    <BankOutlined />
                    日常账户
                  </span>
                ),
                children: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <GeneralAccountsPage />
                  </Suspense>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default FinanceOverviewPage;
