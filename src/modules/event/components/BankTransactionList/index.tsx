/**
 * Bank Transaction List Component
 * 银行交易记录列表组件
 * 
 * 显示属于该活动的实际银行交易记录（只读）
 */

import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Row,
  Col,
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

const { Option } = Select;
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

const BankTransactionList: React.FC<Props> = ({
  accountId: _accountId,
  transactions,
  loading,
  onRefresh,
  onExport,
}) => {
  console.log('🔍 [BankTransactionList] Component rendered', {
    transactionsCount: transactions.length,
    loading,
    transactions: transactions.slice(0, 3).map(t => ({
      id: t.id,
      number: t.transactionNumber,
      description: t.description,
    })),
  });
  
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchText, setSearchText] = useState('');

  const tableConfig = globalComponentService.getTableConfig();

  // 筛选交易记录
  const filteredTransactions = transactions.filter(txn => {
    // 类型筛选
    if (typeFilter !== 'all' && txn.transactionType !== typeFilter) {
      return false;
    }

    // 搜索筛选
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      return (
        txn.description.toLowerCase().includes(searchLower) ||
        txn.transactionNumber.toLowerCase().includes(searchLower) ||
        txn.amount.toString().includes(searchLower)
      );
    }

    return true;
  });

  // 表格列定义
  const columns: ColumnsType<BankTransaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      width: 110,
      sorter: (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
      render: (date: string) => globalDateService.formatDate(date, 'display'),
    },
    {
      title: '交易号',
      dataIndex: 'transactionNumber',
      width: 150,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'transactionType',
      width: 80,
      filters: [
        { text: '收入', value: 'income' },
        { text: '支出', value: 'expense' },
      ],
      onFilter: (value, record) => record.transactionType === value,
      render: (type: string) => (
        <Tag color={type === 'income' ? 'green' : 'red'}>
          {type === 'income' ? '收入' : '支出'}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (value: number, record: BankTransaction) => {
        const isIncome = record.transactionType === 'income';
        return (
          <span style={{ 
            color: isIncome ? '#52c41a' : '#ff4d4f',
            fontWeight: 600,
            fontSize: '14px'
          }}>
            {isIncome ? '+' : '-'}RM {value.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '付款人/收款人',
      dataIndex: 'payerPayee',
      width: 130,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '付款方式',
      dataIndex: 'paymentMethod',
      width: 100,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '收据号',
      dataIndex: 'receiptNumber',
      width: 120,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '银行账户',
      dataIndex: 'bankAccount',
      width: 180,
      render: (_: string, record: BankTransaction) => {
        if (record.bankAccountName && record.bankName) {
          return (
            <div>
              <div style={{ fontWeight: 500 }}>
                {record.bankAccountName} ({record.bankName})
              </div>
              {record.accountNumber && (
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {record.accountNumber}
                </div>
              )}
            </div>
          );
        }
        return record.bankAccount || '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      filters: [
        { text: '已核对', value: 'verified' },
        { text: '待核对', value: 'pending' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        if (status === 'verified') {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              已核对
            </Tag>
          );
        }
        return (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            待核对
          </Tag>
        );
      },
    },
  ];

  return (
    <Card
      title="💰 实际银行交易记录（Bank Transaction Records）"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
          >
            刷新
          </Button>
          {onExport && (
            <Button
              icon={<DownloadOutlined />}
              onClick={onExport}
            >
              导出Excel
            </Button>
          )}
        </Space>
      }
      className="bank-transaction-list-card"
    >
      {/* 统计卡片已移除 - 使用预测标签页顶部的对比统计卡片 */}

      {/* 筛选工具栏 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Select
            style={{ width: '100%' }}
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="按类型筛选"
          >
            <Option value="all">全部类型</Option>
            <Option value="income">
              <RiseOutlined style={{ color: '#52c41a' }} /> 收入
            </Option>
            <Option value="expense">
              <FallOutlined style={{ color: '#ff4d4f' }} /> 支出
            </Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="搜索描述/金额/交易号"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
        </Col>
      </Row>

      {/* 交易记录表格 */}
      <Table
        {...tableConfig}
        columns={columns}
        dataSource={filteredTransactions}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 笔交易`,
        }}
        scroll={{ x: 1400 }}
      />

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

