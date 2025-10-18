/**
 * Event Account Service
 * 活动账户服务
 * 
 * 管理活动专用财务账户，支持收入/支出追踪和财务预测
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type {
  EventAccount,
  EventAccountTransaction,
  EventAccountTransactionType,
} from '../types';

/**
 * Create or Get Event Account
 */
export const getOrCreateEventAccount = async (
  eventId: string,
  eventName: string,
  userId: string
): Promise<EventAccount> => {
  try {
    // Check if account already exists
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNTS),
      where('eventId', '==', eventId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.size > 0) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: safeTimestampToISO(doc.data().createdAt),
        updatedAt: safeTimestampToISO(doc.data().updatedAt),
        closedAt: doc.data().closedAt ? safeTimestampToISO(doc.data().closedAt) : undefined,
      } as EventAccount;
    }
    
    // Create new account
    const now = new Date().toISOString();
    
    const account: Omit<EventAccount, 'id'> = {
      eventId,
      eventName,
      status: 'active',
      budgetIncome: 0,
      budgetExpense: 0,
      targetProfit: 0,
      actualIncome: 0,
      actualExpense: 0,
      actualProfit: 0,
      forecastIncome: 0,
      forecastExpense: 0,
      forecastProfit: 0,
      incomeByCategory: {},
      expenseByCategory: {},
      transactions: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };
    
    const cleanData = cleanUndefinedValues(account);
    
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNTS),
      cleanData
    );
    
    globalSystemService.log(
      'info',
      'Event account created',
      'eventAccountService.getOrCreateEventAccount',
      { accountId: docRef.id, eventId, eventName }
    );
    
    return {
      id: docRef.id,
      ...cleanData,
    } as EventAccount;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get or create event account',
      'eventAccountService.getOrCreateEventAccount',
      { error: error.message, eventId }
    );
    throw error;
  }
};

/**
 * Add Transaction to Event Account
 */
export const addEventAccountTransaction = async (
  accountId: string,
  data: {
    transactionDate: Date | string;
    transactionType: EventAccountTransactionType;
    category: string;
    description: string;
    amount: number;
    payerPayee?: string;
    paymentMethod?: string;
    receiptNumber?: string;
    invoiceNumber?: string;
    notes?: string;
    attachments?: string[];
    isForecast: boolean;
    forecastConfidence?: 'high' | 'medium' | 'low';
  },
  userId: string
): Promise<void> => {
  try {
    const accountRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNTS, accountId);
    const accountDoc = await getDoc(accountRef);
    
    if (!accountDoc.exists()) {
      throw new Error('Event account not found');
    }
    
    const accountData = accountDoc.data() as EventAccount;
    const now = new Date().toISOString();
    const transactionDate = typeof data.transactionDate === 'string'
      ? data.transactionDate
      : globalDateService.formatDate(data.transactionDate, 'api');
    
    // Create transaction record
    const transaction: EventAccountTransaction = {
      id: Date.now().toString(),
      transactionDate,
      transactionType: data.transactionType,
      category: data.category,
      description: data.description,
      amount: data.amount,
      payerPayee: data.payerPayee,
      paymentMethod: data.paymentMethod,
      receiptNumber: data.receiptNumber,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes,
      attachments: data.attachments || [],
      isForecast: data.isForecast,
      forecastConfidence: data.forecastConfidence,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };
    
    // Update account totals
    let actualIncome = accountData.actualIncome || 0;
    let actualExpense = accountData.actualExpense || 0;
    let forecastIncome = accountData.forecastIncome || 0;
    let forecastExpense = accountData.forecastExpense || 0;
    const incomeByCategory = accountData.incomeByCategory ? { ...accountData.incomeByCategory } : {};
    const expenseByCategory = accountData.expenseByCategory ? { ...accountData.expenseByCategory } : {};
    
    if (data.isForecast) {
      // 预测数据
      if (data.transactionType === 'income') {
        forecastIncome += data.amount;
        incomeByCategory[data.category] = (incomeByCategory[data.category] || 0) + data.amount;
      } else {
        forecastExpense += data.amount;
        expenseByCategory[data.category] = (expenseByCategory[data.category] || 0) + data.amount;
      }
    } else {
      // 实际数据
      if (data.transactionType === 'income') {
        actualIncome += data.amount;
        incomeByCategory[data.category] = (incomeByCategory[data.category] || 0) + data.amount;
      } else {
        actualExpense += data.amount;
        expenseByCategory[data.category] = (expenseByCategory[data.category] || 0) + data.amount;
      }
    }
    
    const actualProfit = actualIncome - actualExpense;
    const forecastProfit = forecastIncome - forecastExpense;
    
    // Update account
    await updateDoc(accountRef, cleanUndefinedValues({
      actualIncome,
      actualExpense,
      actualProfit,
      forecastIncome,
      forecastExpense,
      forecastProfit,
      incomeByCategory,
      expenseByCategory,
      transactions: [...(accountData.transactions || []), transaction.id],
      updatedAt: now,
      updatedBy: userId,
    }));
    
    // Store transaction in sub-collection or separate collection
    // For now, we'll store transactions within the account document's transactions array
    // In production, consider using a sub-collection for better scalability
    
    globalSystemService.log(
      'info',
      'Transaction added to event account',
      'eventAccountService.addEventAccountTransaction',
      { accountId, transactionType: data.transactionType, amount: data.amount, isForecast: data.isForecast }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to add transaction to event account',
      'eventAccountService.addEventAccountTransaction',
      { error: error.message, accountId }
    );
    throw error;
  }
};

/**
 * Update Event Account Budget
 */
