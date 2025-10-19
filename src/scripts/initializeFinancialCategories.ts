/**
 * Initialize Financial Categories Script
 * 财务类别初始化脚本
 * 
 * 批量创建收入和支出类别
 */

import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { cleanUndefinedValues } from '@/utils/dataHelpers';

interface CategoryTemplate {
  value: string;
  label: string;
  labelEn: string;
  type: 'income' | 'expense';
  icon: string;
  description: string;
  keywords: string[];
  sortOrder: number;
  status: 'active' | 'inactive';
}

/**
 * 收入类别模板（12个）
 */
const INCOME_CATEGORIES: CategoryTemplate[] = [
  {
    value: 'TXINC-0001',
    label: '活动门票-会员',
    labelEn: 'Event Ticketing - Member',
    type: 'income',
    icon: '🎫',
    description: '会员参加活动的门票收入',
    keywords: ['Ticketing (Member)', 'Ticket Fee (Member)', 'Member Ticket'],
    sortOrder: 1,
    status: 'active',
  },
  {
    value: 'TXINC-0002',
    label: '活动门票-非会员',
    labelEn: 'Event Ticketing - Public',
    type: 'income',
    icon: '🎟️',
    description: '公众/访客参加活动的门票收入',
    keywords: ['Ticketing (Public)', 'Ticketing (Non-Member)', 'Public Ticket'],
    sortOrder: 2,
    status: 'active',
  },
  {
    value: 'TXINC-0003',
    label: '活动门票-早鸟优惠',
    labelEn: 'Event Ticketing - Early Bird',
    type: 'income',
    icon: '🐦',
    description: '早鸟优惠票价收入',
    keywords: ['Super Early Bird', 'Early Bird', 'Earlybird'],
    sortOrder: 3,
    status: 'active',
  },
  {
    value: 'TXINC-0004',
    label: '大型活动门票',
    labelEn: 'Major Event Ticketing',
    type: 'income',
    icon: '🏆',
    description: '全国/区域/国际级别活动门票（NATCON, ASPAC, ACC, IAB）',
    keywords: ['NATCON', 'ASPAC', 'ACC', 'IAB', 'Area Level'],
    sortOrder: 4,
    status: 'active',
  },
  {
    value: 'TXINC-0005',
    label: '企业赞助',
    labelEn: 'Corporate Sponsorship',
    type: 'income',
    icon: '🤝',
    description: '企业提供的现金赞助（金级、银级、铜级等）',
    keywords: ['Gold Sponsor', 'Silver Sponsor', 'Bronze Sponsor', 'IA Sponsor', 'Area Sponsor'],
    sortOrder: 5,
    status: 'active',
  },
  {
    value: 'TXINC-0006',
    label: 'JCIM补贴/资助',
    labelEn: 'JCIM Subsidy & Funding',
    type: 'income',
    icon: '💰',
    description: '来自JCIM或其他组织的补贴和资助',
    keywords: ['JCIM Subsidy', 'Funding', 'Grant', 'Subsidy'],
    sortOrder: 6,
    status: 'active',
  },
  {
    value: 'TXINC-0007',
    label: '捐款/筹款',
    labelEn: 'Donation & Fundraising',
    type: 'income',
    icon: '🎁',
    description: '公益项目的捐款和筹款收入',
    keywords: ['Donation', 'Fund Raising', 'Fundraising'],
    sortOrder: 7,
    status: 'active',
  },
  {
    value: 'TXINC-0008',
    label: '新会员费',
    labelEn: 'New Membership Fee',
    type: 'income',
    icon: '👤',
    description: '新会员入会费用',
    keywords: ['New Membership', 'New Associated Membership', 'New Member'],
    sortOrder: 8,
    status: 'active',
  },
  {
    value: 'TXINC-0009',
    label: '续会费',
    labelEn: 'Renewal Membership Fee',
    type: 'income',
    icon: '🔄',
    description: '会员续会费用',
    keywords: ['Renewal', 'Renew Membership', 'Renewal Membership'],
    sortOrder: 9,
    status: 'active',
  },
  {
    value: 'TXINC-0010',
    label: '访客会员费',
    labelEn: 'Visiting Membership Fee',
    type: 'income',
    icon: '🌏',
    description: '访客会员费用',
    keywords: ['Visiting Membership', 'Visiting Member'],
    sortOrder: 10,
    status: 'active',
  },
  {
    value: 'TXINC-0011',
    label: '商品销售',
    labelEn: 'Merchandise Sales',
    type: 'income',
    icon: '🛍️',
    description: 'JCI会服、纪念品等商品销售收入',
    keywords: ['Jacket_Sales', 'Shirt_Sales', 'Pin_Sale', 'Merchandise Sales'],
    sortOrder: 11,
    status: 'active',
  },
  {
    value: 'TXINC-0012',
    label: '其他收入',
    labelEn: 'Other Income',
    type: 'income',
    icon: '📦',
    description: '利息、退款、杂项收入',
    keywords: ['Interest', 'Refund Received', 'Misc Income', 'Other'],
    sortOrder: 12,
    status: 'active',
  },
];

