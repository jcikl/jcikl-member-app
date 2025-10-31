/**
 * Transaction Service
 * 交易服务
 * 
 * Handles all transaction-related operations
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
  deleteField,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type {
  Transaction,
  TransactionFormData,
  TransactionQueryParams,
  TransactionStatus,
} from '../types';
import type { PaginatedResponse } from '@/types';
import { 
  upsertMemberFeeFromTransaction, 
  reconcileMemberFeeFromTransactions 
} from './memberFeeService';
import { getMemberById } from '@/modules/member/services/memberService';
import { 
  upsertEventFinancialRecordFromTransaction,
  reconcileEventFinancialRecord 
} from './eventFinancialRecordService';
import { 
  upsertGeneralFinancialRecordFromTransaction,
  reconcileGeneralFinancialRecord 
} from './generalFinancialRecordService';

/**
 * Generate Transaction Number
 * Format: TXN-{YYYY}-{ACCT_LAST_4}-{SEQ_4}
 */
const generateTransactionNumber = async (
  bankAccountId: string,
  transactionDate: Date
): Promise<string> => {
  const year = transactionDate.getFullYear();
  
  // Get last 4 digits of account ID
  const acctLast4 = bankAccountId.slice(-4).padStart(4, '0');
  
  // Get next sequence number for this year and account
  const q = query(
    collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
    where('bankAccountId', '==', bankAccountId),
    where('transactionNumber', '>=', `TXN-${year}-${acctLast4}-0000`),
    where('transactionNumber', '<=', `TXN-${year}-${acctLast4}-9999`),
    orderBy('transactionNumber', 'desc'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  let nextSeq = 1;
  
  if (!snapshot.empty) {
    const lastNumber = snapshot.docs[0].data().transactionNumber;
    const lastSeq = parseInt(lastNumber.split('-')[3], 10);
    nextSeq = lastSeq + 1;
  }
  
  const seqStr = nextSeq.toString().padStart(4, '0');
  return `TXN-${year}-${acctLast4}-${seqStr}`;
};

/**
 * Get fiscal year from date
 * Fiscal year starts October 1
 * 
 * ⚠️ DEPRECATED: FiscalYear is now only used for reporting purposes
 * This function is kept for backward compatibility and report generation
 * @deprecated Use date ranges for filtering instead
 */
export const getFiscalYearFromDate = (date: Date): string => {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  
  // If Oct-Dec, it's current year's fiscal year
  // If Jan-Sep, it's previous year's fiscal year
  const fiscalYear = month >= 10 ? year : year - 1;
  return `FY${fiscalYear}`;
};

/**
 * Create Transaction
 */
export const createTransaction = async (
  data: TransactionFormData,
  userId: string
): Promise<Transaction> => {
  try {
    const transactionDate = data.transactionDate instanceof Date 
      ? data.transactionDate 
      : new Date(data.transactionDate);
    
    // Generate transaction number
    const transactionNumber = await generateTransactionNumber(
      data.bankAccountId,
      transactionDate
    );
    
    const now = new Date().toISOString();
    
    const transaction: Omit<Transaction, 'id'> = {
      transactionNumber,
      bankAccountId: data.bankAccountId,
      transactionDate: globalDateService.formatDate(transactionDate, 'api'),
      transactionType: data.transactionType,
      mainDescription: data.mainDescription,
      subDescription: data.subDescription,
      amount: data.amount,
      payerPayee: data.payerPayee,
      transactionPurpose: data.transactionPurpose,
      category: data.category,
      paymentMethod: data.paymentMethod,
      status: 'pending',
      inputBy: userId,
      notes: data.notes,
      attachments: data.attachments ?? [],
      receiptNumber: data.receiptNumber,
      invoiceNumber: data.invoiceNumber,
      tags: data.tags ?? [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
    
    // Clean undefined values
    const cleanData = cleanUndefinedValues(transaction);
    
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      cleanData
    );
    
    // 更新银行账户最后交易日期
    await updateBankAccountLastTransaction(data.bankAccountId);
    
    // Log operation
    globalSystemService.log('info', 'Transaction created', 'transactionService.createTransaction', 
      { transactionId: docRef.id, transactionNumber, userId });
    
    return {
      id: docRef.id,
      ...transaction,
    } as Transaction;
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to create transaction', 'transactionService.createTransaction',
      { error: error.message, userId });
    throw error;
  }
};

/**
 * Update Transaction
 */
export const updateTransaction = async (
  transactionId: string,
  data: Partial<TransactionFormData>,
  userId: string
): Promise<void> => {
  try {
    
    
    const transactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
    const transactionDoc = await getDoc(transactionRef);
    
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }
    
    const existingData = transactionDoc.data();
    
    
    const updates: Partial<Transaction> = {
      updatedAt: new Date().toISOString(),
    };
    
    // Update bank account ID if changed
    if (data.bankAccountId !== undefined) {
      updates.bankAccountId = data.bankAccountId;
      
    }
    
    // Update transaction date
    if (data.transactionDate) {
      const transactionDate = data.transactionDate instanceof Date 
        ? data.transactionDate 
        : new Date(data.transactionDate);
      updates.transactionDate = globalDateService.formatDate(transactionDate, 'api');
    }
    
    // Update description
    if (data.mainDescription !== undefined) {
      updates.mainDescription = data.mainDescription;
    }
    if (data.subDescription !== undefined) {
      updates.subDescription = data.subDescription ?? null;
    }
    
    // Update amount and transaction type (新结构)
    if (data.amount !== undefined && data.transactionType !== undefined) {
      updates.amount = data.amount;
      updates.transactionType = data.transactionType;
      
      // ⚠️ DEPRECATED: 仅为向后兼容保留，迁移完成后将移除
      // updates.income = data.transactionType === 'income' ? data.amount : 0;
      // updates.expense = data.transactionType === 'expense' ? data.amount : 0;
    }
    
    // Update other fields
    if (data.payerPayee !== undefined) updates.payerPayee = data.payerPayee ?? null;
    if (data.transactionPurpose !== undefined) updates.transactionPurpose = data.transactionPurpose ?? null;
    if (data.category !== undefined) updates.category = data.category ?? null;
    if (data.txAccount !== undefined) updates.txAccount = data.txAccount ?? null; // 🔑 二次分类
    if (data.paymentMethod !== undefined) updates.paymentMethod = data.paymentMethod ?? null;
    if (data.notes !== undefined) updates.notes = data.notes ?? null;
    // 🆕 更新活动关联字段
    if (data.relatedEventId !== undefined) updates.relatedEventId = data.relatedEventId ?? null;
    if (data.relatedEventName !== undefined) updates.relatedEventName = data.relatedEventName ?? null;
    if (data.attachments !== undefined) updates.attachments = data.attachments;
    if (data.receiptNumber !== undefined) updates.receiptNumber = data.receiptNumber ?? null;
    if (data.invoiceNumber !== undefined) updates.invoiceNumber = data.invoiceNumber ?? null;
    if (data.tags !== undefined) updates.tags = data.tags ?? [];
    // 🆕 Persist metadata (e.g., associated memberId)
    if (data.metadata !== undefined) {
      const existingMetadata = (existingData.metadata || {}) as Record<string, any>;
      updates.metadata = { ...existingMetadata, ...data.metadata };
    }
    
    const cleanData = cleanUndefinedValues(updates);
    
    
    await updateDoc(transactionRef, cleanData);
    
    
    // Handle bank account changes
    const oldBankAccountId = existingData.bankAccountId;
    const newBankAccountId = data.bankAccountId;
    const bankAccountChanged = newBankAccountId && newBankAccountId !== oldBankAccountId;
    
    
    
    // Calculate amount changes (支持新旧两种数据结构)
    let oldAmount: number;
    let newAmount: number;
    let amountChanged: boolean;
    
    // 优先使用新结构 (amount + transactionType)
    if (existingData.amount !== undefined && existingData.transactionType) {
      oldAmount = existingData.transactionType === 'income' 
        ? existingData.amount 
        : -existingData.amount;
    } else {
      // 回退到旧结构 (income/expense)
      oldAmount = (existingData.income || 0) - (existingData.expense || 0);
    }
    
    if (updates.amount !== undefined && updates.transactionType) {
      newAmount = updates.transactionType === 'income' 
        ? updates.amount 
        : -updates.amount;
      amountChanged = true;
    } else {
      newAmount = oldAmount;
      amountChanged = false;
    }
    
    
    
    // Update bank account balances
    if (bankAccountChanged) {
      
      
      // 更新旧账户的最后交易日期
      if (oldBankAccountId) {
        await updateBankAccountLastTransaction(oldBankAccountId);
      }
      
      // 更新新账户的最后交易日期
      if (newBankAccountId) {
        await updateBankAccountLastTransaction(newBankAccountId);
      }
      
      
    } else if (oldBankAccountId) {
      // 更新账户的最后交易日期
      await updateBankAccountLastTransaction(oldBankAccountId);
    }
    
    globalSystemService.log(
      'info',
      'Transaction updated',
      'transactionService.updateTransaction',
      { transactionId, userId }
    );

    // === 🆕 Auto-sync Member Fee from Transaction ===
    // When transaction category is 'member-fees' and has metadata.memberId,
    // automatically create/update memberFee record in FINANCIAL_RECORDS
      const finalCategory = updates.category ?? existingData.category;
      const finalMetadata = updates.metadata ?? existingData.metadata;
    const linkedMemberId = finalMetadata?.memberId;

    if (finalCategory === 'member-fees' && typeof linkedMemberId === 'string' && linkedMemberId.trim()) {
      

      try {
        // Fetch member details
        const member = await getMemberById(linkedMemberId);
        if (member) {
          const finalAmount = updates.amount ?? existingData.amount;
          const finalTransactionDate = updates.transactionDate ?? existingData.transactionDate;

          // Upsert memberFee record
        await upsertMemberFeeFromTransaction({
            memberId: member.id,
            memberName: member.name,
            memberEmail: member.email,
            memberCategory: member.category || (member.accountType as any),
            expectedAmount: finalAmount || 0,
            dueDate: safeTimestampToISO(finalTransactionDate),
            transactionId,
            userId,
          });

          // Reconcile to update paidAmount, paymentDate, status
          await reconcileMemberFeeFromTransactions(member.id);

          // 🆕 当存在会员费交易且已关联会员时，将其类别升级为 Probation Member（不覆盖 Alumni/Visiting/Probation）
          try {
            const currentCat = (member as any)?.jciCareer?.category as string | undefined;
            if (currentCat !== 'Alumni' && currentCat !== 'Visiting Member' && currentCat !== 'Probation Member') {
              await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, member.id), {
                'jciCareer.category': 'Probation Member',
                updatedAt: new Date().toISOString(),
              });
            }
          } catch {}

          globalSystemService.log('info', 'Member fee auto-synced from transaction', 'transactionService.updateTransaction', {
            transactionId,
            memberId: member.id,
            userId,
          });
        } else {
          console.warn('⚠️ [updateTransaction] Member not found for member fee sync:', linkedMemberId);
          globalSystemService.log('warning', 'Member not found for member fee sync', 'transactionService.updateTransaction', {
            transactionId,
          memberId: linkedMemberId,
            userId,
          });
        }
      } catch (syncError: any) {
        console.error('❌ [updateTransaction] Failed to auto-sync member fee:', syncError);
        globalSystemService.log('error', 'Failed to auto-sync member fee from transaction', 'transactionService.updateTransaction', {
          error: syncError.message,
          transactionId,
          memberId: linkedMemberId,
          userId,
        });
        // Don't throw - allow transaction update to succeed even if member fee sync fails
      }
    }

    // === 🆕 Auto-sync Event Financial from Transaction ===
    // When transaction category starts with 'event-' and has metadata.eventId,
    // automatically create/update eventFinancialRecord in FINANCIAL_RECORDS
    if (finalCategory.startsWith('event-') && finalMetadata?.eventId) {
      

      try {
        const finalAmount = updates.amount ?? existingData.amount;
        const finalTransactionType = updates.transactionType ?? existingData.transactionType;
        const finalTxAccount = updates.txAccount ?? existingData.txAccount;
        const finalPayerPayee = updates.payerPayee ?? existingData.payerPayee;

        // 🆕 获取会员信息(如果有 memberId)
        let memberName: string | undefined;
        let memberEmail: string | undefined;
        const linkedMemberId = finalMetadata?.memberId;
        if (typeof linkedMemberId === 'string' && linkedMemberId.trim()) {
          try {
            const member = await getMemberById(linkedMemberId);
            memberName = member?.name;
            memberEmail = member?.email;
          } catch (error) {
            console.warn('Failed to get member info:', error);
          }
        }

        await upsertEventFinancialRecordFromTransaction({
          eventId: finalMetadata.eventId,
          eventName: finalMetadata.eventName || 'Unknown Event',
          eventDate: finalMetadata.eventDate,
          fiscalYear: updates.fiscalYear ?? existingData.fiscalYear,
          txAccount: finalTxAccount,
          payerPayee: finalPayerPayee, // 🆕 传递付款人/收款人
          memberId: linkedMemberId, // 🆕 传递会员ID
          memberName, // 🆕 传递会员名字
          memberEmail, // 🆕 传递会员邮箱
          transactionId,
          amount: finalAmount || 0,
          transactionType: finalTransactionType,
          userId,
        });

        await reconcileEventFinancialRecord(finalMetadata.eventId);

        
        globalSystemService.log('info', 'Event financial auto-synced from transaction', 'transactionService.updateTransaction', {
          transactionId,
          eventId: finalMetadata.eventId,
          userId,
        });
      } catch (syncError: any) {
        console.error('❌ [updateTransaction] Failed to auto-sync event financial:', syncError);
        globalSystemService.log('error', 'Failed to auto-sync event financial from transaction', 'transactionService.updateTransaction', {
          error: syncError.message,
          transactionId,
          eventId: finalMetadata?.eventId,
          userId,
        });
        // Don't throw - allow transaction update to succeed even if sync fails
      }
    }

    // === 🆕 Auto-sync General Financial from Transaction ===
    // When transaction category starts with 'general-',
    // automatically create/update generalFinancialRecord in FINANCIAL_RECORDS
    if (finalCategory.startsWith('general-')) {
      

      try {
        const finalAmount = updates.amount ?? existingData.amount;
        const finalTransactionType = updates.transactionType ?? existingData.transactionType;
        const finalTxAccount = updates.txAccount ?? existingData.txAccount;
        const finalPayerPayee = updates.payerPayee ?? existingData.payerPayee;

        // 🆕 获取会员信息(如果有 memberId)
        let memberName: string | undefined;
        let memberEmail: string | undefined;
        const linkedMemberId = finalMetadata?.memberId;
        if (typeof linkedMemberId === 'string' && linkedMemberId.trim()) {
          try {
            const member = await getMemberById(linkedMemberId);
            memberName = member?.name;
            memberEmail = member?.email;
          } catch (error) {
            console.warn('Failed to get member info:', error);
          }
        }

        await upsertGeneralFinancialRecordFromTransaction({
          category: finalCategory,
          txAccount: finalTxAccount,
          fiscalYear: updates.fiscalYear ?? existingData.fiscalYear,
          payerPayee: finalPayerPayee, // 🆕 传递付款人/收款人
          memberId: linkedMemberId, // 🆕 传递会员ID
          memberName, // 🆕 传递会员名字
          memberEmail, // 🆕 传递会员邮箱
          transactionId,
          amount: finalAmount || 0,
          transactionType: finalTransactionType,
          userId,
        });

        await reconcileGeneralFinancialRecord(finalCategory, finalTxAccount);

        
        globalSystemService.log('info', 'General financial auto-synced from transaction', 'transactionService.updateTransaction', {
          transactionId,
          category: finalCategory,
          txAccount: finalTxAccount,
          userId,
        });
      } catch (syncError: any) {
        console.error('❌ [updateTransaction] Failed to auto-sync general financial:', syncError);
        globalSystemService.log('error', 'Failed to auto-sync general financial from transaction', 'transactionService.updateTransaction', {
          error: syncError.message,
          transactionId,
          category: finalCategory,
          userId,
        });
        // Don't throw - allow transaction update to succeed even if sync fails
      }
    }
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to update transaction',
      'transactionService.updateTransaction',
      { 
        error: error.message || error.toString(),
        errorCode: error.code,
        errorDetails: error,
        transactionId, 
        userId 
      }
    );
    throw error;
  }
};

