import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  Mp4OutputFormat,
  Output,
} from 'mediabunny';
import {
  BatchVideoItem,
  PreflightCompatibility,
  EstablishedMergeContract,
  StandardMergeContract,
} from './batchTypes';

/**
 * Product safety ceiling: 100 MB maximum final buffer output.
 * Mediabunny recommends BufferTarget for <100 MB outputs to prevent in-memory browser tab crashes.
 */
export const MAX_BUFFER_OUTPUT_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Establishes the batch-wide output merge contract from Clip 0 (or first analyzed clip).
 * Normalizes to even dimensions and clamps frame rate to [24, 60].
 */
export function deriveBatchMergeContract(items: BatchVideoItem[]): StandardMergeContract | null {
  const refItem = items.find((i) => i.metadata && i.metadata.width > 0);
  if (!refItem || !refItem.metadata) return null;

  const rawWidth = refItem.metadata.width;
  const rawHeight = refItem.metadata.height;
  const width = rawWidth % 2 === 0 ? rawWidth : rawWidth - 1;
  const height = rawHeight % 2 === 0 ? rawHeight : rawHeight - 1;
  const frameRate = Math.min(60, Math.max(24, Math.round(refItem.metadata.frameRate) || 30));
  const hasAudio = items.some((i) => i.audioInfo?.hasAudio);

  return {
    video: {
      codec: 'avc1.640028',
      width,
      height,
      frameRate,
    },
    audio: {
      hasAudio,
      codec: 'mp4a.40.2',
      sampleRate: 48000,
      numberOfChannels: 2,
    },
  };
}

/**
 * Checks whether an item's original stream is strictly compatible with the batch merge contract
 * to qualify for fast 0-re-encode passthrough (Path A).
 */
export function isStreamContractCompatible(
  item: BatchVideoItem,
  contract: StandardMergeContract
): boolean {
  if (!item.metadata) return false;
  if (item.metadata.width !== contract.video.width || item.metadata.height !== contract.video.height) {
    return false;
  }
  if (Math.abs(item.metadata.frameRate - contract.video.frameRate) > 1.5) {
    return false;
  }
  if (!item.metadata.codec?.toLowerCase().startsWith('avc')) {
    return false;
  }
  if (contract.audio.hasAudio) {
    if (!item.audioInfo?.hasAudio) return false;
    if (!item.audioInfo.codec?.toLowerCase().startsWith('mp4a')) return false;
  }
  return true;
}

/**
 * Calculates estimated source bytes, total effective duration, and projected output size.
 * Accurately accounts for clip trims.
 */
export function estimateOutputMetrics(items: BatchVideoItem[]) {
  const estimatedSourceSize = items.reduce((acc, item) => acc + (item.file?.size || 0), 0);
  const estimatedDuration = items.reduce((acc, item) => {
    if (item.trimRange) {
      return acc + Math.max(0, item.trimRange.end - item.trimRange.start);
    }
    return acc + (item.metadata?.duration || 0);
  }, 0);

  // Approximate 12 Mbps AVC video + 128 kbps AAC audio = ~1.52 MB/sec
  const projectedFromDuration = estimatedDuration > 0
    ? Math.round(estimatedDuration * 1_520_000)
    : estimatedSourceSize;

  const estimatedOutputSize = Math.max(projectedFromDuration, Math.round(estimatedSourceSize * 0.9));
  const isLargeBatch = estimatedOutputSize > 50 * 1024 * 1024; // > 50 MB notice
  const isExceedingBudget = estimatedOutputSize > MAX_BUFFER_OUTPUT_BYTES; // > 100 MB ceiling

  return {
    estimatedSourceSize,
    estimatedDuration,
    estimatedOutputSize,
    isLargeBatch,
    isExceedingBudget,
  };
}

/**
 * Runs fast preflight compatibility checks before processing begins:
 * - Requires at least 2 videos.
 * - Validates trim ranges (end > start).
 * - Flags unresolved uncertain watermark states.
 * - Derives batch contract from Clip 0.
 * - Enforces the 100 MB output budget ceiling.
 */
