/**
 * React Query Configuration
 * React Query 配置
 * 
 * ⚡ Performance: Global caching and data synchronization
 * 性能优化：全局缓存和数据同步
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Default React Query options
 * React Query 默认选项
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Stale time: Data is considered fresh for 2 minutes
    // 新鲜时间：数据在2分钟内被视为新鲜
    staleTime: 2 * 60 * 1000,

    // Cache time: Data stays in cache for 5 minutes after becoming unused
    // 缓存时间：数据在不使用后保留5分钟
    gcTime: 5 * 60 * 1000, // Renamed from cacheTime in v5

    // Don't refetch on window focus (too aggressive for our use case)
    // 不在窗口焦点时重新获取（对我们的用例太激进）
    refetchOnWindowFocus: false,

    // Don't refetch on mount if data is still fresh
    // 如果数据仍然新鲜，挂载时不重新获取
    refetchOnMount: false,

    // Refetch on reconnect
    // 重新连接时重新获取
    refetchOnReconnect: true,

    // Retry failed requests 2 times
    // 失败请求重试2次
    retry: 2,

    // Retry delay (exponential backoff)
    // 重试延迟（指数退避）
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  mutations: {
    // Retry failed mutations once
    // 失败的变更重试一次
    retry: 1,
  },
};

/**
 * Create Query Client
 * 创建 Query Client
 */
export const queryClient = new QueryClient({
  defaultOptions,
});

/**
 * Query Keys Factory
 * 查询键工厂
 */
export const queryKeys = {
  // Members
  members: {
    all: ['members'] as const,
    lists: () => [...queryKeys.members.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.members.lists(), filters] as const,
    details: () => [...queryKeys.members.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.members.details(), id] as const,
    stats: () => [...queryKeys.members.all, 'stats'] as const,
    birthdays: () => [...queryKeys.members.all, 'birthdays'] as const,
    industries: (filter?: string) => [...queryKeys.members.all, 'industries', filter] as const,
    interests: () => [...queryKeys.members.all, 'interests'] as const,
  },

  // Events
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.events.lists(), filters] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
    registrations: (eventId: string) => [...queryKeys.events.all, 'registrations', eventId] as const,
    financials: (eventId: string) => [...queryKeys.events.all, 'financials', eventId] as const,
  },

  // Finance
  finance: {
    all: ['finance'] as const,
    transactions: {
      all: () => [...queryKeys.finance.all, 'transactions'] as const,
      list: (filters: Record<string, any>) => [...queryKeys.finance.transactions.all(), filters] as const,
      detail: (id: string) => [...queryKeys.finance.transactions.all(), id] as const,
    },
    bankAccounts: {
      all: () => [...queryKeys.finance.all, 'bankAccounts'] as const,
      list: () => [...queryKeys.finance.bankAccounts.all(), 'list'] as const,
      detail: (id: string) => [...queryKeys.finance.bankAccounts.all(), id] as const,
    },
    memberFees: {
      all: () => [...queryKeys.finance.all, 'memberFees'] as const,
      list: (filters: Record<string, any>) => [...queryKeys.finance.memberFees.all(), filters] as const,
      byMember: (memberId: string) => [...queryKeys.finance.memberFees.all(), 'member', memberId] as const,
    },
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    overview: () => [...queryKeys.dashboard.all, 'overview'] as const,
  },
};

/**
 * Prefetch helpers
 * 预取助手
 */
export const prefetchQueries = {
  /**
   * Prefetch member stats
   * 预取会员统计
   */
  memberStats: () => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.members.stats(),
      // Add your query function here
    });
  },

  /**
   * Prefetch member list
   * 预取会员列表
   */
  memberList: (filters: Record<string, any> = {}) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.members.list(filters),
      // Add your query function here
    });
  },
};

/**
 * Invalidate helpers
 * 失效助手
 */
export const invalidateQueries = {
  /**
   * Invalidate all member queries
   * 使所有会员查询失效
   */
  members: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
  },

  /**
   * Invalidate specific member
   * 使特定会员失效
   */
  member: (id: string) => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.members.detail(id) });
  },

  /**
   * Invalidate all event queries
   * 使所有活动查询失效
   */
  events: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
  },

  /**
   * Invalidate all finance queries
   * 使所有财务查询失效
   */
  finance: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
  },

  /**
   * Invalidate dashboard
   * 使仪表板失效
   */
  dashboard: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  },
};

export default queryClient;

