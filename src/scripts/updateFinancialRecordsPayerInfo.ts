/**
 * Update Financial Records Payer Information Script
 * 更新财务记录的付款人/收款人信息脚本
 * 
 * 检查并更新现有的活动财务记录和日常账户财务记录，
 * 从关联的交易记录中获取最新的 payerPayee、memberId、memberName 信息
 */

import { collection, doc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import type { Transaction, EventFinancialRecord, GeneralFinancialRecord } from '@/modules/finance/types';

/**
 * 获取交易记录的最新付款人信息
 */
const getLatestPayerInfoFromTransactions = async (transactionIds: string[]): Promise<{
  payerPayee?: string;
  memberId?: string;
  memberName?: string;
  memberEmail?: string;
}> => {
  try {
    if (!transactionIds || transactionIds.length === 0) {
      return {};
    }

    // 获取最新的交易记录（按创建时间排序）
    const transactionsRef = collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS);
    const q = query(
      transactionsRef,
      where('__name__', 'in', transactionIds)
    );
    
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Transaction[];

    // 按创建时间排序，获取最新的交易信息
    const latestTransaction = transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    if (latestTransaction) {
      const memberId = (latestTransaction as any)?.metadata?.memberId;
      let memberName = latestTransaction.payerPayee;
      let memberEmail: string | undefined;
      
      // 🆕 如果有 memberId，从会员服务获取完整信息
      if (memberId) {
        try {
          const { getMemberById } = await import('@/modules/member/services/memberService');
          const member = await getMemberById(memberId);
          if (member) {
            memberName = member.name;
            memberEmail = member.email;
          }
        } catch (error) {
          console.warn(`Failed to get member ${memberId}:`, error);
        }
      }
      
      return {
        payerPayee: latestTransaction.payerPayee,
        memberId,
        memberName,
        memberEmail, // 🆕 返回会员邮箱
      };
    }
    
    return {};
  } catch (error) {
    console.error('Error getting latest payer info:', error);
    return {};
  }
};

/**
 * 更新活动财务记录的付款人信息
 */
