'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BatchVideoItem, VideoTrimRange } from '@/lib/watermark/batch/batchTypes';
import Button from '@/components/ui/Button';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Check,
  Scissors,
  Clock,
  ArrowRight,
} from 'lucide-react';

export interface BatchTrimModalProps {
  item: BatchVideoItem;
  isOpen: boolean;
  onClose: () => void;
  onApply: (id: string, range: VideoTrimRange | null) => void;
}

export default function BatchTrimModal({
  item,
  isOpen,
  onClose,
  onApply,
}: BatchTrimModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const totalDuration = item.metadata?.duration || 0;

  // Local editing state
  const [startSec, setStartSec] = useState<number>(item.trimRange?.start ?? 0);
  const [endSec, setEndSec] = useState<number>(item.trimRange?.end ?? totalDuration);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(item.trimRange?.start ?? 0);

  // Adjust state during render when item changes
  const [prevItemId, setPrevItemId] = useState(item.id);
  if (item.id !== prevItemId) {
    setPrevItemId(item.id);
    setStartSec(item.trimRange?.start ?? 0);
    setEndSec(item.trimRange?.end ?? totalDuration);
    setCurrentTime(item.trimRange?.start ?? 0);
    setIsPlaying(false);
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = item.trimRange?.start ?? 0;
      videoRef.current.pause();
    }
  }, [item.id, item.trimRange]);

  if (!isOpen) return null;

  const formatSecondsToTimestamp = (seconds: number) => {
    const safeSec = Math.max(0, seconds);
    const mins = Math.floor(safeSec / 60);
    const secs = safeSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  const parseTimestampToSeconds = (text: string): number | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length === 2) {
        const mins = parseFloat(parts[0]);
        const secs = parseFloat(parts[1]);
        if (!isNaN(mins) && !isNaN(secs)) {
          return mins * 60 + secs;
        }
      }
    }
    const val = parseFloat(trimmed);
    return isNaN(val) ? null : val;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Loop within [startSec, endSec]
    if (time >= endSec) {
      videoRef.current.currentTime = startSec;
      setCurrentTime(startSec);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= endSec || videoRef.current.currentTime < startSec) {
        videoRef.current.currentTime = startSec;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (targetTime: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(totalDuration, targetTime));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handleStartChange = (val: number) => {
    const clamped = Math.max(0, Math.min(val, endSec - 0.1));
    setStartSec(clamped);
    handleSeek(clamped);
  };

  const handleEndChange = (val: number) => {
    const clamped = Math.min(totalDuration, Math.max(val, startSec + 0.1));
    setEndSec(clamped);
    handleSeek(clamped);
  };

  const handleResetToFull = () => {
    setStartSec(0);
    setEndSec(totalDuration);
    handleSeek(0);
  };

  const handleApply = () => {
    if (startSec <= 0.05 && endSec >= totalDuration - 0.05) {
      // Entire video selected: no trim needed
      onApply(item.id, null);
    } else {
      onApply(item.id, {
        start: parseFloat(startSec.toFixed(3)),
        end: parseFloat(endSec.toFixed(3)),
      });
    }
    onClose();
  };

  const selectedDuration = Math.max(0, endSec - startSec);
  const trimmedOffDuration = Math.max(0, totalDuration - selectedDuration);
  const isTrimActive = startSec > 0.05 || endSec < totalDuration - 0.05;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Scissors size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Trim: {item.file.name}
              </h3>
              <p className="text-[11px] text-slate-500">
                Frame-accurate cuts • Audio packet-aligned
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Video Player */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200/80 shadow-inner group">
            <video
              ref={videoRef}
              src={item.previewUrl}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
            />

            {/* Play/Pause Overlay Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md backdrop-blur-xs"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}
            </button>

            {/* Current Position Tag */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-[11px] font-mono text-white tracking-tight backdrop-blur-xs">
              {formatSecondsToTimestamp(currentTime)} / {formatSecondsToTimestamp(totalDuration)}
            </div>
          </div>

          {/* Range Visualizer & Dual Sliders */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Trim Range Selection</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Looping active segment
              </span>
            </div>

            {/* Visual Timeline Bar */}
            <div className="relative h-6 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center">
              {/* Highlight active selection */}
              <div
                className="absolute h-full bg-primary-100 border-x-2 border-primary-500 transition-all pointer-events-none"
                style={{
                  left: `${totalDuration > 0 ? (startSec / totalDuration) * 100 : 0}%`,
                  width: `${
                    totalDuration > 0 ? ((endSec - startSec) / totalDuration) * 100 : 100
                  }%`,
                }}
              />
              {/* Playhead indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 transition-all pointer-events-none"
                style={{
                  left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
                }}
              />
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Start Handle ({formatSecondsToTimestamp(startSec)})
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.1, totalDuration - 0.1)}
                  step={0.05}
                  value={startSec}
                  onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                  className="w-full accent-primary-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1 text-right">
                  End Handle ({formatSecondsToTimestamp(endSec)})
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={totalDuration}
                  step={0.05}
                  value={endSec}
                  onChange={(e) => handleEndChange(parseFloat(e.target.value))}
                  className="w-full accent-primary-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Numeric Timestamp Inputs */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Clock size={13} className="text-slate-500" />
              Precise Timestamp Input (mm:ss.s)
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={formatSecondsToTimestamp(startSec)}
                  onChange={(e) => {
                    const parsed = parseTimestampToSeconds(e.target.value);
                    if (parsed !== null) handleStartChange(parsed);
                  }}
                  className="w-full text-center text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <ArrowRight size={14} className="text-slate-400 shrink-0" />
              <div className="flex-1">
                <input
                  type="text"
                  value={formatSecondsToTimestamp(endSec)}
                  onChange={(e) => {
                    const parsed = parseTimestampToSeconds(e.target.value);
                    if (parsed !== null) handleEndChange(parsed);
                  }}
                  className="w-full text-center text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Readout Summary */}
            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600 border-t border-slate-200/60">
              <span>
                Selected: <strong className="text-slate-900">{formatSecondsToTimestamp(selectedDuration)}</strong> of {formatSecondsToTimestamp(totalDuration)}
              </span>
              {isTrimActive && (
                <span className="text-rose-600 font-medium">
                  -{formatSecondsToTimestamp(trimmedOffDuration)} removed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            icon={RotateCcw}
            onClick={handleResetToFull}
            disabled={!isTrimActive}
          >
            Reset to Full
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="xs"
              icon={Check}
              onClick={handleApply}
            >
              Apply Trim
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
