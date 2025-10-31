/**
 * Fiscal Year Service
 * 财年服务
 * 
 * Handles fiscal year management
 * Fiscal Year: October 1 - September 30 (next year)
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
  limit,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type {
  FiscalYear,
  FiscalYearFormData,
  FiscalYearStatus,
} from '../types';

/**
 * Create Fiscal Year
 */
export const createFiscalYear = async (
  data: FiscalYearFormData,
  userId: string
): Promise<FiscalYear> => {
  try {
    const startDate = data.startDate instanceof Date 
      ? data.startDate 
      : new Date(data.startDate);
    const endDate = data.endDate instanceof Date 
      ? data.endDate 
      : new Date(data.endDate);
    
    // Validate dates
    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }
    
    // Check for overlapping fiscal years
    const overlapping = await checkOverlappingFiscalYears(
      globalDateService.formatDate(startDate, 'api'),
      globalDateService.formatDate(endDate, 'api')
    );
    
    if (overlapping) {
      throw new Error('Fiscal year dates overlap with existing fiscal year');
    }
    
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await unsetDefaultFiscalYear();
    }
    
    const now = new Date().toISOString();
    
    const fiscalYear: Omit<FiscalYear, 'id'> = {
      name: data.name,
      year: data.year,
      startDate: globalDateService.formatDate(startDate, 'api'),
      endDate: globalDateService.formatDate(endDate, 'api'),
      status: data.status,
      isDefault: data.isDefault,
      description: data.description ?? undefined,
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      notes: data.notes ?? undefined,
      createdAt: now,
      updatedAt: now,
    };
    
    const cleanData = cleanUndefinedValues(fiscalYear);
    
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.FISCAL_YEARS),
      cleanData
    );
    
    globalSystemService.log(
      'info',
      'Fiscal year created',
      'fiscalYearService.createFiscalYear',
      { fiscalYearId: docRef.id, name: data.name, userId }
    );
    
    return {
      id: docRef.id,
      ...fiscalYear,
    } as FiscalYear;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to create fiscal year',
      'fiscalYearService.createFiscalYear',
      { error: error.message, userId }
    );
    throw error;
  }
};

/**
 * Update Fiscal Year
 */
export const updateFiscalYear = async (
  fiscalYearId: string,
  data: Partial<FiscalYearFormData>,
  userId: string
): Promise<void> => {
  try {
    const fiscalYearRef = doc(db, GLOBAL_COLLECTIONS.FISCAL_YEARS, fiscalYearId);
    
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await unsetDefaultFiscalYear();
    }
    
    const updates: Partial<FiscalYear> = {
      updatedAt: new Date().toISOString(),
    };
    
    if (data.name !== undefined) updates.name = data.name;
    if (data.year !== undefined) updates.year = data.year;
    
    if (data.startDate !== undefined) {
      const startDate = data.startDate instanceof Date 
        ? data.startDate 
        : new Date(data.startDate);
      updates.startDate = globalDateService.formatDate(startDate, 'api');
    }
    
    if (data.endDate !== undefined) {
      const endDate = data.endDate instanceof Date 
        ? data.endDate 
        : new Date(data.endDate);
      updates.endDate = globalDateService.formatDate(endDate, 'api');
    }
    
    if (data.status !== undefined) updates.status = data.status;
    if (data.isDefault !== undefined) updates.isDefault = data.isDefault;
    if (data.description !== undefined) updates.description = data.description ?? null;
    if (data.notes !== undefined) updates.notes = data.notes ?? null;
    
    const cleanData = cleanUndefinedValues(updates);
    await updateDoc(fiscalYearRef, cleanData);
    
    globalSystemService.log(
      'info',
      'Fiscal year updated',
      'fiscalYearService.updateFiscalYear',
      { fiscalYearId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to update fiscal year',
      'fiscalYearService.updateFiscalYear',
      { error: error.message, fiscalYearId, userId }
    );
    throw error;
  }
};

/**
 * Delete Fiscal Year
 */
