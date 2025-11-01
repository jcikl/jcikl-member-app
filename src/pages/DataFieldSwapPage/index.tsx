/**
 * Data Field Swap Page
 * 数据字段对调页面
 * 
 * 临时工具：用于修复数据迁移中的字段对调错误
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  Space,
  Table,
  message,
  Modal,
  Alert,
  Statistic,
  Row,
  Col,
  Tag,
  Progress,
  Typography,
} from 'antd';
import {
  SwapOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/services/firebase';

const { Option } = Select;
const { Text, Title } = Typography;

// 可用的字段映射
const AVAILABLE_FIELDS = [
  { value: 'profile.shirtSize', label: 'T恤尺寸 (profile.shirtSize)' },
  { value: 'profile.jacketSize', label: '夹克尺寸 (profile.jacketSize)' },
  { value: 'profile.nameToBeEmbroidered', label: '刺绣名称 (profile.nameToBeEmbroidered)' },
  { value: 'profile.tshirtReceivingStatus', label: 'T恤领取状态 (profile.tshirtReceivingStatus)' },
  { value: 'profile.cutting', label: '裁剪 (profile.cutting)' },
  { value: 'profile.fullNameNric', label: '身份证全名 (profile.fullNameNric)' },
  { value: 'profile.whatsappGroup', label: 'WhatsApp群组 (profile.whatsappGroup)' },
  { value: 'profile.nricOrPassport', label: 'NRIC/护照 (profile.nricOrPassport)' },
  { value: 'profile.alternativePhone', label: '备用电话 (profile.alternativePhone)' },
  { value: 'business.company', label: '公司名称 (business.company)' },
  { value: 'business.departmentAndPosition', label: '部门与职位 (business.departmentAndPosition)' },
  { value: 'jciCareer.memberId', label: '会员编号 (jciCareer.memberId)' },
  { value: 'jciCareer.chapter', label: '分会 (jciCareer.chapter)' },
  { value: 'jciCareer.category', label: '会员类别 (jciCareer.category)' },
];

interface SwapMapping {
  id: string;
  currentField: string;
  targetField: string;
}

interface PreviewItem {
  memberId: string;
  memberName: string;
  currentFieldValue: any;
  targetFieldValue: any;
  willSwap: boolean;
}

const DataFieldSwapPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [swapMappings, setSwapMappings] = useState<SwapMapping[]>([
    { id: '1', currentField: '', targetField: '' }
  ]);
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    affectedMembers: 0,
    swapCount: 0,
  });
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadMemberCount();
  }, []);

  const loadMemberCount = async () => {
    try {
      const membersRef = collection(db, GLOBAL_COLLECTIONS.MEMBERS);
      const snapshot = await getDocs(membersRef);
      setStats(prev => ({ ...prev, totalMembers: snapshot.size }));
    } catch (error) {
      console.error('Failed to load member count:', error);
    }
  };

  const addSwapMapping = () => {
    setSwapMappings([
      ...swapMappings,
      { id: Date.now().toString(), currentField: '', targetField: '' }
    ]);
  };

  const removeSwapMapping = (id: string) => {
    setSwapMappings(swapMappings.filter(m => m.id !== id));
  };

  const updateSwapMapping = (id: string, field: 'currentField' | 'targetField', value: string) => {
    setSwapMappings(swapMappings.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // 获取嵌套字段值
  const getNestedValue = (obj: any, path: string) => {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return undefined;
    }
    return value;
  };

  // 生成预览
  const handlePreview = async () => {
    // 验证映射配置
    const invalidMappings = swapMappings.filter(m => !m.currentField || !m.targetField);
    if (invalidMappings.length > 0) {
      message.error('请完整配置所有字段映射');
      return;
    }

    // 检查是否有重复映射
    const currentFields = swapMappings.map(m => m.currentField);
    const targetFields = swapMappings.map(m => m.targetField);
    const hasDuplicates = new Set(currentFields).size !== currentFields.length || 
                         new Set(targetFields).size !== targetFields.length;
    
    if (hasDuplicates) {
      message.error('存在重复的字段映射');
      return;
    }

    setLoading(true);
    try {
      const membersRef = collection(db, GLOBAL_COLLECTIONS.MEMBERS);
      const snapshot = await getDocs(membersRef);
      
      const preview: PreviewItem[] = [];
      let affectedCount = 0;

      snapshot.forEach(docSnapshot => {
        const memberData = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // 检查是否有任何字段需要对调
        let hasSwap = false;
        swapMappings.forEach(mapping => {
          const currentValue = getNestedValue(memberData, mapping.currentField);
          const targetValue = getNestedValue(memberData, mapping.targetField);
          
          // 只有当值不同时才需要对调
          if (currentValue !== targetValue && (currentValue || targetValue)) {
            hasSwap = true;
          }
        });

        if (hasSwap) {
          affectedCount++;
          
          // 只显示前50条预览
          if (preview.length < 50) {
            const currentFieldValue = getNestedValue(memberData, swapMappings[0].currentField);
            const targetFieldValue = getNestedValue(memberData, swapMappings[0].targetField);
            
            preview.push({
              memberId: docSnapshot.id,
              memberName: memberData.name || '未知',
              currentFieldValue,
              targetFieldValue,
              willSwap: true,
            });
          }
        }
      });

      setPreviewData(preview);
      setStats(prev => ({ 
        ...prev, 
        affectedMembers: affectedCount,
        swapCount: swapMappings.length 
      }));
      setPreviewVisible(true);
      
      if (affectedCount === 0) {
        message.info('没有需要对调的数据');
      } else {
        message.success(`找到 ${affectedCount} 位会员需要对调字段`);
      }
    } catch (error) {
      console.error('Failed to preview swap:', error);
      message.error('预览失败');
    } finally {
      setLoading(false);
    }
  };

  // 执行对调
  const handleExecuteSwap = async () => {
    Modal.confirm({
      title: '确认执行字段对调？',
      content: `即将对调 ${stats.affectedMembers} 位会员的 ${stats.swapCount} 个字段，此操作不可逆，请确认！`,
      okText: '确认执行',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        setExecuting(true);
        setProgress(0);
        
        try {
          const membersRef = collection(db, GLOBAL_COLLECTIONS.MEMBERS);
          const snapshot = await getDocs(membersRef);
          
          const batch = writeBatch(db);
          let processedCount = 0;
          let batchCount = 0;
          const maxBatchSize = 500; // Firestore batch limit

          for (const docSnapshot of snapshot.docs) {
            const memberData = { id: docSnapshot.id, ...docSnapshot.data() };
            let needsUpdate = false;
            const updates: any = {};

            // 对每个映射执行对调
            swapMappings.forEach(mapping => {
              const currentValue = getNestedValue(memberData, mapping.currentField);
              const targetValue = getNestedValue(memberData, mapping.targetField);
              
              // 只有当值不同时才对调
              if (currentValue !== targetValue && (currentValue || targetValue)) {
                needsUpdate = true;
                // 将目标字段的值写入当前字段
                updates[mapping.currentField] = targetValue ?? null;
                // 将当前字段的值写入目标字段
                updates[mapping.targetField] = currentValue ?? null;
              }
            });

            if (needsUpdate) {
              const memberDocRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, docSnapshot.id);
              batch.update(memberDocRef, updates);
              processedCount++;
              batchCount++;
              
              // 每500条提交一次
              if (batchCount >= maxBatchSize) {
                await batch.commit();
                batchCount = 0;
                console.log(`✅ 已处理 ${processedCount} 位会员`);
              }
              
              // 更新进度
              setProgress(Math.round((processedCount / stats.affectedMembers) * 100));
            }
          }

          // 提交剩余的批次
          if (batchCount > 0) {
            await batch.commit();
          }

          setProgress(100);
          message.success(`成功对调 ${processedCount} 位会员的字段数据！`);
          setPreviewVisible(false);
          
          // 重新加载预览
          setTimeout(() => {
            handlePreview();
          }, 1000);
        } catch (error) {
          console.error('Failed to execute swap:', error);
          message.error('执行对调失败: ' + (error as Error).message);
        } finally {
          setExecuting(false);
          setProgress(0);
        }
      },
    });
  };

  const previewColumns: ColumnsType<PreviewItem> = [
    {
      title: '会员ID',
      dataIndex: 'memberId',
      width: 200,
      render: (id) => <Text code>{id}</Text>,
    },
    {
      title: '会员姓名',
      dataIndex: 'memberName',
      width: 120,
    },
    {
      title: '当前字段值',
      dataIndex: 'currentFieldValue',
      width: 150,
      render: (val) => <Tag color="blue">{val || '-'}</Tag>,
    },
    {
      title: '对调方向',
      width: 80,
      align: 'center',
      render: () => <SwapOutlined style={{ fontSize: 16, color: '#1890ff' }} />,
    },
    {
      title: '目标字段值',
      dataIndex: 'targetFieldValue',
      width: 150,
      render: (val) => <Tag color="green">{val || '-'}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'willSwap',
      width: 100,
      align: 'center',
      render: (willSwap) => 
        willSwap ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>将对调</Tag>
        ) : (
          <Tag>无需对调</Tag>
        ),
    },
  ];

  return (
    <ErrorBoundary>
      <div className="data-field-swap-page">
        <PageHeader
          title="字段数据对调工具"
          subtitle="Data Field Swap Tool"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '系统设置', path: '/settings' },
            { title: '字段数据对调' },
          ]}
        />

        <Alert
          message="⚠️ 临时工具 - 谨慎使用"
          description="此工具用于修复数据迁移中的字段对调错误。执行对调操作不可逆，请务必先预览确认后再执行！"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="会员总数"
                value={stats.totalMembers}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="受影响会员"
                value={stats.affectedMembers}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="对调字段数"
                value={stats.swapCount}
                prefix={<SwapOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 字段映射配置 */}
        <Card title="字段映射配置" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {swapMappings.map((mapping, index) => (
              <Row key={mapping.id} gutter={16} align="middle">
                <Col xs={24} sm={1}>
                  <Text strong>{index}.</Text>
                </Col>
                <Col xs={24} sm={10}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择当前字段"
                    value={mapping.currentField}
                    onChange={(value) => updateSwapMapping(mapping.id, 'currentField', value)}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label).toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {AVAILABLE_FIELDS.map(field => (
                      <Option key={field.value} value={field.value} label={field.label}>
                        {field.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={2} style={{ textAlign: 'center' }}>
                  <SwapOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                </Col>
                <Col xs={24} sm={10}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择目标字段"
                    value={mapping.targetField}
                    onChange={(value) => updateSwapMapping(mapping.id, 'targetField', value)}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label).toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {AVAILABLE_FIELDS.map(field => (
                      <Option key={field.value} value={field.value} label={field.label}>
                        {field.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={1}>
                  {swapMappings.length > 1 && (
                    <Button
                      type="text"
                      danger
                      onClick={() => removeSwapMapping(mapping.id)}
                    >
                      删除
                    </Button>
                  )}
                </Col>
              </Row>
            ))}

            <Space>
              <Button onClick={addSwapMapping}>
                + 添加映射
              </Button>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={handlePreview}
              >
                预览对调
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 快捷配置示例 */}
        <Card title="快捷配置示例" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="示例1: 修复T恤尺寸和刺绣名称对调错误"
              description={
                <div>
                  <p>当前字段: profile.shirtSize → 目标字段: profile.nameToBeEmbroidered</p>
                  <p>当前字段: profile.nameToBeEmbroidered → 目标字段: profile.shirtSize</p>
                </div>
              }
              type="info"
              showIcon
            />
            <Button
              size="small"
              onClick={() => {
                setSwapMappings([
                  { id: '1', currentField: 'profile.shirtSize', targetField: 'profile.nameToBeEmbroidered' },
                  { id: '2', currentField: 'profile.nameToBeEmbroidered', targetField: 'profile.shirtSize' },
                ]);
                message.success('已应用快捷配置');
              }}
            >
              应用此配置
            </Button>
          </Space>
        </Card>

        {/* 预览模态框 */}
        <Modal
          title={`预览字段对调 - ${stats.affectedMembers} 位会员受影响`}
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          width={1000}
          footer={
            <Space>
              <Button onClick={() => setPreviewVisible(false)}>取消</Button>
              <Button
                type="primary"
                danger
                icon={<SwapOutlined />}
                loading={executing}
                onClick={handleExecuteSwap}
              >
                确认执行对调
              </Button>
            </Space>
          }
        >
          {executing && (
            <div style={{ marginBottom: 16 }}>
              <Progress percent={progress} status="active" />
              <Text type="secondary">正在处理中，请勿关闭页面...</Text>
            </div>
          )}
          
          <Alert
            message="预览说明"
            description={`以下显示前50条需要对调的记录。当前字段: ${AVAILABLE_FIELDS.find(f => f.value === swapMappings[0]?.currentField)?.label || '未选择'} ↔ 目标字段: ${AVAILABLE_FIELDS.find(f => f.value === swapMappings[0]?.targetField)?.label || '未选择'}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Table
            columns={previewColumns}
            dataSource={previewData}
            rowKey="memberId"
            pagination={false}
            size="small"
            scroll={{ y: 400 }}
          />
          
          {previewData.length >= 50 && (
            <Alert
              message={`显示前50条，共 ${stats.affectedMembers} 条记录需要对调`}
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default DataFieldSwapPage;