/**
 * 支出类别模板（25个）
 */
const EXPENSE_CATEGORIES: CategoryTemplate[] = [
  {
    value: 'TXEXP-0001',
    label: '场地租金',
    labelEn: 'Venue Rental',
    type: 'expense',
    icon: '🏢',
    description: '活动场地租金（不含押金）',
    keywords: ['Venue Fee', 'Hall Rental', 'Venue', 'Rental'],
    sortOrder: 1,
    status: 'active',
  },
  {
    value: 'TXEXP-0002',
    label: '场地押金',
    labelEn: 'Venue Deposit',
    type: 'expense',
    icon: '🔐',
    description: '场地押金（通常会退还）',
    keywords: ['Venue Deposit', 'Hall Deposit', 'Deposit'],
    sortOrder: 2,
    status: 'active',
  },
  {
    value: 'TXEXP-0003',
    label: '餐饮费用',
    labelEn: 'Food & Beverage',
    type: 'expense',
    icon: '🍽️',
    description: '活动餐饮、茶点、饮料费用',
    keywords: ['Food', 'F&B', 'Dinner', 'Beverage', 'Lunch', 'Catering'],
    sortOrder: 3,
    status: 'active',
  },
  {
    value: 'TXEXP-0004',
    label: '设备租赁',
    labelEn: 'Equipment & Setup',
    type: 'expense',
    icon: '🎤',
    description: '音响、灯光、摄影等设备租赁',
    keywords: ['Rental', 'LED Set Up', 'Photobooth', 'Sound', 'Equipment', 'Speaker'],
    sortOrder: 4,
    status: 'active',
  },
  {
    value: 'TXEXP-0005',
    label: '交通/物流',
    labelEn: 'Transportation & Logistics',
    type: 'expense',
    icon: '🚗',
    description: '交通、运输、物流配送费用',
    keywords: ['Transportation', 'Shipping Fee', 'Delivery Fee', 'Lalamove'],
    sortOrder: 5,
    status: 'active',
  },
  {
    value: 'TXEXP-0006',
    label: '印刷品',
    labelEn: 'Printing Materials',
    type: 'expense',
    icon: '📄',
    description: '文件印刷、装订等费用',
    keywords: ['Printing', 'Binding Fee', 'Print'],
    sortOrder: 6,
    status: 'active',
  },
  {
    value: 'TXEXP-0007',
    label: '文具用品',
    labelEn: 'Stationery',
    type: 'expense',
    icon: '✏️',
    description: '办公文具、活动用品',
    keywords: ['Stationery', 'Stationeries', 'Office Supplies'],
    sortOrder: 7,
    status: 'active',
  },
  {
    value: 'TXEXP-0008',
    label: '宣传物料',
    labelEn: 'Branding & Promotion',
    type: 'expense',
    icon: '📢',
    description: '横幅、展架、宣传品',
    keywords: ['Bunting', 'Promotion', 'TOA', 'Banner', 'Marketing'],
    sortOrder: 8,
    status: 'active',
  },
  {
    value: 'TXEXP-0009',
    label: '纪念品采购',
    labelEn: 'Souvenir & Merchandise Purchase',
    type: 'expense',
    icon: '🏅',
    description: '徽章、纪念品等采购成本',
    keywords: ['Pin Purchase', 'Merchandise', 'Hypergear', 'Lanyard', 'Souvenir'],
    sortOrder: 9,
    status: 'active',
  },
  {
    value: 'TXEXP-0010',
    label: '设计/制作费',
    labelEn: 'Design & Production Fee',
    type: 'expense',
    icon: '🎨',
    description: '设计、摄影、视频制作费用',
    keywords: ['Designer Fee', 'Video', 'Photobooth', 'Design', 'Production'],
    sortOrder: 10,
    status: 'active',
  },
  {
    value: 'TXEXP-0011',
    label: '活动制服',
    labelEn: 'Event Uniform',
    type: 'expense',
    icon: '👕',
    description: '活动委员会制服（非销售）',
    keywords: ['T-shirt', 'PoloT', 'Polo', 'Committee Uniform'],
    sortOrder: 11,
    status: 'active',
  },
  {
    value: 'TXEXP-0012',
    label: '会服采购（销售成本）',
    labelEn: 'Merchandise COGS',
    type: 'expense',
    icon: '🧥',
    description: '用于销售的会服采购成本',
    keywords: ['Jacket_Purchase', 'Shirt_Purchase', 'COGS', 'Merchandise Purchase'],
    sortOrder: 12,
    status: 'active',
  },
  {
    value: 'TXEXP-0013',
    label: '礼品/礼仪',
    labelEn: 'Gift & Token of Appreciation',
    type: 'expense',
    icon: '🎁',
    description: '赠送礼品、花篮、慰问品',
    keywords: ['Gift', 'TOA', 'Wreath', 'Flower', 'Appreciation'],
    sortOrder: 13,
    status: 'active',
  },
  {
    value: 'TXEXP-0014',
    label: '住宿费用',
    labelEn: 'Accommodation',
    type: 'expense',
    icon: '🏨',
    description: '活动相关的住宿费用',
    keywords: ['Hotel', 'Hotel Payment', 'Accommodation'],
    sortOrder: 14,
    status: 'active',
  },
  {
    value: 'TXEXP-0015',
    label: '旅游/参观费',
    labelEn: 'Tour & Visit',
    type: 'expense',
    icon: '✈️',
    description: '考察、参观、旅游活动费用',
    keywords: ['Tour Fee', 'Corporate Visit', 'APICC', 'Visit'],
    sortOrder: 15,
    status: 'active',
  },
  {
    value: 'TXEXP-0016',
    label: '活动报销',
    labelEn: 'Event Claim & Reimbursement',
    type: 'expense',
    icon: '📋',
    description: '活动相关的报销费用',
    keywords: ['Claim', 'Food Claim', 'Printing Claim', 'Reimbursement'],
    sortOrder: 16,
    status: 'active',
  },
  {
    value: 'TXEXP-0017',
    label: '退款支出',
    labelEn: 'Refund Paid',
    type: 'expense',
    icon: '💵',
    description: '退还给参与者的款项',
    keywords: ['Ticket Refund', 'Ticketing Refund', 'Refund Paid'],
    sortOrder: 17,
    status: 'active',
  },
  {
    value: 'TXEXP-0018',
    label: '秘书处管理费',
    labelEn: 'Secretariat Management',
    type: 'expense',
    icon: '💼',
    description: '秘书处日常管理和清洁费用',
    keywords: ['Secretariat', 'Management Fee', 'Cleaning Fee'],
    sortOrder: 18,
    status: 'active',
  },
  {
    value: 'TXEXP-0019',
    label: '公用事业费',
    labelEn: 'Utilities',
    type: 'expense',
    icon: '💡',
    description: '电费、水费、门牌税等公用事业费',
    keywords: ['Electricity', 'Water', 'Cukai Taksiran', 'Utilities', 'Indah Water'],
    sortOrder: 19,
    status: 'active',
  },
  {
    value: 'TXEXP-0020',
    label: '订阅/软件费',
    labelEn: 'Subscription & Software',
    type: 'expense',
    icon: '💻',
    description: '系统订阅、软件使用费',
    keywords: ['ZOOM', 'Subscription', 'Software', 'SaaS'],
    sortOrder: 20,
    status: 'active',
  },
  {
    value: 'TXEXP-0021',
    label: '专业服务费',
    labelEn: 'Professional Services',
    type: 'expense',
    icon: '🎓',
    description: '审计、培训、咨询等专业服务',
    keywords: ['Audit Fee', 'Training Fee', 'Consulting', 'Professional'],
    sortOrder: 21,
    status: 'active',
  },
  {
    value: 'TXEXP-0022',
    label: 'JCIM会费/年费',
    labelEn: 'JCIM Membership Dues',
    type: 'expense',
    icon: '📋',
    description: '缴纳给JCIM的会费和组织费',
    keywords: ['JCIM Membership Due', 'Area Dues', 'JCIM Due'],
    sortOrder: 22,
    status: 'active',
  },
  {
    value: 'TXEXP-0023',
    label: '奖项/提案费',
    labelEn: 'Award & Submission Fee',
    type: 'expense',
    icon: '🏆',
    description: '参加奖项评选和提案的费用',
    keywords: ['SDA Submission', 'E-award', 'APBN Submission', 'Award Fee'],
    sortOrder: 23,
    status: 'active',
  },
  {
    value: 'TXEXP-0024',
    label: '活动娱乐/表演',
    labelEn: 'Entertainment & Performance',
    type: 'expense',
    icon: '🎭',
    description: '舞狮、表演、娱乐节目费用',
    keywords: ['Lion Dance', 'Singer', 'Entertainment', 'Performance', 'SingK'],
    sortOrder: 24,
    status: 'active',
  },
  {
    value: 'TXEXP-0025',
    label: '其他支出',
    labelEn: 'Other Expenses',
    type: 'expense',
    icon: '📦',
    description: '杂项、临时、其他支出',
    keywords: ['Misc', 'Socket', 'Light Stick', 'Others', 'Miscellaneous'],
    sortOrder: 25,
    status: 'active',
  },
];

