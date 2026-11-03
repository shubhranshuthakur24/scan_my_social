'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Crop, ZoomIn, Check, RotateCw, Sparkles, AlertCircle, ChevronRight, ChevronLeft, Sliders, RefreshCw } from 'lucide-react';
import { getCroppedImg } from '@/lib/utils/cropImage';
import { CANONICAL_RATIOS, AspectRatioPreset } from '@/lib/types/instagramRatios';

export interface BatchItem {
  id: string | number;
  url: string;
  name: string;
}

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  imageName?: string;
  destinationFormat?: 'image' | 'carousel' | 'story' | 'reel';
  targetRatio?: number | null;
  onCropComplete?: (file: File) => Promise<void> | void;
  // Batch Queue for Carousels
  batchQueue?: BatchItem[];
  onBatchComplete?: (croppedFiles: Array<{ id: string | number; file: File }>) => Promise<void> | void;
}

const PRESET_RATIOS: Array<{ key: AspectRatioPreset; label: string; ratio: number; subtitle: string; formats: string[] }> = [
  { key: '4:5', label: '4:5 Portrait', ratio: CANONICAL_RATIOS.PORTRAIT_4_5, subtitle: 'Instagram Feed (Optimal)', formats: ['image', 'carousel'] },
  { key: '1:1', label: '1:1 Square', ratio: CANONICAL_RATIOS.SQUARE_1_1, subtitle: 'Standard Grid', formats: ['image', 'carousel'] },
  { key: '1.91:1', label: '1.91:1 Landscape', ratio: CANONICAL_RATIOS.LANDSCAPE_1_91, subtitle: 'Wide Feed Photo', formats: ['image', 'carousel'] },
  { key: '9:16', label: '9:16 Vertical', ratio: CANONICAL_RATIOS.VERTICAL_9_16, subtitle: 'Story & Reel Fullscreen', formats: ['story', 'reel'] },
];

export default function ImageCropModal({
  isOpen,
  onClose,
  imageUrl,
  imageName = 'photo.jpg',
  destinationFormat = 'image',
  targetRatio = null,
  onCropComplete,
  batchQueue = [],
  onBatchComplete,
}: ImageCropModalProps) {
  const isBatch = batchQueue && batchQueue.length > 0;
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchResults, setBatchResults] = useState<Array<{ id: string | number; file: File }>>([]);

  const currentItem = isBatch ? batchQueue[batchIndex] : null;
  const activeImageUrl = currentItem ? currentItem.url : imageUrl;
  const activeImageName = currentItem ? currentItem.name : imageName;

  // Initial aspect ratio selection based on targetRatio or destinationFormat
  const getInitialAspect = useCallback(() => {
    if (targetRatio !== null && targetRatio !== undefined) {
      return targetRatio;
    }
    if (destinationFormat === 'story' || destinationFormat === 'reel') {
      return CANONICAL_RATIOS.VERTICAL_9_16;
    }
    return CANONICAL_RATIOS.PORTRAIT_4_5;
  }, [targetRatio, destinationFormat]);

  const [aspect, setAspect] = useState<number>(getInitialAspect());
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAspect(getInitialAspect());
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setBatchIndex(0);
      setBatchResults([]);
    }
  }, [isOpen, getInitialAspect]);

  const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const exportCurrentCrop = async (): Promise<File> => {
    if (!activeImageUrl || !croppedAreaPixels) {
      throw new Error('No crop area selected');
    }
    return await getCroppedImg(activeImageUrl, croppedAreaPixels, activeImageName, rotation);
  };

  const handleSingleApply = async () => {
    if (!onCropComplete || !activeImageUrl || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedFile = await exportCurrentCrop();
      await onCropComplete(croppedFile);
      onClose();
    } catch (err: any) {
      console.error('Failed to crop image', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchNext = async (skip: boolean = false) => {
    setIsProcessing(true);
    try {
      let updatedResults = [...batchResults];
      if (!skip && currentItem && croppedAreaPixels) {
        const croppedFile = await exportCurrentCrop();
        updatedResults = [...updatedResults.filter(r => r.id !== currentItem.id), { id: currentItem.id, file: croppedFile }];
        setBatchResults(updatedResults);
      }

      if (batchIndex + 1 < batchQueue.length) {
        setBatchIndex((prev) => prev + 1);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
      } else {
        // Batch completed
        if (onBatchComplete) {
          await onBatchComplete(updatedResults);
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Batch cropping step failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !activeImageUrl) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isBatch ? 'Carousel Batch Cropper' : 'Crop & Align Image'} maxWidth="xl">
      <div className="space-y-4">
        {/* Header Notification / Batch Counter */}
        {isBatch ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center">
                {batchIndex + 1}
              </span>
              <div>
                <p className="text-xs font-black text-purple-950">
                  Slide {batchIndex + 1} of {batchQueue.length}: {activeImageName}
                </p>
                <p className="text-[10px] text-purple-700">
                  Aligning all carousel slides to Meta standard ratio ({aspect === CANONICAL_RATIOS.PORTRAIT_4_5 ? '4:5' : '1:1'})
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {batchQueue.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === batchIndex ? 'bg-purple-600 ring-2 ring-purple-300 scale-125' : i < batchIndex ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span>Choose aspect ratio for <strong>{destinationFormat.toUpperCase()}</strong>:</span>
            <span className="font-bold text-slate-900">{activeImageName}</span>
          </div>
        )}

        {/* Ratio Selector Tabs (Disabled if strictly locked in batch carousel) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_RATIOS.map((preset) => {
            const isSelected = Math.abs(aspect - preset.ratio) < 0.01;
            const isRecommended = (destinationFormat === 'story' || destinationFormat === 'reel')
              ? preset.key === '9:16'
              : preset.key === '4:5';

            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => setAspect(preset.ratio)}
                className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20 text-purple-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                {isRecommended && (
                  <span className="absolute top-1 right-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-600 text-white">
                    Meta Pick
                  </span>
                )}
                <span className="text-xs font-black">{preset.label}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">{preset.subtitle}</span>
              </button>
            );
          })}
        </div>

        {/* react-easy-crop Canvas Container */}
        <div className="relative w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
          <Cropper
            image={activeImageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaChange}
            showGrid={true}
          />
        </div>

        {/* Controls: Zoom & Rotate */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
            <ZoomIn size={16} className="text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-700 shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-600 w-8">{zoom.toFixed(1)}x</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs" icon={RotateCw} onClick={handleRotate}>
              Rotate 90°
            </Button>
            <Button variant="ghost" size="xs" icon={RefreshCw} onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>

          {isBatch ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBatchNext(true)}
                disabled={isProcessing}
              >
                Skip This Slide
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                onClick={() => handleBatchNext(false)}
                disabled={isProcessing}
              >
                {isProcessing ? 'Saving...' : batchIndex + 1 < batchQueue.length ? 'Crop & Next Slide' : 'Finish Carousel Batch'}
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              onClick={handleSingleApply}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Apply Crop & Replace Selected Media'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
