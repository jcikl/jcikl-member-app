import React, { useState } from 'react';
import { Modal, Radio, Checkbox, Button, Space, Input, Select, DatePicker, Tabs, Progress, message } from 'antd';
import { SearchOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';

// 类型定义
import type { ExportModalProps, ExportFormat, ExportRange, ExportConfig } from './types';

// 样式
import './styles.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * ExportModal Component
 * 数据导出弹窗组件
 */
export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onClose,
  columns,
  dataSource,
  onExport,
  formats = ['excel', 'csv', 'pdf'],
  templates = [],
  selectedCount = 0,
  className = '',
}) => {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [range, setRange] = useState<ExportRange>('all');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.filter(c => c.selected !== false).map(c => c.key)
  );
  const [template, setTemplate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * 处理导出
   */
  const handleExport = async () => {
    const config: ExportConfig = {
      format,
      columns: selectedColumns,
      range,
      template,
    };

    setExporting(true);
    setProgress(0);

    // 模拟进度
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      await onExport(config);
      setProgress(100);
      message.success('导出成功！');
      setTimeout(() => {
        onClose();
        setExporting(false);
        setProgress(0);
      }, 1000);
    } catch (error) {
      message.error('导出失败');
      setExporting(false);
      setProgress(0);
    } finally {
      clearInterval(interval);
    }
  };

  const formatIcons = {
    excel: <FileExcelOutlined />,
    csv: <FileTextOutlined />,
    pdf: <FilePdfOutlined />,
  };

  const filteredColumns = columns.filter(col =>
    col.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      open={visible}
      title="导出数据"
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="export"
          type="primary"
          onClick={handleExport}
          loading={exporting}
        >
          导出
        </Button>,
      ]}
      className={`export-modal ${className}`}
    >
      <Tabs
        items={[
          {
            key: 'options',
            label: '导出选项',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 格式选择 */}
                <div>
                  <h4>选择导出格式</h4>
                  <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
                    {formats.map(fmt => (
                      <Radio.Button key={fmt} value={fmt}>
                        {formatIcons[fmt]} {fmt.toUpperCase()}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>

                {/* 列选择 */}
                <div>
                  <h4>选择列</h4>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="搜索列..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ marginBottom: 12 }}
                  />
                  <Checkbox.Group
                    value={selectedColumns}
                    onChange={setSelectedColumns}
                    style={{ width: '100%' }}
                  >
                    <div className="export-modal__columns">
                      {filteredColumns.map(col => (
                        <Checkbox key={col.key} value={col.key}>
                          {col.title}
                        </Checkbox>
                      ))}
                    </div>
                  </Checkbox.Group>
                </div>

                {/* 数据范围 */}
                <div>
                  <h4>数据范围</h4>
                  <Radio.Group value={range} onChange={(e) => setRange(e.target.value)}>
                    <Space direction="vertical">
                      <Radio value="all">全部数据 ({dataSource.length})</Radio>
                      <Radio value="current">当前页</Radio>
                      <Radio value="selected">选中行 ({selectedCount})</Radio>
                      <Radio value="dateRange">日期范围</Radio>
                    </Space>
                  </Radio.Group>
                  {range === 'dateRange' && (
                    <RangePicker style={{ width: '100%', marginTop: 12 }} />
                  )}
                </div>

                {/* 模板选择 */}
                {templates.length > 0 && (
                  <div>
                    <h4>导出模板</h4>
                    <Select
                      value={template}
                      onChange={setTemplate}
                      style={{ width: '100%' }}
                      placeholder="选择模板"
                    >
                      {templates.map(tpl => (
                        <Option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </Option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* 进度 */}
                {exporting && (
                  <div className="export-modal__progress">
                    <Progress percent={progress} status="active" />
                    <p>正在导出数据...</p>
                  </div>
                )}
              </Space>
            ),
          },
          {
            key: 'history',
            label: '导出历史',
            children: <div>导出历史记录...</div>,
          },
        ]}
      />
    </Modal>
  );
};

export default ExportModal;

