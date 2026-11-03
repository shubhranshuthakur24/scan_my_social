'use client';

import React from 'react';
import { Sparkles, Film, Info, CheckCircle2, FileText } from 'lucide-react';

export interface WatermarkSidebarInfoProps {
  type?: 'video' | 'image';
}

export default function WatermarkSidebarInfo({ type = 'video' }: WatermarkSidebarInfoProps) {
  const isVideo = type === 'video';

  return (
    <div className="space-y-5">
      {/* 1. Supported Watermarks Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Supported Watermarks</h3>
          </div>
          <span className="text-primary-600" title="Informational guide">
            <Info size={14} />
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          This tool removes specific watermarks to preserve original media quality.
        </p>

        {/* Visual Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Gemini Watermark Visual Card */}
          <div className="space-y-1.5">
            <div className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 border border-slate-800 flex items-center justify-center p-2 shadow-xs group">
              {/* Subtle nebula glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.35)_0%,transparent_70%)]" />
              <div className="relative flex items-center gap-1.5 text-white">
                <Sparkles size={16} className="text-white fill-white shrink-0" />
                <span className="text-xs font-bold tracking-tight">Gemini</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Gemini watermark</p>
              <p className="text-[10px] text-slate-500 leading-tight">
                Sparkle watermark on images/videos
              </p>
            </div>
          </div>

          {/* Veo Text Watermark Visual Card */}
          <div className="space-y-1.5">
            <div className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-t from-slate-900 via-slate-800 to-sky-900 border border-slate-800 flex items-center justify-center p-2 shadow-xs">
              {/* Stylized Mountain Skyline Backdrop */}
              <svg
                viewBox="0 0 100 50"
                className="absolute inset-0 w-full h-full object-cover opacity-35"
                preserveAspectRatio="none"
              >
                <polygon points="0,50 25,20 45,45 65,15 100,50" fill="#cbd5e1" />
                <polygon points="15,50 35,28 55,48 80,18 100,50" fill="#94a3b8" />
              </svg>
              {/* Veo logo in top right */}
              <div className="absolute top-2 right-2 text-white font-black text-xs tracking-wider opacity-90 drop-shadow-xs">
                Veo
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Veo text watermark</p>
              <p className="text-[10px] text-slate-500 leading-tight">
                Text watermark on videos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Important Notes Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3.5">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
          <FileText size={16} className="text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Important Notes</h3>
        </div>

        <ul className="space-y-2.5 text-xs text-slate-600">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={15} className="text-primary-600 fill-primary-50 shrink-0 mt-0.5" />
            <span>Works best with original Gemini and Veo watermarks</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={15} className="text-primary-600 fill-primary-50 shrink-0 mt-0.5" />
            <span>Your file never leaves your device</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={15} className="text-primary-600 fill-primary-50 shrink-0 mt-0.5" />
            <span>
              {isVideo
                ? 'Supports 1080p and 720p videos'
                : 'Supports PNG, JPG, and WebP images up to 25 MB'}
            </span>
          </li>
          {isVideo && (
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={15} className="text-primary-600 fill-primary-50 shrink-0 mt-0.5" />
              <span>Audio is preserved when possible</span>
            </li>
          )}
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={15} className="text-primary-600 fill-primary-50 shrink-0 mt-0.5" />
            <span>Does not remove third-party or custom watermarks</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
