/**
 * Financial Category Management Page
 * 财务类别管理页面
 * 
 * 管理活动财务计划的收入和支出类别
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
  Select,
  message,
  Popconfirm,
  Tabs,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components';
import { globalComponentService } from '@/config/globalComponentSettings';
import { useAuthStore } from '@/stores/authStore';
import {
  getAllFinancialCategories,
  createFinancialCategory,
  updateFinancialCategory,
  deleteFinancialCategory,
  generateNextCategoryCode,
  type FinancialCategory,
} from '../../services/financialCategoryService';
import {
  getAllTransactionPurposes,
  createTransactionPurpose,
  updateTransactionPurpose,
  deleteTransactionPurpose,
  generateNextPurposeCode,
  type TransactionPurpose,
} from '../../services/transactionPurposeService';
import './styles.css';

const { Option } = Select;

const FinancialCategoryManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [purposes, setPurposes] = useState<TransactionPurpose[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [editingPurpose, setEditingPurpose] = useState<TransactionPurpose | null>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'general-accounts'>('income');
  const [form] = Form.useForm();

  const tableConfig = globalComponentService.getTableConfig();

  useEffect(() => {
    loadCategories();
    loadPurposes();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await getAllFinancialCategories();
      setCategories(data);
    } catch (error) {
      message.error('加载类别失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadPurposes = async () => {
    try {
      setLoading(true);
      const data = await getAllTransactionPurposes();
      setPurposes(data);
    } catch (error) {
      message.error('加载交易用途失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (type: 'income' | 'expense' | 'general-accounts') => {
    if (type === 'general-accounts') {
      // 使用专门的添加交易用途方法
      await handleAddPurpose();
      return;
    }
    
    // 收入/支出类别
    setEditingCategory(null);
    setEditingPurpose(null);
    setActiveTab(type);
    form.resetFields();
    
    try {
      // 🆕 自动生成下一个类别编号
      const nextCode = await generateNextCategoryCode(type);
      
      form.setFieldsValue({ 
        type, 
        status: 'active',
        value: nextCode, // 自动填充编号
        sortOrder: 0,
      });
      
      message.success(`已自动生成编号: ${nextCode}`);
    } catch (error) {
      message.warning('编号生成失败，请手动输入');
      form.setFieldsValue({ type, status: 'active', sortOrder: 0 });
    }
    
    setModalVisible(true);
  };

  const handleAddPurpose = async () => {
    setEditingCategory(null);
    setEditingPurpose(null);
    setActiveTab('general-accounts');
    form.resetFields();
    
    try {
      // 🆕 自动生成下一个用途代码
      const nextCode = await generateNextPurposeCode();
      
      form.setFieldsValue({ 
        value: nextCode, // 自动填充代码
        status: 'active',
        sortOrder: 0,
      });
      
      message.success(`已自动生成代码: ${nextCode}`);
    } catch (error) {
      message.warning('代码生成失败，请手动输入');
      form.setFieldsValue({ 
        status: 'active',
        sortOrder: 0,
      });
    }
    
    setModalVisible(true);
  };

  const handleEdit = (category: FinancialCategory) => {
    setEditingCategory(category);
    setEditingPurpose(null);
    setActiveTab(category.type);
    form.setFieldsValue(category);
    setModalVisible(true);
  };

  const handleEditPurpose = (purpose: TransactionPurpose) => {
    setEditingCategory(null);
    setEditingPurpose(purpose);
    setActiveTab('general-accounts');
    form.setFieldsValue(purpose);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      const values = await form.validateFields();

      if (activeTab === 'general-accounts') {
        // 处理交易用途
        if (editingPurpose) {
          await updateTransactionPurpose(editingPurpose.id, values, user.id);
          message.success('更新成功');
        } else {
          await createTransactionPurpose(values, user.id);
          message.success('创建成功');
        }
        await loadPurposes();
      } else {
        // 处理收入/支出类别
        if (editingCategory) {
          // 更新：使用文档ID（value）
          await updateFinancialCategory(editingCategory.value, values, user.id);
          message.success('更新成功');
        } else {
          // 创建：value 即为文档ID
          await createFinancialCategory(values, user.id);
          message.success('创建成功');
        }
        await loadCategories();
      }

      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      if (error.message?.includes('已存在')) {
        message.error(error.message);
      } else if (error.message?.includes('不可修改')) {
        message.error(error.message);
      } else {
        message.error('操作失败');
      }
      console.error('提交失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      await deleteFinancialCategory(id, user.id);
      message.success('删除成功');
      await loadCategories();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleDeletePurpose = async (id: string) => {
    if (!user) return;

    try {
      await deleteTransactionPurpose(id, user.id);
      message.success('删除成功');
      await loadPurposes();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const incomeCategories = categories.filter(cat => cat.type === 'income');
  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  // 交易用途列定义
  const purposeColumns: ColumnsType<TransactionPurpose> = [
    {
      title: '用途代码',
      dataIndex: 'value',
      width: 200,
      sorter: (a, b) => a.value.localeCompare(b.value),
      defaultSortOrder: 'ascend' as const,
      render: (value: string) => (
        <Tag color="purple" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {value}
        </Tag>
      ),
    },
    {
      title: '显示名称',
      dataIndex: 'label',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_: unknown, record: TransactionPurpose) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditPurpose(record)}
          />
          <Popconfirm
            title="确认删除此交易用途？"
            description="删除后，使用此用途的交易需要重新分类"
            onConfirm={() => handleDeletePurpose(record.id)}
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
      ),
    },
  ];

  // 财务类别列定义
  const columns: ColumnsType<FinancialCategory> = [
    {
      title: '类别代码',
      dataIndex: 'value',
      width: 150,
      render: (value: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {value}
        </Tag>
      ),
    },
    {
      title: '类别名称',
      dataIndex: 'label',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_: unknown, record: FinancialCategory) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确认删除此类别？"
            description="删除后，使用此类别的财务计划需要重新分类"
            onConfirm={() => handleDelete(record.value)}
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
      ),
    },
  ];

  return (
    <div className="financial-category-management-page">
      <PageHeader
        title="财务类别管理"
        breadcrumbs={[
          { title: '首页', path: '/' },
          { title: '系统设置', path: '/settings' },
          { title: '财务类别管理' },
        ]}
      />

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'income' | 'expense' | 'general-accounts')}
          tabBarExtraContent={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd(activeTab)}
            >
              添加{
                activeTab === 'income' ? '收入类别' : 
                activeTab === 'expense' ? '支出类别' : 
                '交易用途'
              }
            </Button>
          }
          items={[
            {
              key: 'income',
              label: `📈 收入类别 (${incomeCategories.length})`,
              children: (
                <Table
                  {...tableConfig}
                  columns={columns}
                  dataSource={incomeCategories}
                  rowKey="value"
                  loading={loading}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                  }}
                />
              ),
            },
            {
              key: 'expense',
              label: `📉 支出类别 (${expenseCategories.length})`,
              children: (
                <Table
                  {...tableConfig}
                  columns={columns}
                  dataSource={expenseCategories}
                  rowKey="value"
                  loading={loading}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                  }}
                />
              ),
            },
            {
              key: 'general-accounts',
              label: `🏦 日常账户用途 (${purposes.length})`,
              children: (
                <Table
                  {...tableConfig}
                  columns={purposeColumns}
                  dataSource={purposes}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 添加/编辑模态框 */}
      <Modal
        title={
          activeTab === 'general-accounts' 
            ? (editingPurpose ? '编辑交易用途' : '添加交易用途')
            : (editingCategory ? '编辑类别' : '添加类别')
        }
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
            status: 'active',
            sortOrder: 0,
          }}
        >
          {activeTab === 'general-accounts' ? (
            // 🏦 日常账户交易用途表单
            <>
              <Form.Item
                name="value"
                label="用途代码"
                rules={[
                  { required: true, message: '请输入用途代码' },
                  { pattern: /^TXGA-\d{4}$/, message: '格式错误，应为 TXGA-0001' },
                ]}
                extra={
                  editingPurpose ? (
                    <span style={{ color: '#ff4d4f' }}>
                      ⚠️ 修改代码会影响所有使用此用途的交易
                    </span>
                  ) : (
                    <span style={{ color: '#52c41a' }}>
                      ✅ 系统已自动生成唯一编号
                    </span>
                  )
                }
              >
                <Input 
                  placeholder="TXGA-0001" 
                  maxLength={100}
                  disabled={!editingPurpose} // 🔒 新建时禁止修改，编辑时允许
                  style={{ 
                    fontFamily: 'monospace',
                    backgroundColor: editingPurpose ? '#fff' : '#e6f7ff',
                    color: '#722ed1',
                    fontWeight: 600,
                  }}
                />
              </Form.Item>

              <Form.Item
                name="label"
                label="显示名称"
                rules={[{ required: true, message: '请输入显示名称' }]}
              >
                <Input placeholder="显示在下拉列表中的名称" maxLength={100} />
              </Form.Item>

              <Form.Item name="description" label="描述">
                <Input.TextArea
                  placeholder="用途说明和使用场景"
                  rows={3}
                  maxLength={500}
                />
              </Form.Item>

              <Form.Item
                name="sortOrder"
                label="排序"
                extra="数字越小越靠前"
              >
                <Input type="number" placeholder="0" />
              </Form.Item>

              <Form.Item name="status" label="状态">
                <Select>
                  <Option value="active">启用</Option>
                  <Option value="inactive">禁用</Option>
                </Select>
              </Form.Item>
            </>
          ) : (
            // 📈📉 收入/支出类别表单
            <>
              <Form.Item name="type" label="类型" rules={[{ required: true }]}>
                <Select disabled={!!editingCategory}>
                  <Option value="income">收入</Option>
                  <Option value="expense">支出</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="value"
                label="类别代码"
                rules={[
                  { required: true, message: '请输入类别代码' },
                  { pattern: /^TX(INC|EXP)-\d{4}$/, message: '格式错误，应为 TXINC-0001 或 TXEXP-0001' },
                ]}
                extra={
                  editingCategory ? (
                    <span style={{ color: '#ff4d4f' }}>
                      ⚠️ 类别代码不可修改（它是文档ID）
                    </span>
                  ) : (
                    <span style={{ color: '#52c41a' }}>
                      ✅ 系统已自动生成唯一编号
                    </span>
                  )
                }
              >
                <Input 
                  placeholder="TXINC-0001" 
                  maxLength={50}
                  disabled // 🔒 禁止手动修改
                  style={{ 
                    fontFamily: 'monospace',
                    backgroundColor: editingCategory ? '#f5f5f5' : '#e6f7ff',
                    color: '#1890ff',
                    fontWeight: 600,
                  }}
                />
              </Form.Item>

              <Form.Item
                name="label"
                label="类别名称"
                rules={[{ required: true, message: '请输入类别名称' }]}
              >
                <Input placeholder="门票收入" maxLength={100} />
              </Form.Item>

              <Form.Item name="description" label="描述">
                <Input.TextArea
                  placeholder="类别说明和使用场景"
                  rows={3}
                  maxLength={500}
                />
              </Form.Item>

              <Form.Item
                name="sortOrder"
                label="排序"
                extra="数字越小越靠前"
              >
                <Input type="number" placeholder="0" />
              </Form.Item>

              <Form.Item name="status" label="状态">
                <Select>
                  <Option value="active">启用</Option>
                  <Option value="inactive">禁用</Option>
                </Select>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default FinancialCategoryManagementPage;

