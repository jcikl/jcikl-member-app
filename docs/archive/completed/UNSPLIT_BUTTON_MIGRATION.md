# 撤销拆分按钮迁移功能

## 功能概述
将"撤销拆分"按钮从交易管理页面的操作列迁移到"重新拆分交易"弹窗内部，使拆分相关操作更加集中和直观。

## 改进动机

### 之前的设计问题
1. **操作分散**: "拆分"、"重新拆分"、"撤销拆分"按钮分散在不同位置
2. **列宽占用**: 操作列需要容纳多个按钮，占用空间
3. **逻辑不清晰**: 撤销拆分作为独立按钮，与拆分操作关联性不明显
4. **用户困惑**: 用户需要在列表中寻找撤销按钮

### 新设计优势
1. **操作集中**: 所有拆分相关操作（拆分、重新拆分、撤销拆分）都在同一个弹窗
2. **空间节省**: 操作列减少一个按钮，界面更简洁
3. **逻辑清晰**: 在拆分弹窗中提供撤销选项，更符合用户心智模型
4. **便捷操作**: 打开弹窗后可以直接选择"撤销拆分"或"重新拆分"

## UI变化对比

### 修改前
#### 交易管理页面操作列
```
[未拆分交易]
操作: [查看] [批准] [拆分] [编辑] [删除]

[已拆分交易]
操作: [查看] [重新拆分] [撤销] [编辑] [删除]
       ↑ 5个按钮，需要更宽的列宽
```

#### 拆分弹窗Footer
```
┌────────────────────────────────────┐
│               [取消] [确认拆分]     │
└────────────────────────────────────┘
```

### 修改后
#### 交易管理页面操作列
```
[未拆分交易]
操作: [查看] [批准] [拆分] [编辑] [删除]

[已拆分交易]
操作: [查看] [重新拆分] [编辑] [删除]
       ↑ 减少1个按钮，列宽更窄
       
Tooltip: "重新拆分 / 撤销拆分"
```

#### 拆分弹窗Footer（已拆分时）
```
┌────────────────────────────────────┐
│ [撤销拆分]      [取消] [确认重新拆分]│
└────────────────────────────────────┘
  ↑左侧红色按钮      ↑右侧标准按钮
```

## 实现细节

### 1. SplitTransactionModal组件改进

#### 新增Props
```typescript
interface SplitTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onOk: (splits: SplitItem[]) => Promise<void>;
  onCancel: () => void;
  onUnsplit?: (transactionId: string) => Promise<void>; // 🆕 撤销拆分回调
}
```

#### 新增处理函数
```typescript
const handleUnsplit = async () => {
  if (!transaction || !onUnsplit) return;
  
  Modal.confirm({
    title: '确认撤销拆分',
    content: '撤销后将删除所有子交易，恢复为单笔交易。此操作无法撤销，确定继续吗？',
    okText: '确认撤销',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        setLoading(true);
        await onUnsplit(transaction.id);
        message.success('已撤销拆分');
        handleCancel(); // 关闭弹窗
      } catch (error: any) {
        message.error(error.message || '撤销失败');
      } finally {
        setLoading(false);
      }
    },
  });
};
```

#### 自定义Footer
```typescript
footer={
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    {/* 左侧：撤销拆分按钮（仅在已拆分时显示） */}
    <div>
      {transaction.isSplit && onUnsplit && (
        <Button 
          danger 
          onClick={handleUnsplit}
          disabled={loading || loadingExistingSplits}
        >
          撤销拆分
        </Button>
      )}
    </div>
    {/* 右侧：标准操作按钮 */}
    <Space>
      <Button onClick={handleCancel} disabled={loading}>
        取消
      </Button>
      <Button 
        type="primary" 
        onClick={handleOk}
        loading={loading}
        disabled={!isValid || loadingExistingSplits}
      >
        {transaction.isSplit ? "确认重新拆分" : "确认拆分"}
      </Button>
    </Space>
  </div>
}
```

### 2. TransactionManagementPage改进

#### 传递onUnsplit回调
```typescript
<SplitTransactionModal
  visible={splitModalVisible}
  transaction={splittingTransaction}
  onOk={handleSplitOk}
  onCancel={() => {
    setSplitModalVisible(false);
    setSplittingTransaction(null);
  }}
  onUnsplit={async (transactionId: string) => {
    await unsplitTransaction(transactionId, user!.id);
    setSplitModalVisible(false);
    setSplittingTransaction(null);
    clearBalanceCache();
    await loadTransactions();
    await updateAccountTransactionCounts();
  }}
/>
```

#### 移除操作列的撤销按钮
```typescript
// 修改前
{isParent && (
  <Tooltip title="撤销拆分">
    <Button onClick={() => handleUnsplit(record.id)}>
      撤销
    </Button>
  </Tooltip>
)}

// 修改后 - 完全移除此代码块
```

#### 更新Tooltip文本
```typescript
<Tooltip title={isParent ? "重新拆分 / 撤销拆分" : "拆分交易"}>
  <Button onClick={() => handleSplit(record)}>
    {isParent ? '重新拆分' : '拆分'}
  </Button>
</Tooltip>
```

#### 删除handleUnsplit函数
```typescript
// 🗑️ 已移除handleUnsplit函数，撤销拆分功能已迁移到SplitTransactionModal内部
```

## 用户体验改进

### 操作流程对比

#### 之前的流程
```
查看已拆分交易
    ↓
在操作列找到"撤销"按钮（红色）
    ↓
点击"撤销"
    ↓
确认对话框
    ↓
撤销完成
```

