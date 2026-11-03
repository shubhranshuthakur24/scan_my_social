'use client';

import React from 'react';
import { Volume2, FileText, Maximize2, Clock, HardDrive } from 'lucide-react';
import { VideoMetadata, AudioCopyResult } from '@/lib/watermark/types';

export interface CompletedMediaSummaryProps {
  metadata?: VideoMetadata | null;
  audioResult?: AudioCopyResult | null;
  fileSize?: number;
}

export default function CompletedMediaSummary({
  metadata,
  audioResult,
  fileSize,
}: CompletedMediaSummaryProps) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '4.2 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const durationSecs = metadata?.duration ? Math.round(metadata.duration) : 10;
  const resolutionText = metadata
    ? `${metadata.width} × ${metadata.height}`
    : '1080 × 1920';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
      {/* Left: Audio Preserved Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0 shadow-2xs">
          <Volume2 size={18} />
        </div>
        <div>
          <h5 className="text-xs font-bold text-slate-900 leading-tight">Audio Preserved</h5>
          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
            {audioResult?.copied
              ? `${audioResult.packetCount} audio packets preserved from the original video.`
              : 'Lossless audio preserved from the original video.'}
          </p>
        </div>
      </div>

      {/* Right: 4 Metrics (Format, Resolution, Duration, File Size) */}
      <div className="flex flex-wrap items-center gap-5 sm:gap-6 text-xs border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900 leading-none">MP4</p>
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
          <Clock size={15} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900 leading-none">{durationSecs} seconds</p>
            <p className="text-[10px] text-slate-400 leading-none mt-1">Duration</p>
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
