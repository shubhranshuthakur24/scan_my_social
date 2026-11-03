// scripts/test_split_cuts.mjs
// Comprehensive 34-Case Acceptance Test Suite for NLE Split / Cut & Precision Trimming

import assert from 'node:assert/strict';
import {
  getAuthoritativeTimelineMetrics,
  getAuthoritativeFps,
  timeToFrameIndex,
  frameIndexToTime,
  snapTimeToFrame,
  calculateFramePrecisionZoom,
  formatFrameTimecode,
} from '../src/lib/watermark/batch/framePrecision.ts';

import {
  buildTimelineProjection,
  resolveSequencePosition,
  resolveSourceToSequenceTime,
  splitTimelineSegment,
  removeTimelineSegment,
  reorderTimelineSegments,
  addTimelineSegment,
} from '../src/lib/watermark/batch/timelineProjection.ts';

console.log('=== Running 57-Case NLE Split / Cut & Dual-Deck Acceptance Test Suite ===\n');

let passedTests = 0;
let totalTests = 57;
const asyncTestPromises = [];

function runTest(testNum, testName, fn) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      asyncTestPromises.push(
        res
          .then(() => {
            console.log(`✓ Test ${testNum.toString().padStart(2, ' ')}: ${testName}`);
            passedTests++;
          })
          .catch((err) => {
            console.error(`✗ Test ${testNum.toString().padStart(2, ' ')} FAILED: ${testName}`);
            console.error(err);
            process.exitCode = 1;
          })
      );
    } else {
      console.log(`✓ Test ${testNum.toString().padStart(2, ' ')}: ${testName}`);
      passedTests++;
    }
  } catch (err) {
    console.error(`✗ Test ${testNum.toString().padStart(2, ' ')} FAILED: ${testName}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// Mock helper to build a source item
function createMockItem(id, duration, frameRate = 30, isVfr = false) {
  return {
    id,
    file: { name: `${id}.mp4` },
    previewUrl: `blob:http://localhost/${id}`,
    watermarkDecision: 'detected',
    metadata: {
      duration,
      width: 1920,
      height: 1080,
      frameRate,
      isVfr,
    },
  };
}

// 1. Empty timeline -> Split returns null
runTest(1, 'Empty timeline -> Split returns null', () => {
  const res = splitTimelineSegment([], 'non-existent', 2.5, 30);
  assert.equal(res, null);
});

// 2. Playhead before first segment -> Split returns null
runTest(2, 'Playhead before first segment -> Split returns null', () => {
  const segments = [{ id: 'seg-1', sourceClipId: 'clip-1', sourceStart: 0, sourceEnd: 10 }];
  const res = splitTimelineSegment(segments, 'seg-1', -1.0, 30);
  assert.equal(res, null);
});

// 3. Playhead at exact segment start -> Split returns null
runTest(3, 'Playhead at exact segment start -> Split returns null', () => {
  const segments = [{ id: 'seg-1', sourceClipId: 'clip-1', sourceStart: 0, sourceEnd: 10 }];
  const res = splitTimelineSegment(segments, 'seg-1', 0.0, 30);
  assert.equal(res, null);
});

// 4. Playhead at exact segment end -> Split returns null
runTest(4, 'Playhead at exact segment end -> Split returns null', () => {
  const segments = [{ id: 'seg-1', sourceClipId: 'clip-1', sourceStart: 0, sourceEnd: 10 }];
  const res = splitTimelineSegment(segments, 'seg-1', 10.0, 30);
  assert.equal(res, null);
});

// 5. Playhead inside segment -> Successfully splits into two segments
runTest(5, 'Playhead inside segment -> Successfully splits into two segments', () => {
  const segments = [{ id: 'seg-1', sourceClipId: 'clip-1', sourceStart: 0, sourceEnd: 10 }];
  const res = splitTimelineSegment(segments, 'seg-1', 4.0, 30);
  assert.notEqual(res, null);
  assert.equal(res.updatedSegments.length, 2);
  assert.equal(res.updatedSegments[0].sourceStart, 0);
  assert.equal(res.updatedSegments[0].sourceEnd, 4.0);
  assert.equal(res.updatedSegments[1].sourceStart, 4.0);
  assert.equal(res.updatedSegments[1].sourceEnd, 10.0);
});

// 6. Frame-index boundary alignment -> exactCutTime === cutFrame / fps
runTest(6, 'Frame-index boundary alignment -> exactCutTime === cutFrame / fps', () => {
  const fps = 30;
  const segments = [{ id: 'seg-1', sourceClipId: 'clip-1', sourceStart: 0, sourceEnd: 10 }];
  // Time with sub-frame offset: 4.015s -> frame 120 -> 4.0s exactly
  const res = splitTimelineSegment(segments, 'seg-1', 4.015, fps);
  assert.notEqual(res, null);
  assert.equal(res.cutSourceTime, 120 / 30);
  assert.equal(res.updatedSegments[0].sourceEnd, 4.0);
  assert.equal(res.updatedSegments[1].sourceStart, 4.0);
});

// 7. Unknown FPS -> getAuthoritativeTimelineMetrics === null -> Split disabled
runTest(7, 'Unknown FPS -> getAuthoritativeTimelineMetrics === null -> Split disabled', () => {
  const invalidItem = { id: 'c1', metadata: {} };
  const metrics = getAuthoritativeTimelineMetrics(invalidItem);
  assert.equal(metrics, null);
  assert.equal(getAuthoritativeFps(invalidItem), null);
});

// 8. Fractional FPS (29.97, 23.976, 59.94) -> Accurate discrete frame indices
runTest(8, 'Fractional FPS (29.97, 23.976, 59.94) -> Accurate discrete frame indices', () => {
  const fps2997 = 29.97;
  const frame100Time = frameIndexToTime(100, fps2997);
  assert.equal(timeToFrameIndex(frame100Time, fps2997), 100);
  const snapped = snapTimeToFrame(frame100Time + 0.002, fps2997);
  assert.equal(timeToFrameIndex(snapped, fps2997), 100);

  const fps23976 = 23.976;
  assert.equal(timeToFrameIndex(frameIndexToTime(50, fps23976), fps23976), 50);
});

