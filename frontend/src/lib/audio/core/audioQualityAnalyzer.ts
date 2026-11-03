/**
 * Phase A1: Audio Quality Analyzer
 * 100% Browser-Local, Deterministic Acoustic Measurement Engine
 * Evaluates audio properties before and after noise reduction without duplicating PCM buffers.
 */

import type {
  AudioQualityMetrics,
  ChannelQualityMetrics,
  AudioQualityComparison,
  AudioQualityDelta,
  AnalyzerOptions,
  NoiseFloorStatus,
} from '../types.ts';

export const DEFAULT_ANALYZER_OPTIONS: Required<AnalyzerOptions> = {
  windowMs: 50,
  silenceThresholdDbFS: -60.0,
  clippingThreshold: 0.999,
};

const FLOOR_DBFS = -120.0;
const EPSILON = 1e-6; // 20 * log10(1e-6) = -120 dBFS

/**
 * Converts linear amplitude to dBFS with a guaranteed floor at -120 dBFS.
 * Guarantees no NaN, Infinity, or -Infinity.
 */
export function linearToDbFS(linear: number, floorDbfs: number = FLOOR_DBFS): number {
  if (!Number.isFinite(linear) || linear <= EPSILON) {
    return floorDbfs;
  }
  const db = 20 * Math.log10(linear);
  return Math.max(db, floorDbfs);
}

/**
 * Converts dBFS to linear amplitude factor.
 */
export function dbFSToLinear(db: number): number {
  if (!Number.isFinite(db) || db <= FLOOR_DBFS) {
    return 0.0;
  }
  return Math.pow(10, db / 20);
}

/**
 * Analyzes a single non-interleaved channel of PCM samples directly in place.
 * Performs zero copies or slices of the input Float32Array.
 */
export function analyzeChannel(
  samples: Float32Array,
  sampleRate: number,
  channelIndex: number,
  options: Required<AnalyzerOptions>
): ChannelQualityMetrics {
  const totalSamples = samples.length;

  if (totalSamples === 0) {
    return {
      channelIndex,
      peak: 0.0,
      peakDbFS: FLOOR_DBFS,
      rms: 0.0,
      rmsDbFS: FLOOR_DBFS,
      noiseFloorDbFS: null,
      noiseFloorStatus: 'silent',
      dynamicRangeDb: null,
      crestFactorDb: 0.0,
      isClipped: false,
      clippedCount: 0,
      clippedPercentage: 0.0,
      maxConsecutiveClipped: 0,
      silencePercentage: 100.0,
    };
  }

  const { windowMs, silenceThresholdDbFS, clippingThreshold } = options;
  const silenceThresholdLinear = dbFSToLinear(silenceThresholdDbFS);

  // 1. Single-pass over all samples for peak, global RMS, and clipping
  let peak = 0.0;
  let sumSq = 0.0;
  let clippedCount = 0;
  let consecutiveClipped = 0;
  let maxConsecutiveClipped = 0;

  for (let i = 0; i < totalSamples; i++) {
    const val = samples[i];
    const absVal = Math.abs(val);

    if (absVal > peak) {
      peak = absVal;
    }

    sumSq += val * val;

    if (absVal >= clippingThreshold) {
      clippedCount++;
      consecutiveClipped++;
      if (consecutiveClipped > maxConsecutiveClipped) {
        maxConsecutiveClipped = consecutiveClipped;
      }
    } else {
      consecutiveClipped = 0;
    }
  }

  const peakDbFS = Number(linearToDbFS(peak).toFixed(2));
  const rms = Math.sqrt(sumSq / totalSamples);
  const rmsDbFS = Number(linearToDbFS(rms).toFixed(2));
  const isClipped = clippedCount > 0;
  const clippedPercentage = Number(((clippedCount / totalSamples) * 100).toFixed(4));
  const crestFactorDb = Number((peakDbFS - rmsDbFS).toFixed(2));

  // 2. Windowed analysis for silence and noise floor estimation
  const windowSize = Math.max(1, Math.round((windowMs / 1000) * sampleRate));
  const totalWindows = Math.max(1, Math.ceil(totalSamples / windowSize));

  let silentWindowsCount = 0;
  // Collect candidate window RMS values for noise floor estimation (filtering digital silence and DC offset)
  const candidateRmsList: number[] = [];
  let nonZeroWindowsCount = 0;

  for (let w = 0; w < totalWindows; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, totalSamples);
    const winLen = end - start;
    if (winLen <= 0) break;

    let winSumSq = 0.0;
    let winSum = 0.0;

    for (let i = start; i < end; i++) {
      const s = samples[i];
      winSumSq += s * s;
      winSum += s;
    }

    const winRms = Math.sqrt(winSumSq / winLen);

    if (winRms < silenceThresholdLinear) {
      silentWindowsCount++;
    }

    // Single-pass variance check: Var(X) = (sum(x^2) - (sum(x))^2 / N) / (N - 1)
    const winVarSum = winSumSq - (winSum * winSum) / winLen;
    const winVariance = winLen > 1 ? Math.max(0.0, winVarSum / (winLen - 1)) : 0.0;

    if (winRms > 1e-5) {
      nonZeroWindowsCount++;
      // Exclude constant DC offsets (sample variance essentially 0) from ambient noise candidates
      if (winVariance >= 1e-8) {
        candidateRmsList.push(winRms);
      }
    }
  }

  const silencePercentage = Number(((silentWindowsCount / totalWindows) * 100).toFixed(2));

  // 3. Statistical Noise Floor Estimation
  let noiseFloorDbFS: number | null = null;
  let noiseFloorStatus: NoiseFloorStatus = 'insufficient_quiet_material';

  if (nonZeroWindowsCount === 0) {
    noiseFloorStatus = 'silent';
    noiseFloorDbFS = null;
  } else if (candidateRmsList.length < 4) {
    // Insufficient duration of stationary background material
    noiseFloorStatus = 'insufficient_quiet_material';
    noiseFloorDbFS = null;
  } else {
    // Sort candidate RMS values ascending
    candidateRmsList.sort((a, b) => a - b);

    // P10 estimator (10th percentile)
    const p10Index = Math.floor(candidateRmsList.length * 0.10);
    const p10Rms = candidateRmsList[p10Index];
    const p10Db = linearToDbFS(p10Rms);

    // Consistency check: check if the signal is continuous full-scale audio or loud audio without quiet pauses
    // If the 10th percentile is within 3 dB of global RMS and global RMS is loud (> -30 dBFS),
    // there are no background pauses in this recording.
    const isContinuousLoud = p10Db >= rmsDbFS - 3.0 && rmsDbFS > -30.0;

    // Check spread in the lowest quartile
    const p25Index = Math.min(candidateRmsList.length - 1, Math.ceil(candidateRmsList.length * 0.25));
    const p25Db = linearToDbFS(candidateRmsList[p25Index]);
    const isUnstableQuiet = p25Db - p10Db > 9.0;

    if (isContinuousLoud || isUnstableQuiet) {
      noiseFloorStatus = 'insufficient_quiet_material';
      noiseFloorDbFS = null;
    } else {
      noiseFloorStatus = 'valid';
      noiseFloorDbFS = Number(p10Db.toFixed(2));
    }
  }

  // 4. Dynamic Range (peak-to-noise-floor span)
  const dynamicRangeDb =
    noiseFloorDbFS !== null ? Math.max(0.0, Number((peakDbFS - noiseFloorDbFS).toFixed(2))) : null;

  return {
    channelIndex,
    peak,
    peakDbFS,
    rms,
    rmsDbFS,
    noiseFloorDbFS,
    noiseFloorStatus,
    dynamicRangeDb,
    crestFactorDb,
    isClipped,
    clippedCount,
    clippedPercentage,
    maxConsecutiveClipped,
    silencePercentage,
  };
}

