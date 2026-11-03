'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { BatchVideoItem, VideoTrimRange } from '@/lib/watermark/batch/batchTypes';
import { ClipTimelineSegment } from '@/lib/watermark/batch/timelineProjection';
import { snapTimeToFrame } from '@/lib/watermark/batch/framePrecision';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  extractVideoThumbnail,
  getCachedVideoThumbnail,
} from '@/lib/watermark/batch/videoThumbnail';

export interface TimelineClipItemProps {
  item: BatchVideoItem;
  segment?: ClipTimelineSegment;
  partNumber?: number | null;
  fps?: number | null;
  index: number;
  isSelected: boolean;
  zoom: number; // pixels per second
  onSelect: () => void;
  onTrimCommit: (id: string, range: VideoTrimRange) => void;
  onTrimPreview: (timestamp: number) => void;
  onTrimDragStateChange?: (isDragging: boolean) => void;
  onRemove: (id: string) => void;
  onResolveUncertain: (id: string, resolution: 'force_clean' | 'keep_original') => void;
  isLocked: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export default function TimelineClipItem({
  item,
  segment,
  partNumber,
  fps,
  index,
  isSelected,
  zoom,
  onSelect,
  onTrimCommit,
  onTrimPreview,
  onTrimDragStateChange,
  onRemove,
  onResolveUncertain,
  isLocked,
  dragHandleProps,
}: TimelineClipItemProps) {
  const totalDuration = item.metadata?.duration || 1;
  const committedTrimStart = segment?.sourceTrimStart ?? item.trimRange?.start ?? 0;
  const committedTrimEnd = segment?.sourceTrimEnd ?? item.trimRange?.end ?? totalDuration;
  const committedDuration = Math.max(0.04, committedTrimEnd - committedTrimStart);

  const minLimit = segment?.minSourceLimit ?? 0;
  const maxLimit = segment?.maxSourceLimit ?? totalDuration;

  // Width in pixels strictly based on COMMITTED duration to prevent downstream clip jitter during dragging
  const clipWidthPx = Math.max(1, committedDuration * zoom);

  // Thumbnail for continuous NLE filmstrip
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => getCachedVideoThumbnail(item.id) || null);

