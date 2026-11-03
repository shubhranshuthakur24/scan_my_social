'use client';

import React from 'react';
import PublicWatermarkShell from '@/components/watermark-remover/PublicWatermarkShell';
import WatermarkRemover from '@/components/watermark-remover/WatermarkRemover';
import { Sparkles } from 'lucide-react';

export default function PublicWatermarkRemoverPage() {
  return (
    <PublicWatermarkShell>
      <div className="space-y-8">
        {/* Public Tool Banner Announcement */}
        <div className="rounded-2xl bg-linear-to-r from-primary-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/20 px-3 py-1 text-xs font-bold text-primary-300 border border-primary-400/30">
              <Sparkles size={12} /> 100% Free Video Watermark Cleaner
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              AI Video Watermark Remover
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Eliminate synthetic watermarks from Gemini, Google Veo, and other generative video engines. All processing executes 100% locally in your browser with WebCodecs hardware acceleration — zero server uploads, complete privacy, and zero video compression loss.
            </p>
          </div>

          {/* Decorative Background Glows */}
          <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
          <div className="absolute right-20 -bottom-16 h-48 w-48 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />
        </div>

        {/* The Exact Same WatermarkRemover Component */}
        <WatermarkRemover isPublic={true} />
      </div>
    </PublicWatermarkShell>
  );
}
