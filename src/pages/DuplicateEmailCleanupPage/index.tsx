/**
 * Duplicate Email Cleanup Page
 * 重复邮箱清理页面
 * 
 * 检测并清理 members collection 中重复邮箱的文档
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Modal, 
  message,
  Alert,
  Descriptions,
  Spin
} from 'antd';
import { 
  DeleteOutlined, 
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { PageHeader } from '@/components';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';

interface MemberDocument {
  id: string;
  email: string;
  name: string;
  category: string | null;
  status: string;
  hasProfile: boolean;
  hasBusiness: boolean;
  hasJciCareer: boolean;
  phone: string | null;
  score: number;
  isRecommended: boolean;
  rawData: any;
}

interface DuplicateGroup {
  email: string;
  count: number;
  documents: MemberDocument[];
  recommendedId: string;
}

/**
 * Duplicate Email Cleanup Page Component
 */
const DuplicateEmailCleanupPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // ========== Data Fetching ==========

  const scanForDuplicates = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DuplicateCleanup] Scanning members collection...');
      
      const membersRef = collection(db, GLOBAL_COLLECTIONS.MEMBERS);
      const snapshot = await getDocs(membersRef);
      
      console.log(`📦 [DuplicateCleanup] Total members: ${snapshot.size}`);
      
      // Group by email
      const emailMap = new Map<string, MemberDocument[]>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const email = (data.email || '').toLowerCase().trim();
        
        if (!email) return; // Skip documents without email
        
        // Calculate completeness score
        let score = 0;
        if (data.category) score += 10;
        if (data.profile && Object.keys(data.profile).length > 0) score += 5;
        if (data.business && Object.keys(data.business).length > 0) score += 5;
        if (data.jciCareer && Object.keys(data.jciCareer).length > 0) score += 5;
        if (data.name && data.name !== 'User' && data.name.length > 2) score += 3;
        if (data.phone) score += 2;
        
        const memberDoc: MemberDocument = {
          id: doc.id,
          email: data.email || '',
          name: data.name || '-',
          category: data.category || data.jciCareer?.category || null,
          status: data.status || '-',
          hasProfile: !!(data.profile && Object.keys(data.profile).length > 0),
          hasBusiness: !!(data.business && Object.keys(data.business).length > 0),
          hasJciCareer: !!(data.jciCareer && Object.keys(data.jciCareer).length > 0),
          phone: data.phone || null,
          score,
          isRecommended: false,
          rawData: data,
        };
        
        if (!emailMap.has(email)) {
          emailMap.set(email, []);
        }
        emailMap.get(email)!.push(memberDoc);
      });
      
      // Find duplicates
      const duplicateGroups: DuplicateGroup[] = [];
      
      emailMap.forEach((docs, email) => {
        if (docs.length > 1) {
          // Sort by score to find recommended document
          docs.sort((a, b) => b.score - a.score);
          
          // Mark recommended document
          docs[0].isRecommended = true;
          
          duplicateGroups.push({
            email,
            count: docs.length,
            documents: docs,
            recommendedId: docs[0].id,
          });
        }
      });
      
      console.log(`⚠️ [DuplicateCleanup] Found ${duplicateGroups.length} emails with duplicates`);
      
      setDuplicates(duplicateGroups);
      
      if (duplicateGroups.length === 0) {
        message.success('没有发现重复邮箱的文档');
      } else {
        message.warning(`发现 ${duplicateGroups.length} 个重复邮箱，共 ${duplicateGroups.reduce((sum, g) => sum + g.count, 0)} 个文档`);
      }
      
    } catch (error) {
      console.error('Scan failed:', error);
      message.error('扫描失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanForDuplicates();
  }, []);

  // ========== Actions ==========

  const handleDeleteDocument = async (groupEmail: string, docId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除文档 ${docId} 吗？此操作不可撤销。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          console.log(`🗑️ [DuplicateCleanup] Deleting document: ${docId}`);
          
          await deleteDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, docId));
          
          message.success('文档删除成功');
          
          // Refresh data
          await scanForDuplicates();
          
        } catch (error: any) {
          console.error('Delete failed:', error);
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  const handleBatchDeleteNonRecommended = async (group: DuplicateGroup) => {
    const toDelete = group.documents.filter(d => !d.isRecommended);
    
    Modal.confirm({
      title: '批量删除不推荐的文档',
      content: (
        <div>
          <p>将删除以下文档：</p>
          <ul>
            {toDelete.map(d => (
              <li key={d.id}>
                {d.id} - {d.name} (score: {d.score})
              </li>
            ))}
          </ul>
          <p>保留推荐文档：{group.recommendedId}</p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          for (const doc of toDelete) {
            console.log(`🗑️ [DuplicateCleanup] Deleting: ${doc.id}`);
            await deleteDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, doc.id));
          }
          
          message.success(`成功删除 ${toDelete.length} 个文档`);
          
          // Refresh data
          await scanForDuplicates();
          
        } catch (error: any) {
          console.error('Batch delete failed:', error);
          message.error(error.message || '批量删除失败');
        }
      },
    });
  };

  const handleViewDetails = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setDetailModalVisible(true);
  };

  // ========== Render ==========

  const columns = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 250,
    },
    {
      title: '重复数量',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      render: (count: number) => (
        <Tag color="orange">{count} 个文档</Tag>
      ),
    },
    {
      title: '推荐保留',
      key: 'recommended',
      width: 200,
      render: (_: any, record: DuplicateGroup) => {
        const recommended = record.documents.find(d => d.isRecommended);
        return (
          <Space direction="vertical" size="small">
            <Tag color="green" icon={<CheckCircleOutlined />}>
              {recommended?.name || '未知'}
            </Tag>
            <span style={{ fontSize: 12, color: '#666' }}>
              分数: {recommended?.score}
            </span>
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      render: (_: any, record: DuplicateGroup) => (
        <Space>
          <Button 
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            查看详情
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleBatchDeleteNonRecommended(record)}
          >
            删除重复项
          </Button>
        </Space>
      ),
    },
  ];

  const documentColumns = [
    {
      title: '文档 ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (id: string, record: MemberDocument) => (
        <Space>
          {record.isRecommended && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          <span style={{ 
            fontFamily: 'monospace',
            color: record.isRecommended ? '#52c41a' : '#666'
          }}>
            {id}
          </span>
        </Space>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string | null) => (
        category ? <Tag color="blue">{category}</Tag> : <Tag>无</Tag>
      ),
    },
    {
      title: '数据完整性',
      key: 'completeness',
      width: 150,
      render: (_: any, record: MemberDocument) => (
        <Space direction="vertical" size="small">
          {record.hasProfile && <Tag color="green">Profile ✓</Tag>}
          {record.hasBusiness && <Tag color="green">Business ✓</Tag>}
          {record.hasJciCareer && <Tag color="green">JCI Career ✓</Tag>}
        </Space>
      ),
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number, record: MemberDocument) => (
        <Tag color={record.isRecommended ? 'green' : 'default'}>
          {score}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: MemberDocument) => (
        record.isRecommended ? (
          <Tag color="success">推荐保留</Tag>
        ) : (
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteDocument(selectedGroup?.email || '', record.id)}
          >
            删除
          </Button>
        )
      ),
    },
  ];

  return (
    <div className="duplicate-email-cleanup-page">
      <PageHeader 
        title="重复邮箱清理工具"
        extra={[
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={scanForDuplicates}
            loading={loading}
          >
            重新扫描
          </Button>
        ]}
      />

      <Card>
        <Alert
          message="重复邮箱检测说明"
          description={
            <div>
              <p>本工具会扫描 members collection，检测所有使用相同邮箱的文档。</p>
              <p><strong>评分规则：</strong></p>
              <ul>
                <li>category 存在: +10 分</li>
                <li>profile 存在且非空: +5 分</li>
                <li>business 存在且非空: +5 分</li>
                <li>jciCareer 存在且非空: +5 分</li>
                <li>name 有意义: +3 分</li>
                <li>phone 存在: +2 分</li>
              </ul>
              <p><strong>推荐保留：</strong>系统会自动选择分数最高（数据最完整）的文档作为推荐保留文档。</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {loading && !duplicates.length && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>扫描中...</p>
          </div>
        )}

        {!loading && duplicates.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <p style={{ marginTop: 16, fontSize: 16 }}>
              没有发现重复邮箱的文档
            </p>
          </div>
        )}

        {duplicates.length > 0 && (
          <>
            <Alert
              message={`发现 ${duplicates.length} 个重复邮箱`}
              description={`共涉及 ${duplicates.reduce((sum, g) => sum + g.count, 0)} 个会员文档`}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16 }}
            />

            <Table
              columns={columns}
              dataSource={duplicates}
              rowKey="email"
              pagination={false}
              loading={loading}
            />
          </>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        title={`重复邮箱详情：${selectedGroup?.email}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="delete-all"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (selectedGroup) {
                handleBatchDeleteNonRecommended(selectedGroup);
                setDetailModalVisible(false);
              }
            }}
          >
            删除所有非推荐文档
          </Button>,
        ]}
      >
        {selectedGroup && (
          <div>
            <Alert
              message="推荐操作"
              description={
                <div>
                  <p>推荐保留文档：<strong>{selectedGroup.recommendedId}</strong></p>
                  <p>删除其他 {selectedGroup.count - 1} 个文档</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              columns={documentColumns}
              dataSource={selectedGroup.documents}
              rowKey="id"
              pagination={false}
              expandable={{
                expandedRowRender: (record) => (
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="文档 ID" span={2}>
                      <code>{record.id}</code>
                    </Descriptions.Item>
                    <Descriptions.Item label="邮箱">{record.email}</Descriptions.Item>
                    <Descriptions.Item label="姓名">{record.name}</Descriptions.Item>
                    <Descriptions.Item label="类别">
                      {record.category || '无'}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">{record.status}</Descriptions.Item>
                    <Descriptions.Item label="电话">{record.phone || '无'}</Descriptions.Item>
                    <Descriptions.Item label="分数">{record.score}</Descriptions.Item>
                    <Descriptions.Item label="Profile">
                      {record.hasProfile ? '✓ 有数据' : '✗ 空'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Business">
                      {record.hasBusiness ? '✓ 有数据' : '✗ 空'}
                    </Descriptions.Item>
                    <Descriptions.Item label="JCI Career">
                      {record.hasJciCareer ? '✓ 有数据' : '✗ 空'}
                    </Descriptions.Item>
                    <Descriptions.Item label="推荐" span={2}>
                      {record.isRecommended ? (
                        <Tag color="success" icon={<CheckCircleOutlined />}>
                          推荐保留（数据最完整）
                        </Tag>
                      ) : (
                        <Tag color="warning">可删除</Tag>
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DuplicateEmailCleanupPage;

