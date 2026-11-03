'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import {
  Search,
  SlidersHorizontal,
  BookmarkPlus,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { SORT_OPTIONS, QUICK_FILTER_PRESETS } from './constants';
import type { VideoFilterBarProps } from './types';

export default function VideoFilterBar({
  search,
  onSearchChange,
  sortBy,
  sortDir,
  onSortChange,
  isFilterOpen,
  onToggleFilterOpen,
  hasActiveFilters,
  activeFilterCount,
  onOpenSaveModal,
  activePresetKey,
  onApplyQuickPreset,
}: VideoFilterBarProps) {
  const currentSortOption =
    SORT_OPTIONS.find((opt) => opt.field === sortBy && opt.dir === sortDir) || SORT_OPTIONS[0];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Keyword Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search captions, creator @handles, viral topics..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-hidden"
          />
        </div>

        {/* Quick Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort Dropdown */}
          <Dropdown className="relative">
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500"
              >
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                  <span>{currentSortOption.label}</span>
                </div>
                <ChevronDown size={13} className="text-slate-400 shrink-0 ml-0.5" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="right" width="w-56">
              <Dropdown.Header>Sort Videos By</Dropdown.Header>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = opt.field === sortBy && opt.dir === sortDir;
                const IconComp = opt.icon;
                return (
                  <Dropdown.Item
                    key={opt.id}
                    icon={IconComp}
                    selected={isSelected}
                    onClick={() => onSortChange(opt.field, opt.dir)}
                  >
                    {opt.label}
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Content>
          </Dropdown>

          {/* Filter Drawer Toggle */}
          <Button
            variant={isFilterOpen || hasActiveFilters ? 'primary' : 'outline'}
            size="sm"
            icon={SlidersHorizontal}
            onClick={onToggleFilterOpen}
          >
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="ml-1.5 flex h-4 px-1.5 items-center justify-center rounded-full bg-white text-primary-700 text-[10px] font-black">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Save Preset Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              icon={BookmarkPlus}
              onClick={onOpenSaveModal}
            >
              Save View
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filter Presets Row */}
      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Quick:
        </span>
        {QUICK_FILTER_PRESETS.map((preset) => {
          const isActive = activePresetKey === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onApplyQuickPreset(preset)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer ${
                isActive
                  ? preset.activeClass
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {preset.emoji && <span className="text-xs leading-none">{preset.emoji}</span>}
              <span>{preset.label}</span>
              {isActive && preset.key !== 'all' && (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
