/**
 * Dedicated Web Worker for local video watermark detection and reverse-alpha restoration.
 * Isolates all WebCodecs, mediabunny demuxing/muxing, and Canvas 2D math from the main thread.
 */

import {
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '../types';
import {
  detectWatermarkWithAudioInfo,
  processWatermarkRemoval,
} from '../watermarkAdapter';

// Context interface avoiding DOM library type collision
interface WorkerScope {
  onmessage: ((e: MessageEvent<WorkerInboundMessage>) => void) | null;
  postMessage: (message: WorkerOutboundMessage, transfer?: Transferable[]) => void;
}

const workerScope = self as unknown as WorkerScope;

let activeOperationId: number | null = null;
const detectionCache = new Map<string, unknown>();

function getDetectionCacheKey(clipId?: string, file?: File, trimRange?: { start: number; end: number } | null): string {
  const rangePart = trimRange ? `:${trimRange.start.toFixed(3)}-${trimRange.end.toFixed(3)}` : ':all';
  if (clipId) return `${clipId}${rangePart}`;
  return `${file?.name || 'unknown'}:${file?.size || 0}:${file?.lastModified || 0}${rangePart}`;
}

workerScope.onmessage = async (event: MessageEvent<WorkerInboundMessage>) => {
  const message = event.data;
  if (!message) return;

  if (message.type === 'CANCEL') {
    if (activeOperationId === message.operationId) {
      activeOperationId = null;
    }
    return;
  }

  if (message.type === 'DETECT') {
    const { operationId, file, clipId, trimVersion, trimRange } = message;
    activeOperationId = operationId;

    try {
      const result = await detectWatermarkWithAudioInfo(file, {
        trimRange,
        onProgress: (progress, step) => {
          if (activeOperationId === operationId) {
            workerScope.postMessage({
              type: 'DETECT_PROGRESS',
              operationId,
              clipId,
              trimVersion,
              progress,
              step: step as 'sample' | 'score' | 'done',
            });
          }
        },
      });

      if (result.rawDetection) {
        const cacheKey = getDetectionCacheKey(clipId, file, trimRange);
        detectionCache.set(cacheKey, result.rawDetection);
      }

      if (activeOperationId === operationId) {
        workerScope.postMessage({
          type: 'DETECT_COMPLETE',
          operationId,
          clipId,
          trimVersion,
          trimRange,
          detected: result.detection.detected,
          isConfident: result.detection.isConfident,
          watermarkType: result.detection.watermarkType,
          watermarkDecision: result.watermarkDecision,
          watermarkScore: result.watermarkScore,
          metadata: result.metadata,
          audioInfo: result.audioInfo,
        });
      }
    } catch (err: unknown) {
      if (activeOperationId === operationId) {
        const message = err instanceof Error ? err.message : 'Failed to analyze video watermark.';
        workerScope.postMessage({
          type: 'ERROR',
          operationId,
          clipId,
          trimVersion,
          code: 'DECODE_FAILED',
          message,
        });
      }
    } finally {
      if (activeOperationId === operationId) {
        activeOperationId = null;
      }
    }
    return;
  }

  if (message.type === 'PROCESS') {
    const { operationId, file, clipId, trimVersion, trimRange, targetContract, skipWatermarkRemoval, options } = message;
    activeOperationId = operationId;

    try {
      const cacheKey = getDetectionCacheKey(clipId, file, trimRange);
      const cachedDetection = detectionCache.get(cacheKey);

      const result = await processWatermarkRemoval(file, {
        preserveAudio: options?.preserveAudio !== false,
        videoBitrate: options?.videoBitrate,
        adaptiveAlpha: options?.adaptiveAlpha ?? true,
        trimRange,
        targetContract,
        skipWatermarkRemoval,
        detection: cachedDetection,
        onProgress: (p) => {
          if (activeOperationId === operationId) {
            workerScope.postMessage({
              type: 'PROCESS_PROGRESS',
              operationId,
              clipId,
              trimVersion,
              phase: p.phase,
              progress: p.progress,
              currentFrame: p.currentFrame,
              totalFrames: p.totalFrames,
              elapsedSeconds: p.elapsedSeconds,
            });
          }
        },
      });

      if (activeOperationId === operationId) {
        // Transfer ArrayBuffer for zero-copy IPC performance
        workerScope.postMessage(
          {
            type: 'PROCESS_COMPLETE',
            operationId,
            clipId,
            trimVersion,
            buffer: result.buffer,
            mimeType: result.mimeType,
            metadata: result.metadata,
            audioResult: result.audioResult,
          },
          [result.buffer]
        );
      }
    } catch (err: unknown) {
      if (activeOperationId === operationId) {
        const errObj = err instanceof Error ? err : null;
        const isOom = errObj?.name === 'RangeError' || Boolean(errObj?.message?.includes('allocation failed'));
        workerScope.postMessage({
          type: 'ERROR',
          operationId,
          clipId,
          trimVersion,
          code: isOom ? 'OUT_OF_MEMORY' : 'ENCODE_FAILED',
          message: errObj?.message || 'Video watermark removal failed during export.',
        });
      }
    } finally {
      if (activeOperationId === operationId) {
        activeOperationId = null;
      }
    }
    return;
  }
};
