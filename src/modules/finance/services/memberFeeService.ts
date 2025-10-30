/**
 * Member Fee Service
 * 会员费用服务
 * 
 * Handles member fee tracking and payment management
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
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type {
  MemberFee,
  MemberFeeFormData,
  MemberFeeStatus,
  MemberFeeQueryParams,
  PaymentMethod,
} from '../types';
import type { MemberCategoryType } from '@/modules/member/types';
import type { PaginatedResponse } from '@/types';

/**
 * Create Member Fee Record
 */
export const createMemberFee = async (
  data: MemberFeeFormData,
  userId: string
): Promise<MemberFee> => {
  try {
    // Get member details
    const memberDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, data.memberId));
    
    if (!memberDoc.exists()) {
      throw new Error('Member not found');
    }
    
    const memberData = memberDoc.data();
    
    const dueDate = data.dueDate instanceof Date 
      ? data.dueDate 
      : new Date(data.dueDate);
    
    const now = new Date().toISOString();
    
    const memberFee: Omit<MemberFee, 'id'> = {
      memberId: data.memberId,
      memberName: memberData.name,
      memberEmail: memberData.email,
      memberCategory: memberData.accountType || memberData.category,
      feeType: data.feeType,
      expectedAmount: data.expectedAmount,
      paidAmount: 0,
      remainingAmount: data.expectedAmount,
      dueDate: globalDateService.formatDate(dueDate, 'api'),
      status: 'unpaid',
      notes: data.notes,
      remindersSent: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    const cleanData = cleanUndefinedValues(memberFee);
    
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS),
      {
        ...cleanData,
        type: 'memberFee', // Tag for filtering
      }
    );
    
    globalSystemService.log(
      'info',
      'Member fee record created',
      'memberFeeService.createMemberFee',
      { feeId: docRef.id, memberId: data.memberId, userId }
    );
    
    return {
      id: docRef.id,
      ...memberFee,
    } as MemberFee;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to create member fee record',
      'memberFeeService.createMemberFee',
      { error: error.message, userId }
    );
    throw error;
  }
};

/**
 * Record Payment for Member Fee
 */
export const recordMemberFeePayment = async (
  feeId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  transactionId: string,
  receiptNumber?: string,
  userId?: string
): Promise<void> => {
  try {
    const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, feeId);
    const feeDoc = await getDoc(feeRef);
    
    if (!feeDoc.exists()) {
      throw new Error('Member fee record not found');
    }
    
    const feeData = feeDoc.data();
    const newPaidAmount = (feeData.paidAmount || 0) + amount;
    const remaining = feeData.expectedAmount - newPaidAmount;
    
    let newStatus: MemberFeeStatus = 'partial';
    if (remaining <= 0) {
      newStatus = 'paid';
    } else if (new Date() > new Date(feeData.dueDate)) {
      newStatus = 'overdue';
    } else {
      newStatus = 'partial';
    }
    
    const updates = {
      paidAmount: newPaidAmount,
      remainingAmount: remaining,
      status: newStatus,
      paymentDate: new Date().toISOString(),
      paymentMethod,
      transactionId,
      receiptNumber: receiptNumber ?? null,
      updatedAt: new Date().toISOString(),
    };
    
    await updateDoc(feeRef, cleanUndefinedValues(updates));
    
    globalSystemService.log(
      'info',
      'Member fee payment recorded',
      'memberFeeService.recordMemberFeePayment',
      { feeId, amount, transactionId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to record member fee payment',
      'memberFeeService.recordMemberFeePayment',
      { error: error.message, feeId, userId }
    );
    throw error;
  }
};

/**
 * Update Member Fee
 */
