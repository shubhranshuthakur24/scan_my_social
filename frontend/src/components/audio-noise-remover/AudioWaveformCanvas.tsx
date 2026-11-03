'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Volume2, RefreshCw, Scissors, ZoomIn, ZoomOut, Maximize2, Layers, Activity } from 'lucide-react';
import Button from '@/components/ui/Button';
import WaveformTimeRuler from './WaveformTimeRuler';
import { buildStereoPyramids, getVisibleBuckets } from '@/lib/audio/visualization/waveformData';
import {
  WaveformViewport,
  pixelToTime,
  timeToPixel,
  formatTime,
  zoomAt,
  panBy,
  clampViewport,
  DEFAULT_MIN_VIEWPORT_DURATION_SEC,
} from '@/lib/audio/visualization/viewportMath';
import { renderStaticWaveform } from '@/lib/audio/visualization/WaveformStaticRenderer';
import { renderDynamicLayer } from '@/lib/audio/visualization/WaveformDynamicRenderer';
import type { AudioQualityMetrics } from '@/lib/audio/types';

interface AudioWaveformCanvasProps {
  channelData?: Float32Array[];
  originalChannelData?: Float32Array[];
  cleanedChannelData?: Float32Array[] | null;
  sampleRate: number;
  duration: number;
  currentTime: number;
  onSeek?: (timeSec: number) => void;
  manualRegion: { startSec: number; endSec: number } | null;
  onManualRegionChange?: (region: { startSec: number; endSec: number } | null) => void;
  isProcessing?: boolean;
  viewport?: WaveformViewport;
  onViewportChange?: (viewport: WaveformViewport) => void;
  originalMetrics?: AudioQualityMetrics | null;
  cleanMetrics?: AudioQualityMetrics | null;
}

