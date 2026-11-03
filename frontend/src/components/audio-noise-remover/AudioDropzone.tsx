'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Music, Film, AlertCircle, FileAudio } from 'lucide-react';
import Button from '@/components/ui/Button';

interface AudioDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function AudioDropzone({ onFileSelected, disabled = false }: AudioDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateAndSelect = (file: File) => {
    setError(null);
    const validExtensions = /\.(wav|mp3|m4a|aac|webm|ogg|mp4|mov)$/i;
    const isValidType =
      file.type.startsWith('audio/') ||
      file.type.startsWith('video/') ||
      validExtensions.test(file.name);

    if (!isValidType) {
      setError('Unsupported file type. Please upload an audio file (.wav, .mp3, .m4a, .webm) or video container (.mp4, .mov, .webm).');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError('File exceeds 500 MB limit. Please use a shorter clip for browser-local processing.');
      return;
    }

    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelect(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`relative rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer ${
        isDragging
          ? 'border-primary-500 bg-primary-50/60 shadow-md shadow-primary-500/10 scale-[1.005]'
          : 'border-slate-300/80 bg-white hover:border-primary-400 hover:bg-slate-50/50 shadow-xs'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/mp4,video/webm,video/quicktime,.wav,.mp3,.m4a,.aac,.webm,.ogg,.mp4,.mov"
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 shadow-inner">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Drop your audio or video file here
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            100% browser-local background noise removal & speech enhancement. No data is uploaded to any server.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Music className="w-3.5 h-3.5 text-primary-600" />
            Audio: WAV, MP3, M4A, AAC, WebM
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Film className="w-3.5 h-3.5 text-primary-600" />
            Video: MP4, MOV, WebM
          </span>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            icon={FileAudio}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Browse from Computer
          </Button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
