/**
 * Event Registration Management Page
 * 活动报名管理页面
 * 
 * 支持会员和非会员报名管理
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  message,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { globalSystemService } from '@/config/globalSystemSettings';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  getEventRegistrations,
  approveRegistration,
  rejectRegistration,
  checkInParticipant,
  getRegistrationStatistics,
  createEventRegistration,
} from '../../services/eventRegistrationService';
import { getEvents } from '../../services/eventService';
import type { EventRegistration, RegistrationStatus, ParticipantType, Event } from '../../types';
import { PARTICIPANT_TYPE_OPTIONS, REGISTRATION_STATUS_OPTIONS } from '../../types';
import './styles.css';

const { Search } = Input;
const { Option } = Select;

const EventRegistrationManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | 'all'>('all');
  const [participantTypeFilter, setParticipantTypeFilter] = useState<ParticipantType | 'all'>('all');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<EventRegistration | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [form] = Form.useForm();

  // Statistics
  const [statistics, setStatistics] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    checkedIn: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadRegistrations();
  }, [currentPage, pageSize, searchText, selectedEventId, statusFilter, participantTypeFilter]);

  const loadEvents = async () => {
    try {
      const result = await getEvents({ 
        page: 1, 
        limit: 1000,
        // Remove default sorting to avoid index issues
        // Sort will be applied client-side
      });
      console.log('✅ Loaded events:', result.data.length);
      setEvents(result.data);
      
      if (result.data.length === 0) {
        message.warning('暂无活动数据，请先创建活动');
      }
    } catch (error: any) {
      console.error('❌ Failed to load events:', error);
      message.error(`加载活动列表失败: ${error.message || '未知错误'}`);
      globalSystemService.log(
        'error',
        'Failed to load events',
        'EventRegistrationManagementPage.loadEvents',
        { error: error.message }
      );
    }
  };

  const loadRegistrations = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const result = await getEventRegistrations({
        eventId: selectedEventId !== 'all' ? selectedEventId : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        participantType: participantTypeFilter !== 'all' ? participantTypeFilter : undefined,
        search: searchText || undefined,
        page: currentPage,
        limit: pageSize,
        sortBy: 'registrationDate',
        sortOrder: 'desc',
      });

      setRegistrations(result.data);
      setTotal(result.total);

      // Load statistics if specific event is selected
      if (selectedEventId !== 'all') {
        const stats = await getRegistrationStatistics(selectedEventId);
        setStatistics(stats);
      } else {
        // Calculate overall statistics
        setStatistics({
          total: result.total,
          approved: result.data.filter(r => r.status === 'approved').length,
          pending: result.data.filter(r => r.status === 'pending').length,
          rejected: result.data.filter(r => r.status === 'rejected').length,
          checkedIn: result.data.filter(r => r.checkedIn).length,
          totalRevenue: result.data
            .filter(r => r.status === 'approved' && r.paymentStatus === 'completed')
            .reduce((sum, r) => sum + r.pricePaid, 0),
        });
      }
    } catch (error: any) {
      message.error('加载报名数据失败');
      globalSystemService.log(
        'error',
        'Failed to load registrations',
        'EventRegistrationManagementPage.loadRegistrations',
        { error: error.message }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registrationId: string) => {
    if (!user) return;

    try {
      await approveRegistration(registrationId, user.id);
      message.success('报名已批准');
      loadRegistrations();
    } catch (error: any) {
      message.error('批准失败');
    }
  };

  const handleReject = async () => {
    if (!user || !selectedRegistration) return;

    if (!rejectReason.trim()) {
      message.error('请输入拒绝原因');
      return;
    }

    try {
      await rejectRegistration(selectedRegistration.id, rejectReason, user.id);
      message.success('报名已拒绝');
      setRejectModalVisible(false);
      setRejectReason('');
      setSelectedRegistration(null);
      loadRegistrations();
    } catch (error: any) {
      message.error('拒绝失败');
    }
  };

  const handleCheckIn = async (registrationId: string) => {
    if (!user) return;

    try {
      await checkInParticipant(registrationId, user.id);
      message.success('签到成功');
      loadRegistrations();
    } catch (error: any) {
      message.error('签到失败');
    }
  };

  const handleViewDetail = (record: EventRegistration) => {
    setSelectedRegistration(record);
    setDetailModalVisible(true);
  };

  const handleCreateRegistration = async (values: any) => {
    if (!user) return;

    try {
      await createEventRegistration({
        ...values,
        isMember: !!values.memberId,
      }, user.id);
      
      message.success('报名已创建');
      setCreateModalVisible(false);
      form.resetFields();
      loadRegistrations();
    } catch (error: any) {
      message.error('创建报名失败');
    }
  };

  const getStatusTag = (status: RegistrationStatus) => {
    const statusMap: Record<RegistrationStatus, { color: string; text: string }> = {
      pending: { color: 'processing', text: '待审核' },
      approved: { color: 'success', text: '已批准' },
      rejected: { color: 'error', text: '已拒绝' },
      cancelled: { color: 'default', text: '已取消' },
    };
    const config = statusMap[status];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getParticipantTypeTag = (type: ParticipantType) => {
    const option = PARTICIPANT_TYPE_OPTIONS.find(opt => opt.value === type);
    return <Tag color="blue">{option?.label || type}</Tag>;
  };

  const columns: ColumnsType<EventRegistration> = [
    {
      title: '活动名称',
      dataIndex: 'eventName',
      key: 'eventName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '参与者',
      key: 'participant',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.participantName}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.participantEmail}</div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'participantType',
      key: 'participantType',
      width: 120,
      render: (type: ParticipantType) => getParticipantTypeTag(type),
    },
    {
      title: '价格',
      dataIndex: 'pricePaid',
      key: 'pricePaid',
      width: 100,
      align: 'right',
      render: (price: number) => `RM ${price.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: RegistrationStatus) => getStatusTag(status),
    },
    {
      title: '报名时间',
      dataIndex: 'registrationDate',
      key: 'registrationDate',
      width: 120,
      render: (date: string) =>
        globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '签到',
      dataIndex: 'checkedIn',
      key: 'checkedIn',
      width: 80,
      align: 'center',
      render: (checkedIn: boolean) =>
        checkedIn ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        ) : (
          <span style={{ color: '#999' }}>-</span>
        ),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record.id)}
                style={{ color: '#52c41a' }}
              >
                批准
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setSelectedRegistration(record);
                  setRejectModalVisible(true);
                }}
              >
                拒绝
              </Button>
            </>
          )}
          {record.status === 'approved' && !record.checkedIn && (
            <Button
              type="link"
              size="small"
              onClick={() => handleCheckIn(record.id)}
            >
              签到
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  if (loading && registrations.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <div className="event-registration-management-page">
        <PageHeader
          title="活动报名管理"
          subtitle="Event Registration Management"
          
          extra={
            <Space>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                新增报名
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadRegistrations}>
                刷新
              </Button>
            </Space>
          }
        />

        {/* Statistics Cards */}
        {selectedEventId !== 'all' && (
          <div className="mb-6">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} md={4}>
                <Card>
                  <Statistic title="总报名" value={statistics.total} />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card>
                  <Statistic
                    title="已批准"
                    value={statistics.approved}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card>
                  <Statistic
                    title="待审核"
                    value={statistics.pending}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card>
                  <Statistic
                    title="已签到"
                    value={statistics.checkedIn}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card>
                  <Statistic
                    title="已拒绝"
                    value={statistics.rejected}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card>
                  <Statistic
                    title="收入总额"
                    value={statistics.totalRevenue}
                    precision={2}
                    prefix="RM"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-4">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Search
                  placeholder="搜索姓名、邮箱、电话"
                  allowClear
                  enterButton={<SearchOutlined />}
                  onSearch={(value) => {
                    setSearchText(value);
                    setCurrentPage(1);
                  }}
                  onChange={(e) => !e.target.value && setSearchText('')}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  value={selectedEventId}
                  onChange={(value) => {
                    setSelectedEventId(value);
                    setCurrentPage(1);
                  }}
                  placeholder="选择活动"
                >
                  <Option value="all">所有活动</Option>
                  {events.map(event => (
                    <Option key={event.id} value={event.id}>
                      {event.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value as RegistrationStatus | 'all');
                    setCurrentPage(1);
                  }}
                  placeholder="状态筛选"
                >
                  <Option value="all">全部状态</Option>
                  {REGISTRATION_STATUS_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  value={participantTypeFilter}
                  onChange={(value) => {
                    setParticipantTypeFilter(value as ParticipantType | 'all');
                    setCurrentPage(1);
                  }}
                  placeholder="参与者类型"
                >
                  <Option value="all">全部类型</Option>
                  {PARTICIPANT_TYPE_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Table */}
        <Card>
          <Table
            {...tableConfig}
            columns={columns}
            dataSource={registrations}
            rowKey="id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条报名`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size || 20);
              },
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title="报名详情"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              关闭
            </Button>,
          ]}
          width={800}
        >
          {selectedRegistration && (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="活动名称" span={2}>
                {selectedRegistration.eventName}
              </Descriptions.Item>
              <Descriptions.Item label="参与者姓名">
                {selectedRegistration.participantName}
              </Descriptions.Item>
              <Descriptions.Item label="参与者类型">
                {getParticipantTypeTag(selectedRegistration.participantType)}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱" span={2}>
                {selectedRegistration.participantEmail}
              </Descriptions.Item>
              <Descriptions.Item label="电话" span={2}>
                {selectedRegistration.participantPhone}
              </Descriptions.Item>
              <Descriptions.Item label="支付价格">
                RM {selectedRegistration.pricePaid.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="支付状态">
                <Tag color={selectedRegistration.paymentStatus === 'completed' ? 'success' : 'warning'}>
                  {selectedRegistration.paymentStatus}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="报名状态">
                {getStatusTag(selectedRegistration.status)}
              </Descriptions.Item>
              <Descriptions.Item label="签到状态">
                {selectedRegistration.checkedIn ? (
                  <Tag color="success">已签到</Tag>
                ) : (
                  <Tag color="default">未签到</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="饮食要求" span={2}>
                {selectedRegistration.dietaryRequirements || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="特殊需求" span={2}>
                {selectedRegistration.specialNeeds || '-'}
              </Descriptions.Item>
              {selectedRegistration.emergencyContact && (
                <>
                  <Descriptions.Item label="紧急联系人" span={2}>
                    {selectedRegistration.emergencyContact.name} ({selectedRegistration.emergencyContact.relationship})
                    <br />
                    电话：{selectedRegistration.emergencyContact.phone}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="报名时间" span={2}>
                {globalDateService.formatDate(new Date(selectedRegistration.registrationDate), 'display')}
              </Descriptions.Item>
              {selectedRegistration.checkInTime && (
                <Descriptions.Item label="签到时间" span={2}>
                  {globalDateService.formatDate(new Date(selectedRegistration.checkInTime), 'display')}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="备注" span={2}>
                {selectedRegistration.notes || '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        {/* Reject Modal */}
        <Modal
          title="拒绝报名"
          open={rejectModalVisible}
          onOk={handleReject}
          onCancel={() => {
            setRejectModalVisible(false);
            setRejectReason('');
          }}
          okText="确认拒绝"
          okButtonProps={{ danger: true }}
          cancelText="取消"
        >
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="请输入拒绝原因"
          />
        </Modal>

        {/* Create Modal */}
        <Modal
          title="新增报名"
          open={createModalVisible}
          onOk={() => form.submit()}
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          okText="创建"
          cancelText="取消"
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateRegistration}
          >
            <Form.Item
              name="eventId"
              label="活动"
              rules={[{ required: true, message: '请选择活动' }]}
            >
              <Select placeholder="选择活动">
                {events.map(event => (
                  <Option key={event.id} value={event.id}>
                    {event.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="participantName"
              label="参与者姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入姓名" />
            </Form.Item>
            <Form.Item
              name="participantEmail"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效邮箱' },
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>
            <Form.Item
              name="participantPhone"
              label="电话"
              rules={[{ required: true, message: '请输入电话' }]}
            >
              <Input placeholder="请输入电话" />
            </Form.Item>
            <Form.Item
              name="participantType"
              label="参与者类型"
              rules={[{ required: true, message: '请选择类型' }]}
            >
              <Select placeholder="选择参与者类型">
                {PARTICIPANT_TYPE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="pricePaid"
              label="价格"
              rules={[{ required: true, message: '请输入价格' }]}
            >
              <Input type="number" prefix="RM" placeholder="0.00" />
            </Form.Item>
            <Form.Item name="memberId" label="会员ID(可选)">
              <Input placeholder="如果是会员，请输入会员ID" />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={3} placeholder="备注信息" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default EventRegistrationManagementPage;

