/**
 * Event Account Plan Service
 * 活动账户财务计划服务
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import type { FinancialPlanItem } from '../components/ActivityFinancialPlan';

/**
 * 获取活动账户的财务计划
 */
export const getEventAccountPlans = async (accountId: string): Promise<FinancialPlanItem[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_PLANS),
      where('accountId', '==', accountId),
      orderBy('expectedDate', 'asc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as FinancialPlanItem));
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get event account plans', 'eventAccountPlanService', { error, accountId });
    throw error;
  }
};

/**
 * 添加财务计划项目
 */
export const addEventAccountPlan = async (
  accountId: string,
  planData: Omit<FinancialPlanItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  userId: string
): Promise<string> => {
  try {
    const now = new Date().toISOString();

    const data = cleanUndefinedValues({
      accountId,
      ...planData,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });

    const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_PLANS), data);

    globalSystemService.log('info', 'Event account plan added', 'eventAccountPlanService', {
      planId: docRef.id,
      accountId,
      type: planData.type,
      amount: planData.amount,
      userId,
    });

    return docRef.id;
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to add event account plan', 'eventAccountPlanService', { error });
    throw error;
  }
};

/**
 * 更新财务计划项目
 */
export const updateEventAccountPlan = async (
  planId: string,
  updates: Partial<FinancialPlanItem>,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_PLANS, planId);

    const data = cleanUndefinedValues({
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });

    await updateDoc(docRef, data);

    globalSystemService.log('info', 'Event account plan updated', 'eventAccountPlanService', {
      planId,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to update event account plan', 'eventAccountPlanService', { error });
    throw error;
  }
};

/**
 * 删除财务计划项目
 */
export const deleteEventAccountPlan = async (planId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_PLANS, planId);
    await deleteDoc(docRef);

    globalSystemService.log('info', 'Event account plan deleted', 'eventAccountPlanService', {
      planId,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to delete event account plan', 'eventAccountPlanService', { error });
    throw error;
  }
};

/**
 * 批量添加财务计划项目
 */
export const batchAddEventAccountPlans = async (
  accountId: string,
  plans: Array<Omit<FinancialPlanItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>,
  userId: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    plans.forEach(planData => {
      const docRef = doc(collection(db, GLOBAL_COLLECTIONS.EVENT_ACCOUNT_PLANS));
      const data = cleanUndefinedValues({
        accountId,
        ...planData,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      });
      batch.set(docRef, data);
    });

    await batch.commit();

    globalSystemService.log('info', 'Event account plans batch added', 'eventAccountPlanService', {
      accountId,
      count: plans.length,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to batch add event account plans', 'eventAccountPlanService', { error });
    throw error;
  }
};

/**
 * 获取财务计划统计
 */
export const getEventAccountPlanStats = async (accountId: string) => {
  try {
    const plans = await getEventAccountPlans(accountId);

    const incomeItems = plans.filter(p => p.type === 'income');
    const expenseItems = plans.filter(p => p.type === 'expense');

    const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0);

    // 按类别分组
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    incomeItems.forEach(item => {
      incomeByCategory[item.category] = (incomeByCategory[item.category] || 0) + item.amount;
    });

    expenseItems.forEach(item => {
      expenseByCategory[item.category] = (expenseByCategory[item.category] || 0) + item.amount;
    });

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      incomeCount: incomeItems.length,
      expenseCount: expenseItems.length,
      incomeByCategory,
      expenseByCategory,
    };
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get event account plan stats', 'eventAccountPlanService', { error });
    throw error;
  }
};

console.log('✅ Event Account Plan Service Loaded');

