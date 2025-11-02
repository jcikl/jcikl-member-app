/**
 * Optimized Dashboard Hooks
 * 优化后的仪表板钩子
 * 
 * ⚡ Performance: Replaces multiple useEffect with cached, prioritized data loading
 * 性能优化：用缓存的、分优先级的数据加载替换多个useEffect
 */

import { useCachedData, LoadPriority } from '@/hooks/useDashboardData';
import { 
  getMemberStats, 
  getUpcomingBirthdays, 
  getBirthdaysByMonth,
  getIndustryDistribution, 
  getInterestDistribution,
  getMembers,
  getMemberById,
} from '@/modules/member/services/memberService';
import { getMemberFees } from '@/modules/finance/services/memberFeeService';
import { getEvents } from '@/modules/event/services/eventService';
import type { Member, MemberStats, IndustryType } from '@/modules/member/types';
import type { Event } from '@/modules/event/types';

/**
 * 优先级P0：关键统计数据（立即加载）
 */
export const useDashboardStats = () => {
  return useCachedData<MemberStats>(
    'dashboard-stats',
    getMemberStats,
    { priority: LoadPriority.CRITICAL }
  );
};

/**
 * 优先级P0：当前用户会员信息（立即加载）
 */
export const useCurrentUserMember = (userId: string | undefined) => {
  return useCachedData<Member | null>(
    `dashboard-user-${userId}`,
    () => userId ? getMemberById(userId) : Promise.resolve(null),
    { 
      priority: LoadPriority.CRITICAL,
      enabled: !!userId,
    }
  );
};

/**
 * 优先级P1：会员列表（500ms延迟）
 */
export const useDashboardMembers = () => {
  return useCachedData<Member[]>(
    'dashboard-members-full',
    async () => {
      const result = await getMembers({ page: 1, limit: 10000 });
      return result.data;
    },
    { 
      priority: LoadPriority.HIGH,
      ttl: 3 * 60 * 1000, // 3分钟
    }
  );
};

/**
 * 优先级P1：会员费数据（500ms延迟）
 */
export const useDashboardMemberFees = () => {
  return useCachedData<any[]>(
    'dashboard-member-fees',
    async () => {
      const result = await getMemberFees({ page: 1, limit: 10000 });
      return result.data;
    },
    { 
      priority: LoadPriority.HIGH,
      ttl: 3 * 60 * 1000, // 3分钟
    }
  );
};

/**
 * 优先级P1：即将到来的活动（500ms延迟）
 */
export const useDashboardUpcomingEvents = (year?: string) => {
  return useCachedData<Event[]>(
    `dashboard-events-upcoming-${year || 'current'}`,
    async () => {
      const result = await getEvents({
        page: 1,
        limit: 100,
        status: 'published',
      });
      const now = new Date();
      return result.data.filter((event: Event) => new Date(event.startDate) >= now);
    },
    { 
      priority: LoadPriority.HIGH,
      ttl: 2 * 60 * 1000, // 2分钟
    }
  );
};

/**
 * 优先级P2：生日数据（1500ms延迟）
 */
export const useDashboardBirthdays = (
  mode: 'upcoming' | 'month',
  month?: number
) => {
  const cacheKey = mode === 'upcoming' 
    ? 'dashboard-birthdays-upcoming'
    : `dashboard-birthdays-month-${month}`;

  return useCachedData<any[]>(
    cacheKey,
    () => mode === 'upcoming' 
      ? getUpcomingBirthdays(30) 
      : getBirthdaysByMonth(month!),
    { 
      priority: LoadPriority.NORMAL,
      ttl: 24 * 60 * 60 * 1000, // 24小时
    }
  );
};

/**
 * 优先级P2：行业分布（1500ms延迟）
 */
export const useDashboardIndustries = (
  acceptIntl?: 'Yes' | 'No' | 'Willing to explore' | null
) => {
  const cacheKey = `dashboard-industries-${acceptIntl || 'all'}`;

  return useCachedData<Array<{
    industry: string;
    count: number;
    percentage: number;
  }>>(
    cacheKey,
    () => getIndustryDistribution(acceptIntl || undefined),
    { 
      priority: LoadPriority.NORMAL,
      ttl: 10 * 60 * 1000, // 10分钟
    }
  );
};

/**
 * 优先级P2：兴趣分布（1500ms延迟）
 */
export const useDashboardInterests = () => {
  return useCachedData<Array<{
    industry: string;
    count: number;
    percentage: number;
  }>>(
    'dashboard-interests',
    getInterestDistribution,
    { 
      priority: LoadPriority.NORMAL,
      ttl: 10 * 60 * 1000, // 10分钟
    }
  );
};

/**
 * 优先级P3：过去的活动（3000ms延迟）
 */
export const useDashboardPastEvents = (year?: string) => {
  return useCachedData<Event[]>(
    `dashboard-events-past-${year || 'current'}`,
    async () => {
      const result = await getEvents({
        page: 1,
        limit: 100,
        status: 'published',
      });
      const now = new Date();
      return result.data.filter((event: Event) => new Date(event.startDate) < now);
    },
    { 
      priority: LoadPriority.LOW,
      ttl: 2 * 60 * 1000, // 2分钟
    }
  );
};

/**
 * 组合钩子：一次性加载所有Dashboard数据（分优先级）
 */
export const useDashboardData = (userId: string | undefined, options: {
  birthdayMode?: 'upcoming' | 'month';
  birthdayMonth?: number;
  acceptIntl?: 'Yes' | 'No' | 'Willing to explore' | null;
  year?: string;
} = {}) => {
  const {
    birthdayMode = 'upcoming',
    birthdayMonth = new Date().getMonth(),
    acceptIntl = null,
    year,
  } = options;

  // P0 - 立即加载
  const stats = useDashboardStats();
  const currentUser = useCurrentUserMember(userId);

  // P1 - 500ms后加载
  const members = useDashboardMembers();
  const memberFees = useDashboardMemberFees();
  const upcomingEvents = useDashboardUpcomingEvents(year);

  // P2 - 1500ms后加载
  const birthdays = useDashboardBirthdays(birthdayMode, birthdayMonth);
  const industries = useDashboardIndustries(acceptIntl);
  const interests = useDashboardInterests();

  // P3 - 3000ms后加载
  const pastEvents = useDashboardPastEvents(year);

  return {
    // P0 - 关键数据
    stats,
    currentUser,
    
    // P1 - 重要数据
    members,
    memberFees,
    upcomingEvents,
    
    // P2 - 次要数据
    birthdays,
    industries,
    interests,
    
    // P3 - 可选数据
    pastEvents,
    
    // 加载状态
    isLoadingCritical: stats.loading || currentUser.loading,
    isLoadingHigh: members.loading || memberFees.loading || upcomingEvents.loading,
    isLoadingNormal: birthdays.loading || industries.loading || interests.loading,
    isLoadingLow: pastEvents.loading,
    
    // 整体加载状态
    isLoading: stats.loading || members.loading,
    
    // 刷新函数
    refreshStats: stats.refresh,
    refreshMembers: members.refresh,
    refreshEvents: upcomingEvents.refresh,
  };
};