#### 现在的流程
```
查看已拆分交易
    ↓
点击"重新拆分"按钮（橙色）
    ↓
打开拆分弹窗
    ↓
查看现有拆分数据
    ↓
左下角看到"撤销拆分"按钮（红色）
    ↓
点击"撤销拆分"
    ↓
确认对话框
    ↓
撤销完成，弹窗自动关闭
```

### 优势分析

1. **上下文感知**
   - 在拆分弹窗中提供撤销选项，用户可以看到当前拆分状态再决定
   - 避免误操作，因为用户可以看到要撤销的内容

2. **操作灵活性**
   - 打开弹窗后有两个选择：修改拆分或完全撤销
   - 不需要先撤销再重新拆分的繁琐步骤

3. **界面简洁性**
   - 操作列减少一个按钮
   - 视觉更清爽，列宽可以更窄

4. **逻辑一致性**
   - 所有拆分相关操作集中在一处
   - 符合"相关功能组合在一起"的设计原则

## 按钮位置和样式

### Footer布局
```
┌──────────────────────────────────────────────────────┐
│ [撤销拆分]                        [取消] [确认重新拆分] │
│    ↑                                 ↑                │
│ 左对齐，红色danger按钮           右对齐，标准按钮组      │
└──────────────────────────────────────────────────────┘
```

### 按钮状态
- **撤销拆分按钮**:
  - 类型: `danger`（红色）
  - 位置: 左下角
  - 显示条件: `transaction.isSplit && onUnsplit`
  - 禁用条件: `loading || loadingExistingSplits`

- **取消按钮**:
  - 类型: `default`
  - 位置: 右下角左侧
  - 禁用条件: `loading`

- **确认按钮**:
  - 类型: `primary`（蓝色）
  - 位置: 右下角最右侧
  - 文本: 动态（"确认拆分" / "确认重新拆分"）
  - 禁用条件: `!isValid || loadingExistingSplits`
  - Loading状态: `loading`

## 确认对话框

### 撤销拆分确认框
```typescript
Modal.confirm({
  title: '确认撤销拆分',
  content: '撤销后将删除所有子交易，恢复为单笔交易。此操作无法撤销，确定继续吗？',
  okText: '确认撤销',
  cancelText: '取消',
  okButtonProps: { danger: true },
  onOk: async () => {
    // 执行撤销逻辑
  },
});
```

### 安全机制
1. **二次确认**: 点击"撤销拆分"后需要确认
2. **明确提示**: 说明撤销后的结果
3. **不可撤销警告**: 提醒用户操作不可逆
4. **危险按钮**: 使用红色danger样式强调风险

## 代码修改统计

### 修改文件
1. **SplitTransactionModal.tsx**
   - 新增: `onUnsplit` prop
   - 新增: `handleUnsplit` 函数
   - 修改: `footer` 为自定义布局
   - 新增: 左侧撤销按钮

2. **TransactionManagementPage/index.tsx**
   - 新增: `onUnsplit` 回调传递
   - 删除: 操作列的撤销按钮代码块
   - 删除: `handleUnsplit` 函数
   - 修改: Tooltip文本

### 代码行数
- 新增: ~45行
- 删除: ~35行
- 净增加: ~10行

## 测试建议

### 功能测试
1. ✅ 未拆分交易：弹窗不显示"撤销拆分"按钮
2. ✅ 已拆分交易：弹窗左下角显示"撤销拆分"按钮
3. ✅ 点击"撤销拆分"显示确认对话框
4. ✅ 确认撤销后成功删除所有子交易
5. ✅ 撤销成功后弹窗自动关闭
6. ✅ 撤销成功显示成功消息
7. ✅ 取消确认对话框不执行撤销

### UI测试
1. ✅ 操作列不再显示"撤销"按钮
2. ✅ "重新拆分"按钮的Tooltip显示"重新拆分 / 撤销拆分"
3. ✅ Footer布局正确（左右分布）
4. ✅ 按钮样式正确（红色danger）
5. ✅ 按钮禁用状态正确

### 边界测试
1. ⚠️ 加载现有拆分时禁用撤销按钮
2. ⚠️ 执行撤销时禁用所有按钮
3. ⚠️ 撤销失败显示错误消息
4. ⚠️ 网络错误时的处理

## 兼容性

### 向后兼容
- ✅ `onUnsplit` prop 为可选，不影响其他使用SplitTransactionModal的地方
- ✅ 如果不传递`onUnsplit`，按钮不显示
- ✅ 现有的拆分、重新拆分功能完全不受影响

### 其他页面
如果其他页面也使用SplitTransactionModal：
- 不传递`onUnsplit`：功能正常，只是不显示撤销按钮
- 传递`onUnsplit`：获得完整功能

## 未来扩展

### 可能的改进
1. **批量撤销**: 支持批量撤销多条已拆分交易
2. **撤销确认简化**: 提供"不再提示"选项
3. **撤销原因**: 添加撤销原因输入框
4. **操作历史**: 记录撤销操作到审计日志

## 总结

此次改进将"撤销拆分"功能从操作列迁移到拆分弹窗内部，实现了：
- ✅ 操作更集中（所有拆分操作在一个弹窗）
- ✅ 界面更简洁（操作列减少一个按钮）
- ✅ 逻辑更清晰（相关功能组合在一起）
- ✅ 体验更友好（可以看到拆分内容再决定是否撤销）

这是一个符合用户体验设计原则的改进，使功能更加内聚和易用。

