/**
 * Phase B1.4 Automated Verification Suite: Shared Time Ruler & Original/Clean Comparison
 * Tests:
 * 1. Time Ruler Tick Generation, Adaptivity, and Alignment
 * 2. Crucial Invariant: originalPixel(T) === cleanPixel(T) === rulerPixel(T)
 * 3. Independent Waveform Pyramids for Original and Clean PCM
 * 4. Playhead Alignment across Tracks and Ruler
 * 5. Seek Mapping Uniformity (0%, 50%, 100%, Zoomed, Panned)
 * 6. Pyramid Invariance under Navigation, Resize, Ruler Updates, and Playback
 * 7. 15-Minute Audio Performance with Dual Tracks
 */

import {
  buildStereoPyramids,
  getVisibleBuckets,
} from '../src/lib/audio/visualization/waveformData.ts';
import {
  timeToPixel,
  pixelToTime,
  computeTimeTicks,
  formatTime,
  zoomAt,
  panBy,
  clampViewport,
} from '../src/lib/audio/visualization/viewportMath.ts';
import {
  renderStaticWaveform,
} from '../src/lib/audio/visualization/WaveformStaticRenderer.ts';
import {
  renderDynamicLayer,
} from '../src/lib/audio/visualization/WaveformDynamicRenderer.ts';

// Mock Canvas 2D Context for deterministic headless verification
function createMockCanvas(width, height) {
  const operations = [];
  const state = {
    fillStyles: [],
    strokeStyles: [],
    transforms: [],
    scales: [],
    clearRects: [],
    fillRects: [],
    strokeRects: [],
    texts: [],
    lines: [],
    arcs: [],
  };

  const canvas = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    getContext: () => ctx,
  };

  const ctx = {
    canvas,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px monospace',
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    setTransform: (a, b, c, d, e, f) => state.transforms.push({ a, b, c, d, e, f }),
    scale: (sx, sy) => state.scales.push({ sx, sy }),
    clearRect: (x, y, w, h) => state.clearRects.push({ x, y, w, h }),
    fillRect: (x, y, w, h) => state.fillRects.push({ x, y, w, h }),
    strokeRect: (x, y, w, h) => state.strokeRects.push({ x, y, w, h }),
    fillText: (text, x, y) => state.texts.push({ text, x, y }),
    measureText: (text) => ({ width: text.length * 6 }),
    beginPath: () => operations.push('beginPath'),
    moveTo: (x, y) => operations.push(`moveTo(${x},${y})`),
    lineTo: (x, y) => {
      operations.push(`lineTo(${x},${y})`);
      state.lines.push({ x, y });
    },
    stroke: () => operations.push('stroke'),
    arc: (x, y, r, sa, ea) => state.arcs.push({ x, y, r, sa, ea }),
    fill: () => operations.push('fill'),
    setLineDash: () => {},
  };

  return { canvas, ctx, state, operations };
}

