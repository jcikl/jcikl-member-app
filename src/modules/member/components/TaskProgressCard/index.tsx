/**
 * Task Progress Card Component
 * 任务进度卡片组件
 * 
 * 展示 Leadership 和 Trainer 发展路径
 */

import React from 'react';
import { Card, Row, Col } from 'antd';

interface TaskProgressCardProps {
  layout?: 'horizontal' | 'vertical';
}

/**
 * Task Progress Card Component
 */
export const TaskProgressCard: React.FC<TaskProgressCardProps> = ({ layout = 'vertical' }) => {
  const ROW_GUTTER: [number, number] = [16, 16];

  return (
    <Row gutter={ROW_GUTTER}>
      {/* Probation to Voting Member Pathway */}
      <Col xs={24}>
        <Card title="Probation Member to Voting Member Pathway" bordered={true} style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', padding: '40px 12px 20px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              {/* Connecting Line - from first dot center to last dot center */}
              <div style={{
                position: 'absolute',
                left: 'calc(100% / 12)',
                right: 'calc(100% / 12)',
                top: 12,
                height: 3,
                backgroundColor: '#52c41a',
                zIndex: 1,
              }} />
              
              {/* All Steps - Using flex to distribute evenly */}
              {[
                { label: 'Probation Member', color: '#faad14', isStart: true },
                { label: 'JCI Discover or New Member Orientation', color: '#1890ff' },
                { label: 'Attended 2+ JCI KL Events', color: '#1890ff' },
                { label: '1x Project Committee or Organising Chairman', color: '#1890ff' },
                { label: 'Attended 1+ BOD Meeting', color: '#1890ff' },
                { label: 'Voting Member', color: '#52c41a', isEnd: true },
              ].map((step, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0,
                  position: 'relative',
                  zIndex: 10,
                }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: step.color,
                    border: '3px solid #fff',
                    boxShadow: step.isStart || step.isEnd ? '0 0 0 2px #52c41a' : '0 0 0 2px #52c41a',
                    position: 'relative',
                    zIndex: 10,
                  }} />
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: 10, 
                    color: '#666', 
                    textAlign: 'center', 
                    width: '100%',
                    lineHeight: 1.2,
                    fontWeight: (step.isStart || step.isEnd) ? 600 : 400,
                    wordBreak: 'break-word',
                    padding: '0 2px',
                  }}>
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} lg={layout === 'horizontal' ? 12 : 24}>
        <Card title="Leadership Development Pathway" bordered={true} style={{ marginBottom: layout === 'vertical' ? 16 : 0, height: '100%' }}>
          <div style={{ position: 'relative', padding: '40px 12px 20px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              {/* Connecting Line - from first dot center to last dot center */}
              <div style={{
                position: 'absolute',
                left: 'calc(100% / 18)',
                right: 'calc(100% / 18)',
                top: 12,
                height: 3,
                backgroundColor: '#1890ff',
                zIndex: 1,
              }} />
              
              {/* All Steps - Using flex to distribute evenly */}
              {[
                { label: 'New Member', color: '#faad14', isStart: true },
                { label: 'Project Committee', color: '#ff7a00' },
                { label: 'Organising Chairperson', color: '#ff7a00' },
                { label: 'Commission Director', color: '#ff7a00' },
                { label: 'Board of Director', color: '#ff4d4f' },
                { label: 'Local President', color: '#ff4d4f' },
                { label: 'Area Officer', color: '#eb2f96' },
                { label: 'National Officer', color: '#722ed1' },
                { label: 'International Officer', color: '#722ed1' },
              ].map((step, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0,
                  position: 'relative',
                  zIndex: 10,
                }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: step.color,
                    border: '3px solid #fff',
                    boxShadow: step.isStart ? '0 0 0 2px #1890ff' : '0 0 0 2px #1890ff',
                    position: 'relative',
                    zIndex: 10,
                  }} />
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: 10, 
                    color: '#666', 
                    textAlign: 'center', 
                    width: '100%',
                    lineHeight: 1.2,
                    fontWeight: step.isStart ? 500 : 400,
                    wordBreak: 'break-word',
                    padding: '0 2px',
                  }}>
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Col>
      <Col xs={24} lg={layout === 'horizontal' ? 12 : 24}>
        <Card title="Trainer Development Pathway" bordered={true} style={{ height: '100%' }}>
          <div style={{ position: 'relative', padding: '40px 12px 20px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              {/* Connecting Line - from first dot center to last dot center */}
              <div style={{
                position: 'absolute',
                left: 'calc(100% / 12)',
                right: 'calc(100% / 12)',
                top: 12,
                height: 3,
                backgroundColor: '#1890ff',
                zIndex: 1,
              }} />
              
              {/* All Steps - Using flex to distribute evenly */}
              {[
                { label: 'New Member', color: '#faad14', isStart: true },
                { label: 'JCI Trainer', color: '#73d13d' },
                { label: 'JCI Malaysia Intermediate Trainer', color: '#389e0d' },
                { label: 'JCI Malaysia Certified Trainer', color: '#13c2c2' },
                { label: 'JCI Malaysia Principal Trainer', color: '#40a9ff' },
                { label: 'JCI Malaysia Master Trainer', color: '#40a9ff' },
              ].map((step, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0,
                  position: 'relative',
                  zIndex: 10,
                }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: step.color,
                    border: '3px solid #fff',
                    boxShadow: step.isStart ? '0 0 0 2px #1890ff' : '0 0 0 2px #1890ff',
                    position: 'relative',
                    zIndex: 10,
                  }} />
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: 10, 
                    color: '#666', 
                    textAlign: 'center', 
                    width: '100%',
                    lineHeight: 1.2,
                    fontWeight: step.isStart ? 500 : 400,
                    wordBreak: 'break-word',
                    padding: '0 2px',
                  }}>
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default TaskProgressCard;

