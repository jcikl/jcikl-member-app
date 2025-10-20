/**
 * Member Service
 * 会员服务层
 * 
 * ⚠️ CRITICAL RULES:
 * 1. ALWAYS use GLOBAL_COLLECTIONS.MEMBERS (never hardcode)
 * 2. ALWAYS clean undefined values before Firebase writes
 * 3. ALWAYS convert Firestore Timestamps to ISO strings
 * 4. ALWAYS check permissions before operations
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
  startAfter,
  Query,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import dayjs from 'dayjs';
import { GLOBAL_COLLECTIONS as GC } from '@/config/globalCollections';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import { handleFirebaseError, retryWithBackoff } from '@/services/errorHandlerService';
import type { 
  Member, 
  MemberFormData, 
  MemberSearchParams, 
  MemberStats 
} from '../types';
import type { PaginatedResponse, PaginationParams } from '@/types';

// ========== Collection Reference ==========
const getMembersRef = () => collection(db, GLOBAL_COLLECTIONS.MEMBERS);

// ========== Helper Functions ==========

/**
 * Convert Firestore document to Member object
 * 转换 Firestore 文档为会员对象
 */
const convertToMember = (docId: string, data: DocumentData): Member => {
  return {
    id: docId,
    email: data.email || '',
    name: data.name || '',
    phone: data.phone || '',
    memberId: data.memberId || '',
    status: data.status || 'pending',
    level: data.level || 'bronze',
    accountType: data.accountType ?? null,
    category: data.category ?? null,
    
    // Organization
    worldRegion: data.worldRegion ?? null,
    country: data.country ?? null,
    countryRegion: data.countryRegion ?? null,
    chapter: data.chapter ?? null,
    chapterId: data.chapterId ?? null,
    
    // Profile
    profile: data.profile || {},
    
    // Dates
    joinDate: safeTimestampToISO(data.joinDate),
    renewalDate: data.renewalDate ? safeTimestampToISO(data.renewalDate) : undefined,
    expiryDate: data.expiryDate ? safeTimestampToISO(data.expiryDate) : undefined,
    
    // Timestamps
    createdAt: safeTimestampToISO(data.createdAt),
    updatedAt: safeTimestampToISO(data.updatedAt),
    createdBy: data.createdBy ?? null,
    updatedBy: data.updatedBy ?? null,
  };
};

/**
 * Build query based on search parameters
 * 根据搜索参数构建查询
 */
const buildQuery = (params: MemberSearchParams): Query<DocumentData> => {
  let q: Query<DocumentData> = getMembersRef();
  
  // Status filter
  if (params.status) {
    q = query(q, where('status', '==', params.status));
  }
  
  // Category filter
  if (params.category) {
    q = query(q, where('category', '==', params.category));
  }
  
  // Level filter
  if (params.level) {
    q = query(q, where('level', '==', params.level));
  }
  
  // Chapter filter
  if (params.chapter) {
    q = query(q, where('chapter', '==', params.chapter));
  }
  
  // New this month filter (will be handled client-side)
  // This requires date comparison which is complex in Firestore
  
  // Expiring this month filter (will be handled client-side)
  // This requires date comparison which is complex in Firestore
  
  // Default ordering by creation date
  q = query(q, orderBy('createdAt', 'desc'));
  
  return q;
};

// ========== CRUD Operations ==========

/**
 * Get member by ID with retry mechanism
 * 根据ID获取会员（带重试机制）
 */
export const getMemberById = async (memberId: string): Promise<Member | null> => {
  try {
    const memberDoc = await retryWithBackoff(
      () => getDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId))
    );
    
    if (!memberDoc.exists()) {
      return null;
    }
    
    return convertToMember(memberDoc.id, memberDoc.data());
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '获取会员信息失败',
      showNotification: false,
    });
    throw error;
  }
};

/**
 * Get all members with pagination and filters
 * 获取所有会员（分页和过滤）
 */
