import React from 'react';

export default function ChannelCardSkeleton() {
    return (
        <div className="flex h-[72px] animate-pulse items-center gap-4 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
            </div>
        </div>
    );
}
