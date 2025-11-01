import React, { useState, useEffect } from 'react';
import { Card, Row, Col, List, Avatar, Tag, Progress, Select, Button, Tooltip, Badge, message, Tabs, Empty, Skeleton } from 'antd';
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
import { useAuthStore } from '@/stores/authStore';
import { getMemberById } from '@/modules/member/services/memberService';
import { TaskProgressCard } from '@/modules/member/components';

// Types
import type { Member, IndustryType } from '@/modules/member/types';
import type { Event } from '@/modules/event/types';

const { Option } = Select;

/**
 * Dashboard Page
 * 仪表板页面
 */
const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [currentUserMember, setCurrentUserMember] = useState<Member | null>(null);
  const [userMemberLoading, setUserMemberLoading] = useState(false);
  
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
  const [eventFinancialsLoaded, setEventFinancialsLoaded] = useState(false);
  const [eventFinancialsLoading, setEventFinancialsLoading] = useState(false);
  const [activeEventTab, setActiveEventTab] = useState<string>('upcoming');

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

  // 加载当前用户会员信息
  useEffect(() => {
    const fetchCurrentUserMember = async () => {
      if (!user?.id) return;
      
      setUserMemberLoading(true);
      try {
        const memberData = await getMemberById(user.id);
        setCurrentUserMember(memberData);
      } catch (error) {
        console.error('Failed to fetch current user member data:', error);
      } finally {
        setUserMemberLoading(false);
      }
    };

    fetchCurrentUserMember();
  }, [user?.id]);

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

  // 加载生日数据（优化版 + 缓存）
  useEffect(() => {
    const loadBirthdays = async () => {
      setListsLoading(true);
      try {
        // 🚀 优化: 按视图模式分别缓存
        const cacheKey = birthdayViewMode === 'upcoming' 
          ? 'dashboard_birthdays_upcoming' 
          : `dashboard_birthdays_month_${selectedMonth}`;
        const cacheTimeKey = `${cacheKey}_time`;
        const cacheTTL = 10 * 60 * 1000; // 10分钟缓存（生日数据不常变）
        
        // 尝试从缓存加载
        try {
          const cachedData = sessionStorage.getItem(cacheKey);
          const cachedTime = sessionStorage.getItem(cacheTimeKey);
          
          if (cachedData && cachedTime) {
            const cacheAge = Date.now() - parseInt(cachedTime);
            if (cacheAge < cacheTTL) {
              const birthdays = JSON.parse(cachedData);
              setUpcomingBirthdays(birthdays);
              console.log(`✅ [生日优化] 从缓存加载，缓存年龄: ${(cacheAge / 1000).toFixed(1)}秒`);
              setListsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to load birthdays from cache:', err);
        }
        
        // 从服务器加载
        let birthdays;
        if (birthdayViewMode === 'upcoming') {
          birthdays = await getUpcomingBirthdays(30);
        } else {
          birthdays = await getBirthdaysByMonth(selectedMonth);
        }
        setUpcomingBirthdays(birthdays);
        
        // 保存到缓存
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(birthdays));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
          console.log(`💾 [生日优化] 已缓存 ${birthdays.length} 条生日数据`);
        } catch (err) {
          console.warn('Failed to cache birthdays:', err);
        }
      } catch (error) {
        console.error('Failed to fetch birthdays:', error);
      } finally {
        setListsLoading(false);
      }
    };

    loadBirthdays();
  }, [birthdayViewMode, selectedMonth]);

  // 🆕 加载会员列表（优化版 + 缓存）
  useEffect(() => {
    const loadMembers = async () => {
      const startTime = performance.now();
      console.log(`⏱️ [会员优化] 开始加载会员数据...`);
      
      setMembersLoading(true);
      try {
        // 🚀 优化1: 尝试从缓存加载会员数据
        const memberCacheKey = 'dashboard_members';
        const memberCacheTimeKey = 'dashboard_members_time';
        const feeCacheKey = 'dashboard_member_fees';
        const feeCacheTimeKey = 'dashboard_member_fees_time';
        const cacheTTL = 3 * 60 * 1000; // 3分钟缓存（会员数据变化较频繁）
        
        let membersData: Member[] = [];
        let fromCache = false;
        
        // 尝试从缓存加载会员
        try {
          const cachedMembers = sessionStorage.getItem(memberCacheKey);
          const cachedMembersTime = sessionStorage.getItem(memberCacheTimeKey);
          
          if (cachedMembers && cachedMembersTime) {
            const cacheAge = Date.now() - parseInt(cachedMembersTime);
            if (cacheAge < cacheTTL) {
              membersData = JSON.parse(cachedMembers);
              fromCache = true;
              console.log(`✅ [会员优化] 从缓存加载会员数据: ${membersData.length} 位，缓存年龄: ${(cacheAge / 1000).toFixed(1)}秒`);
            }
          }
        } catch (err) {
          console.warn('Failed to load members from cache:', err);
        }
        
        // 如果缓存未命中，从服务器加载
        if (!fromCache) {
          const result = await getMembers({
            page: 1,
            limit: 10000,
          });
          membersData = result.data;
          
          // 🚀 保存到缓存
          try {
            sessionStorage.setItem(memberCacheKey, JSON.stringify(membersData));
            sessionStorage.setItem(memberCacheTimeKey, Date.now().toString());
            console.log(`💾 [会员优化] 会员数据已缓存: ${membersData.length} 位`);
          } catch (err) {
            console.warn('Failed to cache members:', err);
          }
        }
        
        setMembers(membersData);

        // 🚀 优化2: 缓存会员费数据
        let feesData: any[] = [];
        let feesFromCache = false;
        
        try {
          const cachedFees = sessionStorage.getItem(feeCacheKey);
          const cachedFeesTime = sessionStorage.getItem(feeCacheTimeKey);
          
          if (cachedFees && cachedFeesTime) {
            const cacheAge = Date.now() - parseInt(cachedFeesTime);
            if (cacheAge < cacheTTL) {
              feesData = JSON.parse(cachedFees);
              feesFromCache = true;
              console.log(`✅ [会员优化] 从缓存加载会费数据: ${feesData.length} 条，缓存年龄: ${(cacheAge / 1000).toFixed(1)}秒`);
            }
          }
        } catch (err) {
          console.warn('Failed to load fees from cache:', err);
        }
        
        if (!feesFromCache) {
          try {
            const feesResult = await getMemberFees({ page: 1, limit: 10000 });
            feesData = feesResult.data;
            
            // 🚀 保存到缓存
            try {
              sessionStorage.setItem(feeCacheKey, JSON.stringify(feesData));
              sessionStorage.setItem(feeCacheTimeKey, Date.now().toString());
              console.log(`💾 [会员优化] 会费数据已缓存: ${feesData.length} 条`);
            } catch (err) {
              console.warn('Failed to cache fees:', err);
            }
          } catch {
            console.warn('Failed to load member fees');
          }
        }

        // 计算当前财年新会员
        if (feesData.length > 0) {
          try {
            const fy = globalDateService.getCurrentFiscalYearRange();
            const currentYearStr = globalDateService.formatDate(new Date(), 'year');
            const ids = new Set<string>();
            feesData.forEach(f => {
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
              setFilteredMembers(membersData.filter(m => ids.has(m.id)));
            } else {
              setFilteredMembers(membersData);
            }
          } catch {
            setFilteredMembers(membersData);
          }
        } else {
          setFilteredMembers(membersData);
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        setMembersLoading(false);
        const endTime = performance.now();
        console.log(`✅ [会员优化] 会员数据加载完成，耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
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

        // 🚀 优化: 不在初始加载时加载财务数据（懒加载）
        // 财务数据会在用户首次查看活动数据中心时加载
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // 🆕 懒加载：首次显示活动数据时才加载财务数据
  useEffect(() => {
    const shouldLoadFinancials = 
      !eventFinancialsLoaded && 
      !eventFinancialsLoading &&
      (upcomingEvents.length > 0 || pastEvents.length > 0);

    if (shouldLoadFinancials) {
      const loadFinancials = async () => {
        setEventFinancialsLoading(true);
        try {
          await loadEventFinancials([...upcomingEvents, ...pastEvents]);
          setEventFinancialsLoaded(true);
        } finally {
          setEventFinancialsLoading(false);
        }
      };
      loadFinancials();
    }
  }, [upcomingEvents, pastEvents, eventFinancialsLoaded, eventFinancialsLoading]);

  // 🆕 加载活动财务数据（批量优化版 + 缓存）
  const loadEventFinancials = async (events: Event[]) => {
    try {
      const startTime = performance.now();
      console.log(`⏱️ [优化] 开始加载 ${events.length} 个活动的财务数据...`);

      // 🚀 优化4: 尝试从缓存加载
      const cacheKey = 'dashboard_event_financials';
      const cacheTimeKey = 'dashboard_event_financials_time';
      const cacheTTL = 5 * 60 * 1000; // 5分钟缓存
      
      try {
        const cachedData = sessionStorage.getItem(cacheKey);
        const cachedTime = sessionStorage.getItem(cacheTimeKey);
        
        if (cachedData && cachedTime) {
          const cacheAge = Date.now() - parseInt(cachedTime);
          if (cacheAge < cacheTTL) {
            const parsedData = JSON.parse(cachedData) as Record<string, {
              budgetTotal: number;
              accountIncomeTotal: number;
              accountExpenseTotal: number;
              bankIncomeTotal: number;
              bankExpenseTotal: number;
              netProfit: number;
            }>;
            const financialsMap = new Map(Object.entries(parsedData));
            setEventFinancials(financialsMap);
            console.log(`✅ [优化] 从缓存加载财务数据，缓存年龄: ${(cacheAge / 1000).toFixed(1)}秒`);
            return;
          } else {
            console.log(`⏱️ [优化] 缓存已过期（${(cacheAge / 1000).toFixed(1)}秒 > ${cacheTTL / 1000}秒），重新加载...`);
          }
        }
      } catch (err) {
        console.warn('Failed to load from cache:', err);
      }

      const financialsMap = new Map<string, {
        budgetTotal: number;
        accountIncomeTotal: number;
        accountExpenseTotal: number;
        bankIncomeTotal: number;
        bankExpenseTotal: number;
        netProfit: number;
      }>();

      // 🚀 优化1: 批量查询所有 event-finance 银行交易（一次性）
      let allEventFinanceTransactions: any[] = [];
      try {
        const eventFinanceResult = await getTransactions({
          page: 1,
          limit: 10000,
          category: 'event-finance',
        });
        allEventFinanceTransactions = eventFinanceResult.data;
        console.log(`✅ [优化] 批量加载 event-finance 交易: ${allEventFinanceTransactions.length} 笔`);
      } catch (err) {
        console.error('Failed to batch load event-finance transactions:', err);
      }

      // 🚀 优化2: 为每个活动并行加载财务数据
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
            const financialAccountId = event.financialAccount || event.id;
            let bankTransactions = await getTransactionsByEventId(financialAccountId);
            
            // 🚀 优化3: 如果没有结果，从批量加载的数据中过滤（不再重新查询）
            if (bankTransactions.length === 0 && allEventFinanceTransactions.length > 0) {
              bankTransactions = allEventFinanceTransactions.filter(tx => {
                const matchByAccount = tx.txAccount === event.name;
                const matchByMetadataId = (tx.metadata as any)?.eventId === event.id;
                const matchByMetadataName = (tx.metadata as any)?.eventName === event.name;
                return matchByAccount || matchByMetadataId || matchByMetadataName;
              });
            }
            
            let bankIncomeTotal = 0;
            let bankExpenseTotal = 0;

            bankTransactions.forEach(tx => {
              // 跳过虚拟交易（子交易），避免重复计算
              if (tx.isVirtual || tx.parentTransactionId) {
                return;
              }

              // 统计所有交易（不区分 pending/completed）
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
      
      // 🚀 优化4: 保存到缓存
      try {
        const cacheData = Object.fromEntries(financialsMap);
        sessionStorage.setItem('dashboard_event_financials', JSON.stringify(cacheData));
        sessionStorage.setItem('dashboard_event_financials_time', Date.now().toString());
        console.log(`💾 [优化] 财务数据已缓存（TTL: 5分钟）`);
      } catch (err) {
        console.warn('Failed to cache financial data:', err);
      }
      
      const endTime = performance.now();
      console.log(`✅ [优化] 财务数据加载完成，耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
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

  // 🆕 刷新系统统计数据
  const handleRefreshStats = async () => {
    try {
      const memberStats = await getMemberStats();
      setStats({
        totalMembers: memberStats.total || 0,
        totalEvents: 0,
        totalRevenue: 0,
        totalAwards: 0,
        loading: false,
      });
      message.success('统计数据已刷新');
    } catch (error) {
      console.error('Failed to refresh stats:', error);
      message.error('刷新失败');
    }
  };

  // 🆕 导出系统统计数据
  const handleExportStats = () => {
    message.info('导出功能开发中');
  };

  // 🆕 刷新所有数据（智能清除缓存）
  const handleRefreshAll = async () => {
    const startTime = performance.now();
    console.log(`⏱️ [刷新] 开始刷新会员数据中心...`);
    
    setListsLoading(true);
    setMembersLoading(true);
    
    try {
      // 🚀 优化: 清除所有会员相关缓存
      const memberCacheKeys = [
        'dashboard_members',
        'dashboard_members_time',
        'dashboard_member_fees',
        'dashboard_member_fees_time',
        'dashboard_birthdays_upcoming',
        'dashboard_birthdays_upcoming_time',
      ];
      
      // 清除所有月份的生日缓存
      for (let i = 0; i < 12; i++) {
        memberCacheKeys.push(`dashboard_birthdays_month_${i}`);
        memberCacheKeys.push(`dashboard_birthdays_month_${i}_time`);
      }
      
      memberCacheKeys.forEach(key => sessionStorage.removeItem(key));
      console.log(`🗑️ [刷新] 已清除 ${memberCacheKeys.length} 个缓存项`);

      // 刷新生日数据
      const birthdaysPromise = (async () => {
        if (birthdayViewMode === 'upcoming') {
          const birthdays = await getUpcomingBirthdays(30);
          setUpcomingBirthdays(birthdays);
          
          // 重新缓存
          sessionStorage.setItem('dashboard_birthdays_upcoming', JSON.stringify(birthdays));
          sessionStorage.setItem('dashboard_birthdays_upcoming_time', Date.now().toString());
        } else {
          const birthdays = await getBirthdaysByMonth(selectedMonth);
          setUpcomingBirthdays(birthdays);
          
          // 重新缓存
          sessionStorage.setItem(`dashboard_birthdays_month_${selectedMonth}`, JSON.stringify(birthdays));
          sessionStorage.setItem(`dashboard_birthdays_month_${selectedMonth}_time`, Date.now().toString());
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
        
        // 重新缓存会员
        sessionStorage.setItem('dashboard_members', JSON.stringify(result.data));
        sessionStorage.setItem('dashboard_members_time', Date.now().toString());

        // 重新计算财年新会员
        const fy = globalDateService.getCurrentFiscalYearRange();
        const currentYearStr = globalDateService.formatDate(new Date(), 'year');
        const fees = await getMemberFees({ page: 1, limit: 10000 });
        
        // 重新缓存会费
        sessionStorage.setItem('dashboard_member_fees', JSON.stringify(fees.data));
        sessionStorage.setItem('dashboard_member_fees_time', Date.now().toString());
        
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
      
      const endTime = performance.now();
      console.log(`✅ [刷新] 会员数据刷新完成，耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
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

  // 🆕 根据年份过滤 Past Events
  const filteredPastEvents = React.useMemo(() => {
    if (selectedEventYear === 'all') {
      return pastEvents;
    }
    return pastEvents.filter(event => {
      const eventYear = dayjs(event.startDate).year().toString();
      return eventYear === selectedEventYear;
    });
  }, [pastEvents, selectedEventYear]);

  return (
    <PermissionGuard permissions="DASHBOARD_VIEW">
      <div>
      <h1 style={{ marginBottom: 12 }}>欢迎来到 JCI KL 会员管理系统</h1>
      
      {/* 🆕 系统概览：框住4个统计卡片 */}
      <Card
        title={
          <span>
            📊 系统概览
          </span>
        }
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={stats.loading}
              onClick={handleRefreshStats}
            >
              刷新
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExportStats}
            >
              导出
            </Button>
          </div>
        }
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '16px' }}
      >
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
      </Card>

      {/* 我的任务进度 */}
      {currentUserMember && !userMemberLoading && (
        <Card
          title={
            <span>
              ✅ 我的任务进度
            </span>
          }
          style={{ marginBottom: 24 }}
          loading={userMemberLoading}
        >
          <TaskProgressCard layout="horizontal" />
        </Card>
      )}

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
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={eventFinancialsLoading}
              onClick={async () => {
                // 清除缓存并重新加载
                sessionStorage.removeItem('dashboard_event_financials');
                sessionStorage.removeItem('dashboard_event_financials_time');
                setEventFinancialsLoaded(false);
                setEventFinancialsLoading(true);
                try {
                  await loadEventFinancials([...upcomingEvents, ...pastEvents]);
                  setEventFinancialsLoaded(true);
                  message.success('活动财务数据已刷新');
                } finally {
                  setEventFinancialsLoading(false);
                }
              }}
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
                                    {eventFinancialsLoading || !financial ? (
                                      <div style={{
                                        minWidth: 320,
                                        padding: '12px 16px',
                                        background: '#f0f5ff',
                                        borderRadius: 6,
                                        border: '1px solid #d9d9d9',
                                      }}>
                                        <Skeleton active paragraph={{ rows: 3 }} title={false} />
                                      </div>
                                    ) : (
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
                                    )
                                    }
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
                                    {eventFinancialsLoading || !financial ? (
                                      <div style={{
                                        minWidth: 320,
                                        padding: '12px 16px',
                                        background: '#fff7e6',
                                        borderRadius: 6,
                                        border: '1px solid #d9d9d9',
                                      }}>
                                        <Skeleton active paragraph={{ rows: 3 }} title={false} />
                                      </div>
                                    ) : (
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
              loading={membersLoading || listsLoading}
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
                        <div style={{ fontSize: 12, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dayjs(item.birthDate).format('DD-MMM')}</div>
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
