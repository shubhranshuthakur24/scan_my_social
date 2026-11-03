'use client';

import React, { useState } from 'react';
import { useWatermarkRemoval } from '@/hooks/useWatermarkRemoval';
import VideoSelector from './VideoSelector';
import ProcessingProgress from './ProcessingProgress';
import VideoComparison from './VideoComparison';
import ResultActions from './ResultActions';
import CapabilityNotice from './CapabilityNotice';
import UnsupportedAudioModal from './UnsupportedAudioModal';
import SupportedWatermarksModal from './SupportedWatermarksModal';
import WatermarkCardTabs from './WatermarkCardTabs';
import WatermarkSidebarInfo from './WatermarkSidebarInfo';
import { WatermarkHeaderPills, WatermarkBenefitsBar } from './WatermarkHeaderPills';
import VideoMetadataPreview from './VideoMetadataPreview';
import AnalyzingMediaProgress from './AnalyzingMediaProgress';
import CompletedMediaSummary from './CompletedMediaSummary';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  Sparkles,
  Lock,
  AlertCircle,
  Clock,
  HardDrive,
  CheckCircle2,
  HelpCircle,
  FileVideo,
  Film,
  RotateCcw,
  Loader2,
  XCircle,
} from 'lucide-react';

export interface WatermarkRemoverProps {
  isPublic?: boolean;
}

