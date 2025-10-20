/**
 * Firestore Backup Script
 * Firestore 备份脚本
 * 
 * 快速备份关键集合到本地 JSON 文件
 * 
 * Usage:
 *   npm run backup:firestore
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);

    const data: any[] = [];
    snapshot.forEach((doc) => {
      data.push({
        id: doc.id,
        ...doc.data(),
      });
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
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
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