/**
 * Delete Transaction
 */
export const deleteTransaction = async (
  transactionId: string,
  userId: string
): Promise<void> => {
  try {
    const transactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
    const transactionDoc = await getDoc(transactionRef);
    
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }
    
    const data = transactionDoc.data();
    
    
    
    // 更新账户最后交易日期
    await updateBankAccountLastTransaction(data.bankAccountId);
    
    await deleteDoc(transactionRef);
    
    globalSystemService.log(
      'info',
      'Transaction deleted',
      'transactionService.deleteTransaction',
      { transactionId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to delete transaction',
      'transactionService.deleteTransaction',
      { error: error.message, transactionId, userId }
    );
    throw error;
  }
};

/**
 * Get Transaction by ID
 */
export const getTransactionById = async (
  transactionId: string
): Promise<Transaction | null> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      transactionDate: safeTimestampToISO(data.transactionDate),
      createdAt: safeTimestampToISO(data.createdAt),
      updatedAt: safeTimestampToISO(data.updatedAt),
      approvedAt: data.approvedAt ? safeTimestampToISO(data.approvedAt) : undefined,
    } as Transaction;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get transaction',
      'transactionService.getTransactionById',
      { error: error.message, transactionId }
    );
    throw error;
  }
};

/**
 * Get All Parent Transactions (for balance calculation)
 * 获取所有父交易(用于余额计算)
 * 
 * @param bankAccountId - 银行账户ID
 * @param sortBy - 排序字段
 * @param sortOrder - 排序顺序
 * @returns 所有父交易列表(已排序)
 */
