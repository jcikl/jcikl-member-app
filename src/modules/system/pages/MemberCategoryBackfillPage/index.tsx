import React, { useState } from 'react';
// Global Config (PRIORITY - ALWAYS FIRST)
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { globalComponentService } from '@/config/globalComponentSettings';
// Third-party
import { Card, Button, Typography, Space, Alert, Table, Tag, message } from 'antd';
// Firebase
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
// Components
import { PermissionGuard } from '@/components';

interface SummaryRow {
  key: string;
  label: string;
  value: string | number;
}

const MemberCategoryBackfillPage: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);

  const appendLog = (line: string) => setLogLines(prev => [...prev, `${new Date().toLocaleTimeString()} ${line}`]);

  const runBackfill = async () => {
    if (running) return;
    setRunning(true);
    setUpdatedCount(0);
    setSkippedCount(0);
    setFailedCount(0);
    setTotalCandidates(0);
    setLogLines([]);

    try {
      appendLog('开始扫描已支付会费的会员...');
      const paidSnap = await getDocs(
        query(
          collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS),
          where('type', '==', 'memberFee'),
          where('paidAmount', '>', 0)
        )
      );

      // 兼容历史：若 paidAmount 缺失，尝试用 status
      let extraByStatus = 0;
      if (paidSnap.empty) {
        appendLog('未发现 paidAmount>0 的记录，尝试使用 status==paid 兼容历史数据...');
        const byStatus = await getDocs(
          query(
            collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS),
            where('type', '==', 'memberFee'),
            where('status', '==', 'paid')
          )
        );
        extraByStatus = byStatus.size;
        const ids = new Set<string>();
        byStatus.docs.forEach(d => {
          const v = d.data() as any;
          if (typeof v.memberId === 'string' && v.memberId) ids.add(v.memberId);
        });
        setTotalCandidates(ids.size);
        appendLog(`发现候选会员(按status=paid)：${ids.size} 个`);
        await processMembers(Array.from(ids));
      } else {
        const ids = new Set<string>();
        paidSnap.docs.forEach(d => {
          const v = d.data() as any;
          if (typeof v.memberId === 'string' && v.memberId) ids.add(v.memberId);
        });
        setTotalCandidates(ids.size);
        appendLog(`发现候选会员：${ids.size} 个`);
        await processMembers(Array.from(ids));
      }

      message.success('回填完成');
      globalSystemService.log('info', 'Member probation backfill completed', 'MemberCategoryBackfillPage', {
        updatedCount, skippedCount, failedCount, totalCandidates,
      });
    } catch (e: any) {
      appendLog(`执行失败: ${e?.message || e}`);
      message.error('回填失败');
    } finally {
      setRunning(false);
    }
  };

  const processMembers = async (memberIds: string[]) => {
    // 顺序处理，规模可控；如需更快可分批并行
    for (const memberId of memberIds) {
      try {
        const ref = doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setSkippedCount(v => v + 1);
          continue;
        }
        const data = snap.data() as any;
        const currentCat = data?.jciCareer?.category as string | undefined;
        // 覆盖拜访会员：允许从 Visiting Member 回填为 Probation Member
        if (currentCat === 'Alumni' || currentCat === 'Probation Member') {
          setSkippedCount(v => v + 1);
          continue;
        }
        await updateDoc(ref, {
          'jciCareer.category': 'Probation Member',
          updatedAt: new Date().toISOString(),
        });
        setUpdatedCount(v => v + 1);
      } catch (e) {
        setFailedCount(v => v + 1);
      }
    }
  };

  const summary: SummaryRow[] = [
    { key: 'total', label: '候选会员数', value: totalCandidates },
    { key: 'updated', label: '已更新为准会员', value: updatedCount },
    { key: 'skipped', label: '跳过(已是更高优先级/不存在)', value: skippedCount },
    { key: 'failed', label: '失败', value: failedCount },
  ];

  const columns = [
    { title: '项目', dataIndex: 'label', key: 'label', width: 220 },
    { title: '数值', dataIndex: 'value', key: 'value', render: (v: any, r: SummaryRow) => (
      <Tag color={r.key === 'failed' ? 'error' : r.key === 'updated' ? 'blue' : 'default'}>{String(v)}</Tag>
    ) },
  ];

  return (
    <PermissionGuard permissions="SYSTEM_SETTINGS">
      <div style={{ padding: 16 }}>
        <Card title="一次性回填：将拥有会费记录的会员设为准会员" extra={
          <Button type="primary" onClick={runBackfill} loading={running} disabled={running}>
            {running ? '执行中...' : '执行回填'}
          </Button>
        }>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert type="info" showIcon message="说明" description={
              <div>
                <div>扫描财务记录：type='memberFee' 且 paidAmount &gt; 0（若无则兼容 status='paid'）。</div>
                <div>将符合条件且当前分类非 Alumni/Visiting/Probation 的会员更新为 Probation Member。</div>
              </div>
            }/>

            <Table
              size="small"
              rowKey="key"
              pagination={false}
              columns={columns as any}
              dataSource={summary}
            />

            <Card title="执行日志" size="small">
              <div style={{ maxHeight: 220, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
                {logLines.length === 0 ? <div style={{ color: '#999' }}>无</div> : logLines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </Card>
          </Space>
        </Card>
      </div>
    </PermissionGuard>
  );
};

export default MemberCategoryBackfillPage;


