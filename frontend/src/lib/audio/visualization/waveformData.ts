/**
 * Phase B1.1: Waveform Decimation Data Model & Multi-Resolution Pyramid
 * 100% Browser-Local, Deterministic Waveform Processing Engine
 * Zero React/DOM dependencies. Pure Float32Array calculations.
 */

export interface WaveformBucket {
  min: number;
  max: number;
  rms: number;
}

export interface WaveformPyramidLevel {
  /** Number of raw PCM audio samples represented by each bucket in this level */
  readonly samplesPerBucket: number;
  /** Total number of buckets in this level */
  readonly bucketsCount: number;
  /** Min excursions per bucket [-1.0, 0.0] */
  readonly mins: Float32Array;
  /** Max excursions per bucket [0.0, 1.0] */
  readonly maxs: Float32Array;
  /** Root-mean-square energy per bucket [0.0, 1.0] */
  readonly rms: Float32Array;
}

export interface WaveformPyramid {
  readonly sampleRate: number;
  readonly totalSamples: number;
  readonly durationSec: number;
  /** Hierarchical decimation levels, ordered from finest (L0) to coarsest (L3) */
  readonly levels: WaveformPyramidLevel[];
}

export interface StereoWaveformPyramids {
  /** Left channel independent pyramid */
  readonly left: WaveformPyramid;
  /** Right channel independent pyramid */
  readonly right: WaveformPyramid;
  /** Combined Peak View envelope (derived visual view, not summed audio) */
  readonly combined: WaveformPyramid;
}

export interface VisibleBuckets {
  readonly mins: Float32Array;
  readonly maxs: Float32Array;
  readonly rms: Float32Array;
  readonly levelIndex: number;
  readonly startIndex: number;
  readonly count: number;
  readonly samplesPerBucket: number;
}

export interface PyramidOptions {
  /** Bucket decimation sizes (default: [128, 512, 2048, 8192]) */
  bucketSizes?: number[];
}

export const DEFAULT_PYRAMID_BUCKET_SIZES = [128, 512, 2048, 8192];
const FLOOR_DBFS = -120.0;
const EPSILON = 1e-6;

/**
 * Phase B1.5: Signal Diagnostics Constants
 * Aligned with A1 DEFAULT_ANALYZER_OPTIONS.clippingThreshold (0.999).
 */
export const DEFAULT_CLIPPING_THRESHOLD = 0.999;
export const DEFAULT_QUIET_RMS_THRESHOLD = 0.008; // ~ -42 dBFS linear RMS
export const DEFAULT_QUIET_PEAK_THRESHOLD = 0.015; // ~ -36.5 dBFS linear Peak

/**
 * Evaluates whether a bucket contains at least one sample that reached the clipping threshold.
 * Strictly derived from the bucket's min and max excursions (no raw PCM access).
 */
export function isBucketClipped(
  min: number,
  max: number,
  clippingThreshold: number = DEFAULT_CLIPPING_THRESHOLD
): boolean {
  return max >= clippingThreshold || min <= -clippingThreshold;
}

/**
 * Evaluates whether a bucket satisfies the visual low-amplitude heuristic.
 * Strictly visual-only: this is NOT a claim of digital silence or A1 noise-floor status.
 */
export function isBucketVisuallyQuiet(
  min: number,
  max: number,
  rms: number,
  rmsThreshold: number = DEFAULT_QUIET_RMS_THRESHOLD,
  peakThreshold: number = DEFAULT_QUIET_PEAK_THRESHOLD
): boolean {
  const peak = Math.max(Math.abs(min), Math.abs(max));
  return rms < rmsThreshold && peak < peakThreshold;
}

/**
 * Converts linear amplitude to dBFS with a floor at -120 dBFS.
 */
export function linearToDbFS(linear: number, floorDbfs: number = FLOOR_DBFS): number {
  if (!Number.isFinite(linear) || linear <= EPSILON) {
    return floorDbfs;
  }
  const db = 20 * Math.log10(linear);
  return Math.max(db, floorDbfs);
}

/**
 * Builds a multi-resolution decimation pyramid for a single channel of PCM samples.
 * Every level is derived directly from the original PCM buffer, ensuring exact mathematical
 * RMS aggregation even on partial final buckets.
 */
export function buildChannelPyramid(
  channel: Float32Array,
  sampleRate: number,
  options?: PyramidOptions
): WaveformPyramid {
  const totalSamples = channel.length;
  const durationSec = sampleRate > 0 ? totalSamples / sampleRate : 0;
  const bucketSizes = options?.bucketSizes ?? DEFAULT_PYRAMID_BUCKET_SIZES;

  if (totalSamples === 0 || bucketSizes.length === 0) {
    return {
      sampleRate,
      totalSamples: 0,
      durationSec: 0,
      levels: [],
    };
  }

  const levels: WaveformPyramidLevel[] = [];

  // Derive each level directly from the original PCM buffer
  for (const bucketSize of bucketSizes) {
    const effectiveBucketSize = Math.max(1, bucketSize);
    const bucketsCount = Math.ceil(totalSamples / effectiveBucketSize);
    const mins = new Float32Array(bucketsCount);
    const maxs = new Float32Array(bucketsCount);
    const rms = new Float32Array(bucketsCount);

    for (let b = 0; b < bucketsCount; b++) {
      const start = b * effectiveBucketSize;
      const end = Math.min(start + effectiveBucketSize, totalSamples);
      const count = end - start;

      let min = 0.0;
      let max = 0.0;
      let sumSq = 0.0;

      for (let i = start; i < end; i++) {
        const val = channel[i];
        if (val < min) min = val;
        if (val > max) max = val;
        sumSq += val * val;
      }

      mins[b] = min;
      maxs[b] = max;
      rms[b] = count > 0 ? Math.sqrt(sumSq / count) : 0.0;
    }

    levels.push({
      samplesPerBucket: effectiveBucketSize,
      bucketsCount,
      mins,
      maxs,
      rms,
    });
  }

  return {
    sampleRate,
    totalSamples,
    durationSec,
    levels,
  };
}

