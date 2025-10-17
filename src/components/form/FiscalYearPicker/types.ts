/**
 * FiscalYearPicker Types
 */

export interface FiscalYearPickerProps {
  value?: [Date, Date];
  onChange: (dates: [Date, Date], fiscalYear: string) => void;
  allowPartial?: boolean;
  format?: string;
  disabled?: boolean;
  className?: string;
}

export type FiscalYearPreset = 'previous' | 'current' | 'next';

