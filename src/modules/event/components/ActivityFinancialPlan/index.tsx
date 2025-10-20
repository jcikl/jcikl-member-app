/**
 * Activity Financial Plan Component
 * 活动财务计划组件
 * 
 * 允许活动筹委自主管理活动财务预测（CRUD）
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Input,
  InputNumber,
  DatePicker,
  Select,
  message,
  Popconfirm,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  RiseOutlined,
  FallOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { getActiveIncomeCategories, getActiveExpenseCategories } from '@/modules/system/services/financialCategoryService';
import './ActivityFinancialPlan.css';

const { Option } = Select;
const { TextArea } = Input;

export interface FinancialPlanItem {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  remark?: string;
  amount: number;
  expectedDate: string;
  status: 'planned' | 'pending-approval' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

interface Props {
  accountId?: string;
  items: FinancialPlanItem[];
  loading?: boolean;
  onAdd: (item: Omit<FinancialPlanItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<FinancialPlanItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const ActivityFinancialPlan: React.FC<Props> = ({
  accountId: _accountId,
  items,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [quickAddCategory, setQuickAddCategory] = useState<{income?: string; expense?: string}>({});
  const [editedItems, setEditedItems] = useState<Map<string, Partial<FinancialPlanItem>>>(new Map());
  
  // 动态类别
  const [incomeCategories, setIncomeCategories] = useState<Array<{label: string; value: string}>>([]);
  const [expenseCategories, setExpenseCategories] = useState<Array<{label: string; value: string}>>([]);
  
  // 批量粘贴
  const [bulkPasteVisible, setBulkPasteVisible] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');

  const tableConfig = globalComponentService.getTableConfig();
  
  // 加载动态类别
  useEffect(() => {
    loadCategories();
  }, []);
  
  const loadCategories = async () => {
    try {
      const [income, expense] = await Promise.all([
        getActiveIncomeCategories(),
        getActiveExpenseCategories(),
      ]);
      setIncomeCategories(income);
      setExpenseCategories(expense);
    } catch (error) {
      message.error('加载类别失败');
      console.error(error);
    }
  };

  // 统计数据
  const incomeItems = items.filter(item => item.type === 'income');
  const expenseItems = items.filter(item => item.type === 'expense');
  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // 获取类别标签
  const getCategoryLabel = (type: 'income' | 'expense', value: string) => {
    const categories = type === 'income' ? incomeCategories : expenseCategories;
    const category = categories.find(cat => cat.value === value);
    return category?.label || value;
  };

  // 扩展数据类型：用于分组行
  interface GroupedRow extends Partial<FinancialPlanItem> {
    key: string;
    isTypeHeader?: boolean;
    isCategoryHeader?: boolean;
    typeLabel?: string;
    categoryLabel?: string;
    categoryTotal?: number;
    indentLevel?: number;
  }

  // 构建分组数据结构
  const buildGroupedData = (): GroupedRow[] => {
    const grouped: GroupedRow[] = [];
    
    // 收入组 - 始终显示
    grouped.push({
      key: 'income-header',
      isTypeHeader: true,
      typeLabel: 'Incomes',
      type: 'income',
      indentLevel: 0,
    });
    
    // 按类别分组
    const incomeByCategory = incomeItems.reduce((acc, item) => {
      const cat = item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, FinancialPlanItem[]>);
    
    // 只渲染有项目的类别
    Object.entries(incomeByCategory).forEach(([category, categoryItems]) => {
      const categoryTotal = categoryItems.reduce((sum, item) => sum + item.amount, 0);
      
      // 类别标题行
      grouped.push({
        key: `income-cat-${category}`,
        isCategoryHeader: true,
        type: 'income',
        category,
        categoryLabel: getCategoryLabel('income', category),
        categoryTotal,
        indentLevel: 1,
      });
      
      // 类别下的项目
      categoryItems.forEach(item => {
        grouped.push({
          ...item,
          key: item.id,
          indentLevel: 2,
        } as GroupedRow);
      });
    });
    
    // 支出组 - 始终显示
    grouped.push({
      key: 'expense-header',
      isTypeHeader: true,
      typeLabel: 'Expenses',
      type: 'expense',
      indentLevel: 0,
    });
    
    // 按类别分组
    const expenseByCategory = expenseItems.reduce((acc, item) => {
      const cat = item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, FinancialPlanItem[]>);
    
    // 只渲染有项目的类别
    Object.entries(expenseByCategory).forEach(([category, categoryItems]) => {
      const categoryTotal = categoryItems.reduce((sum, item) => sum + item.amount, 0);
      
      // 类别标题行
      grouped.push({
        key: `expense-cat-${category}`,
        isCategoryHeader: true,
        type: 'expense',
        category,
        categoryLabel: getCategoryLabel('expense', category),
        categoryTotal,
        indentLevel: 1,
      });
      
      // 类别下的项目
      categoryItems.forEach(item => {
        grouped.push({
          ...item,
          key: item.id,
          indentLevel: 2,
        } as GroupedRow);
      });
    });
    
    return grouped;
  };

  const groupedData = buildGroupedData();
  
  // 获取编辑的值（如果有编辑过）
  const getEditedValue = (id: string, field: keyof FinancialPlanItem) => {
    const edited = editedItems.get(id);
    return edited?.[field];
  };

  // 更新编辑的值
  const handleFieldChange = (id: string, field: keyof FinancialPlanItem, value: any) => {
    setEditedItems(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(id) || {};
      newMap.set(id, { ...existing, [field]: value });
      return newMap;
    });
  };
  
  // 批量粘贴解析
  const parseBulkPasteData = (text: string): Array<Partial<FinancialPlanItem>> => {
    const lines = text.trim().split('\n');
    const items: Array<Partial<FinancialPlanItem>> = [];
    
    lines.forEach(line => {
      const parts = line.split('\t').map(p => p.trim());
      
      if (parts.length >= 3) {
        items.push({
          description: parts[0],
          remark: parts[1] || '',
          amount: parseFloat(parts[2]) || 0,
          expectedDate: parts[3] || new Date().toISOString(),
        });
      }
    });
    
    return items;
  };
  
  // 批量粘贴提交
  const handleBulkPasteSubmit = async () => {
    try {
      const items = parseBulkPasteData(bulkPasteText);
      
      if (items.length === 0) {
        message.warning('没有有效的数据');
        return;
      }
      
      // 默认使用收入类型
      const defaultCategory = incomeCategories[0]?.value || 'other-income';
      
      for (const item of items) {
        await onAdd({
          type: 'income',
          category: defaultCategory,
          ...item,
          status: 'planned',
        } as any);
      }
      
      message.success(`成功导入 ${items.length} 条记录（默认为收入类型）`);
      setBulkPasteVisible(false);
      setBulkPasteText('');
      await onRefresh();
    } catch (error) {
      message.error('导入失败');
      console.error(error);
    }
  };

  // 保存所有编辑并退出编辑模式
  const handleSaveAndExitEdit = async () => {
    try {
      // 批量保存所有编辑的项目
      for (const [id, changes] of editedItems.entries()) {
        if (Object.keys(changes).length > 0) {
          await onUpdate(id, changes);
        }
      }
      
      if (editedItems.size > 0) {
        message.success(`成功保存 ${editedItems.size} 个项目的更改`);
      }
      
      // 退出编辑模式
      setEditMode(false);
      setEditedItems(new Map());
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 在类型下快速添加（仅需选择类别）
  const handleQuickAddInType = async (type: 'income' | 'expense', category: string) => {
    try {
      const itemData = {
        type: type,
        category: category,
        description: `新${type === 'income' ? '收入' : '支出'}项目`,
        remark: '',
        amount: 0,
        expectedDate: dayjs().toISOString(),
        status: 'planned' as const,
      };

      await onAdd(itemData as any);
      message.success('快速创建成功，请点击编辑完善信息');
      await onRefresh();
    } catch (error) {
      console.error('快速添加失败:', error);
      message.error('添加失败');
    }
  };

  // 在特定类别下添加项目（从类别行的添加按钮）
  const handleAddItemInCategory = async (type: 'income' | 'expense', category: string) => {
    try {
      const itemData = {
        type: type,
        category: category,
        description: `新${type === 'income' ? '收入' : '支出'}项目`,
        remark: '',
        amount: 0,
        expectedDate: dayjs().toISOString(),
        status: 'planned' as const,
      };

        await onAdd(itemData as any);
      message.success('快速创建成功，请点击编辑完善信息');
      await onRefresh();
    } catch (error) {
      console.error('添加失败:', error);
      message.error('添加失败');
    }
  };

  // 删除整个类别及其下的所有项目
  const handleDeleteCategory = async (type: 'income' | 'expense', category: string) => {
    const categoryItems = items.filter(item => item.type === type && item.category === category);
    
    if (categoryItems.length === 0) return;
    
    try {
      // 删除该类别下的所有项目
      for (const item of categoryItems) {
        await onDelete(item.id);
      }
      message.success(`已删除 ${getCategoryLabel(type, category)} 类别及其 ${categoryItems.length} 个项目`);
    } catch (error) {
      message.error('删除类别失败');
      console.error(error);
    }
  };

  // 删除项目
  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 分组表格列定义
  const columns: ColumnsType<GroupedRow> = [
    {
      title: '项目/类别',
      dataIndex: 'description',
      width: '35%',
      render: (_: unknown, record: GroupedRow) => {
        // 类型标题行 (Incomes / Expenses)
        if (record.isTypeHeader) {
          const type = record.type!;
          const allCategories = type === 'income' ? incomeCategories : expenseCategories;
          // 过滤已存在的类别
          const existingCategories = items
            .filter(item => item.type === type)
            .map(item => item.category);
          const availableCategories = allCategories.filter(
            cat => !existingCategories.includes(cat.value)
          );
          const selectedCategory = type === 'income' ? quickAddCategory.income : quickAddCategory.expense;
          
          return (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700, 
              fontSize: '16px',
              color: record.type === 'income' ? '#52c41a' : '#ff4d4f',
              padding: '8px 0'
            }}>
              <div>
                {record.type === 'income' ? <RiseOutlined /> : <FallOutlined />} {record.typeLabel}
              </div>
              {editMode && (
                <Space size="small">
                  <Select
                    size="small"
                    style={{ width: 150 }}
                    placeholder="选择新类别"
                    value={selectedCategory}
                    onChange={(value) => {
                      setQuickAddCategory(prev => ({
                        ...prev,
                        [type]: value
                      }));
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {availableCategories.map(cat => (
                      <Option key={cat.value} value={cat.value}>
                        {cat.label}
                      </Option>
                    ))}
                  </Select>
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedCategory) {
                        handleQuickAddInType(type, selectedCategory);
                      } else {
                        message.warning('请先选择类别');
                      }
                    }}
                    disabled={!selectedCategory}
                    style={{ color: '#1890ff' }}
                    title="快速添加"
                  >
                  </Button>
                </Space>
              )}
            </div>
          );
        }
        
        // 类别标题行 (Ticketing, Sponsor, etc.)
        if (record.isCategoryHeader) {
          return (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600, 
              fontSize: '14px',
              paddingLeft: '24px',
              color: '#595959'
            }}>
              <div>- {record.categoryLabel}</div>
              {editMode && (
        <Space size="small">
          <Button
            type="link"
            size="small"
                    icon={<PlusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddItemInCategory(record.type!, record.category!);
                    }}
                    title="添加项目"
                    style={{ color: '#1890ff' }}
          />
          <Popconfirm
                    title={`确认删除 ${record.categoryLabel} 类别及其所有项目？`}
                    description={`该类别下有 ${items.filter(i => i.type === record.type && i.category === record.category).length} 个项目`}
                    onConfirm={() => handleDeleteCategory(record.type!, record.category!)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
                      title="删除类别"
                      onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
              )}
            </div>
          );
        }
        
        // 项目行 - 编辑模式下可编辑
        if (editMode) {
          const currentValue = getEditedValue(record.id!, 'description') ?? record.description;
          return (
            <div style={{ paddingLeft: '48px', display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
              <Popconfirm
                title="确认删除此项目？"
                onConfirm={() => handleDelete(record.id!)}
                okText="确认"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                  style={{ padding: 0, minWidth: '24px', flexShrink: 0 }}
                />
              </Popconfirm>
              <Input
                size="small"
                value={currentValue}
                onChange={(e) => handleFieldChange(record.id!, 'description', e.target.value)}
                placeholder="项目描述"
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
          );
        }
        
        // 正常显示模式
        return (
          <div style={{ paddingLeft: '48px', color: '#262626' }}>
            -- {record.description}
          </div>
        );
      },
    },
    {
      title: '备注 / 状态',
      dataIndex: 'remark',
      width: '20%',
      render: (text: string, record: GroupedRow) => {
        // 只在项目行显示备注
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        // 编辑模式 - 备注和状态横向排列
        if (editMode) {
          const currentRemark = getEditedValue(record.id!, 'remark') ?? record.remark;
          const currentStatus = getEditedValue(record.id!, 'status') ?? record.status;
          
          return (
            <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
              <Input
                size="small"
                value={currentRemark}
                onChange={(e) => handleFieldChange(record.id!, 'remark', e.target.value)}
                placeholder="备注"
                style={{ flex: 1, minWidth: 0 }}
              />
              <Select
                size="small"
                style={{ width: 90, flexShrink: 0 }}
                value={currentStatus}
                onChange={(value) => handleFieldChange(record.id!, 'status', value)}
                placeholder="状态"
              >
                <Option value="planned">计划中</Option>
                <Option value="pending-approval">待审批</Option>
                <Option value="confirmed">已确认</Option>
                <Option value="completed">已完成</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
            </div>
          );
        }
        
        // 正常模式 - 显示备注和状态标签（同一行）
        const statusMap = {
          planned: { label: '计划中', color: 'blue' },
          'pending-approval': { label: '待审批', color: 'gold' },
          confirmed: { label: '已确认', color: 'orange' },
          completed: { label: '已完成', color: 'green' },
          cancelled: { label: '已取消', color: 'default' },
        };
        const statusConfig = statusMap[record.status as keyof typeof statusMap] || statusMap.planned;
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#8c8c8c', fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {text || '-'}
            </span>
            <Tag color={statusConfig.color} style={{ fontSize: '11px', flexShrink: 0 }}>
              {statusConfig.label}
            </Tag>
          </div>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      align: 'right',
      render: (_: unknown, record: GroupedRow) => {
        // 类型标题行不显示金额
        if (record.isTypeHeader) return null;
        
        // 类别标题行显示类别小计
        if (record.isCategoryHeader) {
          return (
            <span style={{ 
              fontWeight: 600, 
              fontSize: '14px',
              color: record.type === 'income' ? '#52c41a' : '#ff4d4f'
            }}>
              RM {record.categoryTotal?.toFixed(2)}
            </span>
          );
        }
        
        // 项目行 - 编辑模式下可编辑
        if (editMode) {
          const currentValue = getEditedValue(record.id!, 'amount') ?? record.amount;
          return (
            <div style={{ width: '100%' }}>
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="RM"
                placeholder="0.00"
                value={currentValue}
                onChange={(value) => handleFieldChange(record.id!, 'amount', value || 0)}
              />
            </div>
          );
        }
        
        // 正常显示模式
        return (
          <span style={{ 
            color: record.type === 'income' ? '#52c41a' : '#ff4d4f',
            fontWeight: 500
          }}>
            RM {record.amount?.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '预计日期',
      dataIndex: 'expectedDate',
      width: 110,
      render: (date: string, record: GroupedRow) => {
        // 只在项目行显示日期
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        // 编辑模式下可编辑
        if (editMode) {
          const currentValue = getEditedValue(record.id!, 'expectedDate') ?? record.expectedDate;
          return (
            <DatePicker
              size="small"
              style={{ width: '100%' }}
              format="DD-MMM-YYYY"
              placeholder="选择日期"
              value={currentValue ? dayjs(currentValue) : null}
              onChange={(date) => handleFieldChange(record.id!, 'expectedDate', date ? date.toISOString() : new Date().toISOString())}
            />
          );
        }
        
        // 正常显示模式
        return globalDateService.formatDate(date, 'display');
      },
    },
  ];

  return (
    <Card 
      title="🔮 活动财务计划（Activity Financial Plan）"
      extra={
        <Space>
          {!editMode ? (
            <>
          <Button
                icon={<EditOutlined />}
                onClick={() => setEditMode(true)}
              >
                编辑模式
          </Button>
          <Button
            icon={<ImportOutlined />}
            onClick={() => setBulkPasteVisible(true)}
          >
            批量粘贴
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => message.info('导出功能开发中...')}
          >
            导出Excel
          </Button>
            </>
          ) : (
            <>
              <Button
                type="primary"
                onClick={handleSaveAndExitEdit}
              >
                保存编辑
              </Button>
              <Button
                onClick={() => {
                  setEditMode(false);
                  setEditedItems(new Map());
                }}
              >
                取消
              </Button>
            </>
          )}
        </Space>
      }
      className="activity-financial-plan-card"
    >
      {/* 分组表格 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <span style={{ fontSize: 14, color: '#8c8c8c' }}>
            <RiseOutlined style={{ color: '#52c41a' }} /> 收入: {incomeItems.length} 项
          </span>
          <span style={{ fontSize: 14, color: '#8c8c8c' }}>
            <FallOutlined style={{ color: '#ff4d4f' }} /> 支出: {expenseItems.length} 项
          </span>
          <span style={{ fontSize: 14, color: '#8c8c8c' }}>
            共 {items.length} 条记录
          </span>
        </Space>
            </div>

              <Table
                {...tableConfig}
        columns={columns}
        dataSource={groupedData}
        rowKey="key"
                loading={loading}
        pagination={false}
        rowClassName={(record) => {
          if (record.isTypeHeader) return 'type-header-row';
          if (record.isCategoryHeader) return 'category-header-row';
          if (editMode && !record.isTypeHeader && !record.isCategoryHeader) return 'item-row editable-row';
          return 'item-row';
        }}
      />

      {/* 独立统计区域 */}
      <div style={{ 
        marginTop: 16, 
        padding: '16px 24px', 
        backgroundColor: '#fafafa',
        borderRadius: 8,
        border: '1px solid #f0f0f0'
      }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {/* Total Income */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
              Total Income
            </span>
            <span style={{ color: '#52c41a', fontSize: '20px', fontWeight: 700 }}>
              RM {totalIncome.toFixed(2)}
            </span>
          </div>

          {/* Total Expenses */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
              Total Expenses
            </span>
            <span style={{ color: '#ff4d4f', fontSize: '20px', fontWeight: 700 }}>
              RM {totalExpense.toFixed(2)}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: '#d9d9d9', margin: '4px 0' }} />

          {/* Net Profit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>
              Net Profit
            </span>
            <span style={{ 
              color: netProfit >= 0 ? '#52c41a' : '#ff4d4f', 
              fontSize: '24px',
              fontWeight: 700 
            }}>
              RM {netProfit.toFixed(2)}
            </span>
          </div>
        </Space>
      </div>

      {/* 批量粘贴模态框 */}
      <Modal
        title="批量粘贴导入"
        open={bulkPasteVisible}
        onOk={handleBulkPasteSubmit}
        onCancel={() => {
          setBulkPasteVisible(false);
          setBulkPasteText('');
        }}
        width={800}
        okText="导入"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>使用说明：</strong></p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li>从Excel复制数据（支持制表符分隔）</li>
            <li>粘贴到下方文本框</li>
            <li>格式：<code>描述 [Tab] 备注 [Tab] 金额 [Tab] 预计日期（可选）</code></li>
            <li>导入后会使用默认类别，请手动调整</li>
          </ul>
        </div>
        <TextArea
          value={bulkPasteText}
          onChange={(e) => setBulkPasteText(e.target.value)}
          rows={12}
          placeholder="示例（每行一条记录，字段间用Tab键分隔）：
正式会员报名	预计30人	3000	2025-02-15
访客报名	预计20人	2400	2025-02-15
ABC公司赞助	金级赞助	5000	2025-02-10"
          style={{ fontFamily: 'monospace' }}
        />
        <div style={{ marginTop: 12, fontSize: '12px', color: '#8c8c8c' }}>
          💡 提示：复制Excel单元格时会自动带上Tab分隔符
        </div>
      </Modal>
    </Card>
  );
};

export default ActivityFinancialPlan;

