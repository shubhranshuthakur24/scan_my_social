'use client';

import React, { useState } from 'react';
import { Clock, Maximize2, Film, HardDrive, RotateCcw, Play } from 'lucide-react';
import Button from '@/components/ui/Button';
import { VideoMetadata } from '@/lib/watermark/types';

export interface VideoMetadataPreviewProps {
  file: File | null;
  videoUrl: string | null;
  metadata: VideoMetadata | null;
  onChangeFile?: () => void;
  disabled?: boolean;
}

export default function VideoMetadataPreview({
  file,
  videoUrl,
  metadata,
  onChangeFile,
  disabled = false,
}: VideoMetadataPreviewProps) {
  const [localDimensions, setLocalDimensions] = useState<{ width: number; height: number; duration: number } | null>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.videoWidth && v.videoHeight) {
      setLocalDimensions({
        width: v.videoWidth,
        height: v.videoHeight,
        duration: v.duration || 0,
      });
    }
  };

  const displayWidth = metadata?.width || localDimensions?.width;
  const displayHeight = metadata?.height || localDimensions?.height;
  const displayDuration = metadata?.duration ?? localDimensions?.duration;
  const frameCount = metadata?.frameCountEstimate;
  const frameRate = metadata?.frameRate;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-2xs">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Thumbnail Preview Tile with Play Overlay */}
        <div className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 shadow-2xs group flex items-center justify-center">
          {videoUrl && (
            <video
              src={videoUrl}
              preload="metadata"
              muted
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
          )}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-xs">
              <Play size={11} className="fill-white translate-x-0.2" />
            </div>
          </div>
        </div>

        {/* Video Info Details */}
        <div className="min-w-0 space-y-1 flex-1">
          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
            {file?.name || 'Uploaded Video'}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[11px] text-slate-500">
            {displayDuration !== undefined && displayDuration > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <Clock size={12} className="text-slate-400 shrink-0" />
                {displayDuration.toFixed(2)}s
              </span>
            )}

            {displayWidth && displayHeight && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <Maximize2 size={12} className="text-slate-400 shrink-0" />
                {displayWidth} × {displayHeight}
              </span>
            )}

            {frameCount ? (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <Film size={12} className="text-slate-400 shrink-0" />
                {frameCount} frames
              </span>
            ) : frameRate ? (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <Film size={12} className="text-slate-400 shrink-0" />
                {Math.round(frameRate)} fps
              </span>
            ) : null}

            {file?.size && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <HardDrive size={12} className="text-slate-400 shrink-0" />
                {formatFileSize(file.size)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Change File Action */}
      {onChangeFile && (
        <div className="self-end sm:self-center shrink-0">
          <Button
            variant="outline"
            size="xs"
            icon={RotateCcw}
            onClick={onChangeFile}
            disabled={disabled}
            className="text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs"
          >
            Change File
          </Button>
        </div>
      )}
    </div>
  );
}
