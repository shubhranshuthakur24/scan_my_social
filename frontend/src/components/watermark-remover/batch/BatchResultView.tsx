'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  Download,
  Calendar,
  RotateCcw,
  CheckCircle2,
  HardDrive,
  Clock,
  Sparkles,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { useMediaHandoffStore } from '@/lib/store/useMediaHandoffStore';
import { BatchVideoItem } from '@/lib/watermark/batch/batchTypes';

export interface BatchResultViewProps {
  mergedFile: File;
  mergedUrl: string;
  items: BatchVideoItem[];
  onReset: () => void;
  onReturnToEditor: () => void;
}

export default function BatchResultView({
  mergedFile,
  mergedUrl,
  items,
  onReset,
  onReturnToEditor,
}: BatchResultViewProps) {
  const router = useRouter();

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = mergedUrl;
    a.download = mergedFile.name || 'merged_cleaned_video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendToScheduler = () => {
    // Set pending file in Zustand handoff store with targetFormat 'reel'
    useMediaHandoffStore.getState().setPendingFile(mergedFile, 'reel');
    // Navigate via client-side router
    router.push('/instagram/calendar/scheduler?type=reel&handoff=1');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Stats
  const totalClips = items.length;
  const watermarksCleaned = items.filter(
    (i) =>
      i.processingPath === 'clean' ||
      i.processingPath === 'trim_and_clean' ||
      (i.watermarkDecision === 'detected' && i.status === 'completed')
  ).length;
  const originalKeptCount = Math.max(0, totalClips - watermarksCleaned);
  const totalRuntime = items.reduce((acc, i) => {
    if (i.trimRange) {
      return acc + Math.max(0, i.trimRange.end - i.trimRange.start);
    }
    return acc + (i.metadata?.duration || 0);
  }, 0);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5">
      {/* Success Banner */}
      <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
          <CheckCircle2 size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm sm:text-base font-bold leading-tight">
            Batch Video Workbench Complete
          </h4>
          <p className="text-xs text-emerald-700 mt-0.5">
            {totalClips} clips combined into a single continuous MP4 • {watermarksCleaned} watermark{watermarksCleaned !== 1 ? 's' : ''} cleaned • {originalKeptCount} original clip{originalKeptCount !== 1 ? 's' : ''} preserved
          </p>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-16/9 flex items-center justify-center border border-slate-200/80 shadow-xs">
        <video
          src={mergedUrl}
          controls
          playsInline
          className="w-full h-full object-contain"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <Layers size={13} className="text-primary-600" />
            Clips Merged
          </div>
          <p className="text-base font-bold text-slate-900">{totalClips} Videos</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <Sparkles size={13} className="text-emerald-600" />
            Watermarks
          </div>
          <p className="text-base font-bold text-slate-900">{watermarksCleaned} Cleaned</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <CheckCircle2 size={13} className="text-slate-600" />
            Originals Kept
          </div>
          <p className="text-base font-bold text-slate-900">{originalKeptCount} Preserved</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <Clock size={13} className="text-slate-500" />
            Runtime
          </div>
          <p className="text-base font-bold text-slate-900">{formatDuration(totalRuntime)}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <HardDrive size={13} className="text-slate-500" />
            Final Size
          </div>
          <p className="text-base font-bold text-slate-900">{formatFileSize(mergedFile.size)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={SlidersHorizontal}
            onClick={onReturnToEditor}
            className="text-primary-700 border-primary-200 bg-primary-50/60 hover:bg-primary-50 hover:border-primary-300 font-semibold"
          >
            Edit Sequence &amp; Trims
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={onReset}
          >
            Process Another Batch
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Calendar}
            onClick={handleSendToScheduler}
          >
            Send to Scheduler
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Download}
            onClick={handleDownload}
          >
            Download Clean Video
          </Button>
        </div>
      </div>
    </div>
  );
}
