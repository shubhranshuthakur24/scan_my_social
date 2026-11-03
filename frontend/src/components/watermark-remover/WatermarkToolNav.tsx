'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, Image as ImageIcon, Layers } from 'lucide-react';

export default function WatermarkToolNav() {
  const pathname = usePathname();
  const isBatch = pathname?.includes('/video-tools/watermark-remover/batch');
  const isVideo = !isBatch && pathname?.includes('/video-tools/watermark-remover');
  const isImage = pathname?.includes('/image-tools/watermark-remover');

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 mb-6">
      <Link
        href="/video-tools/watermark-remover"
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isVideo
            ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/70'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
        }`}
      >
        <Film size={14} className={isVideo ? 'text-primary-600' : 'text-slate-400'} />
        <span>Video Remover</span>
      </Link>

      <Link
        href="/image-tools/watermark-remover"
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isImage
            ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/70'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
        }`}
      >
        <ImageIcon size={14} className={isImage ? 'text-primary-600' : 'text-slate-400'} />
        <span>Image Remover</span>
      </Link>

      <Link
        href="/video-tools/watermark-remover/batch"
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isBatch
            ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/70'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
        }`}
      >
        <Layers size={14} className={isBatch ? 'text-primary-600' : 'text-slate-400'} />
        <span>Batch Clean &amp; Merge</span>
      </Link>
    </div>
  );
}
