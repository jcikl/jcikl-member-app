/**
 * Bank Account Management Page
 * 银行账户管理页面
 * 
 * Manage all bank accounts and view transactions
 */

import React, { useState, useEffect } from 'react';
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
import type { BankAccount, BankAccountType } from '../../types';
import './styles.css';

const { Search } = Input;
const { Option } = Select;

const BankAccountManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
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

  useEffect(() => {
    loadBankAccounts();
    loadMonthlyData();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchText]);

  // 🆕 当年份变化时重新加载月份数据
  useEffect(() => {
    loadMonthlyData();
  }, [selectedYear]);

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
      const data = await getAllBankAccountsMonthlyData(selectedYear);
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
        <Tooltip title="开户时的初始余额（当前余额需在交易管理页面查看）">
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

  return (
    <ErrorBoundary>
      <div className="bank-account-management-page">
        <PageHeader
          title="银行账户管理"
          subtitle="在一个地方管理所有关联的银行账户"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '银行账户' },
          ]}
        />

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
            <div className="flex justify-between items-center">
              <span>📊 月份财务概览</span>
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
          }
          className="mb-6"
        >
          {monthlyDataLoading ? (
            <div className="text-center py-8">
              <LoadingSpinner />
              <p className="mt-2">加载月份数据中...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {monthlyData.map((monthData) => (
                <Card
                  key={monthData.month}
                  size="small"
                  className="monthly-card"
                  style={{
                    border: monthData.month === new Date().getMonth() + 1 ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    backgroundColor: monthData.month === new Date().getMonth() + 1 ? '#f6ffed' : '#fff',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-primary" style={{ minWidth: '80px' }}>
                      {monthData.monthName}
                    </div>
                    
                    <div className="flex-1 flex items-center justify-between gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">月初余额:</span>
                        <span className="font-medium">
                          RM {monthData.openingBalance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">月总收入:</span>
                        <span className="font-medium text-green-600">
                          RM {monthData.totalIncome.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">月总支出:</span>
                        <span className="font-medium text-red-600">
                          RM {monthData.totalExpense.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 border-l pl-6">
                        <span className="text-gray-800 font-bold">月末余额:</span>
                        <span className={`font-bold ${
                          monthData.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          RM {monthData.closingBalance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>交易数:</span>
                        <span className="font-medium">{monthData.transactionCount}笔</span>
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

