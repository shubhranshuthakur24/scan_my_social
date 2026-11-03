'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export interface ChannelSkeletonProps {
  count?: number;
}

export default function ChannelSkeleton({ count = 6 }: ChannelSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 flex flex-col justify-between"
        >
          {/* Channel Profile Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton variant="rectangular" className="h-12 w-12 rounded-xl shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton variant="text" className="h-4 w-32" />
                <Skeleton variant="text" className="h-3 w-20" />
              </div>
            </div>
            <Skeleton variant="rectangular" className="h-5 w-16 rounded-full shrink-0" />
          </div>

          {/* Bio placeholder lines */}
          <div className="space-y-1.5">
            <Skeleton variant="text" className="h-3 w-full" />
            <Skeleton variant="text" className="h-3 w-3/4" />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100 text-center">
            <div className="flex flex-col items-center gap-1">
              <Skeleton variant="text" className="h-2.5 w-14" />
              <Skeleton variant="text" className="h-4 w-10 rounded-md" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Skeleton variant="text" className="h-2.5 w-16" />
              <Skeleton variant="text" className="h-4 w-8 rounded-md" />
            </div>
          </div>

          {/* Sync / Last Updated Info */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Skeleton variant="rectangular" className="w-3 h-3 rounded-xs shrink-0" />
              <Skeleton variant="text" className="h-2.5 w-24" />
            </div>
            <Skeleton variant="text" className="h-2.5 w-10" />
          </div>

          {/* Card Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Skeleton variant="text" className="h-3.5 w-24 rounded-md" />
            <Skeleton variant="rectangular" className="w-5 h-5 rounded-md shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
