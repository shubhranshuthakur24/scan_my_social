'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  WatermarkRemovalStatus,
  VideoMetadata,
  AudioTrackInfo,
  AudioCopyResult,
  WatermarkDetectionResult,
  DomainError,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '@/lib/watermark/types';
import {
  checkBaselineBrowserCapabilities,
  validateSourceCapabilities,
  isValidVideoFile,
  RECOMMENDED_MAX_DURATION_SECONDS,
  RECOMMENDED_MAX_FILE_SIZE_BYTES,
  BaselineCapabilities,
} from '@/lib/watermark/browserCapabilities';
import { resolveEncodingParameters } from '@/lib/watermark/watermarkAdapter';

export interface UseWatermarkRemovalReturn {
  status: WatermarkRemovalStatus;
  originalFile: File | null;
  originalUrl: string | null;
  cleanedBlob: Blob | null;
  cleanedUrl: string | null;
  cleanedFile: File | null;
  detectionResult: WatermarkDetectionResult | null;
  metadata: VideoMetadata | null;
  audioInfo: AudioTrackInfo | null;
  audioResult: AudioCopyResult | null;
  progress: {
    phase: string;
    progress: number;
    currentFrame: number;
    totalFrames: number;
    elapsedSeconds: number;
  };
  error: DomainError | null;
  baselineCaps: BaselineCapabilities;
  durationWarning: string | null;
  sizeWarning: string | null;
  isUnsupportedAudioModalOpen: boolean;
  selectFile: (file: File) => Promise<void>;
  startProcessing: () => Promise<void>;
  confirmProcessingWithoutAudio: () => Promise<void>;
  cancelAudioModal: () => void;
  cancel: () => void;
  reset: () => void;
}

