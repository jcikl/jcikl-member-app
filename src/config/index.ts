/**
 * Global Configuration Index
 * 全局配置统一导出
 * 
 * Usage:
 * import { GLOBAL_COLLECTIONS, globalSystemService, ... } from '@/config';
 */

// Collections
export {
  GLOBAL_COLLECTIONS,
  getCollectionPath,
  TOTAL_COLLECTIONS,
  type CollectionName,
} from './globalCollections';

// System Settings
export { GLOBAL_SYSTEM_CONFIG, globalSystemService } from './globalSystemSettings';

// Component Settings
export { GLOBAL_COMPONENT_CONFIG, globalComponentService } from './globalComponentSettings';

// Validation Settings
export { GLOBAL_VALIDATION_CONFIG, globalValidationService } from './globalValidationSettings';

// Date Settings
export { GLOBAL_DATE_CONFIG, globalDateService } from './globalDateSettings';

// Theme
export { theme } from './theme';

// Import services for re-export
import { globalSystemService } from './globalSystemSettings';
import { globalComponentService } from './globalComponentSettings';
import { globalValidationService } from './globalValidationSettings';
import { globalDateService } from './globalDateSettings';

// Services Object (convenient access)
export const GlobalServices = {
  System: globalSystemService,
  Component: globalComponentService,
  Validation: globalValidationService,
  Date: globalDateService,
};



