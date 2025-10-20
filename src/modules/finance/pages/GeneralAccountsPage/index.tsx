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
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  DownloadOutlined,
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
import type { Transaction } from '../../types';
import './styles.css';

const { Option } = Select;

const GeneralAccountsPage: React.FC = () => {
  const { user } = useAuthStore();
  
  // 交易管理相关状态
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(20);
  const [txAccountFilter, setSubCategoryFilter] = useState<string>('all');
  const [classifyModalVisible, setClassifyModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  // 🆕 会员搜索相关状态
  const [modalSelectedMemberId, setModalSelectedMemberId] = useState<string>('');
  const [modalPayerPayee, setModalPayerPayee] = useState<string>(''); // 手动填写的乙方
  const [modalSubCategory, setModalSubCategory] = useState<string>(''); // 二次分类
  const [memberSearchOptions, setMemberSearchOptions] = useState<{ value: string; label: string }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  
  // 统计数据
  const [statistics, setStatistics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });
  
  // 🆕 会员信息缓存（用于显示描述栏中的会员信息）
  const [memberInfoCache, setMemberInfoCache] = useState<Record<string, { name: string; email?: string; phone?: string }>>({});

  useEffect(() => {
    loadTransactions();
  }, [transactionPage, transactionPageSize, txAccountFilter]);

  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      setTransactionsLoading(true);
      
      const result = await getTransactions({
        page: transactionPage,
        limit: transactionPageSize,
        category: 'general-accounts',
        txAccount: txAccountFilter !== 'all' ? txAccountFilter : undefined,
        sortBy: 'transactionDate',
        sortOrder: 'desc',
        includeVirtual: true, // 🔑 包含子交易（虚拟交易）
      });
      
      setTransactions(result.data);
      setTransactionTotal(result.total);
      
      // 计算统计数据
      const stats = result.data.reduce((acc, tx) => {
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
    setModalSubCategory(transaction.txAccount || '');
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
    
    if (!modalSubCategory.trim()) {
      message.warning('请选择或输入分类');
      return;
    }
    
    try {
      // 🆕 构建更新数据
      const updateData: any = { txAccount: modalSubCategory };
      
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
        txAccount: modalSubCategory,
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
      setModalSubCategory('');
      setMemberSearchOptions([]);
      loadTransactions();
    } catch (error: any) {
      message.error('更新分类失败');
      globalSystemService.log('error', 'Failed to classify transaction', 'GeneralAccountsPage', { error });
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
        const txAccountConfig: Record<string, { color: string; text: string }> = {
          // 收入类
          'donations': { color: 'blue', text: '捐赠' },
          'sponsorships': { color: 'green', text: '赞助' },
          'investments': { color: 'purple', text: '投资回报' },
          'grants': { color: 'cyan', text: '拨款' },
          'merchandise': { color: 'geekblue', text: '商品销售' },
          'other-income': { color: 'default', text: '其他收入' },
          // 支出类
          'utilities': { color: 'orange', text: '水电费' },
          'rent': { color: 'red', text: '租金' },
          'salaries': { color: 'magenta', text: '工资' },
          'equipment': { color: 'volcano', text: '设备用品' },
          'insurance': { color: 'gold', text: '保险' },
          'professional': { color: 'lime', text: '专业服务' },
          'marketing': { color: 'pink', text: '营销费用' },
          'travel': { color: 'purple', text: '差旅交通' },
          'miscellaneous': { color: 'default', text: '杂项' },
        };
        
        if (!subCat) {
          return <Tag color="default">未分类</Tag>;
        }
        
        const config = txAccountConfig[subCat] || { color: 'default', text: subCat };
        return <Tag color={config.color}>{config.text}</Tag>;
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
        {/* 统计卡片 */}
        <div className="mb-6">
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
        </div>

        {/* 交易列表 */}
        <Card style={{ marginBottom: 24 }}>
          {/* 交易筛选器 */}
          <Card className="mb-6">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={8}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="二次分类"
                  value={txAccountFilter}
                  onChange={setSubCategoryFilter}
                >
                  <Option value="all">所有分类</Option>
                  <optgroup label="收入类">
                    <Option value="donations">捐赠</Option>
                    <Option value="sponsorships">赞助</Option>
                    <Option value="investments">投资回报</Option>
                    <Option value="grants">拨款</Option>
                    <Option value="merchandise">商品销售</Option>
                    <Option value="other-income">其他收入</Option>
                  </optgroup>
                  <optgroup label="支出类">
                    <Option value="utilities">水电费</Option>
                    <Option value="rent">租金</Option>
                    <Option value="salaries">工资</Option>
                    <Option value="equipment">设备用品</Option>
                    <Option value="insurance">保险</Option>
                    <Option value="professional">专业服务</Option>
                    <Option value="marketing">营销费用</Option>
                    <Option value="travel">差旅交通</Option>
                    <Option value="miscellaneous">杂项</Option>
                  </optgroup>
                </Select>
              </Col>
              <Col xs={24} md={16} style={{ textAlign: 'right' }}>
                <Space>
                  <span style={{ color: '#999', fontSize: '14px' }}>
                    共 {transactionTotal} 笔日常账户相关交易
                  </span>
                  <Button icon={<DownloadOutlined />}>
                    导出交易报表
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* 交易表格 */}
          <Card title="日常账户交易记录（二次分类）">
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
        </Card>

        {/* 分类模态框 */}
        <Modal
          title="交易二次分类"
          open={classifyModalVisible}
          onCancel={() => {
            setClassifyModalVisible(false);
            setSelectedTransaction(null);
            setModalSelectedMemberId('');
            setModalPayerPayee('');
            setModalSubCategory('');
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
                
                {selectedTransaction.transactionType === 'income' ? (
                  <>
                    <h4 style={{ marginTop: 12, marginBottom: 8, color: '#3f8600' }}>收入类别</h4>
                    {[
                      { key: 'donations', label: '捐赠' },
                      { key: 'sponsorships', label: '赞助' },
                      { key: 'investments', label: '投资回报' },
                      { key: 'grants', label: '拨款' },
                      { key: 'merchandise', label: '商品销售' },
                      { key: 'other-income', label: '其他收入' },
                    ].map(cat => (
                      <Button 
                        key={cat.key}
                        block 
                        size="large"
                        type={modalSubCategory === cat.key ? 'primary' : 'default'}
                        onClick={() => setModalSubCategory(cat.key)}
                      >
                        {cat.label}
                      </Button>
                    ))}
                  </>
                ) : (
                  <>
                    <h4 style={{ marginTop: 12, marginBottom: 8, color: '#cf1322' }}>支出类别</h4>
                    {[
                      { key: 'utilities', label: '水电费' },
                      { key: 'rent', label: '租金' },
                      { key: 'salaries', label: '工资' },
                      { key: 'equipment', label: '设备用品' },
                      { key: 'insurance', label: '保险' },
                      { key: 'professional', label: '专业服务' },
                      { key: 'marketing', label: '营销费用' },
                      { key: 'travel', label: '差旅交通' },
                      { key: 'miscellaneous', label: '杂项' },
                    ].map(cat => (
                      <Button 
                        key={cat.key}
                        block 
                        size="large"
                        type={modalSubCategory === cat.key ? 'primary' : 'default'}
                        onClick={() => setModalSubCategory(cat.key)}
                      >
                        {cat.label}
                      </Button>
                    ))}
                  </>
                )}
                
                {/* 🆕 提交按钮 */}
                <Button 
                  type="primary"
                  block
                  size="large"
                  style={{ marginTop: 16 }}
                  onClick={handleClassifySubmit}
                  disabled={!modalSubCategory}
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
