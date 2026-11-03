/**
 * DSP Math & Utility Functions for 100% Browser-Local Audio Processing
 */

/**
 * Creates a Hann window of specified size.
 * Periodic Hann window (standard for STFT with Overlap-Add): denominator is N.
 * Symmetric Hann window (standard for filter design): denominator is N - 1.
 */
export function createHannWindow(size: number, periodic: boolean = true): Float32Array {
  const window = new Float32Array(size);
  const denom = periodic ? size : size - 1;
  const factor = (2 * Math.PI) / denom;
  for (let n = 0; n < size; n++) {
    window[n] = 0.5 * (1 - Math.cos(factor * n));
  }
  return window;
}

/**
 * Calculates the Root Mean Square (RMS) energy of a slice of audio samples.
 */
export function calculateRms(
  samples: Float32Array,
  offset: number = 0,
  length: number = samples.length - offset
): number {
  if (length <= 0) return 0;
  const end = Math.min(offset + length, samples.length);
  let sumSq = 0;
  for (let i = offset; i < end; i++) {
    const val = samples[i];
    sumSq += val * val;
  }
  return Math.sqrt(sumSq / (end - offset));
}

/**
 * Converts linear RMS amplitude to dBFS (Full Scale).
 * Minimum floor prevents -Infinity when silent.
 */
export function rmsToDbfs(rms: number, floorDbfs: number = -120): number {
  if (rms <= 1e-6) return floorDbfs;
  const db = 20 * Math.log10(rms);
  return Math.max(db, floorDbfs);
}

/**
 * Converts dBFS value to linear amplitude factor.
 */
export function dbfsToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Calculates sample variance of a slice of audio.
 * Used by Gate A to reject digital silence or static offsets.
 */
export function calculateVariance(
  samples: Float32Array,
  offset: number = 0,
  length: number = samples.length - offset
): number {
  if (length <= 1) return 0;
  const end = Math.min(offset + length, samples.length);
  const n = end - offset;

  let sum = 0;
  for (let i = offset; i < end; i++) {
    sum += samples[i];
  }
  const mean = sum / n;

  let sumSqDiff = 0;
  for (let i = offset; i < end; i++) {
    const diff = samples[i] - mean;
    sumSqDiff += diff * diff;
  }
  return sumSqDiff / (n - 1);
}

/**
 * Fast scalar clamping between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

/**
 * Checks if integer is a power of two.
 */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Finds next power of two greater than or equal to n.
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * ITU-R BS.775 downmix for multichannel inputs (> 2 channels, e.g. 5.1 surround)
 * Downmixes non-interleaved multichannel channels to standard stereo (Left, Right).
 * Standard formula:
 * L_out = L + 0.7071 * C + 0.7071 * Ls
 * R_out = R + 0.7071 * C + 0.7071 * Rs
 * If channel count is already 1 or 2, returns channels untouched or cloned.
 */
export function downmixToStereo(channels: Float32Array[]): Float32Array[] {
  const numChannels = channels.length;
  if (numChannels === 1) {
    return [channels[0]];
  }
  if (numChannels === 2) {
    return [channels[0], channels[1]];
  }

  const length = channels[0].length;
  const left = new Float32Array(length);
  const right = new Float32Array(length);

  // 5.1 channel assignment standard:
  // 0: L, 1: R, 2: C, 3: LFE, 4: Ls, 5: Rs
  const cWeight = 0.70710678; // -3 dB
  const sWeight = 0.70710678; // -3 dB

  const chL = channels[0];
  const chR = channels[1];
  const chC = channels[2] || null;
  const chLs = channels[4] || null;
  const chRs = channels[5] || null;

  for (let i = 0; i < length; i++) {
    let lVal = chL[i];
    let rVal = chR[i];
    if (chC) {
      const c = chC[i] * cWeight;
      lVal += c;
      rVal += c;
    }
    if (chLs) lVal += chLs[i] * sWeight;
    if (chRs) rVal += chRs[i] * sWeight;

    // Normalization factor to prevent clipping: 1 / (1 + 0.7071 + 0.7071) = 1 / 2.4142 ≈ 0.4142
    // We scale down by standard 1 / (1 + 0.7071 + 0.7071) if summing multiple active feeds
    const norm = 1 / (1 + (chC ? cWeight : 0) + (chLs ? sWeight : 0));
    left[i] = clamp(lVal * norm, -1.0, 1.0);
    right[i] = clamp(rVal * norm, -1.0, 1.0);
  }

  return [left, right];
}