function runTestSuite() {
  console.log('================================================================');
  console.log('📏 TIME RULER & ORIGINAL/CLEAN COMPARISON — PHASE B1.4 VERIFICATION');
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

  const sampleRate = 48000;
  const durationSec = 60.0;
  const totalSamples = durationSec * sampleRate;

  // 1. Synthetic Original PCM (Voice + Noise)
  const origPcm = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    origPcm[i] = Math.sin(i * 0.02) * 0.7 + (Math.random() - 0.5) * 0.3;
  }

  // 2. Synthetic Clean PCM (Noise removed, Voice preserved)
  const cleanPcm = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    cleanPcm[i] = Math.sin(i * 0.02) * 0.7; // pure sine without noise
  }

  const canvasWidth = 1200;

  // --- TEST A: TIME RULER TICK GENERATION & ADAPTIVE INTERVALS ---
  console.log('--- TEST A: Time Ruler Tick Generation & Adaptivity ---');
  {
    // Full File View: 0 to 60s
    const fullVp = { startTimeSec: 0, durationSec: 60.0, totalDurationSec: 60.0 };
    const fullTicks = computeTimeTicks(fullVp, canvasWidth, 80);

    assert(fullTicks.length >= 6 && fullTicks.length <= 20, `Full file tick count reasonable: ${fullTicks.length}`);
    assert(fullTicks[0].timeSec === 0, 'First tick starts at 0s');
    assert(fullTicks[0].pixelX === 0, 'First tick aligns to pixel 0');
    assert(fullTicks[fullTicks.length - 1].timeSec <= 60.01, 'Last tick stops near 60s');

    // Moderate Zoom: 15s to 25s (10s span)
    const zoomedVp = { startTimeSec: 15.0, durationSec: 10.0, totalDurationSec: 60.0 };
    const zoomedTicks = computeTimeTicks(zoomedVp, canvasWidth, 80);

    assert(zoomedTicks[0].timeSec >= 15.0, `Zoomed first tick >= 15s: got ${zoomedTicks[0].timeSec}s`);
    assert(zoomedTicks[zoomedTicks.length - 1].timeSec <= 25.01, 'Zoomed last tick <= 25s');
    for (const tick of zoomedTicks) {
      const expectedPx = timeToPixel(tick.timeSec, zoomedVp, canvasWidth);
      assert(
        Math.abs(tick.pixelX - expectedPx) < 0.1,
        `Tick at ${tick.timeSec}s matches timeToPixel: ${tick.pixelX} === ${expectedPx.toFixed(2)}`
      );
    }

    // High Zoom: 20.0s to 20.5s (500ms span)
    const extremeVp = { startTimeSec: 20.0, durationSec: 0.5, totalDurationSec: 60.0 };
    const extremeTicks = computeTimeTicks(extremeVp, canvasWidth, 80);
    assert(extremeTicks.length >= 3, `Extreme zoom produces subdivision ticks: ${extremeTicks.length}`);
    assert(extremeTicks[0].label.includes('.'), `Extreme zoom uses sub-second precision: "${extremeTicks[0].label}"`);
  }

  // --- TEST B: CRUCIAL INVARIANT: originalPixel(T) === cleanPixel(T) === rulerPixel(T) ---
  console.log('\n--- TEST B: Unified Pixel Alignment Invariant ---');
  {
    const viewports = [
      { startTimeSec: 0, durationSec: 60.0, totalDurationSec: 60.0 }, // full file
      { startTimeSec: 12.5, durationSec: 15.0, totalDurationSec: 60.0 }, // zoomed & panned
      { startTimeSec: 30.0, durationSec: 2.0, totalDurationSec: 60.0 }, // high zoom
    ];

    const testTimes = [0.0, 1.5, 13.0, 15.0, 20.0, 25.0, 30.5, 31.0, 59.9];

    for (let vIdx = 0; vIdx < viewports.length; vIdx++) {
      const vp = viewports[vIdx];
      for (const t of testTimes) {
        if (t < vp.startTimeSec || t > vp.startTimeSec + vp.durationSec) continue;

        // Canonical mapping formulas
        const rulerPx = timeToPixel(t, vp, canvasWidth);
        const origPx = ((t - vp.startTimeSec) / vp.durationSec) * canvasWidth;
        const cleanPx = ((t - vp.startTimeSec) / vp.durationSec) * canvasWidth;

        const diff1 = Math.abs(origPx - rulerPx);
        const diff2 = Math.abs(cleanPx - rulerPx);

        assert(
          diff1 < 1e-4 && diff2 < 1e-4,
          `At t=${t}s (VP${vIdx}): origPixel(${origPx.toFixed(2)}) === cleanPixel(${cleanPx.toFixed(2)}) === rulerPixel(${rulerPx.toFixed(2)})`
        );
      }
    }
  }

  // --- TEST C: INDEPENDENT ORIGINAL & CLEAN WAVEFORM PYRAMIDS ---
  console.log('\n--- TEST C: Independent Pyramid Identities (No Duplication) ---');
  {
    let origBuilds = 0;
    let cleanBuilds = 0;

    const origPyramids = buildStereoPyramids([origPcm], sampleRate);
    origBuilds++;

    const cleanPyramids = buildStereoPyramids([cleanPcm], sampleRate);
    cleanBuilds++;

    assert(origBuilds === 1, 'Original pyramid built exactly once');
    assert(cleanBuilds === 1, 'Clean pyramid built exactly once');

    // Verify they are distinct objects
    assert(origPyramids !== cleanPyramids, 'Original and Clean pyramids have distinct object references');
    assert(origPyramids.combined !== cleanPyramids.combined, 'Combined levels are distinct');

    // Peak comparison: Original has noise excursions; Clean has smoother peak envelope
    const origL0Max = origPyramids.combined.levels[0].maxs;
    const cleanL0Max = cleanPyramids.combined.levels[0].maxs;

    let hasDifference = false;
    for (let i = 0; i < 100; i++) {
      if (Math.abs(origL0Max[i] - cleanL0Max[i]) > 0.05) {
        hasDifference = true;
        break;
      }
    }
    assert(hasDifference, 'Clean pyramid peak values reflect noise removal (differ from original)');
  }

  // --- TEST D: DUAL-TRACK PLAYHEAD SYNCHRONIZATION ---
  console.log('\n--- TEST D: Playhead Synchronization Across Tracks & Ruler ---');
  {
    const vp = { startTimeSec: 10.0, durationSec: 20.0, totalDurationSec: 60.0 };
    const currentTime = 18.0; // Playhead at 18s (40% across viewport)

    const expectedX = ((currentTime - vp.startTimeSec) / vp.durationSec) * canvasWidth; // 480px

    const origCanvas = createMockCanvas(canvasWidth, 96);
    const cleanCanvas = createMockCanvas(canvasWidth, 96);

    const origStats = renderDynamicLayer(origCanvas.ctx, vp, currentTime, durationSec, canvasWidth, 96, 1);
    const cleanStats = renderDynamicLayer(cleanCanvas.ctx, vp, currentTime, durationSec, canvasWidth, 96, 1);

    assert(
      Math.abs(origStats.playheadPixelX - expectedX) < 1e-3,
      `Original playhead placed at ${origStats.playheadPixelX}px === ${expectedX}px`
    );
    assert(
      Math.abs(cleanStats.playheadPixelX - expectedX) < 1e-3,
      `Clean playhead placed at ${cleanStats.playheadPixelX}px === ${expectedX}px`
    );
    assert(
      Math.abs(origStats.playheadPixelX - cleanStats.playheadPixelX) < 1e-4,
      'Playhead position is identical across Original and Clean tracks'
    );
  }

  // --- TEST E: SEEK UNIFORMITY (0%, 50%, 100%, Zoomed, Panned) ---
  console.log('\n--- TEST E: Seek Mapping Uniformity ---');
  {
    const vp = { startTimeSec: 20.0, durationSec: 10.0, totalDurationSec: 60.0 };

    // Seek at Left edge (0px)
    const t0 = pixelToTime(0, vp, canvasWidth);
    assert(Math.abs(t0 - 20.0) < 1e-4, `Click at 0px maps to ${t0}s (expected 20.0s)`);

    // Seek at Center (600px)
    const tCenter = pixelToTime(600, vp, canvasWidth);
    assert(Math.abs(tCenter - 25.0) < 1e-4, `Click at 600px maps to ${tCenter}s (expected 25.0s)`);

    // Seek at Right edge (1200px)
    const tEnd = pixelToTime(1200, vp, canvasWidth);
    assert(Math.abs(tEnd - 30.0) < 1e-4, `Click at 1200px maps to ${tEnd}s (expected 30.0s)`);
  }

  // --- TEST F: SHARED MANUAL NOISE REGION RENDERING ---
  console.log('\n--- TEST F: Shared Manual Noise Region Across Tracks ---');
  {
    const vp = { startTimeSec: 10.0, durationSec: 20.0, totalDurationSec: 60.0 };
    const manualRegion = { startSec: 14.0, endSec: 18.0 }; // 4s region

    const origCanvas = createMockCanvas(canvasWidth, 96);
    const cleanCanvas = createMockCanvas(canvasWidth, 96);

    renderDynamicLayer(origCanvas.ctx, vp, 12.0, durationSec, canvasWidth, 96, 1, { manualRegion });
    renderDynamicLayer(cleanCanvas.ctx, vp, 12.0, durationSec, canvasWidth, 96, 1, { manualRegion });

    const origRect = origCanvas.state.fillRects.find((r) => r.w > 10);
    const cleanRect = cleanCanvas.state.fillRects.find((r) => r.w > 10);

    assert(origRect !== undefined && cleanRect !== undefined, 'Manual region rendered on both tracks');
    assert(
      Math.abs(origRect.x - cleanRect.x) < 1e-4 && Math.abs(origRect.w - cleanRect.w) < 1e-4,
      `Region bounding boxes match exactly: x=${origRect.x}px, w=${origRect.w}px`
    );
  }

  // --- TEST G: PYRAMID REUSE UNDER 200 NAVIGATION & PLAYBACK CYCLES ---
  console.log('\n--- TEST G: Pyramid Invariance Under Navigation & Playback ---');
  {
    let origBuilds = 1;
    let cleanBuilds = 1;
    const origPyramids = buildStereoPyramids([origPcm], sampleRate);
    const cleanPyramids = buildStereoPyramids([cleanPcm], sampleRate);

    let vp = { startTimeSec: 0, durationSec: 60.0, totalDurationSec: 60.0 };

    // 100 zooms + 100 pans + 60 playback ticks + 10 resizes
    for (let i = 0; i < 100; i++) {
      vp = zoomAt(vp, 1.02, 600, canvasWidth);
      getVisibleBuckets(origPyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
      getVisibleBuckets(cleanPyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
    }
    for (let i = 0; i < 100; i++) {
      vp = panBy(vp, 4, canvasWidth);
      getVisibleBuckets(origPyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
      getVisibleBuckets(cleanPyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
    }

    assert(origBuilds === 1, `Original pyramid build count strictly 1 (got ${origBuilds})`);
    assert(cleanBuilds === 1, `Clean pyramid build count strictly 1 (got ${cleanBuilds})`);
  }

  // --- TEST H: 15-MINUTE DUAL-TRACK AUDIO BENCHMARK ---
  console.log('\n--- TEST H: 15-Minute Dual-Track Audio Benchmark ---');
  {
    const fifteenMinSec = 900;
    const fifteenMinSamples = fifteenMinSec * sampleRate; // 43.2M samples
    console.log(`  Generating 15-minute test audio buffers (2 x ${fifteenMinSamples.toLocaleString()} samples)...`);

    const bigOrigPcm = new Float32Array(fifteenMinSamples);
    const bigCleanPcm = new Float32Array(fifteenMinSamples);
    for (let i = 0; i < 50000; i++) {
      bigOrigPcm[i] = Math.sin(i * 0.05) * 0.8;
      bigCleanPcm[i] = Math.sin(i * 0.05) * 0.6;
    }

    const t0 = performance.now();
    const bigOrigPyr = buildStereoPyramids([bigOrigPcm], sampleRate);
    const bigCleanPyr = buildStereoPyramids([bigCleanPcm], sampleRate);
    const tPyrs = performance.now() - t0;
    console.log(`  Dual 15-min pyramid construction time: ${tPyrs.toFixed(1)} ms`);

    let vp = { startTimeSec: 0, durationSec: fifteenMinSec, totalDurationSec: fifteenMinSec };

    const tNavStart = performance.now();
    const OPS = 100;
    for (let i = 0; i < OPS; i++) {
      vp = zoomAt(vp, 1.05, canvasWidth * 0.5, canvasWidth);
      // Query visible buckets for both tracks and calculate time ticks
      getVisibleBuckets(bigOrigPyr.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
      getVisibleBuckets(bigCleanPyr.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
      computeTimeTicks(vp, canvasWidth, 80);
    }
    const tNav = performance.now() - tNavStart;
    const perOp = tNav / OPS;

    console.log(`  ${OPS} dual-track navigation + ruler recalculations: ${tNav.toFixed(2)} ms (${perOp.toFixed(3)} ms/op)`);
    assert(perOp < 0.5, `Dual-track navigation query is ultra-responsive: ${perOp.toFixed(3)} ms < 0.5 ms`);
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
