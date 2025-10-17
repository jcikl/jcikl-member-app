/**
 * Budget Service
 * 预算服务
 * 
 * Handles budget management and allocation
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
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type {
  Budget,
  BudgetFormData,
  BudgetCategory,
  BudgetStatus,
  BudgetQueryParams,
} from '../types';
import type { PaginatedResponse } from '@/types';

/**
 * Create Budget
 */
export const createBudget = async (
  data: BudgetFormData,
  userId: string
): Promise<Budget> => {
  try {
    const startDate = data.startDate instanceof Date 
      ? data.startDate 
      : new Date(data.startDate);
    const endDate = data.endDate instanceof Date 
      ? data.endDate 
      : new Date(data.endDate);
    
    // Calculate totals
    const totalAllocated = data.categories.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0
    );
    
    const now = new Date().toISOString();
    
    const budget: Omit<Budget, 'id'> = {
      name: data.name,
      fiscalYear: data.fiscalYear,
      period: data.period,
      startDate: globalDateService.formatDate(startDate, 'api'),
      endDate: globalDateService.formatDate(endDate, 'api'),
      totalBudget: data.totalBudget,
      totalAllocated,
      totalSpent: 0,
      totalRemaining: data.totalBudget,
      categories: data.categories.map(cat => ({
        ...cat,
        spentAmount: 0,
        remainingAmount: cat.allocatedAmount,
        percentageUsed: 0,
      })),
      status: data.status,
      description: data.description ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    
    const cleanData = cleanUndefinedValues(budget);
    
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.BUDGETS),
      cleanData
    );
    
    globalSystemService.log(
      'info',
      'Budget created',
      'budgetService.createBudget',
      { budgetId: docRef.id, name: data.name, userId }
    );
    
    return {
      id: docRef.id,
      ...budget,
    } as Budget;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to create budget',
      'budgetService.createBudget',
      { error: error.message, userId }
    );
    throw error;
  }
};

/**
 * Update Budget
 */
export const updateBudget = async (
  budgetId: string,
  data: Partial<BudgetFormData>,
  userId: string
): Promise<void> => {
  try {
    const budgetRef = doc(db, GLOBAL_COLLECTIONS.BUDGETS, budgetId);
    const budgetDoc = await getDoc(budgetRef);
    
    if (!budgetDoc.exists()) {
      throw new Error('Budget not found');
    }
    
    const existingData = budgetDoc.data();
    
    const updates: Partial<Budget> = {
      updatedAt: new Date().toISOString(),
    };
    
    if (data.name !== undefined) updates.name = data.name;
    if (data.fiscalYear !== undefined) updates.fiscalYear = data.fiscalYear;
    if (data.period !== undefined) updates.period = data.period;
    
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
    
    if (data.totalBudget !== undefined) {
      updates.totalBudget = data.totalBudget;
      updates.totalRemaining = data.totalBudget - (existingData.totalSpent || 0);
    }
    
    if (data.categories !== undefined) {
      const totalAllocated = data.categories.reduce(
        (sum, cat) => sum + cat.allocatedAmount,
        0
      );
      updates.totalAllocated = totalAllocated;
      updates.categories = data.categories.map(cat => ({
        ...cat,
        spentAmount: cat.spentAmount || 0,
        remainingAmount: cat.allocatedAmount - (cat.spentAmount || 0),
        percentageUsed: cat.allocatedAmount > 0 
          ? ((cat.spentAmount || 0) / cat.allocatedAmount) * 100 
          : 0,
      }));
    }
    
    if (data.status !== undefined) updates.status = data.status;
    if (data.description !== undefined) updates.description = data.description ?? null;
    if (data.notes !== undefined) updates.notes = data.notes ?? null;
    
    const cleanData = cleanUndefinedValues(updates);
    await updateDoc(budgetRef, cleanData);
    
    globalSystemService.log(
      'info',
      'Budget updated',
      'budgetService.updateBudget',
      { budgetId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to update budget',
      'budgetService.updateBudget',
      { error: error.message, budgetId, userId }
    );
    throw error;
  }
};

/**
 * Delete Budget
 */
export const deleteBudget = async (
  budgetId: string,
  userId: string
): Promise<void> => {
  try {
    const budgetRef = doc(db, GLOBAL_COLLECTIONS.BUDGETS, budgetId);
    await deleteDoc(budgetRef);
    
    globalSystemService.log(
      'info',
      'Budget deleted',
      'budgetService.deleteBudget',
      { budgetId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to delete budget',
      'budgetService.deleteBudget',
      { error: error.message, budgetId, userId }
    );
    throw error;
  }
};

/**
 * Get Budget by ID
 */
export const getBudgetById = async (
  budgetId: string
): Promise<Budget | null> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.BUDGETS, budgetId);
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
      approvedAt: data.approvedAt ? safeTimestampToISO(data.approvedAt) : undefined,
    } as Budget;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get budget',
      'budgetService.getBudgetById',
      { error: error.message, budgetId }
    );
    throw error;
  }
};

