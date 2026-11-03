'use client';

import React from 'react';
import PublicWatermarkShell from '@/components/watermark-remover/PublicWatermarkShell';
import BatchCleanMerge from '@/components/watermark-remover/batch/BatchCleanMerge';
import { Sparkles, Layers } from 'lucide-react';

export default function PublicBatchCleanMergePage() {
  return (
    <PublicWatermarkShell>
      <div className="space-y-8">
        {/* Public Tool Banner Announcement */}
        <div className="rounded-2xl bg-linear-to-r from-primary-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/20 px-3 py-1 text-xs font-bold text-primary-300 border border-primary-400/30">
              <Sparkles size={12} /> 100% Free Batch Video Processing
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <Layers className="text-primary-400" size={28} /> Batch Clean &amp; Merge Videos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Queue up multiple video clips, automatically detect and remove synthetic watermarks, trim clip timestamps, and combine them into a single high-definition MP4 reel — running 100% locally on your machine with WebCodecs hardware acceleration.
            </p>
          </div>

          {/* Decorative Background Glows */}
          <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
          <div className="absolute right-20 -bottom-16 h-48 w-48 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />
        </div>

        {/* The Exact Same BatchCleanMerge Component */}
        <BatchCleanMerge isPublic={true} />
      </div>
    </PublicWatermarkShell>
  );
}
