import type { BatchVideoItem } from './batchTypes';

export interface AuthoritativeTimelineMetrics {
  fps: number;
  duration: number;
  frameCount: number;
}

/**
 * Safely extracts and validates that source media has an authoritative, finite,
 * constant frame rate (CFR) and a valid finite positive duration.
 *
 * Returns null if:
 * - item or metadata is missing
 * - duration is <= 0 or not finite
 * - frameRate is <= 0 or not finite
 * - metadata indicates variable frame rate (VFR) / irregular timestamps
 *
 * NEVER uses a silent fallback (e.g. 30 FPS).
 */
export function getAuthoritativeTimelineMetrics(
  item: BatchVideoItem | null
): AuthoritativeTimelineMetrics | null {
  if (!item || !item.metadata) {
    return null;
  }
  const { frameRate, duration } = item.metadata;

  // 1. Strict duration validation
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  // 2. Strict FPS validation
  if (typeof frameRate !== 'number' || !Number.isFinite(frameRate) || frameRate <= 0) {
    return null;
  }

  // 3. VFR guard: Check packet stats or flags if surfaced by metadata layer
  const metadataRecord = item.metadata as unknown as Record<string, unknown>;
  if (metadataRecord.isVariableFrameRate === true || metadataRecord.isVfr === true) {
    return null; // VFR sources cannot support CFR frame-accurate cut calculations
  }

  const frameCount = Math.round(duration * frameRate);
  if (frameCount <= 1) {
    return null;
  }

  return {
    fps: frameRate,
    duration,
    frameCount,
  };
}

/**
 * Convenience helper returning authoritative FPS if valid, or null.
 */
export function getAuthoritativeFps(item: BatchVideoItem | null): number | null {
  const metrics = getAuthoritativeTimelineMetrics(item);
  return metrics ? metrics.fps : null;
}

/**
 * Converts continuous seconds to a 0-indexed discrete frame index.
 */
export function timeToFrameIndex(timeSec: number, fps: number): number {
  return Math.round(timeSec * fps);
}

/**
 * Converts a 0-indexed discrete frame index back to precise floating-point seconds.
 */
export function frameIndexToTime(frameIndex: number, fps: number): number {
  return frameIndex / fps;
}

/**
 * Snaps arbitrary continuous float seconds to the nearest discrete frame boundary.
 */
export function snapTimeToFrame(timeSec: number, fps: number): number {
  if (!fps || fps <= 0) return timeSec;
  return Math.round(timeSec * fps) / fps;
}

/**
 * Computes timeline zoom density (pixels per second) required for Frame Precision Mode.
 * Ensures a single frame spans at least `targetPixelsPerFrame` (default 36px for true frame level).
 * Example: 24 FPS * 36 px = 864 px/s; 30 FPS * 36 px = 1080 px/s.
 */
export function calculateFramePrecisionZoom(fps: number, targetPixelsPerFrame = 36): number {
  const safeFps = Math.max(1, Math.min(120, fps || 30));
  return Math.min(1440, Math.round(safeFps * targetPixelsPerFrame));
}

/**
 * Formats seconds into a compact frame HUD: `F{frameIndex} • {mm:ss.mmm}`.
 */
export function formatFrameTimecode(timeSec: number, fps: number): string {
  const s = Math.max(0, timeSec);
  const frameIndex = timeToFrameIndex(s, fps);
  const m = Math.floor(s / 60);
  const remSec = (s % 60).toFixed(3);
  return `F${frameIndex} • ${m}:${remSec.padStart(6, '0')}`;
}
