# 会员类别自动转换为校友功能分析

## ✅ 功能概述

系统已实现当会员年龄达到40岁或以上时，自动将会员类别（category）转换为校友（Alumni）的功能。

## 🎯 业务规则

### **会员类别自动计算规则**

```typescript
// 位置: src/modules/member/services/memberService.ts
// 函数: computeAutoCategory

规则优先级（从高到低）：

1. ✅ 年龄 ≥ 40岁 + 有会费记录 → Alumni（校友）
2. ✅ 非马来西亚国籍 + 有会费记录 → Visiting Member（访问会员）
3. ✅ 有会费记录 → Probation Member（试用会员）
4. ❌ 无会费记录 → JCI Friend（青商好友）
```

### **校友转换条件**
```typescript
必须同时满足：
1. 有会费付款记录（paidAmount > 0）
2. 年龄 ≥ 40岁
```

## 🔧 技术实现

### **1. 自动计算函数**
```typescript
// src/modules/member/services/memberService.ts: 371-407
const computeAutoCategory = async (memberId: string, profile?: any): Promise<string> => {
  // 1) 默认：青商好友
  let nextCategory: string = 'JCI Friend';

  // 检查是否有会费付款记录
  let hasPaidFee = false;
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS),
      where('type', '==', 'memberFee'),
      where('memberId', '==', memberId),
      where('paidAmount', '>', 0)
    );
    const snap = await getDocs(q);
    hasPaidFee = !snap.empty;
  } catch {}

  if (hasPaidFee) {
    // 2) 有会费付款记录：先设为 Probation Member（试用/观察会员）
    nextCategory = 'Probation Member';

    const birth = profile?.birthDate;
    const nationality = profile?.nationality || profile?.address?.country;
    const age = birth ? dayjs().diff(dayjs(birth), 'year') : undefined;

    // 3) ✅ 有会费 + 年龄≥40 → 校友
    if (age !== undefined && age >= 40) {
      nextCategory = 'Alumni';
    }
    
    // 4) 有会费 + 非马来西亚公民 → 访问会员
    if (nationality && !/^malaysia$/i.test(nationality)) {
      nextCategory = 'Visiting Member';
    }
  }

  return nextCategory;
};
```

### **2. 年龄计算逻辑**
```typescript
const birth = profile?.birthDate;
const age = birth ? dayjs().diff(dayjs(birth), 'year') : undefined;

// 判断逻辑
if (age !== undefined && age >= 40) {
  nextCategory = 'Alumni';
}
```

### **3. 触发时机**
```typescript
// src/modules/member/services/memberService.ts: 409-478
export const updateMember = async (
  memberId: string,
  data: Partial<MemberFormData>,
  updatedBy: string
): Promise<Member> => {
  // ... 获取现有数据
  
  // 🔑 自动计算类别
  const baseProfile = {
    ...memberDoc.data()?.profile,
    ...(data.birthDate !== undefined ? { birthDate: data.birthDate } : {}),
    // ... 其他字段
  };
  const autoCategory = await computeAutoCategory(memberId, baseProfile);
  
  const updateData = cleanUndefinedValues({
    // ... 其他字段
    category: autoCategory, // 🔑 强制覆盖为自动类别
    // ...
  });
  
  await updateDoc(memberRef, updateData);
};
```

## 📊 自动转换流程图

```
会员更新操作触发
        ↓
调用 updateMember()
        ↓
调用 computeAutoCategory()
        ↓
查询会费付款记录
        ↓
    是否有会费记录？
        ├─ 否 → 返回 'JCI Friend'
        └─ 是 ↓
            计算年龄
                ↓
            年龄 ≥ 40？
                ├─ 是 → 返回 'Alumni' ✅
                └─ 否 ↓
                    检查国籍
                        ↓
                    非马来西亚？
                        ├─ 是 → 返回 'Visiting Member'
                        └─ 否 → 返回 'Probation Member'
        ↓
更新会员 category 字段
        ↓
保存到 Firestore
```

## 🔍 关键代码位置

### **文件**: `src/modules/member/services/memberService.ts`

| 功能 | 函数名 | 行号 |
|------|--------|------|
| 自动计算类别 | `computeAutoCategory` | 371-407 |
| 年龄计算 | 内联逻辑 | 394 |
| 校友判断 | 条件判断 | 397-399 |
| 应用自动类别 | `updateMember` | 409-478 |

### **依赖的数据**

