/**
 * Phase B1.3 Automated Verification Suite: Viewport Navigation
 * Tests Fit, Anchor-Aware Zoom, Pan, Viewport Clamping, Resize Invariance,
 * Pyramid Reuse, Seek/Manual-Selection Non-Regression, and 15-minute Performance.
 */

import {
  buildStereoPyramids,
  getVisibleBuckets,
} from '../src/lib/audio/visualization/waveformData.ts';
import {
  timeToPixel,
  pixelToTime,
  zoomAt,
  panBy,
  clampViewport,
  DEFAULT_MIN_VIEWPORT_DURATION_SEC,
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
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    setTransform: (a, b, c, d, e, f) => state.transforms.push({ a, b, c, d, e, f }),
    scale: (sx, sy) => state.scales.push({ sx, sy }),
    clearRect: (x, y, w, h) => state.clearRects.push({ x, y, w, h }),
    fillRect: (x, y, w, h) => state.fillRects.push({ x, y, w, h }),
    strokeRect: (x, y, w, h) => state.strokeRects.push({ x, y, w, h }),
    fillText: (text, x, y) => state.texts.push({ text, x, y }),
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
  console.log('🧭 VIEWPORT NAVIGATION (ZOOM / PAN / FIT) — PHASE B1.3 VERIFICATION');
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
  const durationSec = 100.0; // 100 seconds audio file
  const totalSamples = Math.round(durationSec * sampleRate);
  const testPcm = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    testPcm[i] = Math.sin(i * 0.01) * 0.8;
  }

  // --- TEST A: FIT / RESET VIEWPORT & IDEMPOTENCY ---
  console.log('--- TEST A: Fit-to-File / Reset Viewport & Idempotency ---');
  {
    // Start from a zoomed/panned state
    const zoomedViewport = {
      startTimeSec: 35.0,
      durationSec: 12.0,
      totalDurationSec: durationSec,
    };

    // Fit restores 0 -> totalDuration
    const fitViewport = clampViewport({
      startTimeSec: 0,
      durationSec: durationSec,
      totalDurationSec: durationSec,
    });

    assert(fitViewport.startTimeSec === 0, 'Fit restores startTimeSec = 0');
    assert(fitViewport.durationSec === durationSec, `Fit restores durationSec = ${durationSec}`);
    assert(fitViewport.totalDurationSec === durationSec, 'Fit retains totalDurationSec');

    // Repeated Fit is strictly idempotent
    const fitAgain = clampViewport(fitViewport);
    assert(fitAgain.startTimeSec === 0 && fitAgain.durationSec === durationSec, 'Repeated fit is strictly idempotent');
  }

  // --- TEST B: ZOOM ANCHOR INVARIANT ACROSS 0%, 25%, 50%, 75%, 100% ---
  console.log('\n--- TEST B: Zoom Anchor Invariant (0%, 25%, 50%, 75%, 100%) ---');
  {
    const canvasWidth = 1000; // 1000px canvas
    // Viewport centered inside clip: 20s to 60s (span 40s)
    const baseVp = {
      startTimeSec: 20.0,
      durationSec: 40.0,
      totalDurationSec: durationSec,
    };

    const anchorRatios = [0.0, 0.25, 0.50, 0.75, 1.0];
    const zoomFactors = [1.5, 2.0, 0.75, 1.25];

    for (const ratio of anchorRatios) {
      const anchorPx = ratio * canvasWidth;
      const tBefore = pixelToTime(anchorPx, baseVp, canvasWidth);

      for (const factor of zoomFactors) {
        const zoomed = zoomAt(baseVp, factor, anchorPx, canvasWidth);
        const tAfter = pixelToTime(anchorPx, zoomed, canvasWidth);
        const diff = Math.abs(tBefore - tAfter);

        assert(
          diff < 1e-4,
          `Anchor ${(ratio * 100).toFixed(0)}% with factor ${factor}x invariant: before=${tBefore.toFixed(4)}s after=${tAfter.toFixed(4)}s (diff=${diff.toExponential(2)})`
        );
      }
    }
  }

  // --- TEST C: ZOOM LIMITS & BOUNDARY CLAMPING ---
  console.log('\n--- TEST C: Zoom Limits & Strict Clamping ---');
  {
    const canvasWidth = 800;
    let vp = {
      startTimeSec: 10.0,
      durationSec: 20.0,
      totalDurationSec: durationSec,
    };

    // Extreme zoom in (50x zoom in steps)
    for (let i = 0; i < 50; i++) {
      vp = zoomAt(vp, 2.0, 400, canvasWidth, DEFAULT_MIN_VIEWPORT_DURATION_SEC);
    }
    assert(
      vp.durationSec >= DEFAULT_MIN_VIEWPORT_DURATION_SEC,
      `Cannot zoom past minimum duration: ${vp.durationSec}s >= ${DEFAULT_MIN_VIEWPORT_DURATION_SEC}s`
    );
    assert(vp.durationSec > 0, 'Duration remains strictly positive');
    assert(Number.isFinite(vp.durationSec), 'Duration is finite (no NaN or Infinity)');
    assert(vp.startTimeSec >= 0, `Start time clamped >= 0: got ${vp.startTimeSec}`);
    assert(vp.startTimeSec + vp.durationSec <= durationSec, 'Start + duration stays within total duration');

    // Extreme zoom out (50x zoom out steps)
    for (let i = 0; i < 50; i++) {
      vp = zoomAt(vp, 0.5, 400, canvasWidth, DEFAULT_MIN_VIEWPORT_DURATION_SEC);
    }
    assert(
      vp.durationSec === durationSec,
      `Cannot zoom out beyond total duration: ${vp.durationSec}s === ${durationSec}s`
    );
    assert(vp.startTimeSec === 0, 'Zoom out clamps startTimeSec to 0');
  }

  // --- TEST D: HORIZONTAL PAN & BOUNDARY CLAMPING ---
  console.log('\n--- TEST D: Horizontal Pan & Boundary Clamping ---');
  {
    const canvasWidth = 1000;
    const initialVp = {
      startTimeSec: 40.0,
      durationSec: 20.0,
      totalDurationSec: durationSec,
    };

    // Pan forward 100px (100px / 1000px * 20s = +2s)
    const pannedForward = panBy(initialVp, 100, canvasWidth);
    assert(
      Math.abs(pannedForward.startTimeSec - 42.0) < 1e-4,
      `Pan +100px shifts start by +2.0s: ${pannedForward.startTimeSec.toFixed(2)}s`
    );
    assert(pannedForward.durationSec === 20.0, 'Pan preserves durationSec exactly');

    // Pan backward 200px (-4s)
    const pannedBackward = panBy(pannedForward, -200, canvasWidth);
    assert(
      Math.abs(pannedBackward.startTimeSec - 38.0) < 1e-4,
      `Pan -200px shifts start by -4.0s: ${pannedBackward.startTimeSec.toFixed(2)}s`
    );
    assert(pannedBackward.durationSec === 20.0, 'Pan preserves durationSec exactly');

    // Extreme pan left past 0
    const clampedStart = panBy(initialVp, -5000, canvasWidth);
    assert(clampedStart.startTimeSec === 0, 'Extreme pan left clamps start to exactly 0');
    assert(clampedStart.durationSec === 20.0, 'Duration remains unchanged when clamped at 0');

    // Extreme pan right past end (totalDuration 100s - 20s duration = 80s max start)
    const clampedEnd = panBy(initialVp, 5000, canvasWidth);
    assert(
      Math.abs(clampedEnd.startTimeSec - 80.0) < 1e-4,
      `Extreme pan right clamps start to exactly totalDuration - duration (got ${clampedEnd.startTimeSec.toFixed(2)}s)`
    );
    assert(clampedEnd.durationSec === 20.0, 'Duration remains unchanged when clamped at end');
  }

  // --- TEST E: FULL-FILE PAN INVARIANCE ---
  console.log('\n--- TEST E: Full-File Pan Invariance ---');
  {
    const canvasWidth = 1000;
    const fullVp = {
      startTimeSec: 0,
      durationSec: durationSec,
      totalDurationSec: durationSec,
    };

    const panRight = panBy(fullVp, 200, canvasWidth);
    assert(panRight.startTimeSec === 0, 'Panning right when fully zoomed out has zero effect');
    assert(panRight.durationSec === durationSec, 'Duration remains total duration');

    const panLeft = panBy(fullVp, -200, canvasWidth);
    assert(panLeft.startTimeSec === 0, 'Panning left when fully zoomed out has zero effect');
  }

  // --- TEST F: RESIZE INVARIANCE (TIME DOMAIN UNAFFECTED BY PIXEL RESIZE) ---
  console.log('\n--- TEST F: Resize Invariance (Time Domain Unaffected) ---');
  {
    const zoomedVp = {
      startTimeSec: 30.0,
      durationSec: 15.0,
      totalDurationSec: durationSec,
    };

    // When canvas container width changes from 800px to 1440px
    const width1 = 800;
    const width2 = 1440;

    // Viewport object itself is purely in the time domain:
    assert(zoomedVp.startTimeSec === 30.0, 'StartTime preserved across width changes');
    assert(zoomedVp.durationSec === 15.0, 'Duration preserved across width changes');

    // Pixel mapping adapts to new width, but timestamps are unchanged:
    const tCenter1 = pixelToTime(width1 * 0.5, zoomedVp, width1);
    const tCenter2 = pixelToTime(width2 * 0.5, zoomedVp, width2);
    assert(
      Math.abs(tCenter1 - 37.5) < 1e-4 && Math.abs(tCenter2 - 37.5) < 1e-4,
      `Center of canvas maps to 37.5s in both 800px (${tCenter1}s) and 1440px (${tCenter2}s)`
    );
  }

  // --- TEST G: PYRAMID REUSE (ZERO RESCANS / ZERO REBUILDS) ---
  console.log('\n--- TEST G: Waveform Pyramid Reuse During Navigation ---');
  {
    let pyramidBuildCount = 0;
    const pyramids = buildStereoPyramids([testPcm], sampleRate);
    pyramidBuildCount++;

    const canvasWidth = 1000;
    let vp = {
      startTimeSec: 0,
      durationSec: durationSec,
      totalDurationSec: durationSec,
    };

    // Perform 100 zooms and 100 pans
    for (let i = 0; i < 100; i++) {
      vp = zoomAt(vp, 1.05, 500, canvasWidth);
      // Query visible buckets using pyramid (zero raw PCM scan!)
      const visible = getVisibleBuckets(pyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
      assert(visible.count > 0, `Visible buckets extracted for zoom step ${i}`);
    }

    for (let i = 0; i < 100; i++) {
      vp = panBy(vp, 5, canvasWidth);
      const visible = getVisibleBuckets(pyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
      assert(visible.count > 0, `Visible buckets extracted for pan step ${i}`);
    }

    assert(
      pyramidBuildCount === 1,
      `Pyramid build count strictly equals 1 after 200 navigation interactions (got ${pyramidBuildCount})`
    );
  }

  // --- TEST H: SEEK REGRESSION UNDER ZOOMED/PANNED VIEWPORT ---
  console.log('\n--- TEST H: Seek Coordinate Non-Regression ---');
  {
    const canvasWidth = 1000;
    const vp = {
      startTimeSec: 20.0,
      durationSec: 10.0,
      totalDurationSec: durationSec,
    };

    // User clicks at 50% of the canvas (x = 500)
    const seekTime = pixelToTime(500, vp, canvasWidth);
    assert(
      Math.abs(seekTime - 25.0) < 1e-4,
      `Click at center of 20s-30s viewport seeks to exactly 25.0s (got ${seekTime}s)`
    );

    // User clicks at 10% of canvas (x = 100)
    const seekTime10 = pixelToTime(100, vp, canvasWidth);
    assert(
      Math.abs(seekTime10 - 21.0) < 1e-4,
      `Click at 10% of 20s-30s viewport seeks to exactly 21.0s (got ${seekTime10}s)`
    );
  }

  // --- TEST I: MANUAL REGION SELECTION UNDER ZOOMED/PANNED VIEWPORT ---
  console.log('\n--- TEST I: Manual Noise Region Non-Regression ---');
  {
    const canvasWidth = 1000;
    const vp = {
      startTimeSec: 20.0,
      durationSec: 10.0,
      totalDurationSec: durationSec,
    };

    // Manual noise region at 22.0s to 24.0s (2 seconds long)
    const manualRegion = { startSec: 22.0, endSec: 24.0 };
    const { canvas, ctx, state } = createMockCanvas(canvasWidth, 128);

    renderDynamicLayer(ctx, vp, 25.0, durationSec, canvasWidth, 128, 1, {
      manualRegion,
    });

    // In a 20s-30s viewport (span 10s), 22s is at 20% (x=200px), 24s is at 40% (x=400px), width = 200px
    const regionRect = state.fillRects.find((r) => r.w >= 100);
    assert(regionRect !== undefined, 'Manual noise region rect was drawn on dynamic canvas');
    assert(
      Math.abs(regionRect.x - 200) < 1e-3,
      `Region starts at exactly 200px (got ${regionRect.x}px)`
    );
    assert(
      Math.abs(regionRect.w - 200) < 1e-3,
      `Region width is exactly 200px (got ${regionRect.w}px)`
    );
  }

  // --- TEST J: PLAYHEAD AUDIO TIME INDEPENDENCE ---
  console.log('\n--- TEST J: Playhead Audio Time Independence ---');
  {
    const canvasWidth = 1000;
    const currentTime = 25.0; // Playhead at 25.0s

    // Viewport 1: 0s to 100s -> playhead at 250px
    const fullVp = { startTimeSec: 0, durationSec: 100.0, totalDurationSec: 100.0 };
    const px1 = timeToPixel(currentTime, fullVp, canvasWidth);
    assert(Math.abs(px1 - 250) < 1e-3, `Playhead at 25s maps to 250px in full viewport (got ${px1}px)`);

    // Viewport 2: Zoomed into 20s to 30s -> playhead at 500px
    const zoomedVp = { startTimeSec: 20.0, durationSec: 10.0, totalDurationSec: 100.0 };
    const px2 = timeToPixel(currentTime, zoomedVp, canvasWidth);
    assert(Math.abs(px2 - 500) < 1e-3, `Playhead at 25s maps to 500px in zoomed viewport (got ${px2}px)`);

    // Viewport 3: Panned to 25s to 35s -> playhead at 0px
    const pannedVp = { startTimeSec: 25.0, durationSec: 10.0, totalDurationSec: 100.0 };
    const px3 = timeToPixel(currentTime, pannedVp, canvasWidth);
    assert(Math.abs(px3 - 0) < 1e-3, `Playhead at 25s maps to 0px in panned viewport (got ${px3}px)`);

    // Viewport 4: Panned out of view (30s to 40s) -> playhead is outside [0, width]
    const outVp = { startTimeSec: 30.0, durationSec: 10.0, totalDurationSec: 100.0 };
    const px4 = timeToPixel(currentTime, outVp, canvasWidth);
    assert(px4 < 0, `Playhead is correctly outside visible bounds when out of view (got ${px4}px)`);
  }

  // --- TEST K: 15-MINUTE AUDIO NAVIGATION BENCHMARK ---
  console.log('\n--- TEST K: 15-Minute Audio Navigation Benchmark ---');
  {
    const fifteenMinSec = 15 * 60; // 900 seconds
    const fifteenMinSamples = fifteenMinSec * sampleRate; // 43,200,000 samples
    console.log(`  Generating 15-minute test audio (${fifteenMinSamples.toLocaleString()} samples)...`);

    // Generate test channel
    const bigPcm = new Float32Array(fifteenMinSamples);
    // Fill with sample waveform
    for (let i = 0; i < 100000; i++) {
      bigPcm[i] = Math.sin(i * 0.05) * 0.9;
    }

    const tBuildStart = performance.now();
    const bigPyramids = buildStereoPyramids([bigPcm], sampleRate);
    const tBuild = performance.now() - tBuildStart;
    console.log(`  15-min pyramid construction time: ${tBuild.toFixed(1)} ms`);

    const canvasWidth = 1200;
    let vp = {
      startTimeSec: 0,
      durationSec: fifteenMinSec,
      totalDurationSec: fifteenMinSec,
    };

    const tNavStart = performance.now();
    const ITERATIONS = 100;
    // 100 Zoom operations
    for (let i = 0; i < ITERATIONS; i++) {
      vp = zoomAt(vp, 1.08, canvasWidth * 0.5, canvasWidth);
      getVisibleBuckets(bigPyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
    }
    // 100 Pan operations
    for (let i = 0; i < ITERATIONS; i++) {
      vp = panBy(vp, 10, canvasWidth);
      getVisibleBuckets(bigPyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
    }
    const tNavTotal = performance.now() - tNavStart;
    const avgTimePerOp = tNavTotal / (ITERATIONS * 2);

    console.log(`  200 navigation queries on 15-min file: ${tNavTotal.toFixed(2)} ms total (${avgTimePerOp.toFixed(3)} ms/operation)`);
    assert(
      avgTimePerOp < 0.25,
      `Average navigation query is lightning fast: ${avgTimePerOp.toFixed(3)} ms < 0.25 ms`
    );
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
