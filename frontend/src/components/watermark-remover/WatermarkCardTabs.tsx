'use client';

import React from 'react';
import Link from 'next/link';
import { Film, Image as ImageIcon, Layers } from 'lucide-react';

export interface WatermarkCardTabsProps {
  active: 'video' | 'image' | 'batch';
  isPublic?: boolean;
}

export default function WatermarkCardTabs({ active, isPublic = false }: WatermarkCardTabsProps) {
  const isVideo = active === 'video';
  const isImage = active === 'image';
  const isBatch = active === 'batch';

  const videoHref = isPublic ? '/tools/watermark-remover' : '/video-tools/watermark-remover';
  const imageHref = isPublic ? '/tools/watermark-remover/image' : '/image-tools/watermark-remover';
  const batchHref = isPublic ? '/tools/watermark-remover/batch' : '/video-tools/watermark-remover/batch';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* Video Cleanup Tab Card */}
      <Link
        href={videoHref}
        className={`relative flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
          isVideo
            ? 'bg-primary-600 border-primary-600 text-white shadow-xs ring-2 ring-primary-500/20'
            : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            isVideo ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Film size={20} />
        </div>
        <div className="min-w-0">
          <h3
            className={`text-sm sm:text-base font-bold tracking-tight leading-snug ${
              isVideo ? 'text-white' : 'text-slate-900'
            }`}
          >
            Video Cleanup
          </h3>
          <p
            className={`text-xs leading-snug mt-0.5 truncate ${
              isVideo ? 'text-primary-100' : 'text-slate-500'
            }`}
          >
            Remove watermarks from videos
          </p>
        </div>
      </Link>

      {/* Image Cleanup Tab Card */}
      <Link
        href={imageHref}
        className={`relative flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
          isImage
            ? 'bg-primary-600 border-primary-600 text-white shadow-xs ring-2 ring-primary-500/20'
            : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            isImage ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <ImageIcon size={20} />
        </div>
        <div className="min-w-0">
          <h3
            className={`text-sm sm:text-base font-bold tracking-tight leading-snug ${
              isImage ? 'text-white' : 'text-slate-900'
            }`}
          >
            Image Cleanup
          </h3>
          <p
            className={`text-xs leading-snug mt-0.5 truncate ${
              isImage ? 'text-primary-100' : 'text-slate-500'
            }`}
          >
            Remove watermarks from images
          </p>
        </div>
      </Link>

      {/* Batch Clean & Merge Tab Card */}
      <Link
        href={batchHref}
        className={`relative flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
          isBatch
            ? 'bg-primary-600 border-primary-600 text-white shadow-xs ring-2 ring-primary-500/20'
            : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
        }`}
      >
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            isBatch ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Layers size={20} />
        </div>
        <div className="min-w-0">
          <h3
            className={`text-sm sm:text-base font-bold tracking-tight leading-snug ${
              isBatch ? 'text-white' : 'text-slate-900'
            }`}
          >
            Batch Clean &amp; Merge
          </h3>
          <p
            className={`text-xs leading-snug mt-0.5 truncate ${
              isBatch ? 'text-primary-100' : 'text-slate-500'
            }`}
          >
            Clean multiple videos and combine
          </p>
        </div>
      </Link>
    </div>
  );
}
