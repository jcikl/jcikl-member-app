# 会员管理字段分析与补全

## 📊 字段对比分析

### ✅ 已存在的字段

| Firestore字段 | 当前类型定义 | 位置 | 状态 |
|--------------|------------|------|------|
| `email` | Member.email | 核心字段 | ✅ 已有 |
| `name` | Member.name | 核心字段 | ✅ 已有 |
| `phone` | Member.phone | 核心字段 | ✅ 已有 |
| `memberId` | Member.memberId | 核心字段 | ✅ 已有 |
| `status` | Member.status | 核心字段 | ✅ 已有 |
| `level` | Member.level | 核心字段 | ✅ 已有 |
| `accountType` | Member.accountType | 核心字段 | ✅ 已有 |
| `category` | Member.category | 核心字段 | ✅ 已有 |
| `worldRegion` | Member.worldRegion | 组织层级 | ✅ 已有 |
| `country` | Member.country | 组织层级 | ✅ 已有 |
| `countryRegion` | Member.countryRegion | 组织层级 | ✅ 已有 |
| `chapter` | Member.chapter | 组织层级 | ✅ 已有 |
| `joinDate` | Member.joinDate | 日期 | ✅ 已有 |
| `createdAt` | BaseEntity.createdAt | 元数据 | ✅ 已有 |
| `updatedAt` | BaseEntity.updatedAt | 元数据 | ✅ 已有 |
| `updatedBy` | Member.updatedBy | 元数据 | ✅ 已有 |
| `profile.gender` | MemberProfile.gender | Profile | ✅ 已有 |
| `profile.nationality` | MemberProfile.nationality | Profile | ✅ 已有 |
| `profile.company` | MemberProfile.company | Profile | ✅ 已有 |
| `profile.departmentAndPosition` | MemberProfile.departmentAndPosition | Profile | ✅ 已有 |
| `profile.companyIntro` | MemberProfile.companyIntro | Profile | ✅ 已有 |
| `profile.industryDetail` | MemberProfile.industryDetail | Profile | ✅ 已有 |
| `profile.ownIndustry` | MemberProfile.ownIndustry | Profile | ✅ 已有 |
| `profile.acceptInternationalBusiness` | MemberProfile.acceptInternationalBusiness | Profile | ✅ 已有 |
| `profile.jciPosition` | MemberProfile.jciPosition | Profile | ✅ 已有 |
| `profile.senatorId` | MemberProfile.senatorId | Profile | ✅ 已有 |
| `profile.introducerName` | MemberProfile.introducerName | Profile | ✅ 已有 |
| `profile.fiveYearsVision` | MemberProfile.fiveYearsVision | Profile | ✅ 已有 |
| `profile.activeMemberHow` | MemberProfile.activeMemberHow | Profile | ✅ 已有 |

---

## ❌ 缺少的字段

### 1. 会员类别管理字段

| Firestore字段 | 类型 | 说明 | 优先级 |
|--------------|------|------|--------|
| `membershipCategory` | string | 会员类别（associate等） | 🔴 高 |
| `categoryAssignedBy` | string | 类别分配者 | 🟡 中 |
| `categoryAssignedDate` | string | 类别分配日期 | 🟡 中 |
| `categoryReason` | string | 类别分配原因 | 🟡 中 |

### 2. Profile扩展字段

| Firestore字段 | 类型 | 说明 | 优先级 |
|--------------|------|------|--------|
| `profile.fullNameNric` | string | 身份证全名 | 🔴 高 |
| `profile.nricOrPassport` | string | 身份证或护照号码 | 🔴 高 |
| `profile.birthDate` | object/string | 出生日期（Dayjs对象） | 🔴 高 |
| `profile.address` | string | 完整地址（当前是对象） | 🟡 中 |
| `profile.race` | string | 种族 | 🟡 中 |
| `profile.linkedin` | string | LinkedIn链接 | 🟢 低 |
| `profile.companyWebsite` | string | 公司网站 | 🟢 低 |

### 3. JCI特定字段

