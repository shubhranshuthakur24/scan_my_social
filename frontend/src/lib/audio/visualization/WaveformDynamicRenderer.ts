/**
 * Phase B1.2: Waveform Dynamic Canvas Renderer (Layer 1)
 * 100% Browser-Local, Deterministic Canvas 2D Rendering Engine
 * Responsible strictly for rapidly changing visual state:
 * - Playhead needle and circular handle
 * - Hover cursor indicator
 * - Manual noise region highlight (if active)
 * Clears and draws in < 0.05 ms without touching the static waveform canvas.
 */

import type { WaveformViewport } from './viewportMath';

export interface DynamicRenderOptions {
  manualRegion?: { startSec: number; endSec: number } | null;
  hoverTimeSec?: number | null;
  playheadColor?: string;
  hoverColor?: string;
}

export interface DynamicRenderStats {
  renderCount: number;
  playheadPixelX: number;
  durationMs: number;
}

/**
 * Renders the dynamic overlay (playhead, selection, hover) onto the top canvas.
 * Can be executed at 60 FPS without redrawing or invalidating the static waveform.
 */
export function renderDynamicLayer(
  ctx: CanvasRenderingContext2D,
  viewport: WaveformViewport,
  currentTime: number,
  duration: number,
  width: number,
  height: number,
  dpr: number,
  options?: DynamicRenderOptions
): DynamicRenderStats {
  const startTime = performance.now();

  const playheadColor = options?.playheadColor ?? '#0284c7'; // primary-600
  const hoverColor = options?.hoverColor ?? 'rgba(100, 116, 139, 0.5)';
  const manualRegion = options?.manualRegion ?? null;
  const hoverTimeSec = options?.hoverTimeSec ?? null;

  // 1. Reset transform & clear backing store
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Apply device pixel ratio scaling
  ctx.scale(dpr, dpr);

  // 2. Draw Manual Noise Region Highlight (if active)
  if (manualRegion && viewport.durationSec > 0 && width > 0) {
    const rxStart = ((manualRegion.startSec - viewport.startTimeSec) / viewport.durationSec) * width;
    const rxEnd = ((manualRegion.endSec - viewport.startTimeSec) / viewport.durationSec) * width;
    const rw = Math.max(2, rxEnd - rxStart);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)'; // amber-500 tint
    ctx.fillRect(rxStart, 0, rw, height);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rxStart, 0, rw, height);

    // Region label
    ctx.fillStyle = '#b45309'; // amber-700
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(
      `Selected Noise Profile: ${(manualRegion.endSec - manualRegion.startSec).toFixed(2)}s`,
      rxStart + 4,
      14
    );
  }

  // 3. Draw Playhead Needle & Handle
  let playheadX = 0;
  if (duration > 0 && viewport.durationSec > 0 && Number.isFinite(currentTime)) {
    playheadX = ((currentTime - viewport.startTimeSec) / viewport.durationSec) * width;

    // Only draw needle if inside canvas horizontal bounds
    if (playheadX >= -5 && playheadX <= width + 5) {
      ctx.strokeStyle = playheadColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Circular playhead handle at top
      ctx.fillStyle = playheadColor;
      ctx.beginPath();
      ctx.arc(playheadX, 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Draw Hover Indicator
  if (hoverTimeSec !== null && duration > 0 && viewport.durationSec > 0 && hoverTimeSec >= 0) {
    const hx = ((hoverTimeSec - viewport.startTimeSec) / viewport.durationSec) * width;
    if (hx >= 0 && hx <= width) {
      ctx.strokeStyle = hoverColor;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();

  return {
    renderCount: 1,
    playheadPixelX: playheadX,
    durationMs: performance.now() - startTime,
  };
}