export const deleteFiscalYear = async (
  fiscalYearId: string,
  userId: string
): Promise<void> => {
  try {
    // Check if fiscal year has transactions
    const fiscalYearDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.FISCAL_YEARS, fiscalYearId));
    
    if (!fiscalYearDoc.exists()) {
      throw new Error('Fiscal year not found');
    }
    
    const fiscalYearName = fiscalYearDoc.data().name;
    
    const transactionsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('fiscalYear', '==', fiscalYearName),
      limit(1)
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    
    if (!transactionsSnapshot.empty) {
      throw new Error('Cannot delete fiscal year with existing transactions');
    }
    
    const fiscalYearRef = doc(db, GLOBAL_COLLECTIONS.FISCAL_YEARS, fiscalYearId);
    await deleteDoc(fiscalYearRef);
    
    globalSystemService.log(
      'info',
      'Fiscal year deleted',
      'fiscalYearService.deleteFiscalYear',
      { fiscalYearId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to delete fiscal year',
      'fiscalYearService.deleteFiscalYear',
      { error: error.message, fiscalYearId, userId }
    );
    throw error;
  }
};

/**
 * Get Fiscal Year by ID
 */
export const getFiscalYearById = async (
  fiscalYearId: string
): Promise<FiscalYear | null> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.FISCAL_YEARS, fiscalYearId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: safeTimestampToISO(data.createdAt),
      updatedAt: safeTimestampToISO(data.updatedAt),
      closedAt: data.closedAt ? safeTimestampToISO(data.closedAt) : undefined,
    } as FiscalYear;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get fiscal year',
      'fiscalYearService.getFiscalYearById',
      { error: error.message, fiscalYearId }
    );
    throw error;
  }
};

/**
 * Get All Fiscal Years
 */
export const getAllFiscalYears = async (
  status?: FiscalYearStatus
): Promise<FiscalYear[]> => {
  try {
    // Simple query without complex constraints to avoid index requirements
    const q = query(collection(db, GLOBAL_COLLECTIONS.FISCAL_YEARS));
    
    const snapshot = await getDocs(q);
    
    let fiscalYears = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: safeTimestampToISO(doc.data().createdAt),
      updatedAt: safeTimestampToISO(doc.data().updatedAt),
      closedAt: doc.data().closedAt ? safeTimestampToISO(doc.data().closedAt) : undefined,
    } as FiscalYear));
    
    // Filter by status in memory if needed
    if (status) {
      fiscalYears = fiscalYears.filter(fy => fy.status === status);
    }
    
    // Sort by year descending
    fiscalYears.sort((a, b) => b.year - a.year);
    
    return fiscalYears;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get fiscal years',
      'fiscalYearService.getAllFiscalYears',
      { error: error.message, status }
    );
    throw error;
  }
};

/**
 * Get Current Fiscal Year
 */
export const getCurrentFiscalYear = async (): Promise<FiscalYear | null> => {
  try {
    // Get all fiscal years and filter in memory to avoid complex index requirements
    const q = query(collection(db, GLOBAL_COLLECTIONS.FISCAL_YEARS));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const fiscalYears = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: safeTimestampToISO(doc.data().createdAt),
      updatedAt: safeTimestampToISO(doc.data().updatedAt),
      closedAt: doc.data().closedAt ? safeTimestampToISO(doc.data().closedAt) : undefined,
    } as FiscalYear));
    
    // First try to find default active fiscal year
    const defaultFY = fiscalYears.find(fy => fy.isDefault && fy.status === 'active');
    if (defaultFY) {
      return defaultFY;
    }
    
    // If no default, find active fiscal year that contains current date
    const now = new Date();
    const currentFY = fiscalYears.find(fy => {
      if (fy.status !== 'active') return false;
      const start = new Date(fy.startDate);
      const end = new Date(fy.endDate);
      return now >= start && now <= end;
    });
    
    if (currentFY) {
      return currentFY;
    }
    
    // If still no match, return the most recent active fiscal year
    const activeFYs = fiscalYears.filter(fy => fy.status === 'active');
    if (activeFYs.length > 0) {
      activeFYs.sort((a, b) => b.year - a.year);
      return activeFYs[0];
    }
    
    return null;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get current fiscal year',
      'fiscalYearService.getCurrentFiscalYear',
      { error: error.message }
    );
    throw error;
  }
};

