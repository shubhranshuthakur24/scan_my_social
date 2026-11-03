import React from 'react';
import Skeleton from '@/Components/Skeleton';

export default function ContentCardSkeleton() {
    return (
        <div className="flex flex-col gap-3 group">
            {/* Visual Container */}
            <div className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-slate-100 shadow-sm border border-slate-200/50">
                <Skeleton className="w-full h-full" />

                {/* Platform Icon Placehotder */}
                <div className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/50 backdrop-blur-md border md:border-white/50" />
            </div>

            {/* Info Section */}
            <div className="px-1 space-y-2">
                {/* Caption lines */}
                <Skeleton className="h-4 w-3/4 rounded-md bg-white/60" />
                <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-3 w-1/3 rounded-md bg-white/60" />
                    <Skeleton className="h-3 w-1/4 rounded-md bg-white/60" />
                </div>

                {/* Metric Pills */}
                <div className="flex items-center gap-1.5 pt-1 bg-white/10 rounded-lg px-2 py-1">
                    <Skeleton className="flex-1 h-8 rounded-lg bg-white/60" />
                    <Skeleton className="flex-1 h-8 rounded-lg bg-white/60" />
                    <Skeleton className="flex-1 h-8 rounded-lg bg-white/60" />
                </div>
            </div>
        </div>
    );
}
