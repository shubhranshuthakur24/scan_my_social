'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ElementType | React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const sizeStyles = {
    xs: 'px-2.5 py-1.5 text-[11px] gap-1.5 rounded-lg',
    sm: 'px-3.5 py-2 text-xs gap-2 rounded-xl',
    md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
    lg: 'px-5 py-3 text-base gap-2.5 rounded-2xl',
  };

  const variantStyles = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/20 focus-visible:ring-primary-400 border border-transparent hover:-translate-y-px',
    gradient:
      'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white hover:opacity-95 shadow-md shadow-purple-600/25 active:scale-[0.98]',
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 active:scale-[0.98]',
    outline:
      'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98]',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20 active:scale-[0.98]',
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ElementType;
    return <IconComp size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="shrink-0" />;
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${fullWidth ? 'w-full' : ''
        } ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />
      ) : renderIcon() && iconPosition === 'left' ? (
        renderIcon()
      ) : null}
      {children}
      {!loading && renderIcon() && iconPosition === 'right' ? renderIcon() : null}
    </button>
  );
}