/**
 * Get Budgets (with pagination and filters)
 */
export const getBudgets = async (
  params: BudgetQueryParams = {}
): Promise<PaginatedResponse<Budget>> => {
  try {
    const {
      page = 1,
      limit: pageLimit = 20,
      search,
      fiscalYear,
      status,
      period,
      sortBy = 'startDate',
      sortOrder = 'desc',
    } = params;
    
    const constraints: QueryConstraint[] = [];
    
    // Filters
    if (fiscalYear) {
      constraints.push(where('fiscalYear', '==', fiscalYear));
    }
    if (status) {
      constraints.push(where('status', '==', status));
    }
    if (period) {
      constraints.push(where('period', '==', period));
    }
    
    // Sorting
    constraints.push(orderBy(sortBy, sortOrder));
    
    // Pagination
    constraints.push(limit(pageLimit * 2)); // Get more for client-side filtering
    
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.BUDGETS),
      ...constraints
    );
    
    const snapshot = await getDocs(q);
    
    let budgets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: safeTimestampToISO(doc.data().createdAt),
      updatedAt: safeTimestampToISO(doc.data().updatedAt),
      approvedAt: doc.data().approvedAt ? safeTimestampToISO(doc.data().approvedAt) : undefined,
    } as Budget));
    
    // Client-side search filter
    if (search) {
      const searchLower = search.toLowerCase();
      budgets = budgets.filter(b =>
        b.name.toLowerCase().includes(searchLower) ||
        (b.description && b.description.toLowerCase().includes(searchLower))
      );
    }
    
    const total = budgets.length;
    const startIndex = (page - 1) * pageLimit;
    const endIndex = startIndex + pageLimit;
    const paginatedData = budgets.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      total,
      page,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit),
    };
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get budgets',
      'budgetService.getBudgets',
      { error: error.message, params }
    );
    throw error;
  }
};

/**
 * Get Budget by Fiscal Year
 */
export const getBudgetByFiscalYear = async (
  fiscalYear: string
): Promise<Budget | null> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.BUDGETS),
      where('fiscalYear', '==', fiscalYear),
      where('status', '==', 'active'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
      createdAt: safeTimestampToISO(data.createdAt),
      updatedAt: safeTimestampToISO(data.updatedAt),
      approvedAt: data.approvedAt ? safeTimestampToISO(data.approvedAt) : undefined,
    } as Budget;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get budget by fiscal year',
      'budgetService.getBudgetByFiscalYear',
      { error: error.message, fiscalYear }
    );
    throw error;
  }
};

/**
 * Update Budget Spending
 * Called when a transaction is created/updated
 */
