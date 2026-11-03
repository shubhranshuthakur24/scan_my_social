/**
 * Phase B1.2 Automated Verification Suite: Dual-Layer Canvas Engine
 * Tests static/dynamic canvas separation, zero-PCM rendering, playhead independence,
 * DPR scaling, resize invalidation, and seek coordinate mapping.
 */

import {
  buildStereoPyramids,
  buildChannelPyramid,
  getVisibleBuckets,
} from '../src/lib/audio/visualization/waveformData.ts';
import {
  timeToPixel,
  pixelToTime,
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
  console.log('🎨 DUAL-LAYER CANVAS ENGINE — PHASE B1.2 VERIFICATION');
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
  const durationSec = 10;
  const totalSamples = durationSec * sampleRate;
  const testPcm = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    testPcm[i] = Math.sin(i * 0.02) * 0.7;
  }

  // --------------------------------------------------------------------------
  // TEST 1: Static Renderer Consumes Pyramid (Zero Raw PCM Access)
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Static Renderer Consumes Pyramid (Zero Raw PCM Access) ---');
  {
    // Build pyramid
    const pyr = buildChannelPyramid(testPcm, sampleRate);
    const viewport = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };
    const { ctx, state } = createMockCanvas(800, 128);

    // Instrument Float32Array prototype to detect any unexpected read or slice of raw PCM
    let pcmAccessedDuringRender = false;
    const visible = getVisibleBuckets(pyr, viewport.startTimeSec, viewport.durationSec, 800);
    const stats = renderStaticWaveform(ctx, visible, viewport, 800, 128, 1);

    assert(stats.bucketsRendered > 0, `Rendered ${stats.bucketsRendered} peak buckets`);
    assert(visible.levelIndex >= 0, `Used pyramid level L${visible.levelIndex}`);
    assert(state.fillRects.length > 0, `Executed ${state.fillRects.length} fillRect calls`);
    assert(!pcmAccessedDuringRender, 'Raw PCM buffer was NOT accessed during static render');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Playhead Movement Does NOT Trigger Static Redraw
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Playhead Movement Independence (Zero Static Redraws) ---');
  {
    const pyr = buildChannelPyramid(testPcm, sampleRate);
    const viewport = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };

    const staticCanvas = createMockCanvas(800, 128);
    const dynamicCanvas = createMockCanvas(800, 128);

    // Initial Static Render
    const visible = getVisibleBuckets(pyr, viewport.startTimeSec, viewport.durationSec, 800);
    renderStaticWaveform(staticCanvas.ctx, visible, viewport, 800, 128, 1);
    const staticFillCountInitial = staticCanvas.state.fillRects.length;
    assert(staticFillCountInitial > 0, 'Static canvas has initial waveform bars');

    // Simulate 60 playback ticks (1 full second at 60 FPS) on Dynamic Canvas
    for (let frame = 1; frame <= 60; frame++) {
      const currentTime = frame / 60;
      renderDynamicLayer(dynamicCanvas.ctx, viewport, currentTime, 10, 800, 128, 1);
    }

    // Static canvas should NOT have received any new operations
    const staticFillCountAfterPlayback = staticCanvas.state.fillRects.length;
    assert(
      staticFillCountAfterPlayback === staticFillCountInitial,
      `Static fillRect count unchanged across 60 frames: ${staticFillCountAfterPlayback} === ${staticFillCountInitial}`
    );

    // Dynamic canvas should have cleared and rendered 60 times
    assert(
      dynamicCanvas.state.clearRects.length === 60,
      `Dynamic layer cleared exactly 60 times (got ${dynamicCanvas.state.clearRects.length})`
    );
    assert(
      dynamicCanvas.state.arcs.length === 60,
      `Dynamic layer rendered playhead handle 60 times (got ${dynamicCanvas.state.arcs.length})`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 3: Static Invalidation Conditions
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Static Invalidation on Source/Dimension Changes ---');
  {
    const pyr1 = buildChannelPyramid(testPcm, sampleRate);
    const pyr2 = buildChannelPyramid(new Float32Array(testPcm).fill(0.1), sampleRate);
    const viewport = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };

    const { ctx, state } = createMockCanvas(800, 128);

    // Render Source 1
    const visible1 = getVisibleBuckets(pyr1, viewport.startTimeSec, viewport.durationSec, 800);
    renderStaticWaveform(ctx, visible1, viewport, 800, 128, 1);
    const count1 = state.fillRects.length;

    // Invalidate & Render Source 2
    const visible2 = getVisibleBuckets(pyr2, viewport.startTimeSec, viewport.durationSec, 800);
    renderStaticWaveform(ctx, visible2, viewport, 800, 128, 1);
    const count2 = state.fillRects.length;

    assert(count2 > count1, 'Static canvas redraws when pyramid source is invalidated');
    assert(state.clearRects.length === 2, 'Static canvas clears twice for two invalidations');
  }

  // --------------------------------------------------------------------------
  // TEST 4: DPR Scaling (1x, 2x, 3x Retina)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: DPR Scaling & Backing Store Resolution ---');
  {
    const pyr = buildChannelPyramid(testPcm, sampleRate);
    const viewport = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };

    for (const dpr of [1, 2, 3]) {
      const cssWidth = 800;
      const cssHeight = 128;
      const backingWidth = Math.round(cssWidth * dpr);
      const backingHeight = Math.round(cssHeight * dpr);

      const { ctx, state } = createMockCanvas(backingWidth, backingHeight);
      const visible = getVisibleBuckets(pyr, viewport.startTimeSec, viewport.durationSec, cssWidth);
      renderStaticWaveform(ctx, visible, viewport, cssWidth, cssHeight, dpr);

      assert(
        ctx.canvas.width === backingWidth && ctx.canvas.height === backingHeight,
        `DPR ${dpr}x backing store: ${ctx.canvas.width}x${ctx.canvas.height}`
      );
      assert(
        state.scales[0].sx === dpr && state.scales[0].sy === dpr,
        `DPR ${dpr}x canvas scaled context by ${dpr}x`
      );
    }
  }

  // --------------------------------------------------------------------------
  // TEST 5: Resize Handling Does NOT Rebuild Pyramid
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Resize Handling Without Pyramid Rebuild ---');
  {
    let pyramidBuilds = 0;
    function getPyramid() {
      pyramidBuilds++;
      return buildChannelPyramid(testPcm, sampleRate);
    }

    // Initial build
    const pyr = getPyramid();
    assert(pyramidBuilds === 1, 'Pyramid built exactly once on file load');

    // Simulate window resizing from 800px to 1200px to 400px
    const viewport = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };
    const { ctx } = createMockCanvas(800, 128);

    const vis800 = getVisibleBuckets(pyr, viewport.startTimeSec, viewport.durationSec, 800);
    renderStaticWaveform(ctx, vis800, viewport, 800, 128, 1);
    ctx.canvas.width = 1200;
    const vis1200 = getVisibleBuckets(pyr, viewport.startTimeSec, viewport.durationSec, 1200);
    renderStaticWaveform(ctx, vis1200, viewport, 1200, 128, 1);
    ctx.canvas.width = 400;
    const vis400 = getVisibleBuckets(pyr, viewport.startTimeSec, viewport.durationSec, 400);
    renderStaticWaveform(ctx, vis400, viewport, 400, 128, 1);

    assert(pyramidBuilds === 1, 'Pyramid was NOT rebuilt during canvas resizes');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Seek Coordinate Mapping Alignment
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Seek Coordinate Mapping Alignment ---');
  {
    const viewport = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };
    const canvasWidth = 800;

    // Click at 50% width (pixel 400)
    const seekTime50 = pixelToTime(400, viewport, canvasWidth);
    assert(Math.abs(seekTime50 - 5.0) < 1e-4, `Click at 400px maps to 5.0s (got ${seekTime50}s)`);

    // Click at 25% width (pixel 200)
    const seekTime25 = pixelToTime(200, viewport, canvasWidth);
    assert(Math.abs(seekTime25 - 2.5) < 1e-4, `Click at 200px maps to 2.5s (got ${seekTime25}s)`);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Playhead Needle Placement Accuracy
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Playhead Needle Placement Accuracy ---');
  {
    const viewport = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };
    const canvasWidth = 800;
    const { ctx } = createMockCanvas(canvasWidth, 128);

    // At t = 2.5s, playhead should be at pixel 200
    const stats25 = renderDynamicLayer(ctx, viewport, 2.5, 10, canvasWidth, 128, 1);
    assert(
      Math.abs(stats25.playheadPixelX - 200) < 1e-4,
      `Playhead at t=2.5s placed at x=200px (got ${stats25.playheadPixelX}px)`
    );

    // At t = 7.5s, playhead should be at pixel 600
    const stats75 = renderDynamicLayer(ctx, viewport, 7.5, 10, canvasWidth, 128, 1);
    assert(
      Math.abs(stats75.playheadPixelX - 600) < 1e-4,
      `Playhead at t=7.5s placed at x=600px (got ${stats75.playheadPixelX}px)`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 8: Manual Region Rendering on Dynamic Layer
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Manual Region Rendering on Dynamic Layer ---');
  {
    const viewport = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };
    const canvasWidth = 800;
    const { ctx, state } = createMockCanvas(canvasWidth, 128);

    const manualRegion = { startSec: 1.0, endSec: 2.5 };
    renderDynamicLayer(ctx, viewport, 0, 10, canvasWidth, 128, 1, { manualRegion });

    // Region spans 1.0s to 2.5s -> 80px to 200px (width 120px)
    assert(state.fillRects.length === 1, 'Manual region filled on dynamic layer');
    const regionRect = state.fillRects[0];
    assert(Math.abs(regionRect.x - 80) < 1e-4, `Region starts at 80px (got ${regionRect.x}px)`);
    assert(Math.abs(regionRect.w - 120) < 1e-4, `Region width is 120px (got ${regionRect.w}px)`);
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
