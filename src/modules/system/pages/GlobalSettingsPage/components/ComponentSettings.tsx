import React, { useState } from 'react';
import { Form, InputNumber, Switch, Radio, Button, Space, Collapse, Divider, Table } from 'antd';
import { globalSettingsService } from '@/services/globalSettingsService';
import { useAuthStore } from '@/stores/authStore';
import { showSuccess, showError } from '@/utils/errorHelpers';

const { Panel } = Collapse;

/**
 * Component Settings Panel
 * 组件配置面板
 */
const ComponentSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const [tableConfig, setTableConfig] = useState({
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true,
    bordered: false,
    size: 'middle' as 'small' | 'middle' | 'large',
  });

  const [formConfig, setFormConfig] = useState({
    layout: 'vertical' as 'horizontal' | 'vertical' | 'inline',
    validateTrigger: 'onBlur' as 'onChange' | 'onBlur' | 'onSubmit',
    scrollToFirstError: true,
  });

  const [modalConfig, setModalConfig] = useState({
    width: 800,
    centered: true,
    destroyOnClose: true,
    maskClosable: false,
  });

  const handleSave = async () => {
    try {
      setSaving(true);

      await globalSettingsService.batchUpdate(
        {
          // Table settings
          'table-1-page-size': tableConfig.pageSize,
          'table-1-show-size-changer': tableConfig.showSizeChanger,
          'table-1-show-quick-jumper': tableConfig.showQuickJumper,
          'table-1-bordered': tableConfig.bordered,
          'table-1-size': tableConfig.size,

          // Form settings
          'form-1-layout': formConfig.layout,
          'form-1-validate-trigger': formConfig.validateTrigger,
          'form-1-scroll-to-first-error': formConfig.scrollToFirstError,

          // Modal settings
          'modal-1-width': modalConfig.width,
          'modal-1-centered': modalConfig.centered,
          'modal-1-destroy-on-close': modalConfig.destroyOnClose,
          'modal-1-mask-closable': modalConfig.maskClosable,
        },
        user?.id || 'system'
      );

      showSuccess('组件配置已保存');
    } catch (error) {
      showError(error, '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTableConfig({
      pageSize: 20,
      showSizeChanger: true,
      showQuickJumper: true,
      bordered: false,
      size: 'middle',
    });
    setFormConfig({
      layout: 'vertical',
      validateTrigger: 'onBlur',
      scrollToFirstError: true,
    });
    setModalConfig({
      width: 800,
      centered: true,
      destroyOnClose: true,
      maskClosable: false,
    });
  };

  return (
    <div className="settings-panel">
      <Collapse defaultActiveKey={['table', 'form', 'modal']}>
        {/* Table Configuration */}
        <Panel header="表格组件配置（Table）" key="table">
          <Form layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item label="每页显示" style={{ marginBottom: 8 }}>
              <InputNumber
                min={10}
                max={100}
                step={10}
                value={tableConfig.pageSize}
                onChange={value => setTableConfig(prev => ({ ...prev, pageSize: value || 20 }))}
                style={{ width: 100 }}
              />
            </Form.Item>

            <Form.Item label="大小选择器" style={{ marginBottom: 8 }}>
              <Switch
                checked={tableConfig.showSizeChanger}
                onChange={checked =>
                  setTableConfig(prev => ({ ...prev, showSizeChanger: checked }))
                }
              />
            </Form.Item>

            <Form.Item label="快速跳转" style={{ marginBottom: 8 }}>
              <Switch
                checked={tableConfig.showQuickJumper}
                onChange={checked =>
                  setTableConfig(prev => ({ ...prev, showQuickJumper: checked }))
                }
              />
            </Form.Item>

            <Form.Item label="显示边框" style={{ marginBottom: 8 }}>
              <Switch
                checked={tableConfig.bordered}
                onChange={checked => setTableConfig(prev => ({ ...prev, bordered: checked }))}
              />
            </Form.Item>

            <Form.Item label="表格大小" style={{ marginBottom: 8 }}>
              <Radio.Group
                value={tableConfig.size}
                onChange={e => setTableConfig(prev => ({ ...prev, size: e.target.value }))}
                size="small"
              >
                <Radio value="small">小</Radio>
                <Radio value="middle">中</Radio>
                <Radio value="large">大</Radio>
              </Radio.Group>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '12px 0' }} />
          <Table
            columns={[
              { title: '姓名', dataIndex: 'name', key: 'name' },
              { title: '年龄', dataIndex: 'age', key: 'age' },
              { title: '地址', dataIndex: 'address', key: 'address' },
            ]}
            dataSource={[
              { key: 1, name: '张三', age: 32, address: '吉隆坡' },
              { key: 2, name: '李四', age: 28, address: '八打灵' },
            ]}
            size={tableConfig.size}
            bordered={tableConfig.bordered}
            pagination={{
              pageSize: tableConfig.pageSize,
              showSizeChanger: tableConfig.showSizeChanger,
              showQuickJumper: tableConfig.showQuickJumper,
            }}
          />
        </Panel>

        {/* Form Configuration */}
        <Panel header="表单组件配置（Form）" key="form">
          <Form layout="inline" style={{ marginBottom: 0 }}>
            <Form.Item label="表单布局" style={{ marginBottom: 8 }}>
              <Radio.Group
                value={formConfig.layout}
                onChange={e => setFormConfig(prev => ({ ...prev, layout: e.target.value }))}
                size="small"
              >
                <Radio value="horizontal">横向</Radio>
                <Radio value="vertical">纵向</Radio>
                <Radio value="inline">内联</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="验证触发" style={{ marginBottom: 8 }}>
              <Radio.Group
                value={formConfig.validateTrigger}
                onChange={e =>
                  setFormConfig(prev => ({ ...prev, validateTrigger: e.target.value }))
                }
                size="small"
              >
                <Radio value="onChange">onChange</Radio>
                <Radio value="onBlur">onBlur</Radio>
                <Radio value="onSubmit">onSubmit</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="自动滚动到错误" style={{ marginBottom: 8 }}>
              <Switch
                checked={formConfig.scrollToFirstError}
                onChange={checked =>
                  setFormConfig(prev => ({ ...prev, scrollToFirstError: checked }))
                }
              />
            </Form.Item>
          </Form>
        </Panel>

        {/* Modal Configuration */}
        <Panel header="弹窗组件配置（Modal）" key="modal">
          <Form layout="inline" style={{ marginBottom: 0 }}>
            <Form.Item label="默认宽度" style={{ marginBottom: 8 }}>
              <InputNumber
                min={400}
                max={1200}
                step={100}
                value={modalConfig.width}
                onChange={value => setModalConfig(prev => ({ ...prev, width: value || 800 }))}
                style={{ width: 120 }}
                addonAfter="px"
              />
            </Form.Item>

            <Form.Item label="垂直居中" style={{ marginBottom: 8 }}>
              <Switch
                checked={modalConfig.centered}
                onChange={checked => setModalConfig(prev => ({ ...prev, centered: checked }))}
              />
            </Form.Item>

            <Form.Item label="关闭时销毁" style={{ marginBottom: 8 }}>
              <Switch
                checked={modalConfig.destroyOnClose}
                onChange={checked =>
                  setModalConfig(prev => ({ ...prev, destroyOnClose: checked }))
                }
              />
            </Form.Item>

            <Form.Item label="蒙层可关闭" style={{ marginBottom: 8 }}>
              <Switch
                checked={modalConfig.maskClosable}
                onChange={checked => setModalConfig(prev => ({ ...prev, maskClosable: checked }))}
              />
            </Form.Item>
          </Form>
        </Panel>
      </Collapse>

      <div style={{ marginTop: 16 }}>
        <Space>
          <Button type="primary" onClick={handleSave} loading={saving}>
            保存所有配置
          </Button>
          <Button onClick={handleReset}>恢复默认</Button>
        </Space>
      </div>
    </div>
  );
};

export default ComponentSettings;

