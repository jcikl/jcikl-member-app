import React, { useState } from 'react';
import { Input, Select, Space } from 'antd';
import { globalValidationService } from '@/config';

interface PhoneInputProps {
  value?: { country: string; number: string };
  onChange?: (value: { country: string; number: string }) => void;
  disabled?: boolean;
}

/**
 * Phone Input Component
 * 电话号码输入组件(支持多国)
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  value = { country: 'MY', number: '' },
  onChange,
  disabled = false,
}) => {
  const [country, setCountry] = useState(value.country);
  const [phoneNumber, setPhoneNumber] = useState(value.number);

  const countryOptions = [
    { label: '🇲🇾 Malaysia (+60)', value: 'MY' },
    { label: '🇨🇳 China (+86)', value: 'CN' },
    { label: '🇸🇬 Singapore (+65)', value: 'SG' },
  ];

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    onChange?.({ country: newCountry, number: phoneNumber });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value;
    setPhoneNumber(newNumber);
    onChange?.({ country, number: newNumber });
  };

  const validatePhone = () => {
    if (!phoneNumber) return true;
    return globalValidationService.validatePhone(phoneNumber, country as 'MY' | 'CN' | 'SG');
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        value={country}
        onChange={handleCountryChange}
        disabled={disabled}
        style={{ width: '40%' }}
        options={countryOptions}
      />
      <Input
        value={phoneNumber}
        onChange={handleNumberChange}
        placeholder="请输入电话号码"
        disabled={disabled}
        status={phoneNumber && !validatePhone() ? 'error' : ''}
        style={{ width: '60%' }}
      />
    </Space.Compact>
  );
};

export default PhoneInput;


