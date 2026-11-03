/**
 * Dedicated Web Worker for local image watermark detection and reverse-alpha restoration.
 * Executes CPU-bound candidate evaluation, gradient correlation, and pixel restoration off the main thread.
 */

import {
  ImageWorkerInboundMessage,
  ImageWorkerOutboundMessage,
} from '../types';
import { removeWatermarkFromImageDataSync } from '../core/imageData.js';

interface WorkerScope {
  onmessage: ((e: MessageEvent<ImageWorkerInboundMessage>) => void) | null;
  postMessage: (message: ImageWorkerOutboundMessage, transfer?: Transferable[]) => void;
}

const workerScope = self as unknown as WorkerScope;

let activeOperationId: number | null = null;

workerScope.onmessage = (event: MessageEvent<ImageWorkerInboundMessage>) => {
  const message = event.data;
  if (!message) return;

  if (message.type === 'CANCEL') {
    if (activeOperationId === message.operationId) {
      activeOperationId = null;
    }
    return;
  }

  if (message.type === 'PROCESS_IMAGE') {
    const { operationId, imageData, options } = message;
    activeOperationId = operationId;

    try {
      // Execute synchronous reverse-alpha pipeline
      const result = removeWatermarkFromImageDataSync(imageData, {
        adaptiveMode: options?.adaptiveMode,
      });

      if (activeOperationId !== operationId) return;

      const meta = result.meta || {};
      const applied = Boolean(meta.applied);
      const isSkipped = meta.skipReason === 'no-watermark-detected' || !applied;

      if (isSkipped) {
        workerScope.postMessage({
          type: 'IMAGE_NO_WATERMARK',
          operationId,
          meta: {
            skipReason: meta.skipReason || 'no-watermark-detected',
            confidence: meta.detection?.adaptiveConfidence ?? 0,
          },
        });
      } else {
        // Zero-copy transfer of output ImageData pixel buffer
        const outImageData = result.imageData;
        workerScope.postMessage(
          {
            type: 'IMAGE_COMPLETE',
            operationId,
            imageData: outImageData,
            applied: true,
            meta: {
              applied: true,
              size: meta.size,
              position: meta.position,
              qualityStatus: meta.qualityStatus,
              selectionConfidence: meta.selectionConfidence,
            },
          },
          [outImageData.data.buffer]
        );
      }
    } catch (err: any) {
      if (activeOperationId === operationId) {
        workerScope.postMessage({
          type: 'ERROR',
          operationId,
          code: 'UNKNOWN_ERROR',
          message: err?.message || 'Failed to process image watermark.',
        });
      }
    } finally {
      if (activeOperationId === operationId) {
        activeOperationId = null;
      }
    }
  }
};
