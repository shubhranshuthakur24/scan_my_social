'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { VolumeX, AlertCircle } from 'lucide-react';

export interface UnsupportedAudioModalProps {
  isOpen: boolean;
  codec: string | null;
  onConfirmWithoutAudio: () => void;
  onCancel: () => void;
}

export default function UnsupportedAudioModal({
  isOpen,
  codec,
  onConfirmWithoutAudio,
  onCancel,
}: UnsupportedAudioModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Audio Format Incompatible"
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed space-y-1">
            <p className="font-bold text-amber-950">
              Audio track cannot be preserved during MP4 export
            </p>
            <p className="text-amber-800 text-[11px]">
              This video uses an audio format ({codec ? codec.toUpperCase() : 'incompatible codec'}) that cannot be losslessly multiplexed into the exported MP4 container.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          You can proceed to remove the watermark and export the video without audio, or cancel to keep your original file unchanged.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={VolumeX}
            onClick={onConfirmWithoutAudio}
          >
            Export Without Audio
          </Button>
        </div>
      </div>
    </Modal>
  );
}
