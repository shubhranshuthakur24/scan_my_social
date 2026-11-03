'use client';

import React from 'react';
import { Film, Layers, Image as ImageIcon, Sparkles } from 'lucide-react';

export type MediaFormat = 'reel' | 'carousel' | 'image' | 'story';

export interface SchedulerFormatCardProps {
  format: MediaFormat;
  setFormat: (fmt: MediaFormat) => void;
  className?: string;
}

const FORMAT_OPTIONS = [
  { id: 'reel' as const, name: 'Instagram Reel', ratio: '9:16 Vertical', icon: Film, desc: 'Short-form viral video' },
  { id: 'carousel' as const, name: 'Carousel Post', ratio: '4:5 Portrait', icon: Layers, desc: 'Multi-slide sequence' },
  { id: 'image' as const, name: 'Single Photo', ratio: '1:1 or 4:5', icon: ImageIcon, desc: 'High-res image post' },
  { id: 'story' as const, name: 'Story Broadcast', ratio: '9:16 Fullscreen', icon: Sparkles, desc: '24h temporary post' },
];

export default function SchedulerFormatCard({
  format,
  setFormat,
  className = '',
}: SchedulerFormatCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
          1. Select Media Format
        </span>
        <span className="text-xs font-bold text-primary-600">Auto-Optimized Dimensions</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FORMAT_OPTIONS.map((fmt) => {
          const isSelected = format === fmt.id;
          const IconComponent = fmt.icon;
          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => setFormat(fmt.id)}
              className={`flex flex-col items-start justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-primary-600 bg-primary-50/60 ring-2 ring-primary-600/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                  isSelected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <IconComponent size={16} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">{fmt.name}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{fmt.ratio}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
