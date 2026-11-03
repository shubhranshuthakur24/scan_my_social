'use client';

import React, { useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';
import { AudioQualityMetrics, AudioQualityComparison, NoiseFloorStatus } from '@/lib/audio/types';
import Badge from '@/components/ui/Badge';

interface AudioDiagnosticsProps {
  originalMetrics: AudioQualityMetrics | null;
  cleanMetrics: AudioQualityMetrics | null;
  comparison: AudioQualityComparison | null;
  isProcessing?: boolean;
}

export default function AudioDiagnostics({
  originalMetrics,
  cleanMetrics,
  comparison,
  isProcessing = false,
}: AudioDiagnosticsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showChannels, setShowChannels] = useState(false);

  if (!originalMetrics) {
    return null;
  }

  const isStereo = originalMetrics.numberOfChannels === 2;

  // Format dBFS value with safe fallback
  const formatDbFS = (val: number | null | undefined, status?: NoiseFloorStatus): string => {
    if (status === 'silent') return 'Silent (no noise)';
    if (status === 'insufficient_quiet_material') return 'Insufficient quiet material';
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    return `${val.toFixed(1)} dBFS`;
  };

  // Format relative dB span with safe fallback
  const formatDb = (val: number | null | undefined): string => {
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    return `${val.toFixed(1)} dB`;
  };

  // Format delta with explicit sign (+ / -)
  const formatDelta = (
    val: number | null | undefined,
    unit: 'dB' | '%' | 'samples',
    isInteger = false
  ): string => {
    if (val === null || val === undefined || !Number.isFinite(val)) return '—';
    const sign = val > 0 ? '+' : '';
    const formattedVal = isInteger ? val.toLocaleString() : val.toFixed(1);
    if (unit === 'samples') {
      return `${sign}${formattedVal}`;
    }
    return `${sign}${formattedVal} ${unit}`;
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden transition-all duration-200">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 transition-colors focus:outline-hidden"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <Activity className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Audio Diagnostics</span>
              {originalMetrics.isClipped && (
                <Badge variant="subtle" color="amber" size="sm" icon={AlertTriangle}>
                  Clipped Input
                </Badge>
              )}
              {cleanMetrics && (
                <Badge variant="subtle" color="slate" size="sm">
                  Measured
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Deterministic signal metrics (Peak, RMS, Noise Floor, Dynamic Range, Clipping)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">
            {isOpen ? 'Hide Details' : 'View Measurements'}
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content Area */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
          {/* Clipping Warning Alert */}
          {originalMetrics.isClipped && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Input audio contains clipped samples:</span>
                <span>
                  {originalMetrics.clippedCount.toLocaleString()} samples hit full scale (
                  {originalMetrics.clippedPercentage.toFixed(3)}% of clip, max consecutive:{' '}
                  {originalMetrics.maxConsecutiveClipped}).
                </span>
              </div>
            </div>
          )}

          {/* Cleaned Clipping Notice if present */}
          {cleanMetrics && cleanMetrics.isClipped && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Processed audio contains peak samples:</span>
                <span>
                  {cleanMetrics.clippedCount.toLocaleString()} samples reached clipping threshold.
                </span>
              </div>
            </div>
          )}

          {/* Measurements Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2 pr-4 font-medium">Metric</th>
                  <th className="py-2 px-4 font-medium">Original</th>
                  <th className="py-2 px-4 font-medium">
                    Cleaned
                    {!cleanMetrics && (
                      <span className="text-[10px] font-normal text-slate-400 block normal-case">
                        {isProcessing ? 'Processing…' : 'Not processed yet'}
                      </span>
                    )}
                  </th>
                  <th className="py-2 pl-4 font-medium">Δ (Clean - Orig)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {/* 1. Peak Level */}
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-medium text-slate-700">
                    Peak Level
                    <span className="text-[10px] font-sans text-slate-400 block">
                      Max discrete sample peak
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {formatDbFS(originalMetrics.peakDbFS)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {cleanMetrics ? formatDbFS(cleanMetrics.peakDbFS) : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-700">
                    {comparison ? formatDelta(comparison.delta.peakDbFSDelta, 'dB') : '—'}
                  </td>
                </tr>

                {/* 2. Global RMS */}
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-medium text-slate-700">
                    RMS Energy
                    <span className="text-[10px] font-sans text-slate-400 block">
                      Continuous signal power
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {formatDbFS(originalMetrics.rmsDbFS)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {cleanMetrics ? formatDbFS(cleanMetrics.rmsDbFS) : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-700">
                    {comparison ? formatDelta(comparison.delta.rmsDbFSDelta, 'dB') : '—'}
                  </td>
                </tr>

                {/* 3. Estimated Noise Floor */}
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-medium text-slate-700">
                    Estimated Noise Floor
                    <span className="text-[10px] font-sans text-slate-400 block">
                      Quiescent 50ms window baseline (P10)
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {formatDbFS(originalMetrics.noiseFloorDbFS, originalMetrics.noiseFloorStatus)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {cleanMetrics
                      ? formatDbFS(cleanMetrics.noiseFloorDbFS, cleanMetrics.noiseFloorStatus)
                      : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-700">
                    {comparison?.delta.noiseFloorDeltaDb !== null && comparison?.delta.noiseFloorDeltaDb !== undefined
                      ? formatDelta(comparison.delta.noiseFloorDeltaDb, 'dB')
                      : '—'}
                  </td>
                </tr>

                {/* 4. Dynamic Range Span */}
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-medium text-slate-700">
                    Dynamic Range
                    <span className="text-[10px] font-sans text-slate-400 block">
                      Peak-to-noise-floor span
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {formatDb(originalMetrics.dynamicRangeDb)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {cleanMetrics ? formatDb(cleanMetrics.dynamicRangeDb) : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-700">
                    {comparison?.delta.dynamicRangeDeltaDb !== null && comparison?.delta.dynamicRangeDeltaDb !== undefined
                      ? formatDelta(comparison.delta.dynamicRangeDeltaDb, 'dB')
                      : '—'}
                  </td>
                </tr>

                {/* 5. Crest Factor */}
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-medium text-slate-700">
                    Crest Factor
                    <span className="text-[10px] font-sans text-slate-400 block">
                      Peak-to-RMS transience
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {formatDb(originalMetrics.crestFactorDb)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {cleanMetrics ? formatDb(cleanMetrics.crestFactorDb) : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-700">
                    {comparison ? formatDelta(comparison.delta.crestFactorDeltaDb, 'dB') : '—'}
                  </td>
                </tr>

                {/* 6. Silence Percentage */}
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-medium text-slate-700">
                    Quiescent Silence
                    <span className="text-[10px] font-sans text-slate-400 block">
                      Windows below -60 dBFS
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {originalMetrics.silencePercentage.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {cleanMetrics ? `${cleanMetrics.silencePercentage.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-700">
                    {comparison ? formatDelta(comparison.delta.silencePercentageDelta, '%') : '—'}
                  </td>
                </tr>

                {/* 7. Clipped Samples */}
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-medium text-slate-700">
                    Clipped Samples
                    <span className="text-[10px] font-sans text-slate-400 block">
                      Samples ≥ 0.999 amplitude
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {originalMetrics.clippedCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {cleanMetrics ? cleanMetrics.clippedCount.toLocaleString() : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-700">
                    {comparison
                      ? formatDelta(comparison.delta.clippedCountDelta, 'samples', true)
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Optional Stereo L/R Channel Details Toggle */}
          {isStereo && originalMetrics.channels.length >= 2 && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowChannels(!showChannels)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                {showChannels ? 'Hide Stereo Channel Breakdown' : 'Show Stereo L / R Breakdown'}
              </button>

              {showChannels && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 animate-in fade-in duration-150">
                  {/* Left Channel */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5 text-xs">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                      Channel 1 (Left)
                    </span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
                      <span className="font-sans text-slate-500">Peak:</span>
                      <span className="text-slate-800">{formatDbFS(originalMetrics.channels[0].peakDbFS)}</span>
                      <span className="font-sans text-slate-500">RMS:</span>
                      <span className="text-slate-800">{formatDbFS(originalMetrics.channels[0].rmsDbFS)}</span>
                      <span className="font-sans text-slate-500">Noise Floor:</span>
                      <span className="text-slate-800">
                        {formatDbFS(
                          originalMetrics.channels[0].noiseFloorDbFS,
                          originalMetrics.channels[0].noiseFloorStatus
                        )}
                      </span>
                      <span className="font-sans text-slate-500">Clipped:</span>
                      <span className="text-slate-800">{originalMetrics.channels[0].clippedCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Right Channel */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5 text-xs">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                      Channel 2 (Right)
                    </span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
                      <span className="font-sans text-slate-500">Peak:</span>
                      <span className="text-slate-800">{formatDbFS(originalMetrics.channels[1].peakDbFS)}</span>
                      <span className="font-sans text-slate-500">RMS:</span>
                      <span className="text-slate-800">{formatDbFS(originalMetrics.channels[1].rmsDbFS)}</span>
                      <span className="font-sans text-slate-500">Noise Floor:</span>
                      <span className="text-slate-800">
                        {formatDbFS(
                          originalMetrics.channels[1].noiseFloorDbFS,
                          originalMetrics.channels[1].noiseFloorStatus
                        )}
                      </span>
                      <span className="font-sans text-slate-500">Clipped:</span>
                      <span className="text-slate-800">{originalMetrics.channels[1].clippedCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Note */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Acoustic measurements are calculated browser-locally using deterministic PCM window statistics.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
