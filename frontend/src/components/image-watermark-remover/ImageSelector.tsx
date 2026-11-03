'use client';

import React, { useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { UploadCloud, Image as ImageIcon, Lock } from 'lucide-react';

export interface ImageSelectorProps {
  onSelectFile: (file: File) => void;
  isLoading?: boolean;
}

export default function ImageSelector({ onSelectFile, isLoading = false }: ImageSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label="Upload image file"
      className={`rounded-2xl border-2 border-dashed transition-all p-8 sm:p-12 text-center cursor-pointer flex flex-col items-center justify-center gap-3.5 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 ${
        isDragging
          ? 'border-primary-500 bg-primary-50/50 scale-[0.99]'
          : 'border-primary-200/90 bg-primary-50/20 hover:bg-primary-50/40 hover:border-primary-300'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-14 h-14 rounded-2xl bg-white border border-primary-200/80 text-primary-600 flex items-center justify-center shadow-2xs">
        <ImageIcon size={26} className="text-primary-600" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900">
          Select an image to get started
        </h3>
        <p className="text-xs text-slate-500">
          Supports PNG, JPG, and WebP up to 25 MB
        </p>
      </div>

      <div className="pt-1 flex flex-col items-center gap-2">
        <Button
          variant="primary"
          size="md"
          icon={UploadCloud}
          loading={isLoading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          Choose Image File
        </Button>
        <span className="text-xs text-slate-400 font-medium">or drag and drop your file here</span>
      </div>

      <div className="pt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <Lock size={12} className="text-slate-400 shrink-0" />
        <span>Processed locally in your browser. Your media isn&apos;t uploaded for watermark removal.</span>
      </div>
    </div>
  );
}
