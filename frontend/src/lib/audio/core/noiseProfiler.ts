/**
 * Noise Profiler: Multi-Gate Automatic Stationary Profiler & Manual Waveform Region Profiler
 * Enforces the Pre-Conditioning Consistency Rule: Profiler strictly analyzes pre-filtered PCM.
 */

import { AutoProfilerResult, NoiseProfile } from '../types';
import { calculateRms, calculateVariance, rmsToDbfs } from './dspMath';
import { getFFT } from './fastFourierTransform';
import { createHannWindow } from './dspMath';

export interface AutoProfilerOptions {
  windowDurationMs?: number; // default 150ms
  fftSize?: number;           // default 2048
  minSurvivingWindows?: number; // default 4
  silenceThresholdDbfs?: number; // default -65 dBFS
  minVariance?: number;       // default 1e-7
}

/**
 * Multi-Gate Automatic Noise Profiler.
 * Scans candidate 150ms windows across the clip to isolate stationary background noise.
 */
export function estimateAutoNoiseProfile(
  preConditionedSamples: Float32Array,
  sampleRate: number,
  options: AutoProfilerOptions = {}
): AutoProfilerResult {
  const windowMs = options.windowDurationMs || 150;
  const fftSize = options.fftSize || 2048;
  const minWindows = options.minSurvivingWindows || 4;
  const silenceFloorDbfs = options.silenceThresholdDbfs || -65;
  const minVariance = options.minVariance || 1e-7;

  const windowSize = Math.round((windowMs / 1000) * sampleRate);
  const totalSamples = preConditionedSamples.length;

  if (totalSamples < windowSize * 2) {
    return {
      profile: null,
      status: 'uncertain',
      windowsAnalyzed: 0,
      windowsAccepted: 0,
      message: 'Audio recording is too short for automatic noise profiling.',
    };
  }

  // 1. Slice audio into contiguous 150ms candidate windows
  interface WindowCandidate {
    offset: number;
    rms: number;
    dbfs: number;
    variance: number;
    flux: number;
    spectrum: Float32Array;
  }

  const fft = getFFT(fftSize);
  const windowWeights = createHannWindow(fftSize, true);
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const numBins = (fftSize >> 1) + 1;

  const candidates: WindowCandidate[] = [];
  let windowsAnalyzed = 0;

  for (let offset = 0; offset + windowSize <= totalSamples; offset += windowSize) {
    windowsAnalyzed++;
    const rms = calculateRms(preConditionedSamples, offset, windowSize);
    const dbfs = rmsToDbfs(rms);
    const variance = calculateVariance(preConditionedSamples, offset, windowSize);

    // GATE A: Absolute Energy Floor & Silence Check
    if (dbfs < silenceFloorDbfs || variance < minVariance) {
      continue; // Reject digital silence / hardware mute
    }

    // Compute average power spectrum across FFT frames within this 150ms window
    const spec = new Float32Array(numBins);
    const tempP = new Float32Array(numBins);
    let framesInWindow = 0;

    const hop = fftSize >> 1; // 50% overlap inside window
    for (let fPos = offset; fPos + fftSize <= offset + windowSize; fPos += hop) {
      for (let i = 0; i < fftSize; i++) {
        real[i] = preConditionedSamples[fPos + i] * windowWeights[i];
        imag[i] = 0;
      }
      fft.forward(real, imag);
      fft.powerSpectrum(real, imag, tempP);
      for (let k = 0; k < numBins; k++) {
        spec[k] += tempP[k];
      }
      framesInWindow++;
    }

    if (framesInWindow === 0) continue;
    const invFrames = 1 / framesInWindow;
    for (let k = 0; k < numBins; k++) {
      spec[k] *= invFrames;
    }

    // GATE B: Spectral Validity (broadband check between 100 Hz and 8000 Hz)
    const binHz = sampleRate / fftSize;
    const startBin = Math.max(1, Math.floor(100 / binHz));
    const endBin = Math.min(numBins - 1, Math.floor(8000 / binHz));
    let activeBins = 0;
    const threshold = spec[0] * 1e-6; // Non-zero energy check
    for (let k = startBin; k <= endBin; k++) {
      if (spec[k] > threshold) activeBins++;
    }
    if (activeBins < 16) {
      continue; // Reject artificial nulls / single-frequency sweeps
    }

    // GATE D: Spectral Flux / Transient Check
    // Compare first half energy vs second half energy in this 150ms window
    const halfLen = windowSize >> 1;
    const rms1 = calculateRms(preConditionedSamples, offset, halfLen);
    const rms2 = calculateRms(preConditionedSamples, offset + halfLen, halfLen);
    const diffDb = Math.abs(rmsToDbfs(rms2) - rmsToDbfs(rms1));
    if (diffDb > 6.0) {
      continue; // Reject speech transients / breath / attack
    }

    candidates.push({
      offset,
      rms,
      dbfs,
      variance,
      flux: diffDb,
      spectrum: spec,
    });
  }

  if (candidates.length === 0) {
    return {
      profile: null,
      status: 'silent',
      windowsAnalyzed,
      windowsAccepted: 0,
      message: 'No audible background noise detected (signal is silent or below -65 dBFS).',
    };
  }

  // GATE C: Energy Percentile Filter (10th to 30th percentile)
  candidates.sort((a, b) => a.rms - b.rms);
  const p10Idx = Math.floor(candidates.length * 0.10);
  const p30Idx = Math.max(p10Idx + 1, Math.ceil(candidates.length * 0.35));
  const percentilePool = candidates.slice(p10Idx, p30Idx);

  // GATE E: Multi-Window Consistency Check
  // Reject outlier windows whose mean energy deviates by > 3 dB from group median
  if (percentilePool.length < minWindows) {
    return {
      profile: null,
      status: 'uncertain',
      windowsAnalyzed,
      windowsAccepted: percentilePool.length,
      message: 'Automatic noise detection was uncertain (not enough stationary pause windows found). Please select noise manually.',
    };
  }

  const medianCandidate = percentilePool[Math.floor(percentilePool.length / 2)];
  const consistentWindows = percentilePool.filter(c => Math.abs(c.dbfs - medianCandidate.dbfs) < 3.0);

  if (consistentWindows.length < minWindows) {
    return {
      profile: null,
      status: 'uncertain',
      windowsAnalyzed,
      windowsAccepted: consistentWindows.length,
      message: 'Could not isolate consistent background noise. Please drag to select a noise pause manually on the waveform.',
    };
  }

  // Average power spectra across surviving windows
  const avgSpectrum = new Float32Array(numBins);
  const invCount = 1 / consistentWindows.length;
  let avgDbfs = 0;

  for (const win of consistentWindows) {
    avgDbfs += win.dbfs;
    for (let k = 0; k < numBins; k++) {
      avgSpectrum[k] += win.spectrum[k] * invCount;
    }
  }
  avgDbfs *= invCount;

  return {
    profile: {
      powerSpectrum: avgSpectrum,
      fftSize,
      sampleRate,
      mode: 'auto',
      noiseFloorDbfs: avgDbfs,
    },
    status: 'valid',
    windowsAnalyzed,
    windowsAccepted: consistentWindows.length,
  };
}