/**
 * Analyzes audio quality across mono or stereo channels.
 * Returns overall unified metrics and individual per-channel metrics.
 */
export function analyzeAudioQuality(
  channels: Float32Array[],
  sampleRate: number,
  options?: AnalyzerOptions
): AudioQualityMetrics {
  if (!channels || channels.length === 0) {
    throw new Error('analyzeAudioQuality requires at least one audio channel.');
  }

  const opts: Required<AnalyzerOptions> = {
    windowMs: options?.windowMs ?? DEFAULT_ANALYZER_OPTIONS.windowMs,
    silenceThresholdDbFS: options?.silenceThresholdDbFS ?? DEFAULT_ANALYZER_OPTIONS.silenceThresholdDbFS,
    clippingThreshold: options?.clippingThreshold ?? DEFAULT_ANALYZER_OPTIONS.clippingThreshold,
  };

  const numberOfChannels = (channels.length >= 2 ? 2 : 1) as 1 | 2;
  const totalSamples = channels[0].length;
  const durationSec = sampleRate > 0 ? Number((totalSamples / sampleRate).toFixed(3)) : 0;

  // Analyze each channel independently
  const channelMetrics: ChannelQualityMetrics[] = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    channelMetrics.push(analyzeChannel(channels[ch], sampleRate, ch, opts));
  }

  // Combine overall metrics across channels
  if (numberOfChannels === 1) {
    const ch0 = channelMetrics[0];
    return {
      durationSec,
      sampleRate,
      numberOfChannels: 1,
      totalSamples,
      peak: ch0.peak,
      peakDbFS: ch0.peakDbFS,
      rms: ch0.rms,
      rmsDbFS: ch0.rmsDbFS,
      noiseFloorDbFS: ch0.noiseFloorDbFS,
      noiseFloorStatus: ch0.noiseFloorStatus,
      dynamicRangeDb: ch0.dynamicRangeDb,
      crestFactorDb: ch0.crestFactorDb,
      isClipped: ch0.isClipped,
      clippedCount: ch0.clippedCount,
      clippedPercentage: ch0.clippedPercentage,
      maxConsecutiveClipped: ch0.maxConsecutiveClipped,
      silencePercentage: ch0.silencePercentage,
      channels: channelMetrics,
    };
  }

  // Stereo Combining
  const ch0 = channelMetrics[0];
  const ch1 = channelMetrics[1];

  const overallPeak = Math.max(ch0.peak, ch1.peak);
  const overallPeakDbFS = Number(linearToDbFS(overallPeak).toFixed(2));

  // Power-averaged RMS across channels
  const overallRms = Math.sqrt((ch0.rms * ch0.rms + ch1.rms * ch1.rms) / 2);
  const overallRmsDbFS = Number(linearToDbFS(overallRms).toFixed(2));

  const overallClippedCount = ch0.clippedCount + ch1.clippedCount;
  const overallClippedPercentage = Number(
    ((overallClippedCount / (totalSamples * 2)) * 100).toFixed(4)
  );
  const overallMaxConsecutiveClipped = Math.max(ch0.maxConsecutiveClipped, ch1.maxConsecutiveClipped);
  const overallIsClipped = overallClippedCount > 0;
  const overallSilencePercentage = Number(((ch0.silencePercentage + ch1.silencePercentage) / 2).toFixed(2));
  const overallCrestFactorDb = Number((overallPeakDbFS - overallRmsDbFS).toFixed(2));

  // Multi-channel Noise Floor Combining (linear power sum)
  let overallNoiseFloorDbFS: number | null = null;
  let overallNoiseFloorStatus: NoiseFloorStatus = 'insufficient_quiet_material';

  if (ch0.noiseFloorStatus === 'valid' && ch1.noiseFloorStatus === 'valid') {
    const lin0 = dbFSToLinear(ch0.noiseFloorDbFS!);
    const lin1 = dbFSToLinear(ch1.noiseFloorDbFS!);
    const combinedLinear = Math.sqrt((lin0 * lin0 + lin1 * lin1) / 2);
    overallNoiseFloorDbFS = Number(linearToDbFS(combinedLinear).toFixed(2));
    overallNoiseFloorStatus = 'valid';
  } else if (ch0.noiseFloorStatus === 'silent' && ch1.noiseFloorStatus === 'silent') {
    overallNoiseFloorDbFS = null;
    overallNoiseFloorStatus = 'silent';
  } else {
    // If one channel is uncertain or silent while the other is not, avoid fabricating certainty
    overallNoiseFloorDbFS = null;
    overallNoiseFloorStatus = 'insufficient_quiet_material';
  }

  const overallDynamicRangeDb =
    overallNoiseFloorDbFS !== null
      ? Math.max(0.0, Number((overallPeakDbFS - overallNoiseFloorDbFS).toFixed(2)))
      : null;

  return {
    durationSec,
    sampleRate,
    numberOfChannels: 2,
    totalSamples,
    peak: overallPeak,
    peakDbFS: overallPeakDbFS,
    rms: overallRms,
    rmsDbFS: overallRmsDbFS,
    noiseFloorDbFS: overallNoiseFloorDbFS,
    noiseFloorStatus: overallNoiseFloorStatus,
    dynamicRangeDb: overallDynamicRangeDb,
    crestFactorDb: overallCrestFactorDb,
    isClipped: overallIsClipped,
    clippedCount: overallClippedCount,
    clippedPercentage: overallClippedPercentage,
    maxConsecutiveClipped: overallMaxConsecutiveClipped,
    silencePercentage: overallSilencePercentage,
    channels: channelMetrics,
  };
}

