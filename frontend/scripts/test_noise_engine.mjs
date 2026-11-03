/**
 * Automated Verification Test Suite for Phase 2: Noise Engine & Dynamics
 * Tests Multi-Gate Auto Profiler, Manual Profiler, Spectral Subtractor, Downward Expander, and Sample-Peak Limiter.
 */

import { estimateAutoNoiseProfile, estimateManualNoiseProfile } from '../src/lib/audio/core/noiseProfiler.ts';
import { SpectralSubtractor } from '../src/lib/audio/core/spectralSubtractor.ts';
import { ShortTimeFourierTransform } from '../src/lib/audio/core/shortTimeFourierTransform.ts';
import { DownwardExpander } from '../src/lib/audio/core/downwardExpander.ts';
import { SamplePeakLimiter } from '../src/lib/audio/core/samplePeakLimiter.ts';
import { calculateRms, rmsToDbfs } from '../src/lib/audio/core/dspMath.ts';

function runTestSuite() {
  console.log('====================================================');
  console.log('🔬 AUDIO NOISE ENGINE — PHASE 2 VERIFICATION SUITE');
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

  // TEST 1: Auto Profiler Silence Rejection (Gate A)
  console.log('--- TEST 1: Auto Profiler Silence Rejection (Gate A) ---');
  const silentBuffer = new Float32Array(sampleRate * 2); // 2 seconds pure zeros
  const silentResult = estimateAutoNoiseProfile(silentBuffer, sampleRate);
  assert(silentResult.status === 'silent', `Gate A rejects pure digital silence (status === 'silent')`);
  assert(silentResult.profile === null, `Gate A returns null profile on digital silence`);

  // TEST 2: Auto Profiler Stationary Noise Identification (Gates A-E)
  console.log('\n--- TEST 2: Auto Profiler Stationary Noise Identification ---');
  const durationSec = 3.0;
  const numSamples = Math.round(sampleRate * durationSec);
  const noisyBuffer = new Float32Array(numSamples);

  // Generate stationary noise at ~ -36 dBFS (amplitude ~0.015)
  for (let i = 0; i < numSamples; i++) {
    noisyBuffer[i] = (Math.random() * 2 - 1) * 0.015;
  }
  const autoResult = estimateAutoNoiseProfile(noisyBuffer, sampleRate);
  assert(autoResult.status === 'valid', `Gates A-E accept stationary noise (status === 'valid')`);
  assert(autoResult.profile !== null, `Valid profile returned with ${autoResult.windowsAccepted} surviving windows`);
  console.log(`  📊 Estimated Noise Floor: ${autoResult.profile?.noiseFloorDbfs.toFixed(1)} dBFS`);
  assert(Math.abs(autoResult.profile.noiseFloorDbfs - (-38)) < 4.0, `Detected noise floor is within expected range (-38 ± 4 dBFS)`);

  // TEST 3: Auto Profiler Uncertain Fallback (Continuous Speech / Non-Stationary)
  console.log('\n--- TEST 3: Auto Profiler Uncertain Fallback ---');
  const highFluxBuffer = new Float32Array(numSamples);
  // Alternating bursts every 100ms
  for (let i = 0; i < numSamples; i++) {
    const burst = Math.floor(i / 4800) % 2 === 0 ? 0.8 : 0.001;
    highFluxBuffer[i] = (Math.random() * 2 - 1) * burst;
  }
  const fluxResult = estimateAutoNoiseProfile(highFluxBuffer, sampleRate);
  assert(fluxResult.status === 'uncertain', `Gate D/E flags continuous bursts as 'uncertain' (${fluxResult.status})`);
  assert(fluxResult.profile === null, `Uncertain profile correctly prompts manual selection fallback`);

  // TEST 4: Manual Waveform Region Profiler
  console.log('\n--- TEST 4: Manual Waveform Region Profiler ---');
  // Selected region too short (< 250ms)
  const shortResult = estimateManualNoiseProfile(noisyBuffer, sampleRate, 0.1, 0.2);
  assert(shortResult.error !== undefined, `Rejects selection < 250ms with validation error: "${shortResult.error}"`);

  // Valid 1.0s region selection
  const validManual = estimateManualNoiseProfile(noisyBuffer, sampleRate, 0.5, 1.5);
  assert(validManual.profile !== null, `Successfully extracts manual noise profile from 1.0s window`);
  assert(validManual.profile?.mode === 'manual', `Profile mode tagged as 'manual'`);

  // TEST 5: Spectral Subtraction & Noise Attenuation
  console.log('\n--- TEST 5: Spectral Subtraction Noise Reduction ---');
  // Generate signal: 1s speech tone (440Hz, amp 0.5) followed by 1s noise pause (amp 0.015)
  const testTrack = new Float32Array(sampleRate * 2);
  for (let i = 0; i < sampleRate; i++) {
    // 0 to 1s: Tone + Noise
    testTrack[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / sampleRate) + (Math.random() * 2 - 1) * 0.015;
  }
  for (let i = sampleRate; i < sampleRate * 2; i++) {
    // 1 to 2s: Noise only (Pause)
    testTrack[i] = (Math.random() * 2 - 1) * 0.015;
  }

  // Extract manual noise profile from pause region (1.1s to 1.9s)
  const pauseProfile = estimateManualNoiseProfile(testTrack, sampleRate, 1.1, 1.9).profile;
  const initialPauseRms = calculateRms(testTrack, sampleRate + 2048, sampleRate - 4096);
  const initialPauseDbfs = rmsToDbfs(initialPauseRms);

  const stft = new ShortTimeFourierTransform({ fftSize: 2048, hopSize: 512 });
  const subtractor = new SpectralSubtractor(pauseProfile, {
    alpha: 2.2,
    beta: 0.015,
    frequencySmoothing: true,
    gammaAttack: 0.8,
    gammaRelease: 0.9,
  });

  const cleanedTrack = stft.processChannel(testTrack, sampleRate, (real, imag) => {
    subtractor.processFrame(real, imag);
  });

  // Measure noise pause attenuation
  const cleanPauseRms = calculateRms(cleanedTrack, sampleRate + 2048, sampleRate - 4096);
  const cleanPauseDbfs = rmsToDbfs(cleanPauseRms);
  const noiseReductionDb = initialPauseDbfs - cleanPauseDbfs;

  console.log(`  📊 Initial Noise Pause RMS: ${initialPauseDbfs.toFixed(1)} dBFS`);
  console.log(`  📊 Cleaned Noise Pause RMS: ${cleanPauseDbfs.toFixed(1)} dBFS`);
  console.log(`  📊 Noise Attenuation:       ${noiseReductionDb.toFixed(1)} dB`);

  assert(noiseReductionDb > 10.0, `Spectral subtractor achieves > 10 dB noise attenuation in pause (${noiseReductionDb.toFixed(1)} dB)`);

  // Verify speech tone preservation in 0 to 1s
  const cleanToneRms = calculateRms(cleanedTrack, 4000, 40000);
  const initialToneRms = calculateRms(testTrack, 4000, 40000);
  const toneDiffDb = Math.abs(rmsToDbfs(cleanToneRms) - rmsToDbfs(initialToneRms));
  console.log(`  📊 Speech Tone Amplitude Delta: ${toneDiffDb.toFixed(2)} dB`);
  assert(toneDiffDb < 1.5, `Speech tone energy is preserved within 1.5 dB (${toneDiffDb.toFixed(2)} dB)`);

  // Verify zero NaNs or Infinities
  let hasNan = false;
  for (let i = 0; i < cleanedTrack.length; i++) {
    if (isNaN(cleanedTrack[i]) || !isFinite(cleanedTrack[i])) {
      hasNan = true;
      break;
    }
  }
  assert(!hasNan, `Cleaned signal has zero NaNs or Infinities`);

  // TEST 6: Soft-Knee Downward Expander
  console.log('\n--- TEST 6: Soft-Knee Downward Expander ---');
  const expander = new DownwardExpander({
    thresholdDbfs: -40,
    ratio: 2.0,
    kneeDb: 6,
    attackMs: 4,
    releaseMs: 140,
    maxAttenuationDb: -16,
  }, sampleRate);

  const expanded = expander.processBuffer(cleanedTrack);
  const expanderPauseRms = calculateRms(expanded, sampleRate + 2048, sampleRate - 4096);
  const expanderPauseDbfs = rmsToDbfs(expanderPauseRms);
  console.log(`  📊 Expander Output Pause Level: ${expanderPauseDbfs.toFixed(1)} dBFS`);
  assert(expanderPauseDbfs < cleanPauseDbfs, `Expander further attenuates inter-speech pause background noise`);

  // TEST 7: Lookahead Sample-Peak Safety Limiter
  console.log('\n--- TEST 7: Lookahead Sample-Peak Safety Limiter ---');
  const limiter = new SamplePeakLimiter({
    ceilingDbfs: -0.2, // ~0.9772
    lookaheadMs: 1.5,
    releaseMs: 50,
  }, sampleRate);

  // Generate hot signal with peaks at +6 dBFS (amplitude 2.0)
  const hotSignal = new Float32Array(sampleRate);
  for (let i = 0; i < sampleRate; i++) {
    hotSignal[i] = 2.0 * Math.sin(2 * Math.PI * 100 * i / sampleRate);
  }

  const limitedSignal = limiter.processBuffer(hotSignal);
  let maxPeak = 0;
  for (let i = 0; i < limitedSignal.length; i++) {
    const abs = Math.abs(limitedSignal[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  const maxPeakDbfs = rmsToDbfs(maxPeak);
  console.log(`  📊 Hot Signal Input Peak:  +6.02 dBFS (amplitude 2.0)`);
  console.log(`  📊 Limited Signal Peak:    ${maxPeakDbfs.toFixed(2)} dBFS (amplitude ${maxPeak.toFixed(4)})`);

  assert(maxPeak <= 0.9773, `Sample-peak limiter clamps discrete peaks strictly below -0.2 dBFS (${maxPeak.toFixed(4)} <= 0.9773)`);

  console.log('\n====================================================');
  console.log(`🏁 PHASE 2 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
