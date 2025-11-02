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
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { GLOBAL_COLLECTIONS as GC } from '@/config/globalCollections';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import { handleFirebaseError, retryWithBackoff } from '@/services/errorHandlerService';

// Enable dayjs plugins
dayjs.extend(customParseFormat);
import type { 
  Member, 
  MemberFormData, 
  MemberSearchParams, 
  MemberStats 
} from '../types';
import type { PaginatedResponse, PaginationParams } from '@/types';

// ========== Collection Reference ==========
const getMembersRef = () => collection(db, GLOBAL_COLLECTIONS.MEMBERS);

// ⚡ Performance: Cache for paid member IDs (5 min TTL)
let paidMemberIdsCache: { data: Set<string>; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached paid member IDs or fetch from Firestore
 * 获取缓存的已支付会员ID或从 Firestore 获取
 */
async function getCachedPaidMemberIds(): Promise<Set<string>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (paidMemberIdsCache && (now - paidMemberIdsCache.timestamp) < CACHE_TTL) {
    console.log('⚡ [Cache] Using cached paid member IDs');
    return paidMemberIdsCache.data;
  }
  
  // Fetch fresh data
  console.log('🔄 [Cache] Fetching fresh paid member IDs...');
  const paidSnap = await getDocs(query(
    collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS),
    where('type', '==', 'memberFee'),
    where('paidAmount', '>', 0)
  ));
  
  const paidMemberIds = new Set<string>();
  paidSnap.docs.forEach(d => {
    const v = d.data() as any;
    if (typeof v.memberId === 'string' && v.memberId) {
      paidMemberIds.add(v.memberId);
    }
  });
  
  // Update cache
  paidMemberIdsCache = { data: paidMemberIds, timestamp: now };
  console.log(`✅ [Cache] Cached ${paidMemberIds.size} paid member IDs`);
  
  return paidMemberIds;
}

// ========== Helper Functions ==========

/**
 * Auto update jciCareer.category to 'Alumni' when age >= 40
 */
const autoUpdateAlumniCategoryIfNeeded = async (member: Member): Promise<void> => {
  try {
    const currentCategory = (member as any)?.jciCareer?.category as string | undefined;
    // 若已是 Visiting Member，则不升级为 Alumni
    if (currentCategory === 'Visiting Member') return;
    const birth = (member as any)?.profile?.birthDate as string | undefined;
    if (currentCategory === 'Alumni') return;
    if (!birth || typeof birth !== 'string') return;
    // 非马来西亚证件排除
    const idVal = (member as any)?.profile?.nricOrPassport as string | undefined;
    const isMalaysia = !!idVal && /^\d{12}$/.test(idVal.replace(/\D/g, ''));
    if (!isMalaysia) return;
    const birthDate = dayjs(birth);
    if (!birthDate.isValid()) return;
    const age = dayjs().diff(birthDate, 'year');
    if (age >= 40) {
      const memberRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, member.id);
      await updateDoc(memberRef, cleanUndefinedValues({
        'jciCareer.category': 'Alumni',
        updatedAt: Timestamp.now(),
      }));
    }
  } catch {
    // silent fail; do not block reads
  }
};

/**
 * Auto update jciCareer.category to 'Visiting Member' when NRIC/Passport indicates non-Malaysian
 * 简规则：马来西亚NRIC为12位纯数字；否则视为非马来
 */
const autoUpdateVisitingCategoryIfNeeded = async (member: Member): Promise<void> => {
  try {
    const currentCategory = (member as any)?.jciCareer?.category as string | undefined;
    if (currentCategory === 'Visiting Member') return;
    const idVal = (member as any)?.profile?.nricOrPassport as string | undefined;
    if (!idVal || typeof idVal !== 'string') return;
    const digitsOnly = idVal.replace(/\D/g, '');
    const isMalaysiaNric = /^\d{12}$/.test(digitsOnly);
    if (!isMalaysiaNric) {
      const memberRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, member.id);
      await updateDoc(memberRef, cleanUndefinedValues({
        'jciCareer.category': 'Visiting Member',
        updatedAt: Timestamp.now(),
      }));
    }
  } catch {
    // silent fail
  }
};

/**
 * Convert Firestore document to Member object
 * 转换 Firestore 文档为会员对象
 */
