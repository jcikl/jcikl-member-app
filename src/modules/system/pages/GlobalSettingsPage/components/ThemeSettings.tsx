import React, { useState, useEffect } from 'react';
import { Form, ColorPicker, Slider, Button, Space, Divider, ConfigProvider, Radio, Switch, Row, Col, Card } from 'antd';
import { Input as AntInput, Card as AntCard } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { globalSettingsService } from '@/services/globalSettingsService';
import { useAuthStore } from '@/stores/authStore';
import { showSuccess, showError } from '@/utils/errorHelpers';

/**
 * Theme Settings Panel
 * 主题设置面板
 */
const ThemeSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const [themeConfig, setThemeConfig] = useState({
    // 颜色模式
    colorMode: 'light' as 'light' | 'dark' | 'auto',
    
    // 主题色
    primaryColor: '#1890ff',
    successColor: '#52c41a',
    warningColor: '#faad14',
    errorColor: '#f5222d',
    infoColor: '#1890ff',
    
    // 字体颜色
    textPrimaryLight: '#262626',
    textPrimaryDark: '#f5f5f5',
    textSecondaryLight: '#8c8c8c',
    textSecondaryDark: '#a6a6a6',
    
    // 字号和圆角
    fontSize: 14,
    borderRadius: 6,
    
    // 卡片样式
    cardBackgroundLight: '#ffffff',
    cardBackgroundDark: '#1f1f1f',
    cardBorderLight: '#d9d9d9',
    cardBorderDark: '#434343',
    cardBorderRadius: 8,
    cardShadow: 'sm' as 'none' | 'sm' | 'md' | 'lg',
  });

  const handleColorChange = (key: string, color: Color) => {
    setThemeConfig(prev => ({
      ...prev,
      [key]: color.toHexString(),
    }));
  };

  /**
   * 应用颜色模式
   */
  useEffect(() => {
    applyColorMode(themeConfig.colorMode);
  }, [themeConfig.colorMode]);

  /**
   * 应用颜色模式到 DOM
   */
  const applyColorMode = (mode: 'light' | 'dark' | 'auto') => {
    const html = document.documentElement;
    
    if (mode === 'auto') {
      // 跟随系统
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.classList.toggle('dark', isDark);
    } else if (mode === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    
    // 同时更新 CSS 变量
    if (html.classList.contains('dark')) {
      html.style.setProperty('--card-bg', themeConfig.cardBackgroundDark);
      html.style.setProperty('--card-border', themeConfig.cardBorderDark);
      html.style.setProperty('--text-primary', themeConfig.textPrimaryDark);
      html.style.setProperty('--text-secondary', themeConfig.textSecondaryDark);
    } else {
      html.style.setProperty('--card-bg', themeConfig.cardBackgroundLight);
      html.style.setProperty('--card-border', themeConfig.cardBorderLight);
      html.style.setProperty('--text-primary', themeConfig.textPrimaryLight);
      html.style.setProperty('--text-secondary', themeConfig.textSecondaryLight);
    }
    
    html.style.setProperty('--border-radius-base', `${themeConfig.cardBorderRadius}px`);
    html.style.setProperty('--color-primary', themeConfig.primaryColor);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await globalSettingsService.batchUpdate(
        {
          // 颜色模式
          'theme-color-mode': themeConfig.colorMode,
          
          // 主题色
          'theme-primary-color': themeConfig.primaryColor,
          'theme-success-color': themeConfig.successColor,
          'theme-warning-color': themeConfig.warningColor,
          'theme-error-color': themeConfig.errorColor,
          'theme-info-color': themeConfig.infoColor,
          
          // 字体颜色
          'theme-text-primary-light': themeConfig.textPrimaryLight,
          'theme-text-primary-dark': themeConfig.textPrimaryDark,
          'theme-text-secondary-light': themeConfig.textSecondaryLight,
          'theme-text-secondary-dark': themeConfig.textSecondaryDark,
          
          // 字号和圆角
          'theme-font-size-base': themeConfig.fontSize,
          'theme-border-radius-base': themeConfig.borderRadius,
          
          // 卡片样式
          'theme-card-bg-light': themeConfig.cardBackgroundLight,
          'theme-card-bg-dark': themeConfig.cardBackgroundDark,
          'theme-card-border-light': themeConfig.cardBorderLight,
          'theme-card-border-dark': themeConfig.cardBorderDark,
          'theme-card-border-radius': themeConfig.cardBorderRadius,
          'theme-card-shadow': themeConfig.cardShadow,
        },
        user?.id || 'system'
      );

      // 应用到 DOM
      applyColorMode(themeConfig.colorMode);

      showSuccess('主题设置已保存并应用');
    } catch (error) {
      showError(error, '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setThemeConfig({
      colorMode: 'light',
      primaryColor: '#1890ff',
      successColor: '#52c41a',
      warningColor: '#faad14',
      errorColor: '#f5222d',
      infoColor: '#1890ff',
      textPrimaryLight: '#262626',
      textPrimaryDark: '#f5f5f5',
      textSecondaryLight: '#8c8c8c',
      textSecondaryDark: '#a6a6a6',
      fontSize: 14,
      borderRadius: 6,
      cardBackgroundLight: '#ffffff',
      cardBackgroundDark: '#1f1f1f',
      cardBorderLight: '#d9d9d9',
      cardBorderDark: '#434343',
      cardBorderRadius: 8,
      cardShadow: 'sm',
    });
  };

  return (
    <div className="settings-panel">
      <Form layout="vertical">
        {/* ========== 颜色模式控制 ========== */}
        <Card 
          title="🌓 颜色模式" 
          size="small" 
          style={{ marginBottom: 16 }}
        >
          <Form.Item label="界面模式" style={{ marginBottom: 12 }}>
            <Radio.Group
              value={themeConfig.colorMode}
              onChange={e => setThemeConfig(prev => ({ ...prev, colorMode: e.target.value }))}
            >
              <Radio value="light">☀️ 浅色模式</Radio>
              <Radio value="dark">🌙 深色模式</Radio>
              <Radio value="auto">🔄 跟随系统</Radio>
            </Radio.Group>
            <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12, marginBottom: 0 }}>
              {themeConfig.colorMode === 'auto' 
                ? '将根据您的操作系统设置自动切换' 
                : `当前: ${themeConfig.colorMode === 'dark' ? '深色' : '浅色'}模式`}
            </p>
          </Form.Item>

          <Form.Item label="立即预览深色模式" style={{ marginBottom: 0 }}>
            <Switch
              checked={document.documentElement.classList.contains('dark')}
              onChange={checked => {
                document.documentElement.classList.toggle('dark', checked);
              }}
              checkedChildren="深色"
              unCheckedChildren="浅色"
            />
            <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12, marginBottom: 0 }}>
              临时切换预览，不会保存配置
            </p>
          </Form.Item>
        </Card>

        {/* ========== 卡片1: 主题颜色设置 ========== */}
        <Card 
          title="🎨 主题颜色" 
          size="small" 
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 8]}>
            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 60 }}>主色调</span>
                <ColorPicker
                  value={themeConfig.primaryColor}
                  onChange={color => handleColorChange('primaryColor', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 60 }}>成功色</span>
                <ColorPicker
                  value={themeConfig.successColor}
                  onChange={color => handleColorChange('successColor', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 60 }}>警告色</span>
                <ColorPicker
                  value={themeConfig.warningColor}
                  onChange={color => handleColorChange('warningColor', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 60 }}>错误色</span>
                <ColorPicker
                  value={themeConfig.errorColor}
                  onChange={color => handleColorChange('errorColor', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>
          </Row>
        </Card>

        {/* ========== 卡片2: 字体颜色设置 ========== */}
        <Card 
          title="✍️ 字体颜色" 
          size="small" 
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 8]}>
            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 100 }}>浅色-主要文字</span>
                <ColorPicker
                  value={themeConfig.textPrimaryLight}
                  onChange={color => handleColorChange('textPrimaryLight', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 100 }}>深色-主要文字</span>
                <ColorPicker
                  value={themeConfig.textPrimaryDark}
                  onChange={color => handleColorChange('textPrimaryDark', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 100 }}>浅色-次要文字</span>
                <ColorPicker
                  value={themeConfig.textSecondaryLight}
                  onChange={color => handleColorChange('textSecondaryLight', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 100 }}>深色-次要文字</span>
                <ColorPicker
                  value={themeConfig.textSecondaryDark}
                  onChange={color => handleColorChange('textSecondaryDark', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>
          </Row>
        </Card>

        {/* ========== 卡片3: 卡片样式设置 ========== */}
        <Card 
          title="💳 卡片样式" 
          size="small" 
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 8]}>
            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 80 }}>浅色背景</span>
                <ColorPicker
                  value={themeConfig.cardBackgroundLight}
                  onChange={color => handleColorChange('cardBackgroundLight', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 80 }}>深色背景</span>
                <ColorPicker
                  value={themeConfig.cardBackgroundDark}
                  onChange={color => handleColorChange('cardBackgroundDark', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 80 }}>浅色边框</span>
                <ColorPicker
                  value={themeConfig.cardBorderLight}
                  onChange={color => handleColorChange('cardBorderLight', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 80 }}>深色边框</span>
                <ColorPicker
                  value={themeConfig.cardBorderDark}
                  onChange={color => handleColorChange('cardBorderDark', color)}
                  showText
                  size="small"
                />
              </div>
            </Col>

            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 80 }}>卡片圆角</span>
                <div style={{ flex: 1 }}>
                  <Slider
                    min={0}
                    max={16}
                    value={themeConfig.cardBorderRadius}
                    onChange={value => setThemeConfig(prev => ({ ...prev, cardBorderRadius: value }))}
                    marks={{ 0: '0', 8: '8', 16: '16' }}
                  />
                </div>
              </div>
            </Col>

            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 80 }}>卡片阴影</span>
                <Radio.Group
                  value={themeConfig.cardShadow}
                  onChange={e => setThemeConfig(prev => ({ ...prev, cardShadow: e.target.value }))}
                  size="small"
                >
                  <Radio value="none">无</Radio>
                  <Radio value="sm">小</Radio>
                  <Radio value="md">中</Radio>
                  <Radio value="lg">大</Radio>
                </Radio.Group>
              </div>
            </Col>
          </Row>
        </Card>

        {/* ========== 卡片4: 尺寸设置 ========== */}
        <Card 
          title="📐 尺寸设置" 
          size="small" 
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 80 }}>基础字号</span>
                <div style={{ flex: 1 }}>
                  <Slider
                    min={12}
                    max={18}
                    value={themeConfig.fontSize}
                    onChange={value => setThemeConfig(prev => ({ ...prev, fontSize: value }))}
                    marks={{ 12: '12', 14: '14', 16: '16', 18: '18' }}
                  />
                </div>
              </div>
            </Col>

            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 80 }}>全局圆角</span>
                <div style={{ flex: 1 }}>
                  <Slider
                    min={0}
                    max={12}
                    value={themeConfig.borderRadius}
                    onChange={value => setThemeConfig(prev => ({ ...prev, borderRadius: value }))}
                    marks={{ 0: '0', 6: '6', 12: '12' }}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 操作按钮 */}
        <Form.Item style={{ marginBottom: 16 }}>
          <Space>
            <Button type="primary" onClick={handleSave} loading={saving}>
              💾 保存并应用配置
            </Button>
            <Button onClick={handleReset}>🔄 恢复默认</Button>
          </Space>
        </Form.Item>
      </Form>

      {/* Preview Section - 增强预览 */}
      <Divider orientation="left">👀 实时预览</Divider>
      
      <div className="settings-preview-section">
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: themeConfig.primaryColor,
              colorSuccess: themeConfig.successColor,
              colorWarning: themeConfig.warningColor,
              colorError: themeConfig.errorColor,
              fontSize: themeConfig.fontSize,
              borderRadius: themeConfig.borderRadius,
            },
          }}
        >
          <Row gutter={16}>
            {/* 左列：按钮和输入框预览 */}
            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                  <h4 style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-primary)' }}>按钮预览</h4>
                  <Space wrap size="small">
                    <Button type="primary" size="small">主按钮</Button>
                    <Button type="default" size="small">默认</Button>
                    <Button danger size="small">危险</Button>
                  </Space>
                </div>

                <div>
                  <h4 style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-primary)' }}>输入框预览</h4>
                  <AntInput placeholder="输入框预览" size="small" />
                </div>
              </Space>
            </Col>

            {/* 右列：卡片预览 */}
            <Col span={12}>
              <h4 style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-primary)' }}>卡片预览</h4>
              <AntCard 
                size="small"
                title="示例卡片" 
                className="preview-card"
                style={{ 
                  borderRadius: `${themeConfig.cardBorderRadius}px`,
                }}
              >
                <p style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-primary)' }}>这是一个卡片内容示例</p>
                <Space size="small">
                  <Button type="primary" size="small">操作</Button>
                  <Button size="small">取消</Button>
                </Space>
              </AntCard>
            </Col>
          </Row>

          {/* 当前主题信息 */}
          <div style={{ 
            padding: 12, 
            marginTop: 12,
            background: 'var(--bg-secondary)', 
            borderRadius: 6,
            border: '1px dashed var(--border-color)',
          }}>
            <h4 style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-primary)' }}>📋 当前配置</h4>
            <Row gutter={[12, 4]}>
              <Col span={8}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🌓 模式: <strong style={{ color: 'var(--text-primary)' }}>{themeConfig.colorMode === 'light' ? '浅色' : themeConfig.colorMode === 'dark' ? '深色' : '跟随系统'}</strong></span></Col>
              <Col span={8}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🎨 主色: <strong style={{ color: 'var(--text-primary)' }}>{themeConfig.primaryColor}</strong></span></Col>
              <Col span={8}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>💳 卡片圆角: <strong style={{ color: 'var(--text-primary)' }}>{themeConfig.cardBorderRadius}px</strong></span></Col>
              <Col span={8}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📐 字号: <strong style={{ color: 'var(--text-primary)' }}>{themeConfig.fontSize}px</strong></span></Col>
              <Col span={8}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🔘 圆角: <strong style={{ color: 'var(--text-primary)' }}>{themeConfig.borderRadius}px</strong></span></Col>
            </Row>
          </div>
        </ConfigProvider>
      </div>
    </div>
  );
};

export default ThemeSettings;


