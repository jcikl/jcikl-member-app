/**
 * Fiscal Year Management Page
 * 财年管理页面
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  message,
  Tag,
  Space,
  Progress,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  getAllFiscalYears,
  createFiscalYear,
  updateFiscalYear,
  deleteFiscalYear,
  closeFiscalYear,
  generateFiscalYearDates,
} from '../../services/fiscalYearService';
import type { FiscalYear, FiscalYearStatus } from '../../types';

const { Option } = Select;
const { RangePicker } = DatePicker;

const FiscalYearManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFiscalYear, setEditingFiscalYear] = useState<FiscalYear | null>(null);

  useEffect(() => {
    loadFiscalYears();
  }, []);

  const loadFiscalYears = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getAllFiscalYears();
      setFiscalYears(data);
    } catch (error: any) {
      message.error('加载财年数据失败');
      globalSystemService.log(
        'error',
        'Failed to load fiscal years',
        'FiscalYearManagementPage.loadFiscalYears',
        { error: error.message, userId: user.id }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    form.resetFields();
    setEditingFiscalYear(null);
    
    // Set default dates for new fiscal year (Oct 1 - Sep 30)
    const currentYear = new Date().getFullYear();
    const { start, end } = generateFiscalYearDates(currentYear);
    
    form.setFieldsValue({
      name: `FY${currentYear}`,
      year: currentYear,
      dateRange: [dayjs(start), dayjs(end)],
      status: 'draft',
      isDefault: false,
    });
    
    setModalVisible(true);
  };

  const handleEdit = (record: FiscalYear) => {
    setEditingFiscalYear(record);
    form.setFieldsValue({
      name: record.name,
      year: record.year,
      dateRange: [dayjs(record.startDate), dayjs(record.endDate)],
      status: record.status,
      isDefault: record.isDefault,
      description: record.description,
      notes: record.notes,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      const values = await form.validateFields();
      const [startDate, endDate] = values.dateRange;

      const formData = {
        name: values.name,
        year: values.year,
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
        status: values.status,
        isDefault: values.isDefault,
        description: values.description,
        notes: values.notes,
      };

      if (editingFiscalYear) {
        await updateFiscalYear(editingFiscalYear.id, formData, user.id);
        message.success('财年已更新');
      } else {
        await createFiscalYear(formData, user.id);
        message.success('财年已创建');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingFiscalYear(null);
      loadFiscalYears();
    } catch (error: any) {
      message.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此财年吗？此操作无法撤销。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteFiscalYear(id, user.id);
          message.success('财年已删除');
          loadFiscalYears();
        } catch (error: any) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const handleClose = async (id: string) => {
    if (!user) return;

    Modal.confirm({
      title: '确认关闭财年',
      content: '关闭后将无法修改此财年的数据。确定要继续吗？',
      okText: '关闭',
      cancelText: '取消',
      onOk: async () => {
        try {
          await closeFiscalYear(id, user.id);
          message.success('财年已关闭');
          loadFiscalYears();
        } catch (error: any) {
          message.error('关闭失败');
        }
      },
    });
  };

  const handleQuickPreset = (preset: 'calendar' | 'july' | 'october') => {
    const year = form.getFieldValue('year') || new Date().getFullYear();
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;

    switch (preset) {
      case 'calendar':
        start = dayjs(`${year}-01-01`);
        end = dayjs(`${year}-12-31`);
        break;
      case 'july':
        start = dayjs(`${year}-07-01`);
        end = dayjs(`${year + 1}-06-30`);
        break;
      case 'october':
        start = dayjs(`${year}-10-01`);
        end = dayjs(`${year + 1}-09-30`);
        break;
    }

    form.setFieldsValue({ dateRange: [start, end] });
  };

  const columns: ColumnsType<FiscalYear> = [
    {
      title: '财年名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date: string) => globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (date: string) => globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: FiscalYearStatus, record: FiscalYear) => {
        const statusConfig: Record<FiscalYearStatus, { color: string; text: string }> = {
          draft: { color: 'default', text: '草稿' },
          active: { color: 'success', text: '活跃' },
          closed: { color: 'default', text: '已关闭' },
          archived: { color: 'default', text: '已归档' },
        };
        const config = statusConfig[status];
        return (
          <Space>
            <Tag color={config.color}>{config.text}</Tag>
            {record.isDefault && <Tag color="blue">默认</Tag>}
          </Space>
        );
      },
    },
    {
      title: '进度',
      key: 'progress',
      width: 200,
      render: (_, record) => {
        if (record.status !== 'active') return '-';
        
        const start = new Date(record.startDate).getTime();
        const end = new Date(record.endDate).getTime();
        const now = Date.now();
        
        if (now < start) return <Progress percent={0} size="small" />;
        if (now > end) return <Progress percent={100} size="small" />;
        
        const progress = Math.round(((now - start) / (end - start)) * 100);
        return <Progress percent={progress} size="small" />;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}>
            查看
          </Button>
          {record.status !== 'closed' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              {record.status === 'active' && (
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => handleClose(record.id)}
                >
                  关闭
                </Button>
              )}
            </>
          )}
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <div className="fiscal-year-management-page p-6">
        <PageHeader
          title="财年管理"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '财年管理' },
          ]}
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建新财年
            </Button>
          }
        />

        <Card>
          <Table
            {...tableConfig}
            columns={columns}
            dataSource={fiscalYears}
            rowKey="id"
            loading={loading}
          />
        </Card>

        <Modal
          title={editingFiscalYear ? '编辑财年' : '创建财年'}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
            setEditingFiscalYear(null);
          }}
          width={700}
        >
          <div className="mb-4">
            <h4 className="font-semibold mb-2">快速预设</h4>
            <Space>
              <Button onClick={() => handleQuickPreset('calendar')}>日历年</Button>
              <Button onClick={() => handleQuickPreset('july')}>7月1日 - 6月30日</Button>
              <Button onClick={() => handleQuickPreset('october')}>10月1日 - 9月30日</Button>
            </Space>
          </div>

          <Form form={form} layout="vertical">
            <Form.Item
              label="财年名称"
              name="name"
              rules={[{ required: true, message: '请输入财年名称' }]}
            >
              <Input placeholder="例如: FY2025" />
            </Form.Item>

            <Form.Item
              label="年份"
              name="year"
              rules={[{ required: true, message: '请输入年份' }]}
            >
              <InputNumber style={{ width: '100%' }} min={2020} max={2050} />
            </Form.Item>

            <Form.Item
              label="日期范围"
              name="dateRange"
              rules={[{ required: true, message: '请选择日期范围' }]}
            >
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select>
                <Option value="draft">草稿</Option>
                <Option value="active">活跃</Option>
                <Option value="closed">已关闭</Option>
              </Select>
            </Form.Item>

            <Form.Item label="设为默认" name="isDefault" valuePropName="checked">
              <Select>
                <Option value={true}>是</Option>
                <Option value={false}>否</Option>
              </Select>
            </Form.Item>

            <Form.Item label="描述" name="description">
              <Input.TextArea rows={2} />
            </Form.Item>

            <Form.Item label="备注" name="notes">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default FiscalYearManagementPage;

