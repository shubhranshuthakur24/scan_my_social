'use client';

import React from 'react';
import Link from 'next/link';
import type { WatchlistItem } from '@/types/contentLibrary';
import { Eye, Star, Tv, Film, Trash2 } from 'lucide-react';

export interface WatchlistCardProps {
  watchlist: WatchlistItem;
  onToggleFavorite: (id: number, e: React.MouseEvent) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  isDeleting?: boolean;
}

export default function WatchlistCard({
  watchlist,
  onToggleFavorite,
  onDelete,
  isDeleting = false,
}: WatchlistCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between gap-4">
      {/* Top Row: Icon, Title, Favorite */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-xl bg-primary-50 p-2.5 text-primary-600 shrink-0">
            <Eye size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-slate-900 truncate">{watchlist.name}</h3>
            <p className="text-xs text-slate-400 font-medium line-clamp-1 min-h-4">
              {watchlist.description || ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => onToggleFavorite(watchlist.id, e)}
          title={watchlist.is_favorite ? 'Favorited' : 'Add to favorites'}
          className="text-slate-300 hover:text-amber-500 transition-colors p-1 cursor-pointer shrink-0"
        >
          <Star
            size={18}
            className={watchlist.is_favorite ? 'text-amber-500 fill-amber-500' : ''}
          />
        </button>
      </div>

      {/* Metrics Box */}
      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Tv size={14} className="text-slate-400" />
          <span>Channels Included</span>
        </div>
        <span className="text-xs font-black text-primary-700">
          {watchlist.channels_count ?? watchlist.channels?.length ?? 0}
        </span>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
        <Link
          href={`/content-library/videos?watchlist[]=${watchlist.id}`}
          className="inline-flex items-center gap-1 font-bold text-primary-600 hover:text-primary-800 hover:underline"
        >
          <Film size={13} />
          <span>View Feed →</span>
        </Link>

        <button
          type="button"
          onClick={(e) => onDelete(watchlist.id, e)}
          disabled={isDeleting}
          title="Delete watchlist"
          className="text-slate-400 hover:text-rose-600 disabled:opacity-40 p-1 transition-colors cursor-pointer"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