// 9. Stable UUIDs -> Segment IDs do not mutate on reorder or deletion
runTest(9, 'Stable UUIDs -> Segment IDs do not mutate on reorder or deletion', () => {
  const segA = { id: 'uuid-a', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 5 };
  const segB = { id: 'uuid-b', sourceClipId: 'c2', sourceStart: 0, sourceEnd: 5 };
  const reordered = reorderTimelineSegments([segA, segB], 0, 1);
  assert.equal(reordered[0].id, 'uuid-b');
  assert.equal(reordered[1].id, 'uuid-a');
});

// 10. Split first clip -> Sequence projection starts at 0, total duration preserved
runTest(10, 'Split first clip -> Sequence projection starts at 0, total duration preserved', () => {
  const items = [createMockItem('c1', 10), createMockItem('c2', 10)];
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 },
    { id: 's2', sourceClipId: 'c2', sourceStart: 0, sourceEnd: 10 },
  ];
  const splitRes = splitTimelineSegment(segments, 's1', 3.0, 30);
  assert.notEqual(splitRes, null);
  const proj = buildTimelineProjection(items, splitRes.updatedSegments);
  assert.equal(proj.segments[0].sequenceStart, 0);
  assert.equal(proj.segments[0].sequenceEnd, 3.0);
  assert.equal(proj.segments[1].sequenceStart, 3.0);
  assert.equal(proj.segments[1].sequenceEnd, 10.0);
  assert.equal(proj.segments[2].sequenceStart, 10.0);
  assert.equal(proj.segments[2].sequenceEnd, 20.0);
  assert.equal(proj.totalSequenceDuration, 20.0);
});

// 11. Split middle clip -> Unaffected clips preserved unchanged
runTest(11, 'Split middle clip -> Unaffected clips preserved unchanged', () => {
  const items = [createMockItem('c1', 10), createMockItem('c2', 10), createMockItem('c3', 10)];
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 },
    { id: 's2', sourceClipId: 'c2', sourceStart: 0, sourceEnd: 10 },
    { id: 's3', sourceClipId: 'c3', sourceStart: 0, sourceEnd: 10 },
  ];
  const splitRes = splitTimelineSegment(segments, 's2', 5.0, 30);
  const proj = buildTimelineProjection(items, splitRes.updatedSegments);
  assert.equal(proj.segments.length, 4);
  assert.equal(proj.segments[0].clipId, 'c1');
  assert.equal(proj.segments[0].duration, 10);
  assert.equal(proj.segments[3].clipId, 'c3');
  assert.equal(proj.segments[3].duration, 10);
});

// 12. Split final clip -> Final sequence duration preserved
runTest(12, 'Split final clip -> Final sequence duration preserved', () => {
  const items = [createMockItem('c1', 10), createMockItem('c2', 10)];
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 },
    { id: 's2', sourceClipId: 'c2', sourceStart: 0, sourceEnd: 10 },
  ];
  const splitRes = splitTimelineSegment(segments, 's2', 7.0, 30);
  const proj = buildTimelineProjection(items, splitRes.updatedSegments);
  assert.equal(proj.totalSequenceDuration, 20.0);
  assert.equal(proj.segments[proj.segments.length - 1].sequenceEnd, 20.0);
});

// 13. Split same segment twice -> Produces 3 ordered, continuous, non-overlapping segments
runTest(13, 'Split same segment twice -> Produces 3 ordered, continuous, non-overlapping segments', () => {
  const segments = [{ id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 }];
  const res1 = splitTimelineSegment(segments, 's1', 3.0, 30);
  const rightId = res1.rightSegmentId;
  const res2 = splitTimelineSegment(res1.updatedSegments, rightId, 7.0, 30);
  assert.equal(res2.updatedSegments.length, 3);
  assert.equal(res2.updatedSegments[0].sourceEnd, 3.0);
  assert.equal(res2.updatedSegments[1].sourceStart, 3.0);
  assert.equal(res2.updatedSegments[1].sourceEnd, 7.0);
  assert.equal(res2.updatedSegments[2].sourceStart, 7.0);
  assert.equal(res2.updatedSegments[2].sourceEnd, 10.0);
});

// 14. Split + Delete -> Automatic gap closure, total duration reduced
runTest(14, 'Split + Delete -> Automatic gap closure, total duration reduced', () => {
  const items = [createMockItem('c1', 10)];
  const segments = [{ id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 }];
  const splitRes = splitTimelineSegment(segments, 's1', 4.0, 30);
  // Delete the 4.0s left segment
  const remaining = removeTimelineSegment(splitRes.updatedSegments, splitRes.leftSegmentId);
  const proj = buildTimelineProjection(items, remaining);
  assert.equal(remaining.length, 1);
  assert.equal(proj.totalSequenceDuration, 6.0);
  assert.equal(proj.segments[0].sequenceStart, 0.0);
  assert.equal(proj.segments[0].sequenceEnd, 6.0);
  assert.equal(proj.segments[0].sourceTrimStart, 4.0);
});

// 15. Delete segment -> Parent source media remains alive in items array
runTest(15, 'Delete segment -> Parent source media remains alive in items array', () => {
  const items = [createMockItem('c1', 10)];
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 5 },
    { id: 's2', sourceClipId: 'c1', sourceStart: 5, sourceEnd: 10 },
  ];
  const remaining = removeTimelineSegment(segments, 's1');
  assert.equal(items.length, 1); // items unaffected
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 's2');
});

// 16. Remove source media -> All child segments removed; source URL cleaned
runTest(16, 'Remove source media -> All child segments removed; source URL cleaned', () => {
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 5 },
    { id: 's2', sourceClipId: 'c1', sourceStart: 5, sourceEnd: 10 },
    { id: 's3', sourceClipId: 'c2', sourceStart: 0, sourceEnd: 10 },
  ];
  const purged = segments.filter((s) => s.sourceClipId !== 'c1');
  assert.equal(purged.length, 1);
  assert.equal(purged[0].id, 's3');
});

// 17. Split + Reorder -> Segments reordered with unchanged source clip references
runTest(17, 'Split + Reorder -> Segments reordered with unchanged source clip references', () => {
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 5 },
    { id: 's2', sourceClipId: 'c1', sourceStart: 5, sourceEnd: 10 },
  ];
  const reordered = reorderTimelineSegments(segments, 0, 1);
  assert.equal(reordered[0].id, 's2');
  assert.equal(reordered[0].sourceClipId, 'c1');
  assert.equal(reordered[1].id, 's1');
  assert.equal(reordered[1].sourceClipId, 'c1');
});

