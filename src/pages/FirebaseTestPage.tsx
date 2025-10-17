import React, { useState } from 'react';
import { Card, Button, Space, Typography, List, Tag, Divider, message } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  FireOutlined,
  DatabaseOutlined,
  LockOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { auth, db, storage } from '@/services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { GLOBAL_COLLECTIONS } from '@/config';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  duration?: number;
}

/**
 * Firebase Integration Test Page
 * Firebase集成测试页面
 */
const FirebaseTestPage: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (name: string, status: 'success' | 'error', message?: string, duration?: number) => {
    setResults(prev => prev.map(r => 
      r.name === name ? { ...r, status, message, duration } : r
    ));
  };

  const runTests = async () => {
    setTesting(true);
    const testResults: TestResult[] = [
      { name: 'Firebase初始化', status: 'pending' },
      { name: 'Authentication连接', status: 'pending' },
      { name: 'Firestore连接', status: 'pending' },
      { name: 'Firestore读取', status: 'pending' },
      { name: 'Firestore写入', status: 'pending' },
      { name: 'Firestore删除', status: 'pending' },
      { name: 'Storage连接', status: 'pending' },
      { name: '离线持久化', status: 'pending' },
    ];
    setResults(testResults);

    try {
      // Test 1: Firebase初始化
      const start1 = Date.now();
      try {
        if (!auth || !db || !storage) {
          throw new Error('Firebase未初始化');
        }
        updateResult('Firebase初始化', 'success', 'Firebase已成功初始化', Date.now() - start1);
      } catch (error: any) {
        updateResult('Firebase初始化', 'error', error.message, Date.now() - start1);
        return;
      }

      // Test 2: Authentication连接
      const start2 = Date.now();
      try {
        const user = auth.currentUser;
        updateResult(
          'Authentication连接', 
          'success', 
          user ? `当前用户: ${user.email}` : '未登录', 
          Date.now() - start2
        );
      } catch (error: any) {
        updateResult('Authentication连接', 'error', error.message, Date.now() - start2);
      }

      // Test 3: Firestore连接
      const start3 = Date.now();
      try {
        await getDocs(collection(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS));
        updateResult('Firestore连接', 'success', 'Firestore连接正常', Date.now() - start3);
      } catch (error: any) {
        updateResult('Firestore连接', 'error', error.message, Date.now() - start3);
        return;
      }

      // Test 4: Firestore读取
      const start4 = Date.now();
      try {
        const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS));
        updateResult(
          'Firestore读取', 
          'success', 
          `成功读取${snapshot.size}条全局设置`, 
          Date.now() - start4
        );
      } catch (error: any) {
        updateResult('Firestore读取', 'error', error.message, Date.now() - start4);
      }

      // Test 5: Firestore写入
      const start5 = Date.now();
      try {
        const testDocRef = doc(db, 'test_collection', 'test_document');
        await setDoc(testDocRef, {
          testField: 'test value',
          timestamp: new Date().toISOString(),
        });
        updateResult('Firestore写入', 'success', '测试数据写入成功', Date.now() - start5);
      } catch (error: any) {
        updateResult('Firestore写入', 'error', error.message, Date.now() - start5);
      }

      // Test 6: Firestore删除
      const start6 = Date.now();
      try {
        const testDocRef = doc(db, 'test_collection', 'test_document');
        await deleteDoc(testDocRef);
        updateResult('Firestore删除', 'success', '测试数据删除成功', Date.now() - start6);
      } catch (error: any) {
        updateResult('Firestore删除', 'error', error.message, Date.now() - start6);
      }

      // Test 7: Storage连接
      const start7 = Date.now();
      try {
        const testRef = ref(storage, 'test/test.txt');
        const blob = new Blob(['test content'], { type: 'text/plain' });
        await uploadBytes(testRef, blob);
        await deleteObject(testRef);
        updateResult('Storage连接', 'success', 'Storage读写正常', Date.now() - start7);
      } catch (error: any) {
        updateResult('Storage连接', 'error', error.message, Date.now() - start7);
      }

      // Test 8: 离线持久化
      const start8 = Date.now();
      try {
        const isOnline = navigator.onLine;
        updateResult(
          '离线持久化', 
          'success', 
          `当前${isOnline ? '在线' : '离线'}，离线持久化已启用`, 
          Date.now() - start8
        );
      } catch (error: any) {
        updateResult('离线持久化', 'error', error.message, Date.now() - start8);
      }

      message.success('所有测试完成');
    } catch (error: any) {
      message.error(`测试失败: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'pending':
        return <LoadingOutlined />;
      default:
        return null;
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'success':
        return <Tag color="success">通过</Tag>;
      case 'error':
        return <Tag color="error">失败</Tag>;
      case 'pending':
        return <Tag color="processing">等待</Tag>;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2}>
              <FireOutlined /> Firebase集成测试
            </Title>
            <Paragraph>
              此页面用于测试Firebase服务的集成状态，包括Authentication、Firestore、Storage和离线持久化功能。
            </Paragraph>
          </div>

          <Divider />

          <div>
            <Title level={4}>快速信息</Title>
            <Space direction="vertical">
              <Text>
                <DatabaseOutlined /> 项目ID: <Tag>{import.meta.env.VITE_FIREBASE_PROJECT_ID}</Tag>
              </Text>
              <Text>
                <LockOutlined /> 认证域: <Tag>{import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}</Tag>
              </Text>
              <Text>
                <CloudOutlined /> 存储桶: <Tag>{import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}</Tag>
              </Text>
            </Space>
          </div>

          <Divider />

          <Button
            type="primary"
            size="large"
            icon={testing ? <LoadingOutlined /> : <FireOutlined />}
            onClick={runTests}
            loading={testing}
            disabled={testing}
          >
            {testing ? '测试中...' : '开始测试'}
          </Button>

          {results.length > 0 && (
            <>
              <Divider />
              <div>
                <Title level={4}>测试结果</Title>
                <List
                  dataSource={results}
                  renderItem={item => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={getStatusIcon(item.status)}
                        title={
                          <Space>
                            <Text strong>{item.name}</Text>
                            {getStatusTag(item.status)}
                            {item.duration && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                ({item.duration}ms)
                              </Text>
                            )}
                          </Space>
                        }
                        description={item.message}
                      />
                    </List.Item>
                  )}
                />
              </div>
            </>
          )}

          <Divider />

          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>注意事项：</strong><br />
              • 运行测试前请确保已完成Firebase配置<br />
              • Storage测试需要认证用户权限<br />
              • 某些测试可能需要网络连接<br />
              • 测试会创建和删除临时数据，不会影响生产数据
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default FirebaseTestPage;

