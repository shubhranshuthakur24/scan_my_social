/**
 * Standalone Automated Test Suite for Phase 1: Audio DSP Laboratory
 * Tests FFT, STFT Perfect Reconstruction, HPF, Hum Notch Cascade, and WAV Encoder.
 */

import { FastFourierTransform, getFFT } from '../src/lib/audio/core/fastFourierTransform.ts';
import { ShortTimeFourierTransform } from '../src/lib/audio/core/shortTimeFourierTransform.ts';
import { BiquadFilter, createHighPassCoefficients, HumNotchCascade } from '../src/lib/audio/core/biquadFilter.ts';
import { createHannWindow, calculateRms, rmsToDbfs, calculateVariance } from '../src/lib/audio/core/dspMath.ts';
import { encodeWav } from '../src/lib/audio/core/wavEncoder.ts';

function runTestSuite() {
  console.log('====================================================');
  console.log('🔬 AUDIO DSP LABORATORY — PHASE 1 VERIFICATION SUITE');
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

  // TEST 1: FFT Invertibility & Impulse Response
  console.log('--- TEST 1: FFT Invertibility & Pure Tone Analysis ---');
  const N = 2048;
  const fft = getFFT(N);
  const real = new Float32Array(N);
  const imag = new Float32Array(N);

  // Unit impulse at n = 0
  real[0] = 1.0;
  fft.forward(real, imag);
  // All frequency bins should have real = 1.0, imag = 0.0
  let impulseCorrect = true;
  for (let i = 0; i < N; i++) {
    if (Math.abs(real[i] - 1.0) > 1e-5 || Math.abs(imag[i]) > 1e-5) {
      impulseCorrect = false;
      break;
    }
  }
  assert(impulseCorrect, 'FFT of unit impulse has flat unity magnitude across all bins');

  // IFFT back to impulse
  fft.inverse(real, imag);
  let ifftCorrect = Math.abs(real[0] - 1.0) < 1e-5;
  for (let i = 1; i < N; i++) {
    if (Math.abs(real[i]) > 1e-5) ifftCorrect = false;
  }
  assert(ifftCorrect, 'IFFT accurately reconstructs unit impulse with error < 1e-5');

  // Pure tone at bin k = 32
  const kTarget = 32;
  for (let n = 0; n < N; n++) {
    real[n] = Math.cos((2 * Math.PI * kTarget * n) / N);
    imag[n] = 0;
  }
  fft.forward(real, imag);
  const power = new Float32Array(N / 2 + 1);
  fft.powerSpectrum(real, imag, power);
  let maxBin = 0;
  let maxP = 0;
  for (let k = 0; k <= N / 2; k++) {
    if (power[k] > maxP) {
      maxP = power[k];
      maxBin = k;
    }
  }
  assert(maxBin === kTarget, `FFT accurately isolates pure tone peak at bin ${kTarget}`);

  // Benchmark FFT speed
  const benchIterations = 5000;
  const t0 = performance.now();
  for (let i = 0; i < benchIterations; i++) {
    fft.forward(real, imag);
  }
  const t1 = performance.now();
  const totalMs = t1 - t0;
  const transformsPerSec = Math.round((benchIterations / totalMs) * 1000);
  console.log(`  ⚡ FFT Throughput: ${transformsPerSec.toLocaleString()} transforms/sec (${totalMs.toFixed(1)}ms for ${benchIterations} iterations)`);
  assert(transformsPerSec > 5000, `FFT throughput exceeds baseline performance target (${transformsPerSec} > 5000 transforms/sec)`);

  // TEST 2: STFT Forward -> Inverse Perfect Reconstruction
  console.log('\n--- TEST 2: STFT Perfect Reconstruction (75% Hann Overlap OLA) ---');
  const sampleRate = 48000;
  const durationSec = 2.0;
  const totalSamples = Math.round(sampleRate * durationSec);
  const inputAudio = new Float32Array(totalSamples);

  // Generate test signal: mix of speech-like harmonics and sweep
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    inputAudio[i] =
      0.35 * Math.sin(2 * Math.PI * 220 * t) +
      0.25 * Math.sin(2 * Math.PI * 440 * t) +
      0.15 * Math.sin(2 * Math.PI * 880 * t) +
      0.10 * Math.sin(2 * Math.PI * (300 + 400 * t) * t);
  }

  const stft = new ShortTimeFourierTransform({ fftSize: 2048, hopSize: 512 });
  // Pass-through processing (no modification)
  const reconstructed = stft.processChannel(inputAudio, sampleRate, () => {});

  // Compute error metrics (exclude 1 FFT window at start and end for boundary convergence)
  const margin = 2048;
  let maxAbsError = 0;
  let sumSqError = 0;
  let sumSqSignal = 0;

  for (let i = margin; i < totalSamples - margin; i++) {
    const err = Math.abs(reconstructed[i] - inputAudio[i]);
    if (err > maxAbsError) maxAbsError = err;
    sumSqError += err * err;
    sumSqSignal += inputAudio[i] * inputAudio[i];
  }

  const snrDb = 10 * Math.log10(sumSqSignal / Math.max(1e-12, sumSqError));
  console.log(`  📊 STFT Max Abs Error: ${maxAbsError.toExponential(3)}`);
  console.log(`  📊 STFT Reconstruction SNR: ${snrDb.toFixed(2)} dB`);
  assert(maxAbsError < 1e-4, `STFT maximum reconstruction error is below 1e-4 (${maxAbsError.toExponential(3)})`);
  assert(snrDb > 80, `STFT reconstruction SNR exceeds 80 dB (${snrDb.toFixed(1)} dB)`);

  // TEST 3: High-Pass Filter (HPF) Frequency Response
  console.log('\n--- TEST 3: High-Pass Filter (HPF) Attenuation ---');
  const hpfCoeffs = createHighPassCoefficients({ cutoffHz: 80, sampleRate: 48000 });
  const hpf = new BiquadFilter(hpfCoeffs);

  // Helper to measure gain at a specific frequency
  function measureFilterGain(freqHz) {
    const testFilter = new BiquadFilter(hpfCoeffs);
    const nSamples = 4800; // 100ms
    const sig = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i++) {
      sig[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
    }
    const out = testFilter.processBuffer(sig);
    // Measure RMS over the second half to avoid transient startup
    const inRms = calculateRms(sig, 2400, 2400);
    const outRms = calculateRms(out, 2400, 2400);
    return rmsToDbfs(outRms) - rmsToDbfs(inRms);
  }

  const gain20Hz = measureFilterGain(20);
  const gain80Hz = measureFilterGain(80);
  const gain1000Hz = measureFilterGain(1000);

  console.log(`  📊 HPF Gain at 20Hz (Stopband): ${gain20Hz.toFixed(2)} dB`);
  console.log(`  📊 HPF Gain at 80Hz (Cutoff):   ${gain80Hz.toFixed(2)} dB`);
  console.log(`  📊 HPF Gain at 1000Hz (Passband): ${gain1000Hz.toFixed(2)} dB`);

  assert(gain20Hz < -20, `HPF attenuates 20Hz rumble by > 20 dB (${gain20Hz.toFixed(1)} dB)`);
  assert(Math.abs(gain80Hz - (-3.01)) < 0.5, `HPF attenuation at 80Hz cutoff is ≈ -3.0 dB (${gain80Hz.toFixed(2)} dB)`);
  assert(Math.abs(gain1000Hz) < 0.2, `HPF leaves passband at 1000Hz unattenuated (< 0.2 dB) (${gain1000Hz.toFixed(2)} dB)`);

  // TEST 4: Hum Notch Cascade
  console.log('\n--- TEST 4: Hum Notch Cascade (50Hz / 60Hz) ---');
  const humCascade = new HumNotchCascade({
    fundamentalHz: 50,
    harmonicsCount: 4,
    sampleRate: 48000,
    q: 28,
  });

  function measureNotchGain(freqHz) {
    const testCascade = new HumNotchCascade({
      fundamentalHz: 50,
      harmonicsCount: 4,
      sampleRate: 48000,
      q: 28,
    });
    const nSamples = 48000; // 1.0s to ensure steady state
    const sig = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i++) {
      sig[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
    }
    const out = testCascade.processBuffer(sig);
    const inRms = calculateRms(sig, 24000, 24000);
    const outRms = calculateRms(out, 24000, 24000);
    return rmsToDbfs(outRms) - rmsToDbfs(inRms);
  }

  const notchGain50Hz = measureNotchGain(50);
  const notchGain100Hz = measureNotchGain(100);
  const notchGain200Hz = measureNotchGain(200);
  const notchPass1000Hz = measureNotchGain(1000);

  console.log(`  📊 Hum Notch at 50Hz (Fundamental): ${notchGain50Hz.toFixed(2)} dB`);
  console.log(`  📊 Hum Notch at 100Hz (Harmonic 2):  ${notchGain100Hz.toFixed(2)} dB`);
  console.log(`  📊 Hum Notch at 200Hz (Harmonic 4):  ${notchGain200Hz.toFixed(2)} dB`);
  console.log(`  📊 Hum Notch at 1000Hz (Passband):   ${notchPass1000Hz.toFixed(2)} dB`);

  assert(notchGain50Hz < -20, `Hum notch attenuates 50Hz mains hum by > 20 dB (${notchGain50Hz.toFixed(1)} dB)`);
  assert(notchGain100Hz < -20, `Hum notch attenuates 100Hz harmonic by > 20 dB (${notchGain100Hz.toFixed(1)} dB)`);
  assert(Math.abs(notchPass1000Hz) < 0.1, `Hum notch leaves 1000Hz signal unaffected (< 0.1 dB) (${notchPass1000Hz.toFixed(2)} dB)`);

  // TEST 5: Lossless WAV Encoder
  console.log('\n--- TEST 5: Lossless RIFF WAV Encoder ---');
  const stereoAudio = [
    new Float32Array([0.0, 0.5, -0.5, 1.0, -1.0]),
    new Float32Array([0.1, -0.1, 0.8, -0.8, 0.0]),
  ];
  const wavBlob16 = encodeWav(stereoAudio, 48000, { bitDepth: 16 });
  const wavBlob24 = encodeWav(stereoAudio, 48000, { bitDepth: 24 });

  // 16-bit stereo: 44 header bytes + 5 samples * 2 channels * 2 bytes = 44 + 20 = 64 bytes
  assert(wavBlob16.size === 64, `16-bit WAV blob size matches exact byte specification (${wavBlob16.size} === 64 bytes)`);
  assert(wavBlob16.type === 'audio/wav', 'WAV blob has correct audio/wav MIME type');

  // 24-bit stereo: 44 header bytes + 5 samples * 2 channels * 3 bytes = 44 + 30 = 74 bytes
  assert(wavBlob24.size === 74, `24-bit WAV blob size matches exact byte specification (${wavBlob24.size} === 74 bytes)`);

  console.log('\n====================================================');
  console.log(`🏁 PHASE 1 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
