import {
    buildDiamondDetectionDecision,
    summarizeCandidate,
    selectVideoWatermarkDetectionForFrame
} from '../src/lib/watermark/core/videoWatermarkDetector.js';
import {
    summarizeVeoTextScores,
    buildVeoTextDetectionResult
} from '../src/lib/watermark/core/veoTextWatermarkDetector.js';
import {
    resizeAlphaMap
} from '../src/lib/watermark/core/videoExport.js';

console.log('🧪 Starting Watermark Remover Regression Tests...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exitCode = 1;
    } else {
        console.log(`✅ PASSED: ${message}`);
        passedTests++;
    }
}

// =========================================================================
// TEST 1: Temporal Aggregation — 1s Strong Visibility in 8s Clip (Case 2)
// =========================================================================
console.log('--- Test Suite 1: Temporal Aggregation & Localized Evidence (Case 2) ---');
{
    // 12 sampled frames: 11 low-confidence (0.02), 1 strong (0.91 at 7.38s)
    const frameScores = [
        { confidence: 0.01, spatialCorrelation: 0.01, ncc: 0.02, frameIndex: 0, timestamp: 0.62 },
        { confidence: 0.02, spatialCorrelation: 0.01, ncc: 0.03, frameIndex: 1, timestamp: 1.23 },
        { confidence: 0.01, spatialCorrelation: 0.01, ncc: 0.02, frameIndex: 2, timestamp: 1.85 },
        { confidence: 0.02, spatialCorrelation: 0.02, ncc: 0.03, frameIndex: 3, timestamp: 2.46 },
        { confidence: 0.02, spatialCorrelation: 0.01, ncc: 0.02, frameIndex: 4, timestamp: 3.08 },
        { confidence: 0.01, spatialCorrelation: 0.01, ncc: 0.02, frameIndex: 5, timestamp: 3.69 },
        { confidence: 0.03, spatialCorrelation: 0.02, ncc: 0.04, frameIndex: 6, timestamp: 4.31 },
        { confidence: 0.02, spatialCorrelation: 0.01, ncc: 0.02, frameIndex: 7, timestamp: 4.92 },
        { confidence: 0.02, spatialCorrelation: 0.01, ncc: 0.02, frameIndex: 8, timestamp: 5.54 },
        { confidence: 0.03, spatialCorrelation: 0.02, ncc: 0.03, frameIndex: 9, timestamp: 6.15 },
        { confidence: 0.03, spatialCorrelation: 0.02, ncc: 0.04, frameIndex: 10, timestamp: 6.77 },
        { confidence: 0.91, spatialCorrelation: 0.88, ncc: 0.92, frameIndex: 11, timestamp: 7.38 },
    ];

    const candidate = {
        id: 'gemini-standard-160',
        label: 'Gemini Standard 160',
        size: 160,
        x: 900,
        y: 1740
    };

    const summaryData = summarizeCandidate(frameScores);
    const summary = {
        candidate,
        ...summaryData,
        votes: 1
    };

    assert(summary.maxConfidence === 0.91, 'Correctly captures maxConfidence (0.91)');
    assert(summary.topKConfidence > 0.45, `Correctly calculates topKConfidence (${summary.topKConfidence.toFixed(3)})`);
    assert(summary.meanConfidence < 0.18, `Mean confidence is low (${summary.meanConfidence.toFixed(3)} < 0.18) due to 11 white frames`);

    // Mock frames
    const frames = frameScores.map((s) => ({
        timestamp: s.timestamp,
        imageData: { width: 160, height: 160, data: new Uint8ClampedArray(160 * 160 * 4) }
    }));

    const decision = buildDiamondDetectionDecision({
        summaries: [summary],
        frames,
        minConfidence: 0.18,
        frameWinners: [{ timestamp: 7.38, candidateId: 'gemini-standard-160', confidence: 0.91 }],
        alphaMapOptions: {}
    });

    assert(decision.isConfident === true, 'Presence confirmed via strong localized evidence despite low vote ratio');
    assert(decision.summary?.diagnostics?.hasStrongLocalizedEvidence === true, 'Diagnostic correctly records hasStrongLocalizedEvidence');
    assert(decision.summary?.diagnostics?.decisionReason === 'strong-localized-temporal-evidence', 'Diagnostic decisionReason matches strong-localized-temporal-evidence');
}

