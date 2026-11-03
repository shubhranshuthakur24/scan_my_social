'use client';

import React from 'react';
import {
  Sliders,
  Zap,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  VolumeX,
  Radio,
  HelpCircle,
} from 'lucide-react';
import { DspPipelineOptions, NoiseProfile, AutoProfilerResult } from '@/lib/audio/types';
import Badge from '@/components/ui/Badge';

interface AudioDspControlsProps {
  options: DspPipelineOptions;
  onChange: (options: DspPipelineOptions) => void;
  noiseProfile: NoiseProfile | null;
  autoResult: AutoProfilerResult | null;
  disabled?: boolean;
}

export default function AudioDspControls({
  options,
  onChange,
  noiseProfile,
  autoResult,
  disabled = false,
}: AudioDspControlsProps) {
  // Preset handler
  const applyPreset = (preset: 'light' | 'medium' | 'strong') => {
    if (disabled) return;
    if (preset === 'light') {
      onChange({
        ...options,
        spectralSubtraction: {
          ...options.spectralSubtraction,
          alpha: 1.4,
          beta: 0.035,
        },
        expanderEnabled: false,
      });
    } else if (preset === 'medium') {
      onChange({
        ...options,
        spectralSubtraction: {
          ...options.spectralSubtraction,
          alpha: 2.0,
          beta: 0.02,
        },
        expanderEnabled: true,
        expander: {
          ...options.expander,
          thresholdDbfs: -42,
          maxAttenuationDb: -16,
        },
      });
    } else if (preset === 'strong') {
      onChange({
        ...options,
        spectralSubtraction: {
          ...options.spectralSubtraction,
          alpha: 2.7,
          beta: 0.012,
        },
        expanderEnabled: true,
        expander: {
          ...options.expander,
          thresholdDbfs: -36,
          maxAttenuationDb: -18,
        },
      });
    }
  };

  const isLight = options.spectralSubtraction.alpha <= 1.5;
  const isMedium = options.spectralSubtraction.alpha > 1.5 && options.spectralSubtraction.alpha <= 2.3;
  const isStrong = options.spectralSubtraction.alpha > 2.3;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
      {/* Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary-600" />
            <h4 className="text-sm font-bold text-slate-900">Noise Reduction Settings</h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Fine-tune frequency filters, spectral subtraction strength, and pause suppression.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col sm:items-end gap-1">
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl">
            <button
              type="button"
              disabled={disabled}
              onClick={() => applyPreset('light')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isLight
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => applyPreset('medium')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isMedium
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Medium
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => applyPreset('strong')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isStrong
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Strong
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            {isLight && 'Gentle cleanup for mild hiss'}
            {isMedium && 'Balanced for fans & AC noise (Recommended)'}
            {isStrong && 'Aggressive filter for loud background noise'}
          </span>
        </div>
      </div>

      {/* Profiler Status & Explanation Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-800">Noise Profile Fingerprint:</span>
          </div>

          <div>
            {noiseProfile?.mode === 'manual' ? (
              <Badge variant="subtle" color="blue" icon={CheckCircle2}>
                Manual Selection ({noiseProfile.noiseFloorDbfs.toFixed(1)} dBFS)
              </Badge>
            ) : autoResult?.status === 'valid' ? (
              <Badge variant="success" icon={CheckCircle2}>
                Auto Stationary Detected ({noiseProfile?.noiseFloorDbfs.toFixed(1) || '-'} dBFS)
              </Badge>
            ) : autoResult?.status === 'uncertain' ? (
              <Badge variant="warning" icon={AlertTriangle}>
                Detection Uncertain — Select Pause on Waveform
              </Badge>
            ) : (
              <Badge variant="subtle" color="slate">
                Awaiting Audio Input
              </Badge>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          {noiseProfile?.mode === 'manual' ? (
            'Using the exact background noise sample selected on the waveform above. Click "Reset to Auto" to revert to automatic pause detection.'
          ) : autoResult?.status === 'valid' ? (
            'The engine identified consistent pauses in your clip to capture stationary background hiss. If speech is continuous, drag a 1-second pause on the waveform to provide a custom sample.'
          ) : (
            'Could not find enough silent pauses in this recording. Drag across a quiet section on the waveform to train the noise profile manually.'
          )}
        </p>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Spectral Subtraction Core */}
        <div className="space-y-5">
          {/* Noise Reduction Amount (Alpha) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary-600" />
                Noise Reduction Amount (Alpha)
              </span>
              <span className="font-mono text-primary-700 font-bold bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
                {options.spectralSubtraction.alpha.toFixed(1)}x
              </span>
            </div>

            <input
              type="range"
              min="1.0"
              max="3.5"
              step="0.1"
              disabled={disabled}
              value={options.spectralSubtraction.alpha}
              onChange={(e) =>
                onChange({
                  ...options,
                  spectralSubtraction: {
                    ...options.spectralSubtraction,
                    alpha: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Gentle (1.0x)</span>
              <span>Balanced (2.0x)</span>
              <span>Aggressive (3.5x)</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
              Controls how much of the detected noise spectrum is subtracted. Higher values remove more noise, but setting it too high can slightly thin out vocal warmth or quiet whispers.
            </p>
          </div>

          {/* Spectral Floor Sensitivity (Beta) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-500" />
                Spectral Floor Sensitivity (Beta)
              </span>
              <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                {(options.spectralSubtraction.beta * 100).toFixed(1)}%
              </span>
            </div>

            <input
              type="range"
              min="0.008"
              max="0.06"
              step="0.002"
              disabled={disabled}
              value={options.spectralSubtraction.beta}
              onChange={(e) =>
                onChange({
                  ...options,
                  spectralSubtraction: {
                    ...options.spectralSubtraction,
                    beta: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Low Ambiance (0.8%)</span>
              <span>Natural Room (2.0%)</span>
              <span>Warm Baseline (6.0%)</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
              Preserves a tiny, inaudible baseline of room tone. This prevents the background from sounding unnatural or producing watery, robotic artifacts (&quot;musical noise&quot;).
            </p>
          </div>
        </div>

        {/* Right Column: Pre-Conditioning & Expander */}
        <div className="space-y-4">
          {/* High-Pass Filter Toggle */}
          <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={options.hpfEnabled}
                  onChange={(e) => onChange({ ...options, hpfEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">High-Pass Filter (HPF)</span>
              </label>

              <span className="text-xs font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                {options.hpfCutoffHz} Hz
              </span>
            </div>

            {options.hpfEnabled && (
              <div className="space-y-1">
                <input
                  type="range"
                  min="40"
                  max="140"
                  step="5"
                  disabled={disabled}
                  value={options.hpfCutoffHz}
                  onChange={(e) => onChange({ ...options, hpfCutoffHz: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Deep Rumble (40 Hz)</span>
                  <span>Default (80 Hz)</span>
                  <span>Vocal Clear (140 Hz)</span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cuts out low-frequency mechanical rumble, AC vibrations, and microphone handling thumps below the human speaking voice without thinning out speech.
            </p>
          </div>

          {/* Hum Removal Toggle */}
          <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={options.humRemovalEnabled}
                  onChange={(e) => onChange({ ...options, humRemovalEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">Mains Hum Notch Cascade</span>
              </label>

              {options.humRemovalEnabled && (
                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...options, humFundamentalHz: 50 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      options.humFundamentalHz === 50
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    50 Hz (EU/Asia)
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...options, humFundamentalHz: 60 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      options.humFundamentalHz === 60
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    60 Hz (US/Americas)
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Eliminates narrow electrical buzz and ground-loop hum caused by AC power lines, cables, and lighting equipment at fundamental and harmonic frequencies.
            </p>
          </div>

          {/* Downward Expander Toggle */}
          <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={options.expanderEnabled}
                  onChange={(e) => onChange({ ...options, expanderEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">Inter-Speech Pause Expander</span>
              </label>

              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {options.expander.thresholdDbfs} dBFS
              </span>
            </div>

            {options.expanderEnabled && (
              <div className="space-y-1">
                <input
                  type="range"
                  min="-55"
                  max="-30"
                  step="1"
                  disabled={disabled}
                  value={options.expander.thresholdDbfs}
                  onChange={(e) =>
                    onChange({
                      ...options,
                      expander: {
                        ...options.expander,
                        thresholdDbfs: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Only Quiet Pauses (-55 dB)</span>
                  <span>Balanced (-42 dB)</span>
                  <span>Tight Cut (-30 dB)</span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Smoothly mutes background noise during natural pauses between words. Gives a studio-quiet backdrop without clipping syllable endings or trailing consonants.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Limiter Footer Note */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-[11px] text-emerald-900 leading-relaxed">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-emerald-800">Lookahead Sample-Peak Safety Limiter Active: </span>
          Automatically safeguards output levels with a 1.5ms lookahead buffer, ensuring speech peaks stay clean and never clip (ceiling clamped to -0.2 dBFS).
        </div>
      </div>
    </div>
  );
}
