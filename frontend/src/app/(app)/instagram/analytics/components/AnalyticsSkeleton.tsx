'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export default function AnalyticsSkeleton() {
  const chartBars = [
    { height: 8 },
    { height: 8 },
    { height: 12 },
    { height: 8 },
    { height: 15 },
    { height: 8 },
    { height: 20 },
    { height: 8 },
    { height: 14 },
    { height: 8 },
    { height: 25 },
    { height: 85 },
    { height: 10 },
    { height: 8 },
  ];

  return (
    <div className="space-y-6">
      {/* 1. KPI Summary Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between min-h-[120px] space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton variant="text" className="h-3 w-28" />
              <Skeleton variant="text" className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton variant="text" className="h-9 w-16 my-1" />
            <Skeleton variant="text" className="h-3 w-44" />
          </div>
        ))}
      </div>

      {/* 2. Main Charts & Format Mix Section (3 Columns: 2 col Chart + 1 col Format Mix) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Metrics Timeline Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="space-y-1.5">
              <Skeleton variant="text" className="h-4 w-52" />
              <Skeleton variant="text" className="h-3 w-72" />
            </div>

            {/* Chart Mode Toggle Tray */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shrink-0">
              {['w-14', 'w-20', 'w-22', 'w-16', 'w-22'].map((w, idx) => (
                <Skeleton key={idx} variant="text" className={`h-6 ${w} rounded-lg`} />
              ))}
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-56 flex items-end justify-between gap-2 sm:gap-3 pt-6 px-2 border-b border-slate-100 pb-2">
            {chartBars.map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className="w-full max-w-[24px] rounded-t-sm bg-slate-200/70 animate-pulse transition-all"
                  style={{ height: `${bar.height}%` }}
                />
                <Skeleton variant="text" className="h-2.5 w-6 rounded-xs" />
              </div>
            ))}
          </div>
        </div>

        {/* Format Performance Mix (1 col) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5 flex flex-col justify-between">
          <div>
            <Skeleton variant="text" className="h-4 w-44" />
            <Skeleton variant="text" className="h-3 w-60 mt-1.5" />
          </div>

          {/* 5 Format Distribution Rows */}
          <div className="space-y-4">
            {[90, 15, 0, 0, 0].map((pct, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="rectangular" className="w-3.5 h-3.5 rounded" />
                    <Skeleton variant="text" className="h-3 w-20" />
                  </div>
                  <Skeleton variant="text" className="h-3 w-8" />
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  {pct > 0 ? (
                    <div
                      className="h-full rounded-full bg-slate-200/80 animate-pulse"
                      style={{ width: `${pct}%` }}
                    />
                  ) : (
                    <div className="h-full w-full bg-transparent" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Format Breakdown Callout Box */}
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Skeleton variant="circular" className="w-3.5 h-3.5" />
              <Skeleton variant="text" className="h-3 w-28" />
            </div>
            <Skeleton variant="text" className="h-2.5 w-full" />
            <Skeleton variant="text" className="h-2.5 w-4/5" />
          </div>
        </div>
      </div>

      {/* 3. AutoDM Automation & Top Content Grid (3 Columns: 1 col AutoDM + 2 col Top Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AutoDM Performance Card (1 col) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton variant="text" className="h-4 w-44" />
                <Skeleton variant="text" className="h-3 w-56" />
              </div>
              <Skeleton variant="text" className="h-5 w-16 rounded-full" />
            </div>

            {/* 2 Stat Tiles */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                <Skeleton variant="text" className="h-2.5 w-24" />
                <Skeleton variant="text" className="h-6 w-16" />
              </div>
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                <Skeleton variant="text" className="h-2.5 w-24" />
                <Skeleton variant="text" className="h-6 w-14" />
              </div>
            </div>

            {/* Stat List Rows */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <Skeleton variant="text" className="h-3 w-36" />
                <Skeleton variant="text" className="h-3 w-8" />
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <Skeleton variant="text" className="h-3 w-32" />
                <Skeleton variant="text" className="h-3 w-8" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="h-3 w-28" />
                <Skeleton variant="text" className="h-3 w-8" />
              </div>
            </div>
          </div>

          <Skeleton variant="rectangular" className="h-9 w-full rounded-xl mt-2" />
        </div>

        {/* Top Performing Content Section (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton variant="text" className="h-4 w-48" />
              <Skeleton variant="text" className="h-3 w-64" />
            </div>
            <Skeleton variant="rectangular" className="h-8 w-28 rounded-xl" />
          </div>

          {/* Reel Card Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 bg-white p-3 space-y-3 shadow-2xs"
              >
                {/* 9:16 Aspect ratio video placeholder */}
                <Skeleton variant="rectangular" className="w-full aspect-[9/16] max-h-56 rounded-xl" />
                <Skeleton variant="text" className="h-3.5 w-4/5" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton variant="text" className="h-3 w-14" />
                  <Skeleton variant="text" className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
