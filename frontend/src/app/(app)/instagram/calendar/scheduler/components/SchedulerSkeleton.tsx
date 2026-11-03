'use client';

import React from 'react';
import InstagramNav from '@/components/InstagramNav';

export default function SchedulerSkeleton() {
  return (
    <div className="space-y-6">
      <InstagramNav />

      {/* Header Actions Container */}
      <div className="flex items-center justify-between gap-2">
        <div className="h-9 w-36 rounded-xl bg-slate-100 animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-9 w-32 rounded-xl bg-slate-200 animate-pulse" />
        </div>
      </div>

      {/* Main Grid: Form on Left, Mockup on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Container */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-6">
          {/* Format Selector Pills */}
          <div className="grid grid-cols-4 gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-200/70 animate-pulse" />
            ))}
          </div>

          {/* Media Dropzone Box */}
          <div className="h-64 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 animate-pulse flex items-center justify-center" />

          {/* Caption Box Skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="h-28 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
          </div>

          {/* Timing Box Skeleton */}
          <div className="h-32 rounded-2xl border border-slate-200 bg-slate-50/50 animate-pulse" />
        </div>

        {/* Right Phone Mockup Container */}
        <div className="lg:col-span-5 flex justify-center sticky top-6">
          <div className="w-full max-w-85 aspect-[9/18.5] rounded-[48px] bg-slate-100 border-[6px] border-slate-300 shadow-xl animate-pulse p-4 flex flex-col justify-between">
            <div className="w-24 h-4 rounded-full bg-slate-200 mx-auto" />
            <div className="w-full aspect-square rounded-2xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-3 w-3/4 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
