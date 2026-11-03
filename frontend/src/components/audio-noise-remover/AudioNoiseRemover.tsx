'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Volume2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileAudio,
  Film,
  XCircle,
} from 'lucide-react';
import AudioDropzone from './AudioDropzone';
import AudioWaveformCanvas from './AudioWaveformCanvas';
import AudioDspControls from './AudioDspControls';
import AudioPlayerBar from './AudioPlayerBar';
import AudioExportModal from './AudioExportModal';
import AudioDiagnostics from './AudioDiagnostics';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { extractNormalizedPcm } from '@/lib/audio/audioSourceExtractor';
import { estimateAutoNoiseProfile, estimateManualNoiseProfile } from '@/lib/audio/core/noiseProfiler';
import { BiquadFilter, createHighPassCoefficients, HumNotchCascade } from '@/lib/audio/core/biquadFilter';
import { processAudioDenoise } from '@/lib/audio/worker/audioWorkerClient';
import { analyzeAudioQuality, compareAudioQuality } from '@/lib/audio/core/audioQualityAnalyzer';
import {
  NormalizedPcmContract,
  NoiseProfile,
  AutoProfilerResult,
  DspPipelineOptions,
  AudioDenoiseJob,
  AudioQualityMetrics,
  AudioQualityComparison,
} from '@/lib/audio/types';

export const DEFAULT_DSP_OPTIONS: DspPipelineOptions = {
  hpfEnabled: true,
  hpfCutoffHz: 80,
  humRemovalEnabled: true,
  humFundamentalHz: 50,
  spectralSubtraction: {
    alpha: 2.0,
    beta: 0.02,
    frequencySmoothing: true,
    gammaAttack: 0.8,
    gammaRelease: 0.9,
  },
  expanderEnabled: true,
  expander: {
    thresholdDbfs: -42,
    ratio: 2.0,
    kneeDb: 6,
    attackMs: 4,
    releaseMs: 140,
    maxAttenuationDb: -16,
  },
  limiter: {
    ceilingDbfs: -0.2,
    lookaheadMs: 1.5,
    releaseMs: 50,
  },
};

