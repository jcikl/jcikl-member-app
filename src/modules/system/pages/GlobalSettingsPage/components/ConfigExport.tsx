import React from 'react';
import { Button, Space, Upload, message } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { globalSettingsService } from '@/services/globalSettingsService';
import { useAuthStore } from '@/stores/authStore';

/**
 * Config Export/Import Component
 * 配置导入导出组件
 */
export const ConfigExport: React.FC = () => {
  const { user } = useAuthStore();

  /**
   * Export all settings to JSON file
   */
  const handleExport = async () => {
    try {
      const settings = await globalSettingsService.getAllSettings();

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: user?.name || 'unknown',
        settings: settings.map(s => ({
          category: s.category,
          key: s.key,
          value: s.value,
          type: s.type,
          description: s.description,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `global-settings-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      message.success('配置导出成功');
    } catch (error) {
      console.error('Export failed:', error);
      message.error('配置导出失败');
    }
  };

  /**
   * Import settings from JSON file
   */
  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate data format
      if (!data.settings || !Array.isArray(data.settings)) {
        message.error('配置文件格式错误');
        return false;
      }

      // Build settings map
      const settingsMap: Record<string, any> = {};
      data.settings.forEach((s: any) => {
        settingsMap[s.key] = s.value;
      });

      // Batch update
      await globalSettingsService.batchUpdate(settingsMap, user?.id || 'system');

      message.success(`成功导入 ${data.settings.length} 项配置`);
    } catch (error) {
      console.error('Import failed:', error);
      message.error('配置导入失败');
    }

    return false; // Prevent default upload behavior
  };

  return (
    <Space>
      <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
        导出配置
      </Button>

      <Upload
        accept=".json"
        beforeUpload={handleImport}
        showUploadList={false}
        maxCount={1}
      >
        <Button icon={<UploadOutlined />}>导入配置</Button>
      </Upload>
    </Space>
  );
};

export default ConfigExport;


