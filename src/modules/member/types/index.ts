/**
 * Member Module Type Definitions
 * 会员模块类型定义
 */

import { BaseEntity, Status, SelectOption } from '@/types';

// ========== Member Status ==========
export type MemberStatus = Status;

// ========== Member Level ==========
export type MemberLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// ========== Member Category ==========
export type MemberCategoryType = 
  | 'Official Member'      // 正式会员
  | 'Associate Member'     // 准会员
  | 'Honorary Member'      // 荣誉会员
  | 'Visiting Member'      // 访问会员
  | 'Alumni'               // 校友
  | 'JCI Friend';          // 青商好友

// ========== Industry Types ==========
export type IndustryType =
  | 'Advertising, Marketing & Media'
  | 'Agriculture & Animals'
  | 'Architecture, Engineering & Construction'
  | 'Art, Entertainment & Design'
  | 'Automotive & Accessories'
  | 'Food & Beverages'
  | 'Computers & IT'
  | 'Consulting & Professional Services'
  | 'Education & Training'
  | 'Event & Hospitality'
  | 'Finance & Insurance'
  | 'Health, Wellness & Beauty'
  | 'Legal & Accounting'
  | 'Manufacturing'
  | 'Retail & E-Commerce'
  | 'Real Estate & Property Services'
  | 'Repair Services'
  | 'Security & Investigation'
  | 'Transport & Logistics'
  | 'Travel & Tourism'
  | 'Other';

// ========== Business Category ==========
export type BusinessCategory =
  | 'Distributor'
  | 'Manufacturer'
  | 'Retailer / E-commerce'
  | 'Service Provider';

// ========== Gender ==========
export type Gender = 'Male' | 'Female';

// ========== Member Profile ==========
export interface MemberProfile {
  // Basic Info
  avatar?: string;
  birthDate?: string;           // Format: dd-mmm-yyyy
  gender?: Gender;
  nationality?: string;
  nric?: string;                // National ID
  
  // Contact Info
  alternativePhone?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  
  // Address
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  
  // Social Media
  socialMedia?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    wechat?: string;
  };
  
  // Career & Business
  company?: string;
  departmentAndPosition?: string;
  industryDetail?: string;
  companyIntro?: string;
  ownIndustry?: IndustryType[];
  interestedIndustries?: IndustryType[];
  businessCategories?: BusinessCategory[];
  acceptInternationalBusiness?: 'Yes' | 'No' | 'Willing to explore';
  
  // JCI Specific
  jciPosition?: string;
  senatorId?: string;
  senatorScore?: number;
  introducerId?: string;        // Who introduced this member
  introducerName?: string;
  
  // Career Development
  fiveYearsVision?: string;
  activeMemberHow?: string;
  
  // Permissions & Roles
  effectivePermissions?: string[];
  roleBindings?: Array<{
    roleId: string;
    roleName: string;
    assignedAt: string;
    assignedBy: string;
  }>;
  
  // Activity & Tasks
  taskCompletions?: Array<{
    taskId: string;
    taskName: string;
    completedAt: string;
    verifiedBy?: string;
  }>;
  
  activityParticipation?: Array<{
    eventId: string;
    eventName: string;
    participatedAt: string;
    role?: string;
  }>;
}

// ========== Member ==========
export interface Member extends BaseEntity {
  // Core Identity
  email: string;
  name: string;
  phone: string;
  memberId: string;              // Unique member ID
  
  // Status & Level
  status: MemberStatus;
  level: MemberLevel;
  accountType?: string;
  category?: MemberCategoryType;
  
  // Organization Hierarchy (5 levels)
  worldRegion?: string;
  country?: string;
  countryRegion?: string;         // National region
  chapter?: string;               // Local chapter name
  chapterId?: string;             // Local chapter ID
  
  // Profile
  profile: MemberProfile;
  
  // Dates
  joinDate: string;               // ISO 8601 format
  renewalDate?: string;           // Next renewal date
  expiryDate?: string;            // Membership expiry
  
  // Metadata
  createdBy?: string;
  updatedBy?: string;
}

// ========== Member Category ==========
export interface MemberCategory extends BaseEntity {
  name: MemberCategoryType;
  displayName: string;
  description?: string;
  
  // Fee Structure
  fees: {
    newMemberFee: number;         // RM
    renewalFee: number;           // RM
  };
  
  // Requirements
  requirements: {
    eventsRequired: number;
    coursesRequired?: number;
    rolesRequired?: number;
    description?: string;
  };
  
  // Status
  status: 'active' | 'inactive';
  priority: number;               // Display order
  
  // Color & Icon
  color?: string;                 // Badge color
  icon?: string;                  // Icon name
}

