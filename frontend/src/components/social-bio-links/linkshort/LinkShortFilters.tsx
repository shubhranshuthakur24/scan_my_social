'use client';

import React from 'react';
import { Search, Plus, ArrowUpDown, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface LinkShortFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: 'all' | 'active' | 'inactive' | 'scheduled';
  onStatusChange: (status: 'all' | 'active' | 'inactive' | 'scheduled') => void;
  sort: 'newest' | 'clicks';
  onSortChange: (sort: 'newest' | 'clicks') => void;
  onCreateClick: () => void;
}

export default function LinkShortFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  onCreateClick,
}: LinkShortFiltersProps) {
  const statusOptions: Array<{ id: 'all' | 'active' | 'inactive' | 'scheduled'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'inactive', label: 'Inactive' },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
      {/* 1. Search & Status Filter Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="shortlink-search"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, alias, or URL..."
            aria-label="Search short links"
            className="w-full pl-9 pr-10 py-2.5 min-h-[44px] text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 text-slate-800 placeholder-slate-400 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="min-h-[44px] min-w-[44px] absolute right-0 top-1/2 -translate-y-1/2 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none rounded-xl"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div
          role="group"
          aria-label="Filter links by status"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/60"
        >
          {statusOptions.map((opt) => {
            const isSelected = status === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onStatusChange(opt.id)}
                aria-pressed={isSelected}
                className={`min-h-[44px] px-3.5 py-2 text-xs rounded-lg transition font-bold whitespace-nowrap inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                  isSelected
                    ? 'bg-white text-primary-700 shadow-2xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sort Dropdown & Create Button */}
      <div className="flex items-center gap-2.5 shrink-0 justify-end">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs min-h-[44px]">
          <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
          <select
            id="shortlink-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as 'newest' | 'clicks')}
            aria-label="Sort links by"
            className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="clicks">Most Clicks</option>
          </select>
        </div>

        <Button variant="primary" size="sm" onClick={onCreateClick} className="gap-1.5 font-bold shadow-xs min-h-[44px] px-4">
          <Plus size={15} />
          <span>New Link</span>
        </Button>
      </div>
    </div>
  );
}