const convertToMember = (docId: string, data: DocumentData): Member => {
  const profileRaw = (data.profile ?? {}) as Record<string, any>;
  const business = (data.business ?? {}) as Record<string, any>;
  const jci = (data.jciCareer ?? {}) as Record<string, any>;

  // Merge namespaced fields back into profile view for UI compatibility
  const mergedProfile: Record<string, any> = {
    ...profileRaw,
    // Identity surfaced in profile for migrated schema
    name: profileRaw.name ?? data.name,
    // Career & Business from business.*
    company: profileRaw.company ?? business.company,
    companyWebsite: profileRaw.companyWebsite ?? business.companyWebsite,
    departmentAndPosition: profileRaw.departmentAndPosition ?? business.departmentAndPosition,
    ownIndustry: profileRaw.ownIndustry ?? business.ownIndustry,
    companyIntro: profileRaw.companyIntro ?? business.companyIntro,
    interestedIndustries: profileRaw.interestedIndustries ?? business.interestedIndustries,
    businessCategories: profileRaw.businessCategories ?? business.businessCategories,
    acceptInternationalBusiness: profileRaw.acceptInternationalBusiness ?? business.acceptInternationalBusiness,

    // JCI-specific from jciCareer.*
    senatorId: profileRaw.senatorId ?? jci.senatorId,
    senatorScore: profileRaw.senatorScore ?? jci.senatorScore,
    senatorVerified: profileRaw.senatorVerified ?? jci.senatorVerified,
    jciEventInterests: profileRaw.jciEventInterests ?? jci.jciEventInterests,
    jciBenefitsExpectation: profileRaw.jciBenefitsExpectation ?? jci.jciBenefitsExpectation,
    fiveYearsVision: profileRaw.fiveYearsVision ?? jci.fiveYearsVision,
    activeMemberHow: profileRaw.activeMemberHow ?? jci.activeMemberHow,
    paymentDate: profileRaw.paymentDate ?? jci.paymentDate,
    paymentSlipUrl: profileRaw.paymentSlipUrl ?? jci.paymentSlipUrl,
    paymentVerifiedDate: profileRaw.paymentVerifiedDate ?? jci.paymentVerifiedDate,
    joinedDate: profileRaw.joinedDate ?? jci.joinedDate,
    endorsementDate: profileRaw.endorsementDate ?? jci.endorsementDate,
    hasSpecialPermissions: profileRaw.hasSpecialPermissions ?? jci.hasSpecialPermissions,
    specialPermissions: profileRaw.specialPermissions ?? jci.specialPermissions,
    permissionNotes: profileRaw.permissionNotes ?? jci.permissionNotes,
    effectivePermissions: profileRaw.effectivePermissions ?? jci.effectivePermissions,
    roleBindings: profileRaw.roleBindings ?? jci.roleBindings,
    taskCompletions: profileRaw.taskCompletions ?? jci.taskCompletions,
    activityParticipation: profileRaw.activityParticipation ?? jci.activityParticipation,
    whatsappGroup: profileRaw.whatsappGroup ?? jci.whatsappGroup,
  };

  const pickIso = (v: any): string | undefined => {
    if (v == null) return undefined;
    if (typeof v === 'string') return v;
    return safeTimestampToISO(v) || undefined;
  };

  const joinDateRaw = data.joinDate ?? jci.joinDate;
  const renewalDateRaw = data.renewalDate ?? jci.renewalDate;
  const expiryDateRaw = data.expiryDate ?? jci.expiryDate;

  const createdAtRaw = data.createdAt ?? profileRaw.createdAt ?? jci.createdAt;
  const updatedAtRaw = data.updatedAt ?? profileRaw.updatedAt ?? jci.updatedAt;

  const memberObj = {
    id: docId,
    email: (mergedProfile.email ?? data.email) || '',
    name: (mergedProfile.name ?? data.name) || '',
    phone: (mergedProfile.phone ?? data.phone) || '',
    memberId: (mergedProfile.memberId ?? data.memberId) || '',
    status: (mergedProfile.status ?? data.status) || 'pending',
    level: (mergedProfile.level ?? data.level) || 'bronze',
    accountType: data.accountType ?? null,
    category: jci.category ?? data.category ?? null,

    // Organization (could also be in jciCareer after migration)
    worldRegion: data.worldRegion ?? jci.worldRegion ?? null,
    country: data.country ?? jci.country ?? null,
    countryRegion: data.countryRegion ?? jci.countryRegion ?? null,
    chapter: data.chapter ?? jci.chapter ?? null,
    chapterId: data.chapterId ?? jci.chapterId ?? null,

    // Profile (merged view)
    profile: mergedProfile,

    // Dates
    joinDate: pickIso(joinDateRaw) || new Date().toISOString(),
    renewalDate: pickIso(renewalDateRaw),
    expiryDate: pickIso(expiryDateRaw),

    // Timestamps
    createdAt: pickIso(createdAtRaw) || new Date().toISOString(),
    updatedAt: pickIso(updatedAtRaw) || new Date().toISOString(),
    createdBy: data.createdBy ?? jci.createdBy ?? profileRaw.createdBy ?? null,
    updatedBy: data.updatedBy ?? jci.updatedBy ?? profileRaw.updatedBy ?? null,
  } as Member;

  // Attach raw namespaces for UI compatibility after migration
  (memberObj as any).business = Object.keys(business).length ? business : undefined;
  (memberObj as any).jciCareer = Object.keys(jci).length ? jci : undefined;

  return memberObj;
};

/**
 * Build query based on search parameters
 * 根据搜索参数构建查询
 */