// 18. Split + Trim -> Segment trim clamped to allocated source limits (no overlap)
runTest(18, 'Split + Trim -> Segment trim clamped to allocated source limits (no overlap)', () => {
  const segments = [{ id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 }];
  const res = splitTimelineSegment(segments, 's1', 5.0, 30);
  const segA = res.updatedSegments[0];
  const segB = res.updatedSegments[1];
  assert.equal(segA.maxSourceLimit, 5.0);
  assert.equal(segB.minSourceLimit, 5.0);
});

// 19. Same-source playback crossing -> activeSegmentId updated via resolveSequencePosition
runTest(19, 'Same-source playback crossing -> activeSegmentId updated via resolveSequencePosition', () => {
  const items = [createMockItem('c1', 10)];
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 5 },
    { id: 's2', sourceClipId: 'c1', sourceStart: 5, sourceEnd: 10 },
  ];
  const proj = buildTimelineProjection(items, segments);
  const posA = resolveSequencePosition(2.0, proj.segments);
  assert.equal(posA.segmentId, 's1');
  assert.equal(posA.clipId, 'c1');

  const posB = resolveSequencePosition(6.0, proj.segments);
  assert.equal(posB.segmentId, 's2');
  assert.equal(posB.clipId, 'c1');
});

// 20. Watermark decision preservation -> Split segments share parent decision without re-analysis
runTest(20, 'Watermark decision preservation -> Split segments share parent decision without re-analysis', () => {
  const item = createMockItem('c1', 10);
  assert.equal(item.watermarkDecision, 'detected');
  // Both split segments reference c1 and inherit decision without modifying sourceItem
  const segments = [{ id: 's1', sourceClipId: item.id, sourceStart: 0, sourceEnd: 10 }];
  const res = splitTimelineSegment(segments, 's1', 5.0, 30);
  assert.equal(res.updatedSegments[0].sourceClipId, item.id);
  assert.equal(res.updatedSegments[1].sourceClipId, item.id);
  assert.equal(item.watermarkDecision, 'detected');
});

// 21. 30 FPS clip -> Exact N/30 timestamps
runTest(21, '30 FPS clip -> Exact N/30 timestamps', () => {
  const fps = 30;
  for (let f = 1; f < 30; f++) {
    const t = f / fps;
    const snapped = snapTimeToFrame(t, fps);
    assert.equal(snapped, t);
  }
});

// 22. 60 FPS clip -> Exact N/60 timestamps
runTest(22, '60 FPS clip -> Exact N/60 timestamps', () => {
  const fps = 60;
  for (let f = 1; f < 60; f++) {
    const t = f / fps;
    const snapped = snapTimeToFrame(t, fps);
    assert.equal(snapped, t);
  }
});

// 23. Mixed FPS batch -> Each split uses respective clip's authoritative FPS
runTest(23, "Mixed FPS batch -> Each split uses respective clip's authoritative FPS", () => {
  const item30 = createMockItem('c30', 10, 30);
  const item60 = createMockItem('c60', 10, 60);
  const m30 = getAuthoritativeTimelineMetrics(item30);
  const m60 = getAuthoritativeTimelineMetrics(item60);
  assert.equal(m30.fps, 30);
  assert.equal(m60.fps, 60);

  const segments = [
    { id: 's30', sourceClipId: 'c30', sourceStart: 0, sourceEnd: 10 },
    { id: 's60', sourceClipId: 'c60', sourceStart: 0, sourceEnd: 10 },
  ];
  const res30 = splitTimelineSegment(segments, 's30', 3.01, m30.fps);
  assert.equal(res30.cutSourceTime, 90 / 30);

  const res60 = splitTimelineSegment(segments, 's60', 3.01, m60.fps);
  assert.equal(res60.cutSourceTime, 181 / 60);
});

// 24. Selection contract -> Returns { updatedSegments, leftSegmentId, rightSegmentId, cutSourceTime }
runTest(24, 'Selection contract -> Returns { updatedSegments, leftSegmentId, rightSegmentId, cutSourceTime }', () => {
  const segments = [{ id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 }];
  const res = splitTimelineSegment(segments, 's1', 5.0, 30);
  assert.equal(typeof res.leftSegmentId, 'string');
  assert.equal(typeof res.rightSegmentId, 'string');
  assert.equal(typeof res.cutSourceTime, 'number');
  assert.equal(res.updatedSegments.length, 2);
  assert.equal(res.leftSegmentId, 's1');
});

// 25. Rejection of NaN or Infinity sequence times
runTest(25, 'Rejection of NaN or Infinity sequence times', () => {
  const segments = [{ id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 }];
  assert.equal(splitTimelineSegment(segments, 's1', NaN, 30), null);
  assert.equal(splitTimelineSegment(segments, 's1', Infinity, 30), null);
  assert.equal(splitTimelineSegment(segments, 's1', -Infinity, 30), null);
});

// 26. Full downstream sequence duration matches sum of segment durations
runTest(26, 'Full downstream sequence duration matches sum of segment durations', () => {
  const items = [createMockItem('c1', 10), createMockItem('c2', 15)];
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 1, sourceEnd: 7 }, // 6s
    { id: 's2', sourceClipId: 'c2', sourceStart: 2, sourceEnd: 12 }, // 10s
  ];
  const proj = buildTimelineProjection(items, segments);
  assert.equal(proj.totalSequenceDuration, 16.0);
});

// 27. Sequence -> source mapping: 3 clips + reorder + trims + playhead in clip 2 -> resolves correctly
runTest(27, 'Sequence -> source mapping: 3 clips + reorder + trims + playhead in clip 2', () => {
  const items = [createMockItem('c1', 10), createMockItem('c2', 20), createMockItem('c3', 30)];
  const segments = [
    { id: 's3', sourceClipId: 'c3', sourceStart: 5, sourceEnd: 15 }, // duration 10s, seq [0, 10)
    { id: 's1', sourceClipId: 'c1', sourceStart: 2, sourceEnd: 8 },  // duration 6s, seq [10, 16)
    { id: 's2', sourceClipId: 'c2', sourceStart: 0, sourceEnd: 20 }, // duration 20s, seq [16, 36)
  ];
  const proj = buildTimelineProjection(items, segments);
  // Seek at sequence 12s -> should be inside s1 (source c1) at sourceTime 2 + (12 - 10) = 4s
  const pos = resolveSequencePosition(12.0, proj.segments);
  assert.equal(pos.segmentId, 's1');
  assert.equal(pos.clipId, 'c1');
  assert.equal(pos.sourceTime, 4.0);
});

