/**
 * Phase B1.1: Viewport Mathematics & Time-Scale Mapping
 * 100% Browser-Local, Deterministic Coordinate Transformation Library
 * Zero React/DOM dependencies. Pure numerical calculations.
 */

export interface WaveformViewport {
  /** Start time of visible window in seconds (0 <= startTimeSec < totalDurationSec) */
  readonly startTimeSec: number;
  /** Duration of visible window in seconds (minDurationSec <= durationSec <= totalDurationSec) */
  readonly durationSec: number;
  /** Total audio clip duration in seconds */
  readonly totalDurationSec: number;
}

export interface TimeTick {
  /** Timestamp in seconds corresponding to this tick */
  readonly timeSec: number;
  /** Horizontal X position in pixels relative to viewport canvas */
  readonly pixelX: number;
  /** Formatted human-readable label (e.g. "1:24", "0:05.5", "12.35s") */
  readonly label: string;
  /** Whether this is a major subdivision tick with label */
  readonly isMajor: boolean;
}

/**
 * Configurable navigation constant: minimum visible duration span.
 * Default: 0.05s (50ms).
 * NOTE: Established for V1 viewport navigation clamping.
 * In B1.4 (Time Ruler & Dual-Track Inspection), this constant will be revisited
 * and dynamically derived from display constraints (e.g. min samples per pixel
 * or minimum readable time-ruler major tick spacing).
 */
export const DEFAULT_MIN_VIEWPORT_DURATION_SEC = 0.05;

/**
 * Maps a timestamp in seconds to an X pixel position on the canvas.
 */
export function timeToPixel(
  timeSec: number,
  viewport: WaveformViewport,
  canvasWidth: number
): number {
  if (viewport.durationSec <= 0 || canvasWidth <= 0) return 0;
  const normX = (timeSec - viewport.startTimeSec) / viewport.durationSec;
  return normX * canvasWidth;
}

/**
 * Maps an X pixel position on the canvas to a timestamp in seconds.
 */
export function pixelToTime(
  pixelX: number,
  viewport: WaveformViewport,
  canvasWidth: number
): number {
  if (canvasWidth <= 0) return viewport.startTimeSec;
  const normX = pixelX / canvasWidth;
  return viewport.startTimeSec + normX * viewport.durationSec;
}

/**
 * Maps a timestamp in seconds to the nearest discrete PCM sample index.
 */
export function timeToSample(timeSec: number, sampleRate: number): number {
  return Math.max(0, Math.round(timeSec * sampleRate));
}

/**
 * Maps a discrete PCM sample index to a timestamp in seconds.
 */
export function sampleToTime(sampleIndex: number, sampleRate: number): number {
  return sampleRate > 0 ? sampleIndex / sampleRate : 0;
}

/**
 * Clamps a viewport so that:
 * 1. minDurationSec <= durationSec <= totalDurationSec
 * 2. 0 <= startTimeSec <= totalDurationSec - durationSec
 */
export function clampViewport(
  viewport: WaveformViewport,
  minDurationSec: number = DEFAULT_MIN_VIEWPORT_DURATION_SEC
): WaveformViewport {
  const total = Math.max(0, viewport.totalDurationSec);
  const minDur = Math.min(minDurationSec, total);
  const dur = Math.max(minDur, Math.min(viewport.durationSec, total));

  const maxStart = Math.max(0, total - dur);
  const start = Math.max(0, Math.min(viewport.startTimeSec, maxStart));

  return {
    startTimeSec: Number(start.toFixed(6)),
    durationSec: Number(dur.toFixed(6)),
    totalDurationSec: total,
  };
}

/**
 * Zooms the viewport centered around a specific anchor point on screen (e.g. mouse cursor X).
 * zoomFactor > 1 zooms in (shorter visible duration); zoomFactor < 1 zooms out.
 * Guarantees that the timestamp at anchorPixelX remains at anchorPixelX after zoom.
 */
