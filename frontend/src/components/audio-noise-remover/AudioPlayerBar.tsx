'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Repeat, Radio } from 'lucide-react';
import Button from '@/components/ui/Button';

interface AudioPlayerBarProps {
  originalBuffer: AudioBuffer | null;
  cleanedBuffer: AudioBuffer | null;
  currentTime: number;
  onTimeUpdate: (timeSec: number) => void;
  disabled?: boolean;
}

export default function AudioPlayerBar({
  originalBuffer,
  cleanedBuffer,
  currentTime,
  onTimeUpdate,
  disabled = false,
}: AudioPlayerBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSource, setActiveSource] = useState<'original' | 'cleaned'>('cleaned');
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const originalSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const cleanedSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeOriginalRef = useRef<GainNode | null>(null);
  const gainNodeCleanedRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const startPlaybackTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const duration = cleanedBuffer?.duration || originalBuffer?.duration || 0;

  // Initialize Web Audio Context
  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();

      const master = ctx.createGain();
      master.connect(ctx.destination);
      masterGainRef.current = master;

      const gainA = ctx.createGain();
      gainA.gain.value = activeSource === 'original' ? 1.0 : 0.0;
      gainA.connect(master);
      gainNodeOriginalRef.current = gainA;

      const gainB = ctx.createGain();
      gainB.gain.value = activeSource === 'cleaned' ? 1.0 : 0.0;
      gainB.connect(master);
      gainNodeCleanedRef.current = gainB;

      audioCtxRef.current = ctx;
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    return audioCtxRef.current;
  }, [activeSource]);

  // Stop active sources
  const stopSources = useCallback(() => {
    if (originalSourceNodeRef.current) {
      try {
        originalSourceNodeRef.current.stop();
        originalSourceNodeRef.current.disconnect();
      } catch {}
      originalSourceNodeRef.current = null;
    }
    if (cleanedSourceNodeRef.current) {
      try {
        cleanedSourceNodeRef.current.stop();
        cleanedSourceNodeRef.current.disconnect();
      } catch {}
      cleanedSourceNodeRef.current = null;
    }
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Start playback from specific offset
  const playFrom = useCallback(
    (offsetSec: number) => {
      stopSources();
      const ctx = ensureAudioContext();
      if (!ctx || (!originalBuffer && !cleanedBuffer)) return;

      const clampedOffset = Math.max(0, Math.min(offsetSec, duration));

      if (originalBuffer && gainNodeOriginalRef.current) {
        const srcA = ctx.createBufferSource();
        srcA.buffer = originalBuffer;
        srcA.loop = isLooping;
        srcA.connect(gainNodeOriginalRef.current);
        srcA.start(0, clampedOffset);
        originalSourceNodeRef.current = srcA;
      }

      if (cleanedBuffer && gainNodeCleanedRef.current) {
        const srcB = ctx.createBufferSource();
        srcB.buffer = cleanedBuffer;
        srcB.loop = isLooping;
        srcB.connect(gainNodeCleanedRef.current);
        srcB.start(0, clampedOffset);
        cleanedSourceNodeRef.current = srcB;
      }

      startPlaybackTimeRef.current = ctx.currentTime;
      startOffsetRef.current = clampedOffset;
      setIsPlaying(true);

      // Playhead animation loop
      const updateLoop = () => {
        if (!audioCtxRef.current) return;
        const elapsed = audioCtxRef.current.currentTime - startPlaybackTimeRef.current;
        let now = startOffsetRef.current + elapsed;

        if (now >= duration) {
          if (isLooping && duration > 0) {
            now = now % duration;
            startOffsetRef.current = 0;
            startPlaybackTimeRef.current = audioCtxRef.current.currentTime;
          } else {
            now = duration;
            setIsPlaying(false);
            stopSources();
            onTimeUpdate(0);
            return;
          }
        }

        onTimeUpdate(now);
        animFrameRef.current = requestAnimationFrame(updateLoop);
      };

      animFrameRef.current = requestAnimationFrame(updateLoop);
    },
    [cleanedBuffer, originalBuffer, duration, isLooping, ensureAudioContext, onTimeUpdate, stopSources]
  );

  const togglePlay = () => {
    if (isPlaying) {
      stopSources();
      setIsPlaying(false);
    } else {
      playFrom(currentTime);
    }
  };

  // Crossfade between A and B with 15ms equal-power curve
  const switchSource = (source: 'original' | 'cleaned') => {
    setActiveSource(source);
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const gainA = gainNodeOriginalRef.current;
    const gainB = gainNodeCleanedRef.current;
    if (!gainA || !gainB) return;

    const now = ctx.currentTime;
    const crossfadeDuration = 0.015; // 15ms

    gainA.gain.cancelScheduledValues(now);
    gainB.gain.cancelScheduledValues(now);

    if (source === 'original') {
      gainA.gain.setValueAtTime(gainA.gain.value, now);
      gainA.gain.linearRampToValueAtTime(1.0, now + crossfadeDuration);
      gainB.gain.setValueAtTime(gainB.gain.value, now);
      gainB.gain.linearRampToValueAtTime(0.0, now + crossfadeDuration);
    } else {
      gainA.gain.setValueAtTime(gainA.gain.value, now);
      gainA.gain.linearRampToValueAtTime(0.0, now + crossfadeDuration);
      gainB.gain.setValueAtTime(gainB.gain.value, now);
      gainB.gain.linearRampToValueAtTime(1.0, now + crossfadeDuration);
    }
  };

  // Master Volume update
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.linearRampToValueAtTime(isMuted ? 0 : volume, now + 0.02);
    }
  }, [volume, isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSources();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopSources]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Play / Seek / Time */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          type="button"
          disabled={disabled || (!originalBuffer && !cleanedBuffer)}
          onClick={togglePlay}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            stopSources();
            onTimeUpdate(0);
            if (isPlaying) playFrom(0);
          }}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
          title="Restart from beginning"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="font-mono text-xs font-semibold text-slate-700 select-none">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* A/B Auditioning Toggle Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60 shadow-inner">
        <button
          type="button"
          disabled={disabled || !originalBuffer}
          onClick={() => switchSource('original')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSource === 'original'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${activeSource === 'original' ? 'text-amber-500' : 'text-slate-400'}`} />
          Original (Raw)
        </button>

        <button
          type="button"
          disabled={disabled || !cleanedBuffer}
          onClick={() => switchSource('cleaned')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSource === 'cleaned'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${activeSource === 'cleaned' ? 'text-white' : 'text-slate-400'}`} />
          Cleaned (DSP)
        </button>
      </div>

      {/* Loop & Volume */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsLooping(!isLooping)}
          className={`p-2 rounded-lg transition-all cursor-pointer ${
            isLooping ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:text-slate-700'
          }`}
          title="Loop Playback"
        >
          <Repeat className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
        </div>
      </div>
    </div>
  );
}
