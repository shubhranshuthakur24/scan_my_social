'use client';

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'subtle' | 'solid' | 'outline' | 'success' | 'warning' | 'purple' | 'danger' | 'info';
  color?: 'emerald' | 'purple' | 'blue' | 'amber' | 'rose' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ElementType;
}

export default function Badge({
  children,
  variant = 'subtle',
  color = 'purple',
  size = 'md',
  dot = false,
  pulse = false,
  icon: Icon,
  className = '',
  ...props
}: BadgeProps) {
  let resolvedColor = color;
  let resolvedVariant: 'subtle' | 'solid' | 'outline' = 'subtle';

  if (variant === 'success') {
    resolvedColor = 'emerald';
    resolvedVariant = 'subtle';
  } else if (variant === 'warning') {
    resolvedColor = 'amber';
    resolvedVariant = 'subtle';
  } else if (variant === 'danger') {
    resolvedColor = 'rose';
    resolvedVariant = 'subtle';
  } else if (variant === 'purple') {
    resolvedColor = 'purple';
    resolvedVariant = 'subtle';
  } else if (variant === 'info') {
    resolvedColor = 'blue';
    resolvedVariant = 'subtle';
  } else if (variant === 'subtle' || variant === 'solid' || variant === 'outline') {
    resolvedVariant = variant;
  }
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const colorStyles = {
    purple: {
      subtle: 'bg-purple-50 text-purple-700 border border-purple-200/80',
      solid: 'bg-purple-600 text-white',
      outline: 'bg-transparent text-purple-700 border border-purple-300',
      dotColor: 'bg-purple-500',
    },
    emerald: {
      subtle: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      solid: 'bg-emerald-600 text-white',
      outline: 'bg-transparent text-emerald-700 border border-emerald-300',
      dotColor: 'bg-emerald-500',
    },
    blue: {
      subtle: 'bg-blue-50 text-blue-700 border border-blue-200/80',
      solid: 'bg-blue-600 text-white',
      outline: 'bg-transparent text-blue-700 border border-blue-300',
      dotColor: 'bg-blue-500',
    },
    amber: {
      subtle: 'bg-amber-50 text-amber-800 border border-amber-200/80',
      solid: 'bg-amber-500 text-white',
      outline: 'bg-transparent text-amber-700 border border-amber-300',
      dotColor: 'bg-amber-500',
    },
    rose: {
      subtle: 'bg-rose-50 text-rose-700 border border-rose-200/80',
      solid: 'bg-rose-600 text-white',
      outline: 'bg-transparent text-rose-700 border border-rose-300',
      dotColor: 'bg-rose-500',
    },
    slate: {
      subtle: 'bg-slate-100 text-slate-700 border border-slate-200',
      solid: 'bg-slate-800 text-white',
      outline: 'bg-transparent text-slate-700 border border-slate-300',
      dotColor: 'bg-slate-400',
    },
  };

  const selectedColor = colorStyles[resolvedColor];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full transition-all ${sizeStyles[size]} ${selectedColor[resolvedVariant]} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${selectedColor.dotColor}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${selectedColor.dotColor}`} />
        </span>
      )}

      {Icon && <Icon size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} className="shrink-0" />}

      <span>{children}</span>
    </span>
  );
}
