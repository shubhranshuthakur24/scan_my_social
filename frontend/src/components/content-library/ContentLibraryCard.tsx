'use client';

import React from 'react';
import Link from 'next/link';
import { Eye, Heart, MessageCircle, TrendingUp, Flame, FolderPlus, ExternalLink, Play } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { ContentPostItem } from '@/types/contentLibrary';

interface ContentLibraryCardProps {
  post: ContentPostItem;
  onAddToProject?: (post: ContentPostItem) => void;
}

export default function ContentLibraryCard({ post, onAddToProject }: ContentLibraryCardProps) {
  const isOutlier = post.breakout_multiplier && post.breakout_multiplier >= 2.0;
  const multiplierText = post.breakout_multiplier ? `${Number(post.breakout_multiplier).toFixed(1)}x` : null;
  const engagementText = post.engagement_rate
    ? `${(Number(post.engagement_rate) * (post.engagement_rate <= 1 ? 100 : 1)).toFixed(1)}%`
    : '0.0%';

  const thumbnail = post.display_url || post.url || '/placeholder-reel.jpg';

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-md transition-all duration-300">
      {/* 1. Portrait Thumbnail Media (aspect-[4/5] standard IG portrait) */}
      <Link href={`/content-library/videos/${post.id}`} className="relative aspect-4/5 w-full overflow-hidden bg-slate-950 block">
        <img
          src={thumbnail}
          alt={post.caption || 'Competitor post thumbnail'}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
          {isOutlier ? (
            <span className="inline-flex items-center gap-1 rounded-xl bg-rose-500/95 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white shadow-sm border border-white/20">
              <Flame size={12} className="fill-white" />
              <span>{multiplierText} Outlier</span>
            </span>
          ) : post.breakout_label ? (
            <span className="inline-flex items-center gap-1 rounded-xl bg-primary-600/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
              <TrendingUp size={11} />
              <span>{post.breakout_label}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-xl bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white/90 uppercase tracking-wider">
              {post.platform || 'Instagram'}
            </span>
          )}

          {/* Project Saved Indicator Badge if post belongs to projects */}
          {post.projects && post.projects.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
              Saved in {post.projects.length} {post.projects.length === 1 ? 'board' : 'boards'}
            </span>
          )}
        </div>

        {/* Center Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-white/30 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 transition-transform duration-200">
            <Play size={18} className="fill-white ml-0.5" />
          </div>
        </div>

        {/* Creator Username Tag on Thumbnail Bottom Left */}
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-2">
          {post.channel?.profile_image_url && (
            <img
              src={post.channel.profile_image_url}
              alt={post.owner_username}
              className="h-6 w-6 rounded-full object-cover ring-1 ring-white/50"
            />
          )}
          <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[11px] font-bold text-white">
            @{post.owner_username}
          </span>
        </div>
      </Link>

      {/* 2. Card Body & Information Section */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        {/* Caption */}
        <Link href={`/content-library/videos/${post.id}`} className="block group-hover:text-primary-600 transition-colors">
          <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed" title={post.caption}>
            {post.caption || 'No caption available.'}
          </p>
        </Link>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-1 py-2 px-1.5 rounded-xl bg-slate-50/90 border border-slate-100 text-center items-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <Eye size={12} className="text-slate-500" />
              <span>Views</span>
            </div>
            <p className="text-xs font-black text-slate-900 mt-0.5">
              {formatNumber(post.video_view_count ?? post.video_play_count ?? 0)}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <Heart size={12} className="text-rose-500 fill-rose-500" />
              <span>Likes</span>
            </div>
            <p className="text-xs font-black text-slate-900 mt-0.5">{formatNumber(post.likes_count || 0)}</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <MessageCircle size={12} className="text-blue-500 fill-blue-500" />
              <span>Cmts</span>
            </div>
            <p className="text-xs font-black text-slate-900 mt-0.5">{formatNumber(post.comments_count || 0)}</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <TrendingUp size={12} className="text-primary-600" />
              <span>Eng.</span>
            </div>
            <p className="text-xs font-black text-primary-700 mt-0.5">{engagementText}</p>
          </div>
        </div>

        {/* 3. Action Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <Link
            href={`/content-library/videos/${post.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 border border-primary-200/70 hover:bg-primary-100 transition-colors"
          >
            <span>Analyze Intel</span>
          </Link>

          {onAddToProject && (
            <button
              type="button"
              onClick={() => onAddToProject(post)}
              title="Save to Project Board"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <FolderPlus size={16} />
            </button>
          )}

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              title="View on Instagram"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
