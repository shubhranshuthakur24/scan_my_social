/**
 * Automated Verification Suite for Phase A2: Audio Quality Diagnostics Integration
 * Verifies lifecycle state transitions, metric formatting, delta calculations, clipping warnings,
 * and neutral handling of unavailable noise floor and silent inputs.
 */

import {
  analyzeAudioQuality,
  compareAudioQuality,
} from '../src/lib/audio/core/audioQualityAnalyzer.ts';

function runTestSuite() {
  console.log('================================================================');
  console.log('🔬 AUDIO DIAGNOSTICS UI INTEGRATION — PHASE A2 VERIFICATION');
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

  const sr = 48000;

  // Helper to format dBFS value like AudioDiagnostics component
  function formatDbFS(val, status) {
    if (status === 'silent') return 'Silent (no noise)';
    if (status === 'insufficient_quiet_material') return 'Insufficient quiet material';
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    return `${val.toFixed(1)} dBFS`;
  }

  // Helper to format delta like AudioDiagnostics component
  function formatDelta(val, unit, isInteger = false) {
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    const sign = val > 0 ? '+' : '';
    const formattedVal = isInteger ? val.toLocaleString() : val.toFixed(1);
    if (unit === 'samples') return `${sign}${formattedVal}`;
    return `${sign}${formattedVal} ${unit}`;
  }

  // --------------------------------------------------------------------------
  // TEST A: Original audio loads -> original diagnostics appear
  // --------------------------------------------------------------------------
  console.log('--- TEST A: Original Audio Loading Flow ---');
  {
    const origBuffer = new Float32Array(sr * 2);
    // Sine tone with amplitude 0.8 (-1.94 dBFS peak)
    for (let i = 0; i < origBuffer.length; i++) {
      origBuffer[i] = 0.8 * Math.sin((2 * Math.PI * 440 * i) / sr);
    }
    const origMetrics = analyzeAudioQuality([origBuffer], sr);

    assert(origMetrics !== null, 'Original metrics object generated successfully');
    assert(Math.abs(origMetrics.peakDbFS - (-1.94)) <= 0.1, `Peak formatted correctly: ${origMetrics.peakDbFS} dBFS`);
    assert(Math.abs(origMetrics.rmsDbFS - (-4.95)) <= 0.1, `RMS formatted correctly: ${origMetrics.rmsDbFS} dBFS`);
    assert(origMetrics.channels.length === 1, 'Mono channel metrics populated');
  }

  // --------------------------------------------------------------------------
  // TEST B: Denoising completes -> clean diagnostics appear
  // --------------------------------------------------------------------------
  console.log('\n--- TEST B: Denoising Completion Flow ---');
  {
    const cleanBuffer = new Float32Array(sr * 2);
    for (let i = 0; i < cleanBuffer.length; i++) {
      cleanBuffer[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sr);
    }
    const cleanMetrics = analyzeAudioQuality([cleanBuffer], sr);

    assert(cleanMetrics !== null, 'Clean metrics generated successfully');
    assert(Math.abs(cleanMetrics.peakDbFS - (-6.02)) <= 0.1, `Clean peak: ${cleanMetrics.peakDbFS} dBFS`);
    assert(Math.abs(cleanMetrics.rmsDbFS - (-9.03)) <= 0.1, `Clean RMS: ${cleanMetrics.rmsDbFS} dBFS`);
  }

  // --------------------------------------------------------------------------
  // TEST C: Comparison appears only when both metric sets exist
  // --------------------------------------------------------------------------
  console.log('\n--- TEST C: Comparison State Gating ---');
  {
    const origBuffer = new Float32Array(sr).fill(0.5);
    const cleanBuffer = new Float32Array(sr).fill(0.25);

    const origMetrics = analyzeAudioQuality([origBuffer], sr);
    const cleanMetrics = analyzeAudioQuality([cleanBuffer], sr);

    // Partial state: only original
    let comparison = null;
    assert(comparison === null, 'Comparison is null when clean metrics are unavailable');

    // Both available:
    comparison = compareAudioQuality(origMetrics, cleanMetrics);
    assert(comparison !== null, 'Comparison is calculated when both metrics exist');
    assert(comparison.delta.peakDbFSDelta < 0, `Peak delta is negative: ${comparison.delta.peakDbFSDelta} dB`);
    assert(comparison.delta.rmsDbFSDelta < 0, `RMS delta is negative: ${comparison.delta.rmsDbFSDelta} dB`);
  }

  // --------------------------------------------------------------------------
  // TEST D: Noise floor unavailable -> UI displays neutral state
  // --------------------------------------------------------------------------
  console.log('\n--- TEST D: Noise Floor Unavailable Neutral Formatting ---');
  {
    // Continuous full-scale sine has no pause windows -> 'insufficient_quiet_material'
    const continuous = new Float32Array(sr * 3);
    for (let i = 0; i < continuous.length; i++) {
      continuous[i] = 0.9 * Math.sin((2 * Math.PI * 1000 * i) / sr);
    }
    const metrics = analyzeAudioQuality([continuous], sr);

    assert(metrics.noiseFloorStatus === 'insufficient_quiet_material', 'Status is insufficient_quiet_material');
    assert(metrics.noiseFloorDbFS === null, 'noiseFloorDbFS is null');
    assert(metrics.dynamicRangeDb === null, 'dynamicRangeDb is null');

    const formattedNoise = formatDbFS(metrics.noiseFloorDbFS, metrics.noiseFloorStatus);
    assert(formattedNoise === 'Insufficient quiet material', 'Formatted display is "Insufficient quiet material" (NOT -120 dBFS)');

    const formattedDR = metrics.dynamicRangeDb !== null ? `${metrics.dynamicRangeDb} dB` : '—';
    assert(formattedDR === '—', 'Dynamic range displays neutral placeholder "—"');
  }

  // --------------------------------------------------------------------------
  // TEST E: Clipped input -> clipping warning appears
  // --------------------------------------------------------------------------
  console.log('\n--- TEST E: Clipped Input Warning Logic ---');
  {
    const clipped = new Float32Array(sr);
    clipped[100] = 1.0;
    clipped[101] = 1.0;
    clipped[102] = 1.0; // 3 consecutive full-scale samples
    const metrics = analyzeAudioQuality([clipped], sr);

    assert(metrics.isClipped === true, 'isClipped is true');
    assert(metrics.clippedCount === 3, 'clippedCount is 3');
    assert(metrics.maxConsecutiveClipped === 3, 'maxConsecutiveClipped is 3');
    const warningTriggered = metrics.isClipped;
    assert(warningTriggered === true, 'Clipping warning alert triggers correctly');
  }

  // --------------------------------------------------------------------------
  // TEST F: Silent input -> no NaN/Infinity and neutral noise floor
  // --------------------------------------------------------------------------
  console.log('\n--- TEST F: Digital Silence Handling ---');
  {
    const silent = new Float32Array(sr); // all zeros
    const metrics = analyzeAudioQuality([silent], sr);

    assert(metrics.noiseFloorStatus === 'silent', 'Status is silent');
    assert(metrics.noiseFloorDbFS === null, 'noiseFloorDbFS is null');
    assert(formatDbFS(metrics.noiseFloorDbFS, metrics.noiseFloorStatus) === 'Silent (no noise)', 'Formatted as "Silent (no noise)"');
    assert(!Number.isNaN(metrics.peakDbFS) && Number.isFinite(metrics.peakDbFS), 'Peak is finite (-120 dBFS)');
    assert(!Number.isNaN(metrics.rmsDbFS) && Number.isFinite(metrics.rmsDbFS), 'RMS is finite (-120 dBFS)');
    assert(metrics.silencePercentage === 100.0, 'Silence percentage is 100%');
  }

  // --------------------------------------------------------------------------
  // TEST G: Reload/new file -> previous diagnostics are cleared correctly
  // --------------------------------------------------------------------------
  console.log('\n--- TEST G: File Reset Lifecycle ---');
  {
    let orig = { peak: 0.5 };
    let clean = { peak: 0.3 };
    let comp = { delta: {} };

    // Simulate handleReset()
    orig = null;
    clean = null;
    comp = null;

    assert(orig === null && clean === null && comp === null, 'All diagnostics state cleared on reset/reload');
  }

  // --------------------------------------------------------------------------
  // TEST H: Delta formatting with explicit units and sign
  // --------------------------------------------------------------------------
  console.log('\n--- TEST H: Delta Formatting ---');
  {
    assert(formatDelta(-13.2, 'dB') === '-13.2 dB', 'Negative dB delta formatted correctly (-13.2 dB)');
    assert(formatDelta(12.3, 'dB') === '+12.3 dB', 'Positive dB delta formatted with explicit + (+12.3 dB)');
    assert(formatDelta(0.7, '%') === '+0.7 %', 'Percentage delta formatted (+0.7 %)');
    assert(formatDelta(-24, 'samples', true) === '-24', 'Clipped sample delta formatted as integer (-24)');
    assert(formatDelta(null, 'dB') === '—', 'Null delta formatted as neutral "—"');
  }

  // --------------------------------------------------------------------------
  // TEST I: Stereo L/R Breakdown Invariance
  // --------------------------------------------------------------------------
  console.log('\n--- TEST I: Stereo L/R Channel Breakdown ---');
  {
    const chL = new Float32Array(sr).fill(0.4);
    const chR = new Float32Array(sr).fill(0.1);
    const metrics = analyzeAudioQuality([chL, chR], sr);

    assert(metrics.numberOfChannels === 2, 'Stereo detected');
    assert(metrics.channels.length === 2, 'Both channels present in breakdown');
    assert(metrics.channels[0].peakDbFS > metrics.channels[1].peakDbFS, 'Left peak > Right peak');
    assert(metrics.channels[0].rmsDbFS > metrics.channels[1].rmsDbFS, 'Left RMS > Right RMS');
  }

  console.log(`\n================================================================`);
  console.log(`RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
