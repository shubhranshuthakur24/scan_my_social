/**
 * Spectral Subtractor Engine with Over-Subtraction, Spectral Floor Beta,
 * 3-Point Frequency Smoothing, and Asymmetric Temporal Gain Smoothing.
 */

import { SpectralSubtractionParams, NoiseProfile } from '../types';

export class SpectralSubtractor {
  private readonly noiseProfile: NoiseProfile;
  private readonly params: SpectralSubtractionParams;
  private readonly numBins: number; // N / 2 + 1
  private readonly fftSize: number;

  // Smoothing state buffers
  private readonly rawGain: Float32Array;
  private readonly smoothedGain: Float32Array;
  private readonly prevGain: Float32Array;

  constructor(noiseProfile: NoiseProfile, params: SpectralSubtractionParams) {
    this.noiseProfile = noiseProfile;
    this.params = params;
    this.fftSize = noiseProfile.fftSize;
    this.numBins = (this.fftSize >> 1) + 1;

    this.rawGain = new Float32Array(this.numBins);
    this.smoothedGain = new Float32Array(this.numBins);
    this.prevGain = new Float32Array(this.numBins);

    // Initialize previous gain to 1.0 (unity)
    this.prevGain.fill(1.0);
  }

  reset(): void {
    this.prevGain.fill(1.0);
  }

  /**
   * Applies spectral subtraction to an in-place FFT frame (real and imag arrays).
   * Modifies bins 0 through N-1 preserving conjugate symmetry for a real time-domain signal.
   */
  processFrame(real: Float32Array, imag: Float32Array): void {
    const numBins = this.numBins;
    const fftSize = this.fftSize;
    const pNoise = this.noiseProfile.powerSpectrum;
    const { alpha, beta, frequencySmoothing, gammaAttack, gammaRelease } = this.params;

    const rawG = this.rawGain;
    const smoothG = this.smoothedGain;
    const prevG = this.prevGain;

    // 1. Calculate raw gain filter H(m, k) per bin
    for (let k = 0; k < numBins; k++) {
      const r = real[k];
      const im = imag[k];
      const pSig = r * r + im * im;

      if (pSig <= 1e-12) {
        rawG[k] = Math.sqrt(beta);
        continue;
      }

      // Over-subtraction with spectral floor
      const noisePower = pNoise[k] || 0;
      const subtracted = pSig - alpha * noisePower;
      const floorPower = beta * pSig;
      const pClean = Math.max(subtracted, floorPower);

      // Amplitude gain = sqrt(P_clean / P_sig)
      rawG[k] = Math.sqrt(pClean / pSig);
    }

    // 2. Inter-bin 3-point frequency smoothing:
    // H_tilde(k) = 0.25 * H(k-1) + 0.5 * H(k) + 0.25 * H(k+1)
    if (frequencySmoothing) {
      smoothG[0] = 0.75 * rawG[0] + 0.25 * rawG[1];
      for (let k = 1; k < numBins - 1; k++) {
        smoothG[k] = 0.25 * rawG[k - 1] + 0.5 * rawG[k] + 0.25 * rawG[k + 1];
      }
      smoothG[numBins - 1] = 0.75 * rawG[numBins - 1] + 0.25 * rawG[numBins - 2];
    } else {
      smoothG.set(rawG);
    }

    // 3. Asymmetric temporal recursive gain smoothing & spectral application
    for (let k = 0; k < numBins; k++) {
      const gTarget = smoothG[k];
      const gPrev = prevG[k];
      // Attack vs Release
      const gamma = gTarget > gPrev ? gammaAttack : gammaRelease;
      const gFinal = gamma * gPrev + (1.0 - gamma) * gTarget;
      prevG[k] = gFinal;

      // Apply gain to bin k
      real[k] *= gFinal;
      imag[k] *= gFinal;

      // Maintain Hermitian conjugate symmetry for inverse FFT:
      // X[N - k] = X*[k]
      if (k > 0 && k < numBins - 1) {
        const mirrorIdx = fftSize - k;
        real[mirrorIdx] *= gFinal;
        imag[mirrorIdx] *= gFinal;
      }
    }
  }
}
