/**
 * Event Financial Record Service
 * 活动财务记录服务
 * 
 * 管理 FINANCIAL_RECORDS 中的 eventFinancialRecord 类型记录
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
import type { EventFinancialRecord } from '../types';

/**
 * Upsert Event Financial Record from Transaction
 * 当交易分类为 event-* 且存在 metadata.eventId 时，
 * 在 FINANCIAL_RECORDS 中创建/更新对应的 eventFinancialRecord 文档
 */
export const upsertEventFinancialRecordFromTransaction = async (params: {
  eventId: string;
  eventName: string;
  eventDate?: string;
  fiscalYear?: string;
  txAccount?: string;
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

    // 🆕 Step 1: 先按 transactionId 查找(优先级最高 - 这个交易可能已经有关联的财务记录)
    const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    const allRecords = snapshot.docs
      .filter(d => d.data().type === 'eventFinancialRecord')
      .map(d => ({ id: d.id, ...d.data() } as EventFinancialRecord & { id: string; type: string }));

    let existingByTransaction = allRecords.find(r => {
      const revenueIds = r.revenueTransactionIds || [];
      const expenseIds = r.expenseTransactionIds || [];
      return revenueIds.includes(params.transactionId) || expenseIds.includes(params.transactionId);
    });
    
    let existingByEvent = allRecords.find(r => r.eventId === params.eventId);

    console.log('🔍 [upsertEventFinancialRecord] Search results:', {
      eventId: params.eventId,
      transactionId: params.transactionId,
      existingByTransaction: existingByTransaction ? { id: existingByTransaction.id, eventId: existingByTransaction.eventId } : null,
      existingByEvent: existingByEvent ? { id: existingByEvent.id, eventId: existingByEvent.eventId } : null,
    });

    if (existingByTransaction) {
      // 情况 1: 这个交易已经有关联的财务记录 -> 更新关联活动(eventId 可能变了)
      console.log('✏️ [upsertEventFinancialRecord] Updating existing record linked to this transaction');
      const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, existingByTransaction.id);
      
      // 🆕 如果 eventId 变了，需要先对旧活动进行对账同步，再更新到新活动
      const oldEventId = existingByTransaction.eventId;
      const eventIdChanged = oldEventId !== params.eventId;

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
        eventId: params.eventId,
        eventName: params.eventName,
        eventDate: params.eventDate,
        fiscalYear: params.fiscalYear,
        txAccount: params.txAccount,
        payerPayee: params.payerPayee, // 🆕 存储付款人/收款人
        memberId: params.memberId, // 🆕 存储会员ID
        memberName: params.memberName, // 🆕 存储会员名字
        memberEmail: params.memberEmail, // 🆕 存储会员邮箱
        revenueTransactionIds: oldRevenueIds,
        expenseTransactionIds: oldExpenseIds,
        updatedAt: now,
      }));

      // 对账同步：如果活动变了，需要同步旧活动和新活动
      if (eventIdChanged) {
        console.log('🔄 [upsertEventFinancialRecord] Event changed, reconciling both old and new event');
        await reconcileEventFinancialRecord(oldEventId); // 同步旧活动
        await reconcileEventFinancialRecord(params.eventId); // 同步新活动
      } else {
        await reconcileEventFinancialRecord(params.eventId);
      }

    } else if (existingByEvent) {
      // 情况 2: 该活动已有财务记录，但不是这个交易创建的 -> 更新财务记录
      console.log('✏️ [upsertEventFinancialRecord] Updating existing record for this event');
      const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, existingByEvent.id);

      // 更新收入或支出列表
      let revenueIds = existingByEvent.revenueTransactionIds || [];
      let expenseIds = existingByEvent.expenseTransactionIds || [];
      
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
        eventName: params.eventName,
        eventDate: params.eventDate,
        fiscalYear: params.fiscalYear,
        txAccount: params.txAccount,
        payerPayee: params.payerPayee, // 🆕 存储付款人/收款人
        memberId: params.memberId, // 🆕 存储会员ID
        memberName: params.memberName, // 🆕 存储会员名字
        memberEmail: params.memberEmail, // 🆕 存储会员邮箱
        revenueTransactionIds: revenueIds,
        expenseTransactionIds: expenseIds,
        updatedAt: now,
      }));

      // 重新对账
      await reconcileEventFinancialRecord(params.eventId);

    } else {
      // 情况 3: 完全新建财务记录
      console.log('➕ [upsertEventFinancialRecord] Creating new record');
      
      const revenueIds = params.transactionType === 'income' ? [params.transactionId] : [];
      const expenseIds = params.transactionType === 'expense' ? [params.transactionId] : [];

      const record: Omit<EventFinancialRecord, 'id'> = {
        eventId: params.eventId,
        eventName: params.eventName,
        eventDate: params.eventDate,
        fiscalYear: params.fiscalYear,
        txAccount: params.txAccount,
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
        type: 'eventFinancialRecord',
      }));

      // 对账
      await reconcileEventFinancialRecord(params.eventId);
    }

    globalSystemService.log('info', 'Upsert event financial record from transaction', 'eventFinancialRecordService.upsertEventFinancialRecordFromTransaction', { eventId: params.eventId, transactionId: params.transactionId, userId: params.userId });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to upsert event financial record from transaction', 'eventFinancialRecordService.upsertEventFinancialRecordFromTransaction', { error: error.message, params });
    console.error('❌ [upsertEventFinancialRecord] Error:', error);
    // 不抛出以免影响交易主流程
  }
};

/**
 * Reconcile Event Financial Record from Transactions
 * 根据交易记录汇总同步活动财务记录的总收入、总支出、净收益
 */
export const reconcileEventFinancialRecord = async (eventId: string): Promise<void> => {
  try {
    // 读取该活动的财务记录
    const feesSnap = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    const feeDoc = feesSnap.docs.find(d => d.data().type === 'eventFinancialRecord' && d.data().eventId === eventId);
    if (!feeDoc) {
      console.log('⚠️ [reconcileEventFinancialRecord] No record found for event:', eventId);
      return;
    }

    // 读取该活动的所有交易
    const txnSnap = await getDocs(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS));
    let totalRevenue = 0;
    let totalExpense = 0;
    const revenueIds: string[] = [];
    const expenseIds: string[] = [];

    txnSnap.docs.forEach(d => {
      const data = d.data() as any;
      const txEventId = data?.metadata?.eventId as string | undefined;
      if (!txEventId || txEventId !== eventId) return;
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

    console.log('✅ [reconcileEventFinancialRecord] Reconciled:', { eventId, totalRevenue, totalExpense, netIncome, transactionCount });
  } catch (error: any) {
    globalSystemService.log('warning', 'Failed to reconcile event financial record from transactions', 'eventFinancialRecordService.reconcileEventFinancialRecord', { error: error.message, eventId });
    console.error('❌ [reconcileEventFinancialRecord] Error:', error);
  }
};



