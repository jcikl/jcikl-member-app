/**
 * Bulk Financial Input Form Component
 * 批量财务记录输入表单组件
 * 
 * 用于活动账户页面的左侧卡片
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  message,
  Divider,
  DatePicker,
  Typography,
  Select,
  Badge,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ClearOutlined,
  RiseOutlined,
  FallOutlined,
  EditOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalDateService } from '@/config/globalDateSettings';
import dayjs from 'dayjs';
import './BulkFinancialInput.css';

// Available icons for categories
const AVAILABLE_ICONS = [
  '🎫', '🤝', '💼', '🎁', '📦', '🏢', '🍽️', '📢', '🚗', '📋',
  '💰', '💳', '🏦', '📊', '📈', '📉', '🎯', '⭐', '🔥', '💡'
];

// Predefined category options
const DEFAULT_INCOME_CATEGORIES = [
  { label: 'Ticket', value: 'ticket', icon: '🎫' },
  { label: 'Sponsors', value: 'sponsors', icon: '🤝' },
  { label: 'Grant', value: 'grant', icon: '💼' },
  { label: 'Donation', value: 'donation', icon: '🎁' },
  { label: 'Other', value: 'other', icon: '📦' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { label: 'Venue', value: 'venue', icon: '🏢' },
  { label: 'F&B', value: 'fnb', icon: '🍽️' },
  { label: 'Marketing', value: 'marketing', icon: '📢' },
  { label: 'Transportation', value: 'transportation', icon: '🚗' },
  { label: 'Misc', value: 'misc', icon: '📋' },
];

interface BulkInputRow {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  remark: string;
  amount: number;
  paymentDate: string;
}

interface BulkFinancialInputProps {
  onSave: (records: BulkInputRow[]) => Promise<void>;
  loading?: boolean;
}

const BulkFinancialInput: React.FC<BulkFinancialInputProps> = ({
  onSave,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [incomeRows, setIncomeRows] = useState<BulkInputRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<BulkInputRow[]>([]);
  const [incomeCategories, setIncomeCategories] = useState(DEFAULT_INCOME_CATEGORIES);
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  
  // 🆕 Global setting states (统一设定状态)
  const [globalType, setGlobalType] = useState<'income' | 'expense' | null>(null);
  const [globalCategory, setGlobalCategory] = useState<string>('');
  
  // Modal states
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [editCategoryModalVisible, setEditCategoryModalVisible] = useState(false);
  const [currentEditCategory, setCurrentEditCategory] = useState<{type: 'income' | 'expense', category: any} | null>(null);
  const [modalForm] = Form.useForm();

  // Initialize with 3 empty rows for each type
  useEffect(() => {
    const initialIncomeRows = Array.from({ length: 3 }, (_, index) => ({
      id: `income-${index + 1}`,
      type: 'income' as const,
      category: incomeCategories[0].value,
      description: '',
      remark: '',
      amount: 0,
      paymentDate: globalDateService.formatDate(new Date(), 'api'),
    }));
    
    const initialExpenseRows = Array.from({ length: 3 }, (_, index) => ({
      id: `expense-${index + 1}`,
      type: 'expense' as const,
      category: expenseCategories[0].value,
      description: '',
      remark: '',
      amount: 0,
      paymentDate: globalDateService.formatDate(new Date(), 'api'),
    }));
    
    setIncomeRows(initialIncomeRows);
    setExpenseRows(initialExpenseRows);
  }, [incomeCategories, expenseCategories]);

  // Calculate total amounts when rows change
  useEffect(() => {
    const incomeTotal = incomeRows.reduce((sum, row) => sum + (row.amount || 0), 0);
    const expenseTotal = expenseRows.reduce((sum, row) => sum + (row.amount || 0), 0);
    setTotalIncome(incomeTotal);
    setTotalExpense(expenseTotal);
  }, [incomeRows, expenseRows]);

  const handleAddRow = (type: 'income' | 'expense', category?: string) => {
    const categories = type === 'income' ? incomeCategories : expenseCategories;
    const defaultCategory = category || categories[0].value;
      
    const newRow: BulkInputRow = {
      id: `${type}-${Date.now()}`,
      type,
      category: defaultCategory,
      description: '',
      remark: '',
      amount: 0,
      paymentDate: globalDateService.formatDate(new Date(), 'api'),
    };
    
    if (type === 'income') {
      setIncomeRows([...incomeRows, newRow]);
    } else {
      setExpenseRows([...expenseRows, newRow]);
    }
  };

  const handleRemoveRow = (rowId: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      if (incomeRows.length > 1) {
        setIncomeRows(incomeRows.filter(row => row.id !== rowId));
      } else {
        message.warning('至少需要保留一行');
      }
    } else {
      if (expenseRows.length > 1) {
        setExpenseRows(expenseRows.filter(row => row.id !== rowId));
      } else {
        message.warning('至少需要保留一行');
      }
    }
  };

  const handleClearAll = () => {
    setIncomeRows(incomeRows.map(row => ({
      ...row,
      category: row.category || incomeCategories[0].value,
      description: '',
      remark: '',
      amount: 0,
      paymentDate: globalDateService.formatDate(new Date(), 'api'),
    })));
    
    setExpenseRows(expenseRows.map(row => ({
      ...row,
      category: row.category || expenseCategories[0].value,
      description: '',
      remark: '',
      amount: 0,
      paymentDate: globalDateService.formatDate(new Date(), 'api'),
    })));
    
    form.resetFields();
  };

  const handleFieldChange = (rowId: string, field: keyof BulkInputRow, value: any, type: 'income' | 'expense') => {
    if (type === 'income') {
      setIncomeRows(incomeRows.map(row => 
        row.id === rowId ? { ...row, [field]: value } : row
      ));
    } else {
      setExpenseRows(expenseRows.map(row => 
        row.id === rowId ? { ...row, [field]: value } : row
      ));
    }
  };

  const handleSave = async () => {
    try {
      // Combine and validate rows
      const allRows = [...incomeRows, ...expenseRows];
      const validRows = allRows.filter(row => 
        row.description.trim() && row.amount > 0
      );

      if (validRows.length === 0) {
        message.error('请至少输入一条有效的财务记录');
        return;
      }

      await onSave(validRows);
      
      // Clear form after successful save
      handleClearAll();
      message.success(`成功保存 ${validRows.length} 条财务记录`);
      
    } catch (error: any) {
      message.error('保存失败，请重试');
      globalSystemService.log(
        'error',
        'Failed to save bulk financial records',
        'BulkFinancialInput.handleSave',
        { error: error.message }
      );
    }
  };

  const validateRow = (row: BulkInputRow) => {
    return row.description.trim() && row.amount > 0;
  };

  // Category management functions
  const handleAddCategory = (type: 'income' | 'expense') => {
    setCurrentEditCategory({ type, category: null });
    setAddCategoryModalVisible(true);
    modalForm.resetFields();
  };

  const handleEditCategory = (type: 'income' | 'expense', category: any) => {
    setCurrentEditCategory({ type, category });
    setEditCategoryModalVisible(true);
    modalForm.setFieldsValue({
      label: category.label,
      icon: category.icon,
    });
  };

  const handleSaveCategory = async () => {
    try {
      const values = await modalForm.validateFields();
      const { type, category } = currentEditCategory!;

      if (addCategoryModalVisible) {
        // Add new category
        const newCategory = {
          label: values.label,
          value: values.label.toLowerCase().replace(/\s+/g, '_'),
          icon: values.icon,
        };

        if (type === 'income') {
          setIncomeCategories([...incomeCategories, newCategory]);
          // Add a new row with this category
          handleAddRow('income', newCategory.value);
        } else {
          setExpenseCategories([...expenseCategories, newCategory]);
          // Add a new row with this category
          handleAddRow('expense', newCategory.value);
        }
        
        message.success('类别添加成功');
      } else {
        // Edit existing category
        const updatedCategory = {
          ...category,
          label: values.label,
          icon: values.icon,
        };

        if (type === 'income') {
          const newCategories = incomeCategories.map(cat => 
            cat.value === category.value ? updatedCategory : cat
          );
          setIncomeCategories(newCategories);
          
          // Update all rows with this category
          setIncomeRows(incomeRows.map(row => 
            row.category === category.value 
              ? { ...row, category: updatedCategory.value }
              : row
          ));
        } else {
          const newCategories = expenseCategories.map(cat => 
            cat.value === category.value ? updatedCategory : cat
          );
          setExpenseCategories(newCategories);
          
          // Update all rows with this category
          setExpenseRows(expenseRows.map(row => 
            row.category === category.value 
              ? { ...row, category: updatedCategory.value }
              : row
          ));
        }
        
        message.success('类别更新成功');
      }

      setAddCategoryModalVisible(false);
      setEditCategoryModalVisible(false);
      setCurrentEditCategory(null);
      modalForm.resetFields();
    } catch (error) {
      console.error('Save category error:', error);
    }
  };

  // 🆕 Handle apply global category to all records
  const handleApplyGlobalCategory = () => {
    if (!globalType || !globalCategory) {
      message.warning('请先选择类型和类别');
      return;
    }

    const categoryLabel = getCategoryLabel(globalCategory, globalType).label;
    
    if (globalType === 'income') {
      setIncomeRows(incomeRows.map(row => ({
        ...row,
        category: globalCategory,
      })));
      message.success(`已为 ${incomeRows.length} 条收入记录设定类别: ${categoryLabel}`);
    } else {
      setExpenseRows(expenseRows.map(row => ({
        ...row,
        category: globalCategory,
      })));
      message.success(`已为 ${expenseRows.length} 条支出记录设定类别: ${categoryLabel}`);
    }
    
    // Clear global setting
    setGlobalType(null);
    setGlobalCategory('');
  };

  // 🆕 Handle clear global setting
  const handleClearGlobalSetting = () => {
    setGlobalType(null);
    setGlobalCategory('');
    message.info('已清除统一设定');
  };

  // Group rows by category
  const groupedIncomeRows = useMemo(() => {
    const grouped: Record<string, BulkInputRow[]> = {};
    incomeRows.forEach(row => {
      if (!grouped[row.category]) {
        grouped[row.category] = [];
      }
      grouped[row.category].push(row);
    });
    return grouped;
  }, [incomeRows]);

  const groupedExpenseRows = useMemo(() => {
    const grouped: Record<string, BulkInputRow[]> = {};
    expenseRows.forEach(row => {
      if (!grouped[row.category]) {
        grouped[row.category] = [];
      }
      grouped[row.category].push(row);
    });
    return grouped;
  }, [expenseRows]);

  // Calculate category subtotals
  const getCategorySubtotal = (rows: BulkInputRow[]) => {
    return rows.reduce((sum, row) => sum + (row.amount || 0), 0);
  };

  const getCategoryLabel = (categoryValue: string, type: 'income' | 'expense') => {
    const categories = type === 'income' ? incomeCategories : expenseCategories;
    const category = categories.find(c => c.value === categoryValue);
    return category || { label: categoryValue, icon: '📦', value: categoryValue };
  };
  
  const renderRowsSection = (rows: BulkInputRow[], type: 'income' | 'expense', startSn: number) => {
    return rows.map((row, index) => (
      <div key={row.id} className="bulk-input-row" style={{ marginBottom: '2px' }}>
        <Row gutter={4} align="middle">
          <Col span={2}>
            <div className="row-number">{startSn + index}</div>
          </Col>
          <Col span={7}>
            <Input
              placeholder="输入描述"
              value={row.description}
              onChange={(e) => handleFieldChange(row.id, 'description', e.target.value, type)}
              maxLength={50}
              size="small"
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="备注"
              value={row.remark}
              onChange={(e) => handleFieldChange(row.id, 'remark', e.target.value, type)}
              maxLength={100}
              size="small"
            />
          </Col>
          <Col span={5}>
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              min={0}
              precision={2}
              prefix="RM"
              value={row.amount}
              onChange={(value) => handleFieldChange(row.id, 'amount', value || 0, type)}
              size="small"
            />
          </Col>
          <Col span={5}>
            <DatePicker
              style={{ width: '100%' }}
              format="DD-MMM-YYYY"
              value={row.paymentDate ? dayjs(row.paymentDate) : null}
              onChange={(date) => handleFieldChange(row.id, 'paymentDate', 
                date ? globalDateService.formatDate(date.toDate(), 'api') : '', type
              )}
              placeholder="选择日期"
              size="small"
            />
          </Col>
          <Col span={1}>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveRow(row.id, type)}
              disabled={rows.length === 1}
              size="small"
            />
          </Col>
        </Row>
      </div>
    ));
  };

  // Render grouped rows by category
  const renderGroupedSection = (
    groupedRows: Record<string, BulkInputRow[]>,
    type: 'income' | 'expense'
  ) => {
    let currentSn = 1;
    const allRowsBeforeThis = type === 'income' ? 0 : incomeRows.length;
    
    return Object.entries(groupedRows).map(([category, rows]) => {
      const categoryInfo = getCategoryLabel(category, type);
      const subtotal = getCategorySubtotal(rows);
      const startSn = allRowsBeforeThis + currentSn;
      const sectionRows = renderRowsSection(rows, type, startSn);
      currentSn += rows.length;
      
      return (
        <div key={category} className="category-group" style={{ marginBottom: '8px' }}>
          {/* Category Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '4px 8px',
            background: type === 'income' ? '#f6ffed' : '#fff1f0',
            borderRadius: '3px',
            border: `1px solid ${type === 'income' ? '#b7eb8f' : '#ffa39e'}`,
            marginBottom: '4px'
          }}>
            <Space size="small">
              <span style={{ fontSize: '14px' }}>{categoryInfo.icon}</span>
              <Text strong style={{ fontSize: '13px' }}>
                {categoryInfo.label}
              </Text>
              <Button
                icon={<EditOutlined />}
                onClick={() => handleEditCategory(type, categoryInfo)}
                size="small"
                type="link"
                style={{ color: type === 'income' ? '#52c41a' : '#ff4d4f' }}
              >
                编辑
              </Button>
              <Badge 
                count={rows.length} 
                style={{ backgroundColor: type === 'income' ? '#52c41a' : '#ff4d4f' }}
              />
            </Space>
            <Space size="small">
              <Text type="secondary" style={{ fontSize: '11px' }}>小计:</Text>
              <Text strong style={{ 
                color: type === 'income' ? '#52c41a' : '#ff4d4f',
                fontSize: '13px'
              }}>
                RM {subtotal.toFixed(2)}
              </Text>
              <Button
                icon={<PlusOutlined />}
                onClick={() => handleAddRow(type, category)}
                size="small"
                type="link"
                style={{ color: type === 'income' ? '#52c41a' : '#ff4d4f' }}
              >
                添加
              </Button>
            </Space>
          </div>
          
          {/* Category Rows */}
          <div className="category-rows">
            {sectionRows}
          </div>
        </div>
      );
    });
  };

  const totalValidRecords = [...incomeRows, ...expenseRows].filter(validateRow).length;
  const totalRecords = incomeRows.length + expenseRows.length;

  return (
    <Card
      title={
        <Space>
          <span>📝 批量输入财务记录</span>
        </Space>
      }
      className="bulk-financial-input-card"
      extra={
        <Space>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClearAll}
            size="small"
            danger
          >
            清空全部
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        {/* 🆕 Global Setting Bar */}
        <Card 
          size="small" 
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            marginBottom: 16 
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong style={{ color: 'white' }}>
              🔹 统一设定 (一键应用到下方所有记录)
            </Text>
            <Space wrap style={{ width: '100%' }}>
              <Select
                placeholder="选择类型"
                style={{ width: 120, background: 'white' }}
                value={globalType}
                onChange={setGlobalType}
              >
                <Select.Option value="income">📈 收入</Select.Option>
                <Select.Option value="expense">📉 支出</Select.Option>
              </Select>
              
              <Select
                placeholder="选择类别"
                style={{ minWidth: 150, background: 'white' }}
                value={globalCategory}
                onChange={setGlobalCategory}
                disabled={!globalType}
                options={
                  globalType === 'income' 
                    ? incomeCategories.map(cat => ({ 
                        label: `${cat.icon} ${cat.label}`, 
                        value: cat.value 
                      }))
                    : globalType === 'expense'
                      ? expenseCategories.map(cat => ({ 
                          label: `${cat.icon} ${cat.label}`, 
                          value: cat.value 
                        }))
                      : []
                }
              />
              
              <Button 
                type="primary"
                onClick={handleApplyGlobalCategory}
                disabled={!globalType || !globalCategory}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                ✓ 应用到全部记录
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
        </Card>

        {/* Table Header */}
        <div className="bulk-input-header">
          <Row gutter={4}>
            <Col span={2}><strong>Sn</strong></Col>
            <Col span={7}><strong>Description</strong></Col>
            <Col span={4}><strong>Remark</strong></Col>
            <Col span={5}><strong>Amount</strong></Col>
            <Col span={5}><strong>Payment Date</strong></Col>
            <Col span={1}><strong>操作</strong></Col>
          </Row>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        {/* Incomes Section */}
        <div className="income-section">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '6px',
            padding: '6px 10px',
            background: '#f0f9ff',
            borderRadius: '4px',
            border: '1px solid #91d5ff'
          }}>
            <Space size="small">
              <RiseOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
              <Text strong style={{ color: '#52c41a', fontSize: '13px' }}>
                Incomes (收入)
              </Text>
              <Badge 
                count={Object.keys(groupedIncomeRows).length} 
                showZero
                style={{ backgroundColor: '#52c41a' }}
                title="类别数量"
              />
            </Space>
            <Button
              icon={<FolderAddOutlined />}
              onClick={() => handleAddCategory('income')}
              size="small"
              type="primary"
              ghost
              style={{ color: '#52c41a', borderColor: '#52c41a' }}
            >
              添加类别
            </Button>
          </div>
          <div className="bulk-input-rows">
            {renderGroupedSection(groupedIncomeRows, 'income')}
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Expenses Section */}
        <div className="expense-section">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '6px',
            padding: '6px 10px',
            background: '#fff1f0',
            borderRadius: '4px',
            border: '1px solid #ffa39e'
          }}>
            <Space size="small">
              <FallOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
              <Text strong style={{ color: '#ff4d4f', fontSize: '13px' }}>
                Expenses (支出)
              </Text>
              <Badge 
                count={Object.keys(groupedExpenseRows).length} 
                showZero
                style={{ backgroundColor: '#ff4d4f' }}
                title="类别数量"
              />
            </Space>
            <Button
              icon={<FolderAddOutlined />}
              onClick={() => handleAddCategory('expense')}
              size="small"
              type="primary"
              ghost
              style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
            >
              添加类别
            </Button>
          </div>
          <div className="bulk-input-rows">
            {renderGroupedSection(groupedExpenseRows, 'expense')}
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Summary and Actions */}
        <Row gutter={8} align="middle">
          <Col span={16}>
            <Row gutter={8}>
              <Col span={8}>
                <Statistic
                  title="收入小计"
                  value={totalIncome}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ 
                    color: '#52c41a',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="支出小计"
                  value={totalExpense}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ 
                    color: '#ff4d4f',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="净额"
                  value={totalIncome - totalExpense}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ 
                    color: totalIncome - totalExpense >= 0 ? '#52c41a' : '#ff4d4f',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                />
              </Col>
            </Row>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
                disabled={totalValidRecords === 0}
                size="middle"
              >
                保存全部
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Validation Summary */}
        <div className="validation-summary">
          <Row gutter={8}>
            <Col span={24}>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                有效记录: {totalValidRecords} / {totalRecords} 条 |
                收入类别: {Object.keys(groupedIncomeRows).length} |
                支出类别: {Object.keys(groupedExpenseRows).length}
                {totalValidRecords === 0 && (
                  <span style={{ color: '#ff4d4f', marginLeft: '6px' }}>
                    (至少需要一条有效记录)
                  </span>
                )}
              </div>
            </Col>
          </Row>
        </div>
      </Form>

      {/* Add/Edit Category Modal */}
      <Modal
        title={addCategoryModalVisible ? '添加类别' : '编辑类别'}
        open={addCategoryModalVisible || editCategoryModalVisible}
        onOk={handleSaveCategory}
        onCancel={() => {
          setAddCategoryModalVisible(false);
          setEditCategoryModalVisible(false);
          setCurrentEditCategory(null);
          modalForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item
            name="label"
            label="类别名称"
            rules={[{ required: true, message: '请输入类别名称' }]}
          >
            <Input placeholder="输入类别名称" />
          </Form.Item>
          
          <Form.Item
            name="icon"
            label="选择图标"
            rules={[{ required: true, message: '请选择图标' }]}
          >
            <Select placeholder="选择图标" style={{ width: '100%' }}>
              {AVAILABLE_ICONS.map(icon => (
                <Select.Option key={icon} value={icon}>
                  {icon} {icon}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default BulkFinancialInput;
