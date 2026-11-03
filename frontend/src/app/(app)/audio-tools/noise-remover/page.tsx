'use client';

import React from 'react';
import AudioNoiseRemover from '@/components/audio-noise-remover/AudioNoiseRemover';

export default function AudioNoiseRemoverPage() {
  return (
    <div className="w-full space-y-6 pb-16">
      <AudioNoiseRemover />
    </div>
  );
}
