import React from 'react';
import Skeleton from '@/Components/Skeleton';
import GlassCard from '@/Components/GlassCard';

export default function ScriptCardSkeleton() {
    return (
        <GlassCard className="group relative overflow-hidden flex flex-col h-full !p-0">
            {/* Thumbnail/Header */}
            <div className="aspect-[16/9] w-full relative bg-slate-100">
                <Skeleton className="w-full h-full" />

                {/* Score Pill */}
                <div className="absolute top-3 left-3">
                    <Skeleton className="h-5 w-16 rounded-full bg-white/50 backdrop-blur-sm" />
                </div>
            </div>

            {/* Content Body */}
            <div className="p-5 flex flex-col flex-1 gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-2/3 rounded-md" />
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                    <Skeleton className="h-3 w-12 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                </div>
            </div>
        </GlassCard>
    );
}
