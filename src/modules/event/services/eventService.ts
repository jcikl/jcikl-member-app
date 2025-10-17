/**
 * Event Service
 * 活动服务层
 * 
 * ⚠️ CRITICAL RULES:
 * 1. ALWAYS use GLOBAL_COLLECTIONS.EVENTS (never hardcode)
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
  Query,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import { handleFirebaseError, retryWithBackoff } from '@/services/errorHandlerService';
import type { 
  Event, 
  EventFormData, 
  EventSearchParams, 
  EventStats,
  EventRegistration,
} from '../types';
import type { PaginatedResponse, PaginationParams } from '@/types';

// ========== Collection References ==========
const getEventsRef = () => collection(db, GLOBAL_COLLECTIONS.EVENTS);
const getEventRegistrationsRef = () => collection(db, GLOBAL_COLLECTIONS.EVENT_REGISTRATIONS);

// ========== Helper Functions ==========

/**
 * Convert Firestore document to Event object
 * 转换 Firestore 文档为活动对象
 */
const convertToEvent = (docId: string, data: DocumentData): Event => {
  return {
    id: docId,
    name: data.name || '',
    description: data.description ?? null,
    eventCode: data.eventCode ?? null,
    
    // Status & Level
    status: data.status || 'Draft',
    level: data.level || 'Local',
    
    // Date & Time
    startDate: safeTimestampToISO(data.startDate),
    endDate: safeTimestampToISO(data.endDate),
    registrationStartDate: data.registrationStartDate ? safeTimestampToISO(data.registrationStartDate) : undefined,
    registrationDeadline: data.registrationDeadline ? safeTimestampToISO(data.registrationDeadline) : undefined,
    
    // Location
    location: data.location ?? null,
    address: data.address ?? null,
    venue: data.venue ?? null,
    isOnline: data.isOnline || false,
    onlineLink: data.onlineLink ?? null,
    
    // Capacity
    maxParticipants: data.maxParticipants ?? null,
    currentParticipants: data.currentParticipants || 0,
    waitlistEnabled: data.waitlistEnabled || false,
    
    // Registration Settings
    isPrivate: data.isPrivate || false,
    registrationTargetAudience: data.registrationTargetAudience || [],
    
    // Pricing
    pricing: data.pricing || {
      regularPrice: 0,
      memberPrice: 0,
      alumniPrice: 0,
      earlyBirdPrice: 0,
      committeePrice: 0,
      currency: 'RM',
    },
    isFree: data.isFree || false,
    financialAccount: data.financialAccount ?? null,
    
    // Organizers
    organizerId: data.organizerId || '',
    organizerName: data.organizerName || '',
    coOrganizers: data.coOrganizers || [],
    contactPerson: data.contactPerson ?? null,
    contactPhone: data.contactPhone ?? null,
    contactEmail: data.contactEmail ?? null,
    
    // Categories
    category: data.category ?? null,
    tags: data.tags || [],
    
    // Media
    coverImage: data.coverImage ?? null,
    posterImage: data.posterImage ?? null,
    images: data.images || [],
    
    // Additional
    agenda: data.agenda ?? null,
    requirements: data.requirements ?? null,
    notes: data.notes ?? null,
    agendaItems: data.agendaItems || [],
    committeeMembers: data.committeeMembers || [],
    speakers: data.speakers || [],
    
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
const buildQuery = (params: EventSearchParams): Query<DocumentData> => {
  let q: Query<DocumentData> = getEventsRef();
  
  // Status filter
  if (params.status) {
    q = query(q, where('status', '==', params.status));
  }
  
  // Level filter
  if (params.level) {
    q = query(q, where('level', '==', params.level));
  }
  
  // Category filter
  if (params.category) {
    q = query(q, where('category', '==', params.category));
  }
  
  // Online filter
  if (params.isOnline !== undefined) {
    q = query(q, where('isOnline', '==', params.isOnline));
  }
  
  // Free filter
  if (params.isFree !== undefined) {
    q = query(q, where('isFree', '==', params.isFree));
  }
  
  // Active filter (Published status)
  if (params.active) {
    q = query(q, where('status', '==', 'Published'));
  }
  
  // Default ordering by start date (descending)
  q = query(q, orderBy('startDate', 'desc'));
  
  return q;
};

// ========== CRUD Operations ==========

/**
 * Get event by ID with retry mechanism
 * 根据ID获取活动（带重试机制）
 */
export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    const eventDoc = await retryWithBackoff(
      () => getDoc(doc(db, GLOBAL_COLLECTIONS.EVENTS, eventId))
    );
    
    if (!eventDoc.exists()) {
      return null;
    }
    
    return convertToEvent(eventDoc.id, eventDoc.data());
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '获取活动信息失败',
      showNotification: false,
    });
    throw error;
  }
};

/**
 * Get paginated events list with search & filter
 * 获取分页活动列表（带搜索和筛选）
 */