/**
 * Derives a Combined Peak View envelope from two existing channel pyramids.
 * min = min(Lmin, Rmin), max = max(Lmax, Rmax), and power-averaged RMS.
 * This is a derived visualization view, NOT a summed audio signal.
 */
export function buildCombinedPeakPyramid(
  pyramidL: WaveformPyramid,
  pyramidR: WaveformPyramid
): WaveformPyramid {
  const levelsCount = Math.min(pyramidL.levels.length, pyramidR.levels.length);
  const combinedLevels: WaveformPyramidLevel[] = [];

  for (let lvl = 0; lvl < levelsCount; lvl++) {
    const lvlL = pyramidL.levels[lvl];
    const lvlR = pyramidR.levels[lvl];
    const count = Math.min(lvlL.bucketsCount, lvlR.bucketsCount);

    const mins = new Float32Array(count);
    const maxs = new Float32Array(count);
    const rms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      mins[i] = Math.min(lvlL.mins[i], lvlR.mins[i]);
      maxs[i] = Math.max(lvlL.maxs[i], lvlR.maxs[i]);
      // Power-averaged RMS between L and R: sqrt((rmsL^2 + rmsR^2) / 2)
      rms[i] = Math.sqrt((lvlL.rms[i] * lvlL.rms[i] + lvlR.rms[i] * lvlR.rms[i]) * 0.5);
    }

    combinedLevels.push({
      samplesPerBucket: lvlL.samplesPerBucket,
      bucketsCount: count,
      mins,
      maxs,
      rms,
    });
  }

  return {
    sampleRate: pyramidL.sampleRate,
    totalSamples: pyramidL.totalSamples,
    durationSec: pyramidL.durationSec,
    levels: combinedLevels,
  };
}

/**
 * Builds independent Left and Right channel pyramids as well as the derived
 * Combined Peak View for stereo audio. Guarantees that individual channel data
 * remains independently accessible for future split-channel visualization.
 */
export function buildStereoPyramids(
  channels: Float32Array[],
  sampleRate: number,
  options?: PyramidOptions
): StereoWaveformPyramids {
  if (!channels || channels.length === 0) {
    const empty: WaveformPyramid = {
      sampleRate,
      totalSamples: 0,
      durationSec: 0,
      levels: [],
    };
    return { left: empty, right: empty, combined: empty };
  }

  if (channels.length === 1) {
    const mono = buildChannelPyramid(channels[0], sampleRate, options);
    return { left: mono, right: mono, combined: mono };
  }

  const left = buildChannelPyramid(channels[0], sampleRate, options);
  const right = buildChannelPyramid(channels[1], sampleRate, options);
  const combined = buildCombinedPeakPyramid(left, right);

  return { left, right, combined };
}

/**
 * Selects the optimal pyramid level and extracts the slice of buckets corresponding to the visible time viewport.
 * Uses zero-copy Float32Array.subarray to eliminate memory allocations.
 */
export function getVisibleBuckets(
  pyramid: WaveformPyramid,
  startTimeSec: number,
  durationSec: number,
  targetWidthPx: number
): VisibleBuckets {
  if (pyramid.levels.length === 0 || durationSec <= 0 || targetWidthPx <= 0) {
    const empty = new Float32Array(0);
    return {
      mins: empty,
      maxs: empty,
      rms: empty,
      levelIndex: 0,
      startIndex: 0,
      count: 0,
      samplesPerBucket: 1,
    };
  }

  // Calculate target samples per screen pixel
  const totalVisibleSamples = durationSec * pyramid.sampleRate;
  const targetSamplesPerPixel = totalVisibleSamples / targetWidthPx;

  // Find the pyramid level with samplesPerBucket closest to (and ideally <=) targetSamplesPerPixel
  let selectedLevelIdx = 0;
  for (let i = 0; i < pyramid.levels.length; i++) {
    if (pyramid.levels[i].samplesPerBucket <= targetSamplesPerPixel * 1.5) {
      selectedLevelIdx = i;
    } else {
      break;
    }
  }

  const level = pyramid.levels[selectedLevelIdx];
  const startSample = Math.max(0, Math.floor(startTimeSec * pyramid.sampleRate));
  const endSample = Math.min(pyramid.totalSamples, Math.ceil((startTimeSec + durationSec) * pyramid.sampleRate));

  const startBucket = Math.max(0, Math.floor(startSample / level.samplesPerBucket));
  const endBucket = Math.min(level.bucketsCount, Math.ceil(endSample / level.samplesPerBucket));
  const count = Math.max(0, endBucket - startBucket);

  return {
    mins: level.mins.subarray(startBucket, endBucket),
    maxs: level.maxs.subarray(startBucket, endBucket),
    rms: level.rms.subarray(startBucket, endBucket),
    levelIndex: selectedLevelIdx,
    startIndex: startBucket,
    count,
    samplesPerBucket: level.samplesPerBucket,
  };
}
