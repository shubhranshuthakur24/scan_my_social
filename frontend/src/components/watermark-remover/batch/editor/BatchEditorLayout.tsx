'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { BatchVideoItem, VideoTrimRange, PreflightCompatibility } from '@/lib/watermark/batch/batchTypes';
import {
  buildTimelineProjection,
  resolveSequencePosition,
  resolveSourceToSequenceTime,
  TimelineSegment,
  SplitResult,
  isEditableTarget,
} from '@/lib/watermark/batch/timelineProjection';
import {
  getAuthoritativeTimelineMetrics,
  calculateFramePrecisionZoom,
} from '@/lib/watermark/batch/framePrecision';
import EditorMediaBin from './EditorMediaBin';
import EditorPlayer, { EditorPlayerHandle, PlaybackCommand } from './EditorPlayer';
import EditorTimeline from './EditorTimeline';
import { extractVideoThumbnail, getCachedVideoThumbnail } from '@/lib/watermark/batch/videoThumbnail';
import Button from '@/components/ui/Button';
import {
  Play,
  RotateCcw,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export type PlayerSyncMode =
  | 'NORMAL_PLAYBACK'
  | 'SEEKING'
  | 'BOUNDARY_TRANSITION';

export interface BatchEditorLayoutProps {
  items: BatchVideoItem[];
  timelineSegments?: TimelineSegment[];
  preflight: PreflightCompatibility;
  isLocked: boolean;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onTrimChange: (id: string, range: VideoTrimRange | null) => void;
  onResolveUncertain: (id: string, resolution: 'force_clean' | 'keep_original') => void;
  onClearQueue: () => void;
  onStartMerge: () => void;
  onSwitchToListView?: () => void;
  onAddToTimeline?: (sourceClipId: string) => void;
  onSplitSegmentAtPlayhead?: (playheadSequenceTime: number) => SplitResult | null;
  onRemoveTimelineSegment?: (segmentId: string) => void;
  onReorderTimelineSegments?: (startIndex: number, endIndex: number) => void;
  onUpdateSegmentTrim?: (segmentId: string, range: VideoTrimRange) => void;
}

export default function BatchEditorLayout({
  items,
  timelineSegments,
  preflight,
  isLocked,
  onAddFiles,
  onRemoveFile,
  onReorder,
  onTrimChange,
  onResolveUncertain,
  onClearQueue,
  onStartMerge,
  onSwitchToListView,
  onAddToTimeline,
  onSplitSegmentAtPlayhead,
  onRemoveTimelineSegment,
  onReorderTimelineSegments,
  onUpdateSegmentTrim,
}: BatchEditorLayoutProps) {
  // Explicit separated state dimensions:
  // 1. Source media selection (Media Bin highlight)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(items[0]?.id ?? null);

  // 2. Timeline segment selection (Timeline highlight & active trim handle focus)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // 3. Active playback clip loaded in <video> player deck
  const [activePlaybackClipId, setActivePlaybackClipId] = useState<string | null>(items[0]?.id ?? null);

  // 4. Playhead sequence time (seconds, committed)
  const [playheadSequenceTime, setPlayheadSequenceTime] = useState<number>(0);

  // 5. Pending seek target time for loaded clip metadata synchronization
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);

  // Timeline zoom (pixels per second)
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(26);

  // Transport playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Imperative player handle ref (EditorPlayer is the media mechanics executor)
  const editorPlayerRef = useRef<EditorPlayerHandle | null>(null);

  // Monotonic transition ID counter for deterministic parent-child transition correlation
  const transitionIdRef = useRef<number>(0);
  const nextTransitionId = useCallback(() => {
    transitionIdRef.current += 1;
    return transitionIdRef.current;
  }, []);

  // Active editorial transition ID and synchronization mode
  const activeTransitionIdRef = useRef<number | null>(null);
  const syncModeRef = useRef<PlayerSyncMode>('NORMAL_PLAYBACK');

  // Scrubbing & playback suspension tracking
  const wasPlayingBeforeScrubRef = useRef<boolean>(false);
  const pendingSeekPromiseRef = useRef<Promise<boolean | undefined> | null>(null);

  // Studio Fullscreen state and container ref
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Sync fullscreen state with browser fullscreen changes (e.g. user pressing Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Toggle studio fullscreen mode (native API with graceful CSS fallback)
  const toggleFullscreen = useCallback(() => {
    if (!editorContainerRef.current) return;

    if (!document.fullscreenElement && !isFullscreen) {
      if (editorContainerRef.current.requestFullscreen) {
        editorContainerRef.current
          .requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => {
            // CSS fallback if native fullscreen is restricted in iframe/browser
            setIsFullscreen(true);
          });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document
          .exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(() => {
            setIsFullscreen(false);
          });
      } else {
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  // Build mathematical sequence projection from items and timelineSegments
  const projection = useMemo(() => {
    return buildTimelineProjection(items, timelineSegments);
  }, [items, timelineSegments]);

  // Derived active position under playhead
  const activePosition = useMemo(() => {
    return resolveSequencePosition(playheadSequenceTime, projection.segments);
  }, [playheadSequenceTime, projection.segments]);

  // activeSegmentId is strictly derived, not independently mutable React state
  const activeSegmentId = activePosition?.segmentId ?? null;
  const activeSegmentIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeSegmentIdRef.current = activeSegmentId;
  }, [activeSegmentId]);

  // Safe derivation of active IDs against current items array
  const currentSelectedId = items.some((i) => i.id === selectedClipId)
    ? selectedClipId
    : (items[0]?.id ?? null);

  const currentSelectedSegmentId = useMemo(() => {
    if (selectedSegmentId && projection.segments.some((s) => s.id === selectedSegmentId)) {
      return selectedSegmentId;
    }
    return projection.segments[0]?.id ?? null;
  }, [selectedSegmentId, projection.segments]);

  const currentPlaybackId = items.some((i) => i.id === activePlaybackClipId)
    ? activePlaybackClipId
    : (items[0]?.id ?? null);

  const activeIndex = useMemo(() => {
    return items.findIndex((i) => i.id === currentPlaybackId);
  }, [items, currentPlaybackId]);

  const activeItem = activeIndex !== -1 ? items[activeIndex] : items[0] || null;

  const currentSegmentIndex = useMemo(() => {
    return projection.segments.findIndex((s) => s.id === activeSegmentId);
  }, [projection.segments, activeSegmentId]);

  const hasNextSegment =
    currentSegmentIndex >= 0 && currentSegmentIndex < projection.segments.length - 1;

  // Derive the next distinct source media item on the sequence timeline for dual-deck preloading
  const nextItem = useMemo(() => {
    if (currentSegmentIndex < 0 || currentSegmentIndex >= projection.segments.length - 1) {
      return null;
    }
    // Look ahead on sequence timeline for the next segment with a distinct source clip ID
    const futureSeg = projection.segments
      .slice(currentSegmentIndex + 1)
      .find((s) => s.sourceClipId !== currentPlaybackId);
    if (futureSeg) {
      return items.find((i) => i.id === futureSeg.sourceClipId) ?? null;
    }
    return null;
  }, [currentSegmentIndex, projection.segments, currentPlaybackId, items]);

  // Total detected watermarks for bottom action bar
  const totalWatermarks = useMemo(() => {
    return items.filter((i) => i.watermarkDecision === 'detected').length;
  }, [items]);

  // Authoritative timeline metrics for frame-accurate operations
  const authoritativeMetrics = useMemo(() => {
    return getAuthoritativeTimelineMetrics(activeItem);
  }, [activeItem]);

  // Dynamic frame precision zoom ceiling: calculates exact px/s needed for 36px/frame
  const maxTimelineZoom = useMemo(() => {
    if (authoritativeMetrics && authoritativeMetrics.fps > 0) {
      return calculateFramePrecisionZoom(authoritativeMetrics.fps, 36);
    }
    return 300;
  }, [authoritativeMetrics]);

  // Check if split is available at current playhead position
  const canSplit = useMemo(() => {
    if (isLocked || !activePosition || activePosition.isAtEndBoundary) return false;
    const sourceItem = items.find((i) => i.id === activePosition.clipId);
    if (!sourceItem) return false;
    const metrics = getAuthoritativeTimelineMetrics(sourceItem);
    if (!metrics) return false;
    const activeSeg = projection.segments.find((s) => s.id === activePosition.segmentId);
    if (!activeSeg) return false;
    const cutFrame = Math.round(activePosition.sourceTime * metrics.fps);
    const startFrame = Math.round(activeSeg.sourceTrimStart * metrics.fps);
    const endFrame = Math.round(activeSeg.sourceTrimEnd * metrics.fps);
    return cutFrame > startFrame && cutFrame < endFrame;
  }, [isLocked, activePosition, items, projection.segments]);

  // Explanatory reason when Split is disabled
  const splitDisabledReason = useMemo(() => {
    if (isLocked) return 'Timeline is locked during processing';
    if (!activePosition || activePosition.isAtEndBoundary) return 'Place playhead inside a clip to split';
    const sourceItem = items.find((i) => i.id === activePosition.clipId);
    if (!sourceItem) return 'No source media found';
    const metrics = getAuthoritativeTimelineMetrics(sourceItem);
    if (!metrics) return 'Frame-accurate split requires constant frame rate (CFR) video';
    const activeSeg = projection.segments.find((s) => s.id === activePosition.segmentId);
    if (!activeSeg) return 'No active segment found';
    const cutFrame = Math.round(activePosition.sourceTime * metrics.fps);
    const startFrame = Math.round(activeSeg.sourceTrimStart * metrics.fps);
    const endFrame = Math.round(activeSeg.sourceTrimEnd * metrics.fps);
    if (cutFrame <= startFrame) return 'Cut point must be at least 1 frame after clip start';
    if (cutFrame >= endFrame) return 'Cut point must be at least 1 frame before clip end';
    return undefined;
  }, [isLocked, activePosition, items, projection.segments]);

  // Pre-warm video thumbnails for timeline filmstrips
  useEffect(() => {
    items.forEach((item) => {
      if (item.previewUrl && !getCachedVideoThumbnail(item.id)) {
        extractVideoThumbnail(item.id, item.previewUrl).catch(() => {});
      }
    });
  }, [items]);

  // activeSegment is strictly derived and nullable (never fallback to projection.segments[0])
  const activeSegment = useMemo(() => {
    if (!activeSegmentId) return null;
    return projection.segments.find((s) => s.id === activeSegmentId) ?? null;
  }, [activeSegmentId, projection.segments]);

  // Handle Play/Pause via imperative player handle
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      editorPlayerRef.current?.pause();
      setIsPlaying(false);
    } else {
      // If playhead is at the very end of sequence, loop back to start
      if (
        playheadSequenceTime >= projection.totalSequenceDuration - 0.05 &&
        projection.segments.length > 0
      ) {
        const firstSeg = projection.segments[0];
        setActivePlaybackClipId(firstSeg.sourceClipId || firstSeg.clipId);
        setPlayheadSequenceTime(0);
        setPendingSeekTime(firstSeg.sourceTrimStart);

        const transitionId = nextTransitionId();
        editorPlayerRef.current?.executeCommand({
          type: 'seek-sequence',
          sourceClipId: firstSeg.sourceClipId || firstSeg.clipId,
          sourceTime: firstSeg.sourceTrimStart,
          sequenceTime: 0,
          transitionId,
        });
      }

      editorPlayerRef.current
        ?.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isPlaying, playheadSequenceTime, projection.totalSequenceDuration, projection.segments, nextTransitionId]);

  // Handle seeking within source clip (step buttons, Home/End in player)
  const handleSeekSourceTime = useCallback(
    (sourceTime: number) => {
      if (!currentPlaybackId) return;
      const seqTime = resolveSourceToSequenceTime(
        currentPlaybackId,
        sourceTime,
        projection.segments,
        activeSegmentIdRef.current
      );
      if (seqTime !== null) {
        setPlayheadSequenceTime(seqTime);
      }
    },
    [currentPlaybackId, projection.segments]
  );

  // Sequence completion
  const handleSequenceEnded = useCallback(() => {
    setIsPlaying(false);
    editorPlayerRef.current?.executeCommand({ type: 'end' });
    setPlayheadSequenceTime(projection.totalSequenceDuration);
  }, [projection.totalSequenceDuration]);

  // Playback handoff when active clip reaches its boundary: coordinates editorial transition command
  const handleBoundaryReached = useCallback(() => {
    if (syncModeRef.current === 'BOUNDARY_TRANSITION') return;
    syncModeRef.current = 'BOUNDARY_TRANSITION';

    const currentIndex = projection.segments.findIndex((s) => s.id === activeSegmentIdRef.current);
    if (currentIndex < 0 || currentIndex >= projection.segments.length - 1) {
      syncModeRef.current = 'NORMAL_PLAYBACK';
      return;
    }

    const currentSeg = projection.segments[currentIndex];
    const nextSeg = projection.segments[currentIndex + 1];
    const transitionId = nextTransitionId();
    activeTransitionIdRef.current = transitionId;

    const isSameSource = currentSeg.sourceClipId === nextSeg.sourceClipId;
    const isContiguousSource =
      isSameSource && Math.abs(currentSeg.sourceTrimEnd - nextSeg.sourceTrimStart) < 0.04;

    setPlayheadSequenceTime(nextSeg.sequenceStart);

    if (isContiguousSource) {
      // Seamless contiguous playback: naturally continues without interrupting decoder
      if (activeTransitionIdRef.current === transitionId) {
        syncModeRef.current = 'NORMAL_PLAYBACK';
      }
      return;
    }

    const command: PlaybackCommand = isSameSource
      ? {
          type: 'seek-same-source',
          sourceTime: nextSeg.sourceTrimStart,
          sequenceTime: nextSeg.sequenceStart,
          transitionId,
        }
      : {
          type: 'switch-source',
          sourceClipId: nextSeg.sourceClipId,
          sourceTime: nextSeg.sourceTrimStart,
          sequenceTime: nextSeg.sequenceStart,
          transitionId,
        };

    if (!isSameSource) {
      setActivePlaybackClipId(nextSeg.sourceClipId);
      setPendingSeekTime(nextSeg.sourceTrimStart);
    }

    const playerPromise = editorPlayerRef.current?.executeCommand(command);
    if (!playerPromise) {
      if (activeTransitionIdRef.current === transitionId) {
        syncModeRef.current = 'NORMAL_PLAYBACK';
      }
      return;
    }

    playerPromise.finally(() => {
      // Guarded: only reset sync mode if this transition is still the active one
      if (activeTransitionIdRef.current === transitionId) {
        syncModeRef.current = 'NORMAL_PLAYBACK';
      }
    });
  }, [projection.segments, nextTransitionId]);

  // Handle player timeupdate event during playback (guarded against stale clip emissions and transitions)
  const handlePlayerTimeUpdate = useCallback(
    (sourceTime: number, clipId: string) => {
      if (syncModeRef.current === 'BOUNDARY_TRANSITION' || syncModeRef.current === 'SEEKING') return;
      if (!currentPlaybackId || clipId !== currentPlaybackId) return;

      // 1. Check if non-contiguous or terminal editorial boundary is reached
      const currentSegIndex = projection.segments.findIndex((s) => s.id === activeSegmentIdRef.current);
      if (currentSegIndex !== -1) {
        const currentSeg = projection.segments[currentSegIndex];
        if (currentSeg.sourceClipId === currentPlaybackId) {
          const isNextContiguous =
            currentSegIndex < projection.segments.length - 1 &&
            currentSeg.sourceClipId === projection.segments[currentSegIndex + 1].sourceClipId &&
            Math.abs(currentSeg.sourceTrimEnd - projection.segments[currentSegIndex + 1].sourceTrimStart) < 0.04;

          // Non-contiguous same-source (rearranged/trimmed), different-source, or sequence end:
          if (!isNextContiguous) {
            const segDuration = currentSeg.sourceTrimEnd - currentSeg.sourceTrimStart;
            const tolerance = Math.min(0.05, segDuration * 0.25);

            if (sourceTime >= currentSeg.sourceTrimEnd - tolerance) {
              if (currentSegIndex >= projection.segments.length - 1) {
                handleSequenceEnded();
              } else {
                handleBoundaryReached();
              }
              return;
            }
          }
        }
      }

      // 2. Map continuous playback position to sequence playhead
      const seqTime = resolveSourceToSequenceTime(
        currentPlaybackId,
        sourceTime,
        projection.segments,
        activeSegmentIdRef.current
      );
      if (seqTime !== null) {
        setPlayheadSequenceTime(seqTime);
      }
    },
    [currentPlaybackId, projection.segments, handleBoundaryReached, handleSequenceEnded]
  );

  // Jump Previous Segment
  const handlePrevClip = useCallback(() => {
    const currentIndex = projection.segments.findIndex((s) => s.id === activeSegmentId);
    const targetSeg =
      currentIndex > 0
        ? projection.segments[currentIndex - 1]
        : projection.segments[0];

    if (targetSeg) {
      if (targetSeg.sourceClipId !== currentPlaybackId) {
        setActivePlaybackClipId(targetSeg.sourceClipId);
      }
      setPlayheadSequenceTime(targetSeg.sequenceStart);
      setPendingSeekTime(targetSeg.sourceTrimStart);

      const transitionId = nextTransitionId();
      editorPlayerRef.current?.executeCommand({
        type: 'seek-sequence',
        sourceClipId: targetSeg.sourceClipId,
        sourceTime: targetSeg.sourceTrimStart,
        sequenceTime: targetSeg.sequenceStart,
        transitionId,
      });
    }
  }, [activeSegmentId, currentPlaybackId, projection.segments, nextTransitionId]);

  // Jump Next Segment
  const handleNextClip = useCallback(() => {
    const currentIndex = projection.segments.findIndex((s) => s.id === activeSegmentId);
    if (currentIndex >= 0 && currentIndex < projection.segments.length - 1) {
      const nextSeg = projection.segments[currentIndex + 1];
      if (nextSeg.sourceClipId !== currentPlaybackId) {
        setActivePlaybackClipId(nextSeg.sourceClipId);
      }
      setPlayheadSequenceTime(nextSeg.sequenceStart);
      setPendingSeekTime(nextSeg.sourceTrimStart);

      const transitionId = nextTransitionId();
      editorPlayerRef.current?.executeCommand({
        type: 'seek-sequence',
        sourceClipId: nextSeg.sourceClipId,
        sourceTime: nextSeg.sourceTrimStart,
        sequenceTime: nextSeg.sequenceStart,
        transitionId,
      });
    }
  }, [activeSegmentId, currentPlaybackId, projection.segments, nextTransitionId]);

  // Scrub start: capture playback status, pause active player immediately, and enter SEEKING sync mode
  const handleScrubStart = useCallback(() => {
    const wasPlaying = isPlaying;
    wasPlayingBeforeScrubRef.current = wasPlaying;
    if (wasPlaying) {
      setIsPlaying(false);
      editorPlayerRef.current?.pause();
    }
    syncModeRef.current = 'SEEKING';
  }, [isPlaying]);

  // Timeline committed seek (ruler release / direct jump)
  const handleTimelineSeek = useCallback(
    (targetSeqTime: number) => {
      setPlayheadSequenceTime(targetSeqTime);
      const pos = resolveSequencePosition(targetSeqTime, projection.segments);
      if (pos) {
        if (pos.clipId !== currentPlaybackId) {
          setActivePlaybackClipId(pos.clipId);
          setSelectedClipId(pos.clipId);
        }
        setPendingSeekTime(pos.sourceTime);

        const transitionId = nextTransitionId();
        const p = editorPlayerRef.current?.executeCommand({
          type: 'seek-sequence',
          sourceClipId: pos.clipId,
          sourceTime: pos.sourceTime,
          sequenceTime: targetSeqTime,
          transitionId,
        });
        pendingSeekPromiseRef.current = p ?? null;
        return p;
      }
    },
    [currentPlaybackId, projection.segments, nextTransitionId]
  );

  // High-frequency rAF scrubbing (frame feedback without continuous React state churn)
  const handleScrubFrame = useCallback(
    (targetSeqTime: number) => {
      const pos = resolveSequencePosition(targetSeqTime, projection.segments);
      if (pos) {
        if (pos.clipId !== currentPlaybackId) {
          setActivePlaybackClipId(pos.clipId);
          setSelectedClipId(pos.clipId);
        }
        setPendingSeekTime(pos.sourceTime);

        const transitionId = nextTransitionId();
        editorPlayerRef.current?.executeCommand({
          type: 'seek-sequence',
          sourceClipId: pos.clipId,
          sourceTime: pos.sourceTime,
          sequenceTime: targetSeqTime,
          transitionId,
        });
      }
    },
    [currentPlaybackId, projection.segments, nextTransitionId]
  );

  // Scrub end: wait for committed seek to settle, restore normal sync, and resume playback if was playing before scrub
  const handleScrubEnd = useCallback(
    async (finalSeqTime?: number) => {
      const resume = wasPlayingBeforeScrubRef.current;
      wasPlayingBeforeScrubRef.current = false;

      if (pendingSeekPromiseRef.current) {
        try {
          await pendingSeekPromiseRef.current;
        } catch {
          // Ignored
        }
        pendingSeekPromiseRef.current = null;
      }

      syncModeRef.current = 'NORMAL_PLAYBACK';

      if (resume) {
        if (
          finalSeqTime !== undefined &&
          finalSeqTime >= projection.totalSequenceDuration - 0.05
        ) {
          setIsPlaying(false);
          return;
        }

        try {
          await editorPlayerRef.current?.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
    },
    [projection.totalSequenceDuration]
  );

  // Select clip from Media Bin click
  const handleSelectClip = useCallback(
    (clipId: string) => {
      setSelectedClipId(clipId);
      setActivePlaybackClipId(clipId);
      const seg = projection.segments.find((s) => s.sourceClipId === clipId || s.clipId === clipId);
      if (seg) {
        setSelectedSegmentId(seg.id);
        setPlayheadSequenceTime(seg.sequenceStart);
        setPendingSeekTime(seg.sourceTrimStart);

        const transitionId = nextTransitionId();
        editorPlayerRef.current?.executeCommand({
          type: 'seek-sequence',
          sourceClipId: clipId,
          sourceTime: seg.sourceTrimStart,
          sequenceTime: seg.sequenceStart,
          transitionId,
        });
      }
    },
    [projection.segments, nextTransitionId]
  );

  // Select timeline segment from Timeline click
  const handleSelectSegment = useCallback(
    (segmentId: string) => {
      setSelectedSegmentId(segmentId);
      const seg = projection.segments.find((s) => s.id === segmentId);
      if (seg) {
        if (seg.sourceClipId !== currentPlaybackId) {
          setActivePlaybackClipId(seg.sourceClipId);
        }
        setPlayheadSequenceTime(seg.sequenceStart);
        setPendingSeekTime(seg.sourceTrimStart);

        const transitionId = nextTransitionId();
        editorPlayerRef.current?.executeCommand({
          type: 'seek-sequence',
          sourceClipId: seg.sourceClipId,
          sourceTime: seg.sourceTrimStart,
          sequenceTime: seg.sequenceStart,
          transitionId,
        });
      }
    },
    [currentPlaybackId, projection.segments, nextTransitionId]
  );

  // Draft Trim Preview (seeks frame without mutating committed trimRange)
  const handleTrimPreview = useCallback(
    (clipId: string, timestamp: number) => {
      if (clipId !== currentPlaybackId) {
        setActivePlaybackClipId(clipId);
      }
      setPendingSeekTime(timestamp);

      const transitionId = nextTransitionId();
      editorPlayerRef.current?.executeCommand({
        type: 'seek-sequence',
        sourceClipId: clipId,
        sourceTime: timestamp,
        sequenceTime: playheadSequenceTime,
        transitionId,
      });
    },
    [currentPlaybackId, playheadSequenceTime, nextTransitionId]
  );

  // Handle trim handle drag state: pauses playback on drag start, restores sync mode on drag end
  const handleTrimDragStateChange = useCallback((isDragging: boolean) => {
    if (isDragging) {
      editorPlayerRef.current?.pause();
      setIsPlaying(false);
      syncModeRef.current = 'SEEKING';
    } else {
      syncModeRef.current = 'NORMAL_PLAYBACK';
    }
  }, []);

  // Split at playhead handler
  const handleSplitAtPlayhead = useCallback(() => {
    if (isLocked || !canSplit || !onSplitSegmentAtPlayhead) return;

    const result = onSplitSegmentAtPlayhead(playheadSequenceTime);
    if (result) {
      // Deterministic selection: select the newly created right-hand segment (Segment B)
      setSelectedSegmentId(result.rightSegmentId);
      // Playhead remains at exact sequence timestamp
    }
  }, [isLocked, canSplit, onSplitSegmentAtPlayhead, playheadSequenceTime]);

  // Delete selected timeline segment (with deterministic fallback selection)
  const handleDeleteSelectedSegment = useCallback(() => {
    if (isLocked || !currentSelectedSegmentId || !onRemoveTimelineSegment) return;
    const segments = projection.segments;
    const targetIndex = segments.findIndex((s) => s.id === currentSelectedSegmentId);
    if (targetIndex === -1) return;

    // Deterministic fallback: next -> previous -> null
    let fallbackId: string | null = null;
    if (targetIndex < segments.length - 1) {
      fallbackId = segments[targetIndex + 1].id;
    } else if (targetIndex > 0) {
      fallbackId = segments[targetIndex - 1].id;
    }

    if (segments.length <= 1) {
      setIsPlaying(false);
      editorPlayerRef.current?.pause();
      setPlayheadSequenceTime(0);
    }

    onRemoveTimelineSegment(currentSelectedSegmentId);
    setSelectedSegmentId(fallbackId);
  }, [isLocked, currentSelectedSegmentId, onRemoveTimelineSegment, projection.segments]);

  // Drag start handler: pauses video playback immediately if playing
  const handleDragStart = useCallback(() => {
    editorPlayerRef.current?.pause();
    setIsPlaying(false);
  }, []);

  // Drag & drop reorder handler
  const handleReorderSegments = useCallback(
    (startIndex: number, endIndex: number) => {
      if (startIndex === endIndex) return;

      editorPlayerRef.current?.pause();
      setIsPlaying(false);

      if (onReorderTimelineSegments) {
        onReorderTimelineSegments(startIndex, endIndex);
      } else {
        onReorder(startIndex, endIndex);
      }
    },
    [onReorderTimelineSegments, onReorder]
  );

  // Segment trim commit handler
  const handleSegmentTrimCommit = useCallback(
    (segmentId: string, range: VideoTrimRange) => {
      if (onUpdateSegmentTrim) {
        onUpdateSegmentTrim(segmentId, range);
      }
      // CRITICAL: onTrimChange(seg.sourceClipId, range) is deliberately NOT called here.
      // Trimming a timeline segment only edits that segment's editorial bounds;
      // it must never mutate the parent source media item or trigger global watermark re-analysis.
    },
    [onUpdateSegmentTrim]
  );

  // Chevron move handler: reuses reorder
  const handleMoveItem = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return;
      onReorder(index, targetIndex);
    },
    [items.length, onReorder]
  );

  // Add files handler: pauses active video if playing
  const handleAddFiles = useCallback(
    (files: File[]) => {
      editorPlayerRef.current?.pause();
      setIsPlaying(false);
      onAddFiles(files);
    },
    [onAddFiles]
  );

  // Remove entire source file (Media Bin removal)
  const handleDeleteSourceFile = useCallback(
    (sourceClipId: string) => {
      if (isLocked) return;

      editorPlayerRef.current?.pause();
      setIsPlaying(false);

      const remainingSources = items.filter((i) => i.id !== sourceClipId);
      const nextActive = remainingSources[0]?.id ?? null;
      setActivePlaybackClipId(nextActive);
      setSelectedClipId(nextActive);

      onRemoveFile(sourceClipId);
    },
    [isLocked, items, onRemoveFile]
  );

  // Studio Keyboard Shortcuts (S = Split, Delete = Remove Segment)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      if (e.code === 'KeyS') {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        handleDeleteSelectedSegment();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSplitAtPlayhead, handleDeleteSelectedSegment]);

  // Add source clip to timeline sequence from Master Bin
  const handleAddToTimeline = useCallback(
    (sourceClipId: string) => {
      if (onAddToTimeline) {
        onAddToTimeline(sourceClipId);
        setSelectedClipId(sourceClipId);
        setActivePlaybackClipId(sourceClipId);
      }
    },
    [onAddToTimeline]
  );

  return (
    <div
      ref={editorContainerRef}
      className={`flex flex-col space-y-4 transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-4 sm:p-6 overflow-y-auto w-full h-full'
          : ''
      }`}
    >
      {/* Studio Top Control Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <LayoutGrid size={14} className="text-primary-600" />
            Studio Editor View
          </span>
          <span className="text-[11px] text-slate-500">
            • Press <kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px] text-slate-700">S</kbd> to Split clip at playhead
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Full Screen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              isFullscreen
                ? 'bg-primary-600 text-white border border-primary-600 hover:bg-primary-700 shadow-primary-600/25'
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:border-slate-300'
            }`}
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Enter Full Screen'}
          >
            {isFullscreen ? (
              <Minimize2 size={14} className="text-white shrink-0" />
            ) : (
              <Maximize2 size={14} className="text-primary-600 shrink-0" />
            )}
            <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>

          {onSwitchToListView && (
            <button
              type="button"
              onClick={onSwitchToListView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-primary-700 bg-white hover:bg-primary-50/60 border border-slate-200/90 hover:border-primary-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Switch to Classic List View"
            >
              <List size={14} className="text-primary-600 shrink-0" />
              <span>Classic List View</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Split Section: Media Bin (Left) + Live Player (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Pane (5 cols): Media Bin */}
        <div className="lg:col-span-5 min-h-[300px]">
          <EditorMediaBin
            items={items}
            timelineSegments={timelineSegments}
            selectedId={currentSelectedId}
            onSelectClip={handleSelectClip}
            onAddFiles={handleAddFiles}
            onRemoveFile={handleDeleteSourceFile}
            onAddToTimeline={handleAddToTimeline}
            onReorder={onReorder}
            onMoveItem={handleMoveItem}
            onDragStart={handleDragStart}
            isFullscreen={isFullscreen}
            isLocked={isLocked}
          />
        </div>

        {/* Right Pane (7 cols): Preview Monitor */}
        <div className="lg:col-span-7 min-h-[300px]">
          <EditorPlayer
            ref={editorPlayerRef}
            activeItem={activeItem}
            nextItem={nextItem}
            activeIndex={activeIndex}
            totalItems={items.length}
            hasNextSegment={hasNextSegment}
            isPlaying={isPlaying}
            fps={authoritativeMetrics?.fps ?? null}
            canSplit={canSplit}
            splitDisabledReason={splitDisabledReason}
            onSplitAtPlayhead={handleSplitAtPlayhead}
            onPlayPause={handlePlayPause}
            onSeekSourceTime={handleSeekSourceTime}
            onPrevClip={handlePrevClip}
            onNextClip={handleNextClip}
            onBoundaryCrossed={handleBoundaryReached}
            onSequenceEnded={handleSequenceEnded}
            onTimeUpdate={handlePlayerTimeUpdate}
            onDeleteSelectedClip={handleDeleteSelectedSegment}
            onResolveUncertain={onResolveUncertain}
            initialSeekTime={pendingSeekTime}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      </div>

      {/* Bottom Pane: Interactive NLE Sequence Timeline */}
      <div className="w-full">
        <EditorTimeline
          items={items}
          segments={projection.segments}
          totalSequenceDuration={projection.totalSequenceDuration}
          selectedId={currentSelectedId}
          selectedSegmentId={currentSelectedSegmentId}
          playheadSequenceTime={playheadSequenceTime}
          pixelsPerSecond={pixelsPerSecond}
          maxZoom={maxTimelineZoom}
          fps={authoritativeMetrics?.fps ?? null}
          canSplit={canSplit}
          splitDisabledReason={splitDisabledReason}
          onSplitAtPlayhead={handleSplitAtPlayhead}
          onZoomChange={setPixelsPerSecond}
          onSelectClip={handleSelectClip}
          onSelectSegment={handleSelectSegment}
          onSeek={handleTimelineSeek}
          onScrubStart={handleScrubStart}
          onScrubFrame={handleScrubFrame}
          onScrubEnd={handleScrubEnd}
          onReorder={handleReorderSegments}
          onDragStart={handleDragStart}
          onTrimCommit={handleSegmentTrimCommit}
          onTrimPreview={handleTrimPreview}
          onTrimDragStateChange={handleTrimDragStateChange}
          onRemove={handleDeleteSelectedSegment}
          onResolveUncertain={onResolveUncertain}
          isLocked={isLocked}
        />
      </div>

      {/* Action Bar / Output Assembly */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 p-4 bg-slate-50/90 rounded-xl border border-slate-200/80">
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={RotateCcw}
          onClick={onClearQueue}
          disabled={isLocked}
        >
          Reset Timeline
        </Button>

        <div className="flex items-center gap-3">
          {items.length === 1 && (
            <span className="text-xs text-slate-400">
              Add at least 2 videos to merge
            </span>
          )}

          <div className="flex flex-col sm:items-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Play}
              onClick={onStartMerge}
              disabled={!preflight.compatible || items.length < 2 || isLocked}
              className="shadow-xs"
            >
              Merge &amp; Clean {items.length} Videos
            </Button>
            <span className="text-[11px] text-slate-400 mt-0.5">
              {totalWatermarks > 0
                ? `${totalWatermarks} watermark(s) will be automatically cleaned`
                : 'Watermarks will be removed automatically when detected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
