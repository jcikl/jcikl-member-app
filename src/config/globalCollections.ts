/**
 * Global Collections Configuration
 * 全局 Firestore 集合 ID 配置
 * 
 * ⚠️ CRITICAL: NEVER use hardcoded collection names in code
 * ✅ ALWAYS use GLOBAL_COLLECTIONS.* constants
 */

export const GLOBAL_COLLECTIONS = {
  // ========== Member Domain (会员域) ==========
  MEMBERS: 'members',
  MEMBER_POSITIONS: 'memberPositions',
  MEMBER_CATEGORIES: 'memberCategories',
  MEMBER_RECRUITMENT: 'memberRecruitment',
  RECRUITMENT_STATS: 'recruitmentStats',

  // ========== Finance Domain (财务域) ==========
  TRANSACTIONS: 'transactions',
  TRANSACTIONS_PROJECT: 'transactionsProject',
  BANK_ACCOUNTS: 'bankAccounts',
  TRANSACTION_PURPOSES: 'transactionPurposes',
  TRANSACTION_SPLITS: 'transactionSplits',
  BILL_PAYMENTS: 'billPayments',
  PAYMENT_REQUESTS: 'paymentRequests',
  PAYMENT_VOUCHERS: 'paymentVouchers',
  FINANCIAL_RECORDS: 'financialRecords',
  BUDGETS: 'budgets',
  BUDGET_CATEGORIES: 'budgetCategories',
  PROJECT_ACCOUNTS: 'projectAccounts',
  FISCAL_YEARS: 'fiscalYears',
  FINANCE_EVENTS: 'financeEvents', // 活动管理（用于活动财务分类）

  // ========== Event Domain (活动域) ==========
  EVENTS: 'events',
  EVENT_REGISTRATIONS: 'eventRegistrations',
  EVENT_PARTICIPANTS: 'eventParticipants',
  EVENT_ACCOUNTS: 'eventAccounts', // 活动专用财务账户
  EVENT_ACCOUNT_TRANSACTIONS: 'eventAccountTransactions', // 活动账户交易记录

  // ========== Permission Domain (权限域 - RBAC) ==========
  RBAC_PERMISSIONS: 'rbacPermissions',
  RBAC_ROLES: 'rbacRoles',
  RBAC_ROLE_BINDINGS: 'rbacRoleBindings',
  RBAC_PERMISSION_MATRIX: 'rbacPermissionMatrix',

  // ========== Survey Domain (问卷域) ==========
  SURVEYS: 'surveys',
  SURVEY_RESPONSES: 'surveyResponses',
  SURVEY_ANALYTICS: 'surveyAnalytics',

  // ========== Award Domain (奖项域) ==========
  AWARDS: 'awards',
  AWARD_SCORES: 'awardScores',
  AWARD_INDICATORS: 'awardIndicators',
  INDICATOR_COMPLETIONS: 'indicatorCompletions',
  ACTIVITY_PARTICIPATIONS: 'activityParticipations',

  // ========== Image Domain (图片域) ==========
  IMAGE_FOLDERS: 'imageFolders',
  IMAGE_METADATA: 'imageMetadata',

  // ========== System Domain (系统域) ==========
  GLOBAL_SETTINGS: 'globalSettings',
  SETTING_CHANGE_LOGS: 'settingChangeLogs',
  CHAPTER_SETTINGS: 'chapterSettings',
  SYSTEM_CONFIG: 'systemConfig',
  AUDIT_LOGS: 'auditLogs',
  USER_OPERATION_LOGS: 'userOperationLogs',
  ONLINE_USERS: 'onlineUsers',
  ONLINE_USERS_STATS: 'onlineUsersStats',
  PAGE_VIEWS: 'pageViews',
  PAGE_VIEWS_STATS: 'pageViewsStats',

  // ========== Organizational Hierarchy (组织架构) ==========
  WORLD_REGIONS: 'worldRegions',
  COUNTRIES: 'countries',
  NATIONAL_REGIONS: 'nationalRegions',
  LOCAL_CHAPTERS: 'localChapters',
} as const;

// Type for collection names
export type CollectionName = (typeof GLOBAL_COLLECTIONS)[keyof typeof GLOBAL_COLLECTIONS];

// Helper to get collection reference
export const getCollectionPath = (collectionName: CollectionName): string => {
  return collectionName;
};

// Total collections count
export const TOTAL_COLLECTIONS = Object.keys(GLOBAL_COLLECTIONS).length;

console.log(`✅ Global Collections Loaded: ${TOTAL_COLLECTIONS} collections`);