export function checkPreflightCompatibility(items: BatchVideoItem[]): PreflightCompatibility {
  const metrics = estimateOutputMetrics(items);
  const contract = deriveBatchMergeContract(items);

  if (items.length < 2) {
    return {
      compatible: false,
      reason: 'At least 2 videos are required to perform a batch clean & merge.',
      incompatibleItemIds: [],
      ...metrics,
      contract,
      details: {
        dimensionsMatch: true,
        audioStatus: 'compatible_audio',
      },
    };
  }

  // Validate trim ranges
  for (const item of items) {
    if (item.trimRange) {
      if (item.trimRange.end <= item.trimRange.start) {
        return {
          compatible: false,
          reason: `Invalid trim on "${item.file.name}": End time (${item.trimRange.end.toFixed(2)}s) must be greater than start time (${item.trimRange.start.toFixed(2)}s).`,
          incompatibleItemIds: [item.id],
          ...metrics,
          contract,
          details: {
            dimensionsMatch: true,
            audioStatus: 'compatible_audio',
          },
        };
      }
    }
  }

  // Check for uncertain watermark decisions
  const uncertainItems = items.filter((i) => i.watermarkDecision === 'uncertain');
  if (uncertainItems.length > 0) {
    return {
      compatible: false,
      reason: `Watermark detection is uncertain for ${uncertainItems.length} clip(s). Please choose "Clean this clip" or "Keep original" before merging.`,
      incompatibleItemIds: uncertainItems.map((i) => i.id),
      ...metrics,
      contract,
      details: {
        dimensionsMatch: true,
        audioStatus: 'compatible_audio',
      },
    };
  }

  if (metrics.isExceedingBudget) {
    return {
      compatible: false,
      reason: `Batch is too large for browser-safe export (<100 MB estimated output limit). Estimated size is ${Math.round(metrics.estimatedOutputSize / (1024 * 1024))} MB. Please reduce the number or length of clips.`,
      incompatibleItemIds: [],
      ...metrics,
      contract,
      details: {
        dimensionsMatch: true,
        audioStatus: 'compatible_audio',
      },
    };
  }

  const refItem = items.find((i) => i.metadata && i.metadata.width > 0);
  const refWidth = contract?.video.width ?? refItem?.metadata?.width;
  const refHeight = contract?.video.height ?? refItem?.metadata?.height;
  const refFps = contract?.video.frameRate ?? Math.round(refItem?.metadata?.frameRate || 30);

  const dimensionsMatch = items.every(
    (i) => !i.metadata || (i.metadata.width === refWidth && i.metadata.height === refHeight)
  );

  return {
    compatible: true,
    reason: null,
    incompatibleItemIds: [],
    ...metrics,
    contract,
    details: {
      dimensionsMatch,
      referenceWidth: refWidth,
      referenceHeight: refHeight,
      referenceFps: refFps,
      audioStatus: 'compatible_audio',
    },
  };
}

/**
 * Pipelined video merger orchestrating low-memory packet-level concatenation.
 *
 * Enforces:
 * 1. fastStart: false to eliminate in-memory media chunk buffering.
 * 2. Strict runtime merge contract validation from the actual stream to be fed.
 * 3. Independent video and audio timeline normalization preserving decode order.
 * 4. Awaited packet.add() backpressure.
 * 5. Throttled target.onwrite tracking and 100 MB abort ceiling.
 * 6. Mandatory finally resource disposal.
 */
export class PipelinedVideoMerger {
  private target: BufferTarget;
  private format: Mp4OutputFormat;
  private output: Output | null = null;
  private videoSource: EncodedVideoPacketSource | null = null;
  private audioSource: EncodedAudioPacketSource | null = null;
  private contract: EstablishedMergeContract | null = null;

  private accumulatedVideoDuration = 0;
  private accumulatedAudioDuration = 0;
  private isFirstVideoPacketOfEntireMerge = true;
  private isFirstAudioPacketOfEntireMerge = true;

