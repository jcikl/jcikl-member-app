/**
 * Dashboard Cache Utility
 * 仪表板缓存工具
 * 
 * ⚡ Performance: Global cache layer for dashboard data
 * 性能优化：仪表板数据的全局缓存层
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number;  // Time to live in milliseconds
  key: string;
}

/**
 * Dashboard Cache Manager
 * 仪表板缓存管理器
 */
class DashboardCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  
  // Default TTL values (in milliseconds)
  private readonly TTL = {
    stats: 5 * 60 * 1000,           // 5 minutes - 统计数据
    members: 3 * 60 * 1000,          // 3 minutes - 会员数据
    events: 2 * 60 * 1000,           // 2 minutes - 活动数据
    birthdays: 24 * 60 * 60 * 1000,  // 24 hours - 生日数据
    financial: 5 * 60 * 1000,        // 5 minutes - 财务数据
    industries: 10 * 60 * 1000,      // 10 minutes - 行业分布
    interests: 10 * 60 * 1000,       // 10 minutes - 兴趣分布
  } as const;

  /**
   * Get cached data if valid
   * 获取缓存数据（如果有效）
   */
  get<T>(key: string, ttl?: number): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      console.log(`⚡ [DashboardCache] Cache miss: ${key}`);
      return null;
    }

    const age = Date.now() - cached.timestamp;
    const maxAge = ttl || this.TTL[key as keyof typeof this.TTL] || 5 * 60 * 1000;

    if (age > maxAge) {
      console.log(`⚡ [DashboardCache] Cache expired: ${key} (age: ${Math.round(age / 1000)}s)`);
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ [DashboardCache] Cache hit: ${key} (age: ${Math.round(age / 1000)}s)`);
    return cached.data as T;
  }

  /**
   * Set cache data
   * 设置缓存数据
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log(`💾 [DashboardCache] Cached: ${key}`);
  }

  /**
   * Clear specific cache entry
   * 清除特定缓存条目
   */
  clear(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ [DashboardCache] Cleared: ${key}`);
  }

  /**
   * Clear all cache entries
   * 清除所有缓存条目
   */
  clearAll(): void {
    this.cache.clear();
    console.log(`🗑️ [DashboardCache] Cleared all cache`);
  }

  /**
   * Get cache statistics
   * 获取缓存统计信息
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Math.round((now - entry.timestamp) / 1000),
      size: JSON.stringify(entry.data).length,
    }));

    return {
      total: this.cache.size,
      entries,
      totalSize: entries.reduce((sum, e) => sum + e.size, 0),
    };
  }

  /**
   * Fetch with cache
   * 带缓存的数据获取
   */
  async fetchWithCache<T>(
    options: CacheOptions,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const { key, ttl } = options;

    // Try to get from cache
    const cached = this.get<T>(key, ttl);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    console.log(`🔄 [DashboardCache] Fetching fresh data: ${key}`);
    const data = await fetcher();

    // Cache it
    this.set(key, data);

    return data;
  }

  /**
   * Invalidate cache entries matching pattern
   * 使匹配模式的缓存条目失效
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        console.log(`🗑️ [DashboardCache] Invalidated: ${key}`);
      }
    }
  }
}

// Singleton instance
export const dashboardCache = new DashboardCacheManager();

/**
 * Preload dashboard data
 * 预加载仪表板数据
 */
export const preloadDashboardData = async (loaders: Record<string, () => Promise<any>>) => {
  console.log(`⚡ [DashboardCache] Preloading dashboard data...`);

  // Use requestIdleCallback if available
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(async () => {
      const promises = Object.entries(loaders).map(async ([key, loader]) => {
        try {
          const data = await loader();
          dashboardCache.set(key, data);
        } catch (error) {
          console.error(`❌ [DashboardCache] Preload failed: ${key}`, error);
        }
      });

      await Promise.allSettled(promises);
      console.log(`✅ [DashboardCache] Preload complete`);
    });
  } else {
    // Fallback: load immediately but with low priority
    setTimeout(async () => {
      const promises = Object.entries(loaders).map(async ([key, loader]) => {
        try {
          const data = await loader();
          dashboardCache.set(key, data);
        } catch (error) {
          console.error(`❌ [DashboardCache] Preload failed: ${key}`, error);
        }
      });

      await Promise.allSettled(promises);
      console.log(`✅ [DashboardCache] Preload complete`);
    }, 100);
  }
};

