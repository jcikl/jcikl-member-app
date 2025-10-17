/**
 * Settings Type Definitions
 * 设置类型定义
 */

export type SettingCategory =
  | 'UI_THEME'
  | 'UI_COMPONENTS'
  | 'DATA_FORMAT'
  | 'VALIDATION'
  | 'SYSTEM'
  | 'I18N';

export type SettingType = 'string' | 'number' | 'boolean' | 'json' | 'color' | 'select';

export interface GlobalSettingDocument {
  id: string;
  category: SettingCategory;
  name: string;
  key: string;
  type: SettingType;
  value: any;
  defaultValue: any;
  description?: string;
  scope: 'global' | 'user' | 'team';
  tags: string[];
  validation?: {
    min?: number;
    max?: number;
    enum?: any[];
    pattern?: string;
  };
  isActive: boolean;
  lastModifiedBy?: string;
  lastModifiedAt: string;
  version: number;
}

export interface SettingChangeLog {
  id: string;
  settingKey: string;
  settingCategory: SettingCategory;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  reason?: string;
  ipAddress?: string;
}

export interface ThemeSettings {
  primaryColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
  textColor: string;
  textSecondaryColor: string;
  textTertiaryColor: string;
  borderColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSizeBase: number;
  fontSizeLg: number;
  fontSizeSm: number;
  borderRadiusBase: number;
  borderRadiusLg: number;
  borderRadiusSm: number;
}

export interface ComponentPreset {
  name: string;
  type: 'table' | 'form' | 'modal' | 'button' | 'card';
  config: Record<string, any>;
}

console.log('✅ Settings Types Loaded');


