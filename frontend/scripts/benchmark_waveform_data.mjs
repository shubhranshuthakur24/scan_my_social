/**
 * Phase B1.1 Performance & Memory Benchmark: Waveform Decimation Pyramid
 * Measures pyramid generation speed (derived directly from PCM),
 * viewport query throughput, and memory footprint up to 15 minutes of stereo audio.
 */

import { performance } from 'node:perf_hooks';
import {
  buildStereoPyramids,
  getVisibleBuckets,
} from '../src/lib/audio/visualization/waveformData.ts';

function runBenchmark() {
  console.log('================================================================');
  console.log('⚡ WAVEFORM DATA & PYRAMID — PERFORMANCE & MEMORY BENCHMARK');
  console.log('================================================================\n');

  const sampleRate = 48000;
  const durations = [
    { label: '1 Minute (Stereo)', sec: 60 },
    { label: '5 Minutes (Stereo)', sec: 300 },
    { label: '10 Minutes (Stereo)', sec: 600 },
    { label: '15 Minutes (Stereo)', sec: 900 },
  ];

  for (const { label, sec } of durations) {
    const totalSamplesPerChannel = sec * sampleRate;
    const totalStereoSamples = totalSamplesPerChannel * 2;
    const rawBytes = totalStereoSamples * 4; // Float32 stereo bytes

    // Synthesize realistic stereo buffers
    const chL = new Float32Array(totalSamplesPerChannel);
    const chR = new Float32Array(totalSamplesPerChannel);
    for (let i = 0; i < totalSamplesPerChannel; i += 100) {
      chL[i] = Math.sin(i * 0.01) * 0.7;
      chR[i] = Math.cos(i * 0.01) * 0.7;
    }

    // Benchmark Stereo Pyramids Construction (deriving directly from PCM for Left, Right, and Combined)
    const t0 = performance.now();
    const stereo = buildStereoPyramids([chL, chR], sampleRate);
    const buildMs = performance.now() - t0;

    // Calculate Pyramid Memory Footprint (Left + Right + Combined Peak View)
    let combinedBytes = 0;
    for (const lvl of stereo.combined.levels) {
      combinedBytes += lvl.mins.byteLength + lvl.maxs.byteLength + lvl.rms.byteLength;
    }
    const totalAllPyramidsBytes = combinedBytes * 3; // left, right, combined

    // Benchmark Viewport Slicing (10,000 rapid zoom/pan queries)
    const tQueryStart = performance.now();
    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      const startT = (i * 0.05) % Math.max(1, sec - 5);
      getVisibleBuckets(stereo.combined, startT, 5.0, 1200);
    }
    const queryTotalMs = performance.now() - tQueryStart;
    const queryUsPerFrame = (queryTotalMs / iterations) * 1000;

    // Decimal MB (10^6 bytes) vs Binary MiB (1024^2 bytes)
    const rawMB = (rawBytes / 1e6).toFixed(1);
    const rawMiB = (rawBytes / (1024 * 1024)).toFixed(1);

    const combMB = (combinedBytes / 1e6).toFixed(2);
    const combMiB = (combinedBytes / (1024 * 1024)).toFixed(2);

    const allMB = (totalAllPyramidsBytes / 1e6).toFixed(2);
    const allMiB = (totalAllPyramidsBytes / (1024 * 1024)).toFixed(2);

    const memoryPct = ((combinedBytes / rawBytes) * 100).toFixed(2);

    console.log(`⏱️  ${label}:`);
    console.log(`    Total Samples          : ${totalStereoSamples.toLocaleString()} stereo samples`);
    console.log(`    Raw PCM Footprint      : ${rawMB} MB (${rawMiB} MiB)`);
    console.log(`    Combined View Footprint: ${combMB} MB (${combMiB} MiB, ${memoryPct}% of raw PCM)`);
    console.log(`    Total Cache (L+R+Comb) : ${allMB} MB (${allMiB} MiB)`);
    console.log(`    Direct PCM Build Time  : ${buildMs.toFixed(2)} ms`);
    console.log(`    Viewport Query Latency : ${queryUsPerFrame.toFixed(2)} µs per frame (${Math.round(1000000 / queryUsPerFrame).toLocaleString()} queries/sec)`);
    console.log('----------------------------------------------------------------');
  }

  console.log('\n================================================================');
  console.log('BENCHMARK COMPLETE');
  console.log('================================================================\n');
}

runBenchmark();
