import type { BatchVideoItem } from './batchTypes';

/**
 * Editorial timeline segment referencing immutable source media.
 * Source coordinates are strictly independent of sequence coordinates.
 */
export interface TimelineSegment {
  id: string;            // Stable unique identity (crypto.randomUUID())
  sourceClipId: string;  // References immutable source media (BatchVideoItem.id)
  sourceStart: number;   // Source in-point in seconds (inclusive)
  sourceEnd: number;     // Source out-point in seconds (exclusive)
  minSourceLimit?: number; // Clamped lower limit for trim operations
  maxSourceLimit?: number; // Clamped upper limit for trim operations
}

export interface ClipTimelineSegment {
  id: string;            // Unique segment identity
  clipId: string;        // Source media ID (BatchVideoItem.id) for backward compatibility
  sourceClipId: string;  // Explicit source media reference
  index: number;         // Order in timeline sequence
  sequenceStart: number; // in seconds (inclusive)
  sequenceEnd: number;   // in seconds (exclusive: [start, end))
  duration: number;      // effective trimmed duration: sourceTrimEnd - sourceTrimStart
  sourceTrimStart: number; // Source start time (inclusive)
  sourceTrimEnd: number;   // Source end time (exclusive)
  minSourceLimit?: number; // Clamped lower limit for trim operations
  maxSourceLimit?: number; // Clamped upper limit for trim operations
}

export interface TimelinePosition {
  sequenceTime: number;
  segmentId: string;
  clipId: string;
  sourceTime: number;
  segmentIndex: number;
  isAtEndBoundary: boolean;
}

export interface TimelineProjection {
  segments: ClipTimelineSegment[];
  totalSequenceDuration: number;
}

export interface SplitResult {
  updatedSegments: TimelineSegment[];
  leftSegmentId: string;
  rightSegmentId: string;
  cutSourceTime: number;
}

/**
 * Builds an immutable, pure timeline projection from either explicit TimelineSegments
 * or falls back to items (1:1 item-to-segment mapping for backward compatibility).
 *
 * Enforces strict [start, end) interval stacking without gaps.
 */
export function buildTimelineProjection(
  items: BatchVideoItem[],
  segments?: TimelineSegment[]
): TimelineProjection {
  if (!items || items.length === 0) {
    return { segments: [], totalSequenceDuration: 0 };
  }

  const itemsMap = new Map<string, BatchVideoItem>();
  for (const it of items) {
    itemsMap.set(it.id, it);
  }

  const projSegments: ClipTimelineSegment[] = [];
  let accumulatedSequenceTime = 0;

  // Branch A: Explicit editorial TimelineSegments provided (respects empty timeline [])
  if (segments !== undefined) {
    if (segments.length === 0) {
      return {
        segments: [],
        totalSequenceDuration: 0,
      };
    }

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const sourceItem = itemsMap.get(seg.sourceClipId);
      if (!sourceItem) continue;

      const sourceDuration = sourceItem.metadata?.duration;
      if (typeof sourceDuration !== 'number' || sourceDuration <= 0 || !Number.isFinite(sourceDuration)) {
        continue;
      }

      // Clamp segment bounds safely to source duration
      let start = Math.max(0, Math.min(sourceDuration, seg.sourceStart));
      let end = Math.max(0, Math.min(sourceDuration, seg.sourceEnd));

      if (end <= start) {
        continue; // Discard invalid or zero-duration segments
      }

      const duration = end - start;
      const sequenceStart = accumulatedSequenceTime;
      const sequenceEnd = sequenceStart + duration;

      projSegments.push({
        id: seg.id,
        clipId: seg.sourceClipId,
        sourceClipId: seg.sourceClipId,
        index: projSegments.length,
        sequenceStart,
        sequenceEnd,
        duration,
        sourceTrimStart: start,
        sourceTrimEnd: end,
        minSourceLimit: seg.minSourceLimit,
        maxSourceLimit: seg.maxSourceLimit,
      });

      accumulatedSequenceTime = sequenceEnd;
    }

    return {
      segments: projSegments,
      totalSequenceDuration: accumulatedSequenceTime,
    };
  }

  // Branch B: Backward-compatible 1:1 item mapping
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sourceDuration = item.metadata?.duration;

    if (typeof sourceDuration !== 'number' || sourceDuration <= 0 || !Number.isFinite(sourceDuration)) {
      continue;
    }

    let trimStart = item.trimRange?.start ?? 0;
    let trimEnd = item.trimRange?.end ?? sourceDuration;

    trimStart = Math.max(0, Math.min(sourceDuration, trimStart));
    trimEnd = Math.max(0, Math.min(sourceDuration, trimEnd));

    if (trimEnd <= trimStart) {
      trimStart = 0;
      trimEnd = sourceDuration;
    }

    const duration = trimEnd - trimStart;
    if (duration <= 0) {
      continue;
    }

    const sequenceStart = accumulatedSequenceTime;
    const sequenceEnd = sequenceStart + duration;

    projSegments.push({
      id: item.id,
      clipId: item.id,
      sourceClipId: item.id,
      index: projSegments.length,
      sequenceStart,
      sequenceEnd,
      duration,
      sourceTrimStart: trimStart,
      sourceTrimEnd: trimEnd,
    });

    accumulatedSequenceTime = sequenceEnd;
  }

  return {
    segments: projSegments,
    totalSequenceDuration: accumulatedSequenceTime,
  };
}

