'use client';

import React from 'react';
import { formatNumber } from '@/lib/format';
import { Zap, Sparkles, TrendingUp, Clock } from 'lucide-react';

interface CreditUsageCardProps {
  subscriptionDetails: any;
  creditsDetails: any;
}

export default function CreditUsageCard({
  subscriptionDetails,
  creditsDetails,
}: CreditUsageCardProps) {
  const balance = creditsDetails?.balance ?? 0;
  const allowance = creditsDetails?.monthly_allowance ?? 0;
  const used = Math.max(0, allowance - balance);
  const percentage = allowance > 0 ? Math.min(100, Math.round((balance / allowance) * 100)) : 0;

  const rawResetDate = subscriptionDetails?.next_credit_reset_at || subscriptionDetails?.ends_at;
  const nextRenewalFormatted = rawResetDate
    ? new Date(rawResetDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : 'N/A';

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">AI Credits & Scraper Usage Overview</h3>
            <p className="text-xs text-slate-500">Track your current billing cycle AI credit allocation and video analysis quota</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 bg-purple-50 px-3.5 py-1.5 rounded-2xl border border-purple-200 text-xs font-bold text-purple-700">
          <Sparkles size={14} className="text-primary-600" />
          <span>Active Tier: <strong className="uppercase">{subscriptionDetails?.tier || 'FREE'}</strong></span>
        </div>
      </div>

      {/* Credit Progress Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">Available Credit Balance</span>
          <span className="font-black text-purple-700">
            {formatNumber(balance)} / {formatNumber(allowance)} Credits ({percentage}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500 shadow-2xs"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Usage breakdown stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Zap size={14} className="text-primary-600" />
            <span>Monthly Allowance</span>
          </div>
          <p className="text-lg font-black text-slate-900">{formatNumber(allowance)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Resets next billing cycle</p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <TrendingUp size={14} className="text-emerald-600" />
            <span>Used This Month</span>
          </div>
          <p className="text-lg font-black text-slate-900">{formatNumber(used)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Scrapes & Script Generations</p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Clock size={14} className="text-amber-600" />
            <span>Next Renewal</span>
          </div>
          <p className="text-lg font-black text-slate-900">{nextRenewalFormatted}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Auto-renews via active subscription</p>
        </div>
      </div>
    </div>
  );
}
