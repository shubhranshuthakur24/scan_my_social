/**
 * Audio / Video Source Extractor
 * Unifies audio files and video containers into a Normalized PCM Contract.
 * Uses Mediabunny for video track probing and browser-local decoding without cloud dependencies or FFmpeg.
 */

import { Input, BlobSource, ALL_FORMATS } from 'mediabunny';
import { NormalizedPcmContract } from './types';
import { downmixToStereo } from './core/dspMath';

export interface ExtractionOptions {
  onProgress?: (step: string, progress: number) => void;
  signal?: AbortSignal;
}

/**
 * Checks whether a file is a video container based on MIME type and file extension.
 */
export function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith('video/')) return true;
  const name = file.name.toLowerCase();
  return /\.(mp4|webm|mov|mkv|avi|m4v|3gp|flv)$/i.test(name);
}

/**
 * Extracts and decodes audio from an audio or video file into the Normalized PCM Contract.
 */
export async function extractNormalizedPcm(
  file: File,
  options: ExtractionOptions = {}
): Promise<{ contract: NormalizedPcmContract; audioBuffer: AudioBuffer }> {
  const { onProgress, signal } = options;

  if (signal?.aborted) {
    throw new DOMException('Audio extraction aborted', 'AbortError');
  }

  const isVideo = isVideoFile(file);

  // 1. If video, inspect track with Mediabunny
  if (isVideo) {
    onProgress?.('Inspecting video tracks…', 0.1);

    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS,
    });

    try {
      const audioTrack = await input.getPrimaryAudioTrack().catch(() => null);
      if (!audioTrack) {
        throw new Error('No audio track was found in this video.');
      }
    } finally {
      input.dispose();
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Audio extraction aborted', 'AbortError');
  }

  // 2. Read file bytes into ArrayBuffer
  onProgress?.(isVideo ? 'Extracting audio track from video…' : 'Reading audio file…', 0.3);
  const arrayBuffer = await file.arrayBuffer();

  if (signal?.aborted) {
    throw new DOMException('Audio extraction aborted', 'AbortError');
  }

  // 3. Browser-Compatible Audio Decoding
  onProgress?.('Decoding audio stream…', 0.6);

  // Create temporary AudioContext for decoding
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) {
    throw new Error('Web Audio API (AudioContext) is not supported in this browser.');
  }

  const tempContext = new AudioCtxClass();
  let decodedBuffer: AudioBuffer;

  try {
    decodedBuffer = await tempContext.decodeAudioData(arrayBuffer);
  } catch (decodeErr) {
    throw new Error(
      `Failed to decode audio track (${decodeErr instanceof Error ? decodeErr.message : 'unsupported codec or corrupted container'}).`
    );
  } finally {
    // Promptly close temporary context
    tempContext.close().catch(() => {});
  }

  if (signal?.aborted) {
    throw new DOMException('Audio extraction aborted', 'AbortError');
  }

  onProgress?.('Normalizing PCM channels…', 0.9);

  // 4. Extract channels into Float32Array arrays
  const rawChannels: Float32Array[] = [];
  const numCh = decodedBuffer.numberOfChannels;

  for (let ch = 0; ch < numCh; ch++) {
    const channelData = new Float32Array(decodedBuffer.length);
    decodedBuffer.copyFromChannel(channelData, ch);
    rawChannels.push(channelData);
  }

  // 5. Channel policy: Downmix multichannel (> 2 channels) to stereo using ITU-R BS.775
  let normalizedChannels: Float32Array[];
  let finalChannelCount: 1 | 2;

  if (rawChannels.length > 2) {
    normalizedChannels = downmixToStereo(rawChannels);
    finalChannelCount = 2;
  } else if (rawChannels.length === 2) {
    normalizedChannels = rawChannels;
    finalChannelCount = 2;
  } else {
    normalizedChannels = rawChannels;
    finalChannelCount = 1;
  }

  const contract: NormalizedPcmContract = {
    channelData: normalizedChannels,
    numberOfChannels: finalChannelCount,
    sampleRate: decodedBuffer.sampleRate,
    duration: decodedBuffer.duration,
    length: decodedBuffer.length,
    sourceFormat: isVideo ? 'video' : 'audio',
    originalFileName: file.name,
  };

  onProgress?.('Ready', 1.0);

  return { contract, audioBuffer: decodedBuffer };
}