export function zoomAt(
  viewport: WaveformViewport,
  zoomFactor: number,
  anchorPixelX: number,
  canvasWidth: number,
  minDurationSec: number = DEFAULT_MIN_VIEWPORT_DURATION_SEC
): WaveformViewport {
  if (zoomFactor <= 0 || canvasWidth <= 0) return viewport;

  const clamped = clampViewport(viewport, minDurationSec);
  const anchorTime = pixelToTime(anchorPixelX, clamped, canvasWidth);

  // New duration after zoom
  const targetDuration = clamped.durationSec / zoomFactor;
  const boundedDuration = Math.max(
    Math.min(minDurationSec, clamped.totalDurationSec),
    Math.min(targetDuration, clamped.totalDurationSec)
  );

  // Anchor ratio across screen [0.0, 1.0]
  const anchorRatio = Math.max(0, Math.min(anchorPixelX / canvasWidth, 1.0));
  const newStartTime = anchorTime - anchorRatio * boundedDuration;

  return clampViewport(
    {
      startTimeSec: newStartTime,
      durationSec: boundedDuration,
      totalDurationSec: clamped.totalDurationSec,
    },
    minDurationSec
  );
}

/**
 * Pans the viewport horizontally by a delta pixel offset (drag / scroll).
 * Positive deltaPixelX moves viewport forward in time.
 */
export function panBy(
  viewport: WaveformViewport,
  deltaPixelX: number,
  canvasWidth: number
): WaveformViewport {
  if (canvasWidth <= 0) return viewport;
  const clamped = clampViewport(viewport);
  const deltaTime = (deltaPixelX / canvasWidth) * clamped.durationSec;

  return clampViewport({
    startTimeSec: clamped.startTimeSec + deltaTime,
    durationSec: clamped.durationSec,
    totalDurationSec: clamped.totalDurationSec,
  });
}

/**
 * Formats a time in seconds into standard audio notation.
 * e.g. "0:04", "1:23.4", "0:02.345"
 */
export function formatTime(
  sec: number,
  precision: 'sec' | 'tenth' | 'msec' = 'tenth'
): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;

  if (precision === 'msec') {
    const totalMs = Math.round(sec * 1000);
    const m = Math.floor(totalMs / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  if (precision === 'tenth') {
    const totalTenths = Math.round(sec * 10);
    const m = Math.floor(totalTenths / 600);
    const s = Math.floor((totalTenths % 600) / 10);
    const tenths = totalTenths % 10;
    return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
  }

  const totalSec = Math.floor(sec);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Candidate tick intervals in seconds for time graduation.
 */
const TICK_INTERVALS_SEC = [
  0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0,
  15.0, 30.0, 60.0, 120.0, 300.0, 600.0, 900.0, 1800.0, 3600.0,
];

/**
 * Computes human-friendly graduation ticks across the visible viewport width.
 * Automatically chooses nice intervals so labels never collide.
 */
export function computeTimeTicks(
  viewport: WaveformViewport,
  canvasWidth: number,
  minTickSpacingPx: number = 70
): TimeTick[] {
  if (viewport.durationSec <= 0 || canvasWidth <= 0) return [];

  // Approximate maximum number of ticks that fit cleanly without colliding
  const maxTicks = Math.max(2, Math.floor(canvasWidth / minTickSpacingPx));
  const rawInterval = viewport.durationSec / maxTicks;

  // Pick the smallest nice interval >= rawInterval
  let intervalSec = TICK_INTERVALS_SEC[TICK_INTERVALS_SEC.length - 1];
  for (const candidate of TICK_INTERVALS_SEC) {
    if (candidate >= rawInterval) {
      intervalSec = candidate;
      break;
    }
  }

  // Determine appropriate label precision based on chosen interval
  let precision: 'sec' | 'tenth' | 'msec' = 'sec';
  if (intervalSec < 0.1) {
    precision = 'msec';
  } else if (intervalSec < 1.0) {
    precision = 'tenth';
  }

  const ticks: TimeTick[] = [];
  const startSec = Math.floor(viewport.startTimeSec / intervalSec) * intervalSec;
  const endSec = viewport.startTimeSec + viewport.durationSec;

  for (let t = startSec; t <= endSec + intervalSec * 0.1; t += intervalSec) {
    if (t < viewport.startTimeSec - 1e-6) continue;
    if (t > endSec + 1e-6) break;

    const px = timeToPixel(t, viewport, canvasWidth);
    ticks.push({
      timeSec: Number(t.toFixed(4)),
      pixelX: Number(px.toFixed(2)),
      label: formatTime(t, precision),
      isMajor: true,
    });
  }

  return ticks;
}
