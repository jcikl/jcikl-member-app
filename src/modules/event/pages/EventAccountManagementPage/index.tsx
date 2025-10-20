/**
 * Event Account Management Page
 * 活动账户管理页面
 * 
 * 支持活动财务追踪、收入支出管理、财务预测
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Select,
  Space,
  Tag,
  message,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  Progress,
  DatePicker,
  Radio,
  InputNumber,
  Alert,
  Tabs,
  Input,
} from 'antd';
import {
  ReloadOutlined,
  DollarOutlined,
  LineChartOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { globalSystemService } from '@/config/globalSystemSettings';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ActivityFinancialPlan from '../../components/ActivityFinancialPlan';
import BankTransactionList from '../../components/BankTransactionList';
import AccountConsolidation from '../../components/AccountConsolidation';
import {
  getOrCreateEventAccount,
  addEventAccountTransaction,
  updateEventAccountBudget,
  getEventAccountTransactions,
} from '../../services/eventAccountService';
import { getEvents } from '../../services/eventService';
import { 
  getEventAccountPlans, 
  addEventAccountPlan,
  updateEventAccountPlan,
  deleteEventAccountPlan,
} from '../../services/eventAccountPlanService';
import { getTransactionsByEventId } from '@/modules/finance/services/transactionService';
import type {
  EventAccount,
  EventAccountTransactionType,
  Event,
} from '../../types';
import {
  EVENT_INCOME_CATEGORIES,
  EVENT_EXPENSE_CATEGORIES,
} from '../../types';
import type { FinancialPlanItem } from '../../components/ActivityFinancialPlan';
import type { BankTransaction } from '../../components/BankTransactionList';
import type { ConsolidationData, CategoryComparison } from '../../components/AccountConsolidation';
import './styles.css';

const { Option } = Select;

interface TransactionRecord {
  id: string;
  sn: number;
  transactionDate: string;
  transactionType: EventAccountTransactionType;
  category: string;
  description: string;
  remark: string;
  amount: number;
  paymentDate: string;
  payerPayee?: string;
  isForecast: boolean;
  forecastConfidence?: 'high' | 'medium' | 'low';
  actualAmount?: number;
  variance?: number;
  createdAt: string;
  updatedAt: string;
}

const EventAccountManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [account, setAccount] = useState<EventAccount | null>(null);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [budgetForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'actual' | 'forecast' | 'all'>('all');
  const [financialRecords, setFinancialRecords] = useState<TransactionRecord[]>([]);
  
  // 新增：财务计划相关状态
  const [planItems, setPlanItems] = useState<FinancialPlanItem[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [consolidationData, setConsolidationData] = useState<ConsolidationData | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventAccount();
    }
  }, [selectedEventId]);

  // 加载财务计划和交易记录
  useEffect(() => {
    console.log('🔍 [useEffect] Triggered for plans and transactions', {
      hasAccount: !!account,
      accountId: account?.id,
      selectedEventId,
    });
    
    if (account && selectedEventId) {
      console.log('✅ [useEffect] Conditions met, loading data...');
      loadPlans();
      loadBankTransactions();
    } else {
      console.log('⚠️ [useEffect] Conditions not met', {
        hasAccount: !!account,
        hasSelectedEventId: !!selectedEventId,
      });
    }
  }, [account, selectedEventId]);

  // 自动计算对比数据
  useEffect(() => {
    if (planItems.length > 0 || bankTransactions.length > 0) {
      calculateConsolidation();
    }
  }, [planItems, bankTransactions]);

  const loadEvents = async () => {
    try {
      const result = await getEvents({ 
        page: 1, 
        limit: 1000,
        // Remove default sorting to avoid index issues
      });
      console.log('✅ Loaded events:', result.data.length);
      
      const activeEvents = result.data.filter((e: Event) => e.status !== 'Cancelled');
      setEvents(activeEvents);
      
      if (activeEvents.length > 0) {
        setSelectedEventId(activeEvents[0].id);
      } else {
        message.warning('暂无活动数据，请先创建活动');
      }
    } catch (error: any) {
      console.error('❌ Failed to load events:', error);
      message.error(`加载活动列表失败: ${error.message || '未知错误'}`);
      globalSystemService.log(
        'error',
        'Failed to load events',
        'EventAccountManagementPage.loadEvents',
        { error: error.message }
      );
    }
  };

  const loadEventAccount = async () => {
    if (!user || !selectedEventId) return;

    try {
      setLoading(true);

      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (!selectedEvent) return;

      const accountData = await getOrCreateEventAccount(
        selectedEventId,
        selectedEvent.name,
        user.id
      );

      setAccount(accountData);
      
      // Load financial records
      await loadFinancialRecords();

    } catch (error: any) {
      message.error('加载活动账户失败');
      globalSystemService.log(
        'error',
        'Failed to load event account',
        'EventAccountManagementPage.loadEventAccount',
        { error: error.message, eventId: selectedEventId }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (values: any) => {
    if (!user || !account) return;

    try {
      const transactionDate = values.transactionDate 
        ? values.transactionDate.toDate() 
        : new Date();

      await addEventAccountTransaction(
        account.id,
        {
          transactionDate,
          transactionType: values.transactionType,
          category: values.category,
          description: values.description,
          amount: values.amount,
          payerPayee: values.payerPayee,
          paymentMethod: values.paymentMethod,
          notes: values.notes,
          isForecast: values.isForecast || false,
          forecastConfidence: values.forecastConfidence,
        },
        user.id
      );

      message.success('交易已添加');
      setTransactionModalVisible(false);
      form.resetFields();
      loadEventAccount();
    } catch (error: any) {
      message.error('添加交易失败');
    }
  };

  const handleUpdateBudget = async (values: any) => {
    if (!user || !account) return;

    try {
      await updateEventAccountBudget(
        account.id,
        {
          budgetIncome: values.budgetIncome,
          budgetExpense: values.budgetExpense,
          targetProfit: values.targetProfit,
          notes: values.notes,
        },
        user.id
      );

      message.success('预算已更新');
      setBudgetModalVisible(false);
      loadEventAccount();
    } catch (error: any) {
      message.error('更新预算失败');
    }
  };

  const loadFinancialRecords = async () => {
    if (!account) return;

    try {
      const records = await getEventAccountTransactions(account.id);
      // Convert EventAccountTransaction to TransactionRecord
      const convertedRecords: TransactionRecord[] = records.map((record, index) => ({
        id: record.id,
        sn: index + 1,
        transactionDate: record.transactionDate,
        transactionType: record.transactionType,
        category: record.category,
        description: record.description,
        remark: record.remark || '',
        amount: record.amount,
        paymentDate: record.paymentDate || record.transactionDate,
        payerPayee: record.payerPayee,
        isForecast: record.isForecast,
        forecastConfidence: record.forecastConfidence,
        actualAmount: record.actualAmount,
        variance: record.variance,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));
      setFinancialRecords(convertedRecords);
    } catch (error: any) {
      console.error('Failed to load financial records:', error);
      globalSystemService.logError(error, {
        operation: 'loadFinancialRecords',
        eventId: selectedEventId,
      });
      message.error('加载财务记录失败');
      setFinancialRecords([]);
    }
  };

  // 加载财务计划
  const loadPlans = async () => {
    if (!account) return;
    
    try {
      setPlanLoading(true);
      const plans = await getEventAccountPlans(account.id);
      setPlanItems(plans);
    } catch (error) {
      message.error('加载财务计划失败');
      console.error(error);
    } finally {
      setPlanLoading(false);
    }
  };

  // 加载银行交易记录
  const loadBankTransactions = async () => {
    console.log('🔍 [loadBankTransactions] Starting...', { selectedEventId });
    
    if (!selectedEventId) {
      console.log('⚠️ [loadBankTransactions] No selectedEventId, skipping');
      return;
    }
    
    try {
      // 🔄 正确的查询逻辑：
      // 1. 读取 projects collection 的 financialAccount 字段
      // 2. 使用 financialAccount 匹配 fin_transactions 的 relatedEventId
      const selectedEvent = events.find(e => e.id === selectedEventId);
      const financialAccountId = selectedEvent?.financialAccount;
      
      console.log('🔍 [loadBankTransactions] Event financial account:', {
        eventId: selectedEventId,
        eventName: selectedEvent?.name,
        financialAccount: financialAccountId,
      });
      
      if (!financialAccountId) {
        console.log('⚠️ [loadBankTransactions] Event has no financialAccount, no transactions to display');
        setBankTransactions([]);
        return;
      }
      
      // 使用 financialAccount 查询 relatedEventId
      const transactions = await getTransactionsByEventId(financialAccountId);
      console.log('✅ [loadBankTransactions] Loaded transactions:', {
        count: transactions.length,
        queryField: 'relatedEventId',
        queryValue: financialAccountId,
      });
      
      if (transactions.length === 0) {
        console.log('ℹ️ [loadBankTransactions] No transactions found');
        setBankTransactions([]);
        return;
      }
      
      // 转换为 BankTransaction 格式
      const bankTxns: BankTransaction[] = transactions.map(txn => ({
        id: txn.id,
        transactionDate: txn.transactionDate,
        transactionNumber: txn.transactionNumber,
        transactionType: txn.transactionType as 'income' | 'expense',
        description: txn.mainDescription,
        amount: txn.amount,
        bankAccount: txn.bankAccountId,
        status: txn.status === 'completed' ? 'verified' : 'pending',
        category: txn.confirmedCategory || txn.autoMatchedCategory || txn.category,
        payerPayee: txn.payerPayee,
        paymentMethod: txn.paymentMethod,
        receiptNumber: txn.receiptNumber,
        invoiceNumber: txn.invoiceNumber,
        createdAt: txn.createdAt,
      }));
      
      console.log('🔄 [loadBankTransactions] Converted to BankTransaction format:', {
        count: bankTxns.length,
      });
      
      setBankTransactions(bankTxns);
      console.log('✅ [loadBankTransactions] State updated');
    } catch (error) {
      console.error('❌ [loadBankTransactions] Failed to load bank transactions:', error);
      setBankTransactions([]);
    }
  };

  // 计算对比数据
  const calculateConsolidation = () => {
    if (planItems.length === 0 && bankTransactions.length === 0) {
      setConsolidationData(null);
      return;
    }
    
    // 按类别分组计算
    const incomeComparison = calculateCategoryComparison(
      planItems.filter(p => p.type === 'income'),
      bankTransactions.filter(t => t.transactionType === 'income')
    );
    
    const expenseComparison = calculateCategoryComparison(
      planItems.filter(p => p.type === 'expense'),
      bankTransactions.filter(t => t.transactionType === 'expense')
    );
    
    const totalIncomeForecast = planItems
      .filter(p => p.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalIncomeActual = bankTransactions
      .filter(t => t.transactionType === 'income')
      .reduce((sum, txn) => sum + txn.amount, 0);
    
    const totalExpenseForecast = planItems
      .filter(p => p.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalExpenseActual = bankTransactions
      .filter(t => t.transactionType === 'expense')
      .reduce((sum, txn) => sum + txn.amount, 0);
    
    setConsolidationData({
      incomeComparison,
      expenseComparison,
      totalIncomeForecast,
      totalIncomeActual,
      totalExpenseForecast,
      totalExpenseActual,
      profitForecast: totalIncomeForecast - totalExpenseForecast,
      profitActual: totalIncomeActual - totalExpenseActual,
    });
  };

  // 按类别对比计算
  const calculateCategoryComparison = (
    planItems: FinancialPlanItem[],
    transactions: BankTransaction[]
  ): CategoryComparison[] => {
    const categories = Array.from(new Set([
      ...planItems.map(p => p.category),
      ...transactions.map(t => t.category).filter(Boolean) as string[],
    ]));
    
    return categories.map(category => {
      const forecast = planItems
        .filter(p => p.category === category)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const actual = transactions
        .filter(t => t.category === category)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const variance = actual - forecast;
      const percentage = forecast > 0 ? (actual / forecast) * 100 : 0;
      
      let status: 'completed' | 'partial' | 'pending' | 'exceeded';
      if (actual === 0) {
        status = 'pending';
      } else if (actual >= forecast) {
        status = 'exceeded';
      } else if (percentage >= 100) {
        status = 'completed';
      } else if (percentage >= 50) {
        status = 'partial';
      } else {
        status = 'pending';
      }
      
      return {
        category: category || 'uncategorized',
        categoryLabel: category || '未分类',
        forecast,
        actual,
        variance,
        percentage,
        status,
      };
    });
  };

  // CRUD Handlers for Financial Plans
  const handleAddPlan = async (item: Omit<FinancialPlanItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!account || !user) return;
    await addEventAccountPlan(account.id, item, user.id);
    await loadPlans();
  };

  const handleUpdatePlan = async (id: string, updates: Partial<FinancialPlanItem>) => {
    if (!user) return;
    await updateEventAccountPlan(id, updates, user.id);
    await loadPlans();
  };

  const handleDeletePlan = async (id: string) => {
    if (!user) return;
    await deleteEventAccountPlan(id, user.id);
    await loadPlans();
  };

  const filteredTransactions = financialRecords.filter((t: TransactionRecord) => {
    if (activeTab === 'actual') return !t.isForecast;
    if (activeTab === 'forecast') return t.isForecast;
    return true;
  });

  const columns: ColumnsType<TransactionRecord> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date: string) =>
        globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '类型',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 80,
      render: (type: EventAccountTransactionType) => (
        <Tag color={type === 'income' ? 'green' : 'red'}>
          {type === 'income' ? '收入' : '支出'}
        </Tag>
      ),
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const allCategories = [...EVENT_INCOME_CATEGORIES, ...EVENT_EXPENSE_CATEGORIES];
        const option = allCategories.find(opt => opt.value === category);
        return option?.label || category;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number, record) => (
        <span style={{ 
          fontWeight: 500,
          color: record.transactionType === 'income' ? '#52c41a' : '#ff4d4f',
        }}>
          RM {amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: '实际/预测',
      key: 'forecast',
      width: 100,
      render: (_, record) => (
        record.isForecast ? (
          <Tag color="orange">预测</Tag>
        ) : (
          <Tag color="blue">实际</Tag>
        )
      ),
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!account) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="请选择活动"
          description="请从下拉列表中选择一个活动以查看其财务账户"
          type="info"
          showIcon
        />
      </div>
    );
  }

  const incomeProgress = account.budgetIncome > 0
    ? (account.actualIncome / account.budgetIncome) * 100
    : 0;
  
  const expenseProgress = account.budgetExpense > 0
    ? (account.actualExpense / account.budgetExpense) * 100
    : 0;

  return (
    <ErrorBoundary>
      <div className="event-account-management-page">
        <PageHeader
          title="活动账户管理"
          subtitle="Event Account Management"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '活动管理', path: '/events' },
            { title: '活动账户' },
          ]}
          extra={
            <Space>
              <Select
                style={{ width: 250 }}
                value={selectedEventId}
                onChange={setSelectedEventId}
                placeholder="选择活动"
              >
                {events.map(event => (
                  <Option key={event.id} value={event.id}>
                    {event.name}
                  </Option>
                ))}
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadEventAccount}
              >
                刷新
              </Button>
            </Space>
          }
        />

        {/* Overview Cards */}
        <div className="mb-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card title="💰 预算目标">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Statistic
                    title="收入目标"
                    value={account.budgetIncome}
                    precision={2}
                    prefix="RM"
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Statistic
                    title="支出目标"
                    value={account.budgetExpense}
                    precision={2}
                    prefix="RM"
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                  <Statistic
                    title="目标利润"
                    value={account.targetProfit}
                    precision={2}
                    prefix="RM"
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Button
                    type="primary"
                    block
                    onClick={() => {
                      budgetForm.setFieldsValue({
                        budgetIncome: account.budgetIncome,
                        budgetExpense: account.budgetExpense,
                        targetProfit: account.targetProfit,
                      });
                      setBudgetModalVisible(true);
                    }}
                  >
                    更新预算
                  </Button>
                </Space>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card title="📊 实际数据">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div>
                    <Statistic
                      title="实际收入"
                      value={account.actualIncome}
                      precision={2}
                      prefix="RM"
                      valueStyle={{ color: '#52c41a' }}
                    />
                    <Progress
                      percent={Number(incomeProgress.toFixed(0))}
                      status={incomeProgress >= 100 ? 'success' : 'active'}
                      size="small"
                    />
                  </div>
                  <div>
                    <Statistic
                      title="实际支出"
                      value={account.actualExpense}
                      precision={2}
                      prefix="RM"
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                    <Progress
                      percent={Number(expenseProgress.toFixed(0))}
                      status={expenseProgress > 100 ? 'exception' : 'active'}
                      size="small"
                    />
                  </div>
                  <Statistic
                    title="实际利润"
                    value={account.actualProfit}
                    precision={2}
                    prefix="RM"
                    valueStyle={{
                      color: account.actualProfit >= 0 ? '#52c41a' : '#ff4d4f',
                    }}
                  />
                </Space>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card title="🔮 财务预测">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Statistic
                    title="预测收入"
                    value={account.forecastIncome}
                    precision={2}
                    prefix="RM"
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Statistic
                    title="预测支出"
                    value={account.forecastExpense}
                    precision={2}
                    prefix="RM"
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                  <Statistic
                    title="预测利润"
                    value={account.forecastProfit}
                    precision={2}
                    prefix="RM"
                    valueStyle={{
                      color: account.forecastProfit >= 0 ? '#52c41a' : '#ff4d4f',
                    }}
                  />
                </Space>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Transaction Management */}
        <Card title="交易管理">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'actual' | 'forecast' | 'all')}
            items={[
              {
                key: 'all',
                label: '全部',
                children: (
                  <Table
                    {...tableConfig}
                    columns={columns}
                    dataSource={filteredTransactions}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条交易`,
                    }}
                  />
                ),
              },
              {
                key: 'actual',
                label: (
                  <span>
                    <DollarOutlined /> 实际
                  </span>
                ),
                children: (
                  <Table
                    {...tableConfig}
                    columns={columns}
                    dataSource={filteredTransactions}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条交易`,
                    }}
                  />
                ),
              },
              {
                key: 'forecast',
                label: (
                  <span>
                    <LineChartOutlined /> 预测
                  </span>
                ),
                children: (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {/* 1. 活动财务计划 */}
                    <ActivityFinancialPlan
                      accountId={account?.id || ''}
                      items={planItems}
                      loading={planLoading}
                      onAdd={handleAddPlan}
                      onUpdate={handleUpdatePlan}
                      onDelete={handleDeletePlan}
                      onRefresh={loadPlans}
                    />
                    
                    {/* 2. 银行交易记录 */}
                    <BankTransactionList
                      accountId={account?.id || ''}
                      transactions={bankTransactions}
                      loading={loading}
                      onRefresh={loadBankTransactions}
                      onExport={() => message.info('导出功能开发中...')}
                    />
                    
                    {/* 3. 户口核对 */}
                    {consolidationData && (
                      <AccountConsolidation
                        data={consolidationData}
                        loading={loading}
                        onExport={() => message.info('导出功能开发中...')}
                        onGenerateReport={() => message.info('报表生成功能开发中...')}
                      />
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        {/* Add Transaction Modal */}
        <Modal
          title="添加交易"
          open={transactionModalVisible}
          onOk={() => form.submit()}
          onCancel={() => {
            setTransactionModalVisible(false);
            form.resetFields();
          }}
          okText="添加"
          cancelText="取消"
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddTransaction}
            initialValues={{
              transactionDate: dayjs(),
              transactionType: 'income',
              isForecast: false,
            }}
          >
            <Form.Item
              name="transactionDate"
              label="交易日期"
              rules={[{ required: true, message: '请选择日期' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD-MMM-YYYY" />
            </Form.Item>

            <Form.Item
              name="transactionType"
              label="交易类型"
              rules={[{ required: true, message: '请选择类型' }]}
            >
              <Radio.Group>
                <Radio value="income">
                  <RiseOutlined style={{ color: '#52c41a' }} /> 收入
                </Radio>
                <Radio value="expense">
                  <FallOutlined style={{ color: '#ff4d4f' }} /> 支出
                </Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.transactionType !== currentValues.transactionType
              }
            >
              {({ getFieldValue }) => {
                const transactionType = getFieldValue('transactionType');
                const categories =
                  transactionType === 'income'
                    ? EVENT_INCOME_CATEGORIES
                    : EVENT_EXPENSE_CATEGORIES;

                return (
                  <Form.Item
                    name="category"
                    label="类别"
                    rules={[{ required: true, message: '请选择类别' }]}
                  >
                    <Select placeholder="选择类别">
                      {categories.map(opt => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }}
            </Form.Item>

            <Form.Item
              name="description"
              label="描述"
              rules={[{ required: true, message: '请输入描述' }]}
            >
              <Input placeholder="请输入交易描述" />
            </Form.Item>

            <Form.Item
              name="amount"
              label="金额"
              rules={[{ required: true, message: '请输入金额' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="RM"
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item name="payerPayee" label="付款人/收款人">
              <Input placeholder="请输入付款人或收款人名称" />
            </Form.Item>

            <Form.Item name="isForecast" label="数据类型" valuePropName="checked">
              <Radio.Group>
                <Radio value={false}>实际数据</Radio>
                <Radio value={true}>预测数据</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.isForecast !== currentValues.isForecast
              }
            >
              {({ getFieldValue }) =>
                getFieldValue('isForecast') && (
                  <Form.Item name="forecastConfidence" label="预测置信度">
                    <Select placeholder="选择置信度">
                      <Option value="high">高</Option>
                      <Option value="medium">中</Option>
                      <Option value="low">低</Option>
                    </Select>
                  </Form.Item>
                )
              }
            </Form.Item>

            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={3} placeholder="备注信息" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Update Budget Modal */}
        <Modal
          title="更新预算"
          open={budgetModalVisible}
          onOk={() => budgetForm.submit()}
          onCancel={() => setBudgetModalVisible(false)}
          okText="更新"
          cancelText="取消"
        >
          <Form form={budgetForm} layout="vertical" onFinish={handleUpdateBudget}>
            <Form.Item
              name="budgetIncome"
              label="收入预算"
              rules={[{ required: true, message: '请输入收入预算' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="RM"
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item
              name="budgetExpense"
              label="支出预算"
              rules={[{ required: true, message: '请输入支出预算' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="RM"
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item
              name="targetProfit"
              label="目标利润"
              rules={[{ required: true, message: '请输入目标利润' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                prefix="RM"
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={3} placeholder="备注信息" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default EventAccountManagementPage;

