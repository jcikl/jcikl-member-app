/**
 * Data Fix Management Page
 * 数据修复管理页面
 * 
 * 用于修复交易记录的 relatedEventId 字段问题
 */

import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Typography, 
  Alert, 
  Space, 
  Progress,
  Descriptions,
  Tag,
  message
} from 'antd';
import { 
  SearchOutlined, 
  ToolOutlined, 
  ReloadOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { Navigate } from 'react-router-dom';
import { db } from '@/services/firebase';
import { collection, getDocs, query, doc, writeBatch } from 'firebase/firestore';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { Timestamp } from 'firebase/firestore';

const { Title, Text } = Typography;

interface AnalysisResult {
  correct: number;
  wrongId: number;
  invalid: number;
  empty: number;
  total: number;
  needsFix: number;
}

interface FixProgress {
  total: number;
  fixed: number;
  failed: number;
  percentage: number;
}

export const DataFixPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState<FixProgress>({ total: 0, fixed: 0, failed: 0, percentage: 0 });

  // 权限检查：只有管理员可以访问
  if (!user) {
    return <Navigate to="/login" />;
  }

  const hasAdminPermission = user.role === 'super_admin' || user.role === 'admin';

  if (!hasAdminPermission) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Alert
          message="权限不足"
          description="只有管理员可以访问此页面"
          type="warning"
        />
      </div>
    );
  }

  /**
   * 分析交易记录的 relatedEventId 问题
   */
  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);
    
    try {
      // 1. 获取所有活动
      const eventsSnapshot = await getDocs(query(collection(db, GLOBAL_COLLECTIONS.EVENTS)));
      
      const eventMap = new Map<string, { name: string; financialAccount: string; status: string }>();
      const financialAccountSet = new Set<string>();
      const eventIdToFinancialAccountMap = new Map<string, string>();
      
      eventsSnapshot.forEach(doc => {
        const event = doc.data();
        if (event.financialAccount) {
          eventMap.set(doc.id, {
            name: event.name,
            financialAccount: event.financialAccount,
            status: event.status
          });
          financialAccountSet.add(event.financialAccount);
          eventIdToFinancialAccountMap.set(doc.id, event.financialAccount);
        }
      });

      // 2. 获取所有交易
      const transactionsSnapshot = await getDocs(query(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS)));
      
      // 3. 分类统计
      const stats = {
        correct: 0,
        wrongId: 0,
        invalid: 0,
        empty: 0,
        total: transactionsSnapshot.size,
        needsFix: 0
      };
      
      transactionsSnapshot.forEach(doc => {
        const txn = doc.data();
        const relatedEventId = txn.relatedEventId;
        
        if (!relatedEventId) {
          stats.empty++;
          return;
        }
        
        // 检查是否是 financialAccount（正确）
        if (financialAccountSet.has(relatedEventId)) {
          stats.correct++;
          return;
        }
        
        // 检查是否是活动ID（错误，需要修复）
        if (eventIdToFinancialAccountMap.has(relatedEventId)) {
          stats.wrongId++;
          return;
        }
        
        // 既不是活动ID也不是financialAccount
        stats.invalid++;
      });
      
      stats.needsFix = stats.wrongId + stats.invalid;
      setAnalysis(stats);
      
      message.success('分析完成');
    } catch (error) {
      console.error('分析失败:', error);
      message.error('分析失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 修复交易记录的 relatedEventId
   */
  const handleFix = async () => {
    if (!analysis || analysis.needsFix === 0) {
      message.warning('没有需要修复的数据');
      return;
    }

    setFixing(true);
    setProgress({ total: 0, fixed: 0, failed: 0, percentage: 0 });
    
    try {
      // 1. 获取所有活动和映射
      const eventsSnapshot = await getDocs(query(collection(db, GLOBAL_COLLECTIONS.EVENTS)));
      
      const eventIdToFinancialAccountMap = new Map<string, string>();
      const financialAccountSet = new Set<string>();
      
      eventsSnapshot.forEach(doc => {
        const event = doc.data();
        if (event.financialAccount) {
          eventIdToFinancialAccountMap.set(doc.id, event.financialAccount);
          financialAccountSet.add(event.financialAccount);
        }
      });

      // 2. 获取所有交易
      const transactionsSnapshot = await getDocs(query(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS)));
      
      // 3. 收集需要修复的交易
      const transactionsToFix: Array<{ id: string; oldValue: string; newValue: string }> = [];
      
      transactionsSnapshot.forEach(doc => {
        const txn = doc.data();
        const relatedEventId = txn.relatedEventId;
        
        if (!relatedEventId) return;
        
        // 已经是 financialAccount，跳过
        if (financialAccountSet.has(relatedEventId)) return;
        
        // 如果是活动ID，需要修复
        if (eventIdToFinancialAccountMap.has(relatedEventId)) {
          const newValue = eventIdToFinancialAccountMap.get(relatedEventId)!;
          transactionsToFix.push({
            id: doc.id,
            oldValue: relatedEventId,
            newValue: newValue
          });
          return;
        }
        
        // 既不是活动ID也不是financialAccount，清除
        transactionsToFix.push({
          id: doc.id,
          oldValue: relatedEventId,
          newValue: '' // 清除无效值
        });
      });
      
      setProgress({ total: transactionsToFix.length, fixed: 0, failed: 0, percentage: 0 });
      
      // 4. 批量更新（每次500条）
      const batchSize = 500;
      let fixed = 0;
      let failed = 0;
      
      for (let i = 0; i < transactionsToFix.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchItems = transactionsToFix.slice(i, Math.min(i + batchSize, transactionsToFix.length));
        
        batchItems.forEach(tx => {
          const ref = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, tx.id);
          if (tx.newValue) {
            batch.update(ref, {
              relatedEventId: tx.newValue,
              updatedAt: Timestamp.now()
            });
          } else {
            // 清除无效值
            batch.update(ref, {
              relatedEventId: null,
              updatedAt: Timestamp.now()
            });
          }
        });
        
        try {
          await batch.commit();
          fixed += batchItems.length;
          setProgress({
            total: transactionsToFix.length,
            fixed,
            failed,
            percentage: Math.round((fixed / transactionsToFix.length) * 100)
          });
        } catch (error) {
          console.error('批量更新失败:', error);
          failed += batchItems.length;
        }
      }
      
      message.success(`修复完成: 成功 ${fixed} 条，失败 ${failed} 条`);
      
      // 5. 重新分析
      await handleAnalyze();
    } catch (error) {
      console.error('修复失败:', error);
      message.error('修复失败: ' + (error as Error).message);
    } finally {
      setFixing(false);
      setProgress({ total: 0, fixed: 0, failed: 0, percentage: 0 });
    }
  };

  const analysisColumns = [
    {
      title: '类别',
      key: 'category',
      render: (_: any, __: any, index: number) => {
        const labels = ['正确的', '错误的ID', '无效值', '空值'];
        const colors = ['success', 'warning', 'error', 'default'];
        return <Tag color={colors[index]}>{labels[index]}</Tag>;
      }
    },
    {
      title: '数量',
      dataIndex: 'count',
      render: (count: number) => count.toLocaleString()
    },
    {
      title: '占比',
      key: 'percentage',
      render: (_: any, __: any, index: number) => {
        if (!analysis) return '-';
        const counts = [analysis.correct, analysis.wrongId, analysis.invalid, analysis.empty];
        const percentage = ((counts[index] / analysis.total) * 100).toFixed(1);
        return `${percentage}%`;
      }
    }
  ];

  const analysisData = analysis ? [
    { key: 'correct', count: analysis.correct },
    { key: 'wrongId', count: analysis.wrongId },
    { key: 'invalid', count: analysis.invalid },
    { key: 'empty', count: analysis.empty }
  ] : [];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>数据修复管理</Title>
      
      <Alert
        message="安全提示"
        description="此页面用于修复交易记录的 relatedEventId 字段问题。执行修复前请确保已备份数据。"
        type="warning"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 操作按钮 */}
        <Card>
          <Space size="middle">
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleAnalyze}
              loading={loading}
            >
              分析数据
            </Button>
            <Button
              type="primary"
              danger
              icon={<ToolOutlined />}
              onClick={handleFix}
              loading={fixing}
              disabled={!analysis || analysis.needsFix === 0 || fixing}
            >
              执行修复
            </Button>
          </Space>
        </Card>

        {/* 分析结果 */}
        {analysis && (
          <Card title="分析结果" extra={<ReloadOutlined onClick={handleAnalyze} style={{ cursor: 'pointer' }} />}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="总交易数">
                <Text strong>{analysis.total.toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="需要修复">
                <Tag color={analysis.needsFix > 0 ? 'warning' : 'success'}>
                  {analysis.needsFix.toLocaleString()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="正确">
                <Tag color="success">
                  {analysis.correct.toLocaleString()} ({((analysis.correct / analysis.total) * 100).toFixed(1)}%)
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="错误ID">
                <Tag color="warning">
                  {analysis.wrongId.toLocaleString()} ({((analysis.wrongId / analysis.total) * 100).toFixed(1)}%)
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="无效值">
                <Tag color="error">
                  {analysis.invalid.toLocaleString()} ({((analysis.invalid / analysis.total) * 100).toFixed(1)}%)
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="空值">
                <Tag color="default">
                  {analysis.empty.toLocaleString()} ({((analysis.empty / analysis.total) * 100).toFixed(1)}%)
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Table
              columns={analysisColumns}
              dataSource={analysisData}
              rowKey="key"
              pagination={false}
              style={{ marginTop: '16px' }}
            />
          </Card>
        )}

        {/* 修复进度 */}
        {fixing && progress.total > 0 && (
          <Card title="修复进度">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Progress percent={progress.percentage} />
              <Descriptions column={3}>
                <Descriptions.Item label="总数">{progress.total}</Descriptions.Item>
                <Descriptions.Item label="已修复">
                  <Tag color="success">{progress.fixed}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="失败">
                  <Tag color="error">{progress.failed}</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default DataFixPage;

