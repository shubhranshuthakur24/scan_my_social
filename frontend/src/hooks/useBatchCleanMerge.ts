'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  BatchVideoItem,
  BatchOverallStatus,
  PreflightCompatibility,
  VideoTrimRange,
  deriveProcessingPath,
  hasAuthoritativeWatermarkDecision,
} from '@/lib/watermark/batch/batchTypes';
import {
  checkPreflightCompatibility,
  deriveBatchMergeContract,
  isStreamContractCompatible,
  PipelinedVideoMerger,
} from '@/lib/watermark/batch/videoMerger';
import {
  WorkerInboundMessage,
  WorkerOutboundMessage,
  VideoMetadata,
  AudioTrackInfo,
} from '@/lib/watermark/types';
import { isValidVideoFile } from '@/lib/watermark/browserCapabilities';
import { resolveEncodingParameters } from '@/lib/watermark/watermarkAdapter';
import {
  TimelineSegment,
  SplitResult,
  buildTimelineProjection,
  resolveSequencePosition,
  splitTimelineSegment,
  addTimelineSegment,
  removeTimelineSegment,
  reorderTimelineSegments,
} from '@/lib/watermark/batch/timelineProjection';
import { getAuthoritativeTimelineMetrics } from '@/lib/watermark/batch/framePrecision';

export interface UseBatchCleanMergeReturn {
  items: BatchVideoItem[];
  timelineSegments: TimelineSegment[];
  batchStatus: BatchOverallStatus;
  activeItemIndex: number;
  overallProgress: number;
  activeItemProgress: {
    phase: string;
    progress: number;
    currentFrame: number;
    totalFrames: number;
    elapsedSeconds: number;
  };
  mergedFile: File | null;
  mergedUrl: string | null;
  preflight: PreflightCompatibility;
  isQueueLocked: boolean;
  partialFailureError: { itemId: string; itemName: string; message: string } | null;
  writtenBytes: number;
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  moveQueueItem: (index: number, direction: 'up' | 'down') => void;
  setClipTrimRange: (id: string, range: VideoTrimRange | null) => void;
  resetClipTrim: (id: string) => void;
  resolveUncertainDecision: (id: string, resolution: 'force_clean' | 'keep_original') => void;
  removeIncompatibleFiles: () => void;
  clearQueue: () => void;
  splitSegmentAtPlayhead: (playheadSequenceTime: number) => SplitResult | null;
  addSourceClipToTimeline: (sourceClipId: string) => void;
  removeTimelineSegment: (segmentId: string) => void;
  reorderTimelineSegments: (startIndex: number, endIndex: number) => void;
  updateSegmentTrim: (segmentId: string, range: VideoTrimRange) => void;
  startBatchCleanMerge: () => Promise<void>;
  retryFailedClip: () => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
  returnToEditor: () => void;
}

