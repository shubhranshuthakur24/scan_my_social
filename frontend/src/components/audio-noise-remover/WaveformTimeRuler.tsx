'use client';

import React, { useRef, useEffect } from 'react';
import {
  WaveformViewport,
  computeTimeTicks,
  timeToPixel,
} from '@/lib/audio/visualization/viewportMath';

export interface WaveformTimeRulerProps {
  viewport: WaveformViewport;
  width: number;
  dpr?: number;
  height?: number;
  className?: string;
}

/**
 * Phase B1.4: Shared Time Ruler Component
 * High-performance, Canvas 2D adaptive time ruler.
 * Strictly decoupled from currentTime/playback: renders only upon viewport/width/DPR changes.
 * Perfectly synchronizes with waveform pixel coordinates using B1.1 viewport mathematics.
 */
export default function WaveformTimeRuler({
  viewport,
  width,
  dpr = 1,
  height = 22,
  className = '',
}: WaveformTimeRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0 || viewport.durationSec <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adjust backing store resolution for crisp HiDPI text and lines
    const actualDpr = dpr || window.devicePixelRatio || 1;
    canvas.width = Math.round(width * actualDpr);
    canvas.height = Math.round(height * actualDpr);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(actualDpr, actualDpr);

    // 1. Draw Subtle Bottom Axis Baseline
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.stroke();

    // 2. Compute Adaptive Graduation Ticks
    const majorTicks = computeTimeTicks(viewport, width, 75);
    if (majorTicks.length === 0) {
      ctx.restore();
      return;
    }

    // Configure text styling
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // 3. Render Major Ticks, Labels, and Intermediate Minor Ticks
    for (let i = 0; i < majorTicks.length; i++) {
      const tick = majorTicks[i];
      const px = tick.pixelX;

      // Draw Major Tick Mark (descending to baseline)
      ctx.strokeStyle = '#94a3b8'; // slate-400
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, height - 8);
      ctx.lineTo(px, height);
      ctx.stroke();

      // Draw Major Tick Label (ensuring rightmost label doesn't clip out of view)
      ctx.fillStyle = '#64748b'; // slate-500
      let labelX = px + 3;
      const textMetrics = ctx.measureText(tick.label);
      if (labelX + textMetrics.width > width - 2) {
        labelX = Math.max(0, px - textMetrics.width - 3);
      }
      ctx.fillText(tick.label, labelX, 2);

      // Draw Minor Intermediate Subdivision Ticks between consecutive major ticks
      if (i < majorTicks.length - 1) {
        const nextTick = majorTicks[i + 1];
        const nextPx = nextTick.pixelX;
        const tickSpanPx = nextPx - px;

        // Draw 3 subtle subdivisions if spacing permits
        if (tickSpanPx >= 36) {
          ctx.strokeStyle = '#cbd5e1'; // slate-300
          const subCount = tickSpanPx >= 70 ? 4 : 2;
          for (let s = 1; s < subCount; s++) {
            const subRatio = s / subCount;
            const subPx = Math.round(px + tickSpanPx * subRatio);
            ctx.beginPath();
            ctx.moveTo(subPx, height - 4);
            ctx.lineTo(subPx, height);
            ctx.stroke();
          }
        }
      }
    }

    ctx.restore();
  }, [viewport, width, dpr, height]);

  return (
    <div className={`relative w-full overflow-hidden select-none bg-slate-50/70 ${className}`} style={{ height }}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
