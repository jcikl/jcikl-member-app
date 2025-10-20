/**
 * Member Fee Management Page
 * 会员费用管理页面
 * 
 * Tracks and manages member fee payments
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Input,
  Select,
  Button,
  Tag,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  message,
  Space,
  Tooltip,
  Tabs,
} from 'antd';
import {
  SearchOutlined,
  SendOutlined,
  DownloadOutlined,
  RiseOutlined,
  FallOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  getMemberFees,
  getMemberFeeStatistics,
  sendPaymentReminder,
  recordMemberFeePayment,
} from '../../services/memberFeeService';
import { getCurrentFiscalYear } from '../../services/fiscalYearService';
import { getTransactions, updateTransaction } from '../../services/transactionService';
import { getMembers, getMemberById } from '@/modules/member/services/memberService';
import type { MemberFee, MemberFeeStatus, Transaction } from '../../types';
import type { MemberCategoryType } from '@/modules/member/types';
import { MEMBER_CATEGORY_OPTIONS } from '@/modules/member/types';
import './styles.css';

const { Search } = Input;
const { Option } = Select;

const MemberFeeManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [memberFees, setMemberFees] = useState<MemberFee[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberFeeStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<MemberCategoryType | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedFee, setSelectedFee] = useState<MemberFee | null>(null);
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
  });
  
  // 交易管理相关状态
  const [activeTab, setActiveTab] = useState<'member-fees' | 'transactions'>('member-fees');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(20);
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all'); // 分类（new-member-fee 等）
  const [transactionYearFilter, setTransactionYearFilter] = useState<string>('all'); // 年份（YYYY）
  const [classifyModalVisible, setClassifyModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  // 分类模态框本地状态（年份必填 + 底部操作栏）
  const [modalSelectedCategory, setModalSelectedCategory] = useState<string>('');
  const [modalYearInput, setModalYearInput] = useState<string>('');
  const [modalSelectedMemberId, setModalSelectedMemberId] = useState<string>('');
  const [memberSearchOptions, setMemberSearchOptions] = useState<{ value: string; label: string }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  
  // 🆕 类别统计数据
  const [categoryStats, setCategoryStats] = useState<Record<string, { count: number; amount: number }>>({});
  const [selectedCategoryCard, setSelectedCategoryCard] = useState<string>('all'); // 当前选中的类别卡片
  // 批量选择与分类
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [bulkClassifyModalVisible, setBulkClassifyModalVisible] = useState(false);
  // 🆕 会员信息缓存（用于在描述栏显示会员名字）
  const [memberInfoCache, setMemberInfoCache] = useState<Record<string, { name: string; email?: string; phone?: string }>>({});

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    loadMemberFees();
  }, [currentPage, pageSize, searchText, statusFilter, categoryFilter, selectedYear]);
  
  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, transactionPage, transactionPageSize, subCategoryFilter, transactionYearFilter]);

  const initializeData = async () => {
    try {
      // Get current fiscal year
      const fyData = await getCurrentFiscalYear();
      if (fyData) {
        setSelectedYear(fyData.name);
      } else {
        // Fallback to current year
        const year = new Date().getFullYear();
        setSelectedYear(`FY${year}`);
      }
    } catch (error: any) {
      message.error('初始化失败');
    }
  };

  const loadMemberFees = async () => {
    if (!user || !selectedYear) return;

    try {
      setLoading(true);

      // Load member fees
      const result = await getMemberFees({
        page: currentPage,
        limit: pageSize,
        search: searchText || undefined,
        fiscalYear: selectedYear,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        memberCategory: categoryFilter !== 'all' ? (categoryFilter as MemberCategoryType) : undefined,
        sortBy: 'memberName',
        sortOrder: 'asc',
      });

      setMemberFees(result.data);
      setTotal(result.total);

      // Load statistics
      const stats = await getMemberFeeStatistics();
      setStatistics(stats);
      
      // 🆕 计算类别统计数据
      await calculateCategoryStats(selectedYear);

    } catch (error: any) {
      message.error('加载会员费用数据失败');
      globalSystemService.log(
        'error',
        'Failed to load member fees',
        'MemberFeeManagementPage.loadMemberFees',
        { error: error.message, userId: user.id }
      );
    } finally {
      setLoading(false);
    }
  };
  
  // 🆕 计算各类别统计数据
  const calculateCategoryStats = async (year: string) => {
    try {
      const categories = ['all', 'Official Member', 'Associate Member', 'Honorary Member', 'Visiting Member', 'Alumni', 'JCI Friend'];
      const stats: Record<string, { count: number; amount: number }> = {};
      
      for (const category of categories) {
        const result = await getMemberFees({
          page: 1,
          limit: 10000, // 获取所有数据用于统计
          fiscalYear: year,
          memberCategory: category !== 'all' ? (category as MemberCategoryType) : undefined,
        });
        
        const totalAmount = result.data.reduce((sum, fee) => sum + (fee.expectedAmount || 0), 0);
        
        stats[category] = {
          count: result.total,
          amount: totalAmount,
        };
      }
      
      console.log('📊 [MemberFeeManagement] Category stats calculated:', stats);
      setCategoryStats(stats);
    } catch (error) {
      console.error('❌ [MemberFeeManagement] Failed to calculate category stats:', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as MemberFeeStatus | 'all');
    setCurrentPage(1);
  };
  
  // 🆕 处理类别卡片点击
  const handleCategoryCardClick = (category: string) => {
    console.log('🔗 [MemberFeeManagement] Category card clicked:', category);
    setSelectedCategoryCard(category);
    setCategoryFilter(category as MemberCategoryType | 'all');
    setCurrentPage(1);
  };

  const handleSendReminder = async (feeId: string) => {
    if (!user) return;

    try {
      await sendPaymentReminder(feeId, user.id);
      message.success('付款提醒已发送');
      loadMemberFees();
    } catch (error: any) {
      message.error('发送提醒失败');
    }
  };

  const handleRecordPayment = (fee: MemberFee) => {
    setSelectedFee(fee);
    form.setFieldsValue({
      amount: fee.remainingAmount,
      paymentDate: dayjs(),
      paymentMethod: 'bank_transfer',
    });
    setPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async () => {
    if (!user || !selectedFee) return;

    try {
      const values = await form.validateFields();
      
      // Note: This should create a transaction first, then link it to member fee
      // For now, recording payment without transaction linkage
      // Transaction will be created separately when transaction management is implemented
      await recordMemberFeePayment(
        selectedFee.id,
        values.amount,
        values.paymentMethod,
        '', // Transaction ID will be linked later
        values.receiptNumber,
        user.id
      );

      message.success('付款记录已保存');
      setPaymentModalVisible(false);
      form.resetFields();
      setSelectedFee(null);
      loadMemberFees();
    } catch (error: any) {
      message.error('保存付款记录失败');
    }
  };

  const handleExportReport = () => {
    message.info('导出功能开发中...');
  };
  
  // 加载会员费相关交易
  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      setTransactionsLoading(true);
      
      // 服务端不再根据 subCategory 精确匹配（存储为 YYYY-category），统一改为客户端筛选
      const subCategoryFilterValue = undefined;
      
      const result = await getTransactions({
        page: transactionPage,
        limit: transactionPageSize,
        category: 'member-fees',
        subCategory: subCategoryFilterValue,
        sortBy: 'transactionDate',
        sortOrder: 'desc',
        includeVirtual: true, // 🔑 包含子交易（拆分的会员费）
      });
      
      // 客户端筛选：年份 + 分类
      let filteredTransactions = result.data;
      const applyYear = (list: Transaction[]) => {
        if (transactionYearFilter !== 'all') {
          return list.filter(t => t.subCategory && t.subCategory.startsWith(`${transactionYearFilter}-`));
        }
        if (subCategoryFilter.startsWith('year-')) {
          const year = subCategoryFilter.replace('year-', '');
          return list.filter(t => t.subCategory && t.subCategory.startsWith(`${year}-`));
        }
        return list;
      };
      const applyCategory = (list: Transaction[]) => {
        if (subCategoryFilter === 'uncategorized') {
          return list.filter(t => !t.subCategory);
        }
        if (subCategoryFilter !== 'all' && !subCategoryFilter.startsWith('year-')) {
          return list.filter(t => {
            if (!t.subCategory) return false;
            const parts = t.subCategory.split('-');
            const key = /^\d{4}$/.test(parts[0]) ? parts.slice(1).join('-') : t.subCategory;
            return key === subCategoryFilter;
          });
        }
        return list;
      };
      filteredTransactions = applyCategory(applyYear(result.data));
      
      // 🆕 客户端排序：按交易日期降序（最新的在前）
      filteredTransactions.sort((a, b) => {
        const dateA = new Date(a.transactionDate).getTime();
        const dateB = new Date(b.transactionDate).getTime();
        return dateB - dateA; // 降序：最新的在前
      });
      
      // 🔍 Debug: 加载交易记录（生产环境可注释）
      // const childTransactions = result.data.filter(t => t.isVirtual === true);
      // console.log('💰 [MemberFeeManagementPage] 加载交易记录:', {
      //   总数: result.data.length,
      //   子交易数: childTransactions.length,
      // });
      
      // 🆕 加载会员信息缓存
      const finalTransactions = transactionYearFilter !== 'all' || subCategoryFilter.startsWith('year-') || (subCategoryFilter !== 'all' && !subCategoryFilter.startsWith('year-')) 
        ? filteredTransactions 
        : result.data;
      
      // 提取所有需要加载的会员ID
      const memberIds = finalTransactions
        .map(t => (t as any)?.metadata?.memberId)
        .filter((id): id is string => Boolean(id))
        .filter((id, index, array) => array.indexOf(id) === index); // 去重
      
      // 批量加载会员信息
      if (memberIds.length > 0) {
        const memberInfoPromises = memberIds.map(async (memberId) => {
          try {
            const member = await getMemberById(memberId);
            return { memberId, member };
          } catch (error) {
            console.error(`Failed to load member info for ${memberId}:`, error);
            return { memberId, member: null };
          }
        });
        
        const memberResults = await Promise.all(memberInfoPromises);
        const newMemberCache = memberResults.reduce((cache, { memberId, member }) => {
          if (member) {
            cache[memberId] = {
              name: member.name,
              email: member.email,
              phone: member.phone,
            };
          }
          return cache;
        }, {} as Record<string, { name: string; email?: string; phone?: string }>);
        
        setMemberInfoCache(newMemberCache);
      }
      
      if (transactionYearFilter !== 'all' || subCategoryFilter.startsWith('year-') || (subCategoryFilter !== 'all' && !subCategoryFilter.startsWith('year-'))) {
        setTransactions(filteredTransactions);
        setTransactionTotal(filteredTransactions.length);
      } else {
        setTransactions(result.data);
        setTransactionTotal(result.total);
      }
    } catch (error: any) {
      message.error('加载交易记录失败');
      globalSystemService.log('error', 'Failed to load member fee transactions', 'MemberFeeManagementPage', { error });
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  // 打开分类模态框
  const handleClassify = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    // 初始化本地分类与年份
    const existing = transaction.subCategory || '';
    const parts = existing.split('-');
    // 年份置于前端：形如 2024-new-member-fee
    if (parts.length >= 2 && /^\d{4}$/.test(parts[0])) {
      setModalYearInput(parts[0]);
      setModalSelectedCategory(parts.slice(1).join('-'));
    } else {
      setModalSelectedCategory(existing || '');
      setModalYearInput('');
    }
    
    // 🆕 预填会员信息并加载会员选项
    const existingMemberId = (transaction as any)?.metadata?.memberId as string | undefined;
    if (existingMemberId) {
      setModalSelectedMemberId(existingMemberId);
      // 加载该会员的信息以显示名字
      try {
        const member = await getMemberById(existingMemberId);
        if (member) {
          setMemberSearchOptions([
            { value: member.id, label: `${member.name} (${member.email || member.phone || member.memberId || ''})` }
          ]);
        } else {
          // 如果没有找到，显示ID作为占位符
          setMemberSearchOptions([
            { value: existingMemberId, label: `会员ID: ${existingMemberId}` }
          ]);
        }
      } catch (error) {
        console.error('Failed to load member info:', error);
        // 如果加载失败，显示ID作为占位符
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
  const handleClassifySubmit = async (subCategory: string, memberId?: string) => {
    if (!user || !selectedTransaction) return;
    
    try {
      await updateTransaction(
        selectedTransaction.id,
        { subCategory, metadata: memberId ? { memberId } : undefined },
        user.id
      );
      
      message.success('分类已更新');
      setClassifyModalVisible(false);
      setSelectedTransaction(null);
      loadTransactions();
    } catch (error: any) {
      message.error('更新分类失败');
      globalSystemService.log('error', 'Failed to classify transaction', 'MemberFeeManagementPage', { error });
    }
  };

  const handleSendBulkReminders = () => {
    message.info('批量发送提醒功能开发中...');
  };

  // 会员费表格列
  const columns: ColumnsType<MemberFee> = [
    {
      title: '会员',
      dataIndex: 'memberName',
      key: 'member',
      render: (_: any, record: MemberFee) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.memberName || '-'}</div>
          <div style={{ color: '#999', fontSize: 12 }}>{record.memberId}</div>
        </div>
      ),
    },
    {
      title: '类别',
      dataIndex: 'memberCategory',
      key: 'memberCategory',
      render: (category: string, record: any) => {
        // 与会员管理一致：用 Tag 显示中文标签
        if (record.isPlaceholder && !category) {
          return <Tag color="default">-</Tag>;
        }
        const opt = MEMBER_CATEGORY_OPTIONS.find(opt => opt.value === category);
        return category ? <Tag color="blue">{opt?.label || category}</Tag> : '-';
      },
    },
    {
      title: '费用金额',
      dataIndex: 'expectedAmount',
      key: 'expectedAmount',
      align: 'right',
      render: (amount: number, record: any) => {
        if (record.isPlaceholder) {
          return <Tag color="default">未创建</Tag>;
        }
        return `RM ${amount.toFixed(2)}`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: MemberFeeStatus, record: any) => {
        if (record.isPlaceholder) {
          return <Tag color="default">无记录</Tag>;
        }
        const statusConfig: Record<MemberFeeStatus, { color: string; text: string }> = {
          paid: { color: 'success', text: '已付' },
          unpaid: { color: 'warning', text: '未付' },
          partial: { color: 'processing', text: '部分付款' },
          overdue: { color: 'error', text: '逾期' },
          waived: { color: 'default', text: '豁免' },
          cancelled: { color: 'default', text: '取消' },
        };
        const config = statusConfig[status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '付款日期',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (date: string | undefined, record: any) => {
        if (record.isPlaceholder) {
          return '-';
        }
        return date ? globalDateService.formatDate(new Date(date), 'display') : '-';
      },
    },
    {
      title: '二次分类',
      dataIndex: 'subCategory',
      key: 'subCategory',
      render: (subCategory: string | undefined, record: any) => {
        if (record.isPlaceholder) {
          return '-';
        }
        return subCategory ? <Tag color="purple">{subCategory}</Tag> : <Tag color="default">未分类</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: any) => {
        if (record.isPlaceholder) {
          return (
            <Tooltip title="为此会员创建费用记录">
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  message.info('创建会员费用记录功能开发中...');
                  // TODO: 实现创建会员费用记录的功能
                }}
              >
                创建费用
              </Button>
            </Tooltip>
          );
        }
        
        return (
          <Space size="small">
            {record.status !== 'paid' && (
              <>
                <Tooltip title="记录付款">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleRecordPayment(record)}
                  >
                    付款
                  </Button>
                </Tooltip>
                <Tooltip title="发送提醒">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleSendReminder(record.id)}
                  >
                    提醒
                  </Button>
                </Tooltip>
              </>
            )}
            {record.status === 'paid' && (
              <Button type="link" size="small">
                查看
              </Button>
            )}
          </Space>
        );
      },
    },
  ];
  
  // 交易记录表格列
  const transactionColumns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 80,
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
      width: 200,
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
                backgroundColor: '#f5f5f5', 
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
      width: 80,
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
      dataIndex: 'subCategory',
      key: 'subCategory',
      width: 50,
      render: (subCat: string) => {
        const subCategoryConfig: Record<string, { color: string; text: string }> = {
          'new-member-fee': { color: 'blue', text: '新会员费' },
          'renewal-fee': { color: 'green', text: '续会费' },
          'alumni-fee': { color: 'purple', text: '校友会' },
          'visiting-member-fee': { color: 'orange', text: '拜访会员' },
        };
        
        // 处理带年份的分类（年份在前）
        const getCategoryDisplay = (subCat: string) => {
          if (!subCat) return { color: 'default', text: '未分类' };
          
          // 检查是否包含年份（前端）: 2024-new-member-fee
          const parts = subCat.split('-');
          if (parts.length >= 2 && /^\d{4}$/.test(parts[0])) {
            const year = parts[0];
            const categoryKey = parts.slice(1).join('-');
            const baseConfig = subCategoryConfig[categoryKey];
            
            if (baseConfig) {
              return {
                color: baseConfig.color,
                text: `${year} ${baseConfig.text}`
              };
            }
          }
          
          // 返回基础分类配置
          return subCategoryConfig[subCat] || { color: 'default', text: subCat };
        };
        
        if (!subCat) {
          return <Tag color="default">未分类</Tag>;
        }
        
        const config = getCategoryDisplay(subCat);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 50,
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
      width: 50,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleClassify(record)}
          >
            {record.subCategory ? '重新分类' : '分类'}
          </Button>
          <Button type="link" size="small">
            查看
          </Button>
        </Space>
      ),
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  if (loading && memberFees.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <div className="member-fee-management-page">
        {/* Statistics Cards */}
        <div className="mb-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="应收总额"
                  value={statistics.totalExpected}
                  precision={0}
                  prefix="RM"
                  valueStyle={{ color: '#333' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="已收金额"
                  value={statistics.totalCollected}
                  precision={0}
                  prefix="RM"
                  valueStyle={{ color: '#10b981' }}
                  suffix={<RiseOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="待收金额"
                  value={statistics.totalOutstanding}
                  precision={0}
                  prefix="RM"
                  valueStyle={{ color: '#faad14' }}
                  suffix={<FallOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* 标签页切换 */}
        <Card style={{ marginBottom: 24 }}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'member-fees' | 'transactions')}
            items={[
              {
                key: 'member-fees',
                label: '会员费用追踪',
                children: (
                  <Row gutter={16}>
                    {/* 🆕 左侧类别筛选卡片 */}
                    <Col xs={24} lg={6} style={{ marginBottom: 16 }}>
                      {/* 年份筛选 */}
                      <Card style={{ marginBottom: 16 }}>
                        <div style={{ marginBottom: 8, fontWeight: 600 }}>📅 年份筛选</div>
                        <Select
                          style={{ width: '100%' }}
                          value={selectedYear}
                          onChange={(value) => {
                            setSelectedYear(value);
                            setCurrentPage(1);
                          }}
                        >
                          <Option value="FY2025">2025</Option>
                          <Option value="FY2024">2024</Option>
                          <Option value="FY2023">2023</Option>
                        </Select>
                      </Card>
                      
                      {/* 类别统计卡片 */}
                      <div style={{ fontWeight: 600, marginBottom: 12 }}>💼 会员类别筛选</div>
                      
                      {/* 所有类别 */}
                      <Card
                        style={{
                          marginBottom: 12,
                          cursor: 'pointer',
                          backgroundColor: selectedCategoryCard === 'all' ? '#e6f7ff' : '#fff',
                          border: selectedCategoryCard === 'all' ? '2px solid #1890ff' : '1px solid #e8e8e8',
                          transition: 'all 0.3s',
                        }}
                        bodyStyle={{ padding: 16 }}
                        onClick={() => handleCategoryCardClick('all')}
                        hoverable
                      >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 20, marginRight: 8 }}>📊</span>
                          <span style={{ fontSize: 16, fontWeight: 600 }}>所有类别</span>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                          👥 {categoryStats['all']?.count || 0} 人
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
                          💰 RM {(categoryStats['all']?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </div>
                        {selectedCategoryCard === 'all' && (
                          <div style={{ marginTop: 8, color: '#1890ff', fontSize: 12 }}>
                            ✓ 当前筛选
                          </div>
                        )}
                      </Card>
                      
                      {/* 正式会员 */}
                      <Card
                        style={{
                          marginBottom: 12,
                          cursor: 'pointer',
                          backgroundColor: selectedCategoryCard === 'Official Member' ? '#e6f7ff' : '#fff',
                          border: selectedCategoryCard === 'Official Member' ? '2px solid #52c41a' : '1px solid #e8e8e8',
                          transition: 'all 0.3s',
                        }}
                        bodyStyle={{ padding: 16 }}
                        onClick={() => handleCategoryCardClick('Official Member')}
                        hoverable
                      >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 20, marginRight: 8 }}>👔</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#52c41a' }}>正式会员</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                          👥 {categoryStats['Official Member']?.count || 0} 人
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>
                          💰 RM {(categoryStats['Official Member']?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </div>
                      </Card>
                      
                      {/* 准会员 */}
                      <Card
                        style={{
                          marginBottom: 12,
                          cursor: 'pointer',
                          backgroundColor: selectedCategoryCard === 'Associate Member' ? '#e6f7ff' : '#fff',
                          border: selectedCategoryCard === 'Associate Member' ? '2px solid #13c2c2' : '1px solid #e8e8e8',
                          transition: 'all 0.3s',
                        }}
                        bodyStyle={{ padding: 16 }}
                        onClick={() => handleCategoryCardClick('Associate Member')}
                        hoverable
                      >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 20, marginRight: 8 }}>🎓</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#13c2c2' }}>准会员</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                          👥 {categoryStats['Associate Member']?.count || 0} 人
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#13c2c2' }}>
                          💰 RM {(categoryStats['Associate Member']?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </div>
                      </Card>
                      
                      {/* 荣誉会员 */}
                      <Card
                        style={{
                          marginBottom: 12,
                          cursor: 'pointer',
                          backgroundColor: selectedCategoryCard === 'Honorary Member' ? '#e6f7ff' : '#fff',
                          border: selectedCategoryCard === 'Honorary Member' ? '2px solid #722ed1' : '1px solid #e8e8e8',
                          transition: 'all 0.3s',
                        }}
                        bodyStyle={{ padding: 16 }}
                        onClick={() => handleCategoryCardClick('Honorary Member')}
                        hoverable
                      >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 20, marginRight: 8 }}>🏆</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#722ed1' }}>荣誉会员</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                          👥 {categoryStats['Honorary Member']?.count || 0} 人
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#722ed1' }}>
                          💰 RM {(categoryStats['Honorary Member']?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ marginTop: 4, color: '#8c8c8c', fontSize: 12 }}>
                          💡 免费会员
                        </div>
                      </Card>
                      
                      {/* 访问会员 */}
                      <Card
                        style={{
                          marginBottom: 12,
                          cursor: 'pointer',
                          backgroundColor: selectedCategoryCard === 'Visiting Member' ? '#e6f7ff' : '#fff',
                          border: selectedCategoryCard === 'Visiting Member' ? '2px solid #1890ff' : '1px solid #e8e8e8',
                          transition: 'all 0.3s',
                        }}
                        bodyStyle={{ padding: 16 }}
                        onClick={() => handleCategoryCardClick('Visiting Member')}
                        hoverable
                      >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 20, marginRight: 8 }}>🌏</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1890ff' }}>访问会员</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                          👥 {categoryStats['Visiting Member']?.count || 0} 人
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}>
                          💰 RM {(categoryStats['Visiting Member']?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </div>
                      </Card>
                      
                      {/* 校友 */}
                      <Card
                        style={{
                          marginBottom: 12,
                          cursor: 'pointer',
                          backgroundColor: selectedCategoryCard === 'Alumni' ? '#e6f7ff' : '#fff',
                          border: selectedCategoryCard === 'Alumni' ? '2px solid #fa8c16' : '1px solid #e8e8e8',
                          transition: 'all 0.3s',
                        }}
                        bodyStyle={{ padding: 16 }}
                        onClick={() => handleCategoryCardClick('Alumni')}
                        hoverable
                      >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 20, marginRight: 8 }}>🎓</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#fa8c16' }}>校友</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                          👥 {categoryStats['Alumni']?.count || 0} 人
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#fa8c16' }}>
                          💰 RM {(categoryStats['Alumni']?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </div>
                      </Card>
                      
                      {/* 青商好友 */}
                      <Card
                        style={{
                          marginBottom: 12,
                          cursor: 'pointer',
                          backgroundColor: selectedCategoryCard === 'JCI Friend' ? '#e6f7ff' : '#fff',
                          border: selectedCategoryCard === 'JCI Friend' ? '2px solid #eb2f96' : '1px solid #e8e8e8',
                          transition: 'all 0.3s',
                        }}
                        bodyStyle={{ padding: 16 }}
                        onClick={() => handleCategoryCardClick('JCI Friend')}
                        hoverable
                      >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 20, marginRight: 8 }}>🤝</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#eb2f96' }}>青商好友</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>
                          👥 {categoryStats['JCI Friend']?.count || 0} 人
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#eb2f96' }}>
                          💰 RM {(categoryStats['JCI Friend']?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </div>
                      </Card>
                    </Col>
                    
                    {/* 右侧详情列表 */}
                    <Col xs={24} lg={18}>
                      {/* Filters and Actions */}
                      <Card className="mb-6">
                        <Row gutter={[16, 16]} align="middle">
                          <Col xs={24} md={8}>
                            <Search
                              placeholder="搜索会员姓名或ID..."
                              onSearch={handleSearch}
                              allowClear
                              enterButton={<SearchOutlined />}
                            />
                          </Col>
                          <Col xs={12} md={6}>
                            <Select
                              style={{ width: '100%' }}
                              placeholder="状态"
                              value={statusFilter}
                              onChange={handleStatusFilterChange}
                            >
                              <Option value="all">所有状态</Option>
                              <Option value="paid">已付</Option>
                              <Option value="unpaid">未付</Option>
                              <Option value="overdue">逾期</Option>
                            </Select>
                          </Col>
                          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
                            <Space>
                              <Button icon={<ReloadOutlined />} onClick={() => loadMemberFees()}>
                                刷新
                              </Button>
                              <Button icon={<SendOutlined />} onClick={handleSendBulkReminders}>
                                批量提醒
                              </Button>
                              <Button icon={<DownloadOutlined />} onClick={handleExportReport}>
                                导出报告
                              </Button>
                            </Space>
                          </Col>
                        </Row>
                      </Card>

                      {/* Member Fees Table */}
                      <Card title="会员费用详情">
                        <Table
                          {...tableConfig}
                          columns={columns}
                          dataSource={memberFees}
                          rowKey="id"
                          loading={loading}
                          pagination={{
                            current: currentPage,
                            pageSize,
                            total,
                            onChange: (page, size) => {
                              setCurrentPage(page);
                              setPageSize(size || 20);
                            },
                            showSizeChanger: true,
                            showTotal: (total) => `共 ${total} 条记录`,
                          }}
                          scroll={{ x: 1200 }}
                        />
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'transactions',
                label: '会员费交易记录（二次分类）',
                children: (
                  <>
                    {/* 交易筛选器 */}
                    <Card className="mb-6">
                      <Row gutter={[16, 16]} align="middle">
                        <Col xs={12} md={6}>
                          <Select
                            style={{ width: '100%' }}
                            placeholder="年份"
                            value={transactionYearFilter}
                            onChange={setTransactionYearFilter}
                          >
                            <Option value="all">所有年份</Option>
                            <Option value="2025">2025</Option>
                            <Option value="2024">2024</Option>
                            <Option value="2023">2023</Option>
                            <Option value="2022">2022</Option>
                          </Select>
                        </Col>
                        <Col xs={12} md={6}>
                          <Select
                            style={{ width: '100%' }}
                            placeholder="分类"
                            value={subCategoryFilter}
                            onChange={setSubCategoryFilter}
                          >
                            <Option value="all">所有分类</Option>
                            <Option value="uncategorized">未分类</Option>
                            <Option value="new-member-fee">新会员费</Option>
                            <Option value="renewal-fee">续会费</Option>
                            <Option value="alumni-fee">校友会</Option>
                            <Option value="visiting-member-fee">拜访会员</Option>
                          </Select>
                        </Col>
                        <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                          <Space>
                            <Button
                              icon={<ReloadOutlined />}
                              onClick={() => {
                                setTransactionYearFilter('all');
                                setSubCategoryFilter('all');
                                setTransactionPage(1);
                                loadTransactions();
                              }}
                            >
                              重置筛选
                            </Button>
                            <span style={{ color: '#999', fontSize: '14px' }}>
                              共 {transactionTotal} 笔会员费相关交易
                            </span>
                            <Button icon={<DownloadOutlined />}>
                              导出交易报表
                            </Button>
                          </Space>
                        </Col>
                      </Row>
                    </Card>

                    {/* 交易表格 */}
                    <Card
                      title="会员费交易记录"
                      extra={
                        <Space>
                          <span style={{ color: '#999' }}>已选 {selectedTransactionIds.length} 条</span>
                          <Button
                            type="primary"
                            disabled={selectedTransactionIds.length === 0}
                            onClick={() => {
                              setBulkClassifyModalVisible(true);
                              setModalSelectedCategory('');
                              setModalYearInput('');
                              setModalSelectedMemberId('');
                            }}
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
                      />
                      
                    </Card>
                  </>
                ),
              },
            ]}
          />
        </Card>

        {/* Record Payment Modal */}
        <Modal
          title="记录付款"
          open={paymentModalVisible}
          onOk={handlePaymentSubmit}
          onCancel={() => {
            setPaymentModalVisible(false);
            form.resetFields();
            setSelectedFee(null);
          }}
          width={600}
        >
          {selectedFee && (
            <>
              <div className="mb-4">
                <p><strong>会员:</strong> {selectedFee.memberName}</p>
                <p><strong>预期金额:</strong> RM {selectedFee.expectedAmount.toFixed(2)}</p>
                <p><strong>剩余金额:</strong> RM {selectedFee.remainingAmount.toFixed(2)}</p>
              </div>
              
              <Form form={form} layout="vertical">
                <Form.Item
                  label="付款金额"
                  name="amount"
                  rules={[
                    { required: true, message: '请输入付款金额' },
                    { type: 'number', min: 0.01, message: '金额必须大于0' },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    prefix="RM"
                    precision={2}
                    max={selectedFee.remainingAmount}
                  />
                </Form.Item>

                <Form.Item
                  label="付款日期"
                  name="paymentDate"
                  rules={[{ required: true, message: '请选择付款日期' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  label="付款方式"
                  name="paymentMethod"
                  rules={[{ required: true, message: '请选择付款方式' }]}
                >
                  <Select>
                    <Option value="credit_card">信用卡</Option>
                    <Option value="bank_transfer">银行转账</Option>
                    <Option value="cash">现金</Option>
                    <Option value="online_payment">在线支付</Option>
                    <Option value="other">其他</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="收据编号" name="receiptNumber">
                  <Input placeholder="可选" />
                </Form.Item>

                <Form.Item label="备注" name="notes">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>

      {/* 批量分类模态框 */}
      <Modal
        title={`批量分类（已选 ${selectedTransactionIds.length} 条）`}
        open={bulkClassifyModalVisible}
        onCancel={() => setBulkClassifyModalVisible(false)}
        footer={null}
        width={720}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontWeight: 'bold', marginBottom: 4 }}>年份（必填）：</p>
            <Input
              placeholder="输入年份，如：2024"
              maxLength={4}
              style={{ width: 200 }}
              value={modalYearInput}
              onChange={(e) => setModalYearInput(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 320 }}>
            <p style={{ fontWeight: 'bold', marginBottom: 4 }}>关联会员（可选）：</p>
            <Select
              showSearch
              allowClear
              placeholder="搜索姓名/邮箱/电话"
              style={{ width: 320 }}
              value={modalSelectedMemberId || undefined}
              filterOption={false}
              notFoundContent={memberSearchLoading ? '加载中...' : '暂无数据'}
              onSearch={async (value) => {
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
              onChange={(val) => setModalSelectedMemberId(val || '')}
              options={memberSearchOptions}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontWeight: 'bold', marginBottom: 4 }}>分类类型：</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'new-member-fee', label: '新会员费' },
              { key: 'renewal-fee', label: '续会费' },
              { key: 'alumni-fee', label: '校友会' },
              { key: 'visiting-member-fee', label: '拜访会员' },
            ].map(item => (
              <Button
                key={item.key}
                size="middle"
                type={modalSelectedCategory === item.key ? 'primary' : 'default'}
                onClick={() => setModalSelectedCategory(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setBulkClassifyModalVisible(false)}>取消</Button>
          <Button
            type="primary"
            onClick={async () => {
              if (!modalSelectedCategory) {
                message.warning('请选择分类类型');
                return;
              }
              if (!modalYearInput || !/^\d{4}$/.test(modalYearInput)) {
                message.warning('请输入有效的4位年份');
                return;
              }
              const fullCategory = `${modalYearInput}-${modalSelectedCategory}`;
              try {
                await Promise.all(
                  selectedTransactionIds.map((id) =>
                    updateTransaction(id, { subCategory: fullCategory, metadata: modalSelectedMemberId ? { memberId: modalSelectedMemberId } : undefined }, user?.id || '')
                  )
                );
                message.success('批量分类已完成');
                setBulkClassifyModalVisible(false);
                setSelectedTransactionIds([]);
                loadTransactions();
              } catch (e) {
                message.error('批量分类失败');
              }
            }}
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
          }}
          footer={null}
        >
          {selectedTransaction && (
            <>
              <div style={{ marginBottom: 24 }}>
                <p><strong>交易描述：</strong>{selectedTransaction.mainDescription}</p>
                <p><strong>交易金额：</strong>RM {selectedTransaction.amount?.toFixed(2)}</p>
                <p><strong>交易日期：</strong>{globalDateService.formatDate(new Date(selectedTransaction.transactionDate), 'display')}</p>
                {selectedTransaction.subCategory && (
                  <p><strong>当前分类：</strong>{selectedTransaction.subCategory}</p>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 顶部：年份 + 关联会员 并排 */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>年份（必填）：</p>
                    <Input
                      placeholder="输入年份，如：2024"
                      maxLength={4}
                      style={{ width: 160 }}
                      value={modalYearInput}
                      onChange={(e) => setModalYearInput(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>关联会员：</p>
                    <Select
                      showSearch
                      allowClear
                      placeholder="搜索姓名/邮箱/电话"
                      style={{ width: 280 }}
                      value={modalSelectedMemberId || undefined}
                      filterOption={false}
                      notFoundContent={memberSearchLoading ? '加载中...' : '暂无数据'}
                      onSearch={async (value) => {
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
                      onChange={(val) => setModalSelectedMemberId(val || '')}
                      options={memberSearchOptions}
                    />
                  </div>
                </div>

                {/* 分类类型选择 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Button 
                      size="middle"
                      type={modalSelectedCategory === 'new-member-fee' ? 'primary' : 'default'}
                      onClick={() => setModalSelectedCategory('new-member-fee')}
                    >
                      新会员费
                    </Button>
                    <Button 
                      size="middle"
                      type={modalSelectedCategory === 'renewal-fee' ? 'primary' : 'default'}
                      onClick={() => setModalSelectedCategory('renewal-fee')}
                    >
                      续会费
                    </Button>
                    <Button 
                      size="middle"
                      type={modalSelectedCategory === 'alumni-fee' ? 'primary' : 'default'}
                      onClick={() => setModalSelectedCategory('alumni-fee')}
                    >
                      校友会
                    </Button>
                    <Button 
                      size="middle"
                      type={modalSelectedCategory === 'visiting-member-fee' ? 'primary' : 'default'}
                      onClick={() => setModalSelectedCategory('visiting-member-fee')}
                    >
                      拜访会员
                    </Button>
                  </div>
                </div>

                {/* 底部操作栏（仅操作按钮） */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <Button onClick={() => {
                    setClassifyModalVisible(false);
                    setSelectedTransaction(null);
                    setModalSelectedCategory('');
                    setModalYearInput('');
                    setModalSelectedMemberId('');
                  }}>
                    取消
                  </Button>
                  <Button type="primary" onClick={() => {
                    if (!modalSelectedCategory) {
                      message.warning('请选择分类类型');
                      return;
                    }
                    if (!modalYearInput || !/^\d{4}$/.test(modalYearInput)) {
                      message.warning('请输入有效的4位年份');
                      return;
                    }
                    const fullCategory = `${modalYearInput}-${modalSelectedCategory}`;
                    handleClassifySubmit(fullCategory, modalSelectedMemberId || undefined);
                  }}>
                    确认
                  </Button>
                </div>
              </div>
            </>
          )}
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default MemberFeeManagementPage;

