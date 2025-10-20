# 📊 Firestore 会员存储字段详解

## 🗃️ 集合名称
**Collection**: `GLOBAL_COLLECTIONS.MEMBERS`

---

## 📋 完整字段结构

### ⚡ 基础字段 (BaseEntity)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | Firestore 文档 ID |
| `createdAt` | `string` | ✅ | 创建时间 (ISO 8601) |
| `updatedAt` | `string` | ✅ | 更新时间 (ISO 8601) |

---

### 🆔 核心身份字段 (Core Identity)

| 字段 | 类型 | 必填 | 示例 | 说明 |
|------|------|------|------|------|
| `email` | `string` | ✅ | `"kelly@example.com"` | 会员邮箱（唯一） |
| `name` | `string` | ✅ | `"Kelly Choong"` | 会员姓名 |
| `phone` | `string` | ✅ | `"+60123456789"` | 电话号码 |
| `memberId` | `string` | ✅ | `"JCI-KL-2025-001"` | 会员编号（唯一） |

---

### 📊 状态与级别 (Status & Level)

| 字段 | 类型 | 必填 | 可选值 | 说明 |
|------|------|------|--------|------|
| `status` | `MemberStatus` | ✅ | `'active'` \| `'inactive'` \| `'suspended'` \| `'pending'` | 会员状态 |
| `level` | `MemberLevel` | ✅ | `'bronze'` \| `'silver'` \| `'gold'` \| `'platinum'` \| `'diamond'` | 会员级别 |
| `accountType` | `string` | ❌ | - | 账户类型（遗留字段） |
| `category` | `MemberCategoryType` | ❌ | 见下表 | 会员分类 |

#### **会员分类 (MemberCategoryType)**
- `'Official Member'` - 正式会员
- `'Associate Member'` - 准会员
- `'Honorary Member'` - 荣誉会员
- `'Visiting Member'` - 访问会员
- `'Alumni'` - 校友
- `'JCI Friend'` - 青商好友

---

### 🌍 组织层级 (Organization Hierarchy)

| 字段 | 类型 | 必填 | 示例 | 说明 |
|------|------|------|------|------|
| `worldRegion` | `string` | ❌ | `"Asia Pacific"` | 世界区域 |
| `country` | `string` | ❌ | `"Malaysia"` | 国家 |
| `countryRegion` | `string` | ❌ | `"Central Region"` | 国内区域 |
| `chapter` | `string` | ❌ | `"JCI Kuala Lumpur"` | 分会名称 |
| `chapterId` | `string` | ❌ | `"jci-kl"` | 分会 ID |

---

### 📅 日期字段 (Dates)

| 字段 | 类型 | 必填 | 格式 | 说明 |
|------|------|------|------|------|
| `joinDate` | `string` | ✅ | ISO 8601 | 加入日期 |
| `renewalDate` | `string` | ❌ | ISO 8601 | 下次续费日期 |
| `expiryDate` | `string` | ❌ | ISO 8601 | 会员资格到期日 |

---

### 👤 会员资料 (Profile)

`profile` 字段是一个嵌套对象，包含以下子字段：

#### **基本信息 (Basic Info)**

| 字段 | 类型 | 必填 | 示例 | 说明 |
|------|------|------|------|------|
| `profile.avatar` | `string` | ❌ | `"https://cloudinary.com/..."` | 头像 URL |
| `profile.birthDate` | `string` | ❌ | `"15-Jan-1990"` | 生日 (dd-mmm-yyyy) |
| `profile.gender` | `Gender` | ❌ | `'Male'` \| `'Female'` | 性别 |
| `profile.nationality` | `string` | ❌ | `"Malaysian"` | 国籍 |
| `profile.nric` | `string` | ❌ | `"901234-12-3456"` | 身份证号 |

#### **联系方式 (Contact Info)**

| 字段 | 类型 | 必填 | 示例 | 说明 |
|------|------|------|------|------|
| `profile.alternativePhone` | `string` | ❌ | `"+60198765432"` | 备用电话 |
| `profile.emergencyContact` | `object` | ❌ | 见下方 | 紧急联系人 |