export function useBatchCleanMerge(): UseBatchCleanMergeReturn {
  const [items, setItems] = useState<BatchVideoItem[]>([]);
  const [timelineSegments, setTimelineSegments] = useState<TimelineSegment[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchOverallStatus>('idle');
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [activeItemProgress, setActiveItemProgress] = useState({
    phase: 'idle',
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
    elapsedSeconds: 0,
  });
  const [mergedFile, setMergedFile] = useState<File | null>(null);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [isQueueLocked, setIsQueueLocked] = useState<boolean>(false);
  const [partialFailureError, setPartialFailureError] = useState<{
    itemId: string;
    itemName: string;
    message: string;
  } | null>(null);
  const [writtenBytes, setWrittenBytes] = useState<number>(0);

  const workerRef = useRef<Worker | null>(null);
  const operationIdRef = useRef<number>(0);
  const mergerRef = useRef<PipelinedVideoMerger | null>(null);
  const committedClipsCountRef = useRef<number>(0);
  const itemsRef = useRef<BatchVideoItem[]>([]);
  const timelineSegmentsRef = useRef<TimelineSegment[]>([]);
  const mergedUrlRef = useRef<string | null>(null);

  // Sync refs inside effects
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    timelineSegmentsRef.current = timelineSegments;
  }, [timelineSegments]);

  useEffect(() => {
    mergedUrlRef.current = mergedUrl;
  }, [mergedUrl]);

  // Compute preflight compatibility purely from items state
  const preflight = useMemo(() => checkPreflightCompatibility(items), [items]);

  const getOrCreateWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('@/lib/watermark/worker/watermark.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminateWorker();
      if (mergerRef.current) {
        mergerRef.current.cancel().catch(() => {});
        mergerRef.current = null;
      }
      if (mergedUrlRef.current) {
        URL.revokeObjectURL(mergedUrlRef.current);
      }
      itemsRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [terminateWorker]);

  const reset = useCallback(() => {
    terminateWorker();
    if (mergerRef.current) {
      mergerRef.current.cancel().catch(() => {});
      mergerRef.current = null;
    }
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      setMergedUrl(null);
      mergedUrlRef.current = null;
    }
    itemsRef.current.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });

    setItems([]);
    timelineSegmentsRef.current = [];
    setTimelineSegments([]);
    setBatchStatus('idle');
    setActiveItemIndex(0);
    setOverallProgress(0);
    setActiveItemProgress({
      phase: 'idle',
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      elapsedSeconds: 0,
    });
    setMergedFile(null);
    setIsQueueLocked(false);
    setPartialFailureError(null);
    setWrittenBytes(0);
    committedClipsCountRef.current = 0;
  }, [terminateWorker]);

  /**
   * Returns from completed or partial-failure state back to the interactive editor
   * with all clips, trim points, and decisions fully intact.
   */
  const returnToEditor = useCallback(() => {
    terminateWorker();
    if (mergerRef.current) {
      mergerRef.current.cancel().catch(() => {});
      mergerRef.current = null;
    }
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      setMergedUrl(null);
      mergedUrlRef.current = null;
    }
    setMergedFile(null);

    // Reset item processing lifecycle status while preserving their trim and decision
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        status:
          it.watermarkDecision === 'detected'
            ? 'ready'
            : it.watermarkDecision === 'uncertain'
            ? 'ready'
            : 'no_watermark',
      }))
    );

    setBatchStatus('ready');
    setActiveItemIndex(0);
    setOverallProgress(0);
    setActiveItemProgress({
      phase: 'idle',
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      elapsedSeconds: 0,
    });
    setIsQueueLocked(false);
    setPartialFailureError(null);
    setWrittenBytes(0);
    committedClipsCountRef.current = 0;
  }, [terminateWorker]);

  const clearQueue = useCallback(() => {
    if (isQueueLocked) return;
    reset();
  }, [isQueueLocked, reset]);

  const cancel = useCallback(async () => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'CANCEL',
        operationId: operationIdRef.current,
      } as WorkerInboundMessage);
      terminateWorker();
    }
    if (mergerRef.current) {
      await mergerRef.current.cancel();
      mergerRef.current = null;
    }
    committedClipsCountRef.current = 0;
    setIsQueueLocked(false);
    setBatchStatus('cancelled');
  }, [terminateWorker]);

  /**
   * Sequentially runs metadata and watermark analysis for any items pending analysis.
   */
  const processPendingDetections = useCallback(async (newItems: BatchVideoItem[]) => {
    setBatchStatus('analyzing');
    const worker = getOrCreateWorker();

    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      if (item.status !== 'queued') continue;

      const currentOpId = (operationIdRef.current += 1);

      // Update item status to validating
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'validating', analysisOperationId: currentOpId } : it))
      );

      const detectionResult = await new Promise<{
        metadata: VideoMetadata | null;
        audioInfo: AudioTrackInfo | null;
        detected: boolean;
        isConfident: boolean;
        watermarkType?: 'gemini_logo' | 'veo_text';
        watermarkDecision?: 'none' | 'detected' | 'uncertain';
        error?: string;
      }>((resolve) => {
        const handleMsg = (e: MessageEvent<WorkerOutboundMessage>) => {
          const msg = e.data;
          if (!msg || msg.operationId !== currentOpId) return;

          if (msg.type === 'DETECT_COMPLETE') {
            worker.removeEventListener('message', handleMsg);
            resolve({
              metadata: msg.metadata,
              audioInfo: msg.audioInfo,
              detected: msg.detected,
              isConfident: msg.isConfident,
              watermarkType: msg.watermarkType,
              watermarkDecision: msg.watermarkDecision,
            });
          } else if (msg.type === 'ERROR') {
            worker.removeEventListener('message', handleMsg);
            resolve({
              metadata: null,
              audioInfo: null,
              detected: false,
              isConfident: false,
              error: msg.message || 'Detection failed',
            });
          }
        };

        worker.addEventListener('message', handleMsg);
        worker.postMessage({
          type: 'DETECT',
          operationId: currentOpId,
          clipId: item.id,
          trimVersion: item.trimVersion,
          trimRange: item.trimRange,
          file: item.file,
        } as WorkerInboundMessage);
      });

      if (detectionResult.error) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'failed',
                  error: detectionResult.error,
                  watermarkDecision: 'none',
                }
              : it
          )
        );
      } else {
        const decision = detectionResult.watermarkDecision || (detectionResult.detected ? 'detected' : 'none');
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  metadata: detectionResult.metadata,
                  audioInfo: detectionResult.audioInfo,
                  detection: {
                    detected: detectionResult.detected,
                    isConfident: detectionResult.isConfident,
                    watermarkType: detectionResult.watermarkType,
                  },
                  watermarkDecision: decision,
                  watermarkDecisionSource: 'analysis',
                  analyzedRange: null,
                  status: decision === 'detected' ? 'ready' : (decision === 'uncertain' ? 'ready' : 'no_watermark'),
                }
              : it
          )
        );

        // Sync initial segment duration with resolved metadata
        if (detectionResult.metadata?.duration) {
          const dur = detectionResult.metadata.duration;
          setTimelineSegments((prev) => {
            const next = prev.map((seg) =>
              seg.sourceClipId === item.id && seg.sourceEnd === 0
                ? { ...seg, sourceEnd: dur, maxSourceLimit: dur }
                : seg
            );
            timelineSegmentsRef.current = next;
            return next;
          });
        }
      }
    }

    setBatchStatus('ready');
  }, [getOrCreateWorker]);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (isQueueLocked) return;

      const validNewItems: BatchVideoItem[] = [];

      for (const file of files) {
        const check = isValidVideoFile(file);
        if (!check.valid) continue;

        const previewUrl = URL.createObjectURL(file);
        validNewItems.push({
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          file,
          previewUrl,
          metadata: null,
          audioInfo: null,
          detection: null,
          watermarkDecision: 'pending',
          watermarkDecisionSource: null,
          analysisOperationId: 0,
          trimVersion: 0,
          trimRange: null,
          analyzedRange: null,
          status: 'queued',
          progress: 0,
        });
      }

      if (validNewItems.length === 0) return;

      const newSegments: TimelineSegment[] = validNewItems.map((it) => ({
        id: it.id,
        sourceClipId: it.id,
        sourceStart: 0,
        sourceEnd: 0,
      }));

      setItems((prev) => [...prev, ...validNewItems]);
      setTimelineSegments((prev) => {
        const next = [...prev, ...newSegments];
        timelineSegmentsRef.current = next;
        return next;
      });

      // Run sequential detection in background
      await processPendingDetections(validNewItems);
    },
    [isQueueLocked, processPendingDetections]
  );

  const removeFile = useCallback(
    (id: string) => {
      if (isQueueLocked) return;

      setItems((prev) => {
        const target = prev.find((i) => i.id === id);
        if (target?.previewUrl) {
          URL.revokeObjectURL(target.previewUrl);
        }
        return prev.filter((i) => i.id !== id);
      });

      // Decoupled media lifecycle: removing source media purges all child segments
      setTimelineSegments((prev) => {
        const next = prev.filter((seg) => seg.sourceClipId !== id);
        timelineSegmentsRef.current = next;
        return next;
      });

      if (partialFailureError && partialFailureError.itemId === id) {
        setPartialFailureError(null);
      }
    },
    [isQueueLocked, partialFailureError]
  );

  const reorderQueue = useCallback(
    (startIndex: number, endIndex: number) => {
      if (isQueueLocked) return;
      setItems((prev) => {
        const result = Array.from(prev);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
      });
    },
    [isQueueLocked]
  );

  const moveQueueItem = useCallback(
    (index: number, direction: 'up' | 'down') => {
      if (isQueueLocked) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= itemsRef.current.length) return;
      reorderQueue(index, targetIndex);
    },
    [isQueueLocked, reorderQueue]
  );

  const removeIncompatibleFiles = useCallback(() => {
    if (isQueueLocked) return;
    const idsToRemove = new Set(preflight.incompatibleItemIds);
    setItems((prev) => {
      prev.forEach((item) => {
        if (idsToRemove.has(item.id) && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return prev.filter((item) => !idsToRemove.has(item.id));
    });
  }, [isQueueLocked, preflight.incompatibleItemIds]);

  /**
   * Sets or updates the non-destructive trim range on a clip.
   * Race-safely dispatches background watermark re-analysis for the active range.
   */
  const setClipTrimRange = useCallback(
    (id: string, range: VideoTrimRange | null) => {
      if (isQueueLocked) return;

      const currentOpId = (operationIdRef.current += 1);
      let targetFile: File | null = null;
      let nextTrimVersion = 1;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          targetFile = item.file;
          nextTrimVersion = item.trimVersion + 1;
          return {
            ...item,
            trimRange: range,
            trimVersion: nextTrimVersion,
            analysisOperationId: currentOpId,
            watermarkDecision: 'pending',
            watermarkDecisionSource: null,
            status: 'analyzing',
          };
        })
      );

      if (!targetFile) return;

      // Re-run background detection strictly for the active trim range
      const worker = getOrCreateWorker();
      const fileToAnalyze = targetFile;

      const handleTrimMsg = (e: MessageEvent<WorkerOutboundMessage>) => {
        const msg = e.data;
        if (
          !msg ||
          msg.operationId !== currentOpId ||
          msg.clipId !== id ||
          msg.trimVersion !== nextTrimVersion
        ) {
          return;
        }

        if (msg.type === 'DETECT_COMPLETE') {
          worker.removeEventListener('message', handleTrimMsg);
          const decision = msg.watermarkDecision || (msg.detected ? 'detected' : 'none');
          setItems((prev) =>
            prev.map((it) => {
              if (
                it.id !== id ||
                it.analysisOperationId !== currentOpId ||
                it.trimVersion !== nextTrimVersion
              ) {
                return it;
              }
              return {
                ...it,
                detection: {
                  detected: msg.detected,
                  isConfident: msg.isConfident,
                  watermarkType: msg.watermarkType,
                },
                watermarkDecision: decision,
                watermarkDecisionSource: 'analysis',
                analyzedRange: range ? { ...range } : null,
                status: decision === 'detected' ? 'ready' : (decision === 'uncertain' ? 'ready' : 'no_watermark'),
              };
            })
          );
        } else if (msg.type === 'ERROR') {
          worker.removeEventListener('message', handleTrimMsg);
          setItems((prev) =>
            prev.map((it) => {
              if (
                it.id !== id ||
                it.analysisOperationId !== currentOpId ||
                it.trimVersion !== nextTrimVersion
              ) {
                return it;
              }
              return {
                ...it,
                status: 'failed',
                error: msg.message || 'Watermark detection failed for trimmed range.',
              };
            })
          );
        }
      };

      worker.addEventListener('message', handleTrimMsg);
      worker.postMessage({
        type: 'DETECT',
        operationId: currentOpId,
        clipId: id,
        trimVersion: nextTrimVersion,
        trimRange: range,
        file: fileToAnalyze,
      } as WorkerInboundMessage);
    },
    [getOrCreateWorker, isQueueLocked]
  );

  const resetClipTrim = useCallback(
    (id: string) => {
      setClipTrimRange(id, null);
    },
    [setClipTrimRange]
  );

  const resolveUncertainDecision = useCallback(
    (id: string, resolution: 'force_clean' | 'keep_original') => {
      if (isQueueLocked) return;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          const decision = resolution === 'force_clean' ? 'detected' : 'none';
          return {
            ...it,
            watermarkDecision: decision,
            watermarkDecisionSource: 'user_override',
            status: decision === 'detected' ? 'ready' : 'no_watermark',
          };
        })
      );
    },
    [isQueueLocked]
  );

  /**
   * Pure frame-accurate split at sequence playhead.
   */
  const splitSegmentAtPlayhead = useCallback(
    (playheadSequenceTime: number): SplitResult | null => {
      if (isQueueLocked) return null;

      const currentItems = itemsRef.current;
      const currentSegments = timelineSegmentsRef.current;

      const projection = buildTimelineProjection(currentItems, currentSegments);
      const position = resolveSequencePosition(playheadSequenceTime, projection.segments);
      if (!position || !position.segmentId || position.isAtEndBoundary) {
        return null;
      }

      const sourceItem = currentItems.find((i) => i.id === position.clipId);
      if (!sourceItem) return null;

      const metrics = getAuthoritativeTimelineMetrics(sourceItem);
      if (!metrics) {
        return null;
      }

      const result = splitTimelineSegment(
        currentSegments,
        position.segmentId,
        position.sourceTime,
        metrics.fps
      );

      if (!result) return null;

      timelineSegmentsRef.current = result.updatedSegments;
      setTimelineSegments(result.updatedSegments);
      return result;
    },
    [isQueueLocked]
  );

  const addSourceClipToTimeline = useCallback(
    (sourceClipId: string) => {
      if (isQueueLocked) return;
      const sourceItem = itemsRef.current.find((i) => i.id === sourceClipId);
      if (!sourceItem) return;

      const currentSegments = timelineSegmentsRef.current;
      const updated = addTimelineSegment(currentSegments, sourceItem);
      timelineSegmentsRef.current = updated;
      setTimelineSegments(updated);
    },
    [isQueueLocked]
  );

  const removeTimelineSegmentAction = useCallback(
    (segmentId: string) => {
      if (isQueueLocked) return;
      const currentSegments = timelineSegmentsRef.current;
      const updated = removeTimelineSegment(currentSegments, segmentId);
      timelineSegmentsRef.current = updated;
      setTimelineSegments(updated);
    },
    [isQueueLocked]
  );

  const reorderTimelineSegmentsAction = useCallback(
    (startIndex: number, endIndex: number) => {
      if (isQueueLocked) return;
      const updated = reorderTimelineSegments(timelineSegmentsRef.current, startIndex, endIndex);
      timelineSegmentsRef.current = updated;
      setTimelineSegments(updated);
    },
    [isQueueLocked]
  );

  const updateSegmentTrim = useCallback(
    (segmentId: string, range: VideoTrimRange) => {
      if (isQueueLocked) return;
      const updated = timelineSegmentsRef.current.map((seg) => {
        if (seg.id !== segmentId) return seg;
        const minLimit = seg.minSourceLimit ?? 0;
        const maxLimit =
          seg.maxSourceLimit ??
          (itemsRef.current.find((i) => i.id === seg.sourceClipId)?.metadata?.duration ?? range.end);
        const start = Math.max(minLimit, Math.min(range.start, maxLimit - 0.05));
        const end = Math.min(maxLimit, Math.max(range.end, start + 0.05));
        return {
          ...seg,
          sourceStart: start,
          sourceEnd: end,
        };
      });
      timelineSegmentsRef.current = updated;
      setTimelineSegments(updated);
    },
    [isQueueLocked]
  );

  /**
   * Core sequential clean, feed, and release execution loop.
   * V1 processing contract: iterates over timeline segments, feeding each trimmed segment into the merger.
   */
  const executePipelineFromIndex = useCallback(
    async (startIndex: number) => {
      const currentItems = itemsRef.current;
      const currentSegments = timelineSegmentsRef.current;
      const effectiveSegments: TimelineSegment[] =
        currentSegments.length > 0
          ? currentSegments
          : currentItems.map((it) => ({
              id: it.id,
              sourceClipId: it.id,
              sourceStart: it.trimRange?.start ?? 0,
              sourceEnd: it.trimRange?.end ?? (it.metadata?.duration ?? 0),
            }));

      if (effectiveSegments.length < 2) return;

      // Hard gate: all clips referenced by segments must have authoritative decisions and not be uncertain
      for (const seg of effectiveSegments) {
        const item = currentItems.find((it) => it.id === seg.sourceClipId);
        if (!item || !hasAuthoritativeWatermarkDecision(item)) {
          throw new Error(`Clip "${item?.file.name || seg.sourceClipId}" has an incomplete or uncertain watermark status.`);
        }
      }

      setIsQueueLocked(true);
      setPartialFailureError(null);

      // If starting from index 0, create a new Merger instance
      if (startIndex === 0 || !mergerRef.current) {
        setBatchStatus('preparing');
        if (mergerRef.current) {
          await mergerRef.current.cancel();
        }
        mergerRef.current = new PipelinedVideoMerger({
          onBytesWrittenThrottled: (bytes) => setWrittenBytes(bytes),
        });
        committedClipsCountRef.current = 0;
      }

      const merger = mergerRef.current;
      const worker = getOrCreateWorker();
      const totalClips = effectiveSegments.length;
      const contract = deriveBatchMergeContract(currentItems);

      setBatchStatus('processing');

      for (let i = startIndex; i < totalClips; i++) {
        const segment = effectiveSegments[i];
        const item = currentItems.find((it) => it.id === segment.sourceClipId) || currentItems[0];
        setActiveItemIndex(i);

        // Update overall progress base
        const baseBatchProgress = i / totalClips;
        setOverallProgress(baseBatchProgress);

        let streamToFeed: File | Blob = item.file;
        let tempCleanedBlobUrl: string | null = null;

        try {
          const segTrimRange: VideoTrimRange = { start: segment.sourceStart, end: segment.sourceEnd };
          const itemWithSegmentTrim: BatchVideoItem = {
            ...item,
            trimRange: segTrimRange,
          };

          // Derive execution path (A, B, C, D, or E)
          const isCompatible = contract ? isStreamContractCompatible(itemWithSegmentTrim, contract) : false;
          const path = deriveProcessingPath(itemWithSegmentTrim, isCompatible);

          // Update item state with derived path for UI telemetry
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, processingPath: path } : it))
          );

          if (path !== 'passthrough') {
            // Paths B, C, D, and E require worker execution
            const isCleaningPhase = path === 'clean' || path === 'trim_and_clean';
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, status: isCleaningPhase ? 'cleaning' : 'validating', progress: 0 } : it
              )
            );

            const encodingParams = item.metadata ? resolveEncodingParameters(item.metadata) : { bitrate: 12_000_000 };
            const cleanOpId = (operationIdRef.current += 1);

            const cleanedBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
              const handleProcessMsg = (e: MessageEvent<WorkerOutboundMessage>) => {
                const msg = e.data;
                if (!msg || msg.operationId !== cleanOpId) return;

                if (msg.type === 'PROCESS_PROGRESS') {
                  const clipFraction = (msg.progress || 0) / totalClips;
                  setOverallProgress(baseBatchProgress + clipFraction * 0.7);
                  setActiveItemProgress({
                    phase: msg.phase,
                    progress: msg.progress,
                    currentFrame: msg.currentFrame,
                    totalFrames: msg.totalFrames,
                    elapsedSeconds: msg.elapsedSeconds,
                  });
                  setItems((prev) =>
                    prev.map((it) =>
                      it.id === item.id
                        ? {
                            ...it,
                            progress: msg.progress,
                            currentFrame: msg.currentFrame,
                            totalFrames: msg.totalFrames,
                          }
                        : it
                    )
                  );
                } else if (msg.type === 'PROCESS_COMPLETE') {
                  worker.removeEventListener('message', handleProcessMsg);
                  resolve(msg.buffer);
                } else if (msg.type === 'ERROR') {
                  worker.removeEventListener('message', handleProcessMsg);
                  reject(new Error(msg.message || 'Video processing failed.'));
                }
              };

              worker.addEventListener('message', handleProcessMsg);
              worker.postMessage({
                type: 'PROCESS',
                operationId: cleanOpId,
                file: item.file,
                clipId: segment.id,
                trimVersion: item.trimVersion,
                trimRange: segTrimRange,
                targetContract: contract?.video || null,
                skipWatermarkRemoval: path === 'trim' || path === 'normalize',
                options: {
                  preserveAudio: true,
                  videoBitrate: encodingParams.bitrate,
                  adaptiveAlpha: true,
                },
              } as WorkerInboundMessage);
            });

            const blob = new Blob([cleanedBuffer], { type: 'video/mp4' });
            streamToFeed = blob;
            tempCleanedBlobUrl = URL.createObjectURL(blob);
          }

          // Transition to feeding state
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, status: 'feeding', progress: 0.9 } : it))
          );
          setActiveItemProgress((prev) => ({ ...prev, phase: 'feeding', progress: 0.9 }));

          // For the very first segment of the entire batch, establish the merge contract and initialize Output
          if (i === 0 && !merger.getEstablishedContract()) {
            await merger.initializeFromFirstClip(streamToFeed);
          } else {
            // For subsequent segments, validate runtime contract
            const validation = await merger.validateRuntimeContract(streamToFeed);
            if (!validation.valid) {
              throw new Error(validation.reason || 'Clip failed runtime merge contract validation.');
            }
          }

          // Stream packets into the Output pipeline
          await merger.feedClipPackets(streamToFeed);

          committedClipsCountRef.current = i + 1;

          // Mark item as completed in queue
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: 'completed', progress: 1 } : it
            )
          );
          setOverallProgress((i + 1) / totalClips);
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown processing error during batch assembly.';
          setBatchStatus('partial_failure');
          setPartialFailureError({
            itemId: item.id,
            itemName: item.file.name,
            message: errorMessage,
          });
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: 'failed', error: errorMessage } : it
            )
          );
          return;
        } finally {
          if (tempCleanedBlobUrl) {
            URL.revokeObjectURL(tempCleanedBlobUrl);
          }
        }
      }

      setBatchStatus('finalizing');
      setActiveItemProgress((prev) => ({ ...prev, phase: 'finalizing', progress: 1 }));

      try {
        const { file: finalFile } = await merger.finalize();
        const url = URL.createObjectURL(finalFile);

        setMergedFile(finalFile);
        setMergedUrl(url);
        mergedUrlRef.current = url;
        setBatchStatus('completed');
      } catch (err: unknown) {
        const finalizeError =
          err instanceof Error ? err.message : 'Failed to finalize merged video output.';
        setBatchStatus('partial_failure');
        setPartialFailureError({
          itemId: 'finalize',
          itemName: 'Final Video Assembly',
          message: finalizeError,
        });
      } finally {
        setIsQueueLocked(false);
      }
    },
    [getOrCreateWorker]
  );

  const startBatchCleanMerge = useCallback(async () => {
    if (!preflight.compatible) return;
    await executePipelineFromIndex(0);
  }, [executePipelineFromIndex, preflight.compatible]);

  const retryFailedClip = useCallback(async () => {
    if (!partialFailureError) return;

    const failedIndex = items.findIndex((i) => i.id === partialFailureError.itemId);
    if (failedIndex === -1) {
      // If the failed item was removed, restart the pipeline from index 0
      await executePipelineFromIndex(0);
      return;
    }

    // If failedIndex equals committedClipsCountRef.current, we can retry in place
    if (failedIndex === committedClipsCountRef.current && mergerRef.current) {
      await executePipelineFromIndex(failedIndex);
    } else {
      // Committed clips were altered or order changed: rebuild from scratch
      await executePipelineFromIndex(0);
    }
  }, [executePipelineFromIndex, items, partialFailureError]);

  return {
    items,
    timelineSegments,
    batchStatus,
    activeItemIndex,
    overallProgress,
    activeItemProgress,
    mergedFile,
    mergedUrl,
    preflight,
    isQueueLocked,
    partialFailureError,
    writtenBytes,
    addFiles,
    removeFile,
    reorderQueue,
    moveQueueItem,
    setClipTrimRange,
    resetClipTrim,
    resolveUncertainDecision,
    removeIncompatibleFiles,
    clearQueue,
    splitSegmentAtPlayhead,
    addSourceClipToTimeline,
    removeTimelineSegment: removeTimelineSegmentAction,
    reorderTimelineSegments: reorderTimelineSegmentsAction,
    updateSegmentTrim,
    startBatchCleanMerge,
    retryFailedClip,
    cancel,
    reset,
    returnToEditor,
  };
}
