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
  deleteDoc,
  deleteField,
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
  EventAccountTransactionStatus,
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
    transactionDate?: Date | string; // 🆕 日期可选
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
    
    // 🆕 转换日期(如果提供），允许为空
    let transactionDate = '';
    if (data.transactionDate) {
      transactionDate = typeof data.transactionDate === 'string'
        ? data.transactionDate
        : globalDateService.formatDate(data.transactionDate, 'api');
    }
    
    // 🆕 判断状态：如果有日期则为 completed，无日期则为 pending
    const status = transactionDate && transactionDate.trim() !== '' ? 'completed' : 'pending';
    
    // Create transaction record (id will be set after saving)
    const transaction = {
      accountId,
      transactionDate,
      transactionType: data.transactionType,
      category: data.category,
      description: data.description,
      amount: data.amount,
      status,
      payerPayee: data.payerPayee,
      paymentMethod: data.paymentMethod,
      receiptNumber: data.receiptNumber,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes,
      attachments: data.attachments || [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };
    
    // Update account totals - only update actual amounts
    let actualIncome = accountData.actualIncome || 0;
    let actualExpense = accountData.actualExpense || 0;
    const incomeByCategory = accountData.incomeByCategory ? { ...accountData.incomeByCategory } : {};
    const expenseByCategory = accountData.expenseByCategory ? { ...accountData.expenseByCategory } : {};
    
    if (data.transactionType === 'income') {
      actualIncome += data.amount;
      incomeByCategory[data.category] = (incomeByCategory[data.category] || 0) + data.amount;
    } else {
      actualExpense += data.amount;
      expenseByCategory[data.category] = (expenseByCategory[data.category] || 0) + data.amount;
    }
    
    const actualProfit = actualIncome - actualExpense;
    
    // Store transaction in separate collection
    const transactionRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_TRANSACTIONS),
      cleanUndefinedValues({
        ...transaction,
      })
    );
    
    // Update the transaction document with its ID
    await updateDoc(transactionRef, {
      id: transactionRef.id,
    });
    
    // Update account totals and transaction IDs
    await updateDoc(accountRef, cleanUndefinedValues({
      actualIncome,
      actualExpense,
      actualProfit,
      incomeByCategory,
      expenseByCategory,
      transactions: [...(accountData.transactions || []), transactionRef.id],
      updatedAt: now,
      updatedBy: userId,
    }));
    
    globalSystemService.log(
      'info',
      'Transaction added to event account',
      'eventAccountService.addEventAccountTransaction',
      { accountId, transactionType: data.transactionType, amount: data.amount }
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
    // Query transactions from the separate collection
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_TRANSACTIONS),
      where('accountId', '==', accountId)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id, // 🆕 强制使用文档ID，覆盖数据中的旧ID
    } as EventAccountTransaction));
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get event account transactions',
      'eventAccountService.getEventAccountTransactions',
      { error: error.message, accountId }
    );
    return [];
  }
};

/**
 * Get ALL unreconciled Event Account Transactions
 * 获取所有未核对(pending）的活动账目记录(跨所有活动账户）
 */
export const getAllUnreconciledEventAccountTransactions = async (): Promise<EventAccountTransaction[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_TRANSACTIONS),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as EventAccountTransaction));
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get all unreconciled event account transactions',
      'eventAccountService.getAllUnreconciledEventAccountTransactions',
      { error: error.message }
    );
    return [];
  }
};

/**
 * Delete Event Account Transaction
 * 删除活动账户交易记录
 */
export const deleteEventAccountTransaction = async (
  transactionId: string,
  userId: string
): Promise<void> => {
  try {
    const transactionRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_TRANSACTIONS, transactionId);
    const transactionDoc = await getDoc(transactionRef);
    
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }
    
    const transactionData = transactionDoc.data();
    const accountId = transactionData.accountId;
    
    // Get account data
    const accountRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNTS, accountId);
    const accountDoc = await getDoc(accountRef);
    
    if (!accountDoc.exists()) {
      throw new Error('Event account not found');
    }
    
    const accountData = accountDoc.data() as EventAccount;
    
    // Update account totals - subtract the transaction
    let actualIncome = accountData.actualIncome || 0;
    let actualExpense = accountData.actualExpense || 0;
    const incomeByCategory = accountData.incomeByCategory ? { ...accountData.incomeByCategory } : {};
    const expenseByCategory = accountData.expenseByCategory ? { ...accountData.expenseByCategory } : {};
    
    // 实际数据
    if (transactionData.transactionType === 'income') {
      actualIncome -= transactionData.amount;
      incomeByCategory[transactionData.category] = (incomeByCategory[transactionData.category] || 0) - transactionData.amount;
    } else {
      actualExpense -= transactionData.amount;
      expenseByCategory[transactionData.category] = (expenseByCategory[transactionData.category] || 0) - transactionData.amount;
    }
    
    const actualProfit = actualIncome - actualExpense;
    const now = new Date().toISOString();
    
    // Update account totals
    await updateDoc(accountRef, cleanUndefinedValues({
      actualIncome: Math.max(0, actualIncome),
      actualExpense: Math.max(0, actualExpense),
      actualProfit: Math.max(0, actualProfit),
      incomeByCategory,
      expenseByCategory,
      transactions: (accountData.transactions || []).filter((id: string) => id !== transactionId),
      updatedAt: now,
      updatedBy: userId,
    }));
    
    // Delete the transaction
    await deleteDoc(transactionRef);
    
    globalSystemService.log(
      'info',
      'Transaction deleted from event account',
      'eventAccountService.deleteEventAccountTransaction',
      { accountId, transactionId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to delete event account transaction',
      'eventAccountService.deleteEventAccountTransaction',
      { error: error.message, transactionId }
    );
    throw error;
  }
};