/**
 * Maps a continuous sequence timestamp to a specific timeline segment and source timestamp
 * using strict [start, end) half-open interval semantics.
 *
 * Boundary ownership: At an exact cut boundary `T` between Segment A and Segment B,
 * `T` belongs deterministically to Segment B.
 */
export function resolveSequencePosition(
  sequenceTime: number,
  segments: ClipTimelineSegment[]
): TimelinePosition | null {
  if (!segments || segments.length === 0) {
    return null;
  }

  if (typeof sequenceTime !== 'number' || !Number.isFinite(sequenceTime)) {
    return null;
  }

  const totalDuration = segments[segments.length - 1].sequenceEnd;

  // Clamp sequenceTime to [0, totalDuration]
  const clampedTime = Math.max(0, Math.min(totalDuration, sequenceTime));

  // Boundary condition at exact sequence end
  if (clampedTime >= totalDuration) {
    const lastSegment = segments[segments.length - 1];
    return {
      sequenceTime: totalDuration,
      segmentId: lastSegment.id,
      clipId: lastSegment.sourceClipId || lastSegment.clipId,
      sourceTime: lastSegment.sourceTrimEnd,
      segmentIndex: lastSegment.index,
      isAtEndBoundary: true,
    };
  }

  // Find segment using strict [start, end) semantics: start <= clampedTime < end
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (clampedTime >= seg.sequenceStart && clampedTime < seg.sequenceEnd) {
      const offsetWithinSegment = clampedTime - seg.sequenceStart;
      const sourceTime = seg.sourceTrimStart + offsetWithinSegment;
      return {
        sequenceTime: clampedTime,
        segmentId: seg.id,
        clipId: seg.sourceClipId || seg.clipId,
        sourceTime,
        segmentIndex: seg.index,
        isAtEndBoundary: false,
      };
    }
  }

  // Fallback for edge precision: return last segment
  const lastSegment = segments[segments.length - 1];
  return {
    sequenceTime: clampedTime,
    segmentId: lastSegment.id,
    clipId: lastSegment.sourceClipId || lastSegment.clipId,
    sourceTime: lastSegment.sourceTrimEnd,
    segmentIndex: lastSegment.index,
    isAtEndBoundary: clampedTime >= totalDuration,
  };
}

/**
 * Maps a source timestamp to continuous sequence time.
 * Searches by active/preferred segment ID first (with contiguous forward crossing support);
 * falls back to matching by sourceClipId using strict [start, end) interval containment.
 */
