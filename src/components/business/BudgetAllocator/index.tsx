import React, { useState, useMemo } from 'react';
import { Card, Tree, InputNumber, Progress, Button, Space, Statistic, Row, Col, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { DownloadOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';

// 类型定义
import type { BudgetAllocatorProps, BudgetCategory, AllocationData } from './types';

// 样式
import './styles.css';

/**
 * BudgetAllocator Component
 * 预算分配器组件
 */
export const BudgetAllocator: React.FC<BudgetAllocatorProps> = ({
  categories,
  totalBudget,
  onAllocate,
  currency = 'RM',
  editable = true,
  loading = false,
  onExport,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);
  const [allocations, setAllocations] = useState<Map<string, number>>(
    new Map(categories.map(cat => [cat.id, cat.allocated]))
  );

  /**
   * 计算总分配金额
   */
  const totalAllocated = useMemo(() => {
    return Array.from(allocations.values()).reduce((sum, val) => sum + val, 0);
  }, [allocations]);

  /**
   * 计算剩余预算
   */
  const remainingBudget = totalBudget - totalAllocated;

  /**
   * 转换为树形数据
   */
  const treeData = useMemo(() => {
    const buildTree = (cats: BudgetCategory[]): DataNode[] => {
      return cats.map(cat => ({
        key: cat.id,
        title: cat.name,
        children: cat.children ? buildTree(cat.children) : undefined,
      }));
    };
    return buildTree(categories);
  }, [categories]);

  /**
   * 处理金额变更
   */
  const handleAmountChange = (categoryId: string, amount: number) => {
    const newAllocations = new Map(allocations);
    newAllocations.set(categoryId, amount || 0);
    setAllocations(newAllocations);
  };

  /**
   * 保存分配
   */
  const handleSave = async () => {
    if (totalAllocated > totalBudget) {
      message.error('分配金额超出总预算！');
      return;
    }

    const allocationData: AllocationData[] = Array.from(allocations.entries()).map(
      ([categoryId, amount]) => ({ categoryId, amount })
    );

    try {
      await onAllocate(allocationData);
      message.success('预算分配已保存');
    } catch (error) {
      message.error('保存失败');
    }
  };

  /**
   * 获取进度条颜色
   */
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return '#ff4d4f';
    if (percent >= 70) return '#faad14';
    return '#52c41a';
  };

  const progressPercent = (totalAllocated / totalBudget) * 100;

  return (
    <div className={`budget-allocator ${className}`}>
      {/* 顶部统计 */}
      <Card className="budget-allocator__summary">
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title="总预算"
              value={totalBudget}
              prefix={currency}
              valueStyle={{ color: '#262626' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="已分配"
              value={totalAllocated}
              prefix={currency}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="剩余预算"
              value={remainingBudget}
              prefix={currency}
              valueStyle={{ color: remainingBudget >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Col>
        </Row>
        <Progress
          percent={progressPercent}
          strokeColor={getProgressColor(progressPercent)}
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* 主内容区 */}
      <Row gutter={24} className="budget-allocator__content">
        {/* 左侧：分类树 */}
        <Col xs={24} lg={8}>
          <Card title="预算分类" className="budget-allocator__tree">
            <Tree
              treeData={treeData}
              onSelect={(keys) => {
                const cat = categories.find(c => c.id === keys[0]);
                setSelectedCategory(cat || null);
              }}
              defaultExpandAll
            />
          </Card>
        </Col>

        {/* 右侧：分配详情 */}
        <Col xs={24} lg={16}>
          {selectedCategory ? (
            <Card title={selectedCategory.name} className="budget-allocator__detail">
              <div className="budget-allocator__allocation">
                <label>分配金额</label>
                <InputNumber
                  value={allocations.get(selectedCategory.id) || 0}
                  onChange={(val) => handleAmountChange(selectedCategory.id, val || 0)}
                  prefix={currency}
                  style={{ width: '100%' }}
                  disabled={!editable}
                  min={0}
                  max={totalBudget}
                />
                
                <Progress
                  percent={((allocations.get(selectedCategory.id) || 0) / totalBudget) * 100}
                  strokeColor={getProgressColor(((allocations.get(selectedCategory.id) || 0) / totalBudget) * 100)}
                  style={{ marginTop: 16 }}
                />

                <div className="budget-allocator__stats">
                  <div>
                    <span>已支出：</span>
                    <strong>{currency} {selectedCategory.spent.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>剩余：</span>
                    <strong>{currency} {((allocations.get(selectedCategory.id) || 0) - selectedCategory.spent).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="budget-allocator__placeholder">
              <p>请选择一个分类</p>
            </Card>
          )}
        </Col>
      </Row>

      {/* 操作按钮 */}
      <div className="budget-allocator__actions">
        <Space>
          {onExport && (
            <>
              <Button icon={<DownloadOutlined />} onClick={() => onExport('pdf')}>
                导出PDF
              </Button>
              <Button icon={<DownloadOutlined />} onClick={() => onExport('excel')}>
                导出Excel
              </Button>
            </>
          )}
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setAllocations(new Map())}>
            重置
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>
            保存分配
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default BudgetAllocator;

