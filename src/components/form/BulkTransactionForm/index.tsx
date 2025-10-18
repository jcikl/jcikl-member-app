/**
 * Bulk Transaction Form Component
 * 批量交易表单组件
 * 
 * 支持按收入类型分组批量输入交易记录
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Space,
  Typography,
  Divider,
  message,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CalculatorOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { globalDateService } from '@/config/globalDateSettings';
import { globalSystemService } from '@/config/globalSystemSettings';
import { useAuthStore } from '@/stores/authStore';
import { createTransaction } from '../../services/transactionService';
import type { TransactionFormData } from '../../types';

const { Option } = Select;
const { Text, Title } = Typography;

interface TransactionRow {
  id: string;
  sn: number;
  description: string;
  remark: string;
  amount: number;
  payerPayee?: string;
  category?: string;
  paymentMethod?: string;
  notes?: string;
}

interface BulkTransactionFormProps {
  visible: boolean;
  onOk: (transactions: TransactionFormData[]) => Promise<void>;
  onCancel: () => void;
  bankAccountId?: string;
  transactionDate?: dayjs.Dayjs;
  transactionType?: 'income' | 'expense';
}

const BulkTransactionForm: React.FC<BulkTransactionFormProps> = ({
  visible,
  onOk,
  onCancel,
  bankAccountId,
  transactionDate,
  transactionType = 'income',
}) => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [transactionRows, setTransactionRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 收入类型选项
  const incomeCategories = [
    { value: 'member-fees', label: '会员费' },
    { value: 'event-income', label: '活动收入' },
    { value: 'donations', label: '捐赠' },
    { value: 'sponsorships', label: '赞助' },
    { value: 'other-income', label: '其他收入' },
  ];

  // 支出类型选项
  const expenseCategories = [
    { value: 'utilities', label: '水电费' },
    { value: 'rent', label: '租金' },
    { value: 'supplies', label: '办公用品' },
    { value: 'salaries', label: '工资' },
    { value: 'other-expense', label: '其他支出' },
  ];

  const categories = transactionType === 'income' ? incomeCategories : expenseCategories;

  // 初始化表单
  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        transactionDate: transactionDate || dayjs(),
        transactionType,
        bankAccountId,
      });
      
      // 添加初始行
      if (transactionRows.length === 0) {
        addRow();
      }
    }
  }, [visible, transactionDate, transactionType, bankAccountId]);

  // 添加新行
  const addRow = () => {
    const newRow: TransactionRow = {
      id: `row_${Date.now()}_${Math.random()}`,
      sn: transactionRows.length + 1,
      description: '',
      remark: '',
      amount: 0,
      payerPayee: '',
      category: categories[0]?.value,
      paymentMethod: '',
      notes: '',
    };
    setTransactionRows([...transactionRows, newRow]);
  };

  // 删除行
  const deleteRow = (id: string) => {
    if (transactionRows.length <= 1) {
      message.warning('至少需要保留一行记录');
      return;
    }
    
    const newRows = transactionRows.filter(row => row.id !== id);
    // 重新编号
    const renumberedRows = newRows.map((row, index) => ({
      ...row,
      sn: index + 1,
    }));
    setTransactionRows(renumberedRows);
  };

  // 更新行数据
  const updateRow = (id: string, field: keyof TransactionRow, value: any) => {
    setTransactionRows(rows =>
      rows.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  // 计算小计
  const calculateSubtotal = () => {
    return transactionRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  };

  // 按类别分组计算
  const calculateByCategory = () => {
    const grouped = transactionRows.reduce((acc, row) => {
      const category = row.category || '未分类';
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0 };
      }
      acc[category].total += row.amount || 0;
      acc[category].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return grouped;
  };

  // 表格列定义
  const columns: ColumnsType<TransactionRow> = [
    {
      title: 'Sn',
      dataIndex: 'sn',
      key: 'sn',
      width: 60,
      align: 'center',
      render: (sn: number) => (
        <Text strong style={{ fontSize: '14px' }}>
          {sn}
        </Text>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (_, record) => (
        <Input
          placeholder="交易描述"
          value={record.description}
          onChange={(e) => updateRow(record.id, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'Remark',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      render: (_, record) => (
        <Input
          placeholder="备注"
          value={record.remark}
          onChange={(e) => updateRow(record.id, 'remark', e.target.value)}
        />
      ),
    },
    {
      title: `Amount (${transactionType === 'income' ? 'Income' : 'Expense'})`,
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (_, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          prefix="RM"
          placeholder="0.00"
          value={record.amount}
          onChange={(value) => updateRow(record.id, 'amount', value || 0)}
        />
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ 
          color: transactionType === 'income' ? '#52c41a' : '#ff4d4f',
          fontSize: '14px'
        }}>
          RM {(record.amount || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => deleteRow(record.id)}
          size="small"
        />
      ),
    },
  ];

  // 处理提交
  const handleSubmit = async () => {
    if (!user) {
      message.error('用户未登录');
      return;
    }

    try {
      const formValues = await form.validateFields();
      
      // 验证交易行数据
      const validRows = transactionRows.filter(row => 
        row.description.trim() && row.amount > 0
      );

      if (validRows.length === 0) {
        message.error('请至少输入一条有效的交易记录');
        return;
      }

      if (validRows.length !== transactionRows.length) {
        message.warning(`将跳过 ${transactionRows.length - validRows.length} 条无效记录`);
      }

      setLoading(true);

      // 转换为 TransactionFormData 格式
      const transactions: TransactionFormData[] = validRows.map(row => ({
        bankAccountId: formValues.bankAccountId,
        transactionDate: formValues.transactionDate.toDate(),
        transactionType: formValues.transactionType,
        mainDescription: row.description,
        subDescription: row.remark,
        amount: row.amount,
        payerPayee: row.payerPayee,
        category: row.category,
        paymentMethod: row.paymentMethod,
        notes: row.notes,
      }));

      await onOk(transactions);
      
      // 重置表单
      form.resetFields();
      setTransactionRows([]);
      addRow(); // 添加一行空记录
      
    } catch (error: any) {
      console.error('批量交易提交失败:', error);
      message.error('提交失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateSubtotal();
  const categoryTotals = calculateByCategory();

  return (
    <Modal
      title={
        <Space>
          <CalculatorOutlined />
          <span>批量添加{transactionType === 'income' ? '收入' : '支出'}交易</span>
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      width={1200}
      okText="批量创建"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        {/* 基本信息 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="交易日期"
                name="transactionDate"
                rules={[{ required: true, message: '请选择交易日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="交易类型"
                name="transactionType"
                rules={[{ required: true, message: '请选择交易类型' }]}
              >
                <Select>
                  <Option value="income">收入</Option>
                  <Option value="expense">支出</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="银行账户"
                name="bankAccountId"
                rules={[{ required: true, message: '请选择银行账户' }]}
              >
                <Select placeholder="选择银行账户">
                  {/* 这里需要从父组件传入银行账户列表 */}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 交易记录表格 */}
        <Card 
          title={
            <Space>
              <DollarOutlined />
              <span>交易记录</span>
              <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={addRow}
                size="small"
              >
                添加行
              </Button>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Table
            columns={columns}
            dataSource={transactionRows}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
            style={{ marginBottom: 16 }}
          />

          {/* 小计显示 */}
          <Divider />
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="总金额"
                value={subtotal}
                precision={2}
                prefix="RM"
                valueStyle={{ 
                  color: transactionType === 'income' ? '#52c41a' : '#ff4d4f',
                  fontSize: '18px'
                }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="记录数量"
                value={transactionRows.length}
                suffix="条"
                valueStyle={{ fontSize: '18px' }}
              />
            </Col>
          </Row>
        </Card>

        {/* 按类别统计 */}
        {Object.keys(categoryTotals).length > 0 && (
          <Card title="按类别统计" size="small">
            <Row gutter={[16, 8]}>
              {Object.entries(categoryTotals).map(([category, data]) => {
                const categoryLabel = categories.find(c => c.value === category)?.label || category;
                return (
                  <Col span={8} key={category}>
                    <Card size="small">
                      <Statistic
                        title={categoryLabel}
                        value={data.total}
                        precision={2}
                        prefix="RM"
                        suffix={`(${data.count}条)`}
                        valueStyle={{ 
                          color: transactionType === 'income' ? '#52c41a' : '#ff4d4f',
                          fontSize: '14px'
                        }}
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Card>
        )}
      </Form>
    </Modal>
  );
};

export default BulkTransactionForm;
