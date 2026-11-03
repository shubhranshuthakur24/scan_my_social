'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavTabItem {
  name: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
}

export interface ModuleNavProps {
  tabs: NavTabItem[];
  rightElement?: React.ReactNode;
  className?: string;
}

export default function ModuleNav({ tabs, rightElement, className = '' }: ModuleNavProps) {
  const pathname = usePathname();

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-6 flex-wrap ${className}`}
    >
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isFirstTab = tabs[0]?.href === tab.href;

          // Active matching: exact match or child path match
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href ||
              (!isFirstTab && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-150 shrink-0 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={16} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>

      {rightElement && <div className="shrink-0 flex items-center gap-2">{rightElement}</div>}
    </div>
  );
}
