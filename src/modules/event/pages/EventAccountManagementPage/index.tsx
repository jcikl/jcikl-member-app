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
  Divider,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
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
import {
  getOrCreateEventAccount,
  addEventAccountTransaction,
  updateEventAccountBudget,
} from '../../services/eventAccountService';
import { getEvents } from '../../services/eventService';
import type {
  EventAccount,
  EventAccountTransactionType,
  Event,
} from '../../types';
import {
  EVENT_INCOME_CATEGORIES,
  EVENT_EXPENSE_CATEGORIES,
} from '../../types';
import './styles.css';

const { Option } = Select;

interface TransactionRecord {
  id: string;
  transactionDate: string;
  transactionType: EventAccountTransactionType;
  category: string;
  description: string;
  amount: number;
  payerPayee?: string;
  isForecast: boolean;
  forecastConfidence?: 'high' | 'medium' | 'low';
  actualAmount?: number;
  variance?: number;
}

interface BulkTransactionItem {
  sn: number;
  description: string;
  remark: string;
  amount: number;
  payerPayee?: string;
}

const EventAccountManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [account, setAccount] = useState<EventAccount | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [bulkTransactionModalVisible, setBulkTransactionModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [budgetForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'actual' | 'forecast' | 'all'>('all');
  const [bulkTransactionItems, setBulkTransactionItems] = useState<BulkTransactionItem[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventAccount();
    }
  }, [selectedEventId]);

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
      
      // Extract transactions from account
      // Note: In production, these should be stored in a sub-collection
      // For now, we'll use mock data
      setTransactions([]);

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

  const handleAddBulkTransactions = async (values: any) => {
    if (!user || !account) return;

    try {
      const transactionDate = values.transactionDate 
        ? values.transactionDate.toDate() 
        : new Date();

      // 批量创建交易
      const promises = bulkTransactionItems.map(item => 
        addEventAccountTransaction(
          account.id,
          {
            transactionDate,
            transactionType: values.transactionType,
            category: values.category,
            description: item.description,
            amount: item.amount,
            payerPayee: item.payerPayee,
            paymentMethod: values.paymentMethod,
            notes: item.remark,
            isForecast: values.isForecast || false,
            forecastConfidence: values.forecastConfidence,
          },
          user.id
        )
      );

      await Promise.all(promises);

      message.success(`成功添加 ${bulkTransactionItems.length} 条交易记录`);
      setBulkTransactionModalVisible(false);
      bulkForm.resetFields();
      setBulkTransactionItems([]);
      loadEventAccount();
    } catch (error: any) {
      message.error('批量添加交易失败');
    }
  };

  const addBulkTransactionItem = () => {
    const newItem: BulkTransactionItem = {
      sn: bulkTransactionItems.length + 1,
      description: '',
      remark: '',
      amount: 0,
      payerPayee: '',
    };
    setBulkTransactionItems([...bulkTransactionItems, newItem]);
  };

  const removeBulkTransactionItem = (index: number) => {
    const newItems = bulkTransactionItems.filter((_, i) => i !== index);
    // 重新编号
    const renumberedItems = newItems.map((item, i) => ({
      ...item,
      sn: i + 1,
    }));
    setBulkTransactionItems(renumberedItems);
  };

  const updateBulkTransactionItem = (index: number, field: keyof BulkTransactionItem, value: any) => {
    const newItems = [...bulkTransactionItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setBulkTransactionItems(newItems);
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

  const filteredTransactions = transactions.filter(t => {
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

        {/* Transaction List */}
        <Card
          title="交易记录"
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setTransactionModalVisible(true)}
              >
                单条添加
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setBulkTransactionItems([]);
                  setBulkTransactionModalVisible(true);
                }}
              >
                批量添加
              </Button>
            </Space>
          }
        >
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

        {/* Bulk Transaction Modal */}
        <Modal
          title="批量添加交易"
          open={bulkTransactionModalVisible}
          onOk={() => bulkForm.submit()}
          onCancel={() => {
            setBulkTransactionModalVisible(false);
            bulkForm.resetFields();
            setBulkTransactionItems([]);
          }}
          okText="批量添加"
          cancelText="取消"
          width={1000}
        >
          <Form
            form={bulkForm}
            layout="vertical"
            onFinish={handleAddBulkTransactions}
            initialValues={{
              transactionDate: dayjs(),
              transactionType: 'income',
              isForecast: false,
            }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="transactionDate"
                  label="交易日期"
                  rules={[{ required: true, message: '请选择日期' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD-MMM-YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
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
              </Col>
              <Col span={8}>
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
              </Col>
            </Row>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />} 
                  onClick={addBulkTransactionItem}
                >
                  添加记录
                </Button>
                <span style={{ color: '#666' }}>
                  共 {bulkTransactionItems.length} 条记录
                </span>
              </Space>
            </div>

            {bulkTransactionItems.length > 0 && (
              <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 16 }}>
                <Table
                  size="small"
                  pagination={false}
                  scroll={{ x: 600 }}
                  columns={[
                    {
                      title: 'Sn',
                      dataIndex: 'sn',
                      key: 'sn',
                      width: 60,
                      align: 'center',
                    },
                    {
                      title: 'Description',
                      key: 'description',
                      width: 200,
                      render: (_, record, index) => (
                        <Input
                          placeholder="描述"
                          value={record.description}
                          onChange={(e) => updateBulkTransactionItem(index, 'description', e.target.value)}
                        />
                      ),
                    },
                    {
                      title: 'Remark',
                      key: 'remark',
                      width: 150,
                      render: (_, record, index) => (
                        <Input
                          placeholder="备注"
                          value={record.remark}
                          onChange={(e) => updateBulkTransactionItem(index, 'remark', e.target.value)}
                        />
                      ),
                    },
                    {
                      title: 'Amount',
                      key: 'amount',
                      width: 120,
                      render: (_, record, index) => (
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          precision={2}
                          prefix="RM"
                          placeholder="0.00"
                          value={record.amount}
                          onChange={(value) => updateBulkTransactionItem(index, 'amount', value || 0)}
                        />
                      ),
                    },
                    {
                      title: 'Payer/Payee',
                      key: 'payerPayee',
                      width: 150,
                      render: (_, record, index) => (
                        <Input
                          placeholder="付款人/收款人"
                          value={record.payerPayee}
                          onChange={(e) => updateBulkTransactionItem(index, 'payerPayee', e.target.value)}
                        />
                      ),
                    },
                    {
                      title: '操作',
                      key: 'action',
                      width: 80,
                      render: (_, record, index) => (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() => removeBulkTransactionItem(index)}
                        >
                          删除
                        </Button>
                      ),
                    },
                  ]}
                  dataSource={bulkTransactionItems}
                  rowKey="sn"
                />
                
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <strong>
                    总计: RM {bulkTransactionItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                  </strong>
                </div>
              </div>
            )}

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