export const updateBudgetSpending = async (
  budgetId: string,
  categoryCode: string,
  amount: number
): Promise<void> => {
  try {
    const budgetRef = doc(db, GLOBAL_COLLECTIONS.BUDGETS, budgetId);
    const budgetDoc = await getDoc(budgetRef);
    
    if (!budgetDoc.exists()) {
      throw new Error('Budget not found');
    }
    
    const budgetData = budgetDoc.data();
    const categories = budgetData.categories || [];
    
    // Find and update the category
    const updatedCategories = categories.map((cat: BudgetCategory) => {
      if (cat.categoryCode === categoryCode) {
        const newSpent = (cat.spentAmount || 0) + amount;
        const remaining = cat.allocatedAmount - newSpent;
        const percentage = cat.allocatedAmount > 0 
          ? (newSpent / cat.allocatedAmount) * 100 
          : 0;
        
        return {
          ...cat,
          spentAmount: newSpent,
          remainingAmount: remaining,
          percentageUsed: percentage,
        };
      }
      return cat;
    });
    
    // Recalculate totals
    const totalSpent = updatedCategories.reduce(
      (sum: number, cat: BudgetCategory) => sum + (cat.spentAmount || 0),
      0
    );
    const totalRemaining = budgetData.totalBudget - totalSpent;
    
    await updateDoc(budgetRef, {
      categories: updatedCategories,
      totalSpent,
      totalRemaining,
      updatedAt: new Date().toISOString(),
    });
    
    globalSystemService.log(
      'info',
      'Budget spending updated',
      'budgetService.updateBudgetSpending',
      { budgetId, categoryCode, amount }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to update budget spending',
      'budgetService.updateBudgetSpending',
      { error: error.message, budgetId, categoryCode, amount }
    );
    throw error;
  }
};

/**
 * Approve Budget
 */
export const approveBudget = async (
  budgetId: string,
  userId: string
): Promise<void> => {
  try {
    const budgetRef = doc(db, GLOBAL_COLLECTIONS.BUDGETS, budgetId);
    
    await updateDoc(budgetRef, {
      status: 'active' as BudgetStatus,
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    globalSystemService.log(
      'info',
      'Budget approved',
      'budgetService.approveBudget',
      { budgetId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to approve budget',
      'budgetService.approveBudget',
      { error: error.message, budgetId, userId }
    );
    throw error;
  }
};

/**
 * Close Budget
 */
export const closeBudget = async (
  budgetId: string,
  userId: string
): Promise<void> => {
  try {
    const budgetRef = doc(db, GLOBAL_COLLECTIONS.BUDGETS, budgetId);
    
    await updateDoc(budgetRef, {
      status: 'closed' as BudgetStatus,
      updatedAt: new Date().toISOString(),
    });
    
    globalSystemService.log(
      'info',
      'Budget closed',
      'budgetService.closeBudget',
      { budgetId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to close budget',
      'budgetService.closeBudget',
      { error: error.message, budgetId, userId }
    );
    throw error;
  }
};

/**
 * Get Budget Summary
 */
export const getBudgetSummary = async (
  fiscalYear?: string
): Promise<{
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  utilizationRate: number;
}> => {
  try {
    // Simple query to avoid index issues
    const q = query(collection(db, GLOBAL_COLLECTIONS.BUDGETS));
    
    const snapshot = await getDocs(q);
    
    let totalBudget = 0;
    let totalAllocated = 0;
    let totalSpent = 0;
    
    // Filter in memory
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Only process active budgets
      if (data.status !== 'active') return;
      
      // Filter by fiscal year if provided
      if (fiscalYear && data.fiscalYear !== fiscalYear) return;
      
      totalBudget += data.totalBudget || 0;
      totalAllocated += data.totalAllocated || 0;
      totalSpent += data.totalSpent || 0;
    });
    
    const totalRemaining = totalBudget - totalSpent;
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    return {
      totalBudget,
      totalAllocated,
      totalSpent,
      totalRemaining,
      utilizationRate,
    };
  } catch (error: any) {
    // Log error but return empty summary instead of throwing
    globalSystemService.log(
      'warning',
      'Failed to get budget summary, returning empty data',
      'budgetService.getBudgetSummary',
      { error: error.message, fiscalYear }
    );
    
    // Return empty summary instead of throwing
    return {
      totalBudget: 0,
      totalAllocated: 0,
      totalSpent: 0,
      totalRemaining: 0,
      utilizationRate: 0,
    };
  }
};

console.log('✅ Budget Service Loaded');

