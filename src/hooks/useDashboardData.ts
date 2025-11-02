/**
 * Dashboard Data Hooks
 * 仪表板数据钩子
 * 
 * ⚡ Performance: Optimized data loading with caching and parallel fetching
 * 性能优化：使用缓存和并行加载的优化数据加载
 */

import { useState, useEffect, useCallback } from 'react';
import { dashboardCache } from '@/utils/dashboardCache';
import type { Member, MemberStats } from '@/modules/member/types';
import type { Event } from '@/modules/event/types';

/**
 * Load priority levels
 * 加载优先级
 */
export enum LoadPriority {
  CRITICAL = 0,    // 立即加载（关键数据）
  HIGH = 500,      // 高优先级（次要数据）
  NORMAL = 1500,   // 正常优先级（可选数据）
  LOW = 3000,      // 低优先级（后台数据）
}

/**
 * Use cached dashboard stats
 * 使用缓存的仪表板统计数据
 */
export const useCachedStats = (
  fetcher: () => Promise<MemberStats>,
  priority: LoadPriority = LoadPriority.CRITICAL
) => {
  const [data, setData] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const cached = dashboardCache.get<MemberStats>('stats');
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }

        setLoading(true);
        const result = await fetcher();
        dashboardCache.set('stats', result);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    // Load based on priority
    if (priority === LoadPriority.CRITICAL) {
      loadData();
    } else {
      setTimeout(loadData, priority);
    }
  }, [fetcher, priority]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher();
      dashboardCache.set('stats', result);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  return { data, loading, error, refresh };
};

/**
 * Use cached members list
 * 使用缓存的会员列表
 */
export const useCachedMembers = (
  fetcher: () => Promise<Member[]>,
  priority: LoadPriority = LoadPriority.HIGH
) => {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const cached = dashboardCache.get<Member[]>('members');
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }

        setLoading(true);
        const result = await fetcher();
        dashboardCache.set('members', result);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (priority === LoadPriority.CRITICAL) {
      loadData();
    } else {
      setTimeout(loadData, priority);
    }
  }, [fetcher, priority]);

  return { data, loading, error };
};

/**
 * Use cached events
 * 使用缓存的活动数据
 */
export const useCachedEvents = (
  fetcher: () => Promise<Event[]>,
  priority: LoadPriority = LoadPriority.HIGH
) => {
  const [data, setData] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const cached = dashboardCache.get<Event[]>('events');
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }

        setLoading(true);
        const result = await fetcher();
        dashboardCache.set('events', result);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (priority === LoadPriority.CRITICAL) {
      loadData();
    } else {
      setTimeout(loadData, priority);
    }
  }, [fetcher, priority]);

  return { data, loading, error };
};

/**
 * Use cached birthdays
 * 使用缓存的生日数据
 */
export const useCachedBirthdays = <T>(
  fetcher: () => Promise<T>,
  cacheKey: string = 'birthdays',
  priority: LoadPriority = LoadPriority.NORMAL
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const cached = dashboardCache.get<T>(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }

        setLoading(true);
        const result = await fetcher();
        dashboardCache.set(cacheKey, result);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (priority === LoadPriority.CRITICAL) {
      loadData();
    } else {
      setTimeout(loadData, priority);
    }
  }, [fetcher, cacheKey, priority]);

  return { data, loading, error };
};

/**
 * Use generic cached data
 * 通用缓存数据钩子
 */
export const useCachedData = <T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: {
    priority?: LoadPriority;
    ttl?: number;
    enabled?: boolean;
  } = {}
) => {
  const {
    priority = LoadPriority.NORMAL,
    ttl,
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const cached = dashboardCache.get<T>(cacheKey, ttl);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }

        setLoading(true);
        const result = await fetcher();
        dashboardCache.set(cacheKey, result);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (priority === LoadPriority.CRITICAL) {
      loadData();
    } else {
      setTimeout(loadData, priority);
    }
  }, [cacheKey, fetcher, priority, ttl, enabled]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    try {
      const result = await fetcher();
      dashboardCache.set(cacheKey, result);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher, enabled]);

  return { data, loading, error, refresh };
};

/**
 * Prefetch dashboard data
 * 预取仪表板数据
 */
export const prefetchDashboardData = (loaders: Record<string, () => Promise<any>>) => {
  console.log(`⚡ [useDashboardData] Prefetching dashboard data...`);

  Object.entries(loaders).forEach(([key, loader]) => {
    dashboardCache.fetchWithCache({ key }, loader).catch(err => {
      console.error(`❌ [useDashboardData] Prefetch failed: ${key}`, err);
    });
  });
};

