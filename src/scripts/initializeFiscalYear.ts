/**
 * Initialize Fiscal Year
 * 初始化财年数据
 * 
 * Run this script once to create the default fiscal year
 */

import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GLOBAL_COLLECTIONS } from '../config/globalCollections';

export const initializeFiscalYear = async () => {
  try {
    console.log('🔄 开始初始化财年...');

    // Create FY2024 (Oct 1, 2024 - Sep 30, 2025)
    const fy2024 = {
      name: 'FY2024',
      year: 2024,
      startDate: '2024-10-01',
      endDate: '2025-09-30',
      status: 'active',
      isDefault: true,
      description: '2024财政年度 (2024年10月1日 - 2025年9月30日)',
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      notes: '默认财年，由系统自动创建',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.FISCAL_YEARS),
      fy2024
    );

    console.log('✅ FY2024 创建成功，ID:', docRef.id);

    // Create FY2023 for historical data
    const fy2023 = {
      name: 'FY2023',
      year: 2023,
      startDate: '2023-10-01',
      endDate: '2024-09-30',
      status: 'closed',
      isDefault: false,
      description: '2023财政年度 (2023年10月1日 - 2024年9月30日)',
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      notes: '历史财年',
      closedAt: '2024-09-30T23:59:59.000Z',
      closedBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef2 = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.FISCAL_YEARS),
      fy2023
    );

    console.log('✅ FY2023 创建成功，ID:', docRef2.id);
    console.log('🎉 财年初始化完成！');

    return { fy2024: docRef.id, fy2023: docRef2.id };
  } catch (error) {
    console.error('❌ 财年初始化失败:', error);
    throw error;
  }
};

// Uncomment to run directly
// initializeFiscalYear();

