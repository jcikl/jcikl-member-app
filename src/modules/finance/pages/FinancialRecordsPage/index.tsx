/**
 * Financial Records Management Page
 * 财务记录管理页面
 * 
 * 统一管理所有财务记录，包括会员费、捐赠、其他收入等
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
  DatePicker,
  Statistic,
  Row,
  Col,
  Modal,
  Descriptions,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import { globalSystemService } from '@/config/globalSystemSettings';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { collection, getDocs, query, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { safeTimestampToISO } from '@/utils/dateHelpers';
import type { MemberFeeStatus } from '../../types';
import './styles.css';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

// 通用财务记录接口
interface FinancialRecord {
  id: string;
  type?: string; // 记录类型：memberFee, donation, eventFee, etc.
  [key: string]: any; // 允许其他动态字段
}

const FinancialRecordsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FinancialRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberFeeStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // 改为记录类型
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  // Statistics
  const [statistics, setStatistics] = useState({
    totalRecords: 0,
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
  });

  useEffect(() => {
    loadFinancialRecords();
  }, []);

  useEffect(() => {
    // Extract unique types from records
    const types = Array.from(new Set(
      records
        .filter(r => r.type)
        .map(r => r.type!)
    )).sort();
    setAvailableTypes(types);

    // Extract unique sub-categories from records
    const subCategories = Array.from(new Set(
      records
        .filter(r => r.subCategory)
        .map(r => r.subCategory!)
    )).sort();
    setAvailableSubCategories(subCategories);
  }, [records]);

  useEffect(() => {
    filterRecords();
  }, [records, searchText, statusFilter, typeFilter, subCategoryFilter, dateRange]);

  const loadFinancialRecords = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load all financial records
      const q = query(
        collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS),
        firestoreOrderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

      let data: FinancialRecord[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: safeTimestampToISO(doc.data().createdAt),
        updatedAt: safeTimestampToISO(doc.data().updatedAt),
        dueDate: doc.data().dueDate ? safeTimestampToISO(doc.data().dueDate) : '',
        paymentDate: doc.data().paymentDate ? safeTimestampToISO(doc.data().paymentDate) : undefined,
        lastReminderDate: doc.data().lastReminderDate ? safeTimestampToISO(doc.data().lastReminderDate) : undefined,
      }));

      // 🆕 关联交易以补充二次分类（从 Transactions 表获取）
      try {
        const txnSnap = await getDocs(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS));
        const subCategoryByMember: Record<string, string> = {};

        // 遍历所有会员费交易，获取最新的 subCategory
        txnSnap.docs
          .filter(d => d.data().category === 'member-fees')
          .forEach(d => {
            const txnData = d.data() as any;
            const memberId = txnData?.metadata?.memberId;
            if (memberId && txnData.subCategory) {
              // 如果已有记录，保留最新的（这里假设后遍历的是最新的）
              subCategoryByMember[memberId] = txnData.subCategory;
            }
          });

        // 将 subCategory 合并到会费记录中
        data = data.map(record => {
          if (record.type === 'memberFee' && record.memberId) {
            const subCategory = subCategoryByMember[record.memberId];
            if (subCategory) {
              return { ...record, subCategory };
            }
          }
          return record;
        });

        console.log('[FinancialRecords] Merged subCategory from transactions:', 
          Object.keys(subCategoryByMember).length, 'members');
      } catch (error) {
        console.warn('[FinancialRecords] Failed to merge subCategory from transactions:', error);
      }

      setRecords(data);

      // Calculate statistics
      const stats = {
        totalRecords: data.length,
        totalExpected: data.reduce((sum, r) => sum + (r.expectedAmount || 0), 0),
        totalCollected: data.reduce((sum, r) => sum + (r.paidAmount || 0), 0),
        totalOutstanding: data.reduce((sum, r) => sum + (r.remainingAmount || 0), 0),
      };
      setStatistics(stats);

    } catch (error: any) {
      message.error('加载财务记录失败');
      globalSystemService.log(
        'error',
        'Failed to load financial records',
        'FinancialRecordsPage.loadFinancialRecords',
        { error: error.message }
      );
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];

    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.memberName?.toLowerCase().includes(searchLower) ||
          r.memberEmail?.toLowerCase().includes(searchLower) ||
          r.memberId?.toLowerCase().includes(searchLower) ||
          r.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Type filter (记录类型)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }

    // Sub-category filter
    if (subCategoryFilter !== 'all') {
      filtered = filtered.filter(r => r.subCategory === subCategoryFilter);
    }

    // Date range filter
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter(r => {
        const recordDate = dayjs(r.createdAt);
        return recordDate.isAfter(start.startOf('day')) && recordDate.isBefore(end.endOf('day'));
      });
    }

    setFilteredRecords(filtered);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as MemberFeeStatus | 'all');
    setCurrentPage(1);
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleSubCategoryChange = (value: string) => {
    setSubCategoryFilter(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    } else {
      setDateRange(null);
    }
    setCurrentPage(1);
  };

  const handleViewDetail = (record: FinancialRecord) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const getTypeTag = (type?: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      memberFee: { color: 'blue', text: '会员费' },
      donation: { color: 'green', text: '捐赠' },
      eventFee: { color: 'purple', text: '活动费用' },
      sponsorship: { color: 'orange', text: '赞助' },
      grant: { color: 'cyan', text: '拨款' },
      other: { color: 'default', text: '其他' },
    };
    const config = typeMap[type || 'other'] || { color: 'default', text: type || 'unknown' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusTag = (status: MemberFeeStatus) => {
    const statusMap: Record<MemberFeeStatus, { color: string; text: string }> = {
      paid: { color: 'success', text: '已付' },
      unpaid: { color: 'warning', text: '未付' },
      partial: { color: 'processing', text: '部分付款' },
      overdue: { color: 'error', text: '逾期' },
      waived: { color: 'default', text: '豁免' },
      cancelled: { color: 'default', text: '已取消' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<FinancialRecord> = [
    {
      title: '会员信息',
      key: 'member',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.memberName || '-'}</div>
          {record.memberEmail && (
            <div style={{ fontSize: 12, color: '#666' }}>{record.memberEmail}</div>
          )}
        </div>
      ),
    },
    {
      title: '记录类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type?: string) => getTypeTag(type),
    },
    {
      title: '二次分类',
      dataIndex: 'subCategory',
      key: 'subCategory',
      width: 150,
      render: (subCategory?: string) => subCategory ? (
        <Tag color="geekblue">{subCategory}</Tag>
      ) : (
        <Text type="secondary">-</Text>
      ),
    },
    {
      title: '预期金额',
      dataIndex: 'expectedAmount',
      key: 'expectedAmount',
      width: 120,
      align: 'right',
      render: (amount: number) => (
        <span style={{ fontWeight: 500 }}>
          RM {amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 120,
      align: 'right',
      render: (amount: number) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>
          RM {amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      title: '剩余金额',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      width: 120,
      align: 'right',
      render: (amount: number) => (
        <span style={{ color: amount > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 500 }}>
          RM {amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: MemberFeeStatus) => getStatusTag(status),
    },
    {
      title: '到期日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) =>
        date ? globalDateService.formatDate(new Date(date), 'display') : '-',
    },
    {
      title: '创建日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) =>
        date ? globalDateService.formatDate(new Date(date), 'display') : '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <div className="financial-records-page">
        <PageHeader
          title="财务记录管理"
          subtitle="Financial Records"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '财务记录' },
          ]}
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={loadFinancialRecords}
            >
              刷新
            </Button>
          }
        />

        {/* Statistics Cards */}
        <div className="mb-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="记录总数"
                  value={statistics.totalRecords}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="预期总额"
                  value={statistics.totalExpected}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#333' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="已收总额"
                  value={statistics.totalCollected}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="未收总额"
                  value={statistics.totalOutstanding}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="搜索会员姓名、邮箱或备注"
                  allowClear
                  enterButton={<SearchOutlined />}
                  onSearch={handleSearch}
                  onChange={(e) => !e.target.value && handleSearch('')}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  value={statusFilter}
                  onChange={handleStatusChange}
                  placeholder="状态筛选"
                >
                  <Option value="all">全部状态</Option>
                  <Option value="paid">已付</Option>
                  <Option value="unpaid">未付</Option>
                  <Option value="partial">部分付款</Option>
                  <Option value="overdue">逾期</Option>
                  <Option value="waived">豁免</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  value={typeFilter}
                  onChange={handleTypeChange}
                  placeholder="记录类型"
                >
                  <Option value="all">全部类型</Option>
                  {availableTypes.map(type => (
                    <Option key={type} value={type}>
                      {type === 'memberFee' ? '会员费' : 
                       type === 'donation' ? '捐赠' : 
                       type === 'eventFee' ? '活动费用' : 
                       type === 'sponsorship' ? '赞助' : 
                       type === 'grant' ? '拨款' : type}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  value={subCategoryFilter}
                  onChange={handleSubCategoryChange}
                  placeholder="二次分类"
                >
                  <Option value="all">全部分类</Option>
                  {availableSubCategories.map(cat => (
                    <Option key={cat} value={cat}>
                      {cat}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <RangePicker
                  style={{ width: '100%' }}
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  format="DD-MMM-YYYY"
                  placeholder={['开始日期', '结束日期']}
                />
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Table */}
        <Card>
          <Table
            {...tableConfig}
            columns={columns}
            dataSource={filteredRecords}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredRecords.length,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
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
          title="财务记录详情"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              关闭
            </Button>,
          ]}
          width={800}
        >
          {selectedRecord && (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="会员姓名" span={2}>
                {selectedRecord.memberName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="会员邮箱" span={2}>
                {selectedRecord.memberEmail || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="会员类别">
                {selectedRecord.memberCategory || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="记录类型">
                {getTypeTag(selectedRecord.type)}
              </Descriptions.Item>
              <Descriptions.Item label="费用类型">
                {selectedRecord.feeType ? (
                  <Tag color="cyan">{selectedRecord.feeType}</Tag>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="二次分类">
                {selectedRecord.subCategory ? (
                  <Tag color="geekblue">{selectedRecord.subCategory}</Tag>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="预期金额" span={2}>
                <Text strong>RM {selectedRecord.expectedAmount?.toFixed(2) || '0.00'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="已付金额">
                <Text type="success" strong>
                  RM {selectedRecord.paidAmount?.toFixed(2) || '0.00'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="剩余金额">
                <Text type={selectedRecord.remainingAmount > 0 ? 'danger' : 'success'} strong>
                  RM {selectedRecord.remainingAmount?.toFixed(2) || '0.00'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedRecord.status)}
              </Descriptions.Item>
              <Descriptions.Item label="到期日期">
                {selectedRecord.dueDate
                  ? globalDateService.formatDate(new Date(selectedRecord.dueDate), 'display')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="付款日期">
                {selectedRecord.paymentDate
                  ? globalDateService.formatDate(new Date(selectedRecord.paymentDate), 'display')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="付款方式">
                {selectedRecord.paymentMethod || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="收据号码">
                {selectedRecord.receiptNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="关联交易">
                {selectedRecord.transactionId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="提醒次数">
                {selectedRecord.remindersSent || 0}
              </Descriptions.Item>
              <Descriptions.Item label="创建日期" span={2}>
                {selectedRecord.createdAt
                  ? globalDateService.formatDate(new Date(selectedRecord.createdAt), 'display')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="更新日期" span={2}>
                {selectedRecord.updatedAt
                  ? globalDateService.formatDate(new Date(selectedRecord.updatedAt), 'display')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {selectedRecord.notes || '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default FinancialRecordsPage;

