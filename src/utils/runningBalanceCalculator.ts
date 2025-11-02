/**
 * Running Balance Calculator
 * 累计余额计算器
 * 
 * ⚡ Performance: Incremental calculation with caching
 * 性能优化：增量计算，带缓存
 */

interface Transaction {
  id: string;
  date: string;
  transactionType: 'income' | 'expense';
  amount: number;
  isVirtual?: boolean;
  parentTransactionId?: string;
  [key: string]: any;
}

interface BalanceCache {
  balances: Map<string, number>;
  lastCalculatedIndex: number;
  lastInitialBalance: number;
  transactionIds: string[];
}

/**
 * Running Balance Calculator with Incremental Updates
 * 带增量更新的累计余额计算器
 */
export class RunningBalanceCalculator {
  private cache: Map<string, BalanceCache> = new Map();

  /**
   * Calculate running balance for transactions
   * 计算交易的累计余额
   * 
   * @param transactions - Transaction list (sorted by date, oldest first in UI bottom)
   * @param initialBalance - Starting balance
   * @param cacheKey - Cache key for this calculation
   */
  calculate(
    transactions: Transaction[],
    initialBalance: number,
    cacheKey?: string
  ): Map<string, number> {
    // Filter out virtual and child transactions
    const parentTransactions = transactions.filter(
      txn => !txn.isVirtual && !txn.parentTransactionId
    );

    // If no cache key, calculate directly without caching
    if (!cacheKey) {
      return this.calculateDirect(parentTransactions, initialBalance);
    }

    // Try to use cached calculation
    const cached = this.cache.get(cacheKey);
    
    // Check if we can use incremental calculation
    if (cached && cached.lastInitialBalance === initialBalance) {
      const currentIds = parentTransactions.map(t => t.id);
      
      // Check if transactions haven't changed (same order and IDs)
      const sameOrder = 
        cached.transactionIds.length === currentIds.length &&
        cached.transactionIds.every((id, index) => id === currentIds[index]);

      if (sameOrder) {
        console.log(`⚡ [RunningBalance] Using cached calculation: ${cacheKey}`);
        return cached.balances;
      }

      // Check if only new transactions added at the end
      const isAppend = 
        currentIds.length > cached.transactionIds.length &&
        cached.transactionIds.every((id, index) => id === currentIds[index]);

      if (isAppend) {
        console.log(`⚡ [RunningBalance] Incremental calculation (${currentIds.length - cached.transactionIds.length} new transactions)`);
        return this.calculateIncremental(
          parentTransactions,
          initialBalance,
          cached,
          cacheKey
        );
      }
    }

    // Full recalculation needed
    console.log(`🔄 [RunningBalance] Full calculation: ${cacheKey}`);
    return this.calculateAndCache(parentTransactions, initialBalance, cacheKey);
  }

  /**
   * Direct calculation without caching
   * 直接计算，不使用缓存
   */
  private calculateDirect(
    transactions: Transaction[],
    initialBalance: number
  ): Map<string, number> {
    const balanceMap = new Map<string, number>();
    
    // Calculate from bottom to top (oldest to newest)
    let runningBalance = initialBalance;
    
    for (let i = transactions.length - 1; i >= 0; i--) {
      const txn = transactions[i];
      const netAmount = txn.transactionType === 'income' ? txn.amount : -txn.amount;
      runningBalance += netAmount;
      balanceMap.set(txn.id, runningBalance);
    }

    return balanceMap;
  }

  /**
   * Calculate and cache
   * 计算并缓存
   */
  private calculateAndCache(
    transactions: Transaction[],
    initialBalance: number,
    cacheKey: string
  ): Map<string, number> {
    const balanceMap = this.calculateDirect(transactions, initialBalance);
    
    // Cache the result
    this.cache.set(cacheKey, {
      balances: balanceMap,
      lastCalculatedIndex: transactions.length - 1,
      lastInitialBalance: initialBalance,
      transactionIds: transactions.map(t => t.id),
    });

    return balanceMap;
  }

  /**
   * Incremental calculation (only calculate new transactions)
   * 增量计算（只计算新交易）
   */
  private calculateIncremental(
    transactions: Transaction[],
    initialBalance: number,
    cached: BalanceCache,
    cacheKey: string
  ): Map<string, number> {
    const balanceMap = new Map(cached.balances);
    
    // Start from the last calculated transaction
    const lastIndex = cached.lastCalculatedIndex;
    let runningBalance = balanceMap.get(transactions[lastIndex]?.id) || initialBalance;

    // Calculate only new transactions
    for (let i = lastIndex - 1; i >= 0; i--) {
      const txn = transactions[i];
      const netAmount = txn.transactionType === 'income' ? txn.amount : -txn.amount;
      runningBalance += netAmount;
      balanceMap.set(txn.id, runningBalance);
    }

    // Update cache
    this.cache.set(cacheKey, {
      balances: balanceMap,
      lastCalculatedIndex: transactions.length - 1,
      lastInitialBalance: initialBalance,
      transactionIds: transactions.map(t => t.id),
    });

    return balanceMap;
  }

  /**
   * Clear cache for specific key
   * 清除特定缓存
   */
  clearCache(cacheKey: string): void {
    this.cache.delete(cacheKey);
    console.log(`🗑️ [RunningBalance] Cleared cache: ${cacheKey}`);
  }

  /**
   * Clear all cache
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.cache.clear();
    console.log(`🗑️ [RunningBalance] Cleared all cache`);
  }

  /**
   * Get cache statistics
   * 获取缓存统计
   */
  getCacheStats() {
    const stats = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      transactionCount: value.transactionIds.length,
      balanceCount: value.balances.size,
    }));

    return {
      total: this.cache.size,
      entries: stats,
    };
  }
}

// Singleton instance
export const runningBalanceCalculator = new RunningBalanceCalculator();

/**
 * React hook for running balance calculation
 * Running balance 计算的 React 钩子
 */
export const useRunningBalance = (
  transactions: Transaction[],
  initialBalance: number,
  cacheKey?: string
) => {
  const [balances, setBalances] = React.useState<Map<string, number>>(new Map());
  const [calculating, setCalculating] = React.useState(false);

  React.useEffect(() => {
    setCalculating(true);
    
    // Use requestIdleCallback for non-blocking calculation
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        const result = runningBalanceCalculator.calculate(
          transactions,
          initialBalance,
          cacheKey
        );
        setBalances(result);
        setCalculating(false);
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        const result = runningBalanceCalculator.calculate(
          transactions,
          initialBalance,
          cacheKey
        );
        setBalances(result);
        setCalculating(false);
      }, 0);
    }
  }, [transactions, initialBalance, cacheKey]);

  return { balances, calculating };
};

// Import React for the hook
import React from 'react';

