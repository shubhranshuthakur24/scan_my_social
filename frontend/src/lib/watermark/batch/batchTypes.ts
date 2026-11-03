import { VideoMetadata, AudioTrackInfo, WatermarkDetectionResult } from '../types';

export type BatchItemStatus =
  | 'queued'
  | 'validating'
  | 'analyzing'
  | 'ready'
  | 'no_watermark'
  | 'cleaning'
  | 'feeding'
  | 'completed'
  | 'failed';

export type BatchOverallStatus =
  | 'idle'
  | 'analyzing'
  | 'ready'
  | 'incompatible'
  | 'preparing'
  | 'processing'
  | 'partial_failure'
  | 'finalizing'
  | 'completed'
  | 'cancelled';

/**
 * 4-state watermark decision:
 * - 'pending': Detection in progress or queued. Blocks batch execution.
 * - 'uncertain': Low confidence / ambiguous score. Blocks silent bypass; requires user override or review.
 * - 'none': High confidence no watermark in active range. Routes to Path A, C, or E.
 * - 'detected': High confidence watermark in active range. Routes to Path B or D.
 */
export type WatermarkDecision = 'pending' | 'none' | 'detected' | 'uncertain';

/**
 * Origin of the watermark decision:
 * - 'analysis': Authoritative worker engine detection.
 * - 'user_override': Explicit user action ('Clean this clip' or 'Keep original').
 */
export type WatermarkDecisionSource = 'analysis' | 'user_override';

export interface VideoTrimRange {
  start: number; // in seconds (e.g. 2.333)
  end: number;   // in seconds (e.g. 18.500)
}

export type ProcessingPath = 'passthrough' | 'clean' | 'trim' | 'trim_and_clean' | 'normalize';

export interface StandardMergeContract {
  video: {
    codec: string;        // e.g. 'avc1.640028'
    width: number;        // Even integer width (e.g. 1080)
    height: number;       // Even integer height (e.g. 1920)
    frameRate: number;    // e.g. 30
    decoderConfig?: VideoDecoderConfig | Record<string, unknown> | null;
  };
  audio: {
    hasAudio: boolean;
    codec: string;        // 'mp4a.40.2'
    sampleRate: number;   // 48000
    numberOfChannels: number; // 2 (Stereo)
    decoderConfig?: AudioDecoderConfig | Record<string, unknown> | null;
  };
}

export interface BatchVideoItem {
  id: string;
  file: File;
  previewUrl: string;
  metadata: VideoMetadata | null;
  audioInfo: AudioTrackInfo | null;
  detection: WatermarkDetectionResult | null;
  watermarkDecision: WatermarkDecision;
  watermarkDecisionSource: WatermarkDecisionSource | null;
  analysisOperationId: number;
  trimVersion: number;
  trimRange: VideoTrimRange | null;
  analyzedRange: VideoTrimRange | null;
  status: BatchItemStatus;
  progress: number; // 0 to 1
  currentFrame?: number;
  totalFrames?: number;
  error?: string | null;
  processingPath?: ProcessingPath;
}

export interface PreflightCompatibility {
  compatible: boolean;
  reason: string | null;
  incompatibleItemIds: string[];
  estimatedSourceSize: number;
  estimatedOutputSize: number;
  estimatedDuration: number;
  isLargeBatch: boolean; // > 50 MB estimated
  isExceedingBudget: boolean; // > 100 MB limit
  contract: StandardMergeContract | null;
  details: {
    dimensionsMatch: boolean;
    referenceWidth?: number;
    referenceHeight?: number;
    referenceFps?: number;
    audioStatus: 'compatible_audio' | 'all_silent' | 'mismatched_audio' | 'mixed_audio_silent';
  };
}

export interface EstablishedMergeContract {
  video: {
    codec: string;
    width: number;
    height: number;
    decoderConfig?: VideoDecoderConfig | Record<string, unknown> | null;
    colorSpace?: Record<string, unknown> | null;
  };
  audio: {
    hasAudio: boolean;
    codec?: string | null;
    sampleRate?: number | null;
    numberOfChannels?: number | null;
    decoderConfig?: AudioDecoderConfig | Record<string, unknown> | null;
  };
}

/**
 * Pure function to derive processing path right before execution and for UI telemetry.
 * Hard invariant: Throws if watermarkDecision is 'pending' or 'uncertain'.
 */
export function deriveProcessingPath(
  item: BatchVideoItem,
  isCompatibleForPassthrough: boolean
): ProcessingPath {
  if (item.watermarkDecision === 'pending') {
    throw new Error(`Watermark detection is still pending for "${item.file.name}".`);
  }
  if (item.watermarkDecision === 'uncertain') {
    throw new Error(`Watermark detection is uncertain for "${item.file.name}". Please choose "Clean this clip" or "Keep original" before merging.`);
  }

  if (item.watermarkDecision === 'detected') {
    return item.trimRange ? 'trim_and_clean' : 'clean';
  }

  // Decision is 'none'
  if (item.trimRange) {
    return 'trim';
  }

  return isCompatibleForPassthrough ? 'passthrough' : 'normalize';
}

/**
 * Checks whether two trim ranges are identical within floating point precision.
 */
export function areTrimRangesEqual(
  a: VideoTrimRange | null,
  b: VideoTrimRange | null
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a.start - b.start) < 0.001 && Math.abs(a.end - b.end) < 0.001;
}

/**
 * Guard ensuring that a clip's watermark decision is authoritative for its currently active trim range.
 */
export function hasAuthoritativeWatermarkDecision(item: BatchVideoItem): boolean {
  if (item.watermarkDecision === 'pending' || item.watermarkDecision === 'uncertain') {
    return false;
  }
  // User overrides are immediately authoritative for the active range
  if (item.watermarkDecisionSource === 'user_override') {
    return true;
  }
  // If item has a trim range, engine detection must have been run for this exact range
  if (item.trimRange && !item.analyzedRange) {
    return false;
  }
  if (item.trimRange && item.analyzedRange) {
    if (!areTrimRangesEqual(item.trimRange, item.analyzedRange)) {
      return false;
    }
  }
  return true;
}


