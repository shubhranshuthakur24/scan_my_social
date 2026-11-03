'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import {
  Search,
  Users,
  ChevronDown,
  Check,
  X,
  Flame,
  Eye,
  Percent,
  RotateCcw,
} from 'lucide-react';
import type { ChannelItem } from '@/types/contentLibrary';
import {
  PERFORMANCE_OPTIONS,
  DATE_RANGE_OPTIONS,
  PLATFORM_OPTIONS,
} from './constants';
import type { VideoFilterDrawerProps } from './types';

export default function VideoFilterDrawer({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  channels,
  watchlists,
  projects,
  onResetFilters,
}: VideoFilterDrawerProps) {
  const [isCreatorDropdownOpen, setIsCreatorDropdownOpen] = useState(false);
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('');
  const creatorDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close creator dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        creatorDropdownRef.current &&
        !creatorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCreatorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredChannels = useMemo(() => {
    if (!creatorSearchQuery.trim()) return channels;
    const q = creatorSearchQuery.toLowerCase().trim();
    return channels.filter(
      (c) =>
        c.handle.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q))
    );
  }, [channels, creatorSearchQuery]);

  const toggleCreator = (handle: string) => {
    const cleanHandle = handle.replace(/^@/, '');
    const current = filters.selectedCreators;
    const updated = current.includes(cleanHandle)
      ? current.filter((h) => h !== cleanHandle)
      : [...current, cleanHandle];
    onFilterChange('selectedCreators', updated);
  };

  const clearCreators = () => {
    onFilterChange('selectedCreators', []);
  };

  const toggleLabel = (labelId: string) => {
    const current = filters.selectedLabels;
    const updated = current.includes(labelId)
      ? current.filter((l) => l !== labelId)
      : [...current, labelId];
    onFilterChange('selectedLabels', updated);
  };

  if (!isOpen) return null;

  const selectedWatchlist = watchlists.find((wl) => wl.id === filters.selectedWatchlistId);
  const selectedProject = projects.find((proj) => proj.id === filters.selectedProjectId);
  const currentPlatformLabel =
    PLATFORM_OPTIONS.find((p) => p.id === filters.selectedPlatform)?.label || 'All Platforms';
  const currentDateRangeLabel = filters.dateValue
    ? DATE_RANGE_OPTIONS.find(
        (d) => d.value === filters.dateValue && d.unit === filters.dateUnit
      )?.label || `Past ${filters.dateValue} ${filters.dateUnit}`
    : 'All Time';

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 animate-in fade-in duration-200">
      {/* Section A: Viral Status (Breakout Performance Labels) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Viral Status (Performance Label)
          </label>
          {filters.selectedLabels.length > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange('selectedLabels', [])}
              className="text-[11px] font-bold text-primary-600 hover:underline cursor-pointer"
            >
              Clear status ({filters.selectedLabels.length})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {PERFORMANCE_OPTIONS.map((status) => {
            const isSelected = filters.selectedLabels.includes(status.id);
            const IconComp = status.icon;
            return (
              <button
                key={status.id}
                type="button"
                onClick={() => toggleLabel(status.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary-400 bg-primary-50 text-primary-800 ring-1 ring-primary-300 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <IconComp
                  size={14}
                  className={isSelected ? 'text-primary-600' : 'text-slate-400'}
                />
                <span>{status.label}</span>
                <span
                  className={`text-[10px] font-medium ${
                    isSelected ? 'text-primary-600' : 'text-slate-400'
                  }`}
                >
                  {status.desc}
                </span>
                {isSelected && <Check size={12} strokeWidth={2.5} className="text-primary-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section B: Grid of Granular Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        {/* Creator / Channel Multi-Select Combobox */}
        <div className="relative" ref={creatorDropdownRef}>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Tracked Creators ({filters.selectedCreators.length > 0 ? filters.selectedCreators.length : 'All'})
          </label>
          <button
            type="button"
            onClick={() => setIsCreatorDropdownOpen((prev) => !prev)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 flex items-center justify-between hover:border-primary-300 focus:border-primary-500 focus:outline-hidden transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Users size={14} className="text-slate-400 shrink-0" />
              <span className="truncate">
                {filters.selectedCreators.length === 0
                  ? 'All Creators'
                  : `${filters.selectedCreators.length} creator${
                      filters.selectedCreators.length > 1 ? 's' : ''
                    }`}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform ${
                isCreatorDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Combobox Dropdown */}
          {isCreatorDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl border border-slate-200 bg-white shadow-xl p-3 space-y-2 min-w-70 animate-in fade-in zoom-in-95 duration-150">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={creatorSearchQuery}
                  onChange={(e) => setCreatorSearchQuery(e.target.value)}
                  placeholder="Search channels..."
                  className="w-full rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] px-0.5 font-bold text-slate-500 border-b border-slate-100 pb-1.5">
                <span>{filters.selectedCreators.length} selected</span>
                {filters.selectedCreators.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCreators}
                    className="text-primary-600 hover:text-primary-800 hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {filteredChannels.length === 0 ? (
                  <p className="text-center py-4 text-xs text-slate-400 font-medium">No creators found</p>
                ) : (
                  filteredChannels.map((c: ChannelItem) => {
                    const cleanHandle = c.handle.replace(/^@/, '');
                    const isSelected = filters.selectedCreators.includes(cleanHandle);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCreator(c.handle)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary-50 text-primary-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            {c.profile_image_url ? (
                              <img
                                src={c.profile_image_url}
                                alt={c.handle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                                {cleanHandle.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold truncate leading-tight">@{cleanHandle}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {(c.followers_count || 0).toLocaleString()} followers
                            </p>
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Selected Creator Tag Chips */}
          {filters.selectedCreators.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {filters.selectedCreators.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary-50 border border-primary-200 text-[10px] font-bold text-primary-700"
                >
                  @{h}
                  <button
                    type="button"
                    onClick={() => toggleCreator(h)}
                    className="hover:text-primary-900 text-primary-400 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Watchlist
          </label>
          <Dropdown className="w-full">
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-primary-500 focus:outline-hidden transition-colors cursor-pointer text-left"
              >
                <span className="truncate">
                  {selectedWatchlist
                    ? `${selectedWatchlist.name} (${selectedWatchlist.channels_count || 0})`
                    : 'All Tracked Creators'}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="left" width="w-full" className="max-h-60 overflow-y-auto">
              <Dropdown.Item
                selected={!filters.selectedWatchlistId}
                onClick={() => onFilterChange('selectedWatchlistId', undefined)}
              >
                All Tracked Creators
              </Dropdown.Item>
              {watchlists.map((wl) => (
                <Dropdown.Item
                  key={wl.id}
                  selected={filters.selectedWatchlistId === wl.id}
                  onClick={() => onFilterChange('selectedWatchlistId', wl.id)}
                >
                  <span className="truncate">{wl.name}</span>
                  <span className="text-[10px] text-slate-400 ml-1">({wl.channels_count || 0})</span>
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown>
        </div>

        {/* Project Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Project Board
          </label>
          <Dropdown className="w-full">
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-primary-500 focus:outline-hidden transition-colors cursor-pointer text-left"
              >
                <span className="truncate">
                  {selectedProject
                    ? `${selectedProject.name} (${selectedProject.posts_count || 0})`
                    : 'All Videos'}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="left" width="w-full" className="max-h-60 overflow-y-auto">
              <Dropdown.Item
                selected={!filters.selectedProjectId}
                onClick={() => onFilterChange('selectedProjectId', undefined)}
              >
                All Videos
              </Dropdown.Item>
              {projects.map((proj) => (
                <Dropdown.Item
                  key={proj.id}
                  selected={filters.selectedProjectId === proj.id}
                  onClick={() => onFilterChange('selectedProjectId', proj.id)}
                >
                  <span className="truncate">{proj.name}</span>
                  <span className="text-[10px] text-slate-400 ml-1">({proj.posts_count || 0})</span>
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown>
        </div>

        {/* Platform Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Platform
          </label>
          <Dropdown className="w-full">
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-primary-500 focus:outline-hidden transition-colors cursor-pointer text-left"
              >
                <span className="truncate">{currentPlatformLabel}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="left" width="w-full">
              {PLATFORM_OPTIONS.map((p) => (
                <Dropdown.Item
                  key={p.id}
                  selected={filters.selectedPlatform === p.id}
                  onClick={() => onFilterChange('selectedPlatform', p.id)}
                >
                  {p.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown>
        </div>
      </div>

      {/* Section C: Numeric Metrics & Thresholds */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
        {/* Min Outlier Multiplier */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Min Outlier Multiplier
          </label>
          <div className="relative">
            <Flame size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min={1}
              step={0.5}
              placeholder="e.g. 3.0"
              value={filters.minOutlier ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value);
                onFilterChange('minOutlier', val);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 focus:border-primary-500 focus:outline-hidden"
            />
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {[2, 3, 5, 10].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => {
                  onFilterChange('minOutlier', filters.minOutlier === mult ? undefined : mult);
                }}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                  filters.minOutlier === mult
                    ? 'bg-primary-50 text-primary-700 border-primary-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {mult}x+
              </button>
            ))}
          </div>
        </div>

        {/* Min Views */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Min Video Views
          </label>
          <div className="relative">
            <Eye size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min={0}
              step={5000}
              placeholder="e.g. 50000"
              value={filters.viewsMin ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value);
                onFilterChange('viewsMin', val);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 focus:border-primary-500 focus:outline-hidden"
            />
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {[10000, 50000, 100000, 500000].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  onFilterChange('viewsMin', filters.viewsMin === num ? undefined : num);
                }}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                  filters.viewsMin === num
                    ? 'bg-primary-50 text-primary-700 border-primary-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {num >= 1000000 ? `${num / 1000000}M` : `${num / 1000}K`}
              </button>
            ))}
          </div>
        </div>

        {/* Min Engagement Rate */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Min Engagement Rate
          </label>
          <div className="relative">
            <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="e.g. 5"
              value={filters.engagementMin ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value);
                onFilterChange('engagementMin', val);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 focus:border-primary-500 focus:outline-hidden"
            />
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {[3, 5, 8, 10].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  onFilterChange('engagementMin', filters.engagementMin === rate ? undefined : rate);
                }}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                  filters.engagementMin === rate
                    ? 'bg-primary-50 text-primary-700 border-primary-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {rate}%+
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Posted Date Range
          </label>
          <Dropdown className="w-full">
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-primary-500 focus:outline-hidden transition-colors cursor-pointer text-left"
              >
                <span className="truncate">{currentDateRangeLabel}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="left" width="w-full">
              {DATE_RANGE_OPTIONS.map((opt) => (
                <Dropdown.Item
                  key={opt.id}
                  selected={
                    opt.id === 'all'
                      ? filters.dateValue === undefined
                      : filters.dateValue === opt.value && filters.dateUnit === opt.unit
                  }
                  onClick={() => {
                    if (opt.id === 'all') {
                      onFilterChange('dateValue', undefined);
                    } else {
                      onFilterChange('dateValue', opt.value);
                      onFilterChange('dateUnit', opt.unit);
                    }
                  }}
                >
                  {opt.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown>
        </div>
      </div>

      {/* Section D: Drawer Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <RotateCcw size={12} />
          <span>Reset All Filters</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