export const getAllParentTransactions = async (
  bankAccountId: string,
  sortBy: keyof Transaction = 'transactionDate',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<Transaction[]> => {
  try {
    // 查询该账户的所有交易
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('bankAccountId', '==', bankAccountId)
    );
    
    const snapshot = await getDocs(q);
    
    // 转换为Transaction对象并过滤出父交易
    let transactions = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          transactionDate: safeTimestampToISO(data.transactionDate),
          createdAt: safeTimestampToISO(data.createdAt),
          updatedAt: safeTimestampToISO(data.updatedAt),
        } as Transaction;
      })
      .filter(tx => !tx.isVirtual && !tx.parentTransactionId);
    
    // 排序
    transactions.sort((a, b) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return transactions;
  } catch (error) {
    console.error('❌ [getAllParentTransactions] 获取失败:', error);
    throw error;
  }
};

/**
 * Get Transactions (with pagination and filters)
 */
export const getTransactions = async (
  params: TransactionQueryParams = {}
): Promise<PaginatedResponse<Transaction>> => {
  try {
    const {
      page = 1,
      limit: pageLimit = 20,
      search,
      bankAccountId,
      transactionType,
      status,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      paymentMethod,
      sortBy = 'transactionDate',
      sortOrder = 'desc',
      includeVirtual = true, // 默认包含虚拟交易(向后兼容)
      parentTransactionId,
    } = params;
    
    // Simple query to avoid index requirements
    const q = query(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS));
    
    const snapshot = await getDocs(q);
    
    let transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      transactionDate: safeTimestampToISO(doc.data().transactionDate),
      createdAt: safeTimestampToISO(doc.data().createdAt),
      updatedAt: safeTimestampToISO(doc.data().updatedAt),
      approvedAt: doc.data().approvedAt ? safeTimestampToISO(doc.data().approvedAt) : undefined,
    } as Transaction));
    
    // 🔍 Debug: 原始查询结果(生产环境可注释)
    // console.log('🔍 [getTransactions] 原始查询结果:', {
    //   总交易数: transactions.length,
    //   子交易数: transactions.filter(t => t.isVirtual === true).length,
    //   category过滤值: category,
    // });
    
    // Filter in memory
    if (bankAccountId) {
      transactions = transactions.filter(t => t.bankAccountId === bankAccountId);
    }
    if (transactionType) {
      transactions = transactions.filter(t => t.transactionType === transactionType);
    }
    if (status) {
      transactions = transactions.filter(t => t.status === status);
    }
    if (category) {
      if (category === 'uncategorized') {
        // 🆕 筛选未分类的交易(排除已拆分的父交易)
        transactions = transactions.filter(t => 
          (!t.txAccount || t.txAccount.trim() === '') && 
          t.isSplit !== true
        );
      } else {
        // 🆕 筛选指定类别的交易(排除已拆分的父交易)
        transactions = transactions.filter(t => 
          t.category === category && 
          t.isSplit !== true
        );
      }
    }
    // 🔑 二次分类过滤(排除已拆分的父交易)
    if (params.txAccount) {
      transactions = transactions.filter(t => 
        t.txAccount === params.txAccount && 
        t.isSplit !== true
      );
    }
    if (startDate) {
      transactions = transactions.filter(t => t.transactionDate >= startDate);
    }
    if (endDate) {
      transactions = transactions.filter(t => t.transactionDate <= endDate);
    }
    if (paymentMethod) {
      transactions = transactions.filter(t => t.paymentMethod === paymentMethod);
    }
    // 🆕 过滤虚拟交易
    if (!includeVirtual) {
      transactions = transactions.filter(t => t.isVirtual !== true);
    }
    // 🆕 过滤特定父交易的子交易
    if (parentTransactionId) {
      transactions = transactions.filter(t => t.parentTransactionId === parentTransactionId);
    }
    if (search) {
      // 🔍 增强型Fuzzy搜索(包含父子交易关系处理)
      const searchLower = search.toLowerCase().trim();
      const searchTerms = searchLower.split(/\s+/); // 支持多关键词搜索
      
      // Step 1: 先找出所有直接匹配的交易
      const directMatches = transactions.filter(t => {
        // 构建可搜索文本(包含所有可能的字段)
        const searchableText = [
          t.mainDescription || '',
          t.subDescription || '',
          t.transactionNumber || '',
          t.payerPayee || '',
          t.notes || '', // 🆕 添加备注搜索
          t.amount.toString(),
          t.category || '',
          t.txAccount || '', // 🆕 添加二次分类搜索
          t.receiptNumber || '', // 🆕 添加收据号搜索
          t.invoiceNumber || '', // 🆕 添加发票号搜索
          t.inputByName || '', // 🆕 添加录入人搜索
          t.transactionType || '', // 🆕 添加交易类型搜索(收入/支出)
          t.status || '', // 🆕 添加状态搜索
          t.paymentMethod || '', // 🆕 添加付款方式搜索
        ].join(' ').toLowerCase();
        
        // 🎯 Fuzzy匹配逻辑
        if (searchTerms.length === 1) {
          return searchableText.includes(searchLower);
        }
        return searchTerms.every(term => searchableText.includes(term));
      });
      
      // Step 2: 🆕 扩展搜索结果，包含父子交易关系
      const matchedIds = new Set<string>();
      const resultTransactions: Transaction[] = [];
      
      directMatches.forEach(matched => {
        // 如果是父交易，检查是否已拆分
        if (!matched.parentTransactionId) {
          // 🚫 跳过已拆分的父交易(isSplit为true)
          if (matched.isSplit === true) {
            // 只添加子交易，不添加父交易本身
            const children = transactions.filter(t => t.parentTransactionId === matched.id);
            children.forEach(child => {
              if (!matchedIds.has(child.id)) {
                matchedIds.add(child.id);
                resultTransactions.push(child);
              }
            });
            return; // 跳过父交易
          }
          
          // 添加未拆分的父交易本身
          if (!matchedIds.has(matched.id)) {
            matchedIds.add(matched.id);
            resultTransactions.push(matched);
          }
          
          // 🔑 查找并添加所有子交易
          const children = transactions.filter(t => t.parentTransactionId === matched.id);
          children.forEach(child => {
            if (!matchedIds.has(child.id)) {
              matchedIds.add(child.id);
              resultTransactions.push(child);
            }
          });
        } else {
          // 如果是子交易，添加父交易和所有兄弟子交易
          const parentId = matched.parentTransactionId;
          
          // 🔑 查找并添加父交易(如果父交易未拆分)
          const parent = transactions.find(t => t.id === parentId);
          if (parent && !matchedIds.has(parent.id) && parent.isSplit !== true) {
            matchedIds.add(parent.id);
            resultTransactions.push(parent);
          }
          
          // 🔑 查找并添加该父交易的所有子交易(包括自己)
          const siblings = transactions.filter(t => t.parentTransactionId === parentId);
          siblings.forEach(sibling => {
            if (!matchedIds.has(sibling.id)) {
              matchedIds.add(sibling.id);
              resultTransactions.push(sibling);
            }
          });
        }
      });
      
      transactions = resultTransactions;
    }
    if (minAmount !== undefined) {
      transactions = transactions.filter(t => t.amount >= minAmount);
    }
    if (maxAmount !== undefined) {
      transactions = transactions.filter(t => t.amount <= maxAmount);
    }
    
    // Sort - 先按指定字段排序父交易，然后插入子交易
    // Step 1: 分离父交易和子交易
    const parentTransactions = transactions.filter(t => !t.parentTransactionId);
    const childTransactions = transactions.filter(t => t.parentTransactionId);
    
    // Step 2: 父交易按指定字段排序
    parentTransactions.sort((a, b) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Step 3: 为每个父交易找到其子交易，并按创建时间排序
    const childMap = new Map<string, Transaction[]>();
    childTransactions.forEach(child => {
      const parentId = child.parentTransactionId!;
      if (!childMap.has(parentId)) {
        childMap.set(parentId, []);
      }
      childMap.get(parentId)!.push(child);
    });
    
    // 对每个父交易的子交易按创建时间排序
    childMap.forEach(children => {
      children.sort((a, b) => (a.createdAt || '') > (b.createdAt || '') ? 1 : -1);
    });
    
    // Step 4: 重新组合：父交易 + 其子交易
    const sortedTransactions: Transaction[] = [];
    const includedChildIds = new Set<string>();
    
    parentTransactions.forEach(parent => {
      sortedTransactions.push(parent);
      const children = childMap.get(parent.id) || [];
      sortedTransactions.push(...children);
      children.forEach(child => includedChildIds.add(child.id));
    });
    
    // 🆕 Step 5: 添加"孤儿"子交易(父交易被过滤掉，但子交易符合条件)
    const orphanChildren = childTransactions.filter(child => !includedChildIds.has(child.id));
    if (orphanChildren.length > 0) {
      // 将孤儿子交易作为独立交易添加到结果中
      sortedTransactions.push(...orphanChildren);
    }
    
    // 使用重新排序后的数组
    transactions = sortedTransactions;
    
    // 分页处理 - 智能分组：确保父交易和子交易在同一页
    const total = transactions.length;
    let paginatedData: Transaction[] = [];
    
    if (includeVirtual) {
      // 如果包含虚拟交易，需要智能分组
      const groups: Transaction[][] = [];
      let currentGroup: Transaction[] = [];
      let currentParentId: string | null = null;
      
      for (const transaction of transactions) {
        if (!transaction.parentTransactionId) {
          // 真正的父交易：开始新组
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [transaction];
          currentParentId = transaction.id;
        } else if (transaction.parentTransactionId === currentParentId) {
          // 子交易且属于当前父交易：加入当前组
          currentGroup.push(transaction);
        } else {
          // 孤儿子交易(父交易被过滤掉)：作为独立组
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [transaction];
          currentParentId = null; // 孤儿没有有效的parentId
        }
      }
      
      // 添加最后一组
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      
      // 按页获取完整的组
      const startIndex = (page - 1) * pageLimit;
      let itemCount = 0;
      
      for (const group of groups) {
        // 如果当前组的第一条记录在当前页范围内，包含整个组
        if (itemCount < startIndex + pageLimit && itemCount + group.length > startIndex) {
          paginatedData.push(...group);
        }
        itemCount += group.length;
        
        // 如果已经收集了足够的数据，停止
        if (paginatedData.length >= pageLimit + 10) break; // 允许一些溢出以包含完整组
      }
    } else {
      // 如果不包含虚拟交易，使用简单分页
      const startIndex = (page - 1) * pageLimit;
      const endIndex = startIndex + pageLimit;
      paginatedData = transactions.slice(startIndex, endIndex);
    }
    
    return {
      data: paginatedData,
      total,
      page,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit),
    };
  } catch (error: any) {
    console.warn('[Finance] Failed to get transactions, returning empty data:', error.message);
    // Return empty result instead of throwing
    return {
      data: [],
      total: 0,
      page: params.page || 1,
      limit: params.limit || 20,
      totalPages: 0,
    };
  }
};

