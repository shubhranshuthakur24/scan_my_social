/**
 * In-place Radix-2 Cooley-Tukey Fast Fourier Transform (FFT & IFFT)
 * Optimized for high-throughput browser-local DSP with zero per-transform allocations.
 */

import { isPowerOfTwo } from './dspMath';

export class FastFourierTransform {
  readonly size: number;
  private readonly bitRev: Uint32Array;
  private readonly cosTable: Float32Array;
  private readonly sinTable: Float32Array;

  constructor(size: number) {
    if (!isPowerOfTwo(size)) {
      throw new Error(`FFT size must be a power of two. Received: ${size}`);
    }
    this.size = size;

    // 1. Precompute bit-reversal lookup table
    this.bitRev = new Uint32Array(size);
    const bits = Math.round(Math.log2(size));
    for (let i = 0; i < size; i++) {
      let rev = 0;
      let val = i;
      for (let b = 0; b < bits; b++) {
        rev = (rev << 1) | (val & 1);
        val >>= 1;
      }
      this.bitRev[i] = rev;
    }

    // 2. Precompute twiddle factors: W_N^k = e^(-j * 2*pi*k / N)
    // We only need half the table for Radix-2 butterflies
    const half = size >> 1;
    this.cosTable = new Float32Array(half);
    this.sinTable = new Float32Array(half);
    const angleStep = -2 * Math.PI / size;
    for (let i = 0; i < half; i++) {
      this.cosTable[i] = Math.cos(angleStep * i);
      this.sinTable[i] = Math.sin(angleStep * i);
    }
  }

  /**
   * Performs an in-place Forward FFT on real and imaginary Float32Arrays.
   * X[k] = sum_{n=0}^{N-1} x[n] * e^(-j * 2 * pi * k * n / N)
   */
  forward(real: Float32Array, imag: Float32Array): void {
    const n = this.size;
    const bitRev = this.bitRev;
    const cosTable = this.cosTable;
    const sinTable = this.sinTable;

    // Bit-reversal permutation
    for (let i = 0; i < n; i++) {
      const j = bitRev[i];
      if (i < j) {
        const tempR = real[i];
        real[i] = real[j];
        real[j] = tempR;

        const tempI = imag[i];
        imag[i] = imag[j];
        imag[j] = tempI;
      }
    }

    // Cooley-Tukey Radix-2 decimation-in-time butterflies
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const step = n / len;

      for (let i = 0; i < n; i += len) {
        let k = 0;
        for (let j = 0; j < halfLen; j++) {
          const cos = cosTable[k];
          const sin = sinTable[k];
          const idxA = i + j;
          const idxB = idxA + halfLen;

          const rB = real[idxB];
          const iB = imag[idxB];

          // Complex multiplication: (rB + j*iB) * (cos + j*sin)
          const tr = rB * cos - iB * sin;
          const ti = rB * sin + iB * cos;

          real[idxB] = real[idxA] - tr;
          imag[idxB] = imag[idxA] - ti;
          real[idxA] += tr;
          imag[idxA] += ti;

          k += step;
        }
      }
    }
  }

  /**
   * Performs an in-place Inverse FFT on real and imaginary Float32Arrays.
   * x[n] = (1 / N) * sum_{k=0}^{N-1} X[k] * e^(j * 2 * pi * k * n / N)
   */
  inverse(real: Float32Array, imag: Float32Array): void {
    const n = this.size;

    // Conjugate input: negate imaginary part
    for (let i = 0; i < n; i++) {
      imag[i] = -imag[i];
    }

    // Forward FFT
    this.forward(real, imag);

    // Conjugate again and scale by 1 / N
    const invN = 1 / n;
    for (let i = 0; i < n; i++) {
      real[i] = real[i] * invN;
      imag[i] = -imag[i] * invN;
    }
  }

  /**
   * Computes power spectrum (|X(k)|^2) for non-negative frequencies (bins 0 to N/2).
   * Result is written into output array of size (N/2 + 1).
   */
  powerSpectrum(real: Float32Array, imag: Float32Array, out: Float32Array): void {
    const half = (this.size >> 1) + 1;
    for (let k = 0; k < half; k++) {
      const r = real[k];
      const im = imag[k];
      out[k] = r * r + im * im;
    }
  }

  /**
   * Computes magnitude spectrum (|X(k)|) for non-negative frequencies (bins 0 to N/2).
   */
  magnitudeSpectrum(real: Float32Array, imag: Float32Array, out: Float32Array): void {
    const half = (this.size >> 1) + 1;
    for (let k = 0; k < half; k++) {
      const r = real[k];
      const im = imag[k];
      out[k] = Math.sqrt(r * r + im * im);
    }
  }
}

// Global cached instances to avoid reconstructing FFT tables for identical sizes
const fftCache = new Map<number, FastFourierTransform>();

export function getFFT(size: number): FastFourierTransform {
  let instance = fftCache.get(size);
  if (!instance) {
    instance = new FastFourierTransform(size);
    fftCache.set(size, instance);
  }
  return instance;
}