export const getMembers = async (
  params: PaginationParams & MemberSearchParams
): Promise<PaginatedResponse<Member>> => {
  try {
    const { page = 1, limit: pageLimit = 20, search, ...searchParams } = params;
    
    // Step 1: Get total count for pagination calculation
    // 第一步：获取总数用于分页计算
    const countQuery = buildQuery(searchParams);
    const countSnapshot = await getDocs(countQuery);
    const totalCount = countSnapshot.size;
    
    // Step 2: If no search text, use server-side pagination
    // 第二步：如果没有搜索文本，使用服务端分页
    if (!search || !search.trim()) {
      // Calculate pagination offset
      const offset = (page - 1) * pageLimit;
      
      // Build query with pagination
      let q = buildQuery(searchParams);
      q = query(q, limit(pageLimit));
      
      // Apply offset using startAfter (if page > 1)
      if (offset > 0) {
        const offsetSnapshot = await getDocs(
          query(buildQuery(searchParams), limit(offset))
        );
        if (offsetSnapshot.docs.length > 0) {
          q = query(q, startAfter(offsetSnapshot.docs[offsetSnapshot.docs.length - 1]));
        }
      }
      
      // Execute paginated query
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
      
      // Apply client-side filters that can't be done server-side
      let filteredMembers = members;
      
      // New this month filter
      if (searchParams.newThisMonth) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        filteredMembers = filteredMembers.filter(member => {
          const joinDate = new Date(member.joinDate);
          return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
        });
      }
      
      // Expiring this month filter
      if (searchParams.expiringThisMonth) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        filteredMembers = filteredMembers.filter(member => {
          if (!member.expiryDate) return false;
          const expiryDate = new Date(member.expiryDate);
          return expiryDate.getMonth() === currentMonth && expiryDate.getFullYear() === currentYear;
        });
      }
      
      const totalPages = Math.ceil(totalCount / pageLimit);
      
      return {
        data: filteredMembers,
        total: totalCount,
        page,
        limit: pageLimit,
        totalPages,
      };
    }
    
    // Step 3: If has search text, get all matching records and paginate client-side
    // 第三步：如果有搜索文本，获取所有匹配记录并在客户端分页
    const searchQuery = buildQuery(searchParams);
    const searchSnapshot = await getDocs(searchQuery);
    
    // Convert all documents to Member objects
    let allMembers = searchSnapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
    
    // Apply search filter
    const searchLower = search.toLowerCase();
    allMembers = allMembers.filter(member => 
      member.name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.phone.includes(search) ||
      (member.memberId && member.memberId.toLowerCase().includes(searchLower))
    );
    
    // Apply additional client-side filters
    if (searchParams.newThisMonth) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      allMembers = allMembers.filter(member => {
        const joinDate = new Date(member.joinDate);
        return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
      });
    }
    
    if (searchParams.expiringThisMonth) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      allMembers = allMembers.filter(member => {
        if (!member.expiryDate) return false;
        const expiryDate = new Date(member.expiryDate);
        return expiryDate.getMonth() === currentMonth && expiryDate.getFullYear() === currentYear;
      });
    }
    
    // Sort by creation date (newest first)
    allMembers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply client-side pagination
    const startIndex = (page - 1) * pageLimit;
    const endIndex = startIndex + pageLimit;
    const paginatedMembers = allMembers.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(allMembers.length / pageLimit);
    
    return {
      data: paginatedMembers,
      total: allMembers.length,
      page,
      limit: pageLimit,
      totalPages,
    };
  } catch (error) {
    console.error('Error fetching members:', error);
    throw new Error('获取会员列表失败');
  }
};

/**
 * Create new member
 * 创建新会员
 */