/**
 * Approve Transaction
 */
export const approveTransaction = async (
  transactionId: string,
  userId: string
): Promise<void> => {
  try {
    const transactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
    const txDoc = await getDoc(transactionRef);
    const txData = txDoc.exists() ? txDoc.data() as any : undefined;
    
    const updates = cleanUndefinedValues({
      status: 'completed' as TransactionStatus,
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    await updateDoc(transactionRef, updates);
    
    // 🆕 若是会员费交易且已关联会员，审批后确保其类别为 Probation Member（不覆盖 Alumni/Visiting/Probation）
    try {
      const isMemberFee = txData?.category === 'member-fees' || (txData?.txAccount && String(txData.txAccount).includes('member-fee'));
      const linkedMemberId = txData?.metadata?.memberId as string | undefined;
      if (isMemberFee && typeof linkedMemberId === 'string' && linkedMemberId.trim()) {
        const member = await getMemberById(linkedMemberId);
        const currentCat = (member as any)?.jciCareer?.category as string | undefined;
        if (member && currentCat !== 'Alumni' && currentCat !== 'Visiting Member' && currentCat !== 'Probation Member') {
          await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, member.id), {
            'jciCareer.category': 'Probation Member',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch {}
    
    globalSystemService.log(
      'info',
      'Transaction approved',
      'transactionService.approveTransaction',
      { transactionId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to approve transaction',
      'transactionService.approveTransaction',
      { error: error.message, transactionId, userId }
    );
    throw error;
  }
};

/**
 * Reject Transaction
 */
export const rejectTransaction = async (
  transactionId: string,
  userId: string,
  reason?: string
): Promise<void> => {
  try {
    const transactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
    const transactionDoc = await getDoc(transactionRef);
    
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }
    
    const data = transactionDoc.data();
    
    const updates = cleanUndefinedValues({
      status: 'rejected' as TransactionStatus,
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      notes: reason ? `${data.notes || ''}\n[REJECTED] ${reason}` : data.notes,
      updatedAt: new Date().toISOString(),
    });
    
    await updateDoc(transactionRef, updates);
    
    // 更新账户最后交易日期
    await updateBankAccountLastTransaction(data.bankAccountId);
    
    globalSystemService.log(
      'info',
      'Transaction rejected',
      'transactionService.rejectTransaction',
      { transactionId, userId, reason }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to reject transaction',
      'transactionService.rejectTransaction',
      { error: error.message, transactionId, userId }
    );
    throw error;
  }
};

/**
 * Update Bank Account Last Transaction Date
 * 更新银行账户最后交易日期
 * 
 * 注意：balance字段已完全移除，余额通过实时计算获得
 */
const updateBankAccountLastTransaction = async (
  bankAccountId: string
): Promise<void> => {
  try {
    if (!bankAccountId || typeof bankAccountId !== 'string') {
      console.warn('⚠️ [updateBankAccountLastTransaction] Invalid bankAccountId');
      return;
    }
    
    const accountRef = doc(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS, bankAccountId);
    const accountDoc = await getDoc(accountRef);
    
    if (!accountDoc.exists()) {
      console.warn('⚠️ [updateBankAccountLastTransaction] Account not found:', bankAccountId);
      return;
    }
    
    // 只更新最后交易日期
      await updateDoc(accountRef, {
        lastTransactionDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    
  } catch (error: any) {
    console.error('❌ [updateBankAccountLastTransaction] Failed:', error);
    // 不抛出错误，允许交易操作继续
  }
};

/**
 * Get cumulative balance before a specific date for running balance calculation
 * 获取指定日期之前的累计余额(用于累计余额计算)
 * @param bankAccountId - 银行账户ID
 * @param beforeDate - 截止日期(不包含当天)
 * @returns 该日期之前的累计余额
 */
export const getBalanceBeforeDate = async (
  bankAccountId: string,
  beforeDate: string
): Promise<number> => {
  
  
  try {
    // Step 1: 获取银行账户初始余额
    const accountDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.BANK_ACCOUNTS, bankAccountId));
    
    if (!accountDoc.exists()) {
      console.error('❌ [getBalanceBeforeDate] 银行账户不存在:', bankAccountId);
      return 0;
    }
    
    const account = accountDoc.data();
    const initialBalance = account.initialBalance || 0;
    
    
    
    // Step 2: 查询该账户的所有交易(不使用status条件)
    // 原因：数据库中 status 字段为 undefined，查询 status=='completed' 会返回0笔
    
    
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('bankAccountId', '==', bankAccountId)
    );
    
    const snapshot = await getDocs(q);
    
    
    
    if (snapshot.empty) {
      
      return initialBalance;
    }
    
    // 显示前3笔交易的日期格式(用于调试)
    
    
    // Step 3: 获取所有交易并在内存中过滤
    const allTransactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    
    
    // 过滤出 beforeDate 之前的交易(强制规范到 YYYY-MM-DD 再比较，避免字典序误判)
    // 同时排除虚拟交易(isVirtual === true)
    const normalizeToISODate = (input: string): string | null => {
      if (!input) return null;
      // 1) 直接构造 Date(可兼容 ISO 与 "01-Jul-2024" 等常见格式)
      const tryDate = new Date(input);
      if (!Number.isNaN(tryDate.getTime())) {
        return tryDate.toISOString().split('T')[0];
      }
      // 2) 兼容 "dd-MMM-yyyy"(例如 01-Jul-2024)
      const m = input.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
      if (m) {
        const [, dd, mon, yyyy] = m;
        const parsed = new Date(`${yyyy}-${mon}-${dd}`);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
      return null;
    };

    const beforeISO = normalizeToISODate(beforeDate);
    const transactions = allTransactions.filter((tx: any) => {
      const txISO = normalizeToISODate(tx.transactionDate);
      if (!beforeISO || !txISO) {
        return false; // 无法解析则不计入
      }
      // 排除虚拟交易(子交易不影响余额)
      if (tx.isVirtual === true) {
        return false;
      }
      // 严格小于 beforeDate(同日不计入)
      return txISO < beforeISO;
    });
    
    
    
    if (transactions.length === 0) {
      
      return initialBalance;
    }
    
    // 显示过滤后的前3笔交易
    
    
    // Step 4: 按交易日期排序(从早到晚)
    transactions.sort((a: any, b: any) => {
      const dateA = new Date(a.transactionDate).getTime();
      const dateB = new Date(b.transactionDate).getTime();
      return dateA - dateB;
    });
    
    
    
    // Step 5: 累计计算
    let runningBalance = initialBalance;
    let sampleBalances: any[] = [];
    
    
    
    transactions.forEach((txn: any, index) => {
      
      // 支持新旧两种数据结构
      let netAmount: number;
      if (txn.amount !== undefined && txn.transactionType) {
        // 新结构
        netAmount = txn.transactionType === 'income' ? txn.amount : -txn.amount;
      } else {
        // 旧结构
        netAmount = (txn.income || 0) - (txn.expense || 0);
      }
      
      runningBalance += netAmount;
      
      // 记录前3笔和最后3笔供调试
      if (index < 3 || index >= transactions.length - 3) {
        sampleBalances.push({
          序号: index + 1,
          日期: txn.transactionDate,
          描述: txn.mainDescription?.substring(0, 20),
          净额: netAmount.toFixed(2),
          余额: runningBalance.toFixed(2)
        });
      } else if (index === 3) {
        sampleBalances.push({
          序号: '...',
          日期: '...',
          描述: `中间 ${transactions.length - 6} 笔`,
          净额: '...',
          余额: '...'
        });
      }
    });
    
    
    
    return runningBalance;
    
  } catch (error: any) {
    console.error('❌ [getBalanceBeforeDate] 计算失败:', error);
    globalSystemService.log(
      'error',
      'Failed to get balance before date',
      'transactionService.getBalanceBeforeDate',
      { error: error.message, bankAccountId, beforeDate }
    );
    return 0;
  }
};

/**
 * Get Transaction Statistics
 * ⚠️ Note: fiscalYear parameter removed - use date ranges for filtering
 */
export const getTransactionStatistics = async (
  startDate?: string,
  endDate?: string
): Promise<{
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
  avgTransactionAmount: number;
}> => {
  try {
    // Simple query to avoid index issues
    const q = query(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS));
    
    const snapshot = await getDocs(q);
    
    let totalIncome = 0;
    let totalExpense = 0;
    let count = 0;
    
    // Filter in memory
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check status
      if (data.status !== 'completed') return;
      
      // 🆕 排除虚拟交易(子交易不影响统计)
      if (data.isVirtual === true) return;
      
      // 🆕 排除内部转账(Internal Transfer)
      if (data.isInternalTransfer === true) return;
      
      // Check date range
      if (startDate && data.transactionDate < startDate) return;
      if (endDate && data.transactionDate > endDate) return;
      
      // 支持新旧两种数据结构
      if (data.amount !== undefined && data.transactionType) {
        // 新结构
        if (data.transactionType === 'income') {
          totalIncome += data.amount;
        } else {
          totalExpense += data.amount;
        }
      } else {
        // 旧结构(向后兼容)
        totalIncome += data.income || 0;
        totalExpense += data.expense || 0;
      }
      
      count++;
    });
    
    const netIncome = totalIncome - totalExpense;
    const avgTransactionAmount = count > 0 
      ? (totalIncome + totalExpense) / count 
      : 0;
    
    return {
      totalIncome,
      totalExpense,
      netIncome,
      transactionCount: count,
      avgTransactionAmount,
    };
  } catch (error: any) {
    // Log error but return empty statistics instead of throwing
    globalSystemService.log(
      'warning',
      'Failed to get transaction statistics, returning empty data',
      'transactionService.getTransactionStatistics',
      { error: error.message, startDate, endDate }
    );
    
    // Return empty statistics instead of throwing
    return {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      transactionCount: 0,
      avgTransactionAmount: 0,
    };
  }
};

/**
 * Split Transaction (拆分交易)
 * 将一笔交易拆分为多笔子交易(仅作参考，不影响银行余额)
 */
export const splitTransaction = async (
  transactionId: string,
  splits: Array<{
    amount: number;
    category?: string;
    notes?: string;
    txAccount?: string;
  }>,
  userId: string
): Promise<{
  parentTransaction: Transaction;
  childTransactions: Transaction[];
  unallocatedTransaction?: Transaction;
}> => {
  try {
    
    
    // Step 1: 获取父交易
    const parentRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
    const parentDoc = await getDoc(parentRef);
    
    if (!parentDoc.exists()) {
      throw new Error('Transaction not found');
    }
    
    const parentData = parentDoc.data() as Transaction;
    
    // Step 2: 验证
    if (parentData.isVirtual) {
      throw new Error('虚拟交易(子交易)不能再次拆分');
    }
    
    // 🆕 Step 2.1: 如果已拆分，先删除所有现有子交易(更新拆分记录)
    if (parentData.isSplit) {
      
      
      // 查找所有现有子交易
      const existingChildren = await getDocs(
        query(
          collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
          where('parentTransactionId', '==', transactionId)
        )
      );
      
      
      
      // 删除所有现有子交易
      for (const childDoc of existingChildren.docs) {
        await deleteDoc(doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, childDoc.id));
      }
      
      
    }
    
    const parentAmount = parentData.amount;
    const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
    
    
    
    if (totalSplitAmount > parentAmount) {
      throw new Error(`拆分金额总和 (${totalSplitAmount}) 不能超过原交易金额 (${parentAmount})`);
    }
    
    const unallocatedAmount = parentAmount - totalSplitAmount;
    
    
    
    // Step 3: 使用 Batch 创建子交易
    const childTransactions: Transaction[] = [];
    const now = new Date().toISOString();
    
    // 创建用户指定的子交易
    for (const split of splits) {
      // 根据类别生成副描述
      const categoryLabels: Record<string, string> = {
        'member-fees': '会员费',
        'event-finance': '活动财务',
        'general-accounts': '日常账户',
      };
      const categoryLabel = split.category ? categoryLabels[split.category] || split.category : '未分类';
      
      const childData: Omit<Transaction, 'id'> = {
        transactionNumber: await generateTransactionNumber(
          parentData.bankAccountId,
          new Date(parentData.transactionDate)
        ),
        bankAccountId: parentData.bankAccountId,
        transactionDate: parentData.transactionDate, // 继承父交易日期
        transactionType: parentData.transactionType, // 继承父交易类型
        mainDescription: parentData.mainDescription, // 🔑 继承父交易主描述
        subDescription: `${categoryLabel} - RM ${split.amount.toFixed(2)}`, // 分类和金额作为副描述
        amount: split.amount,
        category: split.category,
        txAccount: split.txAccount,
        paymentMethod: parentData.paymentMethod, // 继承
        status: parentData.status, // 继承
        inputBy: userId,
        notes: split.notes,
        
        // 子交易标记
        parentTransactionId: transactionId,
        isVirtual: true, // 🔑 不影响银行余额
        isSplit: false,
        
        createdAt: now,
        updatedAt: now,
      };
      
      const cleanData = cleanUndefinedValues(childData);
      
      // 🔍 Debug: 子交易数据(生产环境可注释)
      // console.log('🔍 [splitTransaction] 子交易数据:', {
      //   category: split.category,
      //   amount: split.amount,
      //   desc: cleanData.mainDescription?.substring(0, 30),
      // });
      
      const childRef = await addDoc(
        collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
        cleanData
      );
      
      childTransactions.push({
        id: childRef.id,
        ...cleanData, // 🔑 使用cleanData而非childData，确保与Firestore一致
      } as Transaction);
    }
    
    // Step 4: 如果有未分配金额，自动创建"未分配金额"子交易
    let unallocatedTransaction: Transaction | undefined;
    
    if (unallocatedAmount > 0) {
      
      
      const unallocatedData: Omit<Transaction, 'id'> = {
        transactionNumber: await generateTransactionNumber(
          parentData.bankAccountId,
          new Date(parentData.transactionDate)
        ),
        bankAccountId: parentData.bankAccountId,
        transactionDate: parentData.transactionDate,
        transactionType: parentData.transactionType,
        mainDescription: parentData.mainDescription, // 🔑 继承父交易主描述
        subDescription: `未分配金额 - RM ${unallocatedAmount.toFixed(2)}`, // 未分配标记作为副描述
        amount: unallocatedAmount,
        category: 'unallocated',
        paymentMethod: parentData.paymentMethod,
        status: parentData.status,
        inputBy: userId,
        notes: '系统自动创建 - 拆分后剩余金额',
        
        parentTransactionId: transactionId,
        isVirtual: true,
        isSplit: false,
        
        createdAt: now,
        updatedAt: now,
      };
      
      const cleanData = cleanUndefinedValues(unallocatedData);
      const unallocatedRef = await addDoc(
        collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
        cleanData
      );
      
      unallocatedTransaction = {
        id: unallocatedRef.id,
        ...unallocatedData,
      } as Transaction;
      
      childTransactions.push(unallocatedTransaction);
    }
    
    // Step 5: 更新父交易(拆分后清除类别，避免混淆)
    const parentUpdates = {
      isSplit: true,
      splitCount: childTransactions.length,
      allocatedAmount: totalSplitAmount,
      unallocatedAmount: unallocatedAmount,
      updatedAt: now,
    };
    
    // 🔑 清除类别和二次分类字段(使用 Firestore deleteField)
    const { deleteField } = await import('firebase/firestore');
    const updateData = {
      ...parentUpdates,
      category: deleteField(), // 从 Firestore 中删除该字段
      txAccount: deleteField(), // 🆕 清除二次分类
    };
    
    await updateDoc(parentRef, updateData);
    
    
    
    // 记录日志
    globalSystemService.log(
      'info',
      'Transaction split successfully',
      'transactionService.splitTransaction',
      {
        transactionId,
        childCount: childTransactions.length,
        totalSplitAmount,
        unallocatedAmount,
        userId,
      }
    );
    
    return {
      parentTransaction: {
        ...parentData,
        id: transactionId,
        isSplit: true,
        splitCount: childTransactions.length,
        allocatedAmount: totalSplitAmount,
        unallocatedAmount: unallocatedAmount,
        category: undefined, // 清除类别
        updatedAt: now,
      } as Transaction,
      childTransactions,
      unallocatedTransaction,
    };
  } catch (error: any) {
    console.error('❌ [splitTransaction] Failed:', error);
    globalSystemService.log(
      'error',
      'Failed to split transaction',
      'transactionService.splitTransaction',
      { error: error.message, transactionId, userId }
    );
    throw error;
  }
};

/**
 * Unsplit Transaction (撤销拆分)
 * 删除所有子交易，恢复父交易状态
 */
export const unsplitTransaction = async (
  transactionId: string,
  userId: string
): Promise<void> => {
  try {
    
    
    // Step 1: 获取父交易
    const parentRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
    const parentDoc = await getDoc(parentRef);
    
    if (!parentDoc.exists()) {
      throw new Error('Transaction not found');
    }
    
    const parentData = parentDoc.data();
    
    if (!parentData.isSplit) {
      throw new Error('该交易未拆分');
    }
    
    // Step 2: 查找并删除所有子交易
    const childrenQuery = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('parentTransactionId', '==', transactionId)
    );
    
    const childrenSnapshot = await getDocs(childrenQuery);
    
    
    
    // 删除所有子交易
    for (const childDoc of childrenSnapshot.docs) {
      await deleteDoc(childDoc.ref);
    }
    
    // Step 3: 恢复父交易状态(不恢复类别，需用户手动重新分类)
    const parentUpdates = cleanUndefinedValues({
      isSplit: false,
      splitCount: null,
      allocatedAmount: null,
      unallocatedAmount: null,
      // 注意：不恢复 category，因为拆分时已被清除，撤销后需用户手动重新分类
      updatedAt: new Date().toISOString(),
    });
    
    await updateDoc(parentRef, parentUpdates);
    
    
    
    globalSystemService.log(
      'info',
      'Transaction unsplit successfully',
      'transactionService.unsplitTransaction',
      {
        transactionId,
        deletedCount: childrenSnapshot.size,
        userId,
      }
    );
  } catch (error: any) {
    console.error('❌ [unsplitTransaction] Failed:', error);
    globalSystemService.log(
      'error',
      'Failed to unsplit transaction',
      'transactionService.unsplitTransaction',
      { error: error.message, transactionId, userId }
    );
    throw error;
  }
};

