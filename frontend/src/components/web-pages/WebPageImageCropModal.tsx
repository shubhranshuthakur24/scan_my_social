'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ZoomIn, RotateCw, RefreshCw, Check, Crop, Sliders } from 'lucide-react';
import { getCroppedImg } from '@/lib/utils/cropImage';

export interface WebPageImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  fileName?: string;
  defaultAspect?: number;
  onCropComplete: (file: File) => Promise<void> | void;
}

const ASPECT_RATIOS = [
  { label: '16:9 Wide', value: 16 / 9, description: 'Hero banner' },
  { label: '4:3 Standard', value: 4 / 3, description: 'Card showcase' },
  { label: '1:1 Square', value: 1, description: 'Square tile' },
  { label: '3:2 Photo', value: 3 / 2, description: 'Photography' },
  { label: 'Freeform', value: undefined, description: 'Custom' },
];

export default function WebPageImageCropModal({
  isOpen,
  onClose,
  imageUrl,
  fileName = 'webpage_image.jpg',
  defaultAspect = 16 / 9,
  onCropComplete,
}: WebPageImageCropModalProps) {
  const [aspect, setAspect] = useState<number | undefined>(defaultAspect);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropAreaChange = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleApply = async () => {
    if (!imageUrl || !croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      const croppedFile = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        `cropped_${fileName}`,
        rotation
      );
      await onCropComplete(croppedFile);
      onClose();
    } catch (err) {
      console.error('Failed to crop webpage image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isProcessing) onClose();
      }}
      title="Crop & Optimize Section Image"
      description="Frame, zoom, and crop your image to fit the landing page layout perfectly."
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleReset}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <RefreshCw size={13} /> Reset Framing
          </button>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={isProcessing ? undefined : Check}
              onClick={handleApply}
              disabled={isProcessing || !croppedAreaPixels}
              className="gap-1.5 shadow-xs"
            >
              {isProcessing ? 'Saving & Uploading...' : 'Crop & Insert'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Aspect Ratio Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {ASPECT_RATIOS.map((item) => {
            const isSelected = aspect === item.value;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setAspect(item.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-white text-primary-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Canvas Cropper Frame */}
        <div className="relative w-full h-[320px] sm:h-[380px] overflow-hidden bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaChange}
          />
        </div>

        {/* Controls Bar: Zoom & Rotate */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
            <ZoomIn size={15} className="text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-700 shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-slate-500 w-8 text-right shrink-0">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <button
            type="button"
            onClick={handleRotate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200/90 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition shrink-0 shadow-2xs"
            title="Rotate 90 degrees"
          >
            <RotateCw size={13} /> Rotate
          </button>
        </div>
      </div>
    </Modal>
  );
}