/**
 * 检查类别是否已存在
 */
const checkCategoryExists = async (categoryId: string): Promise<boolean> => {
  try {
    const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_CATEGORIES));
    return snapshot.docs.some(doc => doc.id === categoryId);
  } catch (error) {
    console.error(`❌ Failed to check if category ${categoryId} exists:`, error);
    return false;
  }
};

/**
 * 创建单个类别
 */
const createCategory = async (
  category: CategoryTemplate,
  userId: string = 'system-init'
): Promise<boolean> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.FINANCIAL_CATEGORIES, category.value);
    
    // 检查是否已存在
    const exists = await checkCategoryExists(category.value);
    if (exists) {
      console.log(`⏭️  Category ${category.value} already exists, skipping...`);
      return false;
    }
    
    const now = new Date().toISOString();
    const data = cleanUndefinedValues({
      value: category.value,
      label: category.label,
      labelEn: category.labelEn,
      type: category.type,
      icon: category.icon,
      description: category.description,
      keywords: category.keywords,
      sortOrder: category.sortOrder,
      status: category.status,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });

    await setDoc(docRef, data);
    console.log(`✅ Created: ${category.value} - ${category.label}`);
    return true;
    
  } catch (error: any) {
    console.error(`❌ Failed to create ${category.value}:`, error);
    return false;
  }
};

