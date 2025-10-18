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
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalSystemService } from '@/config/globalSystemSettings';
import './BulkFinancialInput.css';

interface BulkInputRow {
  id: string;
  description: string;
  remark: string;
  amount: number;
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
  const [rows, setRows] = useState<BulkInputRow[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // Initialize with 5 empty rows
  useEffect(() => {
    const initialRows = Array.from({ length: 5 }, (_, index) => ({
      id: `row-${index + 1}`,
      description: '',
      remark: '',
      amount: 0,
    }));
    setRows(initialRows);
  }, []);

  // Calculate total amount when rows change
  useEffect(() => {
    const total = rows.reduce((sum, row) => sum + (row.amount || 0), 0);
    setTotalAmount(total);
  }, [rows]);

  const handleAddRow = () => {
    const newRow: BulkInputRow = {
      id: `row-${Date.now()}`,
      description: '',
      remark: '',
      amount: 0,
    };
    setRows([...rows, newRow]);
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== rowId));
    } else {
      message.warning('至少需要保留一行');
    }
  };

  const handleClearAll = () => {
    setRows(rows.map(row => ({
      ...row,
      description: '',
      remark: '',
      amount: 0,
    })));
    form.resetFields();
  };

  const handleFieldChange = (rowId: string, field: keyof BulkInputRow, value: any) => {
    setRows(rows.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  const handleSave = async () => {
    try {
      // Validate rows
      const validRows = rows.filter(row => 
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
            icon={<PlusOutlined />}
            onClick={handleAddRow}
            size="small"
          >
            添加行
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClearAll}
            size="small"
            danger
          >
            清空
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        {/* Table Header */}
        <div className="bulk-input-header">
          <Row gutter={8}>
            <Col span={2}><strong>Sn</strong></Col>
            <Col span={8}><strong>Description</strong></Col>
            <Col span={6}><strong>Remark</strong></Col>
            <Col span={6}><strong>Amount</strong></Col>
            <Col span={2}><strong>操作</strong></Col>
          </Row>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Input Rows */}
        <div className="bulk-input-rows">
          {rows.map((row, index) => (
            <div key={row.id} className="bulk-input-row">
              <Row gutter={8} align="middle">
                <Col span={2}>
                  <div className="row-number">{index + 1}</div>
                </Col>
                <Col span={8}>
                  <Input
                    placeholder="输入描述"
                    value={row.description}
                    onChange={(e) => handleFieldChange(row.id, 'description', e.target.value)}
                    maxLength={50}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="备注"
                    value={row.remark}
                    onChange={(e) => handleFieldChange(row.id, 'remark', e.target.value)}
                    maxLength={100}
                  />
                </Col>
                <Col span={6}>
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="0.00"
                    min={0}
                    precision={2}
                    prefix="RM"
                    value={row.amount}
                    onChange={(value) => handleFieldChange(row.id, 'amount', value || 0)}
                  />
                </Col>
                <Col span={2}>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveRow(row.id)}
                    disabled={rows.length === 1}
                    size="small"
                  />
                </Col>
              </Row>
            </div>
          ))}
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Summary and Actions */}
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Statistic
              title="小计"
              value={totalAmount}
              precision={2}
              prefix="RM"
              valueStyle={{ 
                color: totalAmount > 0 ? '#52c41a' : '#999',
                fontSize: '18px',
                fontWeight: 600
              }}
            />
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
                disabled={totalAmount === 0}
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
                有效记录: {rows.filter(validateRow).length} / {rows.length} 条
                {rows.filter(validateRow).length === 0 && (
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
