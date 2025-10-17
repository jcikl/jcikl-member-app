/**
 * Common Type Definitions
 * 通用类型定义
 */

import { Timestamp } from 'firebase/firestore';

// ========== User & Auth Types ==========
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
}

// ========== Common Types ==========
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ========== Status Types ==========
export type Status = 'active' | 'inactive' | 'pending' | 'suspended';

export type MemberStatus = Status;
export type EventStatus = 'Draft' | 'Published' | 'Cancelled' | 'Completed';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

// ========== Permission Types ==========
export type PermissionModule =
  | 'MEMBER_MANAGEMENT'
  | 'EVENT_MANAGEMENT'
  | 'FINANCE_MANAGEMENT'
  | 'BILL_PAYMENT'
  | 'PROFILE_MANAGEMENT'
  | 'SYSTEM_ADMIN'
  | 'AWARDS_MANAGEMENT'
  | 'SURVEY_MANAGEMENT'
  | 'RBAC_MANAGEMENT';

export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE' | 'APPROVE';

export interface Permission {
  id: string;
  module: PermissionModule;
  action: PermissionAction;
  description?: string;
}

// ========== Breadcrumb Type ==========
export interface BreadcrumbItem {
  title: string;
  path?: string;
}

// ========== Firebase Timestamp Helper ==========
export type FirestoreTimestamp = Timestamp;

// ========== Form Types ==========
export interface FormFieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: FormFieldError[];
}

// ========== Date Range ==========
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

// ========== File Upload ==========
export interface UploadFile {
  uid: string;
  name: string;
  url?: string;
  status?: 'uploading' | 'done' | 'error';
  size?: number;
  type?: string;
}

// ========== Select Option ==========
export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

console.log('✅ Common Types Loaded');


