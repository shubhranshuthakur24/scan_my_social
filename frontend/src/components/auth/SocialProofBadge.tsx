'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SocialProofBadgeProps {
  className?: string;
}

export default function SocialProofBadge({ className }: SocialProofBadgeProps) {
  const avatars = [
    '/images/avatars/avatar1.png',
    '/images/avatars/avatar2.png',
    '/images/avatars/avatar3.png',
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 backdrop-blur-md shadow-2xl relative group overflow-hidden',
        className
      )}
    >
      {/* Subtle Animated Glow Effect */}
      <div className="absolute inset-x-0 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent transition-opacity group-hover:opacity-100" />
      <div className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-rose-400/30 to-transparent transition-opacity group-hover:opacity-100" />

      {/* Avatar Stack */}
      <div className="flex -space-x-3">
        {avatars.map((avatar, i) => (
          <img
            key={i}
            src={avatar}
            alt={`User ${i + 1}`}
            className="h-7 w-7 rounded-full border-2 border-slate-900/80 object-cover shadow-sm transition-transform group-hover:scale-110"
            style={{ zIndex: avatars.length - i }}
          />
        ))}
      </div>

      {/* Text Content */}
      <div className="flex flex-col">
        <span className="text-xs font-black tracking-tight text-primary-600">
          2,000+
        </span>
      </div>
    </div>
  );
}
