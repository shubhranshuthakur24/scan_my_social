/**
 * Phase B1.2: Waveform Static Canvas Renderer (Layer 0)
 * 100% Browser-Local, Deterministic Canvas 2D Rendering Engine
 * Responsible for visual elements that do NOT change every frame:
 * - Center baseline & background
 * - Waveform bars (min/max peak envelope + RMS core)
 * Zero raw PCM access: strictly consumes B1.1 WaveformPyramid/VisibleBuckets data.
 */

import type { VisibleBuckets } from './waveformData';
import type { WaveformViewport } from './viewportMath';

const DEFAULT_CLIPPING_THRESHOLD = 0.999;
const DEFAULT_QUIET_RMS_THRESHOLD = 0.008;
const DEFAULT_QUIET_PEAK_THRESHOLD = 0.015;

function isBucketClipped(min: number, max: number, threshold: number = DEFAULT_CLIPPING_THRESHOLD): boolean {
  return max >= threshold || min <= -threshold;
}

function isBucketVisuallyQuiet(
  min: number,
  max: number,
  rms: number,
  rmsThreshold: number = DEFAULT_QUIET_RMS_THRESHOLD,
  peakThreshold: number = DEFAULT_QUIET_PEAK_THRESHOLD
): boolean {
  return rms < rmsThreshold && Math.max(Math.abs(min), Math.abs(max)) < peakThreshold;
}

export interface StaticRenderOptions {
  /** Primary bar color (default: '#0284c7' primary-600) */
  barColor?: string;
  /** RMS core bar color (default: '#0369a1' primary-700) */
  rmsColor?: string;
  /** Baseline grid color (default: '#e2e8f0' slate-200) */
  baselineColor?: string;
  /** Whether to render an inner RMS core bar (default: true) */
  showRms?: boolean;
  /** Phase B1.5: Whether to render visual low-amplitude quiet-region underlays (default: false) */
  showQuietRegions?: boolean;
  /** Phase B1.5: Quiet-region background underlay tint (default: 'rgba(226, 232, 240, 0.5)' slate-200 tint) */
  quietColor?: string;
  /** Phase B1.5: Quiet RMS linear threshold (default: 0.008) */
  quietRmsThreshold?: number;
  /** Phase B1.5: Quiet peak linear threshold (default: 0.015) */
  quietPeakThreshold?: number;
  /** Phase B1.5: Whether to render clipping excursion markers (default: false) */
  showClipping?: boolean;
  /** Phase B1.5: Clipping marker color (default: '#ef4444' rose-500) */
  clippingColor?: string;
  /** Phase B1.5: Clipping threshold (default: 0.999 from A1) */
  clippingThreshold?: number;
}

export interface StaticRenderStats {
  renderCount: number;
  bucketsRendered: number;
  quietBucketsCount: number;
  clippedBucketsCount: number;
  durationMs: number;
}

/**
 * Renders the static waveform background, peaks, and B1.5 diagnostic overlays onto the static canvas.
 * This function is ONLY invoked when the audio data, viewport, dimensions, or DPR change.
 * It is NEVER called merely because currentTime changes.
 */