  private writtenBytes = 0;
  private lastThrottledReportTime = 0;
  private onBytesWrittenThrottled?: (bytes: number) => void;
  private isCancelled = false;

  constructor(options?: { onBytesWrittenThrottled?: (bytes: number) => void }) {
    this.onBytesWrittenThrottled = options?.onBytesWrittenThrottled;

    this.target = new BufferTarget();
    this.target.onwrite = (start, end) => {
      this.writtenBytes = Math.max(this.writtenBytes, end);

      // Hard safety ceiling check during writing
      if (this.writtenBytes > MAX_BUFFER_OUTPUT_BYTES) {
        throw new Error('Output exceeded browser-safe limit (100 MB). Merging aborted to prevent memory exhaustion.');
      }

      const now = performance.now();
      if (this.onBytesWrittenThrottled && now - this.lastThrottledReportTime > 150) {
        this.lastThrottledReportTime = now;
        this.onBytesWrittenThrottled(this.writtenBytes);
      }
    };

    // fastStart: false minimizes peak memory by not buffering chunks in memory
    this.format = new Mp4OutputFormat({ fastStart: false });
    this.output = new Output({
      format: this.format,
      target: this.target,
    });
  }

  public getEstablishedContract(): EstablishedMergeContract | null {
    return this.contract;
  }

  public getAccumulatedDuration(): number {
    return this.accumulatedVideoDuration;
  }