/**
 * Batch Split Transactions (批量拆分交易)
 * 为多条交易应用相同的拆分规则(按固定金额)
 */
export const batchSplitTransactions = async (
  transactionIds: string[],
  splitRule: {
    categoryAmounts: Array<{
      category: string;
      amount: number;
      notes?: string;
    }>;
  },
  userId: string
): Promise<{
  successCount: number;
  failedCount: number;
  results: Array<{
    transactionId: string;
    success: boolean;
    error?: string;
  }>;
}> => {
  const results: Array<{ transactionId: string; success: boolean; error?: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  

  for (const transactionId of transactionIds) {
    try {
      // 获取交易信息
      const transactionDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId));
      
      if (!transactionDoc.exists()) {
        throw new Error('Transaction not found');
      }

      const transaction = transactionDoc.data() as Transaction;
      
      // 验证
      if (transaction.isVirtual) {
        throw new Error('虚拟交易不能拆分');
      }
      
      // 🆕 如果已拆分，先删除现有子交易
      if (transaction.isSplit) {
        const existingChildren = await getDocs(
          query(
            collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
            where('parentTransactionId', '==', transactionId)
          )
        );
        
        for (const childDoc of existingChildren.docs) {
          await deleteDoc(doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, childDoc.id));
        }
      }

      const parentAmount = transaction.amount;
      
      // 验证拆分总额不超过父交易金额
      const totalSplitAmount = splitRule.categoryAmounts.reduce((sum, rule) => sum + rule.amount, 0);
      
      if (totalSplitAmount > parentAmount) {
        throw new Error(`拆分金额总和 (${totalSplitAmount}) 超过交易金额 (${parentAmount})`);
      }

      // 使用固定金额拆分
      const splits = splitRule.categoryAmounts.map(rule => ({
        amount: rule.amount,
        category: rule.category,
        notes: rule.notes,
      }));

      // 执行拆分
      await splitTransaction(transactionId, splits, userId);

      results.push({ transactionId, success: true });
      successCount++;
    } catch (error: any) {
      console.error(`❌ [batchSplitTransactions] Failed for ${transactionId}:`, error);
      results.push({
        transactionId,
        success: false,
        error: error.message,
      });
      failedCount++;
    }
  }

  

  return { successCount, failedCount, results };
};

