'use client';

import React, { useRef, useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Play, Pause, RotateCcw, Volume2, VolumeX, ChevronDown, Check } from 'lucide-react';

export interface VideoComparisonProps {
  originalUrl: string;
  cleanedUrl: string;
}

export default function VideoComparison({ originalUrl, cleanedUrl }: VideoComparisonProps) {
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const cleanedVideoRef = useRef<HTMLVideoElement>(null);
  const ambientOriginalRef = useRef<HTMLVideoElement>(null);
  const ambientCleanedRef = useRef<HTMLVideoElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  // Default both players to muted to prevent dual audio collision
  const [isAudioMuted, setIsAudioMuted] = useState(true);

  // Close speed menu on outside click or Escape
  useEffect(() => {
    if (!isSpeedMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSpeedMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSpeedMenuOpen]);

  const syncPlaybackRate = (speed: number) => {
    if (originalVideoRef.current) originalVideoRef.current.playbackRate = speed;
    if (cleanedVideoRef.current) cleanedVideoRef.current.playbackRate = speed;
    if (ambientOriginalRef.current) ambientOriginalRef.current.playbackRate = speed;
    if (ambientCleanedRef.current) ambientCleanedRef.current.playbackRate = speed;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    syncPlaybackRate(speed);
  };

  const togglePlay = () => {
    if (!originalVideoRef.current || !cleanedVideoRef.current) return;

    if (isPlaying) {
      originalVideoRef.current.pause();
      cleanedVideoRef.current.pause();
      if (ambientOriginalRef.current) ambientOriginalRef.current.pause();
      if (ambientCleanedRef.current) ambientCleanedRef.current.pause();
      setIsPlaying(false);
    } else {
      // Sync times before playing
      const targetTime = cleanedVideoRef.current.currentTime;
      originalVideoRef.current.currentTime = targetTime;
      if (ambientOriginalRef.current) ambientOriginalRef.current.currentTime = targetTime;
      if (ambientCleanedRef.current) ambientCleanedRef.current.currentTime = targetTime;

      // Audio safety: original is ALWAYS muted, only cleaned can have audio
      originalVideoRef.current.muted = true;
      cleanedVideoRef.current.muted = isAudioMuted;

      syncPlaybackRate(playbackSpeed);

      Promise.all([
        originalVideoRef.current.play().catch(() => {}),
        cleanedVideoRef.current.play().catch(() => {}),
        ambientOriginalRef.current?.play().catch(() => {}),
        ambientCleanedRef.current?.play().catch(() => {}),
      ]).then(() => {
        setIsPlaying(true);
      });
    }
  };

  const handleRestart = () => {
    if (!originalVideoRef.current || !cleanedVideoRef.current) return;
    originalVideoRef.current.currentTime = 0;
    cleanedVideoRef.current.currentTime = 0;
    if (ambientOriginalRef.current) ambientOriginalRef.current.currentTime = 0;
    if (ambientCleanedRef.current) ambientCleanedRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (originalVideoRef.current) originalVideoRef.current.currentTime = time;
    if (cleanedVideoRef.current) cleanedVideoRef.current.currentTime = time;
    if (ambientOriginalRef.current) ambientOriginalRef.current.currentTime = time;
    if (ambientCleanedRef.current) ambientCleanedRef.current.currentTime = time;
  };

  const handleTimeUpdate = () => {
    if (cleanedVideoRef.current) {
      setCurrentTime(cleanedVideoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (cleanedVideoRef.current) {
      setDuration(cleanedVideoRef.current.duration || 0);
    }
  };

  const toggleAudio = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    if (cleanedVideoRef.current) {
      cleanedVideoRef.current.muted = nextMuted;
    }
    // Original strictly remains muted
    if (originalVideoRef.current) {
      originalVideoRef.current.muted = true;
    }
  };

  // Format seconds to mm:ss or m:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4">
      {/* 2-Column Comparison View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Video Frame */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/80 flex items-center justify-center shadow-xs aspect-video sm:aspect-auto sm:h-[380px]">
          {/* Ambient Blurred Backdrop */}
          <video
            ref={ambientOriginalRef}
            src={originalUrl}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
            aria-hidden="true"
          />

          {/* Top-Left Badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/85 text-white backdrop-blur-xs shadow-xs border border-white/10">
              Original (Watermarked)
            </span>
          </div>

          {/* Foreground Crisp Video */}
          <video
            ref={originalVideoRef}
            src={originalUrl}
            playsInline
            muted
            className="relative z-1 w-full h-full max-h-[380px] object-contain pointer-events-none"
          />
        </div>

        {/* Cleaned Video Frame */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-emerald-300/80 flex items-center justify-center shadow-xs aspect-video sm:aspect-auto sm:h-[380px]">
          {/* Ambient Blurred Backdrop */}
          <video
            ref={ambientCleanedRef}
            src={cleanedUrl}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
            aria-hidden="true"
          />

          {/* Top-Left Badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600/90 text-white backdrop-blur-xs shadow-xs border border-emerald-400/30">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Cleaned (Restored)
            </span>
          </div>

          {/* Foreground Crisp Video */}
          <video
            ref={cleanedVideoRef}
            src={cleanedUrl}
            playsInline
            muted={isAudioMuted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="relative z-1 w-full h-full max-h-[380px] object-contain pointer-events-none"
          />
        </div>
      </div>

      {/* Synchronized Player Controller Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        {/* Playback Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            icon={isPlaying ? Pause : Play}
            onClick={togglePlay}
          >
            {isPlaying ? 'Pause' : 'Play Both'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={handleRestart}
          >
            Restart
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={isAudioMuted ? VolumeX : Volume2}
            onClick={toggleAudio}
            className="text-slate-600 hover:text-slate-900"
            title={isAudioMuted ? 'Unmute cleaned video audio' : 'Mute audio'}
          >
            {isAudioMuted ? 'Muted' : 'Audio On'}
          </Button>
        </div>

        {/* Scrubber Track */}
        <div className="flex-1 flex items-center gap-2.5 w-full sm:max-w-md">
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-primary-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        {/* Custom Playback Speed Selector */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 shrink-0">
          <span>Playback Speed</span>
          <div ref={speedMenuRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsSpeedMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-primary-500/20"
              aria-expanded={isSpeedMenuOpen}
              aria-haspopup="listbox"
            >
              <span>{playbackSpeed}x</span>
              <ChevronDown
                size={12}
                className={`text-slate-400 transition-transform duration-150 ${
                  isSpeedMenuOpen ? 'rotate-180 text-primary-600' : ''
                }`}
              />
            </button>

            {/* Custom Floating Popover Dropdown */}
            {isSpeedMenuOpen && (
              <div
                role="listbox"
                className="absolute right-0 bottom-full mb-1.5 w-28 rounded-xl border border-slate-200/90 bg-white p-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                {[0.5, 1, 1.25, 1.5, 2].map((speed) => {
                  const isSelected = playbackSpeed === speed;
                  return (
                    <button
                      key={speed}
                      role="option"
                      aria-selected={isSelected}
                      type="button"
                      onClick={() => {
                        handleSpeedChange(speed);
                        setIsSpeedMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left ${
                        isSelected
                          ? 'bg-primary-50 text-primary-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{speed}x</span>
                      {isSelected && <Check size={13} className="text-primary-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