  useEffect(() => {
    let isMounted = true;
    if (!thumbnailUrl && item.previewUrl) {
      extractVideoThumbnail(item.id, item.previewUrl).then((url) => {
        if (isMounted && url) {
          setThumbnailUrl(url);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [item.id, item.previewUrl, thumbnailUrl]);

  // Compute frame cell geometry preserving source video aspect ratio
  const aspect =
    item.metadata?.width && item.metadata?.height
      ? item.metadata.width / item.metadata.height
      : 9 / 16;
  const pixelsPerFrame = fps && fps > 0 ? zoom / fps : null;
  const isFramePrecision = pixelsPerFrame !== null && pixelsPerFrame >= 18;
  const frameWidthPx =
    isFramePrecision && pixelsPerFrame
      ? pixelsPerFrame
      : Math.max(36, Math.min(128, Math.round(72 * aspect)));
  const frameCount = Math.max(1, Math.ceil(clipWidthPx / frameWidthPx));

  // Ephemeral draft drag states
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [draftStart, setDraftStart] = useState(committedTrimStart);
  const [draftEnd, setDraftEnd] = useState(committedTrimEnd);

  // Drag handling refs
  const dragRef = useRef<{
    startX: number;
    initialStart: number;
    initialEnd: number;
    activeHandleElement: HTMLElement | null;
    pointerId: number | null;
  }>({
    startX: 0,
    initialStart: 0,
    initialEnd: 0,
    activeHandleElement: null,
    pointerId: null,
  });

  // Format seconds to mm:ss.s
  const formatSec = (sec: number) => {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const remainder = (s % 60).toFixed(1);
    return `${m}:${remainder.padStart(4, '0')}`;
  };

  // Cancel active trim on Escape
  const isDraggingTrim = isDraggingLeft || isDraggingRight;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDraggingTrim) {
        e.preventDefault();
        e.stopPropagation();

        // Release pointer capture
        if (dragRef.current.activeHandleElement && dragRef.current.pointerId !== null) {
          try {
            dragRef.current.activeHandleElement.releasePointerCapture(dragRef.current.pointerId);
          } catch {
            // Ignored
          }
        }

        setIsDraggingLeft(false);
        setIsDraggingRight(false);
        onTrimDragStateChange?.(false);
        setDraftStart(committedTrimStart);
        setDraftEnd(committedTrimEnd);
        onTrimPreview(committedTrimStart);
      }
    };

    if (isDraggingTrim) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isDraggingTrim, committedTrimStart, committedTrimEnd, onTrimPreview, onTrimDragStateChange]);

  // LEFT TRIM HANDLE (trimStart)
  const handleLeftPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    e.stopPropagation();
    const element = e.currentTarget;
    element.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      initialStart: committedTrimStart,
      initialEnd: committedTrimEnd,
      activeHandleElement: element,
      pointerId: e.pointerId,
    };
    setDraftStart(committedTrimStart);
    setIsDraggingLeft(true);
    onTrimDragStateChange?.(true);
    onSelect();
  };

  const handleLeftPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingLeft) return;
    e.stopPropagation();
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaSec = deltaX / zoom;
    const minStep = fps && fps > 0 ? 1 / fps : 0.1;
    const maxStart = dragRef.current.initialEnd - minStep;
    let newStart = Math.min(maxStart, Math.max(minLimit, dragRef.current.initialStart + deltaSec));
    if (fps && fps > 0) {
      newStart = snapTimeToFrame(newStart, fps);
    }
    setDraftStart(newStart);
    onTrimPreview(newStart);
  };

  const handleLeftPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingLeft) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    dragRef.current.activeHandleElement = null;
    dragRef.current.pointerId = null;
    setIsDraggingLeft(false);
    onTrimDragStateChange?.(false);

    // Commit only on release
    onTrimCommit(segment?.id || item.id, { start: draftStart, end: committedTrimEnd });
  };

  // RIGHT TRIM HANDLE (trimEnd)
  const handleRightPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    e.stopPropagation();
    const element = e.currentTarget;
    element.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      initialStart: committedTrimStart,
      initialEnd: committedTrimEnd,
      activeHandleElement: element,
      pointerId: e.pointerId,
    };
    setDraftEnd(committedTrimEnd);
    setIsDraggingRight(true);
    onTrimDragStateChange?.(true);
    onSelect();
  };

  const handleRightPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRight) return;
    e.stopPropagation();
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaSec = deltaX / zoom;
    const minStep = fps && fps > 0 ? 1 / fps : 0.1;
    const minEnd = dragRef.current.initialStart + minStep;
    let newEnd = Math.max(minEnd, Math.min(maxLimit, dragRef.current.initialEnd + deltaSec));
    if (fps && fps > 0) {
      newEnd = snapTimeToFrame(newEnd, fps);
    }
    setDraftEnd(newEnd);
    onTrimPreview(newEnd);
  };

  const handleRightPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRight) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    dragRef.current.activeHandleElement = null;
    dragRef.current.pointerId = null;
    setIsDraggingRight(false);
    onTrimDragStateChange?.(false);

    // Commit only on release
    onTrimCommit(segment?.id || item.id, { start: committedTrimStart, end: draftEnd });
  };

  const videoUrl = item.previewUrl;
  const activeDurationDisplay = isDraggingLeft
    ? Math.max(0.1, committedTrimEnd - draftStart)
    : isDraggingRight
    ? Math.max(0.1, draftEnd - committedTrimStart)
    : committedDuration;

  const leftDeltaSec = draftStart - committedTrimStart;
  const leftDeltaPx = isDraggingLeft ? leftDeltaSec * zoom : 0;

  const rightDeltaSec = draftEnd - committedTrimEnd;
  const rightDeltaPx = isDraggingRight ? rightDeltaSec * zoom : 0;

  return (
    <div
      onClick={onSelect}
      style={{ width: `${clipWidthPx}px` }}
      className={`group relative select-none transition-shadow shrink-0 cursor-pointer flex flex-col ${
        isSelected
          ? 'ring-2 ring-primary-500 shadow-lg shadow-primary-500/25 z-20 rounded-md'
          : 'border-r border-slate-950 hover:brightness-110 z-10'
      }`}
    >
      {/* Invisible hit target expansion for narrow clips */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 z-0 pointer-events-auto" />

      {/* Video Track Block (V1) */}
      <div className="relative h-18 bg-slate-900 overflow-hidden flex flex-col justify-between border-b border-slate-800">
        {/* Continuous NLE Filmstrip of Video Frame Thumbnails */}
        <div className="absolute inset-0 flex overflow-hidden pointer-events-none opacity-85 select-none bg-slate-950">
          {thumbnailUrl ? (
            Array.from({ length: frameCount }).map((_, i) => (
              <div
                key={i}
                style={{ width: `${frameWidthPx}px` }}
                className="h-full shrink-0 relative border-r border-slate-950/40 overflow-hidden bg-slate-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl}
                  alt=""
                  loading="eager"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
            ))
          ) : videoUrl ? (
            <video
              src={videoUrl}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="w-full h-full bg-slate-800/80" />
          )}

          {/* Elegant top and bottom gradient shading for text/badge readability */}
          <div className="absolute inset-0 bg-linear-to-b from-slate-950/70 via-transparent to-slate-950/80 pointer-events-none" />
        </div>

        {/* Visual Trim Mask: Dimmed Shading over Trimmed-Out Portions */}
        {isDraggingLeft && leftDeltaPx > 0 && (
          <div
            style={{ width: `${leftDeltaPx}px` }}
            className="absolute left-0 inset-y-0 bg-slate-950/85 z-20 pointer-events-none border-r border-primary-500/60 flex items-center justify-center overflow-hidden"
          >
            <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.5)_4px,rgba(0,0,0,0.5)_8px)]" />
          </div>
        )}

        {isDraggingRight && rightDeltaPx < 0 && (
          <div
            style={{ width: `${Math.abs(rightDeltaPx)}px` }}
            className="absolute right-0 inset-y-0 bg-slate-950/85 z-20 pointer-events-none border-l border-primary-500/60 flex items-center justify-center overflow-hidden"
          >
            <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.5)_4px,rgba(0,0,0,0.5)_8px)]" />
          </div>
        )}

        {/* Central Draggable Surface (between left & right trim handles) */}
        {!isLocked && dragHandleProps && (
          <div
            {...dragHandleProps}
            className="absolute inset-y-0 left-3.5 right-3.5 z-10 cursor-grab active:cursor-grabbing"
          />
        )}

        {/* Top Header Row inside clip: Name & Delete */}
        <div className="relative z-20 flex items-center justify-between px-2 py-1 gap-1 pointer-events-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-white bg-primary-700/90 px-1 py-0.2 rounded shrink-0">
              #{index + 1}
            </span>
            {partNumber && (
              <span className="text-[9px] font-semibold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-1 py-0.2 rounded shrink-0">
                Pt {partNumber}
              </span>
            )}
            {clipWidthPx >= 70 && (
              <span className="text-[11px] font-semibold text-slate-100 truncate drop-shadow-xs">
                {item.file.name}
              </span>
            )}
          </div>

          {!isLocked && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(segment?.id || item.id);
              }}
              title="Remove clip"
              className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/50"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {/* Bottom Badge Row inside clip: Watermark Status & Duration */}
        <div className="relative z-20 flex items-center justify-between px-2 py-1 gap-1 pointer-events-none">
          {/* Watermark Status Pill (Responsive: icon-only on narrow clips < 90px) */}
          <div className="flex items-center gap-1 min-w-0">
            {item.watermarkDecision === 'pending' && (
              <span
                title="Analyzing watermark..."
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/50 font-medium"
              >
                <Loader2 size={10} className="animate-spin shrink-0" />
                {clipWidthPx >= 90 && <span>Analyzing</span>}
              </span>
            )}
            {item.watermarkDecision === 'none' && (
              <span
                title="No watermark detected"
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 font-medium"
              >
                <CheckCircle2 size={10} className="shrink-0" />
                {clipWidthPx >= 90 && <span>Clean</span>}
              </span>
            )}
            {item.watermarkDecision === 'detected' && (
              <span
                title="Watermark detected (will be removed)"
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary-950/70 text-primary-300 border border-primary-800/50 font-medium"
              >
                <Sparkles size={10} className="shrink-0" />
                {clipWidthPx >= 90 && <span>Watermark</span>}
              </span>
            )}
            {item.watermarkDecision === 'uncertain' && (
              <div
                title="Uncertain watermark decision"
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-medium"
              >
                <AlertTriangle size={10} className="text-amber-400 shrink-0" />
                {clipWidthPx >= 110 && <span>Uncertain</span>}
                {!isLocked && clipWidthPx >= 85 && (
                  <div className="flex items-center gap-0.5 ml-0.5 pointer-events-auto">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolveUncertain(item.id, 'force_clean');
                      }}
                      className="px-1 rounded bg-primary-600 hover:bg-primary-500 text-white text-[9px] font-bold"
                      title="Force Clean"
                    >
                      Clean
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolveUncertain(item.id, 'keep_original');
                      }}
                      className="px-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[9px] font-bold"
                      title="Keep Original"
                    >
                      Keep
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Duration Badge */}
          <span className="text-[10px] font-mono font-medium text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800/60 shrink-0">
            {formatSec(activeDurationDisplay)}
          </span>
        </div>

        {/* LEFT TRIM HANDLE (16px interactive touch area, 5px visual bar) */}
        {!isLocked && (
          <div
            onPointerDown={handleLeftPointerDown}
            onPointerMove={handleLeftPointerMove}
            onPointerUp={handleLeftPointerUp}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={leftDeltaPx !== 0 ? { transform: `translateX(${leftDeltaPx}px)` } : undefined}
            title={`Drag to trim start (current: ${formatSec(draftStart)})`}
            className="absolute left-0 top-0 bottom-0 w-4 -ml-1 cursor-ew-resize flex items-center justify-center z-30 group/handle select-none"
          >
            <div
              className={`w-1.5 h-full rounded-l transition-all duration-150 flex items-center justify-center ${
                isDraggingLeft
                  ? 'opacity-100 bg-primary-500 shadow-md ring-1 ring-primary-300'
                  : isSelected
                  ? 'opacity-90 hover:opacity-100 bg-primary-400'
                  : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 bg-primary-400/80'
              }`}
            >
              <div className="w-0.5 h-5 bg-slate-950/90 rounded-full" />
            </div>

            {isDraggingLeft && (
              <div className="absolute -top-7 left-0 bg-primary-600 text-white px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-lg z-50">
                Start: {formatSec(draftStart)}
              </div>
            )}
          </div>
        )}

        {/* RIGHT TRIM HANDLE (16px interactive touch area, 5px visual bar) */}
        {!isLocked && (
          <div
            onPointerDown={handleRightPointerDown}
            onPointerMove={handleRightPointerMove}
            onPointerUp={handleRightPointerUp}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={rightDeltaPx !== 0 ? { transform: `translateX(${rightDeltaPx}px)` } : undefined}
            title={`Drag to trim end (current: ${formatSec(draftEnd)})`}
            className="absolute right-0 top-0 bottom-0 w-4 -mr-1 cursor-ew-resize flex items-center justify-center z-30 group/handle select-none"
          >
            <div
              className={`w-1.5 h-full rounded-r transition-all duration-150 flex items-center justify-center ${
                isDraggingRight
                  ? 'opacity-100 bg-primary-500 shadow-md ring-1 ring-primary-300'
                  : isSelected
                  ? 'opacity-90 hover:opacity-100 bg-primary-400'
                  : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 bg-primary-400/80'
              }`}
            >
              <div className="w-0.5 h-5 bg-slate-950/90 rounded-full" />
            </div>

            {isDraggingRight && (
              <div className="absolute -top-7 right-0 bg-primary-600 text-white px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-lg z-50">
                End: {formatSec(draftEnd)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Streamlined V1 Audio Track Block (A1) with Audio Waveform Aesthetic */}
      <div
        className={`relative h-7 rounded-b-lg px-2 flex items-center justify-between border-t overflow-hidden transition-colors ${
          item.audioInfo?.hasAudio
            ? 'bg-slate-950/95 border-emerald-900/40 text-emerald-400'
            : 'bg-slate-950/80 border-slate-800/60 text-slate-500'
        }`}
      >
        {/* Subtle Decorative Audio Waveform Bars in Background */}
        {item.audioInfo?.hasAudio && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-between opacity-15 pointer-events-none px-1 overflow-hidden"
          >
            {Array.from({ length: Math.min(60, Math.max(8, Math.floor(clipWidthPx / 6))) }).map((_, i) => {
              // Pseudo-random deterministic waveform heights
              const heightPct = 25 + ((i * 37) % 65);
              return (
                <div
                  key={i}
                  style={{ height: `${heightPct}%` }}
                  className="w-0.5 bg-emerald-400 rounded-full shrink-0"
                />
              );
            })}
          </div>
        )}

        <div className="relative z-10 flex items-center gap-1.5 text-[10px] min-w-0">
          {item.audioInfo?.hasAudio ? (
            <>
              <Volume2 size={11} className="text-emerald-400 shrink-0" />
              {clipWidthPx >= 80 && (
                <span className="font-mono text-[9px] text-emerald-300/90 truncate">
                  {item.audioInfo.codec || 'Stereo AAC'}
                </span>
              )}
            </>
          ) : (
            <>
              <VolumeX size={11} className="text-slate-500 shrink-0" />
              {clipWidthPx >= 80 && (
                <span className="font-mono text-[9px] text-slate-500 truncate">Muted</span>
              )}
            </>
          )}
        </div>

        <span className="relative z-10 text-[9px] font-mono text-slate-500 shrink-0">
          {partNumber ? `Pt ${partNumber}` : (segment?.sourceTrimStart || 0) > 0 || (segment?.sourceTrimEnd || totalDuration) < totalDuration || item.trimRange ? 'Trimmed' : 'Full'}
        </span>
      </div>
    </div>
  );
}
