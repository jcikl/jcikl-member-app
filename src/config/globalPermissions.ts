/**
 * Global Permission Configuration
 * 全局权限配置（占位文件）
 */

export const globalPermissionService = {
  checkPermission: async (_userId: string, _module: string, _action: string) => {
    // 占位实现
    return { hasPermission: true };
  },
};

console.log('✅ Global Permission Settings Loaded (Placeholder)');

