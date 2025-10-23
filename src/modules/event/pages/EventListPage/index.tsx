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
  Select,
  Table,
  Card,
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
import { useAuthStore } from '@/stores/authStore';
import type { ColumnsType } from 'antd/es/table';
import './styles.css';

/**
 * Event List Page Component
 */
const EventListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
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
  
  // 🆕 批量设置负责理事状态
  const [bulkSetBoardMemberVisible, setBulkSetBoardMemberVisible] = useState(false);
  const [bulkBoardMember, setBulkBoardMember] = useState<string>('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // ========== Data Fetching ==========
  
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🎯 [EventListPage] Fetching events with params:', {
        page: pagination.current,
        pageSize: pagination.pageSize,
        limit: pagination.pageSize,
        searchParams
      });
      
      const result = await getEvents({
        page: pagination.current,
        limit: pagination.pageSize,
        ...searchParams,
      });
      
      console.log('📊 [EventListPage] Events loaded:', {
        count: result.data.length,
        total: result.total,
        events: result.data.map(e => ({
          id: e.id,
          name: e.name,
          startDate: e.startDate,
          status: e.status,
          boardMember: e.boardMember,
        }))
      });
      
      // 🆕 按负责理事分组并创建带分组行的数据源
      const grouped = groupEventsByBoardMember(result.data);
      
      // 🆕 创建带分组标题行的扁平数据
      const eventsWithGroupHeaders: any[] = [];
      grouped.forEach(group => {
        // 添加分组标题行
        eventsWithGroupHeaders.push({
          id: `group-${group.boardMember}`,
          isGroupHeader: true,
          boardMemberLabel: group.boardMember,
          eventCount: group.events.length,
        });
        // 添加该组的所有活动
        eventsWithGroupHeaders.push(...group.events);
      });
      
      console.log('📊 [EventListPage] Events with group headers:', {
        totalRows: eventsWithGroupHeaders.length,
        groupHeaders: eventsWithGroupHeaders.filter(e => e.isGroupHeader).length,
        actualEvents: result.data.length,
      });
      
      setEvents(eventsWithGroupHeaders);
      setPagination(prev => ({
        ...prev,
        total: result.total, // 保持真实的活动总数
      }));
    } catch (error) {
      message.error('获取活动列表失败');
      console.error('❌ [EventListPage] Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchParams]);
  
  // 🆕 按负责理事分组函数
  const groupEventsByBoardMember = (eventList: Event[]): { boardMember: string; events: Event[] }[] => {
    const boardMemberLabels: Record<string, string> = {
      'president': 'President（会长）',
      'secretary': 'Secretary（秘书）',
      'honorary-treasurer': 'Honorary Treasurer（名誉司库）',
      'general-legal-council': 'General Legal Council（法律顾问）',
      'executive-vp': 'Executive Vice President（执行副会长）',
      'vp-individual': 'VP Individual（个人发展副会长）',
      'vp-community': 'VP Community（社区发展副会长）',
      'vp-business': 'VP Business（商业发展副会长）',
      'vp-international': 'VP International（国际事务副会长）',
      'vp-lom': 'VP LOM（地方组织副会长）',
      'immediate-past-president': 'Immediate Past President（卸任会长）',
      '': '未设置负责理事',
    };
    
    // 按负责理事分组
    const groups: Record<string, Event[]> = {};
    eventList.forEach(event => {
      const boardMember = event.boardMember || '';
      if (!groups[boardMember]) {
        groups[boardMember] = [];
      }
      groups[boardMember].push(event);
    });
    
    // 转换为数组格式
    return Object.entries(groups).map(([boardMember, events]) => ({
      boardMember: boardMemberLabels[boardMember] || boardMember || '未设置负责理事',
      events,
    }));
  };

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

  const handleTableChange = (newPagination: any, _filters: any, _sorter: any) => {
    console.log('📊 [handleTableChange] Pagination changed:', {
      oldCurrent: pagination.current,
      oldPageSize: pagination.pageSize,
      newCurrent: newPagination.current,
      newPageSize: newPagination.pageSize,
      pageSizeChanged: pagination.pageSize !== newPagination.pageSize,
    });
    
    // 🔑 检测pageSize是否变化
    const pageSizeChanged = pagination.pageSize !== newPagination.pageSize;
    
    setPagination(prev => ({
      // 如果pageSize变化，重置到第1页
      current: pageSizeChanged ? 1 : (newPagination.current || prev.current),
      pageSize: newPagination.pageSize || prev.pageSize,
      total: prev.total,
    }));
  };

  const handleExport = () => {
    message.info('导出功能开发中...');
  };

  // ========== Bulk Operations ==========
  
  // 🆕 批量设置负责理事处理函数
  const handleBulkSetBoardMember = async () => {
    if (!bulkBoardMember) {
      message.error('请选择负责理事');
      return;
    }
    
    try {
      const { updateEvent } = await import('../../services/eventService');
      
      // 批量更新选中的活动
      await Promise.all(
        selectedRowKeys.map(key => 
          updateEvent(key as string, {
            boardMember: bulkBoardMember,
          } as any, user?.id || '')
        )
      );
      
      message.success(`已为 ${selectedRowKeys.length} 个活动设置负责理事`);
      setBulkSetBoardMemberVisible(false);
      setBulkBoardMember('');
      setSelectedRowKeys([]);
      fetchEvents(); // 重新加载列表
    } catch (error) {
      message.error('批量设置负责理事失败');
      console.error('Bulk set board member failed:', error);
    }
  };

  const bulkActions: BulkAction[] = [
    {
      key: 'set-board-member',
      label: '批量设置负责理事',
      icon: <EditOutlined />,
      onClick: () => {
        setBulkSetBoardMemberVisible(true);
      },
    },
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
    
  ];

  // ========== Table Columns ==========
  
  const columns: ColumnsType<any> = [
    {
      title: '活动名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      fixed: 'left',
      render: (text: string, record: any) => {
        // 🆕 如果是分组标题行，显示完整的分组信息
        if (record.isGroupHeader) {
          return {
            children: (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '8px 0',
              }}>
                <Tag color="purple" style={{ fontSize: 14, padding: '4px 0px', margin: 0 }}>
                  👑 {record.boardMemberLabel}
                </Tag>
                <span style={{ color: '#999', fontSize: 12 }}>
                  ({record.eventCount} 个活动)
                </span>
              </div>
            ),
            props: {
              colSpan: columns.length, // 跨所有列
            },
          };
        }
        // 正常活动行
        return (
          <a onClick={() => handleViewDetails(record.id)} className="text-primary hover:text-primary/80">
            {text}
          </a>
        );
      },
    },
    {
      title: '活动日期',
      dataIndex: 'startDate',
      key: 'date',
      width: 220,
      render: (startDate: string, record: any) => {
        // 🆕 分组标题行：隐藏此列
        if (record.isGroupHeader) {
          return { props: { colSpan: 0 } };
        }
        // 正常活动行：单行显示开始日期 - 结束日期
        return (
          <span>
            {globalDateService.formatDate(startDate, 'display')} - {globalDateService.formatDate(record.endDate, 'display')}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status: string, record: any) => {
        if (record.isGroupHeader) return { props: { colSpan: 0 } };
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
      render: (level: string, record: any) => {
        if (record.isGroupHeader) return { props: { colSpan: 0 } };
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
      render: (text: string, record: any) => {
        if (record.isGroupHeader) return { props: { colSpan: 0 } };
        return record.isOnline ? <Tag color="blue">线上</Tag> : text || '-';
      },
    },
    {
      title: '参与人数',
      dataIndex: 'currentParticipants',
      key: 'currentParticipants',
      width: 120,
      align: 'center',
      render: (count: number, record: any) => {
        if (record.isGroupHeader) return { props: { colSpan: 0 } };
        return (
          <a 
            onClick={() => navigate(`/events/${record.id}/registrations`)}
            className="text-primary hover:text-primary/80 cursor-pointer"
            style={{ textDecoration: 'none' }}
            title="查看报名管理"
          >
            <span style={{ fontWeight: 500 }}>
              {count}
              {record.maxParticipants && <span className="text-gray-400"> / {record.maxParticipants}</span>}
            </span>
          </a>
        );
      },
    },
    {
      title: '价格',
      dataIndex: 'pricing',
      key: 'pricing',
      width: 120,
      align: 'center',
      render: (pricing: any, record: any) => {
        if (record.isGroupHeader) return { props: { colSpan: 0 } };
        return record.isFree ? (
          <Tag color="green">免费</Tag>
        ) : (
          <span>RM {pricing?.memberPrice}</span>
        );
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      key: 'actions',
      width: 200,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: any) => {
        if (record.isGroupHeader) return { props: { colSpan: 0 } };
        return (
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
        );
      },
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
        collapsible={false}
        showPresets={false}
      />

      {/* Bulk Operation Bar */}
      <BulkOperationBar
        visible={selectedRowKeys.length > 0}
        selectedCount={selectedRowKeys.length}
        totalCount={pagination.total}
        actions={bulkActions}
        onDeselectAll={() => setSelectedRowKeys([])}
      />

      {/* 🆕 按负责理事分组显示 */}
      <Card>
        <Table
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
            onChange: (keys) => {
              // 过滤掉分组标题行的ID
              const filteredKeys = keys.filter(key => !String(key).startsWith('group-'));
              setSelectedRowKeys(filteredKeys);
            },
            getCheckboxProps: (record: any) => ({
              disabled: record.isGroupHeader, // 分组标题行不可选
            }),
          }}
          scroll={{ x: 1500 }}
          rowClassName={(record: any) => record.isGroupHeader ? 'group-header-row' : ''}
        />
      </Card>
      
      <style>{`
        .group-header-row {
          background: linear-gradient(135deg, #722ed1 0%, #9254de 100%) !important;
        }
        .group-header-row:hover {
          background: linear-gradient(135deg, #722ed1 0%, #9254de 100%) !important;
        }
        .group-header-row td {
          color: white !important;
          font-weight: 600 !important;
          border-top: 2px solid #722ed1 !important;
          padding: 12px 16px !important;
        }
      `}</style>

      {/* 🆕 批量设置负责理事Modal */}
      <Modal
        title="批量设置负责理事"
        open={bulkSetBoardMemberVisible}
        onOk={handleBulkSetBoardMember}
        onCancel={() => {
          setBulkSetBoardMemberVisible(false);
          setBulkBoardMember('');
        }}
        okText="确定设置"
        cancelText="取消"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ marginBottom: 8, color: '#666' }}>
            已选择 <strong style={{ color: '#1890ff' }}>{selectedRowKeys.length}</strong> 个活动
          </p>
          <p style={{ marginBottom: 16, fontSize: 12, color: '#999' }}>
            将为所有选中的活动设置相同的负责理事
          </p>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            选择负责理事 <span style={{ color: 'red' }}>*</span>
          </label>
          <Select
            style={{ width: '100%' }}
            placeholder="选择负责理事"
            value={bulkBoardMember || undefined}
            onChange={setBulkBoardMember}
          >
            <Select.Option value="president">President（会长）</Select.Option>
            <Select.Option value="secretary">Secretary（秘书）</Select.Option>
            <Select.Option value="honorary-treasurer">Honorary Treasurer（名誉司库）</Select.Option>
            <Select.Option value="general-legal-council">General Legal Council（法律顾问）</Select.Option>
            <Select.Option value="executive-vp">Executive Vice President（执行副会长）</Select.Option>
            <Select.Option value="vp-individual">VP Individual（个人发展副会长）</Select.Option>
            <Select.Option value="vp-community">VP Community（社区发展副会长）</Select.Option>
            <Select.Option value="vp-business">VP Business（商业发展副会长）</Select.Option>
            <Select.Option value="vp-international">VP International（国际事务副会长）</Select.Option>
            <Select.Option value="vp-lom">VP LOM（地方组织副会长）</Select.Option>
            <Select.Option value="immediate-past-president">Immediate Past President（卸任会长）</Select.Option>
          </Select>
        </div>
      </Modal>

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

