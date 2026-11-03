/**
 * Phase B1.1 Automated Test Suite: Waveform Data Model & Viewport Math
 * Deterministic unit testing of multi-resolution pyramids (derived directly from PCM),
 * partial bucket RMS correctness, stereo pyramids & Combined Peak View,
 * and viewport coordinate transformations.
 */

import {
  buildChannelPyramid,
  buildCombinedPeakPyramid,
  buildStereoPyramids,
  getVisibleBuckets,
} from '../src/lib/audio/visualization/waveformData.ts';

import {
  timeToPixel,
  pixelToTime,
  timeToSample,
  sampleToTime,
  clampViewport,
  zoomAt,
  panBy,
  formatTime,
  computeTimeTicks,
} from '../src/lib/audio/visualization/viewportMath.ts';

function runTestSuite() {
  console.log('================================================================');
  console.log('📊 WAVEFORM DATA & VIEWPORT MATH — PHASE B1.1 VERIFICATION');
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

  // --------------------------------------------------------------------------
  // TEST 1: Empty Buffer Handling
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Empty Buffer Handling ---');
  {
    const emptyBuf = new Float32Array(0);
    const pyr = buildChannelPyramid(emptyBuf, sampleRate);
    assert(pyr.totalSamples === 0, 'Empty buffer yields 0 totalSamples');
    assert(pyr.durationSec === 0, 'Empty buffer yields 0 duration');
    assert(pyr.levels.length === 0, 'Empty buffer yields 0 levels');

    const emptyStereo = buildStereoPyramids([], sampleRate);
    assert(emptyStereo.combined.totalSamples === 0, 'Empty stereo yields 0 totalSamples');
    assert(emptyStereo.left.totalSamples === 0, 'Empty left yields 0 totalSamples');
    assert(emptyStereo.right.totalSamples === 0, 'Empty right yields 0 totalSamples');

    const visible = getVisibleBuckets(pyr, 0, 10, 800);
    assert(visible.count === 0, 'Empty pyramid yields 0 visible buckets');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Resolution Pyramid Construction (Direct from PCM)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Multi-Resolution Pyramid Structure (Derived Directly from PCM) ---');
  {
    const durSec = 10;
    const totalSamples = durSec * sampleRate; // 480,000 samples
    const buf = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      buf[i] = Math.sin(i * 0.05) * 0.4;
    }

    const pyr = buildChannelPyramid(buf, sampleRate);
    assert(pyr.sampleRate === 48000, 'Sample rate is preserved');
    assert(pyr.totalSamples === 480000, 'Total samples is 480,000');
    assert(Math.abs(pyr.durationSec - 10) < 1e-4, 'Duration is 10.0 seconds');
    assert(pyr.levels.length === 4, 'Constructs default 4 pyramid levels');

    assert(pyr.levels[0].samplesPerBucket === 128, 'L0 has 128 samples/bucket');
    assert(pyr.levels[1].samplesPerBucket === 512, 'L1 has 512 samples/bucket');
    assert(pyr.levels[2].samplesPerBucket === 2048, 'L2 has 2048 samples/bucket');
    assert(pyr.levels[3].samplesPerBucket === 8192, 'L3 has 8192 samples/bucket');

    assert(pyr.levels[0].bucketsCount === Math.ceil(480000 / 128), 'L0 bucket count matches');
    assert(pyr.levels[1].bucketsCount === Math.ceil(480000 / 512), 'L1 bucket count matches');
    assert(pyr.levels[2].bucketsCount === Math.ceil(480000 / 2048), 'L2 bucket count matches');
    assert(pyr.levels[3].bucketsCount === Math.ceil(480000 / 8192), 'L3 bucket count matches');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Partial Final Bucket Exact RMS Verification (Correctness Audit)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Partial Final Bucket Exact RMS Correctness ---');
  {
    // Buffer length: 700 samples (not a multiple of 128, 512, 2048, or 8192)
    // L0 (128): 6 buckets. Bucket 5 has only 60 samples (640..699)
    // L1 (512): 2 buckets. Bucket 1 has only 188 samples (512..699)
    const nonMultipleLen = 700;
    const buf = new Float32Array(nonMultipleLen);
    for (let i = 0; i < nonMultipleLen; i++) {
      buf[i] = (i % 2 === 0 ? 0.3 : -0.7) + (i / nonMultipleLen) * 0.1;
    }

    const pyr = buildChannelPyramid(buf, sampleRate);

    // Verify L0 final bucket (samples 640 to 699, count = 60)
    let sumSqL0 = 0;
    for (let i = 640; i < 700; i++) sumSqL0 += buf[i] * buf[i];
    const expectedRmsL0 = Math.sqrt(sumSqL0 / 60);
    const actualRmsL0 = pyr.levels[0].rms[5];
    assert(
      Math.abs(actualRmsL0 - expectedRmsL0) < 1e-6,
      `L0 partial bucket RMS is mathematically exact: ${actualRmsL0.toFixed(6)} === ${expectedRmsL0.toFixed(6)}`
    );

    // Verify L1 final bucket (samples 512 to 699, count = 188)
    let sumSqL1 = 0;
    for (let i = 512; i < 700; i++) sumSqL1 += buf[i] * buf[i];
    const expectedRmsL1 = Math.sqrt(sumSqL1 / 188);
    const actualRmsL1 = pyr.levels[1].rms[1];
    assert(
      Math.abs(actualRmsL1 - expectedRmsL1) < 1e-6,
      `L1 partial bucket RMS is mathematically exact: ${actualRmsL1.toFixed(6)} === ${expectedRmsL1.toFixed(6)}`
    );

    // Verify L2 bucket 0 (samples 0 to 699, count = 700)
    let sumSqAll = 0;
    for (let i = 0; i < 700; i++) sumSqAll += buf[i] * buf[i];
    const expectedRmsAll = Math.sqrt(sumSqAll / 700);
    const actualRmsL2 = pyr.levels[2].rms[0];
    assert(
      Math.abs(actualRmsL2 - expectedRmsAll) < 1e-6,
      `L2 full buffer RMS derived directly from PCM matches exact reference: ${actualRmsL2.toFixed(6)} === ${expectedRmsAll.toFixed(6)}`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Peak Excursion Preservation (Zero-Loss Transients Invariance)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Peak Excursion Preservation Across Hierarchy ---');
  {
    // A single sharp impulse at sample 15,234: +0.945 max, and at sample 27,891: -0.892 min
    const totalSamples = 48000 * 2; // 2 seconds
    const buf = new Float32Array(totalSamples);
    buf[15234] = 0.945;
    buf[27891] = -0.892;

    const pyr = buildChannelPyramid(buf, sampleRate);

    for (let lvl = 0; lvl < pyr.levels.length; lvl++) {
      const level = pyr.levels[lvl];
      let maxSeen = 0;
      let minSeen = 0;
      for (let i = 0; i < level.bucketsCount; i++) {
        if (level.maxs[i] > maxSeen) maxSeen = level.maxs[i];
        if (level.mins[i] < minSeen) minSeen = level.mins[i];
      }
      assert(
        Math.abs(maxSeen - 0.945) < 1e-5,
        `Level ${lvl} (${level.samplesPerBucket} samples/bucket) preserves positive peak (+0.945)`
      );
      assert(
        Math.abs(minSeen - (-0.892)) < 1e-5,
        `Level ${lvl} (${level.samplesPerBucket} samples/bucket) preserves negative peak (-0.892)`
      );
    }
  }

  // --------------------------------------------------------------------------
  // TEST 5: Stereo Independent Pyramids & Combined Peak View
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Stereo Independent L/R Pyramids & Combined Peak View ---');
  {
    const totalSamples = 10000;
    const chL = new Float32Array(totalSamples);
    const chR = new Float32Array(totalSamples);

    chL[500] = 0.85;   // Left peak only
    chR[500] = 0.20;
    chL[1500] = -0.30;
    chR[1500] = -0.92; // Right negative peak only

    // DC levels for RMS test
    for (let i = 2000; i < 3000; i++) {
      chL[i] = 0.6;
      chR[i] = 0.8;
    }

    const stereo = buildStereoPyramids([chL, chR], sampleRate);

    // 1. Verify Left channel remains independently available
    assert(stereo.left.totalSamples === totalSamples, 'Left channel pyramid retained');
    const bucket500L = Math.floor(500 / 128);
    assert(
      Math.abs(stereo.left.levels[0].maxs[bucket500L] - 0.85) < 1e-4,
      `Left channel independently retains peak: 0.85 (got ${stereo.left.levels[0].maxs[bucket500L]})`
    );

    // 2. Verify Right channel remains independently available
    assert(stereo.right.totalSamples === totalSamples, 'Right channel pyramid retained');
    const bucket1500R = Math.floor(1500 / 128);
    assert(
      Math.abs(stereo.right.levels[0].mins[bucket1500R] - (-0.92)) < 1e-4,
      `Right channel independently retains peak: -0.92 (got ${stereo.right.levels[0].mins[bucket1500R]})`
    );

    // 3. Verify Combined Peak View correctly envelopes L and R
    const combinedL0 = stereo.combined.levels[0];
    assert(
      Math.abs(combinedL0.maxs[bucket500L] - 0.85) < 1e-4,
      `Combined Peak View max takes highest excursion: 0.85 (got ${combinedL0.maxs[bucket500L]})`
    );
    assert(
      Math.abs(combinedL0.mins[bucket1500R] - (-0.92)) < 1e-4,
      `Combined Peak View min takes lowest excursion: -0.92 (got ${combinedL0.mins[bucket1500R]})`
    );

    // Power-averaged RMS between 0.6 and 0.8: sqrt((0.6^2 + 0.8^2) / 2) = sqrt(0.5) ≈ 0.7071
    const bucketRms = Math.floor(2500 / 128);
    assert(
      Math.abs(combinedL0.rms[bucketRms] - Math.SQRT1_2) < 1e-3,
      `Combined Peak View power-averaged RMS ≈ 0.7071 (got ${combinedL0.rms[bucketRms].toFixed(4)})`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 6: Visible Buckets Optimal Decimation Slicing
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Visible Buckets Level Selection & Zero-Copy Subarray ---');
  {
    const durSec = 60; // 1 minute
    const buf = new Float32Array(durSec * sampleRate);
    const pyr = buildChannelPyramid(buf, sampleRate);

    // Overview: 60s across 1000px = 2880 samples/pixel -> selects L2 or L3
    const overview = getVisibleBuckets(pyr, 0, 60, 1000);
    assert(overview.levelIndex >= 2, `Overview selects coarse level (L${overview.levelIndex})`);
    assert(overview.count > 0, `Overview extracted ${overview.count} buckets`);

    // Zoomed: 1s across 1000px = 48 samples/pixel -> selects L0 (128 samples/bucket)
    const zoomed = getVisibleBuckets(pyr, 10.0, 1.0, 1000);
    assert(zoomed.levelIndex === 0, `Zoomed view selects L0 (got L${zoomed.levelIndex})`);
    assert(zoomed.samplesPerBucket === 128, 'L0 has 128 samples/bucket');

    // Expected buckets for 1s: ceil(48000 / 128) = 375
    assert(
      Math.abs(zoomed.count - 375) <= 2,
      `Zoomed extracted ~375 buckets for 1.0s (got ${zoomed.count})`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 7: Viewport Coordinate Mapping & Round-Trip Invariance
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Viewport Coordinate Invariance ---');
  {
    const viewport = {
      startTimeSec: 12.5,
      durationSec: 5.0,
      totalDurationSec: 60.0,
    };
    const width = 1200;

    const testTimes = [12.5, 13.0, 15.0, 17.5, 12.5 + 2.5];
    for (const t of testTimes) {
      const px = timeToPixel(t, viewport, width);
      const backTime = pixelToTime(px, viewport, width);
      assert(
        Math.abs(backTime - t) < 1e-5,
        `Round-trip pixelToTime(timeToPixel(${t})) === ${backTime.toFixed(5)}`
      );
    }

    assert(timeToPixel(12.5, viewport, width) === 0, 'Start time maps to 0px');
    assert(timeToPixel(17.5, viewport, width) === width, 'End time maps to width px');
    assert(pixelToTime(0, viewport, width) === 12.5, '0px maps to startTimeSec');
    assert(pixelToTime(width, viewport, width) === 17.5, 'width px maps to endTimeSec');
  }

  // --------------------------------------------------------------------------
  // TEST 8: Zoom-At Anchor Invariance (Mouse Cursor Stationary Guarantee)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Zoom-At Anchor Invariance ---');
  {
    const initialVp = {
      startTimeSec: 10.0,
      durationSec: 20.0,
      totalDurationSec: 100.0,
    };
    const canvasWidth = 1000;

    // Zoom in 2x centered at 30% width (pixel 300)
    const anchorPx = 300;
    const timeAtAnchorBefore = pixelToTime(anchorPx, initialVp, canvasWidth);

    const zoomedVp = zoomAt(initialVp, 2.0, anchorPx, canvasWidth);
    const timeAtAnchorAfter = pixelToTime(anchorPx, zoomedVp, canvasWidth);

    assert(
      Math.abs(zoomedVp.durationSec - 10.0) < 1e-4,
      `Duration halved from 20s to 10s (got ${zoomedVp.durationSec}s)`
    );
    assert(
      Math.abs(timeAtAnchorBefore - timeAtAnchorAfter) < 1e-4,
      `Anchor timestamp invariant: before=${timeAtAnchorBefore.toFixed(4)}s after=${timeAtAnchorAfter.toFixed(4)}s`
    );

    // Zoom in 4x centered at right edge (pixel 900)
    const anchorRight = 900;
    const tRightBefore = pixelToTime(anchorRight, initialVp, canvasWidth);
    const zoomedRight = zoomAt(initialVp, 4.0, anchorRight, canvasWidth);
    const tRightAfter = pixelToTime(anchorRight, zoomedRight, canvasWidth);
    assert(
      Math.abs(tRightBefore - tRightAfter) < 1e-4,
      `Right edge anchor invariant: before=${tRightBefore.toFixed(4)}s after=${tRightAfter.toFixed(4)}s`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 9: Viewport Clamping & Pan Invariants
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Viewport Clamping & Pan ---');
  {
    const negStart = clampViewport({ startTimeSec: -5, durationSec: 10, totalDurationSec: 30 });
    assert(negStart.startTimeSec === 0, 'Negative start clamps to 0');

    const pastEnd = clampViewport({ startTimeSec: 25, durationSec: 10, totalDurationSec: 30 });
    assert(pastEnd.startTimeSec === 20, 'Overshooting start clamps to total - dur (20s)');
    assert(pastEnd.durationSec === 10, 'Duration remains 10s');

    const vp = { startTimeSec: 5, durationSec: 10, totalDurationSec: 30 };
    const panned = panBy(vp, 200, 1000);
    assert(Math.abs(panned.startTimeSec - 7.0) < 1e-4, 'Pan +200px shifts start by +2.0s (got 7.0s)');

    const pannedPast = panBy(vp, 3000, 1000);
    assert(pannedPast.startTimeSec === 20, 'Pan past end clamps to max 20s');
  }

  // --------------------------------------------------------------------------
  // TEST 10: Time Tick Generation & Formatting
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Graduation Time Ticks Generation ---');
  {
    const vp = { startTimeSec: 0, durationSec: 10, totalDurationSec: 60 };
    const ticks = computeTimeTicks(vp, 1000, 80);

    assert(ticks.length >= 5 && ticks.length <= 15, `Generates readable number of ticks: ${ticks.length}`);
    assert(ticks[0].timeSec >= 0, 'First tick starts at or above 0');
    assert(ticks[ticks.length - 1].timeSec <= 10.05, 'Last tick stops near end');

    let monotonic = true;
    for (let i = 1; i < ticks.length; i++) {
      if (ticks[i].timeSec <= ticks[i - 1].timeSec || ticks[i].pixelX <= ticks[i - 1].pixelX) {
        monotonic = false;
        break;
      }
    }
    assert(monotonic, 'Time ticks are strictly monotonically increasing');

    assert(formatTime(75.4, 'sec') === '1:15', 'formatTime 75.4 sec -> "1:15"');
    assert(formatTime(75.4, 'tenth') === '1:15.4', 'formatTime 75.4 tenth -> "1:15.4"');
    assert(formatTime(75.425, 'msec') === '1:15.425', 'formatTime 75.425 msec -> "1:15.425"');
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
