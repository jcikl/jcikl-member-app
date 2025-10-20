/**
 * Data Migration Script: subCategory → txAccount
 * 数据迁移脚本：将 subCategory 字段重命名为 txAccount
 * 
 * ⚠️ IMPORTANT: This script uses Firebase Admin SDK and requires service account credentials
 * 
 * Setup:
 *   1. Download service account key from Firebase Console
 *   2. Save as 'serviceAccountKey.json' in project root
 *   3. Add to .gitignore (already done)
 * 
 * Usage:
 *   npm run migrate:subcategory:dry     # 预览模式（不写入）
 *   npm run migrate:subcategory         # 执行迁移
 *   npm run migrate:subcategory:rollback # 回滚迁移
 */

import * as admin from 'firebase-admin';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
let serviceAccount: any;

try {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log('✅ Service account key loaded');
  } else {
    console.error('❌ serviceAccountKey.json not found!');
    console.error('📝 Please download it from Firebase Console:');
    console.error('   Project Settings → Service Accounts → Generate new private key');
    console.error('   Save as: serviceAccountKey.json');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to load service account key:', error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Migration configuration
const COLLECTIONS_TO_MIGRATE = [
  'transactions',
  'member_fees',
  'event_financial_records',
  'general_financial_records',
];

const BATCH_SIZE = 500; // Firestore batch limit

// Migration statistics
interface MigrationStats {
  collectionName: string;
  totalDocs: number;
  docsWithField: number;
  migrated: number;
  failed: number;
  skipped: number;
}

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRollback = args.includes('--rollback');
const removeOldField = args.includes('--remove-old');

/**
 * Ask for user confirmation
 */
async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Migrate a single collection
 */
async function migrateCollection(
  collectionName: string,
  dryRun: boolean,
  rollback: boolean,
  removeOld: boolean
): Promise<MigrationStats> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 Collection: ${collectionName}`);
  console.log(`${'='.repeat(60)}`);

  const stats: MigrationStats = {
    collectionName,
    totalDocs: 0,
    docsWithField: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Get all documents
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    stats.totalDocs = snapshot.size;
    console.log(`📊 Total documents: ${stats.totalDocs}`);

    if (stats.totalDocs === 0) {
      console.log(`⚠️  Collection is empty, skipping...`);
      return stats;
    }

    // Filter documents with subCategory or txAccount
    const docsToMigrate: any[] = [];
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      
      if (rollback) {
        // Rollback: has txAccount
        if (data.txAccount !== undefined) {
          docsToMigrate.push({
            id: docSnapshot.id,
            ref: docSnapshot.ref,
            data: data,
          });
        }
      } else {
        // Forward migration: has subCategory
        if (data.subCategory !== undefined) {
          docsToMigrate.push({
            id: docSnapshot.id,
            ref: docSnapshot.ref,
            data: data,
          });
        }
      }
    });

    stats.docsWithField = docsToMigrate.length;
    console.log(`📝 Documents to migrate: ${stats.docsWithField}`);

    if (stats.docsWithField === 0) {
      console.log(`✅ No documents need migration`);
      return stats;
    }

    // Show sample documents
    console.log(`\n📋 Sample documents (first 3):`);
    docsToMigrate.slice(0, 3).forEach((doc, index) => {
      if (rollback) {
        console.log(`   ${index + 1}. ID: ${doc.id}`);
        console.log(`      txAccount: "${doc.data.txAccount}" → subCategory`);
      } else {
        console.log(`   ${index + 1}. ID: ${doc.id}`);
        console.log(`      subCategory: "${doc.data.subCategory}" → txAccount`);
      }
    });

    if (dryRun) {
      console.log(`\n🔍 DRY RUN MODE - No changes will be made`);
      stats.skipped = stats.docsWithField;
      return stats;
    }

    // Perform migration in batches
    console.log(`\n🚀 Starting migration...`);
    
    for (let i = 0; i < docsToMigrate.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchDocs = docsToMigrate.slice(i, i + BATCH_SIZE);
      
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(docsToMigrate.length / BATCH_SIZE)}`);
      
      for (const docToMigrate of batchDocs) {
        try {
          if (rollback) {
            // Rollback: txAccount → subCategory
            const updates: any = {
              subCategory: docToMigrate.data.txAccount,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            if (removeOld) {
              // Remove txAccount field
              updates.txAccount = admin.firestore.FieldValue.delete();
            }
            
            batch.update(docToMigrate.ref, updates);
          } else {
            // Forward: subCategory → txAccount
            const updates: any = {
              txAccount: docToMigrate.data.subCategory,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            if (removeOld) {
              // Remove subCategory field
              updates.subCategory = admin.firestore.FieldValue.delete();
            }
            
            batch.update(docToMigrate.ref, updates);
          }
          
          stats.migrated++;
        } catch (error) {
          console.error(`❌ Failed to process doc ${docToMigrate.id}:`, error);
          stats.failed++;
        }
      }
      
      // Commit batch
      try {
        await batch.commit();
        console.log(`✅ Batch committed: ${batchDocs.length} documents`);
      } catch (error) {
        console.error(`❌ Batch commit failed:`, error);
        stats.failed += batchDocs.length;
        stats.migrated -= batchDocs.length;
      }
      
      // Progress indicator
      const progress = Math.min(((i + BATCH_SIZE) / docsToMigrate.length) * 100, 100);
      console.log(`📊 Progress: ${progress.toFixed(1)}%`);
    }

    console.log(`\n✅ Collection migration completed!`);

  } catch (error: any) {
    console.error(`❌ Migration failed for ${collectionName}:`, error);
  }

  return stats;
}