export const updateEventAccountBudget = async (
  accountId: string,
  data: {
    budgetIncome?: number;
    budgetExpense?: number;
    targetProfit?: number;
    notes?: string;
  },
  userId: string
): Promise<void> => {
  try {
    const accountRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNTS, accountId);
    
    const updates: any = {
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    
    if (data.budgetIncome !== undefined) updates.budgetIncome = data.budgetIncome;
    if (data.budgetExpense !== undefined) updates.budgetExpense = data.budgetExpense;
    if (data.targetProfit !== undefined) updates.targetProfit = data.targetProfit;
    if (data.notes !== undefined) updates.notes = data.notes;
    
    const cleanData = cleanUndefinedValues(updates);
    await updateDoc(accountRef, cleanData);
    
    globalSystemService.log(
      'info',
      'Event account budget updated',
      'eventAccountService.updateEventAccountBudget',
      { accountId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to update event account budget',
      'eventAccountService.updateEventAccountBudget',
      { error: error.message, accountId }
    );
    throw error;
  }
};

/**
 * Close Event Account
 */
export const closeEventAccount = async (
  accountId: string,
  userId: string
): Promise<void> => {
  try {
    const accountRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNTS, accountId);
    
    await updateDoc(accountRef, cleanUndefinedValues({
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: userId,
      updatedAt: new Date().toISOString(),
    }));
    
    globalSystemService.log(
      'info',
      'Event account closed',
      'eventAccountService.closeEventAccount',
      { accountId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to close event account',
      'eventAccountService.closeEventAccount',
      { error: error.message, accountId }
    );
    throw error;
  }
};

/**
 * Add Multiple Transactions to Event Account (Bulk Operation)
 * 批量添加交易记录到活动账户
 */
export const addBulkEventAccountTransactions = async (
  accountId: string,
  transactions: Array<{
    description: string;
    remark: string;
    amount: number;
    paymentDate: string;
    transactionType: EventAccountTransactionType;
    category: string;
    isForecast?: boolean;
    forecastConfidence?: 'high' | 'medium' | 'low';
  }>,
  userId: string
): Promise<void> => {
  try {
    const accountRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNTS, accountId);
    const accountDoc = await getDoc(accountRef);
    
    if (!accountDoc.exists()) {
      throw new Error('Event account not found');
    }
    
    const accountData = accountDoc.data() as EventAccount;
    const now = new Date().toISOString();
    
    // Initialize totals
    let actualIncome = accountData.actualIncome || 0;
    let actualExpense = accountData.actualExpense || 0;
    let forecastIncome = accountData.forecastIncome || 0;
    let forecastExpense = accountData.forecastExpense || 0;
    const incomeByCategory = accountData.incomeByCategory ? { ...accountData.incomeByCategory } : {};
    const expenseByCategory = accountData.expenseByCategory ? { ...accountData.expenseByCategory } : {};
    
    // Process each transaction
    const transactionIds: string[] = [];
    
    transactions.forEach((txnData, index) => {
      const transactionId = `${Date.now()}-${index}`;
      transactionIds.push(transactionId);
      
      const isForecast = txnData.isForecast || false;
      
      if (isForecast) {
        // 预测数据
        if (txnData.transactionType === 'income') {
          forecastIncome += txnData.amount;
          incomeByCategory[txnData.category] = (incomeByCategory[txnData.category] || 0) + txnData.amount;
        } else {
          forecastExpense += txnData.amount;
          expenseByCategory[txnData.category] = (expenseByCategory[txnData.category] || 0) + txnData.amount;
        }
      } else {
        // 实际数据
        if (txnData.transactionType === 'income') {
          actualIncome += txnData.amount;
          incomeByCategory[txnData.category] = (incomeByCategory[txnData.category] || 0) + txnData.amount;
        } else {
          actualExpense += txnData.amount;
          expenseByCategory[txnData.category] = (expenseByCategory[txnData.category] || 0) + txnData.amount;
        }
      }
    });
    
    const actualProfit = actualIncome - actualExpense;
    const forecastProfit = forecastIncome - forecastExpense;
    
    // Update account with new totals
    await updateDoc(accountRef, cleanUndefinedValues({
      actualIncome,
      actualExpense,
      actualProfit,
      forecastIncome,
      forecastExpense,
      forecastProfit,
      incomeByCategory,
      expenseByCategory,
      transactions: [...(accountData.transactions || []), ...transactionIds],
      updatedAt: now,
      updatedBy: userId,
    }));
    
    globalSystemService.log(
      'info',
      'Bulk transactions added to event account',
      'eventAccountService.addBulkEventAccountTransactions',
      { 
        accountId, 
        transactionCount: transactions.length,
        totalAmount: transactions.reduce((sum, txn) => sum + txn.amount, 0),
        userId 
      }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to add bulk transactions to event account',
      'eventAccountService.addBulkEventAccountTransactions',
      { error: error.message, accountId, transactionCount: transactions.length }
    );
    throw error;
  }
};

/**
 * Get Event Account Transactions
 * 获取活动账户交易记录
 */
export const getEventAccountTransactions = async (
  accountId: string
): Promise<EventAccountTransaction[]> => {
  try {
    const accountRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNTS, accountId);
    const accountDoc = await getDoc(accountRef);
    
    if (!accountDoc.exists()) {
      // Account doesn't exist yet, return empty array
      return [];
    }
    
    const accountData = accountDoc.data() as EventAccount;
    
    // For now, return empty array as transactions are stored within account
    // In production, implement sub-collection query
    return [];
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get event account transactions',
      'eventAccountService.getEventAccountTransactions',
      { error: error.message, accountId }
    );
    // Return empty array instead of throwing error
    return [];
  }
};

console.log('✅ Event Account Service Loaded');

