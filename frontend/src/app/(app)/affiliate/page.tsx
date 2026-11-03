'use client';

import React, { useState } from 'react';
import {
  Award,
  Copy,
  Check,
  DollarSign,
  Users,
  TrendingUp,
  Share2,
  Landmark
} from 'lucide-react';

export default function AffiliatePage() {
  const [copied, setCopied] = useState(false);
  const referralLink = 'https://viralyzer.io/?ref=alexjohnson';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Partner & Affiliate Program</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Earn 30% recurring monthly commissions for every creator or agency you refer to Viralyzer.
          </p>
        </div>

        <button className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 shadow-md">
          <Landmark size={14} /> Request Payout ($588.00)
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500">Available Balance</span>
          <p className="mt-2 text-2xl font-black text-slate-900">$588.00</p>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
            <TrendingUp size={12} /> Ready to withdraw
          </span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500">Active Paid Referrals</span>
          <p className="mt-2 text-2xl font-black text-slate-900">40 Creators</p>
          <span className="text-[11px] font-medium text-slate-400 mt-1 block">30% lifetime recurring</span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500">Total Lifetime Earnings</span>
          <p className="mt-2 text-2xl font-black text-slate-900">$2,450.00</p>
          <span className="text-[11px] font-semibold text-primary-600 mt-1 block">Since joining program</span>
        </div>
      </div>

      {/* Share Link Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-3">
        <h2 className="text-sm font-black text-slate-900">Your Unique Referral Link</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-mono font-bold text-purple-700 focus:outline-hidden"
          />
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 shrink-0"
          >
            {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
            <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