export const updateMemberFee = async (
  feeId: string,
  data: Partial<MemberFeeFormData>,
  userId: string
): Promise<void> => {
  try {
    const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, feeId);
    const feeDoc = await getDoc(feeRef);
    
    if (!feeDoc.exists()) {
      throw new Error('Member fee record not found');
    }
    
    const updates: Partial<MemberFee> = {
      updatedAt: new Date().toISOString(),
    };
    
    if (data.expectedAmount !== undefined) {
      const paidAmount = feeDoc.data().paidAmount || 0;
      updates.expectedAmount = data.expectedAmount;
      updates.remainingAmount = data.expectedAmount - paidAmount;
    }
    
    if (data.dueDate !== undefined) {
      const dueDate = data.dueDate instanceof Date 
        ? data.dueDate 
        : new Date(data.dueDate);
      updates.dueDate = globalDateService.formatDate(dueDate, 'api');
    }
    
    if (data.notes !== undefined) updates.notes = data.notes ?? null;
    if (data.feeType !== undefined) updates.feeType = data.feeType;
    
    const cleanData = cleanUndefinedValues(updates);
    await updateDoc(feeRef, cleanData);
    
    globalSystemService.log(
      'info',
      'Member fee updated',
      'memberFeeService.updateMemberFee',
      { feeId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to update member fee',
      'memberFeeService.updateMemberFee',
      { error: error.message, feeId, userId }
    );
    throw error;
  }
};

/**
 * Delete Member Fee
 */
export const deleteMemberFee = async (
  feeId: string,
  userId: string
): Promise<void> => {
  try {
    const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, feeId);
    await deleteDoc(feeRef);
    
    globalSystemService.log(
      'info',
      'Member fee deleted',
      'memberFeeService.deleteMemberFee',
      { feeId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to delete member fee',
      'memberFeeService.deleteMemberFee',
      { error: error.message, feeId, userId }
    );
    throw error;
  }
};

/**
 * Get Member Fee by ID
 */
export const getMemberFeeById = async (
  feeId: string
): Promise<MemberFee | null> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, feeId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists() || docSnap.data().type !== 'memberFee') {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: safeTimestampToISO(data.createdAt) || new Date().toISOString(),
      updatedAt: safeTimestampToISO(data.updatedAt) || new Date().toISOString(),
      paymentDate: data.paymentDate ? safeTimestampToISO(data.paymentDate) : undefined,
      lastReminderDate: data.lastReminderDate ? safeTimestampToISO(data.lastReminderDate) : undefined,
    } as MemberFee;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get member fee',
      'memberFeeService.getMemberFeeById',
      { error: error.message, feeId }
    );
    throw error;
  }
};

/**
 * Get Member Fees (with pagination and filters)
 * 载入所有会员并匹配他们的费用记录
 */
