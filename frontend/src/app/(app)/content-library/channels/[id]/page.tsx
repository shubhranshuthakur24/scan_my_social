'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ContentLibraryNav from '@/components/ContentLibraryNav';
import Button from '@/components/ui/Button';
import ContentLibraryCard from '@/components/content-library/ContentLibraryCard';
import ContentLibrarySkeleton from '@/components/content-library/ContentLibrarySkeleton';
import AddToProjectModal from '@/components/content-library/AddToProjectModal';
import { getPosts, scrapeChannel, getScrapeStatus } from '@/lib/api/contentLibraryService';
import { getAuthHeaders } from '@/lib/api/authService';
import { formatNumber } from '@/lib/format';
import type { ChannelItem, ContentPostItem, ScrapeStatusResponse } from '@/types/contentLibrary';
import {
  ArrowLeft,
  ExternalLink,
  Flame,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Film,
  Clock,
  Loader2,
  Plus,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function ChannelOutliersPage() {
  const params = useParams();
  const id = params?.id as string;

  const [channel, setChannel] = useState<ChannelItem | null>(null);
  const [posts, setPosts] = useState<ContentPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOutliersOnly, setFilterOutliersOnly] = useState(false);
  const [activePostForProject, setActivePostForProject] = useState<ContentPostItem | null>(null);

  // Scrape state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatusResponse | null>(null);

  const loadChannelData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch channel detail
      const res = await fetch(`${API_BASE_URL}/channels/${id}`, {
        headers: {
          'Accept': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load channel details (${res.status})`);
      }

      const channelPayload = await res.json();
      const channelData: ChannelItem = channelPayload.channel || channelPayload;
      setChannel(channelData);

      // Check scrape status
      try {
        const statusData = await getScrapeStatus(channelData.id);
        setScrapeStatus(statusData);
      } catch {
        // Fallback to channelData fields
      }

      // 2. Fetch posts by creator handle
      if (channelData.handle) {
        const postsRes = await getPosts({
          creator: [channelData.handle],
          per_page: 50,
          sort_by: 'outlier_score',
        });
        setPosts(postsRes.data || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load channel.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Poll status while scraping
  useEffect(() => {
    const isCurrentlyScraping = scrapeStatus?.is_scraping ||
      channel?.apify_profile_run_status === 'QUEUED' ||
      channel?.apify_profile_run_status === 'CLAIMING' ||
      channel?.apify_profile_run_status === 'RUNNING' ||
      channel?.apify_post_run_status === 'RUNNING';

    if (!isCurrentlyScraping || !id) return;

    const interval = setInterval(async () => {
      try {
        const status = await getScrapeStatus(Number(id));
        setScrapeStatus(status);

        if (!status.is_scraping) {
          // Finished syncing! Reload full data to show new posts
          loadChannelData();
        }
      } catch {
        // Silently retry next poll
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [scrapeStatus?.is_scraping, channel?.apify_profile_run_status, channel?.apify_post_run_status, id, loadChannelData]);

  useEffect(() => {
    loadChannelData();
  }, [loadChannelData]);

  const handleTriggerScrape = async () => {
    if (!channel) return;
    setIsRefreshing(true);
    setRefreshMessage(null);
    setRefreshError(null);

    try {
      const res = await scrapeChannel(channel.id);
      setRefreshMessage(res.message || 'Refresh initiated. Syncing latest reels...');
      setScrapeStatus((prev) => ({
        channel_id: channel.id,
        handle: channel.handle,
        is_scraping: true,
        can_scrape: false,
        next_scrape_available_at: res.next_scrape_available_at,
        apify_profile_run_status: 'QUEUED',
        apify_post_run_status: null,
      }));
    } catch (err: unknown) {
      const errorObj = err as Error & { error_code?: string; status_code?: number; next_scrape_available_at?: string };
      setRefreshError(errorObj.message || 'Failed to trigger scrape.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const displayedPosts = filterOutliersOnly
    ? posts.filter((p) => p.breakout_multiplier && p.breakout_multiplier >= 2.0)
    : posts;

  const isScrapingActive = Boolean(
    scrapeStatus?.is_scraping ||
    channel?.apify_profile_run_status === 'QUEUED' ||
    channel?.apify_profile_run_status === 'CLAIMING' ||
    channel?.apify_profile_run_status === 'RUNNING' ||
    channel?.apify_post_run_status === 'RUNNING'
  );

  const canScrapeNow = !isScrapingActive && (scrapeStatus ? scrapeStatus.can_scrape : true);

  if (loading) {
    return (
      <div className="space-y-6 pb-16">
        <ContentLibraryNav />
        <ContentLibrarySkeleton />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="space-y-6 max-w-md mx-auto py-12 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 space-y-3">
          <AlertCircle size={32} className="mx-auto text-rose-500" />
          <h3 className="text-sm font-bold text-rose-900">Channel Unavailable</h3>
          <p className="text-xs text-rose-600 font-medium">{error || 'Channel could not be loaded.'}</p>
          <Link href="/content-library/channels">
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Back to Channels
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <ContentLibraryNav />

      {/* Back Link */}
      <Link
        href="/content-library/channels"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Tracked Channels
      </Link>

      {/* Profile Banner */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {channel.profile_image_url ? (
              <img
                src={channel.profile_image_url}
                alt={channel.handle}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary-100 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-700 font-black text-xl">
                @{channel.handle.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {channel.name || `@${channel.handle}`}
                </h1>
                {channel.apify_profile_run_status === 'RUNNING' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-100">
                    <RefreshCw size={10} className="animate-spin" /> Scraping
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                    <CheckCircle2 size={10} /> Active
                  </span>
                )}
              </div>

              <a
                href={`https://instagram.com/${channel.handle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline mt-1"
              >
                <span>@{channel.handle}</span>
                <ExternalLink size={11} />
              </a>

              {channel.bio && (
                <p className="text-xs text-slate-500 mt-2 max-w-lg font-medium leading-relaxed">
                  {channel.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerScrape}
              disabled={!canScrapeNow || isRefreshing}
              title={
                !canScrapeNow
                  ? isScrapingActive
                    ? 'Sync currently in progress'
                    : 'Already updated today (resets after midnight IST)'
                  : 'Fetch latest reels & update metrics'
              }
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                canScrapeNow && !isRefreshing
                  ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs cursor-pointer'
                  : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
              }`}
            >
              <RefreshCw
                size={13}
                className={isScrapingActive || isRefreshing ? 'animate-spin text-primary-600' : 'text-slate-500'}
              />
              <span>
                {isRefreshing
                  ? 'Requesting...'
                  : isScrapingActive
                  ? 'Syncing Reels...'
                  : canScrapeNow
                  ? 'Refresh Data'
                  : 'Updated Today'}
              </span>
            </button>

            <Link href={`/content-library/videos?creator[]=${channel.handle}`}>
              <Button variant="primary" size="sm" icon={Film}>
                View in Discovery Grid
              </Button>
            </Link>
          </div>
        </div>

        {/* Notifications / Status Feedback */}
        {refreshMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{refreshMessage}</span>
          </div>
        )}

        {refreshError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 font-medium flex items-center gap-2">
            <AlertCircle size={14} className="text-rose-600 shrink-0" />
            <span>{refreshError}</span>
          </div>
        )}

        {/* Syncing in progress banner */}
        {isScrapingActive && (
          <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-primary-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900">Syncing creator reels in progress</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Posts and outlier scores will appear automatically once complete (~2-3 minutes).
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-primary-700 bg-primary-100/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Live Polling
            </span>
          </div>
        )}

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-100 text-center">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Followers</p>
            <p className="text-base font-black text-slate-900 mt-0.5">
              {formatNumber(channel.followers_count || 0)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Indexed Reels</p>
            <p className="text-base font-black text-slate-900 mt-0.5">
              {channel.posts_count || posts.length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Platform</p>
            <p className="text-base font-black text-primary-700 mt-0.5 capitalize">
              {channel.platform || 'Instagram'}
            </p>
          </div>
        </div>
      </div>

      {/* Reel Feed Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOutliersOnly(false)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              !filterOutliersOnly
                ? 'bg-primary-600 text-white shadow-xs'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Reels ({posts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterOutliersOnly(true)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              filterOutliersOnly
                ? 'bg-rose-600 text-white shadow-xs'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Flame size={12} className={filterOutliersOnly ? 'fill-white' : 'text-rose-500'} />
            <span>2.0x+ Outliers Only</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-semibold">
          Showing {displayedPosts.length} scraped {displayedPosts.length === 1 ? 'reel' : 'reels'}
        </span>
      </div>

      {/* Reels Grid & Content Availability States */}
      {displayedPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-4">
          {isScrapingActive ? (
            <div className="space-y-3 max-w-sm mx-auto">
              <Loader2 size={28} className="animate-spin text-primary-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Posts will be available once the channel finishes syncing.</p>
              <p className="text-xs text-slate-400 font-medium">
                Initial ingestion takes ~2-3 minutes. This page is live-polling and will refresh automatically.
              </p>
            </div>
          ) : filterOutliersOnly ? (
            <div className="space-y-2 max-w-sm mx-auto">
              <p className="text-xs font-bold text-slate-700">No 2.0x+ breakout reels found.</p>
              <p className="text-xs text-slate-400">
                None of the indexed reels have reached a 2.0x outlier threshold yet. Switch to All Reels to see all content.
              </p>
              <button
                type="button"
                onClick={() => setFilterOutliersOnly(false)}
                className="text-xs font-bold text-primary-600 hover:underline pt-2"
              >
                View All Reels ({posts.length})
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-w-sm mx-auto">
              <Film size={28} className="text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No posts found for this channel.</p>
              <p className="text-xs text-slate-500 font-medium">
                Check whether the creator currently has public posts, or track another channel.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Link href="/content-library/channels">
                  <Button variant="outline" size="sm">
                    Track New Channel
                  </Button>
                </Link>
                {canScrapeNow && (
                  <Button variant="secondary" size="sm" onClick={handleTriggerScrape} disabled={isRefreshing}>
                    Retry Scrape
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPosts.map((post) => (
            <ContentLibraryCard
              key={post.id}
              post={post}
              onAddToProject={(p) => setActivePostForProject(p)}
            />
          ))}
        </div>
      )}

      {/* Project Modal */}
      <AddToProjectModal
        isOpen={Boolean(activePostForProject)}
        onClose={() => setActivePostForProject(null)}
        post={activePostForProject}
      />
    </div>
  );
}
