'use client';

import React from 'react';
import { Zap, Info } from 'lucide-react';

export interface AutoDmSchedulerCardProps {
  hasAutodm: boolean;
  setHasAutodm: (val: boolean) => void;
  autodmKeyword: string;
  setAutodmKeyword: (val: string) => void;
  autodmReplyText: string;
  setAutodmReplyText: (val: string) => void;
  className?: string;
}

export default function AutoDmSchedulerCard({
  hasAutodm,
  setHasAutodm,
  autodmKeyword,
  setAutodmKeyword,
  autodmReplyText,
  setAutodmReplyText,
  className = '',
}: AutoDmSchedulerCardProps) {
  return (
    <div className={`rounded-2xl border border-emerald-200/80 bg-linear-to-br from-white to-emerald-50/30 p-5 shadow-2xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Zap size={16} className="fill-emerald-600" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">AutoDM Conversion Automation</h4>
            <p className="text-[10px] text-slate-500 font-semibold">Auto-send DMs when viewers comment a specific keyword</p>
          </div>
        </div>

        {/* Switch Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={hasAutodm}
          onClick={() => setHasAutodm(!hasAutodm)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${hasAutodm ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hasAutodm ? 'translate-x-5' : 'translate-x-0'
              }`}
          />
        </button>
      </div>

      {hasAutodm && (
        <div className="space-y-3 pt-3 border-t border-emerald-100 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block mb-1">
                Trigger Keyword
              </label>
              <input
                type="text"
                value={autodmKeyword}
                onChange={(e) => setAutodmKeyword(e.target.value.toUpperCase())}
                placeholder="e.g. TOOLS"
                className="w-full uppercase font-mono font-black text-xs px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block mb-1">
                Direct Message Payload
              </label>
              <input
                type="text"
                value={autodmReplyText}
                onChange={(e) => setAutodmReplyText(e.target.value)}
                placeholder="DM link and message..."
                className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-emerald-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="rounded-xl bg-emerald-100/60 p-2.5 text-[11px] font-bold text-emerald-900 flex items-center gap-2">
            <Info size={14} className="shrink-0 text-emerald-700" />
            <span>When anyone comments <strong>"{autodmKeyword}"</strong>, Scan My Social will instantly deliver your direct link within 5 seconds.</span>
          </div>
        </div>
      )}
    </div>
  );
}
