'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. 4 KPI Status Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between"
          >
            <div className="space-y-2 flex-1 min-w-0 pr-2">
              <Skeleton variant="text" className="h-2.5 w-28" />
              <Skeleton variant="text" className="h-7 w-12" />
              <div className="flex items-center gap-1.5 pt-0.5">
                <Skeleton variant="rectangular" className="w-3 h-3 rounded-full shrink-0" />
                <Skeleton variant="text" className="h-2.5 w-24" />
              </div>
            </div>
            <Skeleton variant="rectangular" className="w-12 h-12 rounded-2xl shrink-0" />
          </div>
        ))}
      </div>

      {/* 2. Unified Calendar Container Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Calendar Toolbar Skeleton */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Navigation Buttons & Header Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1">
              <Skeleton variant="rectangular" className="w-8 h-8 rounded-xl" />
              <Skeleton variant="rectangular" className="w-8 h-8 rounded-xl" />
            </div>
            <Skeleton variant="rectangular" className="h-8 w-16 rounded-xl" />
            <Skeleton variant="text" className="h-5 w-40 ml-1" />
          </div>

          {/* Right: View Mode Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto">
            <Skeleton variant="rectangular" className="h-7 w-16 rounded-lg" />
            <Skeleton variant="rectangular" className="h-7 w-16 rounded-lg" />
            <Skeleton variant="rectangular" className="h-7 w-16 rounded-lg" />
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/80 text-center py-2.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              {day}
            </div>
          ))}
        </div>

        {/* Month Day Cells (5 weeks x 7 days = 35 cells) */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[640px]">
          {Array.from({ length: 35 }).map((_, idx) => {
            const hasPost = idx === 3 || idx === 8 || idx === 11 || idx === 18 || idx === 22 || idx === 27;
            const hasNote = idx === 5 || idx === 15;

            return (
              <div
                key={idx}
                className="p-2 min-h-[110px] sm:min-h-[125px] flex flex-col justify-between bg-white select-none"
              >
                {/* Cell Header: Day Number Skeleton */}
                <div className="flex items-center justify-between mb-1.5">
                  <Skeleton variant="text" className="h-4 w-4 rounded-sm" />
                </div>

                {/* Scheduled Items Preview Skeleton */}
                <div className="space-y-1.5 flex-1">
                  {hasPost && (
                    <div className="p-1.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Skeleton variant="rectangular" className="w-4 h-4 rounded-sm shrink-0" />
                        <Skeleton variant="text" className="h-2.5 w-12" />
                      </div>
                      <Skeleton variant="text" className="h-2 w-full" />
                    </div>
                  )}
                  {hasNote && (
                    <div className="p-1.5 rounded-lg border border-amber-100 bg-amber-50/60 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Skeleton variant="rectangular" className="w-3 h-3 rounded-full shrink-0" />
                        <Skeleton variant="text" className="h-2 w-14" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