// ========== Member Position ==========
export interface MemberPosition extends BaseEntity {
  name: string;
  displayName: string;
  description?: string;
  level: 'Chapter' | 'National' | 'Area' | 'World';
  
  // Permissions
  permissionIds?: string[];
  
  // Status
  status: 'active' | 'inactive';
  priority: number;
}

// ========== Member Recruitment ==========
export interface MemberRecruitment extends BaseEntity {
  introducerId: string;           // Who recruited
  introducerName: string;
  newMemberId: string;            // Who was recruited
  newMemberName: string;
  recruitmentDate: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
}

// ========== Member Statistics ==========
export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
  byCategory: {
    [key in MemberCategoryType]?: number;
  };
  byLevel: {
    [key in MemberLevel]?: number;
  };
  newThisMonth: number;
  expiringThisMonth: number;
}

// ========== Form Types ==========
export interface MemberFormData {
  // Basic Info
  name: string;
  email: string;
  phone: string;
  memberId?: string;
  
  // Category & Status
  category?: MemberCategoryType;
  status?: MemberStatus;
  level?: MemberLevel;
  
  // Organization
  chapter?: string;
  chapterId?: string;
  
  // Profile
  avatar?: string;
  birthDate?: string;
  gender?: Gender;
  company?: string;
  departmentAndPosition?: string;
  
  // Dates
  joinDate?: string;
}

// ========== Search & Filter ==========
export interface MemberSearchParams {
  search?: string;              // Search by name, email, phone
  status?: MemberStatus;
  category?: MemberCategoryType;
  level?: MemberLevel;
  chapter?: string;
  dateFrom?: string;
  dateTo?: string;
  newThisMonth?: boolean;       // Filter for new members this month
  expiringThisMonth?: boolean;  // Filter for expiring members this month
}

// ========== Constants ==========
export const MEMBER_STATUS_OPTIONS: SelectOption[] = [
  { label: '活跃', value: 'active' },
  { label: '未激活', value: 'inactive' },
  { label: '待审核', value: 'pending' },
  { label: '已暂停', value: 'suspended' },
];

export const MEMBER_LEVEL_OPTIONS: SelectOption[] = [
  { label: '铜级', value: 'bronze' },
  { label: '银级', value: 'silver' },
  { label: '金级', value: 'gold' },
  { label: '铂金级', value: 'platinum' },
  { label: '钻石级', value: 'diamond' },
];

export const MEMBER_CATEGORY_OPTIONS: SelectOption[] = [
  { label: '正式会员', value: 'Official Member' },
  { label: '准会员', value: 'Associate Member' },
  { label: '荣誉会员', value: 'Honorary Member' },
  { label: '访问会员', value: 'Visiting Member' },
  { label: '校友', value: 'Alumni' },
  { label: '青商好友', value: 'JCI Friend' },
];

export const GENDER_OPTIONS: SelectOption[] = [
  { label: '男', value: 'Male' },
  { label: '女', value: 'Female' },
];

export const INDUSTRY_OPTIONS: SelectOption[] = [
  { label: '广告、营销与媒体', value: 'Advertising, Marketing & Media' },
  { label: '农业与动物', value: 'Agriculture & Animals' },
  { label: '建筑、工程与施工', value: 'Architecture, Engineering & Construction' },
  { label: '艺术、娱乐与设计', value: 'Art, Entertainment & Design' },
  { label: '汽车与配件', value: 'Automotive & Accessories' },
  { label: '食品与饮料', value: 'Food & Beverages' },
  { label: '计算机与IT', value: 'Computers & IT' },
  { label: '咨询与专业服务', value: 'Consulting & Professional Services' },
  { label: '教育与培训', value: 'Education & Training' },
  { label: '活动与酒店业', value: 'Event & Hospitality' },
  { label: '金融与保险', value: 'Finance & Insurance' },
  { label: '健康、养生与美容', value: 'Health, Wellness & Beauty' },
  { label: '法律与会计', value: 'Legal & Accounting' },
  { label: '制造业', value: 'Manufacturing' },
  { label: '零售与电商', value: 'Retail & E-Commerce' },
  { label: '房地产与物业服务', value: 'Real Estate & Property Services' },
  { label: '维修服务', value: 'Repair Services' },
  { label: '安全与调查', value: 'Security & Investigation' },
  { label: '运输与物流', value: 'Transport & Logistics' },
  { label: '旅游与观光', value: 'Travel & Tourism' },
  { label: '其他', value: 'Other' },
];

export const BUSINESS_CATEGORY_OPTIONS: SelectOption[] = [
  { label: '经销商', value: 'Distributor' },
  { label: '制造商', value: 'Manufacturer' },
  { label: '零售商/电商', value: 'Retailer / E-commerce' },
  { label: '服务提供商', value: 'Service Provider' },
];

console.log('✅ Member Types Loaded');

