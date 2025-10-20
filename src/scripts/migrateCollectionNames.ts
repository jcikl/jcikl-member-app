/**
 * Firestore Collection Names Migration Script
 * Firestore 集合名称迁移脚本
 * 
 * 用途：将旧的集合名称迁移到新的命名规范
 * 
 * 集合重命名映射：
 * 1. transactions → fin_transactions
 * 2. transactionPurposes → fin_txPurpose
 * 3. financeEvents → fin_projects
 * 4. financialCategories → fin_txCat
 * 5. financialRecords → fin_records
 * 6. eventAccounts → projectAccounts
 * 7. events → projects
 * 
 * 使用方法：
 * 1. 预览（不执行）: npm run migrate:collections:dry
 * 2. 执行迁移: npm run migrate:collections
 * 3. 回滚: npm run migrate:collections:rollback
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ========== 配置 ==========

// 集合重命名映射
const COLLECTION_MIGRATIONS = [
  { old: 'transactions', new: 'fin_transactions' },
  { old: 'transactionPurposes', new: 'fin_txPurpose' },
  { old: 'financeEvents', new: 'fin_projects' },
  { old: 'financialCategories', new: 'fin_txCat' },
  { old: 'financialRecords', new: 'fin_records' },
  { old: 'eventAccounts', new: 'projectAccounts' },
  { old: 'events', new: 'projects' },
];

// 批处理大小
const BATCH_SIZE = 500;

// 备份目录
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'collection-migration');

// ========== 初始化 Firebase Admin ==========

// 检查服务账户密钥文件
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ 错误: serviceAccountKey.json 文件不存在！');
  console.error('📝 请从 Firebase Console 下载服务账户密钥并保存为 serviceAccountKey.json');
  console.error('📍 位置: Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
  process.exit(1);
}

// 初始化 Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ========== 工具函数 ==========

/**
 * 创建备份目录
 */
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * 保存备份数据
 */
