'use client';

import React from 'react';

export interface PageHeaderProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  badge,
  icon: Icon,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs ${className}`}
    >
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-primary-600 border border-primary-200 flex items-center justify-center shrink-0 mt-0.5">
            <Icon size={20} />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-600 tracking-tight">{title}</h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
