'use client';

import React from 'react';
import { Menu, Bell, Search, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
  desktopCollapsed?: boolean;
}

export default function Header({
  onOpenMobileSidebar = () => {},
  desktopCollapsed = false,
}: HeaderProps) {
  return (
    <header
      className={`sticky top-0 z-20 h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all duration-300 ${
        desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden shadow-xs hover:bg-slate-50"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Quick Search */}
          <div className="relative hidden sm:block w-64 md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search channels, scripts, leads..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:outline-hidden transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity"
          >
            <Sparkles size={14} />
            <span>New Scraping Task</span>
          </button>

          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>
      </div>
    </header>
  );
}