| Firestore字段 | 类型 | 说明 | 优先级 |
|--------------|------|------|--------|
| `profile.senatorVerified` | boolean | 参议员验证状态 | 🟡 中 |
| `profile.jciEventInterests` | string | JCI活动兴趣 | 🟢 低 |
| `profile.jciBenefitsExpectation` | string | JCI利益期望 | 🟢 低 |

### 4. 职位与权限字段

| Firestore字段 | 类型 | 说明 | 优先级 |
|--------------|------|------|--------|
| `profile.isActingPosition` | boolean | 是否代理职位 | 🟡 中 |
| `profile.actingForPosition` | string/null | 代理的职位 | 🟡 中 |
| `profile.isCurrentTerm` | boolean | 是否当前任期 | 🟡 中 |
| `profile.positionStartDate` | string/null | 职位开始日期 | 🟡 中 |
| `profile.positionEndDate` | string/null | 职位结束日期 | 🟡 中 |
| `profile.termStartDate` | string/null | 任期开始日期 | 🟡 中 |
| `profile.termEndDate` | string/null | 任期结束日期 | 🟡 中 |
| `profile.vpDivision` | string/null | VP部门 | 🟢 低 |
| `profile.hasSpecialPermissions` | boolean | 是否有特殊权限 | 🟡 中 |
| `profile.specialPermissions` | array | 特殊权限列表 | 🟡 中 |
| `profile.permissionNotes` | string | 权限备注 | 🟢 低 |

### 5. 会员加入与推荐字段

| Firestore字段 | 类型 | 说明 | 优先级 |
|--------------|------|------|--------|
| `profile.joinedDate` | string | 加入日期 | 🟡 中 |
| `profile.endorsementDate` | string/null | 背书日期 | 🟢 低 |

### 6. 实物与活动字段

| Firestore字段 | 类型 | 说明 | 优先级 |
|--------------|------|--------|--------|
| `profile.shirtSize` | string/null | 衬衫尺寸 | 🟢 低 |
| `profile.jacketSize` | string/null | 夹克尺寸 | 🟢 低 |
| `profile.nameToBeEmbroidered` | string/null | 刺绣名称 | 🟢 低 |
| `profile.tshirtReceivingStatus` | string/null | T恤接收状态 | 🟢 低 |
| `profile.whatsappGroup` | string/null | WhatsApp群组 | 🟢 低 |

### 7. 付款相关字段

| Firestore字段 | 类型 | 说明 | 优先级 |
|--------------|------|------|--------|
| `profile.paymentDate` | string/null | 付款日期 | 🟡 中 |
| `profile.paymentSlipUrl` | string/null | 付款凭证URL | 🟡 中 |
| `profile.paymentVerifiedDate` | string/null | 付款验证日期 | 🟡 中 |

### 8. 其他字段

| Firestore字段 | 类型 | 说明 | 优先级 |
|--------------|------|------|--------|
| `profile.profilePhotoUrl` | string | 个人照片URL | 🟢 低 |
| `profile.categories` | array | 类别列表 | 🟢 低 |
| `profile.cutting` | unknown | 未知字段 | ⚪ 待确认 |

---

## 🔧 建议的类型定义更新

### 更新MemberProfile接口

