import React from 'react';

export default function WatchlistSkeleton() {
    return (
        <div className="p-5 bg-white card-border rounded-2xl shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                <div className="w-6 h-6 bg-slate-200 rounded-lg"></div>
            </div>

            <div className="flex items-center justify-between mt-4">
                <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                <div className="flex -space-x-1.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white shadow-sm"></div>
                    <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white shadow-sm"></div>
                    <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white shadow-sm"></div>
                </div>
            </div>
        </div>
    );
}
