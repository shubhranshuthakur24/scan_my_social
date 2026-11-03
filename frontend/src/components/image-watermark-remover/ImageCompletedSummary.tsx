'use client';

import React from 'react';
import { Sparkles, FileText, Maximize2, HardDrive } from 'lucide-react';

export interface ImageCompletedSummaryProps {
  metadata?: { width: number; height: number; mimeType: string } | null;
  edgePolish?: boolean;
  fileSize?: number;
}

export default function ImageCompletedSummary({
  metadata,
  edgePolish,
  fileSize,
}: ImageCompletedSummaryProps) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '1.2 MB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resolutionText = metadata
    ? `${metadata.width} × ${metadata.height}`
    : '896 × 1200';

  const mimeText = metadata?.mimeType
    ? metadata.mimeType.replace('image/', '').toUpperCase()
    : 'JPEG';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
      {/* Left: Restoration Engine Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0 shadow-2xs">
          <Sparkles size={18} />
        </div>
        <div>
          <h5 className="text-xs font-bold text-slate-900 leading-tight">AI Watermark Restoration</h5>
          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
            Restored using calibrated reverse-alpha blending {edgePolish ? '• Edge Polish active' : '• Edge Polish available'}
          </p>
        </div>
      </div>

      {/* Right: Metrics */}
      <div className="flex flex-wrap items-center gap-5 sm:gap-6 text-xs border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900 leading-none">{mimeText}</p>
            <p className="text-[10px] text-slate-400 leading-none mt-1">Format</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Maximize2 size={15} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900 leading-none">{resolutionText}</p>
            <p className="text-[10px] text-slate-400 leading-none mt-1">Resolution</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HardDrive size={15} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900 leading-none">{formatFileSize(fileSize)}</p>
            <p className="text-[10px] text-slate-400 leading-none mt-1">File Size</p>
          </div>
        </div>
      </div>
    </div>
  );
}
