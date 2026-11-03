/**
 * Thin ScanMySocial Adapter
 * Wraps the vendored upstream browser core engine, enforcing TypeScript types,
 * dynamic source-aware bitrate configuration, and clean audio metadata detection.
 */

import {
  detectGeminiVideoWatermark,
  removeGeminiVideoWatermark,
  canCopyAudioCodecToMp4,
} from './core/videoExport.js';
import {
  Input,
  BlobSource,
  ALL_FORMATS,
  Mp4OutputFormat,
} from 'mediabunny';
import {
  VideoMetadata,
  AudioTrackInfo,
  WatermarkDetectionResult,
  VideoEncodingParameters,
  AudioCopyResult,
} from './types';

/**
 * Calculates deliberate, source-aware video encoding parameters based on resolution and FPS.
 */
export function resolveEncodingParameters(metadata: {
  width: number;
  height: number;
  frameRate: number;
  averageBitrate?: number | null;
}): VideoEncodingParameters {
  const { width, height } = metadata;
  const framerate = Math.round(metadata.frameRate) || 30;
  const pixelCount = width * height;
  const isHighFps = framerate > 45;

  let targetBitrate = 12_000_000; // 12 Mbps default baseline for 1080p30

  if (pixelCount <= 1280 * 720) {
    // 720p
    targetBitrate = isHighFps ? 7_000_000 : 5_000_000;
  } else if (pixelCount <= 1920 * 1080) {
    // 1080p (portrait 1080x1920 or landscape 1920x1080)
    targetBitrate = isHighFps ? 16_000_000 : 12_000_000;
  } else {
    // 1440p / 4K
    targetBitrate = isHighFps ? 28_000_000 : 22_000_000;
  }

  // If source average bitrate is available, cap target bitrate to 1.25x source bitrate to avoid file bloat
  if (metadata.averageBitrate && metadata.averageBitrate > 1_000_000) {
    targetBitrate = Math.min(targetBitrate, Math.round(metadata.averageBitrate * 1.25));
  }

  const profileLevel = pixelCount > 1920 * 1080 || isHighFps ? '640033' : '4d002a';
  const codec = `avc1.${profileLevel}`;

  return {
    width,
    height,
    framerate,
    bitrate: targetBitrate,
    codec,
    latencyMode: 'quality',
    bitrateMode: 'variable',
  };
}

/**
 * Inspects the input video file for audio tracks and MP4 container compatibility.
 */
export async function inspectAudioTrack(file: File): Promise<AudioTrackInfo> {
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  try {
    const audioTrack = await input.getPrimaryAudioTrack().catch(() => null);
    if (!audioTrack) {
      return { hasAudio: false, codec: null, isMp4Compatible: false };
    }

    const codec = await audioTrack.getCodec().catch(() => null);
    const format = new Mp4OutputFormat();
    const isMp4Compatible = Boolean(codec && canCopyAudioCodecToMp4(format, codec));

    return {
      hasAudio: true,
      codec,
      isMp4Compatible,
    };
  } finally {
    input.dispose();
  }
}

export interface AdapterDetectionResult {
  metadata: VideoMetadata;
  detection: WatermarkDetectionResult;
  audioInfo: AudioTrackInfo;
  watermarkDecision: 'none' | 'detected' | 'uncertain';
  watermarkScore: number;
  rawDetection?: unknown;
}

/**
 * Detects Gemini/Veo watermark presence and extracts audio track information.
 */
