'use client';

import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, Film, Layers, Lock, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';

export interface BatchDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function BatchDropzone({ onFilesSelected, disabled = false }: BatchDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      // Reset input so same files can be re-selected if needed
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
        isDragOver
          ? 'border-primary-500 bg-primary-50/50 scale-[0.995]'
          : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50/60 bg-slate-50/30'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/webm"
        className="sr-only"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 mb-4 shadow-xs">
        <Layers size={28} />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight text-center">
        Select or drag multiple videos here
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 mt-1 text-center max-w-md">
        Clean multiple videos and combine them into one. Processed locally in your browser.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          icon={UploadCloud}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) inputRef.current?.click();
          }}
          disabled={disabled}
        >
          Select Videos
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Film size={13} className="text-slate-400" />
          MP4, MOV, WebM
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <Lock size={13} className="text-emerald-500" />
          100% in-browser privacy
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-primary-500" />
          Up to 100 MB total output
        </span>
      </div>
    </div>
  );
}
