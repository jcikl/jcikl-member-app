/**
 * Reset Financial Records Script
 * 重置 FINANCIAL_RECORDS 集合脚本
 * 
 * ⚠️ 警告：此脚本会删除所有 financial_records 记录
 */

import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GLOBAL_COLLECTIONS } from '../config/globalCollections';

async function resetFinancialRecords() {
  try {
    console.log('🔍 开始检查 FINANCIAL_RECORDS 集合...\n');
    
    const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    
    if (snapshot.empty) {
      console.log('✅ FINANCIAL_RECORDS 集合已经为空\n');
      return;
    }

    console.log(`⚠️  发现 ${snapshot.size} 条记录\n`);

    // 按类型统计
    const typeCount = new Map<string, number>();
    snapshot.docs.forEach(doc => {
      const type = doc.data().type || 'unknown';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });

    console.log('📊 记录类型统计:');
    typeCount.forEach((count, type) => {
      console.log(`  - ${type}: ${count} 条`);
    });
    console.log('');

    // 确认删除
    console.log('⚠️  即将删除所有记录...');
    console.log('💥 此操作不可撤销！\n');

    // 删除所有记录
    console.log('🗑️  开始删除...\n');
    
    let deletedCount = 0;
    const deletePromises = snapshot.docs.map(async (doc) => {
      await deleteDoc(doc.ref);
      deletedCount++;
      if (deletedCount % 10 === 0 || deletedCount === snapshot.size) {
        console.log(`  已删除 ${deletedCount}/${snapshot.size} 条记录...`);
      }
    });

    await Promise.all(deletePromises);

    console.log('\n✅ 成功删除所有记录');
    console.log(`📊 总计删除: ${deletedCount} 条记录\n`);

  } catch (error) {
    console.error('❌ 删除失败:', error);
    throw error;
  }
}

// 运行脚本
console.log('═'.repeat(80));
console.log('🔧 FINANCIAL_RECORDS 重置工具');
console.log('═'.repeat(80));
console.log('');

resetFinancialRecords()
  .then(() => {
    console.log('🎉 脚本执行完成\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });

