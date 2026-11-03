'use client';

import React, { useState, useRef, useCallback } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Columns, Split, ZoomIn, ZoomOut } from 'lucide-react';

export interface ImageComparisonSliderProps {
  originalUrl: string;
  cleanedUrl: string;
  detectionPosition?: { x: number; y: number };
}

export default function ImageComparisonSlider({
  originalUrl,
  cleanedUrl,
  detectionPosition,
}: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.round((x / rect.width) * 1000) / 10;
    setSliderPosition(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updatePosition(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  return (
    <div className="space-y-3">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <Button
            variant={viewMode === 'slider' ? 'primary' : 'ghost'}
            size="xs"
            icon={Split}
            onClick={() => setViewMode('slider')}
          >
            Split Slider
          </Button>
          <Button
            variant={viewMode === 'side-by-side' ? 'primary' : 'ghost'}
            size="xs"
            icon={Columns}
            onClick={() => setViewMode('side-by-side')}
          >
            Side by Side
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            icon={isZoomed ? ZoomOut : ZoomIn}
            onClick={() => setIsZoomed((prev) => !prev)}
            className="text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300"
          >
            {isZoomed ? 'Reset Scale' : 'Inspect Watermark Region'}
          </Button>
        </div>
      </div>

      {/* MODE 1: INTERACTIVE SPLIT-SCREEN SLIDER */}
      {viewMode === 'slider' && (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerMove={handlePointerMove}
          className="relative select-none overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 h-[440px] sm:h-[500px] cursor-ew-resize flex items-center justify-center shadow-xs"
          style={{ touchAction: 'none' }}
        >
          {/* Ambient Blurred Backdrop */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cleanedUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
            aria-hidden="true"
          />

          {/* Cleaned Image (Base Layer - Revealed on the Right) */}
          <div
            className={`relative z-1 w-full h-full flex items-center justify-center transition-transform duration-200 ${
              isZoomed ? 'origin-bottom-right scale-[2.2]' : ''
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cleanedUrl}
              alt="Cleaned AI image"
              className="w-full h-full object-contain block pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Original Image (Overlay Layer - Clipped to the Left side) */}
          <div
            className={`absolute inset-0 z-2 w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-200 ${
              isZoomed ? 'origin-bottom-right scale-[2.2]' : ''
            }`}
            style={{
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
              WebkitClipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalUrl}
              alt="Original AI image with watermark"
              className="w-full h-full object-contain block"
              draggable={false}
            />
          </div>

          {/* Divider Handle Line */}
          <div
            className="absolute top-0 bottom-0 z-20 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-800 shadow-md flex items-center justify-center border border-slate-200 text-xs font-bold transition-transform group-hover:scale-105">
              ⇄
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 z-30 pointer-events-none">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/85 text-white backdrop-blur-xs shadow-xs border border-white/10">
              Original
            </span>
          </div>
          <div className="absolute top-3 right-3 z-30 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600/90 text-white backdrop-blur-xs shadow-xs border border-emerald-400/30">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Cleaned
            </span>
          </div>

          {/* Instruction helper */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none opacity-90">
            <span className="text-[11px] font-medium bg-slate-900/80 text-white px-3 py-1 rounded-full backdrop-blur-xs shadow-xs">
              Drag slider to compare
            </span>
          </div>
        </div>
      )}

      {/* MODE 2: SIDE-BY-SIDE GRID */}
      {viewMode === 'side-by-side' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-950 flex items-center justify-center shadow-xs h-[380px] sm:h-[440px]">
            {/* Ambient Blurred Backdrop */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
              aria-hidden="true"
            />
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/85 text-white backdrop-blur-xs shadow-xs border border-white/10">
                Original (Watermarked)
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalUrl}
              alt="Original image"
              className="relative z-1 w-full h-full object-contain"
            />
          </div>

          <div className="relative rounded-2xl border border-emerald-300/80 overflow-hidden bg-slate-950 flex items-center justify-center shadow-xs h-[380px] sm:h-[440px]">
            {/* Ambient Blurred Backdrop */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cleanedUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
              aria-hidden="true"
            />
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600/90 text-white backdrop-blur-xs shadow-xs border border-emerald-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Cleaned (Restored)
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cleanedUrl}
              alt="Cleaned image"
              className="relative z-1 w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