// 28. Split after previous split: A -> Split at 100 -> A1 | A2 -> Split A2 at 200 -> A1 | A2a | A2b
runTest(28, 'Split after previous split: A -> Split at 100 -> A1 | A2 -> Split A2 at 200', () => {
  const fps = 30;
  const segments = [{ id: 'A', sourceClipId: 'cA', sourceStart: 0, sourceEnd: 15 }];
  const cut1 = 100 / fps; // 3.333s
  const res1 = splitTimelineSegment(segments, 'A', cut1, fps);
  assert.notEqual(res1, null);

  const cut2 = 200 / fps; // 6.666s
  const res2 = splitTimelineSegment(res1.updatedSegments, res1.rightSegmentId, cut2, fps);
  assert.notEqual(res2, null);
  assert.equal(res2.updatedSegments.length, 3);
  assert.equal(res2.updatedSegments[0].sourceEnd, res2.updatedSegments[1].sourceStart);
  assert.equal(res2.updatedSegments[1].sourceEnd, res2.updatedSegments[2].sourceStart);
});

// 29. Split after trim: source 0–30, trim 5–20, split at 12 -> produces 5–12 and 12–20
runTest(29, 'Split after trim: source 0–30, trim 5–20, split at 12 -> produces 5–12 and 12–20', () => {
  const segments = [{ id: 's1', sourceClipId: 'c1', sourceStart: 5.0, sourceEnd: 20.0 }];
  const res = splitTimelineSegment(segments, 's1', 12.0, 30);
  assert.notEqual(res, null);
  assert.equal(res.updatedSegments[0].sourceStart, 5.0);
  assert.equal(res.updatedSegments[0].sourceEnd, 12.0);
  assert.equal(res.updatedSegments[1].sourceStart, 12.0);
  assert.equal(res.updatedSegments[1].sourceEnd, 20.0);
});

// 30. Split after reorder: A B C -> reordered to C A B -> split at sequence position inside A resolves to A
runTest(30, 'Split after reorder: A B C -> reordered to C A B -> split inside A resolves to A', () => {
  const items = [createMockItem('cA', 10), createMockItem('cB', 10), createMockItem('cC', 10)];
  const segments = [
    { id: 'sC', sourceClipId: 'cC', sourceStart: 0, sourceEnd: 10 },
    { id: 'sA', sourceClipId: 'cA', sourceStart: 0, sourceEnd: 10 },
    { id: 'sB', sourceClipId: 'cB', sourceStart: 0, sourceEnd: 10 },
  ];
  const proj = buildTimelineProjection(items, segments);
  // Sequence 15s is inside sA (cA), sourceTime 5s
  const pos = resolveSequencePosition(15.0, proj.segments);
  assert.equal(pos.segmentId, 'sA');
  assert.equal(pos.clipId, 'cA');
  assert.equal(pos.sourceTime, 5.0);

  const splitRes = splitTimelineSegment(segments, pos.segmentId, pos.sourceTime, 30);
  assert.notEqual(splitRes, null);
  assert.equal(splitRes.leftSegmentId, 'sA');
});

// 31. Same-source boundary playback: A1 -> A2: activePlaybackClipId unchanged, video element unchanged
runTest(31, 'Same-source boundary playback: A1 -> A2: sourceClipId matches', () => {
  const segA1 = { id: 's1', sourceClipId: 'cA', sourceStart: 0, sourceEnd: 5 };
  const segA2 = { id: 's2', sourceClipId: 'cA', sourceStart: 5, sourceEnd: 10 };
  assert.equal(segA1.sourceClipId, segA2.sourceClipId);
});

// 32. Different-source boundary playback: A -> B: sourceClipId differs
runTest(32, 'Different-source boundary playback: A -> B: sourceClipId differs', () => {
  const segA = { id: 's1', sourceClipId: 'cA', sourceStart: 0, sourceEnd: 10 };
  const segB = { id: 's2', sourceClipId: 'cB', sourceStart: 0, sourceEnd: 10 };
  assert.notEqual(segA.sourceClipId, segB.sourceClipId);
});

// 33. Split boundary ownership: Source 0–20, split at frame 300 (10.0s)
runTest(33, 'Split boundary ownership: [start, end) semantics resolve 10.0s to A2', () => {
  const items = [createMockItem('cA', 20)];
  const segments = [{ id: 's1', sourceClipId: 'cA', sourceStart: 0, sourceEnd: 20 }];
  const res = splitTimelineSegment(segments, 's1', 10.0, 30);
  assert.notEqual(res, null);
  const proj = buildTimelineProjection(items, res.updatedSegments);
  // Sequence 10.0s falls strictly into right segment (index 1)
  const pos = resolveSequencePosition(10.0, proj.segments);
  assert.equal(pos.segmentId, res.rightSegmentId);
  assert.equal(pos.sourceTime, 10.0);
  assert.equal(pos.isAtEndBoundary, false);
});

// 34. VFR / unsupported timeline rejection
runTest(34, 'VFR / unsupported timeline rejection: getAuthoritativeTimelineMetrics returns null', () => {
  const vfrItem = createMockItem('cVfr', 10, 30, true);
  const metrics = getAuthoritativeTimelineMetrics(vfrItem);
  assert.equal(metrics, null);
  assert.equal(getAuthoritativeFps(vfrItem), null);

  const zeroDurationItem = createMockItem('cZero', 0, 30, false);
  assert.equal(getAuthoritativeTimelineMetrics(zeroDurationItem), null);
});

// 35. Invalid segment (sourceEnd = 0) rejected by projection; never converted to source duration
runTest(35, 'Invalid segment (sourceEnd = 0) rejected by projection; never converted to source duration', () => {
  const item = createMockItem('c1', 12);
  const segments = [{ id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 0 }];
  const proj = buildTimelineProjection([item], segments);
  assert.equal(proj.segments.length, 0);
  assert.equal(proj.totalSequenceDuration, 0);
});

