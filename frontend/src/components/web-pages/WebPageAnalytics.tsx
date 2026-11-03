'use client';

import React, { useMemo } from 'react';
import { WebPageAnalytics as AnalyticsData } from '@/lib/api/webPagesService';
import {
  Eye,
  MousePointerClick,
  Users,
  Mail,
  Calendar,
  Layers,
  Clock,
} from 'lucide-react';

interface WebPageAnalyticsProps {
  analytics: AnalyticsData;
}

export default function WebPageAnalytics({ analytics }: WebPageAnalyticsProps) {
  const maxDailyViews = useMemo(() => {
    if (!analytics.daily_views || analytics.daily_views.length === 0) return 1;
    return Math.max(1, ...analytics.daily_views.map((d) => d.views || 0));
  }, [analytics.daily_views]);

  return (
    <div className="space-y-6">
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Views */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Views</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Eye size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{analytics.total_views.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Lifetime page views</p>
        </div>

        {/* Total Clicks */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-primary-600 mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">CTA Clicks</span>
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <MousePointerClick size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{analytics.total_cta_clicks.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Total button interactions</p>
        </div>

        {/* Unique Visitors */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Unique Visitors</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Users size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{analytics.unique_visitors.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Hashed IP visitor count</p>
        </div>

        {/* Form Submissions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600 mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Submissions</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Mail size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{analytics.total_submissions.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">CRM captured leads</p>
        </div>
      </div>

      {/* 2. 30-Day Daily Views Velocity Histogram */}
      <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Calendar size={14} className="text-primary-600" />
              <span>30-Day View Velocity</span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">Daily traffic volume over the last 30 calendar days</p>
          </div>
          <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            Peak: {maxDailyViews} views/day
          </span>
        </div>

        <div className="flex items-end gap-1 h-36 pt-2 pb-1 border-b border-slate-100">
          {analytics.daily_views.map((day) => {
            const heightPercent = maxDailyViews > 0 ? (day.views / maxDailyViews) * 100 : 0;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    day.views > 0
                      ? 'bg-primary-500 group-hover:bg-primary-600'
                      : 'bg-slate-100 group-hover:bg-slate-200'
                  }`}
                  style={{ height: `${Math.max(day.views > 0 ? 8 : 2, heightPercent)}%` }}
                />
                {/* Hover tooltip */}
                <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                  <div className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-md whitespace-nowrap">
                    {day.date}: {day.views} views
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2">
          <span>{analytics.daily_views[0]?.date || '30 days ago'}</span>
          <span>{analytics.daily_views[analytics.daily_views.length - 1]?.date || 'Today'}</span>
        </div>
      </div>

      {/* 3. Clicks by Block & Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Block Clicks */}
        <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Layers size={14} className="text-slate-600" />
            <span>Clicks by Block</span>
          </h4>
          {analytics.cta_clicks.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold py-6 text-center">No block clicks logged yet.</p>
          ) : (
            <div className="space-y-3">
              {analytics.cta_clicks.map((item) => (
                <div key={item.block_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-mono text-slate-600 font-bold truncate max-w-[200px]" title={item.block_id}>
                    Block: {item.block_id.slice(0, 8)}...
                  </span>
                  <span className="font-black text-slate-900 px-2 py-0.5 rounded-md bg-white border border-slate-200/60 shadow-2xs">
                    {item.clicks} clicks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Submissions */}
        <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Clock size={14} className="text-slate-600" />
            <span>Recent Form Submissions (Latest 8)</span>
          </h4>
          {analytics.recent_submissions.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold py-6 text-center">No form submissions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {analytics.recent_submissions.map((sub) => (
                <div key={sub.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'Recent'}</span>
                    <span className="font-mono">{sub.block_id.slice(0, 8)}</span>
                  </div>
                  <p className="font-bold text-slate-800 line-clamp-2">
                    {Object.entries(sub.data || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' | ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
