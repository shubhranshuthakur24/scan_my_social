/**
 * Audio Processing Types & Contracts for ScanMySocial Audio Noise Reduction
 * 100% Browser-Local DSP Engine
 */

export interface NormalizedPcmContract {
  /** Non-interleaved channel buffers normalized to [-1.0, 1.0] */
  readonly channelData: Float32Array[];
  /** Strictly Mono (1) or Stereo (2) */
  readonly numberOfChannels: 1 | 2;
  /** Native sample rate (e.g. 44100, 48000 Hz) */
  readonly sampleRate: number;
  /** Duration in seconds */
  readonly duration: number;
  /** Total samples per channel */
  readonly length: number;
  /** Metadata descriptor for UI feedback */
  readonly sourceFormat: 'audio' | 'video';
  /** Original file name */
  readonly originalFileName: string;
}

export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

export interface HighPassFilterOptions {
  cutoffHz: number;
  sampleRate: number;
  q?: number;
}

export interface HumNotchOptions {
  fundamentalHz: 50 | 60;
  harmonicsCount: number; // e.g. 3 or 4 harmonics (50/60, 100/120, 150/180, 200/240 Hz)
  sampleRate: number;
  q?: number; // default 25-30
}

export interface NoiseProfile {
  /** Power spectral density averaged across stationary windows */
  powerSpectrum: Float32Array;
  /** FFT frame size used for estimation (e.g. 2048) */
  fftSize: number;
  /** Sample rate at which profile was calculated */
  sampleRate: number;
  /** Confidence score / method used */
  mode: 'auto' | 'manual';
  /** Energy floor detected during profiling (dBFS) */
  noiseFloorDbfs: number;
}

export interface AutoProfilerResult {
  profile: NoiseProfile | null;
  status: 'valid' | 'uncertain' | 'silent';
  windowsAnalyzed: number;
  windowsAccepted: number;
  message?: string;
}

export interface SpectralSubtractionParams {
  /** Over-subtraction factor alpha (typically 1.2 to 2.8) */
  alpha: number;
  /** Spectral floor beta (typically 0.015 to 0.05, -36dB to -26dB) */
  beta: number;
  /** Inter-bin 3-point frequency smoothing factor */
  frequencySmoothing: boolean;
  /** Temporal attack smoothing coefficient (0.0 to 1.0) */
  gammaAttack: number;
  /** Temporal release smoothing coefficient (0.0 to 1.0) */
  gammaRelease: number;
}

export interface DownwardExpanderParams {
  thresholdDbfs: number; // e.g. -42 dBFS
  ratio: number;          // e.g. 2.0 (2:1)
  kneeDb: number;         // e.g. 6 dB
  attackMs: number;       // e.g. 4 ms
  releaseMs: number;      // e.g. 140 ms
  maxAttenuationDb: number; // e.g. -16 dB
}

export interface SamplePeakLimiterParams {
  ceilingDbfs: number;    // e.g. -0.2 dBFS
  lookaheadMs: number;    // e.g. 1.5 ms
  releaseMs: number;      // e.g. 50 ms
}

export interface DspPipelineOptions {
  hpfEnabled: boolean;
  hpfCutoffHz: number;
  humRemovalEnabled: boolean;
  humFundamentalHz: 50 | 60;
  spectralSubtraction: SpectralSubtractionParams;
  expanderEnabled: boolean;
  expander: DownwardExpanderParams;
  limiter: SamplePeakLimiterParams;
}

export interface AudioDenoiseJob {
  id: string;
  channelData: Float32Array[];
  numberOfChannels: 1 | 2;
  sampleRate: number;
  options: DspPipelineOptions;
  noiseProfile: NoiseProfile;
}

export interface AudioDenoiseProgress {
  id: string;
  type: 'progress';
  progress: number; // 0.0 to 1.0
  currentChannel: number;
  totalChannels: number;
}

export interface AudioDenoiseResult {
  id: string;
  type: 'result';
  channelData: Float32Array[];
  numberOfChannels: 1 | 2;
  sampleRate: number;
  durationMs: number;
}

export interface AudioDenoiseError {
  id: string;
  type: 'error';
  error: string;
}

// ============================================================================
// Phase A1: Audio Quality Analyzer Types
// ============================================================================

export type NoiseFloorStatus = 'valid' | 'silent' | 'insufficient_quiet_material';

export interface ChannelQualityMetrics {
  readonly channelIndex: number;
  readonly peak: number;
  readonly peakDbFS: number;
  readonly rms: number;
  readonly rmsDbFS: number;
  readonly noiseFloorDbFS: number | null;
  readonly noiseFloorStatus: NoiseFloorStatus;
  readonly dynamicRangeDb: number | null;
  readonly crestFactorDb: number;
  readonly isClipped: boolean;
  readonly clippedCount: number;
  readonly clippedPercentage: number;
  readonly maxConsecutiveClipped: number;
  readonly silencePercentage: number;
}

export interface AudioQualityMetrics {
  readonly durationSec: number;
  readonly sampleRate: number;
  readonly numberOfChannels: 1 | 2;
  readonly totalSamples: number;

  // Overall Unified Metrics
  readonly peak: number;
  readonly peakDbFS: number;
  readonly rms: number;
  readonly rmsDbFS: number;
  readonly noiseFloorDbFS: number | null;
  readonly noiseFloorStatus: NoiseFloorStatus;
  readonly dynamicRangeDb: number | null;
  readonly crestFactorDb: number;
  readonly isClipped: boolean;
  readonly clippedCount: number;
  readonly clippedPercentage: number;
  readonly maxConsecutiveClipped: number;
  readonly silencePercentage: number;

  // Per-Channel Breakdown
  readonly channels: ChannelQualityMetrics[];
}

export interface AudioQualityDelta {
  readonly peakDbFSDelta: number;
  readonly rmsDbFSDelta: number;
  readonly noiseFloorDeltaDb: number | null;
  readonly dynamicRangeDeltaDb: number | null;
  readonly crestFactorDeltaDb: number;
  readonly silencePercentageDelta: number;
  readonly clippedCountDelta: number;
}

export interface AudioQualityComparison {
  readonly original: AudioQualityMetrics;
  readonly clean: AudioQualityMetrics;
  readonly delta: AudioQualityDelta;
}

export interface AnalyzerOptions {
  /** Window size for RMS and silence analysis in milliseconds (default: 50 ms) */
  readonly windowMs?: number;
  /** Silence threshold in dBFS below which a 50ms window is counted as silent (default: -60 dBFS) */
  readonly silenceThresholdDbFS?: number;
  /** Sample-level clipping threshold in linear amplitude (default: 0.999) */
  readonly clippingThreshold?: number;
}