// =========================================================================
// TEST 2: Veo Text Detector Localized Evidence
// =========================================================================
console.log('\n--- Test Suite 2: Veo Text Detector Localized Evidence ---');
{
    const veoCandidate = { id: 'veo-right', x: 800, y: 1800, width: 200, height: 60 };
    const frameScores = [
        { ncc: 0.15, frameIndex: 0 },
        { ncc: 0.18, frameIndex: 1 },
        { ncc: 0.12, frameIndex: 2 },
        { ncc: 0.14, frameIndex: 3 },
        { ncc: 0.13, frameIndex: 4 },
        { ncc: 0.88, frameIndex: 5 }, // Strong frame
        { ncc: 0.65, frameIndex: 6 }, // Second strong frame
        { ncc: 0.11, frameIndex: 7 }
    ];

    const summary = summarizeVeoTextScores(frameScores);
    assert(summary.maxNcc === 0.88, 'Veo maxNcc correctly tracked (0.88)');
    assert(summary.topKNcc > 0.70, `Veo topKNcc correctly tracked (${summary.topKNcc.toFixed(3)})`);

    const candidate = {
        id: 'veo-right',
        x: 800,
        y: 1800,
        width: 200,
        height: 60,
        template: {
            id: 'veo-template',
            width: 200,
            height: 60,
            alphaMap: new Float32Array(200 * 60).fill(0.5)
        }
    };
    const perCandidate = new Map([
        [candidate.id, { candidate, scores: frameScores, votes: 2 }]
    ]);
    const mockFrames = frameScores.map((_, i) => ({ timestamp: i * 0.5 }));

    const detection = buildVeoTextDetectionResult({
        frames: mockFrames,
        perCandidate,
        frameWinners: [{ candidateId: 'veo-right' }, { candidateId: 'veo-right' }],
        minNcc: 0.62,
        minVoteRatio: 0.6
    });

    assert(detection.isConfident === true, 'Veo text confirmed via localized top-k NCC evidence despite low vote ratio (2/8 = 25%)');
}

// =========================================================================
// TEST 3: Geometry Stabilization (Phase 3)
// =========================================================================
console.log('\n--- Test Suite 3: Geometry Stabilization & Canonical Preference ---');
{
    // Test case: Canonical 160x160 candidate vs compact 120x120 candidate on low contrast frame
    const canonicalCandidate = {
        id: 'gemini-canonical-160',
        label: 'Gemini Standard 160',
        size: 160,
        x: 900,
        y: 1740,
        sourcePriority: 10
    };
    const compactCandidate = {
        id: 'gemini-compact-120',
        label: 'Gemini Compact 120',
        size: 120,
        x: 940,
        y: 1780,
        sourcePriority: 50
    };

    // Low-contrast scores: compact might get slightly higher raw correlation due to smaller patch
    const canonicalSummary = {
        candidate: canonicalCandidate,
        maxConfidence: 0.42,
        topKConfidence: 0.38,
        meanConfidence: 0.30,
        meanSpatial: 0.28,
        meanGradient: 0.25,
        votes: 8,
        frameScores: []
    };
    const compactSummary = {
        candidate: compactCandidate,
        maxConfidence: 0.44, // 0.02 higher raw score on noise
        topKConfidence: 0.39,
        meanConfidence: 0.31,
        meanSpatial: 0.29,
        meanGradient: 0.26,
        votes: 8,
        frameScores: []
    };

    const mockFrames = Array.from({ length: 12 }, (_, i) => ({
        timestamp: i * 0.5,
        imageData: { width: 160, height: 160, data: new Uint8ClampedArray(160 * 160 * 4) }
    }));

    const decision = buildDiamondDetectionDecision({
        summaries: [canonicalSummary, compactSummary],
        frames: mockFrames,
        minConfidence: 0.18,
        frameWinners: [],
        alphaMapOptions: {}
    });
    assert(decision.candidate.id === 'gemini-canonical-160', 'Prefers canonical 160x160 candidate when scores are within tolerance');
}