export default function WatermarkRemover({ isPublic = false }: WatermarkRemoverProps = {}) {
  const {
    status,
    originalFile,
    originalUrl,
    cleanedBlob,
    cleanedUrl,
    cleanedFile,
    detectionResult,
    metadata,
    audioInfo,
    audioResult,
    progress,
    error,
    baselineCaps,
    durationWarning,
    sizeWarning,
    isUnsupportedAudioModalOpen,
    selectFile,
    startProcessing,
    confirmProcessingWithoutAudio,
    cancelAudioModal,
    cancel,
    reset,
  } = useWatermarkRemoval();

  const [isSupportedModalOpen, setIsSupportedModalOpen] = useState(false);

  const isDetecting = status === 'detecting';
  const isProcessing = status === 'processing' || status === 'encoding';
  const isCompleted = status === 'completed' && originalUrl && cleanedUrl;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0 shadow-2xs">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Watermark Remover
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Remove Gemini &amp; Veo watermarks from your videos and images with AI precision. Fast, local, and completely free.
            </p>
          </div>
        </div>

        <WatermarkHeaderPills />
      </div>

      {/* Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Card Tabs + Workbench Card + Benefits Bar */}
        <div className="lg:col-span-8 space-y-5">
          <WatermarkCardTabs active="video" isPublic={isPublic} />

          {/* Capability Notice (Non-intrusive) */}
          <CapabilityNotice capabilities={baselineCaps} />

          {/* Main Workbench Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs space-y-5">
            {/* Workbench Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Film className="h-4.5 w-4.5 text-primary-600" />
                  Video Watermark Remover
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clean Gemini and Veo watermarks directly in your browser.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <Lock size={15} className="text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-none">100% Client-Side</p>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">Your video stays on this device</p>
                  </div>
                </div>
              </div>
            </div>

        {/* Advisory Warnings (Non-blocking) */}
        {(durationWarning || sizeWarning) && (
          <div className="flex flex-col gap-2">
            {durationWarning && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200/80">
                <Clock size={14} className="shrink-0 text-amber-600" />
                <span>{durationWarning}</span>
              </div>
            )}
            {sizeWarning && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200/80">
                <HardDrive size={14} className="shrink-0 text-amber-600" />
                <span>{sizeWarning}</span>
              </div>
            )}
          </div>
        )}

        {/* Error Alert Display */}
        {error && status === 'failed' && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-rose-900 flex-1">
              <p className="font-bold text-rose-950">{error.title}</p>
              <p>{error.message}</p>
              {error.actionHint && <p className="text-rose-700 italic">{error.actionHint}</p>}
              <div className="flex items-center gap-2 pt-2">
                <Button variant="primary" size="xs" onClick={startProcessing}>
                  Try Again
                </Button>
                <Button variant="outline" size="xs" onClick={reset}>
                  Choose Another File
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Cancelled State */}
        {status === 'cancelled' && (
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-3">
            <div className="inline-flex items-center justify-center p-2 rounded-full bg-slate-200 text-slate-600 mb-1">
              <XCircle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Processing cancelled</h4>
              <p className="text-xs text-slate-500 mt-1">Your original file is unchanged.</p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={startProcessing}>
                Try Again
              </Button>
              <Button variant="outline" size="sm" onClick={reset}>
                Choose Another File
              </Button>
            </div>
          </div>
        )}

        {/* STATE 1: EMPTY / FILE SELECTION */}
        {status === 'idle' && (
          <VideoSelector onSelectFile={selectFile} isLoading={false} />
        )}

        {/* STATE 2 & 3: DETECTING / READY / NO WATERMARK */}
        {(isDetecting || status === 'ready_to_clean' || status === 'no_watermark') && (
          <div className="space-y-4">
            {/* Rich Media Metadata Row with Video Thumbnail Preview */}
            <VideoMetadataPreview
              file={originalFile}
              videoUrl={originalUrl}
              metadata={metadata}
              onChangeFile={!isDetecting ? reset : undefined}
            />

            {/* Rich Analyzing Progress Phase */}
            {isDetecting && (
              <AnalyzingMediaProgress
                progress={progress.progress}
                type="video"
              />
            )}

            {/* Negative Gate: No Watermark Found (Informational State) */}
            {status === 'no_watermark' && (
              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/70 text-center space-y-3">
                <div className="inline-flex items-center justify-center p-2.5 rounded-full bg-slate-200/70 text-slate-600 mb-0.5">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    No supported watermark detected
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    This tool removes supported Gemini and Veo watermarks while preserving your original media.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button variant="primary" size="sm" onClick={reset}>
                    Choose Another File
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={HelpCircle}
                    onClick={() => setIsSupportedModalOpen(true)}
                  >
                    Learn What This Tool Supports
                  </Button>
                </div>
              </div>
            )}

            {/* Positive Gate: Supported Watermark Confirmed */}
            {status === 'ready_to_clean' && (
              <div className="p-4 rounded-xl border border-emerald-200/90 bg-emerald-50/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="solid" color="emerald" size="sm" dot>
                      {detectionResult?.watermarkType === 'veo_text'
                        ? 'Veo text watermark detected'
                        : 'Gemini watermark detected'}
                    </Badge>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={Sparkles}
                    onClick={startProcessing}
                  >
                    Remove Watermark
                  </Button>
                </div>

                <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-100/80">
                  <span>
                    Audio:{' '}
                    <strong className="text-slate-700">
                      {audioInfo?.hasAudio
                        ? audioInfo.isMp4Compatible
                          ? 'Audio preserved (lossless AAC passthrough)'
                          : 'Audio format incompatible for MP4 export'
                        : 'No audio track'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Duration: <strong className="text-slate-700">{metadata?.duration ? `${Math.round(metadata.duration)}s` : 'Unknown'}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATE 4: PROCESSING & EXPORTING */}
        {isProcessing && (
          <ProcessingProgress
            phase={progress.phase}
            progress={progress.progress}
            currentFrame={progress.currentFrame}
            totalFrames={progress.totalFrames}
            elapsedSeconds={progress.elapsedSeconds}
            videoUrl={originalUrl}
            watermarkPosition={detectionResult?.internal?.position}
            videoMetadata={metadata}
            audioInfo={audioInfo}
            onCancel={cancel}
          />
        )}

        {/* STATE 5: COMPLETED WORKBENCH */}
        {isCompleted && (
          <div className="space-y-4">
            {/* Dual-Sided Success Verification Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 size={18} className="fill-emerald-600 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    Watermark removed successfully
                  </h4>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">
                    {audioResult?.copied
                      ? `${audioResult.packetCount} audio packets preserved • Original quality maintained`
                      : 'Original quality maintained'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Ready to download</p>
                  <p className="text-[10px] text-emerald-700 leading-tight mt-0.5">Clean version is ready</p>
                </div>
              </div>
            </div>

            {/* Synchronized Comparison Video Player */}
            <VideoComparison
              originalUrl={originalUrl}
              cleanedUrl={cleanedUrl}
            />

            {/* Completed Media Summary Telemetry Card */}
            <CompletedMediaSummary
              metadata={metadata}
              audioResult={audioResult}
              fileSize={cleanedFile?.size || originalFile?.size}
            />

            {/* Final CTAs */}
            <ResultActions
              cleanedBlob={cleanedBlob}
              cleanedFile={cleanedFile}
              onReset={reset}
            />
          </div>
        )}
      </div>

      {/* Bottom 4-benefit feature bar */}
      <WatermarkBenefitsBar />
    </div>

        {/* Right Column (4 cols): Supported Watermarks & Important Notes */}
        <div className="lg:col-span-4 sticky top-6">
          <WatermarkSidebarInfo type="video" />
        </div>
      </div>

      {/* Unsupported Audio Prompt Modal */}
      <UnsupportedAudioModal
        isOpen={isUnsupportedAudioModalOpen}
        codec={audioInfo?.codec || null}
        onConfirmWithoutAudio={confirmProcessingWithoutAudio}
        onCancel={cancelAudioModal}
      />

      {/* Supported Watermarks Informational Modal */}
      <SupportedWatermarksModal
        isOpen={isSupportedModalOpen}
        onClose={() => setIsSupportedModalOpen(false)}
      />
    </div>
  );
}