/**
 * Close Fiscal Year
 */
export const closeFiscalYear = async (
  fiscalYearId: string,
  userId: string
): Promise<void> => {
  try {
    const fiscalYearRef = doc(db, GLOBAL_COLLECTIONS.FISCAL_YEARS, fiscalYearId);
    
    // Calculate final totals from transactions
    const fiscalYearDoc = await getDoc(fiscalYearRef);
    if (!fiscalYearDoc.exists()) {
      throw new Error('Fiscal year not found');
    }
    
    const fiscalYearName = fiscalYearDoc.data().name;
    
    // Get transaction statistics
    const transactionsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('fiscalYear', '==', fiscalYearName),
      where('status', '==', 'completed')
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
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
    });
    
    const netIncome = totalIncome - totalExpense;
    
    await updateDoc(fiscalYearRef, {
      status: 'closed' as FiscalYearStatus,
      totalIncome,
      totalExpense,
      netIncome,
      closedAt: new Date().toISOString(),
      closedBy: userId,
      updatedAt: new Date().toISOString(),
    });
    
    globalSystemService.log(
      'info',
      'Fiscal year closed',
      'fiscalYearService.closeFiscalYear',
      { fiscalYearId, totalIncome, totalExpense, netIncome, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to close fiscal year',
      'fiscalYearService.closeFiscalYear',
      { error: error.message, fiscalYearId, userId }
    );
    throw error;
  }
};

/**
 * Reopen Fiscal Year
 */
export const reopenFiscalYear = async (
  fiscalYearId: string,
  userId: string
): Promise<void> => {
  try {
    const fiscalYearRef = doc(db, GLOBAL_COLLECTIONS.FISCAL_YEARS, fiscalYearId);
    
    await updateDoc(fiscalYearRef, {
      status: 'active' as FiscalYearStatus,
      closedAt: null,
      closedBy: null,
      updatedAt: new Date().toISOString(),
    });
    
    globalSystemService.log(
      'info',
      'Fiscal year reopened',
      'fiscalYearService.reopenFiscalYear',
      { fiscalYearId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to reopen fiscal year',
      'fiscalYearService.reopenFiscalYear',
      { error: error.message, fiscalYearId, userId }
    );
    throw error;
  }
};

/**
 * Check for Overlapping Fiscal Years
 */
const checkOverlappingFiscalYears = async (
  startDate: string,
  endDate: string
): Promise<boolean> => {
  try {
    // Get all fiscal years (without complex query to avoid index requirement)
    const q = query(collection(db, GLOBAL_COLLECTIONS.FISCAL_YEARS));
    
    const snapshot = await getDocs(q);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Skip closed and archived fiscal years
      if (data.status === 'closed' || data.status === 'archived') {
        continue;
      }
      
      const existingStart = new Date(data.startDate);
      const existingEnd = new Date(data.endDate);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      
      // Check if dates overlap
      if (newStart <= existingEnd && newEnd >= existingStart) {
        return true;
      }
    }
    
    return false;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to check overlapping fiscal years',
      'fiscalYearService.checkOverlappingFiscalYears',
      { error: error.message }
    );
    throw error;
  }
};

/**
 * Unset Default Fiscal Year
 */
const unsetDefaultFiscalYear = async (): Promise<void> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.FISCAL_YEARS),
      where('isDefault', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        isDefault: false,
        updatedAt: new Date().toISOString(),
      })
    );
    
    await Promise.all(updatePromises);
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to unset default fiscal year',
      'fiscalYearService.unsetDefaultFiscalYear',
      { error: error.message }
    );
    throw error;
  }
};

/**
 * Get Fiscal Year from Date
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
 * Generate Fiscal Year Dates
 * Returns start and end dates for a given fiscal year
 */
export const generateFiscalYearDates = (year: number): { start: Date; end: Date } => {
  const start = new Date(year, 9, 1); // October 1
  const end = new Date(year + 1, 8, 30); // September 30 (next year)
  
  return { start, end };
};