/**
 * Batch Set Category (批量设置类别)
 * 为多条交易批量设置类别
 */
export const batchSetCategory = async (
  transactionIds: string[],
  category: string,
  userId: string,
  updates?: Partial<Transaction>,
  metadata?: Record<string, any>
): Promise<{
  successCount: number;
  failedCount: number;
}> => {
  let successCount = 0;
  let failedCount = 0;

  console.log('📂 [batchSetCategory] Starting batch category update:', {
    transactionCount: transactionIds.length,
    category,
    userId,
    updates,
    metadata,
  });

  for (const transactionId of transactionIds) {
    try {
      const transactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
      const transactionDoc = await getDoc(transactionRef);

      if (!transactionDoc.exists()) {
        throw new Error('Transaction not found');
      }

      const data = transactionDoc.data();

      // 不允许修改虚拟交易(子交易)
      if (data.isVirtual) {
        throw new Error('虚拟交易(子交易)的类别由拆分操作管理，不能单独修改');
      }

      // 🔧 允许覆盖已分类的交易：直接更新分类
      console.log(`📝 [batchSetCategory] 更新交易分类: ${transactionId}`, {
        oldCategory: data.category,
        newCategory: category,
      });

      // 构建更新数据
      const updateData: any = {
        category,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };

      // 添加额外更新字段
      if (updates) {
        const cleanedUpdates = cleanUndefinedValues(updates);
        console.log('🔍 [batchSetCategory] 添加更新字段:', {
          transactionId,
          updates: cleanedUpdates,
          txAccount: cleanedUpdates.txAccount
        });
        Object.assign(updateData, cleanedUpdates);
      }

      // 添加元数据
      if (metadata && Object.keys(metadata).length > 0) {
        updateData.metadata = {
          ...data.metadata,
          ...cleanUndefinedValues(metadata),
        };
      }

      await updateDoc(transactionRef, updateData);

      successCount++;
    } catch (error: any) {
      console.error(`❌ [batchSetCategory] Failed for ${transactionId}:`, error);
      failedCount++;
    }
  }

  console.log('✅ [batchSetCategory] Batch category update completed:', {
    total: transactionIds.length,
    successCount,
    failedCount,
  });

  globalSystemService.log(
    'info',
    'Batch category update completed',
    'transactionService.batchSetCategory',
    { transactionCount: transactionIds.length, category, successCount, failedCount, userId }
  );

  return { successCount, failedCount };
};

