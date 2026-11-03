'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Download, Calendar, RotateCcw } from 'lucide-react';
import { useMediaHandoffStore } from '@/lib/store/useMediaHandoffStore';

export interface ImageResultActionsProps {
  cleanedBlob: Blob | null;
  cleanedFile: File | null;
  onReset: () => void;
}

export default function ImageResultActions({
  cleanedBlob,
  cleanedFile,
  onReset,
}: ImageResultActionsProps) {
  const router = useRouter();

  const handleDownload = () => {
    if (!cleanedBlob || !cleanedFile) return;
    const url = URL.createObjectURL(cleanedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanedFile.name || 'cleaned_image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendToScheduler = () => {
    if (!cleanedFile) return;
    // Set pending file in Zustand handoff store with targetFormat 'image'
    useMediaHandoffStore.getState().setPendingFile(cleanedFile, 'image');
    // Navigate via client router to preserve memory state
    router.push('/instagram/calendar/scheduler?type=image&handoff=1');
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
      <Button
        variant="outline"
        size="sm"
        icon={RotateCcw}
        onClick={onReset}
      >
        Process Another Image
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={Calendar}
          onClick={handleSendToScheduler}
        >
          Send to Scheduler
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={Download}
          onClick={handleDownload}
        >
          Download Clean Image
        </Button>
      </div>
    </div>
  );
}
