/**
 * Event Module Type Definitions
 * 活动模块类型定义
 */

import { BaseEntity, SelectOption } from '@/types';

// ========== Event Status ==========
export type EventStatus = 'Draft' | 'Published' | 'Cancelled' | 'Completed';

// ========== Event Level ==========
export type EventLevel = 'Local' | 'Area' | 'National' | 'JCI';

// ========== Participant Type ==========
export type ParticipantType = 
  | 'Regular'         // 访客 (Guest)
  | 'Member'          // JCI 会员
  | 'Alumni'          // 校友
  | 'EarlyBird'       // 早鸟
  | 'Committee';      // 委员会成员（免费）

// ========== Registration Status ==========
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// ========== Event Agenda Item ==========
export interface EventAgendaItem {
  id: string;
  sequence: number;           // 序号
  startTime: string;           // 开始时间
  duration: number;           // 时长(分钟)
  content: string;             // 程序内容
  host?: string;              // 主持人
  maxSeats?: number;          // 最大座位数
  requiresRegistration: boolean; // 需要注册
  isCompetition: boolean;     // 竞赛项目
}

// ========== Committee Member ==========
export interface CommitteeMember {
  id: string;
  name: string;               // 姓名
  position: string;           // 职位
  contact?: string;           // 联系方式
  email?: string;             // 邮箱
  canEditEvent: boolean;      // 活动编辑权限
  canApproveTickets: boolean; // 票务批准权限
}

// ========== Speaker ==========
export interface Speaker {
  id: string;
  name: string;               // 姓名
  title?: string;             // 职位/头衔
  bio?: string;               // 简介
  photo?: string;             // 照片
  contact?: string;           // 联系方式
  email?: string;             // 邮箱
}

// ========== Event Pricing ==========
export interface EventPricing {
  regularPrice: number;        // Guest price (highest)
  memberPrice: number;         // JCI members (~30% off)
  alumniPrice: number;         // Alumni (~20% off)
  earlyBirdPrice: number;      // Limited time
  committeePrice: number;      // Committee members (usually 0)
  earlyBirdDeadline?: string;  // ISO 8601 format
  currency: string;            // Default: "RM"
}

// ========== Event ==========
export interface Event extends BaseEntity {
  // Basic Info
  name: string;
  description?: string;
  eventCode?: string;          // Unique event code
  
  // Status & Level
  status: EventStatus;
  level: EventLevel;
  
  // Date & Time
  startDate: string;           // ISO 8601 format
  endDate: string;             // ISO 8601 format
  registrationStartDate?: string; // 报名开始时间
  registrationDeadline?: string;
  
  // Location
  location?: string;
  address?: string;
  venue?: string;
  isOnline: boolean;
  onlineLink?: string;
  
  // Capacity
  maxParticipants?: number;
  currentParticipants: number;
  waitlistEnabled: boolean;
  
  // Registration Settings
  isPrivate: boolean;          // 私人活动
  registrationTargetAudience?: string[]; // 注册开放对象
  
  // Pricing (4-tier system)
  pricing: EventPricing;
  isFree: boolean;
  financialAccount?: string;   // 项目财务户口匹配
  
  // Organizers & Contacts
  organizerId: string;
  organizerName: string;
  coOrganizers?: string[];     // 协办组织
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  // Categories & Tags
  category?: string;           // e.g., 'Conference', 'Workshop', 'Networking'
  tags?: string[];
  
  // Media
  coverImage?: string;
  posterImage?: string;        // 活动海报
  images?: string[];
  
  // Additional Info
  agenda?: string;
  requirements?: string;
  notes?: string;
  
  // People
  agendaItems?: EventAgendaItem[];  // 议程项目
  committeeMembers?: CommitteeMember[]; // 委员会成员
  speakers?: Speaker[];             // 讲师信息
  
  // Metadata
  createdBy?: string;
  updatedBy?: string;
}

// ========== Event Registration ==========
export interface EventRegistration extends BaseEntity {
  eventId: string;
  eventName: string;
  
  // Participant Info
  participantId: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  participantType: ParticipantType;
  
  // Registration Details
  registrationDate: string;
  status: RegistrationStatus;
  
  // Payment Info
  pricePaid: number;
  paymentStatus: 'pending' | 'completed' | 'refunded';
  paymentMethod?: string;
  transactionId?: string;
  
  // Additional Info
  dietaryRequirements?: string;
  specialNeeds?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  
  // Check-in
  checkedIn: boolean;
  checkInTime?: string;
  
  // Notes
  notes?: string;
  
  // Approval
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Metadata
  createdBy?: string;
  updatedBy?: string;
}

