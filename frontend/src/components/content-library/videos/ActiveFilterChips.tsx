'use client';

import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { ActiveFilterChipsProps } from './types';

export default function ActiveFilterChips({
  filters,
  totalPosts,
  hasActiveFilters,
  onRemoveSearch,
  onRemoveCreator,
  onRemoveLabel,
  onRemoveOutlier,
  onRemoveViews,
  onRemoveEngagement,
  onRemoveDate,
  onRemovePlatform,
  onResetAll,
}: ActiveFilterChipsProps) {
  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs font-semibold text-slate-500">
      <div className="flex flex-wrap items-center gap-1.5">
        <span>
          Showing filtered results {totalPosts > 0 && `(${totalPosts} posts found)`}:
        </span>

        {/* Search Term Chip */}
        {filters.search.trim() && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
            "{filters.search}"
            <button
              type="button"
              onClick={onRemoveSearch}
              className="hover:text-rose-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        )}

        {/* Creator Chips */}
        {filters.selectedCreators.map((h) => (
          <span
            key={h}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-[11px] font-bold text-primary-700 border border-primary-200"
          >
            @{h}
            <button
              type="button"
              onClick={() => onRemoveCreator(h)}
              className="hover:text-rose-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        ))}

        {/* Performance Label Chips */}
        {filters.selectedLabels.map((l) => (
          <span
            key={l}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-[11px] font-bold text-amber-700 border border-amber-200"
          >
            {l}
            <button
              type="button"
              onClick={() => onRemoveLabel(l)}
              className="hover:text-rose-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        ))}

        {/* Outlier Chip */}
        {filters.minOutlier !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-[11px] font-bold text-rose-700 border border-rose-200">
            {filters.minOutlier}x+ Outlier
            <button
              type="button"
              onClick={onRemoveOutlier}
              className="hover:text-rose-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        )}

        {/* Views Chip */}
        {filters.viewsMin !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[11px] font-bold text-blue-700 border border-blue-200">
            &ge; {filters.viewsMin.toLocaleString()} views
            <button
              type="button"
              onClick={onRemoveViews}
              className="hover:text-rose-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        )}

        {/* Engagement Chip */}
        {filters.engagementMin !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700 border border-emerald-200">
            &ge; {filters.engagementMin}% eng
            <button
              type="button"
              onClick={onRemoveEngagement}
              className="hover:text-rose-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        )}

        {/* Date Range Chip */}
        {filters.dateValue !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
            Past {filters.dateValue} {filters.dateUnit}
            <button
              type="button"
              onClick={onRemoveDate}
              className="hover:text-rose-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        )}

        {/* Platform Chip */}
        {filters.selectedPlatform !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
            {filters.selectedPlatform}
            <button
              type="button"
              onClick={onRemovePlatform}
              className="hover:text-rose-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onResetAll}
        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 hover:underline shrink-0 cursor-pointer"
      >
        <RotateCcw size={13} />
        <span>Reset all filters</span>
      </button>
    </div>
  );
}