**emergencyContact 结构**:
```typescript
{
  name: string;           // "Jane Doe"
  phone: string;          // "+60123456789"
  relationship: string;   // "Spouse" / "Parent" / "Sibling"
}
```

#### **地址 (Address)**

| 字段 | 类型 | 必填 | 示例 | 说明 |
|------|------|------|------|------|
| `profile.address` | `object` | ❌ | 见下方 | 地址信息 |

**address 结构**:
```typescript
{
  street?: string;    // "123 Jalan Ampang"
  city?: string;      // "Kuala Lumpur"
  state?: string;     // "Wilayah Persekutuan"
  postcode?: string;  // "50450"
  country?: string;   // "Malaysia"
}
```

#### **社交媒体 (Social Media)**

| 字段 | 类型 | 必填 | 示例 | 说明 |
|------|------|------|------|------|
| `profile.socialMedia` | `object` | ❌ | 见下方 | 社交媒体账号 |

**socialMedia 结构**:
```typescript
{
  facebook?: string;   // "facebook.com/kellychoong"
  linkedin?: string;   // "linkedin.com/in/kellychoong"
  instagram?: string;  // "@kellychoong"
  wechat?: string;     // "kelly_wechat"
}
```

#### **职业与商业 (Career & Business)**

| 字段 | 类型 | 必填 | 示例 | 说明 |
|------|------|------|------|------|
| `profile.company` | `string` | ❌ | `"ABC Sdn Bhd"` | 公司名称 |
| `profile.departmentAndPosition` | `string` | ❌ | `"IT / Senior Developer"` | 部门与职位 |
| `profile.industryDetail` | `string` | ❌ | `"Software Development"` | 行业细分 |
| `profile.companyIntro` | `string` | ❌ | `"We provide..."` | 公司介绍 |
| `profile.ownIndustry` | `IndustryType[]` | ❌ | `["Computers & IT"]` | 自有行业 |
| `profile.interestedIndustries` | `IndustryType[]` | ❌ | `["Finance & Insurance"]` | 感兴趣的行业 |
| `profile.businessCategories` | `BusinessCategory[]` | ❌ | `["Service Provider"]` | 业务类别 |
| `profile.acceptInternationalBusiness` | `string` | ❌ | `'Yes'` \| `'No'` \| `'Willing to explore'` | 是否接受国际业务 |

**IndustryType 可选值**:
- `'Advertising, Marketing & Media'`
- `'Agriculture & Animals'`
- `'Architecture, Engineering & Construction'`
- `'Art, Entertainment & Design'`
- `'Automotive & Accessories'`
- `'Food & Beverages'`
- `'Computers & IT'`
- `'Consulting & Professional Services'`
- `'Education & Training'`
- `'Event & Hospitality'`
- `'Finance & Insurance'`
- `'Health, Wellness & Beauty'`
- `'Legal & Accounting'`
- `'Manufacturing'`
- `'Retail & E-Commerce'`
- `'Real Estate & Property Services'`
- `'Repair Services'`
- `'Security & Investigation'`
- `'Transport & Logistics'`
- `'Travel & Tourism'`
- `'Other'`

**BusinessCategory 可选值**:
- `'Distributor'`
- `'Manufacturer'`
- `'Retailer / E-commerce'`
- `'Service Provider'`

#### **JCI 相关 (JCI Specific)**

| 字段 | 类型 | 必填 | 示例 | 说明 |
|------|------|------|------|------|
| `profile.jciPosition` | `string` | ❌ | `"President"` | JCI 职位 |
| `profile.senatorId` | `string` | ❌ | `"SEN-12345"` | 参议员编号 |
| `profile.senatorScore` | `number` | ❌ | `500` | 参议员积分 |
| `profile.introducerId` | `string` | ❌ | `"mem123"` | 介绍人 ID |
| `profile.introducerName` | `string` | ❌ | `"John Doe"` | 介绍人姓名 |

