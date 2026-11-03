'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ContentLibraryNav from '@/components/ContentLibraryNav';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  ChannelCard,
  ChannelSkeleton,
  ChannelSearchDropdown,
  TrackChannelModal,
} from '@/components/content-library/channels';
import { normalizeChannelInput } from '@/lib/channelUtils';
import {
  getChannels,
  trackChannel,
  untrackChannel,
} from '@/lib/api/contentLibraryService';
import type { ChannelItem } from '@/types/contentLibrary';
import {
  Plus,
  Tv,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & limits (authoritative server-side state)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [untrackRemaining, setUntrackRemaining] = useState<number | undefined>(undefined);
  const [, setUntrackLimit] = useState<number | undefined>(undefined);

  // Search state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal & mutation loading state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | number | null>(null);

  // Debounce search for the local tracked-channels grid filter
  useEffect(() => {
    const { normalizedQuery, isInvalidUrl } = normalizeChannelInput(search);
    const t = setTimeout(() => {
      setDebouncedSearch(isInvalidUrl ? '' : normalizedQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Primary data loader (preserves server-side pagination & filter semantics)
  const loadChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getChannels({
        search: debouncedSearch.trim() || undefined,
        page,
      });
      setChannels(res.data || []);
      setTotalPages(res.last_page || 1);
      setTotalCount(res.total || 0);
      if (res.untrack_remaining !== undefined) setUntrackRemaining(res.untrack_remaining);
      if (res.untrack_limit !== undefined) setUntrackLimit(res.untrack_limit);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tracked channels.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Authoritative tracking mutation from modal
  const handleTrackChannel = async (platform: string, handle: string) => {
    await trackChannel(platform, handle);
    await loadChannels();
  };

  // 1-Click Track Directly From Global Discovery Dropdown
  const handleTrackFromDiscovery = async (handle: string, channelId?: number) => {
    const key = channelId ?? handle;
    setActionLoadingKey(key);
    try {
      await trackChannel('instagram', handle);
      await loadChannels();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to track competitor creator.');
    } finally {
      setActionLoadingKey(null);
    }
  };

  // Untrack mutation with remaining quota confirmation
  const handleUntrack = async (channel: ChannelItem) => {
    const confirmMsg = `Are you sure you want to untrack @${channel.handle}? You have ${untrackRemaining ?? 5} untracks remaining.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingKey(channel.id);
    try {
      const res = await untrackChannel(channel.id);
      if (res.untrack_remaining !== undefined) {
        setUntrackRemaining(res.untrack_remaining);
      }
      setChannels((prev) => prev.filter((c) => c.id !== channel.id));
      setTotalCount((c) => Math.max(0, c - 1));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to untrack channel.');
    } finally {
      setActionLoadingKey(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Primary Tab Navigation */}
      <ContentLibraryNav
        rightElement={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Track Competitor
          </Button>
        }
      />

      {/* Action & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        {/* Isolated Search Input with Floating Discovery Popover */}
        <ChannelSearchDropdown
          search={search}
          onSearchChange={setSearch}
          onTrackChannel={handleTrackFromDiscovery}
          onUntrackChannel={handleUntrack}
          actionLoadingKey={actionLoadingKey}
        />

        {/* Channel Count & Untrack Quota Stats */}
        <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
          <span className="text-xs font-bold text-slate-500">
            {totalCount} {totalCount === 1 ? 'Competitor Tracked' : 'Competitors Tracked'}
          </span>
          {untrackRemaining !== undefined && (
            <Badge variant="subtle" color="slate" size="sm">
              {untrackRemaining} Untracks Remaining
            </Badge>
          )}
        </div>
      </div>

      {/* Channels Grid / Loading / Error / Empty States */}
      {loading ? (
        <ChannelSkeleton count={6} />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3">
          <AlertCircle size={32} className="mx-auto text-rose-500" />
          <h3 className="text-sm font-bold text-rose-900">Failed to load channels</h3>
          <p className="text-xs text-rose-600">{error}</p>
          <Button variant="primary" size="sm" onClick={loadChannels}>
            Retry
          </Button>
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
            <Tv size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No tracked channels found</h3>
            <p className="text-xs text-slate-400">
              {search
                ? 'No tracked channels match your search query.'
                : 'Start tracking competitor accounts to monitor their viral performance and scrape reels.'}
            </p>
          </div>
          {!search && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsModalOpen(true)}
            >
              Track First Competitor
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onUntrack={handleUntrack}
              isUntracking={actionLoadingKey === channel.id}
            />
          ))}
        </div>
      )}

      {/* Server-Side Pagination Bar */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-500">
            Page <span className="font-bold text-slate-900">{page}</span> of{' '}
            <span className="font-bold text-slate-900">{totalPages}</span> ({totalCount} total competitors)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={ChevronRight}
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Track Competitor Modal */}
      <TrackChannelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTrack={handleTrackChannel}
      />
    </div>
  );
}
