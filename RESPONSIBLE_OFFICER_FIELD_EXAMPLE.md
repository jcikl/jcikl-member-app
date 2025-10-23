# Project Collection 负责理事字段设计

## 📊 数据结构示例

### Event 接口更新
```typescript
export interface Event extends BaseEntity {
  // ... 其他字段
  
  // 🆕 负责理事信息
  responsibleOfficer?: {
    memberId: string;               // 负责理事会员ID
    name: string;                  // 负责理事姓名
    position: string;              // 理事职位 (President, Vice President, Secretary, Treasurer, Director)
    email?: string;                // 联系方式
    phone?: string;                // 联系电话
  };
  
  // ... 其他字段
}
```

### Firestore Document 示例
```json
{
  "id": "event_001",
  "name": "2025 JCI KL Mid Year Awards Dinner",
  "startDate": "2025-08-08T18:00:00Z",
  "endDate": "2025-08-08T22:00:00Z",
  "status": "Published",
  "level": "Local",
  
  // 🆕 负责理事信息
  "responsibleOfficer": {
    "memberId": "member_123",
    "name": "张三",
    "position": "President",
    "email": "zhangsan@jcikl.cc",
    "phone": "+60123456789"
  },
  
  "committeeMembers": [
    {
      "id": "member_123",
      "name": "张三",
      "position": "会长",
      "email": "zhangsan@jcikl.cc",
      "canEditEvent": true,
      "canApproveTickets": true
    },
    {
      "id": "member_456",
      "name": "李四",
      "position": "活动主席",
      "email": "lisi@jcikl.cc",
      "canEditEvent": true,
      "canApproveTickets": false
    }
  ],
  
  "pricing": {
    "regularPrice": 150,
    "memberPrice": 100,
    "alumniPrice": 120,
    "earlyBirdPrice": 80,
    "committeePrice": 0
  },
  
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

## 🎯 负责理事职位映射

### 职位常量定义
```typescript
export const RESPONSIBLE_OFFICER_POSITION_OPTIONS: SelectOption[] = [
  { label: '会长', value: 'President' },
  { label: '副会长', value: 'Vice President' },
  { label: '秘书长', value: 'Secretary' },
  { label: '财政', value: 'Treasurer' },
  { label: '理事', value: 'Director' },
];
```

### 职位优先级
1. **President** (会长) - 最高优先级
2. **Vice President** (副会长) - 次高优先级
3. **Secretary** (秘书长) - 中等优先级
4. **Treasurer** (财政) - 中等优先级
5. **Director** (理事) - 基础优先级

## 🔧 使用场景

### 1. 活动创建时设置负责理事
```typescript
const createEvent = async (eventData: EventFormData) => {
  const event = {
    ...eventData,
    responsibleOfficer: {
      memberId: "member_123",
      name: "张三",
      position: "President",
      email: "zhangsan@jcikl.cc",
      phone: "+60123456789"
    }
  };
  
  await addDoc(collection(db, 'projects'), event);
};
```

### 2. 从委员会成员自动识别负责理事
```typescript
const identifyResponsibleOfficer = (committeeMembers: CommitteeMember[]) => {
  const positionPriority = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Director'];
  
  for (const position of positionPriority) {
    const member = committeeMembers.find(m => 
      m.position.includes(position) || 
      m.position.toLowerCase().includes(position.toLowerCase())
    );
    if (member) {
      return {
        memberId: member.id,
        name: member.name,
        position: position,
        email: member.email,
        phone: member.contact
      };
    }
  }
  
  return null;
};
```

### 3. 按负责理事分组活动
```typescript
const groupEventsByResponsibleOfficer = (events: Event[]) => {
  const grouped = events.reduce((acc, event) => {
    const officerName = event.responsibleOfficer?.name || '未指定';
    if (!acc[officerName]) {
      acc[officerName] = [];
    }
    acc[officerName].push(event);
    return acc;
  }, {} as Record<string, Event[]>);
  
  // 按活动日期排序（旧到新）
  Object.keys(grouped).forEach(officerName => {
    grouped[officerName].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  });
  
  return grouped;
};
```

## 📋 迁移策略

### 1. 现有活动数据迁移
```typescript
const migrateExistingEvents = async () => {
  const eventsSnapshot = await getDocs(collection(db, 'projects'));
  
  for (const doc of eventsSnapshot.docs) {
    const eventData = doc.data() as Event;
    
    if (!eventData.responsibleOfficer && eventData.committeeMembers) {
      const responsibleOfficer = identifyResponsibleOfficer(eventData.committeeMembers);
      
      if (responsibleOfficer) {
        await updateDoc(doc.ref, {
          responsibleOfficer: responsibleOfficer
        });
      }
    }
  }
};
```

### 2. 表单更新
- 在活动创建/编辑表单中添加负责理事选择
- 提供从委员会成员自动识别的功能
- 支持手动指定负责理事

## 🎨 UI 展示示例

### 活动列表显示
```
📅 2025 JCI KL Mid Year Awards Dinner
👑 负责理事: 张三 (会长)
📅 活动日期: 2025-08-08
💰 预算收入: RM 15,000
```

### 树形视图分组
```
📈 收入 Incomes
└── 📅 活动财务 (按负责理事分组)
    ├── 👑 张三负责的活动 (2个)
    │   ├── 🎯 2025 JCI KL Mid Year Awards Dinner (2025-08-08)
    │   └── 🎯 2025 JCI KL Annual Conference (2025-03-15)
    ├── 👑 李四负责的活动 (1个)
    │   └── 🎯 2025 JCI KL Training Workshop (2025-05-20)
    └── 👑 王五负责的活动 (1个)
        └── 🎯 2025 JCI KL Fundraising Event (2025-04-25)
```

## ✅ 业务价值

1. **责任明确** - 每个活动都有明确的负责理事
2. **管理便利** - 理事可以查看自己负责的所有活动
3. **财务透明** - 按负责理事分组显示活动财务
4. **数据完整** - 活动数据更加完整和结构化
5. **报告生成** - 便于生成按负责理事的财务报告
