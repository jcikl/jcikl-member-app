/**
 * Bank Transaction List Component
 * 银行交易记录列表组件
 * 
 * 显示属于该活动的实际银行交易记录(只读)
 */

import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  message,
} from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import './BankTransactionList.css';

const { Search } = Input;

export interface BankTransaction {
  id: string;
  transactionDate: string;
  transactionNumber: string;
  transactionType: 'income' | 'expense';
  description: string;
  amount: number;
  bankAccount: string;           // bankAccountId
  bankAccountName?: string;      // 银行账户名称
  bankName?: string;             // 银行名称
  accountNumber?: string;        // 账户号码
  status: 'verified' | 'pending';
  category?: string;
  payerPayee?: string;           // 付款人/收款人
  paymentMethod?: string;        // 付款方式
  receiptNumber?: string;        // 收据号码
  invoiceNumber?: string;        // 发票号码
  createdAt: string;
}

interface Props {
  accountId?: string;
  transactions: BankTransaction[];
  loading?: boolean;
  onRefresh: () => Promise<void>;
  onExport?: () => void;
}

// 🆕 导出到 CSV 的辅助函数
const exportToCSV = (transactions: BankTransaction[], type: 'income' | 'expense') => {
  const typeLabel = type === 'income' ? '收入' : '支出';
  const filename = `银行交易记录_${typeLabel}_${new Date().toISOString().split('T')[0]}.csv`;
  
  const headers = '日期,交易编号,描述,收款人/付款人,金额,银行账户,状态,类别,付款方式,收据号码,发票号码\n';
  
  const rows = transactions.map(txn => {
    const date = globalDateService.formatDate(txn.transactionDate, 'display');
    const description = `"${txn.description}"`;
    const payerPayee = txn.payerPayee ? `"${txn.payerPayee}"` : '';
    const bankAccount = txn.bankAccountName || txn.bankAccount || '';
    const status = txn.status === 'verified' ? '已确认' : '待确认';
    const category = txn.category || '';
    const paymentMethod = txn.paymentMethod || '';
    const receiptNumber = txn.receiptNumber || '';
    const invoiceNumber = txn.invoiceNumber || '';
    
    return `${date},${txn.transactionNumber},${description},${payerPayee},${txn.amount.toFixed(2)},${bankAccount},${status},${category},${paymentMethod},${receiptNumber},${invoiceNumber}`;
  }).join('\n');
  
  const csvContent = '\uFEFF' + headers + rows; // BOM for Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const BankTransactionList: React.FC<Props> = ({
  accountId: _accountId,
  transactions,
  loading,
  onRefresh,
  onExport,
}) => {
  const [searchText, setSearchText] = useState('');

  const tableConfig = globalComponentService.getTableConfig();

  // 分离收入和支出交易
  const incomeTransactions = transactions.filter(txn => txn.transactionType === 'income');
  const expenseTransactions = transactions.filter(txn => txn.transactionType === 'expense');

  // 搜索筛选函数
  const filterBySearch = (txn: BankTransaction) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      txn.description.toLowerCase().includes(searchLower) ||
      txn.amount.toString().includes(searchLower) ||
      (txn.payerPayee && txn.payerPayee.toLowerCase().includes(searchLower)) ||
      (txn.bankAccountName && txn.bankAccountName.toLowerCase().includes(searchLower))
    );
  };

  const filteredIncomeTransactions = incomeTransactions
    .filter(filterBySearch)
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
  
  const filteredExpenseTransactions = expenseTransactions
    .filter(filterBySearch)
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

  // 统计数据
  const totalIncome = filteredIncomeTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const totalExpense = filteredExpenseTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const netAmount = totalIncome - totalExpense;

  // 表格列定义
  const columns: ColumnsType<BankTransaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      width: 110,
      render: (date: string) => globalDateService.formatDate(date, 'display'),
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      render: (_: string, record: BankTransaction) => {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 500, fontSize: '13px', color: '#262626' }}>
              {record.description}
            </span>
            {record.payerPayee && (
              <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                • {record.transactionType === 'income' ? '来自: ' : '支付给: '}{record.payerPayee}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (value: number, record: BankTransaction) => {
        const isIncome = record.transactionType === 'income';
        return (
          <span style={{ 
            color: isIncome ? '#52c41a' : '#ff4d4f',
            fontWeight: 600,
            fontSize: '14px'
          }}>
            RM {value.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '银行账户',
      dataIndex: 'bankAccount',
      width: 180,
      ellipsis: true,
      render: (_: string, record: BankTransaction) => {
        if (record.bankAccountName && record.bankName) {
          return (
            <div>
              <div style={{ fontWeight: 500, fontSize: '13px' }}>
                {record.bankAccountName} ({record.bankName})
              </div>
             
            </div>
          );
        }
        return record.bankAccount || '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      filters: [
        { text: '已核对', value: 'verified' },
        { text: '待核对', value: 'pending' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        if (status === 'verified') {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: '11px' }}>
              已核对
            </Tag>
          );
        }
        return (
          <Tag icon={<ClockCircleOutlined />} color="warning" style={{ fontSize: '11px' }}>
            待核对
          </Tag>
        );
      },
    },
  ];

  return (
    <Card
      title="💰 实际银行交易记录(Bank Transaction Records)"
      extra={
        <Space>
          <Search
            placeholder="搜索描述/金额/付款人/账户"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            size="small"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
            size="small"
          >
            刷新
          </Button>
          {onExport && (
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                // 🆕 执行导出
                const totalCount = filteredIncomeTransactions.length + filteredExpenseTransactions.length;
                if (totalCount === 0) {
                  message.warning('没有数据可导出');
                  return;
                }
                
                if (filteredIncomeTransactions.length > 0) {
                  exportToCSV(filteredIncomeTransactions, 'income');
                  message.success(`已导出 ${filteredIncomeTransactions.length} 条收入记录`);
                }
                if (filteredExpenseTransactions.length > 0) {
                  // 延迟导出支出，避免同时下载两个文件造成混淆
                  setTimeout(() => {
                    exportToCSV(filteredExpenseTransactions, 'expense');
                    message.success(`已导出 ${filteredExpenseTransactions.length} 条支出记录`);
                  }, 500);
                }
                if (onExport) onExport();
              }}
              size="small"
            >
              导出CSV
            </Button>
          )}
        </Space>
      }
      className="bank-transaction-list-card"
    >
      {/* 收入交易区域 */}
      <div style={{ marginBottom: 24 }}>
        {/* 收入标题 - 独立显示 */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid #52c41a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RiseOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#52c41a' }}>
              Income Transactions
            </span>
            <span style={{ fontSize: '14px', color: '#8c8c8c' }}>
              {filteredIncomeTransactions.length} 笔
            </span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#52c41a' }}>
            Total: RM {totalIncome.toFixed(2)}
          </div>
        </div>

        <Table
          {...tableConfig}
          columns={columns}
          dataSource={filteredIncomeTransactions}
          rowKey="id"
          loading={loading}
          pagination={false}
          showHeader={true}
          size="small"
          locale={{ emptyText: '暂无收入交易记录' }}
        />
      </div>

      {/* 支出交易区域 */}
      <div style={{ marginBottom: 24 }}>
        {/* 支出标题 - 独立显示 */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#fff1f0',
          borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid #ff4d4f'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FallOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#ff4d4f' }}>
              Expense Transactions
            </span>
            <span style={{ fontSize: '14px', color: '#8c8c8c' }}>
              {filteredExpenseTransactions.length} 笔
            </span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#ff4d4f' }}>
            Total: RM {totalExpense.toFixed(2)}
          </div>
        </div>

        <Table
          {...tableConfig}
          columns={columns}
          dataSource={filteredExpenseTransactions}
          rowKey="id"
          loading={loading}
          pagination={false}
          showHeader={true}
          size="small"
          locale={{ emptyText: '暂无支出交易记录' }}
        />
      </div>

      {/* 独立统计区域 */}
      <div style={{ 
        marginTop: 16, 
        padding: '16px 24px', 
        backgroundColor: '#fafafa',
        borderRadius: 8,
        border: '1px solid #f0f0f0'
      }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {/* Total Income */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
              Total Income (Actual)
            </span>
            <span style={{ color: '#52c41a', fontSize: '20px', fontWeight: 700 }}>
              RM {totalIncome.toFixed(2)}
            </span>
          </div>

          {/* Total Expenses */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
              Total Expenses (Actual)
            </span>
            <span style={{ color: '#ff4d4f', fontSize: '20px', fontWeight: 700 }}>
              RM {totalExpense.toFixed(2)}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: '#d9d9d9', margin: '4px 0' }} />

          {/* Net Amount */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>
              Net Amount (Actual)
            </span>
            <span style={{ 
              color: netAmount >= 0 ? '#52c41a' : '#ff4d4f', 
              fontSize: '24px',
              fontWeight: 700 
            }}>
              RM {netAmount.toFixed(2)}
            </span>
          </div>
        </Space>
      </div>

      {/* 说明文字 */}
      <div style={{ 
        marginTop: 16, 
        padding: '12px 16px', 
        background: '#f0f5ff', 
        border: '1px solid #adc6ff',
        borderRadius: '4px',
        fontSize: '13px',
        color: '#595959'
      }}>
        <strong>📌 说明：</strong>
        此列表显示财务部门录入的与本活动相关的所有银行交易记录。
        活动筹委可查看但不可编辑。如有疑问，请联系财务部门。
      </div>
    </Card>
  );
};

export default BankTransactionList;

