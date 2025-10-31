/**
 * Finance Event Service
 * 活动管理服务(用于活动财务分类)
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import type { FinanceEvent } from '../types';
import { cleanUndefinedValues } from '@/utils/dataHelpers';

/**
 * 获取所有活动
 */
export const getAllFinanceEvents = async (status?: string): Promise<FinanceEvent[]> => {
  try {
    let q = query(
      collection(db, GLOBAL_COLLECTIONS.FINANCE_EVENTS),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      q = query(
        collection(db, GLOBAL_COLLECTIONS.FINANCE_EVENTS),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as FinanceEvent));
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get finance events', 'financeEventService', { error });
    throw error;
  }
};

/**
 * 获取单个活动
 */
export const getFinanceEvent = async (eventId: string): Promise<FinanceEvent | null> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.FINANCE_EVENTS, eventId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as FinanceEvent;
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get finance event', 'financeEventService', { error });
    throw error;
  }
};

/**
 * 创建活动
 */
export const createFinanceEvent = async (
  eventData: Omit<FinanceEvent, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> => {
  try {
    const now = new Date().toISOString();

    const data = cleanUndefinedValues({
      ...eventData,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await addDoc(collection(db, GLOBAL_COLLECTIONS.FINANCE_EVENTS), data);

    globalSystemService.log('info', 'Finance event created', 'financeEventService', {
      eventId: docRef.id,
      eventName: eventData.eventName,
      userId,
    });

    return docRef.id;
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to create finance event', 'financeEventService', { error });
    throw error;
  }
};

/**
 * 更新活动
 */
export const updateFinanceEvent = async (
  eventId: string,
  updates: Partial<FinanceEvent>,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.FINANCE_EVENTS, eventId);

    const data = cleanUndefinedValues({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    await updateDoc(docRef, data);

    globalSystemService.log('info', 'Finance event updated', 'financeEventService', {
      eventId,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to update finance event', 'financeEventService', { error });
    throw error;
  }
};

/**
 * 删除活动
 */
export const deleteFinanceEvent = async (eventId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.FINANCE_EVENTS, eventId);
    await deleteDoc(docRef);

    globalSystemService.log('info', 'Finance event deleted', 'financeEventService', {
      eventId,
      userId,
    });
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to delete finance event', 'financeEventService', { error });
    throw error;
  }
};



