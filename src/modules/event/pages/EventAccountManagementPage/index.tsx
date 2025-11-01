/**
 * Event Account Management Page
 * 活动账户管理页面
 * 
 * 支持活动财务追踪、收入支出管理、财务预测
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Select,
  Space,
  message,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  DatePicker,
  Radio,
  InputNumber,
  Alert,
  Input,
  Tabs,
  Tag,
  List,
  Divider,
} from 'antd';
import {
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ActivityFinancialPlan from '../../components/ActivityFinancialPlan';
import BankTransactionList from '../../components/BankTransactionList';
import AccountConsolidation from '../../components/AccountConsolidation';
import {
  getOrCreateEventAccount,
  addEventAccountTransaction,
  updateEventAccountBudget,
  getEventAccountTransactions,
  deleteEventAccountTransaction,
  updateEventAccountTransaction,
  clearEventAccountTransactionReconciliation,
  getAllUnreconciledEventAccountTransactions,
} from '../../services/eventAccountService';

// 创建service对象以访问方法
import * as eventAccountService from '../../services/eventAccountService';
import { getEvents } from '../../services/eventService';
import { 
  getEventAccountPlans, 
  addEventAccountPlan,
  updateEventAccountPlan,
  deleteEventAccountPlan,
  batchDeleteEventAccountPlans,
} from '../../services/eventAccountPlanService';
import { getTransactionsByEventId } from '@/modules/finance/services/transactionService';
import { getAllBankAccounts } from '@/modules/finance/services/bankAccountService';
import type { BankAccount } from '@/modules/finance/types';
import type {
  EventAccount,
  Event,
  EventAccountTransaction,
} from '../../types';
import {
  EVENT_INCOME_CATEGORIES,
  EVENT_EXPENSE_CATEGORIES,
} from '../../types';
import type { FinancialPlanItem } from '../../components/ActivityFinancialPlan';
import type { BankTransaction } from '../../components/BankTransactionList';
import type { ConsolidationData, CategoryComparison } from '../../components/AccountConsolidation';
import './styles.css';

const { Option } = Select;


const EventAccountManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [account, setAccount] = useState<EventAccount | null>(null);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [budgetForm] = Form.useForm();
  
  // 新增：财务计划相关状态
  const [planItems, setPlanItems] = useState<FinancialPlanItem[]>([]);
  const [eventTransactions, setEventTransactions] = useState<EventAccountTransaction[]>([]);
  const [allUnreconciledEventTransactions, setAllUnreconciledEventTransactions] = useState<EventAccountTransaction[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [consolidationData, setConsolidationData] = useState<ConsolidationData | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  // 🆕 对账状态与操作
  const [reconciliationMap, setReconciliationMap] = useState<Record<string, 'matched' | 'unmatched'>>({});
  const [reconcileModalVisible, setReconcileModalVisible] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [availableBankTxns, setAvailableBankTxns] = useState<BankTransaction[]>([]);
  const [activeInnerTab, setActiveInnerTab] = useState<string>('financial-plan');
  const [activeTab, setActiveTab] = useState<string>('overview'); // 🆕 顶层标签页状态
  
  // 🆕 新增筛选状态
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedBoardMember, setSelectedBoardMember] = useState<string>('all');
  
  // 🆕 动态获取负责理事列表
  const boardMembers = React.useMemo(() => {
    const members = new Set<string>();
    events.forEach(event => {
      if (event.boardMember) {
        members.add(event.boardMember);
      }
      if (event.responsibleOfficer?.name) {
        members.add(event.responsibleOfficer.name);
      }
    });
    return Array.from(members).sort();
  }, [events]);
  
  // 🆕 过滤后的活动列表
  const filteredEvents = React.useMemo(() => {
    return events.filter(event => {
      // 年份筛选
      if (selectedYear !== 'all') {
        const eventYear = new Date(event.startDate).getFullYear().toString();
        if (eventYear !== selectedYear) {
          return false;
        }
      }
      
      // 负责理事筛选
      if (selectedBoardMember !== 'all') {
        const matchBoardMember = event.boardMember === selectedBoardMember;
        const matchResponsibleOfficer = event.responsibleOfficer?.name === selectedBoardMember;
        if (!matchBoardMember && !matchResponsibleOfficer) {
          return false;
        }
      }
      
      return true;
    });
  }, [events, selectedYear, selectedBoardMember]);

  useEffect(() => {
    loadEvents();
    loadBankAccounts();
  }, []);
  
  const loadBankAccounts = async () => {
    try {
      const accounts = await getAllBankAccounts();
      setBankAccounts(accounts);
    } catch (error) {
      console.error('❌ Failed to load bank accounts:', error);
    }
  };

  // 🆕 加载所有未核对的活动账目记录
  const loadAllUnreconciledEventTransactions = async () => {
    try {
      console.log('🔄 [loadAllUnreconciledEventTransactions] Loading pending event transactions across all accounts...');
      const txns = await getAllUnreconciledEventAccountTransactions();
      console.log('✅ [loadAllUnreconciledEventTransactions] Loaded:', txns.length);
      setAllUnreconciledEventTransactions(txns);
    } catch (error) {
      message.error('加载总活动账目记录失败');
      console.error('❌ [loadAllUnreconciledEventTransactions] Error:', error);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadEventAccount();
    }
  }, [selectedEventId]);

  // 加载财务计划和交易记录
  useEffect(() => {
    if (account && selectedEventId) {
      loadPlans();
      loadEventTransactions();
      loadBankTransactions();
    }
  }, [account, selectedEventId]);

  // 自动计算对比数据
  useEffect(() => {
    if (planItems.length > 0 || bankTransactions.length > 0) {
      calculateConsolidation();
    }
  }, [planItems, bankTransactions]);

  const loadEvents = async () => {
    try {
      const result = await getEvents({ 
        page: 1, 
        limit: 1000,
        // Remove default sorting to avoid index issues
      });
      
      const activeEvents = result.data.filter((e: Event) => e.status !== 'Cancelled');
      setEvents(activeEvents);
      
      if (activeEvents.length > 0) {
        setSelectedEventId(activeEvents[0].id);
      } else {
        message.warning('暂无活动数据，请先创建活动');
      }
    } catch (error: any) {
      console.error('❌ Failed to load events:', error);
      message.error(`加载活动列表失败: ${error.message || '未知错误'}`);
      globalSystemService.log(
        'error',
        'Failed to load events',
        'EventAccountManagementPage.loadEvents',
        { error: error.message }
      );
    }
  };

  const loadEventAccount = async () => {
    if (!user || !selectedEventId) return;

    try {
      setLoading(true);

      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (!selectedEvent) return;

      const accountData = await getOrCreateEventAccount(
        selectedEventId,
        selectedEvent.name,
        user.id
      );

      setAccount(accountData);

    } catch (error: any) {
      message.error('加载活动账户失败');
      globalSystemService.log(
        'error',
        'Failed to load event account',
        'EventAccountManagementPage.loadEventAccount',
        { error: error.message, eventId: selectedEventId }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (values: any) => {
    if (!user || !account) return;

    try {
      const transactionDate = values.transactionDate 
        ? values.transactionDate.toDate() 
        : new Date();

      await addEventAccountTransaction(
        account.id,
        {
          transactionDate,
          transactionType: values.transactionType,
          category: values.category,
          description: values.description,
          amount: values.amount,
          payerPayee: values.payerPayee,
          paymentMethod: values.paymentMethod,
          notes: values.notes,
        },
        user.id
      );

      message.success('交易已添加');
      setTransactionModalVisible(false);
      form.resetFields();
      loadEventAccount();
    } catch (error: any) {
      message.error('添加交易失败');
    }
  };

  const handleUpdateBudget = async (values: any) => {
    if (!user || !account) return;

    try {
      await updateEventAccountBudget(
        account.id,
        {
          budgetIncome: values.budgetIncome,
          budgetExpense: values.budgetExpense,
          targetProfit: values.targetProfit,
          notes: values.notes,
        },
        user.id
      );

      message.success('预算已更新');
      setBudgetModalVisible(false);
      loadEventAccount();
    } catch (error: any) {
      message.error('更新预算失败');
    }
  };


  // 加载财务计划
  const loadPlans = async () => {
    if (!account) return;
    
    try {
      setPlanLoading(true);
      const plans = await getEventAccountPlans(account.id);
      setPlanItems(plans);
    } catch (error) {
      message.error('加载财务计划失败');
      console.error(error);
    } finally {
      setPlanLoading(false);
    }
  };

  // 加载活动账目记录
  const loadEventTransactions = async () => {
    if (!account) return;
    
    try {
      console.log('🔄 [loadEventTransactions] Loading event transactions...', { accountId: account.id });
      setPlanLoading(true);
      const transactions = await getEventAccountTransactions(account.id);
      console.log('✅ [loadEventTransactions] Loaded transactions:', {
        count: transactions.length,
        transactions: transactions.map(tx => ({
          id: tx.id,
          description: tx.description,
          reconciledBankTransactionId: tx.reconciledBankTransactionId,
          transactionDate: tx.transactionDate,
          amount: tx.amount,
          status: tx.status
        }))
      });
      
      // 🆕 详细记录每个事务的reconciledBankTransactionId
      const reconciledCount = transactions.filter(tx => tx.reconciledBankTransactionId).length;
      console.log(`📊 [loadEventTransactions] Found ${reconciledCount} reconciled transactions out of ${transactions.length} total`);
      
      console.log('💾 [loadEventTransactions] Setting eventTransactions state...');
      setEventTransactions(transactions);
      console.log('✅ [loadEventTransactions] State updated');
      
      // 🆕 等待一个tick后再检查状态
      setTimeout(() => {
        console.log('🔍 [loadEventTransactions] Checking if state was updated...');
      }, 100);
    } catch (error) {
      message.error('加载活动账目记录失败');
      console.error('❌ [loadEventTransactions] Error:', error);
    } finally {
      setPlanLoading(false);
    }
  };

  // 🆕 将 EventAccountTransaction 转换为 FinancialPlanItem (带status)
  const convertedEventTransactions = useMemo(() => {
    // 按 状态 > 日期 > 描述 排序
    const statusOrder: Record<string, number> = { pending: 0, completed: 1, cancelled: 2 };
    const sorted = [...eventTransactions].sort((a, b) => {
      const sa = statusOrder[a.status as string] ?? 99;
      const sb = statusOrder[b.status as string] ?? 99;
      if (sa !== sb) return sa - sb;
      const da = (a.transactionDate || '');
      const db = (b.transactionDate || '');
      if (da !== db) return db.localeCompare(da); // 日期：新 → 旧
      const ta = (a.description || '');
      const tb = (b.description || '');
      return ta.localeCompare(tb, 'zh-CN');
    });

    return sorted.map(txn => ({
      id: txn.id,
      type: txn.transactionType === 'income' ? 'income' as const : 'expense' as const,
      category: txn.category,
      description: txn.description,
      remark: txn.notes,
      amount: txn.amount,
      status: txn.status, // 🆕 传递status字段
      transactionDate: txn.transactionDate, // 🆕 传递transactionDate字段
      createdAt: txn.createdAt,
      updatedAt: txn.updatedAt,
      createdBy: txn.createdBy,
      updatedBy: undefined,
    }));
  }, [eventTransactions]);

  // 🆕 转换：全部未核对的活动账目记录 → FinancialPlanItem
  const convertedAllUnreconciledEventTransactions = useMemo(() => {
    const sorted = [...allUnreconciledEventTransactions].sort((a, b) => {
      const da = (a.transactionDate || '');
      const db = (b.transactionDate || '');
      if (da !== db) return db.localeCompare(da);
      const ta = (a.description || '');
      const tb = (b.description || '');
      return ta.localeCompare(tb, 'zh-CN');
    });
    return sorted.map(txn => ({
      id: txn.id,
      type: txn.transactionType === 'income' ? 'income' as const : 'expense' as const,
      category: txn.category,
      description: txn.description,
      remark: txn.notes,
      amount: txn.amount,
      status: txn.status,
      transactionDate: txn.transactionDate,
      createdAt: txn.createdAt,
      updatedAt: txn.updatedAt,
      createdBy: txn.createdBy,
      updatedBy: undefined,
    }));
  }, [allUnreconciledEventTransactions]);

  // 🆕 匹配的银行交易记录映射（用于显示已核对的银行交易详情）
  const matchedBankTransactions = useMemo(() => {
    if (!eventTransactions || !bankTransactions) return {};
    
    const map: Record<string, {
      id: string;
      transactionDate: string;
      description: string;
      amount: number;
      bankAccount?: string;
      bankAccountName?: string;
    }> = {};
    
    eventTransactions.forEach(tx => {
      if (tx.reconciledBankTransactionId) {
        // 查找匹配的银行交易
        const matchedBankTx = bankTransactions.find(bt => bt.id === tx.reconciledBankTransactionId);
        if (matchedBankTx) {
          map[tx.id] = {
            id: matchedBankTx.id,
            transactionDate: matchedBankTx.transactionDate,
            description: matchedBankTx.description,
            amount: matchedBankTx.amount,
            bankAccount: matchedBankTx.bankAccount,
            bankAccountName: matchedBankTx.bankAccountName,
          };
        }
      }
    });
    
    console.log('✅ [matchedBankTransactions] Computed mapping:', {
      totalEventTxs: eventTransactions.length,
      totalBankTxs: bankTransactions.length,
      matchedCount: Object.keys(map).length,
    });
    
    return map;
  }, [eventTransactions, bankTransactions]);

  // 加载银行交易记录
  const loadBankTransactions = async () => {
    if (!selectedEventId) {
      return;
    }
    
    try {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      const financialAccountId = selectedEvent?.financialAccount;
      
      if (!financialAccountId) {
        setBankTransactions([]);
        return;
      }
      
      const transactions = await getTransactionsByEventId(financialAccountId);
      
      if (transactions.length === 0) {
        setBankTransactions([]);
        return;
      }
      
      // 基于已加载的活动账目记录构建：bankTxId -> eventCategory 的映射
      const bankIdToEventCategory = new Map<string, string>();
      eventTransactions.forEach(etx => {
        if (etx.reconciledBankTransactionId) {
          bankIdToEventCategory.set(etx.reconciledBankTransactionId, etx.category);
        }
      });
      
      // 转换为 BankTransaction 格式，并按照活动账目记录的类别进行归类
      const bankTxns: BankTransaction[] = transactions.map(txn => {
        const bankAccount = bankAccounts.find(acc => acc.id === txn.bankAccountId);
        const reconciledCategory = bankIdToEventCategory.get(txn.id);
        const resolvedCategory = reconciledCategory || txn.confirmedCategory || txn.autoMatchedCategory || txn.category;
        
        return {
          id: txn.id,
          transactionDate: txn.transactionDate,
          transactionNumber: txn.transactionNumber,
          transactionType: txn.transactionType as 'income' | 'expense',
          description: txn.subDescription ? `${txn.mainDescription} ${txn.subDescription}` : txn.mainDescription,
          amount: txn.amount,
          bankAccount: txn.bankAccountId,
          bankAccountName: bankAccount?.accountName,
          bankName: bankAccount?.bankName,
          accountNumber: bankAccount?.accountNumber,
          status: txn.status === 'completed' ? 'verified' : 'pending',
          category: resolvedCategory,
          payerPayee: txn.payerPayee,
          paymentMethod: txn.paymentMethod,
          receiptNumber: txn.receiptNumber,
          invoiceNumber: txn.invoiceNumber,
          createdAt: txn.createdAt,
        };
      });
      
      setBankTransactions(bankTxns);
    } catch (error) {
      console.error('❌ [loadBankTransactions] Failed to load bank transactions:', error);
      setBankTransactions([]);
    }
  };

  // 🆕 计算对账映射：根据金额与日期的近似匹配（同日，金额相等）
  useEffect(() => {
    console.log('🔍 [ReconciliationMap useEffect] ===== START CALCULATION =====');
    console.log(`📊 [ReconciliationMap useEffect] eventTransactions.length = ${eventTransactions?.length || 0}`);
    console.log(`📊 [ReconciliationMap useEffect] bankTransactions.length = ${bankTransactions?.length || 0}`);
    
    if (!eventTransactions || eventTransactions.length === 0) {
      console.log('⚠️ [ReconciliationMap useEffect] No event transactions, clearing map');
      setReconciliationMap({});
      console.log('🔍 [ReconciliationMap useEffect] ===== END CALCULATION (EMPTY) =====');
      return;
    }
    const map: Record<string, 'matched' | 'unmatched'> = {};
    
    // 🆕 首先检查是否已经有reconciledBankTransactionId
    let hasReconciledTransactions = 0;
    eventTransactions.forEach(tx => {
      if (tx.reconciledBankTransactionId) {
        console.log('✅ [ReconciliationMap useEffect] Found reconciled transaction:', { 
          txId: tx.id, 
          bankTxId: tx.reconciledBankTransactionId,
          description: tx.description
        });
        map[tx.id] = 'matched';
        hasReconciledTransactions++;
      }
    });
    console.log(`📊 [ReconciliationMap useEffect] Found ${hasReconciledTransactions} already-reconciled transactions`);
    
    // 将银行记录按日期+金额建立索引
    const bankIndex = new Map<string, BankTransaction[]>();
    bankTransactions.forEach(bt => {
      const dateKey = (bt.transactionDate || '').slice(0, 10);
      const amtKey = bt.amount.toFixed(2);
      const key = `${dateKey}|${amtKey}|${bt.transactionType}`;
      const arr = bankIndex.get(key) || [];
      arr.push(bt);
      bankIndex.set(key, arr);
    });
    
    // 遍历活动账目记录，尝试匹配（跳过已核对的记录）
    eventTransactions.forEach(tx => {
      // 🆕 如果已经手动核对过，跳过自动匹配
      if (tx.reconciledBankTransactionId) {
        return;
      }
      
      const dateKey = (tx.transactionDate || '').slice(0, 10);
      const amtKey = tx.amount.toFixed(2);
      const typeKey = tx.transactionType; // income/expense
      const key = `${dateKey}|${amtKey}|${typeKey}`;
      const candidates = bankIndex.get(key);
      if (candidates && candidates.length > 0) {
        console.log('🎯 [ReconciliationMap useEffect] Auto-matched transaction:', { txId: tx.id, key });
        map[tx.id] = 'matched';
      } else {
        map[tx.id] = 'unmatched';
      }
    });
    
    const matchedCount = Object.values(map).filter(v => v === 'matched').length;
    const unmatchedCount = Object.values(map).filter(v => v === 'unmatched').length;
    console.log(`✅ [ReconciliationMap useEffect] Reconciliation map updated: ${matchedCount} matched, ${unmatchedCount} unmatched`);
    console.log('📋 [ReconciliationMap useEffect] Full map:', map);
    
    console.log('💾 [ReconciliationMap useEffect] Calling setReconciliationMap...');
    setReconciliationMap(map);
    console.log('🔍 [ReconciliationMap useEffect] ===== END CALCULATION =====');
  }, [eventTransactions, bankTransactions]);

  // 计算对比数据
  const calculateConsolidation = () => {
    if (planItems.length === 0 && bankTransactions.length === 0) {
      setConsolidationData(null);
      return;
    }
    
    // 按类别分组计算
    const incomeComparison = calculateCategoryComparison(
      planItems.filter(p => p.type === 'income'),
      bankTransactions.filter(t => t.transactionType === 'income')
    );
    
    const expenseComparison = calculateCategoryComparison(
      planItems.filter(p => p.type === 'expense'),
      bankTransactions.filter(t => t.transactionType === 'expense')
    );
    
    const totalIncomeForecast = planItems
      .filter(p => p.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0);
    
    // 🆕 统计：银行交易合计与笔数（收入）
    const bankIncomeTotal = bankTransactions
      .filter(t => t.transactionType === 'income')
      .reduce((sum, txn) => sum + txn.amount, 0);
    const bankIncomeCount = bankTransactions.filter(t => t.transactionType === 'income').length;
    
    const totalExpenseForecast = planItems
      .filter(p => p.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);
    
    // 🆕 统计：银行交易合计与笔数（支出）
    const bankExpenseTotal = bankTransactions
      .filter(t => t.transactionType === 'expense')
      .reduce((sum, txn) => sum + txn.amount, 0);
    const bankExpenseCount = bankTransactions.filter(t => t.transactionType === 'expense').length;

    // 🆕 统计：活动账目记录实际（pending/completed），区分收入/支出
    const validEventTx = eventTransactions.filter(t => t.status === 'pending' || t.status === 'completed');
    const eventIncomeTotal = validEventTx.filter(t => t.transactionType === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const eventExpenseTotal = validEventTx.filter(t => t.transactionType === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    // 🆕 未核对（无 reconciledBankTransactionId）统计
    const unreconciledEventTx = validEventTx.filter(t => !t.reconciledBankTransactionId);
    const eventIncomeUnreconciledTotal = unreconciledEventTx
      .filter(t => t.transactionType === 'income')
      .reduce((s, t) => s + (t.amount || 0), 0);
    const eventExpenseUnreconciledTotal = unreconciledEventTx
      .filter(t => t.transactionType === 'expense')
      .reduce((s, t) => s + (t.amount || 0), 0);
    const eventIncomeUnreconciledCount = unreconciledEventTx.filter(t => t.transactionType === 'income').length;
    const eventExpenseUnreconciledCount = unreconciledEventTx.filter(t => t.transactionType === 'expense').length;
    
    setConsolidationData({
      incomeComparison,
      expenseComparison,
      totalIncomeForecast,
      totalIncomeActual: eventIncomeTotal,
      totalExpenseForecast,
      totalExpenseActual: eventExpenseTotal,
      profitForecast: totalIncomeForecast - totalExpenseForecast,
      profitActual: eventIncomeTotal - eventExpenseTotal,
      bankIncomeTotal,
      bankExpenseTotal,
      bankIncomeCount,
      bankExpenseCount,
      eventIncomeTotal,
      eventExpenseTotal,
      eventIncomeUnreconciledTotal,
      eventExpenseUnreconciledTotal,
      eventIncomeUnreconciledCount,
      eventExpenseUnreconciledCount,
    });
  };

  // 按类别对比计算
  const calculateCategoryComparison = (
    planItems: FinancialPlanItem[],
    transactions: BankTransaction[]
  ): CategoryComparison[] => {
    const categories = Array.from(new Set([
      ...planItems.map(p => p.category),
      ...transactions.map(t => t.category).filter(Boolean) as string[],
    ]));
    
    return categories.map(category => {
      const forecast = planItems
        .filter(p => p.category === category)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const actual = transactions
        .filter(t => t.category === category)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const variance = actual - forecast;
      const percentage = forecast > 0 ? (actual / forecast) * 100 : 0;
      
      let status: 'completed' | 'partial' | 'pending' | 'exceeded';
      if (actual === 0) {
        status = 'pending';
      } else if (actual >= forecast) {
        status = 'exceeded';
      } else if (percentage >= 100) {
        status = 'completed';
      } else if (percentage >= 50) {
        status = 'partial';
      } else {
        status = 'pending';
      }
      
      return {
        category: category || 'uncategorized',
        categoryLabel: category || '未分类',
        forecast,
        actual,
        variance,
        percentage,
        status,
      };
    });
  };

  // CRUD Handlers for Financial Plans
  const handleAddPlan = async (item: Omit<FinancialPlanItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!account || !user) return;
    await addEventAccountPlan(account.id, item, user.id);
    await loadPlans();
  };

  // 🆕 CRUD Handlers for Event Account Transactions
  const handleAddEventTransaction = async (item: Omit<FinancialPlanItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!account || !user) return;
    
    // 转换 FinancialPlanItem 为 EventAccountTransaction 格式
    await addEventAccountTransaction(
      account.id,
      {
        transactionDate: item.transactionDate, // 🆕 允许undefined（不填日期）
        transactionType: item.type === 'income' ? 'income' : 'expense',
        category: item.category,
        description: item.description,
        amount: item.amount,
        notes: item.remark,
      },
      user.id
    );
    await loadEventTransactions();
  };

  const handleUpdatePlan = async (id: string, updates: Partial<FinancialPlanItem>) => {
    if (!user) return;
    await updateEventAccountPlan(id, updates, user.id);
    await loadPlans();
  };

  const handleDeletePlan = async (id: string | string[]) => {
    if (!user) return;
    
    try {
      if (Array.isArray(id)) {
        // 🚀 批量删除 - 使用优化的批量删除服务
        if (id.length === 0) return;
        await batchDeleteEventAccountPlans(id, user.id);
        message.success(`已批量删除 ${id.length} 个计划项目`);
      } else {
        // 单个删除
        await deleteEventAccountPlan(id, user.id);
      }
      await loadPlans();
    } catch (error) {
      message.error('删除失败');
      console.error(error);
    }
  };

  // 🆕 Event Account Transaction handlers
  const handleUpdateEventTransaction = async (id: string, updates: Partial<FinancialPlanItem>) => {
    // TODO: 实现更新活动账目记录的逻辑
    message.info('更新功能开发中...');
    await loadEventTransactions();
  };

  // 🆕 打开核对弹窗
  const handleOpenReconcile = (txId: string) => {
    setSelectedTxId(txId);
    const tx = eventTransactions.find(t => t.id === txId);
    if (tx) {
      // 🆕 收集所有已核对的银行交易ID
      const reconciledBankTxIds = new Set(
        eventTransactions
          .filter(t => t.reconciledBankTransactionId)
          .map(t => t.reconciledBankTransactionId!)
      );
      
      console.log('🔍 [handleOpenReconcile] Reconciled bank transaction IDs:', Array.from(reconciledBankTxIds));
      
      // 查找可匹配的银行交易（同类型 + 金额匹配 + 未被任何记录核对 + 未出现在当前页面已核对集合）
      const candidates = bankTransactions.filter(bt => {
        const isSameType = bt.transactionType === tx.transactionType;
        const isNotReconciledInPage = !reconciledBankTxIds.has(bt.id);
        // 约定：交易管理页 status 映射到这里为 'verified' 表示已核对（completed）
        const isGloballyPending = bt.status !== 'verified';
        // 金额匹配（两位小数比对）
        const isAmountMatch = Number((bt.amount ?? 0).toFixed(2)) === Number((tx.amount ?? 0).toFixed(2));
        
        const isCandidate = isSameType && isAmountMatch && isNotReconciledInPage && isGloballyPending;
        
        console.log('🎯 [handleOpenReconcile] Bank transaction:', {
          id: bt.id,
          type: bt.transactionType,
          isSameType,
          isAmountMatch,
          isNotReconciledInPage,
          isGloballyPending,
          isCandidate
        });
        
        return isCandidate;
      });
      
      console.log(`✅ [handleOpenReconcile] Found ${candidates.length} available bank transactions out of ${bankTransactions.length} total`);
      setAvailableBankTxns(candidates);
    }
    setReconcileModalVisible(true);
  };

  // 🆕 确认核对
  const handleConfirmReconcile = async (bankTxId: string) => {
    if (!user || !selectedTxId) {
      console.log('❌ [handleConfirmReconcile] Missing user or selectedTxId', { user: !!user, selectedTxId: !!selectedTxId });
      return;
    }
    
    try {
      console.log('🔧 [handleConfirmReconcile] Starting manual reconciliation...', { 
        txId: selectedTxId, 
        bankTxId 
      });
      
      // 🆕 调用service更新reconciledBankTransactionId和status
      await eventAccountService.updateEventAccountTransaction(
        selectedTxId,
        { reconciledBankTransactionId: bankTxId, status: 'completed' },
        user.id
      );
      
      console.log('✅ [handleConfirmReconcile] Manual reconciliation successful');
      message.success('核对成功');
      setReconcileModalVisible(false);
      setSelectedTxId('');
      
      console.log('🔄 [handleConfirmReconcile] Reloading event transactions and bank transactions...');
      await loadEventTransactions(); // 🔄 刷新活动账目记录（影响按钮状态）
      await loadBankTransactions();  // 🔄 刷新银行交易（按钮状态依赖matchedBankTransactions）
      console.log('✅ [handleConfirmReconcile] Reload completed');
    } catch (error) {
      console.error('❌ [handleConfirmReconcile] Manual reconciliation failed:', error);
      message.error('核对失败');
    }
  };

  // 🆕 取消核对
  const handleCancelReconcile = async (txId: string) => {
    if (!user) {
      console.log('❌ [handleCancelReconcile] Missing user');
      return;
    }
    
    try {
      console.log('🔧 [handleCancelReconcile] Starting cancel reconciliation...', { txId });
      
      // 🆕 调用service清除reconciledBankTransactionId (使用 deleteField)
      await clearEventAccountTransactionReconciliation(txId, user.id);
      
      console.log('✅ [handleCancelReconcile] Cancel reconciliation successful');
      message.info('已取消核对');
      
      console.log('🔄 [handleCancelReconcile] Reloading event transactions and bank transactions...');
      await loadEventTransactions(); // 🔄 刷新活动账目记录（影响按钮状态）
      await loadBankTransactions();  // 🔄 刷新银行交易（按钮状态依赖matchedBankTransactions）
      console.log('✅ [handleCancelReconcile] Reload completed');
      
      // 🆕 reconciliationMap 会自动通过 useEffect 重新计算（依赖 eventTransactions）
      // useEffect 会检测到 eventTransactions 变化，自动重新计算 reconciliationMap
      // 添加一个短暂延迟确保UI更新
      setTimeout(() => {
        console.log('✅ [handleCancelReconcile] UI refresh triggered');
      }, 100);
    } catch (error) {
      console.error('❌ [handleCancelReconcile] Cancel reconciliation failed:', error);
      message.error('取消核对失败');
    }
  };

  // 🆕 自动核对功能
  const handleAutoReconcile = async () => {
    if (!account || !user) {
      console.log('❌ [handleAutoReconcile] account or user not available', { account: !!account, user: !!user });
      return;
    }
    
    try {
      console.log('🔄 [handleAutoReconcile] Starting auto-reconciliation...');
      console.log('📊 [handleAutoReconcile] Total event transactions:', eventTransactions.length);
      console.log('💰 [handleAutoReconcile] Total bank transactions:', bankTransactions.length);
      
      let successCount = 0;
      let failCount = 0;
      const updatePromises: Promise<void>[] = [];

      // 🆕 已被核对的银行交易ID集合（禁止重复占用）
      const usedBankTxIds = new Set<string>(
        eventTransactions
          .filter(t => !!t.reconciledBankTransactionId)
          .map(t => t.reconciledBankTransactionId!)
      );
      
      // 遍历所有未核对的记录
      for (const tx of eventTransactions) {
        if (tx.reconciledBankTransactionId) {
          console.log('⏭️ [handleAutoReconcile] Skipping already reconciled transaction:', tx.id);
          continue; // 已核对，跳过
        }
        
        console.log('🔍 [handleAutoReconcile] Checking transaction:', {
          id: tx.id,
          date: tx.transactionDate,
          amount: tx.amount,
          type: tx.transactionType
        });
        
        // 查找匹配的银行交易
        const matchedBankTx = bankTransactions.find(bt => {
          const txDate = tx.transactionDate?.slice(0, 10);
          const btDate = bt.transactionDate?.slice(0, 10);
          const amountMatch = tx.amount.toFixed(2) === bt.amount.toFixed(2);
          const typeMatch = tx.transactionType === bt.transactionType;
          
          // 🆕 文本模糊匹配：基于关键词重叠（中英文与数字），提升准确度
          const normalize = (s?: string) => (s || '').toLowerCase();
          const splitWords = (s: string) => s
            .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, ' ')
            .split(' ')
            .map(w => w.trim())
            .filter(w => w.length >= 2);
          const hasKeywordOverlap = (a?: string, b?: string) => {
            const wa = new Set(splitWords(normalize(a)));
            const wb = new Set(splitWords(normalize(b)));
            for (const w of wa) {
              if (wb.has(w)) return true;
            }
            return false;
          };
          const textMatch = hasKeywordOverlap(tx.description, bt.description);
          
          console.log('🎯 [handleAutoReconcile] Matching attempt:', {
            txDate,
            btDate,
            dateMatch: txDate === btDate,
            txAmount: tx.amount.toFixed(2),
            btAmount: bt.amount.toFixed(2),
            amountMatch,
            typeMatch,
            textMatch,
          });
          
          // 🆕 限制：一个银行交易只能被一个活动账目记录核对
          const notUsed = !usedBankTxIds.has(bt.id);
          // 最终条件：日期 + 金额 + 类型 + 文本（至少有关键词重叠）
          return txDate === btDate && amountMatch && typeMatch && textMatch && notUsed;
        });
        
        if (matchedBankTx) {
          console.log('✅ [handleAutoReconcile] Match found!', {
            txId: tx.id,
            bankTxId: matchedBankTx.id
          });
          
          // 调用service更新reconciledBankTransactionId和status
          const updatePromise = eventAccountService.updateEventAccountTransaction(
            tx.id,
            { reconciledBankTransactionId: matchedBankTx.id, status: 'completed' },
            user.id
          );
          
          updatePromises.push(updatePromise);
          usedBankTxIds.add(matchedBankTx.id); // 🆕 立即占用，避免后续重复匹配
          successCount++;
        } else {
          console.log('❌ [handleAutoReconcile] No match found for transaction:', tx.id);
          failCount++;
        }
      }
      
      console.log('💾 [handleAutoReconcile] Applying updates...');
      console.log(`📝 [handleAutoReconcile] Total update promises: ${updatePromises.length}`);
      
      await Promise.all(updatePromises);
      
      console.log('✅ [handleAutoReconcile] All update promises resolved');
      console.log('✅ [handleAutoReconcile] Auto-reconciliation completed:', { successCount, failCount });
      
      message.success(`自动核对完成：成功 ${successCount} 条，未匹配 ${failCount} 条`);
      
      console.log('🔄 [handleAutoReconcile] Reloading event transactions and bank transactions...');
      console.log(`⏱️ [handleAutoReconcile] Before reload, eventTransactions.length = ${eventTransactions.length}`);
      
      await loadEventTransactions(); // 🔄 刷新活动账目记录
      await loadBankTransactions();  // 🔄 刷新银行交易（按钮状态依赖matchedBankTransactions）
      
      console.log('✅ [handleAutoReconcile] Reload completed');
      console.log(`⏱️ [handleAutoReconcile] After reload, eventTransactions should be updated`);
    } catch (error) {
      console.error('❌ [handleAutoReconcile] Error during auto-reconciliation:', error);
      message.error('自动核对失败');
    }
  };

  const handleDeleteEventTransaction = async (id: string | string[]) => {
    if (!user) return;
    
    try {
      if (Array.isArray(id)) {
        // 批量删除
        for (const transactionId of id) {
          await deleteEventAccountTransaction(transactionId, user.id);
        }
        message.success(`已删除 ${id.length} 条活动账目记录`);
      } else {
        // 单个删除
        await deleteEventAccountTransaction(id, user.id);
        message.success('活动账目记录已删除');
      }
      await loadEventTransactions();
    } catch (error) {
      message.error('删除失败');
      console.error(error);
    }
  };


  if (loading) {
    return <LoadingSpinner />;
  }

  if (!account) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="请选择活动"
          description="请从下拉列表中选择一个活动以查看其财务账户"
          type="info"
          showIcon
        />
      </div>
    );
  }

  // 旧的进度计算已移除（统计卡片已删除）

  // 🆕 渲染概览标签页内容
  const renderOverviewTab = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 对比统计卡片 */}
      {consolidationData && (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card size="small" className="comparison-stat-card">
              <Statistic
                title="📊 收入对比"
                value={consolidationData.totalIncomeActual}
                precision={2}
                prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                suffix="RM"
              />
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' as any }}>
                  <span style={{ minWidth: 72 }}>预测</span>
                  <span>RM {consolidationData.totalIncomeForecast.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', fontVariantNumeric: 'tabular-nums' as any, color: consolidationData.totalIncomeActual >= consolidationData.totalIncomeForecast ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
                  <span style={{ minWidth: 72 }}>差异</span>
                  <span>
                    {consolidationData.totalIncomeActual >= consolidationData.totalIncomeForecast ? '+' : ''}RM {(consolidationData.totalIncomeActual - consolidationData.totalIncomeForecast).toFixed(2)} {' '}
                    ({(consolidationData.totalIncomeForecast > 0 ? ((consolidationData.totalIncomeActual / consolidationData.totalIncomeForecast) * 100).toFixed(1) : '0.0')}%)
                  </span>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' as any }}>
                  <span style={{ minWidth: 72 }}>银行交易</span>
                  <span>RM {(consolidationData.bankIncomeTotal ?? 0).toFixed(2)} （{consolidationData.bankIncomeCount ?? 0} 笔）</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', color: '#fa8c16', fontWeight: 500, fontVariantNumeric: 'tabular-nums' as any }}>
                  <span style={{ minWidth: 72 }}>未核对</span>
                  <span>RM {(consolidationData.eventIncomeUnreconciledTotal ?? 0).toFixed(2)}（{consolidationData.eventIncomeUnreconciledCount ?? 0} 笔）</span>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card size="small" className="comparison-stat-card">
              <Statistic
                title="📊 支出对比"
                value={consolidationData.totalExpenseActual}
                precision={2}
                prefix={<FallOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
                suffix="RM"
              />
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' as any }}>
                  <span style={{ minWidth: 72 }}>预算</span>
                  <span>RM {consolidationData.totalExpenseForecast.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', fontVariantNumeric: 'tabular-nums' as any, color: consolidationData.totalExpenseActual <= consolidationData.totalExpenseForecast ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
                  <span style={{ minWidth: 72 }}>差异</span>
                  <span>
                    {consolidationData.totalExpenseActual <= consolidationData.totalExpenseForecast ? '-' : '+'}RM {Math.abs(consolidationData.totalExpenseActual - consolidationData.totalExpenseForecast).toFixed(2)} {' '}
                    ({(consolidationData.totalExpenseForecast > 0 ? ((consolidationData.totalExpenseActual / consolidationData.totalExpenseForecast) * 100).toFixed(1) : '0.0')}%)
                  </span>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' as any }}>
                  <span style={{ minWidth: 72 }}>银行交易</span>
                  <span>RM {(consolidationData.bankExpenseTotal ?? 0).toFixed(2)} （{consolidationData.bankExpenseCount ?? 0} 笔）</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', color: '#fa8c16', fontWeight: 500, fontVariantNumeric: 'tabular-nums' as any }}>
                  <span style={{ minWidth: 72 }}>未核对</span>
                  <span>RM {(consolidationData.eventExpenseUnreconciledTotal ?? 0).toFixed(2)} （{consolidationData.eventExpenseUnreconciledCount ?? 0} 笔）</span>
                </div>
                
              </div>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card size="small" className="comparison-stat-card">
              <Statistic
                title="📊 净利润对比"
                value={consolidationData.profitActual}
                precision={2}
                valueStyle={{ 
                  color: consolidationData.profitActual >= 0 ? '#52c41a' : '#ff4d4f',
                  fontSize: '20px'
                }}
                suffix="RM"
              />
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' as any }}>
                  <span style={{ minWidth: 72 }}>预测</span>
                  <span>RM {consolidationData.profitForecast.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', fontVariantNumeric: 'tabular-nums' as any, color: consolidationData.profitActual >= consolidationData.profitForecast ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
                  <span style={{ minWidth: 72 }}>差异</span>
                  <span>{consolidationData.profitActual >= consolidationData.profitForecast ? '+' : ''}RM {(consolidationData.profitActual - consolidationData.profitForecast).toFixed(2)}</span>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' as any }}>
                  <span style={{ minWidth: 72 }}>银行净额</span>
                  <span>RM {((consolidationData.bankIncomeTotal ?? 0) - (consolidationData.bankExpenseTotal ?? 0)).toFixed(2)}（收入 {consolidationData.bankIncomeCount ?? 0} 笔 / 支出 {consolidationData.bankExpenseCount ?? 0} 笔）</span>
                </div>
                {(consolidationData.eventIncomeUnreconciledTotal !== undefined && consolidationData.eventExpenseUnreconciledTotal !== undefined) && (
                  <div style={{ display: 'flex', justifyContent: 'left', fontSize: '13px', color: '#fa8c16', fontWeight: 500, fontVariantNumeric: 'tabular-nums' as any }}>
                    <span style={{ minWidth: 72 }}>未核对净额</span>
                    <span>RM {((consolidationData.eventIncomeUnreconciledTotal ?? 0) - (consolidationData.eventExpenseUnreconciledTotal ?? 0)).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 🆕 嵌套标签页：财务详细数据 */}
      <Tabs
        activeKey={activeInnerTab}
        onChange={(key) => setActiveInnerTab(key)}
        items={[
          {
            key: 'financial-plan',
            label: '📋 活动财务预算',
            children: (
              <ActivityFinancialPlan
                accountId={account?.id || ''}
                items={planItems}
                loading={planLoading}
                onAdd={handleAddPlan}
                onUpdate={handleUpdatePlan}
                onDelete={handleDeletePlan}
                onRefresh={loadPlans}
              />
            ),
          },
          {
            key: 'event-transactions',
            label: '📊 活动账目记录',
            children: (
              <ActivityFinancialPlan
                accountId={account?.id || ''}
                items={convertedEventTransactions}
                additionalItems={planItems}
                reconciliationMap={reconciliationMap}
                matchedBankTransactions={matchedBankTransactions}
                onReconcile={handleOpenReconcile}
                onCancelReconcile={handleCancelReconcile}
                onAutoReconcile={handleAutoReconcile}
                loading={planLoading}
                onAdd={handleAddEventTransaction}
                onUpdate={handleUpdateEventTransaction}
                onDelete={handleDeleteEventTransaction}
                onRefresh={loadEventTransactions}
              />
            ),
          },
          {
            key: 'bank-transactions',
            label: '💰 银行交易记录',
            children: (
              <BankTransactionList
                accountId={account?.id || ''}
                transactions={bankTransactions}
                loading={loading}
                onRefresh={loadBankTransactions}
                onExport={() => message.info('导出功能开发中...')}
              />
            ),
          },
        ]}
      />
    </Space>
  );

  return (
    <ErrorBoundary>
      <div className="event-account-management-page">
        <PageHeader
          title="活动账户管理"
          subtitle="Event Account Management"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '活动管理', path: '/events' },
            { title: '活动账户' },
          ]}
          extra={
            <Space>
              <Select
                style={{ width: 200 }}
                value={selectedEventId}
                onChange={setSelectedEventId}
                placeholder="选择活动"
                showSearch
                filterOption={(input, option) =>
                  String(option?.label || option?.children).toLowerCase().includes(input.toLowerCase())
                }
              >
                {filteredEvents.map(event => (
                  <Option key={event.id} value={event.id}>
                    {event.name}
                  </Option>
                ))}
              </Select>
              <Select
                style={{ width: 120 }}
                value={selectedYear}
                onChange={setSelectedYear}
                placeholder="年份"
              >
                <Option value="all">全部年份</Option>
                <Option value="2025">2025</Option>
                <Option value="2024">2024</Option>
                <Option value="2023">2023</Option>
                <Option value="2022">2022</Option>
              </Select>
              <Select
                style={{ width: 150 }}
                value={selectedBoardMember}
                onChange={setSelectedBoardMember}
                placeholder="负责理事"
              >
                <Option value="all">全部理事</Option>
                {boardMembers.map(member => (
                  <Option key={member} value={member}>
                    {member}
                  </Option>
                ))}
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadEventAccount}
              >
                刷新
              </Button>
            </Space>
          }
        />

        {/* 🆕 顶层标签页 */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              if (key === 'all-event-transactions') {
                loadAllUnreconciledEventTransactions();
              }
            }}
            items={[
              {
                key: 'overview',
                label: '📊 财务概览',
                children: renderOverviewTab(),
              },
              {
                key: 'all-event-transactions',
                label: '📊 总活动账目记录',
                children: (
                  <ActivityFinancialPlan
                    accountId={account?.id || ''}
                    items={convertedAllUnreconciledEventTransactions}
                    readOnly={true}
                    additionalItems={planItems}
                    reconciliationMap={{}}
                    matchedBankTransactions={{}}
                    onReconcile={handleOpenReconcile}
                    onCancelReconcile={handleCancelReconcile}
                    onAutoReconcile={handleAutoReconcile}
                    loading={planLoading}
                    onAdd={handleAddEventTransaction}
                    onUpdate={handleUpdateEventTransaction}
                    onDelete={handleDeleteEventTransaction}
                    onRefresh={loadAllUnreconciledEventTransactions}
                  />
                ),
              },
              {
                key: 'account-consolidation',
                label: '🔄 户口核对',
                children: consolidationData ? (
                  <AccountConsolidation
                    data={consolidationData}
                    loading={loading}
                    onExport={() => message.info('导出功能开发中...')}
                    onGenerateReport={() => message.info('报表生成功能开发中...')}
                  />
                ) : (
                  <Card>
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                      <h3 style={{ marginBottom: '8px' }}>暂无数据</h3>
                      <p style={{ color: '#8c8c8c' }}>
                        请先选择活动并加载数据
                      </p>
                    </div>
                  </Card>
                ),
              },
            ]}
          />
        </Card>

        {/* Add Transaction Modal */}
        <Modal
          title="添加交易"
          open={transactionModalVisible}
          onOk={() => form.submit()}
          onCancel={() => {
            setTransactionModalVisible(false);
            form.resetFields();
          }}
          okText="添加"
          cancelText="取消"
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddTransaction}
            initialValues={{
              transactionDate: dayjs(),
              transactionType: 'income',
              isForecast: false,
            }}
          >
            <Form.Item
              name="transactionDate"
              label="交易日期"
              rules={[{ required: true, message: '请选择日期' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD-MMM-YYYY" />
            </Form.Item>

            <Form.Item
              name="transactionType"
              label="交易类型"
              rules={[{ required: true, message: '请选择类型' }]}
            >
              <Radio.Group>
                <Radio value="income">
                  <RiseOutlined style={{ color: '#52c41a' }} /> 收入
                </Radio>
                <Radio value="expense">
                  <FallOutlined style={{ color: '#ff4d4f' }} /> 支出
                </Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.transactionType !== currentValues.transactionType
              }
            >
              {({ getFieldValue }) => {
                const transactionType = getFieldValue('transactionType');
                const categories =
                  transactionType === 'income'
                    ? EVENT_INCOME_CATEGORIES
                    : EVENT_EXPENSE_CATEGORIES;

                return (
                  <Form.Item
                    name="category"
                    label="类别"
                    rules={[{ required: true, message: '请选择类别' }]}
                  >
                    <Select placeholder="选择类别">
                      {categories.map(opt => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }}
            </Form.Item>

            <Form.Item
              name="description"
              label="描述"
              rules={[{ required: true, message: '请输入描述' }]}
            >
              <Input placeholder="请输入交易描述" />
            </Form.Item>

            <Form.Item
              name="amount"
              label="金额"
              rules={[{ required: true, message: '请输入金额' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="RM"
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item name="payerPayee" label="付款人/收款人">
              <Input placeholder="请输入付款人或收款人名称" />
            </Form.Item>

            <Form.Item name="isForecast" label="数据类型" valuePropName="checked">
              <Radio.Group>
                <Radio value={false}>实际数据</Radio>
                <Radio value={true}>预测数据</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.isForecast !== currentValues.isForecast
              }
            >
              {({ getFieldValue }) =>
                getFieldValue('isForecast') && (
                  <Form.Item name="forecastConfidence" label="预测置信度">
                    <Select placeholder="选择置信度">
                      <Option value="high">高</Option>
                      <Option value="medium">中</Option>
                      <Option value="low">低</Option>
                    </Select>
                  </Form.Item>
                )
              }
            </Form.Item>

            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={3} placeholder="备注信息" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Update Budget Modal */}
        <Modal
          title="更新预算"
          open={budgetModalVisible}
          onOk={() => budgetForm.submit()}
          onCancel={() => setBudgetModalVisible(false)}
          okText="更新"
          cancelText="取消"
        >
          <Form form={budgetForm} layout="vertical" onFinish={handleUpdateBudget}>
            <Form.Item
              name="budgetIncome"
              label="收入预算"
              rules={[{ required: true, message: '请输入收入预算' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="RM"
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item
              name="budgetExpense"
              label="支出预算"
              rules={[{ required: true, message: '请输入支出预算' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="RM"
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item
              name="targetProfit"
              label="目标利润"
              rules={[{ required: true, message: '请输入目标利润' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                prefix="RM"
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={3} placeholder="备注信息" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 🆕 核对弹窗 */}
        <Modal
          title="核对银行交易记录"
          open={reconcileModalVisible}
          onCancel={() => setReconcileModalVisible(false)}
          footer={null}
          width={800}
        >
          <List
            size="small"
            dataSource={availableBankTxns}
            renderItem={(bankTx) => (
              <List.Item
                actions={[
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleConfirmReconcile(bankTx.id)}
                  >
                    选择
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{bankTx.description}</span>
                      <Tag color={bankTx.transactionType === 'income' ? 'green' : 'red'}>
                        {bankTx.transactionType === 'income' ? '收入' : '支出'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space>
                      <span>{globalDateService.formatDate(bankTx.transactionDate, 'display')}</span>
                      <span>金额: RM {bankTx.amount.toFixed(2)}</span>
                      {bankTx.bankAccountName && <span>账户: {bankTx.bankAccountName}</span>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default EventAccountManagementPage;

