/**
 * Internal Transfer Pairing Page
 * 内部转账配对管理页面
 * 
 * 提供可视化的内部转账配对管理界面
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Tooltip,
  message,
  Tabs,
} from 'antd';
import {
  SwapOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { globalDateService } from '@/config/globalDateSettings';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { detectPotentialPairs, getInternalTransferStats } from '../../services/internalTransferService';
import type { InternalTransferPair } from '../../services/internalTransferService';
import { getAllBankAccounts } from '../../services/bankAccountService';
import type { BankAccount } from '../../types';
import './styles.css';

const { Search } = Input;
const { Option } = Select;

/**
 * Internal Transfer Pairing Page Component
 */
const InternalTransferPairingPage: React.FC = () => {
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [pairs, setPairs] = useState<InternalTransferPair[]>([]);
  const [filteredPairs, setFilteredPairs] = useState<InternalTransferPair[]>([]);
  const [searchText, setSearchText] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  
  // 🆕 银行账户映射
  const [bankAccountsMap, setBankAccountsMap] = useState<Map<string, BankAccount>>(new Map());
  
  // 🆕 未配对记录
  const [unpairedRecords, setUnpairedRecords] = useState<{ income: any[], expense: any[] }>({
    income: [],
    expense: [],
  });
  
  // 🆕 显示模式
  const [viewMode, setViewMode] = useState<'pairs' | 'unpaired'>('pairs');
  
  // 统计
  const [stats, setStats] = useState({
    totalPairs: 0,
    totalAmount: 0,
    accountStats: {} as Record<string, { transfers: number; amount: number }>,
    unpairedCount: 0,
    unpairedAmount: 0,
  });
  
  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [pairs, searchText, confidenceFilter]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 [InternalTransferPairingPage] 开始加载数据...');
      
      // 🆕 加载银行账户信息
      const bankAccounts = await getAllBankAccounts();
      const accountsMap = new Map<string, BankAccount>();
      bankAccounts.forEach(account => {
        accountsMap.set(account.id, account);
      });
      setBankAccountsMap(accountsMap);
      console.log('✅ [InternalTransferPairingPage] 银行账户加载完成，共', accountsMap.size, '个账户');
      
      const detectedPairs = await detectPotentialPairs();
      console.log('✅ [InternalTransferPairingPage] 检测完成，配对数量:', detectedPairs.length);
      
      // 🆕 计算未配对记录
      const pairedIds = new Set<string>();
      detectedPairs.forEach(pair => {
        pairedIds.add(pair.from.id);
        pairedIds.add(pair.to.id);
      });
      
      console.log('🔍 [InternalTransferPairingPage] 已配对记录ID:', Array.from(pairedIds));
      console.log('🔍 [InternalTransferPairingPage] 已配对记录数量:', pairedIds.size);
      
      const { getTransactions } = await import('../../services/transactionService');
      const allInternalTransfers = await getTransactions({
        page: 1,
        limit: 1000,
        txAccount: 'TXGA-0007',
      });
      
      console.log('🔍 [InternalTransferPairingPage] 所有内部转账记录数:', allInternalTransfers.data.length);
      console.log('🔍 [InternalTransferPairingPage] 所有记录ID:', allInternalTransfers.data.map(t => t.id));
      
      const unpaired = {
        income: allInternalTransfers.data.filter(t => !pairedIds.has(t.id) && t.transactionType === 'income'),
        expense: allInternalTransfers.data.filter(t => !pairedIds.has(t.id) && t.transactionType === 'expense'),
      };
      
      console.log('🔍 [InternalTransferPairingPage] 未配对记录统计:', {
        总收入记录: unpaired.income.length,
        总支出记录: unpaired.expense.length,
        总收入金额: unpaired.income.reduce((sum, t) => sum + (t.amount || 0), 0),
        总支出金额: unpaired.expense.reduce((sum, t) => sum + (t.amount || 0), 0),
        总收入记录ID: unpaired.income.map(t => t.id),
        总支出记录ID: unpaired.expense.map(t => t.id),
      });
      
      setUnpairedRecords(unpaired);
      
      const pairStats = await getInternalTransferStats();
      console.log('✅ [InternalTransferPairingPage] 统计完成:', pairStats);
      
      // 计算未配对统计
      const unpairedIncome = unpaired.income.reduce((sum, t) => sum + (t.amount || 0), 0);
      const unpairedExpense = unpaired.expense.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      setPairs(detectedPairs);
      setFilteredPairs(detectedPairs);
      setStats({
        ...pairStats,
        unpairedCount: unpaired.income.length + unpaired.expense.length,
        unpairedAmount: Math.abs(unpairedIncome - unpairedExpense),
      });
      
      message.success(`成功加载 ${detectedPairs.length} 对内部转账，${unpaired.income.length + unpaired.expense.length} 条未配对`);
    } catch (error: any) {
      console.error('❌ [InternalTransferPairingPage] 加载失败:', error);
      message.error('加载内部转账数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...pairs];
    
    // 搜索过滤
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(pair =>
        pair.from.mainDescription?.toLowerCase().includes(searchLower) ||
        pair.to.mainDescription?.toLowerCase().includes(searchLower) ||
        pair.from.bankAccountId?.toLowerCase().includes(searchLower) ||
        pair.to.bankAccountId?.toLowerCase().includes(searchLower)
      );
    }
    
    // 置信度过滤
    if (confidenceFilter !== 'all') {
      const threshold = confidenceFilter === 'high' ? 0.8 : 0.5;
      filtered = filtered.filter(pair => {
        if (confidenceFilter === 'high') {
          return pair.confidence >= threshold;
        } else if (confidenceFilter === 'low') {
          return pair.confidence < threshold;
        }
        return true;
      });
    }
    
    setFilteredPairs(filtered);
  };
  
  // 表格列定义
  const columns: ColumnsType<InternalTransferPair> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a: InternalTransferPair, b: InternalTransferPair) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // 从新到旧（降序）
      },
      defaultSortOrder: 'descend',
      render: (date: string) => globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '转账金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number) => `RM ${amount.toFixed(2)}`,
    },
    {
      title: '转出交易',
      key: 'from',
      width: 350,
      render: (_, pair) => {
        const account = bankAccountsMap.get(pair.from.bankAccountId);
        const accountInfo = account 
          ? `${account.bankName} - ${account.accountName} (${account.accountNumber})`
          : pair.from.bankAccountId;
        
        return (
          <div>
            <div style={{ marginBottom: 4 }}>
              <Tag color="orange">支出</Tag>
              {pair.from.mainDescription}
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: 2 }}>
              账户: {accountInfo}
            </div>
            {pair.from.txAccount && (
              <div style={{ fontSize: '12px', color: '#1890ff' }}>
                分类: {pair.from.txAccount}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '转入交易',
      key: 'to',
      width: 350,
      render: (_, pair) => {
        const account = bankAccountsMap.get(pair.to.bankAccountId);
        const accountInfo = account 
          ? `${account.bankName} - ${account.accountName} (${account.accountNumber})`
          : pair.to.bankAccountId;
        
        return (
          <div>
            <div style={{ marginBottom: 4 }}>
              <Tag color="green">收入</Tag>
              {pair.to.mainDescription}
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: 2 }}>
              账户: {accountInfo}
            </div>
            {pair.to.txAccount && (
              <div style={{ fontSize: '12px', color: '#1890ff' }}>
                分类: {pair.to.txAccount}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (confidence: number) => {
        const percentage = (confidence * 100).toFixed(0);
        const color = confidence >= 0.8 ? 'green' : confidence >= 0.5 ? 'orange' : 'red';
        return (
          <Tag color={color}>
            {percentage}%
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: () => (
        <Space size="small">
          <Tooltip title="确认配对">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={handleConfirmPair}
            >
              确认
            </Button>
          </Tooltip>
          <Tooltip title="取消配对">
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={handleCancelPair}
            >
              取消
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  const handleConfirmPair = () => {
    message.success('配对已确认');
    // TODO: 实现确认配对逻辑
  };
  
  const handleCancelPair = () => {
    message.warning('配对已取消');
    // TODO: 实现取消配对逻辑
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <ErrorBoundary>
      <div className="internal-transfer-pairing-page">
        <PageHeader
          title="内部转账配对管理"
          breadcrumbs={[
            { title: '财务管理', path: '/finance' },
            { title: '内部转账配对管理' },
          ]}
        />
        
        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="已配对数"
                value={stats.totalPairs}
                prefix={<SwapOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="未配对数"
                value={stats.unpairedCount}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="配对总金额"
                value={stats.totalAmount}
                precision={2}
                prefix="RM"
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="不平衡金额"
                value={stats.unpairedAmount}
                precision={2}
                prefix="RM"
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
        
        {/* 筛选栏 */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8}>
              <Search
                placeholder="搜索配对..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Select
                value={confidenceFilter}
                onChange={setConfidenceFilter}
                style={{ width: '100%' }}
              >
                <Option value="all">全部</Option>
                <Option value="high">高置信度 (&ge;80%)</Option>
                <Option value="low">低置信度 (&lt;80%)</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <Space>
                <Button 
                  type={viewMode === 'pairs' ? 'primary' : 'default'}
                  onClick={() => setViewMode('pairs')}
                >
                  已配对 ({filteredPairs.length})
                </Button>
                <Button 
                  type={viewMode === 'unpaired' ? 'primary' : 'default'}
                  onClick={() => setViewMode('unpaired')}
                  danger={stats.unpairedCount > 0}
                >
                  未配对 ({stats.unpairedCount})
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
        
        {/* 配对列表 / 未配对列表 */}
        <Card>
          {viewMode === 'pairs' ? (
            <Table
              columns={columns}
              dataSource={filteredPairs.map((pair, index) => ({
                key: index,
                ...pair,
              }))}
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 对`,
              }}
              scroll={{ x: 1200 }}
            />
          ) : (
            <div>
              <h3 style={{ marginBottom: 16 }}>未配对记录 ({stats.unpairedCount} 条)</h3>
              <Tabs
                items={[
                  {
                    key: 'expense',
                    label: `支出 (${unpairedRecords.expense.length})`,
                    children: (
                      <Table
                        dataSource={unpairedRecords.expense}
                        rowKey="id"
                        columns={[
                          { title: '日期', dataIndex: 'transactionDate', render: (date) => globalDateService.formatDate(new Date(date), 'display') },
                          { title: '描述', dataIndex: 'mainDescription' },
                          { title: '金额', dataIndex: 'amount', align: 'right', render: (amt) => `RM ${amt.toFixed(2)}` },
                          { title: '账户', dataIndex: 'bankAccountId' },
                        ]}
                        pagination={{
                          showSizeChanger: true,
                          showTotal: (total) => `共 ${total} 条`,
                        }}
                      />
                    ),
                  },
                  {
                    key: 'income',
                    label: `收入 (${unpairedRecords.income.length})`,
                    children: (
                      <Table
                        dataSource={unpairedRecords.income}
                        rowKey="id"
                        columns={[
                          { title: '日期', dataIndex: 'transactionDate', render: (date) => globalDateService.formatDate(new Date(date), 'display') },
                          { title: '描述', dataIndex: 'mainDescription' },
                          { title: '金额', dataIndex: 'amount', align: 'right', render: (amt) => `RM ${amt.toFixed(2)}` },
                          { title: '账户', dataIndex: 'bankAccountId' },
                        ]}
                        pagination={{
                          showSizeChanger: true,
                          showTotal: (total) => `共 ${total} 条`,
                        }}
                      />
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default InternalTransferPairingPage;
