'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export interface ReelCardSkeletonProps {
  className?: string;
}

export default function ReelCardSkeleton({ className = '' }: ReelCardSkeletonProps) {
  return (
    <div
      className={`flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs ${className}`}
    >
      {/* Thumbnail Placeholder with 4:5 aspect ratio */}
      <div className="relative aspect-[4/5] w-full bg-slate-100 overflow-hidden">
        <Skeleton variant="rectangular" className="w-full h-full rounded-none" />
        {/* Top overlay badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
          <Skeleton variant="rectangular" className="h-4 w-14 rounded-full bg-white/40" />
          <Skeleton variant="rectangular" className="h-4 w-16 rounded-full bg-white/40" />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
        {/* Caption Skeleton */}
        <div className="space-y-1.5">
          <Skeleton variant="text" className="h-3 w-full" />
          <Skeleton variant="text" className="h-3 w-4/5" />
        </div>

        {/* Metrics Bar (Views, Likes, Comments, Shares) */}
        <div className="grid grid-cols-4 gap-1 py-1.5 px-1 rounded-xl bg-slate-50 border border-slate-100">
          {Array.from({ length: 4 }).map((_, mIdx) => (
            <div key={mIdx} className="flex flex-col items-center space-y-1">
              <Skeleton variant="text" className="h-2 w-8" />
              <Skeleton variant="text" className="h-3 w-6" />
            </div>
          ))}
        </div>

        {/* Action Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <Skeleton variant="text" className="h-3 w-24" />
          <Skeleton variant="rectangular" className="h-6 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
