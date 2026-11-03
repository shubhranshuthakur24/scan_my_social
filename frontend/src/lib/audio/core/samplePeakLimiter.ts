/**
 * Lookahead Sample-Peak Safety Limiter
 * Clamps discrete sample peaks strictly below the target ceiling (default -0.2 dBFS)
 * without hard clipping or digital overs, using a short 1.5ms lookahead buffer.
 */

import { SamplePeakLimiterParams } from '../types';
import { dbfsToLinear, clamp } from './dspMath';

export class SamplePeakLimiter {
  private readonly ceilingLinear: number;
  private readonly lookaheadSamples: number;
  private readonly alphaRelease: number;

  // Ring buffer for lookahead delay
  private readonly delayBuffer: Float32Array;
  private bufferIdx: number = 0;

  // Current gain envelope
  private currentGain: number = 1.0;

  constructor(params: SamplePeakLimiterParams, sampleRate: number) {
    this.ceilingLinear = dbfsToLinear(params.ceilingDbfs); // e.g. -0.2 dBFS ≈ 0.9772
    this.lookaheadSamples = Math.max(1, Math.round((params.lookaheadMs / 1000) * sampleRate));
    this.delayBuffer = new Float32Array(this.lookaheadSamples);

    const relSamples = Math.max(1, Math.round((params.releaseMs / 1000) * sampleRate));
    this.alphaRelease = Math.exp(-1.0 / relSamples);
  }

  reset(): void {
    this.delayBuffer.fill(0);
    this.bufferIdx = 0;
    this.currentGain = 1.0;
  }

  /**
   * Processes a channel Float32Array in-place or into a new buffer.
   */
  processBuffer(samples: Float32Array, inPlace: boolean = false): Float32Array {
    const len = samples.length;
    const output = inPlace ? samples : new Float32Array(len);
    const delay = this.delayBuffer;
    const lookahead = this.lookaheadSamples;
    const ceiling = this.ceilingLinear;
    const alphaRel = this.alphaRelease;

    let bufIdx = this.bufferIdx;
    let gain = this.currentGain;

    for (let i = 0; i < len; i++) {
      const incoming = samples[i];
      const absIn = Math.abs(incoming);

      // Check required gain reduction for incoming future peak
      let targetGain = 1.0;
      if (absIn > ceiling) {
        targetGain = ceiling / absIn;
      }

      // Fast attack: jump immediately to lowest required gain
      if (targetGain < gain) {
        gain = targetGain;
      } else {
        // Smooth exponential release back toward unity (1.0)
        gain = alphaRel * gain + (1.0 - alphaRel) * 1.0;
      }

      // Retrieve delayed sample from ring buffer
      const delayedSample = delay[bufIdx];
      delay[bufIdx] = incoming;
      bufIdx = (bufIdx + 1) % lookahead;

      // Apply lookahead gain to delayed sample and clamp strictly to ceiling
      const limited = delayedSample * gain;
      output[i] = clamp(limited, -ceiling, ceiling);
    }

    this.bufferIdx = bufIdx;
    this.currentGain = gain;
    return output;
  }
}
