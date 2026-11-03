'use client';

import React, { useState } from 'react';
import { Download, FileAudio, Check, X, ShieldCheck } from 'lucide-react';
import { encodeWav } from '@/lib/audio/core/wavEncoder';
import Button from '@/components/ui/Button';

interface AudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelData: Float32Array[] | null;
  sampleRate: number;
  duration: number;
  originalFileName: string;
}

export default function AudioExportModal({
  isOpen,
  onClose,
  channelData,
  sampleRate,
  duration,
  originalFileName,
}: AudioExportModalProps) {
  const [bitDepth, setBitDepth] = useState<16 | 24>(16);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !channelData || channelData.length === 0) return null;

  const numChannels = channelData.length;
  const numSamples = channelData[0].length;
  const bytesPerSample = bitDepth / 8;
  const estimatedSizeBytes = 44 + numSamples * numChannels * bytesPerSample;
  const estimatedSizeMb = (estimatedSizeBytes / (1024 * 1024)).toFixed(1);

  // Compute clean output file name
  const cleanBaseName = originalFileName.replace(/\.[^/.]+$/, '');
  const exportFileName = `${cleanBaseName}_cleaned.wav`;

  const handleDownload = () => {
    setIsExporting(true);
    try {
      const blob = encodeWav(channelData, sampleRate, { bitDepth });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up Object URL
      setTimeout(() => {
        URL.revokeObjectURL(url);
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('WAV export error:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-100 text-primary-600">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Export Clean Audio</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File info card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <FileAudio className="w-3.5 h-3.5 text-primary-600" />
              Filename:
            </span>
            <span className="font-mono text-slate-900 truncate max-w-[200px]">
              {exportFileName}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Duration:</span>
            <span className="font-mono">{duration.toFixed(1)}s ({sampleRate} Hz)</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Channels:</span>
            <span className="font-mono">{numChannels === 2 ? 'Stereo (2 Ch)' : 'Mono (1 Ch)'}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-primary-700 pt-1 border-t border-slate-200/50">
            <span>Estimated File Size:</span>
            <span className="font-mono font-bold">~{estimatedSizeMb} MB</span>
          </div>
        </div>

        {/* Bit Depth Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Bit Depth / Encoding Quality</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setBitDepth(16)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                bitDepth === 16
                  ? 'border-primary-600 bg-primary-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">16-bit PCM</span>
                {bitDepth === 16 && <Check className="w-4 h-4 text-primary-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">CD standard, universally compatible.</p>
            </button>

            <button
              type="button"
              onClick={() => setBitDepth(24)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                bitDepth === 24
                  ? 'border-primary-600 bg-primary-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">24-bit PCM</span>
                {bitDepth === 24 && <Check className="w-4 h-4 text-primary-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Maximum studio dynamic range.</p>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px]">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>100% Lossless Uncompressed PCM. Generated entirely inside your browser.</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Download}
            loading={isExporting}
            onClick={handleDownload}
          >
            Download WAV File
          </Button>
        </div>
      </div>
    </div>
  );
}
