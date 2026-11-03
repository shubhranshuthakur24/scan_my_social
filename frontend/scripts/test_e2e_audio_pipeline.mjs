/**
 * End-to-End Integration Test Suite for Audio Noise Reduction
 * Simulates complete workflow from raw multi-channel audio to pre-filtering, profiling,
 * STFT spectral subtraction, dynamics, limiting, and lossless WAV export.
 */

import { downmixToStereo, calculateRms, rmsToDbfs } from '../src/lib/audio/core/dspMath.ts';
import { BiquadFilter, createHighPassCoefficients, HumNotchCascade } from '../src/lib/audio/core/biquadFilter.ts';
import { estimateAutoNoiseProfile, estimateManualNoiseProfile } from '../src/lib/audio/core/noiseProfiler.ts';
import { ShortTimeFourierTransform } from '../src/lib/audio/core/shortTimeFourierTransform.ts';
import { SpectralSubtractor } from '../src/lib/audio/core/spectralSubtractor.ts';
import { DownwardExpander } from '../src/lib/audio/core/downwardExpander.ts';
import { SamplePeakLimiter } from '../src/lib/audio/core/samplePeakLimiter.ts';
import { encodeWav } from '../src/lib/audio/core/wavEncoder.ts';

function runEndToEndTests() {
  console.log('====================================================');
  console.log('🚀 AUDIO NOISE REDUCTION — END-TO-END VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const sampleRate = 48000;
  const durationSec = 4.0;
  const numSamples = Math.round(sampleRate * durationSec);

  // STEP 1: Multichannel Ingestion & Downmix (5.1 surround -> Stereo)
  console.log('--- STEP 1: 5.1 Multichannel Downmix Ingestion (ITU-R BS.775) ---');
  const chL = new Float32Array(numSamples);
  const chR = new Float32Array(numSamples);
  const chC = new Float32Array(numSamples);
  const chLFE = new Float32Array(numSamples);
  const chLs = new Float32Array(numSamples);
  const chRs = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Speech dialog centered in Center channel (440Hz + 880Hz)
    if (t < 2.0) {
      chC[i] = 0.5 * Math.sin(2 * Math.PI * 440 * t) + 0.25 * Math.sin(2 * Math.PI * 880 * t);
    }
    // Low frequency rumble in LFE (20Hz)
    chLFE[i] = 0.3 * Math.sin(2 * Math.PI * 20 * t);
    // 50Hz mains hum across all channels
    const hum = 0.05 * Math.sin(2 * Math.PI * 50 * t);
    // Stationary room hiss
    const hiss = (Math.random() * 2 - 1) * 0.015;

    chL[i] = hum + hiss;
    chR[i] = hum + hiss;
    chLs[i] = hum + hiss;
    chRs[i] = hum + hiss;
  }

  const surroundChannels = [chL, chR, chC, chLFE, chLs, chRs];
  const stereoChannels = downmixToStereo(surroundChannels);

  assert(stereoChannels.length === 2, `5.1 multichannel audio downmixed to exactly 2 channels (Stereo)`);
  assert(stereoChannels[0].length === numSamples, `Downmixed channel length matches source length (${numSamples})`);

  // STEP 2: Time-Domain Pre-Conditioning (HPF + Hum Notch)
  console.log('\n--- STEP 2: Time-Domain Pre-Conditioning (HPF + Hum Notch) ---');
  const hpfCoeffs = createHighPassCoefficients({ cutoffHz: 80, sampleRate });
  const hpfL = new BiquadFilter(hpfCoeffs);
  const hpfR = new BiquadFilter(hpfCoeffs);

  let preconditionedL = hpfL.processBuffer(stereoChannels[0]);
  let preconditionedR = hpfR.processBuffer(stereoChannels[1]);

  const humCascadeL = new HumNotchCascade({ fundamentalHz: 50, harmonicsCount: 4, sampleRate, q: 28 });
  const humCascadeR = new HumNotchCascade({ fundamentalHz: 50, harmonicsCount: 4, sampleRate, q: 28 });

  preconditionedL = humCascadeL.processBuffer(preconditionedL, true);
  preconditionedR = humCascadeR.processBuffer(preconditionedR, true);

  assert(!isNaN(preconditionedL[0]) && isFinite(preconditionedL[0]), `Pre-conditioned channels are numerically stable`);

  // STEP 3: Noise Profiling on Pre-Filtered Domain
  console.log('\n--- STEP 3: Multi-Gate Noise Profiling on Pre-Filtered Domain ---');
  const autoResult = estimateAutoNoiseProfile(preconditionedL, sampleRate);
  assert(autoResult.status === 'valid', `Multi-gate profiler successfully isolates pause noise (status === 'valid')`);
  assert(autoResult.profile !== null, `Constructed valid power spectrum P_N(k)`);
  console.log(`  📊 Detected Noise Floor: ${autoResult.profile.noiseFloorDbfs.toFixed(1)} dBFS`);

  // STEP 4: STFT Spectral Subtraction
  console.log('\n--- STEP 4: STFT Frequency-Domain Spectral Subtraction ---');
  const stft = new ShortTimeFourierTransform({ fftSize: 2048, hopSize: 512 });
  const subtractorL = new SpectralSubtractor(autoResult.profile, {
    alpha: 2.2,
    beta: 0.015,
    frequencySmoothing: true,
    gammaAttack: 0.8,
    gammaRelease: 0.9,
  });
  const subtractorR = new SpectralSubtractor(autoResult.profile, {
    alpha: 2.2,
    beta: 0.015,
    frequencySmoothing: true,
    gammaAttack: 0.8,
    gammaRelease: 0.9,
  });

  let denoisedL = stft.processChannel(preconditionedL, sampleRate, (r, im) => subtractorL.processFrame(r, im));
  let denoisedR = stft.processChannel(preconditionedR, sampleRate, (r, im) => subtractorR.processFrame(r, im));

  // STEP 5: Soft-Knee Expander & Lookahead Sample-Peak Limiter
  console.log('\n--- STEP 5: Dynamics Expander & Sample-Peak Safety Limiter ---');
  const expanderL = new DownwardExpander({
    thresholdDbfs: -42,
    ratio: 2.0,
    kneeDb: 6,
    attackMs: 4,
    releaseMs: 140,
    maxAttenuationDb: -16,
  }, sampleRate);
  const expanderR = new DownwardExpander({
    thresholdDbfs: -42,
    ratio: 2.0,
    kneeDb: 6,
    attackMs: 4,
    releaseMs: 140,
    maxAttenuationDb: -16,
  }, sampleRate);

  denoisedL = expanderL.processBuffer(denoisedL, true);
  denoisedR = expanderR.processBuffer(denoisedR, true);

  const limiterL = new SamplePeakLimiter({ ceilingDbfs: -0.2, lookaheadMs: 1.5, releaseMs: 50 }, sampleRate);
  const limiterR = new SamplePeakLimiter({ ceilingDbfs: -0.2, lookaheadMs: 1.5, releaseMs: 50 }, sampleRate);

  const finalL = limiterL.processBuffer(denoisedL, true);
  const finalR = limiterR.processBuffer(denoisedR, true);

  // Verify Pause Noise Attenuation
  // Compare pause (2.5s to 3.5s) between raw stereo and final cleaned
  const rawPauseRms = calculateRms(stereoChannels[0], Math.round(sampleRate * 2.5), sampleRate);
  const cleanPauseRms = calculateRms(finalL, Math.round(sampleRate * 2.5), sampleRate);
  const attenuationDb = rmsToDbfs(rawPauseRms) - rmsToDbfs(cleanPauseRms);

  console.log(`  📊 Raw Pause Noise RMS:   ${rmsToDbfs(rawPauseRms).toFixed(1)} dBFS`);
  console.log(`  📊 Cleaned Pause Noise RMS: ${rmsToDbfs(cleanPauseRms).toFixed(1)} dBFS`);
  console.log(`  📊 Total Noise Attenuation: ${attenuationDb.toFixed(1)} dB`);

  assert(attenuationDb > 14.0, `Total background noise attenuation exceeds 14 dB (${attenuationDb.toFixed(1)} dB)`);

  // Verify Peak Ceiling
  let maxPeakL = 0;
  for (let i = 0; i < finalL.length; i++) {
    const abs = Math.abs(finalL[i]);
    if (abs > maxPeakL) maxPeakL = abs;
  }
  assert(maxPeakL <= 0.9773, `Sample peaks strictly respect -0.2 dBFS ceiling (max: ${maxPeakL.toFixed(4)})`);

  // STEP 6: Lossless WAV Export
  console.log('\n--- STEP 6: Lossless RIFF WAV Export ---');
  const wavBlob16 = encodeWav([finalL, finalR], sampleRate, { bitDepth: 16 });
  const wavBlob24 = encodeWav([finalL, finalR], sampleRate, { bitDepth: 24 });

  const expected16Size = 44 + numSamples * 2 * 2;
  const expected24Size = 44 + numSamples * 2 * 3;

  assert(wavBlob16.size === expected16Size, `16-bit WAV matches exact byte size (${wavBlob16.size} bytes)`);
  assert(wavBlob24.size === expected24Size, `24-bit WAV matches exact byte size (${wavBlob24.size} bytes)`);

  console.log('\n====================================================');
  console.log(`🏁 END-TO-END SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndTests();