export const getMemberFees = async (
  params: MemberFeeQueryParams = {}
): Promise<PaginatedResponse<MemberFee>> => {
  try {
    const {
      page = 1,
      limit: pageLimit = 20,
      search,
      status,
      feeType,
      memberCategory,
      overdue,
      sortBy = 'dueDate',
      sortOrder = 'asc',
    } = params;
    
    // 1. 获取所有会员
    const membersQuery = query(collection(db, GLOBAL_COLLECTIONS.MEMBERS));
    const membersSnapshot = await getDocs(membersQuery);
    
    // 2. 获取所有会员费记录
    const feesQuery = query(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    const feesSnapshot = await getDocs(feesQuery);

    // 创建会员费记录映射 (memberId -> MemberFee)
    const feesByMemberId = new Map<string, MemberFee>();
    feesSnapshot.docs
      .filter(doc => doc.data().type === 'memberFee')
      .forEach(doc => {
        const data = doc.data();
        const fee: MemberFee = {
          id: doc.id,
          memberId: data.memberId,
          memberName: data.memberName,
          memberEmail: data.memberEmail,
          memberCategory: data.memberCategory,
          feeType: data.feeType,
          expectedAmount: data.expectedAmount || 0,
          paidAmount: data.paidAmount || 0,
          remainingAmount: data.remainingAmount || 0,
          dueDate: data.dueDate,
          status: data.status,
          paymentDate: data.paymentDate ? safeTimestampToISO(data.paymentDate) : undefined,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          receiptNumber: data.receiptNumber,
          notes: data.notes,
          remindersSent: data.remindersSent || 0,
          lastReminderDate: data.lastReminderDate ? safeTimestampToISO(data.lastReminderDate) : undefined,
          createdAt: safeTimestampToISO(data.createdAt) || new Date().toISOString(),
          updatedAt: safeTimestampToISO(data.updatedAt) || new Date().toISOString(),
        };
        
        // 保留所有记录(不再按财年筛选)
        feesByMemberId.set(fee.memberId, fee);
      });
    
    // 3. 为每个会员创建会员费记录(如果不存在则创建占位记录)
    let fees: MemberFee[] = membersSnapshot.docs.map(memberDoc => {
      const memberData = memberDoc.data();
      const memberId = memberDoc.id;
      const existingFee = feesByMemberId.get(memberId);
      
      if (existingFee) {
        // 使用现有的会员费记录，并用会员信息补齐缺失/错误的分类信息
        if (!existingFee.memberCategory) {
          const fixedCategory = (memberData.category ?? memberData.accountType) || undefined;
          if (fixedCategory) {
            (existingFee as any).memberCategory = fixedCategory;
          }
        }
        return existingFee;
      } else {
        // 创建占位记录(显示会员但没有费用记录)
        const placeholder: any = {
          id: `placeholder-${memberId}`,
          memberId: memberId,
          memberName: memberData.name || '',
          memberEmail: memberData.email || '',
          memberCategory: (memberData.category ?? memberData.accountType) || undefined,
          feeType: 'annual' as const,
          expectedAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          dueDate: '',
          status: 'unpaid' as MemberFeeStatus,
          remindersSent: 0,
          createdAt: safeTimestampToISO(memberData.createdAt) || new Date().toISOString(),
          updatedAt: safeTimestampToISO(memberData.updatedAt) || new Date().toISOString(),
          // 标记为占位记录
          isPlaceholder: true,
        };
        return placeholder as MemberFee;
      }
    });
    
    // 4. 应用过滤器
    if (status) {
      fees = fees.filter(f => {
        // 占位记录默认状态为unpaid
        if ((f as any).isPlaceholder && status === 'unpaid') return true;
        return f.status === status;
      });
    }
    if (feeType) {
      fees = fees.filter(f => !((f as any).isPlaceholder) && f.feeType === feeType);
    }
    if (memberCategory) {
      fees = fees.filter(f => f.memberCategory === memberCategory);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      fees = fees.filter(f =>
        f.memberName?.toLowerCase().includes(searchLower) ||
        f.memberEmail?.toLowerCase().includes(searchLower) ||
        f.memberId.toLowerCase().includes(searchLower)
      );
    }
    if (overdue) {
      const now = new Date();
      fees = fees.filter(f => 
        !((f as any).isPlaceholder) && 
        f.dueDate && 
        new Date(f.dueDate) < now && 
        f.status !== 'paid'
      );
    }
    
    // 5. 关联交易以补充付款日期和二次分类(会员费交易记录二次分类)
    try {
      const txnSnap = await getDocs(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS));
      const latestPaidByMember: Record<string, { date: string; txAccount?: string }> = {};
      let debugMatchCount = 0;
      txnSnap.docs
        .filter(d => d.data().category === 'member-fees')
        .forEach(d => {
          const data = d.data() as any;
          const mId = data?.metadata?.memberId as string | undefined;
          if (!mId) return;
          const txDate = safeTimestampToISO(data.transactionDate);
          if (!txDate) return; // 跳过无效日期
          const prev = latestPaidByMember[mId];
          if (!prev || txDate > prev.date) {
            latestPaidByMember[mId] = { 
              date: txDate,
              txAccount: data.txAccount, // 🆕 获取二次分类
            };
          }
          if (debugMatchCount < 5) {
            debugMatchCount++;
          }
        });
      fees = fees.map(f => {
        const latest = latestPaidByMember[f.memberId];
        if (latest) {
          return { 
            ...f, 
            paymentDate: f.paymentDate || latest.date,
            txAccount: latest.txAccount, // 🆕 添加二次分类字段
          } as MemberFee & { txAccount?: string };
        }
        return f;
      });
    } catch (e) {
      // 非关键路径，忽略错误
    }

    // 6. 排序
    fees.sort((a, b) => {
      // 占位记录排在最后
      if ((a as any).isPlaceholder && !(b as any).isPlaceholder) return 1;
      if (!(a as any).isPlaceholder && (b as any).isPlaceholder) return -1;
      
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // 7. 分页
    const total = fees.length;
    const startIndex = (page - 1) * pageLimit;
    const endIndex = startIndex + pageLimit;
    const paginatedData = fees.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      total,
      page,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit),
    };
  } catch (error: any) {
    console.warn('[Finance] Failed to get member fees, returning empty data:', error.message);
    globalSystemService.log(
      'error',
      'Failed to get member fees',
      'memberFeeService.getMemberFees',
      { error: error.message, params }
    );
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
 * Get Member Fees by Member ID
 */
export const getMemberFeesByMemberId = async (
  memberId: string
): Promise<MemberFee[]> => {
  try {
    // 简化查询，避免组合索引依赖；排序在客户端完成
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS),
      where('type', '==', 'memberFee'),
      where('memberId', '==', memberId)
    );
    
    const snapshot = await getDocs(q);
    
    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: safeTimestampToISO(doc.data().createdAt) || new Date().toISOString(),
      updatedAt: safeTimestampToISO(doc.data().updatedAt) || new Date().toISOString(),
      paymentDate: doc.data().paymentDate ? safeTimestampToISO(doc.data().paymentDate) : undefined,
      lastReminderDate: doc.data().lastReminderDate ? safeTimestampToISO(doc.data().lastReminderDate) : undefined,
    } as MemberFee));

    // 客户端按到期日倒序
    return list.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get member fees by member ID',
      'memberFeeService.getMemberFeesByMemberId',
      { error: error.message, memberId }
    );
    throw error;
  }
};