export const updateEventFinancialRecordsPayerInfo = async (): Promise<void> => {
  try {
    console.log('🔄 [updateEventFinancialRecordsPayerInfo] Starting update...');
    
    const financialRecordsRef = collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS);
    const q = query(
      financialRecordsRef,
      where('type', '==', 'eventFinancialRecord')
    );
    
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (EventFinancialRecord & { type: string })[];

    console.log(`📊 [updateEventFinancialRecordsPayerInfo] Found ${records.length} event financial records`);

    let updatedCount = 0;
    
    for (const record of records) {
      try {
        // 获取所有关联的交易ID
        const allTransactionIds = [
          ...(record.revenueTransactionIds || []),
          ...(record.expenseTransactionIds || [])
        ];

        if (allTransactionIds.length === 0) {
          console.log(`⚠️ [updateEventFinancialRecordsPayerInfo] Record ${record.id} has no associated transactions`);
          continue;
        }

        // 获取最新的付款人信息
        const payerInfo = await getLatestPayerInfoFromTransactions(allTransactionIds);
        
        // 检查是否需要更新
        const needsUpdate = 
          record.payerPayee !== payerInfo.payerPayee ||
          record.memberId !== payerInfo.memberId ||
          record.memberName !== payerInfo.memberName ||
          record.memberEmail !== payerInfo.memberEmail; // 🆕 检查邮箱

        if (needsUpdate) {
          const recordRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, record.id);
          await updateDoc(recordRef, cleanUndefinedValues({
            payerPayee: payerInfo.payerPayee,
            memberId: payerInfo.memberId,
            memberName: payerInfo.memberName,
            memberEmail: payerInfo.memberEmail, // 🆕 更新邮箱
            updatedAt: new Date().toISOString(),
          }));

          console.log(`✅ [updateEventFinancialRecordsPayerInfo] Updated record ${record.id}:`, {
            eventName: record.eventName,
            payerPayee: payerInfo.payerPayee,
            memberId: payerInfo.memberId,
            memberEmail: payerInfo.memberEmail, // 🆕 日志包含邮箱
          });
          
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ [updateEventFinancialRecordsPayerInfo] Error updating record ${record.id}:`, error);
      }
    }

    console.log(`✅ [updateEventFinancialRecordsPayerInfo] Completed. Updated ${updatedCount} records`);
    
  } catch (error) {
    console.error('❌ [updateEventFinancialRecordsPayerInfo] Error:', error);
    throw error;
  }
};

/**
 * 更新日常账户财务记录的付款人信息
 */
export const updateGeneralFinancialRecordsPayerInfo = async (): Promise<void> => {
  try {
    console.log('🔄 [updateGeneralFinancialRecordsPayerInfo] Starting update...');
    
    const financialRecordsRef = collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS);
    const q = query(
      financialRecordsRef,
      where('type', '==', 'generalFinancialRecord')
    );
    
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (GeneralFinancialRecord & { type: string })[];

    console.log(`📊 [updateGeneralFinancialRecordsPayerInfo] Found ${records.length} general financial records`);

    let updatedCount = 0;
    
    for (const record of records) {
      try {
        // 获取所有关联的交易ID
        const allTransactionIds = [
          ...(record.revenueTransactionIds || []),
          ...(record.expenseTransactionIds || [])
        ];

        if (allTransactionIds.length === 0) {
          console.log(`⚠️ [updateGeneralFinancialRecordsPayerInfo] Record ${record.id} has no associated transactions`);
          continue;
        }

        // 获取最新的付款人信息
        const payerInfo = await getLatestPayerInfoFromTransactions(allTransactionIds);
        
        // 检查是否需要更新
        const needsUpdate = 
          record.payerPayee !== payerInfo.payerPayee ||
          record.memberId !== payerInfo.memberId ||
          record.memberName !== payerInfo.memberName ||
          record.memberEmail !== payerInfo.memberEmail; // 🆕 检查邮箱

        if (needsUpdate) {
          const recordRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, record.id);
          await updateDoc(recordRef, cleanUndefinedValues({
            payerPayee: payerInfo.payerPayee,
            memberId: payerInfo.memberId,
            memberName: payerInfo.memberName,
            memberEmail: payerInfo.memberEmail, // 🆕 更新邮箱
            updatedAt: new Date().toISOString(),
          }));

          console.log(`✅ [updateGeneralFinancialRecordsPayerInfo] Updated record ${record.id}:`, {
            category: record.category,
            subCategory: record.subCategory,
            payerPayee: payerInfo.payerPayee,
            memberId: payerInfo.memberId,
            memberEmail: payerInfo.memberEmail, // 🆕 日志包含邮箱
          });
          
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ [updateGeneralFinancialRecordsPayerInfo] Error updating record ${record.id}:`, error);
      }
    }

    console.log(`✅ [updateGeneralFinancialRecordsPayerInfo] Completed. Updated ${updatedCount} records`);
    
  } catch (error) {
    console.error('❌ [updateGeneralFinancialRecordsPayerInfo] Error:', error);
    throw error;
  }
};

/**
 * 更新所有财务记录的付款人信息
 */
export const updateAllFinancialRecordsPayerInfo = async (): Promise<void> => {
  try {
    console.log('🚀 [updateAllFinancialRecordsPayerInfo] Starting update of all financial records...');
    
    await updateEventFinancialRecordsPayerInfo();
    await updateGeneralFinancialRecordsPayerInfo();
    
    console.log('✅ [updateAllFinancialRecordsPayerInfo] All updates completed successfully!');
    
  } catch (error) {
    console.error('❌ [updateAllFinancialRecordsPayerInfo] Error:', error);
    throw error;
  }
};

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  updateAllFinancialRecordsPayerInfo()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