/**
 * Estimates noise profile from a user-selected time range on the waveform.
 * Selection must be between 250ms and 5.0s.
 */
export function estimateManualNoiseProfile(
  preConditionedSamples: Float32Array,
  sampleRate: number,
  startTimeSec: number,
  endTimeSec: number,
  fftSize: number = 2048
): { profile: NoiseProfile | null; error?: string; warning?: string } {
  const durationSec = endTimeSec - startTimeSec;
  if (durationSec < 0.25) {
    return { profile: null, error: 'Selected region is too short. Minimum duration is 250 ms.' };
  }
  if (durationSec > 5.0) {
    return { profile: null, error: 'Selected region is too long. Maximum recommended duration is 5.0 seconds.' };
  }

  const startSample = Math.max(0, Math.floor(startTimeSec * sampleRate));
  const endSample = Math.min(preConditionedSamples.length, Math.ceil(endTimeSec * sampleRate));
  const sliceLength = endSample - startSample;

  if (sliceLength < fftSize) {
    return { profile: null, error: 'Selected region contains insufficient samples for FFT analysis.' };
  }

  const rms = calculateRms(preConditionedSamples, startSample, sliceLength);
  const dbfs = rmsToDbfs(rms);

  // Silence gate
  if (dbfs < -65) {
    return {
      profile: null,
      error: 'Selected region is completely silent. Please select a section with audible background noise.',
    };
  }

  // Speech leakage check
  let warning: string | undefined;
  const clipRms = calculateRms(preConditionedSamples, 0, Math.min(preConditionedSamples.length, sampleRate * 10));
  const clipDbfs = rmsToDbfs(clipRms);
  if (dbfs > clipDbfs + 6.0) {
    warning = 'Selected region appears to contain active speech or loud transients. For best results, select a background pause.';
  }

  // Compute averaged power spectrum
  const fft = getFFT(fftSize);
  const windowWeights = createHannWindow(fftSize, true);
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const numBins = (fftSize >> 1) + 1;
  const avgSpectrum = new Float32Array(numBins);
  const tempP = new Float32Array(numBins);

  const hop = fftSize >> 2; // 75% overlap
  let frameCount = 0;

  for (let pos = startSample; pos + fftSize <= endSample; pos += hop) {
    for (let i = 0; i < fftSize; i++) {
      real[i] = preConditionedSamples[pos + i] * windowWeights[i];
      imag[i] = 0;
    }
    fft.forward(real, imag);
    fft.powerSpectrum(real, imag, tempP);
    for (let k = 0; k < numBins; k++) {
      avgSpectrum[k] += tempP[k];
    }
    frameCount++;
  }

  if (frameCount === 0) {
    return { profile: null, error: 'Failed to extract FFT frames from selected region.' };
  }

  const invFrames = 1 / frameCount;
  for (let k = 0; k < numBins; k++) {
    avgSpectrum[k] *= invFrames;
  }

  return {
    profile: {
      powerSpectrum: avgSpectrum,
      fftSize,
      sampleRate,
      mode: 'manual',
      noiseFloorDbfs: dbfs,
    },
    warning,
  };
}