/**
 * 批量创建所有类别
 */
export const initializeFinancialCategories = async (
  userId: string = 'system-init'
): Promise<{
  total: number;
  created: number;
  skipped: number;
  failed: number;
}> => {
  console.log('🚀 Starting financial categories initialization...');
  console.log(`📊 Total categories to create: ${INCOME_CATEGORIES.length + EXPENSE_CATEGORIES.length}`);
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  // 创建收入类别
  console.log('\n💰 Creating INCOME categories...');
  for (const category of INCOME_CATEGORIES) {
    const result = await createCategory(category, userId);
    if (result === true) created++;
    else if (result === false) skipped++;
    else failed++;
  }
  
  // 创建支出类别
  console.log('\n💸 Creating EXPENSE categories...');
  for (const category of EXPENSE_CATEGORIES) {
    const result = await createCategory(category, userId);
    if (result === true) created++;
    else if (result === false) skipped++;
    else failed++;
  }
  
  const total = INCOME_CATEGORIES.length + EXPENSE_CATEGORIES.length;
  
  console.log('\n✅ Financial categories initialization completed!');
  console.log(`📊 Summary:`);
  console.log(`   - Total: ${total}`);
  console.log(`   - Created: ${created}`);
  console.log(`   - Skipped (already exists): ${skipped}`);
  console.log(`   - Failed: ${failed}`);
  
  return { total, created, skipped, failed };
};

