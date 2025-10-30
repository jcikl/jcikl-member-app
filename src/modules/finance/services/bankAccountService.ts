/**
 * Bank Account Service
 * 银行账户服务
 * 
 * Handles all bank account-related operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type {
  BankAccount,
  BankAccountFormData,
  BankAccountStatus,
  Transaction,
} from '../types';

/**
 * Create Bank Account
 */
export const createBankAccount = async (
  data: BankAccountFormData,
  userId: string
): Promise<BankAccount> => {
  try {
    const now = new Date().toISOString();
    
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await unsetDefaultBankAccount();
    }
    
    const account: Omit<BankAccount, 'id'> = {
      accountName: data.accountName,
      accountNumber: data.accountNumber,
      bankName: data.bankName,
      accountType: data.accountType,
      currency: data.currency || 'MYR',
      // balance字段已移除 - 余额通过实时计算获得
      initialBalance: data.initialBalance,
      status: data.status,
      description: data.description,
      isDefault: data.isDefault,
      createdAt: now,
      updatedAt: now,
    };
    
    const cleanData = cleanUndefinedValues(account);
    
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS),
      cleanData
    );
    
    globalSystemService.log(
      'info',
      'Bank account created',
      'bankAccountService.createBankAccount',
      { accountId: docRef.id, userId }
    );
    
    return {
      id: docRef.id,
      ...account,
    } as BankAccount;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to create bank account',
      'bankAccountService.createBankAccount',
      { error: error.message, userId }
    );
    throw error;
  }
};

/**
 * Update Bank Account
 */
export const updateBankAccount = async (
  accountId: string,
  data: Partial<BankAccountFormData>,
  userId: string
): Promise<void> => {
  try {
    const accountRef = doc(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS, accountId);
    
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await unsetDefaultBankAccount();
    }
    
    const updates: Partial<BankAccount> = {
      updatedAt: new Date().toISOString(),
    };
    
    if (data.accountName !== undefined) updates.accountName = data.accountName;
    if (data.accountNumber !== undefined) updates.accountNumber = data.accountNumber;
    if (data.bankName !== undefined) updates.bankName = data.bankName;
    if (data.accountType !== undefined) updates.accountType = data.accountType;
    if (data.currency !== undefined) updates.currency = data.currency;
    if (data.status !== undefined) updates.status = data.status;
    if (data.description !== undefined) updates.description = data.description ?? null;
    if (data.isDefault !== undefined) updates.isDefault = data.isDefault;
    
    const cleanData = cleanUndefinedValues(updates);
    await updateDoc(accountRef, cleanData);
    
    globalSystemService.log(
      'info',
      'Bank account updated',
      'bankAccountService.updateBankAccount',
      { accountId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to update bank account',
      'bankAccountService.updateBankAccount',
      { error: error.message, accountId, userId }
    );
    throw error;
  }
};

/**
 * Delete Bank Account
 */
export const deleteBankAccount = async (
  accountId: string,
  userId: string
): Promise<void> => {
  try {
    // Check if account has transactions
    const transactionsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('bankAccountId', '==', accountId),
      limit(1)
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    
    if (!transactionsSnapshot.empty) {
      throw new Error('Cannot delete bank account with existing transactions');
    }
    
    const accountRef = doc(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS, accountId);
    await deleteDoc(accountRef);
    
    globalSystemService.log(
      'info',
      'Bank account deleted',
      'bankAccountService.deleteBankAccount',
      { accountId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to delete bank account',
      'bankAccountService.deleteBankAccount',
      { error: error.message, accountId, userId }
    );
    throw error;
  }
};

/**
 * Get Bank Account by ID
 */
export const getBankAccountById = async (
  accountId: string
): Promise<BankAccount | null> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS, accountId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: safeTimestampToISO(data.createdAt),
      updatedAt: safeTimestampToISO(data.updatedAt),
      lastTransactionDate: data.lastTransactionDate ? safeTimestampToISO(data.lastTransactionDate) : undefined,
      lastReconciliationDate: data.lastReconciliationDate ? safeTimestampToISO(data.lastReconciliationDate) : undefined,
    } as BankAccount;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get bank account',
      'bankAccountService.getBankAccountById',
      { error: error.message, accountId }
    );
    throw error;
  }
};

