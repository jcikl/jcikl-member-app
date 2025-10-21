/**
 * Transaction Purpose Service
 * 交易用途管理服务（日常账户二次分类）
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

export interface TransactionPurpose {
  id: string;                     // 文档ID（自动生成）
  value: string;                  // 用途代码/名称（用于txAccount字段）
  label: string;                  // 显示名称
  category: 'general-accounts';   // 类别（固定为日常账户）
  description?: string;           // 描述
  sortOrder: number;              // 排序
  status: 'active' | 'inactive';  // 状态
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

/**
 * 生成下一个交易用途代码
 * 格式: TXGA-0001, TXGA-0002, ...
 */
export const generateNextPurposeCode = async (): Promise<string> => {
  const prefix = 'TXGA'; // Transaction General Accounts
  
  try {
    const snapshot = await getDocs(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTION_PURPOSES)
    );
    
    // 提取所有序号
    const existingNumbers = snapshot.docs
      .map(docSnap => {
        const value = docSnap.data().value as string;
        const match = value.match(/^TXGA-(\d{4})$/); // 匹配 TXGA-0001 的 0001
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
    
    globalSystemService.log('info', 'Generated purpose code', 'transactionPurposeService', {
      code,
      existingCount: snapshot.size,
    });
    
    return code;
    
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to generate purpose code', 'transactionPurposeService', { 
      error,
    });
    throw error;
  }
};

/**
 * 获取所有交易用途
 */
export const getAllTransactionPurposes = async (): Promise<TransactionPurpose[]> => {
  try {
    const snapshot = await getDocs(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTION_PURPOSES)
    );

    const purposes = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as TransactionPurpose));

    // 按sortOrder排序
    return purposes.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get all transaction purposes', 'transactionPurposeService', { 
      error 
    });
    return [];
  }
};

/**
 * 获取交易用途（带过滤）
 */
export const getTransactionPurposes = async (
  status?: 'active' | 'inactive'
): Promise<TransactionPurpose[]> => {
  try {
    let purposes: TransactionPurpose[];
    
    if (status) {
      const q = query(
        collection(db, GLOBAL_COLLECTIONS.TRANSACTION_PURPOSES),
        where('status', '==', status)
      );
      const snapshot = await getDocs(q);
      purposes = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as TransactionPurpose));
    } else {
      purposes = await getAllTransactionPurposes();
    }

    // 按sortOrder排序
    return purposes.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get transaction purposes', 'transactionPurposeService', { 
      error,
      status,
    });
    throw error;
  }
};

/**
 * 获取单个交易用途
 */
export const getTransactionPurpose = async (id: string): Promise<TransactionPurpose | null> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTION_PURPOSES, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as TransactionPurpose;
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get transaction purpose', 'transactionPurposeService', { 
      error,
      id,
    });
    throw error;
  }
};

/**
 * 创建交易用途
 */
export const createTransactionPurpose = async (
  purposeData: Omit<TransactionPurpose, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  userId: string
): Promise<string> => {
  try {
    // 检查value是否已存在
    const existingPurposes = await getAllTransactionPurposes();
    const duplicate = existingPurposes.find(p => p.value === purposeData.value);
    
    if (duplicate) {
      throw new Error(`用途代码 "${purposeData.value}" 已存在`);
    }
    
    const now = new Date().toISOString();
    const data = cleanUndefinedValues({
      ...purposeData,
      category: 'general-accounts' as const, // 固定为日常账户
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });

    // 使用自动生成的ID
    const collectionRef = collection(db, GLOBAL_COLLECTIONS.TRANSACTION_PURPOSES);
    const docRef = doc(collectionRef);
    await setDoc(docRef, data);

    globalSystemService.log('info', 'Transaction purpose created', 'transactionPurposeService', {
      purposeId: docRef.id,
      value: purposeData.value,
      userId,
    });
    
    return docRef.id;
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to create transaction purpose', 'transactionPurposeService', { 
      error,
      purposeData,
      userId,
    });
    throw error;
  }
};

/**
 * 更新交易用途
 */
export const updateTransactionPurpose = async (
  id: string,
  updates: Partial<TransactionPurpose>,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTION_PURPOSES, id);
    
    // 如果更新value，检查是否重复
    if (updates.value) {
      const existingPurposes = await getAllTransactionPurposes();
      const duplicate = existingPurposes.find(p => p.value === updates.value && p.id !== id);
      
      if (duplicate) {
        throw new Error(`用途代码 "${updates.value}" 已存在`);
      }
    }
    
    const { id: _, category, createdAt, createdBy, ...allowedUpdates } = updates;

    const now = new Date().toISOString();
    const data = cleanUndefinedValues({
      ...allowedUpdates,
      updatedAt: now,
      updatedBy: userId,
    });

    await updateDoc(docRef, data);

    globalSystemService.log('info', 'Transaction purpose updated', 'transactionPurposeService', {
      purposeId: id,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to update transaction purpose', 'transactionPurposeService', { 
      error,
      id,
      updates,
      userId,
    });
    throw error;
  }
};

/**
 * 删除交易用途
 */
export const deleteTransactionPurpose = async (id: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTION_PURPOSES, id);
    await deleteDoc(docRef);

    globalSystemService.log('warning', 'Transaction purpose deleted', 'transactionPurposeService', {
      purposeId: id,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to delete transaction purpose', 'transactionPurposeService', { 
      error,
      id,
      userId,
    });
    throw error;
  }
};

/**
 * 获取活跃的交易用途选项
 */
export const getActiveTransactionPurposes = async (): Promise<Array<{ label: string; value: string }>> => {
  const purposes = await getTransactionPurposes('active');
  return purposes.map(purpose => ({
    label: purpose.label,
    value: purpose.value,
  }));
};

console.log('✅ Transaction Purpose Service Loaded');

