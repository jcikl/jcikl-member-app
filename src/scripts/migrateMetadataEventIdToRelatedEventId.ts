/**
 * Migrate metadata.eventId to relatedEventId Field
 * 将 metadata.eventId 迁移到 relatedEventId 字段
 * 
 * 用途：修复数据结构不匹配问题
 * - 实际数据存储在 metadata.eventId
 * - 代码查询使用 relatedEventId
 * 
 * 执行：npm run migrate:eventid
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ========== 初始化 Firebase Admin ==========

const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ 错误: serviceAccountKey.json 文件不存在！');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const BATCH_SIZE = 500;

// ========== 迁移函数 ==========

async function migrate() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║   Migrate metadata.eventId → relatedEventId                          ║');
  console.log('║   迁移 metadata.eventId 到 relatedEventId 字段                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. 获取所有交易记录
    console.log('📊 读取 fin_transactions 集合...');
    const snapshot = await db.collection('fin_transactions').get();
    console.log(`✅ 找到 ${snapshot.size} 条交易记录\n`);

    if (snapshot.empty) {
      console.log('⚠️  集合为空，无需迁移');
      return;
    }

    // 2. 筛选需要迁移的文档
    let needMigrationCount = 0;
    let alreadyMigratedCount = 0;
    let noEventIdCount = 0;

    const docsToMigrate: admin.firestore.QueryDocumentSnapshot[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const metadataEventId = data.metadata?.eventId;
      const relatedEventId = data.relatedEventId;

      if (metadataEventId && !relatedEventId) {
        // 有 metadata.eventId 但没有 relatedEventId
        needMigrationCount++;
        docsToMigrate.push(doc);
      } else if (relatedEventId) {
        // 已经有 relatedEventId
        alreadyMigratedCount++;
      } else {
        // 没有任何 eventId
        noEventIdCount++;
      }
    });

    console.log('📋 统计结果:');
    console.log(`   • 需要迁移: ${needMigrationCount} 条`);
    console.log(`   • 已有 relatedEventId: ${alreadyMigratedCount} 条`);
    console.log(`   • 无活动关联: ${noEventIdCount} 条`);
    console.log('');

    if (needMigrationCount === 0) {
      console.log('✅ 无需迁移，所有数据已正确设置！');
      return;
    }

    // 3. 执行迁移
    console.log(`🚀 开始迁移 ${needMigrationCount} 条记录...\n`);
    let migratedCount = 0;

    for (let i = 0; i < docsToMigrate.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchDocs = docsToMigrate.slice(i, Math.min(i + BATCH_SIZE, docsToMigrate.length));

      batchDocs.forEach(doc => {
        const data = doc.data();
        const eventId = data.metadata?.eventId;

        if (eventId) {
          batch.update(doc.ref, {
            relatedEventId: eventId,
            // 保留原 metadata（向后兼容）
            updatedAt: new Date().toISOString(),
          });
        }
      });

      await batch.commit();
      migratedCount += batchDocs.length;
      console.log(`   ✅ 已迁移 ${migratedCount}/${needMigrationCount} 条记录`);
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║                     ✅ 迁移完成！                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 迁移结果:');
    console.log(`   • 成功迁移: ${migratedCount} 条`);
    console.log(`   • metadata.eventId → relatedEventId ✅`);
    console.log(`   • 保留原 metadata.eventId（向后兼容）✅`);
    console.log('');

    console.log('✅ 下一步:');
    console.log('   1. 部署 Firestore 索引');
    console.log('   2. 验证活动账户管理页面功能');
    console.log('   3. 移除无用的 projectAccountId 索引');

  } catch (error: any) {
    console.error('\n❌ 迁移失败:', error.message);
    throw error;
  }
}

// ========== 执行 ==========

migrate()
  .then(() => {
    console.log('\n🎉 脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 脚本执行失败:', error);
    process.exit(1);
  });