/**
 * Get All Bank Accounts
 */
export const getAllBankAccounts = async (
  status?: BankAccountStatus
): Promise<BankAccount[]> => {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (status) {
      constraints.push(where('status', '==', status));
    }
    
    constraints.push(orderBy('isDefault', 'desc'));
    constraints.push(orderBy('accountName', 'asc'));
    
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS),
      ...constraints
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: safeTimestampToISO(doc.data().createdAt),
      updatedAt: safeTimestampToISO(doc.data().updatedAt),
      lastTransactionDate: doc.data().lastTransactionDate ? safeTimestampToISO(doc.data().lastTransactionDate) : undefined,
      lastReconciliationDate: doc.data().lastReconciliationDate ? safeTimestampToISO(doc.data().lastReconciliationDate) : undefined,
    } as BankAccount));
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get bank accounts',
      'bankAccountService.getAllBankAccounts',
      { error: error.message, status }
    );
    throw error;
  }
};

/**
 * Get Default Bank Account
 */
export const getDefaultBankAccount = async (): Promise<BankAccount | null> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS),
      where('isDefault', '==', true),
      where('status', '==', 'active'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
      createdAt: safeTimestampToISO(data.createdAt),
      updatedAt: safeTimestampToISO(data.updatedAt),
      lastTransactionDate: data.lastTransactionDate ? safeTimestampToISO(data.lastTransactionDate) : undefined,
      lastReconciliationDate: data.lastReconciliationDate ? safeTimestampToISO(data.lastReconciliationDate) : undefined,
    } as BankAccount;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get default bank account',
      'bankAccountService.getDefaultBankAccount',
      { error: error.message }
    );
    throw error;
  }
};

/**
 * Unset Default Bank Account
 */
const unsetDefaultBankAccount = async (): Promise<void> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS),
      where('isDefault', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        isDefault: false,
        updatedAt: new Date().toISOString(),
      })
    );
    
    await Promise.all(updatePromises);
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to unset default bank account',
      'bankAccountService.unsetDefaultBankAccount',
      { error: error.message }
    );
    throw error;
  }
};

/**
 * ⚠️ DEPRECATED - updateAccountBalance已移除
 * balance字段已废弃，余额通过实时计算获得
 * 
 * 如需对账，请使用reconcileBankAccount记录对账日期
 */

/**
 * Reconcile Bank Account
 * 记录对账日期(不再更新balance字段)
 */
export const reconcileBankAccount = async (
  accountId: string,
  userId: string
): Promise<void> => {
  try {
    const accountRef = doc(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS, accountId);
    
    await updateDoc(accountRef, {
      lastReconciliationDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    globalSystemService.log(
      'info',
      'Bank account reconciled',
      'bankAccountService.reconcileBankAccount',
      { accountId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to reconcile bank account',
      'bankAccountService.reconcileBankAccount',
      { error: error.message, accountId, userId }
    );
    throw error;
  }
};

/**
 * Get Total Balance Across All Accounts
 * 获取所有账户的总余额(通过实时计算)
 * 
 * 计算逻辑：
 * 总余额 = Σ(每个账户的initialBalance + 该账户所有交易的净额)
 */
export const getTotalBalance = async (): Promise<number> => {
  try {
    // Step 1: 获取所有活跃账户
    const accountsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS),
      where('status', '==', 'active')
    );
    
    const accountsSnapshot = await getDocs(accountsQuery);
    
    if (accountsSnapshot.empty) {
      return 0;
    }
    
    // Step 2: 获取所有交易
    const transactionsSnapshot = await getDocs(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS)
    );
    
    // Step 3: 按账户汇总交易净额
    const accountNetAmounts: Record<string, number> = {};
    
    transactionsSnapshot.docs.forEach(txnDoc => {
      const txn = txnDoc.data();
      
      // 跳过虚拟交易(子交易)
      if (txn.isVirtual || txn.parentTransactionId) {
        return;
      }
      
      const accountId = txn.bankAccountId;
      if (!accountId) return;
      
      // 计算净额
      let netAmount = 0;
      if (txn.amount !== undefined && txn.transactionType) {
        // 新结构
        netAmount = txn.transactionType === 'income' ? txn.amount : -txn.amount;
      } else if (txn.income !== undefined && txn.expense !== undefined) {
        // 旧结构(向后兼容)
        netAmount = txn.income - txn.expense;
      }
      
      if (!accountNetAmounts[accountId]) {
        accountNetAmounts[accountId] = 0;
      }
      accountNetAmounts[accountId] += netAmount;
    });
    
    // Step 4: 累加所有账户的余额
    let totalBalance = 0;
    
    accountsSnapshot.docs.forEach(accountDoc => {
      const accountData = accountDoc.data();
      const accountId = accountDoc.id;
      const initialBalance = accountData.initialBalance || 0;
      const netAmount = accountNetAmounts[accountId] || 0;
      
      // 账户余额 = 初始余额 + 交易净额
      const accountBalance = initialBalance + netAmount;
      totalBalance += accountBalance;
    });
    
    return totalBalance;
    
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get total balance',
      'bankAccountService.getTotalBalance',
      { error: error.message }
    );
    throw error;
  }
};

