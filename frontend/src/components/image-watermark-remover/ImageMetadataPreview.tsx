'use client';

import React, { useState } from 'react';
import { Maximize2, HardDrive, RotateCcw, ImageIcon } from 'lucide-react';
import Button from '@/components/ui/Button';

export interface ImageMetadataPreviewProps {
  file: File | null;
  imageUrl: string | null;
  metadata: { width: number; height: number; mimeType: string } | null;
  onChangeFile?: () => void;
  disabled?: boolean;
}

export default function ImageMetadataPreview({
  file,
  imageUrl,
  metadata,
  onChangeFile,
  disabled = false,
}: ImageMetadataPreviewProps) {
  const [localDimensions, setLocalDimensions] = useState<{ width: number; height: number } | null>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleLoadedImage = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setLocalDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    }
  };

  const displayWidth = metadata?.width || localDimensions?.width;
  const displayHeight = metadata?.height || localDimensions?.height;
  const mimeType = metadata?.mimeType?.replace('image/', '').toUpperCase() || file?.type?.replace('image/', '').toUpperCase() || 'IMAGE';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-2xs">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Thumbnail Preview Tile */}
        <div className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 shadow-2xs group flex items-center justify-center">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={file?.name || 'Preview'}
              onLoad={handleLoadedImage}
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <ImageIcon size={20} className="text-slate-400" />
          )}
        </div>

        {/* Image Info Details */}
        <div className="min-w-0 space-y-1 flex-1">
          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
            {file?.name || 'Uploaded Image'}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[11px] text-slate-500">
            {displayWidth && displayHeight && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <Maximize2 size={12} className="text-slate-400 shrink-0" />
                {displayWidth} × {displayHeight}
              </span>
            )}

            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              {mimeType}
            </span>

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
