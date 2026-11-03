/**
 * Standalone Automated Test Suite & Benchmark for Phase A1: Audio Quality Analyzer
 * Tests all 13 required edge cases, multi-channel mathematics, and performance scaling up to 15 minutes.
 */

import {
  analyzeAudioQuality,
  compareAudioQuality,
  linearToDbFS,
  dbFSToLinear,
} from '../src/lib/audio/core/audioQualityAnalyzer.ts';

function runTestSuite() {
  console.log('================================================================');
  console.log('🔬 AUDIO QUALITY ANALYZER — PHASE A1 VERIFICATION SUITE');
  console.log('================================================================\n');

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

  // Helper to generate pure sine wave
  function generateSine(freqHz, sampleRate, durationSec, amplitude = 1.0) {
    const totalSamples = Math.round(durationSec * sampleRate);
    const buffer = new Float32Array(totalSamples);
    const omega = (2 * Math.PI * freqHz) / sampleRate;
    for (let i = 0; i < totalSamples; i++) {
      buffer[i] = amplitude * Math.sin(omega * i);
    }
    return buffer;
  }

  // Helper for Gaussian noise with Box-Muller transform
  function generateNoise(sampleRate, durationSec, targetRmsLinear) {
    const totalSamples = Math.round(durationSec * sampleRate);
    const buffer = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i += 2) {
      const u1 = Math.max(1e-10, Math.random());
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
      buffer[i] = z0 * targetRmsLinear;
      if (i + 1 < totalSamples) {
        buffer[i + 1] = z1 * targetRmsLinear;
      }
    }
    return buffer;
  }

  // --------------------------------------------------------------------------
  // TEST 1: Digital Silence (All Zeros)
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Digital Silence (All Zeros) ---');
  {
    const sr = 48000;
    const silence = new Float32Array(sr); // 1 sec
    const res = analyzeAudioQuality([silence], sr);

    assert(res.peak === 0.0, 'Peak is exactly 0.0');
    assert(res.peakDbFS === -120.0, 'Peak dBFS is pegged at -120.0 dBFS floor');
    assert(res.rms === 0.0, 'RMS is exactly 0.0');
    assert(res.rmsDbFS === -120.0, 'RMS dBFS is pegged at -120.0 dBFS floor');
    assert(res.isClipped === false, 'Clipping is false');
    assert(res.clippedCount === 0, 'Clipped count is 0');
    assert(res.silencePercentage === 100.0, 'Silence percentage is 100.0%');
    assert(res.noiseFloorStatus === 'silent', 'Noise floor status is silent');
    assert(res.noiseFloorDbFS === null, 'Noise floor dBFS is null');
    assert(res.dynamicRangeDb === null, 'Dynamic range is null');
    assert(!Number.isNaN(res.peakDbFS) && Number.isFinite(res.peakDbFS), 'No NaN or Infinity produced');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Full-Scale Sine Wave (0 dBFS peak, -3.01 dBFS RMS)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Full-Scale Sine Wave (0 dBFS Peak) ---');
  {
    const sr = 48000;
    const sine = generateSine(1000, sr, 1.0, 1.0); // 1 kHz, 1.0 peak
    const res = analyzeAudioQuality([sine], sr);

    assert(Math.abs(res.peak - 1.0) < 1e-4, 'Peak amplitude is 1.0');
    assert(Math.abs(res.peakDbFS - 0.0) <= 0.05, 'Peak dBFS is 0.0 dBFS');
    assert(Math.abs(res.rms - (1 / Math.SQRT2)) < 1e-3, 'RMS is 1/sqrt(2) ≈ 0.7071');
    assert(Math.abs(res.rmsDbFS - (-3.01)) <= 0.05, 'RMS dBFS is -3.01 dBFS');
    assert(res.isClipped === true, 'Sine reaches >= 0.999 so isClipped is true');
    assert(res.silencePercentage === 0.0, 'Silence percentage is 0.0%');
    assert(res.noiseFloorStatus === 'insufficient_quiet_material', 'Continuous loud sine has no background pauses');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Half-Scale Sine Wave (-6.02 dBFS peak, -9.03 dBFS RMS)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Half-Scale Sine Wave (-6.02 dBFS Peak) ---');
  {
    const sr = 48000;
    const sine = generateSine(1000, sr, 1.0, 0.5); // 0.5 peak
    const res = analyzeAudioQuality([sine], sr);

    assert(Math.abs(res.peak - 0.5) < 1e-4, 'Peak amplitude is 0.5');
    assert(Math.abs(res.peakDbFS - (-6.02)) <= 0.05, 'Peak dBFS is -6.02 dBFS');
    assert(Math.abs(res.rms - (0.5 / Math.SQRT2)) < 1e-3, 'RMS is 0.5/sqrt(2) ≈ 0.3535');
    assert(Math.abs(res.rmsDbFS - (-9.03)) <= 0.05, 'RMS dBFS is -9.03 dBFS');
    assert(res.isClipped === false, 'Half scale sine is not clipped');
    assert(res.clippedCount === 0, 'Clipped count is 0');
    assert(Math.abs(res.crestFactorDb - 3.01) <= 0.05, 'Crest factor of pure sine is 3.01 dB');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Deliberately Clipped Audio
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Deliberately Clipped Audio ---');
  {
    const sr = 48000;
    const unclipped = generateSine(440, sr, 0.5, 1.5);
    const clipped = new Float32Array(unclipped.length);
    for (let i = 0; i < unclipped.length; i++) {
      clipped[i] = Math.max(-1.0, Math.min(1.0, unclipped[i]));
    }
    const res = analyzeAudioQuality([clipped], sr);

    assert(res.isClipped === true, 'isClipped is true');
    assert(res.clippedCount > 100, `Clipped sample count is ${res.clippedCount} > 100`);
    assert(res.clippedPercentage > 5.0, `Clipped percentage is ${res.clippedPercentage}% > 5%`);
    assert(res.maxConsecutiveClipped > 5, `Max consecutive clipped is ${res.maxConsecutiveClipped} > 5`);
    assert(res.peakDbFS === 0.0, 'Peak dBFS is 0.0 dBFS');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Stereo Imbalance
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Stereo Imbalance ---');
  {
    const sr = 48000;
    const chL = generateSine(1000, sr, 1.0, 1.0); // 0 dBFS peak
    const chR = generateSine(1000, sr, 1.0, 0.1); // -20 dBFS peak
    const res = analyzeAudioQuality([chL, chR], sr);

    assert(res.numberOfChannels === 2, 'Number of channels is 2');
    assert(res.channels.length === 2, 'Has 2 channel detail objects');
    assert(Math.abs(res.channels[0].peakDbFS - 0.0) <= 0.05, 'Left channel peak is 0.0 dBFS');
    assert(Math.abs(res.channels[1].peakDbFS - (-20.0)) <= 0.05, 'Right channel peak is -20.0 dBFS');
    assert(Math.abs(res.peakDbFS - 0.0) <= 0.05, 'Overall peak is max(0, -20) = 0.0 dBFS');
    // Power average RMS: sqrt((0.7071^2 + 0.07071^2) / 2) ≈ 0.5024 => -5.98 dBFS
    const expectedRmsDb = 20 * Math.log10(Math.sqrt((Math.pow(1 / Math.SQRT2, 2) + Math.pow(0.1 / Math.SQRT2, 2)) / 2));
    assert(Math.abs(res.rmsDbFS - expectedRmsDb) <= 0.1, `Overall RMS dBFS is ${res.rmsDbFS} ≈ ${expectedRmsDb.toFixed(2)} dBFS`);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Sample-Rate Differences (8k, 16k, 44.1k, 48k, 96k)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Sample-Rate Differences (8k to 96k) ---');
  {
    const sampleRates = [8000, 16000, 22050, 44100, 48000, 96000];
    let allPassed = true;

    for (const sr of sampleRates) {
      const sine = generateSine(400, sr, 1.0, 0.5);
      const res = analyzeAudioQuality([sine], sr);

      const durOk = Math.abs(res.durationSec - 1.0) < 0.01;
      const peakOk = Math.abs(res.peakDbFS - (-6.02)) <= 0.1;
      const rmsOk = Math.abs(res.rmsDbFS - (-9.03)) <= 0.1;

      if (!durOk || !peakOk || !rmsOk) {
        allPassed = false;
        console.error(`Sample rate ${sr} failed: dur=${res.durationSec}, peak=${res.peakDbFS}, rms=${res.rmsDbFS}`);
      }
    }
    assert(allPassed, 'Metrics are invariant across 8 kHz, 16 kHz, 22.05 kHz, 44.1 kHz, 48 kHz, and 96 kHz');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Constant DC Offset (x[i] = 0.2)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Constant DC Offset ---');
  {
    const sr = 48000;
    const dc = new Float32Array(sr).fill(0.2);
    const res = analyzeAudioQuality([dc], sr);

    assert(Math.abs(res.peak - 0.2) < 1e-4, 'Peak is 0.2');
    assert(Math.abs(res.peakDbFS - (-13.98)) <= 0.05, 'Peak dBFS is -13.98 dBFS');
    assert(Math.abs(res.rms - 0.2) < 1e-4, 'RMS is 0.2');
    assert(Math.abs(res.crestFactorDb - 0.0) < 0.05, 'Crest factor of flat DC is 0.0 dB');
    assert(res.noiseFloorStatus !== 'valid', 'Constant DC offset is not reported as valid ambient room noise');
    assert(!Number.isNaN(res.peakDbFS) && !Number.isNaN(res.rmsDbFS), 'No NaN on DC offset');
  }

  // --------------------------------------------------------------------------
  // TEST 8: Very Quiet Audio with Floor Verification (-85 dBFS noise)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Very Quiet Audio (-85 dBFS Noise) ---');
  {
    const sr = 48000;
    const quietRmsLinear = Math.pow(10, -85 / 20); // ~5.6e-5
    const quietNoise = generateNoise(sr, 1.0, quietRmsLinear);
    const res = analyzeAudioQuality([quietNoise], sr);

    assert(Math.abs(res.rmsDbFS - (-85.0)) <= 3.0, `Reported RMS dBFS is ${res.rmsDbFS} dBFS ≈ -85 dBFS`);
    assert(res.silencePercentage === 100.0, 'Silence percentage (< -60 dBFS) is 100.0%');
    assert(res.isClipped === false, 'Not clipped');
    assert(res.peakDbFS < -65.0, `Peak is very low: ${res.peakDbFS} dBFS`);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Speech Simulation with Active Pauses (Intermittent speech + room tone)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Speech Simulation with Background Pauses ---');
  {
    const sr = 48000;
    const totalSec = 4.0;
    const totalSamples = sr * totalSec;
    const speechSignal = new Float32Array(totalSamples);

    const roomToneLinear = Math.pow(10, -65 / 20); // -65 dBFS room noise (below -60 dBFS silence threshold)
    const roomNoise = generateNoise(sr, totalSec, roomToneLinear);

    // Add speech bursts in 0.5s-1.5s and 2.5s-3.5s (2 seconds speech, 2 seconds pause)
    for (let i = 0; i < totalSamples; i++) {
      speechSignal[i] = roomNoise[i];
      const t = i / sr;
      if ((t >= 0.5 && t <= 1.5) || (t >= 2.5 && t <= 3.5)) {
        speechSignal[i] += 0.4 * Math.sin((2 * Math.PI * 300 * i) / sr); // speech tone
      }
    }

    const res = analyzeAudioQuality([speechSignal], sr);

    assert(res.noiseFloorStatus === 'valid', 'Noise floor status is valid');
    assert(res.noiseFloorDbFS !== null, 'Noise floor dBFS is calculated');
    assert(Math.abs(res.noiseFloorDbFS - (-65.0)) <= 3.5, `Estimated noise floor is ${res.noiseFloorDbFS} dBFS ≈ -65 dBFS`);
    assert(res.dynamicRangeDb !== null && res.dynamicRangeDb > 50.0, `Dynamic range is ${res.dynamicRangeDb} dB > 50 dB`);
    assert(res.silencePercentage >= 40.0 && res.silencePercentage <= 60.0, `Silence percentage is ${res.silencePercentage}% ≈ 50%`);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Original vs. Clean Comparison
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Original vs. Clean Comparison ---');
  {
    const sr = 48000;
    const duration = 2.0;
    const N = sr * duration;

    // Original: Speech + -24 dBFS strong background noise
    const origSignal = new Float32Array(N);
    const origNoise = generateNoise(sr, duration, Math.pow(10, -24 / 20));
    for (let i = 0; i < N; i++) {
      origSignal[i] = origNoise[i];
      const t = i / sr;
      if (t >= 0.5 && t <= 1.5) {
        origSignal[i] += 0.5 * Math.sin((2 * Math.PI * 400 * i) / sr);
      }
    }

    // Cleaned: Same speech + -58 dBFS attenuated noise + peak limiter at -0.2 dBFS
    const cleanSignal = new Float32Array(N);
    const cleanNoise = generateNoise(sr, duration, Math.pow(10, -58 / 20));
    for (let i = 0; i < N; i++) {
      cleanSignal[i] = cleanNoise[i];
      const t = i / sr;
      if (t >= 0.5 && t <= 1.5) {
        cleanSignal[i] += 0.5 * Math.sin((2 * Math.PI * 400 * i) / sr);
      }
    }

    const origMetrics = analyzeAudioQuality([origSignal], sr);
    const cleanMetrics = analyzeAudioQuality([cleanSignal], sr);
    const comparison = compareAudioQuality(origMetrics, cleanMetrics);

    assert(comparison.delta.noiseFloorDeltaDb !== null, 'Noise floor delta is calculated');
    assert(comparison.delta.noiseFloorDeltaDb < -15.0, `Noise floor delta is ${comparison.delta.noiseFloorDeltaDb} dB (significant noise reduction)`);
    assert(comparison.delta.dynamicRangeDeltaDb !== null && comparison.delta.dynamicRangeDeltaDb > 8.0, `Dynamic range expanded by ${comparison.delta.dynamicRangeDeltaDb} dB`);
    assert(comparison.delta.rmsDbFSDelta < 0, `RMS decreased due to removed noise energy: ${comparison.delta.rmsDbFSDelta} dB`);
  }

  // --------------------------------------------------------------------------
  // TEST 11: Single Impulse (1.0 at n=0, rest 0)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11: Single Full-Scale Impulse ---');
  {
    const sr = 48000;
    const impulse = new Float32Array(sr);
    impulse[0] = 1.0;
    const res = analyzeAudioQuality([impulse], sr);

    assert(res.peak === 1.0, 'Peak is exactly 1.0');
    assert(res.peakDbFS === 0.0, 'Peak dBFS is 0.0 dBFS');
    assert(res.isClipped === true, 'Impulse at 1.0 triggers clipping');
    assert(res.clippedCount === 1, 'Clipped count is exactly 1');
    assert(res.maxConsecutiveClipped === 1, 'Max consecutive clipped is 1');
    assert(res.silencePercentage >= 95.0, `Silence percentage is ${res.silencePercentage}% (19 of 20 50ms windows are 100% silent)`);
    assert(!Number.isNaN(res.rmsDbFS), 'RMS dBFS is a valid number');
  }

  // --------------------------------------------------------------------------
  // TEST 12: All +1.0
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 12: All +1.0 ---');
  {
    const sr = 48000;
    const allPlusOne = new Float32Array(sr).fill(1.0);
    const res = analyzeAudioQuality([allPlusOne], sr);

    assert(res.peak === 1.0, 'Peak is 1.0');
    assert(res.peakDbFS === 0.0, 'Peak dBFS is 0.0');
    assert(res.rms === 1.0, 'RMS is 1.0');
    assert(res.rmsDbFS === 0.0, 'RMS dBFS is 0.0');
    assert(res.isClipped === true, 'isClipped is true');
    assert(res.clippedCount === sr, 'Every sample is clipped');
    assert(res.clippedPercentage === 100.0, 'Clipped percentage is 100%');
    assert(res.maxConsecutiveClipped === sr, 'Max consecutive clipped equals total samples');
    assert(res.silencePercentage === 0.0, 'Silence percentage is 0%');
  }

  // --------------------------------------------------------------------------
  // TEST 13: All -1.0
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 13: All -1.0 ---');
  {
    const sr = 48000;
    const allMinusOne = new Float32Array(sr).fill(-1.0);
    const res = analyzeAudioQuality([allMinusOne], sr);

    assert(res.peak === 1.0, 'Peak abs value is 1.0');
    assert(res.peakDbFS === 0.0, 'Peak dBFS is 0.0');
    assert(res.rms === 1.0, 'RMS is 1.0');
    assert(res.rmsDbFS === 0.0, 'RMS dBFS is 0.0');
    assert(res.isClipped === true, 'isClipped is true');
    assert(res.clippedCount === sr, 'Every sample is clipped');
    assert(res.clippedPercentage === 100.0, 'Clipped percentage is 100%');
    assert(res.maxConsecutiveClipped === sr, 'Max consecutive clipped equals total samples');
  }

  console.log(`\n================================================================`);
  console.log(`RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// PERFORMANCE BENCHMARK
// ----------------------------------------------------------------------------
function runBenchmark() {
  console.log('================================================================');
  console.log('⚡ AUDIO QUALITY ANALYZER — PERFORMANCE BENCHMARK SUITE');
  console.log('================================================================\n');

  const sr = 48000;
  const durations = [
    { name: '1 Minute (Stereo)', sec: 60 },
    { name: '5 Minutes (Stereo)', sec: 300 },
    { name: '10 Minutes (Stereo)', sec: 600 },
    { name: '15 Minutes (Stereo)', sec: 900 },
  ];

  for (const { name, sec } of durations) {
    const totalSamples = sec * sr;
    const chL = new Float32Array(totalSamples);
    const chR = new Float32Array(totalSamples);

    // Fill with simulated audio (sine + low noise)
    const omega = (2 * Math.PI * 440) / sr;
    for (let i = 0; i < totalSamples; i += 100) {
      const v = 0.3 * Math.sin(omega * i);
      chL[i] = v;
      chR[i] = v;
    }

    const t0 = performance.now();
    const res = analyzeAudioQuality([chL, chR], sr);
    const elapsedMs = performance.now() - t0;
    const rtf = (sec * 1000) / elapsedMs;

    console.log(`⏱️  ${name.padEnd(22)}: ${elapsedMs.toFixed(2)} ms (${rtf.toFixed(0)}x Real-Time) [Samples: ${(totalSamples * 2).toLocaleString()}]`);
  }
  console.log('\n================================================================\n');
}

runTestSuite();
runBenchmark();