/**
 * Send Payment Reminder
 */
export const sendPaymentReminder = async (
  feeId: string,
  userId: string
): Promise<void> => {
  try {
    const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, feeId);
    const feeDoc = await getDoc(feeRef);
    
    if (!feeDoc.exists()) {
      throw new Error('Member fee record not found');
    }
    
    const remindersSent = (feeDoc.data().remindersSent || 0) + 1;
    
    await updateDoc(feeRef, {
      remindersSent,
      lastReminderDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // TODO: Integrate with email service to send actual reminder
    
    globalSystemService.log(
      'info',
      'Payment reminder sent',
      'memberFeeService.sendPaymentReminder',
      { feeId, remindersSent, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to send payment reminder',
      'memberFeeService.sendPaymentReminder',
      { error: error.message, feeId, userId }
    );
    throw error;
  }
};

/**
 * Waive Member Fee
 */
export const waiveMemberFee = async (
  feeId: string,
  reason: string,
  userId: string
): Promise<void> => {
  try {
    const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, feeId);
    
    await updateDoc(feeRef, {
      status: 'waived' as MemberFeeStatus,
      notes: `Waived: ${reason}`,
      updatedAt: new Date().toISOString(),
    });
    
    globalSystemService.log(
      'info',
      'Member fee waived',
      'memberFeeService.waiveMemberFee',
      { feeId, reason, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to waive member fee',
      'memberFeeService.waiveMemberFee',
      { error: error.message, feeId, userId }
    );
    throw error;
  }
};

/**
 * Get Member Fee Statistics
 * ⚠️ Note: fiscalYear parameter removed - use date ranges for filtering if needed
 */
export const getMemberFeeStatistics = async (): Promise<{
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  collectionRate: number;
}> => {
  try {
    // Simple query to avoid index issues
    const q = query(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    
    const snapshot = await getDocs(q);
    
    let totalExpected = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    
    const now = new Date();
    
    // Filter in memory
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Only process member fees
      if (data.type !== 'memberFee') return;
      
      totalExpected += data.expectedAmount || 0;
      totalCollected += data.paidAmount || 0;
      totalOutstanding += data.remainingAmount || 0;
      
      if (data.status !== 'paid' && new Date(data.dueDate) < now) {
        totalOverdue += data.remainingAmount || 0;
      }
    });
    
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
    
    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      totalOverdue,
      collectionRate,
    };
  } catch (error: any) {
    // Log error but return empty statistics instead of throwing
    globalSystemService.log(
      'warning',
      'Failed to get member fee statistics, returning empty data',
      'memberFeeService.getMemberFeeStatistics',
      { error: error.message }
    );
    
    // Return empty statistics instead of throwing
    return {
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalOverdue: 0,
      collectionRate: 0,
    };
  }
};

/**
 * Update Overdue Status
 * Should be run periodically (e.g., daily cron job)
 */
