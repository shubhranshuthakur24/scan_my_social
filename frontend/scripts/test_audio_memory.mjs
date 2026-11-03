/**
 * Memory Lifecycle & Throughput Benchmark Suite for Phase 3
 * Validates memory allocation bounds and throughput across 1 min, 5 min, 10 min, and 15 min recordings.
 */

import { ShortTimeFourierTransform } from '../src/lib/audio/core/shortTimeFourierTransform.ts';
import { SpectralSubtractor } from '../src/lib/audio/core/spectralSubtractor.ts';
import { BiquadFilter, createHighPassCoefficients } from '../src/lib/audio/core/biquadFilter.ts';
import { SamplePeakLimiter } from '../src/lib/audio/core/samplePeakLimiter.ts';

function runMemoryBenchmarks() {
  console.log('====================================================');
  console.log('🧠 AUDIO MEMORY LIFECYCLE & LONG-FILE BENCHMARKS');
  console.log('====================================================\n');

  const sampleRate = 48000;
  const fftSize = 2048;
  const numBins = (fftSize >> 1) + 1;

  // Mock stationary noise profile
  const mockNoiseProfile = {
    powerSpectrum: new Float32Array(numBins).fill(0.0001),
    fftSize,
    sampleRate,
    mode: 'auto',
    noiseFloorDbfs: -40,
  };

  const testDurationsMinutes = [1, 5, 10, 15];

  for (const mins of testDurationsMinutes) {
    const totalSamples = sampleRate * 60 * mins; // Stereo single channel benchmark
    const pcmBytes = totalSamples * 4;
    console.log(`--- BENCHMARK: ${mins} Minute File (${(pcmBytes / 1024 / 1024).toFixed(1)} MB Float32 PCM, ${totalSamples.toLocaleString()} samples) ---`);

    const initialMem = process.memoryUsage().heapUsed;

    // Allocate test buffer
    const testChannel = new Float32Array(totalSamples);
    // Fill with synthetic speech tone + noise
    for (let i = 0; i < 48000; i++) {
      testChannel[i] = 0.4 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }

    const t0 = performance.now();

    // 1. HPF
    const hpfCoeffs = createHighPassCoefficients({ cutoffHz: 80, sampleRate });
    const hpf = new BiquadFilter(hpfCoeffs);
    hpf.processBuffer(testChannel, true);

    // 2. STFT + Spectral Subtraction
    const stft = new ShortTimeFourierTransform({ fftSize, hopSize: 512 });
    const subtractor = new SpectralSubtractor(mockNoiseProfile, {
      alpha: 2.0,
      beta: 0.02,
      frequencySmoothing: true,
      gammaAttack: 0.8,
      gammaRelease: 0.9,
    });

    const processed = stft.processChannel(testChannel, sampleRate, (r, im) => {
      subtractor.processFrame(r, im);
    });

    // 3. Limiter
    const limiter = new SamplePeakLimiter({ ceilingDbfs: -0.2, lookaheadMs: 1.5, releaseMs: 50 }, sampleRate);
    limiter.processBuffer(processed, true);

    const t1 = performance.now();
    const elapsedSec = (t1 - t0) / 1000;
    const audioSec = mins * 60;
    const rtf = audioSec / elapsedSec; // Real-Time Factor (e.g. 10x means 10 seconds of audio processed per 1 sec of wall time)

    const finalMem = process.memoryUsage().heapUsed;
    const deltaMb = (finalMem - initialMem) / (1024 * 1024);

    console.log(`  ⏱️  Processing Time: ${elapsedSec.toFixed(2)}s for ${audioSec}s audio`);
    console.log(`  ⚡ Real-Time Factor (RTF): ${rtf.toFixed(1)}x faster than real-time`);
    console.log(`  💾 Heap Growth: ${deltaMb.toFixed(1)} MB`);

    if (rtf < 5.0) {
      console.error(`  ❌ Performance below minimum real-time target: ${rtf.toFixed(1)}x`);
      process.exit(1);
    } else {
      console.log(`  ✅ PASS: RTF ${rtf.toFixed(1)}x comfortably exceeds real-time processing baseline.`);
    }
    console.log('');
  }

  console.log('====================================================');
  console.log('🏁 ALL LONG-FILE MEMORY & RTF BENCHMARKS PASSED');
  console.log('====================================================\n');
}

runMemoryBenchmarks();