export function renderStaticWaveform(
  ctx: CanvasRenderingContext2D,
  visible: VisibleBuckets,
  viewport: WaveformViewport,
  width: number,
  height: number,
  dpr: number,
  options?: StaticRenderOptions
): StaticRenderStats {
  const startTime = performance.now();

  const barColor = options?.barColor ?? '#0284c7'; // primary-600
  const rmsColor = options?.rmsColor ?? '#0369a1'; // primary-700
  const baselineColor = options?.baselineColor ?? '#e2e8f0'; // slate-200
  const showRms = options?.showRms ?? true;

  const showQuietRegions = options?.showQuietRegions ?? false;
  const quietColor = options?.quietColor ?? 'rgba(226, 232, 240, 0.55)';
  const quietRmsThreshold = options?.quietRmsThreshold ?? DEFAULT_QUIET_RMS_THRESHOLD;
  const quietPeakThreshold = options?.quietPeakThreshold ?? DEFAULT_QUIET_PEAK_THRESHOLD;

  const showClipping = options?.showClipping ?? false;
  const clippingColor = options?.clippingColor ?? '#ef4444'; // rose-500
  const clippingThreshold = options?.clippingThreshold ?? DEFAULT_CLIPPING_THRESHOLD;

  let quietBucketsCount = 0;
  let clippedBucketsCount = 0;

  // 1. Reset transform & clear backing store
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Apply device pixel ratio scaling
  ctx.scale(dpr, dpr);

  const centerY = height * 0.5;
  const halfHeight = height * 0.45;

  // 2. Draw subtle center baseline
  ctx.strokeStyle = baselineColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();

  if (!visible || visible.count === 0 || width <= 0) {
    ctx.restore();
    return {
      renderCount: 1,
      bucketsRendered: 0,
      quietBucketsCount: 0,
      clippedBucketsCount: 0,
      durationMs: performance.now() - startTime,
    };
  }

  const { mins, maxs, rms, count } = visible;
  const stepX = width / count;
  const barWidth = Math.max(1, stepX);

  // 3. Phase B1.5: Render Quiet-Region Background Underlays (Behind Waveform)
  if (showQuietRegions) {
    ctx.fillStyle = quietColor;
    let runStart = -1;
    for (let b = 0; b < count; b++) {
      const isQuiet = isBucketVisuallyQuiet(
        mins[b],
        maxs[b],
        rms[b],
        quietRmsThreshold,
        quietPeakThreshold
      );
      if (isQuiet) {
        quietBucketsCount++;
        if (runStart < 0) runStart = b;
      } else if (runStart >= 0) {
        const rx = runStart * stepX;
        const rw = (b - runStart) * stepX;
        ctx.fillRect(rx, 0, rw, height);
        runStart = -1;
      }
    }
    if (runStart >= 0) {
      const rx = runStart * stepX;
      const rw = (count - runStart) * stepX;
      ctx.fillRect(rx, 0, rw, height);
    }
  }

  // 4. Draw Peak Min/Max Envelope
  ctx.fillStyle = barColor;
  for (let b = 0; b < count; b++) {
    const x = b * stepX;
    const minVal = mins[b];
    const maxVal = maxs[b];

    const top = centerY - maxVal * halfHeight;
    const bottom = centerY - minVal * halfHeight;
    const barH = Math.max(1.5, bottom - top);

    ctx.fillRect(x, top, Math.max(1, barWidth - 0.5), barH);
  }

  // 5. Draw Optional RMS Core (shows dense perceptual energy inside peaks)
  if (showRms) {
    ctx.fillStyle = rmsColor;
    for (let b = 0; b < count; b++) {
      const x = b * stepX;
      const rmsVal = rms[b];

      const top = centerY - rmsVal * halfHeight;
      const bottom = centerY + rmsVal * halfHeight;
      const barH = Math.max(1, bottom - top);

      ctx.fillRect(x, top, Math.max(1, barWidth - 0.5), barH);
    }
  }

  // 6. Phase B1.5: Render Clipping Excursion Markers (Top / Bottom Rail Caps)
  if (showClipping) {
    ctx.fillStyle = clippingColor;
    for (let b = 0; b < count; b++) {
      const minVal = mins[b];
      const maxVal = maxs[b];
      const isClipped = isBucketClipped(minVal, maxVal, clippingThreshold);

      if (isClipped) {
        clippedBucketsCount++;
        const x = b * stepX;
        const w = Math.max(2, barWidth);

        // Positive rail clipping cap
        if (maxVal >= clippingThreshold) {
          ctx.fillRect(x, 0, w, 3.5);
        }
        // Negative rail clipping cap
        if (minVal <= -clippingThreshold) {
          ctx.fillRect(x, height - 3.5, w, 3.5);
        }
      }
    }
  }

  ctx.restore();

  return {
    renderCount: 1,
    bucketsRendered: count,
    quietBucketsCount,
    clippedBucketsCount,
    durationMs: performance.now() - startTime,
  };
}

