import { useState, useEffect } from 'react';
import { globalSettingsService } from '@/services/globalSettingsService';
import type { TableProps, FormProps, ModalProps } from 'antd';

/**
 * useGlobalSettings Hook
 * 全局设置 Hook
 */
export const useGlobalSettings = () => {
  const [settings, setSettings] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize settings
    globalSettingsService.initialize().then(() => {
      setSettings(globalSettingsService.getAllCached());
      setLoading(false);
    });

    // Subscribe to changes
    const unsubscribe = globalSettingsService.subscribe(newSettings => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  /**
   * Get setting value
   */
  const get = <T = any>(key: string, defaultValue?: T): T => {
    return (settings.get(key) ?? defaultValue) as T;
  };

  /**
   * Get table configuration
   */
  const getTableConfig = (variant: string = 'table-1'): Partial<TableProps<any>> => {
    return {
      pagination: {
        pageSize: get(`${variant}-page-size`, 20),
        showSizeChanger: get(`${variant}-show-size-changer`, true),
        showQuickJumper: get(`${variant}-show-quick-jumper`, true),
        showTotal: (total: number) => `共 ${total} 条`,
      },
      size: get(`${variant}-size`, 'middle'),
      bordered: get(`${variant}-bordered`, false),
      scroll: { x: 'max-content' },
    };
  };

  /**
   * Get form configuration
   */
  const getFormConfig = (variant: string = 'form-1'): Partial<FormProps> => {
    return {
      layout: get(`${variant}-layout`, 'vertical'),
      validateTrigger: get(`${variant}-validate-trigger`, 'onBlur'),
      scrollToFirstError: get(`${variant}-scroll-to-first-error`, true),
    };
  };

  /**
   * Get modal configuration
   */
  const getModalConfig = (variant: string = 'modal-1'): Partial<ModalProps> => {
    return {
      width: get(`${variant}-width`, 800),
      centered: get(`${variant}-centered`, true),
      destroyOnClose: get(`${variant}-destroy-on-close`, true),
      maskClosable: get(`${variant}-mask-closable`, false),
    };
  };

  /**
   * Get theme token configuration
   */
  const getThemeToken = () => {
    return {
      colorPrimary: get('theme-primary-color', '#1890ff'),
      colorSuccess: get('theme-success-color', '#52c41a'),
      colorWarning: get('theme-warning-color', '#faad14'),
      colorError: get('theme-error-color', '#f5222d'),
      colorText: get('theme-text-color', 'rgba(0, 0, 0, 0.85)'),
      fontSize: get('theme-font-size-base', 14),
      borderRadius: get('theme-border-radius-base', 6),
    };
  };

  /**
   * Get date format
   */
  const getDateFormat = (key: string): string => {
    return get(key, 'DD-MMM-YYYY');
  };

  return {
    settings,
    loading,
    get,
    getTableConfig,
    getFormConfig,
    getModalConfig,
    getThemeToken,
    getDateFormat,
  };
};

console.log('✅ useGlobalSettings Hook Loaded');