/**
 * 批量创建核心类别（阶段1）
 */
export const initializeCoreCategories = async (
  userId: string = 'system-init'
): Promise<{
  total: number;
  created: number;
  skipped: number;
  failed: number;
}> => {
  console.log('🚀 Starting CORE financial categories initialization...');
  
  // 核心收入类别（6个）
  const coreIncome = [
    INCOME_CATEGORIES[0], // 活动门票-会员
    INCOME_CATEGORIES[1], // 活动门票-非会员
    INCOME_CATEGORIES[3], // 大型活动门票
    INCOME_CATEGORIES[4], // 企业赞助
    INCOME_CATEGORIES[7], // 新会员费
    INCOME_CATEGORIES[8], // 续会费
  ];
  
  // 核心支出类别（9个）
  const coreExpense = [
    EXPENSE_CATEGORIES[0],  // 场地租金
    EXPENSE_CATEGORIES[2],  // 餐饮费用
    EXPENSE_CATEGORIES[5],  // 印刷品
    EXPENSE_CATEGORIES[6],  // 文具用品
    EXPENSE_CATEGORIES[15], // 活动报销
    EXPENSE_CATEGORIES[17], // 秘书处管理费
    EXPENSE_CATEGORIES[18], // 公用事业费
    EXPENSE_CATEGORIES[21], // JCIM会费/年费
    EXPENSE_CATEGORIES[24], // 其他支出
  ];
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  console.log(`📊 Core categories to create: ${coreIncome.length + coreExpense.length}`);
  
  // 创建核心收入类别
  console.log('\n💰 Creating CORE INCOME categories...');
  for (const category of coreIncome) {
    const result = await createCategory(category, userId);
    if (result === true) created++;
    else if (result === false) skipped++;
    else failed++;
  }
  
  // 创建核心支出类别
  console.log('\n💸 Creating CORE EXPENSE categories...');
  for (const category of coreExpense) {
    const result = await createCategory(category, userId);
    if (result === true) created++;
    else if (result === false) skipped++;
    else failed++;
  }
  
  const total = coreIncome.length + coreExpense.length;
  
  console.log('\n✅ Core categories initialization completed!');
  console.log(`📊 Summary:`);
  console.log(`   - Total: ${total}`);
  console.log(`   - Created: ${created}`);
  console.log(`   - Skipped: ${skipped}`);
  console.log(`   - Failed: ${failed}`);
  
  return { total, created, skipped, failed };
};

/**
 * 导出所有类别模板（用于文档生成）
 */
export const getAllCategoryTemplates = () => ({
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
  total: INCOME_CATEGORIES.length + EXPENSE_CATEGORIES.length,
});

console.log('✅ Financial Categories Initialization Script Loaded');

