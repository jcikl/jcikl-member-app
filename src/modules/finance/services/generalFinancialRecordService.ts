/**
 * General Financial Record Service
 * 日常账户财务记录服务
 * 
 * 管理 FINANCIAL_RECORDS 中的 generalFinancialRecord 类型记录
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import type { GeneralFinancialRecord, GeneralFinancialRecordStatus } from '../types';

/**
 * Upsert General Financial Record from Transaction
 * 当交易分类为 general-* 时，
 * 在 FINANCIAL_RECORDS 中创建/更新对应的 generalFinancialRecord 文档
 */
export const upsertGeneralFinancialRecordFromTransaction = async (params: {
  category: string;
  subCategory?: string;
  fiscalYear?: string;
  payerPayee?: string; // 🆕 付款人/收款人
  memberId?: string; // 🆕 会员ID
  memberName?: string; // 🆕 会员名字
  memberEmail?: string; // 🆕 会员邮箱
  transactionId: string;
  amount: number;
  transactionType: 'income' | 'expense';
  userId?: string;
}): Promise<void> => {
  try {
    const now = new Date().toISOString();

    // 🆕 Step 1: 先按 transactionId 查找（优先级最高 - 这个交易可能已经有关联的财务记录）
    const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    const allRecords = snapshot.docs
      .filter(d => d.data().type === 'generalFinancialRecord')
      .map(d => ({ id: d.id, ...d.data() } as GeneralFinancialRecord & { id: string; type: string }));

    let existingByTransaction = allRecords.find(r => {
      const revenueIds = r.revenueTransactionIds || [];
      const expenseIds = r.expenseTransactionIds || [];
      return revenueIds.includes(params.transactionId) || expenseIds.includes(params.transactionId);
    });
    
    let existingByCategory = allRecords.find(r => {
      if (r.category !== params.category) return false;
      if (params.subCategory) {
        return r.subCategory === params.subCategory;
      }
      return !r.subCategory;
    });

    console.log('🔍 [upsertGeneralFinancialRecord] Search results:', {
      category: params.category,
      subCategory: params.subCategory,
      transactionId: params.transactionId,
      existingByTransaction: existingByTransaction ? { id: existingByTransaction.id, category: existingByTransaction.category } : null,
      existingByCategory: existingByCategory ? { id: existingByCategory.id, category: existingByCategory.category } : null,
    });

    if (existingByTransaction) {
      // 情况 1: 这个交易已经有关联的财务记录 -> 更新关联分类（category/subCategory 可能变了）
      console.log('✏️ [upsertGeneralFinancialRecord] Updating existing record linked to this transaction');
      const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, existingByTransaction.id);
      
      // 🆕 如果 category/subCategory 变了，需要先对旧分类进行对账同步，再更新到新分类
      const oldCategory = existingByTransaction.category;
      const oldSubCategory = existingByTransaction.subCategory;
      const categoryChanged = oldCategory !== params.category || oldSubCategory !== params.subCategory;

      // 从旧列表中移除此交易ID
      let oldRevenueIds = (existingByTransaction.revenueTransactionIds || []).filter(id => id !== params.transactionId);
      let oldExpenseIds = (existingByTransaction.expenseTransactionIds || []).filter(id => id !== params.transactionId);

      // 添加到新列表
      if (params.transactionType === 'income') {
        oldRevenueIds.push(params.transactionId);
      } else {
        oldExpenseIds.push(params.transactionId);
      }

      await updateDoc(feeRef, cleanUndefinedValues({
        category: params.category,
        subCategory: params.subCategory,
        fiscalYear: params.fiscalYear,
        payerPayee: params.payerPayee, // 🆕 存储付款人/收款人
        memberId: params.memberId, // 🆕 存储会员ID
        memberName: params.memberName, // 🆕 存储会员名字
        memberEmail: params.memberEmail, // 🆕 存储会员邮箱
        revenueTransactionIds: oldRevenueIds,
        expenseTransactionIds: oldExpenseIds,
        updatedAt: now,
      }));

      // 对账同步：如果分类变了，需要同步旧分类和新分类
      if (categoryChanged) {
        console.log('🔄 [upsertGeneralFinancialRecord] Category changed, reconciling both old and new category');
        await reconcileGeneralFinancialRecord(oldCategory, oldSubCategory); // 同步旧分类
        await reconcileGeneralFinancialRecord(params.category, params.subCategory); // 同步新分类
      } else {
        await reconcileGeneralFinancialRecord(params.category, params.subCategory);
      }

    } else if (existingByCategory) {
      // 情况 2: 该分类已有财务记录，但不是这个交易创建的 -> 更新财务记录
      console.log('✏️ [upsertGeneralFinancialRecord] Updating existing record for this category');
      const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, existingByCategory.id);

      // 更新收入或支出列表
      let revenueIds = existingByCategory.revenueTransactionIds || [];
      let expenseIds = existingByCategory.expenseTransactionIds || [];
      
      if (params.transactionType === 'income') {
        if (!revenueIds.includes(params.transactionId)) {
          revenueIds.push(params.transactionId);
        }
      } else {
        if (!expenseIds.includes(params.transactionId)) {
          expenseIds.push(params.transactionId);
        }
      }

      await updateDoc(feeRef, cleanUndefinedValues({
        fiscalYear: params.fiscalYear,
        payerPayee: params.payerPayee, // 🆕 存储付款人/收款人
        memberId: params.memberId, // 🆕 存储会员ID
        memberName: params.memberName, // 🆕 存储会员名字
        memberEmail: params.memberEmail, // 🆕 存储会员邮箱
        revenueTransactionIds: revenueIds,
        expenseTransactionIds: expenseIds,
        updatedAt: now,
      }));

      // 重新对账
      await reconcileGeneralFinancialRecord(params.category, params.subCategory);

    } else {
      // 情况 3: 完全新建财务记录
      console.log('➕ [upsertGeneralFinancialRecord] Creating new record');
      
      const revenueIds = params.transactionType === 'income' ? [params.transactionId] : [];
      const expenseIds = params.transactionType === 'expense' ? [params.transactionId] : [];

      const record: Omit<GeneralFinancialRecord, 'id'> = {
        category: params.category,
        subCategory: params.subCategory,
        fiscalYear: params.fiscalYear,
        payerPayee: params.payerPayee, // 🆕 存储付款人/收款人
        memberId: params.memberId, // 🆕 存储会员ID
        memberName: params.memberName, // 🆕 存储会员名字
        memberEmail: params.memberEmail, // 🆕 存储会员邮箱
        totalRevenue: 0,
        revenueTransactionIds: revenueIds,
        totalExpense: 0,
        expenseTransactionIds: expenseIds,
        netIncome: 0,
        transactionCount: 0,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS), cleanUndefinedValues({
        ...record,
        type: 'generalFinancialRecord',
      }));

      // 对账
      await reconcileGeneralFinancialRecord(params.category, params.subCategory);
    }

    globalSystemService.log('info', 'Upsert general financial record from transaction', 'generalFinancialRecordService.upsertGeneralFinancialRecordFromTransaction', { category: params.category, subCategory: params.subCategory, transactionId: params.transactionId, userId: params.userId });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to upsert general financial record from transaction', 'generalFinancialRecordService.upsertGeneralFinancialRecordFromTransaction', { error: error.message, params });
    console.error('❌ [upsertGeneralFinancialRecord] Error:', error);
    // 不抛出以免影响交易主流程
  }
};

