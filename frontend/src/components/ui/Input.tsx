'use client';

import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, XCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ElementType;
  clearable?: boolean;
  onClear?: () => void;
  requiredIndicator?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon: LeftIcon,
      clearable = false,
      onClear,
      type = 'text',
      requiredIndicator = false,
      className = '',
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            {label}
            {requiredIndicator && <span className="text-rose-500">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {LeftIcon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
              <LeftIcon size={16} />
            </div>
          )}

          <input
            ref={ref}
            type={computedType}
            value={value}
            className={`w-full rounded-xl border bg-white py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-none ${
              LeftIcon ? 'pl-10' : 'pl-3.5'
            } ${clearable || isPassword ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                : 'border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10'
            } ${className}`}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}

          {!isPassword && clearable && value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>

        {error ? (
          <p className="text-[11px] font-semibold text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