// ========== 月份财务数据 ==========

export interface MonthlyFinancialData {
  month: number;              // 1-12
  monthName: string;          // "1月", "2月", etc.
  year: number;               // 年份
  openingBalance: number;     // 月初余额
  totalIncome: number;        // 月总收入
  totalExpense: number;       // 月总支出
  closingBalance: number;     // 月末余额
  transactionCount: number;   // 月交易数
}

/**
 * 获取指定银行账户的月份财务数据
 */
export const getBankAccountMonthlyData = async (
  bankAccountId: string,
  year: number = new Date().getFullYear()
): Promise<MonthlyFinancialData[]> => {
  try {
    console.log('📊 [getBankAccountMonthlyData] Starting...', { bankAccountId, year });
    
    // 获取银行账户信息
    const account = await getBankAccountById(bankAccountId);
    if (!account) {
      throw new Error('银行账户不存在');
    }
    
    // 获取该账户的所有交易记录
    const transactionsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('bankAccountId', '==', bankAccountId),
      orderBy('transactionDate', 'asc')
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      transactionDate: safeTimestampToISO(doc.data().transactionDate),
    })) as Transaction[];
    
    console.log('📊 [getBankAccountMonthlyData] Found transactions:', transactions.length);
    
    // 按月份分组计算财务数据
    const monthlyData: MonthlyFinancialData[] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      
      // 过滤当月交易
      const monthTransactions = transactions.filter(tx => {
        if (!tx.transactionDate) return false;
        const txDate = new Date(tx.transactionDate);
        return txDate >= monthStart && txDate <= monthEnd;
      });
      
      // 计算月初余额(上月月末余额)
      let openingBalance = 0;
      if (month === 1) {
        // 1月的月初余额 = 账户初始余额 + 去年12月之前的交易
        openingBalance = account.initialBalance || 0;
        const lastYearTransactions = transactions.filter(tx => {
          if (!tx.transactionDate) return false;
          const txDate = new Date(tx.transactionDate);
          return txDate.getFullYear() < year;
        });
        
        lastYearTransactions.forEach(tx => {
          // 🆕 计算去年余额时也只统计父交易
          if (!tx.parentTransactionId) {
            if (tx.transactionType === 'income') {
              openingBalance += tx.amount;
            } else {
              openingBalance -= tx.amount;
            }
          }
        });
      } else {
        // 其他月份的月初余额 = 上月月末余额
        const prevMonthData = monthlyData[month - 2];
        openingBalance = prevMonthData.closingBalance;
      }
      
      // 计算当月收入和支出
      // 🆕 只统计父交易记录(排除子交易，避免重复计算)
      let totalIncome = 0;
      let totalExpense = 0;
      
      monthTransactions.forEach(tx => {
        // 只统计父交易(没有parentTransactionId的交易)
        if (!tx.parentTransactionId) {
          if (tx.transactionType === 'income') {
            totalIncome += tx.amount;
          } else {
            totalExpense += tx.amount;
          }
        }
      });
      
      // 计算月末余额
      const closingBalance = openingBalance + totalIncome - totalExpense;
      
      monthlyData.push({
        month,
        monthName: `${month}月`,
        year,
        openingBalance,
        totalIncome,
        totalExpense,
        closingBalance,
        transactionCount: monthTransactions.filter(tx => !tx.parentTransactionId).length, // 🆕 只统计父交易数量
      });
    }
    
    console.log('📊 [getBankAccountMonthlyData] Monthly data calculated:', monthlyData.length);
    return monthlyData;
    
  } catch (error) {
    console.error('❌ [getBankAccountMonthlyData] Failed:', error);
    throw error;
  }
};

