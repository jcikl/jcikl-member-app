/**
 * Dynamic Options Service
 * 动态选项管理服务
 * 
 * 用于管理可由用户自定义扩展的选项列表
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';

// 默认兴趣爱好选项
const DEFAULT_HOBBY_OPTIONS = [
  'Art & Design',
  'Badminton',
  'Baking',
  'Basketball',
  'Car Enthusiast',
  'Cooking',
  'Dancing',
  'E-Sport Mlbb',
  'Fashion',
  'Golf',
  'Hiking',
  'Leadership',
  'Liquor/ Wine tasting',
  'Make Up',
  'Movie',
  'Other E-Sport',
  'Pickle Ball',
  'Public Speaking',
  'Reading',
  'Rock Climbing',
  'Singing',
  'Social Etiquette',
  'Social Service',
  'Travelling',
  'Women Empowerment',
];

/**
 * 获取兴趣爱好选项列表
 */
export const getHobbyOptions = async (): Promise<string[]> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS, 'hobbyOptions');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const options = data.options || [];
      // 按字母排序
      return options.sort((a: string, b: string) => a.localeCompare(b));
    }
    
    // 如果不存在，创建默认选项
    await setDoc(docRef, {
      options: DEFAULT_HOBBY_OPTIONS,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'system',
    });
    
    return DEFAULT_HOBBY_OPTIONS.sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Failed to get hobby options:', error);
    return DEFAULT_HOBBY_OPTIONS.sort((a, b) => a.localeCompare(b));
  }
};

/**
 * 添加新的兴趣爱好选项
 */
export const addHobbyOptions = async (newOptions: string[], updatedBy: string = 'system'): Promise<string[]> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS, 'hobbyOptions');
    const docSnap = await getDoc(docRef);
    
    let existingOptions: string[] = [];
    
    if (docSnap.exists()) {
      existingOptions = docSnap.data().options || [];
    }
    
    // 合并新选项，去重
    const mergedOptions = [...new Set([...existingOptions, ...newOptions])];
    
    // 按字母排序
    const sortedOptions = mergedOptions.sort((a, b) => a.localeCompare(b));
    
    // 更新 Firestore
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        options: sortedOptions,
        updatedAt: serverTimestamp(),
        updatedBy,
      });
    } else {
      await setDoc(docRef, {
        options: sortedOptions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: updatedBy,
        updatedBy,
      });
    }
    
    return sortedOptions;
  } catch (error) {
    console.error('Failed to add hobby options:', error);
    throw error;
  }
};

/**
 * 从用户选择中提取并保存新选项
 */
export const updateHobbyOptionsFromSelection = async (
  selectedHobbies: string[],
  currentOptions: string[],
  updatedBy: string = 'system'
): Promise<void> => {
  // 找出新选项（不在当前选项列表中的）
  const newOptions = selectedHobbies.filter(
    (hobby) => !currentOptions.includes(hobby) && hobby.trim() !== ''
  );
  
  if (newOptions.length > 0) {
    console.log('🆕 [DynamicOptions] 发现新的兴趣爱好选项:', newOptions);
    await addHobbyOptions(newOptions, updatedBy);
  }
};

/**
 * 从会员数据中提取缺失的选项（用于编辑时同步）
 * 返回不在全局选项列表中的会员已有选项
 */
export const extractMissingOptionsFromMemberData = async (
  memberHobbies: string[]
): Promise<string[]> => {
  try {
    // 获取当前全局选项列表
    const currentOptions = await getHobbyOptions();
    
    // 找出会员已有但不在全局列表中的选项
    const missingOptions = memberHobbies.filter(
      (hobby) => hobby.trim() !== '' && !currentOptions.includes(hobby)
    );
    
    if (missingOptions.length > 0) {
      console.log('🔍 [DynamicOptions] 发现会员已有但不在全局选项中的兴趣爱好:', missingOptions);
    }
    
    return missingOptions;
  } catch (error) {
    console.error('Failed to extract missing options:', error);
    return [];
  }
};

/**
 * 同步会员已有的选项到全局列表
 * 用于确保会员的所有选项都能在系统中显示
 */
export const syncMissingOptionsToGlobal = async (
  memberHobbies: string[],
  updatedBy: string = 'system'
): Promise<string[]> => {
  try {
    const missingOptions = await extractMissingOptionsFromMemberData(memberHobbies);
    
    if (missingOptions.length > 0) {
      console.log('🔄 [DynamicOptions] 同步会员已有选项到全局列表:', missingOptions);
      await addHobbyOptions(missingOptions, updatedBy);
    }
    
    return missingOptions;
  } catch (error) {
    console.error('Failed to sync missing options to global:', error);
    return [];
  }
};

/**
 * 重置兴趣爱好选项为默认列表（用于修复/同步）
 */
export const resetHobbyOptionsToDefault = async (updatedBy: string = 'system'): Promise<string[]> => {
  try {
    const docRef = doc(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS, 'hobbyOptions');
    
    // 强制覆盖为默认选项
    await setDoc(docRef, {
      options: DEFAULT_HOBBY_OPTIONS,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: updatedBy,
      updatedBy,
    }, { merge: false }); // merge: false 表示完全覆盖
    
    console.log('✅ [DynamicOptions] 已重置兴趣爱好选项为默认列表');
    return DEFAULT_HOBBY_OPTIONS.sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Failed to reset hobby options:', error);
    throw error;
  }
};