/**
 * 通过项目账户ID获取交易记录(用于活动财务)
 */
export const getTransactionsByProjectAccountId = async (
  projectAccountId: string
): Promise<Transaction[]> => {
  
  
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('projectAccountId', '==', projectAccountId),
      orderBy('transactionDate', 'desc')
    );

    
    const snapshot = await getDocs(q);
    

    const transactions = snapshot.docs.map(doc => {
      const data = doc.data();
      
      
      return {
        id: doc.id,
        ...data,
        transactionDate: safeTimestampToISO(data.transactionDate) || '',
        createdAt: safeTimestampToISO(data.createdAt) || '',
        updatedAt: safeTimestampToISO(data.updatedAt) || '',
        approvedAt: data.approvedAt ? safeTimestampToISO(data.approvedAt) : undefined,
      } as Transaction;
    });

    

    return transactions;
  } catch (error: any) {
    console.error('❌ [getTransactionsByProjectAccountId] Query failed:', error);
    globalSystemService.log('error', 'Failed to get transactions by project account ID', 'transactionService', { 
      error, 
      projectAccountId 
    });
    throw error;
  }
};

/**
 * 获取关联到特定活动的交易记录(方案C)
 */
export const getTransactionsByEventId = async (eventId: string): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('relatedEventId', '==', eventId),
      orderBy('transactionDate', 'desc')
    );

    const snapshot = await getDocs(q);

    const transactions = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        transactionDate: safeTimestampToISO(data.transactionDate) || '',
        createdAt: safeTimestampToISO(data.createdAt) || '',
        updatedAt: safeTimestampToISO(data.updatedAt) || '',
        approvedAt: data.approvedAt ? safeTimestampToISO(data.approvedAt) : undefined,
      } as Transaction;
    });

    return transactions;
  } catch (error: any) {
    console.error('❌ [getTransactionsByEventId] Query failed:', error);
    globalSystemService.log('error', 'Failed to get transactions by event ID', 'transactionService', { 
      error, 
      eventId 
    });
    throw error;
  }
};