/**
 * Computes comparative physical deltas between Cleaned and Original audio quality metrics.
 * Positive delta indicates clean > original; negative delta indicates clean < original.
 * Contains no subjective scores, grades, or quality judgments.
 */
export function compareAudioQuality(
  original: AudioQualityMetrics,
  clean: AudioQualityMetrics
): AudioQualityComparison {
  const peakDbFSDelta = Number((clean.peakDbFS - original.peakDbFS).toFixed(2));
  const rmsDbFSDelta = Number((clean.rmsDbFS - original.rmsDbFS).toFixed(2));

  const noiseFloorDeltaDb =
    clean.noiseFloorDbFS !== null && original.noiseFloorDbFS !== null
      ? Number((clean.noiseFloorDbFS - original.noiseFloorDbFS).toFixed(2))
      : null;

  const dynamicRangeDeltaDb =
    clean.dynamicRangeDb !== null && original.dynamicRangeDb !== null
      ? Number((clean.dynamicRangeDb - original.dynamicRangeDb).toFixed(2))
      : null;

  const crestFactorDeltaDb = Number((clean.crestFactorDb - original.crestFactorDb).toFixed(2));
  const silencePercentageDelta = Number((clean.silencePercentage - original.silencePercentage).toFixed(2));
  const clippedCountDelta = clean.clippedCount - original.clippedCount;

  const delta: AudioQualityDelta = {
    peakDbFSDelta,
    rmsDbFSDelta,
    noiseFloorDeltaDb,
    dynamicRangeDeltaDb,
    crestFactorDeltaDb,
    silencePercentageDelta,
    clippedCountDelta,
  };

  return {
    original,
    clean,
    delta,
  };
}
