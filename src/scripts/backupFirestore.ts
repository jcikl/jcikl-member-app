/**
 * Firestore Backup Script
 * Firestore 备份脚本
 * 
 * 快速备份关键集合到本地 JSON 文件
 * 
 * Setup:
 *   1. Download service account key from Firebase Console
 *   2. Save as 'serviceAccountKey.json' in project root
 * 
 * Usage:
 *   npm run backup:firestore
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

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

// Collections to backup
const COLLECTIONS_TO_BACKUP = [
  'transactions',
  'member_fees',
  'event_financial_records',
  'general_financial_records',
  'bank_accounts',
  'members',
  'events',
];

/**
 * Backup a single collection
 */
async function backupCollection(collectionName: string, outputDir: string): Promise<number> {
  console.log(`📦 Backing up collection: ${collectionName}`);

  try {
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();

    const data: any[] = [];
    snapshot.forEach((doc) => {
      const docData = doc.data();
      
      // Convert Firestore Timestamps to ISO strings for JSON serialization
      const serializedData: any = { id: doc.id };
      
      Object.keys(docData).forEach(key => {
        const value = docData[key];
        if (value && typeof value === 'object' && value.toDate) {
          // Firestore Timestamp
          serializedData[key] = value.toDate().toISOString();
        } else {
          serializedData[key] = value;
        }
      });
      
      data.push(serializedData);
    });

    // Save to JSON file
    const filePath = path.join(outputDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`   ✅ Saved ${data.length} documents to ${filePath}`);
    return data.length;
  } catch (error) {
    console.error(`   ❌ Failed to backup ${collectionName}:`, error);
    return 0;
  }
}

/**
 * Main backup function
 */
async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`💾 FIRESTORE BACKUP SCRIPT`);
  console.log(`${'='.repeat(80)}\n`);

  // Create backup directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);
  const outputDir = path.join(process.cwd(), 'backups', `backup-${timestamp}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📂 Backup directory: ${outputDir}\n`);

  // Backup all collections
  const stats: Record<string, number> = {};

  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    const count = await backupCollection(collectionName, outputDir);
    stats[collectionName] = count;
  }

  // Generate report
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 BACKUP REPORT`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`┌───────────────────────────┬────────────┐`);
  console.log(`│ Collection                │ Documents  │`);
  console.log(`├───────────────────────────┼────────────┤`);

  let totalDocs = 0;
  Object.entries(stats).forEach(([name, count]) => {
    console.log(`│ ${name.padEnd(25)} │ ${String(count).padStart(10)} │`);
    totalDocs += count;
  });

  console.log(`├───────────────────────────┼────────────┤`);
  console.log(`│ ${'TOTAL'.padEnd(25)} │ ${String(totalDocs).padStart(10)} │`);
  console.log(`└───────────────────────────┴────────────┘\n`);

  console.log(`✅ Backup completed!`);
  console.log(`📂 Location: ${outputDir}`);
  console.log(`📊 Total: ${totalDocs} documents\n`);

  console.log(`${'='.repeat(80)}\n`);

  process.exit(0);
}

// Run backup
main().catch((error) => {
  console.error('\n❌ Backup failed:', error);
  process.exit(1);
});
