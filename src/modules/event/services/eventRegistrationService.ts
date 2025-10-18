/**
 * Event Registration Service
 * 活动报名服务
 * 
 * 处理活动报名的CRUD操作，支持会员和非会员报名
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type { EventRegistration, RegistrationStatus, ParticipantType } from '../types';
import type { PaginatedResponse } from '@/types';

/**
 * Create Event Registration
 */
export const createEventRegistration = async (
  data: {
    eventId: string;
    eventName: string;
    participantName: string;
    participantEmail: string;
    participantPhone: string;
    participantType: ParticipantType;
    pricePaid: number;
    isMember: boolean;            // 是否为会员
    memberId?: string;            // 会员ID（如果是会员）
    dietaryRequirements?: string;
    specialNeeds?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
    notes?: string;
  },
  userId: string
): Promise<EventRegistration> => {
  try {
    const now = new Date().toISOString();
    
    const registration: Omit<EventRegistration, 'id'> = {
      eventId: data.eventId,
      eventName: data.eventName,
      participantId: data.memberId || `GUEST-${Date.now()}`,
      participantName: data.participantName,
      participantEmail: data.participantEmail,
      participantPhone: data.participantPhone,
      participantType: data.participantType,
      registrationDate: now,
      status: 'pending',
      pricePaid: data.pricePaid,
      paymentStatus: 'pending',
      dietaryRequirements: data.dietaryRequirements,
      specialNeeds: data.specialNeeds,
      emergencyContact: data.emergencyContact,
      checkedIn: false,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };
    
    const cleanData = cleanUndefinedValues(registration);
    
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.EVENT_REGISTRATIONS),
      cleanData
    );
    
    globalSystemService.log(
      'info',
      'Event registration created',
      'eventRegistrationService.createEventRegistration',
      { registrationId: docRef.id, eventId: data.eventId, participantName: data.participantName }
    );
    
    return {
      id: docRef.id,
      ...cleanData,
    } as EventRegistration;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to create event registration',
      'eventRegistrationService.createEventRegistration',
      { error: error.message, eventId: data.eventId }
    );
    throw error;
  }
};

/**
 * Get Event Registrations with Pagination
 */
export const getEventRegistrations = async (params: {
  eventId?: string;
  status?: RegistrationStatus;
  participantType?: ParticipantType;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<PaginatedResponse<EventRegistration>> => {
  try {
    const {
      eventId,
      status,
      participantType,
      search,
      page = 1,
      limit: pageLimit = 20,
      sortBy = 'registrationDate',
      sortOrder = 'desc',
    } = params;
    
    // Build query
    let q = query(collection(db, GLOBAL_COLLECTIONS.EVENT_REGISTRATIONS));
    
    if (eventId) {
      q = query(q, where('eventId', '==', eventId));
    }
    
    const snapshot = await getDocs(q);
    
    let registrations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      registrationDate: safeTimestampToISO(doc.data().registrationDate),
      createdAt: safeTimestampToISO(doc.data().createdAt),
      updatedAt: safeTimestampToISO(doc.data().updatedAt),
      approvedAt: doc.data().approvedAt ? safeTimestampToISO(doc.data().approvedAt) : undefined,
      checkInTime: doc.data().checkInTime ? safeTimestampToISO(doc.data().checkInTime) : undefined,
    })) as EventRegistration[];
    
    // Client-side filtering
    if (status) {
      registrations = registrations.filter(r => r.status === status);
    }
    
    if (participantType) {
      registrations = registrations.filter(r => r.participantType === participantType);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      registrations = registrations.filter(r =>
        r.participantName?.toLowerCase().includes(searchLower) ||
        r.participantEmail?.toLowerCase().includes(searchLower) ||
        r.participantPhone?.includes(search)
      );
    }
    
    // Sorting
    registrations.sort((a, b) => {
      const aValue = (a as any)[sortBy] || '';
      const bValue = (b as any)[sortBy] || '';
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Pagination
    const total = registrations.length;
    const startIndex = (page - 1) * pageLimit;
    const endIndex = startIndex + pageLimit;
    const paginatedData = registrations.slice(startIndex, endIndex);
    
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
      'Failed to get event registrations',
      'eventRegistrationService.getEventRegistrations',
      { error: error.message, params }
    );
    throw error;
  }
};

