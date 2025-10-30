/**
 * Activity Financial Plan Component
 * 活动财务计划组件
 * 
 * 允许活动筹委自主管理活动财务预测(CRUD）
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  RiseOutlined,
  FallOutlined,
  ImportOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { batchAddEventAccountPlans } from '@/modules/event/services/eventAccountPlanService';
import { useAuthStore } from '@/stores/authStore';
import { Progress } from 'antd';
import './ActivityFinancialPlan.css';

const { Option } = Select;
const { Text } = Typography;

export interface FinancialPlanItem {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  remark?: string;
  amount: number;
  status?: 'pending' | 'completed' | 'cancelled'; // 🆕 可选的状态字段(用于活动账目记录）
  transactionDate?: string; // 🆕 交易日期(用于活动账目记录）
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

interface Props {
  accountId?: string;
  items: FinancialPlanItem[];
  additionalItems?: FinancialPlanItem[]; // 🆕 额外数据源(用于继承其他标签页的类别）
  // 🆕 只读模式(隐藏编辑和批量粘贴等改动类控件）
  readOnly?: boolean;
  // 🆕 对账状态映射(可选）：用于在列表中展示"已核对/未核对"标签
  reconciliationMap?: Record<string, 'matched' | 'unmatched'>;
  // 🆕 匹配的银行交易记录映射(可选）：显示已核对的银行交易详情
  matchedBankTransactions?: Record<string, {
    id: string;
    transactionDate: string;
    description: string;
    amount: number;
    bankAccount?: string;
    bankAccountName?: string;
  }>;
  // 🆕 核对操作函数(可选）
  onReconcile?: (txId: string) => void;
  onCancelReconcile?: (txId: string) => void;
  onAutoReconcile?: () => Promise<void>; // 🆕 自动核对函数
  loading?: boolean;
  onAdd: (item: Omit<FinancialPlanItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<FinancialPlanItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const ActivityFinancialPlan: React.FC<Props> = ({
  accountId: _accountId,
  items,
  additionalItems = [], // 🆕 默认空数组
  readOnly = false,
  reconciliationMap,
  matchedBankTransactions,
  onReconcile,
  onCancelReconcile,
  onAutoReconcile,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [quickAddCategory, setQuickAddCategory] = useState<{income?: string; expense?: string}>({});
  const [editedItems, setEditedItems] = useState<Map<string, Partial<FinancialPlanItem>>>(new Map());
  
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
    transactionDate?: string;
  }>>([]);
  
  // 🆕 Global setting for bulk import (批量导入统一设定)
  const [globalType, setGlobalType] = useState<'income' | 'expense' | null>(null);
  const [globalCategory, setGlobalCategory] = useState<string>('');
  
  // 🆕 从当前活动获取已存在的类别(合并当前数据和额外数据源）
  const getExistingCategories = (type: 'income' | 'expense') => {
    // 合并 items 和 additionalItems
    const allItems = [...items, ...additionalItems];
    const categories = allItems
      .filter(item => item.type === type)
      .map(item => item.category)
      .filter((cat, index, self) => self.indexOf(cat) === index) // 去重
      .sort();
    return categories;
  };
  
  // 🆕 当前可用的类别(根据选中的类型）
  const availableCategories = globalType ? getExistingCategories(globalType) : [];
  
  // 🆕 获取编辑模式下的可用类别(根据记录类型）
  const getCategoryOptions = (type: 'income' | 'expense') => {
    return getExistingCategories(type);
  };
  
  // 🆕 Import status (导入状态)
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const tableConfig = globalComponentService.getTableConfig();
  
  // 🆕 页面离开保护
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isImporting) {
        e.preventDefault();
        e.returnValue = '导入正在进行中，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isImporting]);

  // 统计数据
  const incomeItems = items.filter(item => item.type === 'income');
  const expenseItems = items.filter(item => item.type === 'expense');
  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // 获取类别标签
  const getCategoryLabel = (type: 'income' | 'expense', value: string) => {
    // 🆕 直接返回类别值(用户可自由输入类别）
    return value;
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
      const cat = item.category || 'Uncategorized';
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
      const cat = item.category || 'Uncategorized';
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
  
  // 获取编辑的值(如果有编辑过）
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
  
  // 批量粘贴解析(从文本转为表格数据）
  const parseBulkPasteText = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    const items = lines.map((line, index) => {
      const parts = line.split('\t').map(p => p.trim());
      
      return {
        key: `bulk-${Date.now()}-${index}`,
        type: 'income' as const,
        category: 'Uncategorized', // 🆕 默认类别：未分类(用户可自由修改）
        description: parts[0] || '',
          remark: parts[1] || '',
          amount: parseFloat(parts[2]) || 0,
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
    setBulkPasteData([
      ...bulkPasteData,
      {
        key: `bulk-${Date.now()}`,
        type: 'income',
        category: 'Uncategorized', // 🆕 默认类别
        description: '',
        remark: '',
        amount: 0,
      }
    ]);
  };
  
  // 删除行
  const handleDeleteBulkRow = (key: string) => {
    setBulkPasteData(bulkPasteData.filter(item => item.key !== key));
  };
  
  // 🆕 应用到全部记录
  const handleApplyGlobalCategory = () => {
    if (!globalType || !globalCategory) {
      message.warning('请先选择类型和类别');
      return;
    }

    setBulkPasteData(bulkPasteData.map(item => ({
      ...item,
      type: globalType!,
      category: globalCategory,
    })));

    message.success(`已为 ${bulkPasteData.length} 条记录设定类型和类别: ${globalType === 'income' ? '收入' : '支出'} - ${globalCategory}`);
    
    // Clear global setting
    setGlobalType(null);
    setGlobalCategory('');
  };

  // 🆕 清除统一设定
  const handleClearGlobalSetting = () => {
    setGlobalType(null);
    setGlobalCategory('');
    message.info('已清除统一设定');
  };
  
  // 更新表格数据
  const handleBulkDataChange = (key: string, field: string, value: any) => {
    setBulkPasteData(bulkPasteData.map(item => 
      item.key === key ? { ...item, [field]: value } : item
    ));
  };
  
  // 打开批量导入模态框
  const handleOpenBulkImport = () => {
    setBulkPasteVisible(true);
    // 自动添加第一行
    setBulkPasteData([{
      key: `bulk-${Date.now()}`,
      type: 'income',
      category: 'Uncategorized', // 🆕 默认类别
      description: '',
      remark: '',
      amount: 0,
      transactionDate: dayjs().format('YYYY-MM-DD'),
    }]);
  };
  
  // 🆕 取消导入
  const handleCancelImport = () => {
    if (isImporting) {
      Modal.confirm({
        title: '确认取消',
        content: '导入正在进行中，确定要取消吗？',
        onOk: () => {
          setIsImporting(false);
          setImportProgress(0);
          message.info('已取消导入');
        },
      });
    } else {
      setBulkPasteVisible(false);
      setBulkPasteData([]);
    }
  };
  
  // 批量粘贴提交 (优化版)
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
        message.error(`有 ${invalidRows.length} 行数据不完整(描述和金额必填且金额需大于0）`);
        return;
      }
      
      // 开始导入
      setIsImporting(true);
      setImportProgress(0);
      
      // 准备批量导入数据
      const itemsToAdd = bulkPasteData.map(item => ({
          type: item.type,
          category: item.category,
          description: item.description,
          remark: item.remark,
          amount: item.amount,
      }));
      
      // 获取用户信息
      const { user } = useAuthStore.getState();
      const userId = user?.id || 'system';
      
      // 🚀 批量导入 - 一次性写入 (快)
      await batchAddEventAccountPlans(_accountId!, itemsToAdd, userId);
      
      // 模拟进度更新
      setImportProgress(100);
      
      message.success(`成功导入 ${bulkPasteData.length} 条记录`);
      
      setBulkPasteVisible(false);
      setBulkPasteData([]);
      await onRefresh();
    } catch (error) {
      message.error('导入失败');
      console.error(error);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // 保存所有编辑并退出编辑模式
  const handleSaveAndExitEdit = async () => {
    try {
      // 🆕 过滤掉虚拟的类别标题行(key包含 -cat- 或 -pending 的记录）
      const realEditedItems = Array.from(editedItems.entries()).filter(([id]) => {
        // 真实项目的id应该是有效的Firestore文档ID(不包含 -cat- 或 -pending）
        return id && !id.includes('-cat-') && !id.includes('-pending');
      });
      
      // 批量保存所有真实编辑的项目
      for (const [id, changes] of realEditedItems) {
        if (Object.keys(changes).length > 0) {
          await onUpdate(id, changes);
        }
      }
      
      if (realEditedItems.length > 0) {
        message.success(`成功保存 ${realEditedItems.length} 个项目的更改`);
      }
      
      // 退出编辑模式
      setEditMode(false);
      setEditedItems(new Map());
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 在类型下快速添加(仅需选择类别）
  const handleQuickAddInType = async (type: 'income' | 'expense', category: string) => {
    try {
      const itemData = {
        type: type,
        category: category,
        description: `新${type === 'income' ? '收入' : '支出'}项目`,
        remark: '',
        amount: 0,
      };

      await onAdd(itemData as any);
      message.success('快速创建成功，请点击编辑完善信息');
      await onRefresh();
    } catch (error) {
      console.error('快速添加失败:', error);
      message.error('添加失败');
    }
  };

  // 在特定类别下添加项目(从类别行的添加按钮）
  const handleAddItemInCategory = async (type: 'income' | 'expense', category: string) => {
    try {
      const itemData = {
        type: type,
        category: category,
        description: `新${type === 'income' ? '收入' : '支出'}项目`,
        remark: '',
        amount: 0,
      };

        await onAdd(itemData as any);
      message.success('快速创建成功，请点击编辑完善信息');
      await onRefresh();
    } catch (error) {
      console.error('添加失败:', error);
      message.error('添加失败');
    }
  };

  // 删除整个类别及其下的所有项目(优化版 - 使用 Promise.all 并行删除）
  const handleDeleteCategory = async (type: 'income' | 'expense', category: string) => {
    const categoryItems = items.filter(item => item.type === type && item.category === category);
    
    if (categoryItems.length === 0) return;
    
    try {
      // 🚀 性能优化：使用 Promise.all 并行删除，而不是顺序执行
      await Promise.all(categoryItems.map(item => onDelete(item.id)));
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

  // 分组表格列定义(按指定顺序：项目/类别>备注>金额>状态>已匹配银行交易）
  const columns: ColumnsType<GroupedRow> = [
    {
      title: '项目/类别',
      dataIndex: 'description',
      width: '20%',
      render: (_: unknown, record: GroupedRow) => {
        // 类别标题行 (Ticketing, Sponsor, etc.)
        if (record.isCategoryHeader) {
          return (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontWeight: 600, 
              fontSize: '14px',
              color: '#595959'
            }}>
              {editMode && !record.isCategoryHeader ? null : (
                <>
                  {editMode ? (
                    <Select
                      mode="tags"
                      showSearch
                      size="small"
                      value={
                        // 🆕 从该类别下的第一个项目获取已编辑的类别名称
                        (() => {
                          const categoryItems = items.filter(i => i.type === record.type && i.category === record.category);
                          if (categoryItems.length > 0 && categoryItems[0].id) {
                            const editedCategory = getEditedValue(categoryItems[0].id, 'category');
                            if (editedCategory !== undefined) return [editedCategory];
                          }
                          return record.category ? [record.category] : [];
                        })()
                      }
                      onChange={(values) => {
                        // 只允许一个类别，取最后一个值
                        const newCategory = values[values.length - 1] || '';
                        
                        // 获取该类别下的所有项目
                        const categoryItems = items.filter(i => i.type === record.type && i.category === record.category);
                        
                        // 更新每个项目的类别(只更新真实项目，不更新虚拟的类别标题行）
                        categoryItems.forEach(item => {
                          handleFieldChange(item.id, 'category', newCategory);
                        });
                      }}
                      placeholder="选择已有类别或创建新类别"
                      style={{ flex: 1, fontWeight: 600 }}
                      filterOption={(input, option) => {
                        const label = String(option?.children || option?.value || '');
                        return label.toLowerCase().includes(input.toLowerCase());
                      }}
                      maxTagCount={1}
                      tokenSeparators={[]}
                      allowClear={false}
                      disabled={!record.type}
                    >
                      {record.type && getCategoryOptions(record.type).map(cat => (
                        <Option key={cat} value={cat}>
                          {cat}
                        </Option>
                      ))}
                    </Select>
                  ) : (
              <div>{record.categoryLabel}</div>
                  )}
                </>
              )}
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
      title: '备注',
      dataIndex: 'remark',
      width: '13%',
      render: (text: string, record: GroupedRow) => {
        // 只在项目行显示备注
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        // 编辑模式 - 备注输入框
        if (editMode) {
          const currentRemark = getEditedValue(record.id!, 'remark') ?? record.remark;
          
          return (
              <Input
                size="small"
                value={currentRemark}
                onChange={(e) => handleFieldChange(record.id!, 'remark', e.target.value)}
                placeholder="备注"
            />
          );
        }
        
        return (
          <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
              {text || '-'}
            </span>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: '10%',
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
      title: '日期',
      dataIndex: 'transactionDate',
      width: '8%',
      render: (date: string, record: GroupedRow) => {
        // 只在项目行显示日期
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        if (!date || date.trim() === '') {
          return <span style={{ color: '#d9d9d9', fontSize: '13px' }}>-</span>;
        }
        
        return (
          <span style={{ fontSize: '13px', color: '#262626' }}>
            {globalDateService.formatDate(date, 'display')}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: '8%',
      render: (_: unknown, record: GroupedRow) => {
        // 只在项目行显示状态
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        // 🆕 合并的交易状态 + 对账状态标签
        const recordStatus = (record as any).status;
        const reconcileState = record.id && reconciliationMap ? reconciliationMap[record.id] : undefined;
        
        // 合并状态逻辑
        let combinedStatus: { label: string; color: string } | null = null;
        if (recordStatus) {
          if (recordStatus === 'pending' && reconcileState === 'unmatched') {
            combinedStatus = { label: '待处理', color: 'red' };
          } else if (recordStatus === 'pending' && (reconcileState === 'matched' || !reconcileState)) {
            combinedStatus = { label: '待处理', color: 'orange' };
          } else if (recordStatus === 'completed' && reconcileState === 'unmatched') {
            combinedStatus = { label: '待核对', color: 'orange' };
          } else if (recordStatus === 'completed' && reconcileState === 'matched') {
            combinedStatus = { label: '已核对', color: 'green' };
          } else if (recordStatus === 'completed') {
            combinedStatus = { label: '已完成', color: 'green' };
          } else if (recordStatus === 'cancelled') {
            combinedStatus = { label: '已取消', color: 'default' };
          }
        }
        
        // 🆕 核对操作按钮(仅当有核对函数时显示）
        // 判断是否有手动核对：通过 matchedBankTransactions 检查
        const hasManualReconcile = matchedBankTransactions && record.id && matchedBankTransactions[record.id];
        
        const reconcileActions = onReconcile && record.id ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {combinedStatus && (
              <Tag color={combinedStatus.color as any} style={{ fontSize: '11px', margin: 0 }}>
                {combinedStatus.label}
              </Tag>
            )}
            {hasManualReconcile ? (
              // 🆕 手动核对：显示"取消核对"按钮
              <Button
                type="link"
              size="small"
                danger
                onClick={() => onCancelReconcile?.(record.id!)}
                style={{ padding: 0, fontSize: '11px', height: 'auto', lineHeight: '1' }}
              >
                取消核对
              </Button>
            ) : (
              // 🆕 未手动核对：显示"核对"按钮
              <Button
                type="link"
                size="small"
                onClick={() => onReconcile?.(record.id!)}
                style={{ padding: 0, fontSize: '11px', height: 'auto', lineHeight: '1' }}
              >
                核对
              </Button>
            )}
          </div>
        ) : (
          combinedStatus ? (
            <Tag color={combinedStatus.color as any} style={{ fontSize: '11px' }}>
              {combinedStatus.label}
            </Tag>
          ) : null
        );

        return reconcileActions;
      },
    },
    {
      title: '已匹配银行交易',
      dataIndex: 'matchedBankTransaction',
      width: '20%',
      render: (_: unknown, record: GroupedRow) => {
        // 只在项目行显示
        if (record.isTypeHeader || record.isCategoryHeader) return null;
        
        // 如果没有提供 matchedBankTransactions，返回 null
        if (!matchedBankTransactions || !record.id) return null;
        
        const matchedBankTx = matchedBankTransactions[record.id];
        
        if (!matchedBankTx) {
          return (
            <span style={{ color: '#d9d9d9', fontSize: '12px' }}>
              无匹配记录
            </span>
          );
        }
        
        return (
          <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
            <div style={{ fontWeight: 500, color: '#262626', marginBottom: '4px' }}>
              {matchedBankTx.description}
            </div>
            <div style={{ color: '#8c8c8c', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>
                {matchedBankTx.transactionDate 
                  ? globalDateService.formatDate(matchedBankTx.transactionDate, 'display')
                  : matchedBankTx.transactionDate}
              </span>
              <span>•</span>
              <span style={{ fontWeight: 500, color: record.type === 'income' ? '#52c41a' : '#ff4d4f' }}>
                RM {matchedBankTx.amount.toFixed(2)}
              </span>
              {matchedBankTx.bankAccountName && (
                <>
                  <span>•</span>
                  <span style={{ color: '#1890ff' }}>{matchedBankTx.bankAccountName}</span>
                </>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  // 🆕 根据模式过滤列：活动账目记录模式显示所有列，活动财务预算模式只显示基本列并调整列宽
  const filteredColumns = useMemo(() => {
    const isEventTransactionMode = !!reconciliationMap;
    
    if (isEventTransactionMode) {
      // 活动账目记录模式：显示所有列
      return columns;
    } else {
      // 活动财务预算模式：只显示基本列(项目/类别、备注、金额），并调整列宽
      return columns.filter(col => {
        const title = (col.title as string) || '';
        return ['项目/类别', '备注', '金额'].includes(title);
      }).map(col => {
        // 调整活动财务预算模式的列宽(只有3列，需要更宽的布局）
        const title = (col.title as string) || '';
        if (title === '项目/类别') {
          return { ...col, width: '50%' }; // 主要信息，需要更多空间
        } else if (title === '备注') {
          return { ...col, width: '35%' }; // 次要信息
        } else if (title === '金额') {
          return { ...col, width: '15%' }; // 金额信息
        }
        return col;
      });
    }
  }, [columns, reconciliationMap]);

  return (
    <Card 
      title="🔮 活动财务预算(Project Budget）"
      extra={
        <Space>
          {!editMode ? (
            <>
          {!readOnly && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setEditMode(true)}
            >
              编辑模式
            </Button>
          )}
          {onAutoReconcile && (
            <Button
              icon={<CheckCircleOutlined />}
              onClick={onAutoReconcile}
              type="dashed"
            >
              自动核对
            </Button>
          )}
          {!readOnly && (
            <Button
              icon={<ImportOutlined />}
              onClick={handleOpenBulkImport}
            >
              批量粘贴
            </Button>
          )}
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
                mode="tags"
                showSearch
                size="small"
                style={{ width: 200 }}
                placeholder="选择类别或创建新类别"
                value={quickAddCategory.income ? [quickAddCategory.income] : []}
                onChange={(values) => {
                  // 只允许一个类别，取最后一个值
                  const category = values[values.length - 1] || '';
                  setQuickAddCategory(prev => ({
                    ...prev,
                    income: category
                  }));
                }}
                filterOption={(input, option) => {
                  const label = String(option?.children || option?.value || '');
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
                maxTagCount={1}
                tokenSeparators={[]}
                allowClear
              >
                {getCategoryOptions('income').map(cat => (
                  <Option key={cat} value={cat}>
                    {cat}
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
          columns={filteredColumns}
          dataSource={incomeData}
          rowKey="key"
                loading={loading}
          pagination={false}
          showHeader={true}
          size="small"
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
                mode="tags"
                showSearch
                size="small"
                style={{ width: 200 }}
                placeholder="选择类别或创建新类别"
                value={quickAddCategory.expense ? [quickAddCategory.expense] : []}
                onChange={(values) => {
                  // 只允许一个类别，取最后一个值
                  const category = values[values.length - 1] || '';
                  setQuickAddCategory(prev => ({
                    ...prev,
                    expense: category
                  }));
                }}
                filterOption={(input, option) => {
                  const label = String(option?.children || option?.value || '');
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
                maxTagCount={1}
                tokenSeparators={[]}
                allowClear
              >
                {getCategoryOptions('expense').map(cat => (
                  <Option key={cat} value={cat}>
                    {cat}
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
          columns={filteredColumns}
          dataSource={expenseData}
          rowKey="key"
          loading={loading}
          pagination={false}
          showHeader={true}
          size="small"
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
        onCancel={handleCancelImport}
        width={1200}
        okText={isImporting ? `导入中... (${bulkPasteData.length})` : `确认导入 (${bulkPasteData.length})`}
        cancelText={isImporting ? '取消导入' : '取消'}
        okButtonProps={{ 
          loading: isImporting,
          disabled: readOnly || bulkPasteData.length === 0 || isImporting 
        }}
        closable={!isImporting}
        maskClosable={!isImporting}
      >
        {/* 🆕 Global Setting Bar */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: 16,
            borderRadius: 6,
            marginBottom: 16 
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Text strong style={{ color: 'white', fontSize: 14 }}>
              🔹 统一设定 (一键应用到下方所有记录)
            </Text>
            <Space wrap style={{ width: '100%' }}>
              <Select
                placeholder="选择类型"
                style={{ width: 120, background: 'white' }}
                value={globalType}
                onChange={(value) => {
                  setGlobalType(value);
                  setGlobalCategory(''); // 切换类型时清空类别
                }}
              >
                <Option value="income">📈 收入</Option>
                <Option value="expense">📉 支出</Option>
              </Select>
              
              <Select
                mode="tags"
                showSearch
                placeholder={availableCategories.length > 0 ? "选择已有类别或创建新类别" : "输入新类别"}
                style={{ minWidth: 200 }}
                value={globalCategory ? [globalCategory] : []}
                onChange={(values) => {
                  // 只允许一个类别，取最后一个值
                  const lastValue = values[values.length - 1] || '';
                  setGlobalCategory(lastValue);
                }}
                disabled={!globalType}
                filterOption={(input, option) => {
                  const label = String(option?.children || option?.value || '');
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
                maxTagCount={1}
                tokenSeparators={[]}
                allowClear
              >
                {availableCategories.map(cat => (
                  <Option key={cat} value={cat}>
                    {cat}
                  </Option>
                ))}
              </Select>
              
              <Button 
                type="primary"
                onClick={handleApplyGlobalCategory}
                disabled={!globalType || !globalCategory || bulkPasteData.length === 0}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                ✓ 应用到全部记录 ({bulkPasteData.length})
              </Button>
              
              <Button 
                danger
                onClick={handleClearGlobalSetting}
                disabled={!globalType && !globalCategory}
                style={{ background: 'white', color: '#ff4d4f' }}
              >
                📝 清除设定
              </Button>
            </Space>
          </Space>
        </div>
        
        {/* 🆕 Import Progress (导入进度显示) */}
        {isImporting && (
          <div style={{ 
            marginBottom: 16, 
            padding: 16, 
            background: '#f0f9ff', 
            borderRadius: 6,
            border: '1px solid #91d5ff'
          }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 14 }}>
                  📊 导入进度
                </Text>
                <Text strong style={{ color: '#1890ff', fontSize: 14 }}>
                  {importProgress} / {bulkPasteData.length}
                </Text>
              </div>
              <Progress 
                percent={Math.round((importProgress / bulkPasteData.length) * 100)} 
                status="active" 
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⚠️ 正在导入... 请勿关闭页面或刷新浏览器
              </Text>
            </Space>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, marginBottom: 4, fontWeight: 600 }}>使用说明：</p>
              <ul style={{ paddingLeft: 20, margin: '4px 0', fontSize: '13px', color: '#666' }}>
                <li>从Excel复制数据后，选中表格任意单元格按 Ctrl+V 粘贴(自动解析）</li>
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
                      <Input
                        size="small"
                        value={category}
                        onChange={(e) => handleBulkDataChange(record.key, 'category', e.target.value)}
                        placeholder="输入类别"
                        style={{ width: '100%' }}
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
        </div>
      </Modal>
    </Card>
  );
};

export default ActivityFinancialPlan;

