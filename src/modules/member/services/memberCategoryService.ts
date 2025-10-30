/**
 * Member Category Service
 * 会员分类服务
 * 
 * 管理会员分类(正式会员、准会员、荣誉会员、访问会员)
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
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type { MemberCategory } from '../types';

// ========== Collection Reference ==========
const getCategoriesRef = () => collection(db, GLOBAL_COLLECTIONS.MEMBER_CATEGORIES);

// ========== Helper Functions ==========

/**
 * Convert Firestore document to MemberCategory object
 */
const convertToCategory = (docId: string, data: any): MemberCategory => {
  return {
    id: docId,
    name: data.name,
    displayName: data.displayName || data.name,
    description: data.description ?? null,
    
    fees: {
      newMemberFee: data.fees?.newMemberFee || 0,
      renewalFee: data.fees?.renewalFee || 0,
    },
    
    requirements: {
      eventsRequired: data.requirements?.eventsRequired || 0,
      coursesRequired: data.requirements?.coursesRequired ?? null,
      rolesRequired: data.requirements?.rolesRequired ?? null,
      description: data.requirements?.description ?? null,
    },
    
    status: data.status || 'active',
    priority: data.priority || 0,
    color: data.color ?? null,
    icon: data.icon ?? null,
    
    createdAt: safeTimestampToISO(data.createdAt) || new Date().toISOString(),
    updatedAt: safeTimestampToISO(data.updatedAt) || new Date().toISOString(),
  };
};

// ========== CRUD Operations ==========

/**
 * Get all member categories
 * 获取所有会员分类
 */
export const getMemberCategories = async (): Promise<MemberCategory[]> => {
  try {
    const q = query(getCategoriesRef(), orderBy('priority', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => convertToCategory(doc.id, doc.data()));
  } catch (error) {
    console.error('Error fetching member categories:', error);
    throw new Error('获取会员分类失败');
  }
};

/**
 * Get category by ID
 * 根据ID获取分类
 */
export const getCategoryById = async (categoryId: string): Promise<MemberCategory | null> => {
  try {
    const categoryDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.MEMBER_CATEGORIES, categoryId));
    
    if (!categoryDoc.exists()) {
      return null;
    }
    
    return convertToCategory(categoryDoc.id, categoryDoc.data());
  } catch (error) {
    console.error('Error fetching category:', error);
    throw new Error('获取分类信息失败');
  }
};

/**
 * Create member category
 * 创建会员分类
 */
export const createCategory = async (
  data: Omit<MemberCategory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MemberCategory> => {
  try {
    const now = Timestamp.now();
    
    const categoryData = cleanUndefinedValues({
      name: data.name,
      displayName: data.displayName,
      description: data.description ?? null,
      fees: {
        newMemberFee: data.fees.newMemberFee,
        renewalFee: data.fees.renewalFee,
      },
      requirements: {
        eventsRequired: data.requirements.eventsRequired,
        coursesRequired: data.requirements.coursesRequired ?? null,
        rolesRequired: data.requirements.rolesRequired ?? null,
        description: data.requirements.description ?? null,
      },
      status: data.status,
      priority: data.priority,
      color: data.color ?? null,
      icon: data.icon ?? null,
      createdAt: now,
      updatedAt: now,
    });
    
    const docRef = await addDoc(getCategoriesRef(), categoryData);
    
    const created = await getCategoryById(docRef.id);
    if (!created) {
      throw new Error('创建分类后无法获取数据');
    }
    
    return created;
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('创建分类失败');
  }
};

/**
 * Update member category
 * 更新会员分类
 */
export const updateCategory = async (
  categoryId: string,
  data: Partial<Omit<MemberCategory, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<MemberCategory> => {
  try {
    const categoryRef = doc(db, GLOBAL_COLLECTIONS.MEMBER_CATEGORIES, categoryId);
    
    const categoryDoc = await getDoc(categoryRef);
    if (!categoryDoc.exists()) {
      throw new Error('分类不存在');
    }
    
    const updateData = cleanUndefinedValues({
      ...(data.displayName && { displayName: data.displayName }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.fees && { fees: data.fees }),
      ...(data.requirements && { requirements: data.requirements }),
      ...(data.status && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
      updatedAt: Timestamp.now(),
    });
    
    await updateDoc(categoryRef, updateData);
    
    const updated = await getCategoryById(categoryId);
    if (!updated) {
      throw new Error('更新分类后无法获取数据');
    }
    
    return updated;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error instanceof Error ? error : new Error('更新分类失败');
  }
};

/**
 * Delete member category
 * 删除会员分类
 */
export const deleteCategory = async (categoryId: string): Promise<void> => {
  try {
    const categoryRef = doc(db, GLOBAL_COLLECTIONS.MEMBER_CATEGORIES, categoryId);
    
    const categoryDoc = await getDoc(categoryRef);
    if (!categoryDoc.exists()) {
      throw new Error('分类不存在');
    }
    
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error instanceof Error ? error : new Error('删除分类失败');
  }
};

/**
 * Initialize default member categories
 * 初始化默认会员分类
 */
export const initializeDefaultCategories = async (): Promise<void> => {
  try {
    const existingCategories = await getMemberCategories();
    
    // Only initialize if no categories exist
    if (existingCategories.length > 0) {
      console.log('Member categories already exist, skipping initialization');
      return;
    }
    
    const defaultCategories: Omit<MemberCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Official Member',
        displayName: '正式会员',
        description: '完成所有要求的正式会员',
        fees: {
          newMemberFee: 480,
          renewalFee: 350,
        },
        requirements: {
          eventsRequired: 3,
          coursesRequired: 1,
          rolesRequired: 1,
          description: '需参加3个活动、1个课程并担任1个角色',
        },
        status: 'active',
        priority: 1,
        color: '#1890ff',
        icon: 'crown',
      },
      {
        name: 'Associate Member',
        displayName: '准会员',
        description: '新加入的准会员',
        fees: {
          newMemberFee: 250,
          renewalFee: 200,
        },
        requirements: {
          eventsRequired: 2,
          description: '需参加2个活动',
        },
        status: 'active',
        priority: 2,
        color: '#52c41a',
        icon: 'user',
      },
      {
        name: 'Honorary Member',
        displayName: '荣誉会员',
        description: '对组织有特殊贡献的荣誉会员',
        fees: {
          newMemberFee: 0,
          renewalFee: 0,
        },
        requirements: {
          eventsRequired: 0,
          description: '无要求',
        },
        status: 'active',
        priority: 3,
        color: '#faad14',
        icon: 'star',
      },
      {
        name: 'Visiting Member',
        displayName: '访问会员',
        description: '来自其他分会的访问会员',
        fees: {
          newMemberFee: 100,
          renewalFee: 100,
        },
        requirements: {
          eventsRequired: 0,
          description: '无要求',
        },
        status: 'active',
        priority: 4,
        color: '#722ed1',
        icon: 'team',
      },
    ];
    
    // Create all categories
    for (const category of defaultCategories) {
      await createCategory(category);
    }
    
    console.log('✅ Default member categories initialized');
  } catch (error) {
    console.error('Error initializing default categories:', error);
    throw new Error('初始化默认分类失败');
  }
};

console.log('✅ Member Category Service Loaded');

