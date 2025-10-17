import React, { useEffect, useState } from 'react';
import { Alert } from 'antd';
import { WifiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { setupOfflineDetection } from '@/services/errorHandlerService';
import './styles.css';

/**
 * Network Status Component
 * 网络状态组件
 * 
 * 监控网络连接状态并显示提示
 */
export const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // 设置离线检测
    const cleanup = setupOfflineDetection(
      () => {
        setIsOnline(true);
        setShowAlert(true);
        // 3秒后自动隐藏在线提示
        setTimeout(() => setShowAlert(false), 3000);
      },
      () => {
        setIsOnline(false);
        setShowAlert(true);
      }
    );

    return cleanup;
  }, []);

  // 如果在线且不需要显示提示，不渲染任何内容
  if (isOnline && !showAlert) {
    return null;
  }

  return (
    <div className="network-status">
      {!isOnline && (
        <Alert
          message="网络连接已断开"
          description="您正在离线模式下工作，部分功能可能受限。数据将在网络恢复后自动同步。"
          type="warning"
          icon={<DisconnectOutlined />}
          showIcon
          banner
          closable
          onClose={() => setShowAlert(false)}
        />
      )}
      
      {isOnline && showAlert && (
        <Alert
          message="网络已恢复"
          description="网络连接已恢复，您可以正常使用所有功能了。"
          type="success"
          icon={<WifiOutlined />}
          showIcon
          banner
          closable
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  );
};

export default NetworkStatus;

