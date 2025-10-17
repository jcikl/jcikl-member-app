/**
 * Database Seeding Script
 * 数据库种子数据脚本
 * 
 * 用于初始化Firestore数据库的基础数据
 */

import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config';
import type { 
  Member, 
  MemberCategory, 
  MemberPosition
} from '@/modules/member/types';
import type { GlobalSettingDocument } from '@/types/settings';

/**
 * 初始会员分类数据
 */
const INITIAL_MEMBER_CATEGORIES: Array<Omit<MemberCategory, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Official Member',
    displayName: '正式会员',
    description: '正式会员享有所有权益和参与所有活动的权利',
    fees: {
      newMemberFee: 480,
      renewalFee: 350,
    },
    requirements: {
      eventsRequired: 3,
      coursesRequired: 1,
      rolesRequired: 1,
      description: '需要参加3个活动、1个课程、担任1个职务',
    },
    status: 'active',
    priority: 1,
    color: '#1890ff',
    icon: 'user',
  },
  {
    name: 'Associate Member',
    displayName: '准会员',
    description: '准会员享有部分权益，可参与大部分活动',
    fees: {
      newMemberFee: 250,
      renewalFee: 200,
    },
    requirements: {
      eventsRequired: 2,
      description: '需要参加2个活动',
    },
    status: 'active',
    priority: 2,
    color: '#52c41a',
    icon: 'user-add',
  },
  {
    name: 'Honorary Member',
    displayName: '荣誉会员',
    description: '荣誉会员享有所有权益，无需缴费',
    fees: {
      newMemberFee: 0,
      renewalFee: 0,
    },
    requirements: {
      eventsRequired: 0,
      description: '无需完成特定任务',
    },
    status: 'active',
    priority: 3,
    color: '#faad14',
    icon: 'crown',
  },
  {
    name: 'Visiting Member',
    displayName: '访问会员',
    description: '临时访问会员，有限权益',
    fees: {
      newMemberFee: 100,
      renewalFee: 100,
    },
    requirements: {
      eventsRequired: 0,
      description: '无需完成特定任务',
    },
    status: 'active',
    priority: 4,
    color: '#722ed1',
    icon: 'team',
  },
];

/**
 * 初始会员职务数据
 */
const INITIAL_MEMBER_POSITIONS: Array<Omit<MemberPosition, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'president',
    displayName: '主席',
    description: '分会主席，负责分会整体运营',
    level: 'Chapter',
    status: 'active',
    priority: 1,
  },
  {
    name: 'vice_president',
    displayName: '副主席',
    description: '分会副主席，协助主席工作',
    level: 'Chapter',
    status: 'active',
    priority: 2,
  },
  {
    name: 'secretary',
    displayName: '秘书',
    description: '分会秘书，负责文档和会议记录',
    level: 'Chapter',
    status: 'active',
    priority: 3,
  },
  {
    name: 'treasurer',
    displayName: '财务',
    description: '分会财务，负责财务管理',
    level: 'Chapter',
    status: 'active',
    priority: 4,
  },
  {
    name: 'member',
    displayName: '普通会员',
    description: '普通会员，参与分会活动',
    level: 'Chapter',
    status: 'active',
    priority: 5,
  },
];

/**
 * 初始管理员账户
 */
