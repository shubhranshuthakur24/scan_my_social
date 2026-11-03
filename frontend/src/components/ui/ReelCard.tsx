'use client';

import React, { useState } from 'react';
import { Play, Flame, ExternalLink, Zap, Camera, Clock, Eye, Heart, MessageSquare, Share2 } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import InstagramButton from '@/components/ui/InstagramButton';

export interface ReelCardProps {
  id?: string;
  thumbnail: string;
  caption: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  outlierMultiplier?: number;
  publishedAt?: string;
  instagramUrl?: string;
  hasAutodm?: boolean;
  isAutodmPaused?: boolean;
  mediaType?: 'reel' | 'carousel' | 'image';
  onSetupAutodm?: () => void;
  onViewAutodm?: () => void;
  onToggleAutodmPause?: (isPaused: boolean) => void;
  className?: string;
}

export default function ReelCard({
  thumbnail,
  caption,
  views,
  likes,
  comments,
  shares,
  saves,
  outlierMultiplier,
  publishedAt,
  instagramUrl = 'https://instagram.com',
  hasAutodm = false,
  isAutodmPaused = false,
  mediaType = 'reel',
  onSetupAutodm,
  onViewAutodm,
  onToggleAutodmPause,
  className = '',
}: ReelCardProps) {
  const isOutlier = outlierMultiplier && outlierMultiplier >= 2.0;
  const [localPaused, setLocalPaused] = useState(isAutodmPaused);

  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !localPaused;
    setLocalPaused(nextState);
    if (onToggleAutodmPause) {
      onToggleAutodmPause(nextState);
    }
  };

  return (
    <article
      className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-md transition-all duration-300 ${className}`}
    >
      {/* 1. Vertical Thumbnail Media (aspect-[4/5] standard IG portrait) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-950">
        <img
          src={thumbnail}
          alt={caption}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Subtle Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Header Overlays */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
          {isOutlier ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/95 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white shadow-sm border border-white/20">
              <Flame size={12} className="fill-white" />
              <span>{outlierMultiplier}x Outlier</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-black/75 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white shadow-sm border border-white/10 uppercase tracking-wider">
              <Camera size={12} className="text-white" />
              <span>{mediaType}</span>
            </span>
          )}

          {publishedAt && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-black/75 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white/90 border border-white/10 shadow-sm">
              <Clock size={12} className="text-white/80" />
              <span>{publishedAt}</span>
            </span>
          )}
        </div>

        {/* Center Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 transition-transform duration-200">
            <Play size={16} className="fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* 2. Card Body & Information Section */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        {/* Caption & Hashtags */}
        <div className="space-y-1">
          {(() => {
            const hashtagsMatch = caption.match(/#[^\s#]+/g) || [];
            const mainText = caption.replace(/#[^\s#]+/g, '').trim();
            return (
              <>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug" title={caption}>
                  {mainText || caption}
                </p>
                {hashtagsMatch.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {hashtagsMatch.map((tag, idx) => (
                      <span key={idx} className="text-xs font-semibold text-blue-500 hover:underline cursor-pointer">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Metric Grid with Colorful Lucide Icons */}
        <div className={`grid ${saves !== undefined ? 'grid-cols-5' : 'grid-cols-4'} gap-1 py-2 px-1 rounded-2xl bg-slate-50/80 border border-slate-100 text-center items-center justify-items-center`}>
          <div className="flex flex-col items-center">
            <Eye size={16} className="text-slate-500" />
            <p className="text-xs font-black text-slate-900 mt-1">{formatNumber(views)}</p>
          </div>
          <div className="flex flex-col items-center">
            <Heart size={16} className="text-rose-500 fill-rose-500" />
            <p className="text-xs font-black text-slate-900 mt-1">{formatNumber(likes)}</p>
          </div>
          <div className="flex flex-col items-center">
            <MessageSquare size={16} className="text-blue-500 fill-blue-500" />
            <p className="text-xs font-black text-slate-900 mt-1">{formatNumber(comments)}</p>
          </div>
          <div className="flex flex-col items-center">
            <Share2 size={16} className="text-emerald-500" />
            <p className="text-xs font-black text-slate-900 mt-1">{shares ? formatNumber(shares) : '0'}</p>
          </div>
          {saves !== undefined && (
            <div className="flex flex-col items-center">
              <Zap size={16} className="text-amber-500 fill-amber-500" />
              <p className="text-xs font-black text-primary-700 mt-1">{formatNumber(saves)}</p>
            </div>
          )}
        </div>

        {/* 3. Action Footer (Single Row Side-by-Side) */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-nowrap">
          {/* Reusable Instagram Brand Gradient Button */}
          <InstagramButton
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            size="sm"
            className="flex-1 justify-center min-w-0"
          >
            View on Instagram
          </InstagramButton>

          {/* Action cluster: AutoDM button & Pause Switch */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Mutually exclusive AutoDM button */}
            {hasAutodm ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAutodm?.();
                }}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary-50/90 px-2.5 sm:px-3 py-1.5 text-[11px] font-extrabold text-primary-700 border border-primary-200/80 hover:bg-primary-100 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <Zap size={12} className="fill-primary-600 text-primary-600" />
                <span>View AutoDM</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetupAutodm?.();
                }}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary-50/90 px-2.5 sm:px-3 py-1.5 text-[11px] font-extrabold text-primary-700 border border-primary-200/80 hover:bg-primary-100 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <Zap size={12} className="text-primary-600" />
                <span>Setup AutoDM</span>
              </button>
            )}

            {/* Pause AutoDM Toggle Switch */}
            {hasAutodm && (
              <button
                type="button"
                role="switch"
                aria-checked={!localPaused}
                onClick={handleTogglePause}
                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!localPaused ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                title={localPaused ? 'AutoDM Paused (click to resume)' : 'AutoDM Active (click to pause)'}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${!localPaused ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
