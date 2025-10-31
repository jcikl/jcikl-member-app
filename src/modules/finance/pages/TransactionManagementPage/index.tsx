/**
 * Transaction Management Page
 * 交易管理页面
 * 
 * View and manage all financial transactions
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
  Typography,
  Row,
  Col,
  List,
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
import type { Event as EventType } from '../../../event/types'; // 🆕 导入活动类型
import { smartFiscalYearService } from '../../services/smartFiscalYearService'; // 🆕 导入智能财年服务
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
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all'); // 🆕 二次分类筛选
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]); // 🆕 可用的二次分类列表
  const [activeTabKey, setActiveTabKey] = useState<string>('all'); // 当前选中的标签页(银行账户ID)
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table'); // 🆕 视图模式：表格或树形
  const [treeData, setTreeData] = useState<DataNode[]>([]); // 🆕 树形数据
  const [treeTableData, setTreeTableData] = useState<TreeTableItem[]>([]); // 🆕 树形表格数据
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
  
  // 🆕 交易用途选项(从财务类别管理加载)
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
  
  // 💰 存储各账户的当前余额(实时计算)
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  
  // 🆕 批量粘贴导入
  const [bulkImportVisible, setBulkImportVisible] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(''); // 🆕 统一银行账户设置
  const [bulkImportData, setBulkImportData] = useState<Array<{
    key: string;
    transactionType: 'income' | 'expense';
    category: string;
    mainDescription: string;
    subDescription: string;
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
  // 移除自动匹配关联会员数据源
  

  useEffect(() => {
    loadBankAccounts();
    loadPurposeOptions(); // 🆕 加载交易用途选项
    initializeFiscalYearService(); // 🆕 初始化智能财年服务
  }, []);

  // 🆕 调试：监控 splitModalVisible 变化
  useEffect(() => {
    console.log('📊 [State] splitModalVisible 变化:', splitModalVisible, 'splittingTransaction:', splittingTransaction?.id);
  }, [splitModalVisible, splittingTransaction]);

  // 🆕 加载交易用途选项
  const loadPurposeOptions = async () => {
    try {
      const purposes = await getActiveTransactionPurposes();
      setPurposeOptions(purposes);
    } catch (error) {
      console.error('加载交易用途选项失败:', error);
    }
  };

  // 🆕 初始化智能财年服务
  const initializeFiscalYearService = async () => {
    try {
      // 从本地存储加载财年配置，如果没有则使用默认配置
      const savedConfig = localStorage.getItem('fiscalYearConfig');
      let config;
      
      if (savedConfig) {
        config = JSON.parse(savedConfig);
      } else {
        // 使用默认配置
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
    } catch (error) {
      console.error('初始化智能财年服务失败:', error);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentPage, pageSize, searchText, categoryFilter, subCategoryFilter, activeTabKey]);
  
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
        includeVirtual: true, // 🔑 显示子交易(虚拟交易)
      });

      // 🆕 应用二次分类筛选
      let filteredData = result.data;
      if (categoryFilter !== 'all' && subCategoryFilter !== 'all') {
        if (subCategoryFilter === 'uncategorized') {
          // 筛选未分类的交易
          filteredData = result.data.filter(t => !t.txAccount || t.txAccount.trim() === '');
        } else {
          // 筛选指定二次分类的交易
          filteredData = result.data.filter(t => t.txAccount === subCategoryFilter);
        }
      }

      setTransactions(filteredData);
      setTotal(result.total);
      
      // 🆕 检测是否有未分类交易
      const uncategorizedCount = result.data.filter(t => !t.txAccount || t.txAccount.trim() === '').length;
      setHasUncategorized(uncategorizedCount > 0);
      
      // 🆕 动态生成可用的二次分类列表
      if (categoryFilter !== 'all') {
        const subCategories = new Set<string>();
        
        filteredData.forEach(t => {
          // 收集所有非空的 txAccount
          if (t.txAccount && t.txAccount.trim() !== '') {
            subCategories.add(t.txAccount);
          }
        });
        
        setAvailableSubCategories(Array.from(subCategories).sort());
        
        // 如果当前选择的二次分类不在列表中，重置为"全部"
        if (subCategoryFilter !== 'all' && !subCategories.has(subCategoryFilter) && subCategoryFilter !== 'uncategorized') {
          setSubCategoryFilter('all');
        }
      } else {
        setAvailableSubCategories([]);
      }
      
      // 🎯 计算累计余额(仅针对单个账户)
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
   * 1. 从下到上(数组末尾→开头)
   * 2. 从后往前(最旧页→最新页)
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
      
      // Step 2: 🚀 获取全局所有交易(使用缓存优化)
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
      
      // Step 3: 定位当前页在全局中的位置(UI底部 = 最旧交易)
      const lastTxnOnPage = currentPageTransactions[currentPageTransactions.length - 1];
      const globalEndIndex = allTransactions.findIndex(t => t.id === lastTxnOnPage?.id);
      
      if (globalEndIndex === -1) {
        console.error('❌ [Balance] 定位失败，清空缓存');
        setCacheKey('');
        setBalanceMap(new Map());
        return;
      }
      
      // Step 4: 计算起始余额(累加当前页之后的所有交易)
      let startingBalance = initialBalance;
      
      for (let i = allTransactions.length - 1; i > globalEndIndex; i--) {
        const txn = allTransactions[i];
        if (txn.isVirtual || txn.parentTransactionId) continue;
        
        const netAmount = txn.transactionType === 'income' ? txn.amount : -txn.amount;
        startingBalance += netAmount;
      }
      
      // Step 5: 计算当前页余额(从下到上)
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
      
      // 💰 更新该账户的当前余额(用于标签显示)
      setAccountBalances(prev => ({
        ...prev,
        [bankAccountId]: runningBalance
      }));
      
      // 简洁日志(仅生产环境需要时可完全移除)
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
   * 清空缓存(在交易变更后调用)
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
   * @param initialBalance - 初始余额(作为后备值)
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

      // Validate bank account exists
      if (!values.bankAccountId) {
        message.error('请选择银行账户');
        return;
      }
      
      const accountExists = bankAccounts.some(acc => acc.id === values.bankAccountId);
      
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
      
      // 🆕 如果是活动财务类别，设置根级别的 relatedEventId 和活动名称
      if (formData.category === 'event-finance' && values.txAccount) {
        // values.txAccount 已经是 financialAccount(因为 Option 的 value 使用了 financialAccount)
        (formData as any).relatedEventId = values.txAccount;
        
        // 🔧 查找活动名称并保存到 txAccount
        try {
          const eventsResult = await getEvents({ page: 1, limit: 1000 });
          const selectedEvent = eventsResult.data.find(e => e.financialAccount === values.txAccount || e.id === values.txAccount);
          if (selectedEvent) {
            formData.txAccount = selectedEvent.name; // 保存活动名称而不是ID
          }
        } catch (error) {
          console.error('❌ [handleSubmit] 加载活动数据失败:', error);
        }
      }

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, formData, user.id);
        message.success('交易已更新');
      } else {
        await createTransaction(formData, user.id);
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


  // 🆕 保留原有的handleApprove用于兼容
  const handleApprove = async (id: string) => {
    if (!user) return;
    try {
      await approveTransaction(id, user.id);
      message.success('交易已批准');
      clearBalanceCache();
      await loadTransactions();
      await updateAccountTransactionCounts();
    } catch (error: any) {
      message.error('批准失败');
    }
  };

  const handleSplit = (record: Transaction) => {
    console.log('🎯 [handleSplit] 开始拆分流程, 交易ID:', record.id);
    console.log('🎯 [handleSplit] 交易信息:', {
      id: record.id,
      amount: record.amount,
      mainDescription: record.mainDescription,
      isSplit: record.isSplit
    });
    setSplittingTransaction(record);
    setSplitModalVisible(true);
    console.log('✅ [handleSplit] 设置完成, splitModalVisible 将变为 true');
  };

  const handleSplitOk = async (splits: Array<{
    amount: number;
    category?: string;
    notes?: string;
    txAccount?: string;
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
          // 逐个删除(包含余额回退)
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
      // 🆕 先加载活动和会员数据以获取名称
      let eventName = '';
      const memberMap = new Map<string, string>(); // memberId -> memberName
      
      try {
        // 如果是活动财务类别，先加载活动数据
        if (data.category === 'event-finance' && data.eventId) {
          const eventsResult = await getEvents({ page: 1, limit: 1000 });
          const selectedEvent = eventsResult.data.find(e => e.financialAccount === data.eventId || e.id === data.eventId);
          if (selectedEvent) {
            eventName = selectedEvent.name;
          }
        }
        
        // 如果需要会员名称(活动财务或日常财务)，加载会员数据
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

      // 🆕 构建更新数据和元数据
      const updates: Partial<Transaction> = {};
      const metadata: Record<string, any> = {};

      // 根据类别设置 txAccount 字段
      if (data.category === 'member-fees') {
        // 会员费：年份 + 二次分类
        if (data.year && data.txAccount) {
          updates.txAccount = `${data.year}${data.txAccount}`;
        } else if (data.txAccount) {
          updates.txAccount = data.txAccount;
        }
        // 年份也保存到元数据中
        if (data.year) {
          metadata.year = data.year;
        }
      } else if (data.category === 'event-finance') {
        // 活动财务：使用活动名称
        if (eventName) {
          updates.txAccount = eventName; // 🔧 使用加载的活动名称
        } else if (data.txAccount) {
          updates.txAccount = data.txAccount;
        }
        if (data.eventId) {
          // 🆕 同时设置根级别的 relatedEventId 和 metadata.eventId
          updates.relatedEventId = data.eventId;
          metadata.eventId = data.eventId;
        }
      } else {
        // 其他类别：直接使用 txAccount
        if (data.txAccount) {
          updates.txAccount = data.txAccount;
        }
      }

      const result = await batchSetCategory(
        selectedRowKeys as string[],
        data.category,
        user.id,
        updates,
        metadata
      );

      // 🆕 为每条交易应用独立设置
      if (data.individualData && data.individualData.length > 0) {
        await Promise.all(
          data.individualData.map(async (individualItem) => {
            const updates: Partial<Transaction> = {};
            const metadata: Record<string, any> = {};

            // 🆕 使用已经组合好的 txAccount(从 batchSetCategory 的结果)
            // 不再重新构建，避免覆盖 batchSetCategory 的结果

            // 根据类别设置不同的字段(只处理会员费的特殊字段)
            if (data.category === 'member-fees') {
              // 会员费：关联会员
              if (individualItem.memberId) {
                metadata.memberId = individualItem.memberId;
              }
            } else if (data.category === 'general-accounts') {
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
              
              // 🆕 使用统一的活动ID，并保存活动名称到txAccount(二次分类)
              if (data.eventId && eventName) {
                updates.txAccount = eventName; // ✅ 活动名称保存到txAccount
                metadata.eventId = data.eventId; // ✅ 活动ID保存到metadata
                metadata.eventName = eventName; // ✅ 活动名称也保存到metadata(可选)
              }
            }

            if (Object.keys(metadata).length > 0) {
              updates.metadata = metadata;
            }

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
    // 🆕 设置默认银行账户
    const defaultBankAccount = bankAccounts[0]?.id || '';
    setSelectedBankAccountId(defaultBankAccount);
    
    // 自动添加第一行(不包含银行账户)
    setBulkImportData([{
      key: `bulk-${Date.now()}`,
      transactionType: 'income',
      category: 'member-fees',
      mainDescription: '',
      subDescription: '',
      payerPayee: '',
      amount: 0,
      transactionDate: dayjs().format('YYYY-MM-DD'),
      bankAccountId: '', // 不再使用单独的 bankAccountId
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
      
      // 移除加载所有会员
      
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
    selectedItems: Array<{ transactionId: string; matchResult: MatchResult; customData?: { category?: string; eventName?: string; payerPayee?: string } }>
  ) => {
    if (!user) return;
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const item of selectedItems) {
        try {
          // 🆕 使用用户自定义的主分类
          const finalCategory = item.customData?.category || 'event-finance';
          
          // 🆕 使用用户自定义的活动名称(如果有修改)
          const finalEventName = item.customData?.eventName || item.matchResult.eventName;
          // 🆕 查找对应的活动ID(如果活动名称被修改了)
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
              userModified: !!(item.customData?.category || item.customData?.eventName || item.customData?.payerPayee), // 🆕 标记用户是否修改
            },
          };
          
          // 🆕 如果主分类是活动财务，添加活动相关信息
          if (finalCategory === 'event-finance') {
            updates.txAccount = finalEventName; // 使用活动名称作为二次分类
            // ✅ 使用根级别字段
            updates.relatedEventId = finalEventId;
            updates.relatedEventName = finalEventName;
            // ✅ metadata 字段用于兼容旧系统
            updates.metadata.eventId = finalEventId;
            updates.metadata.eventName = finalEventName;
          }
          
          // 移除自动匹配的关联会员处理，仅保留手填 payerPayee
          const finalPayerPayee = item.customData?.payerPayee || item.matchResult.matchedMember?.memberName;
          if (finalPayerPayee) updates.payerPayee = finalPayerPayee;
          
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
    
    const items = lines.map((line, index) => {
      const parts = line.split('\t').map(p => p.trim());
      
      // 🔧 新的列顺序：日期、主描述、副描述、支出、收入
      const dateStr = parts[0] || '';
      const mainDescription = parts[1] || '';
      const subDescription = parts[2] || '';
      const expenseStr = parts[3] || '0';
      const incomeStr = parts[4] || '0';
      
      // 解析金额(支出或收入)
      const expense = parseFloat(expenseStr) || 0;
      const income = parseFloat(incomeStr) || 0;
      const amount = expense > 0 ? expense : income;
      const transactionType = expense > 0 ? 'expense' : 'income';
      
      // 解析日期
      let transactionDate = dateStr;
      if (!transactionDate || transactionDate === '') {
        transactionDate = dayjs().format('YYYY-MM-DD');
      }
      
      return {
        key: `bulk-${Date.now()}-${index}`,
        transactionType: transactionType as 'income' | 'expense',
        category: 'member-fees',
        mainDescription,
        subDescription,
        payerPayee: '',
        amount: amount,
        transactionDate: transactionDate,
        bankAccountId: '', // 🆕 使用统一的银行账户设置
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
    setBulkImportData([
      ...bulkImportData,
      {
        key: `bulk-${Date.now()}`,
        transactionType: 'income',
        category: 'member-fees',
        mainDescription: '',
        subDescription: '',
        payerPayee: '',
        amount: 0,
        transactionDate: dayjs().format('YYYY-MM-DD'),
        bankAccountId: '', // 🆕 使用统一的银行账户设置
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
      
      // 🆕 验证统一银行账户设置
      if (!selectedBankAccountId) {
        message.error('请选择银行账户');
        return;
      }
      
      // 验证数据
      const invalidRows = bulkImportData.filter(item => 
        !item.mainDescription || item.amount <= 0
      );
      
      if (invalidRows.length > 0) {
        message.error(`有 ${invalidRows.length} 行数据不完整(主描述、金额必填，且金额需大于0)`);
        return;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const item of bulkImportData) {
        try {
          await createTransaction({
            transactionType: item.transactionType,
            category: item.category,
            mainDescription: item.mainDescription,
            subDescription: item.subDescription,
            payerPayee: item.payerPayee,
            amount: item.amount,
            transactionDate: item.transactionDate,
            bankAccountId: selectedBankAccountId, // 🆕 使用统一的银行账户
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
      setSelectedBankAccountId(''); // 🆕 重置银行账户
      clearBalanceCache();
      await loadTransactions();
    } catch (error: any) {
      message.error('批量导入失败');
      console.error(error);
    }
  };

  // 🆕 树形表格数据接口
  interface TreeTableItem {
    key: string;
    name: string;
    level: number; // 0=主类别, 1=子类别, 2=具体项目
    isLastChild: boolean; // 用于决定使用 ├── 还是 └──
    count: number; // 交易数量
    totalAmount: number; // 总金额
    year2025: number; // 2025年金额
    year2024: number; // 2024年金额
    transactions: Transaction[]; // 关联的交易数据
    category?: string; // 类别
    txAccount?: string; // 子账户
    boardMember?: string; // 负责理事
    eventName?: string; // 活动名称
  }

  // 🆕 计算年度统计
  const calculateYearlyStats = (transactions: Transaction[], targetYear?: string) => {
    // 确定目标年份
    const selectedYear = targetYear ? parseInt(targetYear) : new Date().getFullYear();
    
    // 根据日期范围类型确定要统计的年份
    let yearsToCalculate: number[] = [];
    
    if (treeDateRangeType === 'fiscal') {
      // 财年模式：显示选择的财年和前一个财年
      yearsToCalculate = [selectedYear, selectedYear - 1];
    } else if (treeDateRangeType === 'calendar') {
      // 自然年模式：显示选择的年份和前一年
      yearsToCalculate = [selectedYear, selectedYear - 1];
    } else {
      // 全部模式：显示当前年份和过去年份
      const currentYear = new Date().getFullYear();
      yearsToCalculate = [currentYear, currentYear - 1];
    }
    
    const stats: Record<number, { income: number; expense: number; net: number }> = {};
    
    // 初始化统计对象
    yearsToCalculate.forEach(year => {
      stats[year] = { income: 0, expense: 0, net: 0 };
    });
    
    transactions.forEach(transaction => {
      if (transaction.isSplit === true) return; // 跳过已拆分的父交易
      
      const transactionDate = dayjs(transaction.transactionDate);
      const transactionDateStr = transactionDate.format('YYYY-MM-DD');
      const amount = transaction.amount || 0;
      
      if (treeDateRangeType === 'fiscal') {
        // 🔧 财年模式：根据财年管理的设定，判断交易在哪个财年范围
        yearsToCalculate.forEach(year => {
          try {
            const fiscalPeriod = smartFiscalYearService.detectFiscalYearPeriod(year);
            
            // 判断交易日期是否在该财年范围内
            if (transactionDateStr >= fiscalPeriod.startDate && transactionDateStr <= fiscalPeriod.endDate) {
              if (transaction.transactionType === 'income') {
                stats[year].income += amount;
                stats[year].net += amount;
              } else {
                stats[year].expense += amount;
                stats[year].net -= amount;
              }
            }
          } catch (error) {
            console.warn(`Failed to detect fiscal year ${year} period for transaction:`, error);
          }
        });
      } else if (treeDateRangeType === 'calendar') {
        // 自然年模式：判断交易属于哪个自然年
        const transactionYear = transactionDate.year();
        if (yearsToCalculate.includes(transactionYear)) {
          if (transaction.transactionType === 'income') {
            stats[transactionYear].income += amount;
            stats[transactionYear].net += amount;
          } else {
            stats[transactionYear].expense += amount;
            stats[transactionYear].net -= amount;
          }
        }
      } else {
        // 全部模式：按自然年统计
        const transactionYear = transactionDate.year();
        if (yearsToCalculate.includes(transactionYear)) {
          if (transaction.transactionType === 'income') {
            stats[transactionYear].income += amount;
            stats[transactionYear].net += amount;
          } else {
            stats[transactionYear].expense += amount;
            stats[transactionYear].net -= amount;
          }
        }
      }
    });
    
    return stats;
  };

  // 🆕 构建树形表格数据
  const buildTreeTableData = (transactions: Transaction[], events: EventType[], targetYear?: string): TreeTableItem[] => {
    // 确定当前年份和过去年份
    const currentYear = targetYear ? parseInt(targetYear) : new Date().getFullYear();
    const pastYear = currentYear - 1;
    
    // 辅助函数：从统计结果中获取年份数据
    const getYearlyData = (stats: Record<number, { income: number; expense: number; net: number }>) => {
      const statsYears = Object.keys(stats).map(Number).sort((a, b) => b - a);
      const currentYearKey = statsYears[0] || currentYear;
      const pastYearKey = statsYears[1] || pastYear;
      return {
        year2025: stats[currentYearKey]?.net || 0,
        year2024: stats[pastYearKey]?.net || 0
      };
    };

    // 辅助函数：为每个账户/项目创建统一的树形项目(不按年份分开)
    const createUnifiedTreeItem = (
      key: string,
      name: string,
      level: number,
      isLastChild: boolean,
      transactions: Transaction[],
      additionalProps: Partial<TreeTableItem> = {}
    ): TreeTableItem => {
      const stats = calculateYearlyStats(transactions, targetYear);
      const yearlyData = getYearlyData(stats);
      const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      return {
        key,
        name,
        level,
        isLastChild,
        count: transactions.length,
        totalAmount,
        ...yearlyData,
        transactions,
        ...additionalProps
      };
    };
    
    const tableData: TreeTableItem[] = [];
    
    // 按类别分组交易
    const groupedTransactions = transactions.reduce((acc, transaction) => {
      if (transaction.isSplit === true) return acc; // 跳过已拆分的父交易
      
      const category = transaction.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

    // 创建事件映射
    const eventsMap = new Map(events.map(event => [event.name, event]));

    // 负责理事名称映射
    const boardMemberNameMap: Record<string, string> = {
      'president': 'President(会长)',
      'vp-community': 'VP Community(社区发展)',
      'vp-membership': 'VP Membership(会员发展)',
      'vp-business': 'VP Business(商业发展)',
      'secretary': 'Secretary(秘书)',
      'treasurer': 'Treasurer(财政)',
      'immediate-past-president': 'Immediate Past President(前任会长)',
      'director-public-relations': 'Director Public Relations(公关理事)',
      'director-creative': 'Director Creative(创意理事)',
      'director-training': 'Director Training(培训理事)',
      'director-sports': 'Director Sports(体育理事)',
    };

    // 类别名称映射
    const categoryNameMap: Record<string, string> = {
      'event-finance': '活动财务',
      'member-fees': '会员费用',
      'general-accounts': '日常账户',
      'uncategorized': '未分类',
    };

    // 处理收入类别
    // 🔧 修复：日常账户和未分类需要按交易类型分开显示
    const baseIncomeCategories = ['event-finance', 'member-fees'];
    const incomeCategories: string[] = [...baseIncomeCategories]; // 使用副本
    const expenseCategories: string[] = [];
    
    // 🔧 检查是否有日常账户，分别添加到收入和支出类别
    if (groupedTransactions['general-accounts']) {
      const generalAccountIncome = groupedTransactions['general-accounts']
        .filter(t => t.transactionType === 'income');
      if (generalAccountIncome.length > 0) {
        incomeCategories.push('general-accounts');
      }
      
      const generalAccountExpense = groupedTransactions['general-accounts']
        .filter(t => t.transactionType === 'expense');
      if (generalAccountExpense.length > 0) {
        expenseCategories.push('general-accounts');
      }
    }
    
    // 🔧 检查是否有未分类交易，分别添加到收入和支出类别
    if (groupedTransactions['uncategorized']) {
      const uncategorizedIncome = groupedTransactions['uncategorized']
        .filter(t => t.transactionType === 'income');
      if (uncategorizedIncome.length > 0) {
        incomeCategories.push('uncategorized');
      }
      
      const uncategorizedExpense = groupedTransactions['uncategorized']
        .filter(t => t.transactionType === 'expense');
      if (uncategorizedExpense.length > 0) {
        expenseCategories.push('uncategorized');
      }
    }

    // 添加收入标题
    const incomeTransactions = incomeCategories.flatMap(cat => {
      if (cat === 'general-accounts' || cat === 'uncategorized') {
        return groupedTransactions[cat]?.filter(t => t.transactionType === 'income') || [];
      }
      return groupedTransactions[cat] || [];
    });
    
     if (incomeTransactions.length > 0) {
       tableData.push(createUnifiedTreeItem(
         'income-header',
         '收入',
         0,
         false,
         incomeTransactions
       ));
     }

    // 处理收入子类别
    incomeCategories.forEach((category, categoryIndex) => {
      let categoryTransactions: Transaction[] = [];
      
      // 🔧 日常账户和未分类：按交易类型过滤
      if (category === 'general-accounts' || category === 'uncategorized') {
        categoryTransactions = (groupedTransactions[category] || [])
          .filter(t => t.transactionType === 'income');
      } else {
        categoryTransactions = groupedTransactions[category] || [];
      }
      
      if (categoryTransactions.length === 0) return;

      // 添加类别节点
      tableData.push(createUnifiedTreeItem(
        `income-${category}`,
        `${categoryNameMap[category] || category} (${categoryTransactions.length})`,
        1,
        categoryIndex === incomeCategories.length - 1,
        categoryTransactions,
        { category }
      ));

      // 特殊处理活动财务：按负责理事分组
      if (category === 'event-finance') {
        const boardMemberGroups: Record<string, Transaction[]> = {};
        
        // 🔍 调试：检查是否有不匹配的活动
        const unmatchedActivities = new Set<string>();
        
        categoryTransactions.forEach(transaction => {
          // 🔧 去除空格以确保匹配
          const txAccount = (transaction.txAccount || '').trim();
          
          // 尝试精确匹配
          let event = eventsMap.get(txAccount);
          
          // 如果精确匹配失败，尝试模糊匹配(去掉前后空格)
          if (!event && txAccount) {
            for (const [eventName, eventData] of eventsMap.entries()) {
              if (eventName.trim() === txAccount) {
                event = eventData;
                break;
              }
            }
          }
          
          if (!event && txAccount && txAccount !== 'uncategorized') {
            unmatchedActivities.add(txAccount);
          }
          
          const boardMemberKey = event?.boardMember || 'unassigned';
          if (!boardMemberGroups[boardMemberKey]) {
            boardMemberGroups[boardMemberKey] = [];
          }
          boardMemberGroups[boardMemberKey].push(transaction);
        });
        
        // 🔍 如果有不匹配的活动，记录日志
        if (unmatchedActivities.size > 0) {
          console.warn('⚠️ [buildTreeTableData] 发现不匹配的活动:', Array.from(unmatchedActivities));
        }

         const boardMemberKeys = Object.keys(boardMemberGroups);
         boardMemberKeys.forEach((boardMemberKey, boardIndex) => {
           const boardTransactions = boardMemberGroups[boardMemberKey];
          
          // 计算净收入
          const incomeTotal = boardTransactions
            .filter(t => t.transactionType === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
          const expenseTotal = boardTransactions
            .filter(t => t.transactionType === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
          const netTotal = incomeTotal - expenseTotal;

          // 计算活动数量
          // 🔧 去除空格以确保匹配
          const eventNamesSet = new Set(
            boardTransactions
              .map(t => t.txAccount?.trim() || '')
              .filter(name => name && name !== 'uncategorized')
          ) as Set<string>;
          let eventNames = Array.from(eventNamesSet);
          
          // 🔧 排序：先按活动日期从旧至新，再按活动名称字母排序
          eventNames = eventNames.sort((name1, name2) => {
            const event1 = eventsMap.get(name1);
            const event2 = eventsMap.get(name2);
            
            // 获取活动日期
            const date1 = event1?.startDate ? new Date(event1.startDate).getTime() : 0;
            const date2 = event2?.startDate ? new Date(event2.startDate).getTime() : 0;
            
            // 先按日期排序(从旧到新)
            if (date1 !== date2) {
              return date1 - date2;
            }
            
            // 如果日期相同，按名称字母排序(从A到Z)
            return name1.localeCompare(name2, 'zh-CN');
          });
          
          const eventCount = eventNames.length;

           // 添加负责理事节点
           tableData.push(createUnifiedTreeItem(
             `income-${category}-board-${boardMemberKey}`,
             `${boardMemberKey === 'unassigned' ? '未设置负责理事' : boardMemberNameMap[boardMemberKey] || boardMemberKey} (${eventCount}个活动) 净收入: RM ${netTotal.toFixed(2)}`,
             2,
             boardIndex === boardMemberKeys.length - 1,
             boardTransactions,
             { category, boardMember: boardMemberKey }
           ));

          // 为每个活动创建子节点
          eventNames.forEach((eventName, eventIndex) => {
            // 🔧 去除空格以确保精确匹配
            const eventItems = boardTransactions.filter(t => (t.txAccount || '').trim() === eventName);
            const eventIncomeItems = eventItems.filter(t => t.transactionType === 'income');
            const eventExpenseItems = eventItems.filter(t => t.transactionType === 'expense');
            
            const eventIncomeTotal = eventIncomeItems.reduce((sum, t) => sum + (t.amount || 0), 0);
            const eventExpenseTotal = eventExpenseItems.reduce((sum, t) => sum + (t.amount || 0), 0);
            const eventNetTotal = eventIncomeTotal - eventExpenseTotal;

            // 获取活动日期
            const event = eventsMap.get(eventName);
            let eventDate = '日期未知';
            if (event && event.startDate && typeof event.startDate === 'string') {
              try {
                eventDate = dayjs(event.startDate).format('DD-MMM-YYYY');
              } catch (error) {
                eventDate = '日期未知';
              }
            }

             // 添加活动节点
             tableData.push(createUnifiedTreeItem(
               `income-${category}-board-${boardMemberKey}-event-${eventName}`,
               `${eventName} (${eventDate}) 净收入: RM ${eventNetTotal.toFixed(2)}`,
               3,
               eventIndex === eventNames.length - 1,
               eventItems,
               { category, boardMember: boardMemberKey, eventName }
             ));
          });
        });
      } else {
        // 其他类别：按子账户分组
        const subGroups = categoryTransactions.reduce((acc, transaction) => {
          const txAccount = transaction.txAccount || 'uncategorized';
          if (!acc[txAccount]) {
            acc[txAccount] = [];
          }
          acc[txAccount].push(transaction);
          return acc;
        }, {} as Record<string, Transaction[]>);

        const subGroupKeys = Object.keys(subGroups);
        
        // 🆕 日常账户按名称字母排序
        const sortedSubGroupKeys = subGroupKeys.sort((key1, key2) => {
          if (category === 'general-accounts') {
            // 获取显示名称
            const purpose1 = purposeOptions.find(p => p.value === key1);
            const purpose2 = purposeOptions.find(p => p.value === key2);
            const displayName1 = purpose1?.label || key1;
            const displayName2 = purpose2?.label || key2;
            // 按字母排序
            return displayName1.localeCompare(displayName2, 'zh-CN');
          }
          return 0;
        });
        
        sortedSubGroupKeys.forEach((txAccount, subIndex) => {
          const items = subGroups[txAccount];
          const subTotal = items.reduce((sum, t) => sum + (t.amount || 0), 0);
          
          // 格式化显示名称
          let displayName = txAccount;
          if (txAccount === 'uncategorized') {
            displayName = '未分类';
          } else if (category === 'member-fees') {
            // 会员费：检查是否是年份+分类格式
            const yearMatch = txAccount.match(/^(\d{4})(.+)$/);
            if (yearMatch) {
              const [, year, categoryName] = yearMatch;
              displayName = `${year}年${categoryName}`;
            }
          } else if (category === 'general-accounts') {
            // 🆕 日常账户：从 purposeOptions 动态查找名称
            const purpose = purposeOptions.find(p => p.value === txAccount);
            if (purpose) {
              displayName = purpose.label;
            } else {
              // 如果找不到，使用完整的 code (例如 TXGA-0017)
              displayName = txAccount;
            }
          }
          
           // 添加子账户节点
           tableData.push(createUnifiedTreeItem(
             `income-${category}-${txAccount}`,
             `${displayName} (${items.length}) RM ${subTotal.toFixed(2)}`,
             2,
             subIndex === sortedSubGroupKeys.length - 1,
             items,
             { category, txAccount }
           ));
        });
      }
    });

    // 添加支出标题
    const expenseTransactions = expenseCategories.flatMap(cat => {
      if (cat === 'general-accounts' || cat === 'uncategorized') {
        return groupedTransactions[cat]?.filter(t => t.transactionType === 'expense') || [];
      }
      return groupedTransactions[cat] || [];
    });
    
    if (expenseTransactions.length > 0) {
      tableData.push(createUnifiedTreeItem(
        'expense-header',
        '支出',
        0,
        false,
        expenseTransactions
      ));
    }
    
    // 处理支出子类别
    expenseCategories.forEach((category, categoryIndex) => {
      let categoryTransactions: Transaction[] = [];
      
      // 🔧 日常账户和未分类：按交易类型过滤
      if (category === 'general-accounts' || category === 'uncategorized') {
        categoryTransactions = (groupedTransactions[category] || [])
          .filter(t => t.transactionType === 'expense');
      } else {
        categoryTransactions = groupedTransactions[category] || [];
      }
      
      if (categoryTransactions.length === 0) return;

      // 添加类别节点
      tableData.push(createUnifiedTreeItem(
        `expense-${category}`,
        `${categoryNameMap[category] || category} (${categoryTransactions.length})`,
        1,
        categoryIndex === expenseCategories.length - 1,
        categoryTransactions,
        { category }
      ));

      // 按子账户分组
      const subGroups = categoryTransactions.reduce((acc, transaction) => {
        const txAccount = transaction.txAccount || 'uncategorized';
        if (!acc[txAccount]) {
          acc[txAccount] = [];
        }
        acc[txAccount].push(transaction);
        return acc;
      }, {} as Record<string, Transaction[]>);

      const subGroupKeys = Object.keys(subGroups);
      
      // 🆕 日常账户按名称字母排序
      const sortedSubGroupKeys = subGroupKeys.sort((key1, key2) => {
        if (category === 'general-accounts') {
          // 获取显示名称
          const purpose1 = purposeOptions.find(p => p.value === key1);
          const purpose2 = purposeOptions.find(p => p.value === key2);
          const displayName1 = purpose1?.label || key1;
          const displayName2 = purpose2?.label || key2;
          // 按字母排序
          return displayName1.localeCompare(displayName2, 'zh-CN');
        }
        return 0;
      });
      
      sortedSubGroupKeys.forEach((txAccount, subIndex) => {
        const items = subGroups[txAccount];
        const subTotal = items.reduce((sum, t) => sum + (t.amount || 0), 0);
        
        // 格式化显示名称
        let displayName = txAccount;
        if (txAccount === 'uncategorized') {
          displayName = '未分类';
        } else if (category === 'general-accounts') {
          // 🆕 日常账户：从 purposeOptions 动态查找名称
          const purpose = purposeOptions.find(p => p.value === txAccount);
          if (purpose) {
            displayName = purpose.label;
          } else {
            // 如果找不到，使用完整的 code (例如 TXGA-0017)
            displayName = txAccount;
          }
        }
        
        // 添加子账户节点
        tableData.push(createUnifiedTreeItem(
          `expense-${category}-${txAccount}`,
          `${displayName} (${items.length}) RM ${subTotal.toFixed(2)}`,
          2,
          subIndex === sortedSubGroupKeys.length - 1,
          items,
          { category, txAccount }
        ));
      });
    });
    
    return tableData;
  };

  // 🆕 构建树形视图数据
  const buildTreeData = async () => {
    setTreeLoading(true);
    
    try {
      // 🆕 为树形视图加载所有交易数据
      const allTransactions = await loadAllTransactionsForTreeView();
      
      if (!allTransactions || allTransactions.length === 0) {
        setTreeData([]);
        return;
      }
      
      // 🆕 获取所有活动数据(包含负责理事信息)
      const eventsResult = await getEvents({ page: 1, limit: 10000 });
      const eventsMap = new Map(eventsResult.data.map(event => [event.name, event]));
      
      // 过滤掉虚拟子交易(只显示真实交易)
      let realTransactions = allTransactions.filter(t => !t.isVirtual);
    
    // 🆕 根据日期范围类型过滤交易
    // 🔧 修复：需要保留当前年和前一年的数据用于统计对比
    if (treeDateRangeType !== 'all') {
      const year = parseInt(treeSelectedYear);
      const previousYear = year - 1; // 前一年
      
      realTransactions = realTransactions.filter(transaction => {
        if (!transaction.transactionDate) return false;
        
        const txDate = new Date(transaction.transactionDate);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth() + 1; // 1-12
        
        if (treeDateRangeType === 'fiscal') {
          // 使用智能财年服务计算财年范围
          try {
            const fiscalPeriod = smartFiscalYearService.detectFiscalYearPeriod(year);
            const txDateStr = transaction.transactionDate.split('T')[0]; // 获取日期部分
            // 🔧 保留当前财年和前一个财年的数据
            const inCurrentFiscal = txDateStr >= fiscalPeriod.startDate && txDateStr <= fiscalPeriod.endDate;
            
            // 检查前一个财年
            const previousFiscalPeriod = smartFiscalYearService.detectFiscalYearPeriod(previousYear);
            const inPreviousFiscal = txDateStr >= previousFiscalPeriod.startDate && txDateStr <= previousFiscalPeriod.endDate;
            
            return inCurrentFiscal || inPreviousFiscal;
          } catch (error) {
            console.warn('Failed to detect fiscal year period:', error);
            // 回退到默认逻辑(10月1日-9月30日)
            const inCurrentFiscal = (txMonth >= 10 && txYear === year) || (txMonth < 10 && txYear === year + 1);
            const inPreviousFiscal = (txMonth >= 10 && txYear === previousYear) || (txMonth < 10 && txYear === previousYear + 1);
            return inCurrentFiscal || inPreviousFiscal;
          }
        } else if (treeDateRangeType === 'calendar') {
          // 自然年：1月1日 至 12月31日
          // 🔧 保留当前年和前一年的数据
          return txYear === year || txYear === previousYear;
        }
        
        return true;
      });
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
    
    // 🆕 负责理事名称映射
    const boardMemberNameMap: Record<string, string> = {
      'president': 'President(会长)',
      'secretary': 'Secretary(秘书)',
      'honorary-treasurer': 'Honorary Treasurer(名誉司库)',
      'general-legal-council': 'General Legal Council(法律顾问)',
      'executive-vp': 'Executive Vice President(执行副会长)',
      'vp-individual': 'VP Individual(个人发展副会长)',
      'vp-community': 'VP Community(社区发展副会长)',
      'vp-business': 'VP Business(商业发展副会长)',
      'vp-international': 'VP International(国际事务副会长)',
      'vp-lom': 'VP LOM(地方组织副会长)',
      'immediate-past-president': 'Immediate Past President(卸任会长)',
    };

    // 🆕 分组数据结构 - 活动财务按负责理事分组
    const incomeGroups: Record<string, Record<string, Transaction[]>> = {};
    const expenseGroups: Record<string, Record<string, Transaction[]>> = {};

    // 遍历交易记录并分组
    realTransactions.forEach(transaction => {
      const category = transaction.category || 'uncategorized';
      const txAccount = transaction.txAccount || 'uncategorized';
      const isIncome = transaction.transactionType === 'income';
      const amount = transaction.amount || 0;
      
      // 🆕 跳过已拆分的父交易(只计算子交易)
      const isSplitParent = transaction.isSplit === true;

      if (isIncome) {
        // 收入：所有收入交易
        if (!isSplitParent) {
          totalIncome += amount; // 🆕 累计收入(排除已拆分的父交易)
        }
        
        if (!incomeGroups[category]) incomeGroups[category] = {};
        if (!incomeGroups[category][txAccount]) incomeGroups[category][txAccount] = [];
        incomeGroups[category][txAccount].push(transaction);
      } else {
        // 支出：只有非活动财务的支出交易
        if (category === 'event-finance') {
          // 活动财务支出：合并到对应的活动收入中(净收入计算)
          if (!isSplitParent) {
            totalIncome -= amount; // 🆕 活动支出减少总收入(净收入，排除已拆分的父交易)
          }
          
          if (!incomeGroups[category]) incomeGroups[category] = {};
          if (!incomeGroups[category][txAccount]) incomeGroups[category][txAccount] = [];
          incomeGroups[category][txAccount].push(transaction);
        } else {
          // 其他类别支出：正常归类到支出
          if (!isSplitParent) {
            totalExpense += amount; // 🆕 累计支出(排除已拆分的父交易)
          }
          
          if (!expenseGroups[category]) expenseGroups[category] = {};
          if (!expenseGroups[category][txAccount]) expenseGroups[category][txAccount] = [];
          expenseGroups[category][txAccount].push(transaction);
        }
      }
    });

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

      // 🆕 对于活动财务，计算净收入(收入 - 支出)
      let categoryTotal = 0;
      let categoryCount = 0;

      if (category === 'event-finance') {
        // 活动财务：分别计算收入和支出，然后计算净收入
        const allTransactions = Object.values(subGroups).flat();
        const validTransactions = allTransactions.filter(t => t.isSplit !== true);
        categoryCount = validTransactions.length;
        
        validTransactions.forEach(transaction => {
          // 🆕 排除内部转账
          if (transaction.isInternalTransfer === true) return;
          
          if (transaction.transactionType === 'income') {
            categoryTotal += transaction.amount || 0;  // 收入为正数
          } else {
            categoryTotal -= transaction.amount || 0;  // 支出为负数(减少净收入)
          }
        });
      } else {
        // 其他类别：正常计算总收入
        const allTransactions = Object.values(subGroups).flat();
        // 🆕 排除已拆分的父交易和内部转账
        categoryTotal = allTransactions
          .filter(t => t.isSplit !== true && t.isInternalTransfer !== true)
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        categoryCount = allTransactions.filter(t => t.isSplit !== true && t.isInternalTransfer !== true).length;
      }

      
      const categoryNode: DataNode = {
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          </div>
        ),
        key: `income-${category}`,
        children: [],
      };

      // 🆕 特殊处理活动财务：按负责理事分组
      if (category === 'event-finance') {
        // 按负责理事分组活动财务交易
        const boardMemberGroups: Record<string, Transaction[]> = {};
        
        Object.entries(subGroups).forEach(([txAccount, items]) => {
          // 查找对应的活动
          const event = eventsMap.get(txAccount);
          const boardMember = event?.boardMember || 'unassigned';
          const boardMemberKey = boardMember === 'unassigned' ? 'unassigned' : boardMember;
          
          if (!boardMemberGroups[boardMemberKey]) {
            boardMemberGroups[boardMemberKey] = [];
          }
          boardMemberGroups[boardMemberKey].push(...items);
        });

        // 构建负责理事分组节点
        Object.entries(boardMemberGroups).forEach(([boardMemberKey, allItems]) => {
          const incomeItems = allItems.filter(t => t.transactionType === 'income');
          const expenseItems = allItems.filter(t => t.transactionType === 'expense');
          
          // 🆕 排除已拆分的父交易
          const incomeTotal = incomeItems
            .filter(t => t.isSplit !== true)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
          const expenseTotal = expenseItems
            .filter(t => t.isSplit !== true)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
          const netTotal = incomeTotal - expenseTotal;

          // 计算活动数量
          const eventNames = [...new Set(allItems.map(t => t.txAccount).filter(name => name && name !== 'uncategorized'))] as string[];
          const eventCount = eventNames.length;

          const boardMemberNode: DataNode = {
            title: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>
                  {boardMemberKey === 'unassigned' ? '未设置负责理事' : boardMemberNameMap[boardMemberKey] || boardMemberKey}
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    ({eventCount}个活动) 净收入: RM {netTotal.toFixed(2)}
                  </Text>
                </span>
              </div>
            ),
            key: `income-${category}-board-${boardMemberKey}`,
            children: [],
          };

          // 为每个活动创建子节点
          eventNames.forEach(eventName => {
            const eventItems = allItems.filter(t => t.txAccount === eventName);
            const eventIncomeItems = eventItems.filter(t => t.transactionType === 'income');
            const eventExpenseItems = eventItems.filter(t => t.transactionType === 'expense');
            
            // 🆕 排除已拆分的父交易
            const eventIncomeTotal = eventIncomeItems
              .filter(t => t.isSplit !== true)
              .reduce((sum, t) => sum + (t.amount || 0), 0);
            const eventExpenseTotal = eventExpenseItems
              .filter(t => t.isSplit !== true)
              .reduce((sum, t) => sum + (t.amount || 0), 0);
            const eventNetTotal = eventIncomeTotal - eventExpenseTotal;

            // 获取活动日期
            const event = eventsMap.get(eventName);
            let eventDate = '日期未知';
            if (event && event.startDate && typeof event.startDate === 'string') {
              try {
                eventDate = dayjs(event.startDate).format('DD-MMM-YYYY');
              } catch (error) {
                eventDate = '日期未知';
              }
            }

            boardMemberNode.children!.push({
              title: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span onClick={() => handleTreeNodeClick(eventItems)} style={{ cursor: 'pointer' }}>
                    {eventName} ({eventDate}) 净收入: RM {eventNetTotal.toFixed(2)}
                  </span>
                </div>
              ),
              key: `income-${category}-board-${boardMemberKey}-event-${eventName}`,
              isLeaf: true,
            });
          });

          categoryNode.children!.push(boardMemberNode);
        });
      } else {
        // 其他类别：正常显示
        Object.entries(subGroups).forEach(([txAccount, items]) => {
          // 🆕 排除已拆分的父交易
          const subTotal = items
            .filter(t => t.isSplit !== true)
            .reduce((sum, t) => sum + (t.amount || 0), 0);

          const validItemsCount = items.filter(t => t.isSplit !== true).length;
          
          // 格式化显示名称
          let displayName = txAccount;
          if (txAccount === 'uncategorized') {
            displayName = '未分类';
          } else if (category === 'member-fees') {
            // 会员费：检查是否是年份+分类格式
            const yearMatch = txAccount.match(/^(\d{4})(.+)$/);
            if (yearMatch) {
              const [, year, categoryName] = yearMatch;
              displayName = `${year}年${categoryName}`;
            }
          } else if (category === 'general-accounts') {
            // 🆕 日常账户：从 purposeOptions 动态查找名称
            const purpose = purposeOptions.find(p => p.value === txAccount);
            if (purpose) {
              displayName = purpose.label;
            } else {
              // 如果找不到，使用完整的 code (例如 TXGA-0017)
              displayName = txAccount;
            }
          }
          
          categoryNode.children!.push({
            title: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span onClick={() => handleTreeNodeClick(items)} style={{ cursor: 'pointer' }}>
                  {displayName}
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    ({validItemsCount}) RM {subTotal.toFixed(2)}
                  </Text>
                </span>
              </div>
            ),
            key: `income-${category}-${txAccount}`,
            isLeaf: true,
          });
        });
      }

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
      const categoryCount = allTransactions.filter(t => t.isSplit !== true).length;

      const categoryNode: DataNode = {
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              {categoryNameMap[category] || category}
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                ({categoryCount}) RM {categoryTotal.toFixed(2)}
              </Text>
            </span>
          </div>
        ),
        key: `expense-${category}`,
        children: [],
      };

      Object.entries(subGroups).forEach(([txAccount, items]) => {
        // 🆕 排除已拆分的父交易
        const subTotal = items
          .filter(t => t.isSplit !== true)
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const validItemsCount = items.filter(t => t.isSplit !== true).length;
        
        // 格式化显示名称
        let displayName = txAccount;
        if (txAccount === 'uncategorized') {
          displayName = '未分类';
        } else if (category === 'member-fees') {
          // 会员费：检查是否是年份+分类格式
          const yearMatch = txAccount.match(/^(\d{4})(.+)$/);
          if (yearMatch) {
            const [, year, categoryName] = yearMatch;
            displayName = `${year}年${categoryName}`;
          }
        } else if (category === 'general-accounts') {
          // 🆕 日常账户：从 purposeOptions 动态查找名称
          const purpose = purposeOptions.find(p => p.value === txAccount);
          if (purpose) {
            displayName = purpose.label;
          } else {
            // 如果找不到，使用完整的 code (例如 TXGA-0017)
            displayName = txAccount;
          }
        }
        
        categoryNode.children!.push({
          title: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span onClick={() => handleTreeNodeClick(items)} style={{ cursor: 'pointer' }}>
                {displayName}
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  ({validItemsCount}) RM {subTotal.toFixed(2)}
                </Text>
              </span>
            </div>
          ),
          key: `expense-${category}-${txAccount}`,
          isLeaf: true,
        });
      });

      expenseNode.children!.push(categoryNode);
    });

    // 🆕 收集所有节点的 key 用于默认展开(包括所有层级)
    const allKeys: React.Key[] = ['income-root', 'expense-root'];
    
    incomeNode.children?.forEach(categoryNode => {
      allKeys.push(categoryNode.key!);
      
      // 🆕 展开活动财务的负责理事分组
      if (categoryNode.key === 'income-event-finance') {
        categoryNode.children?.forEach(boardMemberNode => {
          allKeys.push(boardMemberNode.key!);
          
          // 🆕 展开负责理事下的具体活动
          boardMemberNode.children?.forEach(eventNode => {
            allKeys.push(eventNode.key!);
          });
        });
      } else {
        // 🆕 展开其他类别的子节点
        categoryNode.children?.forEach(subNode => {
          allKeys.push(subNode.key!);
        });
      }
    });
    
    expenseNode.children?.forEach(categoryNode => {
      allKeys.push(categoryNode.key!);
      
      // 🆕 展开支出类别的子节点
      categoryNode.children?.forEach(subNode => {
        allKeys.push(subNode.key!);
      });
    });

      setTreeData([incomeNode, expenseNode]);
      
      // 🆕 构建树形表格数据
      // 🔧 修复：使用正确的交易数据
      const transactionsForTable = filteredTransactions.length > 0 ? filteredTransactions : realTransactions;
      
       const tableData = buildTreeTableData(transactionsForTable, eventsResult.data, treeSelectedYear);
      
      setTreeTableData(tableData);
      
      // 🆕 计算并保存统计数据
      const surplus = totalIncome - totalExpense;
      setTreeStatistics({
        totalIncome,
        totalExpense,
        surplus,
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

  // 🆕 树形表格列配置(使用 useMemo 确保依赖变化时更新)
  const treeTableColumns: ColumnsType<TreeTableItem> = useMemo(() => [
    {
      title: '账户/项目名称',
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      render: (text: string, record: TreeTableItem) => {
        const prefix = record.level === 0 ? '' : 
                      record.isLastChild ? '└── ' : '├── ';
        return (
          <span 
            style={{ 
              paddingLeft: `${record.level * 20}px`,
              cursor: record.level > 0 ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (record.level > 0 && record.transactions.length > 0) {
                handleTreeNodeClick(record.transactions);
              }
            }}
          >
            {prefix}{text}
          </span>
        );
      }
    },
    {
      title: (() => {
        // 动态生成第2列标题(当前选择的年份)
        if (treeDateRangeType === 'fiscal') {
          return `FY${treeSelectedYear} (RM)`;
        } else if (treeDateRangeType === 'calendar') {
          return `${treeSelectedYear} (RM)`;
        } else {
          return `${treeSelectedYear} (RM)`;
        }
      })(),
      dataIndex: 'year2025',
      key: 'year2025',
      align: 'right',
      width: 120,
      render: (amount: number) => (
        <span style={{ 
          color: amount >= 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          RM {amount.toFixed(2)}
        </span>
      )
    },
    {
      title: (() => {
        // 🔧 动态生成第3列标题(前一年，根据日期范围类型)
        const selectedYear = parseInt(treeSelectedYear);
        const previousYear = selectedYear - 1;
        
        if (treeDateRangeType === 'fiscal') {
          return `FY${previousYear} (RM)`;
        } else if (treeDateRangeType === 'calendar') {
          return `${previousYear} (RM)`;
        } else {
          return `${previousYear} (RM)`;
        }
      })(),
      dataIndex: 'year2024',
      key: 'year2024',
      align: 'right',
      width: 120,
      render: (amount: number) => (
        <span style={{ 
          color: amount >= 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          RM {amount.toFixed(2)}
        </span>
      )
    }
  ], [treeDateRangeType, treeSelectedYear]);

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
      width: 200,
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
      width: 90,
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
      width: 100,
      align: 'right',
      render: (_: any, record: Transaction) => {
        const balance = balanceMap.get(record.id);
        
        // 只在单个账户tab显示余额(不支持"所有账户")
        if (activeTabKey === 'all' || balance === undefined) {
          return <span style={{ color: '#bbb', fontSize: '12px' }}>-</span>;
        }
        
        // 只显示父交易的余额
        if (record.isVirtual || record.parentTransactionId) {
          return <span style={{ color: '#bbb', fontSize: '12px' }}>-</span>;
        }
        
        const balanceClass = balance >= 0 ? 'text-success' : 'text-danger';
        
        return (
          <Tooltip title="截至该笔交易的累计余额(含初始余额)">
            <span className={balanceClass} >
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
      width: 60,
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
      width: 130,
      render: (subCat: string, record: Transaction) => {
        if (!subCat) {
          return <Tag color="default">未分类</Tag>;
        }
        
        // 会员费二次分类显示逻辑
        if (record.category === 'member-fees') {
          // 检查是否是新的格式(年份+分类)
          const yearMatch = subCat.match(/^(\d{4})(.+)$/);
          if (yearMatch) {
            const [, year, category] = yearMatch;
            return (
              <Tag color="blue">
                {year}年{category}
              </Tag>
            );
          }
          
          // 兼容旧格式
          const memberFeeConfig: Record<string, { color: string; text: string }> = {
            'official-member': { color: 'blue', text: '官方会员' },
            'associate-member': { color: 'cyan', text: '准会员' },
            'honorary-member': { color: 'purple', text: '荣誉会员' },
            'visiting-member': { color: 'geekblue', text: '访问会员' },
            '新会员费': { color: 'green', text: '新会员费' },
            '续会费': { color: 'orange', text: '续会费' },
            '校友会': { color: 'purple', text: '校友会' },
            '拜访会员': { color: 'cyan', text: '拜访会员' },
          };
          
          if (memberFeeConfig[subCat]) {
            const config = memberFeeConfig[subCat];
            return <Tag color={config.color}>{config.text}</Tag>;
          }
          
          // 直接显示
          return <Tag color="blue">{subCat}</Tag>;
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
      width: 60,
      render: (status: TransactionStatus) => {
        const statusConfig: Record<TransactionStatus, { color: string; text: string }> = {
          pending: { color: 'warning', text: '待核对' },
          completed: { color: 'success', text: '已核对' },
        };
        
        // Safe guard against undefined or invalid status
        const config = statusConfig[status] || { color: 'default', text: status || '未知' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, record) => {
        const isChild = record.parentTransactionId;
        const isParent = record.isSplit;
        const isVirtual = record.isVirtual;
        
        return (
          <Space size="small">
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
                <Tooltip title={isCalculated ? '实时计算余额' : '初始余额(未计算)'}>
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
              placeholder="模糊搜索：主描述、副描述、二次分类、金额、付款人、备注、收据号、发票号、交易类型..."
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
              onChange={(value) => {
                setCategoryFilter(value);
                if (value === 'all') {
                  setSubCategoryFilter('all'); // 重置二次分类筛选
                }
              }}
            >
              <Option value="all">所有类别</Option>
              <Option value="member-fees">会员费用</Option>
              <Option value="event-finance">活动财务</Option>
              <Option value="general-accounts">日常账户</Option>
              <Option value="uncategorized">未分类</Option>
            </Select>

            {/* 🆕 二次分类筛选下拉框 */}
            {categoryFilter !== 'all' && (
              <Select
                style={{ width: 180 }}
                placeholder="二次分类"
                value={subCategoryFilter}
                onChange={setSubCategoryFilter}
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label || option?.value;
                  return String(label).toLowerCase().includes(input.toLowerCase());
                }}
              >
                <Option value="all">全部二次分类</Option>
                {/* 🆕 未分类选项 */}
                {availableSubCategories.length > 0 && (
                  <Option value="uncategorized">未分类</Option>
                )}
                {/* 🆕 动态生成的其他二次分类选项 */}
                {availableSubCategories.map(subCategory => (
                  <Option key={subCategory} value={subCategory}>
                    {subCategory}
                  </Option>
                ))}
              </Select>
            )}

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
            // 只选择非虚拟交易(排除子交易)
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
                          <Radio.Button value="fiscal">财年 (基于配置)</Radio.Button>
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
                                ? (() => {
                                    try {
                                      const fiscalPeriod = smartFiscalYearService.detectFiscalYearPeriod(parseInt(treeSelectedYear));
                                      return `${fiscalPeriod.startDate} 至 ${fiscalPeriod.endDate}`;
                                    } catch (error) {
                                      return `${treeSelectedYear}-10-01 至 ${parseInt(treeSelectedYear) + 1}-09-30`;
                                    }
                                  })()
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
                      <Table
                        columns={treeTableColumns}
                        dataSource={treeTableData}
                        pagination={false}
                        size="small"
                        bordered
                        style={{ fontSize: 14 }}
                        rowKey="key"
                        showHeader={true}
                        scroll={{ x: 'max-content' }}
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
              {/* 🆕 统一银行账户选择 */}
              <div>
                <span style={{ color: 'red', marginRight: 8 }}>*</span>
                <span style={{ marginRight: 8 }}>银行账户：</span>
                <Select
                  value={selectedBankAccountId}
                  onChange={setSelectedBankAccountId}
                  style={{ width: 200 }}
                  placeholder="请选择银行账户"
                  status={!selectedBankAccountId ? 'error' : ''}
                >
                  {bankAccounts.map(account => (
                    <Option key={account.id} value={account.id}>
                      {account.accountName}
                    </Option>
                  ))}
                </Select>
              </div>
              
              <div style={{ color: '#666', fontSize: '12px' }}>
                💡 提示：可直接粘贴Excel表格数据(格式：描述 ｜ 付款人/收款人 ｜ 金额 ｜ 日期)，或手动添加行
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
                title: <span style={{ color: 'red' }}>主描述 *</span>,
                dataIndex: 'mainDescription',
                width: 180,
                render: (text, record) => (
                  <Input
                    value={text}
                    onChange={(e) => handleBulkDataChange(record.key, 'mainDescription', e.target.value)}
                    placeholder="主描述"
                    status={!text ? 'error' : ''}
                  />
                ),
              },
              {
                title: '副描述',
                dataIndex: 'subDescription',
                width: 120,
                render: (text, record) => (
                  <Input
                    value={text}
                    onChange={(e) => handleBulkDataChange(record.key, 'subDescription', e.target.value)}
                    placeholder="副描述"
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
          selectedTransactions={(filteredTransactions.length > 0 ? filteredTransactions : transactions).filter(t => selectedRowKeys.includes(t.id))}
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

