'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export default function SocialBioLinksSkeleton() {
  return (
    <div className="space-y-6">
      {/* 1. Main Grid: Left Editor & Tabs, Right Device Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Editor & Content) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card Selector Strip */}
          <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="w-10 h-10" />
              <div className="space-y-1.5">
                <Skeleton variant="text" className="h-4 w-32" />
                <Skeleton variant="text" className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton variant="rectangular" className="h-8 w-24 rounded-lg" />
              <Skeleton variant="rectangular" className="h-8 w-28 rounded-lg" />
            </div>
          </div>

          {/* Tabs bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Skeleton variant="rectangular" className="h-8 w-28 rounded-lg" />
            <Skeleton variant="rectangular" className="h-8 w-28 rounded-lg" />
            <Skeleton variant="rectangular" className="h-8 w-28 rounded-lg" />
          </div>

          {/* Editor Form Blocks */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <Skeleton variant="text" className="h-4 w-36" />
            <div className="space-y-3">
              <Skeleton variant="rectangular" className="h-9 w-full rounded-xl" />
              <Skeleton variant="rectangular" className="h-9 w-full rounded-xl" />
            </div>
          </div>

          {/* Links List Skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" className="h-4 w-32" />
              <Skeleton variant="rectangular" className="h-8 w-24 rounded-xl" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton variant="rectangular" className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="space-y-1 flex-1">
                    <Skeleton variant="text" className="h-3.5 w-48" />
                    <Skeleton variant="text" className="h-2.5 w-64 max-w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton variant="rectangular" className="w-9 h-5 rounded-full" />
                  <Skeleton variant="circular" className="w-7 h-7" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Device Mockup Skeleton */}
        <div className="lg:col-span-5 flex justify-center lg:sticky lg:top-20 h-fit self-start">
          <div className="w-[320px] h-[640px] rounded-[44px] border-[6px] border-slate-800 bg-slate-100 p-4 shadow-2xl flex flex-col items-center justify-between">
            <div className="w-full space-y-4 flex flex-col items-center pt-8">
              <Skeleton variant="circular" className="w-20 h-20" />
              <Skeleton variant="text" className="h-4 w-32" />
              <Skeleton variant="text" className="h-3 w-44" />
              <div className="w-full space-y-3 pt-4">
                <Skeleton variant="rectangular" className="h-11 w-full rounded-xl" />
                <Skeleton variant="rectangular" className="h-11 w-full rounded-xl" />
                <Skeleton variant="rectangular" className="h-11 w-full rounded-xl" />
              </div>
            </div>
            <Skeleton variant="text" className="h-2.5 w-24 pb-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
