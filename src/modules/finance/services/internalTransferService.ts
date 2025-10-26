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
    
    // 按日期和金额分组
    const groups = new Map<string, Transaction[]>();
    transactions.forEach(tx => {
      const date = tx.transactionDate.slice(0, 10); // YYYY-MM-DD
      const amount = tx.amount;
      const key = `${date}_${amount}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    });
    
    // 查找配对
    const pairs: InternalTransferPair[] = [];
    
    groups.forEach((group, key) => {
      const expenses = group.filter(t => t.transactionType === 'expense');
      const incomes = group.filter(t => t.transactionType === 'income');
      
      expenses.forEach(exp => {
        const match = incomes.find(inc => 
          inc.amount === exp.amount &&
          inc.bankAccountId !== exp.bankAccountId &&
          inc.id !== exp.id
        );
        
        if (match) {
          const [date, amount] = key.split('_');
          
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
