'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ZoomIn, RotateCw, RefreshCw, Check, Crop } from 'lucide-react';
import { getCroppedImg } from '@/lib/utils/cropImage';

export interface BioImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  fileName?: string;
  type: 'avatar' | 'banner';
  onCropComplete: (file: File) => Promise<void> | void;
}

export default function BioImageCropModal({
  isOpen,
  onClose,
  imageUrl,
  fileName = 'image.jpg',
  type,
  onCropComplete,
}: BioImageCropModalProps) {
  const isAvatar = type === 'avatar';
  const aspect = isAvatar ? 1 : 3 / 1;
  const cropShape = isAvatar ? 'round' : 'rect';

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleApply = async () => {
    if (!imageUrl || !croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      const croppedFile = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        isAvatar ? `avatar_${fileName}` : `banner_${fileName}`,
        rotation
      );
      await onCropComplete(croppedFile);
      onClose();
    } catch (err) {
      console.error('Failed to crop image:', err);
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
      title={isAvatar ? 'Crop Profile Avatar' : 'Crop Header Banner'}
      description={
        isAvatar
          ? 'Position and zoom your photo to fit the circular profile frame.'
          : 'Position and zoom your banner to fit the 3:1 panoramic header.'
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
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
            {isProcessing ? 'Processing...' : 'Apply & Upload'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Canvas Cropper Frame */}
        <div
          className={`relative w-full overflow-hidden bg-slate-950 rounded-2xl border border-slate-800 shadow-inner ${
            isAvatar ? 'h-[320px] sm:h-[360px]' : 'h-[260px] sm:h-[300px]'
          }`}
        >
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={!isAvatar}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaChange}
          />
        </div>

        {/* Controls Bar: Zoom & Rotate & Reset */}
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
              className="w-full accent-primary-600 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-600 w-8">{zoom.toFixed(1)}x</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              icon={RotateCw}
              onClick={handleRotate}
              className="text-slate-600"
            >
              Rotate 90°
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              icon={RefreshCw}
              onClick={handleReset}
              className="text-slate-600"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