export const updateEventAccountTransaction = async (
  transactionId: string,
  updates: Partial<EventAccountTransaction>,
  userId: string
): Promise<void> => {
  try {
    console.log('🔄 [updateEventAccountTransaction] Starting update...', { transactionId, updates });
    
    const transactionRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_TRANSACTIONS, transactionId);
    
    // 🆕 先读取当前数据，检查更新前状态
    const currentDoc = await getDoc(transactionRef);
    const currentData = currentDoc.data();
    console.log('📄 [updateEventAccountTransaction] Current transaction data:', currentData);
    
    const dataToUpdate = cleanUndefinedValues({
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
    
    console.log('💾 [updateEventAccountTransaction] Data to update:', dataToUpdate);
    
    await updateDoc(transactionRef, dataToUpdate);
    
    // 🆕 验证更新是否成功
    const updatedDoc = await getDoc(transactionRef);
    const updatedData = updatedDoc.data();
    console.log('✅ [updateEventAccountTransaction] Transaction updated successfully:', transactionId);
    console.log('🔍 [updateEventAccountTransaction] Updated transaction data:', updatedData);
    
    // 🆕 双向同步：如果更新了reconciledBankTransactionId，同时更新对应的Transaction
    if (updates.reconciledBankTransactionId) {
      try {
        const bankTransactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, updates.reconciledBankTransactionId);
        await updateDoc(bankTransactionRef, cleanUndefinedValues({
          status: 'completed' as any, // TransactionStatus
          reconciledEventAccountTransactionId: transactionId, // 反向引用到活动账目记录
          updatedAt: new Date().toISOString(),
        }));
        console.log('✅ [updateEventAccountTransaction] Transaction synchronized:', updates.reconciledBankTransactionId);
      } catch (error: any) {
        console.error('⚠️ [updateEventAccountTransaction] Failed to sync Transaction:', error);
        // 不抛出错误，允许继续执行
      }
    }
    
    globalSystemService.log(
      'info',
      'Event account transaction updated',
      'eventAccountService.updateEventAccountTransaction',
      { transactionId, updates, userId }
    );
  } catch (error: any) {
    console.error('❌ [updateEventAccountTransaction] Failed to update transaction:', { transactionId, error });
    console.error('❌ [updateEventAccountTransaction] Error details:', error.message, error.stack);
    globalSystemService.log(
      'error',
      'Failed to update event account transaction',
      'eventAccountService.updateEventAccountTransaction',
      { error: error.message, transactionId }
    );
    throw error;
  }
};

/**
 * Clear reconciliation status from event account transaction
 * 清除活动账目记录的核对状态
 */
export const clearEventAccountTransactionReconciliation = async (
  transactionId: string,
  userId: string
): Promise<void> => {
  try {
    console.log('🔄 [clearEventAccountTransactionReconciliation] Starting clear...', { transactionId });
    
    const transactionRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_TRANSACTIONS, transactionId);
    
    // 🆕 使用 deleteField 删除 reconciledBankTransactionId 字段，并更新status为pending
    // 🆕 先读取当前的reconciledBankTransactionId，用于双向同步
    const currentDoc = await getDoc(transactionRef);
    const currentData = currentDoc.data();
    const bankTransactionId = currentData?.reconciledBankTransactionId;
    
    await updateDoc(transactionRef, {
      reconciledBankTransactionId: deleteField(),
      status: 'pending' as EventAccountTransactionStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
    
    // 🆕 双向同步：清除对应的Transaction的核对状态
    if (bankTransactionId) {
      try {
        const bankTransactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, bankTransactionId);
        await updateDoc(bankTransactionRef, {
          status: 'pending' as any, // TransactionStatus
          reconciledEventAccountTransactionId: deleteField(),
          updatedAt: new Date().toISOString(),
        });
        console.log('✅ [clearEventAccountTransactionReconciliation] Transaction synchronized:', bankTransactionId);
      } catch (error: any) {
        console.error('⚠️ [clearEventAccountTransactionReconciliation] Failed to sync Transaction:', error);
        // 不抛出错误，允许继续执行
      }
    }
    
    console.log('✅ [clearEventAccountTransactionReconciliation] Reconciliation cleared successfully:', transactionId);
    
    globalSystemService.log(
      'info',
      'Event account transaction reconciliation cleared',
      'eventAccountService.clearEventAccountTransactionReconciliation',
      { transactionId, userId }
    );
  } catch (error: any) {
    console.error('❌ [clearEventAccountTransactionReconciliation] Failed to clear reconciliation:', { transactionId, error });
    console.error('❌ [clearEventAccountTransactionReconciliation] Error details:', error.message, error.stack);
    globalSystemService.log(
      'error',
      'Failed to clear event account transaction reconciliation',
      'eventAccountService.clearEventAccountTransactionReconciliation',
      { error: error.message, transactionId }
    );
    throw error;
  }
};

