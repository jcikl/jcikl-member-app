/**
 * Optimized Routes Configuration Example
 * 优化后的路由配置示例
 * 
 * ⚡ Performance: Code splitting with lazy loading
 * 性能优化：使用懒加载的代码分割
 * 
 * 📝 使用说明：
 * 1. 将此文件重命名为 index.tsx（备份原文件）
 * 2. 或逐步将懒加载应用到原 index.tsx
 */

import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { PageSkeleton } from '@/components/LazyLoadWrapper';

// ========== 立即加载（关键路由） ==========
// Critical routes - loaded immediately
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFoundPage from '@/pages/NotFoundPage';
import MainLayout from '@/layouts/MainLayout';

// ========== 懒加载（按需加载） ==========
// Lazy loaded routes - loaded on demand

// Dashboard & Profile (高优先级)
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

// Member Module (高访问频率)
const MemberListPage = lazy(() => import('@/modules/member/pages/MemberListPage'));
const MemberDetailPage = lazy(() => import('@/modules/member/pages/MemberDetailPage'));
const MemberCreatePage = lazy(() => import('@/modules/member/pages/MemberCreatePage'));

// Event Module (中等访问频率)
const EventListPage = lazy(() => import('@/modules/event/pages/EventListPage'));
const EventDetailPage = lazy(() => import('@/modules/event/pages/EventDetailPage'));
const EventCreatePage = lazy(() => import('@/modules/event/pages/EventCreatePage'));
const EventEditPage = lazy(() => import('@/modules/event/pages/EventEditPage'));
const EventRegistrationManagementPage = lazy(() => import('@/modules/event/pages/EventRegistrationManagementPage'));
const EventAccountManagementPage = lazy(() => import('@/modules/event/pages/EventAccountManagementPage'));

// Finance Module (中等访问频率)
const TransactionManagementPage = lazy(() => import('@/modules/finance/pages/TransactionManagementPage'));
const BankAccountManagementPage = lazy(() => import('@/modules/finance/pages/BankAccountManagementPage'));
const MemberFeeManagementPage = lazy(() => import('@/modules/finance/pages/MemberFeeManagementPage'));
const GeneralAccountsPage = lazy(() => import('@/modules/finance/pages/GeneralAccountsPage'));
const EventFinancialPage = lazy(() => import('@/modules/finance/pages/EventFinancialPage'));
const FiscalYearManagementPage = lazy(() => import('@/modules/finance/pages/FiscalYearManagementPage'));
const InternalTransferPairingPage = lazy(() => import('@/modules/finance/pages/InternalTransferPairingPage'));
const FinanceOverviewPage = lazy(() => import('@/modules/finance/pages/FinanceOverviewPage'));

// System Module (低访问频率)
const GlobalSettingsPage = lazy(() => import('@/modules/system/pages/GlobalSettingsPage'));
const FinancialCategoryManagementPage = lazy(() => import('@/modules/system/pages/FinancialCategoryManagementPage'));
const MemberDataMigrationPage = lazy(() => import('@/modules/system/pages/MemberDataMigrationPage'));
const MemberCategoryBackfillPage = lazy(() => import('@/modules/system/pages/MemberCategoryBackfillPage'));

// Utility Pages (低访问频率)
const DuplicateEmailCleanupPage = lazy(() => import('@/pages/DuplicateEmailCleanupPage'));
const DataFieldSwapPage = lazy(() => import('@/pages/DataFieldSwapPage'));
const QuickAddEventTransactionPage = lazy(() => import('@/pages/QuickAddEventTransactionPage'));
const FinancialRecordsDebugPage = lazy(() => import('@/pages/FinancialRecordsDebugPage'));
const FirebaseTestPage = lazy(() => import('@/pages/FirebaseTestPage'));

/**
 * Lazy Route Wrapper
 * 懒加载路由包装器
 */