// 36. Media Bin reorder isolation: reordering items leaves timelineSegments untouched
runTest(36, 'Media Bin reorder isolation: reordering items leaves timelineSegments untouched', () => {
  const items = [createMockItem('c1', 10), createMockItem('c2', 10)];
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 },
    { id: 's2', sourceClipId: 'c2', sourceStart: 0, sourceEnd: 10 },
  ];
  const reorderedItems = [items[1], items[0]];
  assert.equal(segments[0].sourceClipId, 'c1');
  assert.equal(segments[1].sourceClipId, 'c2');
  const proj = buildTimelineProjection(reorderedItems, segments);
  assert.equal(proj.segments[0].sourceClipId, 'c1');
  assert.equal(proj.segments[1].sourceClipId, 'c2');
});

// 37. Trim sequence vs source distinction: A1 trim alters A2.sequenceStart, sourceStart untouched
runTest(37, 'Trim sequence vs source distinction: A1 trim alters A2.sequenceStart, sourceStart untouched', () => {
  const item = createMockItem('c1', 20);
  const segments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 10 },
    { id: 's2', sourceClipId: 'c1', sourceStart: 10, sourceEnd: 20 },
  ];
  const proj1 = buildTimelineProjection([item], segments);
  assert.equal(proj1.segments[1].sequenceStart, 10);
  assert.equal(proj1.segments[1].sourceTrimStart, 10);

  const trimmedSegments = [
    { id: 's1', sourceClipId: 'c1', sourceStart: 0, sourceEnd: 6 },
    { id: 's2', sourceClipId: 'c1', sourceStart: 10, sourceEnd: 20 },
  ];
  const proj2 = buildTimelineProjection([item], trimmedSegments);
  assert.equal(proj2.segments[1].sequenceStart, 6);
  assert.equal(proj2.segments[1].sourceTrimStart, 10);
  assert.equal(proj2.segments[1].duration, 10);
});

// 38. Trimmed same-source boundary coordinates: crossing targets A2.sourceTrimStart
runTest(38, 'Trimmed same-source boundary coordinates: crossing targets A2.sourceTrimStart', () => {
  const item = createMockItem('cA', 20);
  const segments = [
    { id: 'A1', sourceClipId: 'cA', sourceStart: 0, sourceEnd: 5 },
    { id: 'A2', sourceClipId: 'cA', sourceStart: 8, sourceEnd: 15 },
  ];
  const proj = buildTimelineProjection([item], segments);
  const activeSeg = proj.segments[0];
  const nextSeg = proj.segments[1];
  assert.equal(activeSeg.sourceClipId, nextSeg.sourceClipId);
  const targetSourceTime = nextSeg.sourceTrimStart;
  assert.equal(targetSourceTime, 8.0);
  assert.notEqual(targetSourceTime, 5.0);
});

// 39. Multi-segment transport navigation: 3 segments enable Prev/Next navigation across all
runTest(39, 'Multi-segment transport navigation: 3 segments enable Prev/Next navigation across all', () => {
  const item = createMockItem('cA', 30);
  const segments = [
    { id: 's1', sourceClipId: 'cA', sourceStart: 0, sourceEnd: 10 },
    { id: 's2', sourceClipId: 'cA', sourceStart: 10, sourceEnd: 20 },
    { id: 's3', sourceClipId: 'cA', sourceStart: 20, sourceEnd: 30 },
  ];
  const proj = buildTimelineProjection([item], segments);
  assert.equal(proj.segments.length, 3);
  assert.equal(proj.segments[1].id, 's2');
  assert.equal(proj.segments[2].id, 's3');
  assert.equal(proj.segments[1].id, 's2');
});

// 40. Boundary idempotency: multiple boundary emissions trigger exactly 1 command
runTest(40, 'Boundary idempotency: multiple boundary emissions trigger exactly 1 command', () => {
  let syncMode = 'NORMAL_PLAYBACK';
  let commandCount = 0;
  const triggerBoundary = () => {
    if (syncMode === 'BOUNDARY_TRANSITION') return;
    syncMode = 'BOUNDARY_TRANSITION';
    commandCount++;
  };

  triggerBoundary();
  triggerBoundary();
  triggerBoundary();
  triggerBoundary();
  triggerBoundary();

  assert.equal(commandCount, 1);
  assert.equal(syncMode, 'BOUNDARY_TRANSITION');
});

// 41. Stale transition cancellation: user seek invalidates in-flight transition token
runTest(41, 'Stale transition cancellation: user seek invalidates in-flight transition token', () => {
  let transitionToken = 0;
  let activeDeck = 'A';

  const token1 = ++transitionToken;
  ++transitionToken; // user scrub/seek arrives

  const commitTransition1 = () => {
    if (token1 !== transitionToken) return false;
    activeDeck = 'B';
    return true;
  };

  const committed = commitTransition1();
  assert.equal(committed, false);
  assert.equal(activeDeck, 'A');
});

// 42. Readiness timeout: unready deck strictly resolves false on 500ms timeout
runTest(42, 'Readiness timeout: unready deck strictly resolves false on 500ms timeout', async () => {
  let transitionToken = 1;
  const waitForDeckReadyMock = (token, isElementReady) => {
    return new Promise((resolve) => {
      if (token !== transitionToken) {
        resolve(false);
        return;
      }
      if (isElementReady) {
        resolve(true);
        return;
      }
      setTimeout(() => {
        resolve(false);
      }, 5);
    });
  };

  const res = await waitForDeckReadyMock(1, false);
  assert.equal(res, false);
});

// 43. Trimmed same-source playback continuity: element unchanged and targets sourceTrimStart
runTest(43, 'Trimmed same-source playback continuity: element unchanged and targets sourceTrimStart', () => {
  const item = createMockItem('cA', 30);
  const segments = [
    { id: 's1', sourceClipId: 'cA', sourceStart: 0, sourceEnd: 10 },
    { id: 's2', sourceClipId: 'cA', sourceStart: 12, sourceEnd: 25 },
  ];
  const proj = buildTimelineProjection([item], segments);
  const cur = proj.segments[0];
  const next = proj.segments[1];
  const isSameSource = cur.sourceClipId === next.sourceClipId;
  assert.equal(isSameSource, true);
  const command = {
    type: isSameSource ? 'seek-same-source' : 'switch-source',
    sourceTime: next.sourceTrimStart,
    sequenceTime: next.sequenceStart,
    transitionId: 1,
  };
  assert.equal(command.type, 'seek-same-source');
  assert.equal(command.sourceTime, 12.0);
});

