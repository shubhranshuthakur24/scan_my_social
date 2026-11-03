'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export default function AutoDmSkeleton() {
  return (
    <div className="space-y-6">
      {/* 1. 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-primary-100 bg-white p-5 shadow-2xs space-y-3 min-h-[110px]"
          >
            <div className="flex items-center justify-between">
              <Skeleton variant="text" className="h-3 w-32" />
              <Skeleton variant="rectangular" className="w-8 h-8 rounded-xl shrink-0" />
            </div>
            <Skeleton variant="text" className="h-8 w-24" />
            <Skeleton variant="text" className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* 2. Filter Toolbar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {['w-28', 'w-28', 'w-36', 'w-32', 'w-32'].map((w, idx) => (
            <Skeleton key={idx} variant="rectangular" className={`h-8 ${w} rounded-xl`} />
          ))}
        </div>
        <Skeleton variant="rectangular" className="h-8 w-64 rounded-xl" />
      </div>

      {/* 3. Structured Data Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Keyword</th>
                <th className="py-3.5 px-4">Trigger</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">DMs Sent</th>
                <th className="py-3.5 px-4">CTR</th>
                <th className="py-3.5 px-4">Reminders</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {/* Keyword + Thumbnail */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <Skeleton variant="rectangular" className="w-10 h-10 rounded-xl shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton variant="text" className="h-3.5 w-24" />
                        <Skeleton variant="text" className="h-2.5 w-32" />
                      </div>
                    </div>
                  </td>

                  {/* Trigger Badge */}
                  <td className="py-3.5 px-4">
                    <Skeleton variant="text" className="h-5 w-14 rounded-full" />
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <Skeleton variant="text" className="h-5 w-16 rounded-full" />
                  </td>

                  {/* DMs Sent */}
                  <td className="py-3.5 px-4">
                    <Skeleton variant="text" className="h-3.5 w-12" />
                  </td>

                  {/* CTR */}
                  <td className="py-3.5 px-4">
                    <Skeleton variant="text" className="h-3.5 w-10" />
                  </td>

                  {/* Reminders */}
                  <td className="py-3.5 px-4">
                    <Skeleton variant="text" className="h-5 w-16 rounded-full" />
                  </td>

                  {/* Created */}
                  <td className="py-3.5 px-4">
                    <Skeleton variant="text" className="h-3 w-20" />
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Skeleton variant="rectangular" className="w-7 h-7 rounded-lg" />
                      <Skeleton variant="rectangular" className="w-7 h-7 rounded-lg" />
                      <Skeleton variant="rectangular" className="w-7 h-7 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
