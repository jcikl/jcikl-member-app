import React, { useState } from 'react';
import { DatePicker, Select, Space } from 'antd';
import dayjs from 'dayjs';

// 全局配置
import { globalDateService } from '@/config/globalDateSettings';

// 类型定义
import type { FiscalYearPickerProps, FiscalYearPreset } from './types';

// 样式
import './styles.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * FiscalYearPicker Component
 * 财年日期选择器组件
 */
export const FiscalYearPicker: React.FC<FiscalYearPickerProps> = ({
  value,
  onChange,
  allowPartial = false,
  format = 'DD-MMM-YYYY',
  disabled = false,
  className = '',
}) => {
  const [preset, setPreset] = useState<FiscalYearPreset>('current');

  /**
   * 获取财年范围
   */
  const getFiscalYearRange = (preset: FiscalYearPreset): [Date, Date] => {
    const { start, end } = globalDateService.getCurrentFiscalYearRange();
    
    if (preset === 'current') {
      return [start, end];
    } else if (preset === 'previous') {
      return [
        globalDateService.subtractTime(start, 1, 'year'),
        globalDateService.subtractTime(end, 1, 'year'),
      ];
    } else {
      return [
        globalDateService.addTime(start, 1, 'year'),
        globalDateService.addTime(end, 1, 'year'),
      ];
    }
  };

  /**
   * 获取财年标签
   */
  const getFiscalYearLabel = (startDate: Date): string => {
    const year = dayjs(startDate).year();
    return `FY ${year}`;
  };

  /**
   * 处理预设选择
   */
  const handlePresetChange = (newPreset: FiscalYearPreset) => {
    setPreset(newPreset);
    const [start, end] = getFiscalYearRange(newPreset);
    const label = getFiscalYearLabel(start);
    onChange([start, end], label);
  };

  return (
    <div className={`fiscal-year-picker ${className}`}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          value={preset}
          onChange={handlePresetChange}
          style={{ width: 200 }}
          disabled={disabled}
        >
          <Option value="previous">上一财年</Option>
          <Option value="current">当前财年</Option>
          <Option value="next">下一财年</Option>
        </Select>

        {allowPartial && (
          <RangePicker
            value={value ? [dayjs(value[0]), dayjs(value[1])] : undefined}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                const start = dates[0].toDate();
                const end = dates[1].toDate();
                const label = getFiscalYearLabel(start);
                onChange([start, end], label);
              }
            }}
            format={format}
            disabled={disabled}
            style={{ width: '100%' }}
          />
        )}
      </Space>
    </div>
  );
};

export default FiscalYearPicker;

