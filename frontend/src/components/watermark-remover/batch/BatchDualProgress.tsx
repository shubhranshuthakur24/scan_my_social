'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { X, Sparkles, Film, HardDrive } from 'lucide-react';

export interface BatchDualProgressProps {
  activeItemIndex: number;
  totalItems: number;
  activeItemName: string;
  overallProgress: number; // 0 to 1
  activeProgress: {
    phase: string;
    progress: number;
    currentFrame: number;
    totalFrames: number;
    elapsedSeconds: number;
  };
  writtenBytes: number;
  onCancel: () => void;
}

export default function BatchDualProgress({
  activeItemIndex,
  totalItems,
  activeItemName,
  overallProgress,
  activeProgress,
  writtenBytes,
  onCancel,
}: BatchDualProgressProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'extract':
        return 'Extracting Frames';
      case 'unblend':
        return 'Unblending Watermark';
      case 'encode':
        return 'Encoding Clean Video';
      case 'feeding':
        return 'Stitching Packets into Output';
      case 'finalizing':
        return 'Finalizing Merged MP4';
      default:
        return 'Processing Clip';
    }
  };

  const currentPercent = Math.min(100, Math.round((activeProgress.progress || 0) * 100));
  const batchPercent = Math.min(100, Math.round((overallProgress || 0) * 100));

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-primary-100 bg-primary-50/40 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Video {activeItemIndex + 1} of {totalItems}: {activeItemName}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>{getPhaseLabel(activeProgress.phase)}</span>
              {activeProgress.totalFrames > 0 && activeProgress.currentFrame > 0 ? (
                <>
                  <span>•</span>
                  <span>
                    Frame {activeProgress.currentFrame} of {activeProgress.totalFrames}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          icon={X}
          onClick={onCancel}
          className="text-slate-500 hover:text-rose-600 hover:border-rose-300"
        >
          Cancel Batch
        </Button>
      </div>

      {/* Progress Bars Container */}
      <div className="space-y-3 pt-1">
        {/* Current Clip Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700">Current Clip Progress</span>
            <span className="font-mono text-slate-500">{currentPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${currentPercent}%` }}
            />
          </div>
        </div>

        {/* Overall Batch Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-900">Total Batch Progress</span>
            <span className="font-mono font-bold text-primary-700">{batchPercent}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-200/80 overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-300 ease-out shadow-xs"
              style={{ width: `${batchPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-primary-100/60 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Film size={12} className="text-slate-400" />
          <span>Sequentially cleaned &amp; merged locally in-browser</span>
        </div>
        {writtenBytes > 0 && (
          <div className="flex items-center gap-1 font-mono text-slate-600">
            <HardDrive size={12} className="text-slate-400" />
            <span>Output: {formatFileSize(writtenBytes)} / 100 MB max</span>
          </div>
        )}
      </div>
    </div>
  );
}
