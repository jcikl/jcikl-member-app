/**
 * Internal Transfer Service
 * 内部转账服务
 * 
 * 用于检测、配对和管理内部转账交易
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type { Transaction } from '../types';

/**
 * Internal Transfer Pair
 * 内部转账配对
 */
export interface InternalTransferPair {
  from: Transaction;    // 转出交易
  to: Transaction;     // 转入交易
  date: string;        // 交易日期
  amount: number;      // 转账金额
  fromAccount: string; // 转出账户
  toAccount: string;   // 转入账户
  confidence: number;  // 配对置信度 (0-1)
  notes?: string;      // 备注
}

/**
 * Detect Potential Internal Transfer Pairs
 * 检测潜在的内部转账配对
 */
export const detectPotentialPairs = async (
  dateRange?: { startDate: string; endDate: string }
): Promise<InternalTransferPair[]> => {
  try {
    console.log('🔍 [detectPotentialPairs] 开始检测内部转账配对');
    
    // 🆕 只获取标记为内部转账的记录（txAccount='TXGA-0007'）
    let transactionsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('txAccount', '==', 'TXGA-0007')
    );
    
    // 如果提供了日期范围，添加日期过滤
    if (dateRange) {
      transactionsQuery = query(
        transactionsQuery,
        where('transactionDate', '>=', dateRange.startDate),
        where('transactionDate', '<=', dateRange.endDate)
      );
    }
    
    const snapshot = await getDocs(transactionsQuery);
    const allTransactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      transactionDate: safeTimestampToISO(doc.data().transactionDate) || '',
    } as Transaction));
    
    // 过滤掉虚拟交易（子交易）
    const transactions = allTransactions.filter(tx => !tx.isVirtual && !tx.parentTransactionId);
    
    console.log(`📊 [detectPotentialPairs] 获取到 ${allTransactions.length} 条总记录，过滤后 ${transactions.length} 条有效记录`);
    
    // 按日期和金额分组（兼容时区问题：允许同一金额在同一天的不同UTC时间）
    const groups = new Map<string, Transaction[]>();
    
    transactions.forEach(tx => {
      const fullDate = tx.transactionDate.slice(0, 10); // YYYY-MM-DD
      const amount = tx.amount;
      
      // 🆕 处理时区问题：计算3天的可能日期（前1天、当天、后1天）
      const dateObj = new Date(tx.transactionDate);
      const dates = [
        new Date(dateObj.getTime() - 86400000).toISOString().slice(0, 10), // 前1天
        fullDate,
        new Date(dateObj.getTime() + 86400000).toISOString().slice(0, 10), // 后1天
      ];
      
      // 🔍 调试特定金额的记录
      if (amount === 7498.52) {
        console.log('🔍 [detectPotentialPairs] RM 7498.52 记录:', {
          id: tx.id,
          transactionDate: tx.transactionDate,
          fullDate: fullDate,
          possibleDates: dates,
          transactionType: tx.transactionType,
        });
      }
      
      // 🆕 将交易添加到所有可能的日期分组中
      dates.forEach(date => {
        const key = `${date}_${amount}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(tx);
      });
    });
    
    // 查找配对
    const pairs: InternalTransferPair[] = [];
    const pairedExpenseIds = new Set<string>(); // 🆕 记录已配对的支出ID
    const pairedIncomeIds = new Set<string>(); // 🆕 记录已配对的收入ID
    
    groups.forEach((group, key) => {
      const expenses = group.filter(t => t.transactionType === 'expense');
      const incomes = group.filter(t => t.transactionType === 'income');
      
      if (expenses.length > 0 || incomes.length > 0) {
        console.log(`🔍 [detectPotentialPairs] 分组 ${key}: 支出 ${expenses.length}条, 收入 ${incomes.length}条`);
      }
      
      // 🆕 标记已使用的收入记录，避免重复配对
      const usedIncomes = new Set<string>();
      
      expenses.forEach(exp => {
        // 🆕 跳过已配对的支出记录
        if (pairedExpenseIds.has(exp.id)) return;
        
        const match = incomes.find(inc => 
          !usedIncomes.has(inc.id) && // 🆕 确保收入未被使用
          !pairedIncomeIds.has(inc.id) && // 🆕 确保收入未被其他组配对
          inc.amount === exp.amount &&
          inc.bankAccountId !== exp.bankAccountId &&
          inc.id !== exp.id
        );
        
        if (match) {
          const [date, amount] = key.split('_');
          
          console.log(`✅ [detectPotentialPairs] 找到配对: ${exp.id} (${exp.transactionType}) <-> ${match.id} (${match.transactionType})`);
          
          // 🆕 标记该收入已被使用
          usedIncomes.add(match.id);
          
          // 🆕 标记支出和收入都已被配对
          pairedExpenseIds.add(exp.id);
          pairedIncomeIds.add(match.id);
          
          // 计算配对置信度
          let confidence = 1.0;
          
          // 如果描述包含关键词，提高置信度
          const expDesc = exp.mainDescription.toLowerCase();
          const incDesc = match.mainDescription.toLowerCase();
          if (expDesc.includes('转账') || expDesc.includes('transfer') ||
              incDesc.includes('转账') || incDesc.includes('transfer')) {
            confidence = 1.0;
          }
          
          pairs.push({
            from: exp,
            to: match,
            date,
            amount: parseFloat(amount),
            fromAccount: exp.bankAccountId,
            toAccount: match.bankAccountId,
            confidence,
          });
        }
      });
    });
    
    console.log(`✅ [detectPotentialPairs] 检测到 ${pairs.length} 对潜在内部转账`);
    
    return pairs;
  } catch (error: any) {
    console.error('❌ [detectPotentialPairs] 检测失败:', error);
    globalSystemService.log('error', 'Failed to detect internal transfer pairs', 'internalTransferService', { error });
    throw error;
  }
};

/**
 * Get Internal Transfer Statistics
 * 获取内部转账统计
 */
export const getInternalTransferStats = async (): Promise<{
  totalPairs: number;
  totalAmount: number;
  accountStats: Record<string, { transfers: number; amount: number }>;
}> => {
  try {
    const pairs = await detectPotentialPairs();
    
    const accountStats: Record<string, { transfers: number; amount: number }> = {};
    let totalAmount = 0;
    
    pairs.forEach(pair => {
      totalAmount += pair.amount;
      
      // 统计转出账户
      if (!accountStats[pair.fromAccount]) {
        accountStats[pair.fromAccount] = { transfers: 0, amount: 0 };
      }
      accountStats[pair.fromAccount].transfers++;
      accountStats[pair.fromAccount].amount += pair.amount;
      
      // 统计转入账户
      if (!accountStats[pair.toAccount]) {
        accountStats[pair.toAccount] = { transfers: 0, amount: 0 };
      }
      accountStats[pair.toAccount].transfers++;
      accountStats[pair.toAccount].amount += pair.amount;
    });
    
    return {
      totalPairs: pairs.length,
      totalAmount,
      accountStats,
    };
  } catch (error: any) {
    console.error('❌ [getInternalTransferStats] 统计失败:', error);
    throw error;
  }
};
