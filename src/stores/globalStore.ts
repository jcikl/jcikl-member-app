import { create } from 'zustand';
import type { BreadcrumbItem } from '@/types';

interface GlobalState {
  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Loading
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Breadcrumbs
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;

  // Page title
  pageTitle: string;
  setPageTitle: (title: string) => void;

  // Modal states
  isModalOpen: boolean;
  modalType: string | null;
  openModal: (type: string) => void;
  closeModal: () => void;
}

export const useGlobalStore = create<GlobalState>(set => ({
  // Theme
  theme: 'light',
  setTheme: theme => set({ theme }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),

  // Loading
  loading: false,
  setLoading: loading => set({ loading }),

  // Breadcrumbs
  breadcrumbs: [],
  setBreadcrumbs: breadcrumbs => set({ breadcrumbs }),

  // Page title
  pageTitle: 'JCI KL Membership System',
  setPageTitle: title => {
    set({ pageTitle: title });
    document.title = `${title} - JCI KL`;
  },

  // Modal
  isModalOpen: false,
  modalType: null,
  openModal: type => set({ isModalOpen: true, modalType: type }),
  closeModal: () => set({ isModalOpen: false, modalType: null }),
}));

console.log('✅ Global Store Loaded');