const LazyRoute: React.FC<{ component: React.LazyExoticComponent<any> }> = ({ component: Component }) => (
  <Suspense fallback={<PageSkeleton />}>
    <Component />
  </Suspense>
);

/**
 * Optimized Router Configuration
 * 优化后的路由配置
 */
export const router = createBrowserRouter([
  // Public routes (no lazy loading for login/register)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  // Protected routes (with lazy loading)
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },

      // Dashboard (高优先级 - 预加载)
      {
        path: 'dashboard',
        element: <LazyRoute component={DashboardPage} />,
      },

      // Profile
      {
        path: 'profile',
        element: <LazyRoute component={ProfilePage} />,
      },

      // Members (高访问频率)
      {
        path: 'members',
        children: [
          {
            index: true,
            element: <LazyRoute component={MemberListPage} />,
          },
          {
            path: 'create',
            element: <LazyRoute component={MemberCreatePage} />,
          },
          {
            path: ':id',
            element: <LazyRoute component={MemberDetailPage} />,
          },
        ],
      },

      // Events (中等访问频率)
      {
        path: 'events',
        children: [
          {
            index: true,
            element: <LazyRoute component={EventListPage} />,
          },
          {
            path: 'create',
            element: <LazyRoute component={EventCreatePage} />,
          },
          {
            path: ':id',
            element: <LazyRoute component={EventDetailPage} />,
          },
          {
            path: ':id/edit',
            element: <LazyRoute component={EventEditPage} />,
          },
          {
            path: 'registrations',
            element: <LazyRoute component={EventRegistrationManagementPage} />,
          },
          {
            path: 'accounts',
            element: <LazyRoute component={EventAccountManagementPage} />,
          },
        ],
      },

      // Finance (中等访问频率)
      {
        path: 'finance',
        children: [
          {
            index: true,
            element: <LazyRoute component={FinanceOverviewPage} />,
          },
          {
            path: 'transactions',
            element: <LazyRoute component={TransactionManagementPage} />,
          },
          {
            path: 'bank-accounts',
            element: <LazyRoute component={BankAccountManagementPage} />,
          },
          {
            path: 'member-fees',
            element: <LazyRoute component={MemberFeeManagementPage} />,
          },
          {
            path: 'general-accounts',
            element: <LazyRoute component={GeneralAccountsPage} />,
          },
          {
            path: 'event-financial',
            element: <LazyRoute component={EventFinancialPage} />,
          },
          {
            path: 'fiscal-years',
            element: <LazyRoute component={FiscalYearManagementPage} />,
          },
          {
            path: 'internal-transfers',
            element: <LazyRoute component={InternalTransferPairingPage} />,
          },
        ],
      },

      // Settings (低访问频率)
      {
        path: 'settings',
        children: [
          {
            path: 'global',
            element: <LazyRoute component={GlobalSettingsPage} />,
          },
          {
            path: 'financial-categories',
            element: <LazyRoute component={FinancialCategoryManagementPage} />,
          },
          {
            path: 'member-migration',
            element: <LazyRoute component={MemberDataMigrationPage} />,
          },
          {
            path: 'category-backfill',
            element: <LazyRoute component={MemberCategoryBackfillPage} />,
          },
          {
            path: 'duplicate-email-cleanup',
            element: <LazyRoute component={DuplicateEmailCleanupPage} />,
          },
          {
            path: 'data-field-swap',
            element: <LazyRoute component={DataFieldSwapPage} />,
          },
        ],
      },

      // Utility Pages (低访问频率)
      {
        path: 'quick-add-event-transaction',
        element: <LazyRoute component={QuickAddEventTransactionPage} />,
      },
      {
        path: 'financial-records-debug',
        element: <LazyRoute component={FinancialRecordsDebugPage} />,
      },
      {
        path: 'firebase-test',
        element: <LazyRoute component={FirebaseTestPage} />,
      },
    ],
  },

  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

/**
 * Optimized Router Provider
 * 优化后的路由提供者
 */
export const OptimizedRouterProvider: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default router;