```typescript
export interface MemberProfile {
  // ========== Basic Info ==========
  avatar?: string;
  profilePhotoUrl?: string;            // 🆕 个人照片URL
  birthDate?: string | DayjsObject;    // 🔄 支持Dayjs对象
  fullNameNric?: string;               // 🆕 身份证全名
  gender?: Gender;
  nationality?: string;
  nric?: string;                       // National ID
  nricOrPassport?: string;             // 🆕 身份证或护照号码
  race?: string;                       // 🆕 种族
  
  // ========== Contact Info ==========
  alternativePhone?: string;
  address?: string | AddressObject;    // 🔄 支持字符串或对象
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  
  // ========== Social Media ==========
  socialMedia?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    wechat?: string;
  };
  linkedin?: string;                   // 🆕 LinkedIn链接（简化访问）
  
  // ========== Career & Business ==========
  company?: string;
  companyWebsite?: string;             // 🆕 公司网站
  departmentAndPosition?: string;
  industryDetail?: string;
  companyIntro?: string;
  ownIndustry?: IndustryType[];
  interestedIndustries?: IndustryType[];
  businessCategories?: BusinessCategory[];
  acceptInternationalBusiness?: 'Yes' | 'No' | 'Willing to explore';
  
  // ========== JCI Specific ==========
  jciPosition?: string;
  senatorId?: string;
  senatorScore?: number;
  senatorVerified?: boolean;           // 🆕 参议员验证状态
  introducerId?: string;
  introducerName?: string;
  jciEventInterests?: string;          // 🆕 JCI活动兴趣
  jciBenefitsExpectation?: string;     // 🆕 JCI利益期望
  
  // ========== Position Management ==========
  isActingPosition?: boolean;          // 🆕 是否代理职位
  actingForPosition?: string | null;   // 🆕 代理的职位
  isCurrentTerm?: boolean;             // 🆕 是否当前任期
  positionStartDate?: string | null;   // 🆕 职位开始日期
  positionEndDate?: string | null;     // 🆕 职位结束日期
  termStartDate?: string | null;       // 🆕 任期开始日期
  termEndDate?: string | null;         // 🆕 任期结束日期
  vpDivision?: string | null;          // 🆕 VP部门
  
  // ========== Career Development ==========
  fiveYearsVision?: string;
  activeMemberHow?: string;
  
  // ========== Membership & Joining ==========
  joinedDate?: string;                 // 🆕 加入日期
  endorsementDate?: string | null;     // 🆕 背书日期
  
  // ========== Payment Info ==========
  paymentDate?: string | null;         // 🆕 付款日期
  paymentSlipUrl?: string | null;      // 🆕 付款凭证URL
  paymentVerifiedDate?: string | null; // 🆕 付款验证日期
  
  // ========== Permissions & Roles ==========
  hasSpecialPermissions?: boolean;     // 🆕 是否有特殊权限
  specialPermissions?: string[];       // 🆕 特殊权限列表
  permissionNotes?: string;            // 🆕 权限备注
  effectivePermissions?: string[];
  roleBindings?: Array<{
    roleId: string;
    roleName: string;
    assignedAt: string;
    assignedBy: string;
  }>;
  
  // ========== Physical Items ==========
  shirtSize?: string | null;           // 🆕 衬衫尺寸
  jacketSize?: string | null;          // 🆕 夹克尺寸
  nameToBeEmbroidered?: string | null; // 🆕 刺绣名称
  tshirtReceivingStatus?: string | null; // 🆕 T恤接收状态
  
  // ========== Communication ==========
  whatsappGroup?: string | null;       // 🆕 WhatsApp群组
  
  // ========== Miscellaneous ==========
  categories?: string[];               // 🆕 类别列表
  cutting?: any;                       // 🆕 待确认用途
  
  // ========== Activity & Tasks ==========
  taskCompletions?: Array<{
    taskId: string;
    taskName: string;
    completedAt: string;
    verifiedBy?: string;
  }>;
  
  activityParticipation?: Array<{
    eventId: string;
    eventName: string;
    participatedAt: string;
    role?: string;
  }>;
}
```

### 更新Member接口

```typescript
export interface Member extends BaseEntity {
  // Core Identity
  email: string;
  name: string;
  phone: string;
  memberId: string | null;           // 🔄 可以为null（新用户）
  
  // Status & Level
  status: MemberStatus;
  level: MemberLevel;
  accountType?: string;
  category?: MemberCategoryType;
  membershipCategory?: string;       // 🆕 会员类别（补充字段）
  
  // Category Management
  categoryAssignedBy?: string;       // 🆕 类别分配者
  categoryAssignedDate?: string;     // 🆕 类别分配日期
  categoryReason?: string;           // 🆕 类别分配原因
  
  // Organization Hierarchy (5 levels)
  worldRegion?: string;
  country?: string;
  countryRegion?: string;
  chapter?: string;
  chapterId?: string;
  
  // Profile
  profile: MemberProfile;
  
  // Dates
  joinDate: string;
  renewalDate?: string;
  expiryDate?: string;
  
  // Metadata
  createdBy?: string;
  updatedBy?: string;
}
```

---

