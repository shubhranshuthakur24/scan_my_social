'use client';

import React from 'react';
import { Loader2, CheckCircle2, ShieldCheck, Sparkles, Quote } from 'lucide-react';

export interface AnalyzingMediaProgressProps {
  progress?: number; // 0 to 1
  type?: 'video' | 'image';
}

export default function AnalyzingMediaProgress({
  progress = 0.4,
  type = 'video',
}: AnalyzingMediaProgressProps) {
  const isVideo = type === 'video';
  const displayProgress = Math.max(15, Math.min(95, Math.round(progress * 100)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200/90 bg-slate-50/50 shadow-2xs">
      {/* Left Progress Section (8 cols) */}
      <div className="lg:col-span-8 flex flex-col justify-center space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0 mt-0.5">
            <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {isVideo ? 'Analyzing your video...' : 'Analyzing your image...'}
            </h4>
            <p className="text-xs text-slate-500">
              {isVideo
                ? 'Sampling 3 frames for supported Gemini and Veo watermark patterns'
                : 'Scanning image regions for supported Gemini watermark patterns'}
            </p>
          </div>
        </div>

        {/* Animated Brand Progress Bar */}
        <div className="w-full space-y-1.5 pt-1">
          <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>

        {/* 3 Step Indicators */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5 text-primary-700">
            <Sparkles size={13} className="text-primary-600 shrink-0" />
            <span>{isVideo ? 'Checking video frames' : 'Checking image layers'}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <CheckCircle2 size={13} className="text-slate-400 shrink-0" />
            <span>Detecting watermark position</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck size={13} className="text-slate-400 shrink-0" />
            <span>Verifying model compatibility</span>
          </div>
        </div>
      </div>

      {/* Right 100% Private Callout Card (4 cols) */}
      <div className="lg:col-span-4 rounded-xl border border-primary-100 bg-primary-50/50 p-3.5 sm:p-4 flex items-start gap-2.5 self-center shadow-2xs">
        <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
          <Quote size={14} className="fill-primary-600" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <h5 className="text-xs font-bold text-slate-900 tracking-tight">
            &ldquo;100% Private&rdquo;
          </h5>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Your {isVideo ? 'video' : 'image'} is analyzed locally in your browser. Nothing is uploaded to any server.
          </p>
        </div>
      </div>
    </div>
  );
}