/**
 * Approve Registration
 */
export const approveRegistration = async (
  registrationId: string,
  userId: string
): Promise<void> => {
  try {
    const registrationRef = doc(db, GLOBAL_COLLECTIONS.EVENT_REGISTRATIONS, registrationId);
    
    await updateDoc(registrationRef, cleanUndefinedValues({
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    
    globalSystemService.log(
      'info',
      'Registration approved',
      'eventRegistrationService.approveRegistration',
      { registrationId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to approve registration',
      'eventRegistrationService.approveRegistration',
      { error: error.message, registrationId }
    );
    throw error;
  }
};

/**
 * Reject Registration
 */
export const rejectRegistration = async (
  registrationId: string,
  reason: string,
  userId: string
): Promise<void> => {
  try {
    const registrationRef = doc(db, GLOBAL_COLLECTIONS.EVENT_REGISTRATIONS, registrationId);
    
    await updateDoc(registrationRef, cleanUndefinedValues({
      status: 'rejected',
      rejectionReason: reason,
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    
    globalSystemService.log(
      'info',
      'Registration rejected',
      'eventRegistrationService.rejectRegistration',
      { registrationId, userId, reason }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to reject registration',
      'eventRegistrationService.rejectRegistration',
      { error: error.message, registrationId }
    );
    throw error;
  }
};

/**
 * Check-in Participant
 */
export const checkInParticipant = async (
  registrationId: string,
  userId: string
): Promise<void> => {
  try {
    const registrationRef = doc(db, GLOBAL_COLLECTIONS.EVENT_REGISTRATIONS, registrationId);
    
    await updateDoc(registrationRef, cleanUndefinedValues({
      checkedIn: true,
      checkInTime: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }));
    
    globalSystemService.log(
      'info',
      'Participant checked in',
      'eventRegistrationService.checkInParticipant',
      { registrationId, userId }
    );
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to check in participant',
      'eventRegistrationService.checkInParticipant',
      { error: error.message, registrationId }
    );
    throw error;
  }
};

/**
 * Get Registration Statistics for an Event
 */
export const getRegistrationStatistics = async (
  eventId: string
): Promise<{
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
  checkedIn: number;
  byParticipantType: Record<ParticipantType, number>;
  totalRevenue: number;
}> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.EVENT_REGISTRATIONS),
      where('eventId', '==', eventId)
    );
    
    const snapshot = await getDocs(q);
    
    const stats = {
      total: snapshot.size,
      approved: 0,
      pending: 0,
      rejected: 0,
      cancelled: 0,
      checkedIn: 0,
      byParticipantType: {} as Record<ParticipantType, number>,
      totalRevenue: 0,
    };
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Count by status
      if (data.status === 'approved') stats.approved++;
      if (data.status === 'pending') stats.pending++;
      if (data.status === 'rejected') stats.rejected++;
      if (data.status === 'cancelled') stats.cancelled++;
      
      // Count check-ins
      if (data.checkedIn) stats.checkedIn++;
      
      // Count by participant type
      const pType = data.participantType as ParticipantType;
      stats.byParticipantType[pType] = (stats.byParticipantType[pType] || 0) + 1;
      
      // Calculate revenue (only from approved registrations)
      if (data.status === 'approved' && data.paymentStatus === 'completed') {
        stats.totalRevenue += data.pricePaid || 0;
      }
    });
    
    return stats;
  } catch (error: any) {
    globalSystemService.log(
      'error',
      'Failed to get registration statistics',
      'eventRegistrationService.getRegistrationStatistics',
      { error: error.message, eventId }
    );
    throw error;
  }
};

console.log('✅ Event Registration Service Loaded');

