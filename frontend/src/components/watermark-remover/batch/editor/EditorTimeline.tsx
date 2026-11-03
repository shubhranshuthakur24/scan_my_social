'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { BatchVideoItem, VideoTrimRange } from '@/lib/watermark/batch/batchTypes';
import { screenXToSequenceTime, ClipTimelineSegment } from '@/lib/watermark/batch/timelineProjection';
import TimelineClipItem from './TimelineClipItem';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Video,
  Music,
  Scissors,
} from 'lucide-react';

export interface EditorTimelineProps {
  items: BatchVideoItem[];
  segments?: ClipTimelineSegment[];
  totalSequenceDuration: number;
  selectedId: string | null;
  selectedSegmentId?: string | null;
  playheadSequenceTime: number; // in seconds
  pixelsPerSecond: number;
  maxZoom?: number;
  fps?: number | null;
  canSplit?: boolean;
  splitDisabledReason?: string;
  onSplitAtPlayhead?: () => void;
  onZoomChange: (zoom: number) => void;
  onSelectClip: (id: string) => void;
  onSelectSegment?: (segmentId: string) => void;
  onSeek: (sequenceTime: number) => void;
  onScrubStart?: () => void;
  onScrubFrame: (sequenceTime: number) => void;
  onScrubEnd?: (finalSequenceTime?: number) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onDragStart?: () => void;
  onTrimCommit: (id: string, range: VideoTrimRange) => void;
  onTrimPreview: (clipId: string, timestamp: number) => void;
  onTrimDragStateChange?: (isDragging: boolean) => void;
  onRemove: (id: string) => void;
  onResolveUncertain: (id: string, resolution: 'force_clean' | 'keep_original') => void;
  isLocked: boolean;
}

export default function EditorTimeline({
  items,
  segments,
  totalSequenceDuration,
  selectedId,
  selectedSegmentId,
  playheadSequenceTime,
  pixelsPerSecond,
  maxZoom = 80,
  fps,
  canSplit = false,
  splitDisabledReason,
  onSplitAtPlayhead,
  onZoomChange,
  onSelectClip,
  onSelectSegment,
  onSeek,
  onScrubStart,
  onScrubFrame,
  onScrubEnd,
  onReorder,
  onDragStart,
  onTrimCommit,
  onTrimPreview,
  onTrimDragStateChange,
  onRemove,
  onResolveUncertain,
  isLocked,
}: EditorTimelineProps) {
  // Explicit scroll container reference
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Direct DOM playhead ref for 60fps smooth transform without React tree re-rendering
  const playheadRef = useRef<HTMLDivElement>(null);

  // High frequency scrub state
  const isScrubbingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);
  const latestClientXRef = useRef<number>(0);
  const [isTrimDragging, setIsTrimDragging] = useState<boolean>(false);

  const handleTrimDragStateChange = useCallback(
    (isDragging: boolean) => {
      setIsTrimDragging(isDragging);
      onTrimDragStateChange?.(isDragging);
    },
    [onTrimDragStateChange]
  );

  // Measure container viewport width to ensure ruler & tracks seamlessly fill 100% of the card
  const [containerWidth, setContainerWidth] = useState<number>(0);
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-fit timeline zoom on initial sequence mount so clips nicely fill viewport
  const hasAutoFittedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!hasAutoFittedRef.current && scrollContainerRef.current && totalSequenceDuration > 0) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      if (containerWidth > 200) {
        hasAutoFittedRef.current = true;
        const fitZoom = Math.max(12, Math.min(60, Math.round((containerWidth - 60) / totalSequenceDuration)));
        onZoomChange(fitZoom);
      }
    }
  }, [totalSequenceDuration, onZoomChange]);

  // Exact sequence pixel width
  const sequenceWidthPx = totalSequenceDuration * pixelsPerSecond;

  // Format total sequence duration for header badge (mm:ss)
  const formatTotalDuration = (sec: number) => {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${Math.floor(rem).toString().padStart(2, '0')}`;
  };

  // Sync playhead DOM transform when playheadSequenceTime updates outside active scrub
  useEffect(() => {
    if (!isScrubbingRef.current && playheadRef.current) {
      const x = playheadSequenceTime * pixelsPerSecond;
      playheadRef.current.style.transform = `translateX(${x}px)`;
    }
  }, [playheadSequenceTime, pixelsPerSecond]);

  // Execute rAF scrub tick
  const handleScrubTick = useCallback(() => {
    rafIdRef.current = null;
    if (!scrollContainerRef.current) return;

    const seqTime = screenXToSequenceTime(
      latestClientXRef.current,
      scrollContainerRef.current,
      pixelsPerSecond,
      totalSequenceDuration,
      fps
    );

    // Direct DOM transform for instant 60fps feedback
    if (playheadRef.current) {
      const x = seqTime * pixelsPerSecond;
      playheadRef.current.style.transform = `translateX(${x}px)`;
    }

    // Seek player
    onScrubFrame(seqTime);
  }, [pixelsPerSecond, totalSequenceDuration, fps, onScrubFrame]);

  // Pointer Down on Time Ruler
  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isScrubbingRef.current = true;
    latestClientXRef.current = e.clientX;
    onScrubStart?.();
    handleScrubTick();
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    latestClientXRef.current = e.clientX;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(handleScrubTick);
    }
  };

  const handleRulerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    isScrubbingRef.current = false;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Commit sequence time to React state
    if (scrollContainerRef.current) {
      const finalTime = screenXToSequenceTime(
        e.clientX,
        scrollContainerRef.current,
        pixelsPerSecond,
        totalSequenceDuration,
        fps
      );
      onSeek(finalTime);
      onScrubEnd?.(finalTime);
    } else {
      onScrubEnd?.();
    }
  };

  // Derived editorial segments to render (with backward-compatible fallback to items)
  const renderSegments: ClipTimelineSegment[] =
    segments !== undefined
      ? segments
      : items.map((it, idx) => {
          const dur = it.metadata?.duration || 1;
          const start = it.trimRange?.start ?? 0;
          const end = it.trimRange?.end ?? dur;
          const effDur = Math.max(0.04, end - start);
          return {
            id: it.id,
            clipId: it.id,
            sourceClipId: it.id,
            index: idx,
            sequenceStart: 0,
            sequenceEnd: effDur,
            duration: effDur,
            sourceTrimStart: start,
            sourceTrimEnd: end,
          };
        });

  // Count parts per source clip
  const sourcePartCounts: Record<string, number> = {};
  renderSegments.forEach((seg) => {
    const sId = seg.sourceClipId || seg.clipId;
    sourcePartCounts[sId] = (sourcePartCounts[sId] || 0) + 1;
  });

  // Reordering
  const handleDragEnd = (result: DropResult) => {
    if (isLocked || !result.destination) return;
    if (result.destination.index === result.source.index) return;
    onReorder(result.source.index, result.destination.index);
  };

  // Frame precision metrics & adaptive ruler spacing
  const pixelsPerFrame = fps && fps > 0 ? pixelsPerSecond / fps : null;
  const isFrameMode = pixelsPerFrame !== null && pixelsPerFrame >= 6;
  const minMajorSpacingPx = 72;

  const { majorIntervalSec, minorIntervalSec, isFrameTicks } = React.useMemo(() => {
    // If in frame precision mode, calculate interval in discrete frame steps
    if (isFrameMode && fps && fps > 0 && pixelsPerFrame) {
      const halfFps = Math.max(1, Math.round(fps / 2));
      const frameSteps = [1, 2, 5, 10, halfFps].filter((f, idx, arr) => arr.indexOf(f) === idx && f < fps);
      for (const fStep of frameSteps) {
        if (fStep * pixelsPerFrame >= minMajorSpacingPx) {
          const minorStep = fStep === 1 ? null : fStep === 2 ? 1 : fStep === 5 ? 1 : fStep === 10 ? 2 : 5;
          return {
            majorIntervalSec: fStep / fps,
            minorIntervalSec: minorStep ? minorStep / fps : null,
            isFrameTicks: true,
          };
        }
      }
    }

    const minIntervalSec = Math.max(0.5, minMajorSpacingPx / Math.max(1, pixelsPerSecond));
    const NICE_INTERVALS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    const majSec = NICE_INTERVALS.find((val) => val >= minIntervalSec) || 600;

    let minSec: number | null = null;
    if (majSec === 1) {
      minSec = pixelsPerSecond >= 50 ? 0.5 : null;
    } else if (majSec === 2) {
      minSec = 1;
    } else if (majSec === 5) {
      minSec = 1;
    } else if (majSec === 10) {
      minSec = 2;
    } else if (majSec === 15) {
      minSec = 5;
    } else if (majSec === 30) {
      minSec = 10;
    } else if (majSec === 60) {
      minSec = 15;
    } else {
      minSec = Math.max(1, Math.round(majSec / 5));
    }

    return {
      majorIntervalSec: majSec,
      minorIntervalSec: minSec,
      isFrameTicks: false,
    };
  }, [pixelsPerSecond, fps, pixelsPerFrame, isFrameMode]);

  const formatRulerTick = useCallback(
    (sec: number) => {
      const s = Math.max(0, sec);
      if (isFrameTicks && fps && fps > 0) {
        const frameIndex = Math.round(s * fps);
        const isWholeSec = Math.abs(s - Math.round(s)) < 0.001;
        if (isWholeSec && s > 0) {
          const m = Math.floor(s / 60);
          const rem = Math.floor(s % 60);
          return `${m}:${rem.toString().padStart(2, '0')} (F${frameIndex})`;
        }
        return `F${frameIndex}`;
      }
      const m = Math.floor(s / 60);
      const remainder = s % 60;
      if (pixelsPerSecond >= 100) {
        return `${m}:${remainder.toFixed(1).padStart(4, '0')}`;
      }
      return `${m}:${Math.floor(remainder).toString().padStart(2, '0')}`;
    },
    [isFrameTicks, fps, pixelsPerSecond]
  );

  // Precompute major ticks: seamlessly cover either sequence duration or full visible viewport
  const visibleDuration =
    containerWidth > 0 ? containerWidth / Math.max(1, pixelsPerSecond) : 0;
  const targetRulerDuration = Math.max(totalSequenceDuration, visibleDuration);
  const maxRulerTime = Math.max(
    targetRulerDuration,
    Math.ceil(targetRulerDuration / majorIntervalSec) * majorIntervalSec
  );
  const majorTickCount = Math.floor(maxRulerTime / majorIntervalSec + 0.001) + 1;
  const majorTicks = React.useMemo(() => {
    return Array.from({ length: majorTickCount }, (_, i) => i * majorIntervalSec);
  }, [majorTickCount, majorIntervalSec]);

  // Total canvas width strictly calculated from logical duration * pixelsPerSecond + breathing room, minimum 100% of container
  const sequenceCanvasWidthPx = Math.ceil(maxRulerTime * pixelsPerSecond) + 80;
  const timelineContentWidthPx = Math.max(containerWidth, sequenceCanvasWidthPx, 600);

  // Precompute minor ticks (excluding points that coincide with major ticks)
  const minorTicks = React.useMemo(() => {
    if (!minorIntervalSec) return [];
    const ticks: number[] = [];
    const minorCount = Math.ceil(maxRulerTime / minorIntervalSec);
    const ratio = Math.round(majorIntervalSec / minorIntervalSec);
    for (let i = 1; i <= minorCount; i++) {
      if (ratio > 0 && i % ratio === 0) continue;
      const t = i * minorIntervalSec;
      if (t <= maxRulerTime + minorIntervalSec * 0.1) {
        ticks.push(t);
      }
    }
    return ticks;
  }, [maxRulerTime, minorIntervalSec, majorIntervalSec]);

  const zoomStep = Math.max(8, Math.round((maxZoom - 10) / 20));

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />
            Sequence Timeline
          </span>
          <span className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200/70 px-2 py-0.5 rounded font-medium shadow-2xs">
            Total: {formatTotalDuration(totalSequenceDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Split Action Button */}
          {onSplitAtPlayhead && (
            <button
              type="button"
              onClick={onSplitAtPlayhead}
              disabled={!canSplit || isLocked}
              title={
                canSplit
                  ? 'Split clip at playhead (S)'
                  : splitDisabledReason || 'Split disabled at current playhead position'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                canSplit && !isLocked
                  ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 hover:text-primary-700 shadow-2xs cursor-pointer'
                  : 'bg-slate-100/60 border-slate-200/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Scissors size={13} className={canSplit && !isLocked ? 'text-primary-600' : 'text-slate-400'} />
              <span>Split</span>
              <kbd className="text-[9px] font-mono opacity-60 ml-0.5">S</kbd>
            </button>
          )}

          {/* Studio Zoom & Fit Controls Capsule */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(10, pixelsPerSecond - zoomStep))}
              title="Zoom Out"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ZoomOut size={13} />
            </button>

            <input
              type="range"
              min="10"
              max={maxZoom}
              step="4"
              value={pixelsPerSecond}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-16 sm:w-28 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />

            <button
              type="button"
              onClick={() => onZoomChange(Math.min(maxZoom, pixelsPerSecond + zoomStep))}
              title="Zoom In"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ZoomIn size={13} />
            </button>

            <div className="w-px h-3.5 bg-slate-200 mx-0.5" />

            {/* Zoom Readout Badge */}
            <span className="text-[10px] font-mono text-slate-600 font-medium min-w-8 text-center">
              {isFrameMode && pixelsPerFrame ? (
                <span className="text-primary-600 font-bold" title={`${pixelsPerSecond} px/s`}>
                  FRAME ({Math.round(pixelsPerFrame)}px)
                </span>
              ) : (
                `${Math.round((pixelsPerSecond / 26) * 100)}%`
              )}
            </span>

            <div className="w-px h-3.5 bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={() => {
                if (scrollContainerRef.current && totalSequenceDuration > 0) {
                  const availableWidth = scrollContainerRef.current.clientWidth - 40;
                  const fitZoom = Math.max(10, Math.min(maxZoom, Math.round(availableWidth / totalSequenceDuration)));
                  onZoomChange(fitZoom);
                }
              }}
              title="Fit Timeline to Screen"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-600 hover:text-primary-700 hover:bg-slate-100 transition-colors"
            >
              <Maximize size={11} />
              <span className="hidden sm:inline">Fit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Track Workspace */}
      <div className="flex relative bg-slate-950">
        {/* Left Track Headers Column */}
        <div className="w-16 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col z-30 select-none">
          {/* Header Spacer for Ruler (height strictly matches ruler h-7 = 28px) */}
          <div className="h-7 border-b border-slate-200 bg-slate-100/70 flex items-center justify-center">
            <span className="text-[9px] font-mono text-slate-500 font-bold tracking-wider">TRACKS</span>
          </div>

          {/* V1 Track Label */}
          <div className="h-18 border-b border-slate-200 flex flex-col items-center justify-center p-1 bg-slate-50">
            <div className="flex items-center gap-1">
              <Video size={11} className="text-primary-600" />
              <span className="text-[11px] font-bold text-slate-800">V1</span>
            </div>
            <span className="text-[8px] text-slate-400 font-mono mt-0.5">Video</span>
          </div>

          {/* A1 Track Label */}
          <div className="h-7 flex items-center justify-center p-1 bg-slate-50">
            <div className="flex items-center gap-1">
              <Music size={11} className="text-emerald-600" />
              <span className="text-[10px] font-bold text-slate-800">A1</span>
            </div>
          </div>
        </div>

        {/* Scrollable Tracks Canvas (scrollContainer) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative select-none scrollbar-primary"
          style={{ minHeight: '140px' }}
        >
          <div style={{ width: `${timelineContentWidthPx}px`, minWidth: '100%' }} className="relative pb-2 min-h-full">
            {/* TIME RULER (h-7: 28px) */}
            <div
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              onPointerCancel={handleRulerPointerUp}
              className="h-7 bg-slate-100/90 border-b border-slate-200 relative cursor-pointer select-none w-full"
            >
              {/* Minor Sub-Ticks */}
              {minorTicks.map((minorSec) => {
                const tickX = minorSec * pixelsPerSecond;
                return (
                  <div
                    key={`min-${minorSec}`}
                    style={{ left: `${tickX}px` }}
                    className="absolute bottom-0 w-px h-1.5 bg-slate-300 pointer-events-none"
                  />
                );
              })}

              {/* Major Ticks with Timecode Labels */}
              {majorTicks.map((majorSec) => {
                const tickX = majorSec * pixelsPerSecond;
                return (
                  <div
                    key={`maj-${majorSec}`}
                    style={{ left: `${tickX}px` }}
                    className="absolute bottom-0 flex flex-col pointer-events-none"
                  >
                    <span className="text-[10px] font-mono font-medium text-slate-500 leading-none pl-1 pb-1 select-none">
                      {formatRulerTick(majorSec)}
                    </span>
                    <div className="w-px h-2.5 bg-slate-400" />
                  </div>
                );
              })}
            </div>

            {/* TRACKS CONTAINER (V1 and A1) — gap-0 and px-0 ensure 1:1 mathematical alignment with ruler */}
            <DragDropContext onDragStart={onDragStart} onDragEnd={handleDragEnd}>
              <Droppable droppableId="timeline-clips" direction="horizontal">
                {(provided) => {
                  const sourcePartTracker: Record<string, number> = {};
                  return (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex items-start gap-0 px-0 py-1.5 min-h-[105px] relative"
                    >
                      {renderSegments.map((segment, index) => {
                      const sId = segment.sourceClipId || segment.clipId;
                      const sourceItem = items.find((i) => i.id === sId) || items[0];
                      if (!sourceItem) return null;

                      const totalParts = sourcePartCounts[sId] || 1;
                      let partNumber: number | null = null;
                      if (totalParts > 1) {
                        sourcePartTracker[sId] = (sourcePartTracker[sId] || 0) + 1;
                        partNumber = sourcePartTracker[sId];
                      }

                      const isSelected = selectedSegmentId
                        ? segment.id === selectedSegmentId
                        : sourceItem.id === selectedId;

                      const prevSeg = index > 0 ? renderSegments[index - 1] : null;
                      const isSplitCutJoint = prevSeg && (prevSeg.sourceClipId || prevSeg.clipId) === sId;

                      return (
                        <React.Fragment key={segment.id}>
                          {isSplitCutJoint && (
                            <div
                              className="shrink-0 w-1 self-stretch bg-amber-500/80 z-20 pointer-events-none relative flex items-center justify-center -mx-0.5"
                              title="Split Cut Joint"
                            >
                              <div className="w-2 h-2 rounded-full bg-amber-400 absolute top-0 -mt-1 shadow-xs" />
                            </div>
                          )}
                          <Draggable
                            key={segment.id}
                            draggableId={segment.id}
                            index={index}
                            isDragDisabled={isLocked || isTrimDragging}
                          >
                            {(dragProvided, snapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`shrink-0 transition-opacity ${
                                  snapshot.isDragging ? 'opacity-80 scale-95 shadow-2xl z-40' : ''
                                }`}
                              >
                                <TimelineClipItem
                                  item={sourceItem}
                                  segment={segment}
                                  partNumber={partNumber}
                                  fps={fps}
                                  index={index}
                                  isSelected={isSelected}
                                  zoom={pixelsPerSecond}
                                  onSelect={() => {
                                    if (onSelectSegment) {
                                      onSelectSegment(segment.id);
                                    } else {
                                      onSelectClip(sourceItem.id);
                                    }
                                  }}
                                  onTrimCommit={onTrimCommit}
                                  onTrimPreview={(ts) => onTrimPreview(sourceItem.id, ts)}
                                  onTrimDragStateChange={handleTrimDragStateChange}
                                  onRemove={onRemove}
                                  onResolveUncertain={onResolveUncertain}
                                  isLocked={isLocked}
                                  dragHandleProps={dragProvided.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        </React.Fragment>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                );
              }}
              </Droppable>
            </DragDropContext>

            {/* Continuous empty track lanes and NLE grid past sequence out-point */}
            <div
              style={{
                left: `${sequenceWidthPx}px`,
                right: 0,
              }}
              className="absolute top-7 bottom-0 pointer-events-none z-10 flex flex-col"
            >
              {/* V1 empty track lane (h-18: 72px) */}
              <div className="h-18 border-b border-slate-800/60 bg-slate-900/40 relative overflow-hidden">
                <div className="w-full h-full opacity-25 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.03)_6px,rgba(255,255,255,0.03)_12px)]" />
              </div>
              {/* A1 empty track lane (h-7: 28px) */}
              <div className="h-7 bg-slate-950/60 relative overflow-hidden">
                <div className="w-full h-full opacity-15 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.02)_6px,rgba(255,255,255,0.02)_12px)]" />
              </div>
            </div>

            {/* Empty Timeline Informative State */}
            {renderSegments.length === 0 && (
              <div className="absolute inset-0 top-7 flex items-center justify-center pointer-events-none z-20">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-xs border border-slate-700/60 text-slate-300 text-xs shadow-lg">
                  <span>Timeline is empty. Click <strong className="text-primary-400">+ Add</strong> in Master Bin to place clips on the timeline.</span>
                </div>
              </div>
            )}

            {/* SEQUENCE OUT-POINT (END) MARKER */}
            {totalSequenceDuration > 0 && (
              <div
                style={{ left: `${sequenceWidthPx}px` }}
                className="absolute top-0 bottom-0 pointer-events-none z-35 flex flex-col items-center select-none"
              >
                {/* Out-Point Tag in Ruler */}
                <div className="h-7 flex items-center justify-center -ml-px">
                  <span className="bg-primary-50 text-primary-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-primary-300/80 shadow-2xs">
                    END
                  </span>
                </div>
                {/* Boundary line down tracks */}
                <div className="w-px flex-1 border-r border-dashed border-primary-400/60" />
              </div>
            )}

            {/* RED SCRUBBING PLAYHEAD (Direct DOM transform) */}
            <div
              ref={playheadRef}
              style={{
                left: 0,
                transform: `translateX(${playheadSequenceTime * pixelsPerSecond}px)`,
                willChange: 'transform',
              }}
              className="absolute top-0 bottom-0 pointer-events-none z-40 -ml-2 w-4 flex flex-col items-center"
            >
              {/* Playhead Top Marker (Downward pointing pentagon / arrow) */}
              <div
                className="w-3.5 h-3 bg-red-500 shadow-md shrink-0"
                style={{
                  clipPath: 'polygon(0% 0%, 100% 0%, 100% 65%, 50% 100%, 0% 65%)',
                }}
              />
              {/* Vertical Playhead Line */}
              <div className="w-px flex-1 bg-red-500 shadow-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
