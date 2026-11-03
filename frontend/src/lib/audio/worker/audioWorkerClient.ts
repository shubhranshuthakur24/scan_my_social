/**
 * Audio Worker Client Bridge
 * Manages Dedicated Worker lifecycle, zero-copy buffer transfers, progress subscriptions, and cancellation.
 */

import { AudioDenoiseJob, AudioDenoiseProgress, AudioDenoiseResult, AudioDenoiseError } from '../types';

export interface ProcessDenoiseOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export function processAudioDenoise(
  job: AudioDenoiseJob,
  options: ProcessDenoiseOptions = {}
): Promise<AudioDenoiseResult> {
  return new Promise((resolve, reject) => {
    const { onProgress, signal } = options;

    if (signal?.aborted) {
      return reject(new DOMException('Operation aborted by user', 'AbortError'));
    }

    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('./audioDenoise.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch (err) {
      return reject(new Error(`Failed to instantiate Audio Denoise Worker: ${err instanceof Error ? err.message : String(err)}`));
    }

    // Handle cancellation
    const onAbort = () => {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      reject(new DOMException('Audio noise reduction cancelled by user', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };

    worker.onmessage = (event: MessageEvent<AudioDenoiseProgress | AudioDenoiseResult | AudioDenoiseError>) => {
      const data = event.data;

      if (data.type === 'progress') {
        if (onProgress) {
          onProgress(data.progress);
        }
      } else if (data.type === 'result') {
        cleanup();
        resolve(data);
      } else if (data.type === 'error') {
        cleanup();
        reject(new Error(data.error));
      }
    };

    worker.onerror = (errEvent) => {
      cleanup();
      reject(new Error(`Worker execution error: ${errEvent.message || 'Unknown error'}`));
    };

    // Prepare transferables: clone or transfer the Float32Array buffers
    // For zero-copy transfer to worker
    const transferables: Transferable[] = [];
    const transferredChannels: Float32Array[] = [];

    for (let ch = 0; ch < job.channelData.length; ch++) {
      // Allocate isolated copy for worker transfer to keep main thread original intact for A/B auditioning
      const channelCopy = new Float32Array(job.channelData[ch]);
      transferredChannels.push(channelCopy);
      transferables.push(channelCopy.buffer as ArrayBuffer);
    }

    const payload: AudioDenoiseJob = {
      ...job,
      channelData: transferredChannels,
    };

    worker.postMessage(payload, transferables);
  });
}
