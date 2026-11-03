/**
 * Short-Time Fourier Transform (STFT) Analysis & Overlap-Add (OLA) Synthesis
 * Implements 75% periodic Hann overlap with 2/3 unity normalization for perfect reconstruction.
 */

import { createHannWindow } from './dspMath';
import { FastFourierTransform, getFFT } from './fastFourierTransform';

export interface StftConfig {
  fftSize: number; // N, typically 2048
  hopSize: number; // H, typically 512 (75% overlap)
}

export const DEFAULT_STFT_CONFIG: StftConfig = {
  fftSize: 2048,
  hopSize: 512,
};

export class ShortTimeFourierTransform {
  readonly fftSize: number;
  readonly hopSize: number;
  readonly numBins: number; // fftSize / 2 + 1
  private readonly fft: FastFourierTransform;
  private readonly window: Float32Array;

  // Working scratch buffers (reused across all frames)
  private readonly frameReal: Float32Array;
  private readonly frameImag: Float32Array;

  constructor(config: StftConfig = DEFAULT_STFT_CONFIG) {
    this.fftSize = config.fftSize;
    this.hopSize = config.hopSize;
    this.numBins = (this.fftSize >> 1) + 1;

    this.fft = getFFT(this.fftSize);
    this.window = createHannWindow(this.fftSize, true);

    this.frameReal = new Float32Array(this.fftSize);
    this.frameImag = new Float32Array(this.fftSize);
  }

  /**
   * Process a single audio channel through forward STFT, applying a frame-level spectral transform callback,
   * and reconstructing the time-domain signal using Overlap-Add (OLA) with exact 2/3 unity normalization.
   *
   * @param input Non-interleaved input channel samples
   * @param sampleRate Audio sample rate
   * @param processFrame Callback invoked on each frame with (real, imag, frameIndex).
   *                     Spectral modifications should be applied in-place to real and imag arrays.
   * @param onProgress Optional progress callback (0.0 to 1.0)
   * @returns Cleaned reconstructed Float32Array of identical length
   */
  processChannel(
    input: Float32Array,
    sampleRate: number,
    processFrame: (real: Float32Array, imag: Float32Array, frameIndex: number, totalFrames: number) => void,
    onProgress?: (progress: number) => void
  ): Float32Array {
    const inputLength = input.length;
    const n = this.fftSize;
    const h = this.hopSize;
    const window = this.window;
    const fft = this.fft;
    const real = this.frameReal;
    const imag = this.frameImag;

    // Output accumulator buffer
    // Extra padding of one fftSize allows trailing synthesis without out-of-bounds indexing
    const output = new Float32Array(inputLength + n);

    const totalFrames = Math.max(1, Math.ceil((inputLength + n) / h));
    const invWindowSum = 2.0 / 3.0; // Exact OLA normalization for 75% periodic Hann overlap

    let frameCount = 0;
    for (let pos = -n; pos < inputLength; pos += h) {
      // 1. Slice input window with zero-padding for boundaries
      for (let i = 0; i < n; i++) {
        const sampleIdx = pos + i;
        const val = sampleIdx >= 0 && sampleIdx < inputLength ? input[sampleIdx] : 0;
        real[i] = val * window[i];
        imag[i] = 0;
      }

      // 2. Forward FFT
      fft.forward(real, imag);

      // 3. User spectral modification callback (in-place)
      processFrame(real, imag, frameCount, totalFrames);

      // 4. Inverse FFT
      fft.inverse(real, imag);

      // 5. Synthesis windowing and Overlap-Add
      for (let i = 0; i < n; i++) {
        const outIdx = pos + i;
        if (outIdx >= 0 && outIdx < output.length) {
          // Both analysis and synthesis use Hann window -> window[i] * window[i]
          output[outIdx] += real[i] * window[i] * invWindowSum;
        }
      }

      frameCount++;
      if (onProgress && frameCount % 64 === 0) {
        onProgress(Math.min(1.0, frameCount / totalFrames));
      }
    }

    if (onProgress) {
      onProgress(1.0);
    }

    // Return slice matching original input length exactly
    return output.subarray(0, inputLength);
  }

  /**
   * Performs forward STFT on an isolated time-domain slice (e.g. For noise profile estimation).
   * Writes the resulting power spectrum into `powerSpectrumOut` (size: numBins).
   */
  computeFramePowerSpectrum(
    samples: Float32Array,
    offset: number,
    powerSpectrumOut: Float32Array
  ): void {
    const n = this.fftSize;
    const window = this.window;
    const real = this.frameReal;
    const imag = this.frameImag;

    for (let i = 0; i < n; i++) {
      const idx = offset + i;
      const val = idx < samples.length ? samples[idx] : 0;
      real[i] = val * window[i];
      imag[i] = 0;
    }

    this.fft.forward(real, imag);
    this.fft.powerSpectrum(real, imag, powerSpectrumOut);
  }
}