function saveBackup(collectionName: string, data: any[]): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `${collectionName}_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');
  return backupFile;
}

/**
 * 获取集合所有文档
 */
async function getAllDocuments(collectionName: string): Promise<admin.firestore.DocumentData[]> {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * 复制集合数据
 */
async function copyCollection(
  sourceCollection: string,
  targetCollection: string,
  dryRun: boolean = false
): Promise<{
  success: boolean;
  totalDocs: number;
  copiedDocs: number;
  backupFile?: string;
}> {
  console.log(`\n🔄 [${sourceCollection}] → [${targetCollection}]`);

  try {
    // 1. 获取源集合所有文档
    console.log(`   📊 获取 [${sourceCollection}] 集合数据...`);
    const sourceDocs = await getAllDocuments(sourceCollection);
    console.log(`   ✅ 找到 ${sourceDocs.length} 条记录`);

    if (sourceDocs.length === 0) {
      console.log(`   ⚠️  集合 [${sourceCollection}] 为空，跳过迁移`);
      return { success: true, totalDocs: 0, copiedDocs: 0 };
    }

    // 2. 创建备份
    if (!dryRun) {
      console.log(`   💾 创建备份...`);
      const backupFile = saveBackup(sourceCollection, sourceDocs);
      console.log(`   ✅ 备份已保存: ${backupFile}`);
    }

    // 3. 检查目标集合是否已存在数据
    const targetSnapshot = await db.collection(targetCollection).limit(1).get();
    if (!targetSnapshot.empty && !dryRun) {
      console.log(`   ⚠️  目标集合 [${targetCollection}] 已有数据！`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>(resolve => {
        readline.question('   是否覆盖现有数据？(yes/no): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log(`   ❌ 用户取消操作`);
        return { success: false, totalDocs: sourceDocs.length, copiedDocs: 0 };
      }
    }

    // 4. 复制数据
    if (dryRun) {
      console.log(`   🔍 [DRY RUN] 将复制 ${sourceDocs.length} 条记录到 [${targetCollection}]`);
      console.log(`   📄 示例文档 ID: ${sourceDocs.slice(0, 3).map(d => d.id).join(', ')}...`);
      return { success: true, totalDocs: sourceDocs.length, copiedDocs: sourceDocs.length };
    }

    console.log(`   📝 开始复制数据...`);
    let copiedCount = 0;

    // 分批处理
    for (let i = 0; i < sourceDocs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchDocs = sourceDocs.slice(i, Math.min(i + BATCH_SIZE, sourceDocs.length));

      for (const doc of batchDocs) {
        const { id, ...data } = doc;
        const targetRef = db.collection(targetCollection).doc(id);
        batch.set(targetRef, data);
      }

      await batch.commit();
      copiedCount += batchDocs.length;
      console.log(`   ✅ 已复制 ${copiedCount}/${sourceDocs.length} 条记录`);
    }

    console.log(`   🎉 [${sourceCollection}] 迁移完成！`);
    return {
      success: true,
      totalDocs: sourceDocs.length,
      copiedDocs: copiedCount,
      backupFile: saveBackup(sourceCollection, sourceDocs),
    };
  } catch (error: any) {
    console.error(`   ❌ 迁移失败:`, error.message);
    return { success: false, totalDocs: 0, copiedDocs: 0 };
  }
}

/**
 * 回滚操作：从新集合复制回旧集合
 */
async function rollbackCollection(
  sourceCollection: string,
  targetCollection: string
): Promise<{ success: boolean; totalDocs: number; copiedDocs: number }> {
  console.log(`\n↩️  [${targetCollection}] → [${sourceCollection}] (回滚)`);

  try {
    // 检查新集合是否有数据
    const newDocs = await getAllDocuments(targetCollection);
    console.log(`   📊 [${targetCollection}] 集合有 ${newDocs.length} 条记录`);

    if (newDocs.length === 0) {
      console.log(`   ⚠️  新集合为空，无需回滚`);
      return { success: true, totalDocs: 0, copiedDocs: 0 };
    }

    // 复制回旧集合
    console.log(`   📝 开始回滚数据...`);
    let copiedCount = 0;

    for (let i = 0; i < newDocs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchDocs = newDocs.slice(i, Math.min(i + BATCH_SIZE, newDocs.length));

      for (const doc of batchDocs) {
        const { id, ...data } = doc;
        const targetRef = db.collection(sourceCollection).doc(id);
        batch.set(targetRef, data);
      }

      await batch.commit();
      copiedCount += batchDocs.length;
      console.log(`   ✅ 已回滚 ${copiedCount}/${newDocs.length} 条记录`);
    }

    console.log(`   🎉 回滚完成！`);
    return { success: true, totalDocs: newDocs.length, copiedDocs: copiedCount };
  } catch (error: any) {
    console.error(`   ❌ 回滚失败:`, error.message);
    return { success: false, totalDocs: 0, copiedDocs: 0 };
  }
}

// ========== 主函数 ==========

/**
 * 执行迁移
 */
async function migrate(dryRun: boolean = false): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       Firestore Collection Names Migration                           ║');
  console.log('║       Firestore 集合名称迁移                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  
  if (dryRun) {
    console.log('\n🔍 [DRY RUN MODE] 预览模式 - 不会执行实际操作\n');
  } else {
    console.log('\n⚠️  [PRODUCTION MODE] 生产模式 - 将执行实际迁移操作\n');
    ensureBackupDir();
  }

  console.log('📋 迁移计划:');
  COLLECTION_MIGRATIONS.forEach((migration, index) => {
    console.log(`   ${index + 1}. ${migration.old} → ${migration.new}`);
  });

  const results = [];

  for (const migration of COLLECTION_MIGRATIONS) {
    const result = await copyCollection(migration.old, migration.new, dryRun);
    results.push({ ...migration, ...result });
  }

  // 汇总结果
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       Migration Summary (迁移汇总)                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  let totalDocs = 0;
  let totalCopied = 0;
  let successCount = 0;

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.old} → ${result.new}`);
    console.log(`   - 总文档数: ${result.totalDocs}`);
    console.log(`   - 已复制: ${result.copiedDocs}`);
    if (result.backupFile) {
      console.log(`   - 备份文件: ${result.backupFile}`);
    }
    console.log('');

    totalDocs += result.totalDocs;
    totalCopied += result.copiedDocs;
    if (result.success) successCount++;
  });

  console.log(`📊 统计:`);
  console.log(`   - 成功: ${successCount}/${results.length}`);
  console.log(`   - 总文档数: ${totalDocs}`);
  console.log(`   - 已复制: ${totalCopied}`);

  if (!dryRun && successCount === results.length) {
    console.log('\n✅ 迁移完成！');
    console.log('📝 后续步骤:');
    console.log('   1. 验证新集合数据完整性');
    console.log('   2. 部署更新的 firestore.rules 和 firestore.indexes.json');
    console.log('   3. 部署前端代码更新');
    console.log('   4. 确认系统正常运行后，删除旧集合');
  }
}

/**
 * 执行回滚
 */
async function rollback(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       Firestore Collection Names Rollback                            ║');
  console.log('║       Firestore 集合名称回滚                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  console.log('⚠️  警告：此操作将从新集合复制数据回旧集合！\n');

  const results = [];

  for (const migration of COLLECTION_MIGRATIONS) {
    const result = await rollbackCollection(migration.old, migration.new);
    results.push({ ...migration, ...result });
  }

  // 汇总结果
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       Rollback Summary (回滚汇总)                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  let successCount = 0;
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.new} → ${result.old}`);
    console.log(`   - 回滚文档数: ${result.copiedDocs}/${result.totalDocs}\n`);
    if (result.success) successCount++;
  });

  console.log(`📊 统计: 成功 ${successCount}/${results.length}`);

  if (successCount === results.length) {
    console.log('\n✅ 回滚完成！');
  }
}

// ========== 执行 ==========

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRollback = args.includes('--rollback');

if (isRollback) {
  rollback()
    .then(() => {
      console.log('\n🎉 回滚脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 回滚脚本执行失败:', error);
      process.exit(1);
    });
} else {
  migrate(isDryRun)
    .then(() => {
      console.log('\n🎉 迁移脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