export async function detectWatermarkWithAudioInfo(
  file: File,
  options?: {
    trimRange?: { start: number; end: number } | null;
    onProgress?: (progress: number, step: string) => void;
  }
): Promise<AdapterDetectionResult> {
  const onProgress = options?.onProgress;
  const [detected, audioInfo] = await Promise.all([
    detectGeminiVideoWatermark(file, {
      trimRange: options?.trimRange ?? undefined,
      onProgress: (p: { progress?: number; step?: string }) => {
        if (onProgress && typeof p.progress === 'number') {
          onProgress(p.progress, p.step || 'detecting');
        }
      },
    }),
    inspectAudioTrack(file),
  ]);

  const { metadata, detection } = detected;
  const isConfident = Boolean(detection?.isConfident);
  const detectedType = detection?.template?.id?.startsWith('veo') ? 'veo_text' : 'gemini_logo';

  // Extract true confidence metrics from video detection summary
  const summaryBest = detection?.summary?.best;
  const maxConfidence = Number.isFinite(summaryBest?.maxConfidence)
    ? summaryBest.maxConfidence
    : Number.isFinite(summaryBest?.maxNcc)
    ? summaryBest.maxNcc
    : (isConfident ? 0.8 : 0);
  const meanConfidence = Number.isFinite(summaryBest?.meanConfidence)
    ? summaryBest.meanConfidence
    : Number.isFinite(summaryBest?.meanNcc)
    ? summaryBest.meanNcc
    : 0;

  const confidence = isConfident ? Math.max(0.8, maxConfidence) : maxConfidence;

  // 3-state decision:
  // - 'detected': Confident evidence of watermark
  // - 'uncertain': Borderline/partial evidence (never bypasses to silent passthrough)
  // - 'none': High confidence no watermark present
  let watermarkDecision: 'none' | 'detected' | 'uncertain' = 'none';
  if (isConfident) {
    watermarkDecision = 'detected';
  } else if (maxConfidence >= 0.18 || meanConfidence >= 0.06) {
    watermarkDecision = 'uncertain';
  }

  return {
    metadata: {
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      frameRate: metadata.frameRate,
      frameCountEstimate: metadata.frameCountEstimate,
      codec: metadata.codec,
      averageBitrate: metadata.averageBitrate,
    },
    detection: {
      detected: isConfident,
      isConfident,
      watermarkType: isConfident ? detectedType : undefined,
      internal: {
        confidence,
        position: detection?.position || { x: 0, y: 0, width: 0, height: 0 },
      },
    },
    audioInfo,
    watermarkDecision,
    watermarkScore: confidence,
    rawDetection: detected,
  };
}

export interface AdapterProcessResult {
  buffer: ArrayBuffer;
  mimeType: 'video/mp4';
  metadata: VideoMetadata;
  audioResult: AudioCopyResult;
}

/**
 * Executes the reverse-alpha watermark removal and MP4 video encoding pipeline.
 */
export async function processWatermarkRemoval(
  file: File,
  options: {
    preserveAudio?: boolean;
    videoBitrate?: number;
    adaptiveAlpha?: boolean;
    trimRange?: { start: number; end: number } | null;
    targetContract?: { width: number; height: number; frameRate: number } | null;
    skipWatermarkRemoval?: boolean;
    detection?: unknown;
    onProgress?: (progressData: {
      phase: 'extract' | 'unblend' | 'encode';
      progress: number;
      currentFrame: number;
      totalFrames: number;
      elapsedSeconds: number;
    }) => void;
  }
): Promise<AdapterProcessResult> {
  const result = await removeGeminiVideoWatermark(file, {
    preserveAudio: options.preserveAudio !== false,
    videoBitrate: options.videoBitrate,
    adaptiveAlpha: options.adaptiveAlpha ?? true,
    trimRange: options.trimRange ?? undefined,
    targetContract: options.targetContract ?? undefined,
    skipWatermarkRemoval: options.skipWatermarkRemoval,
    detection: options.detection,
    onProgress: (p: {
      phase?: string;
      progress?: number;
      processedFrames?: number;
      frameEstimate?: number;
      elapsedSeconds?: number;
    }) => {
      if (options.onProgress) {
        const phase = p.phase === 'detect' ? 'extract' : p.phase === 'export' ? 'encode' : 'unblend';
        options.onProgress({
          phase,
          progress: typeof p.progress === 'number' ? p.progress : 0,
          currentFrame: p.processedFrames || 0,
          totalFrames: p.frameEstimate || 1,
          elapsedSeconds: p.elapsedSeconds || 0,
        });
      }
    },
  });

  const arrayBuffer = await result.blob.arrayBuffer();

  return {
    buffer: arrayBuffer,
    mimeType: 'video/mp4',
    metadata: {
      width: result.metadata.width,
      height: result.metadata.height,
      duration: result.metadata.duration,
      frameRate: result.metadata.frameRate,
      frameCountEstimate: result.metadata.frameCountEstimate,
      codec: result.metadata.codec,
      averageBitrate: result.metadata.averageBitrate,
    },
    audioResult: {
      copied: Boolean(result.audioCopied),
      packetCount: result.audioPacketCount || 0,
      codec: result.audioCodec || null,
      skipReason: result.audioSkipReason || null,
    },
  };
}
