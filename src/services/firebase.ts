import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

/**
 * Firebase Configuration Validator
 * 验证 Firebase 配置是否完整
 */
const validateFirebaseConfig = () => {
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  const missingVars = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  );

  if (missingVars.length > 0) {
    console.error('❌ 缺少必要的 Firebase 环境变量:', missingVars);
    throw new Error(`Firebase 配置不完整，缺少: ${missingVars.join(', ')}`);
  }

  console.log('✅ Firebase 配置验证通过');
};

// Validate configuration before initialization
validateFirebaseConfig();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  ...(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID && {
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  }),
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Connect to emulators if in development mode
  if (import.meta.env.MODE === 'development' && import.meta.env.VITE_USE_EMULATORS === 'true') {
    console.log('🔧 连接到 Firebase Emulators');
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
  }

  console.log('✅ Firebase 初始化成功');
  console.log('📦 项目 ID:', firebaseConfig.projectId);
  console.log('🔐 认证域:', firebaseConfig.authDomain);
} catch (error) {
  console.error('❌ Firebase 初始化失败:', error);
  throw error;
}

export { app, auth, db, storage };

// Enable Firestore offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('⚠️ 多个标签页打开，持久化只能在一个标签页启用');
  } else if (err.code === 'unimplemented') {
    console.warn('⚠️ 当前浏览器不支持离线持久化');
  } else {
    console.warn('⚠️ 离线持久化启用失败:', err);
  }
});