export const updateOverdueStatus = async (): Promise<number> => {
  try {
    const now = new Date().toISOString();
    
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS),
      where('type', '==', 'memberFee'),
      where('status', 'in', ['unpaid', 'partial']),
      where('dueDate', '<', now)
    );
    
    const snapshot = await getDocs(q);
    
    let updatedCount = 0;
    
    const updatePromises = snapshot.docs.map(async (doc) => {
      await updateDoc(doc.ref, {
        status: 'overdue' as MemberFeeStatus,
        updatedAt: new Date().toISOString(),
      });
      updatedCount++;
    });
    
    await Promise.all(updatePromises);
    
    globalSystemService.log(
      'info',
      'Overdue statuses updated',
      'memberFeeService.updateOverdueStatus',
      { updatedCount }
    );
    
    return updatedCount;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to update overdue statuses',
      'memberFeeService.updateOverdueStatus',
      { error: error.message }
    );
    throw error;
  }
};

console.log('✅ Member Fee Service Loaded');

/**
 * Upsert Member Fee by Transaction linkage
 * ⚠️ DEPRECATED: FiscalYear-based member fee management is removed
 * This function is kept for backward compatibility but should not be used for new features
 * 
 * 当交易分类为 member-fees 且存在 metadata.memberId 时，
 * 在 FINANCIAL_RECORDS 中创建/更新对应的 memberFee 文档
 */
export const upsertMemberFeeFromTransaction = async (params: {
  memberId: string;
  memberName?: string;
  memberEmail?: string;
  memberCategory?: MemberCategoryType;
  expectedAmount: number;
  dueDate?: string;
  transactionId: string;
  userId?: string;
}): Promise<void> => {
  try {
    const now = new Date().toISOString();
    const due = params.dueDate || now;

    // 🆕 Step 1: 先按 transactionId 查找(优先级最高 - 这个交易可能已经有关联的会费记录)
    const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    const allFees = snapshot.docs
      .filter(d => d.data().type === 'memberFee')
      .map(d => ({ id: d.id, ...d.data() } as MemberFee & { id: string }));

    let existingByTransaction = allFees.find(f => f.transactionId === params.transactionId);
    let existingByMember = allFees.find(f => f.memberId === params.memberId);

    console.log('🔍 [upsertMemberFeeFromTransaction] Search results:', {
      transactionId: params.transactionId,
      memberId: params.memberId,
      existingByTransaction: existingByTransaction ? { id: existingByTransaction.id, memberId: existingByTransaction.memberId } : null,
      existingByMember: existingByMember ? { id: existingByMember.id, transactionId: existingByMember.transactionId } : null,
    });

    if (existingByTransaction) {
      // 情况 1: 这个交易已经有关联的会费记录 -> 更新关联会员(memberId 可能变了)
      console.log('✏️ [upsertMemberFeeFromTransaction] Updating existing fee record linked to this transaction');
      const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, existingByTransaction.id);
      
      // 🆕 如果 memberId 变了，需要先对旧会员进行对账同步，再更新到新会员
      const oldMemberId = existingByTransaction.memberId;
      const memberIdChanged = oldMemberId !== params.memberId;

      await updateDoc(feeRef, cleanUndefinedValues({
        memberId: params.memberId,
        memberName: params.memberName ?? existingByTransaction.memberName,
        memberEmail: params.memberEmail ?? existingByTransaction.memberEmail,
        memberCategory: params.memberCategory ?? existingByTransaction.memberCategory,
        expectedAmount: params.expectedAmount,
        dueDate: due,
        updatedAt: now,
      }));

      // 对账同步：如果会员变了，需要同步旧会员和新会员
      if (memberIdChanged) {
        console.log('🔄 [upsertMemberFeeFromTransaction] Member changed, reconciling both old and new member');
        await reconcileMemberFeeFromTransactions(oldMemberId); // 同步旧会员
        await reconcileMemberFeeFromTransactions(params.memberId); // 同步新会员
      } else {
        await reconcileMemberFeeFromTransactions(params.memberId);
      }

    } else if (existingByMember) {
      // 情况 2: 该会员已有会费记录，但不是这个交易创建的 -> 更新会费记录
      console.log('✏️ [upsertMemberFeeFromTransaction] Updating existing fee record for this member');
      const feeRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, existingByMember.id);
      const paidAmount = existingByMember.paidAmount || 0;
      const expectedAmount = existingByMember.expectedAmount || params.expectedAmount || 0;
      const remainingAmount = Math.max(expectedAmount - paidAmount, 0);
      
      await updateDoc(feeRef, cleanUndefinedValues({
        memberName: params.memberName ?? existingByMember.memberName,
        memberEmail: params.memberEmail ?? existingByMember.memberEmail,
        memberCategory: params.memberCategory ?? existingByMember.memberCategory,
        expectedAmount: expectedAmount || params.expectedAmount,
        remainingAmount,
        transactionId: params.transactionId,
        updatedAt: now,
      }));

      await reconcileMemberFeeFromTransactions(params.memberId);

    } else {
      // 情况 3: 完全新建会费记录
      console.log('➕ [upsertMemberFeeFromTransaction] Creating new fee record');
      const fee: Omit<MemberFee, 'id'> = {
        memberId: params.memberId,
        memberName: params.memberName,
        memberEmail: params.memberEmail,
        memberCategory: params.memberCategory,
        feeType: 'other',
        expectedAmount: params.expectedAmount || 0,
        paidAmount: 0,
        remainingAmount: params.expectedAmount || 0,
        dueDate: due,
        status: 'unpaid',
        transactionId: params.transactionId,
        paymentMethod: undefined,
        receiptNumber: undefined,
        notes: 'Auto-created from transaction linkage',
        remindersSent: 0,
        createdAt: now,
        updatedAt: now,
      };
      await addDoc(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS), cleanUndefinedValues({
        ...fee,
        type: 'memberFee',
      }));

      await reconcileMemberFeeFromTransactions(params.memberId);
    }

    globalSystemService.log('info', 'Upsert member fee from transaction', 'memberFeeService.upsertMemberFeeFromTransaction', { memberId: params.memberId, transactionId: params.transactionId, userId: params.userId });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to upsert member fee from transaction', 'memberFeeService.upsertMemberFeeFromTransaction', { error: error.message, params });
    console.error('❌ [upsertMemberFeeFromTransaction] Error:', error);
    // 不抛出以免影响交易主流程
  }
};

