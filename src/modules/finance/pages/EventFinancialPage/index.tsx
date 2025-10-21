/**
 * Event Financial Management Page
 * 活动财务管理页面
 * 
 * Tracks revenue and expenses for events
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  Button,
  Tag,
  Space,
  message,
  Tabs,
  Modal,
  Drawer,
  Descriptions,
  Input,
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  DownloadOutlined,
  PlusOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { globalSystemService } from '@/config/globalSystemSettings';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getTransactions, updateTransaction } from '../../services/transactionService';
import { getAllFinanceEvents, createFinanceEvent, updateFinanceEvent } from '../../services/financeEventService';
import { getAllActiveMembers, getMembers, getMemberById } from '../../../member/services/memberService';
import type { Transaction, FinanceEvent } from '../../types';
import type { Member } from '../../../member/types';
import './styles.css';

const { Option } = Select;

interface EventFinancialSummary {
  eventId: string;
  eventName: string;
  eventDate: string;
  boardMember?: string; // 🆕 负责理事
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  budgetedRevenue: number;
  budgetedExpense: number;
  status: string;
}

const EventFinancialPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventFinancialSummary[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<Record<string, EventFinancialSummary[]>>({});
  const [filter] = useState<'all' | 'recent' | 'upcoming'>('recent');
  const [statistics, setStatistics] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    netIncome: 0,
    outstandingPayments: 0,
  });

  // 🆕 筛选状态管理
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedBoardMember, setSelectedBoardMember] = useState<string>('all');
  const [selectedEventStatus, setSelectedEventStatus] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [financialStatusFilter, setFinancialStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  
  // 交易管理相关状态
  const [activeTab, setActiveTab] = useState<'events' | 'transactions'>('events');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(20);
  const [txAccountFilter, setTxAccountFilter] = useState<string>('all');
  const [classifyModalVisible, setClassifyModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchClassifyModalVisible, setBatchClassifyModalVisible] = useState(false);
  // 🆕 会员搜索相关状态
  const [modalSelectedMemberId, setModalSelectedMemberId] = useState<string>('');
  const [modalPayerPayee, setModalPayerPayee] = useState<string>(''); // 手动填写的乙方
  const [modalSelectedEvent, setModalSelectedEvent] = useState<string>(''); // 🆕 选择的活动名称
  const [modalYearFilter, setModalYearFilter] = useState<string>('all'); // 🆕 模态框中的年份筛选
  const [memberSearchOptions, setMemberSearchOptions] = useState<{ value: string; label: string }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  
  // 活动管理相关状态
  const [financeEvents, setFinanceEvents] = useState<FinanceEvent[]>([]);
  const [createEventModalVisible, setCreateEventModalVisible] = useState(false);
  
  // 🆕 会员列表状态
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventBoardMember, setNewEventBoardMember] = useState<string>('');
  const [newEventChair, setNewEventChair] = useState(''); // 🆕 活动主席
  const [newEventTreasurer, setNewEventTreasurer] = useState(''); // 🆕 活动财政
  
  // 活动详情Drawer状态
  const [eventDetailDrawerVisible, setEventDetailDrawerVisible] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<EventFinancialSummary | null>(null);
  const [eventTransactions, setEventTransactions] = useState<Transaction[]>([]);
  const [eventTransactionsLoading, setEventTransactionsLoading] = useState(false);
  
  // 🆕 活动详情编辑状态
  const [editingEvent, setEditingEvent] = useState(false);
  const [editEventName, setEditEventName] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventDescription, setEditEventDescription] = useState('');
  const [editEventBoardMember, setEditEventBoardMember] = useState<string>('');
  const [editEventChair, setEditEventChair] = useState('');
  const [editEventTreasurer, setEditEventTreasurer] = useState('');
  const [editEventStatus, setEditEventStatus] = useState<'planned' | 'active' | 'completed' | 'cancelled'>('planned');
  
  // 🆕 会员信息缓存（用于显示描述栏中的会员信息）
  const [memberInfoCache, setMemberInfoCache] = useState<Record<string, { name: string; email?: string; phone?: string }>>({});

  useEffect(() => {
    loadEventFinancials();
    loadFinanceEvents();
    loadActiveMembers(); // 🆕 加载活跃会员列表
  }, [filter, selectedYear, selectedBoardMember, selectedEventStatus, selectedEventType, searchText]);
  
  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, transactionPage, transactionPageSize, txAccountFilter, searchText]);

  const loadEventFinancials = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 🆕 从 financeEvents 加载实际活动数据并转换为财务汇总格式
      const financeEventsList = await getAllFinanceEvents();
      
      // 🔑 获取所有活动财务交易记录
      const allEventTransactions = await getTransactions({
        page: 1,
        limit: 1000, // 获取所有交易记录
        category: 'event-finance',
        includeVirtual: true, // 包含子交易
        sortBy: 'transactionDate',
        sortOrder: 'desc',
      });
      
      // 🆕 转换为 EventFinancialSummary 格式并统计实际财务数据
      const eventFinancials: EventFinancialSummary[] = await Promise.all(
        financeEventsList.map(async (event) => {
          // 🔑 筛选该活动的交易记录
          const eventTransactions = allEventTransactions.data.filter(
            t => t.txAccount === event.eventName
          );
          
          // 🔑 计算该活动的财务统计
          const totalRevenue = eventTransactions
            .filter(t => t.transactionType === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
          const totalExpense = eventTransactions
            .filter(t => t.transactionType === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
          const netIncome = totalRevenue - totalExpense;
          
          return {
            eventId: event.id,
            eventName: event.eventName,
            eventDate: event.eventDate || new Date().toISOString(),
            boardMember: event.boardMember, // 🆕 添加负责理事
            totalRevenue, // ✅ 从交易记录统计
            totalExpense, // ✅ 从交易记录统计
            netIncome, // ✅ 计算净收入
            budgetedRevenue: 0,
            budgetedExpense: 0,
            status: event.status === 'planned' ? 'planned' : 
                    event.status === 'active' ? 'active' : 
                    event.status === 'completed' ? 'completed' : 'planned',
          };
        })
      );
      
      // 🆕 应用筛选逻辑
      let filteredEvents = eventFinancials;

      // 年份筛选
      if (selectedYear !== 'all') {
        filteredEvents = filteredEvents.filter(event => {
          const eventYear = event.eventDate ? new Date(event.eventDate).getFullYear() : new Date().getFullYear();
          const targetYear = parseInt(selectedYear.replace('FY', ''));
          return eventYear === targetYear;
        });
      }

      // 负责理事筛选
      if (selectedBoardMember !== 'all') {
        filteredEvents = filteredEvents.filter(event => event.boardMember === selectedBoardMember);
      }

      // 活动状态筛选
      if (selectedEventStatus !== 'all') {
        filteredEvents = filteredEvents.filter(event => event.status === selectedEventStatus);
      }

      // 活动类型筛选（基于活动名称关键词）
      if (selectedEventType !== 'all') {
        filteredEvents = filteredEvents.filter(event => {
          const eventName = event.eventName.toLowerCase();
          switch (selectedEventType) {
            case 'training':
              return eventName.includes('培训') || eventName.includes('training');
            case 'networking':
              return eventName.includes('联谊') || eventName.includes('networking');
            case 'conference':
              return eventName.includes('会议') || eventName.includes('conference');
            case 'social':
              return eventName.includes('社交') || eventName.includes('social');
            case 'charity':
              return eventName.includes('慈善') || eventName.includes('charity');
            default:
              return true;
          }
        });
      }

      // 财务状态筛选
      if (financialStatusFilter !== 'all') {
        filteredEvents = filteredEvents.filter(event => {
          switch (financialStatusFilter) {
            case 'profitable':
              return event.netIncome > 0;
            case 'break-even':
              return event.netIncome === 0;
            case 'loss':
              return event.netIncome < 0;
            case 'pending':
              return event.totalRevenue === 0 && event.totalExpense === 0;
            default:
              return true;
          }
        });
      }

      // 搜索文本筛选（扩展到金额和状态）
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase().trim();
        filteredEvents = filteredEvents.filter(event => {
          // 基础字段搜索
          const matchesBasicFields = (
            event.eventName.toLowerCase().includes(searchLower) ||
            (event.boardMember && event.boardMember.toLowerCase().includes(searchLower)) ||
            event.eventDate.includes(searchLower)
          );
          
          // 🆕 金额搜索（转换为字符串进行匹配）
          const matchesAmount = (
            event.totalRevenue.toString().includes(searchLower) ||
            event.totalExpense.toString().includes(searchLower) ||
            event.netIncome.toString().includes(searchLower)
          );
          
          // 🆕 状态搜索
          const statusText = event.status === 'planned' ? '策划中' :
                            event.status === 'active' ? '进行中' :
                            event.status === 'completed' ? '已完成' :
                            event.status === 'cancelled' ? '已取消' : '';
          const matchesStatus = statusText.toLowerCase().includes(searchLower);
          
          return matchesBasicFields || matchesAmount || matchesStatus;
        });
      }

      setEvents(filteredEvents);
      
      // Calculate statistics from filtered events
      const stats = filteredEvents.reduce((acc, event) => ({
        totalRevenue: acc.totalRevenue + event.totalRevenue,
        totalExpense: acc.totalExpense + event.totalExpense,
        netIncome: acc.netIncome + event.netIncome,
        outstandingPayments: acc.outstandingPayments,
      }), { totalRevenue: 0, totalExpense: 0, netIncome: 0, outstandingPayments: 0 });
      
      setStatistics(stats);
      
      // 🆕 按负责理事分组（使用筛选后的事件）
      const grouped = filteredEvents.reduce((acc, event) => {
        const boardMember = event.boardMember || '未设置';
        if (!acc[boardMember]) {
          acc[boardMember] = [];
        }
        acc[boardMember].push(event);
        return acc;
      }, {} as Record<string, EventFinancialSummary[]>);
      
      setGroupedEvents(grouped);
      setStatistics(stats);
    } catch (error: any) {
      message.error('加载活动财务数据失败');
      globalSystemService.log('error', 'Failed to load event financials', 'EventFinancialPage', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = async (eventId: string) => {
    const eventData = events.find(e => e.eventId === eventId);
    if (!eventData) return;
    
    setSelectedEventDetail(eventData);
    setEventDetailDrawerVisible(true);
    
    // 加载该活动的所有交易记录
    await loadEventTransactions(eventData.eventName);
  };
  
  // 加载特定活动的交易记录
  const loadEventTransactions = async (eventName: string) => {
    try {
      setEventTransactionsLoading(true);
      
      const result = await getTransactions({
        page: 1,
        limit: 100, // 加载所有交易
        category: 'event-finance',
        txAccount: eventName, // 🔑 按活动名称过滤
        sortBy: 'transactionDate',
        sortOrder: 'desc',
        includeVirtual: true,
      });
      
      setEventTransactions(result.data);
    } catch (error: any) {
      message.error('加载活动交易记录失败');
      globalSystemService.log('error', 'Failed to load event transactions', 'EventFinancialPage', { error });
    } finally {
      setEventTransactionsLoading(false);
    }
  };
  
  // 加载活动列表
  const loadFinanceEvents = async () => {
    try {
      const events = await getAllFinanceEvents();
      setFinanceEvents(events);
    } catch (error: any) {
      message.error('加载活动列表失败');
      globalSystemService.log('error', 'Failed to load finance events', 'EventFinancialPage', { error });
    }
  };
  
  // 🆕 加载活跃会员列表
  const loadActiveMembers = async () => {
    try {
      const members = await getAllActiveMembers();
      setActiveMembers(members);
    } catch (error: any) {
      message.error('加载会员列表失败');
      globalSystemService.log('error', 'Failed to load active members', 'EventFinancialPage', { error });
    }
  };
  
  // 🆕 开始编辑活动
  const handleStartEditEvent = () => {
    if (!selectedEventDetail) return;
    
    const event = financeEvents.find(e => e.eventName === selectedEventDetail.eventName);
    if (!event) return;
    
    setEditEventName(event.eventName);
    setEditEventDate(event.eventDate || '');
    setEditEventDescription(event.description || '');
    setEditEventBoardMember(event.boardMember);
    setEditEventChair(event.eventChair || '');
    setEditEventTreasurer(event.eventTreasurer || '');
    setEditEventStatus(event.status);
    setEditingEvent(true);
  };
  
  // 🆕 保存活动编辑
  const handleSaveEditEvent = async () => {
    if (!user || !selectedEventDetail) return;
    
    if (!editEventName.trim()) {
      message.error('请输入活动名称');
      return;
    }
    
    if (!editEventBoardMember) {
      message.error('请选择活动负责理事');
      return;
    }
    
    try {
      const event = financeEvents.find(e => e.eventName === selectedEventDetail.eventName);
      if (!event) return;
      
      await updateFinanceEvent(
        event.id,
        {
          eventName: editEventName.trim(),
          eventDate: editEventDate || undefined,
          description: editEventDescription || undefined,
          boardMember: editEventBoardMember as any,
          eventChair: editEventChair.trim() || undefined,
          eventTreasurer: editEventTreasurer.trim() || undefined,
          status: editEventStatus,
        },
        user.id
      );
      
      message.success('活动信息已更新');
      setEditingEvent(false);
      loadFinanceEvents(); // 重新加载活动列表
      loadEventFinancials(); // 重新加载财务数据
    } catch (error: any) {
      message.error('更新活动失败');
      globalSystemService.log('error', 'Failed to update finance event', 'EventFinancialPage', { error });
    }
  };
  
  // 🆕 取消编辑活动
  const handleCancelEditEvent = () => {
    setEditingEvent(false);
  };
  
  // 创建活动
  const handleCreateEvent = async () => {
    if (!user) return;
    
    if (!newEventName.trim()) {
      message.error('请输入活动名称');
      return;
    }
    
    if (!newEventBoardMember) {
      message.error('请选择活动负责理事');
      return;
    }
    
    try {
      await createFinanceEvent(
        {
          eventName: newEventName.trim(),
          eventDate: newEventDate || undefined,
          description: newEventDescription || undefined,
          boardMember: newEventBoardMember as any,
          eventChair: newEventChair.trim() || undefined, // 🆕 活动主席
          eventTreasurer: newEventTreasurer.trim() || undefined, // 🆕 活动财政
          status: 'planned',
        },
        user.id
      );
      
      message.success('活动创建成功');
      setCreateEventModalVisible(false);
      setNewEventName('');
      setNewEventDate('');
      setNewEventDescription('');
      setNewEventBoardMember('');
      setNewEventChair(''); // 🆕 重置活动主席
      setNewEventTreasurer(''); // 🆕 重置活动财政
      loadFinanceEvents(); // 重新加载活动列表
    } catch (error: any) {
      message.error('创建活动失败');
      globalSystemService.log('error', 'Failed to create finance event', 'EventFinancialPage', { error });
    }
  };
  
  // 加载活动财务相关交易
  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      setTransactionsLoading(true);
      
      const result = await getTransactions({
        page: transactionPage,
        limit: transactionPageSize,
        category: 'event-finance',
        txAccount: txAccountFilter !== 'all' ? txAccountFilter : undefined,
        sortBy: 'transactionDate',
        sortOrder: 'desc',
        includeVirtual: true, // 🔑 包含子交易（拆分的活动财务）
      });
      
      // 🆕 Step 1: 先加载会员信息缓存（用于搜索）
      const uniqueMemberIds = Array.from(
        new Set(
          result.data
            .map(t => (t as any)?.metadata?.memberId as string | undefined)
            .filter(Boolean)
        )
      );
      
      let tempMemberCache: Record<string, { name: string; email?: string; phone?: string }> = {};
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
        
        tempMemberCache = memberCache;
        setMemberInfoCache(memberCache);
      }
      
      // 🆕 Step 2: 搜索文本筛选（扩展到描述、金额、活动分类、关联会员）
      let filteredTransactions = result.data;
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase().trim();
        filteredTransactions = filteredTransactions.filter(tx => {
          // 基础字段搜索：描述
          const matchesDescription = (
            tx.mainDescription?.toLowerCase().includes(searchLower) ||
            tx.subDescription?.toLowerCase().includes(searchLower)
          );
          
          // 🆕 金额搜索
          const matchesAmount = (
            tx.amount?.toString().includes(searchLower)
          );
          
          // 🆕 活动分类搜索（txAccount/subCategory）
          const matchesCategory = (
            tx.txAccount?.toLowerCase().includes(searchLower) ||
            (tx as any).subCategory?.toLowerCase().includes(searchLower)
          );
          
          // 🆕 其他基础字段
          const matchesOtherFields = (
            tx.payerPayee?.toLowerCase().includes(searchLower) ||
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
          
          return matchesDescription || matchesAmount || matchesCategory || matchesOtherFields || matchesMemberInfo;
        });
      }
      
      setTransactions(filteredTransactions);
      setTransactionTotal(filteredTransactions.length);
    } catch (error: any) {
      message.error('加载交易记录失败');
      globalSystemService.log('error', 'Failed to load event finance transactions', 'EventFinancialPage', { error });
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  // 打开分类模态框
  const handleClassify = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    
    // 🆕 预填活动选择
    setModalSelectedEvent(transaction.txAccount || '');
    
    // 🆕 预填会员信息或付款人信息
    const existingMemberId = (transaction as any)?.metadata?.memberId as string | undefined;
    const existingPayerPayee = transaction.payerPayee || '';
    
    setModalPayerPayee(existingPayerPayee);
    
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
    
    // 验证必填项
    if (!modalSelectedEvent.trim()) {
      message.warning('请选择活动分类');
      return;
    }
    
    try {
      // 🆕 查找对应的活动，获取 eventId
      const selectedEvent = financeEvents.find(e => e.eventName === modalSelectedEvent);
      
      // 🆕 构建更新数据，包含 metadata.eventId 和乙方信息
      const updateData: any = { txAccount: modalSelectedEvent };
      
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
      
      if (selectedEvent) {
        updateData.metadata = {
          ...selectedTransaction.metadata,
          eventId: selectedEvent.id,
          eventName: selectedEvent.eventName,
          eventDate: selectedEvent.eventDate,
          // 🆕 添加会员ID（如果选择了会员）
          ...(modalSelectedMemberId && { memberId: modalSelectedMemberId }),
        };
        console.log('🔗 [EventFinancialPage] Setting metadata for event:', {
          eventId: selectedEvent.id,
          eventName: selectedEvent.eventName,
          memberId: modalSelectedMemberId || 'none',
          payerPayee: finalPayerPayee || 'none',
        });
      }
      
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
      setModalSelectedEvent('');
      setMemberSearchOptions([]);
      loadTransactions();
    } catch (error: any) {
      message.error('更新分类失败');
      globalSystemService.log('error', 'Failed to classify transaction', 'EventFinancialPage', { error });
    }
  };

  // 批量分类
  const handleBatchClassify = async (eventName: string) => {
    if (!user) return;
    
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要分类的交易');
      return;
    }
    
    try {
      // 🆕 查找对应的活动，获取 eventId
      const selectedEvent = financeEvents.find(e => e.eventName === eventName);
      
      // 批量更新所有选中的交易
      for (const transactionId of selectedRowKeys) {
        // 🆕 构建更新数据，包含 metadata.eventId
        const updateData: any = { txAccount: eventName };
        
        if (selectedEvent) {
          updateData.metadata = {
            eventId: selectedEvent.id,
            eventName: selectedEvent.eventName,
            eventDate: selectedEvent.eventDate,
          };
        }
        
        await updateTransaction(
          transactionId as string,
          updateData,
          user.id
        );
      }
      
      message.success(`成功将 ${selectedRowKeys.length} 笔交易分类到【${eventName}】`);
      setBatchClassifyModalVisible(false);
      setSelectedRowKeys([]);
      loadTransactions();
    } catch (error: any) {
      message.error('批量分类失败');
      globalSystemService.log('error', 'Failed to batch classify transactions', 'EventFinancialPage', { error });
    }
  };

  // 理事团队成员映射
  const boardMemberLabels: Record<string, string> = {
    'president': 'President',
    'secretary': 'Secretary',
    'honorary-treasurer': 'Honorary Treasurer',
    'general-legal-council': 'General Legal Council',
    'executive-vp': 'Executive VP',
    'vp-individual': 'VP Individual',
    'vp-community': 'VP Community',
    'vp-business': 'VP Business',
    'vp-international': 'VP International',
    'vp-lom': 'VP LOM',
    'immediate-past-president': 'Immediate Past President',
  };

  const columns: ColumnsType<EventFinancialSummary> = [
    {
      title: '活动名称',
      dataIndex: 'eventName',
      key: 'eventName',
      width: 200,
    },
    {
      title: '活动主席',
      dataIndex: 'eventChair',
      key: 'eventChair',
      width: 140,
      render: (_: string, record: EventFinancialSummary) => {
        const event = financeEvents.find(e => e.eventName === record.eventName);
        const chair = event?.eventChair;
        return chair ? <Tag color="blue">{chair}</Tag> : <Tag color="default">未设置</Tag>;
      },
    },
    {
      title: '活动财政',
      dataIndex: 'eventTreasurer',
      key: 'eventTreasurer',
      width: 140,
      render: (_: string, record: EventFinancialSummary) => {
        const event = financeEvents.find(e => e.eventName === record.eventName);
        const treasurer = event?.eventTreasurer;
        return treasurer ? <Tag color="green">{treasurer}</Tag> : <Tag color="default">未设置</Tag>;
      },
    },
    {
      title: '活动日期',
      dataIndex: 'eventDate',
      key: 'eventDate',
      width: 110,
      render: (date: string) => globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '总收入',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 120,
      align: 'right',
      render: (amount: number) => (
        <span className="text-success font-semibold">
          RM {amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: '总支出',
      dataIndex: 'totalExpense',
      key: 'totalExpense',
      width: 120,
      align: 'right',
      render: (amount: number) => (
        <span className="text-danger font-semibold">
          RM {amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: '净收入',
      dataIndex: 'netIncome',
      key: 'netIncome',
      width: 120,
      align: 'right',
      render: (amount: number) => (
        <span className={amount >= 0 ? 'text-success' : 'text-danger'}>
          RM {amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          completed: { color: 'success', text: '已完成' },
          active: { color: 'processing', text: '进行中' },
          planned: { color: 'default', text: '计划中' },
        };
        const config = statusConfig[status] || statusConfig.planned;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => handleEventSelect(record.eventId)}>
          查看详情
        </Button>
      ),
    },
  ];
  
  // 交易记录表格列
  const transactionColumns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
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
                backgroundColor: '#f0f9ff', 
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
      title: '活动分类',
      dataIndex: 'txAccount',
      key: 'txAccount',
      width: 150,
      render: (subCat: string) => {
        if (!subCat) {
          return <Tag color="default">未分类</Tag>;
        }
        
        return (
          <Tag color="blue">
            {subCat}
          </Tag>
        );
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <div className="event-financial-page">
        {/* 第一行：统计卡片 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总活动收入"
                  value={statistics.totalRevenue}
                  precision={2}
                  prefix="RM"
                  suffix={<RiseOutlined style={{ color: '#3f8600' }} />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总活动支出"
                  value={statistics.totalExpense}
                  precision={2}
                  prefix="RM"
                  suffix={<FallOutlined style={{ color: '#cf1322' }} />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="净活动收入"
                  value={statistics.netIncome}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="未付款项"
                  value={statistics.outstandingPayments}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#faad14' }}
                />
                <Button type="primary" size="small" className="mt-2" block>
                  发送提醒
                </Button>
              </Card>
            </Col>
          </Row>

        {/* 第二行：左侧筛选 + 右侧搜索和标签页 */}
        <Row gutter={16}>
          {/* 左侧筛选卡片 */}
          <Col xs={24} lg={6}>
            <Card title="🎯 活动筛选" style={{ position: 'sticky', top: 16 }}>
              {/* 年份筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>📅 年份</div>
                <Select
                  style={{ width: '100%' }}
                  value={selectedYear}
                  onChange={setSelectedYear}
                  placeholder="选择年份"
                >
                  <Option value="all">所有年份</Option>
                  <Option value="FY2025">2025财年</Option>
                  <Option value="FY2024">2024财年</Option>
                  <Option value="FY2023">2023财年</Option>
                </Select>
        </div>

              {/* 负责理事筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>🏢 负责理事</div>
                <Select
                  style={{ width: '100%' }}
                  value={selectedBoardMember}
                  onChange={setSelectedBoardMember}
                  placeholder="选择负责理事"
                >
                  <Option value="all">所有理事</Option>
                  <Option value="President">会长</Option>
                  <Option value="Vice President">副会长</Option>
                  <Option value="Secretary">秘书长</Option>
                  <Option value="Treasurer">财政</Option>
                  <Option value="Director">理事</Option>
                </Select>
              </div>
              
              {/* 活动状态筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>📈 活动状态</div>
                <Select
                  style={{ width: '100%' }}
                  value={selectedEventStatus}
                  onChange={setSelectedEventStatus}
                  placeholder="选择状态"
                >
                  <Option value="all">所有状态</Option>
                  <Option value="planned">🔄 策划中</Option>
                  <Option value="active">✅ 进行中</Option>
                  <Option value="completed">✅ 已完成</Option>
                  <Option value="cancelled">❌ 已取消</Option>
                </Select>
              </div>
              
              {/* 活动类型筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>🎭 活动类型</div>
                <Select
                  style={{ width: '100%' }}
                  value={selectedEventType}
                  onChange={setSelectedEventType}
                  placeholder="选择类型"
                >
                  <Option value="all">所有类型</Option>
                  <Option value="training">📚 培训活动</Option>
                  <Option value="networking">🤝 联谊活动</Option>
                  <Option value="conference">🏛️ 会议活动</Option>
                  <Option value="social">🎉 社交活动</Option>
                  <Option value="charity">❤️ 慈善活动</Option>
                </Select>
              </div>
              
              {/* 财务状态筛选 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>📊 财务状态</div>
                <Select
                  style={{ width: '100%' }}
                  value={financialStatusFilter}
                  onChange={setFinancialStatusFilter}
                  placeholder="选择财务状态"
                >
                  <Option value="all">所有状态</Option>
                  <Option value="profitable">💰 盈利</Option>
                  <Option value="break-even">⚖️ 持平</Option>
                  <Option value="loss">📉 亏损</Option>
                  <Option value="pending">⏳ 待结算</Option>
                </Select>
              </div>
              
              {/* 交易账户筛选（仅交易记录标签页显示） */}
              {activeTab === 'transactions' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>🏦 交易账户</div>
                  <Select
                    style={{ width: '100%' }}
                    value={txAccountFilter}
                    onChange={setTxAccountFilter}
                    placeholder="选择活动"
                  >
                    <Option value="all">所有活动</Option>
                    <Option value="uncategorized">未分类交易</Option>
                    <Option value="year-2025">2025年交易</Option>
                    <Option value="year-2024">2024年交易</Option>
                    {financeEvents.map(event => (
                      <Option key={event.id} value={event.eventName}>
                        {event.eventName}
                      </Option>
                    ))}
                  </Select>
          </div>
        )}
              
              {/* 快速筛选按钮 */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => {
                    setSelectedYear('all');
                    setSelectedBoardMember('all');
                    setSelectedEventStatus('all');
                    setSelectedEventType('all');
                    setFinancialStatusFilter('all');
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
          
          {/* 右侧搜索和标签页区域 */}
          <Col xs={24} lg={18}>
            {/* 搜索输入框 */}
            <Card style={{ marginBottom: 16 }}>
              <Input
                placeholder={
                  activeTab === 'events'
                    ? "搜索活动名称、负责理事、金额、状态..."
                    : "搜索交易描述、金额、活动分类、关联会员..."
                }
                style={{ width: '100%' }}
                suffix={<SearchOutlined />}
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Card>

            {/* 活动财务标签页 */}
            <Card>
        {/* 标签页切换 */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'events' | 'transactions')}
            tabBarExtraContent={
              activeTab === 'events' && (
                      <Space>
                        <Button icon={<DownloadOutlined />}>导出 CSV</Button>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => setCreateEventModalVisible(true)}
                  >
                    创建活动
                        </Button>
                      </Space>
              )
            }
            items={[
              {
                key: 'events',
                label: '活动财务列表',
                children: (
                  <Card>
                    {loading ? (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div>
                        {Object.entries(groupedEvents).map(([boardMember, boardEvents]) => (
                          <div key={boardMember} style={{ marginBottom: 24 }}>
                            {/* 分组标题 */}
                            <div style={{ 
                              background: '#f5f5f5', 
                              padding: '12px 16px', 
                              marginBottom: 16,
                              borderRadius: 6,
                              borderLeft: '4px solid #1890ff'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Tag color="purple" style={{ fontSize: 14, fontWeight: 'bold' }}>
                                    {boardMemberLabels[boardMember] || boardMember}
                                  </Tag>
                                  <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                                    负责理事
                                  </span>
                                </div>
                                <div style={{ fontSize: 14, color: '#666' }}>
                                  共 {boardEvents.length} 个活动
                                </div>
                              </div>
                            </div>
                            
                            {/* 该理事的活动表格 */}
                    <Table
                      {...tableConfig}
                      columns={columns}
                              dataSource={boardEvents}
                      rowKey="eventId"
                              pagination={false}
                              size="small"
                              style={{ marginBottom: 16 }}
                            />
                          </div>
                        ))}
                        
                        {Object.keys(groupedEvents).length === 0 && (
                          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            暂无活动数据
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ),
              },
              {
                key: 'transactions',
                label: '活动财务交易记录（二次分类）',
                children: (
                    <Card 
                      title="活动财务交易记录"
                      extra={
                        <Space>
                          <span style={{ color: '#999' }}>已选 {selectedRowKeys.length} 条</span>
                          <Button
                            type="primary"
                            disabled={selectedRowKeys.length === 0}
                            onClick={() => setBatchClassifyModalVisible(true)}
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
                          selectedRowKeys,
                          onChange: setSelectedRowKeys,
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

        {/* 分类模态框 */}
        <Modal
          title="交易二次分类"
          open={classifyModalVisible}
          onCancel={() => {
            setClassifyModalVisible(false);
            setSelectedTransaction(null);
            setModalSelectedMemberId('');
            setModalPayerPayee('');
            setModalSelectedEvent('');
            setModalYearFilter('all');
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
                {/* 年份筛选 */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 8 }}>筛选年份：</p>
                  <Select
                    style={{ width: '100%' }}
                    value={modalYearFilter}
                    onChange={setModalYearFilter}
                    placeholder="选择年份"
                  >
                    <Option value="all">所有年份</Option>
                    <Option value="2025">2025年</Option>
                    <Option value="2024">2024年</Option>
                    <Option value="2023">2023年</Option>
                  </Select>
                </div>

                {/* 活动选择下拉 */}
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 8 }}>选择活动分类：</p>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="请选择活动"
                    value={modalSelectedEvent || undefined}
                    onChange={setModalSelectedEvent}
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={
                      financeEvents
                        .filter(event => {
                          // 根据年份筛选活动
                          if (modalYearFilter === 'all') return true;
                          const eventYear = event.eventDate 
                            ? new Date(event.eventDate).getFullYear().toString()
                            : '';
                          return eventYear === modalYearFilter;
                        })
                        .map(event => ({
                          value: event.eventName,
                          label: event.eventDate 
                            ? `${event.eventName} (${globalDateService.formatDate(new Date(event.eventDate), 'display')})`
                            : event.eventName,
                        }))
                    }
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <div style={{ borderTop: '1px solid #f0f0f0', padding: 8 }}>
                <Button 
                            type="dashed" 
                  block 
                            icon={<PlusOutlined />}
                            onClick={() => {
                              setClassifyModalVisible(false);
                              setCreateEventModalVisible(true);
                            }}
                          >
                            创建新活动
                </Button>
                        </div>
                      </>
                    )}
                  />
                </div>
                
                {/* 🆕 确认保存按钮 */}
                <Button 
                  type="primary"
                  block 
                  size="large"
                  style={{ marginTop: 16 }}
                  onClick={handleClassifySubmit}
                  disabled={!modalSelectedEvent}
                >
                  确认保存
                </Button>
              </div>
            </>
          )}
        </Modal>

        {/* 批量分类模态框 */}
        <Modal
          title={`批量分类（已选 ${selectedRowKeys.length} 笔交易）`}
          open={batchClassifyModalVisible}
          onCancel={() => {
            setBatchClassifyModalVisible(false);
          }}
          footer={null}
          width={500}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 'bold', marginBottom: 8 }}>选择活动分类：</p>
                <Button 
                type="dashed" 
                  block 
                icon={<PlusOutlined />}
                onClick={() => {
                  setBatchClassifyModalVisible(false);
                  setCreateEventModalVisible(true);
                }}
                style={{ marginBottom: 12 }}
              >
                创建新活动
                </Button>
            </div>
            
            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              {financeEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  暂无活动，请先创建活动
                </div>
              ) : (
                financeEvents.map(event => (
                <Button 
                    key={event.id}
                  block 
                  size="large"
                    onClick={() => handleBatchClassify(event.eventName)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span>{event.eventName}</span>
                      {event.eventDate && (
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>
                          {globalDateService.formatDate(new Date(event.eventDate), 'display')}
                        </span>
                      )}
                    </div>
                </Button>
                ))
              )}
            </div>
          </div>
        </Modal>

        {/* 创建活动模态框 */}
        <Modal
          title="创建新活动"
          open={createEventModalVisible}
          onCancel={() => {
            setCreateEventModalVisible(false);
            setNewEventName('');
            setNewEventDate('');
            setNewEventDescription('');
            setNewEventBoardMember('');
            setNewEventChair(''); // 🆕 重置活动主席
            setNewEventTreasurer(''); // 🆕 重置活动财政
          }}
          onOk={handleCreateEvent}
          okText="创建"
          cancelText="取消"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                活动名称 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="例如：新年晚会、商业论坛"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                活动日期
              </label>
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                活动负责理事 <span style={{ color: 'red' }}>*</span>
              </label>
              <Select
                style={{ width: '100%' }}
                placeholder="选择负责理事"
                value={newEventBoardMember || undefined}
                onChange={(value) => setNewEventBoardMember(value)}
              >
                <Option value="president">President（会长）</Option>
                <Option value="secretary">Secretary（秘书）</Option>
                <Option value="honorary-treasurer">Honorary Treasurer（名誉司库）</Option>
                <Option value="general-legal-council">General Legal Council（法律顾问）</Option>
                <Option value="executive-vp">Executive Vice President（执行副会长）</Option>
                <Option value="vp-individual">VP Individual（个人发展副会长）</Option>
                <Option value="vp-community">VP Community（社区发展副会长）</Option>
                <Option value="vp-business">VP Business（商业发展副会长）</Option>
                <Option value="vp-international">VP International（国际事务副会长）</Option>
                <Option value="vp-lom">VP LOM（地方组织副会长）</Option>
                <Option value="immediate-past-president">Immediate Past President（卸任会长）</Option>
              </Select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                活动主席
              </label>
              <Select
                style={{ width: '100%' }}
                placeholder="选择活动主席"
                value={newEventChair || undefined}
                onChange={(value) => setNewEventChair(value)}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
                }
              >
                {activeMembers.map(member => (
                  <Option key={member.id} value={member.name}>
                    {member.name} ({member.email})
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                活动财政
              </label>
              <Select
                style={{ width: '100%' }}
                placeholder="选择活动财政"
                value={newEventTreasurer || undefined}
                onChange={(value) => setNewEventTreasurer(value)}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
                }
              >
                {activeMembers.map(member => (
                  <Option key={member.id} value={member.name}>
                    {member.name} ({member.email})
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                活动描述
              </label>
              <textarea
                placeholder="简单描述活动内容"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        </Modal>

        {/* 活动详情Drawer */}
        <Drawer
          title="活动详情"
          placement="right"
          width={720}
          open={eventDetailDrawerVisible}
          onClose={() => {
            setEventDetailDrawerVisible(false);
            setSelectedEventDetail(null);
            setEventTransactions([]);
            setEditingEvent(false); // 🆕 重置编辑状态
          }}
        >
          {selectedEventDetail && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* 基本信息 */}
              <Card 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>基本信息</span>
                    {!editingEvent && (
                <Button 
                        type="primary" 
                        size="small" 
                        onClick={handleStartEditEvent}
                      >
                        编辑
                </Button>
                    )}
                  </div>
                } 
                size="small"
              >
                {editingEvent ? (
                  // 🆕 编辑模式
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                        活动名称 <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editEventName}
                        onChange={(e) => setEditEventName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                        活动日期
                      </label>
                      <input
                        type="date"
                        value={editEventDate}
                        onChange={(e) => setEditEventDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                        负责理事 <span style={{ color: 'red' }}>*</span>
                      </label>
                      <Select
                        style={{ width: '100%' }}
                        value={editEventBoardMember}
                        onChange={(value) => setEditEventBoardMember(value)}
                      >
                        <Option value="president">President（会长）</Option>
                        <Option value="secretary">Secretary（秘书）</Option>
                        <Option value="honorary-treasurer">Honorary Treasurer（名誉司库）</Option>
                        <Option value="general-legal-council">General Legal Council（法律顾问）</Option>
                        <Option value="executive-vp">Executive Vice President（执行副会长）</Option>
                        <Option value="vp-individual">VP Individual（个人发展副会长）</Option>
                        <Option value="vp-community">VP Community（社区发展副会长）</Option>
                        <Option value="vp-business">VP Business（商业发展副会长）</Option>
                        <Option value="vp-international">VP International（国际事务副会长）</Option>
                        <Option value="vp-lom">VP LOM（地方组织副会长）</Option>
                        <Option value="immediate-past-president">Immediate Past President（卸任会长）</Option>
                      </Select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                        活动主席
                      </label>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="选择活动主席"
                        value={editEventChair || undefined}
                        onChange={(value) => setEditEventChair(value)}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
                        }
                      >
                        {activeMembers.map(member => (
                          <Option key={member.id} value={member.name}>
                            {member.name} ({member.email})
                          </Option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                        活动财政
                      </label>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="选择活动财政"
                        value={editEventTreasurer || undefined}
                        onChange={(value) => setEditEventTreasurer(value)}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
                        }
                      >
                        {activeMembers.map(member => (
                          <Option key={member.id} value={member.name}>
                            {member.name} ({member.email})
                          </Option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                        状态
                      </label>
                      <Select
                        style={{ width: '100%' }}
                        value={editEventStatus}
                        onChange={(value) => setEditEventStatus(value)}
                      >
                        <Option value="planned">计划中</Option>
                        <Option value="active">进行中</Option>
                        <Option value="completed">已完成</Option>
                        <Option value="cancelled">已取消</Option>
                      </Select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                        活动描述
                      </label>
                      <textarea
                        value={editEventDescription}
                        onChange={(e) => setEditEventDescription(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px',
                          fontSize: '14px',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button onClick={handleCancelEditEvent}>
                        取消
                      </Button>
                      <Button type="primary" onClick={handleSaveEditEvent}>
                        保存
                </Button>
              </div>
                  </div>
                ) : (
                  // 🆕 查看模式
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="活动名称">
                      {selectedEventDetail.eventName}
                    </Descriptions.Item>
                    <Descriptions.Item label="活动日期">
                      {globalDateService.formatDate(new Date(selectedEventDetail.eventDate), 'display')}
                    </Descriptions.Item>
                    <Descriptions.Item label="活动主席">
                      {(() => {
                        const event = financeEvents.find(e => e.eventName === selectedEventDetail.eventName);
                        return event?.eventChair || '未设置';
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="负责理事">
                      <Tag color="purple">
                        {boardMemberLabels[selectedEventDetail.boardMember || ''] || selectedEventDetail.boardMember || '未设置'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="活动财政">
                      {(() => {
                        const event = financeEvents.find(e => e.eventName === selectedEventDetail.eventName);
                        return event?.eventTreasurer || '未设置';
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      {(() => {
                        const statusConfig: Record<string, { color: string; text: string }> = {
                          completed: { color: 'success', text: '已完成' },
                          active: { color: 'processing', text: '进行中' },
                          planned: { color: 'default', text: '计划中' },
                          cancelled: { color: 'error', text: '已取消' },
                        };
                        const config = statusConfig[selectedEventDetail.status] || statusConfig.planned;
                        return <Tag color={config.color}>{config.text}</Tag>;
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="活动描述" span={2}>
                      {(() => {
                        const event = financeEvents.find(e => e.eventName === selectedEventDetail.eventName);
                        return event?.description || '暂无描述';
                      })()}
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </Card>

              {/* 财务统计 */}
              <Card title="财务统计" size="small">
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="活动收入"
                      value={eventTransactions
                        .filter(t => t.transactionType === 'income')
                        .reduce((sum, t) => sum + t.amount, 0)}
                      precision={0}
                      prefix="RM"
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="活动支出"
                      value={eventTransactions
                        .filter(t => t.transactionType === 'expense')
                        .reduce((sum, t) => sum + t.amount, 0)}
                      precision={0}
                      prefix="RM"
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="净收益"
                      value={eventTransactions.reduce((sum, t) => 
                        sum + (t.transactionType === 'income' ? t.amount : -t.amount), 0
                      )}
                      precision={0}
                      prefix="RM"
                      valueStyle={{ 
                        color: eventTransactions.reduce((sum, t) => 
                          sum + (t.transactionType === 'income' ? t.amount : -t.amount), 0
                        ) >= 0 ? '#3f8600' : '#cf1322' 
                      }}
                    />
                  </Col>
                </Row>
              </Card>

              {/* 交易记录 */}
              <Card 
                title={`交易记录（共 ${eventTransactions.length} 笔）`} 
                size="small"
              >
                <Table
                  {...globalComponentService.getTableConfig()}
                  columns={[
                    {
                      title: '日期',
                      dataIndex: 'transactionDate',
                      key: 'transactionDate',
                      width: 100,
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
                      ellipsis: true,
                    },
                    {
                      title: '类型',
                      dataIndex: 'transactionType',
                      key: 'transactionType',
                      width: 80,
                      render: (type: string) => (
                        <Tag color={type === 'income' ? 'green' : 'red'}>
                          {type === 'income' ? '收入' : '支出'}
                        </Tag>
                      ),
                    },
                    {
                      title: '金额',
                      dataIndex: 'amount',
                      key: 'amount',
                      width: 120,
                      align: 'right',
                      render: (amount: number, record: Transaction) => {
                        const sign = record.transactionType === 'income' ? '+' : '-';
                        const color = record.transactionType === 'income' ? '#3f8600' : '#cf1322';
                        return (
                          <span style={{ color, fontWeight: 500 }}>
                            {sign}RM {amount.toFixed(2)}
                          </span>
                        );
                      },
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      key: 'status',
                      width: 80,
                      render: (status: string) => {
                        const statusConfig: Record<string, { color: string; text: string }> = {
                          completed: { color: 'success', text: '已完成' },
                          pending: { color: 'warning', text: '待审核' },
                          cancelled: { color: 'default', text: '已取消' },
                        };
                        const config = statusConfig[status] || { color: 'default', text: status };
                        return <Tag color={config.color}>{config.text}</Tag>;
                      },
                    },
                  ]}
                  dataSource={eventTransactions}
                  rowKey="id"
                  loading={eventTransactionsLoading}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: 600 }}
                />
              </Card>
              </div>
          )}
        </Drawer>
          </Col>
        </Row>
      </div>
    </ErrorBoundary>
  );
};

export default EventFinancialPage;

