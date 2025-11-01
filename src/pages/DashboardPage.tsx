import React, { useState, useEffect } from 'react';
import { Card, Row, Col, List, Avatar, Tag, Progress, Select, Button, Tooltip, Badge, message, Tabs, Empty } from 'antd';
import { UserOutlined, CalendarOutlined, DollarOutlined, TrophyOutlined, GiftOutlined, ShopOutlined, HeartOutlined, TeamOutlined, FilterOutlined, CloseCircleOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// Components
import { MetricCard, PermissionGuard } from '@/components';

// Services
import { 
  getMemberStats, 
  getUpcomingBirthdays, 
  getBirthdaysByMonth,
  getIndustryDistribution, 
  getInterestDistribution,
  getMembers
} from '@/modules/member/services/memberService';
import { getMemberFees } from '@/modules/finance/services/memberFeeService';
import { getEvents } from '@/modules/event/services/eventService';
import { getOrCreateEventAccount, getEventAccountTransactions } from '@/modules/event/services/eventAccountService';
import { getEventAccountPlans } from '@/modules/event/services/eventAccountPlanService';
import { getTransactionsByEventId, getTransactions } from '@/modules/finance/services/transactionService';
import { globalDateService } from '@/config/globalDateSettings';

// Types
import type { Member, IndustryType } from '@/modules/member/types';
import type { Event } from '@/modules/event/types';

const { Option } = Select;

// 🆕 缓存配置
const CACHE_CONFIG = {
  EVENT_FINANCIALS_KEY: 'dashboard_event_financials',
  TTL: 10 * 60 * 1000, // 10分钟缓存过期时间
};

// 🆕 缓存工具函数
const cacheUtils = {
  // 保存到缓存
  set: (key: string, data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache:', error);
    }
  },
  
  // 从缓存获取
  get: (key: string, ttl: number) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;
      
      // 检查是否过期
      if (age > ttl) {
        localStorage.removeItem(key);
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.warn('Failed to read cache:', error);
      return null;
    }
  },
  
  // 清除缓存
  clear: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  },
};

/**
 * Dashboard Page
 * 仪表板页面
 */
