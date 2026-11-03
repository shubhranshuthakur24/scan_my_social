'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton';
import ReelCardSkeleton from '@/components/ui/skeleton/ReelCardSkeleton';

export default function InstagramProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* 1. Profile Overview & Metrics Card Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Profile Overview & Identity (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 lg:pr-6 lg:border-r lg:border-slate-100">
            <div className="flex items-start gap-4">
              {/* Circular Avatar Skeleton */}
              <Skeleton variant="circular" className="w-22 h-22 shrink-0" />

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Skeleton variant="text" className="h-4.5 w-32" />
                  <Skeleton variant="rectangular" className="h-4.5 w-20 rounded-full" />
                </div>
                <Skeleton variant="text" className="h-3 w-40" />
                <Skeleton variant="text" className="h-3 w-48 max-w-full" />
                <div className="pt-1">
                  <Skeleton variant="rectangular" className="h-6 w-36 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Bottom Metadata Info Strip */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton variant="rectangular" className="w-3.5 h-3.5 rounded-sm shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <Skeleton variant="text" className="h-2 w-14" />
                    <Skeleton variant="text" className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 6-Card Stats Grid (lg:col-span-7) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-3 flex items-center gap-3"
              >
                <Skeleton variant="rectangular" className="w-10 h-10 rounded-xl shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton variant="text" className="h-2.5 w-16" />
                  <Skeleton variant="text" className="h-5 w-14" />
                  <Skeleton variant="text" className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom AutoDM Growth Banner Skeleton */}
        <div className="rounded-2xl border border-primary-200/50 bg-primary-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton variant="rectangular" className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton variant="text" className="h-3.5 w-36" />
              <Skeleton variant="text" className="h-2.5 w-72 max-w-full" />
            </div>
          </div>
          <Skeleton variant="rectangular" className="h-8 w-24 rounded-xl shrink-0 self-start sm:self-auto" />
        </div>
      </div>

      {/* 2. Published Content & Viral Outliers Section Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton variant="rectangular" className="w-4.5 h-4.5 rounded-sm" />
              <Skeleton variant="text" className="h-4.5 w-56" />
            </div>
            <Skeleton variant="text" className="h-3 w-80 max-w-full" />
          </div>
          {/* Outlier Switcher Toggle */}
          <Skeleton variant="rectangular" className="h-9 w-48 rounded-xl shrink-0 self-start sm:self-auto" />
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_auto] gap-3.5 items-end pt-1 pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton variant="text" className="h-2.5 w-20" />
              <Skeleton variant="rectangular" className="h-10 w-full rounded-full" />
            </div>
          ))}
          <Skeleton variant="rectangular" className="h-10 w-28 rounded-full shrink-0" />
        </div>

        {/* 4-Column Reel Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <ReelCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