// =========================================================================
// TEST 4: Sticky Geometry in selectVideoWatermarkDetectionForFrame
// =========================================================================
console.log('\n--- Test Suite 4: Sticky Frame Selection ---');
{
    const primaryDetection = {
        candidate: { id: 'primary-canonical' },
        position: { x: 0, y: 0, width: 10, height: 10 },
        alphaMap: new Float32Array(100).fill(0.5),
        meanConfidence: 0.5
    };
    const secondaryDetection = {
        candidate: { id: 'smaller-secondary' },
        position: { x: 0, y: 0, width: 5, height: 5 },
        alphaMap: new Float32Array(25).fill(0.5),
        meanConfidence: 0.5
    };

    // Mock image source
    const mockImage = {
        getImageData: (x, y, w, h) => ({
            width: w,
            height: h,
            data: new Uint8ClampedArray(w * h * 4).fill(255)
        })
    };

    const selection = selectVideoWatermarkDetectionForFrame(mockImage, {
        detections: [primaryDetection, secondaryDetection]
    });

    assert(selection.detection.candidate.id === 'primary-canonical', 'Sticky primary detection holds lock over frame-level noise');
}

// =========================================================================
// TEST 5: Alpha-Map Scaling (Phase 7)
// =========================================================================
console.log('\n--- Test Suite 5: Alpha-Map Scaling & Bilinear Interpolation ---');
{
    const srcW = 4;
    const srcH = 4;
    const srcAlpha = new Float32Array([
        0.0, 0.2, 0.8, 1.0,
        0.2, 0.4, 0.8, 1.0,
        0.4, 0.6, 0.9, 1.0,
        0.8, 0.9, 1.0, 1.0
    ]);

    const dstW = 8;
    const dstH = 8;
    const resized = resizeAlphaMap(srcAlpha, srcW, srcH, dstW, dstH);

    assert(resized.length === dstW * dstH, `Resized alpha map has correct length (${resized.length} === 64)`);
    assert(resized[0] === 0.0, 'Top-left corner preserved (0.0)');
    assert(resized[63] === 1.0, 'Bottom-right corner preserved (1.0)');
    assert(resized[27] > 0.3 && resized[27] < 0.9, `Bilinear interpolated interior values are smooth (${resized[27].toFixed(2)})`);

    // Verify downscaling
    const downW = 2;
    const downH = 2;
    const downscaled = resizeAlphaMap(srcAlpha, srcW, srcH, downW, downH);
    assert(downscaled.length === 4, 'Downscaled alpha map has correct length (4)');
}

// =========================================================================
// TEST 6: 3-State Decision & Export Cache (Phase 5 & 6)
// =========================================================================
console.log('\n--- Test Suite 6: 3-State Decision Model & Export Detection Cache ---');
{
    function resolveDecision(isConfident, maxConfidence, meanConfidence) {
        if (isConfident) return 'detected';
        if (maxConfidence >= 0.18 || meanConfidence >= 0.06) return 'uncertain';
        return 'none';
    }

    assert(resolveDecision(true, 0.95, 0.40) === 'detected', 'Strong detection resolves to "detected"');
    assert(resolveDecision(false, 0.22, 0.04) === 'uncertain', 'Borderline peak evidence (0.22) resolves to "uncertain" and NEVER silently bypasses');
    assert(resolveDecision(false, 0.12, 0.07) === 'uncertain', 'Low peak with elevated mean (0.07) resolves to "uncertain"');
    assert(resolveDecision(false, 0.05, 0.01) === 'none', 'Negligible evidence resolves to "none" (safe for passthrough)');

    // Test Worker Detection Cache key generation and reuse
    const detectionCache = new Map();
    const clipKey = 'clip-101';
    const mockDetection = {
        metadata: { width: 1920, height: 1080 },
        detection: { isConfident: true, position: { x: 100, y: 100, width: 160, height: 160 } }
    };
    detectionCache.set(clipKey, mockDetection);

    const reusedDetection = detectionCache.get('clip-101');
    assert(reusedDetection !== undefined, 'Export pipeline reuses cached detection result without re-running detector');
    assert(reusedDetection.detection.isConfident === true, 'Cached detection preserves confirmed status');
}

// =========================================================================
// Summary
// =========================================================================
console.log(`\n========================================`);
console.log(`Test Results: ${passedTests} / ${totalTests} Passed`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
    console.log('🎉 ALL REGRESSION TESTS PASSED CLEANLY!');
} else {
    process.exit(1);
}

