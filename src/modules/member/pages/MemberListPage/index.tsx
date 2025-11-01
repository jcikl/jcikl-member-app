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
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  BankOutlined,
  TrophyOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
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
  const [activeTab, setActiveTab] = useState<string>('all'); // 🆕 标签页状态
  
  // ⚡ Performance: Cache for tab data (prevents re-fetching on tab switch)
  const [tabDataCache, setTabDataCache] = useState<Record<string, { data: Member[]; total: number; timestamp: number }>>({});
  const TAB_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  
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
    // ⚡ Performance: Check cache first
    const cacheKey = `${activeTab}-${pagination.current}-${searchText}-${JSON.stringify(searchParams)}`;
    const cached = tabDataCache[cacheKey];
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < TAB_CACHE_TTL && !searchText) {
      console.log('⚡ [Cache] Using cached tab data:', cacheKey);
      setMembers(cached.data);
      setPagination(prev => ({ ...prev, total: cached.total }));
      return;
    }
    
    setLoading(true);
    try {
      // 🆕 根据 activeTab 自动设置分类筛选
      const categoryFilter = activeTab !== 'all' ? (activeTab as any) : undefined;
      console.log('[MemberListPage.fetchMembers] activeTab/categoryFilter:', { activeTab, categoryFilter, searchText, searchParams });
      
      const result = await getMembers({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        ...searchParams,
        category: categoryFilter, // 🆕 添加分类筛选
      });
      
      // 🆕 Alumni 标签：显示 40 岁及以上会员（或已标记为 Alumni）
      const isAlumniTab = activeTab === 'Alumni';
      // 🆕 Visiting Member 标签：显示护照/证件不属于马来西亚(或已标记为 Visiting Member)
      const isVisitingTab = activeTab === 'Visiting Member';
      // 🆕 Honorary Member 标签：显示拥有 senatorId 的会员
      const isHonoraryTab = activeTab === 'Honorary Member';
      const computeAge = (birth?: string): number | undefined => {
        if (!birth || typeof birth !== 'string') return undefined;
        const date = new Date(birth);
        if (Number.isNaN(date.getTime())) return undefined;
        const today = new Date();
        let age = today.getFullYear() - date.getFullYear();
        const m = today.getMonth() - date.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
        return age;
      };
      const isNonMalaysiaId = (val?: string): boolean => {
        if (!val || typeof val !== 'string') return false;
        const digitsOnly = val.replace(/\D/g, '');
        // 马来西亚NRIC: 12位纯数字(忽略符号和空格)；否则视为非马来
        return !/^\d{12}$/.test(digitsOnly);
      };

      let data = result.data as any[];
      if (isAlumniTab) {
        data = data.filter((m: any) => {
          const byCategory = (m?.jciCareer?.category) === 'Alumni';
          const age = computeAge(m?.profile?.birthDate);
          const byAge = typeof age === 'number' && age >= 40;
          // 仅限马来西亚NRIC（12位数字），非马来证件排除
          const isMalaysia = !!m?.profile?.nricOrPassport && /^\d{12}$/.test(String(m.profile.nricOrPassport).replace(/\D/g, ''));
          if (!isMalaysia) return false;
          return byCategory || byAge;
        });
      }
      if (isVisitingTab) {
        data = data.filter((m: any) => {
          const byCategory = (m?.jciCareer?.category) === 'Visiting Member';
          const byId = isNonMalaysiaId(m?.profile?.nricOrPassport);
          return byCategory || byId;
        });
      }
      if (isHonoraryTab) {
        data = data.filter((m: any) => {
          const senatorId = (m?.jciCareer?.senatorId || '').toString().trim();
          return senatorId.length > 0;
        });
      }

      setMembers(data);
      const totalCount = (isAlumniTab || isVisitingTab || isHonoraryTab) ? data.length : result.total;
      setPagination(prev => ({
        ...prev,
        total: totalCount,
      }));
      
      // ⚡ Performance: Update cache (exclude search queries)
      if (!searchText) {
        setTabDataCache(prev => ({
          ...prev,
          [cacheKey]: {
            data,
            total: totalCount,
            timestamp: now,
          },
        }));
        console.log('✅ [Cache] Cached tab data:', cacheKey);
      }
    } catch (error) {
      message.error('获取会员列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, searchParams, activeTab, tabDataCache, TAB_CACHE_TTL]);
  
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

  // ========== Tab Handling ==========
  
  // 🆕 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPagination(prev => ({
      ...prev,
      current: 1, // 重置到第一页
    }));
    setSelectedRowKeys([]); // 清除选中
  };

  // ========== Actions ==========
  
  const handleCreate = () => {
    navigate('/members/create');
  };
  
  const handleView = (memberId: string) => {
    navigate(`/members/${memberId}`);
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
   * 处理筛选变化(自动触发)
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
      { title: '二次分类', dataIndex: 'txAccount', key: 'txAccount', width: 140 },
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
          {/* 基本信息 */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
              📋 基本信息
            </h3>
            <Row gutter={[16, 16]}>
              <Col span={8}><strong>会员编号:</strong></Col>
              <Col span={16}>{(selectedMember as any).profile?.memberId || '-'}</Col>
              
              <Col span={8}><strong>姓名:</strong></Col>
              <Col span={16}>{(selectedMember as any).profile?.name || '-'}</Col>
              
              <Col span={8}><strong>性别:</strong></Col>
              <Col span={16}>
                {(selectedMember as any).profile?.gender ? (
                  <Tag color={(selectedMember as any).profile.gender === 'Male' ? 'blue' : 'pink'}>
                    {(selectedMember as any).profile.gender === 'Male' ? '男' : '女'}
                  </Tag>
                ) : '-'}
              </Col>
              
              <Col span={8}><strong>生日:</strong></Col>
              <Col span={16}>{(selectedMember as any).profile?.birthDate || '-'}</Col>
              
              <Col span={8}><strong>国籍:</strong></Col>
              <Col span={16}>{(selectedMember as any).profile?.nationality || '-'}</Col>
              
              <Col span={8}><strong>身份证号:</strong></Col>
              <Col span={16}>{(selectedMember as any).profile?.nricOrPassport || '-'}</Col>
              
              <Col span={8}><strong>状态:</strong></Col>
              <Col span={16}>
                <Tag color={((selectedMember as any).profile?.status) === 'active' ? 'success' : 'default'}>
                  {MEMBER_STATUS_OPTIONS.find(o => o.value === (selectedMember as any).profile?.status)?.label || (selectedMember as any).profile?.status || '-'}
                </Tag>
              </Col>
              
              <Col span={8}><strong>类别:</strong></Col>
              <Col span={16}>
                <Tag color="blue">
                  {MEMBER_CATEGORY_OPTIONS.find(o => o.value === (selectedMember as any).jciCareer?.category)?.label || (selectedMember as any).jciCareer?.category || '-'}
                </Tag>
              </Col>
              
              <Col span={8}><strong>级别:</strong></Col>
              <Col span={16}>
                <Tag color="gold">
                  {MEMBER_LEVEL_OPTIONS.find(o => o.value === (selectedMember as any).profile?.level)?.label || (selectedMember as any).profile?.level || '-'}
                </Tag>
              </Col>
              
              <Col span={8}><strong>入会日期:</strong></Col>
              <Col span={16}>{(selectedMember as any).jciCareer?.joinDate ? new Date((selectedMember as any).jciCareer.joinDate).toLocaleDateString('zh-CN') : '-'}</Col>
            </Row>
          </div>

          {/* 联系信息 */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
              📞 联系信息
            </h3>
            <Row gutter={[16, 16]}>
              <Col span={8}><strong>邮箱:</strong></Col>
              <Col span={16}>{(selectedMember as any).profile?.email || '-'}</Col>
              
              <Col span={8}><strong>电话:</strong></Col>
              <Col span={16}>{(selectedMember as any).profile?.phone || '-'}</Col>
              
              <Col span={8}><strong>备用电话:</strong></Col>
              <Col span={16}>{selectedMember.profile?.alternativePhone || '-'}</Col>
              
              <Col span={8}><strong>紧急联系人:</strong></Col>
              <Col span={16}>
                {selectedMember.profile?.emergencyContact ? (
                  <div>
                    <div><strong>姓名:</strong> {selectedMember.profile.emergencyContact.name}</div>
                    <div><strong>电话:</strong> {selectedMember.profile.emergencyContact.phone}</div>
                    <div><strong>关系:</strong> {selectedMember.profile.emergencyContact.relationship}</div>
                  </div>
                ) : '-'}
              </Col>
            </Row>
          </div>

          {/* 地址信息 */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
              🏠 地址信息
            </h3>
            <Row gutter={[16, 16]}>
              {typeof selectedMember.profile?.address === 'string' ? (
                <>
                  <Col span={8}><strong>完整地址:</strong></Col>
                  <Col span={16}>{(selectedMember as any).profile.address}</Col>
                </>
              ) : (
                <>
                  <Col span={8}><strong>街道地址:</strong></Col>
                  <Col span={16}>{(selectedMember as any).profile?.address?.street || '-'}</Col>
                  
                  <Col span={8}><strong>城市:</strong></Col>
                  <Col span={16}>{(selectedMember as any).profile?.address?.city || '-'}</Col>
                  
                  <Col span={8}><strong>州/省:</strong></Col>
                  <Col span={16}>{(selectedMember as any).profile?.address?.state || '-'}</Col>
                  
                  <Col span={8}><strong>邮编:</strong></Col>
                  <Col span={16}>{(selectedMember as any).profile?.address?.postcode || '-'}</Col>
                  
                  <Col span={8}><strong>国家:</strong></Col>
                  <Col span={16}>{(selectedMember as any).profile?.address?.country || '-'}</Col>
                </>
              )}
            </Row>
          </div>

          {/* 社交媒体 */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
              🌐 社交媒体
            </h3>
            <Row gutter={[16, 16]}>
              <Col span={8}><strong>Facebook:</strong></Col>
              <Col span={16}>
                {(selectedMember as any).profile?.socialMedia?.facebook ? (
                  <a href={(selectedMember as any).profile.socialMedia.facebook} target="_blank" rel="noopener noreferrer">
                    {(selectedMember as any).profile.socialMedia.facebook}
                  </a>
                ) : '-'}
              </Col>
              
              <Col span={8}><strong>LinkedIn:</strong></Col>
              <Col span={16}>
                {(selectedMember as any).profile?.socialMedia?.linkedin ? (
                  <a href={(selectedMember as any).profile.socialMedia.linkedin} target="_blank" rel="noopener noreferrer">
                    {(selectedMember as any).profile.socialMedia.linkedin}
                  </a>
                ) : '-'}
              </Col>
              
              <Col span={8}><strong>Instagram:</strong></Col>
              <Col span={16}>
                {(selectedMember as any).profile?.socialMedia?.instagram ? (
                  <a href={(selectedMember as any).profile.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
                    {(selectedMember as any).profile.socialMedia.instagram}
                  </a>
                ) : '-'}
              </Col>
              
              <Col span={8}><strong>微信:</strong></Col>
              <Col span={16}>{(selectedMember as any).profile?.socialMedia?.wechat || '-'}</Col>
            </Row>
          </div>
        </div>
      ),
    },
    {
      key: 'member-fees',
      label: '会费',
      content: (
        <div style={{ padding: '16px' }}>
          <MemberFeesTab memberId={selectedMember.id} />
        </div>
      ),
    },
    {
      key: 'career-business',
      label: '职业商业',
      icon: <BankOutlined />,
      content: (
        <div style={{ padding: '24px' }}>
          <Row gutter={[16, 24]}>
            {/* 职业信息 */}
            <Col span={24}>
              <h3 style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                💼 职业信息
              </h3>
            </Col>
            
            <Col span={8}><strong>公司名称:</strong></Col>
            <Col span={16}>{(selectedMember as any).business?.company || '-'}</Col>
            
            <Col span={8}><strong>部门与职位:</strong></Col>
            <Col span={16}>{(selectedMember as any).business?.departmentAndPosition || '-'}</Col>
            
            <Col span={8}><strong>公司介绍:</strong></Col>
            <Col span={16}>
              {(selectedMember as any).business?.companyIntro || '-'}
            </Col>
            
            {/* 商业信息 */}
            <Col span={24}>
              <h3 style={{ marginTop: 16, marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                🏢 商业信息
              </h3>
            </Col>
            
            <Col span={8}><strong>自有行业:</strong></Col>
            <Col span={16}>
              {(() => {
                const raw = (selectedMember as any).business?.ownIndustry;
                const toArray = (v: any): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x)
                  : v && typeof v === 'object' ? Object.values(v).filter((x): x is string => typeof x === 'string' && !!x)
                  : typeof v === 'string' && v ? [v] : [];
                const arr = toArray(raw);
                return arr.length > 0 ? (
                <Space wrap>
                    {arr.map((industry: string, idx: number) => (
                    <Tag key={idx} color="blue">{industry}</Tag>
                  ))}
                </Space>
                ) : '-';
              })()}
            </Col>
            
            <Col span={8}><strong>感兴趣的行业:</strong></Col>
            <Col span={16}>
              {(() => {
                const raw = (selectedMember as any).business?.interestedIndustries;
                const toArray = (v: any): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x)
                  : v && typeof v === 'object' ? Object.values(v).filter((x): x is string => typeof x === 'string' && !!x)
                  : typeof v === 'string' && v ? [v] : [];
                const arr = toArray(raw);
                return arr.length > 0 ? (
                <Space wrap>
                    {arr.map((industry: string, idx: number) => (
                    <Tag key={idx} color="green">{industry}</Tag>
                  ))}
                </Space>
                ) : '-';
              })()}
            </Col>
            
            <Col span={8}><strong>业务类别:</strong></Col>
            <Col span={16}>
              {(() => {
                const raw = (selectedMember as any).business?.businessCategories;
                const toArray = (v: any): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x)
                  : v && typeof v === 'object' ? Object.values(v).filter((x): x is string => typeof x === 'string' && !!x)
                  : typeof v === 'string' && v ? [v] : [];
                const arr = toArray(raw);
                return arr.length > 0 ? (
                <Space wrap>
                    {arr.map((category: string, idx: number) => (
                    <Tag key={idx} color="purple">{category}</Tag>
                  ))}
                </Space>
                ) : '-';
              })()}
            </Col>
            
            <Col span={8}><strong>接受国际业务:</strong></Col>
            <Col span={16}>
              <Tag color={
                (selectedMember as any).business?.acceptInternationalBusiness === 'Yes' ? 'success' :
                (selectedMember as any).business?.acceptInternationalBusiness === 'Willing to explore' ? 'processing' :
                'default'
              }>
                {(selectedMember as any).business?.acceptInternationalBusiness || '-'}
              </Tag>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'jci-development',
      label: 'JCI发展',
      icon: <TrophyOutlined />,
      content: (
        <div style={{ padding: '24px' }}>
          <Row gutter={[16, 24]}>
            {/* JCI 相关 */}
            <Col span={24}>
              <h3 style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                🏆 JCI 相关
              </h3>
            </Col>
            
            <Col span={8}><strong>JCI 职位:</strong></Col>
            <Col span={16}>
              {(selectedMember as any).jciCareer?.jciPosition ? (
                <Tag color="gold">{(selectedMember as any).jciCareer.jciPosition}</Tag>
              ) : '-'}
            </Col>
            
            <Col span={8}><strong>参议员编号:</strong></Col>
            <Col span={16}>{(selectedMember as any).jciCareer?.senatorId || '-'}</Col>
            
            <Col span={8}><strong>参议员积分:</strong></Col>
            <Col span={16}>
              {(selectedMember as any).jciCareer?.senatorScore !== undefined ? (
                <Tag color="magenta">{(selectedMember as any).jciCareer.senatorScore} 分</Tag>
              ) : '-'}
            </Col>
            
            <Col span={8}><strong>介绍人:</strong></Col>
            <Col span={16}>
              {(selectedMember as any).jciCareer?.introducerName || '-'}
              {(selectedMember as any).jciCareer?.introducerId && (
                <span style={{ color: '#999', marginLeft: 8 }}>
                  (ID: {(selectedMember as any).jciCareer.introducerId})
                </span>
              )}
            </Col>
            
            {/* 职业发展 */}
            <Col span={24}>
              <h3 style={{ marginTop: 16, marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                🎯 职业发展
              </h3>
            </Col>
            
            <Col span={8}><strong>五年愿景:</strong></Col>
            <Col span={16}>
              {(selectedMember as any).jciCareer?.fiveYearsVision || '-'}
            </Col>
            
            <Col span={8}><strong>如何成为活跃会员:</strong></Col>
            <Col span={16}>
              {(selectedMember as any).jciCareer?.activeMemberHow || '-'}
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'activities',
      label: '活动',
      icon: <CalendarOutlined />,
      content: (
        <div style={{ padding: '16px' }}>
          {(selectedMember as any).jciCareer?.activityParticipation && (selectedMember as any).jciCareer.activityParticipation.length > 0 ? (
            <Table
              dataSource={(selectedMember as any).jciCareer.activityParticipation as any[]}
              rowKey={(record: any) => record.eventId}
              pagination={false}
              columns={[
                {
                  title: '活动名称',
                  dataIndex: 'eventName',
                  key: 'eventName',
                },
                {
                  title: '参与角色',
                  dataIndex: 'role',
                  key: 'role',
                  render: (role: string) => role ? <Tag color="blue">{role}</Tag> : '-',
                },
                {
                  title: '参与时间',
                  dataIndex: 'participatedAt',
                  key: 'participatedAt',
                  render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-',
                },
              ]}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无活动记录
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'tasks',
      label: '任务',
      icon: <CheckCircleOutlined />,
      content: (
        <div style={{ padding: '16px' }}>
          {(selectedMember as any).jciCareer?.taskCompletions && (selectedMember as any).jciCareer.taskCompletions.length > 0 ? (
            <Table
              dataSource={(selectedMember as any).jciCareer.taskCompletions as any[]}
              rowKey={(record: any) => record.taskId}
              pagination={false}
              columns={[
                {
                  title: '任务名称',
                  dataIndex: 'taskName',
                  key: 'taskName',
                },
                {
                  title: '完成时间',
                  dataIndex: 'completedAt',
                  key: 'completedAt',
                  render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-',
                },
                {
                  title: '验证状态',
                  dataIndex: 'verifiedBy',
                  key: 'verifiedBy',
                  render: (verifiedBy: string) => 
                    verifiedBy ? (
                      <Tag color="success">已验证</Tag>
                    ) : (
                      <Tag color="warning">待验证</Tag>
                    ),
                },
              ]}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无任务记录
            </div>
          )}
        </div>
      ),
    },
  ] : [];

  // ========== Table Columns ==========
  
  const columns: DataGridColumn<Member>[] = [
    {
      title: '会员ID',
      dataIndex: 'profileMemberId',
      key: 'memberId',
      width: 120,
      fixed: 'left',
      render: (_, record) => (record as any).profile?.memberId || '-',
    },
    {
      title: '姓名',
      dataIndex: 'profileName',
      key: 'name',
      width: 150,
      fixed: 'left',
      render: (_, record) => (record as any).profile?.name || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'profileEmail',
      key: 'email',
      width: 200,
      render: (_, record) => (record as any).profile?.email || '-',
    },
    {
      title: '电话',
      dataIndex: 'profilePhone',
      key: 'phone',
      width: 150,
      render: (_, record) => (record as any).profile?.phone || '-',
    },
    {
      title: '分类',
      dataIndex: 'jciCategory',
      key: 'category',
      width: 120,
      render: (_: any, record) => {
        const category = (record as any).jciCareer?.category;
        const option = MEMBER_CATEGORY_OPTIONS.find(opt => opt.value === category);
        return category ? <Tag color="blue">{option?.label || category}</Tag> : '-';
      },
    },
    {
      title: '级别',
      dataIndex: 'profileLevel',
      key: 'level',
      width: 100,
      render: (_: any, record) => {
        const level = (record as any).profile?.level as string;
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
      dataIndex: 'profileStatus',
      key: 'status',
      width: 100,
      render: (_: any, record) => {
        const status = (record as any).profile?.status as string;
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
      dataIndex: 'jciChapter',
      key: 'chapter',
      width: 120,
      render: (_: any, record) => (record as any).jciCareer?.chapter || '-',
    },
    {
      title: '加入日期',
      dataIndex: 'jciJoinDate',
      key: 'joinDate',
      width: 120,
      render: (_: any, record) => {
        const date = (record as any).jciCareer?.joinDate as string;
        return date ? new Date(date).toLocaleDateString('zh-CN') : '-';
      },
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
            onClick={() => handleDelete(record.id, ((record as any).profile?.name || record.name))}
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
      
      {/* 🆕 会员分类标签页 */}
      <Card style={{ marginBottom: 24 }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'all',
              label: (
                <span>
                  <TeamOutlined /> 全部会员
                  {stats?.total !== undefined && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {stats.total}
                    </Tag>
                  )}
                </span>
              ),
            },
            ...MEMBER_CATEGORY_OPTIONS.map(option => {
              const count = stats?.byCategory?.[option.value as keyof typeof stats.byCategory];
              return {
                key: option.value as string,
                label: (
                  <span>
                    {option.label}
                    {count !== undefined && (
                      <Tag color="default" style={{ marginLeft: 8 }}>
                        {count}
                      </Tag>
                    )}
                  </span>
                ),
              };
            }),
          ]}
        />
      </Card>
      
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
        title={(selectedMember as any)?.profile?.name || '会员详情'}
        subtitle={selectedMember ? `${(selectedMember as any).profile?.memberId || '-'} - ${MEMBER_STATUS_OPTIONS.find(o => o.value === (selectedMember as any).profile?.status)?.label || (selectedMember as any).profile?.status || '-'}` : ''}
        tabs={detailTabs}
        actions={selectedMember ? [
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
        title={`批量设置分类(已选 ${selectedRowKeys.length} 人)`}
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
        title={`批量设置级别(已选 ${selectedRowKeys.length} 人)`}
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
        title={`批量设置状态(已选 ${selectedRowKeys.length} 人)`}
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