const buildQuery = (params: MemberSearchParams): Query<DocumentData> => {
  let q: Query<DocumentData> = getMembersRef();
  
  // Status filter
  if (params.status) {
    q = query(q, where('profile.status', '==', params.status));
  }
  
  // Category filter
  if (params.category) {
    q = query(q, where('jciCareer.category', '==', params.category));
  }
  
  // Level filter
  if (params.level) {
    q = query(q, where('profile.level', '==', params.level));
  }
  
  // Chapter filter
  if (params.chapter) {
    q = query(q, where('jciCareer.chapter', '==', params.chapter));
  }
  
  // New this month filter (will be handled client-side)
  // This requires date comparison which is complex in Firestore
  
  // Expiring this month filter (will be handled client-side)
  // This requires date comparison which is complex in Firestore
  
  // Default ordering by creation date (migrated to profile.createdAt)
  q = query(q, orderBy('profile.createdAt', 'desc'));
  
  return q;
};

// ========== CRUD Operations ==========

/**
 * Get member by ID with retry mechanism
 * 根据ID获取会员(带重试机制)
 */
export const getMemberById = async (memberId: string): Promise<Member | null> => {
  try {
    if (!memberId || typeof memberId !== 'string') {
      console.warn('⚠️ [getMemberById] Invalid memberId, skip fetch:', memberId);
      return null;
    }
    
    console.log(`🔍 [getMemberById] Fetching member by ID: ${memberId}`);
    
    const memberDoc = await retryWithBackoff(
      () => getDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId))
    );
    
    if (!memberDoc.exists()) {
      console.log(`❌ [getMemberById] Document not found: ${memberId}`);
      return null;
    }
    
    const rawData = memberDoc.data();
    console.log(`📦 [getMemberById] Raw document data keys:`, Object.keys(rawData));
    console.log(`📋 [getMemberById] Document has:`, {
      id: memberDoc.id,
      email: rawData.email,
      name: rawData.name,
      hasProfile: !!rawData.profile,
      hasBusiness: !!rawData.business,
      hasJciCareer: !!rawData.jciCareer,
      category: rawData.category,
      jciCareerCategory: rawData.jciCareer?.category,
    });
    
    const converted = convertToMember(memberDoc.id, rawData);
    
    console.log(`✅ [getMemberById] Converted member:`, {
      id: converted.id,
      email: converted.email,
      name: converted.name,
      hasProfile: !!converted.profile,
      hasBusiness: !!converted.business,
      hasJciCareer: !!converted.jciCareer,
      category: converted.category,
      jciCareerCategory: converted.jciCareer?.category,
    });
    
    await autoUpdateAdhoc(converted);
    return converted;
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '获取会员信息失败',
      showNotification: false,
    });
    throw error;
  }
};

// Wrap auto-update for single member with safe call
const autoUpdateAdhoc = async (m: Member) => {
  await Promise.allSettled([
    autoUpdateAlumniCategoryIfNeeded(m),
    autoUpdateVisitingCategoryIfNeeded(m),
    autoUpdateProbationCategoryIfNeeded(m),
  ]);
};

/**
 * Auto update jciCareer.category to 'Probation Member' when member has paid member-fee
 * 不覆盖 Alumni / Visiting Member
 */
const autoUpdateProbationCategoryIfNeeded = async (member: Member): Promise<void> => {
  try {
    const currentCategory = (member as any)?.jciCareer?.category as string | undefined;
    if (currentCategory === 'Alumni' || currentCategory === 'Visiting Member' || currentCategory === 'Probation Member') return;
    // 查询财务记录：memberFee 且 paidAmount>0
    const q = query(
      collection(db, GC.FINANCIAL_RECORDS),
      where('type', '==', 'memberFee'),
      where('memberId', '==', member.id),
      where('paidAmount', '>', 0)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const memberRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, member.id);
      await updateDoc(memberRef, cleanUndefinedValues({
        'jciCareer.category': 'Probation Member',
        updatedAt: Timestamp.now(),
      }));
    }
  } catch {
    // silent fail
  }
};

/**
 * Get all members with pagination and filters
 * 获取所有会员(分页和过滤)
 */
