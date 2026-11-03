'use client';

import React from 'react';
import { LayoutDashboard, TrendingUp, Users, Tv, Film, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Dashboard Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Welcome to Scan My Social — your AI social media growth and scraping studio.
          </p>
        </div>

        <Link
          href="/instagram/channels"
          className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition-all shrink-0"
        >
          <Sparkles size={16} />
          <span>Open Instagram Suite</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tracked Profiles</span>
            <div className="rounded-xl bg-purple-50 p-2 text-primary-600">
              <Tv size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">3</p>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
            <TrendingUp size={12} /> Live Scraping Active
          </span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Localized Reels</span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <Film size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">2,332</p>
          <span className="text-[11px] font-medium text-slate-400 mt-1 block">In local storage</span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">AutoDM Sent</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Users size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">2,760</p>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
            <TrendingUp size={12} /> 98.4% delivery rate
          </span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">AI Scripts Generated</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Sparkles size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">148</p>
          <span className="text-[11px] font-medium text-slate-400 mt-1 block">Ready for production</span>
        </div>
      </div>
    </div>
  );
}