export function resolveSourceToSequenceTime(
  clipOrSegmentId: string,
  sourceTime: number,
  segments: ClipTimelineSegment[],
  preferredSegmentId?: string | null
): number | null {
  if (!segments || segments.length === 0) {
    return null;
  }

  if (typeof sourceTime !== 'number' || !Number.isFinite(sourceTime)) {
    return null;
  }

  // 1. If preferredSegmentId is provided, check it and adjacent segments first
  if (preferredSegmentId) {
    const prefIdx = segments.findIndex((s) => s.id === preferredSegmentId);
    if (prefIdx !== -1) {
      const prefSeg = segments[prefIdx];
      // Within active segment? [start, end)
      if (sourceTime >= prefSeg.sourceTrimStart && sourceTime < prefSeg.sourceTrimEnd) {
        return prefSeg.sequenceStart + (sourceTime - prefSeg.sourceTrimStart);
      }
      // Crossed forward into next contiguous segment of same source clip?
      if (sourceTime >= prefSeg.sourceTrimEnd && prefIdx < segments.length - 1) {
        const nextSeg = segments[prefIdx + 1];
        const sameSource =
          (nextSeg.sourceClipId && prefSeg.sourceClipId && nextSeg.sourceClipId === prefSeg.sourceClipId) ||
          (nextSeg.clipId && prefSeg.clipId && nextSeg.clipId === prefSeg.clipId);

        if (
          sameSource &&
          sourceTime >= nextSeg.sourceTrimStart &&
          (sourceTime < nextSeg.sourceTrimEnd || prefIdx + 1 === segments.length - 1)
        ) {
          const clamped = Math.min(nextSeg.sourceTrimEnd, sourceTime);
          return nextSeg.sequenceStart + (clamped - nextSeg.sourceTrimStart);
        }
      }
    }
  }

  // 2. Direct segment ID match (only valid if sourceTime is actually within this segment's bounds)
  const directSeg = segments.find((s) => s.id === clipOrSegmentId);
  if (
    directSeg &&
    sourceTime >= directSeg.sourceTrimStart &&
    sourceTime <= directSeg.sourceTrimEnd
  ) {
    return directSeg.sequenceStart + (sourceTime - directSeg.sourceTrimStart);
  }

  // 3. Search matching segments by sourceClipId with [start, end) containment
  const matching = segments.filter(
    (s) => s.sourceClipId === clipOrSegmentId || s.clipId === clipOrSegmentId
  );

  if (matching.length === 0) {
    return null;
  }

  // Find segment containing sourceTime using [start, end) semantics
  for (let i = 0; i < matching.length; i++) {
    const s = matching[i];
    const isLast = i === matching.length - 1;
    if (
      sourceTime >= s.sourceTrimStart &&
      (sourceTime < s.sourceTrimEnd || (isLast && sourceTime <= s.sourceTrimEnd))
    ) {
      return s.sequenceStart + (sourceTime - s.sourceTrimStart);
    }
  }

  // 4. Fallback: clamp to closest matching segment
  const first = matching[0];
  if (sourceTime < first.sourceTrimStart) {
    return first.sequenceStart;
  }
  const last = matching[matching.length - 1];
  return last.sequenceEnd;
}

/**
 * Pure frame-index space split operation.
 *
 * Validates that `sourceStartFrame < cutFrame < sourceEndFrame`.
 * Returns null if cut is outside or at exact boundaries, if FPS is invalid,
 * or if the target segment cannot be found.
 */