/**
 * Generate migration report
 */
function generateReport(allStats: MigrationStats[]): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 MIGRATION REPORT`);
  console.log(`${'='.repeat(80)}\n`);

  const totalStats = {
    totalDocs: 0,
    docsWithField: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
  };

  console.log(`┌─────────────────────────┬───────┬──────────┬──────────┬────────┬─────────┐`);
  console.log(`│ Collection              │ Total │ To Migrate│ Migrated │ Failed │ Skipped │`);
  console.log(`├─────────────────────────┼───────┼──────────┼──────────┼────────┼─────────┤`);

  allStats.forEach((stats) => {
    console.log(
      `│ ${stats.collectionName.padEnd(23)} │ ${String(stats.totalDocs).padStart(5)} │ ${String(
        stats.docsWithField
      ).padStart(8)} │ ${String(stats.migrated).padStart(8)} │ ${String(stats.failed).padStart(6)} │ ${String(
        stats.skipped
      ).padStart(7)} │`
    );

    totalStats.totalDocs += stats.totalDocs;
    totalStats.docsWithField += stats.docsWithField;
    totalStats.migrated += stats.migrated;
    totalStats.failed += stats.failed;
    totalStats.skipped += stats.skipped;
  });

  console.log(`├─────────────────────────┼───────┼──────────┼──────────┼────────┼─────────┤`);
  console.log(
    `│ ${'TOTAL'.padEnd(23)} │ ${String(totalStats.totalDocs).padStart(5)} │ ${String(
      totalStats.docsWithField
    ).padStart(8)} │ ${String(totalStats.migrated).padStart(8)} │ ${String(
      totalStats.failed
    ).padStart(6)} │ ${String(totalStats.skipped).padStart(7)} │`
  );
  console.log(`└─────────────────────────┴───────┴──────────┴──────────┴────────┴─────────┘\n`);

  // Success/Failure summary
  if (totalStats.failed > 0) {
    console.log(`⚠️  WARNING: ${totalStats.failed} documents failed to migrate!`);
  }

  if (totalStats.migrated > 0) {
    console.log(`✅ SUCCESS: ${totalStats.migrated} documents migrated successfully!`);
  }

  if (totalStats.skipped > 0) {
    console.log(`🔍 DRY RUN: ${totalStats.skipped} documents would be migrated`);
  }

  if (totalStats.docsWithField === 0) {
    console.log(`✨ All collections are already migrated!`);
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 DATA MIGRATION: subCategory → txAccount`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN' : isRollback ? '⏪ ROLLBACK' : '✏️  EXECUTE'}`);
  console.log(`Remove old field: ${removeOldField ? '✅ Yes' : '❌ No'}`);
  console.log(`Collections: ${COLLECTIONS_TO_MIGRATE.length}`);
  console.log(`Batch size: ${BATCH_SIZE}\n`);

  // Safety confirmation
  if (!isDryRun) {
    console.log(`⚠️  WARNING: This will modify production data!\n`);
    
    const confirmed = await confirm(
      isRollback 
        ? '🔴 Are you sure you want to ROLLBACK (txAccount → subCategory)?' 
        : '🟡 Are you sure you want to proceed with migration (subCategory → txAccount)?'
    );

    if (!confirmed) {
      console.log(`\n❌ Migration cancelled by user`);
      process.exit(0);
    }

    if (removeOldField) {
      const confirmedRemove = await confirm(
        '🔴 Are you ABSOLUTELY SURE you want to REMOVE the old field? This cannot be undone!'
      );

      if (!confirmedRemove) {
        console.log(`\n❌ Migration cancelled - old field will be kept`);
        process.exit(0);
      }
    }
  }

  console.log(`\n🚀 Starting migration...\n`);

  const allStats: MigrationStats[] = [];

  // Migrate each collection
  for (const collectionName of COLLECTIONS_TO_MIGRATE) {
    const stats = await migrateCollection(
      collectionName,
      isDryRun,
      isRollback,
      removeOldField
    );
    allStats.push(stats);
  }

  // Generate report
  generateReport(allStats);

  // Final summary
  console.log(`\n${'='.repeat(80)}`);
  if (isDryRun) {
    console.log(`🔍 DRY RUN COMPLETED - No changes were made to the database`);
    console.log(`\n💡 To execute migration, run: npm run migrate:subcategory`);
  } else if (isRollback) {
    console.log(`⏪ ROLLBACK COMPLETED`);
    console.log(`\n✅ Data has been rolled back to 'subCategory' field`);
  } else {
    console.log(`✅ MIGRATION COMPLETED`);
    console.log(`\n✅ All 'subCategory' fields have been migrated to 'txAccount'`);
    
    if (!removeOldField) {
      console.log(`\n💡 Old 'subCategory' fields are still present for safety`);
      console.log(`   To remove them, run: npm run migrate:subcategory -- --remove-old`);
    }
  }
  console.log(`${'='.repeat(80)}\n`);

  process.exit(0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run migration
main().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