/**
 * Reconcile General Financial Record from Transactions
 * 根据交易记录汇总同步日常账户财务记录的总收入、总支出、净收益
 */
export const reconcileGeneralFinancialRecord = async (category: string, subCategory?: string): Promise<void> => {
  try {
    // 读取该分类的财务记录
    const feesSnap = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    const feeDoc = feesSnap.docs.find(d => {
      const data = d.data();
      if (data.type !== 'generalFinancialRecord') return false;
      if (data.category !== category) return false;
      if (subCategory) {
        return data.subCategory === subCategory;
      }
      return !data.subCategory;
    });

    if (!feeDoc) {
      console.log('⚠️ [reconcileGeneralFinancialRecord] No record found for:', { category, subCategory });
      return;
    }

    // 读取该分类的所有交易
    const txnSnap = await getDocs(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS));
    let totalRevenue = 0;
    let totalExpense = 0;
    const revenueIds: string[] = [];
    const expenseIds: string[] = [];

    txnSnap.docs.forEach(d => {
      const data = d.data() as any;
      if (data.category !== category) return;
      if (subCategory && data.subCategory !== subCategory) return;
      if (!subCategory && data.subCategory) return;
      if (!data.amount || !data.transactionType) return;

      if (data.transactionType === 'income') {
        totalRevenue += Number(data.amount) || 0;
        revenueIds.push(d.id);
      } else if (data.transactionType === 'expense') {
        totalExpense += Number(data.amount) || 0;
        expenseIds.push(d.id);
      }
    });

    const netIncome = totalRevenue - totalExpense;
    const transactionCount = revenueIds.length + expenseIds.length;

    // 更新财务记录
    const ref = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, feeDoc.id);
    await updateDoc(ref, cleanUndefinedValues({
      totalRevenue,
      totalExpense,
      netIncome,
      transactionCount,
      revenueTransactionIds: revenueIds,
      expenseTransactionIds: expenseIds,
      lastReconciliationDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    console.log('✅ [reconcileGeneralFinancialRecord] Reconciled:', { category, subCategory, totalRevenue, totalExpense, netIncome, transactionCount });
  } catch (error: any) {
    globalSystemService.log('warning', 'Failed to reconcile general financial record from transactions', 'generalFinancialRecordService.reconcileGeneralFinancialRecord', { error: error.message, category, subCategory });
    console.error('❌ [reconcileGeneralFinancialRecord] Error:', error);
  }
};

console.log('✅ General Financial Record Service Loaded');

