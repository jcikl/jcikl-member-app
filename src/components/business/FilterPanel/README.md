# FilterPanel 组件

高级筛选面板组件 - 支持多条件组合筛选、预设保存/加载、折叠展开等功能

## ✨ 功能特性

- ✅ 多种字段类型支持（文本、数字、日期、选择器等）
- ✅ 动态字段配置和分组
- ✅ 筛选预设保存和加载（localStorage）
- ✅ 快速搜索功能
- ✅ 折叠/展开模式
- ✅ 响应式布局（移动端友好）
- ✅ 实时验证
- ✅ 全局配置集成
- ✅ TypeScript 严格类型

## 📦 安装使用

```typescript
import { FilterPanel } from '@/components';
import type { FilterField } from '@/components';
```

## 🎯 基础用法

### 示例 1：会员列表筛选

```typescript
import React from 'react';
import { FilterPanel } from '@/components';
import type { FilterField } from '@/components';

const MemberListPage: React.FC = () => {
  const filterFields: FilterField[] = [
    {
      name: 'name',
      label: '姓名',
      type: 'text',
      placeholder: '请输入姓名',
      group: '基本信息',
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'email',
      placeholder: '请输入邮箱',
      group: '基本信息',
    },
    {
      name: 'memberId',
      label: '会员编号',
      type: 'text',
      placeholder: '请输入会员编号',
      group: '基本信息',
    },
    {
      name: 'category',
      label: '会员类别',
      type: 'select',
      group: '会员详情',
      options: [
        { label: '正式会员', value: 'official' },
        { label: '准会员', value: 'associate' },
        { label: '荣誉会员', value: 'honorary' },
        { label: '访问会员', value: 'visiting' },
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      group: '会员详情',
      options: [
        { label: '活跃', value: 'active' },
        { label: '未激活', value: 'inactive' },
        { label: '已停用', value: 'suspended' },
      ],
    },
    {
      name: 'joinDateRange',
      label: '入会日期',
      type: 'dateRange',
      group: '会员详情',
    },
    {
      name: 'ageRange',
      label: '年龄范围',
      type: 'numberRange',
      group: '活动情况',
      validation: {
        min: 18,
        max: 100,
      },
    },
  ];

  const handleFilter = (values: Record<string, any>) => {
    console.log('筛选条件:', values);
    // 调用 API 或更新列表
  };

  const handleReset = () => {
    console.log('重置筛选');
    // 重置列表数据
  };

  return (
    <div>
      <FilterPanel
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
        storageKey="member-filter-presets"
        collapsible={true}
        defaultCollapsed={false}
        showPresets={true}
        showSearch={true}
        searchPlaceholder="搜索会员姓名、邮箱或编号..."
      />
      
      {/* 您的数据表格 */}
    </div>
  );
};
```

### 示例 2：交易记录筛选

```typescript
const transactionFilterFields: FilterField[] = [
  {
    name: 'transactionNumber',
    label: '交易编号',
    type: 'text',
    group: '交易信息',
  },
  {
    name: 'type',
    label: '交易类型',
    type: 'select',
    group: '交易信息',
    options: [
      { label: '收入', value: 'income' },
      { label: '支出', value: 'expense' },
      { label: '转账', value: 'transfer' },
    ],
  },
  {
    name: 'status',
    label: '状态',
    type: 'multiSelect',
    group: '交易信息',
    options: [
      { label: '待审批', value: 'pending' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' },
    ],
  },
  {
    name: 'amountRange',
    label: '金额范围',
    type: 'numberRange',
    group: '金额信息',
    validation: {
      min: 0,
      max: 1000000,
    },
  },
  {
    name: 'dateRange',
    label: '交易日期',
    type: 'dateRange',
    group: '时间信息',
  },
  {
    name: 'bankAccount',
    label: '银行账户',
    type: 'select',
    group: '账户信息',
    options: [
      { label: 'CIMB - 1234', value: 'cimb-1234' },
      { label: 'Maybank - 5678', value: 'maybank-5678' },
    ],
  },
];

<FilterPanel
  fields={transactionFilterFields}
  onFilter={handleFilter}
  storageKey="transaction-filter-presets"
  defaultValues={{
    status: ['pending'],
    dateRange: [new Date(), new Date()],
  }}
/>
```

