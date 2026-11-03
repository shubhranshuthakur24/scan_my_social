/**
 * TypeScript definitions for the Gemini / Veo Watermark Cleanup module.
 */

export type WatermarkRemovalStatus =
  | 'idle'
  | 'validating'
  | 'capability_check'
  | 'detecting'
  | 'no_watermark'
  | 'ready_to_clean'
  | 'processing'
  | 'encoding'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number | null;
  frameRate: number;
  frameCountEstimate: number | null;
  codec: string | null;
  averageBitrate: number | null;
}

export interface AudioTrackInfo {
  hasAudio: boolean;
  codec: string | null;
  isMp4Compatible: boolean;
}

export interface AudioCopyResult {
  copied: boolean;
  packetCount: number;
  codec: string | null;
  skipReason: 'no-audio-track' | 'unsupported-audio-codec' | 'user-disabled' | null;
}

export interface WatermarkDetectionResult {
  detected: boolean;
  isConfident: boolean;
  watermarkType?: 'gemini_logo' | 'veo_text';
  // Internal engine data
  internal?: {
    confidence: number;
    position: { x: number; y: number; width: number; height: number };
  };
}

export interface VideoEncodingParameters {
  width: number;
  height: number;
  framerate: number;
  bitrate: number;
  codec: string;
  latencyMode: 'quality' | 'realtime';
  bitrateMode: 'constant' | 'variable';
}

export type ErrorCode =
  | 'UNSUPPORTED_BROWSER'
  | 'UNSUPPORTED_CODEC'
  | 'UNSUPPORTED_CODEC_CONFIG'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'DECODE_FAILED'
  | 'ENCODE_FAILED'
  | 'NO_WATERMARK_FOUND'
  | 'CANCELLED'
  | 'OUT_OF_MEMORY'
  | 'UNKNOWN_ERROR';

export interface DomainError {
  code: ErrorCode;
  title: string;
  message: string;
  actionHint?: string;
}

// --- Main -> Worker Protocol ---
export type WorkerInboundMessage =
  | {
    type: 'DETECT';
    operationId: number;
    file: File;
    clipId?: string;
    trimVersion?: number;
    trimRange?: { start: number; end: number } | null;
    options?: {
      sampleCount?: number;
      minConfidence?: number;
    };
  }
  | {
    type: 'PROCESS';
    operationId: number;
    file: File;
    clipId?: string;
    trimVersion?: number;
    trimRange?: { start: number; end: number } | null;
    targetContract?: {
      width: number;
      height: number;
      frameRate: number;
    } | null;
    skipWatermarkRemoval?: boolean;
    options?: {
      preserveAudio?: boolean;
      videoBitrate?: number;
      adaptiveAlpha?: boolean;
    };
  }
  | {
    type: 'CANCEL';
    operationId: number;
    clipId?: string;
  };

// --- Worker -> Main Protocol ---
export type WorkerOutboundMessage =
  | {
    type: 'DETECT_PROGRESS';
    operationId: number;
    clipId?: string;
    trimVersion?: number;
    progress: number;
    step: 'sample' | 'score' | 'done';
  }
  | {
    type: 'DETECT_COMPLETE';
    operationId: number;
    clipId?: string;
    trimVersion?: number;
    trimRange?: { start: number; end: number } | null;
    detected: boolean;
    isConfident: boolean;
    watermarkType?: 'gemini_logo' | 'veo_text';
    watermarkDecision?: 'none' | 'detected' | 'uncertain';
    watermarkScore?: number;
    metadata: VideoMetadata;
    audioInfo: AudioTrackInfo;
  }
  | {
    type: 'PROCESS_PROGRESS';
    operationId: number;
    clipId?: string;
    trimVersion?: number;
    phase: 'extract' | 'unblend' | 'encode';
    progress: number;
    currentFrame: number;
    totalFrames: number;
    elapsedSeconds: number;
  }
  | {
    type: 'PROCESS_COMPLETE';
    operationId: number;
    clipId?: string;
    trimVersion?: number;
    buffer: ArrayBuffer;
    mimeType: 'video/mp4';
    metadata: VideoMetadata;
    audioResult: AudioCopyResult;
  }
  | {
    type: 'ERROR';
    operationId: number;
    clipId?: string;
    trimVersion?: number;
    code: ErrorCode;
    message: string;
    details?: string;
  };

// ==========================================
// IMAGE WATERMARK CLEANUP PROTOCOL & TYPES
// ==========================================

export type ImageWatermarkStatus =
  | 'idle'
  | 'analyzing'
  | 'no_watermark'
  | 'ready_to_clean'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ImageMetadata {
  width: number;
  height: number;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  fileName: string;
  size: number;
}

export interface ImageWatermarkDetectionResult {
  detected: boolean;
  isConfident: boolean;
  logoSize?: number;
  position?: { x: number; y: number };
  confidence?: number;
  skipReason?: string;
}

export type ImageWorkerInboundMessage =
  | {
    type: 'PROCESS_IMAGE';
    operationId: number;
    imageData: ImageData;
    options?: {
      adaptiveMode?: boolean;
    };
  }
  | {
    type: 'CANCEL';
    operationId: number;
  };

export type ImageWorkerOutboundMessage =
  | {
    type: 'IMAGE_COMPLETE';
    operationId: number;
    imageData: ImageData;
    applied: boolean;
    meta: {
      applied: boolean;
      skipReason?: string;
      size?: number;
      position?: { x: number; y: number };
      qualityStatus?: string;
      selectionConfidence?: number;
    };
  }
  | {
    type: 'IMAGE_NO_WATERMARK';
    operationId: number;
    meta: {
      skipReason?: string;
      confidence?: number;
    };
  }
  | {
    type: 'ERROR';
    operationId: number;
    code: ErrorCode;
    message: string;
    details?: string;
  };

