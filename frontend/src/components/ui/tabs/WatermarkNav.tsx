'use client';

import React from 'react';
import { Film, Image as ImageIcon, Layers, Lock } from 'lucide-react';
import PrimaryNavTabs, { PrimaryNavTabItem } from './PrimaryNavTabs';

const watermarkTabs: PrimaryNavTabItem[] = [
  { name: 'Video Cleanup', href: '/video-tools/watermark-remover', icon: Film },
  { name: 'Image Cleanup', href: '/image-tools/watermark-remover', icon: ImageIcon },
  { name: 'Batch Clean & Merge', href: '/video-tools/watermark-remover/batch', icon: Layers },
];

export interface WatermarkNavProps {
  rightElement?: React.ReactNode;
  className?: string;
}

export default function WatermarkNav({ rightElement, className = '' }: WatermarkNavProps) {
  const defaultRightElement = (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
      title="Your media is processed in your browser and isn't uploaded for watermark removal."
    >
      <Lock size={12} className="text-emerald-600" />
      <span>Processed Locally</span>
    </span>
  );

  return (
    <PrimaryNavTabs
      id="watermark-tools"
      tabs={watermarkTabs}
      rightElement={rightElement !== undefined ? rightElement : defaultRightElement}
      className={className}
    />
  );
}
