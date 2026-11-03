'use client';

import React from 'react';
import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import type { ChannelItem } from '@/types/contentLibrary';
import {
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  Film,
  Trash2,
} from 'lucide-react';

export interface ChannelCardProps {
  channel: ChannelItem;
  onUntrack: (channel: ChannelItem) => void;
  isUntracking?: boolean;
}

export default function ChannelCard({ channel, onUntrack, isUntracking = false }: ChannelCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-4 flex flex-col justify-between">
      {/* Channel Profile Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {channel.profile_image_url ? (
            <img
              src={channel.profile_image_url}
              alt={channel.handle}
              className="h-12 w-12 rounded-xl object-cover ring-2 ring-primary-100 shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
              @{channel.handle.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-slate-900 truncate">
              {channel.name || `@${channel.handle}`}
            </h3>
            <a
              href={`https://instagram.com/${channel.handle}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline mt-0.5 truncate max-w-full"
            >
              <span className="truncate">@{channel.handle}</span>
              <ExternalLink size={10} className="shrink-0" />
            </a>
          </div>
        </div>

        {/* Status Badge */}
        {channel.apify_profile_run_status === 'RUNNING' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-100 shrink-0">
            <RefreshCw size={10} className="animate-spin" /> Scraping
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100 shrink-0">
            <CheckCircle2 size={10} /> Active
          </span>
        )}
      </div>

      {/* Bio snippet if present */}
      {channel.bio && (
        <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
          {channel.bio}
        </p>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Followers</p>
          <p className="text-xs font-black text-slate-900 mt-0.5">
            {formatNumber(channel.followers_count || 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Indexed Posts</p>
          <p className="text-xs font-black text-primary-700 mt-0.5">
            {channel.posts_count || 0}
          </p>
        </div>
      </div>

      {/* Sync / Last Updated Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
        <span className="flex items-center gap-1">
          <Clock size={11} className="text-slate-400" />
          {channel.last_refreshed_data_on
            ? `Updated ${new Date(channel.last_refreshed_data_on).toLocaleDateString()}`
            : channel.last_scraped_at
              ? `Scraped ${new Date(channel.last_scraped_at).toLocaleDateString()}`
              : 'Awaiting sync'}
        </span>
        <Link
          href={`/content-library/channels/${channel.id}`}
          className="text-primary-600 hover:underline font-semibold"
        >
          Details
        </Link>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
        <Link
          href={`/content-library/videos?creator[]=${channel.handle}`}
          className="inline-flex items-center gap-1 font-bold text-primary-600 hover:text-primary-800 hover:underline"
        >
          <Film size={13} />
          <span>View Reels →</span>
        </Link>

        <button
          type="button"
          onClick={() => onUntrack(channel)}
          disabled={isUntracking}
          title="Untrack this competitor"
          className="text-slate-400 hover:text-rose-600 disabled:opacity-40 p-1 transition-colors cursor-pointer"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
