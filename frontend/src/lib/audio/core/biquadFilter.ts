/**
 * Biquad IIR Filters for Audio Pre-Conditioning
 * Implemented using Direct Form II Transposed for numerical stability and minimal state overhead.
 */

import { BiquadCoefficients, HighPassFilterOptions, HumNotchOptions } from '../types';

export class BiquadFilter {
  private b0: number = 1;
  private b1: number = 0;
  private b2: number = 0;
  private a1: number = 0;
  private a2: number = 0;

  // State variables for Direct Form II Transposed (per channel)
  private d1: number = 0;
  private d2: number = 0;

  constructor(coeffs?: BiquadCoefficients) {
    if (coeffs) {
      this.setCoefficients(coeffs);
    }
  }

  setCoefficients(coeffs: BiquadCoefficients): void {
    this.b0 = coeffs.b0;
    this.b1 = coeffs.b1;
    this.b2 = coeffs.b2;
    this.a1 = coeffs.a1;
    this.a2 = coeffs.a2;
  }

  reset(): void {
    this.d1 = 0;
    this.d2 = 0;
  }

  /**
   * Process a single audio sample through the filter.
   */
  processSample(x: number): number {
    const y = this.b0 * x + this.d1;
    this.d1 = this.b1 * x - this.a1 * y + this.d2;
    this.d2 = this.b2 * x - this.a2 * y;
    return y;
  }

  /**
   * Processes an entire Float32Array channel buffer in-place or returns a new Float32Array.
   */
  processBuffer(samples: Float32Array, inPlace: boolean = false): Float32Array {
    const output = inPlace ? samples : new Float32Array(samples.length);
    const len = samples.length;
    let d1 = this.d1;
    let d2 = this.d2;
    const b0 = this.b0;
    const b1 = this.b1;
    const b2 = this.b2;
    const a1 = this.a1;
    const a2 = this.a2;

    for (let i = 0; i < len; i++) {
      const x = samples[i];
      const y = b0 * x + d1;
      d1 = b1 * x - a1 * y + d2;
      d2 = b2 * x - a2 * y;
      output[i] = y;
    }

    this.d1 = d1;
    this.d2 = d2;
    return output;
  }
}

/**
 * Computes 2nd-order Butterworth High-Pass Filter coefficients.
 * Q = 1 / sqrt(2) ≈ 0.70710678 gives maximally flat passband.
 */
export function createHighPassCoefficients(options: HighPassFilterOptions): BiquadCoefficients {
  const { cutoffHz, sampleRate, q = Math.SQRT1_2 } = options;
  const nyquist = sampleRate * 0.5;
  const clampedCutoff = Math.max(10, Math.min(cutoffHz, nyquist - 100));

  const w0 = (2 * Math.PI * clampedCutoff) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);

  const b0 = (1 + cosW0) * 0.5;
  const b1 = -(1 + cosW0);
  const b2 = (1 + cosW0) * 0.5;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha;

  const invA0 = 1 / a0;
  return {
    b0: b0 * invA0,
    b1: b1 * invA0,
    b2: b2 * invA0,
    a1: a1 * invA0,
    a2: a2 * invA0,
  };
}

/**
 * Computes 2nd-order Notch Filter coefficients for rejecting a specific frequency (e.g. 50Hz, 60Hz).
 * Q = 25 to 30 ensures a narrow notch (< 2.5Hz bandwidth).
 */
export function createNotchCoefficients(
  centerHz: number,
  sampleRate: number,
  q: number = 28
): BiquadCoefficients {
  const nyquist = sampleRate * 0.5;
  if (centerHz >= nyquist) {
    // If frequency is above Nyquist, return pass-through coefficients
    return { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
  }

  const w0 = (2 * Math.PI * centerHz) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);

  const b0 = 1;
  const b1 = -2 * cosW0;
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha;

  const invA0 = 1 / a0;
  return {
    b0: b0 * invA0,
    b1: b1 * invA0,
    b2: b2 * invA0,
    a1: a1 * invA0,
    a2: a2 * invA0,
  };
}

/**
 * Cascaded Notch Filter for Mains Hum and its Harmonics (50Hz / 60Hz).
 */
export class HumNotchCascade {
  private readonly filters: BiquadFilter[] = [];

  constructor(options: HumNotchOptions) {
    const { fundamentalHz, harmonicsCount, sampleRate, q = 28 } = options;
    const nyquist = sampleRate * 0.5;

    for (let h = 1; h <= harmonicsCount; h++) {
      const freq = fundamentalHz * h;
      if (freq < nyquist - 20) {
        const coeffs = createNotchCoefficients(freq, sampleRate, q);
        this.filters.push(new BiquadFilter(coeffs));
      }
    }
  }

  reset(): void {
    for (const f of this.filters) {
      f.reset();
    }
  }

  processBuffer(samples: Float32Array, inPlace: boolean = false): Float32Array {
    let current = samples;
    for (let i = 0; i < this.filters.length; i++) {
      current = this.filters[i].processBuffer(current, inPlace || i > 0);
    }
    return current;
  }
}
