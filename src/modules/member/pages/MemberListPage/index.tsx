/**
 * Member List Page
 * 会员列表页面
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
  Input,
  Select,
  DatePicker,
  Form,
  Card,
  Table,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { 
  PageHeader, 
  MetricCard,
  DetailDrawer,
  BulkOperationBar,
  DataGrid,
  PermissionGuard,
} from '@/components';
import type { TabConfig, BulkAction } from '@/components';
import type { Member, MemberSearchParams, MemberStats } from '../../types';
import { 
  getMembers, 
  getMemberById,
  deleteMember, 
  getMemberStats,
  updateMember,
} from '../../services/memberService';
import { getMemberFeesByMemberId } from '@/modules/finance/services/memberFeeService';
import { getTransactions } from '@/modules/finance/services/transactionService';
import type { MemberFee } from '@/modules/finance/types';
import type { Transaction } from '@/modules/finance/types';
import { 
  MEMBER_STATUS_OPTIONS, 
  MEMBER_CATEGORY_OPTIONS, 
  MEMBER_LEVEL_OPTIONS 
} from '../../types';
import { handleAsyncOperation } from '@/utils/errorHelpers';
import type { DataGridColumn } from '@/components';
import './styles.css';

/**
 * Member List Page Component
 */
const { Option } = Select;
const { RangePicker } = DatePicker;

const MemberListPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  
  // Search & Filter
  const [searchParams, setSearchParams] = useState<MemberSearchParams>({});
  const [searchText, setSearchText] = useState('');
  
  // New UI States
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  // Bulk edit modals
  const [bulkCategoryVisible, setBulkCategoryVisible] = useState(false);
  const [bulkLevelVisible, setBulkLevelVisible] = useState(false);
  const [bulkStatusVisible, setBulkStatusVisible] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkSelectedCategory, setBulkSelectedCategory] = useState<string>('');
  const [bulkSelectedLevel, setBulkSelectedLevel] = useState<string>('');
  const [bulkSelectedStatus, setBulkSelectedStatus] = useState<string>('');

  // ========== Data Fetching ==========
  
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMembers({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        ...searchParams,
      });
      
      setMembers(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.total,
      }));
    } catch (error) {
      message.error('获取会员列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, searchParams]);
  
  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getMemberStats();
      setStats(statsData);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }, []);
  
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);
  
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ========== Actions ==========
  
  const handleCreate = () => {
    navigate('/members/create');
  };
  
  const handleView = (memberId: string) => {
    navigate(`/members/${memberId}`);
  };
  
  const handleEdit = (memberId: string) => {
    navigate(`/members/${memberId}/edit`);
  };
  
  const handleDelete = async (memberId: string, memberName: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除会员 "${memberName}" 吗？此操作不可撤销。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const result = await handleAsyncOperation(
          () => deleteMember(memberId),
          '会员删除成功',
          '会员删除失败'
        );
        
        if (result !== null) {
          fetchMembers();
          fetchStats();
        }
      },
    });
  };
  
  const handleFilterChange = (key: keyof MemberSearchParams, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value,
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };
  
  const handleRefresh = () => {
    fetchMembers();
    fetchStats();
  };

  /**
   * 处理筛选变化（自动触发）
   */
  const handleFilterChangeAuto = (values: Record<string, any>) => {
    const newParams: MemberSearchParams = {};
    
    // 搜索关键词
    if (values.search) {
      setSearchText(values.search);
    }
    
    // 单个字段筛选
    if (values.category) newParams.category = values.category;
    if (values.status) newParams.status = values.status;
    if (values.level) newParams.level = values.level;
    if (values.joinDateRange && values.joinDateRange.length === 2) {
      newParams.dateFrom = values.joinDateRange[0].format('YYYY-MM-DD');
      newParams.dateTo = values.joinDateRange[1].format('YYYY-MM-DD');
    }
    
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, current: 1 }));
  };
  
  /**
   * 重置筛选
   */
  const handleResetFilter = () => {
    form.resetFields();
    setSearchText('');
    setSearchParams({});
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /**
   * 会费记录标签页组件
   */
  const MemberFeesTab: React.FC<{ memberId: string }> = ({ memberId }) => {
    const [loadingFees, setLoadingFees] = useState(false);
    const [fees, setFees] = useState<MemberFee[]>([]);
    const [fallbackTxns, setFallbackTxns] = useState<Transaction[]>([]);

    useEffect(() => {
      const loadFees = async () => {
        setLoadingFees(true);
        try {
          const data = await getMemberFeesByMemberId(memberId);
          setFees(data);

          // 如果没有会费记录，尝试读取已关联的交易作为回退展示
          if (!data || data.length === 0) {
            const txnResult = await getTransactions({
              page: 1,
              limit: 50,
              category: 'member-fees',
              includeVirtual: true,
              sortBy: 'transactionDate',
              sortOrder: 'desc',
            });
            const related = txnResult.data.filter((t: any) => (t as any)?.metadata?.memberId === memberId);
            setFallbackTxns(related as Transaction[]);
          } else {
            setFallbackTxns([]);
          }
        } catch (e) {
          message.error('加载会费记录失败');
        } finally {
          setLoadingFees(false);
        }
      };
      loadFees();
    }, [memberId]);

    const columns = [
      { title: '财年', dataIndex: 'fiscalYear', key: 'fiscalYear', width: 100 },
      { title: '类型', dataIndex: 'feeType', key: 'feeType', width: 120 },
      { title: '金额', dataIndex: 'expectedAmount', key: 'expectedAmount', width: 100, align: 'right', render: (v: number) => `RM ${Number(v || 0).toFixed(2)}` },
      { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (s: string) => {
          const map: Record<string, { color: string; text: string }> = {
            paid: { color: 'success', text: '已付' },
            unpaid: { color: 'warning', text: '未付' },
            partial: { color: 'processing', text: '部分付款' },
            overdue: { color: 'error', text: '逾期' },
            waived: { color: 'default', text: '豁免' },
            cancelled: { color: 'default', text: '取消' },
          };
          const cfg = map[s] || { color: 'default', text: s };
          return <Tag color={cfg.color}>{cfg.text}</Tag>;
        }
      },
      { title: '到期日', dataIndex: 'dueDate', key: 'dueDate', width: 120, render: (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
      { title: '付款日', dataIndex: 'paymentDate', key: 'paymentDate', width: 120, render: (d?: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
    ];

    if (fees && fees.length > 0) {
      return (
        <Table
          size="small"
          rowKey="id"
          loading={loadingFees}
          columns={columns as any}
          dataSource={fees}
          pagination={false}
        />
      );
    }

    // 回退：显示已关联的交易提示
    const txColumns = [
      { title: '日期', dataIndex: 'transactionDate', key: 'transactionDate', width: 120, render: (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
      { title: '描述', dataIndex: 'mainDescription', key: 'mainDescription', width: 220 },
      { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right', render: (v: number, r: any) => `${r.transactionType === 'income' ? '+' : '-'}RM ${(v ?? 0).toFixed(2)}` },
      { title: '二次分类', dataIndex: 'subCategory', key: 'subCategory', width: 140 },
      { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    ];

    return (
      <div>
        <div style={{ marginBottom: 8, color: '#999' }}>
          未找到正式“会费记录”。已为您显示与该会员关联的“会员费交易记录”。
        </div>
        <Table
          size="small"
          rowKey="id"
          loading={loadingFees}
          columns={txColumns as any}
          dataSource={fallbackTxns}
          pagination={false}
        />
      </div>
    );
  };
  
  // ========== Bulk Operations ==========
  
  /**
   * 批量删除
   */
  const handleBatchDelete = async (ids: string[]) => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${ids.length} 个会员吗？此操作不可撤销。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 逐个删除
          await Promise.all(ids.map(id => deleteMember(id)));
          message.success(`成功删除 ${ids.length} 个会员`);
          setSelectedRowKeys([]);
          fetchMembers();
          fetchStats();
        } catch (error) {
          message.error('批量删除失败');
          console.error(error);
        }
      },
    });
  };
  
  /**
   * 批量导出
   */
  const handleBatchExport = (ids: string[]) => {
    const exportData = members.filter(m => ids.includes(m.id));
    console.log('导出数据:', exportData);
    message.success(`正在导出 ${ids.length} 条数据...`);
    // 这里可以调用实际的导出服务
  };

  // 批量更新通用处理
  const handleBulkUpdate = async (field: 'category' | 'level' | 'status', value: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要更新的会员');
      return;
    }
    try {
      setBulkUpdating(true);
      await Promise.all(
        (selectedRowKeys as string[]).map(id =>
          updateMember(id, { [field]: value } as any, 'system')
        )
      );
      message.success(`已更新 ${selectedRowKeys.length} 个会员`);
      setSelectedRowKeys([]);
      fetchMembers();
      fetchStats();
    } catch (e) {
      message.error('批量更新失败');
    } finally {
      setBulkUpdating(false);
      setBulkCategoryVisible(false);
      setBulkLevelVisible(false);
      setBulkStatusVisible(false);
      setBulkSelectedCategory('');
      setBulkSelectedLevel('');
      setBulkSelectedStatus('');
    }
  };
  
  /**
   * 批量操作配置
   */
  const bulkActions: BulkAction[] = [
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      onClick: () => handleBatchDelete(selectedRowKeys as string[]),
      danger: true,
      confirmMessage: `确定要删除选中的 ${selectedRowKeys.length} 个会员吗？`,
    },
    {
      key: 'export',
      label: '导出',
      icon: <ReloadOutlined />,
      onClick: () => handleBatchExport(selectedRowKeys as string[]),
    },
    {
      key: 'set-category',
      label: '设置分类',
      onClick: () => setBulkCategoryVisible(true),
    },
    {
      key: 'set-level',
      label: '设置级别',
      onClick: () => setBulkLevelVisible(true),
    },
    {
      key: 'set-status',
      label: '设置状态',
      onClick: () => setBulkStatusVisible(true),
    },
  ];
  
  // ========== DetailDrawer Configuration ==========
  
  /**
   * 打开详情抽屉
   */
  const handleViewDetail = (member: Member) => {
    setSelectedMember(member);
    setDrawerVisible(true);
  };
  
  /**
   * 详情抽屉标签页
   */
  const detailTabs: TabConfig[] = selectedMember ? [
    {
      key: 'basic',
      label: '基本信息',
      icon: <EyeOutlined />,
      content: (
        <div style={{ padding: '24px' }}>
          <Row gutter={[16, 16]}>
            <Col span={8}><strong>会员编号:</strong></Col>
            <Col span={16}>{selectedMember.memberId}</Col>
            
            <Col span={8}><strong>姓名:</strong></Col>
            <Col span={16}>{selectedMember.name}</Col>
            
            <Col span={8}><strong>邮箱:</strong></Col>
            <Col span={16}>{selectedMember.email}</Col>
            
            <Col span={8}><strong>电话:</strong></Col>
            <Col span={16}>{selectedMember.phone}</Col>
            
            <Col span={8}><strong>状态:</strong></Col>
            <Col span={16}>
              <Tag color={selectedMember.status === 'active' ? 'success' : 'default'}>
                {MEMBER_STATUS_OPTIONS.find(o => o.value === selectedMember.status)?.label}
              </Tag>
            </Col>
            
            <Col span={8}><strong>类别:</strong></Col>
            <Col span={16}>
              <Tag color="blue">
                {MEMBER_CATEGORY_OPTIONS.find(o => o.value === selectedMember.category)?.label || '-'}
              </Tag>
            </Col>
            
            <Col span={8}><strong>级别:</strong></Col>
            <Col span={16}>
              <Tag color="gold">
                {MEMBER_LEVEL_OPTIONS.find(o => o.value === selectedMember.level)?.label}
              </Tag>
            </Col>
            
            <Col span={8}><strong>入会日期:</strong></Col>
            <Col span={16}>{selectedMember.joinDate ? new Date(selectedMember.joinDate).toLocaleDateString('zh-CN') : '-'}</Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'member-fees',
      label: '会费记录',
      content: (
        <div style={{ padding: '16px' }}>
          <MemberFeesTab memberId={selectedMember.id} />
        </div>
      ),
    },
    {
      key: 'profile',
      label: '档案详情',
      content: (
        <div style={{ padding: '24px' }}>
          <p>公司: {selectedMember.profile?.company || '-'}</p>
          <p>职位: {selectedMember.profile?.departmentAndPosition || '-'}</p>
          <p>性别: {selectedMember.profile?.gender || '-'}</p>
          <p>生日: {selectedMember.profile?.birthDate || '-'}</p>
        </div>
      ),
    },
  ] : [];

  // ========== Table Columns ==========
  
  const columns: DataGridColumn<Member>[] = [
    {
      title: '会员ID',
      dataIndex: 'memberId',
      key: 'memberId',
      width: 120,
      fixed: 'left',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const option = MEMBER_CATEGORY_OPTIONS.find(opt => opt.value === category);
        return category ? <Tag color="blue">{option?.label || category}</Tag> : '-';
      },
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => {
        const colors: Record<string, string> = {
          bronze: 'default',
          silver: 'blue',
          gold: 'gold',
          platinum: 'purple',
          diamond: 'magenta',
        };
        const option = MEMBER_LEVEL_OPTIONS.find(opt => opt.value === level);
        return <Tag color={colors[level] || 'default'}>{option?.label || level}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          active: 'success',
          inactive: 'default',
          pending: 'processing',
          suspended: 'error',
        };
        const option = MEMBER_STATUS_OPTIONS.find(opt => opt.value === status);
        return <Tag color={colors[status] || 'default'}>{option?.label || status}</Tag>;
      },
    },
    {
      title: '分会',
      dataIndex: 'chapter',
      key: 'chapter',
      width: 120,
      render: (chapter: string) => chapter || '-',
    },
    {
      title: '加入日期',
      dataIndex: 'joinDate',
      key: 'joinDate',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '操作',
      dataIndex: 'id',
      key: 'actions',
      width: 180,
      fixed: 'right',
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
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id, record.name)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // ========== Render ==========
  
  return (
    <PermissionGuard permissions="MEMBER_MANAGEMENT">
      <div className="member-list-page">
      {/* Statistics - 使用 MetricCard */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <MetricCard
              title="总会员数"
              value={stats.total}
              prefix={<TeamOutlined />}
              onClick={() => handleFilterChange('status', undefined)}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <MetricCard
              title="活跃会员"
              value={stats.active}
              prefix={<TeamOutlined />}
              trend="up"
              trendValue={`${stats.active}/${stats.total}`}
              trendLabel="占比"
              color="#52c41a"
              onClick={() => handleFilterChange('status', 'active')}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <MetricCard
              title="本月新增"
              value={stats.newThisMonth}
              prefix={<UserAddOutlined />}
              trend={stats.newThisMonth > 0 ? 'up' : 'neutral'}
              trendValue={`+${stats.newThisMonth}`}
              trendLabel="本月"
              color="#13c2c2"
              onClick={() => handleFilterChange('newThisMonth', true)}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <MetricCard
              title="即将到期"
              value={stats.expiringThisMonth}
              prefix={<ClockCircleOutlined />}
              trend={stats.expiringThisMonth > 0 ? 'down' : 'neutral'}
              trendValue={`${stats.expiringThisMonth}`}
              trendLabel="需关注"
              color="#faad14"
              onClick={() => handleFilterChange('expiringThisMonth', true)}
            />
          </Col>
        </Row>
      )}
      
      {/* Page Header */}
      <PageHeader
        title="会员管理"
        extra={[
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新增会员
          </Button>,
        ]}
      />
      
      {/* 筛选控件 - 直接显示 */}
      <Card style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="inline"
          onValuesChange={handleFilterChangeAuto}
          style={{ marginBottom: 0 }}
        >
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="search">
                <Input
                  placeholder="搜索会员信息..."
                  prefix={<SearchOutlined />}
                  allowClear
                  onChange={(e) => {
                    // 搜索框防抖
                    setTimeout(() => {
                      handleFilterChangeAuto({ ...form.getFieldsValue(), search: e.target.value });
                    }, 300);
                  }}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="category">
                <Select
                  placeholder="会员类别"
                  allowClear
                  style={{ minWidth: '120px' }}
                >
                  {MEMBER_CATEGORY_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="status">
                <Select
                  placeholder="状态"
                  allowClear
                  mode="multiple"
                  style={{ minWidth: '120px' }}
                >
                  {MEMBER_STATUS_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="level">
                <Select
                  placeholder="级别"
                  allowClear
                  style={{ minWidth: '120px' }}
                >
                  {MEMBER_LEVEL_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="joinDateRange">
                <RangePicker
                  placeholder={['开始日期', '结束日期']}
                  style={{ minWidth: '120px' }}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12} md={8} lg={2}>
              <Form.Item>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleResetFilter}
                  style={{ width: '100%' }}
                >
                  重置
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
      
      {/* Data Grid - 带批量操作 */}
      <DataGrid
        columns={columns}
        dataSource={members}
        loading={loading}
        rowKey="id"
        batchOperable={true}
        onBatchDelete={handleBatchDelete}
        onBatchExport={handleBatchExport}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          ...pagination,
          onChange: (page, pageSize) => {
            setPagination(prev => ({
              ...prev,
              current: page,
              pageSize: pageSize || 20,
            }));
          },
        }}
        scroll={{ x: 1500 }}
      />
      
      {/* 批量操作栏 */}
      <BulkOperationBar
        visible={selectedRowKeys.length > 0}
        selectedCount={selectedRowKeys.length}
        totalCount={members.length}
        actions={bulkActions}
        onSelectAll={() => setSelectedRowKeys(members.map(m => m.id))}
        onDeselectAll={() => setSelectedRowKeys([])}
      />
      
      {/* 详情抽屉 */}
      <DetailDrawer
        visible={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedMember(null);
        }}
        title={selectedMember?.name || '会员详情'}
        subtitle={selectedMember ? `${selectedMember.memberId} - ${MEMBER_STATUS_OPTIONS.find(o => o.value === selectedMember.status)?.label}` : ''}
        tabs={detailTabs}
        actions={selectedMember ? [
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            type: 'primary',
            onClick: () => {
              setDrawerVisible(false);
              handleEdit(selectedMember.id);
            },
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              setDrawerVisible(false);
              handleDelete(selectedMember.id, selectedMember.name);
            },
          },
        ] : []}
        footerActions={selectedMember ? [
          {
            key: 'full',
            label: '查看完整档案',
            onClick: () => {
              setDrawerVisible(false);
              handleView(selectedMember.id);
            },
          },
        ] : []}
        width={720}
        onRefresh={() => selectedMember && getMemberById(selectedMember.id).then(m => m && setSelectedMember(m))}
      />

      {/* 批量设置分类 */}
      <Modal
        title={`批量设置分类（已选 ${selectedRowKeys.length} 人）`}
        open={bulkCategoryVisible}
        onCancel={() => setBulkCategoryVisible(false)}
        onOk={() => {
          if (!bulkSelectedCategory) {
            message.warning('请选择分类');
            return;
          }
          handleBulkUpdate('category', bulkSelectedCategory);
        }}
        confirmLoading={bulkUpdating}
      >
        <Select
          placeholder="选择会员类别"
          style={{ width: '100%' }}
          value={bulkSelectedCategory || undefined}
          onChange={setBulkSelectedCategory}
          options={MEMBER_CATEGORY_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
        />
      </Modal>

      {/* 批量设置级别 */}
      <Modal
        title={`批量设置级别（已选 ${selectedRowKeys.length} 人）`}
        open={bulkLevelVisible}
        onCancel={() => setBulkLevelVisible(false)}
        onOk={() => {
          if (!bulkSelectedLevel) {
            message.warning('请选择级别');
            return;
          }
          handleBulkUpdate('level', bulkSelectedLevel);
        }}
        confirmLoading={bulkUpdating}
      >
        <Select
          placeholder="选择级别"
          style={{ width: '100%' }}
          value={bulkSelectedLevel || undefined}
          onChange={setBulkSelectedLevel}
          options={MEMBER_LEVEL_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
        />
      </Modal>

      {/* 批量设置状态 */}
      <Modal
        title={`批量设置状态（已选 ${selectedRowKeys.length} 人）`}
        open={bulkStatusVisible}
        onCancel={() => setBulkStatusVisible(false)}
        onOk={() => {
          if (!bulkSelectedStatus) {
            message.warning('请选择状态');
            return;
          }
          handleBulkUpdate('status', bulkSelectedStatus);
        }}
        confirmLoading={bulkUpdating}
      >
        <Select
          placeholder="选择状态"
          style={{ width: '100%' }}
          value={bulkSelectedStatus || undefined}
          onChange={setBulkSelectedStatus}
          options={MEMBER_STATUS_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
        />
      </Modal>
      </div>
    </PermissionGuard>
  );
};

export default MemberListPage;

