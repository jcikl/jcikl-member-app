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
  Form,
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
  const [editingKey, setEditingKey] = useState<string>('');
  const [addingInCategory, setAddingInCategory] = useState<{type: 'income' | 'expense', category: string} | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();
  
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
    isNew?: boolean;
    typeLabel?: string;
    categoryLabel?: string;
    categoryTotal?: number;
    indentLevel?: number;
  }

  // 构建分组数据结构
  const buildGroupedData = (): GroupedRow[] => {
    const grouped: GroupedRow[] = [];
    
    // 收入组
    if (incomeItems.length > 0 || (addingInCategory?.type === 'income')) {
      // 类型标题行
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
      
      // 如果正在添加新项目，确保类别存在
      if (addingInCategory?.type === 'income' && !incomeByCategory[addingInCategory.category]) {
        incomeByCategory[addingInCategory.category] = [];
      }
      
      // 渲染每个类别
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
        
        // 如果正在添加新项目到这个类别
        if (addingInCategory?.type === 'income' && addingInCategory.category === category && editingKey) {
          grouped.push({
            key: editingKey,
            type: 'income',
            category,
            isNew: true,
            indentLevel: 2,
          } as GroupedRow);
        }
      });
    }
    
    // 支出组
    if (expenseItems.length > 0 || (addingInCategory?.type === 'expense')) {
      // 类型标题行
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
      
      // 如果正在添加新项目，确保类别存在
      if (addingInCategory?.type === 'expense' && !expenseByCategory[addingInCategory.category]) {
        expenseByCategory[addingInCategory.category] = [];
      }
      
      // 渲染每个类别
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
        
        // 如果正在添加新项目到这个类别
        if (addingInCategory?.type === 'expense' && addingInCategory.category === category && editingKey) {
          grouped.push({
            key: editingKey,
            type: 'expense',
            category,
            isNew: true,
            indentLevel: 2,
          } as GroupedRow);
        }
      });
    }
    
    return grouped;
  };

  const groupedData = buildGroupedData();
  
  // 判断是否正在编辑
  const isEditing = (record: GroupedRow) => record.key === editingKey;
  
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

  // 开始编辑
  const handleEdit = (record: FinancialPlanItem) => {
    form.setFieldsValue({
      description: record.description,
      remark: record.remark,
      amount: record.amount,
      expectedDate: record.expectedDate ? dayjs(record.expectedDate) : null,
      status: record.status,
    });
    setEditingKey(record.id);
  };

  // 取消编辑
  const handleCancel = () => {
    setEditingKey('');
    setAddingInCategory(null);
    form.resetFields();
  };

  // 保存编辑
  const handleSave = async (id: string) => {
    try {
      const values = await form.validateFields();
      
      const itemData = {
        description: values.description,
        remark: values.remark || '',
        amount: values.amount,
        expectedDate: values.expectedDate ? values.expectedDate.toISOString() : new Date().toISOString(),
        status: values.status || 'planned',
      };

      await onUpdate(id, itemData);
      message.success('更新成功');
      setEditingKey('');
      form.resetFields();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 在特定类别下添加项目
  const handleAddItemInCategory = (type: 'income' | 'expense', category: string) => {
    const newKey = `new-${Date.now()}`;
    setAddingInCategory({ type, category });
    setEditingKey(newKey);
    form.setFieldsValue({
      description: '',
      remark: '',
      amount: 0,
      expectedDate: dayjs(),
      status: 'planned',
    });
  };

  // 保存新项目
  const handleSaveNew = async () => {
    if (!addingInCategory) return;
    
    try {
      const values = await form.validateFields();
      
      const itemData = {
        type: addingInCategory.type,
        category: addingInCategory.category,
        description: values.description,
        remark: values.remark || '',
        amount: values.amount,
        expectedDate: values.expectedDate ? values.expectedDate.toISOString() : new Date().toISOString(),
        status: values.status || 'planned',
      };

      await onAdd(itemData as any);
      message.success('添加成功');
      setEditingKey('');
      setAddingInCategory(null);
      form.resetFields();
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
      ellipsis: true,
      render: (_: unknown, record: GroupedRow) => {
        // 类型标题行 (Incomes / Expenses)
        if (record.isTypeHeader) {
          return (
            <div style={{ 
              fontWeight: 700, 
              fontSize: '16px',
              color: record.type === 'income' ? '#52c41a' : '#ff4d4f',
              padding: '8px 0'
            }}>
              {record.type === 'income' ? <RiseOutlined /> : <FallOutlined />} {record.typeLabel}
            </div>
          );
        }
        
        // 类别标题行 (Ticketing, Sponsor, etc.)
        if (record.isCategoryHeader) {
          return (
            <div style={{ 
              fontWeight: 600, 
              fontSize: '14px',
              paddingLeft: '24px',
              color: '#595959'
            }}>
              - {record.categoryLabel}
            </div>
          );
        }
        
        // 项目行 - 可编辑
        const editing = isEditing(record);
        if (editing) {
          return (
            <Form.Item
              name="description"
              style={{ margin: 0, paddingLeft: '48px' }}
              rules={[{ required: true, message: '请输入描述' }]}
            >
              <Input placeholder="项目描述" />
            </Form.Item>
          );
        }
        
        // 正常显示模式 - 描述 + 状态标签
        const statusMap = {
          planned: { label: '计划中', color: 'blue' },
          'pending-approval': { label: '待审批', color: 'gold' },
          confirmed: { label: '已确认', color: 'orange' },
          completed: { label: '已完成', color: 'green' },
          cancelled: { label: '已取消', color: 'default' },
        };
        const statusConfig = statusMap[record.status as keyof typeof statusMap] || statusMap.planned;
        
        return (
          <div style={{ paddingLeft: '48px' }}>
            <div style={{ color: '#262626' }}>
              -- {record.description}
            </div>
            <div style={{ marginTop: 4 }}>
              <Tag color={statusConfig.color} style={{ fontSize: '11px' }}>
                {statusConfig.label}
              </Tag>
            </div>
          </div>
        );
      },
    },
    {
      title: '备注 / 状态',
      dataIndex: 'remark',
      width: '25%',
      render: (text: string, record: GroupedRow) => {
        // 只在项目行显示备注
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        const editing = isEditing(record);
        if (editing) {
          return (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Form.Item name="remark" style={{ margin: 0 }}>
                <Input placeholder="备注" size="small" />
              </Form.Item>
              <Form.Item name="status" style={{ margin: 0 }}>
                <Select style={{ width: '100%' }} size="small" placeholder="选择状态">
                  <Option value="planned">计划中</Option>
                  <Option value="pending-approval">待审批</Option>
                  <Option value="confirmed">已确认</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
              </Form.Item>
            </Space>
          );
        }
        
        return (
          <div>
            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>{text || '-'}</div>
          </div>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 140,
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
        
        // 项目行 - 可编辑
        const editing = isEditing(record);
        return editing ? (
          <Form.Item
            name="amount"
            style={{ margin: 0 }}
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="RM"
              placeholder="0.00"
            />
          </Form.Item>
        ) : (
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
      width: 130,
      render: (date: string, record: GroupedRow) => {
        // 只在项目行显示日期
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        const editing = isEditing(record);
        return editing ? (
          <Form.Item
            name="expectedDate"
            style={{ margin: 0 }}
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD-MMM-YYYY"
              placeholder="选择日期"
            />
          </Form.Item>
        ) : (
          globalDateService.formatDate(date, 'display')
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: GroupedRow) => {
        // 类型标题行不显示操作
        if (record.isTypeHeader) return null;
        
        // 非编辑模式下，不显示任何操作按钮
        if (!editMode) return null;
        
        // 类别标题行显示添加项目和删除类别按钮
        if (record.isCategoryHeader) {
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddItemInCategory(record.type!, record.category!)}
                title="添加项目"
                style={{ color: '#1890ff' }}
                disabled={!!editingKey}
              >
                添加
              </Button>
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
                  disabled={!!editingKey}
                />
              </Popconfirm>
            </Space>
          );
        }
        
        // 项目行 - 正在编辑此行
        const editing = isEditing(record);
        if (editing) {
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                onClick={() => record.isNew ? handleSaveNew() : handleSave(record.id!)}
                style={{ color: '#52c41a' }}
              >
                保存
              </Button>
              <Button
                type="link"
                size="small"
                onClick={handleCancel}
              >
                取消
              </Button>
            </Space>
          );
        }
        
        // 项目行 - 编辑模式但未编辑此行
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record as FinancialPlanItem)}
              title="编辑"
              disabled={!!editingKey}
            />
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
                title="删除"
                disabled={!!editingKey}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Card 
      title="🔮 活动财务计划（Activity Financial Plan）"
      extra={
        <Space>
          <Button
            type={editMode ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => {
              setEditMode(!editMode);
              if (editMode) {
                // 退出编辑模式时取消所有编辑
                handleCancel();
              }
            }}
          >
            {editMode ? '退出编辑' : '编辑模式'}
          </Button>
          <Button
            icon={<ImportOutlined />}
            onClick={() => setBulkPasteVisible(true)}
            disabled={editMode}
          >
            批量粘贴
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => message.info('导出功能开发中...')}
            disabled={editMode}
          >
            导出Excel
          </Button>
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

      <Form form={form} component={false}>
        <Table
          {...tableConfig}
          components={{
            body: {
              cell: (props: any) => <td {...props} />,
            },
          }}
          columns={columns}
          dataSource={groupedData}
          rowKey="key"
          loading={loading}
          pagination={false}
          rowClassName={(record) => {
            if (record.isTypeHeader) return 'type-header-row';
            if (record.isCategoryHeader) return 'category-header-row';
            if (isEditing(record)) return 'item-row editing-row';
            return 'item-row';
          }}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong style={{ fontSize: '16px' }}>Total Income</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong style={{ color: '#52c41a', fontSize: '18px', fontWeight: 700 }}>
                  RM {totalIncome.toFixed(2)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} colSpan={2} />
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong style={{ fontSize: '16px' }}>Total Expenses</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong style={{ color: '#ff4d4f', fontSize: '18px', fontWeight: 700 }}>
                  RM {totalExpense.toFixed(2)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} colSpan={2} />
            </Table.Summary.Row>
            <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong style={{ fontSize: '18px' }}>Net Profit</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong style={{ 
                  color: netProfit >= 0 ? '#52c41a' : '#ff4d4f', 
                  fontSize: '20px',
                  fontWeight: 700 
                }}>
                  RM {netProfit.toFixed(2)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} colSpan={2} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
        />
      </Form>

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

