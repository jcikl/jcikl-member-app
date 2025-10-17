import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  onSnapshot,
  writeBatch,
  increment,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { GLOBAL_COLLECTIONS } from '@/config';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import type { GlobalSettingDocument, SettingChangeLog, SettingCategory } from '@/types/settings';

/**
 * Global Settings Service
 * 全局设置服务
 */
class GlobalSettingsService {
  private cache = new Map<string, any>();
  private listeners: ((settings: Map<string, any>) => void)[] = [];
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialize - Load all settings from Firestore
   */
  async initialize(): Promise<void> {
    try {
      const settingsRef = collection(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS);
      const snapshot = await getDocs(settingsRef);

      snapshot.docs.forEach(doc => {
        const setting = doc.data() as GlobalSettingDocument;
        this.cache.set(setting.key, setting.value);
      });

      console.log(`✅ Loaded ${this.cache.size} global settings`);

      // Subscribe to real-time updates
      this.subscribeToChanges();
    } catch (error) {
      console.error('Failed to initialize global settings:', error);
    }
  }

  /**
   * Get setting value
   */
  get<T = any>(key: string, defaultValue?: T): T {
    return (this.cache.get(key) ?? defaultValue) as T;
  }

  /**
   * Get all cached settings
   */
  getAllCached(): Map<string, any> {
    return new Map(this.cache);
  }

  /**
   * Get all settings from Firestore
   */
  async getAllSettings(): Promise<GlobalSettingDocument[]> {
    const settingsRef = collection(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS);
    const snapshot = await getDocs(settingsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalSettingDocument));
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string): Promise<GlobalSettingDocument[]> {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS),
      where('category', '==', category),
      orderBy('key')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalSettingDocument));
  }

  /**
   * Set setting value
   */
  async set(key: string, value: any, updatedBy: string): Promise<void> {
    try {
      const settingRef = doc(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS, key);
      const settingDoc = await getDoc(settingRef);

      const oldValue = settingDoc.exists() ? settingDoc.data().value : null;

      await setDoc(
        settingRef,
        cleanUndefinedValues({
          key,
          value,
          lastModifiedBy: updatedBy,
          lastModifiedAt: new Date().toISOString(),
          version: increment(1),
        }),
        { merge: true }
      );

      // Log change
      await this.logChange(key, oldValue, value, updatedBy);

      // Update cache
      this.cache.set(key, value);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to set setting:', error);
      throw error;
    }
  }

  /**
   * Batch update settings
   */
  async batchUpdate(settings: Record<string, any>, updatedBy: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const [key, value] of Object.entries(settings)) {
        const settingRef = doc(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS, key);
        batch.set(
          settingRef,
          cleanUndefinedValues({
            key,
            value,
            lastModifiedBy: updatedBy,
            lastModifiedAt: new Date().toISOString(),
            version: increment(1),
          }),
          { merge: true }
        );
      }

      await batch.commit();

      // Update cache
      for (const [key, value] of Object.entries(settings)) {
        this.cache.set(key, value);
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to batch update settings:', error);
      throw error;
    }
  }

  /**
   * Subscribe to setting changes
   */
  subscribe(callback: (settings: Map<string, any>) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Subscribe to Firestore real-time updates
   */
  private subscribeToChanges(): void {
    const settingsRef = collection(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS);

    this.unsubscribe = onSnapshot(settingsRef, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified' || change.type === 'added') {
          const setting = change.doc.data() as GlobalSettingDocument;
          this.cache.set(setting.key, setting.value);
        } else if (change.type === 'removed') {
          const setting = change.doc.data() as GlobalSettingDocument;
          this.cache.delete(setting.key);
        }
      });

      this.notifyListeners();
      this.applySettings();
    });
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const settingsMap = new Map(this.cache);
    this.listeners.forEach(listener => listener(settingsMap));
  }

  /**
   * Apply settings to system (CSS variables, etc.)
   */
  private applySettings(): void {
    this.applyCSSVariables();
  }

  /**
   * Apply CSS variables for theme settings
   */
  private applyCSSVariables(): void {
    const root = document.documentElement;

    this.cache.forEach((value, key) => {
      if (key.startsWith('theme-')) {
        const cssVar = `--${key}`;
        root.style.setProperty(cssVar, String(value));
      }
    });
  }

  /**
   * Log setting change
   */
  private async logChange(
    key: string,
    oldValue: any,
    newValue: any,
    changedBy: string
  ): Promise<void> {
    try {
      const logData: Omit<SettingChangeLog, 'id'> = {
        settingKey: key,
        settingCategory: this.getCategoryFromKey(key),
        oldValue,
        newValue,
        changedBy,
        changedAt: new Date().toISOString(),
      };

      await setDoc(
        doc(collection(db, GLOBAL_COLLECTIONS.SETTING_CHANGE_LOGS)),
        cleanUndefinedValues(logData)
      );
    } catch (error) {
      console.error('Failed to log setting change:', error);
    }
  }

  /**
   * Get setting change logs
   */
  async getChangeLogs(settingKey?: string, limitCount = 50): Promise<SettingChangeLog[]> {
    let q = query(
      collection(db, GLOBAL_COLLECTIONS.SETTING_CHANGE_LOGS),
      orderBy('changedAt', 'desc'),
      limit(limitCount)
    );

    if (settingKey) {
      q = query(q, where('settingKey', '==', settingKey));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SettingChangeLog));
  }

  /**
   * Get category from setting key
   */
  private getCategoryFromKey(key: string): SettingCategory {
    if (key.startsWith('theme-')) return 'UI_THEME';
    if (key.startsWith('table-') || key.startsWith('form-') || key.startsWith('modal-'))
      return 'UI_COMPONENTS';
    if (key.startsWith('date-') || key.startsWith('number-') || key.startsWith('currency-'))
      return 'DATA_FORMAT';
    if (key.startsWith('validation-')) return 'VALIDATION';
    if (key.startsWith('i18n-')) return 'I18N';
    return 'SYSTEM';
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.cache.clear();
    this.listeners = [];
  }
}

export const globalSettingsService = new GlobalSettingsService();

console.log('✅ Global Settings Service Loaded');