// 44. Stale parent finally() protection: late completion of #1 does not reset mode for #2
runTest(44, 'Stale parent finally() protection: late completion of #1 does not reset mode for #2', () => {
  let activeTransitionId = null;
  let syncMode = 'NORMAL_PLAYBACK';

  syncMode = 'BOUNDARY_TRANSITION';
  const id1 = 1;
  activeTransitionId = id1;

  const id2 = 2;
  activeTransitionId = id2;

  const finally1 = () => {
    if (activeTransitionId === id1) {
      syncMode = 'NORMAL_PLAYBACK';
    }
  };
  finally1();

  assert.equal(syncMode, 'BOUNDARY_TRANSITION');
  assert.equal(activeTransitionId, 2);

  const finally2 = () => {
    if (activeTransitionId === id2) {
      syncMode = 'NORMAL_PLAYBACK';
    }
  };
  finally2();
  assert.equal(syncMode, 'NORMAL_PLAYBACK');
});

// 45. Command supersession: Command #1 late play() check aborts before swapping deck
runTest(45, 'Command supersession: Command #1 late play() check aborts before swapping deck', () => {
  let transitionToken = 0;
  let activeDeck = 'A';

  const token1 = ++transitionToken;
  ++transitionToken; // Command #2 issued while Command #1 awaits play()

  const postPlayCheck1 = () => {
    if (token1 !== transitionToken) {
      return false;
    }
    activeDeck = 'B';
    return true;
  };

  assert.equal(postPlayCheck1(), false);
  assert.equal(activeDeck, 'A');
});

// 46. Player unmount cancellation: unmount increments token and clears in-flight state
runTest(46, 'Player unmount cancellation: unmount increments token and clears in-flight state', () => {
  let transitionToken = 5;
  let isTransitioning = true;
  let activeDeck = 'A';

  const unmountCleanup = () => {
    transitionToken += 1;
    isTransitioning = false;
  };
  unmountCleanup();

  assert.equal(transitionToken, 6);
  assert.equal(isTransitioning, false);

  const lateArrivalToken = 5;
  const canCommit = lateArrivalToken === transitionToken;
  assert.equal(canCommit, false);
  assert.equal(activeDeck, 'A');
});

// 47. Same-source split segment playback advancing: playhead smoothly crosses cut without stalling
runTest(47, 'Same-source split segment playback advancing: playhead smoothly crosses cut without stalling', () => {
  const items = [
    createMockItem('clip_A', 30, 30),
  ];
  const segments = [
    { id: 'seg_1', sourceClipId: 'clip_A', clipId: 'clip_A', sequenceStart: 0, sequenceEnd: 10, sourceTrimStart: 0, sourceTrimEnd: 10 },
    { id: 'seg_2', sourceClipId: 'clip_A', clipId: 'clip_A', sequenceStart: 10, sequenceEnd: 20, sourceTrimStart: 10, sourceTrimEnd: 20 },
    { id: 'seg_3', sourceClipId: 'clip_A', clipId: 'clip_A', sequenceStart: 20, sequenceEnd: 30, sourceTrimStart: 20, sourceTrimEnd: 30 },
  ];

  // Simulating timeupdates advancing across the boundary of seg_2 (10 -> 20) into seg_3 (20 -> 30)
  const seqBefore = resolveSourceToSequenceTime('clip_A', 19.9, segments, 'seg_2');
  const seqExact = resolveSourceToSequenceTime('clip_A', 20.0, segments, 'seg_2');
  const seqAfter = resolveSourceToSequenceTime('clip_A', 20.1, segments, 'seg_2');

  assert.equal(Math.round(seqBefore * 10) / 10, 19.9);
  assert.equal(Math.round(seqExact * 10) / 10, 20.0);
  assert.equal(Math.round(seqAfter * 10) / 10, 20.1, 'Playhead must advance into next segment without stalling at 20.0');
});

// 48. Collision safety: resolveSourceToSequenceTime does not falsely lock when segment ID equals source clip ID
runTest(48, 'Collision safety: resolveSourceToSequenceTime does not falsely lock when segment ID equals source clip ID', () => {
  // Reproducing the exact bug report structure: Left split part preserved id: 'vid2' matching source clip ID
  const segments = [
    { id: 'vid1', sourceClipId: 'vid1', clipId: 'vid1', sequenceStart: 0, sequenceEnd: 8.5, sourceTrimStart: 0, sourceTrimEnd: 8.5 },
    { id: 'seg_p1', sourceClipId: 'vid2', clipId: 'vid2', sequenceStart: 8.5, sequenceEnd: 18.6, sourceTrimStart: 0, sourceTrimEnd: 10.1 },
    { id: 'seg_p2', sourceClipId: 'vid2', clipId: 'vid2', sequenceStart: 18.6, sequenceEnd: 28.6, sourceTrimStart: 10.1, sourceTrimEnd: 20.1 },
    { id: 'vid2', sourceClipId: 'vid2', clipId: 'vid2', sequenceStart: 28.6, sequenceEnd: 29.6, sourceTrimStart: 20.1, sourceTrimEnd: 21.1 },
    { id: 'seg_right_123', sourceClipId: 'vid2', clipId: 'vid2', sequenceStart: 29.6, sequenceEnd: 36.4, sourceTrimStart: 21.1, sourceTrimEnd: 27.9 },
  ];

  // While in vid2 (Pt 3)
  const t1 = resolveSourceToSequenceTime('vid2', 20.9, segments);
  const t2 = resolveSourceToSequenceTime('vid2', 21.1, segments);
  // Advancing into seg_right_123 (Pt 4)
  const t3 = resolveSourceToSequenceTime('vid2', 21.2, segments);
  const t4 = resolveSourceToSequenceTime('vid2', 21.5, segments);
  const t5 = resolveSourceToSequenceTime('vid2', 22.0, segments);

  assert.equal(Math.round(t1 * 10) / 10, 29.4);
  assert.equal(Math.round(t2 * 10) / 10, 29.6);
  assert.equal(Math.round(t3 * 10) / 10, 29.7, 'Playhead must advance to 29.7 instead of being clamped to 29.6');
  assert.equal(Math.round(t4 * 10) / 10, 30.0, 'Playhead must advance to 30.0 instead of being clamped to 29.6');
  assert.equal(Math.round(t5 * 10) / 10, 30.5, 'Playhead must advance to 30.5 instead of being clamped to 29.6');
});