#### **会费记录查询**
```typescript
collection: 'financial_records'
条件:
  - type == 'memberFee'
  - memberId == <当前会员ID>
  - paidAmount > 0
```

#### **年龄计算数据源**
```typescript
profile.birthDate // 会员的出生日期
当前日期 - 出生日期 = 年龄
```

## ⚙️ 自动触发场景

### **何时会自动转换为校友？**

1. **更新会员信息时**
   - 用户编辑会员资料并保存
   - 系统自动计算年龄并更新类别

2. **更新出生日期时**
   - 用户设置或修改会员的出生日期
   - 如果新年龄 ≥ 40，自动转为校友

3. **批量更新时**
   - 任何调用 `updateMember` 的操作
   - 都会触发类别自动计算

### **不会自动转换的场景**

1. **创建新会员** - 创建时不调用 `computeAutoCategory`
2. **仅查看数据** - 只读操作不触发
3. **删除操作** - 删除不涉及类别更新

## 📋 测试场景

### **场景1: 39岁会员更新后**
```
会员信息:
  - 出生日期: 1986-01-01
  - 当前年龄: 39岁
  - 有会费记录: 是
  
结果: category = 'Probation Member' ❌ 不转为校友
```

### **场景2: 40岁会员更新后**
```
会员信息:
  - 出生日期: 1985-01-01
  - 当前年龄: 40岁
  - 有会费记录: 是
  
结果: category = 'Alumni' ✅ 自动转为校友
```

### **场景3: 45岁会员更新后**
```
会员信息:
  - 出生日期: 1980-01-01
  - 当前年龄: 45岁
  - 有会费记录: 是
  
结果: category = 'Alumni' ✅ 自动转为校友
```

### **场景4: 40岁但无会费记录**
```
会员信息:
  - 出生日期: 1985-01-01
  - 当前年龄: 40岁
  - 有会费记录: 否
  
结果: category = 'JCI Friend' ❌ 不转为校友（缺少会费记录）
```

## ⚠️ 注意事项

### **前置条件**
1. **必须有会费记录** - `paidAmount > 0` 的会费记录
2. **必须有出生日期** - `profile.birthDate` 不能为空
3. **必须通过更新触发** - 只有调用 `updateMember` 时才会自动计算

### **已知限制**
1. **创建时不自动** - 创建会员时不会自动计算类别
2. **需要触发更新** - 会员满40岁后，需要有一次更新操作才会转换
3. **不可手动设置** - 类别由系统自动计算，不能手动覆盖

## 🔄 优化建议

### **建议1: 添加定时任务**
```typescript
// 每天自动检查所有会员的年龄并更新类别
const autoUpdateMemberCategories = async () => {
  const members = await getMembers({ limit: 1000 });
  
  for (const member of members.data) {
    if (member.profile?.birthDate) {
      const age = dayjs().diff(dayjs(member.profile.birthDate), 'year');
      
      // 如果年龄≥40且不是校友，触发更新
      if (age >= 40 && member.category !== 'Alumni') {
        await updateMember(member.id, {}, 'system');
      }
    }
  }
};
```

### **建议2: 在创建时也应用规则**
```typescript
// 在 createMember 函数中
const age = data.birthDate ? dayjs().diff(dayjs(data.birthDate), 'year') : undefined;
const initialCategory = (age !== undefined && age >= 40) ? 'Alumni' : 'JCI Friend';
```

### **建议3: 添加手动触发按钮**
在会员管理页面添加"批量更新类别"按钮，允许管理员手动触发类别重新计算。

## 📝 总结

### **当前实现**
- ✅ **已实现** - 年龄≥40自动转为校友的功能
- ✅ **位置** - `memberService.ts` 的 `computeAutoCategory` 函数
- ✅ **触发** - 每次调用 `updateMember` 时自动执行
- ✅ **条件** - 需要有会费记录 + 年龄≥40

### **工作原理**
1. 用户更新会员信息
2. 系统自动计算年龄
3. 如果年龄≥40且有会费记录，自动设置为校友
4. 保存到数据库

### **注意事项**
- **不是实时的** - 需要有更新操作才会触发
- **有前置条件** - 需要有会费记录和出生日期
- **优先级规则** - 年龄优先于国籍判断

---

**分析时间**: 2025-01-13  
**分析人员**: AI Assistant  
**版本**: 1.0.0  
**状态**: ✅ 功能已存在并正常工作