export const createMember = async (
  data: MemberFormData,
  createdBy: string
): Promise<Member> => {
  try {
    const now = Timestamp.now();
    
    // Prepare member data
    const memberData = cleanUndefinedValues({
      // Basic info
      email: data.email,
      name: data.name,
      phone: data.phone,
      memberId: data.memberId || `M${Date.now()}`, // Auto-generate if not provided
      
      // Status & Category
      status: data.status || 'pending',
      level: data.level || 'bronze',
      category: 'JCI Friend',
      accountType: null,
      
      // Organization
      chapter: data.chapter ?? null,
      chapterId: data.chapterId ?? null,
      worldRegion: null,
      country: null,
      countryRegion: null,
      
      // Profile
      profile: {
        avatar: data.avatar ?? null,
        birthDate: data.birthDate ?? null,
        gender: data.gender ?? null,
        company: data.company ?? null,
        departmentAndPosition: data.departmentAndPosition ?? null,
      },
      
      // Dates
      joinDate: data.joinDate ? Timestamp.fromDate(new Date(data.joinDate)) : now,
      renewalDate: null,
      expiryDate: null,
      
      // Metadata
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
    });
    
    // Add to Firestore with retry
    const docRef = await retryWithBackoff(
      () => addDoc(getMembersRef(), memberData)
    );
    
    // Fetch and return the created member
    const createdMember = await getMemberById(docRef.id);
    
    if (!createdMember) {
      throw new Error('创建会员后无法获取数据');
    }
    
    return createdMember;
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '创建会员失败',
    });
    throw error;
  }
};

/**
 * Update member
 * 更新会员
 */
// 根据业务规则自动计算会员类别
const computeAutoCategory = async (memberId: string, profile?: any): Promise<string> => {
  // 1) 默认：青商好友
  let nextCategory: string = 'JCI Friend';

  // 是否存在会费付款记录：financialRecords 中 type = 'memberFee' 且 status=paid 或 paidAmount>0
  let hasPaidFee = false;
  try {
    const q = query(
      collection(db, GC.FINANCIAL_RECORDS),
      where('type', '==', 'memberFee'),
      where('memberId', '==', memberId),
      where('paidAmount', '>', 0)
    );
    const snap = await getDocs(q);
    hasPaidFee = !snap.empty;
  } catch {}

  if (hasPaidFee) {
    // 2) 有会费付款记录：先设为 Probation Member（试用/观察会员）
    nextCategory = 'Probation Member' as any;

    const birth = profile?.birthDate;
    const nationality = profile?.nationality || profile?.address?.country;
    const age = birth ? dayjs().diff(dayjs(birth), 'year') : undefined;

    // 3) 有会费 + 年龄≥40 → 校友
    if (age !== undefined && age >= 40) {
      nextCategory = 'Alumni';
    }
    // 4) 有会费 + 非马来西亚公民 → 访问会员
    if (nationality && !/^malaysia$/i.test(nationality)) {
      nextCategory = 'Visiting Member';
    }
  }

  return nextCategory;
};

export const updateMember = async (
  memberId: string,
  data: Partial<MemberFormData>,
  updatedBy: string
): Promise<Member> => {
  try {
    const memberRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId);
    
    // Check if member exists
    const memberDoc = await getDoc(memberRef);
    if (!memberDoc.exists()) {
      throw new Error('会员不存在');
    }
    
    // Prepare update data
    // 业务规则：自动计算类别（不再人工设置）
    const baseProfile = {
      ...memberDoc.data()?.profile,
      ...(data.birthDate !== undefined ? { birthDate: data.birthDate } : {}),
      ...(data.gender !== undefined ? { gender: data.gender } : {}),
      // nationality 在 MemberFormData 中可能不存在，保持从原档案读取
      ...(data.company !== undefined ? { company: data.company } : {}),
      ...(data.departmentAndPosition !== undefined ? { departmentAndPosition: data.departmentAndPosition } : {}),
    } as any;
    const autoCategory = await computeAutoCategory(memberId, baseProfile);

    const updateData = cleanUndefinedValues({
      ...(data.name && { name: data.name }),
      ...(data.email && { email: data.email }),
      ...(data.phone && { phone: data.phone }),
      ...(data.status && { status: data.status }),
      ...(data.level && { level: data.level }),
      // 强制覆盖为自动类别
      category: autoCategory,
      ...(data.chapter && { chapter: data.chapter }),
      ...(data.chapterId && { chapterId: data.chapterId }),
      
      // Update profile fields if provided
      ...(data.avatar !== undefined && { 'profile.avatar': data.avatar }),
      ...(data.birthDate !== undefined && { 'profile.birthDate': data.birthDate }),
      ...(data.gender !== undefined && { 'profile.gender': data.gender }),
      ...(data.company !== undefined && { 'profile.company': data.company }),
      ...(data.departmentAndPosition !== undefined && { 
        'profile.departmentAndPosition': data.departmentAndPosition 
      }),
      
      // Metadata
      updatedAt: Timestamp.now(),
      updatedBy,
    });
    
    // Update in Firestore with retry
    await retryWithBackoff(
      () => updateDoc(memberRef, updateData)
    );
    
    // Fetch and return updated member
    const updatedMember = await getMemberById(memberId);
    
    if (!updatedMember) {
      throw new Error('更新会员后无法获取数据');
    }
    
    return updatedMember;
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '更新会员失败',
    });
    throw error;
  }
};

