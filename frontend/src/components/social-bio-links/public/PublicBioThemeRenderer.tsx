'use client';

import React from 'react';
import { BioThemeSettings } from '@/lib/api/socialBioLinksService';

interface PublicBioThemeRendererProps {
  theme: BioThemeSettings;
  children: React.ReactNode;
}

export default function PublicBioThemeRenderer({
  theme,
  children,
}: PublicBioThemeRendererProps) {
  const getContainerMaxWidth = () => {
    switch (theme.layout) {
      case 'immersive':
        return 'max-w-xl';
      case 'split':
        return 'max-w-2xl';
      case 'editorial':
      default:
        return 'max-w-lg';
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between py-10 px-4 sm:px-6 transition-colors duration-200"
      style={{
        backgroundColor: theme.background_color,
        color: theme.text_color,
      }}
    >
      <div className={`w-full mx-auto ${getContainerMaxWidth()} flex-1 flex flex-col items-center justify-start space-y-6`}>
        {children}
      </div>

      {/* Powered By Footer */}
      <footer className="pt-12 pb-4 text-center">
        <a
          href="https://scanmysocial.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold opacity-60 hover:opacity-100 transition"
        >
          <span>Powered by ScanMySocial</span>
        </a>
      </footer>
    </div>
  );
}
