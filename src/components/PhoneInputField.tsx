import React from 'react';
import { extractNationalDigits } from '../utils/phoneUtils';

interface PhoneInputFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (formattedValue: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  error?: string;
  className?: string;
}

export const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  id = 'phone_input',
  label = 'Mobile Number',
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = '94220 12345',
  helperText,
  error,
  className = '',
}) => {
  // Extract national 10 digits for the input view
  const nationalDigits = extractNationalDigits(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleanDigits = raw.replace(/\D/g, '').slice(0, 10);

    let formatted = '';
    if (cleanDigits.length === 0) {
      formatted = '';
    } else if (cleanDigits.length <= 5) {
      formatted = `+91 ${cleanDigits}`;
    } else {
      formatted = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    }

    onChange(formatted);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex rounded-lg shadow-xs">
        {/* Fixed Country Code Badge (+91 India) */}
        <div className="inline-flex items-center gap-1 px-3 py-2 border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-l-lg select-none">
          <span>🇮🇳</span>
          <span className="font-mono text-amber-800 dark:text-amber-400 font-bold">+91</span>
        </div>

        {/* 10-Digit National Mobile Input */}
        <input
          id={id}
          type="tel"
          disabled={disabled}
          value={
            nationalDigits.length > 5
              ? `${nationalDigits.slice(0, 5)} ${nationalDigits.slice(5)}`
              : nationalDigits
          }
          onChange={handleInputChange}
          placeholder={placeholder}
          maxLength={11} // 10 digits + 1 space
          className={`block w-full rounded-r-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
          }`}
        />
      </div>

      {error ? (
        <p className="text-[11px] text-red-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};