export const getMembers = async (
  params: PaginationParams & MemberSearchParams
): Promise<PaginatedResponse<Member>> => {
  try {
    const { page = 1, limit: pageLimit = 20, search, ...searchParams } = params;
    const catStrLc = String((searchParams as any)?.category || '').toLowerCase();
    const isProbationRequested = catStrLc === 'probation member';
    console.log('[MemberService.getMembers] incoming params:', {
      page,
      pageLimit,
      category: (searchParams as any)?.category,
      categoryString: String((searchParams as any)?.category),
      hasSearch: !!search,
    });
    
    // ⚡ Optimized: Single query with smart pagination
    // 第一步：使用单次查询获取数据（性能提升 50%）
    if (!search || !search.trim()) {
      // Build query with limit+1 to check if there are more pages
      let q = buildQuery(searchParams);
      q = query(q, limit(pageLimit + 1));  // Get one extra to detect hasMore
      
      // Apply offset using startAfter only if page > 1
      // Note: This still has O(n) complexity, but we'll optimize with cursor-based pagination
      if (page > 1) {
        const offset = (page - 1) * pageLimit;
        const offsetSnapshot = await getDocs(
          query(buildQuery(searchParams), limit(offset))
        );
        if (offsetSnapshot.docs.length > 0) {
          q = query(q, startAfter(offsetSnapshot.docs[offsetSnapshot.docs.length - 1]));
        }
      }
      
      // Execute paginated query
      const snapshot = await getDocs(q);
      
      // Determine total count efficiently
      const hasMore = snapshot.docs.length > pageLimit;
      const actualDocs = hasMore ? snapshot.docs.slice(0, pageLimit) : snapshot.docs;
      
      // Estimate total (avoid counting all docs)
      const totalCount = page === 1 && !hasMore 
        ? actualDocs.length  // If first page shows all, use actual count
        : (page - 1) * pageLimit + actualDocs.length + (hasMore ? pageLimit : 0);  // Estimate
      
      let members = actualDocs.map(doc => convertToMember(doc.id, doc.data()));
      
      // 🆕 Probation Member 视图增强 + ⚡ 缓存优化
      if (isProbationRequested) {
        console.log('[MemberService.getMembers] Probation filter (paged) before:', {
          snapshotDocs: actualDocs.length,
          membersLen: members.length,
        });
        try {
          // ⚡ Use cached paid member IDs (5 min TTL)
          const paidMemberIds = await getCachedPaidMemberIds();
          const before = members.length;
          members = members.filter((m: any) => 
            (m?.jciCareer?.category) === 'Probation Member' || paidMemberIds.has(m.id)
          );
          console.log('[MemberService.getMembers] Probation filter (paged) after:', {
            before,
            after: members.length,
            paidIdsCount: paidMemberIds.size,
            usingCache: true,
          });
        } catch {}
      }
      await Promise.allSettled(members.map(m => autoUpdateAdhoc(m)));
      
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
    
    // Convert all documents to Member objects and trigger auto update
    let allMembers = searchSnapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
    if (isProbationRequested) {
      console.log('[MemberService.getMembers] Probation filter (search) before:', {
        docs: searchSnapshot.size,
        allLen: allMembers.length,
      });
      try {
        const paidSnap = await getDocs(query(
          collection(db, GC.FINANCIAL_RECORDS),
          where('type', '==', 'memberFee'),
          where('paidAmount', '>', 0)
        ));
        const paidMemberIds = new Set<string>();
        paidSnap.docs.forEach(d => {
          const v = d.data() as any;
          if (typeof v.memberId === 'string' && v.memberId) paidMemberIds.add(v.memberId);
        });
        const before = allMembers.length;
        allMembers = allMembers.filter((m: any) => (m?.jciCareer?.category) === 'Probation Member' || paidMemberIds.has(m.id));
        console.log('[MemberService.getMembers] Probation filter (search) after:', {
          before,
          after: allMembers.length,
          paidIdsCount: paidMemberIds.size,
          samplePaidIds: Array.from(paidMemberIds).slice(0, 5),
          sampleKeptIds: allMembers.slice(0, 5).map(x => x.id),
        });
      } catch {}
    }
    await Promise.allSettled(allMembers.map(m => autoUpdateAdhoc(m)));
    
    // Apply search filter (expanded to include fullNameNric)
    const searchLower = search.toLowerCase();
    const normalize = (s?: string) => (s || '').toLowerCase();
    allMembers = allMembers.filter(member => {
      const fullNameNric = normalize(member.profile?.fullNameNric);
      return (
        normalize(member.name).includes(searchLower) ||
        normalize(member.email).includes(searchLower) ||
        (member.phone || '').includes(search) ||
        (!!member.memberId && normalize(member.memberId).includes(searchLower)) ||
        (fullNameNric.includes(searchLower))
    );
    });
    
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
    console.log(`👤 [createMember] Creating new member:`, {
      name: data.name,
      email: data.email,
      hasAvatar: !!data.avatar,
      avatarUrl: data.avatar,
      isCloudinaryAvatar: data.avatar?.includes('cloudinary.com'),
    });

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
        nationality: (data as any).nationality ?? null,
        alternativePhone: (data as any).alternativePhone ?? null,
        nricOrPassport: (data as any).nricOrPassport ?? null,
        fullNameNric: (data as any).fullNameNric ?? null,
        linkedin: (data as any).linkedin ?? null,
        profilePhotoUrl: (data as any).profilePhotoUrl ?? null,
        whatsappGroup: (data as any).whatsappGroup ?? null,
        shirtSize: (data as any).shirtSize ?? null,
        jacketSize: (data as any).jacketSize ?? null,
        nameToBeEmbroidered: (data as any).nameToBeEmbroidered ?? null,
        tshirtReceivingStatus: (data as any).tshirtReceivingStatus ?? null,
        cutting: (data as any).cutting ?? null,
      },

      // Namespaced: business (optional)
      ...(data.business ? { business: cleanUndefinedValues({
        company: data.business.company ?? data.company ?? null,
        departmentAndPosition: data.business.departmentAndPosition ?? data.departmentAndPosition ?? null,
        ownIndustry: Array.isArray(data.business.ownIndustry) ? data.business.ownIndustry : undefined,
        interestedIndustries: Array.isArray(data.business.interestedIndustries) ? data.business.interestedIndustries : undefined,
        businessCategories: Array.isArray(data.business.businessCategories) ? data.business.businessCategories : undefined,
        companyWebsite: data.business.companyWebsite ?? null,
        companyIntro: data.business.companyIntro ?? null,
        acceptInternationalBusiness: data.business.acceptInternationalBusiness ?? null,
      }) } : {}),

      // Namespaced: jciCareer (optional)
      ...(data.jciCareer ? { jciCareer: cleanUndefinedValues({
        category: data.jciCareer.category ?? null,
        membershipCategory: data.jciCareer.membershipCategory ?? null,
        chapter: data.jciCareer.chapter ?? data.chapter ?? null,
        chapterId: data.jciCareer.chapterId ?? data.chapterId ?? null,
        worldRegion: data.jciCareer.worldRegion ?? null,
        country: data.jciCareer.country ?? null,
        countryRegion: data.jciCareer.countryRegion ?? null,
        jciPosition: data.jciCareer.jciPosition ?? null,
        termStartDate: data.jciCareer.termStartDate ?? null,
        termEndDate: data.jciCareer.termEndDate ?? null,
        joinDate: data.jciCareer.joinDate ? Timestamp.fromDate(new Date(data.jciCareer.joinDate)) : null,
        senatorId: data.jciCareer.senatorId ?? null,
      }) } : {}),
      
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
    
    console.log(`💾 [createMember] Saving member to Firestore:`, {
      name: memberData.name,
      email: memberData.email,
      hasProfileAvatar: !!(memberData as any).profile?.avatar,
      profileAvatarUrl: (memberData as any).profile?.avatar,
    });

    // Add to Firestore with retry
    const docRef = await retryWithBackoff(
      () => addDoc(getMembersRef(), memberData)
    );
    
    console.log(`✅ [createMember] Member saved to Firestore:`, {
      memberId: docRef.id,
      name: memberData.name,
    });

    // Fetch and return the created member
    const createdMember = await getMemberById(docRef.id);
    
    console.log(`📤 [createMember] Fetched created member:`, {
      memberId: createdMember?.id,
      hasAvatar: !!createdMember?.profile?.avatar,
      avatarUrl: createdMember?.profile?.avatar,
    });
    
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
    // 2) 有会费付款记录：先设为 Probation Member(试用/观察会员)
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
  data: Partial<MemberFormData> | Record<string, any>,
  updatedBy: string
): Promise<Member> => {
  try {
    const memberRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId);
    
    // Check if member exists
    const memberDoc = await getDoc(memberRef);
    if (!memberDoc.exists()) {
      throw new Error('会员不存在');
    }
    
    // 检查是否是直接传递的updateData（带dot notation的字段）
    const hasDotNotation = Object.keys(data).some(key => key.includes('.'));
    
    let updateData: Record<string, any>;
    
    if (hasDotNotation) {
      // 直接使用传递的数据（已经是dot notation格式）
      console.log('🔧 [updateMember] 使用dot notation格式更新:', data);
      
      // 处理日期字段转换为Timestamp
      const processedData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        // 日期字段需要转换为Timestamp
        if (key.includes('.joinDate') || key.includes('.paymentDate') || 
            key.includes('.paymentVerifiedDate') || key.includes('.endorsementDate')) {
          if (value && value !== '') {
            try {
              processedData[key] = Timestamp.fromDate(new Date(value));
            } catch (e) {
              console.error(`日期转换失败 ${key}:`, value, e);
              processedData[key] = null;
            }
          } else {
            processedData[key] = null;
          }
        } else {
          // 非日期字段直接使用（空字符串转为null）
          processedData[key] = value === '' ? null : value;
        }
      }
      
      updateData = cleanUndefinedValues({
        ...processedData,
        updatedAt: Timestamp.now(),
        updatedBy,
      });
    } else {
      // 兼容旧格式：使用MemberFormData格式
      console.log('🔧 [updateMember] 使用传统格式更新:', data);
      
      // 业务规则：自动计算类别(不再人工设置)
      const baseProfile = {
        ...memberDoc.data()?.profile,
        ...(data.birthDate !== undefined ? { birthDate: data.birthDate } : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        ...(data.company !== undefined ? { company: data.company } : {}),
        ...(data.departmentAndPosition !== undefined ? { departmentAndPosition: data.departmentAndPosition } : {}),
      } as any;
      const autoCategory = await computeAutoCategory(memberId, baseProfile);

      updateData = cleanUndefinedValues({
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.status && { status: data.status }),
        ...(data.level && { level: data.level }),
        category: autoCategory,
        ...(data.chapter && { chapter: data.chapter }),
        ...(data.chapterId && { chapterId: data.chapterId }),
        
        // Profile fields
        ...(data.avatar !== undefined && { 'profile.avatar': data.avatar }),
        ...(data.birthDate !== undefined && { 'profile.birthDate': data.birthDate }),
        ...(data.gender !== undefined && { 'profile.gender': data.gender }),
        ...(data.company !== undefined && { 'profile.company': data.company }),
        ...(data.departmentAndPosition !== undefined && { 
          'profile.departmentAndPosition': data.departmentAndPosition 
        }),
        ...(data.fullNameNric !== undefined && { 'profile.fullNameNric': data.fullNameNric }),
        ...(data.nricOrPassport !== undefined && { 'profile.nricOrPassport': data.nricOrPassport }),
        ...(data.alternativePhone !== undefined && { 'profile.alternativePhone': data.alternativePhone }),
        ...(data.whatsappGroup !== undefined && { 'profile.whatsappGroup': data.whatsappGroup }),
        ...(data.nationality !== undefined && { 'profile.nationality': data.nationality }),
        ...(data.profilePhotoUrl !== undefined && { 'profile.profilePhotoUrl': data.profilePhotoUrl }),
        ...(data.linkedin !== undefined && { 'profile.linkedin': data.linkedin }),
        
        // Business fields
        ...(data.companyWebsite !== undefined && { 'business.companyWebsite': data.companyWebsite }),
        ...(data.companyIntro !== undefined && { 'business.companyIntro': data.companyIntro }),
        ...(data.acceptInternationalBusiness !== undefined && { 'business.acceptInternationalBusiness': data.acceptInternationalBusiness }),
        ...(data.ownIndustry !== undefined && { 'business.ownIndustry': Array.isArray(data.ownIndustry) ? data.ownIndustry : (typeof data.ownIndustry === 'string' && data.ownIndustry ? data.ownIndustry.split(',').map(s => s.trim()).filter(s => s) : []) }),
        ...(data.interestedIndustries !== undefined && { 'business.interestedIndustries': Array.isArray(data.interestedIndustries) ? data.interestedIndustries : (typeof data.interestedIndustries === 'string' && data.interestedIndustries ? data.interestedIndustries.split(',').map(s => s.trim()).filter(s => s) : []) }),
        ...(data.businessCategories !== undefined && { 'business.businessCategories': Array.isArray(data.businessCategories) ? data.businessCategories : (typeof data.businessCategories === 'string' && data.businessCategories ? data.businessCategories.split(',').map(s => s.trim()).filter(s => s) : []) }),
        ...(data.company !== undefined && { 'business.company': data.company }),
        ...(data.departmentAndPosition !== undefined && { 'business.departmentAndPosition': data.departmentAndPosition }),
        
        // JCI Career fields
        ...(data.memberId !== undefined && { 'jciCareer.memberId': data.memberId }),
        ...(data.joinDate !== undefined && { 'jciCareer.joinDate': data.joinDate ? Timestamp.fromDate(new Date(data.joinDate)) : null }),
        ...(data.senatorId !== undefined && { 'jciCareer.senatorId': data.senatorId }),
        ...(data.worldRegion !== undefined && { 'jciCareer.worldRegion': data.worldRegion }),
        ...(data.countryRegion !== undefined && { 'jciCareer.countryRegion': data.countryRegion }),
        ...(data.country !== undefined && { 'jciCareer.country': data.country }),
        ...(data.introducerName !== undefined && { 'jciCareer.introducerName': data.introducerName }),
        ...(data.jciPosition !== undefined && { 'jciCareer.jciPosition': data.jciPosition }),
        ...(data.membershipCategory !== undefined && { 'jciCareer.membershipCategory': data.membershipCategory }),
        ...(data.jciBenefitsExpectation !== undefined && { 'jciCareer.jciBenefitsExpectation': data.jciBenefitsExpectation }),
        ...(data.jciEventInterests !== undefined && { 'jciCareer.jciEventInterests': data.jciEventInterests }),
        ...(data.activeMemberHow !== undefined && { 'jciCareer.activeMemberHow': data.activeMemberHow }),
        ...(data.fiveYearsVision !== undefined && { 'jciCareer.fiveYearsVision': data.fiveYearsVision }),
        ...(data.paymentDate !== undefined && { 'jciCareer.paymentDate': data.paymentDate ? Timestamp.fromDate(new Date(data.paymentDate)) : null }),
        ...(data.paymentSlipUrl !== undefined && { 'jciCareer.paymentSlipUrl': data.paymentSlipUrl }),
        ...(data.paymentVerifiedDate !== undefined && { 'jciCareer.paymentVerifiedDate': data.paymentVerifiedDate ? Timestamp.fromDate(new Date(data.paymentVerifiedDate)) : null }),
        ...(data.endorsementDate !== undefined && { 'jciCareer.endorsementDate': data.endorsementDate ? Timestamp.fromDate(new Date(data.endorsementDate)) : null }),
        
        // Clothing & Items fields
        ...(data.shirtSize !== undefined && { 'profile.shirtSize': data.shirtSize }),
        ...(data.jacketSize !== undefined && { 'profile.jacketSize': data.jacketSize }),
        ...(data.nameToBeEmbroidered !== undefined && { 'profile.nameToBeEmbroidered': data.nameToBeEmbroidered }),
        ...(data.tshirtReceivingStatus !== undefined && { 'profile.tshirtReceivingStatus': data.tshirtReceivingStatus }),
        ...(data.cutting !== undefined && { 'profile.cutting': data.cutting }),
        
        updatedAt: Timestamp.now(),
        updatedBy,
      });
    }
    
    console.log('💾 [updateMember] 最终写入Firestore的数据:', updateData);
    
    // Update in Firestore with retry
    await retryWithBackoff(
      () => updateDoc(memberRef, updateData)
    );
    
    console.log('✅ [updateMember] Firestore更新成功');
    
    // Fetch and return updated member
    const updatedMember = await getMemberById(memberId);
    
    if (!updatedMember) {
      throw new Error('更新会员后无法获取数据');
    }
    
    return updatedMember;
  } catch (error) {
    console.error('❌ [updateMember] 更新失败:', error);
    handleFirebaseError(error, {
      customMessage: '更新会员失败',
    });
    throw error;
  }
};

