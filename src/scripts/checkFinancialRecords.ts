/**
 * Check Financial Records Script
 * 检查 FINANCIAL_RECORDS 集合中的所有记录
 * 
 * 用途：查看当前系统中有哪些类型的 financial records
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GLOBAL_COLLECTIONS } from '../config/globalCollections';

interface FinancialRecordSummary {
  id: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

async function checkFinancialRecords() {
  try {
    console.log('🔍 开始检查 FINANCIAL_RECORDS 集合...\n');
    
    const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
    
    console.log(`📊 总记录数: ${snapshot.size}\n`);
    
    if (snapshot.empty) {
      console.log('⚠️ FINANCIAL_RECORDS 集合为空\n');
      return;
    }

    // 按类型分组统计
    const typeCount = new Map<string, number>();
    const recordsByType = new Map<string, FinancialRecordSummary[]>();

    snapshot.docs.forEach(doc => {
      const data = doc.data() as FinancialRecordSummary;
      const record: FinancialRecordSummary = {
        ...data,
        id: doc.id,
      };

      const type = data.type || 'unknown';
      
      // 统计计数
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
      
      // 按类型分组
      if (!recordsByType.has(type)) {
        recordsByType.set(type, []);
      }
      recordsByType.get(type)!.push(record);
    });

    // 打印统计信息
    console.log('📈 按类型统计:');
    console.log('='.repeat(80));
    typeCount.forEach((count, type) => {
      console.log(`  ${type.padEnd(20)} : ${count} 条记录`);
    });
    console.log('='.repeat(80));
    console.log('\n');

    // 打印每种类型的详细信息
    recordsByType.forEach((records, type) => {
      console.log(`\n📋 类型: ${type.toUpperCase()}`);
      console.log('-'.repeat(80));
      
      records.slice(0, 3).forEach((record, index) => {
        console.log(`\n  记录 #${index + 1} (ID: ${record.id}):`);
        
        // 打印关键字段
        const keyFields: Record<string, string[]> = {
          memberFee: [
            'memberId', 'memberName', 'memberCategory', 'fiscalYear',
            'feeType', 'expectedAmount', 'paidAmount', 'remainingAmount',
            'status', 'dueDate', 'paymentDate', 'transactionId'
          ],
          budget: [
            'name', 'fiscalYear', 'period', 'totalBudget', 'totalAllocated',
            'totalSpent', 'totalRemaining', 'status'
          ],
          unknown: Object.keys(record).filter(k => k !== 'id'),
        };

        const fieldsToShow = keyFields[type] || keyFields.unknown;
        
        fieldsToShow.forEach(field => {
          if (record[field] !== undefined) {
            let value = record[field];
            
            // 格式化显示
            if (typeof value === 'number') {
              if (field.includes('Amount') || field.includes('Budget') || field.includes('Spent')) {
                value = `RM ${value.toFixed(2)}`;
              }
            } else if (typeof value === 'string' && value.length > 50) {
              value = value.substring(0, 47) + '...';
            }
            
            console.log(`    ${field.padEnd(25)} : ${value}`);
          }
        });
      });

      if (records.length > 3) {
        console.log(`\n  ... 还有 ${records.length - 3} 条记录未显示`);
      }
      
      console.log('-'.repeat(80));
    });

    console.log('\n✅ 检查完成\n');

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }
}

// 运行脚本
checkFinancialRecords()
  .then(() => {
    console.log('🎉 脚本执行成功');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });

