# 编辑已拆分交易功能

## 功能概述
允许编辑（重新拆分）已经拆分过的银行交易记录。系统会自动加载现有的拆分数据，用户可以修改后重新保存。

## 问题背景
之前的实现中，已拆分的交易无法再次拆分（编辑拆分）。用户只能选择"撤销拆分"后重新拆分，导致操作繁琐且容易出错。

## 解决方案

### 1. UI层改进
#### 交易管理页面
- **修改前**: 已拆分的交易不显示"拆分"按钮，只显示"撤销"按钮
- **修改后**: 已拆分的交易显示"重新拆分"按钮，同时保留"撤销"按钮

#### 拆分弹窗
- **新增**: 自动检测交易是否已拆分
- **新增**: 自动加载现有拆分数据到表单
- **新增**: 显示"重新拆分"警告提示
- **新增**: 加载状态指示器

### 2. 数据加载逻辑
```typescript
// 当打开拆分弹窗时：
1. 检查 transaction.isSplit 是否为 true
2. 如果已拆分，查询所有子交易
3. 将子交易数据转换为表单拆分项
4. 排除"未分配金额"的虚拟交易
5. 预填充到表单中
```

### 3. 保存逻辑
服务层已支持重新拆分（无需修改）：
- 检测到交易已拆分时，先删除所有现有子交易
- 然后创建新的拆分记录
- 保持父交易状态一致

## 功能特性

### ✅ 已实现功能
1. **重新拆分按钮**
   - 位置：交易管理页面操作列
   - 条件：已拆分的父交易显示"重新拆分"，未拆分显示"拆分"
   - 文本动态：`{isParent ? '重新拆分' : '拆分'}`

2. **自动加载现有数据**
   - 打开弹窗时自动查询子交易
   - 转换子交易为拆分项格式
   - 排除"未分配金额"的虚拟交易
   - 显示加载进度提示

3. **警告提示**
   - 黄色警告框提示用户
   - 说明重新拆分将删除现有子交易
   - 已加载现有数据的提示

4. **标题和按钮文本**
   - Modal标题：重新拆分交易 / 拆分交易
   - 确认按钮：确认重新拆分 / 确认拆分

### 🎯 用户体验优化
1. **无缝编辑体验**
   - 打开弹窗即可看到现有拆分数据
   - 无需手动撤销再重新输入
   - 支持增删改拆分项

2. **数据保护**
   - 警告提示避免误操作
   - 加载失败时显示错误提示
   - 保持原交易金额不变

3. **操作反馈**
   - 加载时显示Spin组件
   - 加载完成显示信息提示
   - 保存成功显示成功消息

## 代码修改

### 文件1: TransactionManagementPage/index.tsx
#### 修改内容
```typescript
// 修改前
{!isChild && !isParent && !isVirtual && (
  <Button>拆分</Button>
)}

// 修改后
{!isChild && !isVirtual && (
  <Tooltip title={isParent ? "重新拆分" : "拆分交易"}>
    <Button>{isParent ? '重新拆分' : '拆分'}</Button>
  </Tooltip>
)}
```

### 文件2: SplitTransactionModal.tsx
#### 新增导入
```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { Spin } from 'antd';
```

#### 新增状态
```typescript
const [loadingExistingSplits, setLoadingExistingSplits] = useState(false);
```

#### 新增加载逻辑
```typescript
useEffect(() => {
  const loadExistingSplits = async () => {
    if (visible && transaction && transaction.isSplit) {
      setLoadingExistingSplits(true);
      try {
        // 查询现有子交易
        const q = query(
          collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
          where('parentTransactionId', '==', transaction.id)
        );
        const snapshot = await getDocs(q);
        
        // 转换为拆分项（排除未分配金额）
        const existingSplits = snapshot.docs
          .map(doc => doc.data() as Transaction)
          .filter(child => !child.notes?.includes('未分配金额'))
          .map(child => ({
            amount: child.amount,
            category: child.category,
            notes: child.notes || child.mainDescription,
          }));
        
        if (existingSplits.length > 0) {
          setSplits(existingSplits);
          message.info(`已加载现有的 ${existingSplits.length} 笔拆分记录`);
        }
      } catch (error) {
        message.error('加载现有拆分数据失败');
      } finally {
        setLoadingExistingSplits(false);
      }
    }
  };
  
  loadExistingSplits();
}, [visible, transaction]);
```

## 使用场景

### 场景1: 修正拆分错误
**问题**: 用户发现之前的拆分金额或类别错误  
**操作**:
1. 点击交易的"重新拆分"按钮
2. 系统自动加载现有拆分数据
3. 修改错误的金额或类别
4. 点击"确认重新拆分"
5. 系统删除旧拆分，创建新拆分

### 场景2: 增加拆分项
**问题**: 需要将交易拆分为更多项  
**操作**:
1. 点击"重新拆分"
2. 现有拆分自动加载
3. 点击"添加拆分项"
4. 填写新拆分项信息
5. 确认保存

### 场景3: 减少拆分项
**问题**: 拆分项过多，需要合并  
**操作**:
1. 点击"重新拆分"
2. 删除不需要的拆分项
3. 调整剩余项金额
4. 确认保存

## 数据流程

### 重新拆分流程
```
用户点击"重新拆分"
    ↓
打开SplitTransactionModal
    ↓
检测transaction.isSplit=true
    ↓
显示Spin加载指示器
    ↓
查询子交易（parentTransactionId=xxx）
    ↓
过滤虚拟交易（未分配金额）
    ↓
转换为拆分项格式
    ↓
预填充到表单
    ↓
显示警告提示
    ↓
用户修改数据
    ↓
点击"确认重新拆分"
    ↓
调用splitTransaction服务
    ↓
服务层删除现有子交易
    ↓
服务层创建新子交易
    ↓
更新父交易状态
    ↓
刷新交易列表
```

## 技术细节

### 数据转换
```typescript
// 子交易 → 拆分项
const splitItem = {
  amount: childTransaction.amount,
  category: childTransaction.category,
  notes: childTransaction.notes || childTransaction.mainDescription,
};
```

### 过滤规则
```typescript
// 排除"未分配金额"的虚拟交易
if (!childData.notes?.includes('未分配金额')) {
  existingSplits.push({...});
}
```

### 加载状态管理
```typescript
// 加载中：禁用确认按钮
okButtonProps={{ disabled: !isValid || loadingExistingSplits }}

// 加载中：显示Spin组件
{loadingExistingSplits && (
  <Spin tip="加载现有拆分数据..." />
)}
```

## 注意事项

### ⚠️ 重要提醒
1. **数据覆盖**: 重新拆分会**完全替换**现有的所有子交易
2. **不可撤销**: 确认后无法恢复旧的拆分数据（除非再次重新拆分）
3. **金额验证**: 新拆分总额不能超过父交易金额
4. **类别必填**: 每个拆分项必须选择类别

### 💡 最佳实践
1. **检查数据**: 重新拆分前仔细检查加载的数据是否正确
2. **备份金额**: 记住原始拆分金额，以便核对
3. **使用备注**: 在拆分项备注中说明修改原因
4. **测试环境**: 重要交易建议先在测试环境验证

## 测试建议

### 功能测试
1. ✅ 已拆分交易显示"重新拆分"按钮
2. ✅ 点击"重新拆分"打开弹窗并加载现有数据
3. ✅ 修改拆分项并保存
4. ✅ 增加拆分项并保存
5. ✅ 减少拆分项并保存
6. ✅ 验证新拆分覆盖旧拆分

### 边界测试
1. ⚠️ 子交易数据加载失败
2. ⚠️ 没有子交易的已拆分交易
3. ⚠️ 只有"未分配金额"的拆分
4. ⚠️ 网络延迟时的加载状态

### 数据验证
1. ✅ 拆分总额不超过父交易金额
2. ✅ 每个拆分项都有类别
3. ✅ 每个拆分项金额>0
4. ✅ 旧子交易被正确删除
5. ✅ 新子交易被正确创建

## 已知限制

1. **不支持批量重新拆分**: 只能单条交易操作
2. **不保留历史**: 旧拆分数据被完全删除，无历史记录
3. **不支持部分修改**: 必须重新拆分所有项（即使只改一项）

## 未来改进

### 可能的功能增强
1. **拆分历史记录**: 保存每次拆分的历史版本
2. **批量重新拆分**: 支持多条交易同时重新拆分
3. **拆分模板**: 保存常用拆分规则为模板
4. **智能建议**: 基于历史数据推荐拆分方案
5. **审计日志**: 记录所有拆分修改操作

## 总结
此功能极大简化了编辑已拆分交易的流程，用户无需先撤销再重新拆分，直接修改现有数据即可。自动加载和警告提示确保了操作的便捷性和安全性。