### 示例 3：简化版（无预设功能）

```typescript
<FilterPanel
  fields={simpleFilterFields}
  onFilter={handleFilter}
  collapsible={false}
  showPresets={false}
  showSearch={false}
/>
```

## 📋 API 参数

### FilterPanelProps

| 参数 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| `fields` | `FilterField[]` | - | ✅ | 筛选字段配置 |
| `onFilter` | `(values) => void` | - | ✅ | 应用筛选回调 |
| `onReset` | `() => void` | - | ❌ | 重置筛选回调 |
| `defaultValues` | `Record<string, any>` | `{}` | ❌ | 默认筛选值 |
| `storageKey` | `string` | `'filter-presets'` | ❌ | localStorage 键名 |
| `collapsible` | `boolean` | `true` | ❌ | 是否可折叠 |
| `defaultCollapsed` | `boolean` | `false` | ❌ | 默认是否折叠 |
| `loading` | `boolean` | `false` | ❌ | 加载状态 |
| `showPresets` | `boolean` | `true` | ❌ | 显示预设功能 |
| `showSearch` | `boolean` | `true` | ❌ | 显示快速搜索 |
| `searchPlaceholder` | `string` | `'快速搜索...'` | ❌ | 搜索框占位符 |
| `className` | `string` | `''` | ❌ | 自定义 CSS 类 |

### FilterField

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 字段名（唯一标识） |
| `label` | `string` | ✅ | 字段标签 |
| `type` | `FilterFieldType` | ✅ | 字段类型 |
| `placeholder` | `string` | ❌ | 占位符 |
| `options` | `FilterOption[]` | ❌ | 选项（select/multiSelect） |
| `required` | `boolean` | ❌ | 是否必填 |
| `defaultValue` | `any` | ❌ | 默认值 |
| `disabled` | `boolean` | ❌ | 是否禁用 |
| `hidden` | `boolean` | ❌ | 是否隐藏 |
| `group` | `string` | ❌ | 分组名称 |
| `validation` | `object` | ❌ | 验证规则 |

### FilterFieldType

```typescript
type FilterFieldType =
  | 'text'        // 文本输入
  | 'email'       // 邮箱输入
  | 'number'      // 数字输入
  | 'select'      // 单选下拉
  | 'multiSelect' // 多选下拉
  | 'date'        // 日期选择
  | 'dateRange'   // 日期范围
  | 'numberRange' // 数字范围
```

## 🎨 样式定制

### CSS 类名

```css
.filter-panel                    /* 主容器 */
.filter-panel--collapsible       /* 可折叠样式 */
.filter-panel__header            /* 头部 */
.filter-panel__content           /* 内容区域 */
.filter-panel__search            /* 搜索框 */
.filter-panel__group             /* 字段分组 */
.filter-panel__group-title       /* 分组标题 */
.filter-panel__actions           /* 操作栏 */
.filter-panel__presets           /* 预设操作 */
.filter-panel__main-actions      /* 主要操作 */
```

### 自定义样式示例

```css
/* 自定义主题色 */
.my-custom-filter .filter-panel__icon {
  color: #ff4d4f;
}

.my-custom-filter .filter-panel__group-title {
  border-bottom-color: #ff4d4f;
}

/* 调整间距 */
.my-custom-filter .filter-panel__content {
  padding: 32px;
}
```

## 🔧 高级用法

### 1. 条件验证

```typescript
{
  name: 'phone',
  label: '电话',
  type: 'text',
  validation: {
    pattern: /^(\+?6?01)[0-46-9]-*[0-9]{7,8}$/,
    message: '请输入有效的马来西亚电话号码',
  },
}
```

### 2. 动态字段选项

```typescript
const [categoryOptions, setCategoryOptions] = useState([]);

useEffect(() => {
  // 从 API 获取选项
  fetchCategories().then(data => {
    setCategoryOptions(data.map(item => ({
      label: item.name,
      value: item.id,
    })));
  });
}, []);

const fields: FilterField[] = [
  {
    name: 'category',
    label: '分类',
    type: 'select',
    options: categoryOptions, // 动态选项
  },
];
```

### 3. 多个筛选面板

```typescript
// 为不同的列表使用不同的 storageKey
<FilterPanel
  fields={memberFields}
  onFilter={handleMemberFilter}
  storageKey="member-filter-presets" // 会员筛选预设
/>

<FilterPanel
  fields={transactionFields}
  onFilter={handleTransactionFilter}
  storageKey="transaction-filter-presets" // 交易筛选预设
/>
```

### 4. 与数据表格集成

```typescript
const [filterValues, setFilterValues] = useState({});
const [loading, setLoading] = useState(false);

const handleFilter = async (values: Record<string, any>) => {
  setFilterValues(values);
  setLoading(true);
  
  try {
    // 调用 API 获取筛选后的数据
    const result = await memberService.getMembers(values);
    setData(result.data);
  } catch (error) {
    message.error('加载数据失败');
  } finally {
    setLoading(false);
  }
};

return (
  <>
    <FilterPanel
      fields={filterFields}
      onFilter={handleFilter}
      loading={loading}
    />
    
    <DataTable
      dataSource={data}
      loading={loading}
      // ...其他配置
    />
  </>
);
```

## 📱 响应式布局

组件已内置响应式支持：

- **桌面（>1024px）**: 3列布局
- **平板（768-1024px）**: 2列布局
- **手机（<768px）**: 1列布局，操作按钮垂直排列

## ♿ 无障碍支持

- ✅ 键盘导航支持
- ✅ ARIA 标签
- ✅ 屏幕阅读器友好
- ✅ 焦点管理

## 🚀 性能优化

- ✅ useMemo 优化字段分组计算
- ✅ 防抖输入（快速搜索）
- ✅ 懒加载预设数据
- ✅ 条件渲染减少 DOM 节点

## 🧪 测试建议

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from '@/components';

describe('FilterPanel', () => {
  it('应该正确渲染所有字段', () => {
    const fields = [
      { name: 'name', label: '姓名', type: 'text' as const },
      { name: 'status', label: '状态', type: 'select' as const, options: [] },
    ];
    
    render(<FilterPanel fields={fields} onFilter={() => {}} />);
    
    expect(screen.getByLabelText('姓名')).toBeInTheDocument();
    expect(screen.getByLabelText('状态')).toBeInTheDocument();
  });

  it('应该在点击应用按钮时调用 onFilter', async () => {
    const onFilter = jest.fn();
    const fields = [{ name: 'name', label: '姓名', type: 'text' as const }];
    
    render(<FilterPanel fields={fields} onFilter={onFilter} />);
    
    fireEvent.click(screen.getByText('应用筛选'));
    
    expect(onFilter).toHaveBeenCalled();
  });
});
```

## 📝 注意事项

1. **字段名唯一性**: 每个字段的 `name` 必须唯一
2. **选项字段**: `select` 和 `multiSelect` 类型必须提供 `options`
3. **localStorage**: 确保 `storageKey` 在应用中唯一，避免冲突
4. **日期格式**: 使用全局日期服务统一格式化
5. **验证规则**: 复杂验证应在服务端再次验证

## 🔗 相关组件

- `DataTable` - 数据表格组件
- `SearchForm` - 简单搜索表单
- `FormBuilder` - 动态表单构建器

## 📄 License

MIT © JCI KL Membership Management System

