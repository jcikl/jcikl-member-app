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
  Row,
  Col,
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
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialPlanItem | null>(null);
  const [addingType, setAddingType] = useState<'income' | 'expense'>('income');
  const [form] = Form.useForm();
  
  // 动态类别
  const [incomeCategories, setIncomeCategories] = useState<Array<{label: string; value: string}>>([]);
  const [expenseCategories, setExpenseCategories] = useState<Array<{label: string; value: string}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
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
      setLoadingCategories(true);
      const [income, expense] = await Promise.all([
        getActiveIncomeCategories(),
        getActiveExpenseCategories(),
      ]);
      setIncomeCategories(income);
      setExpenseCategories(expense);
    } catch (error) {
      message.error('加载类别失败');
      console.error(error);
    } finally {
      setLoadingCategories(false);
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
    
    // 收入组
    if (incomeItems.length > 0) {
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
      });
    }
    
    // 支出组
    if (expenseItems.length > 0) {
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
      });
    }
    
    return grouped;
  };

  const groupedData = buildGroupedData();
  
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
      
      const defaultCategory = addingType === 'income' 
        ? (incomeCategories[0]?.value || 'other-income')
        : (expenseCategories[0]?.value || 'other-expense');
      
      for (const item of items) {
        await onAdd({
          type: addingType,
          category: defaultCategory,
          ...item,
          status: 'planned',
        } as any);
      }
      
      message.success(`成功导入 ${items.length} 条记录`);
      setBulkPasteVisible(false);
      setBulkPasteText('');
      await onRefresh();
    } catch (error) {
      message.error('导入失败');
      console.error(error);
    }
  };

  // 打开添加模态框
  const handleAdd = (type: 'income' | 'expense') => {
    setEditingItem(null);
    setAddingType(type);
    form.resetFields();
    form.setFieldsValue({ type });
    setModalVisible(true);
  };

  // 打开编辑模态框
  const handleEdit = (item: FinancialPlanItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      ...item,
      expectedDate: item.expectedDate ? dayjs(item.expectedDate) : null,
    });
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const itemData = {
        type: values.type,
        category: values.category,
        description: values.description,
        remark: values.remark || '',
        amount: values.amount,
        expectedDate: values.expectedDate ? values.expectedDate.toISOString() : new Date().toISOString(),
        status: values.status || 'planned',
      };

      if (editingItem) {
        await onUpdate(editingItem.id, itemData);
        message.success('更新成功');
      } else {
        await onAdd(itemData as any);
        message.success('添加成功');
      }

      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('提交失败:', error);
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
        
        // 项目行 (Eddie, Andy, etc.)
        return (
          <div style={{ paddingLeft: '48px', color: '#262626' }}>
            -- {record.description}
          </div>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: '20%',
      ellipsis: true,
      render: (text: string, record: GroupedRow) => {
        // 只在项目行显示备注
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        return <span style={{ color: '#8c8c8c' }}>{text || '-'}</span>;
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
        
        // 项目行显示金额
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
        return globalDateService.formatDate(date, 'display');
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: string, record: GroupedRow) => {
        // 只在项目行显示状态
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        const statusMap = {
          planned: { label: '计划中', color: 'blue' },
          'pending-approval': { label: '待审批', color: 'gold' },
          confirmed: { label: '已确认', color: 'orange' },
          completed: { label: '已完成', color: 'green' },
          cancelled: { label: '已取消', color: 'default' },
        };
        const config = statusMap[status as keyof typeof statusMap] || statusMap.planned;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: unknown, record: GroupedRow) => {
        // 只在项目行显示操作按钮
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record as FinancialPlanItem)}
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
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleAdd('income')}
          >
            添加收入
          </Button>
          <Button
            type="primary"
            danger
            icon={<PlusOutlined />}
            onClick={() => handleAdd('expense')}
          >
            添加支出
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
              <Table.Summary.Cell index={3} colSpan={3} />
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
              <Table.Summary.Cell index={3} colSpan={3} />
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
              <Table.Summary.Cell index={3} colSpan={3} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {/* 添加/编辑模态框 */}
      <Modal
        title={editingItem ? '编辑财务项目' : '添加财务项目'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'income',
            status: 'planned',
          }}
        >
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select disabled={!!editingItem}>
              <Option value="income">
                <RiseOutlined style={{ color: '#52c41a' }} /> 收入
              </Option>
              <Option value="expense">
                <FallOutlined style={{ color: '#ff4d4f' }} /> 支出
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              const categories = type === 'income' ? incomeCategories : expenseCategories;
              
              return (
                <Form.Item
                  name="category"
                  label="类别"
                  rules={[{ required: true, message: '请选择类别' }]}
                >
                  <Select placeholder="选择类别" loading={loadingCategories}>
                    {categories.map(cat => (
                      <Option key={cat.value} value={cat.value}>
                        {cat.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input placeholder="例如：正式会员报名、ABC公司赞助" maxLength={100} />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <TextArea
              placeholder="例如：预计30人、金级赞助"
              rows={2}
              maxLength={200}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="金额 (RM)"
                rules={[{ required: true, message: '请输入金额' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expectedDate"
                label="预计日期"
                rules={[{ required: true, message: '请选择日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD-MMM-YYYY"
                  placeholder="选择日期"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="status" label="状态">
            <Select>
              <Option value="planned">计划中</Option>
              <Option value="pending-approval">待审批</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

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