const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalEvents: 0,
    totalRevenue: 0,
    totalAwards: 0,
    loading: true,
  });

  const [birthdayViewMode, setBirthdayViewMode] = useState<'upcoming' | 'month'>('upcoming');
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month()); // 0-11
  
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Array<{
    id: string;
    name: string;
    birthDate: string;
    daysUntilBirthday?: number;
    day?: number;
    avatar?: string;
  }>>([]);

  const [industryDistribution, setIndustryDistribution] = useState<Array<{
    industry: string;
    count: number;
    percentage: number;
  }>>([]);

  const [interestDistribution, setInterestDistribution] = useState<Array<{
    industry: string;
    count: number;
    percentage: number;
  }>>([]);

  const [listsLoading, setListsLoading] = useState(true);
  
  // 🆕 会员列表相关状态
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [fiscalNewMemberIds, setFiscalNewMemberIds] = useState<Set<string>>(new Set());
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType | null>(null);
  const [selectedAcceptIntl, setSelectedAcceptIntl] = useState<'Yes' | 'No' | 'Willing to explore' | null>(null);
  const [selectedInterest, setSelectedInterest] = useState<IndustryType | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // 🆕 活动相关状态
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEventYear, setSelectedEventYear] = useState<string>(dayjs().year().toString());
  const [cacheUsed, setCacheUsed] = useState(false);
  const [cacheAge, setCacheAge] = useState<number>(0);

  // 🆕 活动财务数据
  const [eventFinancials, setEventFinancials] = useState<Map<string, {
    budgetTotal: number;        // 财务预算总额
    accountIncomeTotal: number; // 活动账户收入总额
    accountExpenseTotal: number; // 活动账户支出总额
    bankIncomeTotal: number;    // 银行交易收入总额
    bankExpenseTotal: number;   // 银行交易支出总额
    netProfit: number;          // 净利润 (账户收入 - 账户支出)
  }>>(new Map());

  // 月份选项
  const monthOptions = [
    { label: '一月 (January)', value: 0 },
    { label: '二月 (February)', value: 1 },
    { label: '三月 (March)', value: 2 },
    { label: '四月 (April)', value: 3 },
    { label: '五月 (May)', value: 4 },
    { label: '六月 (June)', value: 5 },
    { label: '七月 (July)', value: 6 },
    { label: '八月 (August)', value: 7 },
    { label: '九月 (September)', value: 8 },
    { label: '十月 (October)', value: 9 },
    { label: '十一月 (November)', value: 10 },
    { label: '十二月 (December)', value: 11 },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch member statistics
        const memberStats = await getMemberStats();
        
        setStats({
          totalMembers: memberStats.total || 0,
          totalEvents: 0, // TODO: Implement event service
          totalRevenue: 0, // TODO: Implement finance service
          totalAwards: 0, // TODO: Implement award service
          loading: false,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchLists = async () => {
      setListsLoading(true);
      try {
        const [industries, interests] = await Promise.all([
          getIndustryDistribution(selectedAcceptIntl || undefined),
          getInterestDistribution(),
        ]);

        setIndustryDistribution(industries);
        setInterestDistribution(interests);

        // Compare with client-side recompute for diagnostics
        try {
          const clientCounts: Record<string, number> = {};
          let totalWithIndustry = 0;
          members.forEach((m) => {
            // respect acceptInternationalBusiness filter (same as service)
            if (selectedAcceptIntl) {
              const aib = (m as any)?.profile?.acceptInternationalBusiness as string | undefined;
              if (!aib || aib !== selectedAcceptIntl) return;
            }
            const arr = normalizeToStringArray((m as any)?.profile?.ownIndustry ?? (m as any)?.business?.ownIndustry);
            if (arr.length > 0) {
              totalWithIndustry++;
              arr.forEach(ind => { clientCounts[ind] = (clientCounts[ind] || 0) + 1; });
            }
          });
          const clientDist = Object.entries(clientCounts).map(([industry, count]) => ({ industry, count, percentage: totalWithIndustry > 0 ? (count / totalWithIndustry) * 100 : 0 })).sort((a, b) => b.count - a.count);
          // client recompute diagnostics removed in production
        } catch (e) {
          console.warn('🧪 [Dashboard] client recompute failed:', e);
        }
      } catch (error) {
        console.error('Failed to fetch lists:', error);
      } finally {
        setListsLoading(false);
      }
    };

    fetchLists();
  }, [selectedAcceptIntl, members]);

  // 加载生日数据
  useEffect(() => {
    const loadBirthdays = async () => {
      setListsLoading(true);
      try {
        if (birthdayViewMode === 'upcoming') {
          const birthdays = await getUpcomingBirthdays(30);
          setUpcomingBirthdays(birthdays);
        } else {
          const birthdays = await getBirthdaysByMonth(selectedMonth);
          setUpcomingBirthdays(birthdays);
        }
      } catch (error) {
        console.error('Failed to fetch birthdays:', error);
      } finally {
        setListsLoading(false);
      }
    };

    loadBirthdays();
  }, [birthdayViewMode, selectedMonth]);

  // 🆕 加载会员列表
  useEffect(() => {
    const loadMembers = async () => {
      setMembersLoading(true);
      try {
        // 加载全量会员以与行业分布统计口径一致 (Firestore最大limit为10000)
        const result = await getMembers({
          page: 1,
          limit: 10000, // Firestore最大限制
        });
        setMembers(result.data);

        // 默认视图：基于“当前年-新会员费(YYYY-new-member-fee)”的已缴成员集合
        try {
          const fy = globalDateService.getCurrentFiscalYearRange();
          const currentYearStr = globalDateService.formatDate(new Date(), 'year');
          const fees = await getMemberFees({ page: 1, limit: 10000 });
          const ids = new Set<string>();
          fees.data.forEach(f => {
            const paid = Number((f as any).paidAmount || 0) > 0;
            const pd = (f as any).paymentDate as string | undefined;
            if (!paid || !pd) return;
            const d = new Date(pd);
            // 优先：按txAccount匹配“YYYY-new-member-fee”
            const txa = (f as any).txAccount as string | undefined;
            const matchByTx = !!txa && txa.startsWith(`${currentYearStr}-new-member-fee`);
            // 兼容：若无txAccount则按财年范围兜底
            if (matchByTx || (d >= fy.start && d <= fy.end)) {
              ids.add((f as any).memberId);
            }
          });
          setFiscalNewMemberIds(ids);
          // 无筛选时默认展示当前财年新会员
          if (!selectedIndustry && !selectedInterest && !selectedMemberId) {
            setFilteredMembers(result.data.filter(m => ids.has(m.id)));
          } else {
            setFilteredMembers(result.data);
          }
        } catch {
          // 回退：无法读取会费则显示全量
        setFilteredMembers(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, []);

  // 🆕 加载活动列表
  useEffect(() => {
    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const now = new Date();
        
        // 加载所有活动
        const result = await getEvents({
          page: 1,
          limit: 1000,
        });

        // 区分即将举办和已结束的活动
        const upcoming: Event[] = [];
        const past: Event[] = [];

        result.data.forEach(event => {
          const eventDate = new Date(event.startDate);
          if (eventDate > now) {
            upcoming.push(event);
          } else {
            past.push(event);
          }
        });

        // 按日期排序
        upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        past.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

        setUpcomingEvents(upcoming);
        setPastEvents(past);

        // 加载所有活动的财务数据
        await loadEventFinancials([...upcoming, ...past]);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // 🆕 加载活动财务数据（带缓存）
  const loadEventFinancials = async (events: Event[], forceRefresh = false) => {
    try {
      // 🆕 尝试从缓存读取
      if (!forceRefresh) {
        const cachedItem = localStorage.getItem(CACHE_CONFIG.EVENT_FINANCIALS_KEY);
        if (cachedItem) {
          try {
            const cacheData = JSON.parse(cachedItem);
            const age = Date.now() - cacheData.timestamp;
            
            // 检查是否过期
            if (age <= CACHE_CONFIG.TTL) {
              console.log(`✅ 从缓存加载活动财务数据 (${Math.floor(age / 1000)}秒前)`);
              setEventFinancials(new Map(Object.entries(cacheData.data)));
              setCacheUsed(true);
              setCacheAge(age);
              
              // 🆕 后台静默刷新（检查缓存年龄，如果超过5分钟则后台更新）
              if (age > 5 * 60 * 1000) {
                console.log('🔄 缓存超过5分钟，后台静默刷新...');
                setTimeout(() => loadEventFinancials(events, true), 2000);
              }
              return;
            } else {
              // 缓存过期，清除
              localStorage.removeItem(CACHE_CONFIG.EVENT_FINANCIALS_KEY);
              console.log('⏰ 缓存已过期，重新加载');
            }
          } catch (error) {
            console.warn('缓存数据解析失败:', error);
          }
        }
      }

      console.log('🔄 从服务器加载活动财务数据...');
      setCacheUsed(false);
      setCacheAge(0);

      const financialsMap = new Map<string, {
        budgetTotal: number;
        accountIncomeTotal: number;
        accountExpenseTotal: number;
        bankIncomeTotal: number;
        bankExpenseTotal: number;
        netProfit: number;
      }>();

      // 为每个活动并行加载财务数据
      await Promise.all(
        events.map(async (event) => {
          try {
            // 1. 获取活动账户（财务预算）
            const account = await getOrCreateEventAccount(event.id, event.name, 'admin');
            const budgetTotal = (account.budgetIncome || 0) + (account.budgetExpense || 0);

            // 2. 获取活动账户交易记录（财务流水）
            const accountTransactions = await getEventAccountTransactions(account.id);
            let accountIncomeTotal = 0;
            let accountExpenseTotal = 0;

            accountTransactions.forEach(tx => {
              if (tx.transactionType === 'income') {
                accountIncomeTotal += tx.amount;
              } else if (tx.transactionType === 'expense') {
                accountExpenseTotal += tx.amount;
              }
            });

            // 3. 获取银行交易记录
            // 🆕 修复：使用 financialAccount 而不是 event.id
            const financialAccountId = event.financialAccount || event.id;
            let bankTransactions = await getTransactionsByEventId(financialAccountId);
            
            // 方式2: 如果没有结果，通过 category='event-finance' 和 txAccount 查询
            if (bankTransactions.length === 0) {
              try {
                const eventFinanceResult = await getTransactions({
                  page: 1,
                  limit: 10000,
                  category: 'event-finance',
                });
                
                // 客户端过滤：通过 txAccount 或 metadata.eventId 匹配
                bankTransactions = eventFinanceResult.data.filter(tx => {
                  const matchByAccount = tx.txAccount === event.name;
                  const matchByMetadataId = (tx.metadata as any)?.eventId === event.id;
                  const matchByMetadataName = (tx.metadata as any)?.eventName === event.name;
                  return matchByAccount || matchByMetadataId || matchByMetadataName;
                });
              } catch (err) {
                console.error('Failed to query event-finance transactions:', err);
              }
            }
            
            let bankIncomeTotal = 0;
            let bankExpenseTotal = 0;

            bankTransactions.forEach(tx => {
              // 🆕 跳过虚拟交易（子交易），避免重复计算
              // 拆分交易：父交易已被拆分，实际金额由子交易体现
              if (tx.isVirtual || tx.parentTransactionId) {
                return;
              }

              // 🆕 统计所有交易（不区分 pending/completed）
              // 原因：仪表板应该显示所有财务活动，无论批准状态
              if (tx.transactionType === 'income') {
                bankIncomeTotal += tx.amount;
              } else if (tx.transactionType === 'expense') {
                bankExpenseTotal += tx.amount;
              }
            });

            // 4. 计算净利润
            const netProfit = accountIncomeTotal - accountExpenseTotal;

            financialsMap.set(event.id, {
              budgetTotal,
              accountIncomeTotal,
              accountExpenseTotal,
              bankIncomeTotal,
              bankExpenseTotal,
              netProfit,
            });
          } catch (error) {
            console.error(`Failed to load financials for event ${event.id}:`, error);
            // 为失败的活动设置默认值
            financialsMap.set(event.id, {
              budgetTotal: 0,
              accountIncomeTotal: 0,
              accountExpenseTotal: 0,
              bankIncomeTotal: 0,
              bankExpenseTotal: 0,
              netProfit: 0,
            });
          }
        })
      );

      setEventFinancials(financialsMap);
      
      // 🆕 保存到缓存
      const cacheData = Object.fromEntries(financialsMap);
      cacheUtils.set(CACHE_CONFIG.EVENT_FINANCIALS_KEY, cacheData);
      setCacheUsed(true);
      setCacheAge(0);
      console.log('💾 活动财务数据已缓存（10分钟有效）');
    } catch (error) {
      console.error('Failed to load event financials:', error);
    }
  };

  // 🆕 工具: 将行业/兴趣字段规范为字符串数组
  const normalizeToStringArray = (value: any): string[] => {
    let base: any[] = [];
    if (Array.isArray(value)) base = value as any[];
    else if (value && typeof value === 'object') base = Object.values(value as Record<string, unknown>);
    else if (typeof value === 'string' && value) base = [value];
    return base.filter((v): v is string => typeof v === 'string' && !!v);
  };

  // 🆕 根据筛选条件过滤会员
  useEffect(() => {
    let filtered = [...members];

    // 按行业筛选
    if (selectedIndustry) {
      filtered = filtered.filter(m => normalizeToStringArray(m.profile?.ownIndustry).includes(selectedIndustry));
    }

    // 按兴趣筛选
    if (selectedInterest) {
      filtered = filtered.filter(m => normalizeToStringArray(m.profile?.interestedIndustries).includes(selectedInterest));
    }

    // 按会员ID筛选(反向筛选)
    if (selectedMemberId) {
      filtered = filtered.filter(m => m.id === selectedMemberId);
    }

    // 无任何筛选条件时，默认显示当前财年新会员集合
    if (!selectedIndustry && !selectedInterest && !selectedMemberId && fiscalNewMemberIds.size > 0) {
      filtered = filtered.filter(m => fiscalNewMemberIds.has(m.id));
    }

    setFilteredMembers(filtered);
  }, [selectedIndustry, selectedInterest, selectedMemberId, members, fiscalNewMemberIds]);

  // 🆕 处理行业点击
  const handleIndustryClick = (industry: string) => {
    if (selectedIndustry === industry) {
      setSelectedIndustry(null); // 取消筛选
    } else {
      setSelectedIndustry(industry as IndustryType);
      setSelectedInterest(null); // 清除兴趣筛选
      setSelectedMemberId(null); // 清除会员筛选
    }
  };

  // 🆕 处理兴趣点击
  const handleInterestClick = (interest: string) => {
    if (selectedInterest === interest) {
      setSelectedInterest(null); // 取消筛选
    } else {
      setSelectedInterest(interest as IndustryType);
      setSelectedIndustry(null); // 清除行业筛选
      setSelectedMemberId(null); // 清除会员筛选
    }
  };

  // 🆕 处理会员点击(反向筛选)
  const handleMemberClick = (member: Member) => {
    if (selectedMemberId === member.id) {
      setSelectedMemberId(null);
      setSelectedIndustry(null);
      setSelectedInterest(null);
    } else {
      setSelectedMemberId(member.id);
      // 反向筛选：如果会员有行业，高亮对应行业
      {
        const industries = normalizeToStringArray(member.profile?.ownIndustry);
        if (industries.length > 0) setSelectedIndustry(industries[0] as any);
      }
      // 反向筛选：如果会员有兴趣，高亮第一个兴趣
      {
        const interests = normalizeToStringArray(member.profile?.interestedIndustries);
        if (interests.length > 0) setSelectedInterest(interests[0] as any);
      }
    }
  };

  // 🆕 清除所有筛选
  const handleClearFilters = () => {
    setSelectedIndustry(null);
    setSelectedInterest(null);
    setSelectedMemberId(null);
  };

  // 🆕 刷新活动数据（活动数据中心专用）
  const handleRefreshEvents = async () => {
    setEventsLoading(true);
    
    // 🆕 清除缓存
    cacheUtils.clear(CACHE_CONFIG.EVENT_FINANCIALS_KEY);
    console.log('🗑️ 已清除活动财务缓存');
    
    try {
      const now = new Date();
      
      // 重新加载活动
      const result = await getEvents({
        page: 1,
        limit: 1000,
      });

      const upcoming: Event[] = [];
      const past: Event[] = [];

      result.data.forEach(event => {
        const eventDate = new Date(event.startDate);
        if (eventDate > now) {
          upcoming.push(event);
        } else {
          past.push(event);
        }
      });

      upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      past.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      setUpcomingEvents(upcoming);
      setPastEvents(past);

      // 强制刷新财务数据
      await loadEventFinancials([...upcoming, ...past], true);
      
      message.success('活动数据已刷新');
    } catch (error) {
      console.error('刷新活动数据失败:', error);
      message.error('刷新失败');
    } finally {
      setEventsLoading(false);
    }
  };

  // 🆕 刷新所有数据（会员数据中心专用）
  const handleRefreshAll = async () => {
    setListsLoading(true);
    setMembersLoading(true);
    
    try {
      // 刷新生日数据
      const birthdaysPromise = (async () => {
        if (birthdayViewMode === 'upcoming') {
          const birthdays = await getUpcomingBirthdays(30);
          setUpcomingBirthdays(birthdays);
        } else {
          const birthdays = await getBirthdaysByMonth(selectedMonth);
          setUpcomingBirthdays(birthdays);
        }
      })();

      // 刷新行业和兴趣分布
      const distributionsPromise = (async () => {
        const [industries, interests] = await Promise.all([
          getIndustryDistribution(selectedAcceptIntl || undefined),
          getInterestDistribution(),
        ]);
        setIndustryDistribution(industries);
        setInterestDistribution(interests);
      })();

      // 刷新会员列表
      const membersPromise = (async () => {
        const result = await getMembers({
          page: 1,
          limit: 10000,
        });
        setMembers(result.data);

        // 重新计算财年新会员
        const fy = globalDateService.getCurrentFiscalYearRange();
        const currentYearStr = globalDateService.formatDate(new Date(), 'year');
        const fees = await getMemberFees({ page: 1, limit: 10000 });
        const ids = new Set<string>();
        fees.data.forEach(f => {
          const paid = Number((f as any).paidAmount || 0) > 0;
          const pd = (f as any).paymentDate as string | undefined;
          if (!paid || !pd) return;
          const d = new Date(pd);
          const txa = (f as any).txAccount as string | undefined;
          const matchByTx = !!txa && txa.startsWith(`${currentYearStr}-new-member-fee`);
          if (matchByTx || (d >= fy.start && d <= fy.end)) {
            ids.add((f as any).memberId);
          }
        });
        setFiscalNewMemberIds(ids);
        
        if (!selectedIndustry && !selectedInterest && !selectedMemberId) {
          setFilteredMembers(result.data.filter(m => ids.has(m.id)));
        } else {
          setFilteredMembers(result.data);
        }
      })();

      await Promise.all([birthdaysPromise, distributionsPromise, membersPromise]);
      message.success('数据已刷新');
    } catch (error) {
      console.error('刷新失败:', error);
      message.error('刷新失败');
    } finally {
      setListsLoading(false);
      setMembersLoading(false);
    }
  };

  // 🆕 导出当前数据
  const handleExport = () => {
    message.info('导出功能开发中');
  };

  // 🆕 获取可用的年份选项（从活动中提取）
  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    [...upcomingEvents, ...pastEvents].forEach(event => {
      const year = dayjs(event.startDate).year().toString();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)); // 降序排列
  }, [upcomingEvents, pastEvents]);

  // 🆕 根据年份过滤 Past Events（useMemo 缓存）
  const filteredPastEvents = React.useMemo(() => {
    if (selectedEventYear === 'all') {
      return pastEvents;
    }
    return pastEvents.filter(event => {
      const eventYear = dayjs(event.startDate).year().toString();
      return eventYear === selectedEventYear;
    });
  }, [pastEvents, selectedEventYear]);

  // 🆕 缓存活动统计计算
  const eventStats = React.useMemo(() => {
    return {
      totalUpcoming: upcomingEvents.length,
      totalPast: pastEvents.length,
      totalFilteredPast: filteredPastEvents.length,
    };
  }, [upcomingEvents.length, pastEvents.length, filteredPastEvents.length]);

  return (
    <PermissionGuard permissions="DASHBOARD_VIEW">
      <div>
      <h1 style={{ marginBottom: 12 }}>欢迎来到 JCI KL 会员管理系统</h1>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            title="会员总数"
            value={stats.totalMembers}
            prefix={<UserOutlined />}
            color="#52c41a"
            loading={stats.loading}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            title="活动总数"
            value={stats.totalEvents}
            prefix={<CalendarOutlined />}
            color="#1890ff"
            loading={stats.loading}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            title="总收入"
            value={stats.totalRevenue}
            suffix="RM"
            prefix={<DollarOutlined />}
            color="#f5222d"
            loading={stats.loading}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            title="奖项数量"
            value={stats.totalAwards}
            prefix={<TrophyOutlined />}
            color="#faad14"
            loading={stats.loading}
          />
        </Col>
      </Row>

      {/* 活动数据中心 */}
      <Card
        title={
          <span>
            📅 活动数据中心
          </span>
        }
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>年份筛选:</span>
            <Select
              size="small"
              value={selectedEventYear}
              onChange={setSelectedEventYear}
              style={{ width: 100 }}
            >
              <Option value="all">全部</Option>
              {availableYears.map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
            {cacheUsed && (
              <Tooltip title={`缓存有效期: ${Math.floor((CACHE_CONFIG.TTL - cacheAge) / 60000)}分钟`}>
                <Tag color="green" style={{ margin: 0 }}>
                  <span style={{ fontSize: 11 }}>💾 缓存加速</span>
                </Tag>
              </Tooltip>
            )}
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRefreshEvents}
              loading={eventsLoading}
            >
              刷新
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => message.info('导出功能开发中')}
            >
              导出
            </Button>
          </div>
        }
        style={{ marginTop: 12 }}
        bodyStyle={{ padding: '16px' }}
      >
        <Tabs
          defaultActiveKey="upcoming"
          items={[
            {
              key: 'upcoming',
              label: (
                <span>
                  <CalendarOutlined style={{ marginRight: 8 }} />
                  Upcoming Events
                </span>
              ),
              children: (
                <Row gutter={[16, 16]} align="stretch">
                  <Col xs={24}>
                    <Card 
                      title={`即将举办的活动列表 (${upcomingEvents.length})`}
                      className="content-card"
                      style={{ height: '100%' }}
                    >
                      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {eventsLoading ? (
                          <div style={{ padding: 40, textAlign: 'center' }}>
                            <div>加载中...</div>
                          </div>
                        ) : upcomingEvents.length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="暂无即将举办的活动"
                          />
                        ) : (
                          <List
                            dataSource={upcomingEvents}
                            renderItem={(event) => {
                              const chairman = event.committeeMembers?.find(m => m.position === '筹委主席');
                              const priceRange = event.isFree 
                                ? 'FREE' 
                                : `RM ${event.pricing.committeePrice} - RM ${event.pricing.regularPrice}`;
                              const financial = eventFinancials.get(event.id);
                              
                              return (
                                <List.Item style={{ padding: '12px 0', display: 'block' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                                    {/* 左侧：活动基本信息 */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</span>
                                        <Tag color="blue">{event.level}</Tag>
                                      </div>
                                      <div style={{ fontSize: 12 }}>
                                        <div style={{ marginTop: 4 }}>
                                          <CalendarOutlined style={{ marginRight: 6 }} />
                                          {dayjs(event.startDate).format('YYYY-MM-DD HH:mm')}
                                        </div>
                                        {event.boardMember && (
                                          <div style={{ marginTop: 4 }}>
                                            <UserOutlined style={{ marginRight: 6 }} />
                                            负责理事: {event.boardMember}
                                          </div>
                                        )}
                                        <div style={{ marginTop: 4 }}>
                                          <TeamOutlined style={{ marginRight: 6 }} />
                                          筹委主席: {chairman?.name || '-'}
                                        </div>
                                        <div style={{ marginTop: 4 }}>
                                          <DollarOutlined style={{ marginRight: 6 }} />
                                          {priceRange}
                                        </div>
                                      </div>
                                    </div>

                                    {/* 右侧：财务对比 */}
                                    {financial && (
                                      <div style={{
                                        minWidth: 320,
                                        padding: '12px 16px',
                                        background: '#f0f5ff',
                                        borderRadius: 6,
                                        border: '1px solid #d9d9d9',
                                      }}>
                                        {/*<div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 10 }}>💰 财务对比</div>*/}
                                        <div style={{ display: 'flex', gap: 24 }}>
                                          {/* 左列 */}
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                              <span style={{ fontSize: 10, color: '#8c8c8c' }}>预算</span>
                                              <span style={{ fontSize: 12, fontWeight: 600 }}>RM {financial.budgetTotal.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                              <span style={{ fontSize: 10, color: '#52c41a' }}>账户收入</span>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: '#52c41a' }}>RM {financial.accountIncomeTotal.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: 10, color: '#1890ff' }}>银行收入</span>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: '#1890ff' }}>RM {financial.bankIncomeTotal.toFixed(2)}</span>
                                            </div>
                                          </div>
                                          {/* 右列 */}
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                              <span style={{ fontSize: 10, color: '#8c8c8c' }}>净利润</span>
                                              <span style={{ 
                                                fontSize: 12, 
                                                fontWeight: 600,
                                                color: financial.netProfit >= 0 ? '#52c41a' : '#ff4d4f'
                                              }}>
                                                RM {financial.netProfit.toFixed(2)}
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                              <span style={{ fontSize: 10, color: '#ff4d4f' }}>账户支出</span>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: '#ff4d4f' }}>RM {financial.accountExpenseTotal.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: 10, color: '#fa8c16' }}>银行支出</span>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: '#fa8c16' }}>RM {financial.bankExpenseTotal.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </List.Item>
                              );
                            }}
                          />
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'past',
              label: (
                <span>
                  <TrophyOutlined style={{ marginRight: 8 }} />
                  Past Events
                </span>
              ),
              children: (
                <Row gutter={[16, 16]} align="stretch">
                  <Col xs={24}>
                    <Card 
                      title={
                        <span>
                          已结束的活动列表 ({filteredPastEvents.length})
                          {selectedEventYear !== 'all' && (
                            <Tag color="blue" style={{ marginLeft: 8 }}>
                              {selectedEventYear}年
                            </Tag>
                          )}
                        </span>
                      }
                      className="content-card"
                      style={{ height: '100%' }}
                    >
                      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {eventsLoading ? (
                          <div style={{ padding: 40, textAlign: 'center' }}>
                            <div>加载中...</div>
                          </div>
                        ) : filteredPastEvents.length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={selectedEventYear !== 'all' ? `${selectedEventYear}年暂无已结束的活动` : '暂无已结束的活动'}
                          />
                        ) : (
                          <List
                            dataSource={filteredPastEvents}
                            renderItem={(event) => {
                              const chairman = event.committeeMembers?.find(m => m.position === '筹委主席');
                              const priceRange = event.isFree 
                                ? 'FREE' 
                                : `RM ${event.pricing.committeePrice} - RM ${event.pricing.regularPrice}`;
                              const financial = eventFinancials.get(event.id);
                              
                              return (
                                <List.Item style={{ padding: '12px 0', display: 'block' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                                    {/* 左侧：活动基本信息 */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</span>
                                        <Tag color="orange">{event.level}</Tag>
                                      </div>
                                      <div style={{ fontSize: 12 }}>
                                        <div style={{ marginTop: 4 }}>
                                          <CalendarOutlined style={{ marginRight: 6 }} />
                                          {dayjs(event.startDate).format('YYYY-MM-DD HH:mm')}
                                        </div>
                                        {event.boardMember && (
                                          <div style={{ marginTop: 4 }}>
                                            <UserOutlined style={{ marginRight: 6 }} />
                                            负责理事: {event.boardMember}
                                          </div>
                                        )}
                                        <div style={{ marginTop: 4 }}>
                                          <TeamOutlined style={{ marginRight: 6 }} />
                                          筹委主席: {chairman?.name || '-'}
                                        </div>
                                        <div style={{ marginTop: 4 }}>
                                          <DollarOutlined style={{ marginRight: 6 }} />
                                          {priceRange}
                                        </div>
                                      </div>
                                    </div>

                                    {/* 右侧：财务对比 */}
                                    {financial && (
                                      <div style={{
                                        minWidth: 320,
                                        padding: '12px 16px',
                                        background: '#fff7e6',
                                        borderRadius: 6,
                                        border: '1px solid #d9d9d9',
                                      }}>
                                        {/*<div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 10 }}>💰 财务对比</div>*/}
                                        <div style={{ display: 'flex', gap: 24 }}>
                                          {/* 左列 */}
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                              <span style={{ fontSize: 10, color: '#8c8c8c' }}>预算</span>
                                              <span style={{ fontSize: 12, fontWeight: 600 }}>RM {financial.budgetTotal.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                              <span style={{ fontSize: 10, color: '#52c41a' }}>账户收入</span>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: '#52c41a' }}>RM {financial.accountIncomeTotal.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: 10, color: '#1890ff' }}>银行收入</span>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: '#1890ff' }}>RM {financial.bankIncomeTotal.toFixed(2)}</span>
                                            </div>
                                          </div>
                                          {/* 右列 */}
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                              <span style={{ fontSize: 10, color: '#8c8c8c' }}>净利润</span>
                                              <span style={{ 
                                                fontSize: 12, 
                                                fontWeight: 600,
                                                color: financial.netProfit >= 0 ? '#52c41a' : '#ff4d4f'
                                              }}>
                                                RM {financial.netProfit.toFixed(2)}
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                              <span style={{ fontSize: 10, color: '#ff4d4f' }}>账户支出</span>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: '#ff4d4f' }}>RM {financial.accountExpenseTotal.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: 10, color: '#fa8c16' }}>银行支出</span>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: '#fa8c16' }}>RM {financial.bankExpenseTotal.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </List.Item>
                              );
                            }}
                          />
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* 会员数据中心：包裹4个子卡片 */}
      <Card
        title={
          <span>
            🎯 会员数据中心
          </span>
        }
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRefreshAll}
            >
              刷新
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出
            </Button>
          </div>
        }
        style={{ marginTop: 12 }}
        bodyStyle={{ padding: '16px' }}
      >
        {/* 会员生日列表：单独一行置顶 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={24} lg={24}>
            <Card 
            title={
              <span>
                <GiftOutlined style={{ marginRight: 8, color: '#f5222d' }} />
                会员生日列表
              </span>
            } 
            className="content-card"
            extra={
              <Select
                size="small"
                value={birthdayViewMode === 'upcoming' ? 'upcoming' : selectedMonth}
                onChange={(value) => {
                  if (value === 'upcoming') {
                    setBirthdayViewMode('upcoming');
                  } else {
                    setBirthdayViewMode('month');
                    setSelectedMonth(value as number);
                  }
                }}
                style={{ width: 140 }}
              >
                <Option value="upcoming">即将到来</Option>
                {monthOptions.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label.split(' ')[0]}
                  </Option>
                ))}
              </Select>
            }
          >
            <div style={{
              maxHeight: 160,
              overflowX: 'auto',
              overflowY: 'hidden',
              paddingBottom: 4,
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                {(!listsLoading && upcomingBirthdays.length === 0) ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c' }}>
                    <div>{birthdayViewMode === 'upcoming' ? '未来30天无生日会员' : '本月无生日会员'}</div>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                      💡 请在会员管理中录入会员出生日期
                    </div>
                  </div>
                ) : (
                  upcomingBirthdays.slice(0, 10).map((item) => (
                    <div key={`${item.id}-${item.birthDate}`} style={{
                      minWidth: 220,
                      maxWidth: 260,
                      padding: '8px 10px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}>
                      <Avatar src={item.avatar} icon={<UserOutlined />} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        {birthdayViewMode === 'upcoming' ? (
                          <Tag color={item.daysUntilBirthday === 0 ? 'red' : item.daysUntilBirthday! <= 7 ? 'orange' : 'blue'}>
                            {item.daysUntilBirthday === 0 ? '今天' : `${item.daysUntilBirthday}天后`}
                          </Tag>
                        ) : (
                          <Tag color="blue">{item.day}日</Tag>
                        )}
                      </div>
                        <div style={{ fontSize: 12, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.birthDate}</div>
                      </div>
                    </div>
                  ))
              )}
              </div>
            </div>
            {upcomingBirthdays.length > 0 && (
              <div style={{ 
                marginTop: 12, 
                padding: '8px 12px', 
                backgroundColor: '#f0f5ff', 
                borderRadius: 4,
                fontSize: '12px',
                color: '#595959'
              }}>
                💡 共找到 {upcomingBirthdays.length} 位会员，显示前 10 位
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 会员行业分布、兴趣分布、会员列表：三卡片同排 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }} align="stretch">
        {/* 会员行业分布 */}
        <Col xs={8} sm={8} md={8} lg={8}>
          <Card 
            title={
              <span>
                <ShopOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                会员行业分布
              </span>
            } 
            className="content-card"
            style={{ height: '100%' }}
            extra={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Select
                  size="small"
                  placeholder="跨境业务"
                  style={{ width: 130 }}
                  value={(selectedAcceptIntl ?? 'ALL') as any}
                  onChange={(val) => {
                    if (val === 'ALL') {
                      setSelectedAcceptIntl(null);
                    } else {
                      setSelectedAcceptIntl(val as any);
                    }
                  }}
                  options={[
                    { label: 'All', value: 'ALL' },
                    { label: 'Yes', value: 'Yes' },
                    { label: 'No', value: 'No' },
                    { label: 'Willing to explore', value: 'Willing to explore' },
                  ]}
                />
              <Badge 
                count={selectedIndustry ? <FilterOutlined style={{ color: '#1890ff' }} /> : 0}
                offset={[-5, 5]}
              >
                  <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {selectedAcceptIntl ? `筛: ${selectedAcceptIntl}` : '全部'}
                  </span>
              </Badge>
              </div>
            }
          >
            <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <List
              loading={listsLoading}
              dataSource={industryDistribution}
              locale={{ emptyText: '暂无行业数据' }}
              renderItem={item => (
                <List.Item 
                  style={{ 
                    padding: '8px 0', 
                    display: 'block',
                    cursor: 'pointer',
                    backgroundColor: selectedIndustry === item.industry ? '#e6f7ff' : 'transparent',
                    borderRadius: 4,
                    paddingLeft: selectedIndustry === item.industry ? 8 : 0,
                    paddingRight: selectedIndustry === item.industry ? 8 : 0,
                    transition: 'all 0.3s',
                  }}
                  onClick={() => handleIndustryClick(item.industry)}
                >
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tooltip title="点击筛选会员">
                        <span style={{ 
                          fontSize: '13px', 
                          color: selectedIndustry === item.industry ? '#1890ff' : '#262626',
                          fontWeight: selectedIndustry === item.industry ? 600 : 400,
                        }}>
                          {selectedIndustry === item.industry && '👉 '}
                          {item.industry}
                        </span>
                      </Tooltip>
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {item.count} 人
                      </span>
                    </div>
                  </div>
                  <Progress 
                    percent={item.percentage} 
                    size="small" 
                    strokeColor={selectedIndustry === item.industry ? '#1890ff' : '#91d5ff'}
                    showInfo={false}
                  />
                </List.Item>
              )}
            />
            </div>
          </Card>
        </Col>

        {/* 会员兴趣分布 */}
        <Col xs={8} sm={8} md={8} lg={8}>
          <Card 
            title={
              <span>
                <HeartOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                会员兴趣分布
              </span>
            } 
            className="content-card"
            style={{ height: '100%' }}
            extra={
              <Badge 
                count={selectedInterest ? <FilterOutlined style={{ color: '#52c41a' }} /> : 0}
                offset={[-5, 5]}
              >
                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Top 10</span>
              </Badge>
            }
          >
            <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <List
              loading={listsLoading}
              dataSource={interestDistribution}
              locale={{ emptyText: '暂无兴趣数据' }}
              renderItem={item => (
                <List.Item 
                  style={{ 
                    padding: '8px 0', 
                    display: 'block',
                    cursor: 'pointer',
                    backgroundColor: selectedInterest === item.industry ? '#f6ffed' : 'transparent',
                    borderRadius: 4,
                    paddingLeft: selectedInterest === item.industry ? 8 : 0,
                    paddingRight: selectedInterest === item.industry ? 8 : 0,
                    transition: 'all 0.3s',
                  }}
                  onClick={() => handleInterestClick(item.industry)}
                >
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tooltip title="点击筛选会员">
                        <span style={{ 
                          fontSize: '13px', 
                          color: selectedInterest === item.industry ? '#52c41a' : '#262626',
                          fontWeight: selectedInterest === item.industry ? 600 : 400,
                        }}>
                          {selectedInterest === item.industry && '👉 '}
                          {item.industry}
                        </span>
                      </Tooltip>
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {item.count} 人
                      </span>
                    </div>
                  </div>
                  <Progress 
                    percent={item.percentage} 
                    size="small" 
                    strokeColor={selectedInterest === item.industry ? '#52c41a' : '#95de64'}
                    showInfo={false}
                  />
                </List.Item>
              )}
            />
            </div>
          </Card>
        </Col>
      {/* 🆕 会员列表卡片 */}
        <Col xs={8} sm={8} md={8} lg={8}>
          <Card 
            title={
              <span>
                <TeamOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                会员列表
                {(selectedIndustry || selectedInterest || selectedMemberId) && (
                  <Tag color="blue" style={{ marginLeft: 12 }}>
                    已筛选 {filteredMembers.length} / {members.length}
                  </Tag>
                )}
              </span>
            } 
            className="content-card"
            style={{ height: '100%' }}
            extra={
              (selectedIndustry || selectedInterest || selectedMemberId) ? (
                <Button 
                  type="link" 
                  size="small" 
                  icon={<CloseCircleOutlined />}
                  onClick={handleClearFilters}
                >
                  清除筛选
                </Button>
              ) : null
            }
          >
            {/* 筛选条件显示 */}
            {(selectedIndustry || selectedInterest) && (
              <div style={{ 
                marginBottom: 16, 
                padding: '12px 16px', 
                backgroundColor: '#f0f5ff', 
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FilterOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontSize: '13px', color: '#595959' }}>当前筛选：</span>
                </div>
                {selectedIndustry && (
                  <Tag color="blue" closable onClose={() => setSelectedIndustry(null)}>
                    行业：{selectedIndustry}
                  </Tag>
                )}
                {selectedInterest && (
                  <Tag color="green" closable onClose={() => setSelectedInterest(null)}>
                    兴趣：{selectedInterest}
                  </Tag>
                )}
              </div>
            )}

            <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <List
              loading={membersLoading}
              dataSource={filteredMembers.slice(0, 20)} // 只显示前20个
              locale={{ emptyText: '暂无会员数据' }}
              itemLayout="horizontal"
              renderItem={member => (
                <List.Item
                    style={{
                    padding: '8px 4px',
                      cursor: 'pointer',
                    backgroundColor: selectedMemberId === member.id ? '#fff7e6' : 'transparent',
                    borderRadius: selectedMemberId === member.id ? 4 : 0,
                    transition: 'background-color 0.2s ease',
                    }}
                    onClick={() => handleMemberClick(member)}
                  >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={member.profile?.avatar} 
                        icon={<UserOutlined />}
                        size={40}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
                        <span style={{
                        fontSize: '13px', 
                        fontWeight: 600, 
                        color: '#262626',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                          paddingRight: 8,
                      }}>
                        {member.name}
                        </span>
                        <span>
                          {member.category && (
                            <Tag 
                              color={
                                member.category === 'Official Member' ? 'blue' :
                                member.category === 'Probation Member' ? 'green' :
                                member.category === 'Alumni' ? 'orange' : 'default'
                              }
                              style={{ fontSize: '10px', lineHeight: '16px', height: 18 }}
                            >
                              {member.category}
                            </Tag>
                          )}
                        </span>
                      </div>
                    }
                    description={
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#8c8c8c',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {member.profile?.ownIndustry?.[0] || '未设置行业'}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
            </div>
            {filteredMembers.length > 20 && (
              <div style={{ 
                marginTop: 16, 
                padding: '8px 12px', 
                backgroundColor: '#f0f5ff', 
                borderRadius: 4,
                fontSize: '12px',
                color: '#595959',
                textAlign: 'center',
              }}>
                💡 共找到 {filteredMembers.length} 位会员，显示前 20 位
              </div>
            )}
          </Card>
        </Col>
      </Row>
      </Card>
      </div>
    </PermissionGuard>
  );
};

export default DashboardPage;