#### **职业发展 (Career Development)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `profile.fiveYearsVision` | `string` | ❌ | 五年愿景 |
| `profile.activeMemberHow` | `string` | ❌ | 如何成为活跃会员 |

#### **权限与角色 (Permissions & Roles)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `profile.effectivePermissions` | `string[]` | ❌ | 有效权限列表 |
| `profile.roleBindings` | `object[]` | ❌ | 角色绑定 |

**roleBindings 结构**:
```typescript
[
  {
    roleId: string;       // "role_admin"
    roleName: string;     // "管理员"
    assignedAt: string;   // ISO 8601
    assignedBy: string;   // User ID
  }
]
```

#### **活动与任务 (Activity & Tasks)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `profile.taskCompletions` | `object[]` | ❌ | 任务完成记录 |
| `profile.activityParticipation` | `object[]` | ❌ | 活动参与记录 |

**taskCompletions 结构**:
```typescript
[
  {
    taskId: string;       // "task_001"
    taskName: string;     // "完成培训"
    completedAt: string;  // ISO 8601
    verifiedBy?: string;  // User ID
  }
]
```

**activityParticipation 结构**:
```typescript
[
  {
    eventId: string;       // "evt_001"
    eventName: string;     // "Annual Gala 2025"
    participatedAt: string; // ISO 8601
    role?: string;         // "Committee Member" / "Participant"
  }
]
```

---

### 🔖 元数据 (Metadata)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `createdBy` | `string` | ❌ | 创建者用户 ID |
| `updatedBy` | `string` | ❌ | 最后更新者用户 ID |

---

## 📊 完整示例文档

```json
{
  // ===== BaseEntity =====
  "id": "ztMo2BEsUYysT95inhI1",
  "createdAt": "2025-01-15T08:00:00.000Z",
  "updatedAt": "2025-10-17T10:30:00.000Z",
  
  // ===== Core Identity =====
  "email": "kelly.choong@example.com",
  "name": "Kelly Choong",
  "phone": "+60123456789",
  "memberId": "JCI-KL-2025-001",
  
  // ===== Status & Level =====
  "status": "active",
  "level": "gold",
  "category": "Official Member",
  "accountType": "user",
  
  // ===== Organization Hierarchy =====
  "worldRegion": "Asia Pacific",
  "country": "Malaysia",
  "countryRegion": "Central Region",
  "chapter": "JCI Kuala Lumpur",
  "chapterId": "jci-kl",
  
  // ===== Dates =====
  "joinDate": "2025-01-15T00:00:00.000Z",
  "renewalDate": "2026-01-15T00:00:00.000Z",
  "expiryDate": "2026-01-31T00:00:00.000Z",
  
  // ===== Profile =====
  "profile": {
    // Basic Info
    "avatar": "https://res.cloudinary.com/demo/image/upload/v1234567890/kelly.jpg",
    "birthDate": "15-Jan-1990",
    "gender": "Female",
    "nationality": "Malaysian",
    "nric": "900115-12-3456",
    
    // Contact Info
    "alternativePhone": "+60198765432",
    "emergencyContact": {
      "name": "Jane Choong",
      "phone": "+60123456789",
      "relationship": "Sibling"
    },
    
    // Address
    "address": {
      "street": "123 Jalan Ampang",
      "city": "Kuala Lumpur",
      "state": "Wilayah Persekutuan",
      "postcode": "50450",
      "country": "Malaysia"
    },
    
    // Social Media
    "socialMedia": {
      "facebook": "facebook.com/kellychoong",
      "linkedin": "linkedin.com/in/kellychoong",
      "instagram": "@kellychoong",
      "wechat": "kelly_wechat"
    },
    
    // Career & Business
    "company": "Tech Innovations Sdn Bhd",
    "departmentAndPosition": "IT / Senior Software Engineer",
    "industryDetail": "Software Development & Cloud Services",
    "companyIntro": "We provide cutting-edge cloud solutions for enterprises.",
    "ownIndustry": ["Computers & IT"],
    "interestedIndustries": ["Finance & Insurance", "Consulting & Professional Services"],
    "businessCategories": ["Service Provider"],
    "acceptInternationalBusiness": "Yes",
    
    // JCI Specific
    "jciPosition": "Vice President",
    "senatorId": "SEN-MY-2024-123",
    "senatorScore": 350,
    "introducerId": "abc123def456",
    "introducerName": "John Tan",
    
    // Career Development
    "fiveYearsVision": "Become a thought leader in cloud architecture and mentor young professionals.",
    "activeMemberHow": "Participate in at least 3 events per quarter and take on committee roles.",
    
    // Permissions & Roles
    "effectivePermissions": [
      "member.read",
      "member.write",
      "event.read",
      "finance.read"
    ],
    "roleBindings": [
      {
        "roleId": "role_vp",
        "roleName": "Vice President",
        "assignedAt": "2025-01-15T08:00:00.000Z",
        "assignedBy": "admin123"
      }
    ],
    
    // Activity & Tasks
    "taskCompletions": [
      {
        "taskId": "task_001",
        "taskName": "Complete JCI Orientation",
        "completedAt": "2025-01-20T10:00:00.000Z",
        "verifiedBy": "admin123"
      }
    ],
    "activityParticipation": [
      {
        "eventId": "evt_gala_2025",
        "eventName": "Annual Gala 2025",
        "participatedAt": "2025-02-10T18:00:00.000Z",
        "role": "Committee Member"
      }
    ]
  },
  
  // ===== Metadata =====
  "createdBy": "admin123",
  "updatedBy": "kelly_self"
}
```

