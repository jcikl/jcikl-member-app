/**
 * Bulk Financial Input Form Component
 * 批量财务记录输入表单组件
 * 
 * 用于活动账户页面的左侧卡片
 */

import React, { useState, useEffect } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ClearOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalDateService } from '@/config/globalDateSettings';
import dayjs from 'dayjs';
import './BulkFinancialInput.css';

interface BulkInputRow {
  id: string;
  type: 'income' | 'expense';
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
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // Initialize with 3 empty rows for each type
  useEffect(() => {
    const initialIncomeRows = Array.from({ length: 3 }, (_, index) => ({
      id: `income-${index + 1}`,
      type: 'income' as const,
      description: '',
      remark: '',
      amount: 0,
      paymentDate: globalDateService.formatDate(new Date(), 'api'),
    }));
    
    const initialExpenseRows = Array.from({ length: 3 }, (_, index) => ({
      id: `expense-${index + 1}`,
      type: 'expense' as const,
      description: '',
      remark: '',
      amount: 0,
      paymentDate: globalDateService.formatDate(new Date(), 'api'),
    }));
    
    setIncomeRows(initialIncomeRows);
    setExpenseRows(initialExpenseRows);
  }, []);

  // Calculate total amounts when rows change
  useEffect(() => {
    const incomeTotal = incomeRows.reduce((sum, row) => sum + (row.amount || 0), 0);
    const expenseTotal = expenseRows.reduce((sum, row) => sum + (row.amount || 0), 0);
    setTotalIncome(incomeTotal);
    setTotalExpense(expenseTotal);
  }, [incomeRows, expenseRows]);

  const handleAddRow = (type: 'income' | 'expense') => {
    const newRow: BulkInputRow = {
      id: `${type}-${Date.now()}`,
      type,
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
      description: '',
      remark: '',
      amount: 0,
      paymentDate: globalDateService.formatDate(new Date(), 'api'),
    })));
    
    setExpenseRows(expenseRows.map(row => ({
      ...row,
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
  
  const renderRowsSection = (rows: BulkInputRow[], type: 'income' | 'expense', startSn: number) => {
    return rows.map((row, index) => (
      <div key={row.id} className="bulk-input-row">
        <Row gutter={8} align="middle">
          <Col span={2}>
            <div className="row-number">{startSn + index}</div>
          </Col>
          <Col span={6}>
            <Input
              placeholder="输入描述"
              value={row.description}
              onChange={(e) => handleFieldChange(row.id, 'description', e.target.value, type)}
              maxLength={50}
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="备注"
              value={row.remark}
              onChange={(e) => handleFieldChange(row.id, 'remark', e.target.value, type)}
              maxLength={100}
            />
          </Col>
          <Col span={4}>
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              min={0}
              precision={2}
              prefix="RM"
              value={row.amount}
              onChange={(value) => handleFieldChange(row.id, 'amount', value || 0, type)}
            />
          </Col>
          <Col span={6}>
            <DatePicker
              style={{ width: '100%' }}
              format="DD-MMM-YYYY"
              value={row.paymentDate ? dayjs(row.paymentDate) : null}
              onChange={(date) => handleFieldChange(row.id, 'paymentDate', 
                date ? globalDateService.formatDate(date.toDate(), 'api') : '', type
              )}
              placeholder="选择日期"
            />
          </Col>
          <Col span={2}>
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
        {/* Table Header */}
        <div className="bulk-input-header">
          <Row gutter={8}>
            <Col span={2}><strong>Sn</strong></Col>
            <Col span={6}><strong>Description</strong></Col>
            <Col span={4}><strong>Remark</strong></Col>
            <Col span={4}><strong>Amount</strong></Col>
            <Col span={6}><strong>Payment Date</strong></Col>
            <Col span={2}><strong>操作</strong></Col>
          </Row>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Incomes Section */}
        <div className="income-section">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '12px',
            padding: '8px 12px',
            background: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid #91d5ff'
          }}>
            <Space>
              <RiseOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
              <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                Incomes (收入)
              </Text>
            </Space>
            <Button
              icon={<PlusOutlined />}
              onClick={() => handleAddRow('income')}
              size="small"
              type="link"
              style={{ color: '#52c41a' }}
            >
              添加行
            </Button>
          </div>
          <div className="bulk-input-rows">
            {renderRowsSection(incomeRows, 'income', 1)}
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Expenses Section */}
        <div className="expense-section">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '12px',
            padding: '8px 12px',
            background: '#fff1f0',
            borderRadius: '6px',
            border: '1px solid #ffa39e'
          }}>
            <Space>
              <FallOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
              <Text strong style={{ color: '#ff4d4f', fontSize: '14px' }}>
                Expenses (支出)
              </Text>
            </Space>
            <Button
              icon={<PlusOutlined />}
              onClick={() => handleAddRow('expense')}
              size="small"
              type="link"
              style={{ color: '#ff4d4f' }}
            >
              添加行
            </Button>
          </div>
          <div className="bulk-input-rows">
            {renderRowsSection(expenseRows, 'expense', incomeRows.length + 1)}
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Summary and Actions */}
        <Row gutter={16} align="middle">
          <Col span={16}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="收入小计"
                  value={totalIncome}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ 
                    color: '#52c41a',
                    fontSize: '16px',
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
                    fontSize: '16px',
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
                    fontSize: '16px',
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
                size="large"
              >
                保存全部
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Validation Summary */}
        <div className="validation-summary">
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                有效记录: {totalValidRecords} / {totalRecords} 条
                {totalValidRecords === 0 && (
                  <span style={{ color: '#ff4d4f', marginLeft: '8px' }}>
                    (至少需要一条有效记录)
                  </span>
                )}
              </div>
            </Col>
          </Row>
        </div>
      </Form>
    </Card>
  );
};

export default BulkFinancialInput;
