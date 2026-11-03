/**
 * Dedicated Web Worker: Off-Thread Audio DSP Noise Reduction Pipeline
 * Processes multi-channel PCM buffers with zero-copy transfer semantics.
 */

import { AudioDenoiseJob, AudioDenoiseProgress, AudioDenoiseResult, AudioDenoiseError } from '../types';
import { BiquadFilter, createHighPassCoefficients, HumNotchCascade } from '../core/biquadFilter';
import { ShortTimeFourierTransform } from '../core/shortTimeFourierTransform';
import { SpectralSubtractor } from '../core/spectralSubtractor';
import { DownwardExpander } from '../core/downwardExpander';
import { SamplePeakLimiter } from '../core/samplePeakLimiter';

// Dedicated Worker global scope
self.onmessage = function (event: MessageEvent<AudioDenoiseJob>) {
  const job = event.data;
  const startTime = performance.now();

  try {
    const { id, channelData, numberOfChannels, sampleRate, options, noiseProfile } = job;

    if (!channelData || channelData.length === 0) {
      throw new Error('No audio channel data received in denoise job.');
    }

    const outputChannels: Float32Array[] = [];
    const transferables: Transferable[] = [];

    // Process each channel independently
    for (let ch = 0; ch < numberOfChannels; ch++) {
      let samples = channelData[ch];

      // Report progress callback
      const onProgress = (channelProgress: number) => {
        const overallProgress = (ch + channelProgress) / numberOfChannels;
        const progressMsg: AudioDenoiseProgress = {
          id,
          type: 'progress',
          progress: Math.min(1.0, Math.max(0.0, overallProgress)),
          currentChannel: ch + 1,
          totalChannels: numberOfChannels,
        };
        self.postMessage(progressMsg);
      };

      // 1. Time-Domain Pre-Conditioning: High-Pass Filter (HPF)
      if (options.hpfEnabled) {
        const hpfCoeffs = createHighPassCoefficients({
          cutoffHz: options.hpfCutoffHz || 80,
          sampleRate,
        });
        const hpf = new BiquadFilter(hpfCoeffs);
        samples = hpf.processBuffer(samples, true);
      }

      // 2. Time-Domain Pre-Conditioning: Hum Notch Cascade
      if (options.humRemovalEnabled) {
        const humCascade = new HumNotchCascade({
          fundamentalHz: options.humFundamentalHz || 50,
          harmonicsCount: 4,
          sampleRate,
          q: 28,
        });
        samples = humCascade.processBuffer(samples, true);
      }

      // 3. Frequency-Domain Spectral Subtraction via STFT (75% Hann OLA)
      const stft = new ShortTimeFourierTransform({
        fftSize: noiseProfile.fftSize || 2048,
        hopSize: (noiseProfile.fftSize || 2048) >> 2, // 75% overlap
      });

      const subtractor = new SpectralSubtractor(noiseProfile, options.spectralSubtraction);

      // STFT synthesis with exact 2/3 OLA normalization
      samples = stft.processChannel(
        samples,
        sampleRate,
        (real, imag) => {
          subtractor.processFrame(real, imag);
        },
        onProgress
      );

      // 4. Time-Domain Dynamics: Soft-Knee Downward Expander
      if (options.expanderEnabled) {
        const expander = new DownwardExpander(options.expander, sampleRate);
        samples = expander.processBuffer(samples, true);
      }

      // 5. Lookahead Sample-Peak Safety Limiter (Ceiling <= -0.2 dBFS)
      const limiter = new SamplePeakLimiter(options.limiter, sampleRate);
      samples = limiter.processBuffer(samples, true);

      outputChannels.push(samples);
      transferables.push(samples.buffer as ArrayBuffer);
    }

    const durationMs = performance.now() - startTime;
    const resultMsg: AudioDenoiseResult = {
      id,
      type: 'result',
      channelData: outputChannels,
      numberOfChannels,
      sampleRate,
      durationMs,
    };

    // Post result with zero-copy buffer transfer
    (self as unknown as Worker).postMessage(resultMsg, transferables);
  } catch (err: unknown) {
    const errorMsg: AudioDenoiseError = {
      id: job?.id || 'unknown',
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorMsg);
  }
};