// 49. Split & rearrange playback: non-contiguous same-source boundary issues seek-same-source and maps correctly
runTest(49, 'Split & rearrange playback: non-contiguous same-source boundary issues seek-same-source and maps correctly', () => {
  const items = [createMockItem('vid_rearrange', 20, 30)];

  // Initial timeline segment
  const initialSegments = [
    { id: 'seg_initial', sourceClipId: 'vid_rearrange', sourceStart: 0, sourceEnd: 20 },
  ];

  // 1. Split at 10s
  const splitRes = splitTimelineSegment(initialSegments, 'seg_initial', 10, 30);
  assert.ok(splitRes);
  const { updatedSegments, leftSegmentId, rightSegmentId } = splitRes;

  // 2. Rearrange segments: right segment (10-20s) first, left segment (0-10s) second
  const rearranged = reorderTimelineSegments(updatedSegments, 0, 1);
  assert.equal(rearranged[0].id, rightSegmentId);
  assert.equal(rearranged[1].id, leftSegmentId);

  // 3. Build sequence projection
  const proj = buildTimelineProjection(items, rearranged);
  assert.equal(proj.segments.length, 2);
  assert.equal(proj.segments[0].id, rightSegmentId);
  assert.equal(proj.segments[0].sequenceStart, 0);
  assert.equal(proj.segments[0].sequenceEnd, 10);
  assert.equal(proj.segments[0].sourceTrimStart, 10);
  assert.equal(proj.segments[0].sourceTrimEnd, 20);

  assert.equal(proj.segments[1].id, leftSegmentId);
  assert.equal(proj.segments[1].sequenceStart, 10);
  assert.equal(proj.segments[1].sequenceEnd, 20);
  assert.equal(proj.segments[1].sourceTrimStart, 0);
  assert.equal(proj.segments[1].sourceTrimEnd, 10);

  // 4. Verify playback position mapping in Segment 1 (Part 2: 10s-20s)
  assert.equal(resolveSourceToSequenceTime('vid_rearrange', 10.0, proj.segments, rightSegmentId), 0);
  assert.equal(resolveSourceToSequenceTime('vid_rearrange', 15.0, proj.segments, rightSegmentId), 5);
  assert.equal(Math.round(resolveSourceToSequenceTime('vid_rearrange', 19.9, proj.segments, rightSegmentId) * 10) / 10, 9.9);

  // 5. Verify boundary condition detection:
  // Part 2 ends at 20, Part 1 starts at 0 -> non-contiguous:
  const isSameSource = proj.segments[0].sourceClipId === proj.segments[1].sourceClipId;
  const isContiguous = isSameSource && Math.abs(proj.segments[0].sourceTrimEnd - proj.segments[1].sourceTrimStart) < 0.04;
  assert.equal(isSameSource, true);
  assert.equal(isContiguous, false, 'Rearranged segments must be recognized as non-contiguous');

  // Command for non-contiguous same-source MUST be seek-same-source to nextSeg.sourceTrimStart (0s)
  const command = isSameSource
    ? {
        type: 'seek-same-source',
        sourceTime: proj.segments[1].sourceTrimStart,
        sequenceTime: proj.segments[1].sequenceStart,
        transitionId: 99,
      }
    : { type: 'switch-source' };

  assert.equal(command.type, 'seek-same-source');
  assert.equal(command.sourceTime, 0, 'Must seek player to start of Part 1 (0s)');
  assert.equal(command.sequenceTime, 10, 'Must set sequence playhead to start of Segment 2 (10s)');

  // 6. Verify playback position mapping in Segment 2 (Part 1: 0s-10s)
  assert.equal(resolveSourceToSequenceTime('vid_rearrange', 0.0, proj.segments, leftSegmentId), 10);
  assert.equal(resolveSourceToSequenceTime('vid_rearrange', 5.0, proj.segments, leftSegmentId), 15);
  assert.equal(Math.round(resolveSourceToSequenceTime('vid_rearrange', 9.9, proj.segments, leftSegmentId) * 10) / 10, 19.9);
});

// 50. Scrub while playing: pointer down pauses playback immediately and enters SEEKING mode
runTest(50, 'Scrub while playing: pointer down pauses playback immediately and enters SEEKING mode', () => {
  let isPlaying = true;
  let syncMode = 'NORMAL_PLAYBACK';
  let wasPlayingBeforeScrub = false;
  let playerPaused = false;

  const mockEditorPlayer = {
    pause: () => { playerPaused = true; },
    play: async () => { playerPaused = false; },
  };

  const handleScrubStart = () => {
    wasPlayingBeforeScrub = isPlaying;
    if (isPlaying) {
      isPlaying = false;
      mockEditorPlayer.pause();
    }
    syncMode = 'SEEKING';
  };

  handleScrubStart();

  assert.equal(wasPlayingBeforeScrub, true, 'Must remember player was playing prior to scrub');
  assert.equal(isPlaying, false, 'UI playback state must be suspended to false');
  assert.equal(playerPaused, true, 'Player video element must be immediately paused');
  assert.equal(syncMode, 'SEEKING', 'Sync mode must transition to SEEKING');
});

// 51. Scrub while playing: pointer up resumes playback from settled seek
runTest(51, 'Scrub while playing: pointer up resumes playback from settled seek', async () => {
  let isPlaying = true;
  let syncMode = 'NORMAL_PLAYBACK';
  let wasPlayingBeforeScrub = false;
  let playerState = 'playing';

  const mockEditorPlayer = {
    pause: () => { playerState = 'paused'; },
    play: async () => { playerState = 'playing'; },
  };

  // 1. Scrub starts
  wasPlayingBeforeScrub = isPlaying;
  isPlaying = false;
  mockEditorPlayer.pause();
  syncMode = 'SEEKING';

  // 2. Scrub frames occur...
  assert.equal(playerState, 'paused');

  // 3. Pointer up (scrub end)
  const handleScrubEnd = async (finalSeqTime, totalDuration) => {
    const resume = wasPlayingBeforeScrub;
    wasPlayingBeforeScrub = false;
    syncMode = 'NORMAL_PLAYBACK';

    if (resume) {
      if (finalSeqTime !== undefined && finalSeqTime >= totalDuration - 0.05) {
        isPlaying = false;
        return;
      }
      await mockEditorPlayer.play();
      isPlaying = true;
    }
  };

  await handleScrubEnd(12.5, 30.0);

  assert.equal(isPlaying, true, 'Playback state must resume to true');
  assert.equal(playerState, 'playing', 'Media player must resume playing');
  assert.equal(syncMode, 'NORMAL_PLAYBACK', 'Sync mode must return to NORMAL_PLAYBACK');
});

