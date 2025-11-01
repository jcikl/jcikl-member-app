import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Space, Typography, Form, Radio, InputNumber, Button, Progress, Alert, Table, Tag, message, Input, Checkbox, Row, Col, List } from 'antd';

// Global Config (PRIORITY - ALWAYS FIRST)
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalPermissionService } from '@/config/globalPermissions';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalDateService } from '@/config/globalDateSettings';

// Types
import type { ColumnsType } from 'antd/es/table';

// Services
import { db } from '@/services/firebase';

// Utils
import { cleanUndefinedValues } from '@/utils/dataHelpers';

// Firebase
import { Timestamp, collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, updateDoc, deleteField } from 'firebase/firestore';

const { Title, Text } = Typography;

interface MigrationResultRow {
  key: string;
  docId: string;
  changedKeys: string[];
}

interface BatchResult {
  processed: number;
  updated: number;
  failed: number;
  lastDoc: any | undefined;
  rows: MigrationResultRow[];
}

function toLocalStringByType(value: any, kind: 'date' | 'datetime' = 'date'): any {
  if (value === undefined) return undefined;
  if (value === null) return null;
  let d: Date | null = null;
  if (typeof value === 'string') {
    const t = new Date(value);
    d = Number.isNaN(t.getTime()) ? null : t;
  } else if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'object' && value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    d = new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
  }
  if (!d) return value; // 非日期保持原值
  const fmt = kind === 'date' ? 'api' : 'datetime';
  return globalDateService.formatDate(d, fmt);
}

const DATE_KEYS_DATE = new Set([
  'birthDate', 'joinDate', 'renewalDate', 'expiryDate', 'categoryAssignedDate',
  'positionStartDate', 'positionEndDate', 'termStartDate', 'termEndDate'
]);
const DATE_KEYS_DATETIME = new Set(['createdAt', 'updatedAt', 'paymentDate', 'paymentVerifiedDate', 'endorsementDate']);

function convertDateFieldToString(key: string, value: any): any {
  if (DATE_KEYS_DATE.has(key)) return toLocalStringByType(value, 'date');
  if (DATE_KEYS_DATETIME.has(key)) return toLocalStringByType(value, 'datetime');
  return value;
}

function isUselessMap(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return false;
  if (value instanceof Timestamp) return false;
  if (typeof value !== 'object') return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return true;
  for (const k of keys) {
    const v = (value as any)[k];
    if (v === undefined) continue;
    if (v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !(v instanceof Timestamp) && Object.keys(v).length === 0) continue;
    return false;
  }
  return true;
}

function normalizeAddress(address: any): any {
  if (address === undefined) return undefined;
  if (address === null) return null;
  if (typeof address === 'string') return address;
  if (typeof address === 'object') {
    const { street, city, state, postcode, country } = address;
    return cleanUndefinedValues({ street, city, state, postcode, country });
  }
  return null;
}

const PATH_MIGRATIONS: Array<{ from: string; to: string }> = [
  // Business: move from profile.* → business.* (新规范)
  { from: 'profile.company', to: 'business.company' },
  { from: 'profile.companyWebsite', to: 'business.companyWebsite' },
  { from: 'profile.departmentAndPosition', to: 'business.departmentAndPosition' },
  { from: 'profile.ownIndustry', to: 'business.ownIndustry' },
  { from: 'profile.companyIntro', to: 'business.companyIntro' },
  { from: 'profile.interestedIndustries', to: 'business.interestedIndustries' },
  { from: 'profile.businessCategories', to: 'business.businessCategories' },
  { from: 'profile.acceptInternationalBusiness', to: 'business.acceptInternationalBusiness' },
  // 实物/链接等保留在 profile 根（不迁移到顶层）
  { from: 'profile.linkedin', to: 'profile.linkedin' },
  { from: 'profile.socialMedia', to: 'profile.socialMedia' },
  { from: 'profile.shirtSize', to: 'profile.shirtSize' },
  { from: 'profile.jacketSize', to: 'profile.jacketSize' },
  { from: 'profile.nameToBeEmbroidered', to: 'profile.nameToBeEmbroidered' },
  { from: 'profile.tshirtReceivingStatus', to: 'profile.tshirtReceivingStatus' },
  { from: 'profile.cutting', to: 'profile.cutting' },
];