/**
 * Delete member with retry
 * 删除会员(带重试)
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
      if (member?.profile?.status === 'active') stats.active++;
      else if (member?.profile?.status === 'inactive') stats.inactive++;
      else if (member?.profile?.status === 'suspended') stats.suspended++;
      else if (member?.profile?.status === 'pending') stats.pending++;
      
      // Count by category
      if (member?.jciCareer?.category) {
        const cat = member.jciCareer.category as keyof typeof stats.byCategory;
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
      }
      
      // Count by level
      if (member?.profile?.level) {
        const lvl = member.profile.level as keyof typeof stats.byLevel;
        stats.byLevel[lvl] = (stats.byLevel[lvl] || 0) + 1;
      }
      
      // Count new members this month
      if (member?.profile?.createdAt) {
        const createdDate = new Date(member.profile.createdAt);
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
 * 获取即将过生日的会员(未来30天)
 */
export const getUpcomingBirthdays = async (days: number = 30): Promise<Array<{
  id: string;
  name: string;
  birthDate: string;
  daysUntilBirthday: number;
  avatar?: string;
}>> => {
  try {
    const snapshot = await getDocs(getMembersRef());
    const members = snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
    
    
    
    const upcomingBirthdays: Array<{
      id: string;
      name: string;
      birthDate: string;
      daysUntilBirthday: number;
      avatar?: string;
    }> = [];
    
    members.forEach(member => {
      try {
        if (!member.profile?.birthDate) return;
        
        const birthDateStr = member.profile.birthDate;
        let birthDate: dayjs.Dayjs | null = null;
        
        // Try multiple date formats without strict mode first
        const formats = ['DD-MMM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'];
        
        for (const format of formats) {
          try {
            const parsed = dayjs(birthDateStr, format);
            if (parsed.isValid()) {
              birthDate = parsed;
              break;
            }
          } catch (e) {
            // Continue to next format
          }
        }
        
        // If all formats fail, try default parsing
        if (!birthDate || !birthDate.isValid()) {
          try {
            birthDate = dayjs(birthDateStr);
          } catch (e) {
            // Ignore parsing error
          }
        }
        
        // Skip if still invalid
        if (!birthDate || !birthDate.isValid()) {
          console.warn('🎂 [Birthday] Invalid date format:', member.name, birthDateStr);
          return;
        }
        
        // Safely extract month and day
        const birthMonth = birthDate.month(); // 0-11
        const birthDay = birthDate.date();    // 1-31
        
        // Validate extracted values
        if (birthMonth < 0 || birthMonth > 11 || birthDay < 1 || birthDay > 31) {
          console.warn('🎂 [Birthday] Invalid date values:', member.name, { birthMonth, birthDay });
          return;
        }
        
        // Get today's date at start of day (avoid partial-day rounding issues)
        const today = dayjs().startOf('day');
        const currentYear = today.year();
        
        // Build this year's birthday (safe string construction)
        const monthStr = String(birthMonth + 1).padStart(2, '0');
        const dayStr = String(birthDay).padStart(2, '0');
        const thisYearBirthdayStr = `${currentYear}-${monthStr}-${dayStr}`;
        const thisYearBirthday = dayjs(thisYearBirthdayStr).startOf('day');
        
        if (!thisYearBirthday.isValid()) {
          console.warn('🎂 [Birthday] Failed to create birthday date:', member.name, thisYearBirthdayStr);
          return;
        }
        
        // Calculate days until birthday
        let daysUntil = thisYearBirthday.diff(today, 'day');
        
        // If birthday already passed this year, calculate for next year
        if (daysUntil < 0) {
          const nextYearBirthdayStr = `${currentYear + 1}-${monthStr}-${dayStr}`;
          const nextYearBirthday = dayjs(nextYearBirthdayStr).startOf('day');
          daysUntil = nextYearBirthday.diff(today, 'day');
        }
        
        // Only include birthdays within the next X days
        if (daysUntil >= 0 && daysUntil <= days) {
          upcomingBirthdays.push({
            id: member.id,
            name: member.name,
            birthDate: birthDateStr,
            daysUntilBirthday: daysUntil,
            avatar: member.profile?.avatar,
          });
        }
      } catch (err) {
        console.error('🎂 [Birthday] Error processing member:', member.name, err);
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
 * Get members by birthday month
 * 按月份获取生日会员
 */
export const getBirthdaysByMonth = async (month: number): Promise<Array<{
  id: string;
  name: string;
  birthDate: string;
  day: number;
  avatar?: string;
}>> => {
  try {
    const snapshot = await getDocs(getMembersRef());
    const members = snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
    
    
    
    const birthdayList: Array<{
      id: string;
      name: string;
      birthDate: string;
      day: number;
      avatar?: string;
    }> = [];
    
    members.forEach(member => {
      try {
        if (!member.profile?.birthDate) return;
        
        const birthDateStr = member.profile.birthDate;
        let birthDate: dayjs.Dayjs | null = null;
        
        // Try multiple date formats without strict mode
        const formats = ['DD-MMM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'];
        
        for (const format of formats) {
          try {
            const parsed = dayjs(birthDateStr, format);
            if (parsed.isValid()) {
              birthDate = parsed;
              break;
            }
          } catch (e) {
            // Continue to next format
          }
        }
        
        // If all formats fail, try default parsing
        if (!birthDate || !birthDate.isValid()) {
          try {
            birthDate = dayjs(birthDateStr);
          } catch (e) {
            // Ignore parsing error
          }
        }
        
        // Skip if still invalid
        if (!birthDate || !birthDate.isValid()) {
          console.warn('🎂 [Birthday Month] Invalid date format:', member.name, birthDateStr);
          return;
        }
        
        // Check if birthday month matches
        const birthMonth = birthDate.month(); // 0-11
        const birthDay = birthDate.date();    // 1-31
        
        if (birthMonth === month && birthDay >= 1 && birthDay <= 31) {
          birthdayList.push({
            id: member.id,
            name: member.name,
            birthDate: birthDateStr,
            day: birthDay,
            avatar: member.profile?.avatar,
          });
        }
      } catch (err) {
        console.error('🎂 [Birthday Month] Error processing member:', member.name, err);
      }
    });
    
    
    
    // Sort by day of month
    birthdayList.sort((a, b) => a.day - b.day);
    
    return birthdayList;
  } catch (error) {
    console.error('Error fetching birthdays by month:', error);
    throw new Error('获取月度生日列表失败');
  }
};

/**
 * Get member industry distribution
 * 获取会员行业分布
 */
export const getIndustryDistribution = async (
  acceptInternationalBusiness?: 'Yes' | 'No' | 'Willing to explore'
): Promise<Array<{
  industry: string;
  count: number;
  percentage: number;
}>> => {
  try {
    const snapshot = await getDocs(getMembersRef());
    const members = snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
    
    
    const industryCount: Record<string, number> = {};
    let totalWithIndustry = 0;
    
    members.forEach((member, idx) => {
      // Optional filter by acceptInternationalBusiness (merged into profile)
      if (acceptInternationalBusiness) {
        const aib = (member as any)?.profile?.acceptInternationalBusiness as string | undefined;
        if (!aib || aib !== acceptInternationalBusiness) {
          return; // skip this member when filter is applied
        }
      }
      const raw = (member as any)?.profile?.ownIndustry ?? (member as any)?.business?.ownIndustry ?? [];
      let industries: string[] = [];
      if (Array.isArray(raw)) {
        industries = (raw as unknown[]).filter((v): v is string => typeof v === 'string' && !!v);
      } else if (raw && typeof raw === 'object') {
        // Firestore map/object case → convert values to array
        industries = Object.values(raw as Record<string, unknown>).filter((v): v is string => typeof v === 'string' && !!v);
      } else if (typeof raw === 'string' && raw) {
        industries = [raw];
      }

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
      .sort((a, b) => b.count - a.count);
    
    
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
    const snapshot = await getDocs(getMembersRef());
    const members = snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
    
    
    const interestCount: Record<string, number> = {};
    let totalWithInterest = 0;
    
    members.forEach((member, idx) => {
      const raw = (member as any)?.profile?.interestedIndustries ?? (member as any)?.business?.interestedIndustries ?? [];
      let interests: string[] = [];
      if (Array.isArray(raw)) {
        interests = (raw as unknown[]).filter((v): v is string => typeof v === 'string' && !!v);
      } else if (raw && typeof raw === 'object') {
        interests = Object.values(raw as Record<string, unknown>).filter((v): v is string => typeof v === 'string' && !!v);
      } else if (typeof raw === 'string' && raw) {
        interests = [raw];
      }

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
 * 获取所有活跃会员(用于下拉选择)
 */
export const getAllActiveMembers = async (): Promise<Member[]> => {
  try {
    const q = query(
      getMembersRef(),
      where('profile.status', '==', 'active'),
      orderBy('profile.name', 'asc')
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => convertToMember(doc.id, doc.data()));
  } catch (error: any) {
    console.error('❌ [getAllActiveMembers] 获取活跃会员失败:', error);
    throw handleFirebaseError(error, { logToConsole: true });
  }
};



