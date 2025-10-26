/**
 * General Accounts Page
 * 日常账户管理页面
 * 
 * Manages day-to-day income and expenses categorized by type with secondary classification
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
  message,
  Modal,
  Select,
  Input,
  Tabs,
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  DownloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getTransactions, updateTransaction } from '../../services/transactionService';
import { getMembers, getMemberById } from '../../../member/services/memberService';
import { smartFiscalYearService } from '../../services/smartFiscalYearService';
import { getActiveTransactionPurposes } from '../../../system/services/transactionPurposeService';
import type { Transaction } from '../../types';
import type { FiscalYearPeriod } from '../../types/fiscalYear';
import './styles.css';

const { Option } = Select;

const GeneralAccountsPage: React.FC = () => {
  const { user } = useAuthStore();
  
  // 筛选状态管理
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [fiscalYearOptions, setFiscalYearOptions] = useState<Array<{ label: string; value: string; period: FiscalYearPeriod }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 收入/支出分类
  const [searchText, setSearchText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'list' | 'transactions'>('list');
  
  // 交易管理相关状态
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(100); // 🆕 增加默认显示数量以匹配实际数据
  const [txAccountFilter, setTxAccountFilter] = useState<string>('all');
  const [classifyModalVisible, setClassifyModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  // 🆕 会员搜索相关状态
  const [modalSelectedMemberId, setModalSelectedMemberId] = useState<string>('');
  const [modalPayerPayee, setModalPayerPayee] = useState<string>(''); // 手动填写的乙方
  const [modalTxAccount, setModalTxAccount] = useState<string>(''); // 交易账户
  const [memberSearchOptions, setMemberSearchOptions] = useState<{ value: string; label: string }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  
  // 🆕 批量选择与分类
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [bulkClassifyModalVisible, setBulkClassifyModalVisible] = useState(false);
  
  // 🆕 交易用途选项（从财务类别管理加载）
  const [purposeOptions, setPurposeOptions] = useState<{ label: string; value: string }[]>([]);
  
  // 统计数据
  const [statistics, setStatistics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });
  
  // 🆕 会员信息缓存（用于显示描述栏中的会员信息）
  const [memberInfoCache, setMemberInfoCache] = useState<Record<string, { name: string; email?: string; phone?: string }>>({});
  
  // 🆕 动态二次分类选项
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
  const [hasUncategorized, setHasUncategorized] = useState(false); // 是否有未分类交易

  useEffect(() => {
    loadTransactions();
    loadPurposeOptions(); // 🆕 加载交易用途选项
    loadFiscalYearOptions(); // 🆕 加载财年选项
  }, [transactionPage, transactionPageSize, txAccountFilter, selectedYear, selectedCategory, searchText]);

  // 🆕 加载交易用途选项
  const loadPurposeOptions = async () => {
    try {
      const purposes = await getActiveTransactionPurposes();
      setPurposeOptions(purposes);
    } catch (error) {
      console.error('加载交易用途选项失败:', error);
    }
  };

  // 🆕 加载财年选项
  const loadFiscalYearOptions = async () => {
    try {
      const options = await smartFiscalYearService.getSmartFiscalYearOptions();
      setFiscalYearOptions(options);
    } catch (error) {
      console.error('加载财年选项失败:', error);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      setTransactionsLoading(true);
      
      const result = await getTransactions({
        page: 1, // 获取所有数据进行客户端筛选
        limit: 1000, // 增加限制以获取更多数据
        category: 'general-accounts',
        // txAccount: 移除服务端筛选，改为客户端筛选
        sortBy: 'transactionDate',
        sortOrder: 'desc',
        includeVirtual: true, // 🔑 包含子交易（虚拟交易）
      });
      
      // 应用客户端筛选
      let filteredData = result.data;

      // 年份筛选
      if (selectedYear !== 'all') {
        filteredData = filteredData.filter(tx => {
          const txYear = new Date(tx.transactionDate).getFullYear();
          const targetYear = parseInt(selectedYear.replace('FY', ''));
          return txYear === targetYear;
        });
      }

      // 收入/支出分类筛选
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'income') {
          filteredData = filteredData.filter(tx => tx.transactionType === 'income');
        } else if (selectedCategory === 'expense') {
          filteredData = filteredData.filter(tx => tx.transactionType === 'expense');
        }
      }

      // 🆕 二次分类筛选（txAccount）
      if (txAccountFilter !== 'all') {
        if (txAccountFilter === 'uncategorized') {
          // 筛选未分类的交易
          filteredData = filteredData.filter(tx => !tx.txAccount || tx.txAccount.trim() === '');
        } else {
          // 筛选指定分类的交易
          filteredData = filteredData.filter(tx => tx.txAccount === txAccountFilter);
        }
      }

      // 搜索文本筛选
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase().trim();
        filteredData = filteredData.filter(tx => {
          return (
            tx.mainDescription?.toLowerCase().includes(searchLower) ||
            tx.subDescription?.toLowerCase().includes(searchLower) ||
            tx.payerPayee?.toLowerCase().includes(searchLower) ||
            tx.txAccount?.toLowerCase().includes(searchLower)
          );
        });
      }

      // 🆕 客户端分页
      const startIndex = (transactionPage - 1) * transactionPageSize;
      const endIndex = startIndex + transactionPageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);
      
      setTransactions(paginatedData);
      setTransactionTotal(filteredData.length);
      
      // 🆕 提取所有唯一的二次分类选项
      const uniqueSubCategories = Array.from(
        new Set(
          result.data
            .map(t => t.txAccount)
            .filter((cat): cat is string => Boolean(cat) && typeof cat === 'string' && cat.trim() !== '')
        )
      ).sort();
      setAvailableSubCategories(uniqueSubCategories);
      
      // 🆕 检测是否有未分类交易
      const uncategorizedCount = result.data.filter(t => !t.txAccount || t.txAccount.trim() === '').length;
      setHasUncategorized(uncategorizedCount > 0);
      
      // 计算统计数据（基于筛选后的全部数据，不是分页后的）
      const stats = filteredData.reduce((acc, tx) => {
        if (tx.transactionType === 'income') {
          acc.totalIncome += tx.amount || 0;
        } else {
          acc.totalExpense += tx.amount || 0;
        }
        return acc;
      }, { totalIncome: 0, totalExpense: 0, netBalance: 0 });
      
      stats.netBalance = stats.totalIncome - stats.totalExpense;
      setStatistics(stats);
      
      // 🆕 提取所有唯一的 memberId 并获取会员信息
      const uniqueMemberIds = Array.from(
        new Set(
          result.data
            .map(t => (t as any)?.metadata?.memberId as string | undefined)
            .filter(Boolean)
        )
      );
      
      if (uniqueMemberIds.length > 0) {
        const memberCache: Record<string, { name: string; email?: string; phone?: string }> = {};
        
        for (const memberId of uniqueMemberIds) {
          if (!memberId) continue; // 跳过空值
          
          try {
            const member = await getMemberById(memberId);
            if (member) {
              memberCache[memberId] = {
                name: member.name,
                email: member.email,
                phone: member.phone,
              };
            }
          } catch (error) {
            console.warn(`Failed to load member ${memberId}:`, error);
          }
        }
        
        setMemberInfoCache(memberCache);
      }
    } catch (error: any) {
      message.error('加载交易记录失败');
      globalSystemService.log('error', 'Failed to load general accounts transactions', 'GeneralAccountsPage', { error });
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  // 打开分类模态框
  const handleClassify = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    
    // 🆕 预填现有信息
    setModalTxAccount(transaction.txAccount || '');
    const existingMemberId = (transaction as any)?.metadata?.memberId as string | undefined;
    const existingPayerPayee = transaction.payerPayee || '';
    
    setModalPayerPayee(existingPayerPayee);
    
    if (existingMemberId) {
      setModalSelectedMemberId(existingMemberId);
      // 加载该会员的信息
      try {
        const member = await getMemberById(existingMemberId);
        if (member) {
          setMemberSearchOptions([
            { value: member.id, label: `${member.name} (${member.email || member.phone || member.memberId || ''})` }
          ]);
        } else {
          setMemberSearchOptions([
            { value: existingMemberId, label: `会员ID: ${existingMemberId}` }
          ]);
        }
      } catch (error) {
        setMemberSearchOptions([
          { value: existingMemberId, label: `会员ID: ${existingMemberId}` }
        ]);
      }
    } else {
      setModalSelectedMemberId('');
      setMemberSearchOptions([]);
    }
    
    setClassifyModalVisible(true);
  };
  
  // 保存二次分类
  const handleClassifySubmit = async () => {
    if (!user || !selectedTransaction) return;
    
    if (!modalTxAccount.trim()) {
      message.warning('请选择或输入交易账户');
      return;
    }
    
    try {
      // 🆕 构建更新数据
      const updateData: any = { txAccount: modalTxAccount };
      
      // 🆕 处理付款人/收款人信息
      let finalPayerPayee = modalPayerPayee.trim();
      
      // 如果选择了会员，用会员名字作为 payerPayee
      if (modalSelectedMemberId) {
        const member = await getMemberById(modalSelectedMemberId);
        if (member) {
          finalPayerPayee = member.name;
        }
      }
      
      // 设置 payerPayee（如果有值）
      if (finalPayerPayee) {
        updateData.payerPayee = finalPayerPayee;
      }
      
      // 🆕 设置 metadata.memberId（如果选择了会员）
      if (modalSelectedMemberId) {
        updateData.metadata = {
          ...selectedTransaction.metadata,
          memberId: modalSelectedMemberId,
        };
      }
      
      console.log('🔗 [GeneralAccountsPage] Updating transaction with:', {
        txAccount: modalTxAccount,
        memberId: modalSelectedMemberId || 'none',
        payerPayee: finalPayerPayee || 'none',
      });
      
      await updateTransaction(
        selectedTransaction.id,
        updateData,
        user.id
      );
      
      message.success('分类已更新');
      setClassifyModalVisible(false);
      setSelectedTransaction(null);
      setModalSelectedMemberId('');
      setModalPayerPayee('');
      setModalTxAccount('');
      setMemberSearchOptions([]);
      loadTransactions();
    } catch (error: any) {
      message.error('更新分类失败');
      globalSystemService.log('error', 'Failed to classify transaction', 'GeneralAccountsPage', { error });
    }
  };

  // 🆕 批量分类
  const handleBatchClassify = async (txAccount: string, memberId?: string) => {
    if (!user) return;
    
    if (selectedTransactionIds.length === 0) {
      message.warning('请先选择要分类的交易');
      return;
    }
    
    if (!txAccount.trim()) {
      message.warning('请输入分类');
      return;
    }
    
    try {
      // 批量更新所有选中的交易
      await Promise.all(
        selectedTransactionIds.map((id) => {
          const updateData: any = { txAccount };
          if (memberId) {
            updateData.metadata = { memberId };
          }
          return updateTransaction(id, updateData, user.id);
        })
      );
      
      message.success(`成功将 ${selectedTransactionIds.length} 笔交易分类到【${txAccount}】`);
      setBulkClassifyModalVisible(false);
      setSelectedTransactionIds([]);
      loadTransactions();
    } catch (error: any) {
      message.error('批量分类失败');
      globalSystemService.log('error', 'Failed to batch classify transactions', 'GeneralAccountsPage', { error });
    }
  };
  
  // 交易记录表格列
  const transactionColumns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      sorter: (a: Transaction, b: Transaction) => {
        const dateA = new Date(a.transactionDate).getTime();
        const dateB = new Date(b.transactionDate).getTime();
        return dateA - dateB;
      },
      defaultSortOrder: 'descend', // 默认降序（最新的在前）
      render: (date: string) => globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '描述',
      dataIndex: 'mainDescription',
      key: 'mainDescription',
      width: 250,
      ellipsis: true,
      render: (description: string, record: Transaction) => {
        const memberId = (record as any)?.metadata?.memberId;
        const memberInfo = memberId ? memberInfoCache[memberId] : null;
        
        return (
          <div>
            <div style={{ marginBottom: (record.subDescription || memberInfo) ? 4 : 0 }}>
              {description}
            </div>
            {record.subDescription && (
              <div style={{ 
                fontSize: '12px', 
                color: '#888', 
                marginBottom: memberInfo ? 4 : 0
              }}>
                {record.subDescription}
              </div>
            )}
            {memberInfo && (
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                backgroundColor: '#f0fdf4', 
                padding: '2px 6px', 
                borderRadius: '3px',
                display: 'inline-block'
              }}>
                👤 {memberInfo.name}
                {memberInfo.email && ` (${memberInfo.email})`}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number, record: Transaction) => {
        const safeAmount = amount ?? 0;
        const typeClass = record.transactionType === 'income' ? 'text-success' : 'text-danger';
        const sign = record.transactionType === 'income' ? '+' : '-';
        return (
          <span className={typeClass}>
            {sign}RM {safeAmount.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '二次分类',
      dataIndex: 'txAccount',
      key: 'txAccount',
      width: 150,
      render: (subCat: string) => {
        if (!subCat) {
          return <Tag color="default">未分类</Tag>;
        }
        
        // 🆕 从purposeOptions中查找对应的label
        const purpose = purposeOptions.find(p => p.value === subCat);
        const displayText = purpose ? purpose.label : subCat;
        
        return <Tag color="purple">{displayText}</Tag>;
      },
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
        const config = statusConfig[status] || { color: 'default', text: status || '未知' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleClassify(record)}
          >
            {record.txAccount ? '重新分类' : '分类'}
          </Button>
          <Button type="link" size="small">
            查看
          </Button>
        </Space>
      ),
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  if (transactionsLoading && transactions.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <div className="general-accounts-page">
        {/* 第一行：统计卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="运营收入"
                value={statistics.totalIncome}
                precision={0}
                prefix="RM"
                valueStyle={{ color: '#3f8600' }}
                suffix={<RiseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="运营支出"
                value={statistics.totalExpense}
                precision={0}
                prefix="RM"
                valueStyle={{ color: '#cf1322' }}
                suffix={<FallOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="运营利润"
                value={statistics.netBalance}
                precision={0}
                prefix="RM"
                valueStyle={{ color: statistics.netBalance >= 0 ? '#3f8600' : '#cf1322' }}
                suffix={statistics.netBalance >= 0 ? <RiseOutlined /> : <FallOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 第二行：左侧筛选 + 右侧搜索和内容 */}
        <Row gutter={16}>
          {/* 左侧筛选卡片 */}
          <Col xs={24} lg={6}>
            <Card title="🏦 日常账户筛选" style={{ position: 'sticky', top: 16 }}>
              {/* 年份筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>📅 年份</div>
                <Select
                  style={{ width: '100%' }}
                  value={selectedYear}
                  onChange={setSelectedYear}
                  placeholder="选择年份"
                  showSearch
                >
                  <Option value="all">所有年份</Option>
                  {fiscalYearOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>
              
              {/* 收入/支出分类筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>💰 交易类型</div>
                <Select
                  style={{ width: '100%' }}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  placeholder="选择类型"
                >
                  <Option value="all">所有类型</Option>
                  <Option value="income">📈 收入</Option>
                  <Option value="expense">📉 支出</Option>
                </Select>
              </div>
              
              {/* 二次分类筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>🏷️ 二次分类</div>
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择分类"
                  value={txAccountFilter}
                  onChange={setTxAccountFilter}
                  showSearch
                  filterOption={(input, option) => {
                    const label = option?.children?.toString() || '';
                    return label.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  <Option value="all">所有分类</Option>
                  {availableSubCategories.map(category => (
                    <Option key={category} value={category}>
                      {category}
                    </Option>
                  ))}
                </Select>
              </div>
              
              {/* 快速筛选按钮 */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                {/* 🆕 未分类快速筛选 */}
                <Button 
                  type="default"
                  size="small" 
                  onClick={() => {
                    setTxAccountFilter('uncategorized');
                  }}
                  disabled={!hasUncategorized}
                  style={{ width: '100%', marginBottom: 8 }}
                  danger={hasUncategorized}
                >
                  {hasUncategorized ? '🔴 显示未分类交易' : '✅ 无未分类交易'}
                </Button>
                
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => {
                    setSelectedYear('all');
                    setSelectedCategory('all');
                    setTxAccountFilter('all');
                    setSearchText('');
                  }}
                  style={{ width: '100%' }}
                >
                  清除所有筛选
                </Button>
              </div>
            </Card>
          </Col>
          
          {/* 右侧搜索和内容区域 */}
          <Col xs={24} lg={18}>
            {/* 搜索输入框 */}
            <Card style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索交易描述、付款人/收款人、分类..."
                style={{ width: '100%' }}
                suffix={<SearchOutlined />}
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Card>

            {/* 日常账户标签页 */}
            <Card>
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as 'list' | 'transactions')}
                tabBarExtraContent={
                  <Space>
                    <span style={{ color: '#999', fontSize: '14px' }}>
                      共 {transactionTotal} 笔交易
                    </span>
                    <Button icon={<DownloadOutlined />}>
                      导出交易报表
                    </Button>
                  </Space>
                }
                items={[
                  {
                    key: 'list',
                    label: '日常账户列表',
                    children: (
                      <Card title="日常账户交易记录">
                        <Table
                          {...tableConfig}
                          columns={transactionColumns}
                          dataSource={transactions}
                          rowKey="id"
                          loading={transactionsLoading}
                          pagination={{
                            current: transactionPage,
                            pageSize: transactionPageSize,
                            total: transactionTotal,
                            onChange: (page, size) => {
                              setTransactionPage(page);
                              setTransactionPageSize(size || 20);
                            },
                            showSizeChanger: true,
                            showTotal: (total) => `共 ${total} 条交易`,
                          }}
                          scroll={{ x: 1200 }}
                        />
                      </Card>
                    ),
                  },
                  {
                    key: 'transactions',
                    label: '日常账户交易记录（二次分类）',
                    children: (
                      <Card 
                        title="日常账户交易记录"
                        extra={
                          <Space>
                            <span style={{ color: '#999' }}>已选 {selectedTransactionIds.length} 条</span>
                            <Button
                              type="primary"
                              disabled={selectedTransactionIds.length === 0}
                              onClick={() => setBulkClassifyModalVisible(true)}
                            >
                              批量分类
                            </Button>
                          </Space>
                        }
                      >
                        <Table
                          {...tableConfig}
                          columns={transactionColumns}
                          dataSource={transactions}
                          rowKey="id"
                          loading={transactionsLoading}
                          rowSelection={{
                            selectedRowKeys: selectedTransactionIds,
                            onChange: (keys) => setSelectedTransactionIds(keys as string[]),
                            getCheckboxProps: (record: Transaction) => ({
                              disabled: record.parentTransactionId !== undefined, // 子交易不能单独选择
                            }),
                          }}
                          pagination={{
                            current: transactionPage,
                            pageSize: transactionPageSize,
                            total: transactionTotal,
                            onChange: (page, size) => {
                              setTransactionPage(page);
                              setTransactionPageSize(size || 20);
                            },
                            showSizeChanger: true,
                            showTotal: (total) => `共 ${total} 条交易`,
                          }}
                          scroll={{ x: 1200 }}
                        />
                      </Card>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>

        {/* 🆕 批量分类模态框 */}
        <Modal
          title={`批量分类（已选 ${selectedTransactionIds.length} 条）`}
          open={bulkClassifyModalVisible}
          onCancel={() => setBulkClassifyModalVisible(false)}
          footer={null}
          width={600}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 二次分类输入 */}
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: 8 }}>二次分类：</p>
              <Select
                style={{ width: '100%' }}
                placeholder="选择或输入分类"
                value={modalTxAccount}
                onChange={setModalTxAccount}
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const label = option?.children?.toString() || '';
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {purposeOptions.map(purpose => (
                  <Option key={purpose.value} value={purpose.value}>
                    {purpose.label}
                  </Option>
                ))}
              </Select>
              {purposeOptions.length === 0 && (
                <p style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
                  💡 请先在"财务类别管理"中添加交易用途
                </p>
              )}
            </div>

            {/* 关联会员（可选） */}
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: 8 }}>关联会员（可选）：</p>
              <Select
                showSearch
                allowClear
                placeholder="搜索姓名/邮箱/电话"
                style={{ width: '100%' }}
                value={modalSelectedMemberId || undefined}
                filterOption={false}
                notFoundContent={memberSearchLoading ? '加载中...' : '暂无数据'}
                onSearch={async (value) => {
                  setMemberSearchLoading(true);
                  try {
                    const res = await getMembers({ page: 1, search: value, limit: 10 });
                    setMemberSearchOptions(
                      res.data.map((m: any) => ({ value: m.id, label: `${m.name} (${m.email || m.phone || m.memberId || ''})` }))
                    );
                  } finally {
                    setMemberSearchLoading(false);
                  }
                }}
                onChange={(val) => setModalSelectedMemberId(val || '')}
                options={memberSearchOptions}
              />
            </div>

            {/* 确认按钮 */}
            <Button
              type="primary"
              block
              size="large"
              onClick={async () => {
                await handleBatchClassify(modalTxAccount, modalSelectedMemberId);
              }}
              disabled={!modalTxAccount}
            >
              确认批量分类
            </Button>
          </div>
        </Modal>

        {/* 分类模态框 */}
        <Modal
          title="交易二次分类"
          open={classifyModalVisible}
          onCancel={() => {
            setClassifyModalVisible(false);
            setSelectedTransaction(null);
            setModalSelectedMemberId('');
            setModalPayerPayee('');
            setModalTxAccount('');
            setMemberSearchOptions([]);
          }}
          footer={null}
          width={800}
        >
          {selectedTransaction && (
            <>
              <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                <p><strong>交易描述：</strong>{selectedTransaction.mainDescription}</p>
                <p><strong>交易金额：</strong>RM {selectedTransaction.amount?.toFixed(2)}</p>
                <p><strong>交易类型：</strong>{selectedTransaction.transactionType === 'income' ? '收入' : '支出'}</p>
                <p><strong>交易日期：</strong>{globalDateService.formatDate(new Date(selectedTransaction.transactionDate), 'display')}</p>
                {selectedTransaction.txAccount && (
                  <p><strong>当前分类：</strong>{selectedTransaction.txAccount}</p>
                )}
                {selectedTransaction.payerPayee && (
                  <p><strong>当前乙方：</strong>{selectedTransaction.payerPayee}</p>
                )}
              </div>
              
              {/* 🆕 付款人/收款人信息区域 */}
              <div style={{ marginBottom: 24, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
                <p style={{ fontWeight: 'bold', marginBottom: 12, fontSize: 16 }}>
                  {selectedTransaction.transactionType === 'income' ? '📥 付款人信息' : '📤 收款人信息'}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p style={{ marginBottom: 8, fontWeight: 500 }}>选择会员：</p>
                    <Select
                      showSearch
                      allowClear
                      placeholder="搜索姓名/邮箱/电话"
                      style={{ width: '100%' }}
                      value={modalSelectedMemberId || undefined}
                      filterOption={false}
                      notFoundContent={memberSearchLoading ? '加载中...' : '暂无数据'}
                      onSearch={async (value) => {
                        if (value.length < 2) return;
                        setMemberSearchLoading(true);
                        try {
                          const res = await getMembers({ page: 1, limit: 10, search: value });
                          setMemberSearchOptions(
                            res.data.map((m: any) => ({ value: m.id, label: `${m.name} (${m.email || m.phone || m.memberId || ''})` }))
                          );
                        } finally {
                          setMemberSearchLoading(false);
                        }
                      }}
                      onChange={(val) => {
                        setModalSelectedMemberId(val || '');
                        if (val) {
                          setModalPayerPayee(''); // 选择会员后清空手动填写
                        }
                      }}
                      options={memberSearchOptions}
                    />
                  </div>
                  
                  <div>
                    <p style={{ marginBottom: 8, fontWeight: 500 }}>或手动填写（非会员）：</p>
                    <Input
                      placeholder="例如：某某公司、某某个人"
                      value={modalPayerPayee}
                      onChange={(e) => {
                        setModalPayerPayee(e.target.value);
                        if (e.target.value.trim()) {
                          setModalSelectedMemberId(''); // 手动填写后清空会员选择
                        }
                      }}
                      disabled={!!modalSelectedMemberId}
                    />
                    {modalSelectedMemberId && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                        已选择会员，手动填写已禁用
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontWeight: 'bold', marginBottom: 8 }}>选择二次分类：</p>
                
                {/* 🆕 使用Select下拉框，从交易用途列表加载 */}
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择分类"
                  value={modalTxAccount}
                  onChange={setModalTxAccount}
                  allowClear
                  showSearch
                  size="large"
                  filterOption={(input, option) => {
                    const label = option?.children?.toString() || '';
                    return label.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {purposeOptions.map(purpose => (
                    <Option key={purpose.value} value={purpose.value}>
                      {purpose.label}
                    </Option>
                  ))}
                </Select>
                
                {purposeOptions.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
                    💡 请先在"财务类别管理"中添加交易用途
                  </p>
                )}
                
                {/* 🆕 提交按钮 */}
                <Button 
                  type="primary"
                  block
                  size="large"
                  style={{ marginTop: 16 }}
                  onClick={handleClassifySubmit}
                  disabled={!modalTxAccount}
                >
                  确认保存
                </Button>
              </div>
            </>
          )}
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default GeneralAccountsPage;
