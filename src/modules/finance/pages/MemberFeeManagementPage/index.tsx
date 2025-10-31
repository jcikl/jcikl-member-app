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
import { deleteField } from 'firebase/firestore';
import { smartFiscalYearService } from '../../services/smartFiscalYearService';
import { getMembers, getMemberById, getAllActiveMembers } from '@/modules/member/services/memberService';
import type { MemberFee, MemberFeeStatus, Transaction } from '../../types';
import type { MemberCategoryType } from '@/modules/member/types';
import type { FiscalYearPeriod } from '../../types/fiscalYear';
import { MEMBER_CATEGORY_OPTIONS } from '@/modules/member/types';
import './styles.css';

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
  const [fiscalYearOptions, setFiscalYearOptions] = useState<Array<{ label: string; value: string; period: FiscalYearPeriod }>>([]);
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
  const [transactionPageSize, setTransactionPageSize] = useState(100); // 🆕 增加默认显示数量以匹配实际数据
  const [txAccountFilter, setTxAccountFilter] = useState<string>('all'); // 交易账户筛选(new-member-fee 等)
  const [classifyModalVisible, setClassifyModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  // 分类模态框本地状态(年份必填 + 底部操作栏)
  const [modalSelectedCategory, setModalSelectedCategory] = useState<string>('');
  const [modalYearInput, setModalYearInput] = useState<string>('');
  const [modalSelectedMemberId, setModalSelectedMemberId] = useState<string>('');
  const [memberSearchOptions, setMemberSearchOptions] = useState<{ value: string; label: string }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  
  // 批量选择与分类
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [bulkClassifyModalVisible, setBulkClassifyModalVisible] = useState(false);
  // 🆕 会员信息缓存(用于在描述栏显示会员名字)
  const [memberInfoCache, setMemberInfoCache] = useState<Record<string, { name: string; email?: string; phone?: string }>>({});
  
  // 🆕 未分类检测
  const [hasUncategorized, setHasUncategorized] = useState(false);

  // 🆕 自动匹配预览状态
  const [autoPreviewVisible, setAutoPreviewVisible] = useState(false);
  const [autoPreviewLoading, setAutoPreviewLoading] = useState(false);
  const [autoPreviewRows, setAutoPreviewRows] = useState<Array<{
    id: string;
    date: string;
    mainDescription: string;
    subDescription?: string;
    amount: number;
    currentTxAccount?: string;
    suggestedTxAccount?: string;
    suggestedMemberId?: string;
    suggestedMemberName?: string; // display name for fallback
    suggestedMemberFull?: string; // fullNameNric for display
    suggestedMemberDisplayName?: string; // profile.name/displayName
    currentMemberId?: string;
    score: number;
  }>>([]);
  const [autoSelectedKeys, setAutoSelectedKeys] = useState<string[]>([]);
  const [previewMemberOptions, setPreviewMemberOptions] = useState<Record<string, { value: string; label: React.ReactNode }[]>>({});
  const [previewMemberLoading, setPreviewMemberLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    initializeData();
    loadFiscalYearOptions();
  }, []);

  useEffect(() => {
    loadMemberFees();
  }, [currentPage, pageSize, searchText, statusFilter, categoryFilter, selectedYear]);
  
  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, transactionPage, transactionPageSize, txAccountFilter, selectedYear, searchText]);

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

  // 🆕 加载财年选项
  const loadFiscalYearOptions = async () => {
    try {
      const options = await smartFiscalYearService.getSmartFiscalYearOptions();
      setFiscalYearOptions(options);
    } catch (error: any) {
      console.error('加载财年选项失败:', error);
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
  

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as MemberFeeStatus | 'all');
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
      
      // 为避免分页大小影响记录载入，这里固定拉取较大的上限，由前端分页
      const result = await getTransactions({
        page: 1,
        limit: 10000,
        category: 'member-fees',
        // 🔑 不要将'uncategorized'传给服务端，在客户端筛选
        txAccount: (txAccountFilter !== 'all' && txAccountFilter !== 'uncategorized' && !txAccountFilter.startsWith('year-')) ? txAccountFilter : undefined,
        sortBy: 'transactionDate',
        sortOrder: 'desc',
        includeVirtual: true, // 🔑 包含子交易(拆分的会员费)
      });
      
      // 客户端筛选：年份 + 分类
      let filteredTransactions = result.data;
      const applyYear = (list: Transaction[]) => {
        // 年份筛选逻辑(如果需要)
        if (txAccountFilter.startsWith('year-')) {
          const year = txAccountFilter.replace('year-', '');
          return list.filter(t => t.txAccount && t.txAccount.startsWith(`${year}-`));
        }
        return list;
      };
      const applyCategory = (list: Transaction[]) => {
        if (txAccountFilter === 'uncategorized') {
          return list.filter(t => !t.txAccount);
        }
        if (txAccountFilter !== 'all' && !txAccountFilter.startsWith('year-')) {
          return list.filter(t => {
            if (!t.txAccount) return false;
            const parts = t.txAccount.split('-');
            const key = /^\d{4}$/.test(parts[0]) ? parts.slice(1).join('-') : t.txAccount;
            return key === txAccountFilter;
          });
        }
        return list;
      };
      filteredTransactions = applyCategory(applyYear(result.data));
      
      // 🆕 Step 1: 先加载会员信息缓存(用于后续搜索)
      const memberIds = filteredTransactions
        .map(t => (t as any)?.metadata?.memberId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .filter((id, index, array) => array.indexOf(id) === index); // 去重
      
      // 批量加载会员信息
      let tempMemberCache: Record<string, { name: string; email?: string; phone?: string }> = {};
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
        tempMemberCache = memberResults.reduce((cache, { memberId, member }) => {
          if (member) {
            cache[memberId] = {
              name: member.name,
              email: member.email,
              phone: member.phone,
            };
          }
          return cache;
        }, {} as Record<string, { name: string; email?: string; phone?: string }>);
        
        setMemberInfoCache(tempMemberCache);
      }
      
      // 🆕 Step 2: 搜索文本筛选(扩展到关联会员信息)
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase().trim();
        filteredTransactions = filteredTransactions.filter(tx => {
          // 基础字段搜索
          const matchesBasicFields = (
            tx.mainDescription?.toLowerCase().includes(searchLower) ||
            tx.subDescription?.toLowerCase().includes(searchLower) ||
            tx.payerPayee?.toLowerCase().includes(searchLower) ||
            tx.txAccount?.toLowerCase().includes(searchLower) ||
            tx.transactionNumber?.toLowerCase().includes(searchLower)
          );
          
          // 🆕 关联会员信息搜索
          const memberId = (tx as any)?.metadata?.memberId;
          let matchesMemberInfo = false;
          
          if (memberId && tempMemberCache[memberId]) {
            const memberInfo = tempMemberCache[memberId];
            matchesMemberInfo = !!(
              memberInfo.name?.toLowerCase().includes(searchLower) ||
              memberInfo.email?.toLowerCase().includes(searchLower) ||
              memberInfo.phone?.toLowerCase().includes(searchLower)
            );
          }
          
          return matchesBasicFields || matchesMemberInfo;
        });
      }
      
      // 🆕 Step 3: 客户端排序：按交易日期降序(最新的在前)
      filteredTransactions.sort((a, b) => {
        const dateA = new Date(a.transactionDate).getTime();
        const dateB = new Date(b.transactionDate).getTime();
        return dateB - dateA; // 降序：最新的在前
      });
      
      // 🆕 Step 4: 检测是否有未分类交易
      const uncategorizedCount = result.data.filter(t => !t.txAccount || t.txAccount.trim() === '').length;
      setHasUncategorized(uncategorizedCount > 0);
      
      // 🆕 Step 5: 设置最终数据
      // 前端分页
      setTransactionTotal(filteredTransactions.length);
      const start = (transactionPage - 1) * transactionPageSize;
      const end = start + transactionPageSize;
      setTransactions(filteredTransactions.slice(start, end));
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
    const existing = transaction.txAccount || '';
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
    const rawMemberId = (transaction as any)?.metadata?.memberId as any;
    const existingMemberId = typeof rawMemberId === 'string' ? rawMemberId : '';
    if (existingMemberId) {
      setModalSelectedMemberId(existingMemberId);
      // 加载该会员的信息以显示名字
      try {
        const member = await getMemberById(existingMemberId);
        if (member) {
          const display = [member.name, member.email || member.phone || member.memberId]
            .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
            .join(' ');
          setMemberSearchOptions([
            { value: member.id, label: display }
          ]);
        } else {
          setMemberSearchOptions([]);
        }
      } catch (error) {
        console.error('Failed to load member info:', error);
        setMemberSearchOptions([]);
      }
    } else {
      setModalSelectedMemberId('');
      setMemberSearchOptions([]);
    }
    
    setClassifyModalVisible(true);
  };
  
  // 保存二次分类
  const handleClassifySubmit = async (txAccount: string, memberId?: string) => {
    if (!user || !selectedTransaction) return;
    
    try {
      await updateTransaction(
        selectedTransaction.id,
        { txAccount, metadata: memberId ? { memberId } : undefined },
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

  // ========= 自动匹配预览 =========
  const keywordRules: Array<{ regex: RegExp; category: string }> = [
    { regex: /(新|加入|注册|new)/i, category: 'new-member-fee' },
    { regex: /(续|renew|renewal)/i, category: 'renewal-fee' },
    { regex: /(校友|alumni)/i, category: 'alumni-fee' },
    { regex: /(拜访|visiting)/i, category: 'visiting-member-fee' },
  ];

  const buildSuggestion = (t: Transaction): { txAccount?: string; score: number } => {
    const text = `${t.mainDescription || ''} ${t.subDescription || ''}`.toLowerCase();
    const year = new Date(t.transactionDate).getFullYear().toString();
    const amt = Number(t.amount || 0);
    const near = (v: number, target: number, tol = 0.6) => Math.abs(v - target) <= tol; // 金额容差±0.6

    // 1) 金额优先规则（更高置信度）
    if (near(amt, 300)) {
      return { txAccount: `${year}-renewal-fee`, score: 95 };
    }
    if (near(amt, 350)) {
      return { txAccount: `${year}-new-member-fee`, score: 95 };
    }

    // 2) 关键词规则
    for (const r of keywordRules) {
      if (r.regex.test(text)) {
        return { txAccount: `${year}-${r.category}`, score: 80 };
      }
    }
    return { txAccount: undefined, score: 0 };
  };

  const openAutoPreview = async () => {
    setAutoPreviewVisible(true);
    setAutoPreviewLoading(true);
    try {
      // 一次性载入活跃会员用于模糊匹配
      const activeMembers = await getAllActiveMembers();
      const normalize = (s: string) => (s || '').toLowerCase().trim();
      const includesLoose = (text: string, s: string) => text.replace(/\s+/g, '').includes((s || '').toLowerCase().replace(/\s+/g, ''));
      const scoreName = (text: string, name?: string): number => {
        if (!name) return 0;
        const n = normalize(name);
        if (!n) return 0;
        if (includesLoose(text, n)) return Math.min(30, Math.max(12, Math.floor(n.length * 1.2)));
        const tokens = n.split(/\s+/).filter(Boolean);
        let hits = 0;
        for (const tk of tokens) { if (tk.length >= 2 && text.includes(tk)) hits++; }
        return hits >= 2 ? 12 : hits === 1 ? 6 : 0;
      };

      // 已经“分类且已有关联会员”的记录不再参与自动匹配
      const candidates = transactions.filter((t) => {
        const linkedMemberId = (t as any)?.metadata?.memberId;
        const hasLinkedMember = typeof linkedMemberId === 'string' && linkedMemberId.trim().length > 0;
        return !(t.txAccount && hasLinkedMember);
      });

      const rows = await Promise.all(candidates.map(async (t) => {
        const { txAccount, score } = buildSuggestion(t);
        const combined = normalize(`${t.mainDescription || ''} ${t.subDescription || ''}`);
        // 为 fullNameNric 赋更高优先级：在匹配分数上加权
        let best: { id: string; displayName: string; full: string; s: number; sFull: number; sName: number } | undefined;
        for (const m of activeMembers) {
          const nm = (m as any).profile?.name || m.name || '';
          const full = (m as any).profile?.fullNameNric || '';
          const sName = scoreName(combined, nm);
          const sFull = scoreName(combined, full);
          // 提升 fullNameNric 的优先度：在综合分数中对 sFull 加偏置
          const s = Math.max(sFull + 5, sName);
          if (
            s > (best?.s || 0) ||
            (s === (best?.s || 0) && sFull > (best?.sFull || 0)) // 分数相同优先 full 命中高者
          ) {
            best = { id: m.id, displayName: nm, full, s, sFull, sName };
            }
          }
        const matched = best && best.s >= 12 ? best : undefined;
        return {
          id: t.id,
          date: t.transactionDate,
          mainDescription: t.mainDescription,
          subDescription: t.subDescription,
          amount: t.amount,
          currentTxAccount: t.txAccount,
          suggestedTxAccount: txAccount,
          suggestedMemberId: matched?.id,
          suggestedMemberName: matched ? (matched.full || matched.displayName) : undefined,
          suggestedMemberFull: matched?.full,
          suggestedMemberDisplayName: matched?.displayName,
          currentMemberId: typeof (t as any)?.metadata?.memberId === 'string' ? (t as any).metadata.memberId : undefined,
          score: score + (matched ? 15 : 0),
        };
      }));
      // 排序：先按金额(高到低)，再按日期(新到旧)
      rows.sort((a, b) => {
        const amtDiff = Number(b.amount || 0) - Number(a.amount || 0);
        if (amtDiff !== 0) return amtDiff;
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return db - da;
      });
      setAutoPreviewRows(rows);
      // 预填每行的下拉选项，保证不搜索时也显示两行格式
      const initialOptions: Record<string, { value: string; label: React.ReactNode }[]> = {} as any;
      const asText = (v: any) => (typeof v === 'string' ? v : '');
      rows.forEach(r => {
        if (r.suggestedMemberId) {
          const full = asText(r.suggestedMemberFull);
          const displayName = asText(r.suggestedMemberDisplayName || r.suggestedMemberName);
          initialOptions[r.id] = [{
            value: r.suggestedMemberId,
            label: (
              <div style={{ lineHeight: 1.2 }}>
                <div>{full || displayName}</div>
                {(full && displayName) ? (
                  <div style={{ color: '#999', fontSize: 12 }}>{displayName}</div>
                ) : null}
              </div>
            )
          }];
        }
      });
      setPreviewMemberOptions(initialOptions);
      setAutoSelectedKeys(rows.filter(r => (r.score || 0) >= 70 && r.suggestedTxAccount).map(r => r.id));
    } finally {
      setAutoPreviewLoading(false);
    }
  };

  const applyAutoPreview = async (onlyHighConfidence: boolean) => {
    if (!user) return;
    const targets = autoPreviewRows.filter(r =>
      (!!r.suggestedTxAccount) && (onlyHighConfidence ? (r.score >= 70) : autoSelectedKeys.includes(r.id))
    );
    if (targets.length === 0) {
      message.info('没有可应用的匹配结果');
      return;
    }
    try {
      setAutoPreviewLoading(true);
      await Promise.all(targets.map(r => {
        const updates: any = { txAccount: r.suggestedTxAccount! };
        if (r.suggestedMemberId) {
          updates.metadata = { memberId: r.suggestedMemberId };
        } else if (!r.suggestedMemberId && r.currentMemberId) {
          // 用户清除了关联会员，需要从 metadata 中删除原有 memberId
          updates.metadata = { memberId: deleteField() };
        }
        return updateTransaction(r.id, updates, user.id);
      }));
      message.success(`已应用 ${targets.length} 条匹配结果`);
      setAutoPreviewVisible(false);
      setAutoSelectedKeys([]);
      loadTransactions();
    } catch (e) {
      message.error('应用失败');
    } finally {
      setAutoPreviewLoading(false);
    }
  };

  // 移除“关联会员”预览搜索与写入逻辑

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
      dataIndex: 'txAccount',
      key: 'txAccount',
      render: (txAccount: string | undefined, record: any) => {
        if (record.isPlaceholder) {
          return '-';
        }
        return txAccount ? <Tag color="purple">{txAccount}</Tag> : <Tag color="default">未分类</Tag>;
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
      width: '18%',
      sorter: (a: Transaction, b: Transaction) => {
        const dateA = new Date(a.transactionDate).getTime();
        const dateB = new Date(b.transactionDate).getTime();
        return dateA - dateB;
      },
      defaultSortOrder: 'descend', // 默认降序(最新的在前)
      render: (date: string) => globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '描述',
      dataIndex: 'mainDescription',
      key: 'mainDescription',
      width: '50%',
      ellipsis: true,
      render: (description: string, record: Transaction) => {
        const memberId = (record as any)?.metadata?.memberId;
        const memberInfo = memberId ? memberInfoCache[memberId] : null;
        
        return (
          <div>
            <div style={{ marginBottom: (record.subDescription || memberInfo) ? 4 : 0 }}>
              <span
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  verticalAlign: 'middle',
                }}
              >
                {description}
              </span>
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
      width: '18%',
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
      width: '18%',
      render: (subCat: string) => {
        const txAccountConfig: Record<string, { color: string; text: string }> = {
          'new-member-fee': { color: 'blue', text: '新会员费' },
          'renewal-fee': { color: 'green', text: '续会费' },
          'alumni-fee': { color: 'purple', text: '校友会' },
          'visiting-member-fee': { color: 'orange', text: '拜访会员' },
        };
        
        // 处理带年份的分类(年份在前)
        const getCategoryDisplay = (subCat: string) => {
          if (!subCat) return { color: 'default', text: '未分类' };
          
          // 检查是否包含年份(前端): 2024-new-member-fee
          const parts = subCat.split('-');
          if (parts.length >= 2 && /^\d{4}$/.test(parts[0])) {
            const year = parts[0];
            const categoryKey = parts.slice(1).join('-');
            const baseConfig = txAccountConfig[categoryKey];
            
            if (baseConfig) {
              return {
                color: baseConfig.color,
                text: `${year} ${baseConfig.text}`
              };
            }
          }
          
          // 返回基础分类配置
          return txAccountConfig[subCat] || { color: 'default', text: subCat };
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
      width: '10%',
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
      width: '18%',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleClassify(record)}
          >
            {record.txAccount ? '重新分类' : '分类'}
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

        {/* 主体布局：左侧筛选 + 右侧标签页 */}
        <Row gutter={16}>
          {/* 🆕 左侧独立筛选卡片 */}
          <Col xs={24} lg={6}>
            <Card title="💼 会员费用筛选" style={{ position: 'sticky', top: 16 }}>
              {/* 年份筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>📅 年份</div>
                <Select
                  style={{ width: '100%' }}
                  value={selectedYear}
                  onChange={(value) => {
                    setSelectedYear(value);
                    setCurrentPage(1);
                    setTransactionPage(1);
                  }}
                >
                  {fiscalYearOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>
              
              {/* 会员类别筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>👥 会员类别</div>
                <Select
                  style={{ width: '100%' }}
                  value={categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(value as MemberCategoryType | 'all');
                    setCurrentPage(1);
                    setTransactionPage(1);
                  }}
                >
                  <Option value="all">所有类别</Option>
                  <Option value="Official Member">👔 正式会员</Option>
                  <Option value="Probation Member">🎓 准会员</Option>
                  <Option value="Honorary Member">🏆 荣誉会员</Option>
                  <Option value="Visiting Member">🌏 访问会员</Option>
                  <Option value="Alumni">🎓 校友</Option>
                  <Option value="JCI Friend">🤝 青商好友</Option>
                </Select>
              </div>
              
              {/* 状态筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>📊 付款状态</div>
                <Select
                  style={{ width: '100%' }}
                  value={statusFilter}
                  onChange={(value) => {
                    handleStatusFilterChange(value);
                    setTransactionPage(1);
                  }}
                >
                  <Option value="all">所有状态</Option>
                  <Option value="paid">✅ 已付</Option>
                  <Option value="unpaid">⏳ 未付</Option>
                  <Option value="overdue">❌ 逾期</Option>
                </Select>
              </div>
              
              {/* 交易账户筛选(仅影响交易记录标签页) */}
              {activeTab === 'transactions' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>🏦 交易账户</div>
                  <Select
                    style={{ width: '100%' }}
                    value={txAccountFilter}
                    onChange={(value) => {
                      setTxAccountFilter(value);
                      setTransactionPage(1);
                    }}
                  >
                    <Option value="all">📊 所有分类</Option>
                    <Option value="uncategorized">❓ 未分类</Option>
                    <Option value="new-member-fee">🆕 新会员费</Option>
                    <Option value="renewal-fee">🔄 续会费</Option>
                    <Option value="alumni-fee">🎓 校友会费</Option>
                    <Option value="visiting-member-fee">🌏 拜访会员费</Option>
                  </Select>
                </div>
              )}
              
              {/* 统计信息 */}
              <div style={{ 
                marginTop: 24, 
                paddingTop: 16, 
                borderTop: '1px solid #e8e8e8' 
              }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>当前筛选结果</div>
                  {activeTab === 'member-fees' ? (
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>
                      {total} 条记录
                    </div>
                  ) : (
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>
                      {transactionTotal} 笔交易
                    </div>
                  )}
                </div>
                
                {/* 快捷操作 */}
                <div style={{ marginTop: 16 }}>
                  {/* 🆕 未分类快速筛选(仅交易记录标签页显示) */}
                  {activeTab === 'transactions' && (
                    <Button 
                      block
                      size="small"
                      type="default"
                      danger={hasUncategorized}
                      disabled={!hasUncategorized}
                      onClick={() => {
                        setTxAccountFilter('uncategorized');
                      }}
                      style={{ marginBottom: 8 }}
                    >
                      {hasUncategorized ? '🔴 显示未分类交易' : '✅ 无未分类交易'}
                    </Button>
                  )}
                  
                  <Button 
                    block 
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setSelectedYear('FY2025');
                      setCategoryFilter('all');
                      setStatusFilter('all');
                      setTxAccountFilter('all');
                      setCurrentPage(1);
                      setTransactionPage(1);
                      if (activeTab === 'member-fees') {
                        loadMemberFees();
                      } else {
                        loadTransactions();
                      }
                    }}
                  >
                    重置筛选
                  </Button>
                </div>
              </div>
            </Card>
          </Col>
          
          {/* 🆕 右侧标签页内容 */}
          <Col xs={24} lg={18}>
            {/* 搜索输入框 */}
            <Card style={{ marginBottom: 16 }}>
              <Input
                placeholder={
                  activeTab === 'member-fees' 
                    ? "搜索会员姓名或ID..." 
                    : "搜索交易描述、付款人、关联会员、交易编号..."
                }
                style={{ width: '100%' }}
                suffix={<SearchOutlined />}
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
              />
            </Card>

        <Card style={{ marginBottom: 24 }}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'member-fees' | 'transactions')}
            tabBarExtraContent={
              <Space>
                <Button icon={<SendOutlined />} onClick={handleSendBulkReminders}>
                  批量提醒
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleExportReport}>
                  导出报告
                </Button>
              </Space>
            }
            items={[
              {
                key: 'member-fees',
                label: '会员费用追踪',
                children: (
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
                      />
                    </Card>
                ),
              },
              {
                key: 'transactions',
                    label: '会员费交易记录',
                children: (
                  <>
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
                          <Button onClick={openAutoPreview}>自动匹配预览</Button>
                          </Space>
                      }
                    >
                      <Table
                        {...tableConfig}
                        tableLayout="fixed"
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
          </Col>
        </Row>

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
        title={`批量分类(已选 ${selectedTransactionIds.length} 条)`}
        open={bulkClassifyModalVisible}
        onCancel={() => setBulkClassifyModalVisible(false)}
        footer={null}
        width={720}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontWeight: 'bold', marginBottom: 4 }}>年份(必填)：</p>
            <Input
              placeholder="输入年份，如：2024"
              maxLength={4}
              style={{ width: 200 }}
              value={modalYearInput}
              onChange={(e) => setModalYearInput(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 320 }}>
            <p style={{ fontWeight: 'bold', marginBottom: 4 }}>关联会员(可选)：</p>
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
                    res.data.map((m: any) => {
                      const asText = (v: any) => (typeof v === 'string' ? v : '');
                      const primary = asText(m.name);
                      const secondary = asText(m.email) || asText(m.phone) || asText(m.memberId);
                      return { value: m.id, label: [primary, secondary].filter(Boolean).join(' ') };
                    })
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
                    updateTransaction(id, { txAccount: fullCategory, metadata: modalSelectedMemberId ? { memberId: modalSelectedMemberId } : undefined }, user?.id || '')
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
                {selectedTransaction.txAccount && (
                  <p><strong>当前分类：</strong>{selectedTransaction.txAccount}</p>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 顶部：年份 + 关联会员 并排 */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>年份(必填)：</p>
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

                {/* 底部操作栏(仅操作按钮) */}
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

      {/* 🆕 自动匹配预览弹窗 */}
      <Modal
        title="自动匹配预览"
        open={autoPreviewVisible}
        onCancel={() => setAutoPreviewVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setAutoPreviewVisible(false)}>关闭</Button>
            <Button loading={autoPreviewLoading} onClick={() => applyAutoPreview(true)} type="default">仅应用高置信</Button>
            <Button loading={autoPreviewLoading} onClick={() => applyAutoPreview(false)} type="primary">应用选中</Button>
          </Space>
        }
        width={1100}
      >
        <Table
          size="small"
          rowKey="id"
          loading={autoPreviewLoading}
          dataSource={autoPreviewRows}
          rowSelection={{ selectedRowKeys: autoSelectedKeys, onChange: (k) => setAutoSelectedKeys(k as string[]) }}
          pagination={false}
          columns={[
            { title: '日期', dataIndex: 'date', width: 120, render: (d: string) => globalDateService.formatDate(new Date(d), 'display') },
            { 
              title: '描述', 
              dataIndex: 'mainDescription', 
              ellipsis: true,
              render: (_: any, r: any) => (
                <div style={{ maxWidth: 320 }}>
                  <div>{r.mainDescription || '-'}</div>
                  {r.subDescription && (
                    <div style={{ color: '#999' }}>{r.subDescription}</div>
                  )}
                </div>
              )
            },
            { title: '金额', dataIndex: 'amount', width: 100, align: 'right', render: (v: number) => `RM ${Number(v||0).toFixed(2)}` },
            { title: '当前二次分类', dataIndex: 'currentTxAccount', width: 160, render: (v: string) => v ? <Tag color="purple">{v}</Tag> : <Tag>未分类</Tag> },
            { title: '推荐分类', dataIndex: 'suggestedTxAccount', width: 160, render: (v: string) => v ? <Tag color="blue">{v}</Tag> : <Tag>无法判断</Tag> },
            { title: '关联会员(可调整)', dataIndex: 'suggestedMemberId', width: 200, render: (_: any, r: any) => (
              <Select
                showSearch
                allowClear
                placeholder={(() => {
                  const asText = (v: any) => (typeof v === 'string' ? v : '');
                  const full = asText(r.suggestedMemberFull);
                  const displayName = asText(r.suggestedMemberDisplayName || r.suggestedMemberName);
                  if (full || displayName) {
                    return `${full || ''}${full && displayName ? ' ' : ''}${displayName || ''}`;
                  }
                  return '搜索会员姓名/邮箱';
                })()}
                size="small"
                value={r.suggestedMemberId}
                style={{ width: 180, height: 45 }}
                options={previewMemberOptions[r.id] || []}
                notFoundContent={previewMemberLoading[r.id] ? '加载中...' : '暂无数据'}
                filterOption={false}
                onSearch={async (q) => {
                  if (!q || q.length < 2) return;
                  setPreviewMemberLoading(prev => ({ ...prev, [r.id]: true }));
                  try {
                    const res = await getMembers({ page: 1, limit: 10, search: q });
                     const opts = (res.data || []).map((m: any) => {
                      const asText = (v: any) => (typeof v === 'string' ? v : '');
                      const prof = (m as any).profile || {};
                      const full = asText(prof.fullNameNric);
                      const displayName = asText(prof.name || m.name);
                      const labelNode = (
                        <div style={{ lineHeight: 1.2 }}>
                          <div>{full || displayName}</div>
                          {full && displayName ? (
                            <div style={{ color: '#999', fontSize: 12 }}>{displayName}</div>
                          ) : null}
                        </div>
                      );
                      return { value: m.id, label: labelNode, metaFull: full, metaName: displayName } as any;
                    });
                    setPreviewMemberOptions(prev => ({ ...prev, [r.id]: opts }));
                  } finally {
                    setPreviewMemberLoading(prev => ({ ...prev, [r.id]: false }));
                  }
                }}
                onChange={(val, option) => {
                  const metaFull = typeof (option as any)?.metaFull === 'string' ? (option as any)?.metaFull : undefined;
                  const metaName = typeof (option as any)?.metaName === 'string' ? (option as any)?.metaName : undefined;
                  const safeName = metaFull || metaName;
                  setAutoPreviewRows(prev => prev.map(row => row.id === r.id ? { ...row, suggestedMemberId: val as (string|undefined), suggestedMemberName: safeName, suggestedMemberFull: metaFull, suggestedMemberDisplayName: metaName } : row));
                }}
              />
            ) },
            { title: '置信度', dataIndex: 'score', width: 100, render: (s: number) => <Tag color={s>=70?'green':s>=40?'orange':'default'}>{s||0}</Tag> },
          ]}
        />
      </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default MemberFeeManagementPage;

