'use client';

import React from 'react';
import {
  FileCode,
  TrendingUp,
  Flame,
  Search,
  Sparkles,
  BarChart3,
  Layers
} from 'lucide-react';

interface AnglePattern {
  id: string;
  patternName: string;
  niche: string;
  averageViews: string;
  retentionAt3s: number;
  sampleHook: string;
}

const mockPatterns: AnglePattern[] = [
  {
    id: 'pat-1',
    patternName: 'The "Nobody is talking about this" Angle',
    niche: 'Tech & Productivity',
    averageViews: '420K',
    retentionAt3s: 78.4,
    sampleHook: 'Nobody is talking about this new Google Deepmind update that changes how everyone builds apps.',
  },
  {
    id: 'pat-2',
    patternName: 'The Reverse Logic Paradox',
    niche: 'Fitness & Health',
    averageViews: '850K',
    retentionAt3s: 82.1,
    sampleHook: 'Eating 3 meals a day is ruining your morning focus. Here is why elite athletes fast until 1 PM.',
  },
  {
    id: 'pat-3',
    patternName: 'The "Cost Me $10,000 to Learn" Angle',
    niche: 'Business & Investing',
    averageViews: '610K',
    retentionAt3s: 75.9,
    sampleHook: 'It took me 4 failed startups and $30k in credit card debt to realize this one truth about product pricing.',
  },
];

export default function ScriptIntelligencePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Script Intelligence & Hook Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-channel viral retention patterns aggregated from over 10,000+ scraped creator reels.
          </p>
        </div>

        <div className="rounded-xl bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 border border-purple-200">
          Scraped Sample: 12,480 Reels
        </div>
      </div>

      {/* Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {mockPatterns.map((pat) => (
          <div
            key={pat.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-purple-50 px-2 py-0.5 rounded-md">
                  {pat.niche}
                </span>
                <span className="flex items-center gap-1 text-xs font-black text-emerald-600">
                  <Flame size={14} className="fill-emerald-500" /> {pat.retentionAt3s}% Retention
                </span>
              </div>

              <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{pat.patternName}</h3>

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 italic border border-slate-100">
                "{pat.sampleHook}"
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Avg Views: <strong className="text-slate-800">{pat.averageViews}</strong></span>
              <span className="text-primary-600 font-bold hover:underline cursor-pointer">Explore Reels →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
