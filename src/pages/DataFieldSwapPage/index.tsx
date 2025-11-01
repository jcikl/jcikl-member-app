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
  Radio,
} from 'antd';
import {
  SwapOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
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

// 可用的字段映射 - 根据Member Collection完整结构
const AVAILABLE_FIELDS = [
  // === Profile Fields (个人信息) ===
  { value: 'profile.name', label: '姓名 (profile.name)' },
  { value: 'profile.email', label: '邮箱 (profile.email)' },
  { value: 'profile.phone', label: '电话 (profile.phone)' },
  { value: 'profile.alternativePhone', label: '备用电话 (profile.alternativePhone)' },
  { value: 'profile.fullNameNric', label: '身份证全名 (profile.fullNameNric)' },
  { value: 'profile.nricOrPassport', label: 'NRIC/护照 (profile.nricOrPassport)' },
  { value: 'profile.gender', label: '性别 (profile.gender)' },
  { value: 'profile.birthDate', label: '生日 (profile.birthDate)' },
  { value: 'profile.nationality', label: '国籍 (profile.nationality)' },
  { value: 'profile.race', label: '种族 (profile.race)' },
  { value: 'profile.avatar', label: '头像 (profile.avatar)' },
  { value: 'profile.profilePhotoUrl', label: '个人照片URL (profile.profilePhotoUrl)' },
  { value: 'profile.linkedin', label: 'LinkedIn (profile.linkedin)' },
  { value: 'profile.whatsappGroup', label: 'WhatsApp群组 (profile.whatsappGroup)' },
  { value: 'profile.address', label: '地址 (profile.address)' },
  
  // === Clothing & Items (服装与物品) ===
  { value: 'profile.shirtSize', label: 'T恤尺寸 (profile.shirtSize)' },
  { value: 'profile.jacketSize', label: '夹克尺寸 (profile.jacketSize)' },
  { value: 'profile.nameToBeEmbroidered', label: '刺绣名称 (profile.nameToBeEmbroidered)' },
  { value: 'profile.tshirtReceivingStatus', label: 'T恤领取状态 (profile.tshirtReceivingStatus)' },
  { value: 'profile.cutting', label: '裁剪 (profile.cutting)' },
  
  // === Business Fields (商业信息) ===
  { value: 'business.company', label: '公司名称 (business.company)' },
  { value: 'business.companyWebsite', label: '公司网站 (business.companyWebsite)' },
  { value: 'business.departmentAndPosition', label: '部门与职位 (business.departmentAndPosition)' },
  { value: 'business.industryDetail', label: '行业详情 (business.industryDetail)' },
  { value: 'business.companyIntro', label: '公司简介 (business.companyIntro)' },
  { value: 'business.acceptInternationalBusiness', label: '接受国际业务 (business.acceptInternationalBusiness)' },
  { value: 'business.ownIndustry', label: '所属行业 (business.ownIndustry)' },
  { value: 'business.interestedIndustries', label: '感兴趣行业 (business.interestedIndustries)' },
  { value: 'business.businessCategories', label: '业务类别 (business.businessCategories)' },
  
  // === JCI Career Fields (JCI会籍与发展) ===
  { value: 'jciCareer.memberId', label: '会员编号 (jciCareer.memberId)' },
  { value: 'jciCareer.category', label: '会员类别 (jciCareer.category)' },
  { value: 'jciCareer.membershipCategory', label: '会籍类别 (jciCareer.membershipCategory)' },
  { value: 'jciCareer.chapter', label: '分会 (jciCareer.chapter)' },
  { value: 'jciCareer.chapterId', label: '分会ID (jciCareer.chapterId)' },
  { value: 'jciCareer.worldRegion', label: '世界地区 (jciCareer.worldRegion)' },
  { value: 'jciCareer.countryRegion', label: '国家地区 (jciCareer.countryRegion)' },
  { value: 'jciCareer.country', label: '国家 (jciCareer.country)' },
  { value: 'jciCareer.jciPosition', label: 'JCI职位 (jciCareer.jciPosition)' },
  { value: 'jciCareer.introducerId', label: '介绍人ID (jciCareer.introducerId)' },
  { value: 'jciCareer.introducerName', label: '介绍人姓名 (jciCareer.introducerName)' },
  { value: 'jciCareer.senatorId', label: '参议员编号 (jciCareer.senatorId)' },
  { value: 'jciCareer.senatorScore', label: '参议员分数 (jciCareer.senatorScore)' },
  { value: 'jciCareer.senatorVerified', label: '参议员验证状态 (jciCareer.senatorVerified)' },
  { value: 'jciCareer.joinDate', label: '加入日期 (jciCareer.joinDate)' },
  { value: 'jciCareer.termStartDate', label: '任期开始 (jciCareer.termStartDate)' },
  { value: 'jciCareer.termEndDate', label: '任期结束 (jciCareer.termEndDate)' },
  { value: 'jciCareer.positionStartDate', label: '职位开始 (jciCareer.positionStartDate)' },
  { value: 'jciCareer.positionEndDate', label: '职位结束 (jciCareer.positionEndDate)' },
  { value: 'jciCareer.vpDivision', label: 'VP部门 (jciCareer.vpDivision)' },
  { value: 'jciCareer.isActingPosition', label: '是否代理职位 (jciCareer.isActingPosition)' },
  { value: 'jciCareer.actingForPosition', label: '代理职位 (jciCareer.actingForPosition)' },
  { value: 'jciCareer.isCurrentTerm', label: '是否当前任期 (jciCareer.isCurrentTerm)' },
  { value: 'jciCareer.jciEventInterests', label: 'JCI活动兴趣 (jciCareer.jciEventInterests)' },
  { value: 'jciCareer.jciBenefitsExpectation', label: 'JCI利益期望 (jciCareer.jciBenefitsExpectation)' },
  { value: 'jciCareer.fiveYearsVision', label: '五年愿景 (jciCareer.fiveYearsVision)' },
  { value: 'jciCareer.activeMemberHow', label: '成为活跃会员方式 (jciCareer.activeMemberHow)' },
  
  // === Payment & Endorsement (支付与背书) ===
  { value: 'jciCareer.paymentDate', label: '付款日期 (jciCareer.paymentDate)' },
  { value: 'jciCareer.paymentSlipUrl', label: '付款凭证URL (jciCareer.paymentSlipUrl)' },
  { value: 'jciCareer.paymentVerifiedDate', label: '付款验证日期 (jciCareer.paymentVerifiedDate)' },
  { value: 'jciCareer.endorsementDate', label: '背书日期 (jciCareer.endorsementDate)' },
  
  // === Top-level Fields (顶级字段) ===
  { value: 'name', label: '姓名-顶级 (name)' },
  { value: 'email', label: '邮箱-顶级 (email)' },
  { value: 'phone', label: '电话-顶级 (phone)' },
  { value: 'status', label: '状态 (status)' },
  { value: 'level', label: '级别 (level)' },
  { value: 'category', label: '类别-顶级 (category)' },
  { value: 'accountType', label: '账户类型 (accountType)' },
  { value: 'hobbies', label: '爱好 (hobbies)' },
];

type OperationType = 'swap' | 'remove';

interface SwapMapping {
  id: string;
  operationType: OperationType; // 🆕 操作类型：对调 或 移除
  currentField: string;
  targetField: string; // 对调时使用，移除时可为空
}

interface PreviewItem {
  memberId: string;
  memberName: string;
  operationType: OperationType; // 🆕 操作类型
  currentFieldValue: any;
  targetFieldValue: any;
  willSwap: boolean;
}

const DataFieldSwapPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [swapMappings, setSwapMappings] = useState<SwapMapping[]>([
    { id: '1', operationType: 'swap', currentField: '', targetField: '' }
  ]);
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
  const [allAffectedMemberIds, setAllAffectedMemberIds] = useState<string[]>([]); // 🆕 所有受影响的会员ID
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); // 🆕 选中的记录
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
      { id: Date.now().toString(), operationType: 'swap', currentField: '', targetField: '' }
    ]);
  };

  const removeSwapMapping = (id: string) => {
    setSwapMappings(swapMappings.filter(m => m.id !== id));
  };

  const updateSwapMapping = (id: string, field: 'currentField' | 'targetField' | 'operationType', value: string) => {
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
    const invalidMappings = swapMappings.filter(m => {
      if (!m.currentField) return true;
      // 对调操作需要targetField，移除操作不需要
      if (m.operationType === 'swap' && !m.targetField) return true;
      return false;
    });
    
    if (invalidMappings.length > 0) {
      message.error('请完整配置所有操作');
      return;
    }

    // 检查是否有重复的字段（同一字段不能被多个操作使用）
    const allFields = swapMappings.flatMap(m => 
      m.operationType === 'swap' ? [m.currentField, m.targetField] : [m.currentField]
    );
    const hasDuplicates = new Set(allFields).size !== allFields.length;
    
    if (hasDuplicates) {
      message.error('存在重复的字段操作');
      return;
    }

    setLoading(true);
    try {
      const membersRef = collection(db, GLOBAL_COLLECTIONS.MEMBERS);
      const snapshot = await getDocs(membersRef);
      
      const preview: PreviewItem[] = [];
      const affectedIds: string[] = []; // 🆕 存储所有受影响的会员ID
      let affectedCount = 0;

      snapshot.forEach(docSnapshot => {
        const memberData = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // 检查是否有任何字段需要操作
        let hasOperation = false;
        swapMappings.forEach(mapping => {
          const currentValue = getNestedValue(memberData, mapping.currentField);
          
          if (mapping.operationType === 'swap') {
            const targetValue = getNestedValue(memberData, mapping.targetField);
            // 对调：只有当值不同时才需要操作
            if (currentValue !== targetValue && (currentValue || targetValue)) {
              hasOperation = true;
            }
          } else if (mapping.operationType === 'remove') {
            // 移除：只要字段有值就需要操作
            if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
              hasOperation = true;
            }
          }
        });

        if (hasOperation) {
          affectedCount++;
          affectedIds.push(docSnapshot.id); // 🆕 记录所有受影响的ID
          
          // 显示所有受影响的记录（移除数量限制）
          const firstMapping = swapMappings[0];
          const currentFieldValue = getNestedValue(memberData, firstMapping.currentField);
          const targetFieldValue = firstMapping.operationType === 'swap' 
            ? getNestedValue(memberData, firstMapping.targetField) 
            : null;
          
          preview.push({
            memberId: docSnapshot.id,
            memberName: (memberData as any).name || (memberData as any).profile?.name || '未知',
            operationType: firstMapping.operationType,
            currentFieldValue,
            targetFieldValue,
            willSwap: true,
          });
        }
      });

      setPreviewData(preview);
      setAllAffectedMemberIds(affectedIds); // 🆕 保存所有受影响的ID
      setSelectedRowKeys([]); // 🆕 清空选择
      setStats(prev => ({ 
        ...prev, 
        affectedMembers: affectedCount,
        swapCount: swapMappings.length 
      }));
      setPreviewVisible(true);
      
      if (affectedCount === 0) {
        message.info('没有需要操作的数据');
      } else {
        const hasSwap = swapMappings.some(m => m.operationType === 'swap');
        const hasRemove = swapMappings.some(m => m.operationType === 'remove');
        let msg = `找到 ${affectedCount} 位会员需要`;
        if (hasSwap && hasRemove) msg += '对调和移除字段';
        else if (hasSwap) msg += '对调字段';
        else msg += '移除字段';
        msg += `（已加载全部 ${preview.length} 条预览记录）`;
        message.success(msg);
      }
    } catch (error) {
      console.error('Failed to preview swap:', error);
      message.error('预览失败');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 执行对调（通用函数）
  const executeSwap = async (memberIds: string[], totalCount: number) => {
    setExecuting(true);
    setProgress(0);
    
    try {
      const membersRef = collection(db, GLOBAL_COLLECTIONS.MEMBERS);
      const snapshot = await getDocs(membersRef);
      
      const batch = writeBatch(db);
      let processedCount = 0;
      let batchCount = 0;
      const maxBatchSize = 500; // Firestore batch limit
      
      // 创建ID集合以快速查找
      const targetIds = new Set(memberIds);

      for (const docSnapshot of snapshot.docs) {
        // 🆕 只处理指定的会员ID
        if (!targetIds.has(docSnapshot.id)) {
          continue;
        }
        
        const memberData = { id: docSnapshot.id, ...docSnapshot.data() };
        let needsUpdate = false;
        const updates: any = {};

        // 对每个映射执行操作
        swapMappings.forEach(mapping => {
          const currentValue = getNestedValue(memberData, mapping.currentField);
          
          if (mapping.operationType === 'swap') {
            const targetValue = getNestedValue(memberData, mapping.targetField);
            // 对调：只有当值不同时才操作
            if (currentValue !== targetValue && (currentValue || targetValue)) {
              needsUpdate = true;
              updates[mapping.currentField] = targetValue ?? null;
              updates[mapping.targetField] = currentValue ?? null;
            }
          } else if (mapping.operationType === 'remove') {
            // 移除：只要字段有值就清空
            if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
              needsUpdate = true;
              updates[mapping.currentField] = null;
            }
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
          setProgress(Math.round((processedCount / totalCount) * 100));
        }
      }

      // 提交剩余的批次
      if (batchCount > 0) {
        await batch.commit();
      }

      setProgress(100);
      const hasSwap = swapMappings.some(m => m.operationType === 'swap');
      const hasRemove = swapMappings.some(m => m.operationType === 'remove');
      let msg = `成功`;
      if (hasSwap && hasRemove) msg += '对调和移除';
      else if (hasSwap) msg += '对调';
      else msg += '移除';
      msg += ` ${processedCount} 位会员的字段数据！`;
      message.success(msg);
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
  };

  // 🆕 对调选中的记录
  const handleExecuteSelectedSwap = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的记录');
      return;
    }

    const hasSwap = swapMappings.some(m => m.operationType === 'swap');
    const hasRemove = swapMappings.some(m => m.operationType === 'remove');
    let actionText = hasSwap && hasRemove ? '对调和移除' : (hasSwap ? '对调' : '移除');

    Modal.confirm({
      title: `确认${actionText}选中记录？`,
      content: `即将${actionText}选中的 ${selectedRowKeys.length} 位会员的 ${stats.swapCount} 个字段，此操作不可逆，请确认！`,
      okText: '确认执行',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        await executeSwap(selectedRowKeys as string[], selectedRowKeys.length);
      },
    });
  };

  // 🆕 对调/移除所有记录
  const handleExecuteAllSwap = async () => {
    const hasSwap = swapMappings.some(m => m.operationType === 'swap');
    const hasRemove = swapMappings.some(m => m.operationType === 'remove');
    let actionText = hasSwap && hasRemove ? '对调和移除' : (hasSwap ? '对调' : '移除');

    Modal.confirm({
      title: `确认${actionText}所有记录？`,
      content: (
        <div>
          <p>即将{actionText} <Text strong style={{ color: '#ff4d4f' }}>{stats.affectedMembers}</Text> 位会员的 {stats.swapCount} 个字段。</p>
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>⚠️ 此操作不可逆，请确保已测试选中记录无误！</p>
        </div>
      ),
      okText: '确认执行全部',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        await executeSwap(allAffectedMemberIds, stats.affectedMembers);
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
      title: '操作类型',
      dataIndex: 'operationType',
      width: 100,
      align: 'center',
      render: (type: OperationType) => 
        type === 'swap' ? (
          <Tag color="blue">对调</Tag>
        ) : (
          <Tag color="orange">移除</Tag>
        ),
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
      render: (_, record) => 
        record.operationType === 'swap' ? (
          <SwapOutlined style={{ fontSize: 16, color: '#1890ff' }} />
        ) : (
          <Text type="danger">→ null</Text>
        ),
    },
    {
      title: '目标字段值',
      dataIndex: 'targetFieldValue',
      width: 150,
      render: (val, record) => 
        record.operationType === 'swap' ? (
          <Tag color="green">{val || '-'}</Tag>
        ) : (
          <Tag color="default">-</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'willSwap',
      width: 120,
      align: 'center',
      render: (willSwap, record) => 
        willSwap ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            {record.operationType === 'swap' ? '将对调' : '将移除'}
          </Tag>
        ) : (
          <Tag>无需操作</Tag>
        ),
    },
  ];

  return (
    <ErrorBoundary>
      <div className="data-field-swap-page">
        <PageHeader
          title="字段数据操作工具"
          subtitle="Data Field Operation Tool"
          breadcrumbs={[
            { title: '首页', path: '/' },
            { title: '系统设置', path: '/settings' },
            { title: '字段数据操作' },
          ]}
        />

        <Alert
          message="⚠️ 临时工具 - 谨慎使用"
          description="此工具用于批量操作会员字段数据（对调/移除）。所有操作不可逆，请务必先测试选中记录，确认无误后再执行全部！"
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
                title="操作字段数"
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
              <Card key={mapping.id} size="small" style={{ marginBottom: 8 }}>
                <Row gutter={16} align="middle">
                  <Col xs={24} sm={24} style={{ marginBottom: 8 }}>
                    <Space>
                      <Text strong>操作 {index + 1}:</Text>
                      <Radio.Group
                        value={mapping.operationType}
                        onChange={(e) => updateSwapMapping(mapping.id, 'operationType', e.target.value)}
                        buttonStyle="solid"
                        size="small"
                      >
                        <Radio.Button value="swap">
                          <SwapOutlined /> 对调字段
                        </Radio.Button>
                        <Radio.Button value="remove">
                          <DeleteOutlined /> 移除字段
                        </Radio.Button>
                      </Radio.Group>
                      {swapMappings.length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          onClick={() => removeSwapMapping(mapping.id)}
                        >
                          删除操作
                        </Button>
                      )}
                    </Space>
                  </Col>
                  <Col xs={24} sm={mapping.operationType === 'swap' ? 11 : 23}>
                    <Select
                      style={{ width: '100%' }}
                      placeholder={mapping.operationType === 'swap' ? "选择字段A" : "选择要移除的字段"}
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
                  {mapping.operationType === 'swap' && (
                    <>
                      <Col xs={24} sm={2} style={{ textAlign: 'center' }}>
                        <SwapOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                      </Col>
                      <Col xs={24} sm={11}>
                        <Select
                          style={{ width: '100%' }}
                          placeholder="选择字段B"
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
                    </>
                  )}
                </Row>
              </Card>
            ))}

            <Space>
              <Button onClick={addSwapMapping}>
                + 添加操作
              </Button>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={handlePreview}
              >
                预览操作
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 快捷配置示例 */}
        <Card title="快捷配置示例" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="示例: 修复T恤尺寸和刺绣名称对调错误"
              description={
                <div>
                  <p>对调操作: profile.shirtSize ↔ profile.nameToBeEmbroidered</p>
                  <p style={{ color: '#faad14', marginTop: 4 }}>
                    ⚠️ 注意：一次对调操作即可完成字段互换，无需重复配置
                  </p>
                </div>
              }
              type="info"
              showIcon
            />
            <Button
              size="small"
              onClick={() => {
                setSwapMappings([
                  { id: '1', operationType: 'swap' as OperationType, currentField: 'profile.shirtSize', targetField: 'profile.nameToBeEmbroidered' },
                ]);
                message.success('已应用快捷配置：T恤尺寸 ↔ 刺绣名称');
              }}
            >
              应用此配置
            </Button>
          </Space>
        </Card>

        {/* 预览模态框 */}
        <Modal
          title={
            <Space>
              <span>预览操作结果 - {stats.affectedMembers} 位会员受影响</span>
              {previewData.length < stats.affectedMembers && (
                <Tag color="orange">显示 {previewData.length}/{stats.affectedMembers} 条</Tag>
              )}
              {selectedRowKeys.length > 0 && (
                <Tag color="blue">已选 {selectedRowKeys.length} 条</Tag>
              )}
            </Space>
          }
          open={previewVisible}
          onCancel={() => {
            setPreviewVisible(false);
            setSelectedRowKeys([]);
          }}
          width={1200}
          footer={
            <Space>
              <Button onClick={() => {
                setPreviewVisible(false);
                setSelectedRowKeys([]);
              }}>
                取消
              </Button>
              <Button
                type="primary"
                icon={<SwapOutlined />}
                loading={executing}
                disabled={selectedRowKeys.length === 0}
                onClick={handleExecuteSelectedSwap}
              >
                执行选中记录 ({selectedRowKeys.length})
              </Button>
              <Button
                type="primary"
                danger
                icon={<SwapOutlined />}
                loading={executing}
                onClick={handleExecuteAllSwap}
              >
                执行所有记录 ({stats.affectedMembers})
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
            message="使用说明"
            description={
              <div>
                <p><strong>步骤1（测试）：</strong>先勾选1-2条记录，点击"执行选中记录"进行测试</p>
                <p><strong>步骤2（全量）：</strong>确认测试无误后，点击"执行所有记录"批量处理</p>
                <p><strong>操作详情：</strong>
                  {swapMappings.map((m, i) => {
                    const current = AVAILABLE_FIELDS.find(f => f.value === m.currentField)?.label || '未选择';
                    const target = m.operationType === 'swap' 
                      ? AVAILABLE_FIELDS.find(f => f.value === m.targetField)?.label || '未选择'
                      : 'null';
                    return (
                      <span key={m.id} style={{ display: 'block', marginTop: i > 0 ? 4 : 0 }}>
                        {i + 1}. {m.operationType === 'swap' ? '对调' : '移除'}: {current} 
                        {m.operationType === 'swap' ? ` ↔ ${target}` : ' → null'}
                      </span>
                    );
                  })}
                </p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Table
            columns={previewColumns}
            dataSource={previewData}
            rowKey="memberId"
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              selections: [
                Table.SELECTION_ALL,
                Table.SELECTION_INVERT,
                Table.SELECTION_NONE,
              ],
            }}
            pagination={false}
            size="small"
            scroll={{ y: 500 }}
          />
          
          {stats.affectedMembers > 0 && (
            <Alert
              message={
                <div>
                  <strong>已加载全部 {previewData.length} 条预览记录</strong>
                  {previewData.length > 50 && (
                    <span style={{ marginLeft: 8, color: '#faad14' }}>
                      · 建议先测试少量记录，确认无误后再执行全部
                    </span>
                  )}
                </div>
              }
              type="success"
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

