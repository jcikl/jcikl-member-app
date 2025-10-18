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
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  DownloadOutlined,
  ExportOutlined,
  ScissorOutlined,
  TagOutlined,
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
import { useNavigate } from 'react-router-dom';
import { getAllBankAccounts } from '../../services/bankAccountService';
import type { Transaction, TransactionFormData, TransactionStatus, BankAccount } from '../../types';
import './styles.css';

const { Search } = Input;
const { Option } = Select;

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
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [accountTransactionCounts, setAccountTransactionCounts] = useState<Record<string, number>>({});
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splittingTransaction, setSplittingTransaction] = useState<Transaction | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); // 多选行
  const [batchSplitModalVisible, setBatchSplitModalVisible] = useState(false);
  const [batchCategoryModalVisible, setBatchCategoryModalVisible] = useState(false);
  
  // 🎯 累计余额相关状态
  const [balanceMap, setBalanceMap] = useState<Map<string, number>>(new Map());
  const [sortBy] = useState<'transactionDate'>('transactionDate'); // 当前排序字段
  const [sortOrder] = useState<'asc' | 'desc'>('desc'); // 当前排序顺序
  
  // 🚀 性能优化：缓存全局交易列表
  const [cachedTransactions, setCachedTransactions] = useState<Transaction[]>([]);
  const [cacheKey, setCacheKey] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  
  // 💰 存储各账户的当前余额（实时计算）
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    loadBankAccounts();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [currentPage, pageSize, searchText, categoryFilter, activeTabKey]);
  
  useEffect(() => {
    // 当切换标签页时，重置到第一页
    setCurrentPage(1);
  }, [activeTabKey]);

  const loadBankAccounts = async () => {
    try {
      console.log('🏦 [loadBankAccounts] Loading bank accounts...');
      console.log('📁 [loadBankAccounts] Collection constant:', {
        name: 'GLOBAL_COLLECTIONS.BANK_ACCOUNTS',
        value: 'bankAccounts',
      });
      
      const accounts = await getAllBankAccounts('active');
      
      console.log('✅ [loadBankAccounts] Loaded accounts:', {
        count: accounts.length,
        accounts: accounts.map(a => ({
          id: a.id,
          accountName: a.accountName,
          status: a.status,
          isDefault: a.isDefault,
        })),
      });
      
      setBankAccounts(accounts);
      
      // 加载完账户后，更新交易数量
      updateAccountTransactionCounts();
    } catch (error: any) {
      console.error('❌ [loadBankAccounts] Failed to load bank accounts:', error);
      console.error('❌ [loadBankAccounts] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
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
      console.log('📊 [updateAccountTransactionCounts] Updated counts:', counts);
    } catch (error: any) {
      console.error('❌ [updateAccountTransactionCounts] Failed:', error);
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
        category: values.category,
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

  const handleUnsplit = (id: string) => {
    if (!user) return;

    Modal.confirm({
      title: '确认撤销拆分',
      content: '撤销后将删除所有子交易，恢复原交易状态。此操作无法撤销。',
      okText: '确认撤销',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await unsplitTransaction(id, user.id);
          message.success('已撤销拆分');
          clearBalanceCache(); // 清空余额缓存
          await loadTransactions();
          await updateAccountTransactionCounts();
        } catch (error: any) {
          message.error(error.message || '撤销失败');
        }
      },
    });
  };

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

  const handleBatchSetCategoryOk = async (category: string, subCategory?: string) => {
    if (!user) return;

    try {
      const result = await batchSetCategory(
        selectedRowKeys as string[],
        category,
        user.id
      );

      // 如选择了二次分类，则追加一次批量更新二次分类
      if (subCategory) {
        await Promise.all(
          (selectedRowKeys as string[]).map(id =>
            updateTransaction(id, { subCategory }, user.id)
          )
        );
      }

      if (result.successCount > 0) {
        message.success(`成功设置 ${result.successCount} 条交易的类别`);
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

  const columns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 80,
      sorter: true,
      render: (date: string) => globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '描述',
      dataIndex: 'mainDescription',
      key: 'mainDescription',
      width: 250,
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
      width: 100,
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
      width: 120,
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
      width: 120,
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
      dataIndex: 'subCategory',
      key: 'subCategory',
      width: 150,
      render: (subCat: string, record: Transaction) => {
        // 二次分类配置（支持多种类别）
        const subCategoryConfig: Record<string, { color: string; text: string }> = {
          // 会员费二次分类
          'official-member': { color: 'blue', text: '官方会员' },
          'associate-member': { color: 'cyan', text: '准会员' },
          'honorary-member': { color: 'purple', text: '荣誉会员' },
          'visiting-member': { color: 'geekblue', text: '访问会员' },
          
          // 活动财务二次分类（动态，显示活动名称）
          // 日常账户二次分类
          'donations': { color: 'blue', text: '捐赠' },
          'sponsorships': { color: 'green', text: '赞助' },
          'investments': { color: 'purple', text: '投资回报' },
          'grants': { color: 'cyan', text: '拨款' },
          'merchandise': { color: 'geekblue', text: '商品销售' },
          'other-income': { color: 'default', text: '其他收入' },
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
        
        // 如果是活动财务，subCategory 可能是活动名称
        if (record.category === 'event-finance' && !subCategoryConfig[subCat]) {
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
        
        const config = subCategoryConfig[subCat] || { color: 'default', text: subCat };
        return <Tag color={config.color}>{config.text}</Tag>;
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
            <Tooltip title="查看">
              <Button type="link" size="small" icon={<EyeOutlined />} />
            </Tooltip>
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
            {!isChild && !isParent && !isVirtual && (
              <Tooltip title="拆分交易">
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleSplit(record)}
                  style={{ color: '#fa8c16' }}
                >
                  拆分
                </Button>
              </Tooltip>
            )}
            {isParent && (
              <Tooltip title="撤销拆分">
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleUnsplit(record.id)}
                  style={{ color: '#ff4d4f' }}
                >
                  撤销
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

        {/* 银行账户标签页 */}
        <Card style={{ marginBottom: 24 }}>
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
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <Search
              placeholder="模糊搜索：描述、金额、付款人、备注..."
              onSearch={setSearchText}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 400 }}
              allowClear
              enterButton={<SearchOutlined />}
            />

            <Select
              style={{ width: 150 }}
              placeholder="类别"
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              <Option value="all">所有类别</Option>
              <Option value="member-fees">会员费</Option>
              <Option value="event-income">活动收入</Option>
              <Option value="donations">捐赠</Option>
              <Option value="sponsorships">赞助</Option>
              <Option value="utilities">水电费</Option>
              <Option value="rent">租金</Option>
              <Option value="supplies">办公用品</Option>
              <Option value="salaries">工资</Option>
              <Option value="unallocated">未分配</Option>
              <Option value="other">其他</Option>
            </Select>

            <Button icon={<FilterOutlined />}>高级筛选</Button>
            <Button icon={<DownloadOutlined />}>导出报表</Button>
            <div className="ml-auto">
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新交易
              </Button>
            </div>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card>
          <Table
            {...tableConfig}
            columns={columns}
            dataSource={transactions}
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
              total,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size || 20);
                setSelectedRowKeys([]); // 切换页面时清空选择
              },
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1350 }}
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

        {/* Create/Edit Transaction Modal */}
        <Modal
          title={editingTransaction ? '编辑交易' : '创建新交易'}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
            setEditingTransaction(null);
          }}
          width={700}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="银行账户"
              name="bankAccountId"
              rules={[{ required: true, message: '请选择银行账户' }]}
            >
              <Select placeholder="选择银行账户">
                {bankAccounts.map(acc => (
                  <Option key={acc.id} value={acc.id}>
                    {acc.accountName} ({acc.bankName})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="交易日期"
              name="transactionDate"
              rules={[{ required: true, message: '请选择交易日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="交易类型"
              name="transactionType"
              rules={[{ required: true, message: '请选择交易类型' }]}
            >
              <Radio.Group>
                <Radio value="income">收入</Radio>
                <Radio value="expense">支出</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              label="主要描述"
              name="mainDescription"
              rules={[{ required: true, message: '请输入交易描述' }]}
            >
              <Input placeholder="例如: 会员费 - 张三" />
            </Form.Item>

            <Form.Item label="次要描述" name="subDescription">
              <Input placeholder="可选的额外说明" />
            </Form.Item>

            <Form.Item
              label="金额"
              name="amount"
              rules={[
                { required: true, message: '请输入金额' },
                { type: 'number', min: 0.01, message: '金额必须大于0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="RM"
                precision={2}
                min={0.01}
              />
            </Form.Item>

            <Form.Item label="付款人/收款人" name="payerPayee">
              <Input placeholder="例如: 会员姓名或供应商" />
            </Form.Item>

            <Form.Item 
              label="主要类别" 
              name="category"
              rules={[{ required: true, message: '请选择主要类别' }]}
              tooltip="选择主要类别后，可在对应页面进行二次分类"
            >
              <Select placeholder="选择主要类别">
                <Option value="member-fees">
                  <Space>
                    <span>会员费</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>→ 在会员费页面二次分类</span>
                  </Space>
                </Option>
                <Option value="event-finance">
                  <Space>
                    <span>活动财务</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>→ 在活动财务页面二次分类</span>
                  </Space>
                </Option>
                <Option value="general-accounts">
                  <Space>
                    <span>日常账户</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>→ 在日常账户页面二次分类</span>
                  </Space>
                </Option>
              </Select>
            </Form.Item>

            <Form.Item label="付款方式" name="paymentMethod">
              <Select placeholder="选择付款方式" allowClear>
                <Option value="cash">现金</Option>
                <Option value="bank_transfer">银行转账</Option>
                <Option value="credit_card">信用卡</Option>
                <Option value="cheque">支票</Option>
                <Option value="online_payment">在线支付</Option>
                <Option value="other">其他</Option>
              </Select>
            </Form.Item>

            <Form.Item label="备注" name="notes">
              <Input.TextArea rows={3} placeholder="可选的额外备注" />
            </Form.Item>
          </Form>
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
          selectedCount={selectedRowKeys.length}
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
      </div>
    </ErrorBoundary>
  );
};

export default TransactionManagementPage;

