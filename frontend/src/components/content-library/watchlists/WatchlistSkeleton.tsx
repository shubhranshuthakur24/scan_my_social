'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export interface WatchlistSkeletonProps {
  count?: number;
}

export default function WatchlistSkeleton({ count = 6 }: WatchlistSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-4"
        >
          {/* Top Row: Icon, Title & Description, Favorite button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton variant="rectangular" className="w-10 h-10 rounded-xl shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton variant="text" className="h-4 w-32" />
                <Skeleton variant="text" className="h-3 w-44 max-w-full" />
              </div>
            </div>
            <Skeleton variant="rectangular" className="w-5 h-5 rounded-md shrink-0 mt-0.5" />
          </div>

          {/* Metrics Box */}
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Skeleton variant="rectangular" className="w-3.5 h-3.5 rounded-xs shrink-0" />
              <Skeleton variant="text" className="h-3 w-28" />
            </div>
            <Skeleton variant="text" className="h-4 w-6 rounded-md" />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Skeleton variant="text" className="h-3.5 w-20 rounded-md" />
            <Skeleton variant="rectangular" className="w-5 h-5 rounded-md shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
