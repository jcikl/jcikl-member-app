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
  const [bulkPasteData, setBulkPasteData] = useState<Array<{
    key: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    remark: string;
    amount: number;
    expectedDate: string;
  }>>([]);

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
  // 构建收入数据
  const buildIncomeData = (): GroupedRow[] => {
    const grouped: GroupedRow[] = [];
    
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
        indentLevel: 0,
      });
      
      // 类别下的项目
      categoryItems.forEach(item => {
        grouped.push({
          ...item,
          key: item.id,
          indentLevel: 1,
        } as GroupedRow);
      });
    });
    
    return grouped;
  };

  // 构建支出数据
  const buildExpenseData = (): GroupedRow[] => {
    const grouped: GroupedRow[] = [];
    
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
        indentLevel: 0,
      });
      
      // 类别下的项目
      categoryItems.forEach(item => {
        grouped.push({
          ...item,
          key: item.id,
          indentLevel: 1,
        } as GroupedRow);
      });
    });
    
    return grouped;
  };

  const incomeData = buildIncomeData();
  const expenseData = buildExpenseData();
  
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
  
  // 批量粘贴解析（从文本转为表格数据）
  const parseBulkPasteText = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const defaultCategory = incomeCategories[0]?.value || 'other-income';
    
    const items = lines.map((line, index) => {
      const parts = line.split('\t').map(p => p.trim());
      
      return {
        key: `bulk-${Date.now()}-${index}`,
        type: 'income' as const,
        category: defaultCategory,
        description: parts[0] || '',
          remark: parts[1] || '',
          amount: parseFloat(parts[2]) || 0,
        expectedDate: parts[3] || dayjs().format('YYYY-MM-DD'),
      };
    });
    
    setBulkPasteData(items);
    setBulkPasteText('');
  };
  
  // 处理粘贴事件
  const handleTextPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    parseBulkPasteText(pastedText);
  };
  
  // 添加空行
  const handleAddBulkRow = () => {
    const defaultCategory = incomeCategories[0]?.value || 'other-income';
    setBulkPasteData([
      ...bulkPasteData,
      {
        key: `bulk-${Date.now()}`,
        type: 'income',
        category: defaultCategory,
        description: '',
        remark: '',
        amount: 0,
        expectedDate: dayjs().format('YYYY-MM-DD'),
      }
    ]);
  };
  
  // 删除行
  const handleDeleteBulkRow = (key: string) => {
    setBulkPasteData(bulkPasteData.filter(item => item.key !== key));
  };
  
  // 更新表格数据
  const handleBulkDataChange = (key: string, field: string, value: any) => {
    setBulkPasteData(bulkPasteData.map(item => 
      item.key === key ? { ...item, [field]: value } : item
    ));
  };
  
  // 批量粘贴提交
  const handleBulkPasteSubmit = async () => {
    try {
      if (bulkPasteData.length === 0) {
        message.warning('没有数据可导入');
        return;
      }
      
      // 验证数据
      const invalidRows = bulkPasteData.filter(item => 
        !item.description || item.amount <= 0
      );
      
      if (invalidRows.length > 0) {
        message.error(`有 ${invalidRows.length} 行数据不完整（描述和金额必填且金额需大于0）`);
        return;
      }
      
      for (const item of bulkPasteData) {
        await onAdd({
          type: item.type,
          category: item.category,
          description: item.description,
          remark: item.remark,
          amount: item.amount,
          expectedDate: item.expectedDate,
          status: 'planned',
        } as any);
      }
      
      message.success(`成功导入 ${bulkPasteData.length} 条记录`);
      setBulkPasteVisible(false);
      setBulkPasteData([]);
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
        // 类别标题行 (Ticketing, Sponsor, etc.)
        if (record.isCategoryHeader) {
          return (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600, 
              fontSize: '14px',
              color: '#595959'
            }}>
              <div>{record.categoryLabel}</div>
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
            <div style={{ paddingLeft: '24px', display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
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
          <div style={{ paddingLeft: '24px', color: '#262626' }}>
            {record.description}
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
      {/* 收入区域 */}
      <div style={{ marginBottom: 24 }}>
        {/* 收入标题 - 独立显示 */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid #52c41a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RiseOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#52c41a' }}>
              Incomes
            </span>
            <span style={{ fontSize: '14px', color: '#8c8c8c' }}>
              {incomeItems.length} 项
            </span>
            </div>
          {editMode && (
            <Space size="small">
              <Select
                size="small"
                style={{ width: 200 }}
                placeholder="选择新类别"
                value={quickAddCategory.income}
                onChange={(value) => {
                  setQuickAddCategory(prev => ({
                    ...prev,
                    income: value
                  }));
                }}
              >
                {incomeCategories
                  .filter(cat => !incomeItems.map(i => i.category).includes(cat.value))
                  .map(cat => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
              </Select>
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  if (quickAddCategory.income) {
                    handleQuickAddInType('income', quickAddCategory.income);
                  } else {
                    message.warning('请先选择类别');
                  }
                }}
                disabled={!quickAddCategory.income}
                style={{ color: '#1890ff' }}
                title="快速添加"
              >
                添加
              </Button>
            </Space>
          )}
            </div>

              <Table
                {...tableConfig}
          columns={columns}
          dataSource={incomeData}
          rowKey="key"
                loading={loading}
          pagination={false}
          showHeader={true}
          rowClassName={(record) => {
            if (record.isCategoryHeader) return 'category-header-row';
            if (editMode && !record.isCategoryHeader) return 'item-row editable-row';
            return 'item-row';
          }}
        />
      </div>

      {/* 支出区域 */}
      <div style={{ marginBottom: 24 }}>
        {/* 支出标题 - 独立显示 */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#fff1f0',
          borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid #ff4d4f'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FallOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#ff4d4f' }}>
              Expenses
              </span>
            <span style={{ fontSize: '14px', color: '#8c8c8c' }}>
              {expenseItems.length} 项
              </span>
          </div>
          {editMode && (
            <Space size="small">
              <Select
                size="small"
                style={{ width: 200 }}
                placeholder="选择新类别"
                value={quickAddCategory.expense}
                onChange={(value) => {
                  setQuickAddCategory(prev => ({
                    ...prev,
                    expense: value
                  }));
                }}
              >
                {expenseCategories
                  .filter(cat => !expenseItems.map(i => i.category).includes(cat.value))
                  .map(cat => (
                      <Option key={cat.value} value={cat.value}>
                        {cat.label}
                      </Option>
                    ))}
                  </Select>
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  if (quickAddCategory.expense) {
                    handleQuickAddInType('expense', quickAddCategory.expense);
                  } else {
                    message.warning('请先选择类别');
                  }
                }}
                disabled={!quickAddCategory.expense}
                style={{ color: '#1890ff' }}
                title="快速添加"
              >
                添加
              </Button>
            </Space>
          )}
        </div>

        <Table
          {...tableConfig}
          columns={columns}
          dataSource={expenseData}
          rowKey="key"
          loading={loading}
          pagination={false}
          showHeader={true}
          rowClassName={(record) => {
            if (record.isCategoryHeader) return 'category-header-row';
            if (editMode && !record.isCategoryHeader) return 'item-row editable-row';
            return 'item-row';
          }}
        />
      </div>

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
        title="批量导入财务计划"
        open={bulkPasteVisible}
        onOk={handleBulkPasteSubmit}
        onCancel={() => {
          setBulkPasteVisible(false);
          setBulkPasteText('');
          setBulkPasteData([]);
        }}
        width={1200}
        okText={`确认导入 (${bulkPasteData.length})`}
        cancelText="取消"
        okButtonProps={{ disabled: bulkPasteData.length === 0 }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, marginBottom: 4, fontWeight: 600 }}>使用说明：</p>
              <ul style={{ paddingLeft: 20, margin: '4px 0', fontSize: '13px', color: '#666' }}>
                <li>从Excel复制数据后，选中表格任意单元格按 Ctrl+V 粘贴（自动解析）</li>
                <li>Excel格式：<code>描述 [Tab] 备注 [Tab] 金额 [Tab] 日期</code></li>
                <li>也可手动点击"添加行"按钮逐行输入</li>
          </ul>
        </div>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddBulkRow}
              >
                添加行
              </Button>
              {bulkPasteData.length > 0 && (
                <Button 
                  danger
                  onClick={() => {
                    setBulkPasteData([]);
                    message.info('已清空所有数据');
                  }}
                >
                  清空全部
                </Button>
              )}
            </Space>
          </div>
        </div>

        {/* 隐藏的粘贴区域 */}
        <div style={{ position: 'absolute', left: -9999, top: -9999 }}>
          <Input
            id="bulk-paste-input"
            onPaste={handleTextPaste}
          value={bulkPasteText}
          onChange={(e) => setBulkPasteText(e.target.value)}
          />
        </div>

        {/* 可编辑表格 */}
        <div 
          onPaste={handleTextPaste}
          style={{ position: 'relative' }}
        >
          {bulkPasteData.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              background: '#fafafa',
              border: '2px dashed #d9d9d9',
              borderRadius: 8,
            }}>
              <p style={{ fontSize: 16, color: '#999', marginBottom: 12 }}>
                📋 暂无数据
              </p>
              <p style={{ fontSize: 13, color: '#bbb', marginBottom: 20 }}>
                点击上方"添加行"按钮，或从Excel粘贴数据到此区域
              </p>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBulkRow}>
                添加第一行
              </Button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
                共 <strong style={{ color: '#1890ff' }}>{bulkPasteData.length}</strong> 条记录
                <span style={{ marginLeft: 16, color: '#999' }}>
                  💡 提示：在表格内按 Ctrl+V 可粘贴Excel数据
                </span>
              </div>
              
              <Table
                dataSource={bulkPasteData}
                pagination={false}
                scroll={{ y: 400 }}
                size="small"
                bordered
                columns={[
                  {
                    title: '类型',
                    dataIndex: 'type',
                    key: 'type',
                    width: 100,
                    render: (type, record) => (
                      <Select
                        value={type}
                        onChange={(value) => handleBulkDataChange(record.key, 'type', value)}
                        size="small"
                        style={{ width: '100%' }}
                      >
                        <Option value="income">收入</Option>
                        <Option value="expense">支出</Option>
                      </Select>
                    ),
                  },
                  {
                    title: '类别',
                    dataIndex: 'category',
                    key: 'category',
                    width: 150,
                    render: (category, record) => (
                      <Select
                        value={category}
                        onChange={(value) => handleBulkDataChange(record.key, 'category', value)}
                        size="small"
                        style={{ width: '100%' }}
                      >
                        {record.type === 'income' 
                          ? incomeCategories.map(cat => (
                              <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                            ))
                          : expenseCategories.map(cat => (
                              <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                            ))
                        }
                      </Select>
                    ),
                  },
                  {
                    title: '描述 *',
                    dataIndex: 'description',
                    key: 'description',
                    width: 200,
                    render: (desc, record) => (
                      <Input
                        value={desc}
                        onChange={(e) => handleBulkDataChange(record.key, 'description', e.target.value)}
                        placeholder="必填"
                        size="small"
                        status={!desc ? 'error' : ''}
                      />
                    ),
                  },
                  {
                    title: '备注',
                    dataIndex: 'remark',
                    key: 'remark',
                    width: 150,
                    render: (remark, record) => (
                      <Input
                        value={remark}
                        onChange={(e) => handleBulkDataChange(record.key, 'remark', e.target.value)}
                        placeholder="可选"
                        size="small"
                      />
                    ),
                  },
                  {
                    title: '金额 *',
                    dataIndex: 'amount',
                    key: 'amount',
                    width: 120,
                    render: (amount, record) => (
                      <InputNumber
                        value={amount}
                        onChange={(value) => handleBulkDataChange(record.key, 'amount', value || 0)}
                        placeholder="必填"
                        size="small"
                        style={{ width: '100%' }}
                        min={0}
                        precision={2}
                        status={amount <= 0 ? 'error' : ''}
                      />
                    ),
                  },
                  {
                    title: '预计日期',
                    dataIndex: 'expectedDate',
                    key: 'expectedDate',
                    width: 140,
                    render: (date, record) => (
                      <DatePicker
                        value={date ? dayjs(date) : null}
                        onChange={(value) => handleBulkDataChange(
                          record.key, 
                          'expectedDate', 
                          value ? value.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
                        )}
                        size="small"
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                      />
                    ),
                  },
                  {
                    title: '操作',
                    key: 'action',
                    width: 60,
                    fixed: 'right',
                    render: (_, record) => (
                      <Button
                        type="link"
                        danger
                        size="small"
                        onClick={() => handleDeleteBulkRow(record.key)}
                      >
                        删除
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
};

export default ActivityFinancialPlan;

