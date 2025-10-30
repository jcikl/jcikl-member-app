import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config';
import type { GlobalSettingDocument } from '@/types/settings';

/**
 * Seed Global Settings Script
 * 全局设置初始化脚本
 */

const INITIAL_SETTINGS: Omit<GlobalSettingDocument, 'lastModifiedBy' | 'lastModifiedAt'>[] = [
  // ========== Theme Settings ==========
  {
    id: 'theme-primary-color',
    category: 'UI_THEME',
    name: '主色调',
    key: 'theme-primary-color',
    type: 'color',
    value: '#1890ff',
    defaultValue: '#1890ff',
    description: '系统主色调，用于主按钮、链接等',
    scope: 'global',
    tags: ['theme', 'color'],
    isActive: true,
    version: 1,
  },
  {
    id: 'theme-success-color',
    category: 'UI_THEME',
    name: '成功色',
    key: 'theme-success-color',
    type: 'color',
    value: '#52c41a',
    defaultValue: '#52c41a',
    description: '成功状态颜色',
    scope: 'global',
    tags: ['theme', 'color'],
    isActive: true,
    version: 1,
  },
  {
    id: 'theme-warning-color',
    category: 'UI_THEME',
    name: '警告色',
    key: 'theme-warning-color',
    type: 'color',
    value: '#faad14',
    defaultValue: '#faad14',
    description: '警告状态颜色',
    scope: 'global',
    tags: ['theme', 'color'],
    isActive: true,
    version: 1,
  },
  {
    id: 'theme-error-color',
    category: 'UI_THEME',
    name: '错误色',
    key: 'theme-error-color',
    type: 'color',
    value: '#f5222d',
    defaultValue: '#f5222d',
    description: '错误状态颜色',
    scope: 'global',
    tags: ['theme', 'color'],
    isActive: true,
    version: 1,
  },
  {
    id: 'theme-font-size-base',
    category: 'UI_THEME',
    name: '基础字号',
    key: 'theme-font-size-base',
    type: 'number',
    value: 14,
    defaultValue: 14,
    description: '基础字体大小(px)',
    scope: 'global',
    tags: ['theme', 'font'],
    validation: { min: 12, max: 18 },
    isActive: true,
    version: 1,
  },
  {
    id: 'theme-border-radius-base',
    category: 'UI_THEME',
    name: '基础圆角',
    key: 'theme-border-radius-base',
    type: 'number',
    value: 6,
    defaultValue: 6,
    description: '基础圆角大小(px)',
    scope: 'global',
    tags: ['theme', 'border'],
    validation: { min: 0, max: 12 },
    isActive: true,
    version: 1,
  },

  // ========== Component Settings ==========
  {
    id: 'table-1-page-size',
    category: 'UI_COMPONENTS',
    name: '表格1-每页显示',
    key: 'table-1-page-size',
    type: 'number',
    value: 20,
    defaultValue: 20,
    description: '标准列表表格每页显示条数',
    scope: 'global',
    tags: ['table', 'pagination'],
    validation: { min: 10, max: 100 },
    isActive: true,
    version: 1,
  },
  {
    id: 'table-1-size',
    category: 'UI_COMPONENTS',
    name: '表格1-大小',
    key: 'table-1-size',
    type: 'select',
    value: 'middle',
    defaultValue: 'middle',
    description: '表格组件大小',
    scope: 'global',
    tags: ['table', 'size'],
    validation: { enum: ['small', 'middle', 'large'] },
    isActive: true,
    version: 1,
  },
  {
    id: 'form-1-layout',
    category: 'UI_COMPONENTS',
    name: '表单1-布局',
    key: 'form-1-layout',
    type: 'select',
    value: 'vertical',
    defaultValue: 'vertical',
    description: '表单布局方式',
    scope: 'global',
    tags: ['form', 'layout'],
    validation: { enum: ['horizontal', 'vertical', 'inline'] },
    isActive: true,
    version: 1,
  },
  {
    id: 'modal-1-width',
    category: 'UI_COMPONENTS',
    name: '弹窗1-宽度',
    key: 'modal-1-width',
    type: 'number',
    value: 800,
    defaultValue: 800,
    description: '弹窗默认宽度(px)',
    scope: 'global',
    tags: ['modal', 'width'],
    validation: { min: 400, max: 1200 },
    isActive: true,
    version: 1,
  },

  // ========== Date Format Settings ==========
  {
    id: 'date-display-format',
    category: 'DATA_FORMAT',
    name: '日期显示格式',
    key: 'date-display-format',
    type: 'select',
    value: 'DD-MMM-YYYY',
    defaultValue: 'DD-MMM-YYYY',
    description: 'UI显示的日期格式',
    scope: 'global',
    tags: ['date', 'format'],
    validation: { enum: ['DD-MMM-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'] },
    isActive: true,
    version: 1,
  },
];

/**
 * Seed global settings to Firestore
 */
export const seedGlobalSettings = async (): Promise<void> => {
  try {
    console.log('🌱 Starting to seed global settings...');

    for (const setting of INITIAL_SETTINGS) {
      const docRef = doc(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS, setting.key);
      await setDoc(docRef, {
        ...setting,
        lastModifiedBy: 'system',
        lastModifiedAt: new Date().toISOString(),
      });
    }

    console.log(`✅ Successfully seeded ${INITIAL_SETTINGS.length} global settings`);
  } catch (error) {
    console.error('❌ Failed to seed global settings:', error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGlobalSettings()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}


