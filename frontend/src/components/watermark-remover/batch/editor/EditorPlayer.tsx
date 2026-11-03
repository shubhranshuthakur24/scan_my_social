'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { BatchVideoItem } from '@/lib/watermark/batch/batchTypes';
import { isEditableTarget } from '@/lib/watermark/batch/timelineProjection';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Volume1,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export type PlaybackCommand =
  | {
      type: 'seek-same-source';
      sourceTime: number;
      sequenceTime: number;
      transitionId: number;
    }
  | {
      type: 'switch-source';
      sourceClipId: string;
      sourceTime: number;
      sequenceTime: number;
      transitionId: number;
    }
  | {
      type: 'seek-sequence';
      sourceClipId: string;
      sourceTime: number;
      sequenceTime: number;
      transitionId: number;
    }
  | {
      type: 'end';
    };

export interface EditorPlayerHandle {
  executeCommand: (command: PlaybackCommand) => Promise<boolean>;
  play: () => Promise<void>;
  pause: () => void;
}

export interface EditorPlayerProps {
  activeItem: BatchVideoItem | null;
  nextItem?: BatchVideoItem | null;
  activeIndex: number;
  totalItems: number;
  hasNextSegment?: boolean;
  isPlaying: boolean;
  fps?: number | null;
  canSplit?: boolean;
  splitDisabledReason?: string;
  onSplitAtPlayhead?: () => void;
  onPlayPause: () => void;
  onSeekSourceTime: (sourceTime: number) => void;
  onPrevClip: () => void;
  onNextClip: () => void;
  onBoundaryCrossed: () => void;
  onSequenceEnded: () => void;
  onTimeUpdate?: (sourceTime: number, clipId: string) => void;
  onDeleteSelectedClip?: () => void;
  onResolveUncertain: (id: string, resolution: 'force_clean' | 'keep_original') => void;
  initialSeekTime?: number | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const EditorPlayer = forwardRef<EditorPlayerHandle, EditorPlayerProps>(function EditorPlayer(
  {
    activeItem,
    nextItem,
    activeIndex,
    totalItems,
    hasNextSegment,
    isPlaying,
    fps,
    canSplit = false,
    splitDisabledReason,
    onSplitAtPlayhead,
    onPlayPause,
    onSeekSourceTime,
    onPrevClip,
    onNextClip,
    onBoundaryCrossed,
    onSequenceEnded,
    onTimeUpdate,
    onDeleteSelectedClip,
    onResolveUncertain,
    initialSeekTime,
    isFullscreen,
    onToggleFullscreen,
  },
  ref
) {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(1);
  const [isLooping, setIsLooping] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);

  // Dual-Deck (A/B) seamless video state
  const [activeDeck, setActiveDeck] = useState<'A' | 'B'>('A');
  const deckARef = useRef<HTMLVideoElement | null>(null);
  const deckBRef = useRef<HTMLVideoElement | null>(null);

  // Synchronous refs for playback handoff controller
  const isPlayingRef = useRef<boolean>(isPlaying);
  const currentClipIdRef = useRef<string | null>(activeItem?.id ?? null);
  const isHandoffTriggeredRef = useRef<boolean>(false);
  const shouldAutoResumeRef = useRef<boolean>(false);

  // Monotonic player operation token and transitioning guard
  const transitionTokenRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);

  // Computed seek tolerance for decoder hardware settling verification
  const MIN_SEEK_TOLERANCE = 0.02; // 20ms
  const MAX_SEEK_TOLERANCE = 0.08; // 80ms
  const seekTolerance = Math.max(
    MIN_SEEK_TOLERANCE,
    Math.min(MAX_SEEK_TOLERANCE, fps && fps > 0 ? 0.5 / fps : 0.05)
  );

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;
    const inactiveEl = activeDeck === 'A' ? deckBRef.current : deckARef.current;

    if (!isPlaying) {
      if (activeEl && !activeEl.paused) {
        activeEl.pause();
      }
      if (inactiveEl && !inactiveEl.paused) {
        inactiveEl.pause();
      }
      return;
    }

    // When playing: ensure inactive deck is paused (only active deck should play)
    if (inactiveEl && !inactiveEl.paused && !isTransitioningRef.current) {
      inactiveEl.pause();
    }

