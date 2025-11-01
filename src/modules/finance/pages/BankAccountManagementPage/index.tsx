/**
 * Bank Account Management Page (merged with Fiscal Year Management)
 * 银行账户与财年管理页面
 * 
 * Manage all bank accounts, view transactions, and fiscal year settings
 */

import React, { useState, useEffect, Suspense } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Modal,
  Form,
  Select,
  InputNumber,
  Tag,
  Space,
  message,
  Badge,
  Tooltip,
  Tabs,
  Typography,
  Row,
  Col,
  Progress,
  Alert,
  Divider,
  List,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  CalendarOutlined,
  BulbOutlined,
  BarChartOutlined,
  DownloadOutlined,
  PrinterOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  getAllBankAccounts,
  createBankAccount,
  updateBankAccount,
  getTotalBalance,
  getAllBankAccountsMonthlyData,
  type MonthlyFinancialData,
} from '../../services/bankAccountService';
import {
  FiscalYearConfig, 
  FiscalYearPeriod, 
  FiscalYearStatus
} from '../../types/fiscalYear';
import { smartFiscalYearService } from '../../services/smartFiscalYearService';
import SmartFiscalYearSelector from '../../components/SmartFiscalYearSelector';
import type { BankAccount, BankAccountType } from '../../types';
import './styles.css';

const { Search } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

const BankAccountManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [fiscalYearForm] = Form.useForm(); // 🆕 财年配置表单
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<BankAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  
  // 🆕 月份财务数据状态
  const [monthlyData, setMonthlyData] = useState<MonthlyFinancialData[]>([]);
  const [monthlyDataLoading, setMonthlyDataLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('all'); // 🆕 选择的银行账户
  
  // 🆕 顶层标签页状态
  const [activeTab, setActiveTab] = useState<string>('bank-accounts');
  
  // 🆕 财年管理状态
  const [fiscalYearLoading, setFiscalYearLoading] = useState(false);
  const [fiscalYearTab, setFiscalYearTab] = useState<string>('config');
  const [fiscalYearStatus, setFiscalYearStatus] = useState<FiscalYearStatus | null>(null);
  const [historyData, setHistoryData] = useState<FiscalYearPeriod[]>([]);
  const [statisticsType, setStatisticsType] = useState<'fiscal' | 'calendar'>('fiscal');
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalYearPeriod | null>(null);

  useEffect(() => {
    loadBankAccounts();
    loadMonthlyData();
    loadFiscalYearConfig(); // 🆕 加载财年配置
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchText]);

  // 🆕 当年份或银行账户变化时重新加载月份数据
  useEffect(() => {
    loadMonthlyData();
  }, [selectedYear, selectedBankAccount]);

  const loadBankAccounts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [accountsData, balance] = await Promise.all([
        getAllBankAccounts(),
        getTotalBalance(),
      ]);

      setAccounts(accountsData);
      setTotalBalance(balance);
      
      // Set first account as selected by default
      if (accountsData.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsData[0]);
      }
    } catch (error: any) {
      message.error('加载银行账户失败');
      console.error('[Finance] Failed to load bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 加载月份财务数据
  const loadMonthlyData = async () => {
    try {
      setMonthlyDataLoading(true);
      let data: MonthlyFinancialData[];
      
      if (selectedBankAccount === 'all') {
        // 加载所有银行账户的汇总数据
        console.log('📊 [loadMonthlyData] Loading all bank accounts data for year:', selectedYear);
        data = await getAllBankAccountsMonthlyData(selectedYear);
      } else {
        // 加载指定银行账户的数据
        const selectedAccount = accounts.find(acc => acc.id === selectedBankAccount);
        console.log('📊 [loadMonthlyData] Loading data for bank account:', {
          id: selectedBankAccount,
          name: selectedAccount?.accountName,
          year: selectedYear
        });
        const { getBankAccountMonthlyData } = await import('../../services/bankAccountService');
        data = await getBankAccountMonthlyData(selectedBankAccount, selectedYear);
      }
      
      console.log('📊 [loadMonthlyData] Monthly data loaded:', {
        months: data.length,
        totalTransactions: data.reduce((sum, m) => sum + m.transactionCount, 0),
        accountType: selectedBankAccount === 'all' ? '所有账户' : '单个账户'
      });
      
      setMonthlyData(data);
    } catch (error) {
      message.error('加载月份财务数据失败');
      console.error('[Finance] Failed to load monthly data:', error);
    } finally {
      setMonthlyDataLoading(false);
    }
  };

  const filterAccounts = () => {
    if (!searchText) {
      setFilteredAccounts(accounts);
      return;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = accounts.filter(
      acc =>
        acc.accountName.toLowerCase().includes(searchLower) ||
        acc.bankName.toLowerCase().includes(searchLower) ||
        acc.accountNumber.includes(searchText)
    );
    setFilteredAccounts(filtered);
  };

  // 🆕 财年管理相关函数
  const loadFiscalYearConfig = async () => {
    try {
      const savedConfig = localStorage.getItem('fiscalYearConfig');
      let config: FiscalYearConfig;
      
      if (savedConfig) {
        config = JSON.parse(savedConfig);
      } else {
        config = {
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
      }

      smartFiscalYearService.setConfig(config);
      fiscalYearForm.setFieldsValue({
        startMonth: config.startMonth,
        startDay: config.startDay,
        name: config.name,
        description: config.description
      });
      
      const status = smartFiscalYearService.detectCurrentFiscalYearStatus();
      setFiscalYearStatus(status);
      
      const history = smartFiscalYearService.getFiscalYearHistory(5);
      setHistoryData(history);
    } catch (error) {
      console.error('Failed to load fiscal year config:', error);
      message.error('加载财年配置失败');
    }
  };

  const handleSaveFiscalYear = async (values: any) => {
    setFiscalYearLoading(true);
    try {
      const config: FiscalYearConfig = {
        id: 'jci-kl-fy',
        name: values.name || 'JCI KL 财年',
        startMonth: values.startMonth,
        startDay: values.startDay,
        isActive: true,
        isDefault: true,
        description: values.description || `财年从每年${values.startMonth}月${values.startDay}日开始`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const validation = smartFiscalYearService.validateConfig(config);
      if (!validation.isValid) {
        message.error(`配置验证失败: ${validation.errors.join(', ')}`);
        return;
      }

      localStorage.setItem('fiscalYearConfig', JSON.stringify(config));
      smartFiscalYearService.setConfig(config);
      
      const status = smartFiscalYearService.detectCurrentFiscalYearStatus();
      setFiscalYearStatus(status);
      
      const history = smartFiscalYearService.getFiscalYearHistory(5);
      setHistoryData(history);
      
      message.success('财年配置保存成功');
    } catch (error) {
      console.error('Failed to save fiscal year config:', error);
      message.error('保存财年配置失败');
    } finally {
      setFiscalYearLoading(false);
    }
  };

  const handleResetFiscalYear = () => {
    fiscalYearForm.setFieldsValue({
      startMonth: 10,
      startDay: 1,
      name: 'JCI KL 财年',
      description: 'JCI KL 财年从每年10月1日开始'
    });
  };

  const getStatusIcon = (period: FiscalYearPeriod) => {
    if (period.isCompleted) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    } else if (period.isCurrent) {
      return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
    } else {
      return <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (period: FiscalYearPeriod) => {
    if (period.isCompleted) return 'success';
    if (period.isCurrent) return 'processing';
    return 'default';
  };

  const handleFiscalYearChange = async (period: FiscalYearPeriod) => {
    setSelectedPeriod(period);
  };

  const handleStatisticsTypeChange = (type: 'fiscal' | 'calendar') => {
    setStatisticsType(type);
  };

  const handleExportReport = () => {
    message.info('导出功能开发中');
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      accountType: 'checking',
      currency: 'MYR',
      status: 'active',
      isDefault: false,
      initialBalance: 0,
    });
    setEditingAccount(null);
    setModalVisible(true);
  };

  const handleEdit = (record: BankAccount) => {
    setEditingAccount(record);
    form.setFieldsValue({
      accountName: record.accountName,
      accountNumber: record.accountNumber,
      bankName: record.bankName,
      accountType: record.accountType,
      currency: record.currency,
      status: record.status,
      isDefault: record.isDefault,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      const values = await form.validateFields();

      if (editingAccount) {
        await updateBankAccount(editingAccount.id, values, user.id);
        message.success('账户已更新');
      } else {
        await createBankAccount(values, user.id);
        message.success('账户已创建');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingAccount(null);
      loadBankAccounts();
    } catch (error: any) {
      message.error('保存失败');
    }
  };

  const handleViewTransactions = (account: BankAccount) => {
    setSelectedAccount(account);
  };

  const getReconciliationStatus = (account: BankAccount) => {
    const daysSinceReconciliation = account.lastReconciliationDate
      ? Math.floor((Date.now() - new Date(account.lastReconciliationDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceReconciliation === 999) {
      return {
        icon: <ExclamationCircleOutlined />,
        color: 'red',
        text: '从未对账',
        badgeStatus: 'error' as const,
      };
    } else if (daysSinceReconciliation > 30) {
      return {
        icon: <ExclamationCircleOutlined />,
        color: 'red',
        text: `逾期 (${daysSinceReconciliation}天前)`,
        badgeStatus: 'error' as const,
      };
    } else if (daysSinceReconciliation > 7) {
      return {
        icon: <ClockCircleOutlined />,
        color: 'yellow',
        text: `待对账 (${daysSinceReconciliation}天前)`,
        badgeStatus: 'warning' as const,
      };
    } else {
      return {
        icon: <CheckCircleOutlined />,
        color: 'green',
        text: `已对账 (${daysSinceReconciliation}天前)`,
        badgeStatus: 'success' as const,
      };
    }
  };

  const columns: ColumnsType<BankAccount> = [
    {
      title: '银行名称',
      dataIndex: 'bankName',
      key: 'bankName',
      width: 180,
      render: (text: string, record: BankAccount) => (
        <Space>
          <BankOutlined />
          <span className="font-medium">{text}</span>
          {record.isDefault && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '账户号码',
      dataIndex: 'accountNumber',
      key: 'accountNumber',
      width: 150,
      render: (num: string) => `**** **** **** ${num.slice(-4)}`,
    },
    {
      title: '初始余额',
      dataIndex: 'initialBalance',
      key: 'initialBalance',
      width: 150,
      align: 'right',
      render: (balance: number) => (
        <Tooltip title="开户时的初始余额(当前余额需在交易管理页面查看)">
          <span style={{ color: '#666' }}>
            RM {balance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '账户类型',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 100,
      render: (type: BankAccountType) => {
        const typeMap: Record<BankAccountType, string> = {
          checking: '支票',
          savings: '储蓄',
          credit: '信用',
          cash: '现金',
          other: '其他',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '对账状态',
      key: 'reconciliation',
      width: 180,
      render: (_, record) => {
        const status = getReconciliationStatus(record);
        return (
          <div className="flex items-center gap-2">
            <Badge status={status.badgeStatus} />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{status.text}</span>
              {record.lastReconciliationDate && (
                <span className="text-xs text-gray-500">
                  {globalDateService.formatDate(new Date(record.lastReconciliationDate), 'display')}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看交易">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewTransactions(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="对账">
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
            >
              对账
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  if (loading) {
    return <LoadingSpinner />;
  }

  // 🆕 渲染银行账户标签页内容
  const renderBankAccountsTab = () => (
    <>
      {/* Search and Actions */}
      <Card className="mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <Search
            placeholder="按银行名称搜索..."
            onSearch={setSearchText}
            style={{ width: 300 }}
            allowClear
            enterButton={<SearchOutlined />}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            添加新账户
          </Button>
        </div>
      </Card>

      {/* Bank Accounts Table */}
      <Card title="银行账户列表">
        <Table
          {...tableConfig}
          columns={columns}
          dataSource={filteredAccounts}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 🆕 月份财务数据卡片 */}
      <Card 
        title={
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span>📊 月份财务概览</span>
              {selectedBankAccount !== 'all' && (
                <Tag color="blue" icon={<BankOutlined />}>
                  {accounts.find(acc => acc.id === selectedBankAccount)?.accountName || '未知账户'}
                </Tag>
              )}
            </div>
            <div className="flex gap-3">
              <Select
                value={selectedBankAccount}
                onChange={setSelectedBankAccount}
                style={{ width: 200 }}
                placeholder="选择银行账户"
              >
                <Option value="all">
                  <BankOutlined /> 所有银行账户
                </Option>
                {accounts.map(account => (
                  <Option key={account.id} value={account.id}>
                    <BankOutlined /> {account.accountName}
                  </Option>
                ))}
              </Select>
              
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                style={{ width: 120 }}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <Option key={year} value={year}>
                      {year}年
                    </Option>
                  );
                })}
              </Select>
            </div>
          </div>
        }
        className="mb-6"
      >
        {monthlyDataLoading ? (
          <div className="text-center py-8">
            <LoadingSpinner />
            <p className="mt-2">加载月份数据中...</p>
          </div>
        ) : (
          <div 
            className="flex gap-4 overflow-x-auto pb-4"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#1890ff #f0f0f0'
            }}
          >
            {monthlyData.map((monthData) => (
              <Card
                key={monthData.month}
                size="small"
                className="monthly-card"
                style={{
                  minWidth: '140px',
                  maxWidth: '140px',
                  flexShrink: 0,
                  border: monthData.month === new Date().getMonth() + 1 ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  backgroundColor: monthData.month === new Date().getMonth() + 1 ? '#f6ffed' : '#fff',
                }}
              >
                <div className="text-center">
                  <div className="text-base font-bold mb-3 text-primary">
                    {monthData.monthName}
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-gray-500">月初</span>
                      <span className="font-medium text-gray-700">
                        {monthData.openingBalance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="border-t pt-1 flex items-center justify-between px-1">
                      <span className="text-green-600">+收入</span>
                      <span className="font-medium text-green-600">
                        {monthData.totalIncome.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="border-t pt-1 flex items-center justify-between px-1">
                      <span className="text-red-600">-支出</span>
                      <span className="font-medium text-red-600">
                        {monthData.totalExpense.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="border-t pt-1 flex items-center justify-between px-1">
                      <span className="text-gray-800 font-semibold">月末</span>
                      <span className={`font-bold ${
                        monthData.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {monthData.closingBalance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="border-t pt-1 text-gray-500 text-center">
                      {monthData.transactionCount}笔
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Sidebar Info */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-lg font-bold mb-2">总余额</p>
            <p className="text-4xl font-bold text-primary">
              RM {totalBalance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-lg font-bold mb-2">活跃账户</p>
            <p className="text-4xl font-bold text-green-600">
              {accounts.filter(a => a.status === 'active').length}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-lg font-bold mb-2">需要对账</p>
            <p className="text-4xl font-bold text-yellow-600">
              {accounts.filter(a => {
                const days = a.lastReconciliationDate
                  ? Math.floor((Date.now() - new Date(a.lastReconciliationDate).getTime()) / (1000 * 60 * 60 * 24))
                  : 999;
                return days > 7;
              }).length}
            </p>
          </div>
        </Card>
      </div>
    </>
  );

  // 🆕 渲染财年配置标签页内容
  const renderFiscalYearConfigTab = () => (
    <>
      <Row gutter={24}>
        {/* 财年配置 */}
        <Col span={16}>
          <Card title="财年设置" style={{ marginBottom: 24 }}>
            <Form
              form={fiscalYearForm}
              layout="vertical"
              onFinish={handleSaveFiscalYear}
              initialValues={{
                startMonth: 10,
                startDay: 1,
                name: 'JCI KL 财年',
                description: 'JCI KL 财年从每年10月1日开始'
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="财年名称"
                    rules={[{ required: true, message: '请输入财年名称' }]}
                  >
                    <Input
                      style={{ width: '100%' }}
                      placeholder="如：JCI KL 财年"
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="description"
                    label="描述"
                  >
                    <Input
                      style={{ width: '100%' }}
                      placeholder="财年描述信息"
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="startMonth"
                    label="起始月份"
                    rules={[{ required: true, message: '请选择起始月份' }]}
                  >
                    <InputNumber
                      min={1}
                      max={12}
                      style={{ width: '100%' }}
                      placeholder="月份"
                      addonAfter="月"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="startDay"
                    label="起始日期"
                    rules={[{ required: true, message: '请选择起始日期' }]}
                  >
                    <InputNumber
                      min={1}
                      max={31}
                      style={{ width: '100%' }}
                      placeholder="日期"
                      addonAfter="日"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Alert
                message="配置说明"
                description="设置财年的起始月份和日期后，系统将自动计算每年的财年范围。例如：设置10月1日，则2024年财年为2024-10-01至2025-09-30。"
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: 16 }}
              />

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={fiscalYearLoading}>
                    保存配置
                  </Button>
                  <Button onClick={handleResetFiscalYear}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 当前财年状态 */}
        <Col span={8}>
          <Card title="当前财年状态" style={{ marginBottom: 24 }}>
            {fiscalYearStatus?.currentPeriod ? (
              <div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}>
                      {fiscalYearStatus.currentPeriod.displayName}
                    </Title>
                    <Text type="secondary">
                      {fiscalYearStatus.currentPeriod.startDate} 至 {fiscalYearStatus.currentPeriod.endDate}
                    </Text>
                  </div>

                  <Divider />

                  <div>
                    <Text strong>财年进度</Text>
                    <Progress 
                      percent={fiscalYearStatus.currentPeriod.progressPercentage}
                      status="active"
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {fiscalYearStatus.currentPeriod.daysElapsed} 天 / {fiscalYearStatus.currentPeriod.totalDays} 天
                    </Text>
                  </div>

                  <div>
                    <Text strong>剩余天数</Text>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                      {fiscalYearStatus.currentPeriod.daysRemaining} 天
                    </div>
                  </div>

                  <Alert
                    message="财年状态"
                    description={`当前正在${fiscalYearStatus.currentPeriod.displayName}，进度 ${fiscalYearStatus.currentPeriod.progressPercentage}%`}
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                  />
                </Space>
              </div>
            ) : (
              <Alert
                message="未检测到当前财年"
                description="请检查财年配置是否正确"
                type="warning"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 智能建议 */}
      {fiscalYearStatus?.suggestions && fiscalYearStatus.suggestions.length > 0 && (
        <Card title="智能建议" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {fiscalYearStatus.suggestions.map((suggestion: any, index: number) => (
              <Alert
                key={index}
                message={suggestion.reason}
                description={`建议查看 ${suggestion.period.displayName} 的数据`}
                type={suggestion.priority === 'high' ? 'success' : suggestion.priority === 'medium' ? 'info' : 'warning'}
                showIcon
                icon={<BulbOutlined />}
              />
            ))}
          </Space>
        </Card>
      )}

      {/* 财年预览 */}
      <Card title="财年预览">
        <List
          dataSource={historyData}
          renderItem={(period) => (
            <List.Item>
              <List.Item.Meta
                avatar={getStatusIcon(period)}
                title={
                  <Space>
                    <Text strong={period.isCurrent}>{period.displayName}</Text>
                    <Tag color={getStatusColor(period)}>
                      {period.isCompleted ? '已完成' : period.isCurrent ? '进行中' : '未开始'}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text type="secondary">
                      {period.startDate} 至 {period.endDate}
                    </Text>
                    {period.isCurrent && (
                      <Progress 
                        percent={period.progressPercentage} 
                        size="small" 
                        status="active"
                        format={(percent) => `${percent}% (剩余 ${period.daysRemaining} 天)`}
                      />
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </>
  );

  // 🆕 渲染财年统计标签页内容
  const renderFiscalYearStatisticsTab = () => (
    <Row gutter={24}>
      <Col span={8}>
        <SmartFiscalYearSelector
          onFiscalYearChange={handleFiscalYearChange}
          onStatisticsTypeChange={handleStatisticsTypeChange}
          defaultStatisticsType={statisticsType}
          showSuggestions={true}
          showProgress={true}
        />
      </Col>

      <Col span={16}>
        {selectedPeriod ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card title={`${selectedPeriod.displayName} 统计报告`}>
              <Space direction="vertical" style={{ width: '100%' }}>
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
  );

  return (
    <ErrorBoundary>
      <div className="bank-account-management-page">
        <PageHeader
          title="财务设置"
          subtitle="银行账户与财年管理"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '财务设置' },
          ]}
        />

        {/* 🆕 顶层标签页 */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'bank-accounts',
                label: (
                  <span>
                    <BankOutlined /> 银行账户管理
                  </span>
                ),
                children: renderBankAccountsTab(),
              },
              {
                key: 'fiscal-year-config',
                label: (
                  <span>
                    <SettingOutlined /> 财年配置
                  </span>
                ),
                children: renderFiscalYearConfigTab(),
              },
              {
                key: 'fiscal-year-statistics',
                label: (
                  <span>
                    <BarChartOutlined /> 财年统计
                  </span>
                ),
                children: renderFiscalYearStatisticsTab(),
              },
            ]}
          />
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          title={editingAccount ? '编辑银行账户' : '添加新银行账户'}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
            setEditingAccount(null);
          }}
          width={600}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="账户名称"
              name="accountName"
              rules={[{ required: true, message: '请输入账户名称' }]}
            >
              <Input placeholder="例如: 主运营账户" />
            </Form.Item>

            <Form.Item
              label="银行名称"
              name="bankName"
              rules={[{ required: true, message: '请输入银行名称' }]}
            >
              <Input placeholder="例如: Maybank" />
            </Form.Item>

            <Form.Item
              label="账户号码"
              name="accountNumber"
              rules={[{ required: true, message: '请输入账户号码' }]}
            >
              <Input placeholder="完整账户号码" />
            </Form.Item>

            <Form.Item
              label="账户类型"
              name="accountType"
              rules={[{ required: true, message: '请选择账户类型' }]}
            >
              <Select>
                <Option value="checking">支票账户</Option>
                <Option value="savings">储蓄账户</Option>
                <Option value="credit">信用账户</Option>
                <Option value="cash">现金</Option>
                <Option value="other">其他</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="货币"
              name="currency"
              rules={[{ required: true, message: '请选择货币' }]}
            >
              <Select>
                <Option value="MYR">MYR (马来西亚令吉)</Option>
                <Option value="USD">USD (美元)</Option>
                <Option value="SGD">SGD (新加坡元)</Option>
                <Option value="CNY">CNY (人民币)</Option>
              </Select>
            </Form.Item>

            {!editingAccount && (
              <Form.Item
                label="初始余额"
                name="initialBalance"
                rules={[{ required: true, message: '请输入初始余额' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="RM"
                  precision={2}
                  min={0}
                />
              </Form.Item>
            )}

            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select>
                <Option value="active">活跃</Option>
                <Option value="inactive">非活跃</Option>
                <Option value="closed">已关闭</Option>
              </Select>
            </Form.Item>

            <Form.Item label="设为默认账户" name="isDefault" valuePropName="checked">
              <Select>
                <Option value={true}>是</Option>
                <Option value={false}>否</Option>
              </Select>
            </Form.Item>

            <Form.Item label="描述" name="description">
              <Input.TextArea rows={3} placeholder="可选" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default BankAccountManagementPage;