  /**
   * Initializes the Output and media sources using the actual stream from the first clip.
   */
  public async initializeFromFirstClip(fileOrBlob: File | Blob): Promise<EstablishedMergeContract> {
    if (this.isCancelled) throw new Error('Merger was cancelled.');

    const input = new Input({
      source: new BlobSource(fileOrBlob),
      formats: ALL_FORMATS,
    });

    try {
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) {
        throw new Error('First clip does not contain a primary video track.');
      }

      const videoCodec = await videoTrack.getCodec();
      if (!videoCodec) {
        throw new Error('First clip video codec could not be identified.');
      }

      const width = await videoTrack.getCodedWidth();
      const height = await videoTrack.getCodedHeight();
      const videoDecoderConfig = await videoTrack.getDecoderConfig();

      const audioTrack = await input.getPrimaryAudioTrack().catch(() => null);
      let audioCodec = null;
      let sampleRate = null;
      let numberOfChannels = null;
      let audioDecoderConfig = null;

      if (audioTrack) {
        audioCodec = await audioTrack.getCodec();
        sampleRate = await audioTrack.getSampleRate();
        numberOfChannels = await audioTrack.getNumberOfChannels();
        audioDecoderConfig = await audioTrack.getDecoderConfig();
      }

      // Configure media sources
      this.videoSource = new EncodedVideoPacketSource(videoCodec);
      this.output!.addVideoTrack(this.videoSource);

      if (audioTrack && audioCodec) {
        this.audioSource = new EncodedAudioPacketSource(audioCodec);
        this.output!.addAudioTrack(this.audioSource);
      }

      // Establish strict merge contract
      this.contract = {
        video: {
          codec: videoCodec,
          width,
          height,
          decoderConfig: videoDecoderConfig,
        },
        audio: {
          hasAudio: Boolean(audioTrack && audioCodec),
          codec: audioCodec,
          sampleRate,
          numberOfChannels,
          decoderConfig: audioDecoderConfig,
        },
      };

      // Start output pipeline
      await this.output!.start();

      return this.contract;
    } finally {
      input.dispose();
    }
  }

  /**
   * Validates subsequent clip's actual stream against the established merge contract.
   */
  public async validateRuntimeContract(fileOrBlob: File | Blob): Promise<{ valid: boolean; reason?: string }> {
    if (!this.contract) {
      throw new Error('Merge contract not yet established.');
    }

    const input = new Input({
      source: new BlobSource(fileOrBlob),
      formats: ALL_FORMATS,
    });

    try {
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) {
        return { valid: false, reason: 'Clip missing primary video track.' };
      }

      const videoCodec = await videoTrack.getCodec();
      const width = await videoTrack.getCodedWidth();
      const height = await videoTrack.getCodedHeight();

      if (videoCodec !== this.contract.video.codec) {
        return {
          valid: false,
          reason: `Video codec mismatch: expected ${this.contract.video.codec}, got ${videoCodec}.`,
        };
      }

      if (width !== this.contract.video.width || height !== this.contract.video.height) {
        return {
          valid: false,
          reason: `Video dimensions mismatch: expected ${this.contract.video.width}x${this.contract.video.height}, got ${width}x${height}.`,
        };
      }

      const audioTrack = await input.getPrimaryAudioTrack().catch(() => null);
      if (this.contract.audio.hasAudio) {
        if (!audioTrack) {
          return { valid: false, reason: 'Clip is missing audio track while prior clips contain audio.' };
        }
        const audioCodec = await audioTrack.getCodec();
        const sampleRate = await audioTrack.getSampleRate();
        const channels = await audioTrack.getNumberOfChannels();

        if (audioCodec !== this.contract.audio.codec) {
          return { valid: false, reason: `Audio codec mismatch: expected ${this.contract.audio.codec}, got ${audioCodec}.` };
        }
        if (sampleRate !== this.contract.audio.sampleRate) {
          return { valid: false, reason: `Audio sample rate mismatch: expected ${this.contract.audio.sampleRate} Hz, got ${sampleRate} Hz.` };
        }
        if (channels !== this.contract.audio.numberOfChannels) {
          return { valid: false, reason: `Audio channel count mismatch: expected ${this.contract.audio.numberOfChannels}, got ${channels}.` };
        }
      } else if (audioTrack) {
        return { valid: false, reason: 'Clip contains an audio track while prior clips are silent.' };
      }

      return { valid: true };
    } finally {
      input.dispose();
    }
  }

  /**
   * Feeds the actual stream packets of a clip into the Output pipeline,
   * applying independent timeline normalization and decode-order preservation.
   */
  public async feedClipPackets(fileOrBlob: File | Blob): Promise<void> {
    if (this.isCancelled || !this.output || !this.videoSource) {
      throw new Error('Merger is not in a valid state to feed packets.');
    }

    const input = new Input({
      source: new BlobSource(fileOrBlob),
      formats: ALL_FORMATS,
    });

    let videoIterator: AsyncIterator<EncodedPacket> | null = null;
    let audioIterator: AsyncIterator<EncodedPacket> | null = null;

    try {
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) throw new Error('Clip missing primary video track.');

      const videoDecoderConfig = await videoTrack.getDecoderConfig();
      const videoSink = new EncodedPacketSink(videoTrack);
      const videoPacketsIterable = videoSink.packets();
      videoIterator = videoPacketsIterable[Symbol.asyncIterator]();

      // Read video packets preserving strict decode order
      let videoSegmentStart: number | null = null;
      let videoSegmentEnd = 0;
      const videoPackets: EncodedPacket[] = [];

      while (true) {
        if (this.isCancelled) throw new Error('Operation cancelled.');
        const { value: packet, done } = await videoIterator.next();
        if (done) break;

        if (videoSegmentStart === null) {
          videoSegmentStart = packet.timestamp;
        }
        const packetEnd = packet.timestamp + packet.duration;
        if (packetEnd > videoSegmentEnd) {
          videoSegmentEnd = packetEnd;
        }
        videoPackets.push(packet);
      }

      const videoDuration = videoSegmentStart !== null
        ? Math.max(0, videoSegmentEnd - videoSegmentStart)
        : 0;

      // Stream video packets into videoSource awaiting backpressure
      const currentVideoTimelineBase = this.accumulatedVideoDuration;
      const vStart = videoSegmentStart ?? 0;

      for (const packet of videoPackets) {
        if (this.isCancelled) throw new Error('Operation cancelled.');
        const shiftedPTS = packet.timestamp - vStart + currentVideoTimelineBase;
        const shiftedPacket = packet.clone({ timestamp: shiftedPTS });

        const isFirst = this.isFirstVideoPacketOfEntireMerge;
        if (isFirst) {
          this.isFirstVideoPacketOfEntireMerge = false;
        }

        // Supply decoderConfig on the very first packet
        await this.videoSource.add(
          shiftedPacket,
          isFirst && videoDecoderConfig ? { decoderConfig: videoDecoderConfig } : undefined
        );
      }

      this.accumulatedVideoDuration += videoDuration;

      // Process audio track if established
      if (this.audioSource) {
        const audioTrack = await input.getPrimaryAudioTrack().catch(() => null);
        if (audioTrack) {
          const audioDecoderConfig = await audioTrack.getDecoderConfig();
          const audioSink = new EncodedPacketSink(audioTrack);
          const audioPacketsIterable = audioSink.packets();
          audioIterator = audioPacketsIterable[Symbol.asyncIterator]();

          let audioSegmentStart: number | null = null;
          let audioSegmentEnd = 0;
          const audioPackets: EncodedPacket[] = [];

          while (true) {
            if (this.isCancelled) throw new Error('Operation cancelled.');
            const { value: packet, done } = await audioIterator.next();
            if (done) break;

            if (audioSegmentStart === null) {
              audioSegmentStart = packet.timestamp;
            }
            const packetEnd = packet.timestamp + packet.duration;
            if (packetEnd > audioSegmentEnd) {
              audioSegmentEnd = packetEnd;
            }
            audioPackets.push(packet);
          }

          const audioDuration = audioSegmentStart !== null
            ? Math.max(0, audioSegmentEnd - audioSegmentStart)
            : 0;

          const currentAudioTimelineBase = this.accumulatedAudioDuration;
          const aStart = audioSegmentStart ?? 0;

          for (const packet of audioPackets) {
            if (this.isCancelled) throw new Error('Operation cancelled.');
            const shiftedPTS = packet.timestamp - aStart + currentAudioTimelineBase;
            const shiftedPacket = packet.clone({ timestamp: shiftedPTS });

            const isFirst = this.isFirstAudioPacketOfEntireMerge;
            if (isFirst) {
              this.isFirstAudioPacketOfEntireMerge = false;
            }

            await this.audioSource.add(
              shiftedPacket,
              isFirst && audioDecoderConfig ? { decoderConfig: audioDecoderConfig } : undefined
            );
          }

          this.accumulatedAudioDuration += audioDuration;
        }
      }
    } finally {
      // Mandatory resource cleanup
      try {
        videoIterator?.return?.();
      } catch {
        // Ignored
      }
      try {
        audioIterator?.return?.();
      } catch {
        // Ignored
      }
      input.dispose();
    }
  }

  /**
   * Finalizes the Output pipeline and creates the final File directly from the target buffer.
   */
  public async finalize(): Promise<{ file: File; duration: number }> {
    if (this.isCancelled || !this.output) {
      throw new Error('Merger is cancelled or uninitialized.');
    }

    try {
      this.videoSource?.close();
      this.audioSource?.close();

      await this.output.finalize();

      if (!this.target.buffer || this.target.buffer.byteLength === 0) {
        throw new Error('Final merged buffer is empty.');
      }

      const mergedFile = new File([this.target.buffer], 'merged_cleaned_video.mp4', {
        type: 'video/mp4',
      });

      return {
        file: mergedFile,
        duration: this.accumulatedVideoDuration,
      };
    } catch (err) {
      await this.cancel();
      throw err;
    }
  }

  /**
   * Cancels the Output and releases internal resources.
   */
  public async cancel(): Promise<void> {
    this.isCancelled = true;
    try {
      this.videoSource?.close();
    } catch {
      // Ignored
    }
    try {
      this.audioSource?.close();
    } catch {
      // Ignored
    }
    if (this.output) {
      try {
        await this.output.cancel();
      } catch {
        // Ignored
      }
      this.output = null;
    }
  }
}