/**
 * 根据交易记录汇总同步会费记录的已收金额、付款日期与状态
 * ⚠️ Updated: FiscalYear parameter removed
 */
export const reconcileMemberFeeFromTransactions = async (
  memberId: string
): Promise<void> => {
  try {
    // 读取该会员的会费记录
    const feesSnap = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    const feeDoc = feesSnap.docs.find(d => d.data().type === 'memberFee' && d.data().memberId === memberId);
    if (!feeDoc) return;

    // 读取交易并聚合
    const txnSnap = await getDocs(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS));
    let paidAmount = 0;
    let latestPayment: string | undefined = undefined;

    txnSnap.docs.forEach(d => {
      const data = d.data() as any;
      if (data.category !== 'member-fees') return;
      if (!data?.metadata?.memberId || data.metadata.memberId !== memberId) return;
      if (!data.amount || !data.transactionType) return;
      // 只累计收入
      if (data.transactionType === 'income') {
        paidAmount += Number(data.amount) || 0;
      }
      const txDate = safeTimestampToISO(data.transactionDate);
      if (txDate && (!latestPayment || txDate > latestPayment)) latestPayment = txDate;
    });

    const ref = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, feeDoc.id);
    const feeData = feeDoc.data() as any;
    const expected = Number(feeData.expectedAmount || 0);
    const remaining = Math.max(expected - paidAmount, 0);

    let newStatus: MemberFeeStatus = 'partial';
    if (expected <= 0) newStatus = 'unpaid';
    else if (remaining <= 0) newStatus = 'paid';
    else if (feeData.dueDate && new Date(latestPayment || new Date().toISOString()) > new Date(feeData.dueDate) && remaining > 0) newStatus = 'overdue';
    else newStatus = 'partial';

    await updateDoc(ref, cleanUndefinedValues({
      paidAmount,
      remainingAmount: remaining,
      paymentDate: latestPayment ?? null,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error: any) {
    globalSystemService.log('warning', 'Failed to reconcile member fee from transactions', 'memberFeeService.reconcileMemberFeeFromTransactions', { error: error.message, memberId });
  }
};

