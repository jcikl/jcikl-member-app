/**
 * Internal Transfer Pairing Panel Component
 * 内部转账配对面板组件
 * 
 * 提供可视化的内部转账配对管理界面（作为标签页使用）
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
import { detectPotentialPairs, getInternalTransferStats } from '../../services/internalTransferService';
import type { InternalTransferPair } from '../../services/internalTransferService';
import { getAllBankAccounts } from '../../services/bankAccountService';
import type { BankAccount } from '../../types';

const { Search } = Input;
const { Option } = Select;

/**
 * Internal Transfer Pairing Panel Component
 */
const InternalTransferPairingPanel: React.FC = () => {
  
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
      console.log('🔄 [InternalTransferPairingPanel] 开始加载数据...');
      
      // 🆕 加载银行账户信息
      const bankAccounts = await getAllBankAccounts();
      const accountsMap = new Map<string, BankAccount>();
      bankAccounts.forEach(account => {
        accountsMap.set(account.id, account);
      });
      setBankAccountsMap(accountsMap);
      console.log('✅ [InternalTransferPairingPanel] 银行账户加载完成，共', accountsMap.size, '个账户');
      
      const detectedPairs = await detectPotentialPairs();
      console.log('✅ [InternalTransferPairingPanel] 检测完成，配对数量:', detectedPairs.length);
      
      // 🆕 计算未配对记录
      const pairedIds = new Set<string>();
      detectedPairs.forEach(pair => {
        pairedIds.add(pair.from.id);
        pairedIds.add(pair.to.id);
      });
      
      const { getTransactions } = await import('../../services/transactionService');
      const allInternalTransfers = await getTransactions({
        page: 1,
        limit: 1000,
        txAccount: 'TXGA-0007',
      });
      
      const unpaired = {
        income: allInternalTransfers.data.filter(t => !pairedIds.has(t.id) && t.transactionType === 'income'),
        expense: allInternalTransfers.data.filter(t => !pairedIds.has(t.id) && t.transactionType === 'expense'),
      };
      
      // 🆕 按日期排序(新到旧)
      unpaired.income.sort((a, b) => {
        const dateA = new Date(a.transactionDate).getTime();
        const dateB = new Date(b.transactionDate).getTime();
        return dateB - dateA;
      });
      
      unpaired.expense.sort((a, b) => {
        const dateA = new Date(a.transactionDate).getTime();
        const dateB = new Date(b.transactionDate).getTime();
        return dateB - dateA;
      });
      
      setUnpairedRecords(unpaired);
      
      const pairStats = await getInternalTransferStats();
      
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
      console.error('❌ [InternalTransferPairingPanel] 加载失败:', error);
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
      dataIndex: ['from', 'transactionDate'],
      render: (date) => globalDateService.formatDate(new Date(date), 'display'),
      sorter: (a, b) => new Date(a.from.transactionDate).getTime() - new Date(b.from.transactionDate).getTime(),
    },
    {
      title: '支出账户',
      render: (_, pair) => {
        const account = bankAccountsMap.get(pair.from.bankAccountId);
        if (account) {
          return `${account.bankName} - ${account.accountName}`;
        }
        return pair.from.bankAccountId;
      },
    },
    {
      title: '收入账户',
      render: (_, pair) => {
        const account = bankAccountsMap.get(pair.to.bankAccountId);
        if (account) {
          return `${account.bankName} - ${account.accountName}`;
        }
        return pair.to.bankAccountId;
      },
    },
    {
      title: '金额',
      dataIndex: ['from', 'amount'],
      align: 'right',
      render: (amount) => `RM ${amount.toFixed(2)}`,
      sorter: (a, b) => a.from.amount - b.from.amount,
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      align: 'center',
      render: (confidence) => {
        const percentage = (confidence * 100).toFixed(0);
        let color = confidence >= 0.8 ? 'green' : confidence >= 0.5 ? 'orange' : 'red';
        return <Tag color={color}>{percentage}%</Tag>;
      },
      sorter: (a, b) => a.confidence - b.confidence,
    },
    {
      title: '操作',
      key: 'actions',
      align: 'center',
      render: (_, pair) => (
        <Space>
          <Tooltip title="确认配对">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined style={{ color: '#52c41a' }} />}
              onClick={() => message.info('配对功能开发中')}
            />
          </Tooltip>
          <Tooltip title="取消配对">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined style={{ color: '#ff4d4f' }} />}
              onClick={() => message.info('取消配对功能开发中')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  return (
    <div className="internal-transfer-pairing-panel" style={{ padding: '16px 0' }}>
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
      <Card loading={loading}>
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
                        { 
                          title: '日期', 
                          dataIndex: 'transactionDate', 
                          sorter: (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
                          defaultSortOrder: 'descend',
                          render: (date) => globalDateService.formatDate(new Date(date), 'display') 
                        },
                        { 
                          title: '描述', 
                          dataIndex: 'secondaryDescription',
                          render: (desc, record) => (
                            <div>
                              <div>{desc || record.mainDescription}</div>
                              {record.txAccount && (
                                <div style={{ fontSize: '12px', color: '#1890ff', marginTop: 2 }}>
                                  分类: {record.txAccount}
                                </div>
                              )}
                            </div>
                          )
                        },
                        { title: '金额', dataIndex: 'amount', align: 'right', render: (amt) => `RM ${amt.toFixed(2)}` },
                        { 
                          title: '账户', 
                          dataIndex: 'bankAccountId',
                          render: (accountId, record) => {
                            const account = bankAccountsMap.get(accountId);
                            if (account) {
                              return `${account.bankName} - ${account.accountName} (${account.accountNumber})`;
                            }
                            return accountId;
                          }
                        },
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
                        { 
                          title: '日期', 
                          dataIndex: 'transactionDate', 
                          sorter: (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
                          defaultSortOrder: 'descend',
                          render: (date) => globalDateService.formatDate(new Date(date), 'display') 
                        },
                        { 
                          title: '描述', 
                          dataIndex: 'secondaryDescription',
                          render: (desc, record) => (
                            <div>
                              <div>{desc || record.mainDescription}</div>
                              {record.txAccount && (
                                <div style={{ fontSize: '12px', color: '#1890ff', marginTop: 2 }}>
                                  分类: {record.txAccount}
                                </div>
                              )}
                            </div>
                          )
                        },
                        { title: '金额', dataIndex: 'amount', align: 'right', render: (amt) => `RM ${amt.toFixed(2)}` },
                        { 
                          title: '账户', 
                          dataIndex: 'bankAccountId',
                          render: (accountId, record) => {
                            const account = bankAccountsMap.get(accountId);
                            if (account) {
                              return `${account.bankName} - ${account.accountName} (${account.accountNumber})`;
                            }
                            return accountId;
                          }
                        },
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
  );
};

export default InternalTransferPairingPanel;

