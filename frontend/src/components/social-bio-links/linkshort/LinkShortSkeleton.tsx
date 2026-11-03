'use client';

import React from 'react';

export default function LinkShortSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      {/* 1. KPI Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded-lg" />
          </div>
        ))}
      </div>

      {/* 3. Search & Filter Bar Skeleton */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="h-10 w-72 bg-slate-100 rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 bg-slate-100 rounded-xl" />
          <div className="h-10 w-28 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* 4. Link Cards Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="h-3 w-64 bg-slate-100 rounded" />
              <div className="h-7 w-52 bg-slate-100 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-20 bg-slate-100 rounded-xl" />
              <div className="h-9 w-20 bg-slate-100 rounded-xl" />
              <div className="h-9 w-9 bg-slate-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
