import type { TableProps, FormProps, ModalProps } from 'antd';

/**
 * Global Component Configuration
 * 全局组件配置
 */

export const GLOBAL_COMPONENT_CONFIG = {
  // ========== Table Configuration ==========
  TABLE: {
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number) => `共 ${total} 条`,
    size: 'middle' as const,
    bordered: false,
    scroll: { x: 'max-content' as const },
  },

  // ========== Form Configuration ==========
  FORM: {
    layout: 'vertical' as const,
    validateTrigger: 'onBlur' as const,
    scrollToFirstError: true,
    labelCol: { span: 24 },
    wrapperCol: { span: 24 },
  },

  // ========== Modal Configuration ==========
  MODAL: {
    width: 800,
    centered: true,
    destroyOnClose: true,
    maskClosable: false,
  },

  // ========== Upload Configuration ==========
  UPLOAD: {
    maxCount: 1,
    listType: 'picture-card' as const,
    accept: 'image/*',
  },

  // ========== Card Configuration ==========
  CARD: {
    bordered: true,
    hoverable: false,
  },

  // ========== List Configuration ==========
  LIST: {
    size: 'default' as const,
    split: true,
  },
} as const;

/**
 * Global Component Service
 * 全局组件服务
 */
export const globalComponentService = {
  /**
   * Get Table configuration with optional overrides
   */
  getTableConfig: (overrides?: Partial<TableProps<any>>): TableProps<any> => {
    return {
      ...GLOBAL_COMPONENT_CONFIG.TABLE,
      pagination: {
        pageSize: GLOBAL_COMPONENT_CONFIG.TABLE.pageSize,
        showSizeChanger: GLOBAL_COMPONENT_CONFIG.TABLE.showSizeChanger,
        showQuickJumper: GLOBAL_COMPONENT_CONFIG.TABLE.showQuickJumper,
        showTotal: GLOBAL_COMPONENT_CONFIG.TABLE.showTotal,
      },
      ...overrides,
    };
  },

  /**
   * Get Form configuration with optional overrides
   */
  getFormConfig: (overrides?: Partial<FormProps>): FormProps => {
    return {
      ...GLOBAL_COMPONENT_CONFIG.FORM,
      ...overrides,
    };
  },

  /**
   * Get Modal configuration with optional overrides
   */
  getModalConfig: (overrides?: Partial<ModalProps>): ModalProps => {
    return {
      ...GLOBAL_COMPONENT_CONFIG.MODAL,
      ...overrides,
    };
  },

  /**
   * Get status badge color
   */
  getStatusColor: (
    status: 'active' | 'inactive' | 'pending' | 'suspended'
  ): 'success' | 'warning' | 'processing' | 'error' => {
    const colorMap = {
      active: 'success',
      inactive: 'warning',
      pending: 'processing',
      suspended: 'error',
    } as const;
    return colorMap[status];
  },

  /**
   * Get status text
   */
  getStatusText: (status: 'active' | 'inactive' | 'pending' | 'suspended'): string => {
    const textMap = {
      active: '活跃',
      inactive: '未激活',
      pending: '待处理',
      suspended: '已停用',
    };
    return textMap[status];
  },
};

console.log('✅ Global Component Settings Loaded');