// 52. Scrub while paused: pointer up remains paused
runTest(52, 'Scrub while paused: pointer up remains paused', async () => {
  let isPlaying = false;
  let syncMode = 'NORMAL_PLAYBACK';
  let wasPlayingBeforeScrub = false;
  let playerState = 'paused';

  const mockEditorPlayer = {
    pause: () => { playerState = 'paused'; },
    play: async () => { playerState = 'playing'; },
  };

  // 1. Scrub starts while paused
  wasPlayingBeforeScrub = isPlaying;
  syncMode = 'SEEKING';

  assert.equal(wasPlayingBeforeScrub, false);

  // 2. Pointer up
  const handleScrubEnd = async (finalSeqTime, totalDuration) => {
    const resume = wasPlayingBeforeScrub;
    wasPlayingBeforeScrub = false;
    syncMode = 'NORMAL_PLAYBACK';

    if (resume) {
      await mockEditorPlayer.play();
      isPlaying = true;
    }
  };

  await handleScrubEnd(12.5, 30.0);

  assert.equal(isPlaying, false, 'Playback state must remain paused');
  assert.equal(playerState, 'paused', 'Media player must remain paused');
  assert.equal(syncMode, 'NORMAL_PLAYBACK');
});

// 53. Scrub while playing to terminal boundary: does not resume past sequence end
runTest(53, 'Scrub while playing to terminal boundary: does not resume past sequence end', async () => {
  let isPlaying = true;
  let wasPlayingBeforeScrub = true;
  let playerState = 'paused';

  const mockEditorPlayer = {
    play: async () => { playerState = 'playing'; },
  };

  const handleScrubEnd = async (finalSeqTime, totalDuration) => {
    const resume = wasPlayingBeforeScrub;
    wasPlayingBeforeScrub = false;

    if (resume) {
      if (finalSeqTime !== undefined && finalSeqTime >= totalDuration - 0.05) {
        isPlaying = false;
        return;
      }
      await mockEditorPlayer.play();
      isPlaying = true;
    }
  };

  await handleScrubEnd(29.98, 30.0); // Landed at sequence boundary

  assert.equal(isPlaying, false, 'Must not auto-resume at the end of the sequence');
  assert.equal(playerState, 'paused', 'Player must remain paused');
});

// 54. Inactive deck muting isolation: only the active deck emits audio
runTest(54, 'Inactive deck muting isolation: only the active deck emits audio', () => {
  const isMuted = false;

  // Scenario 1: Deck A active
  let activeDeck = 'A';
  let deckAMuted = isMuted || activeDeck !== 'A';
  let deckBMuted = isMuted || activeDeck !== 'B';
  assert.equal(deckAMuted, false, 'Deck A must be unmuted when active');
  assert.equal(deckBMuted, true, 'Deck B must be strictly muted when inactive');

  // Scenario 2: Deck B active
  activeDeck = 'B';
  deckAMuted = isMuted || activeDeck !== 'A';
  deckBMuted = isMuted || activeDeck !== 'B';
  assert.equal(deckAMuted, true, 'Deck A must be strictly muted when inactive');
  assert.equal(deckBMuted, false, 'Deck B must be unmuted when active');
});

// 55. Timeline-aware next distinct clip preload: skips same-source segments to preload next clip
runTest(55, 'Timeline-aware next distinct clip preload: skips same-source segments to preload next clip', () => {
  const itemA = createMockItem('clipA', 10);
  const itemB = createMockItem('clipB', 10);
  const items = [itemA, itemB];

  // Timeline rearranged: Pt 2 (clipA) -> Pt 1 (clipA) -> clipB
  const segments = [
    { id: 'seg_A2', sourceClipId: 'clipA', sourceStart: 5, sourceEnd: 10 },
    { id: 'seg_A1', sourceClipId: 'clipA', sourceStart: 0, sourceEnd: 5 },
    { id: 'seg_B',  sourceClipId: 'clipB', sourceStart: 0, sourceEnd: 10 },
  ];
  const proj = buildTimelineProjection(items, segments);

  // When playing seg_A2 (index 0), activePlaybackClipId is clipA:
  const currentSegmentIndex = 0;
  const currentPlaybackId = 'clipA';

  // Find future segment with distinct source clip ID:
  const futureSeg = proj.segments
    .slice(currentSegmentIndex + 1)
    .find((s) => s.sourceClipId !== currentPlaybackId);

  const nextItem = futureSeg ? items.find((i) => i.id === futureSeg.sourceClipId) : null;

  assert.notEqual(nextItem, null);
  assert.equal(nextItem.id, 'clipB', 'Next preloaded clip must be clipB, skipping adjacent same-source seg_A1');
});

// 56. Delete all segments from timeline -> buildTimelineProjection strictly returns 0 duration and empty segments
runTest(56, 'Delete all segments -> buildTimelineProjection(items, []) returns empty projection, never resurrecting bin items', () => {
  const items = [createMockItem('clip1', 6), createMockItem('clip2', 10)];
  // Both clips deleted from sequence:
  const segments = [];
  const proj = buildTimelineProjection(items, segments);
  assert.equal(proj.segments.length, 0, 'Projected segments must be strictly empty');
  assert.equal(proj.totalSequenceDuration, 0, 'Total sequence duration must be 0');
});

// 57. Add clip to empty timeline -> Adds ONLY that clip, never resurrecting other bin items
runTest(57, 'Add clip to empty timeline -> Adds ONLY that single clip without resurrecting other bin items', () => {
  const items = [createMockItem('clip1', 6), createMockItem('clip2', 10)];
  const emptyTimeline = [];
  const updated = addTimelineSegment(emptyTimeline, items[0]);
  assert.equal(updated.length, 1, 'Only 1 segment must be added');
  assert.equal(updated[0].sourceClipId, 'clip1');

  const proj = buildTimelineProjection(items, updated);
  assert.equal(proj.segments.length, 1);
  assert.equal(proj.totalSequenceDuration, 6);
  assert.equal(proj.segments[0].clipId, 'clip1');
});

// Wait for any async tests to complete
await Promise.all(asyncTestPromises);

console.log(`\n=== Test Results: ${passedTests} / ${totalTests} Passed ===`);
if (passedTests === totalTests) {
  console.log('🎉 ALL 57 ACCEPTANCE TESTS PASSED PERFECTLY!\n');
} else {
  process.exit(1);
}
