/**
 * Soft-Knee Downward Expander
 * Attenuates background noise during inter-speech pauses smoothly without syllable clipping.
 */

import { DownwardExpanderParams } from '../types';
import { dbfsToLinear, rmsToDbfs } from './dspMath';

export class DownwardExpander {
  private readonly threshold: number; // dBFS
  private readonly ratio: number;
  private readonly knee: number;
  private readonly maxAttenDb: number;
  private readonly alphaAttack: number;
  private readonly alphaRelease: number;

  private envelope: number = 0;
  private currentGain: number = 1.0;

  constructor(params: DownwardExpanderParams, sampleRate: number) {
    this.threshold = params.thresholdDbfs;
    this.ratio = params.ratio;
    this.knee = params.kneeDb;
    this.maxAttenDb = params.maxAttenuationDb; // e.g. -16 dB

    // Convert time constants (ms) to single-pole smoothing coefficients
    const attSamples = Math.max(1, (params.attackMs / 1000) * sampleRate);
    const relSamples = Math.max(1, (params.releaseMs / 1000) * sampleRate);

    this.alphaAttack = Math.exp(-1.0 / attSamples);
    this.alphaRelease = Math.exp(-1.0 / relSamples);
  }

  reset(): void {
    this.envelope = 0;
    this.currentGain = 1.0;
  }

  /**
   * Calculates target gain in dB for a given input level in dBFS using quadratic soft-knee spline.
   */
  private computeGainDb(levelDb: number): number {
    const T = this.threshold;
    const K = this.knee;
    const halfK = K * 0.5;
    const slope = 1.0 - 1.0 / this.ratio;

    let gainDb = 0;
    if (levelDb >= T + halfK) {
      gainDb = 0;
    } else if (levelDb <= T - halfK) {
      gainDb = slope * (levelDb - T);
    } else {
      // Soft quadratic knee region
      const diff = levelDb - T - halfK;
      gainDb = -(diff * diff) / (2.0 * K) * slope;
    }

    // Clamp to minimum attenuation floor (e.g. -16 dB)
    return Math.max(gainDb, this.maxAttenDb);
  }

  /**
   * Processes an audio channel Float32Array in-place or into a new buffer.
   */
  processBuffer(samples: Float32Array, inPlace: boolean = false): Float32Array {
    const output = inPlace ? samples : new Float32Array(samples.length);
    const len = samples.length;

    let env = this.envelope;
    let gain = this.currentGain;
    const alphaAtt = this.alphaAttack;
    const alphaRel = this.alphaRelease;

    for (let i = 0; i < len; i++) {
      const x = samples[i];
      const absX = Math.abs(x);

      // Peak envelope detection
      if (absX > env) {
        env = alphaAtt * env + (1.0 - alphaAtt) * absX;
      } else {
        env = alphaRel * env + (1.0 - alphaRel) * absX;
      }

      // Convert envelope to dBFS
      const envDb = rmsToDbfs(env);
      const targetGainDb = this.computeGainDb(envDb);
      const targetGainLinear = dbfsToLinear(targetGainDb);

      // Smooth gain transitions
      if (targetGainLinear < gain) {
        gain = alphaAtt * gain + (1.0 - alphaAtt) * targetGainLinear;
      } else {
        gain = alphaRel * gain + (1.0 - alphaRel) * targetGainLinear;
      }

      output[i] = x * gain;
    }

    this.envelope = env;
    this.currentGain = gain;
    return output;
  }
}
