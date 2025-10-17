/**
 * Event List Page
 * 活动列表页面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Space, 
  Tag, 
  message,
  Modal,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  CalendarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { 
  PageHeader, 
  MetricCard,
  FilterPanel,
  DetailDrawer,
  BulkOperationBar,
  DataGrid,
} from '@/components';
import type { FilterField, TabConfig, BulkAction } from '@/components';
import type { Event, EventSearchParams, EventStats } from '../../types';
import { 
  getEvents, 
  getEventById,
  deleteEvent, 
  getEventStats 
} from '../../services/eventService';
import { 
  EVENT_STATUS_OPTIONS, 
  EVENT_LEVEL_OPTIONS, 
  EVENT_CATEGORY_OPTIONS 
} from '../../types';
import { handleAsyncOperation } from '@/utils/errorHelpers';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import type { DataGridColumn } from '@/components';
import './styles.css';

/**
 * Event List Page Component
 */
const EventListPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  
  // Search & Filter
  const [searchParams, setSearchParams] = useState<EventSearchParams>({});
  
  // UI States
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // ========== Data Fetching ==========
  
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getEvents({
        page: pagination.current,
        limit: pagination.pageSize,
        ...searchParams,
      });
      
      setEvents(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.total,
      }));
    } catch (error) {
      message.error('获取活动列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchParams]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getEventStats();
      setStats(statsData);
    } catch (error) {
      console.error('获取统计数据失败', error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ========== Event Handlers ==========
  
  const handleFilter = (filters: EventSearchParams) => {
    setSearchParams(filters);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleRefresh = () => {
    fetchEvents();
    fetchStats();
  };

  const handleViewDetails = async (eventId: string) => {
    const event = await getEventById(eventId);
    if (event) {
      setSelectedEvent(event);
      setDrawerVisible(true);
    }
  };

  const handleCreate = () => {
    navigate('/events/create');
  };

  const handleEdit = (eventId: string) => {
    navigate(`/events/${eventId}/edit`);
  };

  const handleDelete = async (eventId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个活动吗？此操作不可撤销。',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await handleAsyncOperation(
          () => deleteEvent(eventId),
          '删除活动成功',
          '删除活动失败'
        );
        fetchEvents();
        fetchStats();
      },
    });
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
      total: pagination.total,
    });
  };

  const handleExport = () => {
    message.info('导出功能开发中...');
  };

  // ========== Bulk Operations ==========
  
  const bulkActions: BulkAction[] = [
    {
      key: 'publish',
      label: '批量发布',
      icon: <CalendarOutlined />,
      onClick: () => {
        message.info(`批量发布 ${selectedRowKeys.length} 个活动`);
      },
    },
    {
      key: 'delete',
      label: '批量删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除选中的 ${selectedRowKeys.length} 个活动吗？`,
          okText: '确认',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: async () => {
            message.success(`已删除 ${selectedRowKeys.length} 个活动`);
            setSelectedRowKeys([]);
            fetchEvents();
          },
        });
      },
    },
  ];

  // ========== Filter Configuration ==========
  
  const filterFields: FilterField[] = [
    {
      name: 'status',
      label: '活动状态',
      type: 'select',
      options: EVENT_STATUS_OPTIONS,
      placeholder: '选择状态',
    },
    {
      name: 'level',
      label: '活动级别',
      type: 'select',
      options: EVENT_LEVEL_OPTIONS,
      placeholder: '选择级别',
    },
    {
      name: 'category',
      label: '活动类型',
      type: 'select',
      options: EVENT_CATEGORY_OPTIONS,
      placeholder: '选择类型',
    },
    {
      name: 'dateRange',
      label: '日期范围',
      type: 'dateRange',
      placeholder: '选择日期范围',
    },
    {
      name: 'location',
      label: '地点',
      type: 'text',
      placeholder: '输入地点',
    },
    {
      name: 'isOnline',
      label: '在线活动',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '是', value: 'true' },
        { label: '否', value: 'false' },
      ],
      placeholder: '选择',
    },
  ];

  // ========== Table Columns ==========
  
  const columns: DataGridColumn<Event>[] = [
    {
      title: '活动名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      fixed: 'left',
      render: (text: string, record: Event) => (
        <a onClick={() => handleViewDetails(record.id)} className="text-primary hover:text-primary/80">
          {text}
        </a>
      ),
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 150,
      render: (date: string) => globalDateService.formatDate(date, 'display'),
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 150,
      render: (date: string) => globalDateService.formatDate(date, 'display'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          'Draft': 'default',
          'Published': 'success',
          'Cancelled': 'error',
          'Completed': 'processing',
        };
        const labelMap: Record<string, string> = {
          'Draft': '草稿',
          'Published': '已发布',
          'Cancelled': '已取消',
          'Completed': '已完成',
        };
        return <Tag color={colorMap[status]}>{labelMap[status] || status}</Tag>;
      },
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      align: 'center',
      render: (level: string) => {
        const labelMap: Record<string, string> = {
          'Local': '本地',
          'Area': '区域',
          'National': '国家级',
          'JCI': 'JCI',
        };
        return <Tag>{labelMap[level] || level}</Tag>;
      },
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
      width: 150,
      render: (text: string, record: Event) => (
        record.isOnline ? <Tag color="blue">线上</Tag> : text || '-'
      ),
    },
    {
      title: '参与人数',
      dataIndex: 'currentParticipants',
      key: 'currentParticipants',
      width: 120,
      align: 'center',
      render: (count: number, record: Event) => (
        <span>
          {count}
          {record.maxParticipants && <span className="text-gray-400"> / {record.maxParticipants}</span>}
        </span>
      ),
    },
    {
      title: '价格',
      dataIndex: 'pricing',
      key: 'pricing',
      width: 120,
      align: 'center',
      render: (pricing: any, record: Event) => (
        record.isFree ? (
          <Tag color="green">免费</Tag>
        ) : (
          <span>RM {pricing.memberPrice}</span>
        )
      ),
    },
    {
      title: '操作',
      dataIndex: 'id',
      key: 'actions',
      width: 200,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: Event) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.id)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // ========== Drawer Tabs ==========
  
  const drawerTabs: TabConfig[] = [
    {
      key: 'overview',
      label: '概览',
      content: selectedEvent ? (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-800 dark:text-white mb-2">活动详情</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">描述</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {selectedEvent.description || '无描述'}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">日期和时间</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {globalDateService.formatDate(selectedEvent.startDate, 'display')} - {globalDateService.formatDate(selectedEvent.endDate, 'display')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">地点</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedEvent.isOnline ? '线上活动' : selectedEvent.location || '待定'}
                  </dd>
                </div>
              </div>
              {selectedEvent.pricing && !selectedEvent.isFree && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">价格信息</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    <div className="space-y-1">
                      <div>访客: RM {selectedEvent.pricing.regularPrice}</div>
                      <div>会员: RM {selectedEvent.pricing.memberPrice}</div>
                      <div>校友: RM {selectedEvent.pricing.alumniPrice}</div>
                      <div>早鸟: RM {selectedEvent.pricing.earlyBirdPrice}</div>
                    </div>
                  </dd>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null,
    },
    {
      key: 'registrations',
      label: '报名情况',
      content: (
        <div className="text-center py-8 text-gray-500">
          报名功能开发中...
        </div>
      ),
    },
    {
      key: 'analytics',
      label: '数据分析',
      content: (
        <div className="text-center py-8 text-gray-500">
          数据分析功能开发中...
        </div>
      ),
    },
  ];

  // ========== Render ==========
  
  return (
    <div className="event-list-page">
      {/* Page Header */}
      <PageHeader
        title="活动管理"
        breadcrumbs={[
          { title: '首页', path: '/' },
          { title: '活动管理' },
        ]}
        extra={
          <Space>
            <Button 
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              创建活动
            </Button>
          </Space>
        }
      />

      {/* Statistics Cards */}
      {stats && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="总活动数"
              value={stats.total}
              suffix="个"
              trend="up"
              trendLabel="+2.5%"
              color="primary"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="活跃活动"
              value={stats.active}
              suffix="个"
              trend="down"
              trendLabel="-1.2%"
              color="error"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="即将到来"
              value={stats.upcoming}
              suffix="个"
              trend="up"
              trendLabel="+5%"
              color="warning"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              title="已完成"
              value={stats.completed}
              suffix="个"
              trend="up"
              trendLabel="+10.1%"
              color="success"
            />
          </Col>
        </Row>
      )}

      {/* Filter Panel */}
      <FilterPanel
        fields={filterFields}
        onFilter={handleFilter}
        defaultCollapsed={false}
      />

      {/* Bulk Operation Bar */}
      <BulkOperationBar
        visible={selectedRowKeys.length > 0}
        selectedCount={selectedRowKeys.length}
        totalCount={pagination.total}
        actions={bulkActions}
        onDeselectAll={() => setSelectedRowKeys([])}
      />

      {/* Data Grid */}
      <DataGrid
        columns={columns}
        dataSource={events}
        loading={loading}
        rowKey="id"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          ...globalComponentService.getTableConfig().pagination,
        }}
        onChange={handleTableChange}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 1500 }}
      />

      {/* Detail Drawer */}
      <DetailDrawer
        visible={drawerVisible}
        title={selectedEvent?.name || '活动详情'}
        onClose={() => setDrawerVisible(false)}
        tabs={drawerTabs}
      />
    </div>
  );
};

export default EventListPage;

