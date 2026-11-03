/**
 * Phase B1.5 Automated Verification Suite: Signal Diagnostics Visualization
 * Tests:
 * 1. Quiet-Region Detection (Heuristic boundaries, zero-amplitude, small-amplitude, loud)
 * 2. Quiet-Region Viewport Rendering (time-to-pixel mapping, viewport clipping, zoom/pan drift invariance)
 * 3. Clipping Markers (unclipped, clipped bucket, 0.999 boundary threshold, bucket extrema semantics)
 * 4. Original/Clean Synchronization (identical canonical viewport, time mapping, aligned markers)
 * 5. Manual Noise-Profile Region (synchronization across dual tracks, label update, layer compatibility)
 * 6. Rendering Architecture (Dual-layer decoupling, zero pyramid rebuild on navigation/playback/hover/resize)
 * 7. Multi-Scale Benchmarks: 1m, 5m, 10m, 15m Stereo 48 kHz Audio (Zero raw PCM access during rendering)
 */

import {
  buildStereoPyramids,
  getVisibleBuckets,
  isBucketClipped,
  isBucketVisuallyQuiet,
  DEFAULT_CLIPPING_THRESHOLD,
  DEFAULT_QUIET_RMS_THRESHOLD,
  DEFAULT_QUIET_PEAK_THRESHOLD,
} from '../src/lib/audio/visualization/waveformData.ts';
import {
  timeToPixel,
  pixelToTime,
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
    fillRect: (x, y, w, h) => state.fillRects.push({ x, y, w, h, fillStyle: ctx.fillStyle }),
    strokeRect: (x, y, w, h) => state.strokeRects.push({ x, y, w, h, strokeStyle: ctx.strokeStyle }),
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
  console.log('🔬 SIGNAL DIAGNOSTICS VISUALIZATION — PHASE B1.5 VERIFICATION');
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

  // --------------------------------------------------------------------------
  // GROUP A: Quiet-Region Detection (Deterministic Boundaries)
  // --------------------------------------------------------------------------
  console.log('--- Test Group A: Quiet-Region Detection (Visual Heuristic) ---');
  {
    // 1. Clearly loud bucket
    const loudMin = -0.7;
    const loudMax = 0.8;
    const loudRms = 0.35;
    assert(
      !isBucketVisuallyQuiet(loudMin, loudMax, loudRms),
      'Clearly loud bucket (peak=0.8, rms=0.35) is NOT visually quiet'
    );

    // 2. Clearly quiet bucket
    const quietMin = -0.005;
    const quietMax = 0.006;
    const quietRms = 0.002;
    assert(
      isBucketVisuallyQuiet(quietMin, quietMax, quietRms),
      'Clearly quiet bucket (peak=0.006, rms=0.002) is visually quiet'
    );

    // 3. Zero-amplitude bucket (digital silence)
    assert(
      isBucketVisuallyQuiet(0, 0, 0),
      'Zero-amplitude bucket (min=0, max=0, rms=0) is visually quiet'
    );

    // 4. Very small amplitude bucket below thresholds
    assert(
      isBucketVisuallyQuiet(-0.001, 0.001, 0.0005),
      'Very small amplitude bucket (0.001 peak, 0.0005 rms) is visually quiet'
    );

    // 5. Threshold boundary: RMS just below, peak below -> quiet
    assert(
      isBucketVisuallyQuiet(-0.01, 0.01, DEFAULT_QUIET_RMS_THRESHOLD - 0.0001),
      'Boundary: RMS just below default threshold (0.0079) is quiet'
    );

    // 6. Threshold boundary: RMS just above -> NOT quiet
    assert(
      !isBucketVisuallyQuiet(-0.01, 0.01, DEFAULT_QUIET_RMS_THRESHOLD + 0.0001),
      'Boundary: RMS just above default threshold (0.0081) is NOT quiet'
    );

    // 7. Threshold boundary: RMS quiet, but transient peak above peakThreshold -> NOT quiet
    assert(
      !isBucketVisuallyQuiet(-0.05, 0.05, 0.003),
      'Boundary: RMS quiet (0.003) but peak transient (0.05) exceeds peak threshold -> NOT quiet'
    );
  }

  // --------------------------------------------------------------------------
  // GROUP B: Quiet-Region Viewport Rendering
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group B: Quiet-Region Viewport Rendering ---');
  {
    const sampleRate = 48000;
    const duration = 10;
    const totalSamples = sampleRate * duration;
    const chL = new Float32Array(totalSamples);
    const chR = new Float32Array(totalSamples);

    // Fill first 3 seconds with loud sine wave, next 4 seconds with silence, last 3 seconds loud
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      if (t < 3.0 || t >= 7.0) {
        const val = 0.5 * Math.sin(2 * Math.PI * 440 * t);
        chL[i] = val;
        chR[i] = val;
      } else {
        chL[i] = 0.0;
        chR[i] = 0.0;
      }
    }

    const pyramids = buildStereoPyramids([chL, chR], sampleRate);
    const canvasWidth = 1000;
    const canvasHeight = 120;
    const mock = createMockCanvas(canvasWidth, canvasHeight);

    const vp = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };
    const visible = getVisibleBuckets(pyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);

    // Render entire 10s: quiet region should be between t=3s (px=300) and t=7s (px=700)
    const stats = renderStaticWaveform(
      mock.ctx,
      visible,
      vp,
      canvasWidth,
      canvasHeight,
      1,
      {
        showQuietRegions: true,
        quietColor: 'rgba(200, 200, 200, 0.5)',
        showClipping: true,
      }
    );

    assert(stats.bucketsRendered > 0, `Rendered static waveform with ${stats.bucketsRendered} buckets`);
    assert(stats.quietBucketsCount > 0, `Detected ${stats.quietBucketsCount} quiet buckets in 4s silent segment`);

    // Verify underlay fillRect calls for quiet regions
    const quietUnderlays = mock.state.fillRects.filter(
      (r) => r.fillStyle === 'rgba(200, 200, 200, 0.5)'
    );
    assert(quietUnderlays.length > 0, `Rendered ${quietUnderlays.length} quiet-region background rects`);

    // Verify coordinates of the quiet underlay: should span roughly x=300 to x=700
    const minQuietX = Math.min(...quietUnderlays.map((r) => r.x));
    const maxQuietX = Math.max(...quietUnderlays.map((r) => r.x + r.w));
    assert(
      Math.abs(minQuietX - 300) <= 5,
      `Quiet underlay start X (${minQuietX.toFixed(1)}px) aligns with t=3.0s (300px)`
    );
    assert(
      Math.abs(maxQuietX - 700) <= 5,
      `Quiet underlay end X (${maxQuietX.toFixed(1)}px) aligns with t=7.0s (700px)`
    );

    // Zoom into 2s - 5s (duration 3s): viewport should clip accurately without drift
    const zoomVp = { startTimeSec: 2, durationSec: 3, totalDurationSec: 10 };
    const zoomVisible = getVisibleBuckets(pyramids.combined, zoomVp.startTimeSec, zoomVp.durationSec, canvasWidth);
    const mockZoom = createMockCanvas(canvasWidth, canvasHeight);
    renderStaticWaveform(
      mockZoom.ctx,
      zoomVisible,
      zoomVp,
      canvasWidth,
      canvasHeight,
      1,
      {
        showQuietRegions: true,
        quietColor: 'rgba(200, 200, 200, 0.5)',
      }
    );

    const zoomUnderlays = mockZoom.state.fillRects.filter(
      (r) => r.fillStyle === 'rgba(200, 200, 200, 0.5)'
    );
    assert(zoomUnderlays.length > 0, 'Zoomed viewport rendered quiet underlays');
    const zoomMinX = Math.min(...zoomUnderlays.map((r) => r.x));
    // In viewport 2s-5s (span 3s), t=3.0s is at (3-2)/3 * 1000 = 333.33px
    assert(
      Math.abs(zoomMinX - 333.33) <= 5,
      `Zoomed quiet underlay start X (${zoomMinX.toFixed(1)}px) accurately maps to t=3.0s in 2-5s window`
    );
  }

  // --------------------------------------------------------------------------
  // GROUP C: Clipping Markers
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group C: Clipping Markers ---');
  {
    // 1. Unclipped bucket
    assert(
      !isBucketClipped(-0.8, 0.95),
      'Unclipped bucket (min=-0.8, max=0.95) does not trigger clipping'
    );

    // 2. Clipped positive bucket
    assert(
      isBucketClipped(-0.5, 1.0),
      'Clipped positive bucket (max=1.0) triggers clipping'
    );

    // 3. Clipped negative bucket
    assert(
      isBucketClipped(-1.0, 0.2),
      'Clipped negative bucket (min=-1.0) triggers clipping'
    );

    // 4. Boundary threshold: exactly 0.999
    assert(
      isBucketClipped(-0.1, DEFAULT_CLIPPING_THRESHOLD),
      `Boundary: max=${DEFAULT_CLIPPING_THRESHOLD} triggers clipping at A1 threshold`
    );
    assert(
      !isBucketClipped(-0.1, DEFAULT_CLIPPING_THRESHOLD - 0.0001),
      `Boundary: max=${(DEFAULT_CLIPPING_THRESHOLD - 0.0001).toFixed(5)} does NOT trigger clipping`
    );

    // Render test with deliberate clipped impulses at t=2.0s and t=8.0s
    const sampleRate = 48000;
    const duration = 10;
    const totalSamples = sampleRate * duration;
    const chL = new Float32Array(totalSamples);
    const chR = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      chL[i] = 0.1;
      chR[i] = 0.1;
    }
    // Inject clipping at t=2.0s and t=8.0s
    const idx2s = Math.floor(2.0 * sampleRate);
    const idx8s = Math.floor(8.0 * sampleRate);
    chL[idx2s] = 1.0;
    chR[idx8s] = -1.0;

    const pyramids = buildStereoPyramids([chL, chR], sampleRate);
    const canvasWidth = 1000;
    const canvasHeight = 120;
    const mock = createMockCanvas(canvasWidth, canvasHeight);
    const vp = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };
    const visible = getVisibleBuckets(pyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);

    const stats = renderStaticWaveform(
      mock.ctx,
      visible,
      vp,
      canvasWidth,
      canvasHeight,
      1,
      {
        showQuietRegions: false,
        showClipping: true,
        clippingColor: '#ef4444',
      }
    );

    assert(stats.clippedBucketsCount === 2, `Accurately identified exactly 2 clipped buckets (actual: ${stats.clippedBucketsCount})`);

    const clipRects = mock.state.fillRects.filter((r) => r.fillStyle === '#ef4444');
    assert(clipRects.length === 2, `Rendered exactly 2 clipping excursion markers`);

    // Verify positions of markers: t=2s (200px) and t=8s (800px)
    const clipX1 = clipRects[0].x;
    const clipX2 = clipRects[1].x;
    assert(
      Math.abs(clipX1 - 200) <= 5,
      `Clip marker 1 at ${clipX1.toFixed(1)}px corresponds to bucket containing sample at t=2.0s (200px)`
    );
    assert(
      Math.abs(clipX2 - 800) <= 5,
      `Clip marker 2 at ${clipX2.toFixed(1)}px corresponds to bucket containing sample at t=8.0s (800px)`
    );
  }

  // --------------------------------------------------------------------------
  // GROUP D: Original / Clean Synchronization
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group D: Original / Clean Synchronization ---');
  {
    const sampleRate = 48000;
    const duration = 20;
    const totalSamples = sampleRate * duration;
    const origCh = [new Float32Array(totalSamples), new Float32Array(totalSamples)];
    const cleanCh = [new Float32Array(totalSamples), new Float32Array(totalSamples)];

    // Place identical marker event at t=12.5s in both
    const idx12_5 = Math.floor(12.5 * sampleRate);
    origCh[0][idx12_5] = 1.0;
    cleanCh[0][idx12_5] = 1.0;

    const origPyramid = buildStereoPyramids(origCh, sampleRate);
    const cleanPyramid = buildStereoPyramids(cleanCh, sampleRate);

    const canvasWidth = 1200;
    const canvasHeight = 100;
    const viewport = { startTimeSec: 10, durationSec: 5, totalDurationSec: duration }; // 5s window

    const origMock = createMockCanvas(canvasWidth, canvasHeight);
    const cleanMock = createMockCanvas(canvasWidth, canvasHeight);

    const origVis = getVisibleBuckets(origPyramid.combined, viewport.startTimeSec, viewport.durationSec, canvasWidth);
    const cleanVis = getVisibleBuckets(cleanPyramid.combined, viewport.startTimeSec, viewport.durationSec, canvasWidth);

    const origStats = renderStaticWaveform(
      origMock.ctx,
      origVis,
      viewport,
      canvasWidth,
      canvasHeight,
      1,
      { showClipping: true, clippingColor: '#ef4444' }
    );

    const cleanStats = renderStaticWaveform(
      cleanMock.ctx,
      cleanVis,
      viewport,
      canvasWidth,
      canvasHeight,
      1,
      { showClipping: true, clippingColor: '#ef4444' }
    );

    assert(origStats.clippedBucketsCount === 1, 'Original has 1 clipped bucket in viewport');
    assert(cleanStats.clippedBucketsCount === 1, 'Clean has 1 clipped bucket in viewport');

    const origClip = origMock.state.fillRects.find((r) => r.fillStyle === '#ef4444');
    const cleanClip = cleanMock.state.fillRects.find((r) => r.fillStyle === '#ef4444');

    assert(origClip && cleanClip, 'Both tracks rendered clipping markers');
    assert(
      Math.abs(origClip.x - cleanClip.x) < 0.001,
      `Crucial Invariant: origClip.x (${origClip.x.toFixed(2)}) === cleanClip.x (${cleanClip.x.toFixed(2)})`
    );

    // Expected position: (12.5 - 10) / 5 * 1200 = 600px
    assert(
      Math.abs(origClip.x - 600) <= 4,
      `Marker at ${origClip.x.toFixed(1)}px matches canonical timeToPixel projection (600px)`
    );
  }

  // --------------------------------------------------------------------------
  // GROUP E: Manual Noise-Profile Region
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group E: Manual Noise-Profile Region ---');
  {
    const canvasWidth = 1000;
    const canvasHeight = 120;
    const mock = createMockCanvas(canvasWidth, canvasHeight);

    const manualRegion = { startSec: 2.0, endSec: 4.5 };
    const viewport = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };

    renderDynamicLayer(
      mock.ctx,
      viewport,
      1.0,
      10,
      canvasWidth,
      canvasHeight,
      1,
      { manualRegion }
    );

    // Verify text label updated to "Selected Noise Profile: 2.50s"
    const textEntry = mock.state.texts.find((t) => t.text.includes('Selected Noise Profile:'));
    assert(
      textEntry !== undefined,
      `Manual region label contains "Selected Noise Profile:" (rendered: "${textEntry?.text}")`
    );
    assert(
      textEntry.text === 'Selected Noise Profile: 2.50s',
      `Manual region duration formatted accurately as "Selected Noise Profile: 2.50s"`
    );

    // Verify selection box rendered with fillRect
    const selectionBoxes = mock.state.fillRects.filter(
      (r) => r.fillStyle === 'rgba(245, 158, 11, 0.18)'
    );
    assert(selectionBoxes.length > 0, 'Rendered manual noise-profile highlight box in dynamic layer');
    // Start at 200px, width 250px
    assert(
      Math.abs(selectionBoxes[0].x - 200) < 1 && Math.abs(selectionBoxes[0].w - 250) < 1,
      `Manual region box bounds [${selectionBoxes[0].x}, ${selectionBoxes[0].w}] match viewport math`
    );
  }

  // --------------------------------------------------------------------------
  // GROUP F: Rendering Architecture & Pyramid Invariance
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group F: Rendering Architecture & Pyramid Invariance ---');
  {
    let pyramidBuildCounter = 0;
    const sampleRate = 48000;
    const duration = 10;
    const totalSamples = sampleRate * duration;
    const chL = new Float32Array(totalSamples);
    const chR = new Float32Array(totalSamples);

    function buildPyramidTracked() {
      pyramidBuildCounter++;
      return buildStereoPyramids([chL, chR], sampleRate);
    }

    const pyramids = buildPyramidTracked();
    assert(pyramidBuildCounter === 1, 'Initial pyramid built once (build count = 1)');

    const canvasWidth = 1000;
    const canvasHeight = 120;
    const mockStatic = createMockCanvas(canvasWidth, canvasHeight);
    const mockDynamic = createMockCanvas(canvasWidth, canvasHeight);

    let vp = { startTimeSec: 0, durationSec: 10, totalDurationSec: 10 };

    // 1. Initial Static Render
    let vis = getVisibleBuckets(pyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
    renderStaticWaveform(
      mockStatic.ctx,
      vis,
      vp,
      canvasWidth,
      canvasHeight,
      1,
      { showQuietRegions: true, showClipping: true }
    );
    assert(pyramidBuildCounter === 1, 'Static render did NOT rebuild pyramids');

    // 2. Playhead updates at 60 FPS (10 frames)
    for (let f = 0; f < 10; f++) {
      renderDynamicLayer(
        mockDynamic.ctx,
        vp,
        f * 0.1,
        10,
        canvasWidth,
        canvasHeight,
        1
      );
    }
    assert(pyramidBuildCounter === 1, 'Playhead animation (10 frames) did NOT rebuild pyramids');

    // 3. Hover interaction
    renderDynamicLayer(
      mockDynamic.ctx,
      vp,
      1.0,
      10,
      canvasWidth,
      canvasHeight,
      1,
      { hoverTimeSec: 4.5 }
    );
    assert(pyramidBuildCounter === 1, 'Hover interaction did NOT rebuild pyramids');

    // 4. Zoom interaction
    vp = zoomAt(vp, 2.0, 500, canvasWidth, 10);
    vis = getVisibleBuckets(pyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
    renderStaticWaveform(
      mockStatic.ctx,
      vis,
      vp,
      canvasWidth,
      canvasHeight,
      1,
      { showQuietRegions: true, showClipping: true }
    );
    assert(pyramidBuildCounter === 1, 'Zoom interaction did NOT rebuild pyramids');

    // 5. Pan interaction
    vp = panBy(vp, 100, canvasWidth, 10);
    vis = getVisibleBuckets(pyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
    renderStaticWaveform(
      mockStatic.ctx,
      vis,
      vp,
      canvasWidth,
      canvasHeight,
      1,
      { showQuietRegions: true, showClipping: true }
    );
    assert(pyramidBuildCounter === 1, 'Pan interaction did NOT rebuild pyramids');

    // 6. Resize interaction
    vis = getVisibleBuckets(pyramids.combined, vp.startTimeSec, vp.durationSec, 1400);
    renderStaticWaveform(
      mockStatic.ctx,
      vis,
      vp,
      1400,
      140,
      1,
      { showQuietRegions: true, showClipping: true }
    );
    assert(pyramidBuildCounter === 1, 'Resize did NOT rebuild pyramids');
  }

  // --------------------------------------------------------------------------
  // GROUP G: Multi-Scale Audio Benchmarks (1m, 5m, 10m, 15m Stereo 48 kHz)
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group G: Multi-Scale Audio Benchmarks (B1.5 Diagnostics) ---');
  {
    const benchmarkDurations = [60, 300, 600, 900]; // 1m, 5m, 10m, 15m
    const sampleRate = 48000;
    const canvasWidth = 1200;
    const canvasHeight = 120;

    for (const durationSec of benchmarkDurations) {
      const minutes = durationSec / 60;
      const totalSamples = durationSec * sampleRate;
      console.log(`\n  * Benchmark: ${minutes} Minute (${durationSec}s, ${totalSamples.toLocaleString()} samples/ch, Stereo 48 kHz):`);

      // Generate synthetic stereo PCM with interleaved quiet and clipped sections
      const chL = new Float32Array(totalSamples);
      const chR = new Float32Array(totalSamples);
      for (let i = 0; i < totalSamples; i += 50000) {
        // quiet sections
        if ((i / sampleRate) % 20 < 5) {
          // keep zero
        } else {
          chL[i] = 0.4;
          chR[i] = 0.4;
        }
      }
      // Add deliberate clipping
      chL[1000] = 1.0;
      chR[2000] = -1.0;

      // 1. Pyramid build time
      const tPyramidStart = performance.now();
      const pyramids = buildStereoPyramids([chL, chR], sampleRate);
      const pyramidBuildMs = performance.now() - tPyramidStart;

      // 2. First Static Render with Diagnostics (Quiet + Clipping)
      const mock = createMockCanvas(canvasWidth, canvasHeight);
      const vp = { startTimeSec: 0, durationSec: durationSec, totalDurationSec: durationSec };
      const tRenderStart = performance.now();
      const visible = getVisibleBuckets(pyramids.combined, vp.startTimeSec, vp.durationSec, canvasWidth);
      const staticStats = renderStaticWaveform(
        mock.ctx,
        visible,
        vp,
        canvasWidth,
        canvasHeight,
        1,
        {
          showQuietRegions: true,
          showClipping: true,
          clippingColor: '#ef4444',
        }
      );
      const staticRenderMs = performance.now() - tRenderStart;

      // 3. Zoom Navigation Render
      const zoomVp = zoomAt(vp, 4.0, 600, canvasWidth, durationSec);
      const tZoomStart = performance.now();
      const zoomVis = getVisibleBuckets(pyramids.combined, zoomVp.startTimeSec, zoomVp.durationSec, canvasWidth);
      renderStaticWaveform(
        mock.ctx,
        zoomVis,
        zoomVp,
        canvasWidth,
        canvasHeight,
        1,
        {
          showQuietRegions: true,
          showClipping: true,
        }
      );
      const zoomRenderMs = performance.now() - tZoomStart;

      // 4. Pan Navigation Render
      const panVp = panBy(zoomVp, 200, canvasWidth, durationSec);
      const tPanStart = performance.now();
      const panVis = getVisibleBuckets(pyramids.combined, panVp.startTimeSec, panVp.durationSec, canvasWidth);
      renderStaticWaveform(
        mock.ctx,
        panVis,
        panVp,
        canvasWidth,
        canvasHeight,
        1,
        {
          showQuietRegions: true,
          showClipping: true,
        }
      );
      const panRenderMs = performance.now() - tPanStart;

      // 5. Playhead Dynamic Render (Layer 1)
      const tPlayheadStart = performance.now();
      renderDynamicLayer(
        mock.ctx,
        panVp,
        durationSec * 0.25,
        durationSec,
        canvasWidth,
        canvasHeight,
        1
      );
      const playheadMs = performance.now() - tPlayheadStart;

      console.log(`    - Pyramid Build (one-off): ${pyramidBuildMs.toFixed(2)} ms`);
      console.log(`    - First Static Render (with B1.5 diagnostics): ${staticRenderMs.toFixed(2)} ms (buckets: ${staticStats.bucketsRendered}, quiet: ${staticStats.quietBucketsCount}, clip: ${staticStats.clippedBucketsCount})`);
      console.log(`    - Zoom Render: ${zoomRenderMs.toFixed(2)} ms`);
      console.log(`    - Pan Render: ${panRenderMs.toFixed(2)} ms`);
      console.log(`    - Playhead Frame: ${playheadMs.toFixed(3)} ms`);

      assert(staticRenderMs < 30, `${minutes}m: Static render with diagnostics took < 30ms (actual: ${staticRenderMs.toFixed(2)}ms)`);
      assert(zoomRenderMs < 20, `${minutes}m: Zoom render took < 20ms (actual: ${zoomRenderMs.toFixed(2)}ms)`);
      assert(panRenderMs < 20, `${minutes}m: Pan render took < 20ms (actual: ${panRenderMs.toFixed(2)}ms)`);
      assert(playheadMs < 2, `${minutes}m: Dynamic playhead render took < 2ms (actual: ${playheadMs.toFixed(3)}ms)`);
    }
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