/**
 * Update Transaction Reconciliation
 * 更新交易核对状态
 */
export const updateTransactionReconciliation = async (
  transactionId: string,
  bankTransactionId: string,
  userId: string
): Promise<void> => {
  try {
    const transactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
    
    const updates = cleanUndefinedValues({
      reconciledBankTransactionId: bankTransactionId,
      status: 'completed' as TransactionStatus,
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    await updateDoc(transactionRef, updates);
    
    // 🆕 双向同步：检查bankTransaction是否被活动账目记录核对
    // 如果bankTransaction有reconciledEventAccountTransactionId，也更新活动账目记录
    try {
      const bankTransactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, bankTransactionId);
      const bankTransactionDoc = await getDoc(bankTransactionRef);
      
      if (bankTransactionDoc.exists()) {
        const bankTxData = bankTransactionDoc.data();
        
        // 同步bankTransaction的状态
        await updateDoc(bankTransactionRef, cleanUndefinedValues({
          status: 'completed' as TransactionStatus,
          reconciledBankTransactionId: transactionId, // 双向引用
          updatedAt: new Date().toISOString(),
        }));
    
        
        // 🆕 如果bankTransaction关联了活动账目记录，也更新它
        if (bankTxData.reconciledEventAccountTransactionId) {
          try {
            const { updateEventAccountTransaction } = await import('@/modules/event/services/eventAccountService');
            await updateEventAccountTransaction(bankTxData.reconciledEventAccountTransactionId, {
              status: 'completed' as any,
            }, userId);
            
          } catch (error: any) {
            console.error('⚠️ [updateTransactionReconciliation] Failed to sync event account transaction:', error);
          }
        }
      }
    } catch (error: any) {
      console.error('⚠️ [updateTransactionReconciliation] Failed to sync bank transaction:', error);
      // 不抛出错误，允许继续执行
    }
    
    globalSystemService.log(
      'info',
      'Transaction reconciled',
      'transactionService.updateTransactionReconciliation',
      { transactionId, bankTransactionId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to reconcile transaction',
      'transactionService.updateTransactionReconciliation',
      { error: error.message, transactionId, bankTransactionId, userId }
    );
    throw error;
  }
};

/**
 * Clear Transaction Reconciliation
 * 清除交易核对状态
 */
export const clearTransactionReconciliation = async (
  transactionId: string,
  userId: string
): Promise<void> => {
  try {
    const transactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transactionId);
    
    // 🆕 先读取当前的reconciledBankTransactionId，用于双向同步
    const currentDoc = await getDoc(transactionRef);
    const currentData = currentDoc.data();
    const bankTransactionId = currentData?.reconciledBankTransactionId;
    
    await updateDoc(transactionRef, {
      reconciledBankTransactionId: deleteField(),
      status: 'pending' as TransactionStatus,
      updatedAt: new Date().toISOString(),
    });
    
    // 🆕 双向同步：清除对应的bankTransaction的核对状态
    if (bankTransactionId) {
      try {
        const bankTransactionRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, bankTransactionId);
        const bankTransactionDoc = await getDoc(bankTransactionRef);
        
        if (bankTransactionDoc.exists()) {
          const bankTxData = bankTransactionDoc.data();
          
          // 清除bankTransaction的核对状态
          await updateDoc(bankTransactionRef, {
            status: 'pending' as TransactionStatus,
            reconciledBankTransactionId: deleteField(),
            updatedAt: new Date().toISOString(),
          });
          
          
          // 🆕 如果bankTransaction关联了活动账目记录，也清除它的核对状态
          if (bankTxData.reconciledEventAccountTransactionId) {
            try {
              const { clearEventAccountTransactionReconciliation } = await import('@/modules/event/services/eventAccountService');
              await clearEventAccountTransactionReconciliation(bankTxData.reconciledEventAccountTransactionId, userId);
              
            } catch (error: any) {
              console.error('⚠️ [clearTransactionReconciliation] Failed to sync event account transaction:', error);
            }
          }
        }
      } catch (error: any) {
        console.error('⚠️ [clearTransactionReconciliation] Failed to sync bank transaction:', error);
        // 不抛出错误，允许继续执行
      }
    }
    
    globalSystemService.log(
      'info',
      'Transaction reconciliation cleared',
      'transactionService.clearTransactionReconciliation',
      { transactionId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to clear transaction reconciliation',
      'transactionService.clearTransactionReconciliation',
      { error: error.message, transactionId, userId }
    );
    throw error;
  }
};