export default function AudioWaveformCanvas({
  channelData,
  originalChannelData,
  cleanedChannelData,
  sampleRate,
  duration,
  currentTime,
  onSeek,
  manualRegion,
  onManualRegionChange,
  isProcessing = false,
  viewport: controlledViewport,
  onViewportChange,
  originalMetrics,
  cleanMetrics,
}: AudioWaveformCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Original Track Canvas References
  const origStaticCanvasRef = useRef<HTMLCanvasElement>(null);
  const origDynamicCanvasRef = useRef<HTMLCanvasElement>(null);

  // Clean Track Canvas References
  const cleanStaticCanvasRef = useRef<HTMLCanvasElement>(null);
  const cleanDynamicCanvasRef = useRef<HTMLCanvasElement>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0, dpr: 1 });
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStartSec, setDragStartSec] = useState<number | null>(null);
  const [hoverTimeSec, setHoverTimeSec] = useState<number | null>(null);

  // Phase B1.5: Signal Diagnostics Overlay Toggle
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  // Viewport Navigation State (B1.3 / B1.4 Shared Canonical Viewport)
  const [internalViewport, setInternalViewport] = useState<WaveformViewport>(() => ({
    startTimeSec: 0,
    durationSec: Math.max(0.001, duration),
    totalDurationSec: Math.max(0.001, duration),
  }));

  // Spacebar tracking for Pan mode
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panLastXRef = useRef<number>(0);

  // Synchronize internal viewport when audio duration changes
  useEffect(() => {
    setInternalViewport({
      startTimeSec: 0,
      durationSec: Math.max(0.001, duration),
      totalDurationSec: Math.max(0.001, duration),
    });
  }, [duration]);

  // Active canonical viewport (controlled if prop provided, otherwise internal)
  const activeViewport = useMemo<WaveformViewport>(() => {
    const raw = controlledViewport ?? internalViewport;
    return clampViewport(
      {
        startTimeSec: raw.startTimeSec,
        durationSec: raw.durationSec > 0 ? raw.durationSec : Math.max(0.001, duration),
        totalDurationSec: Math.max(0.001, duration),
      },
      DEFAULT_MIN_VIEWPORT_DURATION_SEC
    );
  }, [controlledViewport, internalViewport, duration]);

  const updateViewport = useCallback(
    (updater: WaveformViewport | ((prev: WaveformViewport) => WaveformViewport)) => {
      const nextVp = typeof updater === 'function' ? updater(activeViewport) : updater;
      const clamped = clampViewport(nextVp, DEFAULT_MIN_VIEWPORT_DURATION_SEC);

      if (!controlledViewport) {
        setInternalViewport(clamped);
      }
      onViewportChange?.(clamped);
    },
    [activeViewport, controlledViewport, onViewportChange]
  );

  // 1. ORIGINAL WAVEFORM PYRAMIDS
  // Cached strictly by original channel data reference identity
  // NEVER rebuilt on currentTime, playback frames, resize, hover, zoom, or pan!
  const originalSourceData = originalChannelData || channelData;
  const originalPyramids = useMemo(() => {
    if (!originalSourceData || originalSourceData.length === 0 || duration <= 0) return null;

    if (typeof window !== 'undefined') {
      const inst = (window as unknown as { __WAVEFORM_INSTRUMENTATION__?: Record<string, number> }).__WAVEFORM_INSTRUMENTATION__ || {
        staticRenderCount: 0,
        dynamicRenderCount: 0,
        pyramidBuildCount: 0,
        cleanPyramidBuildCount: 0,
      };
      inst.pyramidBuildCount = (inst.pyramidBuildCount || 0) + 1;
      (window as unknown as { __WAVEFORM_INSTRUMENTATION__?: Record<string, number> }).__WAVEFORM_INSTRUMENTATION__ = inst;
    }

    return buildStereoPyramids(originalSourceData, sampleRate);
  }, [originalSourceData, sampleRate, duration]);

  // 2. CLEAN WAVEFORM PYRAMIDS
  // Cached strictly by clean channel data reference identity
  // Built ONCE when cleaned audio arrives; never recomputed on navigation/playback!
  const cleanPyramids = useMemo(() => {
    if (!cleanedChannelData || cleanedChannelData.length === 0 || duration <= 0) return null;

    if (typeof window !== 'undefined') {
      const inst = (window as unknown as { __WAVEFORM_INSTRUMENTATION__?: Record<string, number> }).__WAVEFORM_INSTRUMENTATION__ || {
        staticRenderCount: 0,
        dynamicRenderCount: 0,
        pyramidBuildCount: 0,
        cleanPyramidBuildCount: 0,
      };
      inst.cleanPyramidBuildCount = (inst.cleanPyramidBuildCount || 0) + 1;
      (window as unknown as { __WAVEFORM_INSTRUMENTATION__?: Record<string, number> }).__WAVEFORM_INSTRUMENTATION__ = inst;
    }

    return buildStereoPyramids(cleanedChannelData, sampleRate);
  }, [cleanedChannelData, sampleRate, duration]);

  const hasComparison = Boolean(cleanPyramids && cleanedChannelData && cleanedChannelData.length > 0);
  const trackHeightPx = hasComparison ? 96 : 128;

  // 3. ResizeObserver to track container sizing & DPR
  // Note: Pixel changes do NOT modify activeViewport's time span
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = el.clientWidth;
      const height = trackHeightPx;

      if (width > 0) {
        setDimensions((prev) => {
          if (prev.width === width && prev.height === height && prev.dpr === dpr) {
            return prev;
          }
          return { width, height, dpr };
        });

        // Update backing canvas resolutions immediately
        const updateCanvasSize = (canvas: HTMLCanvasElement | null) => {
          if (canvas) {
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
          }
        };

        updateCanvasSize(origStaticCanvasRef.current);
        updateCanvasSize(origDynamicCanvasRef.current);
        updateCanvasSize(cleanStaticCanvasRef.current);
        updateCanvasSize(cleanDynamicCanvasRef.current);
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [trackHeightPx]);

  // 4. LAYER 0 — STATIC WAVEFORM RENDERING (Original & Clean)
  // Only executed when pyramids, viewport, diagnostics toggle, or canvas dimensions change.
  // NEVER executed on currentTime updates!
  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;

    // Render Original Waveform (Layer 0)
    if (origStaticCanvasRef.current && originalPyramids) {
      const ctx = origStaticCanvasRef.current.getContext('2d');
      if (ctx) {
        const visible = getVisibleBuckets(
          originalPyramids.combined,
          activeViewport.startTimeSec,
          activeViewport.durationSec,
          dimensions.width
        );
        renderStaticWaveform(
          ctx,
          visible,
          activeViewport,
          dimensions.width,
          dimensions.height,
          dimensions.dpr,
          {
            barColor: '#0284c7', // primary-600
            rmsColor: '#0369a1', // primary-700
            showQuietRegions: showDiagnostics,
            showClipping: showDiagnostics,
          }
        );
      }
    }

    // Render Clean Waveform (Layer 0) if available
    if (cleanStaticCanvasRef.current && cleanPyramids) {
      const ctx = cleanStaticCanvasRef.current.getContext('2d');
      if (ctx) {
        const visibleClean = getVisibleBuckets(
          cleanPyramids.combined,
          activeViewport.startTimeSec,
          activeViewport.durationSec,
          dimensions.width
        );
        renderStaticWaveform(
          ctx,
          visibleClean,
          activeViewport,
          dimensions.width,
          dimensions.height,
          dimensions.dpr,
          {
            barColor: '#0d9488', // teal-600
            rmsColor: '#0f766e', // teal-700
            showQuietRegions: showDiagnostics,
            showClipping: showDiagnostics,
          }
        );
      }
    }

    if (typeof window !== 'undefined') {
      const inst = (window as unknown as { __WAVEFORM_INSTRUMENTATION__?: Record<string, number> }).__WAVEFORM_INSTRUMENTATION__ || {
        staticRenderCount: 0,
        dynamicRenderCount: 0,
        pyramidBuildCount: 0,
        cleanPyramidBuildCount: 0,
      };
      inst.staticRenderCount = (inst.staticRenderCount || 0) + 1;
      (window as unknown as { __WAVEFORM_INSTRUMENTATION__?: Record<string, number> }).__WAVEFORM_INSTRUMENTATION__ = inst;
    }
  }, [originalPyramids, cleanPyramids, activeViewport, dimensions, showDiagnostics]);

  // 5. LAYER 1 — DYNAMIC OVERLAY RENDERING (Playhead, Selection, Hover)
  // Rapid 60 FPS rendering without touching or redrawing the static waveform!
  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;

    const renderOverlay = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderDynamicLayer(
        ctx,
        activeViewport,
        currentTime,
        duration,
        dimensions.width,
        dimensions.height,
        dimensions.dpr,
        {
          manualRegion,
          hoverTimeSec,
        }
      );
    };

    renderOverlay(origDynamicCanvasRef.current);
    if (hasComparison) {
      renderOverlay(cleanDynamicCanvasRef.current);
    }

    if (typeof window !== 'undefined') {
      const inst = (window as unknown as { __WAVEFORM_INSTRUMENTATION__?: Record<string, number> }).__WAVEFORM_INSTRUMENTATION__ || {
        staticRenderCount: 0,
        dynamicRenderCount: 0,
        pyramidBuildCount: 0,
        cleanPyramidBuildCount: 0,
      };
      inst.dynamicRenderCount = (inst.dynamicRenderCount || 0) + 1;
      (window as unknown as { __WAVEFORM_INSTRUMENTATION__?: Record<string, number> }).__WAVEFORM_INSTRUMENTATION__ = inst;
    }
  }, [currentTime, duration, activeViewport, dimensions, manualRegion, hoverTimeSec, hasComparison]);

  // 6. Global Spacebar tracking for Pan interaction
  useEffect(() => {
    const isTextInput = (el: Element | null): boolean => {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (el as HTMLElement).isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTextInput(document.activeElement)) {
        setIsSpaceHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };

    const handleBlur = () => {
      setIsSpaceHeld(false);
      setIsPanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // 7. Native Non-Passive Wheel Listener for Ctrl/Cmd Zoom and Shift Scroll
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Ctrl or Meta (Cmd on Mac / pinch on trackpad)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0) return;

        const mouseX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const clampedDelta = Math.max(-150, Math.min(150, e.deltaY));
        const zoomFactor = Math.exp(-clampedDelta * 0.003);

        updateViewport((prev) => zoomAt(prev, zoomFactor, mouseX, rect.width));
      } else if (e.shiftKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0) return;

        const deltaPx = e.deltaY || e.deltaX;
        updateViewport((prev) => panBy(prev, deltaPx, rect.width));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [updateViewport]);

  // 8. Navigation Actions (Fit, Zoom In, Zoom Out)
  const handleFitView = useCallback(() => {
    updateViewport({
      startTimeSec: 0,
      durationSec: Math.max(0.001, duration),
      totalDurationSec: Math.max(0.001, duration),
    });
  }, [duration, updateViewport]);

  const handleZoomIn = useCallback(() => {
    const width = dimensions.width || canvasContainerRef.current?.clientWidth || 800;
    updateViewport((prev) => zoomAt(prev, 1.35, width * 0.5, width));
  }, [dimensions.width, updateViewport]);

  const handleZoomOut = useCallback(() => {
    const width = dimensions.width || canvasContainerRef.current?.clientWidth || 800;
    updateViewport((prev) => zoomAt(prev, 0.74, width * 0.5, width));
  }, [dimensions.width, updateViewport]);

  // 9. Unified Pointer Event Handlers (Seek, Pan, Selection)
  const getTimeFromEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): number => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || duration <= 0) return 0;
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      return pixelToTime(x, activeViewport, rect.width);
    },
    [duration, activeViewport]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isProcessing) return;

    // Pan Gesture: Space + Left-Click OR Middle-Click
    if ((e.button === 0 && isSpaceHeld) || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panLastXRef.current = e.clientX;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }
      return;
    }

    // Normal Left-Click: Seek or Manual Selection Drag
    if (e.button === 0) {
      const t = getTimeFromEvent(e);
      if (e.shiftKey || onManualRegionChange) {
        setIsDraggingSelection(true);
        setDragStartSec(t);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Fallback
        }
      } else if (onSeek) {
        onSeek(t);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const t = getTimeFromEvent(e);
    setHoverTimeSec(t);

    if (isPanning) {
      const deltaX = panLastXRef.current - e.clientX;
      panLastXRef.current = e.clientX;
      const width = dimensions.width || canvasContainerRef.current?.clientWidth || 800;
      if (deltaX !== 0 && width > 0) {
        updateViewport((prev) => panBy(prev, deltaX, width));
      }
      return;
    }

    if (isDraggingSelection && dragStartSec !== null && onManualRegionChange) {
      const start = Math.min(dragStartSec, t);
      const end = Math.max(dragStartSec, t);
      onManualRegionChange({ startSec: start, endSec: end });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Fallback
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDraggingSelection) {
      setIsDraggingSelection(false);
      setDragStartSec(null);

      // Validate region length (min 200ms)
      if (manualRegion) {
        const diff = manualRegion.endSec - manualRegion.startSec;
        if (diff < 0.2) {
          onManualRegionChange?.(null);
          onSeek?.(manualRegion.startSec);
        }
      }
    }
  };

  const handlePointerLeave = () => {
    setHoverTimeSec(null);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Fallback
    }
    setIsPanning(false);
    setIsDraggingSelection(false);
    setDragStartSec(null);
  };

  // Keyboard navigation & accessibility
  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (duration <= 0) return;

    if (e.key === 'Home') {
      e.preventDefault();
      handleFitView();
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      handleZoomIn();
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      handleZoomOut();
      return;
    }

    if (!onSeek) return;
    const step = e.shiftKey ? 5.0 : 1.0;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(duration, currentTime + step));
    } else if (e.key === 'End') {
      e.preventDefault();
      onSeek(duration);
    }
  };

  // Computed zoom ratio for UI readout
  const isZoomedIn = activeViewport.durationSec < duration - 0.02;
  const zoomRatio = duration > 0 ? Math.max(1, duration / activeViewport.durationSec) : 1;

  // Determine dynamic canvas cursor style
  let cursorClass = 'cursor-crosshair';
  if (isPanning) {
    cursorClass = 'cursor-grabbing';
  } else if (isSpaceHeld) {
    cursorClass = 'cursor-grab';
  }

  const channelCount = originalSourceData?.length || 1;

  return (
    <div ref={containerRef} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {hasComparison ? 'Waveform Comparison (A/B)' : 'Waveform & Noise Region'}
          </span>
          {channelCount === 2 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
              Stereo {sampleRate}Hz
            </span>
          )}
          {hasComparison && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              <Layers className="w-3 h-3" />
              Dual-Track View
            </span>
          )}
        </div>

        {/* Minimal B1.3 / B1.4 Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/60 mr-1">
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Zoom in waveform"
              title="Zoom In (Ctrl + Scroll Up or +)"
              className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Zoom out waveform"
              title="Zoom Out (Ctrl + Scroll Down or -)"
              className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitView}
              aria-label="Fit full audio waveform"
              title="Fit to Window (Home)"
              disabled={!isZoomedIn}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                isZoomedIn
                  ? 'text-primary-700 hover:bg-white hover:text-primary-800'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit</span>
            </button>
            <span className="px-1.5 text-[10px] font-mono text-slate-500 border-l border-slate-200">
              {zoomRatio.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              aria-label="Toggle signal diagnostics overlay"
              title="Toggle Signal Diagnostics (Low-level regions and clipping markers)"
              className={`flex items-center gap-1 px-1.5 py-0.5 ml-1 rounded-md text-[11px] font-medium transition-colors ${
                showDiagnostics
                  ? 'bg-white text-primary-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-3 h-3 text-primary-600" />
              <span className="hidden sm:inline">Diagnostics</span>
            </button>
          </div>

          {manualRegion ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                <Scissors className="w-3 h-3" />
                Noise Profile: {(manualRegion.endSec - manualRegion.startSec).toFixed(2)}s
              </span>
              <Button
                size="xs"
                variant="outline"
                icon={RefreshCw}
                onClick={() => onManualRegionChange?.(null)}
              >
                Reset
              </Button>
            </div>
          ) : (
            <span className="hidden sm:inline text-[11px] text-slate-400">
              Ctrl+scroll to zoom • Space+drag to pan
            </span>
          )}
        </div>
      </div>

      {/* Main Waveform Canvas Container with Shared Time Ruler */}
      <div
        ref={canvasContainerRef}
        className="relative w-full rounded-xl bg-slate-50 border border-slate-200/70 overflow-hidden select-none space-y-0"
      >
        {/* Phase B1.5: Compact Diagnostics Legend */}
        {showDiagnostics && (
          <div className="flex flex-wrap items-center gap-3 px-3 py-1 bg-slate-100/80 border-b border-slate-200/60 text-[10px] text-slate-600">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">Legend:</span>
            <span className="flex items-center gap-1.5" title="Visual heuristic: aggregate bucket RMS < 0.008 (-42 dBFS) and Peak < 0.015 (-36.5 dBFS)">
              <span className="w-2.5 h-2 rounded-xs bg-slate-300 border border-slate-400/40 inline-block" />
              <span>Low-level region (Visual Heuristic)</span>
            </span>
            <span className="flex items-center gap-1.5" title="Bucket contains at least one sample reaching clipping threshold (>= 0.999)">
              <span className="w-2.5 h-1.5 rounded-xs bg-rose-500 inline-block" />
              <span>Clipping excursion (≥ 0.999)</span>
            </span>
            <span className="flex items-center gap-1.5" title="User-selected noise profile calibration region">
              <span className="w-2.5 h-2 rounded-xs bg-amber-400/50 border border-amber-500 inline-block" />
              <span>Selected Noise Profile</span>
            </span>
          </div>
        )}

        {/* Phase B1.4: Shared Adaptive Time Ruler */}
        <WaveformTimeRuler
          viewport={activeViewport}
          width={dimensions.width}
          dpr={dimensions.dpr}
          height={22}
        />

        {/* TRACK 1: ORIGINAL (RAW) */}
        <div className="relative border-t border-slate-200/60">
          <div className="flex flex-wrap items-center justify-between px-3 py-1 bg-slate-100/60 border-b border-slate-200/60 text-[10px]">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-primary-700">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />
              Original {hasComparison ? '(Raw)' : ''}
            </div>
            {originalMetrics && (
              <div className="flex items-center gap-2 font-mono text-slate-500">
                <span>Peak: {originalMetrics.peakDbFS.toFixed(1)} dBFS</span>
                <span>•</span>
                <span>RMS: {originalMetrics.rmsDbFS.toFixed(1)} dBFS</span>
                {originalMetrics.noiseFloorDbFS !== null && (
                  <>
                    <span>•</span>
                    <span>Noise Floor: {originalMetrics.noiseFloorDbFS.toFixed(1)} dBFS</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative w-full overflow-hidden" style={{ height: trackHeightPx }}>
            {/* Layer 0: Static Original Waveform */}
            <canvas
              ref={origStaticCanvasRef}
              className="absolute inset-0 w-full h-full block pointer-events-none"
              aria-hidden="true"
            />

            {/* Layer 1: Dynamic Overlay (Playhead, Selection, Hover) */}
            <canvas
              ref={origDynamicCanvasRef}
              className={`absolute inset-0 w-full h-full block ${cursorClass} focus:outline-hidden touch-none`}
              tabIndex={0}
              role="slider"
              aria-label="Original Audio Waveform Timeline"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
              aria-valuetext={formatTime(currentTime)}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onPointerCancel={handlePointerCancel}
              onKeyDown={handleCanvasKeyDown}
            />
          </div>
        </div>

        {/* TRACK 2: CLEANED (DSP) — Displayed conditionally when cleaned audio is available */}
        {hasComparison && (
          <div className="relative border-t border-slate-200/80 bg-slate-50/50">
            <div className="flex flex-wrap items-center justify-between px-3 py-1 bg-teal-50/60 border-b border-teal-200/60 text-[10px]">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-teal-700">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                Cleaned (DSP)
              </div>
              {cleanMetrics && (
                <div className="flex items-center gap-2 font-mono text-teal-600">
                  <span>Peak: {cleanMetrics.peakDbFS.toFixed(1)} dBFS</span>
                  <span>•</span>
                  <span>RMS: {cleanMetrics.rmsDbFS.toFixed(1)} dBFS</span>
                  {cleanMetrics.noiseFloorDbFS !== null && (
                    <>
                      <span>•</span>
                      <span>Noise Floor: {cleanMetrics.noiseFloorDbFS.toFixed(1)} dBFS</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="relative w-full overflow-hidden" style={{ height: trackHeightPx }}>
              {/* Layer 0: Static Clean Waveform */}
              <canvas
                ref={cleanStaticCanvasRef}
                className="absolute inset-0 w-full h-full block pointer-events-none"
                aria-hidden="true"
              />

              {/* Layer 1: Dynamic Overlay (Playhead, Selection, Hover) */}
              <canvas
                ref={cleanDynamicCanvasRef}
                className={`absolute inset-0 w-full h-full block ${cursorClass} focus:outline-hidden touch-none`}
                tabIndex={-1}
                aria-hidden="true"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerCancel}
                onKeyDown={handleCanvasKeyDown}
              />
            </div>
          </div>
        )}

        {/* Hover timestamp tooltip anchored to shared viewport */}
        {hoverTimeSec !== null && duration > 0 && activeViewport.durationSec > 0 && (
          <div
            className="absolute top-7 px-2 py-0.5 rounded bg-slate-900/85 text-white text-[10px] font-mono pointer-events-none transform -translate-x-1/2 z-30 shadow-xs"
            style={{
              left: `${Math.max(
                0,
                Math.min(
                  100,
                  ((hoverTimeSec - activeViewport.startTimeSec) / activeViewport.durationSec) * 100
                )
              )}%`,
            }}
          >
            {formatTime(hoverTimeSec, 'tenth')}
          </div>
        )}
      </div>

      {/* Footer Timestamp Readout */}
      <div className="flex items-center justify-between pt-2 text-[11px] font-mono text-slate-400 select-none">
        <span>{formatTime(activeViewport.startTimeSec, 'tenth')}</span>
        <span className="text-slate-600 font-semibold">
          Current: {formatTime(currentTime, 'tenth')}
          {isZoomedIn && (
            <span className="ml-1 text-[10px] text-primary-600 font-medium">
              (Span: {formatTime(activeViewport.durationSec, 'tenth')})
            </span>
          )}
        </span>
        <span>{formatTime(activeViewport.startTimeSec + activeViewport.durationSec, 'tenth')}</span>
      </div>
    </div>
  );
}