## 📋 字段优先级说明

### 🔴 高优先级（必须添加）
这些字段对会员管理核心功能至关重要：
- `membershipCategory` - 会员类别标识
- `profile.fullNameNric` - 法定全名
- `profile.nricOrPassport` - 身份验证
- `profile.birthDate` (支持Dayjs对象) - 年龄相关功能

### 🟡 中优先级（建议添加）
这些字段对会员管理和权限系统有重要作用：
- 类别管理字段（`categoryAssignedBy`, `categoryAssignedDate`, `categoryReason`）
- 职位管理字段（`isActingPosition`, `positionStartDate`, `termStartDate`等）
- 权限字段（`hasSpecialPermissions`, `specialPermissions`）
- 付款字段（`paymentDate`, `paymentSlipUrl`, `paymentVerifiedDate`）

### 🟢 低优先级（可选添加）
这些字段增强用户体验但不影响核心功能：
- 实物字段（`shirtSize`, `jacketSize`等）
- 社交字段（`companyWebsite`, `linkedin`）
- JCI兴趣字段（`jciEventInterests`, `jciBenefitsExpectation`）

---

## 🔄 地址字段特殊处理

当前数据中的address字段有两种格式：

### 格式1：字符串（Firestore实际数据）
```typescript
profile.address = "11, Taman Cahaya 43000 Kajang Selangor"
```

### 格式2：对象（当前类型定义）
```typescript
profile.address = {
  street: "11, Taman Cahaya",
  city: "Kajang",
  state: "Selangor",
  postcode: "43000",
  country: "Malaysia"
}
```

**建议**：支持两种格式
```typescript
address?: string | {
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
};
```

---

## 🔄 出生日期字段特殊处理

当前数据中的birthDate是Dayjs对象：

```typescript
birthDate: {
  $D: 16,
  $M: 10,
  $y: 1990,
  $H: 0,
  $m: 0,
  $s: 0,
  // ... Dayjs内部属性
}
```

**建议**：在读取时转换为ISO字符串
```typescript
// Service层处理
const birthDateString = memberData.profile?.birthDate?.$d 
  ? dayjs(memberData.profile.birthDate.$d).format('YYYY-MM-DD')
  : memberData.profile?.birthDate;
```

---

## 🎯 实施建议

### 阶段1：核心字段（立即实施）
1. 更新`src/modules/member/types/index.ts`
2. 添加高优先级字段到Member和MemberProfile接口
3. 更新会员表单组件以支持新字段

### 阶段2：扩展字段（短期实施）
1. 添加中优先级字段
2. 更新会员详情页面显示新字段
3. 添加字段验证逻辑

### 阶段3：优化字段（长期实施）
1. 添加低优先级字段
2. 优化用户体验
3. 添加数据迁移脚本

---

## 📝 数据迁移注意事项

### 1. Dayjs对象转换
```typescript
// 读取时
const birthDate = data.profile?.birthDate?.$d 
  ? dayjs(data.profile.birthDate.$d).format('YYYY-MM-DD')
  : data.profile?.birthDate;

// 存储时
const birthDateToStore = dayjs(birthDateInput).toISOString();
```

### 2. Null值处理
```typescript
// 很多字段可能为null，确保处理
memberId: data.memberId || null,
profile: {
  actingForPosition: data.profile?.actingForPosition || null,
  // ...
}
```

### 3. 向后兼容
- 新字段都标记为可选（`?`）
- 旧数据可以正常显示
- 添加默认值处理

---

## ✅ 检查清单

- [ ] 更新Member接口添加类别管理字段
- [ ] 更新MemberProfile接口添加所有新字段
- [ ] 支持address的字符串和对象两种格式
- [ ] 支持birthDate的Dayjs对象转换
- [ ] 更新会员表单组件
- [ ] 更新会员详情显示
- [ ] 添加字段验证
- [ ] 更新数据导入/导出逻辑
- [ ] 测试向后兼容性
- [ ] 更新API文档

---

**分析完成日期**: 2025-01-22  
**优先级**: 🔴 高优先级字段应立即实施  
**影响范围**: Member类型定义、会员表单、会员详情页面