---

## 🔍 重要说明

### ✅ 必填字段（创建会员时必须提供）
1. `email` - 会员邮箱
2. `name` - 会员姓名
3. `phone` - 电话号码
4. `memberId` - 会员编号
5. `status` - 会员状态
6. `level` - 会员级别
7. `joinDate` - 加入日期
8. `profile` - 会员资料对象（至少是空对象 `{}`）

### ⚠️ 注意事项

1. **日期格式**:
   - 所有日期字段使用 ISO 8601 格式 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
   - 除了 `profile.birthDate` 使用 `dd-mmm-yyyy` 格式

2. **唯一性约束**:
   - `email` 必须唯一
   - `memberId` 必须唯一
   - `phone` 建议唯一（但系统未强制）

3. **嵌套对象**:
   - `profile` 是一个复杂的嵌套对象
   - 所有子字段都是可选的
   - 使用 `?.` 操作符安全访问嵌套属性

4. **数组字段**:
   - `ownIndustry`, `interestedIndustries`, `businessCategories` 都是数组
   - `effectivePermissions`, `roleBindings`, `taskCompletions`, `activityParticipation` 都是数组

5. **遗留字段**:
   - `accountType` 是遗留字段，逐步被 `category` 替代

---

## 🔗 相关集合

| 集合名称 | 关联方式 | 说明 |
|---------|---------|------|
| `FINANCIAL_RECORDS` | `memberId` | 会员费记录 |
| `TRANSACTIONS` | `metadata.memberId` | 交易记录 |
| `EVENT_PARTICIPANTS` | `memberId` | 活动参与 |
| `RBAC_ROLE_BINDINGS` | `userId` (= member.id) | 角色绑定 |
| `MEMBER_RECRUITMENT` | `newMemberId` / `introducerId` | 招募记录 |

---

## 📚 TypeScript 类型定义位置

**文件**: `src/modules/member/types/index.ts`

- `Member` - 主接口
- `MemberProfile` - 资料接口
- `MemberCategoryType` - 分类类型
- `MemberStatus` - 状态类型
- `MemberLevel` - 级别类型
- `IndustryType` - 行业类型
- `BusinessCategory` - 业务类别类型
- `Gender` - 性别类型

---

**文档版本**: 1.0  
**最后更新**: 2025-10-18  
**维护者**: JCI KL Tech Team