const ADMIN_MEMBER: Omit<Member, 'id'> = {
  email: 'admin@jcikl.org',
  name: '系统管理员',
  phone: '+60123456789',
  memberId: 'ADMIN-001',
  status: 'active',
  level: 'diamond',
  category: 'Official Member',
  accountType: 'admin',
  chapter: 'JCI Kuala Lumpur',
  chapterId: 'JCI-KL-001',
  profile: {
    gender: 'Male',
    company: 'JCI Kuala Lumpur',
    departmentAndPosition: '系统管理部',
    address: {
      street: '123 Jalan Ampang',
      city: 'Kuala Lumpur',
      state: 'Kuala Lumpur',
      postcode: '50450',
      country: 'Malaysia',
    },
  },
  joinDate: new Date('2020-01-01').toISOString(),
  renewalDate: new Date('2025-01-01').toISOString(),
  expiryDate: new Date('2025-12-31').toISOString(),
  createdAt: new Date('2020-01-01').toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * 示例会员数据
 */
const SAMPLE_MEMBERS: Omit<Member, 'id'>[] = [
  {
    email: 'john.doe@example.com',
    name: '张约翰',
    phone: '+60123456780',
    memberId: 'JCI-KL-000001',
    status: 'active',
    level: 'gold',
    category: 'Official Member',
    chapter: 'JCI Kuala Lumpur',
    chapterId: 'JCI-KL-001',
    profile: {
      gender: 'Male',
      company: 'ABC Technology Sdn Bhd',
      departmentAndPosition: '技术总监',
      birthDate: '15-Mar-1985',
      address: {
        street: '456 Jalan Bukit Bintang',
        city: 'Kuala Lumpur',
        state: 'Kuala Lumpur',
        postcode: '50200',
        country: 'Malaysia',
      },
    },
    joinDate: new Date('2021-03-15').toISOString(),
    renewalDate: new Date('2025-03-15').toISOString(),
    expiryDate: new Date('2025-12-31').toISOString(),
    createdAt: new Date('2021-03-15').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    email: 'jane.smith@example.com',
    name: '李珍妮',
    phone: '+60123456781',
    memberId: 'JCI-KL-000002',
    status: 'active',
    level: 'silver',
    category: 'Associate Member',
    chapter: 'JCI Kuala Lumpur',
    chapterId: 'JCI-KL-001',
    profile: {
      gender: 'Female',
      company: 'XYZ Marketing Sdn Bhd',
      departmentAndPosition: '营销经理',
      birthDate: '22-Aug-1990',
      address: {
        street: '789 Jalan Petaling',
        city: 'Kuala Lumpur',
        state: 'Kuala Lumpur',
        postcode: '50000',
        country: 'Malaysia',
      },
    },
    joinDate: new Date('2022-08-22').toISOString(),
    renewalDate: new Date('2025-08-22').toISOString(),
    expiryDate: new Date('2025-12-31').toISOString(),
    createdAt: new Date('2022-08-22').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    email: 'alex.wong@example.com',
    name: '黄亚历',
    phone: '+60123456782',
    memberId: 'JCI-KL-000003',
    status: 'pending',
    level: 'bronze',
    category: 'Official Member',
    chapter: 'JCI Kuala Lumpur',
    chapterId: 'JCI-KL-001',
    profile: {
      gender: 'Male',
      company: 'DEF Consulting Sdn Bhd',
      departmentAndPosition: '高级顾问',
      birthDate: '10-Dec-1988',
    },
    joinDate: new Date().toISOString(),
    renewalDate: new Date('2025-12-31').toISOString(),
    expiryDate: new Date('2025-12-31').toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * 全局设置数据
 */
const INITIAL_GLOBAL_SETTINGS: Omit<GlobalSettingDocument, 'lastModifiedBy' | 'lastModifiedAt'>[] = [
  // 主题设置
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
  
  // 组件设置
  {
    id: 'table-page-size',
    category: 'UI_COMPONENTS',
    name: '表格每页显示',
    key: 'table-page-size',
    type: 'number',
    value: 20,
    defaultValue: 20,
    description: '表格每页显示条数',
    scope: 'global',
    tags: ['table', 'pagination'],
    validation: { min: 10, max: 100 },
    isActive: true,
    version: 1,
  },
  {
    id: 'form-layout',
    category: 'UI_COMPONENTS',
    name: '表单布局',
    key: 'form-layout',
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
  
  // 日期格式设置
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
 * 种子数据到Firestore
 */
export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting to seed database...');

    // 1. 种子会员分类
    console.log('📋 Seeding member categories...');
    for (const category of INITIAL_MEMBER_CATEGORIES) {
      const docRef = doc(collection(db, GLOBAL_COLLECTIONS.MEMBER_CATEGORIES));
      await setDoc(docRef, {
        ...category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. 种子会员职务
    console.log('👥 Seeding member positions...');
    for (const position of INITIAL_MEMBER_POSITIONS) {
      const docRef = doc(collection(db, GLOBAL_COLLECTIONS.MEMBER_POSITIONS));
      await setDoc(docRef, {
        ...position,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. 种子管理员账户
    console.log('👤 Seeding admin member...');
    const adminDocRef = doc(collection(db, GLOBAL_COLLECTIONS.MEMBERS));
    await setDoc(adminDocRef, {
      ...ADMIN_MEMBER,
      id: adminDocRef.id,
      createdAt: ADMIN_MEMBER.createdAt,
      updatedAt: ADMIN_MEMBER.updatedAt,
    });

    // 4. 种子示例会员
    console.log('👥 Seeding sample members...');
    for (const member of SAMPLE_MEMBERS) {
      const docRef = doc(collection(db, GLOBAL_COLLECTIONS.MEMBERS));
      await setDoc(docRef, {
        ...member,
        id: docRef.id,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      });
    }

    // 5. 种子全局设置
    console.log('⚙️ Seeding global settings...');
    for (const setting of INITIAL_GLOBAL_SETTINGS) {
      const docRef = doc(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS, setting.key);
      await setDoc(docRef, {
        ...setting,
        lastModifiedBy: 'system',
        lastModifiedAt: new Date().toISOString(),
      });
    }

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Seeded data:`);
    console.log(`   - ${INITIAL_MEMBER_CATEGORIES.length} member categories`);
    console.log(`   - ${INITIAL_MEMBER_POSITIONS.length} member positions`);
    console.log(`   - 1 admin member`);
    console.log(`   - ${SAMPLE_MEMBERS.length} sample members`);
    console.log(`   - ${INITIAL_GLOBAL_SETTINGS.length} global settings`);

  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    throw error;
  }
};

/**
 * 清理数据库（仅用于开发）
 */
export const clearDatabase = async (): Promise<void> => {
  console.log('⚠️  This function is for development only!');
  console.log('⚠️  Database clearing not implemented for safety reasons.');
  console.log('⚠️  Please manually clear collections if needed.');
};

// 如果直接运行此脚本（仅在 Node.js 环境）
if (typeof process !== 'undefined' && 
    import.meta.url.endsWith('seedDatabase.ts') && 
    process.argv?.[1]?.includes('seedDatabase.ts')) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
