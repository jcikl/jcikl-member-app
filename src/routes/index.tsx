import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import NotFoundPage from '@/pages/NotFoundPage';
import GlobalSettingsPage from '@/modules/system/pages/GlobalSettingsPage';
import FinancialCategoryManagementPage from '@/modules/system/pages/FinancialCategoryManagementPage';
import MemberDataMigrationPage from '@/modules/system/pages/MemberDataMigrationPage';
import MemberCategoryBackfillPage from '@/modules/system/pages/MemberCategoryBackfillPage';
import QuickAddEventTransactionPage from '@/pages/QuickAddEventTransactionPage';
import FirebaseTestPage from '@/pages/FirebaseTestPage';
import FinancialRecordsDebugPage from '@/pages/FinancialRecordsDebugPage';
import DataFixPage from '@/pages/DataFixPage';
import TransactionDateFormatFixPage from '@/pages/TransactionDateFormatFixPage';
 
// import UpdateFinancialRecordsPayerInfoPage from '@/pages/UpdateFinancialRecordsPayerInfoPage'; // 已删除

// Member Module
import MemberListPage from '@/modules/member/pages/MemberListPage';
import MemberDetailPage from '@/modules/member/pages/MemberDetailPage';
import MemberCreatePage from '@/modules/member/pages/MemberCreatePage';

// Event Module
import EventListPage from '@/modules/event/pages/EventListPage';
import EventDetailPage from '@/modules/event/pages/EventDetailPage';
import EventCreatePage from '@/modules/event/pages/EventCreatePage';
import EventEditPage from '@/modules/event/pages/EventEditPage';
import EventRegistrationManagementPage from '@/modules/event/pages/EventRegistrationManagementPage';
import EventAccountManagementPage from '@/modules/event/pages/EventAccountManagementPage';

// Finance Module
import FinanceOverviewPage from '@/modules/finance/pages/FinanceOverviewPage';
import MemberFeeManagementPage from '@/modules/finance/pages/MemberFeeManagementPage';
import EventFinancialPage from '@/modules/finance/pages/EventFinancialPage';
import GeneralAccountsPage from '@/modules/finance/pages/GeneralAccountsPage';
import BankAccountManagementPage from '@/modules/finance/pages/BankAccountManagementPage'; // 🆕 现在包含财年管理
import TransactionManagementPage from '@/modules/finance/pages/TransactionManagementPage';

/**
 * Application Router Configuration
 * 应用路由配置
 * 
 * 使用 React Router v7 future flags 以准备升级
 */

export const router = createBrowserRouter(
  [
  // Auth routes
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/register',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <RegisterPage />,
      },
    ],
  },

  // Main application routes
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'settings',
        children: [
          {
            path: 'global',
            element: <GlobalSettingsPage />,
          },
          {
            path: 'financial-categories',
            element: <FinancialCategoryManagementPage />,
          },
          {
            path: 'data-fix',
            element: <DataFixPage />,
          },
          {
            path: 'member-data-migration',
            element: <MemberDataMigrationPage />,
          },
          {
            path: 'member-category-backfill',
            element: <MemberCategoryBackfillPage />,
          },
          {
            path: 'transaction-date-format-fix',
            element: <TransactionDateFormatFixPage />,
          },
          
        ],
      },
      {
        path: 'quick-add-event-transaction',
        element: <QuickAddEventTransactionPage />,
      },
      {
        path: 'firebase-test',
        element: <FirebaseTestPage />,
      },
      {
        path: 'financial-records-debug',
        element: <FinancialRecordsDebugPage />,
      },
      // 已删除：UpdateFinancialRecordsPayerInfoPage 路由
      // {
      //   path: 'update-financial-records-payer-info',
      //   element: <UpdateFinancialRecordsPayerInfoPage />,
      // },
      // Profile Route
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      // Member Module Routes
      {
        path: 'members',
        children: [
          {
            index: true,
            element: <MemberListPage />,
          },
          {
            path: 'create',
            element: <MemberCreatePage />,
          },
          {
            path: ':id',
            element: <MemberDetailPage />,
          },
        ],
      },
      // Event Module Routes
      {
        path: 'events',
        children: [
          {
            index: true,
            element: <EventListPage />,
          },
          {
            path: 'create',
            element: <EventCreatePage />,
          },
          {
            path: ':id',
            element: <EventDetailPage />,
          },
          {
            path: ':id/edit',
            element: <EventEditPage />,
          },
          {
            path: 'registrations',
            element: <EventRegistrationManagementPage />,
          },
          {
            path: 'accounts',
            element: <EventAccountManagementPage />,
          },
        ],
      },
      // Finance Module Routes
      {
        path: 'finance',
        children: [
          {
            index: true,
            element: <FinanceOverviewPage />,
          },
          {
            path: 'overview',
            element: <FinanceOverviewPage />,
          },
          {
            path: 'settings',
            element: <BankAccountManagementPage />, // 🆕 合并后的财务设置页面（包含银行账户和财年管理）
          },
          {
            path: 'bank-accounts',
            element: <BankAccountManagementPage />, // 🆕 保留旧路由以兼容
          },
          {
            path: 'transactions',
            element: <TransactionManagementPage />,
          },
          {
            path: 'member-fees',
            element: <MemberFeeManagementPage />,
          },
          {
            path: 'events',
            element: <EventFinancialPage />,
          },
          {
            path: 'accounts',
            element: <GeneralAccountsPage />,
          },
        ],
      },
      // More routes will be added in future phases
    ],
  },

  // 404 page
  {
    path: '*',
    element: <NotFoundPage />,
  },
  ],
  {
    future: {
      v7_startTransition: true,
    },
  }
);