export const getEvents = async (
  params: PaginationParams & EventSearchParams
): Promise<PaginatedResponse<Event>> => {
  try {
    const q = buildQuery(params);
    const querySnapshot = await getDocs(q);
    
    const allEvents = querySnapshot.docs.map(doc => 
      convertToEvent(doc.id, doc.data())
    );
    
    // Client-side search (name, description, location)
    let filteredEvents = allEvents;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredEvents = allEvents.filter(event => 
        event.name.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.location?.toLowerCase().includes(searchLower)
      );
    }
    
    // Client-side date range filter
    if (params.dateFrom || params.dateTo) {
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.startDate);
        if (params.dateFrom && eventDate < new Date(params.dateFrom)) {
          return false;
        }
        if (params.dateTo && eventDate > new Date(params.dateTo)) {
          return false;
        }
        return true;
      });
    }
    
    // Client-side upcoming filter
    if (params.upcoming) {
      const now = new Date();
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.startDate) > now
      );
    }
    
    // Pagination
    const total = filteredEvents.length;
    const startIndex = (params.page - 1) * params.limit;
    const endIndex = startIndex + params.limit;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
    
    return {
      data: paginatedEvents,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    };
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '获取活动列表失败',
      showNotification: false,
    });
    throw error;
  }
};

/**
 * Create new event
 * 创建新活动
 */
export const createEvent = async (
  formData: EventFormData,
  currentUserId: string
): Promise<string> => {
  try {
    const now = Timestamp.now();
    
    const eventData = {
      // Basic Info
      name: formData.name,
      description: formData.description ?? null,
      eventCode: formData.eventCode ?? null,
      
      // Status & Level
      status: formData.status || 'Draft',
      level: formData.level || 'Local',
      
      // Date & Time
      startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : now,
      endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : now,
      registrationStartDate: formData.registrationStartDate 
        ? Timestamp.fromDate(new Date(formData.registrationStartDate)) 
        : null,
      registrationDeadline: formData.registrationDeadline 
        ? Timestamp.fromDate(new Date(formData.registrationDeadline)) 
        : null,
      
      // Location
      location: formData.location ?? null,
      address: formData.address ?? null,
      venue: formData.venue ?? null,
      isOnline: formData.isOnline || false,
      onlineLink: formData.onlineLink ?? null,
      
      // Capacity
      maxParticipants: formData.maxParticipants ?? null,
      currentParticipants: 0,
      waitlistEnabled: formData.waitlistEnabled || false,
      
      // Registration Settings
      isPrivate: formData.isPrivate || false,
      registrationTargetAudience: formData.registrationTargetAudience || [],
      
      // Pricing
      pricing: {
        regularPrice: formData.regularPrice || 0,
        memberPrice: formData.memberPrice || 0,
        alumniPrice: formData.alumniPrice || 0,
        earlyBirdPrice: formData.earlyBirdPrice || 0,
        committeePrice: formData.committeePrice || 0,
        earlyBirdDeadline: formData.earlyBirdDeadline ?? null,
        currency: 'RM',
      },
      isFree: formData.isFree || false,
      financialAccount: formData.financialAccount ?? null,
      
      // Organizers
      organizerId: formData.organizerId || currentUserId,
      organizerName: formData.organizerName || '',
      coOrganizers: formData.coOrganizers || [],
      contactPerson: formData.contactPerson ?? null,
      contactPhone: formData.contactPhone ?? null,
      contactEmail: formData.contactEmail ?? null,
      
      // Categories
      category: formData.category ?? null,
      tags: formData.tags || [],
      
      // Media
      coverImage: formData.coverImage ?? null,
      posterImage: formData.posterImage ?? null,
      images: formData.images || [],
      
      // Additional
      agenda: formData.agenda ?? null,
      requirements: formData.requirements ?? null,
      notes: formData.notes ?? null,
      agendaItems: (formData as any).agendaItems || [],
      committeeMembers: (formData as any).committeeMembers || [],
      speakers: (formData as any).speakers || [],
      
      // Timestamps
      createdAt: now,
      updatedAt: now,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    };
    
    const docRef = await addDoc(getEventsRef(), cleanUndefinedValues(eventData));
    return docRef.id;
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '创建活动失败',
      showNotification: true,
    });
    throw error;
  }
};

/**
 * Update existing event
 * 更新现有活动
 */
