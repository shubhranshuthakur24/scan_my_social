'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ImageWatermarkStatus,
  ImageMetadata,
  ImageWatermarkDetectionResult,
  DomainError,
  ImageWorkerInboundMessage,
  ImageWorkerOutboundMessage,
} from '@/lib/watermark/types';
import {
  isValidImageFile,
  extractImageDataFromFile,
  convertImageDataToBlob,
} from '@/lib/watermark/imageWatermarkAdapter';

export interface UseImageWatermarkRemovalReturn {
  status: ImageWatermarkStatus;
  originalFile: File | null;
  originalUrl: string | null;
  cleanedBlob: Blob | null;
  cleanedUrl: string | null;
  cleanedFile: File | null;
  metadata: ImageMetadata | null;
  detectionResult: ImageWatermarkDetectionResult | null;
  error: DomainError | null;
  edgePolish: boolean;
  setEdgePolish: (enabled: boolean) => void;
  selectFile: (file: File) => Promise<void>;
  startProcessing: () => void;
  cancel: () => void;
  reset: () => void;
}

export function useImageWatermarkRemoval(): UseImageWatermarkRemovalReturn {
  const [status, setStatus] = useState<ImageWatermarkStatus>('idle');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [cleanedBlob, setCleanedBlob] = useState<Blob | null>(null);
  const [cleanedUrl, setCleanedUrl] = useState<string | null>(null);
  const [cleanedFile, setCleanedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [detectionResult, setDetectionResult] = useState<ImageWatermarkDetectionResult | null>(null);
  const [error, setError] = useState<DomainError | null>(null);
  const [edgePolish, setEdgePolishState] = useState<boolean>(true);

  const workerRef = useRef<Worker | null>(null);
  const operationIdRef = useRef<number>(0);
  const originalUrlRef = useRef<string | null>(null);
  const cleanedUrlRef = useRef<string | null>(null);
  const currentFileRef = useRef<File | null>(null);
  const edgePolishRef = useRef<boolean>(true);

  originalUrlRef.current = originalUrl;
  cleanedUrlRef.current = cleanedUrl;
  currentFileRef.current = originalFile;
  edgePolishRef.current = edgePolish;

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const getOrCreateWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('@/lib/watermark/worker/imageWatermark.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  // Cleanup object URLs on unmount
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
    setMetadata(null);
    setDetectionResult(null);
    setError(null);
  }, [terminateWorker]);

  const cancel = useCallback(() => {
    const opId = operationIdRef.current;
    if (workerRef.current) {
      try {
        workerRef.current.postMessage({ type: 'CANCEL', operationId: opId } as ImageWorkerInboundMessage);
      } catch {
        // Ignore
      }
      terminateWorker();
    }
    setStatus('cancelled');
    setError({
      code: 'CANCELLED',
      title: 'Processing Cancelled',
      message: 'Your original file is unchanged.',
    });
  }, [terminateWorker]);

  const executePipeline = useCallback(
    async (file: File, polishEnabled: boolean) => {
      const currentOpId = (operationIdRef.current += 1);

      try {
        const { imageData, metadata: meta } = await extractImageDataFromFile(file);
        setMetadata(meta);

        const worker = getOrCreateWorker();

        worker.onmessage = async (e: MessageEvent<ImageWorkerOutboundMessage>) => {
          const msg = e.data;
          if (!msg || msg.operationId !== currentOpId) return;

          if (msg.type === 'IMAGE_NO_WATERMARK') {
            setStatus('no_watermark');
            setDetectionResult({
              detected: false,
              isConfident: false,
              skipReason: msg.meta?.skipReason,
              confidence: msg.meta?.confidence,
            });
            return;
          }

          if (msg.type === 'IMAGE_COMPLETE') {
            try {
              const blob = await convertImageDataToBlob(msg.imageData, meta.mimeType);
              const blobUrl = URL.createObjectURL(blob);

              if (cleanedUrlRef.current) {
                URL.revokeObjectURL(cleanedUrlRef.current);
              }
              cleanedUrlRef.current = blobUrl;

              const ext =
                meta.mimeType === 'image/png'
                  ? '.png'
                  : meta.mimeType === 'image/webp'
                  ? '.webp'
                  : '.jpg';
              const cleanFileName = `cleaned_${file.name.replace(/\.[^/.]+$/, '')}${ext}`;
              const cleanFile = new File([blob], cleanFileName, { type: meta.mimeType });

              setCleanedBlob(blob);
              setCleanedUrl(blobUrl);
              setCleanedFile(cleanFile);
              setDetectionResult({
                detected: true,
                isConfident: true,
                logoSize: msg.meta.size,
                position: msg.meta.position,
                confidence: msg.meta.selectionConfidence,
              });
              setStatus('ready_to_clean');
            } catch (err: any) {
              setStatus('failed');
              setError({
                code: 'ENCODE_FAILED',
                title: 'Export Failed',
                message: err?.message || 'Failed to export cleaned image.',
              });
            }
            return;
          }

          if (msg.type === 'ERROR') {
            setStatus('failed');
            setError({
              code: msg.code,
              title: 'Processing Error',
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
              message: err.message || 'Image worker encountered an unexpected error.',
            });
          }
        };

        worker.postMessage(
          {
            type: 'PROCESS_IMAGE',
            operationId: currentOpId,
            imageData,
            options: { adaptiveMode: polishEnabled },
          } as ImageWorkerInboundMessage,
          [imageData.data.buffer]
        );
      } catch (err: any) {
        setStatus('failed');
        setError({
          code: 'DECODE_FAILED',
          title: 'Image Decoding Error',
          message: err?.message || 'Failed to decode selected image file.',
        });
      }
    },
    [getOrCreateWorker]
  );

  const selectFile = useCallback(
    async (file: File) => {
      reset();

      const formatCheck = isValidImageFile(file);
      if (!formatCheck.valid) {
        setStatus('failed');
        setError({
          code: 'INVALID_FILE_TYPE',
          title: 'Invalid Image Format',
          message: formatCheck.reason || 'Please select a PNG, JPG, or WebP image.',
        });
        return;
      }

      const fileUrl = URL.createObjectURL(file);
      setOriginalFile(file);
      setOriginalUrl(fileUrl);
      originalUrlRef.current = fileUrl;
      currentFileRef.current = file;
      setStatus('analyzing');

      await executePipeline(file, edgePolishRef.current);
    },
    [executePipeline, reset]
  );

  const setEdgePolish = useCallback(
    (enabled: boolean) => {
      setEdgePolishState(enabled);
      edgePolishRef.current = enabled;
      const file = currentFileRef.current;
      if (file && (status === 'ready_to_clean' || status === 'completed')) {
        setStatus('analyzing');
        executePipeline(file, enabled).then(() => {
          if (status === 'completed') {
            setStatus('completed');
          }
        });
      }
    },
    [executePipeline, status]
  );

  const startProcessing = useCallback(() => {
    setStatus('processing');
    const timer = setTimeout(() => {
      setStatus('completed');
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  return {
    status,
    originalFile,
    originalUrl,
    cleanedBlob,
    cleanedUrl,
    cleanedFile,
    metadata,
    detectionResult,
    error,
    edgePolish,
    setEdgePolish,
    selectFile,
    startProcessing,
    cancel,
    reset,
  };
}
