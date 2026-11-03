'use client';

import React from 'react';
import PublicAudioNoiseShell from '@/components/audio-noise-remover/PublicAudioNoiseShell';
import AudioNoiseRemover from '@/components/audio-noise-remover/AudioNoiseRemover';

export default function PublicAudioNoiseRemoverPage() {
  return (
    <PublicAudioNoiseShell>
      <div className="space-y-8">
        <AudioNoiseRemover />
      </div>
    </PublicAudioNoiseShell>
  );
}
