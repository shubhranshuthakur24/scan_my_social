import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export default function ContentLibrarySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading content library">
      {/* Filter Bar Skeleton */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton variant="rectangular" className="h-10 w-full lg:w-80 rounded-xl" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton variant="rectangular" className="h-9 w-28 rounded-xl" />
            <Skeleton variant="rectangular" className="h-9 w-28 rounded-xl" />
            <Skeleton variant="rectangular" className="h-9 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Video Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between"
          >
            {/* Aspect 4/5 portrait thumbnail */}
            <div className="relative aspect-4/5 w-full overflow-hidden bg-slate-200">
              {/* Top Badge Placeholder */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <Skeleton variant="rectangular" className="h-6 w-24 rounded-xl bg-white/40" />
              </div>

              {/* Creator Username Tag on Bottom Left */}
              <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-2">
                <Skeleton variant="circular" className="h-6 w-6 shrink-0 bg-white/40" />
                <Skeleton variant="rectangular" className="h-5 w-20 rounded-md bg-white/40" />
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              {/* Caption */}
              <div className="space-y-1.5">
                <Skeleton variant="text" className="h-3.5 w-full" />
                <Skeleton variant="text" className="h-3.5 w-3/4" />
              </div>

              {/* 4-Column Metrics Grid */}
              <div className="grid grid-cols-4 gap-1 py-2 px-1.5 rounded-xl bg-slate-50/90 border border-slate-100 text-center items-center">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <Skeleton variant="text" className="h-2.5 w-8 mb-1" />
                    <Skeleton variant="text" className="h-3.5 w-10" />
                  </div>
                ))}
              </div>

              {/* Action Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <Skeleton variant="rectangular" className="flex-1 h-8 rounded-xl" />
                <Skeleton variant="rectangular" className="w-8 h-8 rounded-xl shrink-0" />
                <Skeleton variant="rectangular" className="w-8 h-8 rounded-xl shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
