import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase';
import { GLOBAL_COLLECTIONS } from '../src/config/globalCollections';

/**
 * Set Admin Role Script
 * 设置管理员角色脚本
 * 
 * 使用方法：
 * 1. 在浏览器控制台中运行
 * 2. 或者作为 Node.js 脚本运行
 */

async function setAdminRole(userId: string) {
  try {
    console.log(`🔍 检查用户 ${userId} 的当前状态...`);
    
    // 检查用户是否已存在
    const memberRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, userId);
    const memberSnap = await getDoc(memberRef);
    
    if (memberSnap.exists()) {
      const currentData = memberSnap.data();
      console.log('📋 当前用户数据:', currentData);
      
      // 更新为管理员
      await setDoc(memberRef, {
        ...currentData,
        role: 'admin',
        status: 'active',
        updatedAt: new Date(),
        updatedBy: 'system',
      }, { merge: true });
      
      console.log('✅ 用户已设置为管理员');
    } else {
      // 创建新的管理员用户
      await setDoc(memberRef, {
        id: userId,
        name: 'System Admin',
        email: 'admin@jci-kl.org',
        role: 'admin',
        status: 'active',
        category: 'Official Member',
        position: 'System Administrator',
        phone: '',
        address: '',
        avatar: '',
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date(),
        updatedBy: 'system',
      });
      
      console.log('✅ 新管理员用户已创建');
    }
    
    // 验证设置
    const verifySnap = await getDoc(memberRef);
    const verifyData = verifySnap.data();
    console.log('🔍 验证结果:', verifyData);
    
    if (verifyData?.role === 'admin') {
      console.log('🎉 管理员权限设置成功！');
      return true;
    } else {
      console.error('❌ 管理员权限设置失败');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 设置管理员权限时出错:', error);
    return false;
  }
}

// Export for external use
export { setAdminRole };

// Register to window for browser environment
if (typeof window !== 'undefined') {
  (window as any).setAdminRole = setAdminRole;
  console.log('💡 使用方法: setAdminRole("your-user-id")');
}

// 如果直接运行此脚本
if (typeof process !== 'undefined' && process.argv) {
  const userId = process.argv[2];
  if (userId) {
    setAdminRole(userId).then(success => {
      process.exit(success ? 0 : 1);
    });
  } else {
    console.log('使用方法: node setAdminRole.js <user-id>');
  }
}