export default function AudioNoiseRemover() {
  // Session State
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'extracting' | 'profiling' | 'ready' | 'processing' | 'processed' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PCM & Buffers
  const [contract, setContract] = useState<NormalizedPcmContract | null>(null);
  const [originalAudioBuffer, setOriginalAudioBuffer] = useState<AudioBuffer | null>(null);
  const [cleanedAudioBuffer, setCleanedAudioBuffer] = useState<AudioBuffer | null>(null);
  const [cleanedChannels, setCleanedChannels] = useState<Float32Array[] | null>(null);

  // DSP & Profiling
  const [dspOptions, setDspOptions] = useState<DspPipelineOptions>(DEFAULT_DSP_OPTIONS);
  const [noiseProfile, setNoiseProfile] = useState<NoiseProfile | null>(null);
  const [autoResult, setAutoResult] = useState<AutoProfilerResult | null>(null);
  const [manualRegion, setManualRegion] = useState<{ startSec: number; endSec: number } | null>(null);

  // Playback & Export
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Audio Quality Diagnostics State (Phase A2)
  const [originalMetrics, setOriginalMetrics] = useState<AudioQualityMetrics | null>(null);
  const [cleanMetrics, setCleanMetrics] = useState<AudioQualityMetrics | null>(null);
  const [comparison, setComparison] = useState<AudioQualityComparison | null>(null);

  // Abort Controller for active jobs
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. File Selection & Ingestion
  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setStatus('extracting');
    setProgress(0.1);
    setErrorMessage(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setStatusMessage('Extracting and decoding audio stream…');
      const { contract: pcmContract, audioBuffer } = await extractNormalizedPcm(selectedFile, {
        signal: abortController.signal,
        onProgress: (step, p) => {
          setStatusMessage(step);
          setProgress(p * 0.5);
        },
      });

      setContract(pcmContract);
      setOriginalAudioBuffer(audioBuffer);

      // Deterministic Audio Quality Analysis on Original PCM (executed once per file load)
      try {
        const origMetrics = analyzeAudioQuality(pcmContract.channelData, pcmContract.sampleRate);
        setOriginalMetrics(origMetrics);
      } catch (analysisErr) {
        console.warn('Original audio quality analysis error:', analysisErr);
        setOriginalMetrics(null);
      }
      setCleanMetrics(null);
      setComparison(null);

      // 2. Pre-Conditioning for Noise Profiling (Consistency Rule)
      setStatus('profiling');
      setStatusMessage('Analyzing background noise profile…');
      setProgress(0.6);

      // Pre-filter channel 0 to construct profile on pre-filtered domain
      let preFilteredChannel: Float32Array<ArrayBufferLike> = new Float32Array(pcmContract.channelData[0]);
      if (dspOptions.hpfEnabled) {
        const hpf = new BiquadFilter(
          createHighPassCoefficients({
            cutoffHz: dspOptions.hpfCutoffHz,
            sampleRate: pcmContract.sampleRate,
          })
        );
        preFilteredChannel = hpf.processBuffer(preFilteredChannel as Float32Array, true);
      }
      if (dspOptions.humRemovalEnabled) {
        const humCascade = new HumNotchCascade({
          fundamentalHz: dspOptions.humFundamentalHz,
          harmonicsCount: 4,
          sampleRate: pcmContract.sampleRate,
        });
        preFilteredChannel = humCascade.processBuffer(preFilteredChannel as Float32Array, true);
      }

      // 3. Auto Profiler Execution
      const autoRes = estimateAutoNoiseProfile(preFilteredChannel, pcmContract.sampleRate);
      setAutoResult(autoRes);

      if (autoRes.profile) {
        setNoiseProfile(autoRes.profile);
      } else {
        // Fallback default profile if uncertain
        const fallbackBins = (2048 >> 1) + 1;
        setNoiseProfile({
          powerSpectrum: new Float32Array(fallbackBins).fill(0.00005),
          fftSize: 2048,
          sampleRate: pcmContract.sampleRate,
          mode: 'auto',
          noiseFloorDbfs: -50,
        });
      }

      setStatus('ready');
      setProgress(1.0);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      console.error('Extraction error:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  // 4. Update Manual Waveform Region
  const handleManualRegionChange = useCallback(
    (region: { startSec: number; endSec: number } | null) => {
      setManualRegion(region);
      if (!contract) return;

      if (region) {
        // Compute manual profile from pre-filtered channel
        let preFilteredChannel: Float32Array<ArrayBufferLike> = new Float32Array(contract.channelData[0]);
        if (dspOptions.hpfEnabled) {
          const hpf = new BiquadFilter(
            createHighPassCoefficients({
              cutoffHz: dspOptions.hpfCutoffHz,
              sampleRate: contract.sampleRate,
            })
          );
          preFilteredChannel = hpf.processBuffer(preFilteredChannel as Float32Array, true);
        }
        if (dspOptions.humRemovalEnabled) {
          const humCascade = new HumNotchCascade({
            fundamentalHz: dspOptions.humFundamentalHz,
            harmonicsCount: 4,
            sampleRate: contract.sampleRate,
          });
          preFilteredChannel = humCascade.processBuffer(preFilteredChannel as Float32Array, true);
        }

        const manualRes = estimateManualNoiseProfile(
          preFilteredChannel as Float32Array,
          contract.sampleRate,
          region.startSec,
          region.endSec
        );

        if (manualRes.profile) {
          setNoiseProfile(manualRes.profile);
        }
      } else {
        // Reset back to auto profile
        if (autoResult?.profile) {
          setNoiseProfile(autoResult.profile);
        }
      }
    },
    [contract, dspOptions, autoResult]
  );

  // 5. Run Denoise Job via Dedicated Worker
  const handleProcessDenoise = async () => {
    if (!contract || !noiseProfile) return;

    setStatus('processing');
    setProgress(0);
    setStatusMessage('Removing background noise via Worker DSP…');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const job: AudioDenoiseJob = {
      id: `denoise_${Date.now()}`,
      channelData: contract.channelData,
      numberOfChannels: contract.numberOfChannels,
      sampleRate: contract.sampleRate,
      options: dspOptions,
      noiseProfile,
    };

    try {
      const result = await processAudioDenoise(job, {
        signal: abortController.signal,
        onProgress: (p) => {
          setProgress(p);
          setStatusMessage(`Processing audio… ${(p * 100).toFixed(0)}%`);
        },
      });

      // Construct Clean AudioBuffer for A/B auditioning
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const cleanBuffer = ctx.createBuffer(
        result.numberOfChannels,
        result.channelData[0].length,
        result.sampleRate
      );

      for (let ch = 0; ch < result.numberOfChannels; ch++) {
        cleanBuffer.copyToChannel(result.channelData[ch] as unknown as Float32Array<ArrayBuffer>, ch);
      }
      ctx.close().catch(() => {});

      setCleanedChannels(result.channelData);
      setCleanedAudioBuffer(cleanBuffer);
      setStatus('processed');

      // Analyze cleaned PCM quality metrics and calculate deltas (Phase A2)
      try {
        const cMetrics = analyzeAudioQuality(result.channelData, result.sampleRate);
        setCleanMetrics(cMetrics);
        if (originalMetrics) {
          setComparison(compareAudioQuality(originalMetrics, cMetrics));
        }
      } catch (analysisErr) {
        console.warn('Cleaned audio quality analysis error:', analysisErr);
        setCleanMetrics(null);
        setComparison(null);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('ready');
        return;
      }
      console.error('Denoise processing error:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  // Cancel in-flight operation
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (status === 'processing') {
      setStatus('ready');
    } else {
      handleReset();
    }
  };

  // Reset entire session
  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setFile(null);
    setStatus('idle');
    setStatusMessage('');
    setProgress(0);
    setErrorMessage(null);
    setContract(null);
    setOriginalAudioBuffer(null);
    setCleanedAudioBuffer(null);
    setCleanedChannels(null);
    setNoiseProfile(null);
    setAutoResult(null);
    setManualRegion(null);
    setCurrentTime(0);
    setOriginalMetrics(null);
    setCleanMetrics(null);
    setComparison(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-primary-900 via-primary-800 to-slate-900 text-white shadow-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-700/60 text-primary-200">
              <Volume2 className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-300">
              Audio Workbench
            </span>
            <Badge variant="subtle" color="emerald" size="sm" icon={ShieldCheck}>
              100% Client-Side DSP
            </Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Audio Noise Reduction</h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Remove background noise, hum, and rumble from audio and video recordings using high-performance
            spectral subtraction. Zero cloud uploads, zero AI hallucinations.
          </p>
        </div>

        {status !== 'idle' && (
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={handleReset}
            className="border-slate-600 text-white hover:bg-slate-800/80 shrink-0"
          >
            Clean Another File
          </Button>
        )}
      </div>

      {/* Main View Area */}
      {status === 'idle' && (
        <AudioDropzone onFileSelected={handleFileSelected} />
      )}

      {/* Loading / Ingesting State */}
      {(status === 'extracting' || status === 'profiling') && (
        <div className="p-10 rounded-3xl bg-white border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-primary-100 text-primary-600 animate-pulse">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{statusMessage}</h3>
            <p className="text-xs text-slate-500 mt-1">Preparing media stream for high-precision DSP…</p>
          </div>
          <div className="w-64 max-w-full mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-200 rounded-full"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <Button size="xs" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-rose-900">Audio Processing Failed</h3>
              <p className="text-xs text-rose-700">{errorMessage || 'An unexpected error occurred.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Try Another File
            </Button>
          </div>
        </div>
      )}

      {/* Workbench Workspace: Ready, Processing, Processed */}
      {(status === 'ready' || status === 'processing' || status === 'processed') && contract && (
        <div className="space-y-6">
          {/* File Meta Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-700">
                {contract.sourceFormat === 'video' ? (
                  <Film className="w-4 h-4 text-primary-600" />
                ) : (
                  <FileAudio className="w-4 h-4 text-primary-600" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 truncate max-w-xs block">
                  {contract.originalFileName}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {contract.duration.toFixed(1)}s • {contract.sampleRate} Hz •{' '}
                  {contract.numberOfChannels === 2 ? 'Stereo' : 'Mono'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status === 'processed' ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                  onClick={() => setIsExportModalOpen(true)}
                >
                  Export Clean WAV
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Sparkles}
                  loading={status === 'processing'}
                  onClick={handleProcessDenoise}
                >
                  Apply Noise Reduction
                </Button>
              )}
            </div>
          </div>

          {/* Interactive Dual-Track Waveform Canvas with Region Selection & Time Ruler */}
          <AudioWaveformCanvas
            originalChannelData={contract.channelData}
            cleanedChannelData={cleanedChannels}
            sampleRate={contract.sampleRate}
            duration={contract.duration}
            currentTime={currentTime}
            onSeek={(t) => setCurrentTime(t)}
            manualRegion={manualRegion}
            onManualRegionChange={handleManualRegionChange}
            isProcessing={status === 'processing'}
            originalMetrics={originalMetrics}
            cleanMetrics={cleanMetrics}
          />

          {/* A/B Synchronized Auditioning Bar */}
          <AudioPlayerBar
            originalBuffer={originalAudioBuffer}
            cleanedBuffer={cleanedAudioBuffer}
            currentTime={currentTime}
            onTimeUpdate={(t) => setCurrentTime(t)}
            disabled={status === 'processing'}
          />

          {/* Progress Banner during DSP execution */}
          {status === 'processing' && (
            <div className="p-4 rounded-2xl bg-primary-50 border border-primary-200/80 flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                <div>
                  <span className="text-xs font-bold text-primary-900 block">{statusMessage}</span>
                  <span className="text-[11px] text-primary-700">Executing STFT Overlap-Add spectral filtering…</span>
                </div>
              </div>
              <Button size="xs" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}

          {/* DSP Controls */}
          <AudioDspControls
            options={dspOptions}
            onChange={(newOpts) => setDspOptions(newOpts)}
            noiseProfile={noiseProfile}
            autoResult={autoResult}
            disabled={status === 'processing'}
          />

          {/* Re-process CTA button if already processed but settings changed */}
          {status === 'processed' && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs text-slate-600">
                Adjusted noise settings? Re-run the filter to update the cleaned audio buffer.
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={handleProcessDenoise}
              >
                Re-apply Settings
              </Button>
            </div>
          )}

          {/* Audio Quality Diagnostics Panel (Phase A2) */}
          <AudioDiagnostics
            originalMetrics={originalMetrics}
            cleanMetrics={cleanMetrics}
            comparison={comparison}
            isProcessing={status === 'processing'}
          />
        </div>
      )}

      {/* Export Lossless WAV Modal */}
      {contract && (
        <AudioExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          channelData={cleanedChannels || contract.channelData}
          sampleRate={contract.sampleRate}
          duration={contract.duration}
          originalFileName={contract.originalFileName}
        />
      )}
    </div>
  );
}
