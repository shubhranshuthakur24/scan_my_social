/**
 * Browser and Codec Capability Detection Utility
 * Provides two-tier capability validation:
 * 1. Synchronous baseline environment check (Workers, OffscreenCanvas, WebCodecs)
 * 2. Source-aware configuration probe via VideoEncoder.isConfigSupported()
 */

export const RECOMMENDED_MAX_DURATION_SECONDS = 90;
export const RECOMMENDED_MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

export interface BaselineCapabilities {
  isSupported: boolean;
  hasWorker: boolean;
  hasOffscreenCanvas: boolean;
  hasWebCodecs: boolean;
  isMobileDevice: boolean;
  unsupportedReasons: string[];
}

export function checkBaselineBrowserCapabilities(): BaselineCapabilities {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      hasWorker: false,
      hasOffscreenCanvas: false,
      hasWebCodecs: false,
      isMobileDevice: false,
      unsupportedReasons: ['Server-side rendering environment.'],
    };
  }

  const hasWorker = typeof Worker !== 'undefined';
  const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  const hasWebCodecs = 'VideoEncoder' in window && 'VideoDecoder' in window;
  
  // Basic touch / mobile detection for advisory notice
  const isMobileDevice =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

  const unsupportedReasons: string[] = [];
  if (!hasWorker) unsupportedReasons.push('Web Workers are not supported in this browser.');
  if (!hasOffscreenCanvas) unsupportedReasons.push('OffscreenCanvas is not supported in this browser.');
  if (!hasWebCodecs) unsupportedReasons.push('WebCodecs (VideoEncoder / VideoDecoder) is not supported.');

  return {
    isSupported: hasWorker && hasOffscreenCanvas && hasWebCodecs,
    hasWorker,
    hasOffscreenCanvas,
    hasWebCodecs,
    isMobileDevice: Boolean(isMobileDevice),
    unsupportedReasons,
  };
}

/**
 * Validates that the user's browser/hardware can encode H.264 video at the
 * exact resolution and framerate of the selected source video.
 */
export async function validateSourceCapabilities(
  width: number,
  height: number,
  framerate: number,
  bitrate = 12_000_000
): Promise<{ supported: boolean; reason?: string }> {
  if (typeof window === 'undefined' || !('VideoEncoder' in window)) {
    return {
      supported: false,
      reason: 'WebCodecs VideoEncoder is not available in this browser environment.',
    };
  }

  const pixelCount = width * height;
  const fps = Math.round(framerate) || 30;
  const isHighRes = pixelCount > 1920 * 1080 || fps > 45;

  // Level 4.2 for 1080p30, Level 5.1/5.2 for 1080p60 or 4K
  const profileLevel = isHighRes ? '640033' : '4d002a';
  const codec = `avc1.${profileLevel}`;

  try {
    const configSupport = await VideoEncoder.isConfigSupported({
      codec,
      width,
      height,
      bitrate,
      framerate: fps,
      hardwareAcceleration: 'no-preference',
    });

    if (!configSupport.supported) {
      return {
        supported: false,
        reason: `Your browser hardware cannot encode H.264 video at ${width}x${height} @ ${fps} FPS.`,
      };
    }

    return { supported: true };
  } catch (err: any) {
    return {
      supported: false,
      reason: err?.message || 'Video encoder capability probe encountered an error.',
    };
  }
}

/**
 * Checks file extension and MIME type.
 */
export function isValidVideoFile(file: File): { valid: boolean; reason?: string } {
  const allowedExtensions = ['.mp4', '.mov', '.webm'];
  const fileName = file.name.toLowerCase();
  const hasValidExt = allowedExtensions.some((ext) => fileName.endsWith(ext));
  const hasValidMime = file.type.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.webm');

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      reason: 'Unsupported file format. Please provide an MP4, MOV, or WebM video file.',
    };
  }

  return { valid: true };
}