export function splitTimelineSegment(
  segments: TimelineSegment[],
  targetSegmentId: string,
  cutSourceTime: number,
  fps: number
): SplitResult | null {
  if (!fps || fps <= 0 || !Number.isFinite(cutSourceTime)) {
    return null;
  }

  const segIndex = segments.findIndex((s) => s.id === targetSegmentId);
  if (segIndex === -1) return null;

  const target = segments[segIndex];

  // 1. Frame-index validation with frame-normalized boundaries
  const sourceStartFrame = Math.round(target.sourceStart * fps);
  const sourceEndFrame = Math.round(target.sourceEnd * fps);
  const cutFrame = Math.round(cutSourceTime * fps);

  // Require strictly: sourceStartFrame < cutFrame < sourceEndFrame (at least 1 full frame on each side)
  if (cutFrame <= sourceStartFrame || cutFrame >= sourceEndFrame) {
    return null;
  }

  // 2. Derive exact frame timestamp
  const exactCutTime = cutFrame / fps;

  const leftSegmentId = target.id;
  const rightSegmentId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `seg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // 3. Construct frame-normalized segments with clamped trim limits
  const segmentA: TimelineSegment = {
    ...target,
    id: leftSegmentId,
    sourceStart: sourceStartFrame / fps,
    sourceEnd: exactCutTime,
    minSourceLimit: target.minSourceLimit ?? (sourceStartFrame / fps),
    maxSourceLimit: exactCutTime, // Trim cannot extend beyond split cut
  };

  const segmentB: TimelineSegment = {
    id: rightSegmentId,
    sourceClipId: target.sourceClipId,
    sourceStart: exactCutTime,
    sourceEnd: sourceEndFrame / fps,
    minSourceLimit: exactCutTime, // Trim cannot extend before split cut
    maxSourceLimit: target.maxSourceLimit ?? (sourceEndFrame / fps),
  };

  const updatedSegments = [...segments];
  updatedSegments.splice(segIndex, 1, segmentA, segmentB);

  return {
    updatedSegments,
    leftSegmentId,
    rightSegmentId,
    cutSourceTime: exactCutTime,
  };
}

/**
 * Adds a source clip as a new timeline segment.
 * Appends to the end of timeline segments (or inserts at target index).
 * Leaves underlying source media completely untouched.
 */
export function addTimelineSegment(
  currentSegments: TimelineSegment[],
  sourceItem: BatchVideoItem,
  insertIndex?: number
): TimelineSegment[] {
  const duration = sourceItem.metadata?.duration || 1;
  const trimStart = sourceItem.trimRange?.start ?? 0;
  const trimEnd = sourceItem.trimRange?.end ?? duration;
  const newSegment: TimelineSegment = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceClipId: sourceItem.id,
    sourceStart: trimStart,
    sourceEnd: trimEnd,
    minSourceLimit: 0,
    maxSourceLimit: duration,
  };

  const updated = [...currentSegments];
  if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= updated.length) {
    updated.splice(insertIndex, 0, newSegment);
  } else {
    updated.push(newSegment);
  }
  return updated;
}

/**
 * Removes a specific segment from timeline segments.
 * Automatic gap closure occurs when projection is rebuilt.
 * Leaves underlying source media completely untouched.
 */
export function removeTimelineSegment(
  segments: TimelineSegment[],
  segmentId: string
): TimelineSegment[] {
  return segments.filter((s) => s.id !== segmentId);
}

/**
 * Reorders timeline segments without duplicating or modifying underlying media.
 */
export function reorderTimelineSegments(
  segments: TimelineSegment[],
  startIndex: number,
  endIndex: number
): TimelineSegment[] {
  if (startIndex === endIndex) return segments;
  if (startIndex < 0 || startIndex >= segments.length) return segments;
  if (endIndex < 0 || endIndex >= segments.length) return segments;

  const result = Array.from(segments);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

/**
 * Converts a clientX pointer coordinate to sequence time, accounting for the
 * horizontal scrollContainer's viewport bounds and scrollLeft offset.
 */
export function screenXToSequenceTime(
  clientX: number,
  scrollContainer: HTMLElement,
  pixelsPerSecond: number,
  totalSequenceDuration: number,
  fps?: number | null
): number {
  if (!scrollContainer || pixelsPerSecond <= 0) {
    return 0;
  }

  const rect = scrollContainer.getBoundingClientRect();
  const timelineX = clientX - rect.left + scrollContainer.scrollLeft;
  const rawTime = timelineX / pixelsPerSecond;
  const clamped = Math.max(0, Math.min(totalSequenceDuration, rawTime));

  if (fps && fps > 0) {
    return Math.round(clamped * fps) / fps;
  }

  return clamped;
}

/**
 * Centralized guard checking whether an active event target is an editable form element
 * to protect studio keyboard shortcuts from interfering with typing.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}
