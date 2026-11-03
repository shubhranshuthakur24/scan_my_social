'use client';

import React, { useState } from 'react';
import { useImageWatermarkRemoval } from '@/hooks/useImageWatermarkRemoval';
import ImageSelector from './ImageSelector';
import ImageComparisonSlider from './ImageComparisonSlider';
import ImageResultActions from './ImageResultActions';
import SupportedWatermarksModal from '../watermark-remover/SupportedWatermarksModal';
import WatermarkCardTabs from '../watermark-remover/WatermarkCardTabs';
import WatermarkSidebarInfo from '../watermark-remover/WatermarkSidebarInfo';
import { WatermarkHeaderPills, WatermarkBenefitsBar } from '../watermark-remover/WatermarkHeaderPills';
import AnalyzingMediaProgress from '../watermark-remover/AnalyzingMediaProgress';
import ImageMetadataPreview from './ImageMetadataPreview';
import ImageCompletedSummary from './ImageCompletedSummary';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  Sparkles,
  Lock,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ImageIcon,
  Loader2,
  XCircle,
} from 'lucide-react';

export interface ImageWatermarkRemoverProps {
  isPublic?: boolean;
}

export default function ImageWatermarkRemover({ isPublic = false }: ImageWatermarkRemoverProps = {}) {
  const {
    status,
    originalFile,
    originalUrl,
    cleanedBlob,
    cleanedUrl,
    cleanedFile,
    metadata,
    detectionResult,
    error,
    edgePolish,
    setEdgePolish,
    selectFile,
    startProcessing,
    cancel,
    reset,
  } = useImageWatermarkRemoval();

  const [isSupportedModalOpen, setIsSupportedModalOpen] = useState(false);

  const isAnalyzing = status === 'analyzing';
  const isProcessing = status === 'processing';
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
          <WatermarkCardTabs active="image" isPublic={isPublic} />

          {/* Main Workbench Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs space-y-5">
            {/* Workbench Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <ImageIcon className="h-4.5 w-4.5 text-primary-600" />
                  Image Watermark Remover
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clean Gemini watermarks directly in your browser.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60"
                  title="Your media is processed in your browser and isn't uploaded for watermark removal."
                >
                  <Lock size={12} className="text-slate-500" />
                  100% Client-Side
                </span>
              </div>
            </div>

        {/* Error Alert Display */}
        {error && status === 'failed' && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-rose-900 flex-1">
              <p className="font-bold text-rose-950">{error.title}</p>
              <p>{error.message}</p>
              {error.actionHint && <p className="text-rose-700 italic">{error.actionHint}</p>}
              <div className="flex items-center gap-2 pt-2">
                {originalFile && (
                  <Button variant="primary" size="xs" onClick={() => selectFile(originalFile)}>
                    Try Again
                  </Button>
                )}
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
              {originalFile && (
                <Button variant="primary" size="sm" onClick={() => selectFile(originalFile)}>
                  Try Again
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={reset}>
                Choose Another File
              </Button>
            </div>
          </div>
        )}

        {/* STATE 1: EMPTY / FILE SELECTION */}
        {status === 'idle' && (
          <ImageSelector onSelectFile={selectFile} isLoading={false} />
        )}

        {/* STATE 2 & 3: ANALYZING / READY / NO WATERMARK */}
        {(isAnalyzing || status === 'ready_to_clean' || status === 'no_watermark') && (
          <div className="space-y-4">
            {/* Rich Media Metadata Row with Image Thumbnail Preview */}
            <ImageMetadataPreview
              file={originalFile}
              imageUrl={originalUrl}
              metadata={metadata}
              onChangeFile={!isAnalyzing ? reset : undefined}
            />

            {/* Rich Analyzing Progress Phase */}
            {isAnalyzing && (
              <AnalyzingMediaProgress
                progress={0.5}
                type="image"
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
                    This tool removes supported Gemini watermarks while preserving your original media.
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
              <div className="p-4 rounded-xl border border-emerald-200/90 bg-emerald-50/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="solid" color="emerald" size="sm" dot>
                      Gemini watermark detected
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

                {/* Edge Polish Optional Refinement Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200/60 bg-white">
                  <div className="space-y-0.5 pr-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Sparkles size={13} className="text-primary-600" />
                      <span>Edge Polish</span>
                      <span className="text-[10px] font-semibold text-primary-700 bg-primary-50 border border-primary-200/60 px-1.5 py-0.2 rounded-md">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Optional refinement for faint residual edges around supported Gemini watermark regions, particularly when the source has been resized or compressed.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={edgePolish}
                    onClick={() => setEdgePolish(!edgePolish)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      edgePolish ? 'bg-primary-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        edgePolish ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATE 4: PROCESSING */}
        {isProcessing && (
          <div className="p-8 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">Removing watermark…</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Restoring pixels using calibrated reverse-alpha blending.
              </p>
            </div>
            <Button variant="outline" size="xs" onClick={cancel} className="mt-1">
              Cancel
            </Button>
          </div>
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
                    Original resolution preserved • Watermark removed with AI precision
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                {/* Edge Polish quick toggle */}
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="text-xs font-semibold text-slate-700">Edge Polish:</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={edgePolish}
                    onClick={() => setEdgePolish(!edgePolish)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      edgePolish ? 'bg-primary-600' : 'bg-slate-300'
                    }`}
                    title="Toggle Edge Polish to re-render"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        edgePolish ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 hidden sm:block" />

                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Ready to download</span>
                </div>
              </div>
            </div>

            {/* Interactive Before/After Split Comparison */}
            <ImageComparisonSlider
              originalUrl={originalUrl}
              cleanedUrl={cleanedUrl}
              detectionPosition={detectionResult?.position}
            />

            {/* Completed Media Summary Telemetry Card */}
            <ImageCompletedSummary
              metadata={metadata}
              edgePolish={edgePolish}
              fileSize={cleanedFile?.size || originalFile?.size}
            />

            {/* Final Actions */}
            <ImageResultActions
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
          <WatermarkSidebarInfo type="image" />
        </div>
      </div>

      {/* Supported Watermarks Informational Modal */}
      <SupportedWatermarksModal
        isOpen={isSupportedModalOpen}
        onClose={() => setIsSupportedModalOpen(false)}
      />
    </div>
  );
}