    if (activeEl && activeEl.paused) {
      activeEl.play().catch(() => {});
    }
  }, [isPlaying, activeDeck]);

  useEffect(() => {
    currentClipIdRef.current = activeItem?.id ?? null;
    isHandoffTriggeredRef.current = false;
    shouldAutoResumeRef.current = isPlaying;
  }, [activeItem?.id, isPlaying]);

  // Invalidate tokens on component unmount to prevent leaks and post-unmount execution
  useEffect(() => {
    return () => {
      transitionTokenRef.current += 1;
      isTransitioningRef.current = false;
    };
  }, []);

  // Trim bounds for active clip
  const trimStart = activeItem?.trimRange?.start ?? 0;
  const trimEnd = activeItem?.trimRange?.end ?? (activeItem?.metadata?.duration || 0);
  const clipDuration = Math.max(0.1, trimEnd - trimStart);

  // Adaptive boundary tolerance to safely handle ultra-short clips without premature halting
  const effectiveBoundaryTolerance = Math.min(0.05, clipDuration * 0.25);

  // Format timecode (MM:SS.ss)
  const formatTimecode = (seconds: number) => {
    const s = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const millis = Math.floor((s % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  // Wait for deck readiness with diagnostics, error/abort handling, and strict failure on timeout
  const waitForDeckReady = useCallback(
    (
      videoEl: HTMLVideoElement,
      targetSourceTime: number,
      token: number
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        // Stale transition: silently abandon
        if (token !== transitionTokenRef.current) {
          resolve(false);
          return;
        }

        const isReady =
          videoEl.readyState >= 3 &&
          Math.abs(videoEl.currentTime - targetSourceTime) <= seekTolerance;

        if (isReady) {
          resolve(true);
          return;
        }

        const timeoutId = setTimeout(() => {
          cleanup();
          if (token === transitionTokenRef.current) {
            console.warn('[EditorPlayer] Deck readiness timed out after 500ms for target:', targetSourceTime);
          }
          resolve(false); // Strictly failure on timeout!
        }, 500);

        const handleReady = () => {
          if (
            videoEl.readyState >= 2 &&
            Math.abs(videoEl.currentTime - targetSourceTime) <= seekTolerance
          ) {
            cleanup();
            resolve(token === transitionTokenRef.current);
          }
        };

        const handleFailure = (e: Event) => {
          cleanup();
          if (token === transitionTokenRef.current) {
            console.warn(`[EditorPlayer] Deck readiness failed with media event: ${e.type}`, e);
          }
          resolve(false); // Immediate failure on error or abort
        };

        const cleanup = () => {
          clearTimeout(timeoutId);
          videoEl.removeEventListener('seeked', handleReady);
          videoEl.removeEventListener('canplay', handleReady);
          videoEl.removeEventListener('error', handleFailure);
          videoEl.removeEventListener('abort', handleFailure);
        };

        videoEl.addEventListener('seeked', handleReady);
        videoEl.addEventListener('canplay', handleReady);
        videoEl.addEventListener('error', handleFailure);
        videoEl.addEventListener('abort', handleFailure);
      });
    },
    [seekTolerance]
  );

  // Issues seek immediately on active video element without requiring deck readiness or source switching
  const executeSameSourceSeek = useCallback(
    async (targetSourceTime: number, playerToken: number): Promise<boolean> => {
      if (playerToken !== transitionTokenRef.current) return false;
      const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;
      if (!activeEl) return false;

      activeEl.currentTime = targetSourceTime;
      setDisplayTime(targetSourceTime);
      return true;
    },
    [activeDeck]
  );

  // Pre-seeks alternate deck, verifies readiness, plays, checks token supersession, and swaps deck
  const executeSwitchSource = useCallback(
    async (
      sourceClipId: string,
      targetSourceTime: number,
      playerToken: number
    ): Promise<boolean> => {
      const altDeck = activeDeck === 'A' ? deckBRef.current : deckARef.current;
      const currentDeck = activeDeck === 'A' ? deckARef.current : deckBRef.current;
      if (!altDeck || !currentDeck) return false;

      isTransitioningRef.current = true;

      // 1. Explicitly seek alternate deck prior to waiting
      altDeck.currentTime = targetSourceTime;

      // 2. Wait for readiness and verify seek landed within tolerance
      const isReady = await waitForDeckReady(altDeck, targetSourceTime, playerToken);
      if (!isReady || playerToken !== transitionTokenRef.current) {
        isTransitioningRef.current = false;
        return false;
      }

      // 3. Start playback on alternate deck if player is currently playing
      if (isPlayingRef.current) {
        try {
          await altDeck.play();
        } catch {
          // Playback rejected (e.g. autoplay restriction, decoder stall)
          isTransitioningRef.current = false;
          return false;
        }
      }

      // 4. Check token immediately after play() before committing deck swap
      if (playerToken !== transitionTokenRef.current) {
        if (!altDeck.paused) {
          altDeck.pause();
        }
        isTransitioningRef.current = false;
        return false;
      }

      // 5. Commit deck swap with zero visible flicker
      setActiveDeck((prev) => (prev === 'A' ? 'B' : 'A'));
      if (!currentDeck.paused) {
        currentDeck.pause();
      }
      currentClipIdRef.current = sourceClipId;
      isTransitioningRef.current = false;
      return true;
    },
    [activeDeck, waitForDeckReady]
  );

  // Primary imperative command consumer
  const executeCommand = useCallback(
    async (command: PlaybackCommand): Promise<boolean> => {
      // 1. Invalidate any in-flight asynchronous operations
      isTransitioningRef.current = false;

      // 2. Establish fresh monotonic token for this specific execution
      const playerToken = ++transitionTokenRef.current;

      // 3. Handle 'end' command: explicitly cancel pending operations and pause
      if (command.type === 'end') {
        isTransitioningRef.current = false;
        const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;
        const inactiveEl = activeDeck === 'A' ? deckBRef.current : deckARef.current;
        if (activeEl && !activeEl.paused) {
          activeEl.pause();
        }
        if (inactiveEl && !inactiveEl.paused) {
          inactiveEl.pause();
        }
        return true;
      }

      // 4. Resolve high-level seek-sequence to underlying media mechanics
      if (command.type === 'seek-sequence') {
        const isSameSource = command.sourceClipId === currentClipIdRef.current;
        if (isSameSource) {
          return executeSameSourceSeek(command.sourceTime, playerToken);
        } else {
          return executeSwitchSource(command.sourceClipId, command.sourceTime, playerToken);
        }
      }

      if (command.type === 'seek-same-source') {
        return executeSameSourceSeek(command.sourceTime, playerToken);
      }

      if (command.type === 'switch-source') {
        return executeSwitchSource(command.sourceClipId, command.sourceTime, playerToken);
      }

      return false;
    },
    [activeDeck, executeSameSourceSeek, executeSwitchSource]
  );

  // Expose imperative handle to parent coordinator
  useImperativeHandle(
    ref,
    () => ({
      executeCommand,
      play: async () => {
        const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;
        if (activeEl && activeEl.paused) {
          await activeEl.play();
        }
      },
      pause: () => {
        const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;
        const inactiveEl = activeDeck === 'A' ? deckBRef.current : deckARef.current;
        if (activeEl && !activeEl.paused) {
          activeEl.pause();
        }
        if (inactiveEl && !inactiveEl.paused) {
          inactiveEl.pause();
        }
      },
    }),
    [activeDeck, executeCommand]
  );

  // Step backwards / forwards with source clamp (frame-accurate if fps available)
  const handleStep = useCallback(
    (direction: number, isLargeStep: boolean = false) => {
      // Manual scrub: invalidate any pending background transition
      transitionTokenRef.current += 1;
      isTransitioningRef.current = false;

      const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;
      if (!activeItem || !activeEl) return;

      let stepSec = 1;
      if (fps && fps > 0) {
        stepSec = isLargeStep ? 10 / fps : 1 / fps;
      } else {
        stepSec = isLargeStep ? 5 : 1;
      }

      const delta = direction * stepSec;
      const nextTime = Math.max(trimStart, Math.min(trimEnd, activeEl.currentTime + delta));
      activeEl.currentTime = nextTime;
      setDisplayTime(nextTime);
      onSeekSourceTime(nextTime);
    },
    [activeDeck, activeItem, fps, trimStart, trimEnd, onSeekSourceTime]
  );

  // Studio Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;

      if (e.code === 'Space') {
        e.preventDefault();
        onPlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStep(-1, e.shiftKey);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStep(1, e.shiftKey);
      } else if (e.code === 'Home') {
        e.preventDefault();
        if (activeEl) {
          transitionTokenRef.current += 1;
          isTransitioningRef.current = false;
          activeEl.currentTime = trimStart;
          setDisplayTime(trimStart);
          onSeekSourceTime(trimStart);
        }
      } else if (e.code === 'End') {
        e.preventDefault();
        if (activeEl) {
          transitionTokenRef.current += 1;
          isTransitioningRef.current = false;
          activeEl.currentTime = trimEnd;
          setDisplayTime(trimEnd);
          onSeekSourceTime(trimEnd);
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        onDeleteSelectedClip?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDeck, onPlayPause, handleStep, trimStart, trimEnd, onSeekSourceTime, onDeleteSelectedClip]);

  // Dual-Deck Sources: active deck displays activeItem, alternate deck preloads nextItem
  const deckASrc = activeDeck === 'A' ? (activeItem?.previewUrl ?? '') : (nextItem?.previewUrl ?? '');
  const deckBSrc = activeDeck === 'B' ? (activeItem?.previewUrl ?? '') : (nextItem?.previewUrl ?? '');

  // Synchronize volume level with both video elements
  useEffect(() => {
    const effectiveVol = isMuted ? 0 : volume;
    if (deckARef.current) {
      deckARef.current.volume = effectiveVol;
    }
    if (deckBRef.current) {
      deckBRef.current.volume = effectiveVol;
    }
  }, [volume, isMuted, deckASrc, deckBSrc]);

  const handleVolumeChange = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (clamped > 0) {
      setIsMuted(false);
      prevVolumeRef.current = clamped;
    } else {
      setIsMuted(true);
    }
    if (deckARef.current) deckARef.current.volume = clamped;
    if (deckBRef.current) deckBRef.current.volume = clamped;
  }, []);

  const handleToggleMute = useCallback(() => {
    if (isMuted || volume === 0) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 1;
      setIsMuted(false);
      setVolume(restored);
      if (deckARef.current) deckARef.current.volume = restored;
      if (deckBRef.current) deckBRef.current.volume = restored;
    } else {
      prevVolumeRef.current = volume;
      setIsMuted(true);
      if (deckARef.current) deckARef.current.volume = 0;
      if (deckBRef.current) deckBRef.current.volume = 0;
    }
  }, [isMuted, volume]);

  // Preload Deck: Prime next clip's first frame ahead of time
  const handlePreloadLoadedMetadata = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const el = e.currentTarget;
      const targetTrimStart = nextItem?.trimRange?.start ?? 0;
      el.currentTime = targetTrimStart;
    },
    [nextItem?.trimRange?.start]
  );

  // Active Deck: Handle ready-to-play
  const handleActiveLoadedMetadata = useCallback(() => {
    const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;
    if (!activeEl || !activeItem) return;

    activeEl.volume = isMuted ? 0 : volume;

    const targetSeek =
      initialSeekTime !== undefined && initialSeekTime !== null
        ? Math.max(trimStart, Math.min(trimEnd, initialSeekTime))
        : trimStart;

    activeEl.currentTime = targetSeek;
    setDisplayTime(targetSeek);

    if (isPlayingRef.current || shouldAutoResumeRef.current) {
      shouldAutoResumeRef.current = false;
      activeEl.play().catch(() => {});
    }
  }, [activeDeck, activeItem, initialSeekTime, trimStart, trimEnd, isMuted, volume]);

  // Trigger boundary notification to parent coordinator (idempotent, single-emission)
  const handleBoundaryCrossedInternal = useCallback(() => {
    if (isHandoffTriggeredRef.current) return;
    isHandoffTriggeredRef.current = true;

    if (isLooping) {
      const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;
      if (activeEl) {
        activeEl.currentTime = trimStart;
        activeEl.play().catch(() => {});
      }
      isHandoffTriggeredRef.current = false;
      return;
    }

    const hasNext =
      hasNextSegment !== undefined ? hasNextSegment : activeIndex < totalItems - 1 && !!nextItem;

    if (hasNext) {
      onBoundaryCrossed();
    } else {
      onSequenceEnded();
    }
  }, [
    activeDeck,
    activeIndex,
    totalItems,
    nextItem,
    hasNextSegment,
    isLooping,
    trimStart,
    onBoundaryCrossed,
    onSequenceEnded,
  ]);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
      {/* Player Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 border-b border-slate-200/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-700">Preview Monitor</span>
          {activeItem?.metadata && (
            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded shrink-0 font-medium">
              {activeItem.metadata.width}×{activeItem.metadata.height} ({(activeItem.metadata.frameRate || 30).toFixed(0)}fps)
            </span>
          )}
        </div>

        {/* Timecode Readout */}
        <div className="flex items-center gap-2">
          {fps && fps > 0 && (
            <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300/80 shadow-2xs">
              F{Math.round(displayTime * fps)}
            </span>
          )}
          <span className="text-xs font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200/80 shadow-2xs">
            {formatTimecode(displayTime)} / {formatTimecode(trimEnd)}
          </span>
        </div>
      </div>

      {/* Video Viewport (Dual-Deck Layered Container) */}
      <div
        className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'min-h-[320px] max-h-[460px]' : 'min-h-[220px] max-h-[280px]'
        }`}
      >
        {/* Deck A */}
        {deckASrc && (
          <video
            ref={deckARef}
            src={deckASrc}
            muted={isMuted || activeDeck !== 'A'}
            playsInline
            className={`absolute inset-0 w-full h-full object-contain ${
              activeDeck === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
            onLoadedMetadata={activeDeck === 'A' ? handleActiveLoadedMetadata : handlePreloadLoadedMetadata}
            onCanPlay={() => {
              if (
                activeDeck === 'A' &&
                (isPlayingRef.current || shouldAutoResumeRef.current) &&
                deckARef.current?.paused
              ) {
                shouldAutoResumeRef.current = false;
                deckARef.current.play().catch(() => {});
              }
            }}
            onSeeked={() => {
              if (activeDeck === 'A' && deckARef.current) {
                setDisplayTime(deckARef.current.currentTime);
              }
            }}
            onTimeUpdate={() => {
              if (activeDeck !== 'A' || !deckARef.current || !activeItem) return;
              const cur = deckARef.current.currentTime;
              setDisplayTime(cur);
              onTimeUpdate?.(cur, activeItem.id);

              if (cur >= trimEnd - effectiveBoundaryTolerance) {
                handleBoundaryCrossedInternal();
              }
            }}
            onEnded={() => {
              if (activeDeck !== 'A') return;
              handleBoundaryCrossedInternal();
            }}
          />
        )}

        {/* Deck B (Preload / Alternate Deck) */}
        {deckBSrc && (
          <video
            ref={deckBRef}
            src={deckBSrc}
            muted={isMuted || activeDeck !== 'B'}
            playsInline
            className={`absolute inset-0 w-full h-full object-contain ${
              activeDeck === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
            onLoadedMetadata={activeDeck === 'B' ? handleActiveLoadedMetadata : handlePreloadLoadedMetadata}
            onCanPlay={() => {
              if (
                activeDeck === 'B' &&
                (isPlayingRef.current || shouldAutoResumeRef.current) &&
                deckBRef.current?.paused
              ) {
                shouldAutoResumeRef.current = false;
                deckBRef.current.play().catch(() => {});
              }
            }}
            onSeeked={() => {
              if (activeDeck === 'B' && deckBRef.current) {
                setDisplayTime(deckBRef.current.currentTime);
              }
            }}
            onTimeUpdate={() => {
              if (activeDeck !== 'B' || !deckBRef.current || !activeItem) return;
              const cur = deckBRef.current.currentTime;
              setDisplayTime(cur);
              onTimeUpdate?.(cur, activeItem.id);

              if (cur >= trimEnd - effectiveBoundaryTolerance) {
                handleBoundaryCrossedInternal();
              }
            }}
            onEnded={() => {
              if (activeDeck !== 'B') return;
              handleBoundaryCrossedInternal();
            }}
          />
        )}

        {!deckASrc && !deckBSrc && (
          <div className="text-center p-6 text-slate-600">
            <p className="text-xs">No clip selected</p>
          </div>
        )}

        {/* Floating Watermark Status Overlay */}
        {activeItem && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
            {activeItem.watermarkDecision === 'pending' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-amber-400 border border-amber-500/30 backdrop-blur-xs text-[11px] font-medium shadow-md">
                <Loader2 size={12} className="animate-spin" />
                <span>Scanning Watermark...</span>
              </div>
            )}
            {activeItem.watermarkDecision === 'none' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-emerald-400 border border-emerald-500/30 backdrop-blur-xs text-[11px] font-medium shadow-md">
                <CheckCircle2 size={12} />
                <span>No Watermark</span>
              </div>
            )}
            {activeItem.watermarkDecision === 'detected' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-primary-300 border border-primary-500/30 backdrop-blur-xs text-[11px] font-medium shadow-md">
                <Sparkles size={12} />
                <span>Watermark Detected (Auto-Clean)</span>
              </div>
            )}
            {activeItem.watermarkDecision === 'uncertain' && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 text-amber-300 border border-amber-500/40 backdrop-blur-xs text-[11px] font-medium shadow-md">
                <AlertTriangle size={12} className="text-amber-400" />
                <span>Uncertain Watermark</span>
                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    onClick={() => onResolveUncertain(activeItem.id, 'force_clean')}
                    className="px-1.5 py-0.5 rounded bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-bold"
                  >
                    Clean
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveUncertain(activeItem.id, 'keep_original')}
                    className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold"
                  >
                    Keep
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transport Bar Controls */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50/80 border-t border-slate-200/80">
        <div className="flex items-center gap-1 shrink-0">
          {/* Jump Prev Clip */}
          <button
            type="button"
            onClick={onPrevClip}
            disabled={activeIndex <= 0}
            title="Jump to Previous Clip (Home)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 disabled:opacity-30 transition-colors"
          >
            <SkipBack size={15} />
          </button>

          {/* Step -1 Frame / -1s */}
          <button
            type="button"
            onClick={() => handleStep(-1, false)}
            disabled={!activeItem}
            title={fps && fps > 0 ? 'Step Back 1 Frame (Left Arrow, Shift for 10)' : 'Step Back 1s (Left Arrow)'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={onPlayPause}
            disabled={!activeItem}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="p-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed mx-1"
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
          </button>

          {/* Step +1 Frame / +1s */}
          <button
            type="button"
            onClick={() => handleStep(1, false)}
            disabled={!activeItem}
            title={fps && fps > 0 ? 'Step Forward 1 Frame (Right Arrow, Shift for 10)' : 'Step Forward 1s (Right Arrow)'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          {/* Jump Next Clip */}
          <button
            type="button"
            onClick={onNextClip}
            disabled={activeIndex >= totalItems - 1}
            title="Jump to Next Clip (End)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 disabled:opacity-30 transition-colors"
          >
            <SkipForward size={15} />
          </button>
        </div>

        {/* Active Clip Name (Centered in Transport Bar) */}
        <div className="flex items-center justify-center min-w-0 px-2 flex-1 max-w-[260px] sm:max-w-[340px]">
          <div
            className="flex items-center gap-1.5 min-w-0 w-full justify-center bg-white border border-slate-200/90 rounded-lg px-2.5 py-1 shadow-2xs"
            title={activeItem ? activeItem.file.name : 'No Clip Selected'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-slate-700 truncate">
              {activeItem ? activeItem.file.name : 'No Clip Selected'}
            </span>
          </div>
        </div>

        {/* Right Controls: Loop & Volume Control & Fullscreen */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsLooping(!isLooping)}
            title={isLooping ? 'Looping Active Clip' : 'Sequential Timeline Playback'}
            className={`p-1.5 rounded-lg transition-colors ${
              isLooping
                ? 'text-primary-700 bg-primary-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <Repeat size={15} />
          </button>

          {/* Volume Control Group (Mute Button + Level Slider) */}
          <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-lg px-1.5 py-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted || volume === 0 ? 'Unmute' : `Mute (${Math.round(volume * 100)}%)`}
              className={`p-1 rounded-md transition-colors ${
                isMuted || volume === 0
                  ? 'text-rose-600 bg-rose-50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={15} />
              ) : volume < 0.5 ? (
                <Volume1 size={15} />
              ) : (
                <Volume2 size={15} />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              aria-label="Volume level"
              className="w-14 sm:w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-hidden"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (onToggleFullscreen) {
                onToggleFullscreen();
              } else {
                const activeEl = activeDeck === 'A' ? deckARef.current : deckBRef.current;
                if (activeEl?.requestFullscreen) {
                  activeEl.requestFullscreen();
                }
              }
            }}
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Studio Full Screen'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
});

export default EditorPlayer;
