/**
 * Client-Side Binary RIFF WAV Encoder
 * Generates standards-compliant 16-bit or 24-bit lossless PCM WAV files without external libraries.
 */

import { clamp } from './dspMath';

export interface WavEncodeOptions {
  bitDepth?: 16 | 24;
}

export function encodeWav(
  channels: Float32Array[],
  sampleRate: number,
  options: WavEncodeOptions = {}
): Blob {
  const bitDepth = options.bitDepth || 16;
  const numChannels = channels.length;
  if (numChannels < 1 || numChannels > 2) {
    throw new Error(`WAV encoder supports 1 (mono) or 2 (stereo) channels. Received: ${numChannels}`);
  }

  const numSamples = channels[0].length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalFileSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, totalFileSize - 8, true); // Little-endian
  writeString(8, 'WAVE');

  // 2. "fmt " Sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);             // Subchunk1Size for uncompressed PCM
  view.setUint16(20, 1, true);              // AudioFormat: 1 = Linear PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // 3. "data" Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // 4. Interleave and encode PCM samples
  let offset = 44;

  if (bitDepth === 16) {
    const ch0 = channels[0];
    const ch1 = numChannels === 2 ? channels[1] : null;

    for (let i = 0; i < numSamples; i++) {
      // Channel 0
      const s0 = clamp(ch0[i], -1.0, 1.0);
      const val0 = s0 < 0 ? s0 * 0x8000 : s0 * 0x7fff;
      view.setInt16(offset, Math.round(val0), true);
      offset += 2;

      // Channel 1 (if stereo)
      if (ch1) {
        const s1 = clamp(ch1[i], -1.0, 1.0);
        const val1 = s1 < 0 ? s1 * 0x8000 : s1 * 0x7fff;
        view.setInt16(offset, Math.round(val1), true);
        offset += 2;
      }
    }
  } else if (bitDepth === 24) {
    const ch0 = channels[0];
    const ch1 = numChannels === 2 ? channels[1] : null;

    for (let i = 0; i < numSamples; i++) {
      // Channel 0
      const s0 = clamp(ch0[i], -1.0, 1.0);
      const val0 = Math.round(s0 < 0 ? s0 * 0x800000 : s0 * 0x7fffff);
      view.setUint8(offset, val0 & 0xff);
      view.setUint8(offset + 1, (val0 >> 8) & 0xff);
      view.setUint8(offset + 2, (val0 >> 16) & 0xff);
      offset += 3;

      // Channel 1 (if stereo)
      if (ch1) {
        const s1 = clamp(ch1[i], -1.0, 1.0);
        const val1 = Math.round(s1 < 0 ? s1 * 0x800000 : s1 * 0x7fffff);
        view.setUint8(offset, val1 & 0xff);
        view.setUint8(offset + 1, (val1 >> 8) & 0xff);
        view.setUint8(offset + 2, (val1 >> 16) & 0xff);
        offset += 3;
      }
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