function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}
function setByPath(obj: any, path: string, value: any) {
  const parts = path.split('.');
  const last = parts.pop() as string;
  let cur = obj;
  for (const p of parts) {
    if (cur[p] === undefined || cur[p] === null || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[last] = value;
}
function deleteByPath(obj: any, path: string) {
  const parts = path.split('.');
  const last = parts.pop() as string;
  let cur = obj;
  for (const p of parts) {
    if (!cur[p] || typeof cur[p] !== 'object') return;
    cur = cur[p];
  }
  if (cur && Object.prototype.hasOwnProperty.call(cur, last)) delete cur[last];
}

const BASIC_PROFILE_FIELDS = [
  'fullNameNric', 'nricOrPassport', 'address', 'alternativePhone', 
  'emergencyContact',  'socialMedia', 'linkedin', 'avatar', 'profilePhotoUrl', 
  'nationality', 'race', 'birthDate', 'gender',
  // Career development & communication extras
  'whatsappGroup'
];
const CAREER_PROFILE_FIELDS = [
  'company', 'companyWebsite', 'departmentAndPosition', 'ownIndustry',
  'companyIntro', 'interestedIndustries', 'businessCategories',
  'acceptInternationalBusiness'
];
const JCI_PROFILE_FIELDS = [
  'senatorId', 'senatorScore', 'senatorVerified',
  'jciEventInterests', 'jciBenefitsExpectation',
  'activityParticipation', 'taskCompletions',
  'paymentDate', 'paymentSlipUrl', 'paymentVerifiedDate',
  // 权限与绑定从 profile.* 迁到 jciCareer.*
  'hasSpecialPermissions', 'specialPermissions', 'permissionNotes', 'effectivePermissions', 'roleBindings',
  // Additional JCI dates/fields
  'endorsementDate','fiveYearsVision', 'activeMemberHow', 'joinedDate'
];

// 顶层需要归入 jci.* 并从顶层删除的字段
const JCI_TOP_FIELDS = [
  'category', 'membershipCategory', 'categoryAssignedBy', 'categoryAssignedDate', 'categoryReason',
  'isActingPosition', 'actingForPosition', 'isCurrentTerm', 'positionStartDate', 'positionEndDate', 'termStartDate', 'termEndDate', 'jciPosition',
  'joinDate', 'joinedDate', 'renewalDate', 'expiryDate','fiveYearsVision','activeMemberHow',
  'introducerId', 'introducerName',
  // 组织归属（顶层→jciCareer.*）
  'worldRegion', 'country', 'countryRegion', 'chapter', 'chapterId',
  // 费用与时间附加
  'paymentDate', 'paymentSlipUrl', 'paymentVerifiedDate', 'endorsementDate',
  // 权限与绑定附加
  'hasSpecialPermissions', 'specialPermissions', 'permissionNotes', 'effectivePermissions', 'roleBindings',
  // 其他 JCI 文本
  'jciBenefitsExpectation', 'jciEventInterests',
  // JCI 参议员字段（遗漏补充）
  'senatorId', 'senatorVerified'
];

// 顶层 → profile.*
const TOP_TO_PROFILE_FIELDS = [
  'email','name','phone','memberId','fullNameNric','nricOrPassport','gender','nationality','race','birthDate','avatar','profilePhotoUrl','address','alternativePhone','emergencyContact','socialMedia','linkedin','shirtSize','jacketSize','nameToBeEmbroidered','tshirtReceivingStatus','cutting','status','level','accountType','createdAt','updatedAt','createdBy','updatedBy','categories',
  // Missing top-level fields to be folded into profile
  'whatsappGroup','hobbies','joinedDate'
];

// 顶层 → business.*
const TOP_TO_BUSINESS_FIELDS = [
  'company','companyWebsite','departmentAndPosition','ownIndustry','companyIntro','interestedIndustries','businessCategories','acceptInternationalBusiness'
];

function flattenNamespaceToTop(target: Record<string, any>, source: any) {
  const walk = (obj: any, base: string) => {
    if (obj === undefined) return;
    if (obj === null || typeof obj !== 'object' || obj instanceof Timestamp) {
      if (base) setByPath(target, base, obj);
      return;
    }
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      if (base) setByPath(target, base, {});
      return;
    }
    for (const k of keys) {
      walk(obj[k], base ? `${base}.${k}` : k);
    }
  };
  walk(source, '');
}

function buildMemberUpdate(raw: any, options?: { enablePathMigration?: boolean; enableSectionNamespacing?: boolean; enableFlattenToTop?: boolean }): { update?: Record<string, any>; changedKeys: string[] } {
  const update: Record<string, any> = {};
  const changedKeys: string[] = [];

  const profile = raw?.profile || {};
  const nextProfile: Record<string, any> = { ...profile };

  console.debug('[migrate][build] start', { options });

  // 新增/补齐
  if (profile.fullNameNric === undefined && raw?.profile?.fullNameNric !== undefined) {
    nextProfile.fullNameNric = raw.profile.fullNameNric;
  }
  if (profile.nricOrPassport === undefined && raw?.profile?.nricOrPassport !== undefined) {
    nextProfile.nricOrPassport = raw.profile.nricOrPassport;
  }
  if (profile.cutting === undefined && raw?.profile?.cutting !== undefined) {
    nextProfile.cutting = raw.profile.cutting;
  }

  // address 规范
  if (raw?.profile?.address !== undefined) {
    const normalized = normalizeAddress(raw.profile.address);
    if (JSON.stringify(normalized) !== JSON.stringify(raw.profile.address)) {
      nextProfile.address = normalized;
    }
  }

  // 删除冗余字段：profile.accountType, profile.joinedDate
  if (nextProfile.accountType !== undefined) {
    delete nextProfile.accountType;
  }
  if (nextProfile.joinedDate !== undefined) {
    delete nextProfile.joinedDate;
  }

  // introducerId/introducerName 迁移到顶层
  if (nextProfile.introducerId !== undefined && raw?.introducerId === undefined) {
    update.introducerId = nextProfile.introducerId ?? null;
    changedKeys.push('introducerId');
    delete nextProfile.introducerId;
  }
  if (nextProfile.introducerName !== undefined && raw?.introducerName === undefined) {
    update.introducerName = nextProfile.introducerName ?? null;
    changedKeys.push('introducerName');
    delete nextProfile.introducerName;
  }

  // 顶层日期字段（以字符串存储，使用 globalDateService 本地格式）
  const nextJoinDate = toLocalStringByType(raw?.joinDate, 'date');
  const nextRenewalDate = toLocalStringByType(raw?.renewalDate, 'date');
  const nextExpiryDate = toLocalStringByType(raw?.expiryDate, 'date');
  const nextCreatedAt = toLocalStringByType(raw?.createdAt, 'datetime');
  const nextUpdatedAt = toLocalStringByType(raw?.updatedAt, 'datetime');
  const nextCategoryAssignedDate = toLocalStringByType(raw?.categoryAssignedDate, 'date');

  // 路径迁移（可选）：将部分 profile.* 平铺至顶层（当未启用分区命名空间时生效）
  if (options?.enablePathMigration && !options?.enableSectionNamespacing) {
    for (const rule of PATH_MIGRATIONS) {
      const v = getByPath({ profile: nextProfile, ...raw }, rule.from);
      if (v !== undefined) {
        // 只在顶层不存在该键时迁移，以避免覆盖
        if (getByPath({ ...raw, update }, rule.to) === undefined) {
          setByPath(update, rule.to, v);
          deleteByPath(nextProfile, rule.from.replace('profile.', ''));
          if (!changedKeys.includes('profile')) changedKeys.push('profile');
          const topKey = rule.to.split('.')[0];
          if (!changedKeys.includes(topKey)) changedKeys.push(topKey);
        }
      }
    }
    console.debug('[migrate][build] path-move', {
      movedTopKeys: Object.keys(update),
      profileRemovedKeys: Object.keys(profile).filter(k => !(k in nextProfile))
    });
  }

  // 分区命名空间迁移（可选）：profile.* (基本信息)、career.*、jci.*
  if (options?.enableSectionNamespacing) {
    // 初始化容器
    const basic: Record<string, any> = {};
    const business: Record<string, any> = (raw?.business && typeof raw.business === 'object') ? { ...raw.business } : {};
    const jciCareer: Record<string, any> = (raw?.jciCareer && typeof raw.jciCareer === 'object') ? { ...raw.jciCareer } : {};

    // 将 profile.* 按映射移动到 profile.basic / profile.career
    for (const key of BASIC_PROFILE_FIELDS) {
      let v = getByPath({ profile: nextProfile }, `profile.${key}`);
      v = convertDateFieldToString(key, v);
      if (v !== undefined) {
        basic[key] = v;
        deleteByPath(nextProfile, key);
      }
    }
    for (const key of CAREER_PROFILE_FIELDS) {
      let v = getByPath({ profile: nextProfile }, `profile.${key}`);
      v = convertDateFieldToString(key, v);
      if (v !== undefined) {
        business[key] = v;
        deleteByPath(nextProfile, key);
      }
    }
    for (const key of JCI_PROFILE_FIELDS) {
      let v = getByPath({ profile: nextProfile }, `profile.${key}`);
      v = convertDateFieldToString(key, v);
      if (v !== undefined) {
        jciCareer[key] = v;
        deleteByPath(nextProfile, key);
      }
    }

    for (const k of JCI_TOP_FIELDS) {
      if (raw?.[k] !== undefined && jciCareer[k === 'joinedDate' ? 'joinDate' : k] === undefined) {
        const targetKey = k === 'joinedDate' ? 'joinDate' : k;
        jciCareer[targetKey] = convertDateFieldToString(targetKey, raw[k]);
        // 顶层字段标记删除（预览时会清理，写库时转 deleteField()）
        setByPath(update, k, null);
        if (!changedKeys.includes(k)) changedKeys.push(k);
      }
    }

    // 顶层 → profile.*
    for (const k of TOP_TO_PROFILE_FIELDS) {
      if (raw?.[k] !== undefined) {
        const val = convertDateFieldToString(k, (k === 'createdAt' ? nextCreatedAt : (k === 'updatedAt' ? nextUpdatedAt : raw[k])));
        setByPath(update, `profile.${k}`, val);
        setByPath(update, k, null); // 删除顶层
        if (!changedKeys.includes('profile')) changedKeys.push('profile');
        if (!changedKeys.includes(k)) changedKeys.push(k);
      }
    }

    // 顶层 → business.*
    for (const k of TOP_TO_BUSINESS_FIELDS) {
      if (raw?.[k] !== undefined && (business as any)[k] === undefined) {
        const val = convertDateFieldToString(k, raw[k]);
        setByPath(update, `business.${k}`, val);
        setByPath(update, k, null);
        if (!changedKeys.includes('business')) changedKeys.push('business');
        if (!changedKeys.includes(k)) changedKeys.push(k);
      }
    }

    // 写回更新对象
    if (Object.keys(basic).length > 0) {
      // 合并到 profile 根下（保持基本信息仍在 profile.*）
      const mergedProfile = { ...nextProfile, ...basic };
      // 直接覆盖 nextProfile，后续 profileChanged 会落盘
      Object.assign(nextProfile, mergedProfile);
    }
    if (Object.keys(business).length > 0) {
      setByPath(update, 'business', cleanUndefinedValues(business));
      if (!changedKeys.includes('business')) changedKeys.push('business');
    }
    if (Object.keys(jciCareer).length > 0) {
      setByPath(update, 'jciCareer', cleanUndefinedValues(jciCareer));
      if (!changedKeys.includes('jciCareer')) changedKeys.push('jciCareer');
    }
    console.debug('[migrate][build] namespacing', {
      profileKeys: Object.keys(nextProfile),
      careerKeys: (update as any).business ? Object.keys((update as any).business) : [],
      jciKeys: (update as any).jciCareer ? Object.keys((update as any).jciCareer) : []
    });
  }

  if (options?.enableFlattenToTop) {
    const flat: Record<string, any> = {};
    if (raw?.profile) flattenNamespaceToTop(flat, raw.profile);
    if (raw?.business) flattenNamespaceToTop(flat, raw.business);
    if (raw?.jciCareer) flattenNamespaceToTop(flat, raw.jciCareer);
    for (const k of Object.keys(flat)) {
      if (getByPath({ ...raw, update }, k) === undefined) {
        setByPath(update, k, flat[k]);
        if (!changedKeys.includes(k.split('.')[0])) changedKeys.push(k.split('.')[0]);
      }
    }
    setByPath(update, 'profile', null);
    setByPath(update, 'business', null);
    setByPath(update, 'jciCareer', null);
    if (!changedKeys.includes('profile')) changedKeys.push('profile');
    if (!changedKeys.includes('business')) changedKeys.push('business');
    if (!changedKeys.includes('jciCareer')) changedKeys.push('jciCareer');
    console.debug('[migrate][build] flattenToTop', {
      addTopKeys: Object.keys(update).filter(k => !['profile','career','jci'].includes(k)),
      deleteNamespaces: { profile: update.profile === null, career: update.career === null, jci: update.jci === null }
    });
  }

  // 汇总差异
  const profileChanged = JSON.stringify(nextProfile) !== JSON.stringify(profile);
  if (profileChanged) {
    update.profile = cleanUndefinedValues(nextProfile);
    changedKeys.push('profile');
  }

  // 清理无用的 map：将空/无效对象标记删除（写库时转 deleteField）
  for (const k of Object.keys(update)) {
    const v = (update as any)[k];
    if (isUselessMap(v)) {
      (update as any)[k] = null;
      if (!changedKeys.includes(k)) changedKeys.push(k);
    }
  }
  if (nextJoinDate !== raw?.joinDate) {
    update.joinDate = nextJoinDate ?? null;
    changedKeys.push('joinDate');
  }
  if (nextRenewalDate !== raw?.renewalDate) {
    update.renewalDate = nextRenewalDate ?? null;
    changedKeys.push('renewalDate');
  }
  if (nextExpiryDate !== raw?.expiryDate) {
    update.expiryDate = nextExpiryDate ?? null;
    changedKeys.push('expiryDate');
  }
  // createdAt/updatedAt 的顶层写入将由“顶层→profile.*”阶段统一处理，不再在顶层落键
  if (nextCategoryAssignedDate !== raw?.categoryAssignedDate) {
    update.categoryAssignedDate = nextCategoryAssignedDate ?? null;
    changedKeys.push('categoryAssignedDate');
  }

  if (changedKeys.length === 0) {
    console.debug('[migrate][build] result-empty');
    return { changedKeys };
  }
  const finalUpdate = cleanUndefinedValues(update);
  console.debug('[migrate][build] result', { changedKeys, update: finalUpdate });
  return { update: finalUpdate, changedKeys };
}

export const MemberDataMigrationPage: React.FC = () => {
  const [form] = Form.useForm();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, updated: 0, failed: 0 });
  const [rows, setRows] = useState<MigrationResultRow[]>([]);
  const lastDocRef = useRef<any>(undefined);
  const [currentSchema, setCurrentSchema] = useState<Record<string, number>>({});
  const [previewSchema, setPreviewSchema] = useState<Record<string, number>>({});

  const tableColumns: ColumnsType<MigrationResultRow> = useMemo(() => [
    { title: 'Doc ID', dataIndex: 'docId', key: 'docId' },
    { title: 'Changed Fields', dataIndex: 'changedKeys', key: 'changedKeys', render: (keys: string[]) => (
      <Space wrap>
        {Array.from(new Set(keys)).map(k => <Tag color="blue" key={k}>{k}</Tag>)}
      </Space>
    ) },
  ], []);

  useEffect(() => {
    form.setFieldsValue({ mode: 'dry', batchSize: 1000, limitOne: true, targetDocId: '' });
  }, [form]);

  const migrateBatch = useCallback(async ({ batchSize, dryRun, targetDocId, limitOne, enablePathMigration, enableSectionNamespacing, enableFlattenToTop }: { batchSize: number; dryRun: boolean; targetDocId?: string; limitOne?: boolean; enablePathMigration?: boolean; enableSectionNamespacing?: boolean; enableFlattenToTop?: boolean; }): Promise<BatchResult> => {
    const ref = collection(db, GLOBAL_COLLECTIONS.MEMBERS);
    // 单记录模式：直接按ID读取
    if (targetDocId && targetDocId.trim().length > 0) {
      const dref = doc(db, GLOBAL_COLLECTIONS.MEMBERS, targetDocId.trim());
      const snap = await getDoc(dref);
      if (!snap.exists()) return { processed: 0, updated: 0, failed: 0, lastDoc: undefined, rows: [] };
      let processed = 0; let updated = 0; let failed = 0;
      const batchRows: MigrationResultRow[] = [];
      try {
        processed = 1;
        const data = snap.data();
        console.debug('[migrate][batch] start', { docId: snap.id, dryRun });
        const { update, changedKeys } = buildMemberUpdate(data, { enablePathMigration, enableSectionNamespacing, enableFlattenToTop });
        console.debug('[migrate][batch] built', { docId: snap.id, changedKeys, update });
        if (update && changedKeys.length > 0) {
          if (!dryRun) {
            const finalUpdate: Record<string, any> = { ...update };
            // 将标记为 null 的顶层字段统一转换为 deleteField()
            const ALL_TOP_FIELDS_TO_DELETE = [
              ...JCI_TOP_FIELDS,
              ...TOP_TO_PROFILE_FIELDS,
              ...TOP_TO_BUSINESS_FIELDS,
            ];
            for (const k of ALL_TOP_FIELDS_TO_DELETE) {
              if (Object.prototype.hasOwnProperty.call(finalUpdate, k) && finalUpdate[k] === null) {
                finalUpdate[k] = deleteField();
              }
            }
            const nullToDelete = Object.keys(finalUpdate).filter(k => finalUpdate[k] === null);
            console.debug('[migrate][batch] finalize', { docId: snap.id, nullToDelete, finalKeys: Object.keys(finalUpdate) });
            for (const ns of ['profile', 'business', 'jciCareer']) {
              if (Object.prototype.hasOwnProperty.call(finalUpdate, ns) && finalUpdate[ns] === null) {
                finalUpdate[ns] = deleteField();
              }
            }
            await updateDoc(dref, finalUpdate);
          }
          updated = 1;
          console.debug('[migrate][batch] updated', { docId: snap.id, changedKeys });
          batchRows.push({ key: snap.id, docId: snap.id, changedKeys });
        }
      } catch (e) {
        failed = 1;
        console.debug('[migrate][batch] failed', { docId: snap.id, error: String(e) });
        globalSystemService.log('error', 'member update failed', 'member-migration', { error: String(e) });
      }
      return { processed, updated, failed, lastDoc: undefined, rows: batchRows };
    }

    const pageLimit = limitOne ? 1 : batchSize;
    const q = lastDocRef.current
      ? query(ref, orderBy('__name__'), startAfter(lastDocRef.current), limit(pageLimit))
      : query(ref, orderBy('__name__'), limit(pageLimit));

    const snap = await getDocs(q);
    if (snap.empty) return { processed: 0, updated: 0, failed: 0, lastDoc: undefined, rows: [] };

    let processed = 0; let updated = 0; let failed = 0;
    const batchRows: MigrationResultRow[] = [];

    for (const d of snap.docs) {
      processed += 1;
      try {
        const data = d.data();
        console.debug('[migrate][batch] start', { docId: d.id, dryRun });
        const { update, changedKeys } = buildMemberUpdate(data, { enablePathMigration, enableSectionNamespacing, enableFlattenToTop });
        console.debug('[migrate][batch] built', { docId: d.id, changedKeys, update });
        if (update && changedKeys.length > 0) {
          if (!dryRun) {
            const finalUpdate: Record<string, any> = { ...update };
            const ALL_TOP_FIELDS_TO_DELETE = [
              ...JCI_TOP_FIELDS,
              ...TOP_TO_PROFILE_FIELDS,
              ...TOP_TO_BUSINESS_FIELDS,
            ];
            for (const k of ALL_TOP_FIELDS_TO_DELETE) {
              if (Object.prototype.hasOwnProperty.call(finalUpdate, k) && finalUpdate[k] === null) {
                finalUpdate[k] = deleteField();
              }
            }
            const nullToDelete = Object.keys(finalUpdate).filter(k => finalUpdate[k] === null);
            console.debug('[migrate][batch] finalize', { docId: d.id, nullToDelete, finalKeys: Object.keys(finalUpdate) });
            for (const ns of ['profile', 'business', 'jciCareer']) {
              if (Object.prototype.hasOwnProperty.call(finalUpdate, ns) && finalUpdate[ns] === null) {
                finalUpdate[ns] = deleteField();
              }
            }
            await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, d.id), finalUpdate);
          }
          updated += 1;
          console.debug('[migrate][batch] updated', { docId: d.id, changedKeys });
          batchRows.push({ key: d.id, docId: d.id, changedKeys });
        }
      } catch (e) {
        failed += 1;
        console.debug('[migrate][batch] failed', { docId: d.id, error: String(e) });
        globalSystemService.log('error', 'member update failed', 'member-migration', { error: String(e) });
      }
      lastDocRef.current = d;
    }

    return { processed, updated, failed, lastDoc: lastDocRef.current, rows: batchRows };
  }, []);

  const handleRun = useCallback(async () => {
    const values = form.getFieldsValue();
    const dryRun = values.mode === 'dry';
    const batchSize: number = values.batchSize || 1000;
    const limitOne: boolean = !!values.limitOne;
    const targetDocId: string | undefined = (values.targetDocId || '').trim() || undefined;
    const enablePathMigration: boolean = !!values.enablePathMigration;
    const enableSectionNamespacing: boolean = !!values.enableSectionNamespacing;
    const enableFlattenToTop: boolean = !!values.enableFlattenToTop;

    const perm = await globalPermissionService.checkPermission(undefined as any, 'SYSTEM', 'WRITE');
    if (!perm?.hasPermission) {
      message.error('权限不足');
      return;
    }

    setRunning(true);
    setProgress({ processed: 0, updated: 0, failed: 0 });
    setRows([]);
    lastDocRef.current = undefined;

    try {
      while (true) {
        const res = await migrateBatch({ batchSize, dryRun, targetDocId, limitOne, enablePathMigration, enableSectionNamespacing, enableFlattenToTop });
        setProgress(prev => ({
          processed: prev.processed + res.processed,
          updated: prev.updated + res.updated,
          failed: prev.failed + res.failed,
        }));
        if (res.rows.length > 0) setRows(prev => [...prev, ...res.rows]);
        if (targetDocId || limitOne) break;
        if (!res.lastDoc || res.processed === 0 || !running) break;
        await new Promise(r => setTimeout(r, 60));
      }
      message.success(`${dryRun ? 'Dry Run' : '迁移'}完成`);
    } catch (e) {
      message.error('执行失败');
    } finally {
      setRunning(false);
    }
  }, [form, migrateBatch, running]);

  const handleStop = useCallback(() => {
    setRunning(false);
    message.info('已停止');
  }, []);

  const tableConfig = useMemo(() => globalComponentService.getTableConfig(), []);

  const flattenKeys = useCallback((obj: any, prefix = ''): Record<string, number> => {
    const acc: Record<string, number> = {};
    const walk = (o: any, p: string) => {
      if (o === null || o === undefined) {
        acc[p || '(root)'] = (acc[p || '(root)'] || 0) + 1;
        return;
      }
      // Treat Firestore Timestamp (or timestamp-like) as leaf
      if (o instanceof Timestamp || (
        typeof o === 'object' &&
        o && 'seconds' in o && 'nanoseconds' in o &&
        typeof (o as any).seconds === 'number' && typeof (o as any).nanoseconds === 'number' &&
        Object.keys(o).length === 2
      )) {
        acc[p] = (acc[p] || 0) + 1;
        return;
      }
      if (typeof o !== 'object') {
        acc[p] = (acc[p] || 0) + 1;
        return;
      }
      const keys = Object.keys(o);
      if (keys.length === 0) {
        acc[p] = (acc[p] || 0) + 1;
      }
      for (const k of keys) {
        const np = p ? `${p}.${k}` : k;
        walk(o[k], np);
      }
    };
    walk(obj, prefix);
    return acc;
  }, []);

  const generateSchemas = useCallback(async () => {
    const values = form.getFieldsValue();
    const targetDocId: string | undefined = (values.targetDocId || '').trim() || undefined;
    const enablePathMigration: boolean = !!values.enablePathMigration;
    const enableSectionNamespacing: boolean = !!values.enableSectionNamespacing;
    const enableFlattenToTop: boolean = !!values.enableFlattenToTop;

    try {
      console.debug('[schema][preview] start', { targetDocId, sample: targetDocId ? 1 : 20, options: { enablePathMigration, enableSectionNamespacing, enableFlattenToTop } });
      const ref = collection(db, GLOBAL_COLLECTIONS.MEMBERS);
      const docs: any[] = [];
      if (targetDocId) {
        const dref = doc(db, GLOBAL_COLLECTIONS.MEMBERS, targetDocId);
        const snap = await getDoc(dref);
        if (snap.exists()) docs.push({ id: snap.id, data: snap.data() });
      } else {
        const q = query(ref, orderBy('__name__'), limit(20));
        const snap = await getDocs(q);
        snap.forEach(d => docs.push({ id: d.id, data: d.data() }));
      }
      if (docs.length === 0) {
        message.info('没有可用于预览的文档');
        return;
      }
      // Aggregate current schema
      const currentAgg: Record<string, number> = {};
      const previewAgg: Record<string, number> = {};
      for (const d of docs) {
        const raw = d.data;
        const cur = flattenKeys(raw);
        for (const k in cur) currentAgg[k] = (currentAgg[k] || 0) + 1;
        const { update } = buildMemberUpdate(raw, { enablePathMigration, enableSectionNamespacing, enableFlattenToTop });
        let previewObj = update ? { ...raw, ...update, profile: update.profile ?? raw.profile, jciCareer: (update as any).jciCareer ?? (raw as any).jciCareer, business: (update as any).business ?? (raw as any).business } : raw;
        // 预览：清理应删除的顶层键（避免同时显示顶层与 jci.*）
        if (update) {
          for (const k of JCI_TOP_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(update, k) && update[k] === null) {
              if (Object.prototype.hasOwnProperty.call(previewObj, k)) {
                delete (previewObj as any)[k];
              }
            }
          }
          // 预览时同步移除被置空的顶层键（profile/business/jciCareer 以及顶层被收拢的字段）
          const removedTopKeys = [
            ...JCI_TOP_FIELDS,
            ...TOP_TO_PROFILE_FIELDS,
            ...TOP_TO_BUSINESS_FIELDS,
          ];
          for (const rk of removedTopKeys) {
            if (Object.prototype.hasOwnProperty.call(update, rk) && (update as any)[rk] === null) {
              if (Object.prototype.hasOwnProperty.call(previewObj, rk)) delete (previewObj as any)[rk];
            }
          }
          if (enableFlattenToTop) {
            if ((update as any).profile === null && (previewObj as any).profile) delete (previewObj as any).profile;
            if ((update as any).business === null && (previewObj as any).business) delete (previewObj as any).business;
            if ((update as any).jciCareer === null && (previewObj as any).jciCareer) delete (previewObj as any).jciCareer;
          }
        }
        const pre = flattenKeys(previewObj);
        for (const k in pre) previewAgg[k] = (previewAgg[k] || 0) + 1;
        console.debug('[schema][preview] doc', { id: d.id, currentKeys: Object.keys(cur).length, previewKeys: Object.keys(pre).length });
      }
      setCurrentSchema(currentAgg);
      setPreviewSchema(previewAgg);
      console.debug('[schema][preview] done', { currentTotalKeys: Object.keys(currentAgg).length, previewTotalKeys: Object.keys(previewAgg).length });
      message.success('字段架构预览已生成');
    } catch (e) {
      message.error('生成字段架构失败');
    }
  }, [flattenKeys, form]);

  // 映射分组定义（按业务分栏 → 小类）
  const SCHEMA_GROUPS: Record<string, Record<string, string[]>> = useMemo(() => ({
    '基本信息 (Basic Info)': {
      '身份与联系方式': [
        'email', 'name', 'phone', 'memberId',
        'profile.fullNameNric', 'profile.nricOrPassport',
        'gender', 'nationality', 'race', 'birthDate',
        'avatar', 'profilePhotoUrl',
        'profile.address', 'profile.address.street', 'profile.address.city', 'profile.address.state', 'profile.address.postcode', 'profile.address.country',
        'profile.alternativePhone', 'profile.emergencyContact', 'profile.emergencyContact.name', 'profile.emergencyContact.phone', 'profile.emergencyContact.relationship',
      ],
      '社交与在线': [
        'profile.socialMedia', 'profile.socialMedia.facebook', 'profile.socialMedia.linkedin', 'profile.socialMedia.instagram', 'profile.socialMedia.wechat',
        'profile.linkedin',
      ],
      '账号状态': [
        'status', 'level', 'accountType',
        'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
      ],
    },
    '职业信息 (Career/Business Info)': {
      '工作与企业': [
        // current paths
        'profile.company', 'profile.companyWebsite', 'profile.departmentAndPosition', 'profile.ownIndustry', 'profile.companyIntro', 'profile.shirtSize', 'profile.jacketSize', 'profile.nameToBeEmbroidered', 'profile.tshirtReceivingStatus', 'profile.cutting',
        // preview paths
        'business.company', 'business.companyWebsite', 'business.departmentAndPosition', 'business.ownIndustry', 'business.companyIntro',
      ],
      '行业与兴趣': [
        'profile.interestedIndustries', 'profile.businessCategories', 'profile.acceptInternationalBusiness',
        'business.interestedIndustries', 'business.businessCategories', 'business.acceptInternationalBusiness',
      ],
    },
    'JCI 相关 (JCI-specific)': {
      '会员类别与任期': [
        'category', 'membershipCategory', 'categoryAssignedBy', 'categoryAssignedDate', 'categoryReason', 'isActingPosition', 'actingForPosition', 'isCurrentTerm', 'positionStartDate', 'positionEndDate', 'termStartDate', 'termEndDate', 'jciPosition',
        'jciCareer.category', 'jciCareer.membershipCategory', 'jciCareer.categoryAssignedBy', 'jciCareer.categoryAssignedDate', 'jciCareer.categoryReason', 'jciCareer.isActingPosition', 'jciCareer.actingForPosition', 'jciCareer.isCurrentTerm', 'jciCareer.positionStartDate', 'jciCareer.positionEndDate', 'jciCareer.termStartDate', 'jciCareer.termEndDate', 'jciCareer.jciPosition',
      ],
      '费用与时间': [
        'joinDate', 'renewalDate', 'expiryDate', 'profile.paymentDate', 'profile.paymentSlipUrl', 'profile.paymentVerifiedDate',
        'jciCareer.joinDate', 'jciCareer.renewalDate', 'jciCareer.expiryDate', 'jciCareer.paymentDate', 'jciCareer.paymentSlipUrl', 'jciCareer.paymentVerifiedDate',
      ],
      '关系与荣誉': [
        'introducerId', 'introducerName', 'profile.senatorId', 'profile.senatorScore', 'profile.senatorVerified',
        'jciCareer.introducerId', 'jciCareer.introducerName', 'jciCareer.senatorId', 'jciCareer.senatorScore', 'jciCareer.senatorVerified',
      ],
      '组织归属': [
        'worldRegion', 'country', 'countryRegion', 'chapter', 'chapterId',
        'jciCareer.worldRegion', 'jciCareer.country', 'jciCareer.countryRegion', 'jciCareer.chapter', 'jciCareer.chapterId',
      ],
      '权限与绑定': [
        'profile.hasSpecialPermissions', 'profile.specialPermissions', 'profile.permissionNotes', 'profile.effectivePermissions', 'profile.roleBindings', 'profile.roleBindings.roleId', 'profile.roleBindings.roleName', 'profile.roleBindings.assignedAt', 'profile.roleBindings.assignedBy',
        'jciCareer.hasSpecialPermissions', 'jciCareer.specialPermissions', 'jciCareer.permissionNotes', 'jciCareer.effectivePermissions', 'jciCareer.roleBindings', 'jciCareer.roleBindings.roleId', 'jciCareer.roleBindings.roleName', 'jciCareer.roleBindings.assignedAt', 'jciCareer.roleBindings.assignedBy',
      ],
      '活动与任务': [
        'profile.jciEventInterests', 'profile.jciBenefitsExpectation', 'profile.activityParticipation', 'profile.activityParticipation.eventId', 'profile.activityParticipation.eventName', 'profile.activityParticipation.role', 'profile.taskCompletions', 'profile.taskCompletions.taskId', 'profile.taskCompletions.taskName', 'profile.taskCompletions.completedAt', 'profile.taskCompletions.verifiedBy',
        'jciCareer.jciEventInterests', 'jciCareer.jciBenefitsExpectation', 'jciCareer.activityParticipation', 'jciCareer.activityParticipation.eventId', 'jciCareer.activityParticipation.eventName', 'jciCareer.activityParticipation.role', 'jciCareer.taskCompletions', 'jciCareer.taskCompletions.taskId', 'jciCareer.taskCompletions.taskName', 'jciCareer.taskCompletions.completedAt', 'jciCareer.taskCompletions.verifiedBy',
      ],
    },
  }), []);

  const groupSchema = useCallback((schema: Record<string, number>) => {
    const result: Record<string, Record<string, Array<{ key: string; count: number }>>> = {};
    const assigned = new Set<string>();
    for (const section of Object.keys(SCHEMA_GROUPS)) {
      result[section] = {};
      const subsections = SCHEMA_GROUPS[section];
      for (const sub of Object.keys(subsections)) {
        const patterns = subsections[sub];
        const items: Array<{ key: string; count: number }> = [];
        for (const k of Object.keys(schema)) {
          if (assigned.has(k)) continue;
          // 匹配前缀或完全相等
          if (patterns.some(p => k === p || k.startsWith(p + '.'))) {
            items.push({ key: k, count: schema[k] });
            assigned.add(k);
          }
        }
        if (items.length > 0) {
          // 排序：先顶层，再深层
          items.sort((a, b) => a.key.localeCompare(b.key));
          result[section][sub] = items;
        }
      }
    }
    // 未分组
    const ungrouped: Array<{ key: string; count: number }> = [];
    for (const k of Object.keys(schema)) {
      if (!assigned.has(k)) ungrouped.push({ key: k, count: schema[k] });
    }
    if (ungrouped.length > 0) {
      if (!result['未分组']) result['未分组'] = {} as any;
      result['未分组']['其他'] = ungrouped.sort((a, b) => a.key.localeCompare(b.key));
    }
    return result;
  }, [SCHEMA_GROUPS]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={3}>成员数据架构迁移（前端执行）</Title>
      <Alert type="warning" showIcon message="仅管理员可见。建议先 Dry Run，确认差异后再执行正式迁移。" />

      <Card>
        <Form form={form} layout="inline">
          <Form.Item name="mode" label="模式">
            <Radio.Group>
              <Radio.Button value="dry">Dry Run</Radio.Button>
              <Radio.Button value="write">正式迁移</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="targetDocId" label="Doc ID (可选)">
            <Input placeholder="仅迁移此单条文档" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="batchSize" label="批大小">
            <InputNumber min={50} max={1000} step={50} />
          </Form.Item>
          <Form.Item name="limitOne" valuePropName="checked">
            <Checkbox>仅迁移1条</Checkbox>
          </Form.Item>
          <Form.Item name="enablePathMigration" valuePropName="checked">
            <Checkbox>启用路径迁移（profile.* → 顶层）</Checkbox>
          </Form.Item>
          <Form.Item name="enableSectionNamespacing" valuePropName="checked">
            <Checkbox>按分区迁移路径（profile.basic / profile.career / jci.*）</Checkbox>
          </Form.Item>
          <Form.Item name="enableFlattenToTop" valuePropName="checked">
            <Checkbox>将所有字段迁移至顶部（移除 profile/career/jci 命名空间）</Checkbox>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleRun} disabled={running}>开始</Button>
              <Button onClick={handleStop} danger disabled={!running}>停止</Button>
              <Button onClick={generateSchemas}>生成字段架构预览</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Text>进度：处理 {progress.processed}，更新 {progress.updated}，失败 {progress.failed}</Text>
          <Progress percent={progress.processed === 0 ? 0 : Math.min(100, Math.round((progress.updated + progress.failed) / Math.max(1, progress.processed) * 100))} />
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="key"
          columns={tableColumns}
          dataSource={rows}
          {...tableConfig}
        />
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="现有 Collection 字段架构 (分组预览)">
            {Object.entries(groupSchema(currentSchema)).map(([section, subs]) => (
              <Card key={section} size="small" title={section} style={{ marginBottom: 12 }}>
                {Object.entries(subs).map(([sub, items]) => (
                  <Card key={section + '-' + sub} size="small" type="inner" title={sub} style={{ marginBottom: 8 }}>
                    <List
                      size="small"
                      dataSource={items}
                      renderItem={(it) => (
                        <List.Item>
                          <Space>
                            <code>{it.key}</code>
                            <Tag>{it.count}</Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                ))}
              </Card>
            ))}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="预览 Collection 字段架构 (迁移后分组)">
            {Object.entries(groupSchema(previewSchema)).map(([section, subs]) => (
              <Card key={section} size="small" title={section} style={{ marginBottom: 12 }}>
                {Object.entries(subs).map(([sub, items]) => (
                  <Card key={section + '-' + sub} size="small" type="inner" title={sub} style={{ marginBottom: 8 }}>
                    <List
                      size="small"
                      dataSource={items}
                      renderItem={(it) => (
                        <List.Item>
                          <Space>
                            <code>{it.key}</code>
                            <Tag color="blue">{it.count}</Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                ))}
              </Card>
            ))}
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default MemberDataMigrationPage;


