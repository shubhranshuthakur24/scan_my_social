'use client';

import React, { useState } from 'react';
import PhoneMockupFrame from '@/components/PhoneMockupFrame';
import {
  Film,
  Zap,
  Music,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Link2,
  Send,
  MoreHorizontal,
  Home,
  Search,
  PlusSquare,
} from 'lucide-react';

export interface SchedulerDeviceMockupProps {
  format: 'reel' | 'carousel' | 'image' | 'story';
  selectedMediaUrl?: string | null;
  isVideoMedia?: boolean;
  carouselSlides?: string[];
  activeSlideIndex?: number;
  setActiveSlideIndex?: (index: number) => void;
  imageAspectRatio?: '1:1' | '4:5';
  caption?: string;
  activeAccount?: {
    username: string;
    avatar?: string;
  } | null;
  hasAutodm?: boolean;
  autodmKeyword?: string;
  storyLinkSticker?: string;
  className?: string;
}

export default function SchedulerDeviceMockup({
  format,
  selectedMediaUrl,
  isVideoMedia = false,
  carouselSlides = [],
  activeSlideIndex: controlledSlideIndex,
  setActiveSlideIndex: controlledSetActiveSlideIndex,
  imageAspectRatio = '4:5',
  caption = '',
  activeAccount,
  hasAutodm = false,
  autodmKeyword = '',
  storyLinkSticker = '',
  className = '',
}: SchedulerDeviceMockupProps) {
  const [internalSlideIndex, setInternalSlideIndex] = useState(0);

  const activeSlideIndex = controlledSlideIndex !== undefined ? controlledSlideIndex : internalSlideIndex;
  const setActiveSlideIndex = controlledSetActiveSlideIndex || setInternalSlideIndex;

  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4 ${className}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Phone Preview</span>
        <span className="rounded-full bg-primary-100 text-primary-700 px-2.5 py-0.5 text-[10px] font-black uppercase">
          {format} Preview
        </span>
      </div>

      {/* iPhone Frame Simulator */}
      <PhoneMockupFrame>

        {/* 1. MOCKUP: INSTAGRAM REEL */}
        {format === 'reel' && (
          <div className="relative flex-1 overflow-hidden flex flex-col justify-between p-3.5 pb-6">
            {/* Background Video / Image or Empty Placeholder */}
            {selectedMediaUrl ? (
              <>
                {isVideoMedia ? (
                  <video
                    src={selectedMediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedMediaUrl}
                    alt="Reel Media"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-primary-400 flex items-center justify-center mb-2 animate-pulse">
                  <Film size={22} />
                </div>
                <p className="text-xs font-black text-white">No Reel Video Loaded</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">Upload a 9:16 video or select an asset from library</p>
              </div>
            )}

            {/* Reel Top Bar */}
            <div className="relative z-10 flex items-center justify-between text-xs font-black pt-1">
              <span className="text-white drop-shadow-md">Reels</span>
              <Film size={18} className="text-white drop-shadow-md" />
            </div>

            {/* AutoDM Banner Tag */}
            {hasAutodm && (
              <div className="relative z-10 self-start mt-2 rounded-full bg-slate-950/80 backdrop-blur-md px-2.5 py-1 text-[9px] font-black text-emerald-400 flex items-center gap-1 border border-emerald-400/40 shadow-lg">
                <Zap size={10} className="fill-emerald-400" />
                <span>COMMENT &quot;{autodmKeyword}&quot; FOR DM</span>
              </div>
            )}

            {/* Reel Bottom & Side Action Grid */}
            <div className="relative z-10 mt-auto flex items-end justify-between gap-3 pt-4">
              {/* Left: Creator Info & Caption */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  {activeAccount?.avatar ? (
                    <img
                      src={activeAccount.avatar}
                      alt={activeAccount.username}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-white/80"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white/80 shrink-0">
                      {activeAccount?.username ? activeAccount.username.slice(0, 2).toUpperCase() : '—'}
                    </div>
                  )}
                  <p className="text-xs font-black text-white drop-shadow-md truncate">@{activeAccount?.username || 'no_account'}</p>
                  <span className="rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white">
                    Follow
                  </span>
                </div>

                <p className="text-xs text-white/95 line-clamp-2 leading-tight drop-shadow-md font-medium">
                  {caption || 'Add your caption in the scheduler composer...'}
                </p>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-200 font-bold">
                  <Music size={10} className="animate-spin text-primary-400" />
                  <span className="truncate">Original Audio • @{activeAccount?.username || 'original'}</span>
                </div>
              </div>

              {/* Right: Vertical Interaction Bar */}
              <div className="flex flex-col items-center gap-3 text-white">
                <div className="flex flex-col items-center">
                  <Heart size={22} className="drop-shadow-md hover:text-rose-500 cursor-pointer" />
                  <span className="text-[10px] font-bold mt-0.5">24.5K</span>
                </div>
                <div className="flex flex-col items-center">
                  <MessageCircle size={22} className="drop-shadow-md hover:text-primary-400 cursor-pointer" />
                  <span className="text-[10px] font-bold mt-0.5">1.2K</span>
                </div>
                <div className="flex flex-col items-center">
                  <Share2 size={22} className="drop-shadow-md hover:text-blue-400 cursor-pointer" />
                  <span className="text-[10px] font-bold mt-0.5">850</span>
                </div>
                <Bookmark size={20} className="drop-shadow-md hover:text-amber-400 cursor-pointer" />
              </div>
            </div>
          </div>
        )}

        {/* 2. MOCKUP: CAROUSEL POST */}
        {format === 'carousel' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Top App Header */}
            <div className="px-3.5 py-1.5 flex items-center justify-between text-slate-200 shrink-0 border-b border-slate-900/80">
              <ChevronLeft className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-bold tracking-wider uppercase text-slate-300">Posts</p>
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
            </div>

            {/* Scrollable Feed Post Body */}
            <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col">
              {/* Creator Row */}
              <div className="px-3 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {activeAccount?.avatar ? (
                    <img
                      src={activeAccount.avatar}
                      alt={activeAccount.username}
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-primary-500/50"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-white font-bold text-xs">
                      {activeAccount?.username ? activeAccount.username[0]?.toUpperCase() : '—'}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold text-slate-100 leading-tight">@{activeAccount?.username || 'no_account'}</p>
                    <p className="text-[9px] text-slate-400">Sponsored / Creator</p>
                  </div>
                </div>
                <span className="text-slate-400 font-bold text-xs tracking-widest">•••</span>
              </div>

              {/* Edge-to-Edge Carousel Media Box (Aspect 4:5) */}
              <div className="relative w-full aspect-4/5 bg-slate-950 overflow-hidden group shrink-0">
                {carouselSlides.length > 0 ? (
                  <>
                    {carouselSlides[activeSlideIndex] ? (
                      <img
                        src={carouselSlides[activeSlideIndex]}
                        alt={`Slide ${activeSlideIndex + 1}`}
                        className="h-full w-full object-cover transition-opacity duration-300"
                      />
                    ) : null}

                    {/* Top Right Counter Badge */}
                    <div className="absolute top-2.5 right-2.5 rounded-full bg-slate-950/80 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-black text-white border border-white/10">
                      {activeSlideIndex + 1}/{carouselSlides.length}
                    </div>

                    {/* AutoDM Banner */}
                    {hasAutodm && (
                      <div className="absolute top-2.5 left-2.5 rounded-full bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-[8px] font-black text-emerald-400 flex items-center gap-1 border border-emerald-400/30">
                        <Zap size={9} className="fill-emerald-400" />
                        <span>COMMENT &quot;{autodmKeyword}&quot;</span>
                      </div>
                    )}

                    {/* Nav Arrows */}
                    {carouselSlides.length > 1 && (
                      <>
                        {activeSlideIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveSlideIndex(activeSlideIndex - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                          >
                            <ChevronLeft size={16} />
                          </button>
                        )}
                        {activeSlideIndex < carouselSlides.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setActiveSlideIndex(activeSlideIndex + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                          >
                            <ChevronRight size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-slate-900 to-slate-950 p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-primary-400 flex items-center justify-center mb-2.5 shadow-inner border border-slate-800">
                      <Layers size={24} />
                    </div>
                    <p className="text-xs font-bold text-white">No Slides Added</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] leading-snug">
                      Upload carousel slide images or select from library
                    </p>
                  </div>
                )}
              </div>

              {/* Engagement Actions Row & Dots */}
              <div className="px-3 pt-2.5 pb-1 flex items-center justify-between text-slate-100 shrink-0">
                <div className="flex items-center gap-3.5">
                  <Heart size={19} className="hover:text-rose-500 transition-colors cursor-pointer" />
                  <MessageCircle size={19} className="hover:text-primary-400 transition-colors cursor-pointer" />
                  <Share2 size={19} className="hover:text-blue-400 transition-colors cursor-pointer" />
                </div>

                {/* Centered Pagination Dots */}
                {carouselSlides.length > 1 && (
                  <div className="flex items-center gap-1">
                    {carouselSlides.map((_, i) => (
                      <span
                        key={i}
                        onClick={() => setActiveSlideIndex(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${activeSlideIndex === i ? 'w-3.5 bg-primary-500' : 'w-1.5 bg-slate-600'
                          }`}
                      />
                    ))}
                  </div>
                )}

                <Bookmark size={19} className="text-slate-300 hover:text-white transition-colors cursor-pointer" />
              </div>

              {/* Likes & Native Caption Section */}
              <div className="px-3 pt-1 pb-3 space-y-1 shrink-0">
                <p className="text-[11px] font-bold text-white leading-none">2,810 likes</p>
                <div className="text-[11px] leading-snug">
                  <span className="font-bold text-white mr-1.5">@{activeAccount?.username || 'no_account'}</span>
                  <span className="text-slate-200 line-clamp-3 font-normal">
                    {caption || 'Add your caption in the scheduler composer...'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 pt-0.5">View all 24 comments</p>
                <p className="text-[8px] text-slate-600 uppercase tracking-wider">2 HOURS AGO</p>
              </div>
            </div>

            {/* Bottom Instagram Navigation Bar */}
            <div className="px-5 py-2.5 border-t border-slate-900 bg-black flex items-center justify-between text-slate-400 shrink-0">
              <Home size={18} className="text-white" />
              <Search size={18} />
              <PlusSquare size={18} />
              <Film size={18} />
              {activeAccount?.avatar ? (
                <img
                  src={activeAccount.avatar}
                  alt="Profile"
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-white/60"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center">
                  {activeAccount?.username ? activeAccount.username[0]?.toUpperCase() : '—'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. MOCKUP: SINGLE PHOTO */}
        {format === 'image' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Top App Header */}
            <div className="px-3.5 py-1.5 flex items-center justify-between text-slate-200 shrink-0 border-b border-slate-900/80">
              <ChevronLeft className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-bold tracking-wider uppercase text-slate-300">Posts</p>
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
            </div>

            {/* Scrollable Feed Post Body */}
            <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col">
              {/* Creator Row */}
              <div className="px-3 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {activeAccount?.avatar ? (
                    <img
                      src={activeAccount.avatar}
                      alt={activeAccount.username}
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-primary-500/50"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-white font-bold text-xs">
                      {activeAccount?.username ? activeAccount.username[0]?.toUpperCase() : '—'}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold text-slate-100 leading-tight">@{activeAccount?.username || 'no_account'}</p>
                    <p className="text-[9px] text-slate-400">Photo Post</p>
                  </div>
                </div>
                <span className="text-slate-400 font-bold text-xs tracking-widest">•••</span>
              </div>

              {/* Edge-to-Edge Single Photo Box */}
              <div
                className={`relative w-full ${imageAspectRatio === '1:1' ? 'aspect-square' : 'aspect-4/5'
                  } bg-slate-950 overflow-hidden shrink-0`}
              >
                {selectedMediaUrl ? (
                  <>
                    <img
                      src={selectedMediaUrl}
                      alt="Single Post"
                      className="h-full w-full object-cover"
                    />
                    {hasAutodm && (
                      <div className="absolute top-2.5 left-2.5 rounded-full bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-[8px] font-black text-emerald-400 flex items-center gap-1 border border-emerald-400/30">
                        <Zap size={9} className="fill-emerald-400" />
                        <span>COMMENT &quot;{autodmKeyword}&quot;</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-slate-900 to-slate-950 p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-primary-400 flex items-center justify-center mb-2.5 shadow-inner border border-slate-800">
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-xs font-bold text-white">No Photo Loaded</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] leading-snug">
                      Upload a photo or select from content library
                    </p>
                  </div>
                )}
              </div>

              {/* Engagement Actions Row */}
              <div className="px-3 pt-2.5 pb-1 flex items-center justify-between text-slate-100 shrink-0">
                <div className="flex items-center gap-3.5">
                  <Heart size={19} className="hover:text-rose-500 transition-colors cursor-pointer" />
                  <MessageCircle size={19} className="hover:text-primary-400 transition-colors cursor-pointer" />
                  <Share2 size={19} className="hover:text-blue-400 transition-colors cursor-pointer" />
                </div>
                <Bookmark size={19} className="text-slate-300 hover:text-white transition-colors cursor-pointer" />
              </div>

              {/* Likes & Native Caption Section */}
              <div className="px-3 pt-1 pb-3 space-y-1 shrink-0">
                <p className="text-[11px] font-bold text-white leading-none">1,940 likes</p>
                <div className="text-[11px] leading-snug">
                  <span className="font-bold text-white mr-1.5">@{activeAccount?.username || 'no_account'}</span>
                  <span className="text-slate-200 line-clamp-3 font-normal">
                    {caption || 'Add your caption in the scheduler composer...'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 pt-0.5">View all 18 comments</p>
                <p className="text-[8px] text-slate-600 uppercase tracking-wider">3 HOURS AGO</p>
              </div>
            </div>

            {/* Bottom Instagram Navigation Bar */}
            <div className="px-5 py-2.5 border-t border-slate-900 bg-black flex items-center justify-between text-slate-400 shrink-0">
              <Home size={18} className="text-white" />
              <Search size={18} />
              <PlusSquare size={18} />
              <Film size={18} />
              {activeAccount?.avatar ? (
                <img
                  src={activeAccount.avatar}
                  alt="Profile"
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-white/60"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center">
                  {activeAccount?.username ? activeAccount.username[0]?.toUpperCase() : '—'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. MOCKUP: STORY BROADCAST */}
        {format === 'story' && (
          <div className="relative flex-1 overflow-hidden flex flex-col justify-between p-3.5 pb-6">
            {selectedMediaUrl ? (
              <>
                {isVideoMedia ? (
                  <video
                    src={selectedMediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedMediaUrl}
                    alt="Story Media"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-rose-400 flex items-center justify-center mb-2">
                  <Sparkles size={20} />
                </div>
                <p className="text-xs font-black text-white">No Story Media</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-42.5">Upload a 9:16 vertical image or video</p>
              </div>
            )}

            {/* Story Top Segment Progress Bars */}
            <div className="relative z-10 space-y-2 pt-1">
              <div className="grid grid-cols-3 gap-1">
                <div className="h-0.5 rounded-full bg-white" />
                <div className="h-0.5 rounded-full bg-white/40" />
                <div className="h-0.5 rounded-full bg-white/40" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeAccount?.avatar ? (
                    <img
                      src={activeAccount.avatar}
                      alt={activeAccount.username}
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-white"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center ring-1 ring-white shrink-0">
                      {activeAccount?.username ? activeAccount.username.slice(0, 2).toUpperCase() : '—'}
                    </div>
                  )}
                  <span className="text-[11px] font-black text-white truncate">@{activeAccount?.username || 'no_account'}</span>
                  <span className="text-[9px] text-white/70">Just now</span>
                </div>
                <span className="text-white text-xs cursor-pointer">✕</span>
              </div>
            </div>

            {/* Interactive Story Link Sticker */}
            {storyLinkSticker && (
              <div className="relative z-10 self-center my-auto rounded-xl bg-white text-slate-900 font-black text-[11px] px-3 py-1.5 shadow-xl flex items-center gap-1.5 border border-slate-200">
                <Link2 size={12} className="text-primary-600" />
                <span className="truncate max-w-[160px]">viralyzer.ai/growth</span>
              </div>
            )}

            {/* Story Bottom Reply Bar */}
            <div className="relative z-10 flex items-center gap-2 pt-2">
              <div className="flex-1 rounded-full border border-white/30 bg-black/40 backdrop-blur-md px-3 py-1.5 text-[10px] text-white/70">
                Send message...
              </div>
              <Heart size={18} className="text-white shrink-0 hover:text-rose-500 cursor-pointer" />
              <Send size={16} className="text-white shrink-0 hover:text-primary-400 cursor-pointer" />
            </div>
          </div>
        )}

      </PhoneMockupFrame>
    </div>
  );
}
