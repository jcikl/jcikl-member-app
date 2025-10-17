/**
 * PermissionGuard Types
 */

export type PermissionMode = 'any' | 'all' | 'custom';

export interface PermissionGuardProps {
  permissions: string | string[];
  mode?: PermissionMode;
  customCheck?: (userPermissions: string[]) => boolean;
  fallback?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

