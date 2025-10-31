/**
 * Financial Category Service
 * 财务类别管理服务(使用类别代码作为文档ID)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';

export interface FinancialCategory {
  value: string;              // 类别代码(作为文档ID，如 'TXINC-0001', 'TXEXP-0001')
  label: string;              // 类别名称(如 '门票收入', '场地费')
  type: 'income' | 'expense'; // 类型
  description?: string;       // 描述
  sortOrder: number;          // 排序
  status: 'active' | 'inactive'; // 状态
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

/**
 * 生成下一个类别代码
 */
export const generateNextCategoryCode = async (
  type: 'income' | 'expense'
): Promise<string> => {
  const prefix = type === 'income' ? 'TXINC' : 'TXEXP';
  
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.FINANCIAL_CATEGORIES),
      where('type', '==', type)
    );
    
    const snapshot = await getDocs(q);
    
    // 提取所有序号
    const existingNumbers = snapshot.docs
      .map(docSnap => {
        const match = docSnap.id.match(/-(\d{4})$/); // 匹配 TXINC-0001 的 0001
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);
    
    // 找到最大序号并加1
    const maxNumber = existingNumbers.length > 0 
      ? Math.max(...existingNumbers) 
      : 0;
    
    const nextNumber = maxNumber + 1;
    const sequence = String(nextNumber).padStart(4, '0');
    const code = `${prefix}-${sequence}`;
    
    globalSystemService.log('info', 'Generated category code', 'financialCategoryService', {
      type,
      code,
      existingCount: snapshot.size,
    });
    
    return code;
    
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to generate category code', 'financialCategoryService', { 
      error,
      type,
    });
    throw error;
  }
};

/**
 * 获取所有财务类别
 */
export const getAllFinancialCategories = async (): Promise<FinancialCategory[]> => {
  try {
    // 简单查询，避免需要复合索引
    const snapshot = await getDocs(
      collection(db, GLOBAL_COLLECTIONS.FINANCIAL_CATEGORIES)
    );

    // 在客户端排序
    const categories = snapshot.docs.map(docSnap => ({
      value: docSnap.id, // 文档ID即为value
      ...docSnap.data(),
    } as FinancialCategory));

    // 先按类型排序，再按sortOrder排序
    return categories.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'income' ? -1 : 1;
      }
      return a.sortOrder - b.sortOrder;
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get all financial categories', 'financialCategoryService', { 
      error 
    });
    return [];
  }
};

/**
 * 获取财务类别(带过滤)
 */
export const getFinancialCategories = async (
  type?: 'income' | 'expense',
  status?: 'active' | 'inactive'
): Promise<FinancialCategory[]> => {
  try {
    // 简单查询，在客户端过滤和排序
    const snapshot = await getDocs(
      collection(db, GLOBAL_COLLECTIONS.FINANCIAL_CATEGORIES)
    );
    
    let categories = snapshot.docs.map(docSnap => ({
      value: docSnap.id, // 文档ID即为value
      ...docSnap.data(),
    } as FinancialCategory));

    // 客户端过滤类型
    if (type) {
      categories = categories.filter(cat => cat.type === type);
    }

    // 客户端过滤状态
    if (status) {
      categories = categories.filter(cat => cat.status === status);
    }

    // 客户端排序
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get financial categories', 'financialCategoryService', { 
      error,
      type,
      status,
    });
    throw error;
  }
};

/**
 * 获取单个财务类别
 */
export const getFinancialCategory = async (id: string): Promise<FinancialCategory | null> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_CATEGORIES, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      value: docSnap.id, // 文档ID即为value
      ...docSnap.data(),
    } as FinancialCategory;
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get financial category', 'financialCategoryService', { 
      error,
      id,
    });
    throw error;
  }
};

/**
 * 创建财务类别(使用代码作为文档ID)
 */
export const createFinancialCategory = async (
  categoryData: Omit<FinancialCategory, 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<void> => {
  try {
    const docId = categoryData.value; // 使用 value 作为文档ID
    const docRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_CATEGORIES, docId);
    
    // 检查是否已存在
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      throw new Error(`类别代码 ${docId} 已存在`);
    }
    
    const now = new Date().toISOString();
    const data = cleanUndefinedValues({
      ...categoryData,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });

    await setDoc(docRef, data);

    globalSystemService.log('info', 'Financial category created', 'financialCategoryService', {
      categoryId: docId,
      type: categoryData.type,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to create financial category', 'financialCategoryService', { 
      error,
      categoryData,
      userId,
    });
    throw error;
  }
};

/**
 * 更新财务类别
 */
export const updateFinancialCategory = async (
  id: string,
  updates: Partial<FinancialCategory>,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_CATEGORIES, id);
    
    // 禁止修改 value 字段(因为它是文档ID)
    const { value, ...allowedUpdates } = updates;
    
    if (value && value !== id) {
      throw new Error('类别代码不可修改(它是文档ID)');
    }

    const now = new Date().toISOString();
    const data = cleanUndefinedValues({
      ...allowedUpdates,
      updatedAt: now,
      updatedBy: userId,
    });

    await updateDoc(docRef, data);

    globalSystemService.log('info', 'Financial category updated', 'financialCategoryService', {
      categoryId: id,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to update financial category', 'financialCategoryService', { 
      error,
      id,
      updates,
      userId,
    });
    throw error;
  }
};

/**
 * 删除财务类别
 */
export const deleteFinancialCategory = async (id: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_CATEGORIES, id);
    await deleteDoc(docRef);

    globalSystemService.log('warning', 'Financial category deleted', 'financialCategoryService', {
      categoryId: id,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to delete financial category', 'financialCategoryService', { 
      error,
      id,
      userId,
    });
    throw error;
  }
};

/**
 * 获取活跃的收入类别选项
 */
export const getActiveIncomeCategories = async (): Promise<Array<{ label: string; value: string }>> => {
  const categories = await getFinancialCategories('income', 'active');
  return categories.map(cat => ({
    label: cat.label,
    value: cat.value,
  }));
};

/**
 * 获取活跃的支出类别选项
 */
export const getActiveExpenseCategories = async (): Promise<Array<{ label: string; value: string }>> => {
  const categories = await getFinancialCategories('expense', 'active');
  return categories.map(cat => ({
    label: cat.label,
    value: cat.value,
  }));
};