/**
 * Delete member with retry
 * 删除会员（带重试）
 */
export const deleteMember = async (memberId: string): Promise<void> => {
  try {
    const memberRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId);
    
    // Check if member exists
    const memberDoc = await getDoc(memberRef);
    if (!memberDoc.exists()) {
      throw new Error('会员不存在');
    }
    
    // Delete from Firestore with retry
    await retryWithBackoff(
      () => deleteDoc(memberRef)
    );
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '删除会员失败',
    });
    throw error;
  }
};

/**
 * Get member statistics
 * 获取会员统计
 */
export const getMemberStats = async (): Promise<MemberStats> => {
  try {
    const snapshot = await getDocs(getMembersRef());
    const members = snapshot.docs.map(doc => doc.data());
    
    const stats: MemberStats = {
      total: members.length,
      active: 0,
      inactive: 0,
      suspended: 0,
      pending: 0,
      byCategory: {},
      byLevel: {},
      newThisMonth: 0,
      expiringThisMonth: 0,
    };
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    members.forEach(member => {
      // Count by status
      if (member.status === 'active') stats.active++;
      else if (member.status === 'inactive') stats.inactive++;
      else if (member.status === 'suspended') stats.suspended++;
      else if (member.status === 'pending') stats.pending++;
      
      // Count by category
      if (member.category) {
        const cat = member.category as keyof typeof stats.byCategory;
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
      }
      
      // Count by level
      if (member.level) {
        const lvl = member.level as keyof typeof stats.byLevel;
        stats.byLevel[lvl] = (stats.byLevel[lvl] || 0) + 1;
      }
      
      // Count new members this month
      if (member.createdAt) {
        const createdDate = new Date(member.createdAt);
        if (createdDate.getMonth() === currentMonth && 
            createdDate.getFullYear() === currentYear) {
          stats.newThisMonth++;
        }
      }
      
      // Count expiring this month
      if (member.expiryDate) {
        const expiryDate = new Date(member.expiryDate);
        if (expiryDate.getMonth() === currentMonth && 
            expiryDate.getFullYear() === currentYear) {
          stats.expiringThisMonth++;
        }
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error fetching member stats:', error);
    throw new Error('获取会员统计失败');
  }
};

/**
 * Check if email exists
 * 检查邮箱是否存在
 */
export const checkEmailExists = async (email: string, excludeMemberId?: string): Promise<boolean> => {
  try {
    const q = query(getMembersRef(), where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return false;
    }
    
    // If excluding a member (for update), check if it's not the same member
    if (excludeMemberId) {
      return snapshot.docs.some(doc => doc.id !== excludeMemberId);
    }
    
    return true;
  } catch (error) {
    console.error('Error checking email:', error);
    throw new Error('检查邮箱失败');
  }
};

/**
 * Check if phone exists
 * 检查电话是否存在
 */
export const checkPhoneExists = async (phone: string, excludeMemberId?: string): Promise<boolean> => {
  try {
    const q = query(getMembersRef(), where('phone', '==', phone));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return false;
    }
    
    // If excluding a member (for update), check if it's not the same member
    if (excludeMemberId) {
      return snapshot.docs.some(doc => doc.id !== excludeMemberId);
    }
    
    return true;
  } catch (error) {
    console.error('Error checking phone:', error);
    throw new Error('检查电话失败');
  }
};

/**
 * Get members with upcoming birthdays (next 30 days)
 * 获取即将过生日的会员（未来30天）
 */
export const getUpcomingBirthdays = async (days: number = 30): Promise<Array<{
  id: string;
  name: string;
  birthDate: string;
  daysUntilBirthday: number;
  avatar?: string;
}>> => {
  try {
    const snapshot = await getDocs(query(getMembersRef(), where('status', '==', 'active')));
    const members = snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
    
    const today = dayjs();
    const upcomingBirthdays: Array<{
      id: string;
      name: string;
      birthDate: string;
      daysUntilBirthday: number;
      avatar?: string;
    }> = [];
    
    members.forEach(member => {
      if (member.profile?.birthDate) {
        // Parse birthDate (format: dd-mmm-yyyy)
        const birthDate = dayjs(member.profile.birthDate, 'DD-MMM-YYYY');
        if (!birthDate.isValid()) return;
        
        // Get this year's birthday
        const thisYearBirthday = birthDate.year(today.year());
        
        // Calculate days until birthday
        let daysUntil = thisYearBirthday.diff(today, 'day');
        
        // If birthday already passed this year, check next year
        if (daysUntil < 0) {
          const nextYearBirthday = birthDate.year(today.year() + 1);
          daysUntil = nextYearBirthday.diff(today, 'day');
        }
        
        // Only include birthdays within the next X days
        if (daysUntil >= 0 && daysUntil <= days) {
          upcomingBirthdays.push({
            id: member.id,
            name: member.name,
            birthDate: member.profile.birthDate,
            daysUntilBirthday: daysUntil,
            avatar: member.profile?.avatar,
          });
        }
      }
    });
    
    // Sort by days until birthday
    upcomingBirthdays.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
    
    return upcomingBirthdays;
  } catch (error) {
    console.error('Error fetching upcoming birthdays:', error);
    throw new Error('获取生日列表失败');
  }
};

/**
 * Get member industry distribution
 * 获取会员行业分布
 */
export const getIndustryDistribution = async (): Promise<Array<{
  industry: string;
  count: number;
  percentage: number;
}>> => {
  try {
    const snapshot = await getDocs(query(getMembersRef(), where('status', '==', 'active')));
    const members = snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
    
    const industryCount: Record<string, number> = {};
    let totalWithIndustry = 0;
    
    members.forEach(member => {
      const industries = member.profile?.ownIndustry || [];
      if (industries.length > 0) {
        totalWithIndustry++;
        industries.forEach(industry => {
          industryCount[industry] = (industryCount[industry] || 0) + 1;
        });
      }
    });
    
    const distribution = Object.entries(industryCount)
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: totalWithIndustry > 0 ? (count / totalWithIndustry) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 industries
    
    return distribution;
  } catch (error) {
    console.error('Error fetching industry distribution:', error);
    throw new Error('获取行业分布失败');
  }
};

/**
 * Get member interest distribution
 * 获取会员兴趣分布
 */
export const getInterestDistribution = async (): Promise<Array<{
  industry: string;
  count: number;
  percentage: number;
}>> => {
  try {
    const snapshot = await getDocs(query(getMembersRef(), where('status', '==', 'active')));
    const members = snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
    
    const interestCount: Record<string, number> = {};
    let totalWithInterest = 0;
    
    members.forEach(member => {
      const interests = member.profile?.interestedIndustries || [];
      if (interests.length > 0) {
        totalWithInterest++;
        interests.forEach(interest => {
          interestCount[interest] = (interestCount[interest] || 0) + 1;
        });
      }
    });
    
    const distribution = Object.entries(interestCount)
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: totalWithInterest > 0 ? (count / totalWithInterest) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 interests
    
    return distribution;
  } catch (error) {
    console.error('Error fetching interest distribution:', error);
    throw new Error('获取兴趣分布失败');
  }
};

/**
 * Get all active members (for dropdown selections)
 * 获取所有活跃会员（用于下拉选择）
 */
export const getAllActiveMembers = async (): Promise<Member[]> => {
  try {
    const q = query(
      getMembersRef(),
      where('status', '==', 'active'),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
  } catch (error: any) {
    console.error('❌ [getAllActiveMembers] 获取活跃会员失败:', error);
    throw handleFirebaseError(error, { logToConsole: true });
  }
};

console.log('✅ Member Service Loaded');