export const updateEvent = async (
  eventId: string,
  formData: Partial<EventFormData>,
  currentUserId: string
): Promise<void> => {
  try {
    const updateData: any = {
      updatedAt: Timestamp.now(),
      updatedBy: currentUserId,
    };
    
    // Only update provided fields
    if (formData.name !== undefined) updateData.name = formData.name;
    if (formData.description !== undefined) updateData.description = formData.description ?? null;
    if (formData.status !== undefined) updateData.status = formData.status;
    if (formData.level !== undefined) updateData.level = formData.level;
    if (formData.location !== undefined) updateData.location = formData.location ?? null;
    if (formData.isOnline !== undefined) updateData.isOnline = formData.isOnline;
    if (formData.category !== undefined) updateData.category = formData.category ?? null;
    if (formData.isPrivate !== undefined) updateData.isPrivate = formData.isPrivate;
    if (formData.registrationTargetAudience !== undefined) updateData.registrationTargetAudience = formData.registrationTargetAudience || [];
    if (formData.financialAccount !== undefined) updateData.financialAccount = formData.financialAccount ?? null;
    if (formData.coOrganizers !== undefined) updateData.coOrganizers = formData.coOrganizers || [];
    if (formData.posterImage !== undefined) updateData.posterImage = formData.posterImage ?? null;
    if ((formData as any).agendaItems !== undefined) updateData.agendaItems = (formData as any).agendaItems || [];
    if ((formData as any).committeeMembers !== undefined) updateData.committeeMembers = (formData as any).committeeMembers || [];
    if ((formData as any).speakers !== undefined) updateData.speakers = (formData as any).speakers || [];
    
    // Date fields
    if (formData.startDate !== undefined) {
      updateData.startDate = Timestamp.fromDate(new Date(formData.startDate));
    }
    if (formData.endDate !== undefined) {
      updateData.endDate = Timestamp.fromDate(new Date(formData.endDate));
    }
    if (formData.registrationStartDate !== undefined) {
      updateData.registrationStartDate = formData.registrationStartDate 
        ? Timestamp.fromDate(new Date(formData.registrationStartDate)) 
        : null;
    }
    if (formData.registrationDeadline !== undefined) {
      updateData.registrationDeadline = formData.registrationDeadline 
        ? Timestamp.fromDate(new Date(formData.registrationDeadline)) 
        : null;
    }
    
    // Pricing updates
    if (formData.regularPrice !== undefined || 
        formData.memberPrice !== undefined || 
        formData.alumniPrice !== undefined || 
        formData.earlyBirdPrice !== undefined || 
        formData.committeePrice !== undefined) {
      const currentEvent = await getEventById(eventId);
      if (currentEvent) {
        updateData.pricing = {
          ...currentEvent.pricing,
          ...(formData.regularPrice !== undefined && { regularPrice: formData.regularPrice }),
          ...(formData.memberPrice !== undefined && { memberPrice: formData.memberPrice }),
          ...(formData.alumniPrice !== undefined && { alumniPrice: formData.alumniPrice }),
          ...(formData.earlyBirdPrice !== undefined && { earlyBirdPrice: formData.earlyBirdPrice }),
          ...(formData.committeePrice !== undefined && { committeePrice: formData.committeePrice }),
        };
      }
    }
    
    await updateDoc(
      doc(db, GLOBAL_COLLECTIONS.EVENTS, eventId),
      cleanUndefinedValues(updateData)
    );
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '更新活动失败',
      showNotification: true,
    });
    throw error;
  }
};

/**
 * Delete event
 * 删除活动
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, GLOBAL_COLLECTIONS.EVENTS, eventId));
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '删除活动失败',
      showNotification: true,
    });
    throw error;
  }
};

// ========== Statistics ==========

/**
 * Get event statistics
 * 获取活动统计数据
 */
export const getEventStats = async (): Promise<EventStats> => {
  try {
    const querySnapshot = await getDocs(getEventsRef());
    const events = querySnapshot.docs.map(doc => convertToEvent(doc.id, doc.data()));
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    
    const stats: EventStats = {
      total: events.length,
      active: events.filter(e => e.status === 'Published').length,
      upcoming: events.filter(e => new Date(e.startDate) > now && e.status === 'Published').length,
      completed: events.filter(e => e.status === 'Completed').length,
      draft: events.filter(e => e.status === 'Draft').length,
      cancelled: events.filter(e => e.status === 'Cancelled').length,
      byLevel: {
        Local: events.filter(e => e.level === 'Local').length,
        Area: events.filter(e => e.level === 'Area').length,
        National: events.filter(e => e.level === 'National').length,
        JCI: events.filter(e => e.level === 'JCI').length,
      },
      thisMonth: events.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate >= thisMonthStart && eventDate < nextMonthStart;
      }).length,
      nextMonth: events.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate >= nextMonthStart && eventDate <= nextMonthEnd;
      }).length,
      totalRevenue: events.reduce((sum, e) => sum + (e.pricing.regularPrice || 0) * e.currentParticipants, 0),
      totalParticipants: events.reduce((sum, e) => sum + e.currentParticipants, 0),
    };
    
    return stats;
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '获取活动统计失败',
      showNotification: false,
    });
    throw error;
  }
};

// ========== Event Registrations ==========

/**
 * Get registrations for an event
 * 获取活动的报名记录
 */
export const getEventRegistrations = async (eventId: string): Promise<EventRegistration[]> => {
  try {
    const q = query(
      getEventRegistrationsRef(),
      where('eventId', '==', eventId),
      orderBy('registrationDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      registrationDate: safeTimestampToISO(doc.data().registrationDate),
      createdAt: safeTimestampToISO(doc.data().createdAt),
      updatedAt: safeTimestampToISO(doc.data().updatedAt),
    } as EventRegistration));
  } catch (error) {
    handleFirebaseError(error, {
      customMessage: '获取报名记录失败',
      showNotification: false,
    });
    throw error;
  }
};

console.log('✅ Event Service Loaded');

