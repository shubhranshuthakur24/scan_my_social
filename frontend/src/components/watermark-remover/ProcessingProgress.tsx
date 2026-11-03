'use client';

import React, { useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import {
  X,
  Film,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Zap,
  Volume2,
  Lightbulb,
} from 'lucide-react';

export interface ProcessingProgressProps {
  phase: string;
  progress: number;
  currentFrame: number;
  totalFrames: number;
  elapsedSeconds: number;
  videoUrl?: string | null;
  watermarkPosition?: { x: number; y: number; width: number; height: number };
  videoMetadata?: { width: number; height: number; duration?: number | null; frameRate?: number } | null;
  audioInfo?: { hasAudio: boolean; isMp4Compatible?: boolean } | null;
  onCancel: () => void;
}

export default function ProcessingProgress({
  phase,
  progress,
  currentFrame,
  totalFrames,
  elapsedSeconds,
  videoUrl,
  watermarkPosition,
  videoMetadata,
  audioInfo,
  onCancel,
}: ProcessingProgressProps) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const isSeekingRef = useRef<boolean>(false);
  const targetTimeRef = useRef<number | null>(null);

  // Set up seeked event listener to coalesce rapid seeks without browser decoder lockup
  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) return;

    const handleSeeked = () => {
      if (
        targetTimeRef.current !== null &&
        Math.abs(video.currentTime - targetTimeRef.current) > 0.03
      ) {
        const nextTime = targetTimeRef.current;
        targetTimeRef.current = null;
        try {
          if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
            (video as any).fastSeek(nextTime);
          } else {
            video.currentTime = nextTime;
          }
        } catch {
          isSeekingRef.current = false;
        }
      } else {
        isSeekingRef.current = false;
        targetTimeRef.current = null;
      }
    };

    video.addEventListener('seeked', handleSeeked);

    // Watchdog timer: unblocks if browser takes > 250ms on a single frame seek
    const watchdog = setInterval(() => {
      if (isSeekingRef.current && targetTimeRef.current !== null) {
        isSeekingRef.current = false;
        const fallbackTime = targetTimeRef.current;
        targetTimeRef.current = null;
        try {
          video.currentTime = fallbackTime;
        } catch {
          // Ignore
        }
      }
    }, 250);

    return () => {
      video.removeEventListener('seeked', handleSeeked);
      clearInterval(watchdog);
    };
  }, []);

  // Request seek whenever worker elapsedSeconds advances
  useEffect(() => {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;
    const video = previewVideoRef.current;
    if (!video) return;

    targetTimeRef.current = elapsedSeconds;

    if (!isSeekingRef.current && !video.seeking) {
      isSeekingRef.current = true;
      try {
        if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
          (video as any).fastSeek(elapsedSeconds);
        } else {
          video.currentTime = elapsedSeconds;
        }
      } catch {
        isSeekingRef.current = false;
      }
    }
  }, [elapsedSeconds]);

  // Calculations for remaining time
  const remainingTimeText = (() => {
    if (percent >= 98) return 'A few seconds remaining';
    if (progress > 0.03 && elapsedSeconds > 0) {
      const totalEstimated = elapsedSeconds / progress;
      const remaining = Math.max(1, Math.round(totalEstimated - elapsedSeconds));
      return `${remaining}s remaining`;
    }
    return 'Calculating…';
  })();

  // Format Duration timestamp for bottom-left HUD
  const durationStamp = (() => {
    const d = videoMetadata?.duration;
    if (!d || d <= 0) return '00:00';
    const m = Math.floor(d / 60);
    const s = Math.floor(d % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  })();

  const hasValidDimensions =
    videoMetadata && videoMetadata.width > 0 && videoMetadata.height > 0;
  const aspectRatioStyle = hasValidDimensions
    ? `${videoMetadata.width} / ${videoMetadata.height}`
    : '9 / 16';

  // SVG Circular Ring calculation
  const circleRadius = 24;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const isFinalizing = percent >= 95 || phase === 'finalize';

  return (
    <div className="space-y-4">
      {/* Main Split Workbench Grid */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* LEFT: Live Video Monitor Container */}
          <div className="md:col-span-4 flex justify-center">
            {videoUrl && (
              <div
                className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/90 shadow-md w-full max-w-[220px] sm:max-w-[240px] flex items-center justify-center"
                style={{
                  aspectRatio: aspectRatioStyle,
                  maxHeight: '340px',
                }}
              >
                <video
                  ref={previewVideoRef}
                  src={videoUrl}
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Watermark Target Region Box */}
                {watermarkPosition && hasValidDimensions && (
                  <div
                    className="absolute border-2 border-primary-400 bg-primary-500/20 rounded-xs pointer-events-none transition-all duration-75"
                    style={{
                      left: `${(watermarkPosition.x / videoMetadata.width) * 100}%`,
                      top: `${(watermarkPosition.y / videoMetadata.height) * 100}%`,
                      width: `${(watermarkPosition.width / videoMetadata.width) * 100}%`,
                      height: `${(watermarkPosition.height / videoMetadata.height) * 100}%`,
                    }}
                  />
                )}

                {/* Top-Left Status Overlay */}
                <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 text-white text-[10px] font-semibold backdrop-blur-xs shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse" />
                  <span>Processing...</span>
                </div>

                {/* Bottom-Left Duration Overlay */}
                <div className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-mono backdrop-blur-xs">
                  {durationStamp}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Telemetry, Progress & HUD */}
          <div className="md:col-span-8 space-y-4">
            {/* Top Telemetry Row with Circular Ring & Hero Percentage */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* SVG Progress Ring enclosing Film Icon */}
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle
                      cx="28"
                      cy="28"
                      r={circleRadius}
                      className="stroke-slate-100"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r={circleRadius}
                      className="stroke-primary-600 transition-all duration-200 ease-out"
                      strokeWidth="4"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-primary-600">
                    <Film size={20} />
                  </div>
                </div>

                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Removing watermark...
                  </h3>
                  <p className="text-xs text-slate-500 leading-snug">
                    {currentFrame > 0 && totalFrames > 0
                      ? `Cleaning frame ${currentFrame} of ${totalFrames} to remove supported Gemini and Veo watermarks.`
                      : 'Decoding and cleaning video frames to remove supported Gemini and Veo watermarks.'}
                  </p>
                </div>
              </div>

              {/* Big Bold Hero Percentage */}
              <div className="text-3xl sm:text-4xl font-black text-primary-600 tabular-nums shrink-0">
                {percent}%
              </div>
            </div>

            {/* Sleek Purple Progress Track */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary-600 h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Progress Telemetry Row */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-0.5">
                <div>
                  {currentFrame > 0 && totalFrames > 0 ? (
                    <span className="tabular-nums text-slate-700">
                      Frame {currentFrame} of {totalFrames}
                    </span>
                  ) : (
                    <span>Preparing frame pipeline…</span>
                  )}
                  {elapsedSeconds > 0 && (
                    <span className="text-slate-400 tabular-nums">
                      {' '}• {Math.round(elapsedSeconds)}s elapsed
                    </span>
                  )}
                </div>

                <div className="text-slate-600 font-medium">
                  Estimated time: {remainingTimeText}
                </div>
              </div>
            </div>

            {/* 3-Stage Visual Pipeline Tracker */}
            <div className="grid grid-cols-3 gap-2 p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              {/* Stage 1: Analyzed Video */}
              <div className="flex items-start gap-2 min-w-0">
                <CheckCircle2 size={16} className="text-primary-600 fill-primary-50 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Analyzed video</p>
                  <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                    Detected watermark
                  </p>
                </div>
              </div>

              {/* Stage 2: Removing Watermark */}
              <div className="flex items-start gap-2 min-w-0">
                {!isFinalizing ? (
                  <span className="relative flex h-3.5 w-3.5 shrink-0 mt-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary-600" />
                  </span>
                ) : (
                  <CheckCircle2 size={16} className="text-primary-600 fill-primary-50 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className={`text-xs font-bold leading-tight ${!isFinalizing ? 'text-primary-900' : 'text-slate-900'}`}>
                    Removing watermark
                  </p>
                  <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                    Cleaning frames...
                  </p>
                </div>
              </div>

              {/* Stage 3: Finalizing */}
              <div className="flex items-start gap-2 min-w-0">
                {isFinalizing ? (
                  <span className="relative flex h-3.5 w-3.5 shrink-0 mt-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary-600" />
                  </span>
                ) : (
                  <Circle size={15} className="text-slate-300 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className={`text-xs font-bold leading-tight ${isFinalizing ? 'text-primary-900' : 'text-slate-400'}`}>
                    Finalizing
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                    Encoding container
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom 3 Feature Badges & Cancel Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                    <ShieldCheck size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-none">Processed locally</p>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">Never leaves device</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                    <Zap size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-none">High quality output</p>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">Resolution preserved</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                    <Volume2 size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-none">Audio preserved</p>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                      {audioInfo?.hasAudio ? 'Lossless AAC copy' : 'No audio track'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="xs"
                  icon={X}
                  onClick={onCancel}
                  className="text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tab Persistence Notice Banner */}
      <div className="rounded-2xl border border-primary-100 bg-primary-50/40 p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
          <Lightbulb size={16} />
        </div>
        <div className="text-xs">
          <span className="font-bold text-slate-900">Please keep this tab open. </span>
          <span className="text-slate-600">
            Closing this tab may stop the processing. Your video is being processed in your browser.
          </span>
        </div>
      </div>
    </div>
  );
}
