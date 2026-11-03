'use client';

import React from 'react';
import { BioThemeSettings } from '@/lib/api/socialBioLinksService';

interface PublicBioHeaderProps {
  displayName: string;
  username: string;
  slug?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  theme: BioThemeSettings;
}

export default function PublicBioHeader({
  displayName,
  username,
  slug,
  bio,
  avatarUrl,
  bannerUrl,
  theme,
}: PublicBioHeaderProps) {
  return (
    <div className="w-full flex flex-col items-center text-center">
      {/* Banner */}
      {bannerUrl && (
        <div className="w-full h-36 sm:h-48 relative overflow-hidden rounded-3xl mb-4 border border-black/5 shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Avatar */}
      <div className={`relative ${bannerUrl ? '-mt-16 sm:-mt-20' : 'mt-4'}`}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 shadow-lg"
            style={{ borderColor: theme.background_color }}
          />
        ) : (
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 shadow-lg flex items-center justify-center font-black text-3xl bg-black/10"
            style={{ borderColor: theme.background_color }}
          >
            {(displayName || username || 'A')[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Name & Bio */}
      <div className="pt-4 pb-6 space-y-1.5 max-w-md px-4">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: theme.text_color }}>
          {displayName}
        </h1>
        <p className="text-xs sm:text-sm font-mono opacity-70">
          @{username}
          {slug && slug !== 'main' ? `/${slug}` : ''}
        </p>
        {bio && (
          <p className="text-xs sm:text-sm leading-relaxed opacity-90 pt-1.5 font-medium">
            {bio}
          </p>
        )}
      </div>
    </div>
  );
}
