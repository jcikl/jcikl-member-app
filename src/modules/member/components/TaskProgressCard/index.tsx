/**
 * Task Progress Card Component
 * 任务进度卡片组件
 * 
 * 展示 Leadership 和 Trainer 发展路径
 */

import React from 'react';
import { Card, Row, Col } from 'antd';
import type { Member } from '../../types';

interface TaskProgressCardProps {
  layout?: 'horizontal' | 'vertical';
  member?: Member | null;
}

/**
 * Task Progress Card Component
 */
export const TaskProgressCard: React.FC<TaskProgressCardProps> = ({ layout = 'vertical', member }) => {
  const ROW_GUTTER: [number, number] = [16, 16];
  
  // 灰色（未完成状态）
  const INACTIVE_COLOR = '#d9d9d9';
  
  /**
   * 检查 Probation to Voting Member 步骤是否完成
   */
  const checkProbationToVotingSteps = () => {
    // 步骤 1: JCI Friend (始终为 true - 起点)
    const isJCIFriend = true;
    
    if (!member) {
      return [isJCIFriend, false, false, false, false, false, false];
    }
    
    const tasks = member.profile.taskCompletions || [];
    const activities = member.profile.activityParticipation || [];
    
    // 步骤 2: Probation Member (如果当前是 Probation Member 则为 true)
    const isProbationMember = member.category === 'Probation Member' || member.jciCareer?.category === 'Probation Member';
    
    // 步骤 3: JCI Discover or New Member Orientation
    const hasOrientation = tasks.some(t => 
      t.taskName?.includes('JCI Discover') || 
      t.taskName?.includes('New Member Orientation') ||
      t.taskName?.includes('Orientation')
    );
    
    // 步骤 4: Attended 2+ JCI KL Events
    const jciKLEvents = activities.filter(a => 
      a.eventName?.includes('JCI KL') || a.eventName?.includes('JCIKL')
    );
    const hasAttended2Events = jciKLEvents.length >= 2;
    
    // 步骤 5: 1x Project Committee or Organising Chairman
    const hasCommitteeRole = activities.some(a => 
      a.role?.includes('Committee') || 
      a.role?.includes('Chairman') ||
      a.role?.includes('Chairperson')
    );
    
    // 步骤 6: Attended 1+ BOD Meeting
    const hasBODMeeting = activities.some(a => 
      a.eventName?.includes('BOD') || 
      a.eventName?.includes('Board') ||
      a.eventName?.includes('Board of Director')
    );
    
    // 步骤 7: Voting Member (如果当前是 Official Member 则为 true)
    const isVotingMember = member.category === 'Official Member' || member.jciCareer?.category === 'Official Member';
    
    return [
      isJCIFriend,
      isProbationMember,
      hasOrientation,
      hasAttended2Events,
      hasCommitteeRole,
      hasBODMeeting,
      isVotingMember
    ];
  };
  
  /**
   * 检查 Leadership 步骤是否完成
   */
  const checkLeadershipSteps = () => {
    // 起点步骤 - 始终为 true
    const isJCIFriend = true;
    const isNewMember = true;
    
    if (!member) {
      return [isJCIFriend, isNewMember, false, false, false, false, false, false, false, false];
    }
    
    const positions = member.profile.jciPosition?.split(',').map(p => p.trim()) || [];
    const activities = member.profile.activityParticipation || [];
    
    return [
      isJCIFriend, // JCI Friend - always true (起点)
      isNewMember, // New Member - always true (起点)
      positions.some(p => p.includes('Committee')),
      positions.some(p => p.includes('Chairman') || p.includes('Chairperson')),
      positions.some(p => p.includes('Director') && !p.includes('Board')),
      positions.some(p => p.includes('Board') || p.includes('BOD')),
      positions.some(p => p.includes('President')),
      positions.some(p => p.includes('Area')),
      positions.some(p => p.includes('National')),
      positions.some(p => p.includes('International') || p.includes('JCI World')),
    ];
  };
  
  /**
   * 检查 Trainer 步骤是否完成
   */
  const checkTrainerSteps = () => {
    // 起点步骤 - 始终为 true
    const isJCIFriend = true;
    const isNewMember = true;
    
    if (!member) {
      return [isJCIFriend, isNewMember, false, false, false, false, false];
    }
    
    const positions = member.profile.jciPosition?.split(',').map(p => p.trim()) || [];
    const tasks = member.profile.taskCompletions || [];
    
    return [
      isJCIFriend, // JCI Friend - always true (起点)
      isNewMember, // New Member - always true (起点)
      positions.some(p => p.includes('Trainer')) || tasks.some(t => t.taskName?.includes('JCI Trainer')),
      tasks.some(t => t.taskName?.includes('Intermediate Trainer')),
      tasks.some(t => t.taskName?.includes('Certified Trainer')),
      tasks.some(t => t.taskName?.includes('Principal Trainer')),
      tasks.some(t => t.taskName?.includes('Master Trainer')),
    ];
  };
  
  const probationSteps = checkProbationToVotingSteps();
  const leadershipSteps = checkLeadershipSteps();
  const trainerSteps = checkTrainerSteps();

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
                
                { label: 'JCI Friend', activeColor: '#faad14', isStart: true },
                { label: 'Probation Member', activeColor: '#faad14' },
                { label: 'JCI Discover or New Member Orientation', activeColor: '#1890ff' },
                { label: 'Attended 2+ JCI KL Events', activeColor: '#1890ff' },
                { label: '1x Project Committee or Organising Chairman', activeColor: '#1890ff' },
                { label: 'Attended 1+ BOD Meeting', activeColor: '#1890ff' },
                { label: 'Voting Member', activeColor: '#52c41a', isEnd: true },
              ].map((step, index) => {
                const isCompleted = probationSteps[index];
                const dotColor = isCompleted ? step.activeColor : INACTIVE_COLOR;
                return (
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
                    backgroundColor: dotColor,
                    border: '3px solid #fff',
                    boxShadow: (step.isStart || step.isEnd) && isCompleted ? '0 0 0 2px #52c41a' : '0 0 0 2px #e8e8e8',
                    position: 'relative',
                    zIndex: 10,
                  }} />
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: 10, 
                    color: isCompleted ? '#666' : '#bfbfbf', 
                    textAlign: 'center', 
                    width: '100%',
                    lineHeight: 1.2,
                    fontWeight: (step.isStart || step.isEnd) && isCompleted ? 600 : 400,
                    wordBreak: 'break-word',
                    padding: '0 2px',
                  }}>
                    {step.label}
                  </div>
                </div>
              );
              })}
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
                { label: 'JCI Friend', activeColor: '#faad14', isStart: true },
                { label: 'New Member', activeColor: '#faad14' },
                { label: 'Project Committee', activeColor: '#ff7a00' },
                { label: 'Organising Chairperson', activeColor: '#ff7a00' },
                { label: 'Commission Director', activeColor: '#ff7a00' },
                { label: 'Board of Director', activeColor: '#ff4d4f' },
                { label: 'Local President', activeColor: '#ff4d4f' },
                { label: 'Area Officer', activeColor: '#eb2f96' },
                { label: 'National Officer', activeColor: '#722ed1' },
                { label: 'International Officer', activeColor: '#722ed1' },
              ].map((step, index) => {
                const isCompleted = leadershipSteps[index];
                const dotColor = isCompleted ? step.activeColor : INACTIVE_COLOR;
                return (
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
                    backgroundColor: dotColor,
                    border: '3px solid #fff',
                    boxShadow: isCompleted ? '0 0 0 2px #1890ff' : '0 0 0 2px #e8e8e8',
                    position: 'relative',
                    zIndex: 10,
                  }} />
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: 10, 
                    color: isCompleted ? '#666' : '#bfbfbf', 
                    textAlign: 'center', 
                    width: '100%',
                    lineHeight: 1.2,
                    fontWeight: step.isStart && isCompleted ? 500 : 400,
                    wordBreak: 'break-word',
                    padding: '0 2px',
                  }}>
                    {step.label}
                  </div>
                </div>
              );
              })}
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
                
                { label: 'JCI Friend', activeColor: '#faad14', isStart: true },
                { label: 'New Member', activeColor: '#faad14' },
                { label: 'JCI Trainer', activeColor: '#73d13d' },
                { label: 'JCI Malaysia Intermediate Trainer', activeColor: '#389e0d' },
                { label: 'JCI Malaysia Certified Trainer', activeColor: '#13c2c2' },
                { label: 'JCI Malaysia Principal Trainer', activeColor: '#40a9ff' },
                { label: 'JCI Malaysia Master Trainer', activeColor: '#40a9ff' },
              ].map((step, index) => {
                const isCompleted = trainerSteps[index];
                const dotColor = isCompleted ? step.activeColor : INACTIVE_COLOR;
                return (
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
                    backgroundColor: dotColor,
                    border: '3px solid #fff',
                    boxShadow: isCompleted ? '0 0 0 2px #1890ff' : '0 0 0 2px #e8e8e8',
                    position: 'relative',
                    zIndex: 10,
                  }} />
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: 10, 
                    color: isCompleted ? '#666' : '#bfbfbf', 
                    textAlign: 'center', 
                    width: '100%',
                    lineHeight: 1.2,
                    fontWeight: step.isStart && isCompleted ? 500 : 400,
                    wordBreak: 'break-word',
                    padding: '0 2px',
                  }}>
                    {step.label}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default TaskProgressCard;

