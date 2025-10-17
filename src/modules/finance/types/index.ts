/**
 * Finance Module Type Definitions
 * 财务模块类型定义
 */

import type { MemberCategoryType } from '@/modules/member/types';

// ========== Transaction Types (交易类型) ==========

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'rejected';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online_payment' | 'other';

export interface Transaction {
  id: string;
  transactionNumber: string; // Format: TXN-YYYY-XXXX-NNNN
  bankAccountId: string;
  transactionDate: string; // ISO 8601
  transactionType: TransactionType; // 'income' or 'expense'
  mainDescription: string; // Required
  subDescription?: string;
  amount: number; // Transaction amount (always positive, ≥ 0)
  
  // ⚠️ DEPRECATED: Will be removed after migration
  expense?: number; // Legacy field - use amount + transactionType instead
  income?: number;  // Legacy field - use amount + transactionType instead
  
  payerPayee?: string; // 付款人/收款人
  transactionPurpose?: string; // Purpose ID
  transactionPurposeDetails?: TransactionPurpose;
  projectAccountId?: string;
  category?: string;
  subCategory?: string; // 二次分类（用于会员费、活动财务、日常账户的细分）
  paymentMethod?: PaymentMethod;
  status: TransactionStatus;
  inputBy: string; // User ID
  inputByName?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  attachments?: string[];
  fiscalYear?: string; // FY2024
  receiptNumber?: string;
  invoiceNumber?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  
  // 🆕 Split Transaction Fields (拆分交易字段)
  isSplit?: boolean;              // 是否已拆分（父交易标记）
  splitCount?: number;            // 子交易数量
  parentTransactionId?: string;   // 父交易ID（子交易标记）
  isVirtual?: boolean;            // 是否为虚拟交易（子交易不影响银行余额）
  allocatedAmount?: number;       // 已分配金额（父交易字段）
  unallocatedAmount?: number;     // 未分配金额（父交易字段）
  
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFormData {
  bankAccountId: string;
  transactionDate: Date | string;
  transactionType: TransactionType;
  mainDescription: string;
  subDescription?: string;
  amount: number;
  payerPayee?: string;
  transactionPurpose?: string;
  projectAccountId?: string;
  category?: string;
  subCategory?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  attachments?: string[];
  receiptNumber?: string;
  invoiceNumber?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// 🆕 Split Transaction Types (拆分交易类型)
export interface SplitTransactionItem {
  amount: number;
  category?: string;
  notes?: string;
}

export interface SplitTransactionParams {
  transactionId: string;
  splits: SplitTransactionItem[];
  userId: string;
}

export interface SplitTransactionResult {
  parentTransaction: Transaction;
  childTransactions: Transaction[];
  unallocatedTransaction?: Transaction;
}

// ========== Transaction Purpose (交易用途) ==========

export interface TransactionPurpose {
  id: string;
  name: string;
  nameEn?: string;
  nameCn?: string;
  code: string;
  level: number; // 0 = Main, 1 = Business, 2 = Specific
  parentId?: string;
  type: 'income' | 'expense' | 'both';
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ========== Bank Account (银行账户) ==========

export type BankAccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'other';
export type BankAccountStatus = 'active' | 'inactive' | 'closed';

export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  accountType: BankAccountType;
  currency: string; // Default: MYR
  // balance字段已移除 - 使用实时计算的累计余额代替
  initialBalance: number;
  status: BankAccountStatus;
  description?: string;
  isDefault: boolean;
  lastTransactionDate?: string;
  lastReconciliationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountFormData {
  accountName: string;
  accountNumber: string;
  bankName: string;
  accountType: BankAccountType;
  currency: string;
  initialBalance: number;
  status: BankAccountStatus;
  description?: string;
  isDefault: boolean;
}

// ========== Budget (预算) ==========

export type BudgetStatus = 'draft' | 'active' | 'closed' | 'archived';
export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly' | 'fiscal_year';

export interface Budget {
  id: string;
  name: string;
  fiscalYear: string; // FY2024
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  categories: BudgetCategory[];
  status: BudgetStatus;
  description?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  categoryName: string;
  categoryCode: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  transactionPurposeIds?: string[];
  description?: string;
  notes?: string;
}

export interface BudgetFormData {
  name: string;
  fiscalYear: string;
  period: BudgetPeriod;
  startDate: Date | string;
  endDate: Date | string;
  totalBudget: number;
  categories: BudgetCategory[];
  status: BudgetStatus;
  description?: string;
  notes?: string;
}

// ========== Fiscal Year (财年) ==========

export type FiscalYearStatus = 'draft' | 'active' | 'closed' | 'archived';

export interface FiscalYear {
  id: string;
  name: string; // FY2024
  year: number; // 2024
  startDate: string; // 2024-10-01
  endDate: string; // 2025-09-30
  status: FiscalYearStatus;
  isDefault: boolean;
  description?: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  budgetTotal?: number;
  notes?: string;
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalYearFormData {
  name: string;
  year: number;
  startDate: Date | string;
  endDate: Date | string;
  status: FiscalYearStatus;
  isDefault: boolean;
  description?: string;
  notes?: string;
}

// ========== Member Fee (会员费用) ==========

export type MemberFeeStatus = 'unpaid' | 'paid' | 'partial' | 'overdue' | 'waived' | 'cancelled';
export type MemberFeeType = 'new_member' | 'renewal' | 'upgrade' | 'late_fee' | 'penalty' | 'other';

export interface MemberFee {
  id: string;
  memberId: string;
  memberName?: string;
  memberEmail?: string;
  memberCategory?: MemberCategoryType;
  fiscalYear: string;
  feeType: MemberFeeType;
  expectedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  paymentDate?: string;
  status: MemberFeeStatus;
  transactionId?: string;
  paymentMethod?: PaymentMethod;
  receiptNumber?: string;
  notes?: string;
  remindersSent: number;
  lastReminderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberFeeFormData {
  memberId: string;
  fiscalYear: string;
  feeType: MemberFeeType;
  expectedAmount: number;
  dueDate: Date | string;
  notes?: string;
}

// ========== Event (活动) ==========

export type BoardMemberRole = 
  | 'president'
  | 'secretary'
  | 'honorary-treasurer'
  | 'general-legal-council'
  | 'executive-vp'
  | 'vp-individual'
  | 'vp-community'
  | 'vp-business'
  | 'vp-international'
  | 'vp-lom'
  | 'immediate-past-president';

export interface FinanceEvent {
  id: string;
  eventName: string;
  eventDate?: string;
  description?: string;
  boardMember: BoardMemberRole; // 活动负责理事
  eventChair?: string; // 🆕 活动主席
  eventTreasurer?: string; // 🆕 活动财政
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Event Financial (活动财务) ==========

export interface EventFinancial {
  id: string;
  eventId: string;
  eventName?: string;
  eventDate?: string;
  organizerId?: string;
  organizerName?: string;
  fiscalYear?: string;
  
  // Revenue (收入)
  ticketRevenue: number;
  sponsorshipRevenue: number;
  donationRevenue: number;
  merchandiseRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  
  // Budget (预算)
  budgetedRevenue: number;
  budgetedExpense: number;
  totalBudget: number;
  
  // Expenses (支出)
  venueExpense: number;
  cateringExpense: number;
  marketingExpense: number;
  equipmentExpense: number;
  staffExpense: number;
  otherExpense: number;
  totalExpense: number;
  
  // Summary (汇总)
  netIncome: number;
  profitMargin: number; // Percentage
  revenueVsBudget: number; // Percentage
  expenseVsBudget: number; // Percentage
  
  // Payments (付款)
  outstandingPayments: number;
  pendingRefunds: number;
  
  status: 'draft' | 'active' | 'completed' | 'reconciled';
  notes?: string;
  reconciliationDate?: string;
  reconciledBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Project Account (项目账户) ==========

export type ProjectAccountStatus = 'active' | 'inactive' | 'closed' | 'completed';

export interface ProjectAccount {
  id: string;
  projectCode: string;
  projectName: string;
  fiscalYear: string;
  startDate: string;
  endDate?: string;
  totalBudget: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  status: ProjectAccountStatus;
  managerId?: string;
  managerName?: string;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Financial Statistics (财务统计) ==========

export interface FinancialStatistics {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  
  memberFeesCollected: number;
  memberFeesOutstanding: number;
  memberFeesTotal: number;
  
  eventRevenue: number;
  eventExpense: number;
  eventNetIncome: number;
  
  generalOperationIncome: number;
  generalOperationExpense: number;
  
  pendingTransactions: number;
  pendingAmount: number;
  
  upcomingObligations: number;
  
  transactionCount: number;
  
  fiscalYear: string;
  periodStart: string;
  periodEnd: string;
  
  lastUpdated: string;
}

// ========== Query & Filter Types ==========

export interface TransactionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  bankAccountId?: string;
  transactionType?: TransactionType;
  status?: TransactionStatus;
  category?: string;
  subCategory?: string;
  fiscalYear?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
  sortBy?: 'transactionDate' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  includeVirtual?: boolean; // 是否包含虚拟交易（子交易），默认 true
  parentTransactionId?: string; // 查询特定父交易的子交易
}

export interface BudgetQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  fiscalYear?: string;
  status?: BudgetStatus;
  period?: BudgetPeriod;
  sortBy?: 'name' | 'startDate' | 'totalBudget';
  sortOrder?: 'asc' | 'desc';
}

export interface MemberFeeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  fiscalYear?: string;
  status?: MemberFeeStatus;
  feeType?: MemberFeeType;
  memberCategory?: MemberCategoryType;
  overdue?: boolean;
  sortBy?: 'dueDate' | 'expectedAmount' | 'memberName';
  sortOrder?: 'asc' | 'desc';
}

// ========== Dashboard & Reports ==========

export interface FinancialDashboardData {
  statistics: FinancialStatistics;
  recentTransactions: Transaction[];
  budgetOverview: Budget[];
  memberFeesSummary: {
    total: number;
    collected: number;
    outstanding: number;
    overdue: number;
  };
  eventFinancialSummary: {
    totalRevenue: number;
    totalExpense: number;
    netIncome: number;
    eventCount: number;
  };
  cashFlowData: CashFlowData[];
  topExpenseCategories: CategorySummary[];
  topIncomeCategories: CategorySummary[];
}

export interface CashFlowData {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategorySummary {
  categoryName: string;
  categoryCode: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

// ========== Export Types ==========

export interface FinancialReportParams {
  reportType: 'transactions' | 'budget' | 'member_fees' | 'event_financial' | 'balance_sheet' | 'income_statement' | 'cash_flow';
  fiscalYear?: string;
  startDate?: string;
  endDate?: string;
  format: 'pdf' | 'excel' | 'csv';
  includeDetails?: boolean;
  groupBy?: 'date' | 'category' | 'account' | 'project';
}

console.log('✅ Finance Module Types Loaded');