export function useWatermarkRemoval(): UseWatermarkRemovalReturn {
  const [status, setStatus] = useState<WatermarkRemovalStatus>('idle');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [cleanedBlob, setCleanedBlob] = useState<Blob | null>(null);
  const [cleanedUrl, setCleanedUrl] = useState<string | null>(null);
  const [cleanedFile, setCleanedFile] = useState<File | null>(null);
  const [detectionResult, setDetectionResult] = useState<WatermarkDetectionResult | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [audioInfo, setAudioInfo] = useState<AudioTrackInfo | null>(null);
  const [audioResult, setAudioResult] = useState<AudioCopyResult | null>(null);
  const [progress, setProgress] = useState({
    phase: 'idle',
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
    elapsedSeconds: 0,
  });
  const [error, setError] = useState<DomainError | null>(null);
  const [durationWarning, setDurationWarning] = useState<string | null>(null);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [isUnsupportedAudioModalOpen, setIsUnsupportedAudioModalOpen] = useState(false);

  const [baselineCaps, setBaselineCaps] = useState<BaselineCapabilities>(() => ({
    isSupported: true,
    hasWorker: true,
    hasOffscreenCanvas: true,
    hasWebCodecs: true,
    isMobileDevice: false,
    unsupportedReasons: [],
  }));

  const workerRef = useRef<Worker | null>(null);
  const operationIdRef = useRef<number>(0);
  const originalUrlRef = useRef<string | null>(null);
  const cleanedUrlRef = useRef<string | null>(null);

  // Probe capabilities on client mount
  useEffect(() => {
    setBaselineCaps(checkBaselineBrowserCapabilities());
  }, []);

  // Sync url refs for unmount cleanup
  originalUrlRef.current = originalUrl;
  cleanedUrlRef.current = cleanedUrl;

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const getOrCreateWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('@/lib/watermark/worker/watermark.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminateWorker();
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      if (cleanedUrlRef.current) URL.revokeObjectURL(cleanedUrlRef.current);
    };
  }, [terminateWorker]);

  const reset = useCallback(() => {
    terminateWorker();
    operationIdRef.current += 1;

    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = null;
    }
    if (cleanedUrlRef.current) {
      URL.revokeObjectURL(cleanedUrlRef.current);
      cleanedUrlRef.current = null;
    }

    setStatus('idle');
    setOriginalFile(null);
    setOriginalUrl(null);
    setCleanedBlob(null);
    setCleanedUrl(null);
    setCleanedFile(null);
    setDetectionResult(null);
    setMetadata(null);
    setAudioInfo(null);
    setAudioResult(null);
    setProgress({ phase: 'idle', progress: 0, currentFrame: 0, totalFrames: 0, elapsedSeconds: 0 });
    setError(null);
    setDurationWarning(null);
    setSizeWarning(null);
    setIsUnsupportedAudioModalOpen(false);
  }, [terminateWorker]);

  const cancel = useCallback(() => {
    const opId = operationIdRef.current;
    if (workerRef.current) {
      try {
        workerRef.current.postMessage({ type: 'CANCEL', operationId: opId } as WorkerInboundMessage);
      } catch {
        // Ignored
      }
      terminateWorker();
    }
    setStatus('cancelled');
    setError({
      code: 'CANCELLED',
      title: 'Operation Cancelled',
      message: 'Watermark detection or processing was stopped by user.',
    });
  }, [terminateWorker]);

  const selectFile = useCallback(
    async (file: File) => {
      reset();

      // Format validation
      const formatCheck = isValidVideoFile(file);
      if (!formatCheck.valid) {
        setStatus('failed');
        setError({
          code: 'INVALID_FILE_TYPE',
          title: 'Invalid Video File',
          message: formatCheck.reason || 'Please select an MP4, MOV, or WebM video file.',
        });
        return;
      }

      // Check baseline capabilities dynamically
      const caps = checkBaselineBrowserCapabilities();
      if (!caps.isSupported) {
        setStatus('failed');
        setError({
          code: 'UNSUPPORTED_BROWSER',
          title: 'Browser Not Supported',
          message:
            caps.unsupportedReasons.join(' ') ||
            'Your browser lacks WebCodecs or OffscreenCanvas support. Please use modern Chrome, Edge, or Safari.',
        });
        return;
      }

      // Non-blocking recommendations
      if (file.size > RECOMMENDED_MAX_FILE_SIZE_BYTES) {
        const sizeMb = Math.round(file.size / (1024 * 1024));
        setSizeWarning(`Large video file (${sizeMb} MB). Processing may require significant memory.`);
      }

      const fileUrl = URL.createObjectURL(file);
      setOriginalFile(file);
      setOriginalUrl(fileUrl);
      originalUrlRef.current = fileUrl;

      const currentOpId = (operationIdRef.current += 1);
      setStatus('detecting');
      setProgress({ phase: 'detecting', progress: 0.1, currentFrame: 0, totalFrames: 0, elapsedSeconds: 0 });

      const worker = getOrCreateWorker();

      worker.onmessage = async (e: MessageEvent<WorkerOutboundMessage>) => {
        const msg = e.data;
        if (!msg || msg.operationId !== currentOpId) return;

        if (msg.type === 'DETECT_PROGRESS') {
          setProgress((prev) => ({
            ...prev,
            phase: 'detecting',
            progress: Math.min(0.9, msg.progress),
          }));
          return;
        }

        if (msg.type === 'DETECT_COMPLETE') {
          setMetadata(msg.metadata);
          setAudioInfo(msg.audioInfo);
          setDetectionResult({
            detected: msg.detected,
            isConfident: msg.isConfident,
            watermarkType: msg.watermarkType,
          });

          if (
            msg.metadata.duration &&
            msg.metadata.duration > RECOMMENDED_MAX_DURATION_SECONDS
          ) {
            setDurationWarning(
              `Video duration (${Math.round(msg.metadata.duration)}s) exceeds recommended 90 seconds.`
            );
          }

          // Source-aware capability probe
          const encodingParams = resolveEncodingParameters(msg.metadata);
          const probe = await validateSourceCapabilities(
            encodingParams.width,
            encodingParams.height,
            encodingParams.framerate,
            encodingParams.bitrate
          );

          if (!probe.supported) {
            setStatus('failed');
            setError({
              code: 'UNSUPPORTED_CODEC_CONFIG',
              title: 'Resolution / Framerate Unsupported',
              message:
                probe.reason ||
                'Your browser cannot encode video at the resolution and framerate of this clip.',
            });
            return;
          }

          if (msg.detected && msg.isConfident) {
            setStatus('ready_to_clean');
          } else {
            setStatus('no_watermark');
          }
          return;
        }

        if (msg.type === 'ERROR') {
          setStatus('failed');
          setError({
            code: msg.code,
            title: 'Detection Error',
            message: msg.message,
          });
        }
      };

      worker.onerror = (err) => {
        if (operationIdRef.current === currentOpId) {
          setStatus('failed');
          setError({
            code: 'UNKNOWN_ERROR',
            title: 'Worker Error',
            message: err.message || 'The watermark worker encountered an unexpected error.',
          });
        }
      };

      worker.postMessage({
        type: 'DETECT',
        operationId: currentOpId,
        file,
      } as WorkerInboundMessage);
    },
    [getOrCreateWorker, reset]
  );

  const executeProcessing = useCallback(
    async (preserveAudio: boolean) => {
      if (!originalFile || !metadata) return;

      const currentOpId = (operationIdRef.current += 1);
      setStatus('processing');
      setProgress({
        phase: 'extract',
        progress: 0,
        currentFrame: 0,
        totalFrames: metadata.frameCountEstimate || 100,
        elapsedSeconds: 0,
      });

      const encodingParams = resolveEncodingParameters(metadata);
      const worker = getOrCreateWorker();

      worker.onmessage = (e: MessageEvent<WorkerOutboundMessage>) => {
        const msg = e.data;
        if (!msg || msg.operationId !== currentOpId) return;

        if (msg.type === 'PROCESS_PROGRESS') {
          setStatus('processing');
          setProgress({
            phase: msg.phase,
            progress: msg.progress,
            currentFrame: msg.currentFrame,
            totalFrames: msg.totalFrames,
            elapsedSeconds: msg.elapsedSeconds,
          });
          return;
        }

        if (msg.type === 'PROCESS_COMPLETE') {
          const blob = new Blob([msg.buffer], { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          const cleanFileName = `cleaned_${originalFile.name.replace(/\.[^/.]+$/, '')}.mp4`;
          const cleanFileInstance = new File([blob], cleanFileName, { type: 'video/mp4' });

          setCleanedBlob(blob);
          setCleanedUrl(url);
          setCleanedFile(cleanFileInstance);
          cleanedUrlRef.current = url;
          setAudioResult(msg.audioResult);
          setStatus('completed');
          setProgress((prev) => ({ ...prev, progress: 1 }));
          return;
        }

        if (msg.type === 'ERROR') {
          setStatus('failed');
          setError({
            code: msg.code,
            title: 'Processing Failed',
            message: msg.message,
          });
        }
      };

      worker.postMessage({
        type: 'PROCESS',
        operationId: currentOpId,
        file: originalFile,
        options: {
          preserveAudio,
          videoBitrate: encodingParams.bitrate,
          adaptiveAlpha: true,
        },
      } as WorkerInboundMessage);
    },
    [getOrCreateWorker, metadata, originalFile]
  );

  const startProcessing = useCallback(async () => {
    if (!originalFile || !metadata) return;

    // Check audio compatibility
    if (audioInfo?.hasAudio && !audioInfo.isMp4Compatible) {
      setIsUnsupportedAudioModalOpen(true);
      return;
    }

    // Direct execution
    await executeProcessing(true);
  }, [audioInfo, executeProcessing, metadata, originalFile]);

  const confirmProcessingWithoutAudio = useCallback(async () => {
    setIsUnsupportedAudioModalOpen(false);
    await executeProcessing(false);
  }, [executeProcessing]);

  const cancelAudioModal = useCallback(() => {
    setIsUnsupportedAudioModalOpen(false);
  }, []);

  return {
    status,
    originalFile,
    originalUrl,
    cleanedBlob,
    cleanedUrl,
    cleanedFile,
    detectionResult,
    metadata,
    audioInfo,
    audioResult,
    progress,
    error,
    baselineCaps,
    durationWarning,
    sizeWarning,
    isUnsupportedAudioModalOpen,
    selectFile,
    startProcessing,
    confirmProcessingWithoutAudio,
    cancelAudioModal,
    cancel,
    reset,
  };
}