// ========== Event Participant ==========
export interface EventParticipant extends BaseEntity {
  eventId: string;
  memberId: string;
  memberName: string;
  role?: string;              // e.g., 'Speaker', 'Volunteer', 'Committee'
  participatedAt: string;
  hours?: number;             // Participation hours for awards
  notes?: string;
}

// ========== Event Statistics ==========
export interface EventStats {
  total: number;
  active: number;            // Published events
  upcoming: number;          // Future events
  completed: number;         // Past events
  draft: number;
  cancelled: number;
  byLevel: {
    [key in EventLevel]?: number;
  };
  thisMonth: number;
  nextMonth: number;
  totalRevenue: number;
  totalParticipants: number;
}

// ========== Form Types ==========
export interface EventFormData {
  // Basic Info
  name: string;
  description?: string;
  eventCode?: string;
  
  // Status & Level
  status?: EventStatus;
  level?: EventLevel;
  
  // Date & Time
  startDate?: string;
  endDate?: string;
  registrationStartDate?: string; // 报名开始时间
  registrationDeadline?: string;
  
  // Location
  location?: string;
  address?: string;
  venue?: string;
  isOnline?: boolean;
  onlineLink?: string;
  
  // Capacity
  maxParticipants?: number;
  waitlistEnabled?: boolean;
  
  // Registration Settings
  isPrivate?: boolean;         // 私人活动
  registrationTargetAudience?: string[]; // 注册开放对象
  
  // Pricing
  regularPrice?: number;
  memberPrice?: number;
  alumniPrice?: number;
  earlyBirdPrice?: number;
  committeePrice?: number;
  earlyBirdDeadline?: string;
  isFree?: boolean;
  financialAccount?: string;   // 项目财务户口匹配
  
  // Organizers
  organizerId?: string;
  organizerName?: string;
  coOrganizers?: string[];     // 协办组织
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  // Categories
  category?: string;
  tags?: string[];
  
  // Media
  coverImage?: string;
  posterImage?: string;        // 活动海报
  images?: string[];
  
  // Additional
  agenda?: string;
  requirements?: string;
  notes?: string;
  
  // People
  agendaItems?: EventAgendaItem[];  // 议程项目
  committeeMembers?: CommitteeMember[]; // 委员会成员
  speakers?: Speaker[];             // 讲师信息
}

// ========== Search & Filter ==========
export interface EventSearchParams {
  search?: string;              // Search by name, description, location
  status?: EventStatus;
  level?: EventLevel;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  isOnline?: boolean;
  isFree?: boolean;
  upcoming?: boolean;           // Only show future events
  active?: boolean;             // Only show published events
}

// ========== Constants ==========
export const EVENT_STATUS_OPTIONS: SelectOption[] = [
  { label: '草稿', value: 'Draft' },
  { label: '已发布', value: 'Published' },
  { label: '已取消', value: 'Cancelled' },
  { label: '已完成', value: 'Completed' },
];

export const EVENT_LEVEL_OPTIONS: SelectOption[] = [
  { label: '本地', value: 'Local' },
  { label: '区域', value: 'Area' },
  { label: '国家级', value: 'National' },
  { label: 'JCI', value: 'JCI' },
];

export const PARTICIPANT_TYPE_OPTIONS: SelectOption[] = [
  { label: '访客', value: 'Regular' },
  { label: 'JCI会员', value: 'Member' },
  { label: '校友', value: 'Alumni' },
  { label: '早鸟', value: 'EarlyBird' },
  { label: '委员会成员', value: 'Committee' },
];

export const REGISTRATION_STATUS_OPTIONS: SelectOption[] = [
  { label: '待审核', value: 'pending' },
  { label: '已批准', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已取消', value: 'cancelled' },
];

export const EVENT_CATEGORY_OPTIONS: SelectOption[] = [
  { label: '会议', value: 'Conference' },
  { label: '研讨会', value: 'Workshop' },
  { label: '培训', value: 'Training' },
  { label: '网络活动', value: 'Networking' },
  { label: '社区服务', value: 'Community Service' },
  { label: '社交活动', value: 'Social' },
  { label: '其他', value: 'Other' },
];

export const REGISTRATION_TARGET_AUDIENCE_OPTIONS: SelectOption[] = [
  { label: 'JCI会员', value: 'JCI_Members' },
  { label: '校友', value: 'Alumni' },
  { label: '访客', value: 'Guests' },
  { label: '委员会成员', value: 'Committee' },
  { label: '合作伙伴', value: 'Partners' },
  { label: '公众', value: 'Public' },
];

console.log('✅ Event Types Loaded');

