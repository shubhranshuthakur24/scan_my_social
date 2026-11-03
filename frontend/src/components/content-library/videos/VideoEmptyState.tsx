'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Tv, Search, Loader2 } from 'lucide-react';
import type { VideoEmptyStateProps } from './types';

export default function VideoEmptyState({
  channelsCount,
  syncingChannelsCount,
  hasActiveFilters,
  onResetFilters,
}: VideoEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-4">
      {channelsCount === 0 ? (
        <div className="space-y-3 max-w-sm mx-auto">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
            <Tv size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No tracked creators yet</h3>
            <p className="text-xs text-slate-400">
              Track your first competitor creator handle to start discovering and analyzing their viral reels.
            </p>
          </div>
          <Link href="/content-library/channels">
            <Button variant="primary" size="sm">
              Track Competitor Channels
            </Button>
          </Link>
        </div>
      ) : syncingChannelsCount > 0 && !hasActiveFilters ? (
        <div className="space-y-3 max-w-sm mx-auto">
          <Loader2 size={28} className="animate-spin text-primary-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Syncing creator reels...</h3>
            <p className="text-xs text-slate-400">
              Initial ingestion takes ~2-3 minutes. Videos will populate here automatically once complete.
            </p>
          </div>
          <Link href="/content-library/channels">
            <Button variant="outline" size="sm">
              View Tracked Channels
            </Button>
          </Link>
        </div>
      ) : hasActiveFilters ? (
        <div className="space-y-3 max-w-sm mx-auto">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
            <Search size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No videos match your active filters</h3>
            <p className="text-xs text-slate-400">
              Try clearing your filters or broadening your search keywords.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3 max-w-sm mx-auto">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
            <Search size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No public reels found for tracked creators</h3>
            <p className="text-xs text-slate-400">
              The creators you follow currently have no public reels indexed. Track additional creators to discover content.
            </p>
          </div>
          <Link href="/content-library/channels">
            <Button variant="primary" size="sm">
              Track Additional Creators
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