/**
 * 获取所有银行账户的月份财务数据汇总
 */
export const getAllBankAccountsMonthlyData = async (
  year: number = new Date().getFullYear()
): Promise<MonthlyFinancialData[]> => {
  try {
    console.log('📊 [getAllBankAccountsMonthlyData] Starting...', { year });
    
    // 获取所有活跃银行账户
    const accounts = await getAllBankAccounts('active');
    
    // 获取所有交易记录
    const transactionsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      orderBy('transactionDate', 'asc')
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      transactionDate: safeTimestampToISO(doc.data().transactionDate),
    })) as Transaction[];
    
    console.log('📊 [getAllBankAccountsMonthlyData] Found accounts:', accounts.length);
    console.log('📊 [getAllBankAccountsMonthlyData] Found transactions:', transactions.length);
    
    // 按月份分组计算财务数据
    const monthlyData: MonthlyFinancialData[] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      
      // 过滤当月交易
      const monthTransactions = transactions.filter(tx => {
        if (!tx.transactionDate) return false;
        const txDate = new Date(tx.transactionDate);
        return txDate >= monthStart && txDate <= monthEnd;
      });
      
      // 计算月初余额(上月月末余额)
      let openingBalance = 0;
      if (month === 1) {
        // 1月的月初余额 = 所有账户初始余额 + 去年12月之前的交易
        openingBalance = accounts.reduce((sum, account) => sum + (account.initialBalance || 0), 0);
        const lastYearTransactions = transactions.filter(tx => {
          if (!tx.transactionDate) return false;
          const txDate = new Date(tx.transactionDate);
          return txDate.getFullYear() < year;
        });
        
        lastYearTransactions.forEach(tx => {
          // 🆕 计算去年余额时也只统计父交易
          if (!tx.parentTransactionId) {
            if (tx.transactionType === 'income') {
              openingBalance += tx.amount;
            } else {
              openingBalance -= tx.amount;
            }
          }
        });
      } else {
        // 其他月份的月初余额 = 上月月末余额
        const prevMonthData = monthlyData[month - 2];
        openingBalance = prevMonthData.closingBalance;
      }
      
      // 计算当月收入和支出
      // 🆕 只统计父交易记录(排除子交易，避免重复计算)
      let totalIncome = 0;
      let totalExpense = 0;
      
      monthTransactions.forEach(tx => {
        // 只统计父交易(没有parentTransactionId的交易)
        if (!tx.parentTransactionId) {
          if (tx.transactionType === 'income') {
            totalIncome += tx.amount;
          } else {
            totalExpense += tx.amount;
          }
        }
      });
      
      // 计算月末余额
      const closingBalance = openingBalance + totalIncome - totalExpense;
      
      monthlyData.push({
        month,
        monthName: `${month}月`,
        year,
        openingBalance,
        totalIncome,
        totalExpense,
        closingBalance,
        transactionCount: monthTransactions.filter(tx => !tx.parentTransactionId).length, // 🆕 只统计父交易数量
      });
    }
    
    console.log('📊 [getAllBankAccountsMonthlyData] Monthly data calculated:', monthlyData.length);
    return monthlyData;
    
  } catch (error) {
    console.error('❌ [getAllBankAccountsMonthlyData] Failed:', error);
    throw error;
  }
};

console.log('✅ Bank Account Service Loaded');

