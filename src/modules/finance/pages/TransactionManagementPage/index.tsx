/**
 * Transaction Management Page
 * 交易管理页面
 * 
 * View and manage all financial transactions
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Tag,
  Space,
  message,
  Radio,
  Tooltip,
  Tabs,
  Badge,
  Tree,
  Alert,
  Typography,
  Row,
  Col,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ExportOutlined,
  ScissorOutlined,
  TagOutlined,
  TableOutlined,
  ApartmentOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BulkOperationBar } from '@/components/common/BulkOperationBar';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  splitTransaction,
  unsplitTransaction,
  batchSplitTransactions,
  batchSetCategory,
} from '../../services/transactionService';
import SplitTransactionModal from '../../components/SplitTransactionModal';
import BatchSplitModal from '../../components/BatchSplitModal';
import BatchSetCategoryModal from '../../components/BatchSetCategoryModal';
import EditTransactionModal from '../../components/EditTransactionModal';
import AutoMatchModal from '../../components/AutoMatchModal';
import { autoMatchUncategorizedTransactions } from '../../services/autoMatchService';
import type { AutoMatchPreviewItem, MatchResult } from '../../services/autoMatchService';
import { useNavigate } from 'react-router-dom';
import { getAllBankAccounts } from '../../services/bankAccountService';
import { getActiveTransactionPurposes } from '../../../system/services/transactionPurposeService';
import { getEvents } from '../../../event/services/eventService'; // 🆕 导入活动服务
import { getMembers } from '../../../member/services/memberService'; // 🆕 导入会员服务
import type { Transaction, TransactionFormData, TransactionStatus, BankAccount } from '../../types';
import './styles.css';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

const TransactionManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTabKey, setActiveTabKey] = useState<string>('all'); // 当前选中的标签页（银行账户ID）
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table'); // 🆕 视图模式：表格或树形
  const [treeData, setTreeData] = useState<DataNode[]>([]); // 🆕 树形数据
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]); // 🆕 展开的树节点
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]); // 🆕 树形视图筛选后的数据
  const [treeDateRangeType, setTreeDateRangeType] = useState<'fiscal' | 'calendar' | 'all'>('all'); // 🆕 树形视图日期范围类型
  const [treeSelectedYear, setTreeSelectedYear] = useState<string>(new Date().getFullYear().toString()); // 🆕 树形视图选择的年份
  const [treeLoading, setTreeLoading] = useState(false); // 🆕 树形视图加载状态
  const [treeStatistics, setTreeStatistics] = useState<{
    totalIncome: number;
    totalExpense: number;
    surplus: number;
  }>({ totalIncome: 0, totalExpense: 0, surplus: 0 }); // 🆕 树形视图统计数据
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [accountTransactionCounts, setAccountTransactionCounts] = useState<Record<string, number>>({});
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splittingTransaction, setSplittingTransaction] = useState<Transaction | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); // 多选行
  const [batchSplitModalVisible, setBatchSplitModalVisible] = useState(false);
  const [batchCategoryModalVisible, setBatchCategoryModalVisible] = useState(false);
  
  // 🆕 交易用途选项（从财务类别管理加载）
  const [purposeOptions, setPurposeOptions] = useState<{ label: string; value: string }[]>([]);
  
  // 🎯 累计余额相关状态
  const [balanceMap, setBalanceMap] = useState<Map<string, number>>(new Map());
  const [sortBy] = useState<'transactionDate'>('transactionDate'); // 当前排序字段
  const [sortOrder] = useState<'asc' | 'desc'>('desc'); // 当前排序顺序
  
  // 🚀 性能优化：缓存全局交易列表
  const [cachedTransactions, setCachedTransactions] = useState<Transaction[]>([]);
  const [cacheKey, setCacheKey] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  
  // 🆕 未分类检测
  const [hasUncategorized, setHasUncategorized] = useState(false);
  
  // 💰 存储各账户的当前余额（实时计算）
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  
  // 🆕 批量粘贴导入
  const [bulkImportVisible, setBulkImportVisible] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportData, setBulkImportData] = useState<Array<{
    key: string;
    transactionType: 'income' | 'expense';
    category: string;
    description: string;
    payerPayee: string;
    amount: number;
    transactionDate: string;
    bankAccountId: string;
  }>>([]);
  
  // 🤖 自动分类
  const [autoMatchModalVisible, setAutoMatchModalVisible] = useState(false);
  const [autoMatchPreviewItems, setAutoMatchPreviewItems] = useState<AutoMatchPreviewItem[]>([]);
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);
  const [allEventsForAutoMatch, setAllEventsForAutoMatch] = useState<Array<{ id: string; eventName: string; eventDate: string }>>([]);
  const [allMembersForAutoMatch, setAllMembersForAutoMatch] = useState<Array<{ id: string; name: string; email?: string; phone?: string }>>([]);

  useEffect(() => {
    loadBankAccounts();
    loadPurposeOptions(); // 🆕 加载交易用途选项
  }, []);

  // 🆕 加载交易用途选项
  const loadPurposeOptions = async () => {
    try {
      const purposes = await getActiveTransactionPurposes();
      setPurposeOptions(purposes);
    } catch (error) {
      console.error('加载交易用途选项失败:', error);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentPage, pageSize, searchText, categoryFilter, activeTabKey]);
  
  useEffect(() => {
    // 当切换标签页时，重置到第一页
    setCurrentPage(1);
  }, [activeTabKey]);

  const loadBankAccounts = async () => {
    try {
      const accounts = await getAllBankAccounts('active');
      setBankAccounts(accounts);
      
      // 加载完账户后，更新交易数量
      updateAccountTransactionCounts();
    } catch (error: any) {
      message.error('加载银行账户失败');
    }
  };
  
  const updateAccountTransactionCounts = async () => {
    try {
      const counts: Record<string, number> = { all: 0 };
      
      // 为每个账户获取交易数量
      for (const account of bankAccounts) {
        const result = await getTransactions({
          page: 1,
          limit: 1,
          bankAccountId: account.id,
        });
        counts[account.id] = result.total;
        counts.all += result.total;
      }
      
      // 如果没有指定账户，获取总数
      if (bankAccounts.length === 0) {
        const result = await getTransactions({
          page: 1,
          limit: 1,
        });
        counts.all = result.total;
      }
      
      setAccountTransactionCounts(counts);
    } catch (error: any) {
      // Silent fail for count updates
    }
  };

  // 🆕 为树形视图加载所有交易数据
  const loadAllTransactionsForTreeView = async () => {
    if (!user) return;

    try {
      const result = await getTransactions({
        page: 1,
        limit: 10000, // 🆕 加载大量数据用于树形视图
        search: undefined, // 不应用搜索过滤
        bankAccountId: undefined, // 不应用银行账户过滤
        category: undefined, // 不应用类别过滤
        sortBy: 'transactionDate',
        sortOrder: 'desc',
        includeVirtual: false, // 🆕 树形视图不显示虚拟交易
      });

      return result.data;
    } catch (error: any) {
      return [];
    }
  };

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const result = await getTransactions({
        page: currentPage,
        limit: pageSize,
        search: searchText || undefined,
        bankAccountId: activeTabKey !== 'all' ? activeTabKey : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        sortBy: 'transactionDate',
        sortOrder: 'desc',
        includeVirtual: true, // 🔑 显示子交易（虚拟交易）
      });

      setTransactions(result.data);
      setTotal(result.total);
      
      // 🆕 检测是否有未分类交易
      const uncategorizedCount = result.data.filter(t => !t.txAccount || t.txAccount.trim() === '').length;
      setHasUncategorized(uncategorizedCount > 0);
      
      // 🎯 计算累计余额（仅针对单个账户）
      if (activeTabKey !== 'all' && result.data.length > 0) {
        await calculateRunningBalances(result.data, activeTabKey);
      } else {
        setBalanceMap(new Map()); // 清空余额
      }
      
      // 更新各账户的交易数量
      updateAccountTransactionCounts();
    } catch (error: any) {
      message.error('加载交易记录失败');
      console.error('[Finance] Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎯 计算累计余额 - 完全基于UI列表顺序
   * 
   * 核心逻辑：
   * 1. 从下到上（数组末尾→开头）
   * 2. 从后往前（最旧页→最新页）
   * 3. 不依赖任何固定字段，只依赖当前排序顺序
   * 
   * @param currentPageTransactions - 当前页的交易列表
   * @param bankAccountId - 银行账户ID
   */
  const calculateRunningBalances = async (
    currentPageTransactions: Transaction[],
    bankAccountId: string
  ): Promise<void> => {
    if (isCalculating) return; // 防止并发计算
    
    try {
      setIsCalculating(true);
      
      // Step 1: 获取银行账户信息
      const account = bankAccounts.find(a => a.id === bankAccountId);
      if (!account) {
        setBalanceMap(new Map());
        return;
      }
      
      const initialBalance = account.initialBalance || 0;
      
      // Step 2: 🚀 获取全局所有交易（使用缓存优化）
      const currentCacheKey = `${bankAccountId}-${sortBy}-${sortOrder}`;
      let allTransactions: Transaction[];
      
      if (cacheKey === currentCacheKey && cachedTransactions.length > 0) {
        // ✅ 使用缓存
        allTransactions = cachedTransactions;
        console.log(`💰 [Balance] 使用缓存 (${allTransactions.length}笔)`);
      } else {
        // ❌ 缓存失效，重新获取
        console.log(`💰 [Balance] 获取全局交易: ${account.accountName}`);
        const allTransactionsResult = await getTransactions({
          bankAccountId,
          sortBy,
          sortOrder,
          includeVirtual: true,
          limit: 10000,
        });
        
        allTransactions = allTransactionsResult.data;
        
        // 更新缓存
        setCachedTransactions(allTransactions);
        setCacheKey(currentCacheKey);
        console.log(`💰 [Balance] 缓存已更新 (${allTransactions.length}笔)`);
      }
      
      if (allTransactions.length === 0) {
        setBalanceMap(new Map());
        return;
      }
      
      // Step 3: 定位当前页在全局中的位置（UI底部 = 最旧交易）
      const lastTxnOnPage = currentPageTransactions[currentPageTransactions.length - 1];
      const globalEndIndex = allTransactions.findIndex(t => t.id === lastTxnOnPage?.id);
      
      if (globalEndIndex === -1) {
        console.error('❌ [Balance] 定位失败，清空缓存');
        setCacheKey('');
        setBalanceMap(new Map());
        return;
      }
      
      // Step 4: 计算起始余额（累加当前页之后的所有交易）
      let startingBalance = initialBalance;
      
      for (let i = allTransactions.length - 1; i > globalEndIndex; i--) {
        const txn = allTransactions[i];
        if (txn.isVirtual || txn.parentTransactionId) continue;
        
        const netAmount = txn.transactionType === 'income' ? txn.amount : -txn.amount;
        startingBalance += netAmount;
      }
      
      // Step 5: 计算当前页余额（从下到上）
      let runningBalance = startingBalance;
      const newBalanceMap = new Map<string, number>();
      
      for (let i = currentPageTransactions.length - 1; i >= 0; i--) {
        const txn = currentPageTransactions[i];
        if (txn.isVirtual || txn.parentTransactionId) continue;
        
        const netAmount = txn.transactionType === 'income' ? txn.amount : -txn.amount;
        runningBalance += netAmount;
        newBalanceMap.set(txn.id, runningBalance);
      }
      
      setBalanceMap(newBalanceMap);
      
      // 💰 更新该账户的当前余额（用于标签显示）
      setAccountBalances(prev => ({
        ...prev,
        [bankAccountId]: runningBalance
      }));
      
      // 简洁日志（仅生产环境需要时可完全移除）
      console.log(`✅ [Balance] 第${currentPage}页: 起始RM${startingBalance.toFixed(2)} → 结束RM${runningBalance.toFixed(2)}`);
      
    } catch (error: any) {
      console.error('❌ [Balance] 计算失败:', error);
      message.error('计算累计余额失败');
      setBalanceMap(new Map());
    } finally {
      setIsCalculating(false);
    }
  };
  
  /**
   * 清空缓存（在交易变更后调用）
   */
  const clearBalanceCache = () => {
    setCacheKey('');
    setCachedTransactions([]);
    setBalanceMap(new Map());
    setAccountBalances({}); // 同时清空账户余额
  };
  
  /**
   * 获取账户的显示余额
   * @param accountId - 账户ID
   * @param initialBalance - 初始余额（作为后备值）
   */
  const getAccountDisplayBalance = (accountId: string, initialBalance: number): number => {
    // 如果已计算过该账户的余额，返回计算值
    if (accountBalances[accountId] !== undefined) {
      return accountBalances[accountId];
    }
    // 否则返回初始余额
    return initialBalance;
  };

  const handleCreate = () => {
    form.resetFields();
    
    // 智能预选银行账户
    const defaultBankAccountId = activeTabKey !== 'all' 
      ? activeTabKey  // 如果在特定账户标签页，预选该账户
      : bankAccounts.find(a => a.isDefault)?.id || bankAccounts[0]?.id; // 否则选择默认账户
    
    form.setFieldsValue({
      transactionDate: dayjs(),
      transactionType: 'income',
      bankAccountId: defaultBankAccountId,
    });
    
    console.log('➕ [handleCreate] New transaction - pre-selected account:', {
      activeTab: activeTabKey,
      selectedAccountId: defaultBankAccountId,
    });
    
    setEditingTransaction(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Transaction) => {
    // Check if referenced bank account still exists
    const accountExists = bankAccounts.some(acc => acc.id === record.bankAccountId);
    
    if (!accountExists && record.bankAccountId) {
      message.warning(
        `此交易引用的银行账户已不存在。请选择新的银行账户。`
      );
    }
    
    setEditingTransaction(record);
    form.setFieldsValue({
      bankAccountId: accountExists ? record.bankAccountId : undefined,
      transactionDate: dayjs(record.transactionDate),
      transactionType: record.transactionType,
      mainDescription: record.mainDescription,
      subDescription: record.subDescription,
      amount: record.amount,
      payerPayee: record.payerPayee,
      category: record.category,
      txAccount: record.txAccount, // 🆕 二次分类
      paymentMethod: record.paymentMethod,
      notes: record.notes,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      const values = await form.validateFields();
      console.log('📋 [handleSubmit] Form values:', values);
      console.log('📋 [handleSubmit] Is editing?:', !!editingTransaction);
      if (editingTransaction) {
        console.log('📋 [handleSubmit] Editing transaction:', {
          id: editingTransaction.id,
          oldBankAccountId: editingTransaction.bankAccountId,
          newBankAccountId: values.bankAccountId,
        });
      }

      // Validate bank account exists
      if (!values.bankAccountId) {
        message.error('请选择银行账户');
        return;
      }
      
      const accountExists = bankAccounts.some(acc => acc.id === values.bankAccountId);
      console.log('🏦 [handleSubmit] Bank account validation:', {
        selectedAccountId: values.bankAccountId,
        accountExists,
        availableAccounts: bankAccounts.map(a => ({ id: a.id, name: a.accountName })),
      });
      
      if (!accountExists) {
        message.error('选择的银行账户不存在，请重新选择');
        form.setFieldValue('bankAccountId', undefined);
        return;
      }

      const formData: TransactionFormData = {
        bankAccountId: values.bankAccountId,
        transactionDate: values.transactionDate.toDate(),
        transactionType: values.transactionType,
        mainDescription: values.mainDescription,
        subDescription: values.subDescription,
        amount: values.amount,
        payerPayee: values.payerPayee,
        payerId: values.payerId, // 🆕 会员ID
        category: values.category,
        txAccount: values.txAccount, // 🆕 二次分类
        paymentMethod: values.paymentMethod,
        notes: values.notes,
      };
      
      console.log('💾 [handleSubmit] Form data to save:', formData);

      if (editingTransaction) {
        console.log('✏️ [handleSubmit] Calling updateTransaction...');
        await updateTransaction(editingTransaction.id, formData, user.id);
        console.log('✅ [handleSubmit] updateTransaction completed');
        message.success('交易已更新');
      } else {
        console.log('➕ [handleSubmit] Calling createTransaction...');
        await createTransaction(formData, user.id);
        console.log('✅ [handleSubmit] createTransaction completed');
        message.success('交易已创建');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingTransaction(null);
      clearBalanceCache(); // 清空余额缓存
      await loadTransactions();
      await updateAccountTransactionCounts(); // 刷新标签页计数
    } catch (error: any) {
      console.error('❌ [handleSubmit] Error:', error);
      message.error('保存失败: ' + (error.message || '未知错误'));
      console.error('[Finance] Transaction submit failed:', error);
    }
  };

  const handleDelete = (id: string) => {
    if (!user) return;

    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此交易吗？此操作无法撤销。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteTransaction(id, user.id);
          message.success('交易已删除');
          clearBalanceCache(); // 清空余额缓存
          await loadTransactions();
          await updateAccountTransactionCounts(); // 刷新标签页计数
        } catch (error: any) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const handleApprove = async (id: string) => {
    if (!user) return;

    try {
      await approveTransaction(id, user.id);
      message.success('交易已批准');
      clearBalanceCache(); // 清空余额缓存
      await loadTransactions();
      await updateAccountTransactionCounts(); // 刷新标签页计数
    } catch (error: any) {
      message.error('批准失败');
    }
  };

  const handleSplit = (record: Transaction) => {
    setSplittingTransaction(record);
    setSplitModalVisible(true);
  };

  const handleSplitOk = async (splits: Array<{
    amount: number;
    category?: string;
    notes?: string;
  }>) => {
    if (!user || !splittingTransaction) return;

    try {
      await splitTransaction(splittingTransaction.id, splits, user.id);
      message.success('交易拆分成功');
      setSplitModalVisible(false);
      setSplittingTransaction(null);
      clearBalanceCache(); // 清空余额缓存
      await loadTransactions();
      await updateAccountTransactionCounts();
    } catch (error: any) {
      message.error(error.message || '拆分失败');
      throw error; // 抛出错误让 modal 处理
    }
  };

  // 🗑️ 已移除handleUnsplit函数，撤销拆分功能已迁移到SplitTransactionModal内部

  // 批量删除
  const handleBatchDelete = async (ids: string[]) => {
    if (!user) return;

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${ids.length} 条交易吗？此操作无法撤销。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          // 逐个删除（包含余额回退）
          for (const id of ids) {
            await deleteTransaction(id, user.id);
          }
          message.success(`已删除 ${ids.length} 条交易`);
          setSelectedRowKeys([]);
          clearBalanceCache(); // 清空余额缓存
          await loadTransactions();
          await updateAccountTransactionCounts();
        } catch (error: any) {
          message.error(error.message || '批量删除失败');
        }
      },
    });
  };

  // 批量导出
  const handleBatchExport = async () => {
    try {
      const selectedTransactions = transactions.filter(t => 
        selectedRowKeys.includes(t.id)
      );
      console.log('📤 [handleBatchExport] Exporting transactions:', {
        count: selectedTransactions.length,
        ids: selectedRowKeys,
      });
      message.info('导出功能开发中...');
      // TODO: 实现批量导出逻辑
    } catch (error: any) {
      message.error(error.message || '批量导出失败');
    }
  };

  const navigate = useNavigate();

  // 批量拆分
  const handleBatchSplit = () => {
    setBatchSplitModalVisible(true);
  };

  const handleBatchSplitOk = async (splitRule: {
    categoryAmounts: Array<{
      category: string;
      amount: number;
      notes?: string;
    }>;
  }) => {
    if (!user) return;

    try {
      const result = await batchSplitTransactions(
        selectedRowKeys as string[],
        splitRule,
        user.id
      );

      if (result.successCount > 0) {
        message.success(`成功拆分 ${result.successCount} 条交易`);
      }
      if (result.failedCount > 0) {
        message.warning(`${result.failedCount} 条交易拆分失败`);
      }

      setBatchSplitModalVisible(false);
      setSelectedRowKeys([]);
      clearBalanceCache(); // 清空余额缓存
      await loadTransactions();
      await updateAccountTransactionCounts();
    } catch (error: any) {
      message.error(error.message || '批量拆分失败');
      throw error;
    }
  };

  // 批量设置类别
  const handleBatchSetCategory = () => {
    setBatchCategoryModalVisible(true);
  };

  const handleBatchSetCategoryOk = async (data: {
    category: string;
    txAccount?: string;
    year?: string;
    eventId?: string; // 🆕 统一的活动ID
    individualData?: Array<{
      transactionId: string;
      payerPayee?: string;
      payerMode?: 'member' | 'manual';
      payerId?: string;
      payeeMode?: 'member' | 'manual';
      payeeId?: string;
      payeeName?: string;
      eventId?: string;
      memberId?: string;
    }>;
  }) => {
    if (!user) return;

    try {
      const result = await batchSetCategory(
        selectedRowKeys as string[],
        data.category,
        user.id
      );

      // 🔍 Debug: 检查接收到的数据
      console.log('🔍 [TransactionManagementPage] 接收到的批量设置数据:', {
        category: data.category,
        txAccount: data.txAccount,
        year: data.year,
        eventId: data.eventId,
        individualDataCount: data.individualData?.length || 0,
        individualData: data.individualData,
        selectedRowKeys: selectedRowKeys,
      });

      // 🆕 加载活动和会员数据以获取名称
      let eventName = '';
      const memberMap = new Map<string, string>(); // memberId -> memberName
      
      try {
        // 如果是活动财务类别，加载活动数据
        if (data.category === 'event-finance' && data.eventId) {
          const eventsResult = await getEvents({ page: 1, limit: 1000 });
          const selectedEvent = eventsResult.data.find(e => e.id === data.eventId);
          if (selectedEvent) {
            eventName = selectedEvent.name;
          }
        }
        
        // 如果需要会员名称（活动财务或日常财务），加载会员数据
        if (data.individualData && (data.category === 'event-finance' || data.category === 'general-accounts')) {
          const memberIds: string[] = [];
          
          data.individualData.forEach(item => {
            if (data.category === 'event-finance' && item.payeeMode === 'member' && item.payeeId) {
              memberIds.push(item.payeeId);
            } else if (data.category === 'general-accounts' && item.payerMode === 'member' && item.payerId) {
              memberIds.push(item.payerId);
            }
          });
          
          if (memberIds.length > 0) {
            const membersResult = await getMembers({ page: 1, limit: 1000, status: 'active' });
            membersResult.data.forEach(member => {
              memberMap.set(member.id, member.name);
            });
          }
        }
      } catch (error) {
        console.error('🔍 [TransactionManagementPage] 加载活动/会员数据失败:', error);
      }

      // 🆕 为每条交易应用独立设置
      if (data.individualData && data.individualData.length > 0) {
        await Promise.all(
          data.individualData.map(async (individualItem) => {
            const updates: Partial<Transaction> = {};
            const metadata: Record<string, any> = {};

            // 全局的txAccount和year
            if (data.txAccount) {
              updates.txAccount = data.txAccount;
            }
            if (data.year) {
              metadata.year = data.year;
            }

            // 根据类别设置不同的字段
            if (data.category === 'general-accounts') {
              // 日常财务：付款人信息
              if (individualItem.payerMode === 'manual' && individualItem.payerPayee) {
                updates.payerPayee = individualItem.payerPayee;
              } else if (individualItem.payerMode === 'member' && individualItem.payerId) {
                metadata.payerId = individualItem.payerId;
                
                // ✅ 将会员名称保存到payerPayee
                const memberName = memberMap.get(individualItem.payerId);
                if (memberName) {
                  updates.payerPayee = memberName;
                }
              }
            } else if (data.category === 'event-finance') {
              // 活动财务：收款人信息和统一关联活动
              
              // ✅ 处理收款人/付款人信息
              if (individualItem.payeeMode === 'manual' && individualItem.payeeName) {
                updates.payerPayee = individualItem.payeeName;
              } else if (individualItem.payeeMode === 'member' && individualItem.payeeId) {
                metadata.memberId = individualItem.payeeId; // ✅ 保存会员ID到metadata.memberId
                
                // ✅ 将会员名称保存到payerPayee
                const memberName = memberMap.get(individualItem.payeeId);
                if (memberName) {
                  updates.payerPayee = memberName;
                }
              }
              
              // 🆕 使用统一的活动ID，并保存活动名称到txAccount（二次分类）
              if (data.eventId && eventName) {
                updates.txAccount = eventName; // ✅ 活动名称保存到txAccount
                metadata.eventId = data.eventId; // ✅ 活动ID保存到metadata
                metadata.eventName = eventName; // ✅ 活动名称也保存到metadata（可选）
              }
            } else if (data.category === 'member-fees') {
              // 会员费：关联会员
              if (individualItem.memberId) {
                metadata.memberId = individualItem.memberId;
              }
            }

            if (Object.keys(metadata).length > 0) {
              updates.metadata = metadata;
            }

            // 🔍 Debug: 检查更新数据
            console.log('🔍 [TransactionManagementPage] 更新交易数据:', {
              transactionId: individualItem.transactionId,
              updates,
              metadata,
              hasUpdates: Object.keys(updates).length > 0,
            });

            // 更新单条交易
            if (Object.keys(updates).length > 0) {
              await updateTransaction(individualItem.transactionId, updates, user.id);
            }
          })
        );
      }

      if (result.successCount > 0) {
        message.success(`成功设置 ${result.successCount} 条交易的类别及相关信息`);
      }
      if (result.failedCount > 0) {
        message.warning(`${result.failedCount} 条交易设置失败`);
      }

      setBatchCategoryModalVisible(false);
      setSelectedRowKeys([]);
      clearBalanceCache(); // 清空余额缓存
      await loadTransactions();
    } catch (error: any) {
      message.error(error.message || '批量设置类别失败');
      throw error;
    }
  };

  // 🆕 批量导入功能
  const handleOpenBulkImport = () => {
    setBulkImportVisible(true);
    // 自动添加第一行
    const defaultBankAccount = bankAccounts[0]?.id || '';
    setBulkImportData([{
      key: `bulk-${Date.now()}`,
      transactionType: 'income',
      category: 'member-fees',
      description: '',
      payerPayee: '',
      amount: 0,
      transactionDate: dayjs().format('YYYY-MM-DD'),
      bankAccountId: defaultBankAccount,
    }]);
  };
  
  // 🤖 自动分类功能
  const handleOpenAutoMatch = async () => {
    try {
      setAutoMatchLoading(true);
      message.loading('正在分析交易记录...', 0);
      
      // 🆕 加载所有活动用于下拉选择
      const eventsResult = await getEvents({ page: 1, limit: 1000 });
      const eventsList = eventsResult.data.map(e => ({
        id: e.id,
        eventName: e.name,
        eventDate: e.startDate,
      }));
      setAllEventsForAutoMatch(eventsList);
      
      // 🆕 加载所有会员用于下拉选择
      const membersResult = await getMembers({ page: 1, limit: 1000 });
      const membersList = membersResult.data.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
      }));
      setAllMembersForAutoMatch(membersList);
      
      // 执行自动匹配
      const previewItems = await autoMatchUncategorizedTransactions();
      
      message.destroy();
      
      if (previewItems.length === 0) {
        message.info('没有找到未分类的交易记录');
        return;
      }
      
      setAutoMatchPreviewItems(previewItems);
      setAutoMatchModalVisible(true);
    } catch (error: any) {
      message.destroy();
      message.error('自动分类失败: ' + (error.message || '未知错误'));
      console.error('Auto match error:', error);
    } finally {
      setAutoMatchLoading(false);
    }
  };
  
  const handleAutoMatchConfirm = async (
    selectedItems: Array<{ transactionId: string; matchResult: MatchResult; customData?: { category?: string; eventName?: string; memberId?: string; payerPayee?: string } }>
  ) => {
    if (!user) return;
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const item of selectedItems) {
        try {
          // 🆕 使用用户自定义的主分类
          const finalCategory = item.customData?.category || 'event-finance';
          
          // 🆕 使用用户自定义的活动名称（如果有修改）
          const finalEventName = item.customData?.eventName || item.matchResult.eventName;
          // 🆕 查找对应的活动ID（如果活动名称被修改了）
          const matchedEvent = allEventsForAutoMatch.find(e => e.eventName === finalEventName);
          const finalEventId = matchedEvent?.id || item.matchResult.eventId;
          
          // 构建更新对象
          const updates: any = {
            category: finalCategory,
            metadata: {
              autoMatchedCategory: finalCategory,
              autoMatchScore: item.matchResult.totalScore,
              autoMatchConfidence: item.matchResult.confidence,
              needsReview: item.matchResult.confidence === 'medium',
              userModified: !!(item.customData?.category || item.customData?.eventName || item.customData?.memberId || item.customData?.payerPayee), // 🆕 标记用户是否修改
            },
          };
          
          // 🆕 如果主分类是活动财务，添加活动相关信息
          if (finalCategory === 'event-finance') {
            updates.txAccount = finalEventName; // 使用活动名称作为二次分类
            updates.metadata.relatedEventId = finalEventId;
            updates.metadata.relatedEventName = finalEventName;
          }
          
          // 🆕 处理会员信息
          const finalMemberId = item.customData?.memberId || item.matchResult.matchedMember?.memberId;
          const finalPayerPayee = item.customData?.payerPayee || item.matchResult.matchedMember?.memberName;
          
          // 如果选择了会员或有付款人/收款人信息
          if (finalMemberId) {
            updates.payerId = finalMemberId;
            updates.metadata.autoMatchedMember = finalPayerPayee;
            updates.metadata.autoMatchedMemberType = item.matchResult.matchedMember?.matchType || 'manual';
          }
          
          if (finalPayerPayee) {
            updates.payerPayee = finalPayerPayee;
          }
          
          // 更新交易记录
          await updateTransaction(
            item.transactionId,
            updates,
            user.id
          );
          successCount++;
        } catch (error) {
          console.error('Failed to update transaction:', item.transactionId, error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        message.success(`成功分类 ${successCount} 条交易记录`);
      }
      if (failCount > 0) {
        message.warning(`${failCount} 条记录分类失败`);
      }
      
      // 关闭Modal并刷新数据
      setAutoMatchModalVisible(false);
      setAutoMatchPreviewItems([]);
      clearBalanceCache();
      await loadTransactions();
    } catch (error: any) {
      message.error('应用分类失败');
      console.error(error);
    }
  };

  const parseBulkImportText = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const defaultBankAccount = bankAccounts[0]?.id || '';
    
    const items = lines.map((line, index) => {
      const parts = line.split('\t').map(p => p.trim());
      
      return {
        key: `bulk-${Date.now()}-${index}`,
        transactionType: 'income' as const,
        category: 'member-fees',
        description: parts[0] || '',
        payerPayee: parts[1] || '',
        amount: parseFloat(parts[2]) || 0,
        transactionDate: parts[3] || dayjs().format('YYYY-MM-DD'),
        bankAccountId: defaultBankAccount,
      };
    });
    
    setBulkImportData(items);
    setBulkImportText('');
  };

  const handleTextPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    parseBulkImportText(pastedText);
  };

  const handleAddBulkRow = () => {
    const defaultBankAccount = bankAccounts[0]?.id || '';
    setBulkImportData([
      ...bulkImportData,
      {
        key: `bulk-${Date.now()}`,
        transactionType: 'income',
        category: 'member-fees',
        description: '',
        payerPayee: '',
        amount: 0,
        transactionDate: dayjs().format('YYYY-MM-DD'),
        bankAccountId: defaultBankAccount,
      }
    ]);
  };

  const handleDeleteBulkRow = (key: string) => {
    setBulkImportData(bulkImportData.filter(item => item.key !== key));
  };

  const handleBulkDataChange = (key: string, field: string, value: any) => {
    setBulkImportData(bulkImportData.map(item => 
      item.key === key ? { ...item, [field]: value } : item
    ));
  };

  const handleBulkImportSubmit = async () => {
    if (!user) return;
    
    try {
      if (bulkImportData.length === 0) {
        message.warning('没有数据可导入');
        return;
      }
      
      // 验证数据
      const invalidRows = bulkImportData.filter(item => 
        !item.description || item.amount <= 0 || !item.bankAccountId
      );
      
      if (invalidRows.length > 0) {
        message.error(`有 ${invalidRows.length} 行数据不完整（描述、金额、银行账户必填，且金额需大于0）`);
        return;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const item of bulkImportData) {
        try {
          await createTransaction({
            transactionType: item.transactionType,
            category: item.category,
            mainDescription: item.description,
            payerPayee: item.payerPayee,
            amount: item.amount,
            transactionDate: item.transactionDate,
            bankAccountId: item.bankAccountId,
          }, user.id);
          successCount++;
        } catch (error) {
          console.error('Failed to import row:', item, error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        message.success(`成功导入 ${successCount} 条交易记录`);
      }
      if (failCount > 0) {
        message.warning(`${failCount} 条记录导入失败`);
      }
      
      setBulkImportVisible(false);
      setBulkImportData([]);
      clearBalanceCache();
      await loadTransactions();
    } catch (error: any) {
      message.error('批量导入失败');
      console.error(error);
    }
  };

  // 🆕 构建树形视图数据
  const buildTreeData = async () => {
    console.log('🌳 [buildTreeData] Starting tree data build...');
    setTreeLoading(true);
    
    try {
      // 🆕 加载活动数据（用于获取负责理事信息）
      const { getEvents } = await import('../../../event/services/eventService');
      const eventsResult = await getEvents({ page: 1, limit: 10000 });
      const eventsMap = new Map(eventsResult.data.map((e: any) => [e.name, e]));
      console.log('🎯 [buildTreeData] Loaded events:', eventsResult.data.length);
      
      // 🆕 为树形视图加载所有交易数据
      const allTransactions = await loadAllTransactionsForTreeView();
      
      if (!allTransactions || allTransactions.length === 0) {
        console.log('🔍 [TreeView Debug] No transactions found');
        setTreeData([]);
        setExpandedKeys([]);
        return;
      }
      
      // 过滤掉虚拟子交易（只显示真实交易）
      let realTransactions = allTransactions.filter(t => !t.isVirtual);
      
      // 🆕 调试信息：显示过滤前的交易数据
      console.log('🔍 [TreeView Debug] 总交易数:', allTransactions.length);
      console.log('🔍 [TreeView Debug] 过滤后交易数:', realTransactions.length);
      console.log('🔍 [TreeView Debug] 交易类别分布:', 
        realTransactions.reduce((acc, t) => {
          const cat = t.category || 'uncategorized';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      );
    
    // 🆕 根据日期范围类型过滤交易
    if (treeDateRangeType !== 'all') {
      const year = parseInt(treeSelectedYear);
      
      realTransactions = realTransactions.filter(transaction => {
        if (!transaction.transactionDate) return false;
        
        const txDate = new Date(transaction.transactionDate);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth() + 1; // 1-12
        
        if (treeDateRangeType === 'fiscal') {
          // 财年：10月1日 至 次年9月30日
          // 例如：FY2024 = 2024-10-01 至 2025-09-30
          if (txMonth >= 10) {
            // 10-12月属于当前财年
            return txYear === year;
          } else {
            // 1-9月属于上一财年
            return txYear === year + 1;
          }
        } else if (treeDateRangeType === 'calendar') {
          // 自然年：1月1日 至 12月31日
          return txYear === year;
        }
        
        return true;
      });
      
      // 🆕 调试信息：显示日期过滤后的数据
      console.log('🔍 [TreeView Debug] 日期过滤后交易数:', realTransactions.length);
      console.log('🔍 [TreeView Debug] 日期过滤后类别分布:', 
        realTransactions.reduce((acc, t) => {
          const cat = t.category || 'uncategorized';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      );
    }
    
    // 🆕 根据审计报告要求，活动财务的支出合并到收入中
    // 构建收入和支出的树形结构
    const incomeNode: DataNode = {
      title: <span style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>收入 Incomes (含活动净收入)</span>,
      key: 'income-root',
      children: [],
    };

    const expenseNode: DataNode = {
      title: <span style={{ fontSize: 16, fontWeight: 600, color: '#ff4d4f' }}>支出 Expenses (不含活动支出)</span>,
      key: 'expense-root',
      children: [],
    };

    // 🆕 计算统计数据
    let totalIncome = 0;
    let totalExpense = 0;
    
    // 分组数据结构
    const incomeGroups: Record<string, Record<string, Transaction[]>> = {};
    const expenseGroups: Record<string, Record<string, Transaction[]>> = {};

    // 遍历交易记录并分组
    realTransactions.forEach(transaction => {
      const category = transaction.category || 'uncategorized';
      const txAccount = transaction.txAccount || 'uncategorized';
      const isIncome = transaction.transactionType === 'income';
      const amount = transaction.amount || 0;
      
      // 🆕 跳过已拆分的父交易（只计算子交易）
      const isSplitParent = transaction.isSplit === true;

      if (isIncome) {
        // 收入：所有收入交易
        if (!isSplitParent) {
          totalIncome += amount; // 🆕 累计收入（排除已拆分的父交易）
        }
        
        if (!incomeGroups[category]) incomeGroups[category] = {};
        if (!incomeGroups[category][txAccount]) incomeGroups[category][txAccount] = [];
        incomeGroups[category][txAccount].push(transaction);
      } else {
        // 支出：只有非活动财务的支出交易
        if (category === 'event-finance') {
          // 活动财务支出：合并到对应的活动收入中（净收入计算）
          if (!isSplitParent) {
            totalIncome -= amount; // 🆕 活动支出减少总收入（净收入，排除已拆分的父交易）
          }
          
          if (!incomeGroups[category]) incomeGroups[category] = {};
          if (!incomeGroups[category][txAccount]) incomeGroups[category][txAccount] = [];
          incomeGroups[category][txAccount].push(transaction);
        } else {
          // 其他类别支出：正常归类到支出
          if (!isSplitParent) {
            totalExpense += amount; // 🆕 累计支出（排除已拆分的父交易）
          }
          
          if (!expenseGroups[category]) expenseGroups[category] = {};
          if (!expenseGroups[category][txAccount]) expenseGroups[category][txAccount] = [];
          expenseGroups[category][txAccount].push(transaction);
        }
      }
    });

    // 🆕 调试信息：显示分组后的数据
    const splitParentCount = realTransactions.filter(t => t.isSplit === true).length;
    console.log('🔍 [TreeView Debug] 收入分组:', Object.keys(incomeGroups));
    console.log('🔍 [TreeView Debug] 支出分组:', Object.keys(expenseGroups));
    console.log('🔍 [TreeView Debug] 已拆分父交易数:', splitParentCount, '(已排除在统计之外)');
    console.log('🔍 [TreeView Debug] 收入分组详情:', incomeGroups);
    console.log('🔍 [TreeView Debug] 支出分组详情:', expenseGroups);

    // 类别名称映射
    const categoryNameMap: Record<string, string> = {
      'member-fees': '会员费用',
      'event-finance': '活动财务',
      'general-accounts': '日常账户',
      'uncategorized': '未分类',
    };

    // 构建收入树
    Object.entries(incomeGroups).forEach(([category, subGroups]) => {
      if (Object.keys(subGroups).length === 0) return;

      // 🆕 对于活动财务，计算净收入（收入 - 支出）
      let categoryTotal = 0;
      let categoryCount = 0;

      if (category === 'event-finance') {
        // 活动财务：分别计算收入和支出，然后计算净收入
        Object.values(subGroups).flat().forEach(transaction => {
          categoryCount++;
          // 🆕 跳过已拆分的父交易
          if (transaction.isSplit === true) return;
          
          if (transaction.transactionType === 'income') {
            categoryTotal += transaction.amount || 0;  // 收入为正数
          } else {
            categoryTotal -= transaction.amount || 0;  // 支出为负数（减少净收入）
          }
        });
      } else {
        // 其他类别：正常计算总收入
        const allTransactions = Object.values(subGroups).flat();
        // 🆕 排除已拆分的父交易
        categoryTotal = allTransactions
          .filter(t => t.isSplit !== true)
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        categoryCount = allTransactions.length;
      }

      const categoryNode: DataNode = {
        title: (
          <span>
            {categoryNameMap[category] || category}
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              ({categoryCount}) RM {categoryTotal.toFixed(2)}
            </Text>
            {category === 'event-finance' && categoryTotal < 0 && (
              <Text type="danger" style={{ marginLeft: 8, fontSize: 12 }}>
                (净亏损)
              </Text>
            )}
          </span>
        ),
        key: `income-${category}`,
        children: [],
      };

      Object.entries(subGroups).forEach(([txAccount, items]) => {
        // 🆕 对于活动财务，按负责理事分组
        if (category === 'event-finance') {
          // 按负责理事分组活动
          const boardMemberGroups: Record<string, { events: Record<string, Transaction[]> }> = {};
          
          items.forEach(transaction => {
            const eventName = transaction.txAccount || 'uncategorized';
            const event: any = eventsMap.get(eventName);
            const boardMember = event?.boardMember || '未设置负责理事';
            
            if (!boardMemberGroups[boardMember]) {
              boardMemberGroups[boardMember] = { events: {} };
            }
            if (!boardMemberGroups[boardMember].events[eventName]) {
              boardMemberGroups[boardMember].events[eventName] = [];
            }
            boardMemberGroups[boardMember].events[eventName].push(transaction);
          });
          
          // 负责理事标签映射
          const boardMemberLabels: Record<string, string> = {
            'president': 'President（会长）',
            'secretary': 'Secretary（秘书）',
            'honorary-treasurer': 'Honorary Treasurer（名誉司库）',
            'general-legal-council': 'General Legal Council（法律顾问）',
            'executive-vp': 'Executive Vice President（执行副会长）',
            'vp-individual': 'VP Individual（个人发展副会长）',
            'vp-community': 'VP Community（社区发展副会长）',
            'vp-business': 'VP Business（商业发展副会长）',
            'vp-international': 'VP International（国际事务副会长）',
            'vp-lom': 'VP LOM（地方组织副会长）',
            'immediate-past-president': 'Immediate Past President（卸任会长）',
            '未设置负责理事': '未设置负责理事',
          };
          
          // 构建负责理事节点
          Object.entries(boardMemberGroups).forEach(([boardMember, groupData]) => {
            const allEventsInGroup = Object.values(groupData.events).flat();
            const groupIncomeTotal = allEventsInGroup
              .filter(t => t.transactionType === 'income' && t.isSplit !== true)
              .reduce((sum, t) => sum + (t.amount || 0), 0);
            const groupExpenseTotal = allEventsInGroup
              .filter(t => t.transactionType === 'expense' && t.isSplit !== true)
              .reduce((sum, t) => sum + (t.amount || 0), 0);
            const groupNetTotal = groupIncomeTotal - groupExpenseTotal;
            
            const boardMemberNode: DataNode = {
              title: (
                <span>
                  👑 {boardMemberLabels[boardMember] || boardMember}
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    ({Object.keys(groupData.events).length}个活动) 净收入: RM {groupNetTotal.toFixed(2)}
                  </Text>
                </span>
              ),
              key: `income-${category}-${boardMember}`,
              children: [],
            };
            
            // 构建每个活动节点
            Object.entries(groupData.events).forEach(([eventName, eventTransactions]) => {
              const incomeItems = eventTransactions.filter(t => t.transactionType === 'income');
              const expenseItems = eventTransactions.filter(t => t.transactionType === 'expense');
              
              const incomeTotal = incomeItems
                .filter(t => t.isSplit !== true)
                .reduce((sum, t) => sum + (t.amount || 0), 0);
              const expenseTotal = expenseItems
                .filter(t => t.isSplit !== true)
                .reduce((sum, t) => sum + (t.amount || 0), 0);
              const netTotal = incomeTotal - expenseTotal;
              
              // 获取活动日期
              const event: any = eventsMap.get(eventName);
              const eventDate = event?.startDate ? globalDateService.formatDate(event.startDate, 'display') : '';
              
              boardMemberNode.children!.push({
                title: (
                  <span onClick={() => handleTreeNodeClick(eventTransactions)} style={{ cursor: 'pointer' }}>
                    {eventName === 'uncategorized' ? '未分类' : eventName}
                    {eventDate && (
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>
                        ({eventDate})
                      </Text>
                    )}
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      净收入: RM {netTotal.toFixed(2)}
                    </Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 10 }}>
                      (收入: RM {incomeTotal.toFixed(2)} - 支出: RM {expenseTotal.toFixed(2)})
                    </Text>
                  </span>
                ),
                key: `income-${category}-${boardMember}-${eventName}`,
                isLeaf: true,
              });
            });
            
            categoryNode.children!.push(boardMemberNode);
          });
        } else {
          // 其他类别：正常显示
          // 🆕 排除已拆分的父交易
          const subTotal = items
            .filter(t => t.isSplit !== true)
            .reduce((sum, t) => sum + (t.amount || 0), 0);

          categoryNode.children!.push({
            title: (
              <span onClick={() => handleTreeNodeClick(items)} style={{ cursor: 'pointer' }}>
                {txAccount === 'uncategorized' ? '未分类' : txAccount}
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  ({items.length}) RM {subTotal.toFixed(2)}
                </Text>
              </span>
            ),
            key: `income-${category}-${txAccount}`,
            isLeaf: true,
          });
        }
      });

      incomeNode.children!.push(categoryNode);
    });

    // 构建支出树
    Object.entries(expenseGroups).forEach(([category, subGroups]) => {
      if (Object.keys(subGroups).length === 0) return;

      const allTransactions = Object.values(subGroups).flat();
      // 🆕 排除已拆分的父交易
      const categoryTotal = allTransactions
        .filter(t => t.isSplit !== true)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const categoryCount = allTransactions.length;

      const categoryNode: DataNode = {
        title: (
          <span>
            {categoryNameMap[category] || category}
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              ({categoryCount}) RM {categoryTotal.toFixed(2)}
            </Text>
          </span>
        ),
        key: `expense-${category}`,
        children: [],
      };

      Object.entries(subGroups).forEach(([txAccount, items]) => {
        // 🆕 对于活动财务，按负责理事分组
        if (category === 'event-finance') {
          // 按负责理事分组活动
          const boardMemberGroups: Record<string, { events: Record<string, Transaction[]> }> = {};
          
          items.forEach(transaction => {
            const eventName = transaction.txAccount || 'uncategorized';
            const event: any = eventsMap.get(eventName);
            const boardMember = event?.boardMember || '未设置负责理事';
            
            if (!boardMemberGroups[boardMember]) {
              boardMemberGroups[boardMember] = { events: {} };
            }
            if (!boardMemberGroups[boardMember].events[eventName]) {
              boardMemberGroups[boardMember].events[eventName] = [];
            }
            boardMemberGroups[boardMember].events[eventName].push(transaction);
          });
          
          // 负责理事标签映射
          const boardMemberLabels: Record<string, string> = {
            'president': 'President（会长）',
            'secretary': 'Secretary（秘书）',
            'honorary-treasurer': 'Honorary Treasurer（名誉司库）',
            'general-legal-council': 'General Legal Council（法律顾问）',
            'executive-vp': 'Executive Vice President（执行副会长）',
            'vp-individual': 'VP Individual（个人发展副会长）',
            'vp-community': 'VP Community（社区发展副会长）',
            'vp-business': 'VP Business（商业发展副会长）',
            'vp-international': 'VP International（国际事务副会长）',
            'vp-lom': 'VP LOM（地方组织副会长）',
            'immediate-past-president': 'Immediate Past President（卸任会长）',
            '未设置负责理事': '未设置负责理事',
          };
          
          // 构建负责理事节点
          Object.entries(boardMemberGroups).forEach(([boardMember, groupData]) => {
            const allEventsInGroup = Object.values(groupData.events).flat();
            const groupTotal = allEventsInGroup
              .filter(t => t.isSplit !== true)
              .reduce((sum, t) => sum + (t.amount || 0), 0);
            
            const boardMemberNode: DataNode = {
              title: (
                <span>
                  👑 {boardMemberLabels[boardMember] || boardMember}
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    ({Object.keys(groupData.events).length}个活动) RM {groupTotal.toFixed(2)}
                  </Text>
                </span>
              ),
              key: `expense-${category}-${boardMember}`,
              children: [],
            };
            
            // 构建每个活动节点
            Object.entries(groupData.events).forEach(([eventName, eventTransactions]) => {
              const subTotal = eventTransactions
                .filter(t => t.isSplit !== true)
                .reduce((sum, t) => sum + (t.amount || 0), 0);
              
              // 获取活动日期
              const event: any = eventsMap.get(eventName);
              const eventDate = event?.startDate ? globalDateService.formatDate(event.startDate, 'display') : '';
              
              boardMemberNode.children!.push({
                title: (
                  <span onClick={() => handleTreeNodeClick(eventTransactions)} style={{ cursor: 'pointer' }}>
                    {eventName === 'uncategorized' ? '未分类' : eventName}
                    {eventDate && (
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>
                        ({eventDate})
                      </Text>
                    )}
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      RM {subTotal.toFixed(2)}
                    </Text>
                  </span>
                ),
                key: `expense-${category}-${boardMember}-${eventName}`,
                isLeaf: true,
              });
            });
            
            categoryNode.children!.push(boardMemberNode);
          });
        } else {
          // 其他类别：正常显示
          // 🆕 排除已拆分的父交易
          const subTotal = items
            .filter(t => t.isSplit !== true)
            .reduce((sum, t) => sum + (t.amount || 0), 0);

          categoryNode.children!.push({
            title: (
              <span onClick={() => handleTreeNodeClick(items)} style={{ cursor: 'pointer' }}>
                {txAccount === 'uncategorized' ? '未分类' : txAccount}
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  ({items.length}) RM {subTotal.toFixed(2)}
                </Text>
              </span>
            ),
            key: `expense-${category}-${txAccount}`,
            isLeaf: true,
          });
        }
      });

      expenseNode.children!.push(categoryNode);
    });

    // 收集所有节点的 key 用于默认展开
    const allKeys: React.Key[] = ['income-root', 'expense-root'];
    
    incomeNode.children?.forEach(categoryNode => {
      allKeys.push(categoryNode.key!);
    });
    
    expenseNode.children?.forEach(categoryNode => {
      allKeys.push(categoryNode.key!);
    });

      setTreeData([incomeNode, expenseNode]);
      setExpandedKeys(allKeys);
      
      // 🆕 计算并保存统计数据
      const surplus = totalIncome - totalExpense;
      setTreeStatistics({
        totalIncome,
        totalExpense,
        surplus,
      });
      
      console.log('📊 [TreeView Statistics]', {
        totalIncome: `RM ${totalIncome.toFixed(2)}`,
        totalExpense: `RM ${totalExpense.toFixed(2)}`,
        surplus: `RM ${surplus.toFixed(2)}`,
        status: surplus >= 0 ? 'Surplus ✅' : 'Deficit ❌',
      });
    } catch (error) {
      console.error('❌ [buildTreeData] Failed to build tree data:', error);
      message.error('构建树形视图数据失败');
    } finally {
      setTreeLoading(false);
    }
  };

  // 🆕 处理树节点点击事件
  const handleTreeNodeClick = (items: Transaction[]) => {
    // 切换到表格视图并筛选这些交易
    setViewMode('table');
    setFilteredTransactions(items);
  };

  // 🆕 当日期范围变化时，重新构建树形数据
  useEffect(() => {
    if (viewMode === 'tree') {
      buildTreeData();
    }
  }, [treeDateRangeType, treeSelectedYear, viewMode]);

  const columns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 75,
      sorter: true,
      render: (date: string) => globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '描述',
      dataIndex: 'mainDescription',
      key: 'mainDescription',
      width: 150,
      ellipsis: true,
      render: (text: string, record: Transaction) => {
        const isChild = record.parentTransactionId;
        const isParent = record.isSplit;
        
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isChild && (
                <span style={{ 
                  color: '#999', 
                  fontSize: 16,
                  marginLeft: -4,
                  marginRight: -4,
                }}>
                  └─
                </span>
              )}
              <span style={{ 
                color: isChild ? '#666' : 'inherit',
                fontStyle: isChild ? 'italic' : 'normal',
              }}>
                {text}
              </span>
              {isParent && (
                <Tag color="orange" style={{ fontSize: 11, padding: '0 4px', margin: 0 }}>
                  已拆分 {record.splitCount}
                </Tag>
              )}
              {isChild && (
                <Tag color="blue" style={{ fontSize: 11, padding: '0 4px', margin: 0 }}>
                  子项
                </Tag>
              )}
              {record.category === 'unallocated' && (
                <Tag color="default" style={{ fontSize: 11, padding: '0 4px', margin: 0 }}>
                  未分配
                </Tag>
              )}
            </div>
            {record.subDescription && (
              <div style={{ 
                fontSize: '12px', 
                color: '#888',
                marginTop: 4,
                marginLeft: isChild ? 20 : 0
              }}>
                {record.subDescription}
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
        // Safe guard against undefined values
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
      title: '累计余额',
      key: 'runningBalance',
      width: 110,
      align: 'right',
      render: (_: any, record: Transaction) => {
        const balance = balanceMap.get(record.id);
        
        // 只在单个账户tab显示余额（不支持"所有账户"）
        if (activeTabKey === 'all' || balance === undefined) {
          return <span style={{ color: '#bbb', fontSize: '12px' }}>-</span>;
        }
        
        // 只显示父交易的余额
        if (record.isVirtual || record.parentTransactionId) {
          return <span style={{ color: '#bbb', fontSize: '12px' }}>-</span>;
        }
        
        const balanceClass = balance >= 0 ? 'text-success' : 'text-danger';
        
        return (
          <Tooltip title="截至该笔交易的累计余额（含初始余额）">
            <span className={balanceClass} style={{ fontWeight: 600, fontSize: '13px' }}>
              RM {balance.toFixed(2)}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 90,
      render: (cat: string) => {
        const categoryConfig: Record<string, { color: string; text: string }> = {
          'member-fees': { color: 'blue', text: '会员费' },
          'event-finance': { color: 'green', text: '活动财务' },
          'general-accounts': { color: 'orange', text: '日常账户' },
        };
        
        const config = categoryConfig[cat] || { color: 'default', text: cat || '-' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '二次分类',
      dataIndex: 'txAccount',
      key: 'txAccount',
      width: 150,
      render: (subCat: string, record: Transaction) => {
        if (!subCat) {
          return <Tag color="default">未分类</Tag>;
        }
        
        // 会员费二次分类（保留硬编码，因为这些是固定的会员类别）
        const memberFeeConfig: Record<string, { color: string; text: string }> = {
          'official-member': { color: 'blue', text: '官方会员' },
          'associate-member': { color: 'cyan', text: '准会员' },
          'honorary-member': { color: 'purple', text: '荣誉会员' },
          'visiting-member': { color: 'geekblue', text: '访问会员' },
        };
        
        // 如果是会员费，使用固定配置
        if (record.category === 'member-fees' && memberFeeConfig[subCat]) {
          const config = memberFeeConfig[subCat];
          return <Tag color={config.color}>{config.text}</Tag>;
        }
        
        // 如果是活动财务，txAccount 可能是活动名称
        if (record.category === 'event-finance') {
          return (
            <Tooltip title={`活动: ${subCat}`}>
              <Tag color="green" style={{ maxWidth: 120 }}>
                <span style={{ 
                  display: 'inline-block',
                  maxWidth: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'middle'
                }}>
                  {subCat}
                </span>
              </Tag>
            </Tooltip>
          );
        }
        
        // 🆕 如果是日常账户，从purposeOptions中查找label
        if (record.category === 'general-accounts') {
          const purpose = purposeOptions.find(p => p.value === subCat);
          const displayText = purpose ? purpose.label : subCat;
          return <Tag color="purple">{displayText}</Tag>;
        }
        
        // 默认显示原始值
        return <Tag color="default">{subCat}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 50,
      render: (status: TransactionStatus) => {
        const statusConfig: Record<TransactionStatus, { color: string; text: string }> = {
          completed: { color: 'success', text: '已完成' },
          pending: { color: 'warning', text: '待审核' },
          cancelled: { color: 'default', text: '已取消' },
          rejected: { color: 'error', text: '已拒绝' },
        };
        
        // Safe guard against undefined or invalid status
        const config = statusConfig[status] || { color: 'default', text: status || '未知' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        const isChild = record.parentTransactionId;
        const isParent = record.isSplit;
        const isVirtual = record.isVirtual;
        
        return (
          <Space size="small">
            {record.status === 'pending' && !isChild && (
              <Tooltip title="批准">
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(record.id)}
                />
              </Tooltip>
            )}
            {!isChild && !isVirtual && (
              <Tooltip title={isParent ? "重新拆分 / 撤销拆分" : "拆分交易"}>
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleSplit(record)}
                  style={{ color: '#fa8c16' }}
                >
                  {isParent ? '重新拆分' : '拆分'}
                </Button>
              </Tooltip>
            )}
            {!isChild && (
              <Tooltip title="编辑">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
            )}
            {!isChild && (
              <Tooltip title="删除">
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record.id)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  // 批量操作配置
  const bulkActions = [
    {
      key: 'batch-split',
      label: '批量拆分',
      icon: <ScissorOutlined />,
      onClick: handleBatchSplit,
      disabled: selectedRowKeys.length === 0,
    },
    {
      key: 'batch-category',
      label: '设置类别',
      icon: <TagOutlined />,
      onClick: handleBatchSetCategory,
      disabled: selectedRowKeys.length === 0,
    },
    {
      key: 'export',
      label: '导出选中',
      icon: <ExportOutlined />,
      onClick: handleBatchExport,
      disabled: selectedRowKeys.length === 0,
    },
    {
      key: 'delete',
      label: '批量删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleBatchDelete(selectedRowKeys as string[]),
      disabled: selectedRowKeys.length === 0,
      confirmMessage: `确定要删除选中的 ${selectedRowKeys.length} 条交易吗？此操作无法撤销。`,
    },
  ];

  if (loading && transactions.length === 0) {
    return <LoadingSpinner />;
  }

  // 生成标签页项
  const tabItems = [
    {
      key: 'all',
      label: (
        <Space>
          <span style={{ fontWeight: 500 }}>所有账户</span>
          {accountTransactionCounts.all > 0 && (
            <Badge 
              count={accountTransactionCounts.all} 
              showZero
              overflowCount={9999}
              style={{ backgroundColor: '#1890ff' }}
            />
          )}
        </Space>
      ),
    },
    ...bankAccounts.map(account => {
      const displayBalance = getAccountDisplayBalance(account.id, account.initialBalance);
      const isCalculated = accountBalances[account.id] !== undefined;
      
      return {
        key: account.id,
        label: (
          <Space direction="vertical" size={0} style={{ minWidth: 120 }}>
            <Space size={4}>
              <span style={{ fontWeight: 500 }}>{account.accountName}</span>
              {account.isDefault && (
                <Tag color="blue" style={{ fontSize: '10px', margin: 0, padding: '0 4px' }}>
                  默认
                </Tag>
              )}
            </Space>
            <div style={{ fontSize: '11px', color: '#666' }}>
              <Space size={8}>
                <Tooltip title={isCalculated ? '实时计算余额' : '初始余额（未计算）'}>
                  <span style={{ color: isCalculated ? '#000' : '#999' }}>
                    余额: RM {displayBalance.toFixed(2)}
                  </span>
                </Tooltip>
                {accountTransactionCounts[account.id] > 0 && (
                  <Badge 
                    count={accountTransactionCounts[account.id]} 
                    showZero
                    overflowCount={9999}
                    style={{ backgroundColor: '#52c41a' }}
                  />
                )}
              </Space>
            </div>
          </Space>
        ),
      };
    }),
  ];

  return (
    <ErrorBoundary>
      <div className="transaction-management-page">
        <PageHeader
          title="交易管理"
          subtitle="按银行账户查看和管理所有财务交易"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '交易管理' },
          ]}
        />

        {/* 表格/树形视图切换 */}
        <Card>
          <Tabs
            activeKey={viewMode}
            onChange={(key) => {
              setViewMode(key as 'table' | 'tree');
              if (key === 'table') {
                setFilteredTransactions([]); // 清空筛选
              }
            }}
            items={[
              {
                key: 'table',
                label: (
                  <span>
                    <TableOutlined /> 表格视图
                  </span>
                ),
                children: (
                  <>
        {/* 银行账户标签页 */}
                    <Card style={{ marginBottom: 24 }} bordered={false}>
          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            type="card"
            size="large"
            items={tabItems}
            tabBarStyle={{ marginBottom: 0 }}
            tabBarExtraContent={
              <Space>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  当前显示: {total} 条交易
                </span>
              </Space>
            }
          />
        </Card>

        {/* Filters */}
                    <Card className="mb-6" bordered={false}>
          <div className="flex flex-wrap gap-4 items-center">
            <Search
              placeholder="模糊搜索：主描述、副描述、金额、付款人、备注、收据号、发票号、交易类型..."
              onSearch={setSearchText}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 400 }}
              allowClear
              enterButton={<SearchOutlined />}
            />

            <Select
                          style={{ width: 180 }}
                          placeholder="主要类别"
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              <Option value="all">所有类别</Option>
                          <Option value="member-fees">会员费用</Option>
                          <Option value="event-finance">活动财务</Option>
                          <Option value="general-accounts">日常账户</Option>
                          <Option value="uncategorized">🔴 未分类</Option>
            </Select>

                        {/* 🆕 未分类快速筛选按钮 */}
                        <Button 
                          type={hasUncategorized ? "default" : "default"}
                          danger={hasUncategorized}
                          disabled={!hasUncategorized}
                          icon={<TagOutlined />}
                          onClick={() => setCategoryFilter('uncategorized')}
                        >
                          {hasUncategorized ? '🔴 显示未分类' : '✅ 无未分类'}
                        </Button>

            <Button icon={<DownloadOutlined />}>导出报表</Button>
            <div className="ml-auto">
              <Space>
                <Button 
                  icon={<RobotOutlined />} 
                  onClick={handleOpenAutoMatch}
                  loading={autoMatchLoading}
                  disabled={!hasUncategorized}
                >
                  自动分类
                </Button>
                <Button icon={<PlusOutlined />} onClick={handleOpenBulkImport}>
                  批量导入
                </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新交易
              </Button>
              </Space>
            </div>
          </div>
        </Card>

        {/* Transactions Table */}
                    <Card bordered={false}>
          <Table
            {...tableConfig}
            columns={columns}
                        dataSource={filteredTransactions.length > 0 ? filteredTransactions : transactions}
            rowKey="id"
            loading={loading}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (record: Transaction) => ({
                disabled: record.isVirtual === true, // 子交易不能单独选择
              }),
            }}
            pagination={{
              current: currentPage,
              pageSize,
                          total: filteredTransactions.length > 0 ? filteredTransactions.length : total,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size || 20);
                setSelectedRowKeys([]); // 切换页面时清空选择
              },
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
                        scroll={{ y: 600 }}
          />
        </Card>

        {/* 批量操作栏 */}
        <BulkOperationBar
          visible={selectedRowKeys.length > 0}
          selectedCount={selectedRowKeys.length}
          totalCount={transactions.filter(t => t.isVirtual !== true).length}
          actions={bulkActions}
          onSelectAll={() => {
            // 只选择非虚拟交易（排除子交易）
            const selectableIds = transactions
              .filter(t => t.isVirtual !== true)
              .map(t => t.id);
            setSelectedRowKeys(selectableIds);
          }}
          onDeselectAll={() => setSelectedRowKeys([])}
        />
                  </>
                ),
              },
              {
                key: 'tree',
                label: (
                  <span>
                    <ApartmentOutlined /> 树形视图
                  </span>
                ),
                children: (
                  <div style={{ padding: '24px 0' }}>
                    <Alert
                      message="树形视图说明"
                      description="交易按收入/支出 → 类别 → 二次分类层级组织。根据审计报告要求，活动财务的支出已合并到收入中显示净收入。点击叶子节点可切换到表格视图查看详细记录。"
                      type="info"
                      showIcon
                      style={{ marginBottom: 24 }}
                    />
                    
                    {/* 🆕 日期范围选择器 */}
                    <Card style={{ marginBottom: 24 }} bordered={false}>
                      <Space size="middle" wrap>
                        <span style={{ fontWeight: 500 }}>日期范围:</span>
                        <Radio.Group 
                          value={treeDateRangeType} 
                          onChange={(e) => setTreeDateRangeType(e.target.value)}
                          buttonStyle="solid"
                        >
                          <Radio.Button value="all">全部</Radio.Button>
                          <Radio.Button value="fiscal">财年 (10月-9月)</Radio.Button>
                          <Radio.Button value="calendar">自然年 (1月-12月)</Radio.Button>
                        </Radio.Group>
                        
                        {treeDateRangeType !== 'all' && (
                          <>
                            <Select
                              style={{ width: 120 }}
                              value={treeSelectedYear}
                              onChange={setTreeSelectedYear}
                            >
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - i;
                                return (
                                  <Option key={year} value={year.toString()}>
                                    {treeDateRangeType === 'fiscal' ? `FY${year}` : `${year}年`}
                  </Option>
                                );
                              })}
              </Select>
                            
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {treeDateRangeType === 'fiscal' 
                                ? `${treeSelectedYear}-10-01 至 ${parseInt(treeSelectedYear) + 1}-09-30`
                                : `${treeSelectedYear}-01-01 至 ${treeSelectedYear}-12-31`
                              }
                            </Text>
                          </>
                        )}
                      </Space>
                    </Card>
                    
                    {/* 🆕 统计数据卡片 */}
                    {!treeLoading && treeData.length > 0 && (
                      <Card style={{ marginBottom: 24 }} bordered={false}>
                        <Row gutter={24}>
                          <Col span={8}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                                Total Incomes
                              </div>
                              <div style={{ fontSize: 28, fontWeight: 600, color: '#52c41a' }}>
                                RM {treeStatistics.totalIncome.toFixed(2)}
                              </div>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                                Total Expenses
                              </div>
                              <div style={{ fontSize: 28, fontWeight: 600, color: '#ff4d4f' }}>
                                RM {treeStatistics.totalExpense.toFixed(2)}
                              </div>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                                {treeStatistics.surplus >= 0 ? 'Surplus' : 'Deficit'}
                              </div>
                              <div style={{ 
                                fontSize: 28, 
                                fontWeight: 600, 
                                color: treeStatistics.surplus >= 0 ? '#1890ff' : '#ff4d4f' 
                              }}>
                                {treeStatistics.surplus >= 0 ? '' : '('}
                                RM {Math.abs(treeStatistics.surplus).toFixed(2)}
                                {treeStatistics.surplus >= 0 ? '' : ')'}
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    )}
                    
                    {treeLoading ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <LoadingSpinner />
                        <div style={{ marginTop: 16, color: '#666' }}>正在加载所有交易数据...</div>
                      </div>
                    ) : (
                      <Tree
                        showLine
                        showIcon={false}
                        expandedKeys={expandedKeys}
                        onExpand={setExpandedKeys}
                        treeData={treeData}
                        style={{ fontSize: 14 }}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* Create/Edit Transaction Modal */}
        {/* Edit/Create Transaction Modal */}
        <EditTransactionModal
          visible={modalVisible}
          transaction={editingTransaction}
          bankAccounts={bankAccounts}
          form={form}
          onOk={handleSubmit}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
            setEditingTransaction(null);
          }}
        />

        {/* Bulk Import Modal */}
        <Modal
          title="批量导入交易记录"
          open={bulkImportVisible}
          onOk={handleBulkImportSubmit}
          onCancel={() => {
            setBulkImportVisible(false);
            setBulkImportData([]);
          }}
          width={1200}
          okText="确认导入"
          cancelText="取消"
        >
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ color: '#666', fontSize: '12px' }}>
                💡 提示：可直接粘贴Excel表格数据（格式：描述 ｜ 付款人/收款人 ｜ 金额 ｜ 日期），或手动添加行
              </div>
              <Input.TextArea
                placeholder="在此粘贴表格数据..."
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                onPaste={handleTextPaste}
                rows={3}
                style={{ display: bulkImportData.length === 0 ? 'block' : 'none' }}
              />
              <Button type="dashed" onClick={handleAddBulkRow} block icon={<PlusOutlined />}>
                添加一行
              </Button>
            </Space>
          </div>

          <Table
            dataSource={bulkImportData}
            pagination={false}
            size="small"
            rowKey="key"
            scroll={{ y: 400 }}
            columns={[
              {
                title: <span style={{ color: 'red' }}>描述 *</span>,
                dataIndex: 'description',
                width: 200,
                render: (text, record) => (
                  <Input
                    value={text}
                    onChange={(e) => handleBulkDataChange(record.key, 'description', e.target.value)}
                    placeholder="请输入描述"
                    status={!text ? 'error' : ''}
                  />
                ),
              },
              {
                title: '付款人/收款人',
                dataIndex: 'payerPayee',
                width: 150,
                render: (text, record) => (
                  <Input
                    value={text}
                    onChange={(e) => handleBulkDataChange(record.key, 'payerPayee', e.target.value)}
                    placeholder="选填"
                  />
                ),
              },
              {
                title: <span style={{ color: 'red' }}>金额 *</span>,
                dataIndex: 'amount',
                width: 120,
                render: (text, record) => (
              <InputNumber
                    value={text}
                    onChange={(value) => handleBulkDataChange(record.key, 'amount', value || 0)}
                    placeholder="0.00"
                    min={0}
                precision={2}
                    style={{ width: '100%' }}
                    status={text <= 0 ? 'error' : ''}
                  />
                ),
              },
              {
                title: '日期',
                dataIndex: 'transactionDate',
                width: 140,
                render: (text, record) => (
                  <DatePicker
                    value={text ? dayjs(text) : null}
                    onChange={(date) => handleBulkDataChange(record.key, 'transactionDate', date ? date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))}
                    format="YYYY-MM-DD"
                    style={{ width: '100%' }}
                  />
                ),
              },
              {
                title: '类型',
                dataIndex: 'transactionType',
                width: 100,
                render: (text, record) => (
                  <Select
                    value={text}
                    onChange={(value) => handleBulkDataChange(record.key, 'transactionType', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="income">收入</Option>
                    <Option value="expense">支出</Option>
              </Select>
                ),
              },
              {
                title: '主类别',
                dataIndex: 'category',
                width: 130,
                render: (text, record) => (
                  <Select
                    value={text}
                    onChange={(value) => handleBulkDataChange(record.key, 'category', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="member-fees">会员费用</Option>
                    <Option value="event-finance">活动财务</Option>
                    <Option value="general-accounts">日常账户</Option>
              </Select>
                ),
              },
              {
                title: <span style={{ color: 'red' }}>银行账户 *</span>,
                dataIndex: 'bankAccountId',
                width: 150,
                render: (text, record) => (
                  <Select
                    value={text}
                    onChange={(value) => handleBulkDataChange(record.key, 'bankAccountId', value)}
                    style={{ width: '100%' }}
                    placeholder="选择账户"
                    status={!text ? 'error' : ''}
                  >
                    {bankAccounts.map(account => (
                      <Option key={account.id} value={account.id}>
                        {account.accountName}
                      </Option>
                    ))}
                  </Select>
                ),
              },
              {
                title: '操作',
                width: 60,
                render: (_, record) => (
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteBulkRow(record.key)}
                  />
                ),
              },
            ]}
          />
        </Modal>

        {/* Split Transaction Modal */}
        <SplitTransactionModal
          visible={splitModalVisible}
          transaction={splittingTransaction}
          onOk={handleSplitOk}
          onCancel={() => {
            setSplitModalVisible(false);
            setSplittingTransaction(null);
          }}
          onUnsplit={async (transactionId: string) => {
            await unsplitTransaction(transactionId, user!.id);
            setSplitModalVisible(false);
            setSplittingTransaction(null);
            clearBalanceCache();
            await loadTransactions();
            await updateAccountTransactionCounts();
          }}
        />

        {/* Batch Split Modal */}
        <BatchSplitModal
          visible={batchSplitModalVisible}
          selectedCount={selectedRowKeys.length}
          onOk={handleBatchSplitOk}
          onCancel={() => setBatchSplitModalVisible(false)}
        />

        {/* Batch Set Category Modal */}
        <BatchSetCategoryModal
          visible={batchCategoryModalVisible}
          selectedTransactions={transactions.filter(t => selectedRowKeys.includes(t.id))}
          onOk={handleBatchSetCategoryOk}
          onCancel={() => setBatchCategoryModalVisible(false)}
          onManageSubcategory={(category) => {
            // 根据分类跳转到对应的二次分类管理页面
            if (category === 'member-fees') {
              navigate('/finance/member-fees');
            } else if (category === 'event-finance') {
              navigate('/finance/event-finance');
            } else if (category === 'general-accounts') {
              navigate('/finance/general-accounts');
            }
          }}
        />
        
        {/* Auto Match Modal */}
        <AutoMatchModal
          visible={autoMatchModalVisible}
          previewItems={autoMatchPreviewItems}
          allEvents={allEventsForAutoMatch}
          allMembers={allMembersForAutoMatch}
          onConfirm={handleAutoMatchConfirm}
          onCancel={() => {
            setAutoMatchModalVisible(false);
            setAutoMatchPreviewItems([]);
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default TransactionManagementPage;

