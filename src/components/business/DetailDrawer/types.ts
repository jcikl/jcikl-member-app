/**
 * DetailDrawer Types
 * 详情抽屉类型定义
 */

export interface TabConfig {
  key: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}

export interface ActionButton {
  key: string;
  label: string;
  icon?: React.ReactNode;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  danger?: boolean;
  onClick: () => void | Promise<void>;
  visible?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export interface DetailDrawerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  tabs: TabConfig[];
  actions?: ActionButton[];
  footerActions?: ActionButton[];
  loading?: boolean;
  onRefresh?: () => void;
  width?: number | string;
  defaultActiveTab?: string;
  destroyOnClose?: boolean;
  maskClosable?: boolean;
  className?: string;
}

export interface DrawerContentProps {
  activeTab: string;
  tabs: TabConfig[];
  loading?: boolean;
}

