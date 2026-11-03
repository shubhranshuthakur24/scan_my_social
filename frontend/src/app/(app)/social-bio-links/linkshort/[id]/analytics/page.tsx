'use client';

import React, { useState, useEffect, useCallback, use, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShortLink,
  ShortLinkAnalytics,
  getShortLinkAnalytics,
  fetchShortLinks,
  updateShortLink,
  toggleShortLink,
  UpdateShortLinkPayload,
} from '@/lib/api/linkShortService';
import LinkShortDialog from '@/components/social-bio-links/linkshort/LinkShortDialog';
import { getShortLinkStatus } from '@/lib/utils/linkShortStatus';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import Dropdown from '@/components/ui/Dropdown';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  MousePointerClick,
  Users,
  TrendingUp,
  BarChart2,
  ExternalLink,
  Edit3,
  Copy,
  Check,
  Globe,
  Clock,
  Power,
  CalendarClock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Layers,
} from 'lucide-react';

const presets = [
  { id: '7d', label: 'Last 7 Days', days: 7 },
  { id: '14d', label: 'Last 14 Days', days: 14 },
  { id: '30d', label: 'Last 30 Days', days: 30 },
  { id: '90d', label: 'Last 90 Days', days: 90 },
] as const;

type DatePreset = (typeof presets)[number]['id'];

interface LinkShortAnalyticsPageProps {
  params: Promise<{ id: string }>;
}

function LinkShortAnalyticsSkeleton() {
  return (
    <div className="space-y-6 pb-16">
      <div className="h-10 w-64 bg-slate-100 rounded-xl animate-pulse" />
      <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}

function LinkShortAnalyticsContent({ linkId }: { linkId: number }) {
  const router = useRouter();

  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shortLink, setShortLink] = useState<ShortLink | null>(null);
  const [analytics, setAnalytics] = useState<ShortLinkAnalytics | null>(null);
  const [allShortLinks, setAllShortLinks] = useState<ShortLink[]>([]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load telemetry data
  const loadData = useCallback(
    async (presetToLoad = datePreset) => {
      setIsLoading(true);
      setError(null);

      try {
        const [detailRes, listRes] = await Promise.all([
          getShortLinkAnalytics(linkId, presetToLoad),
          fetchShortLinks({ per_page: 50 }).catch(() => ({ short_links: [] })),
        ]);

        setShortLink(detailRes.short_link);
        setAnalytics(detailRes.analytics);
        if (listRes.short_links) {
          setAllShortLinks(listRes.short_links);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load short link analytics';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [linkId, datePreset]
  );

  useEffect(() => {
    loadData(datePreset);
  }, [loadData, datePreset]);

  // Handle Preset Change
  const handlePresetSelect = (id: string) => {
    const selected = id as DatePreset;
    setDatePreset(selected);
    loadData(selected);
  };

  // Copy Short URL
  const handleCopyShortUrl = () => {
    if (!shortLink) return;
    navigator.clipboard.writeText(shortLink.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async () => {
    if (!shortLink) return;
    setIsMutating(true);
    try {
      const res = await toggleShortLink(shortLink.id);
      setShortLink((prev) => (prev ? { ...prev, is_active: res.is_active } : null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle status';
      setError(msg);
    } finally {
      setIsMutating(false);
    }
  };

  // Update Link Details
  const handleUpdateLink = async (payload: UpdateShortLinkPayload) => {
    if (!shortLink) return;
    setIsMutating(true);
    try {
      const res = await updateShortLink(shortLink.id, payload);
      setShortLink(res.short_link);
      setIsEditDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update short link';
      setError(msg);
    } finally {
      setIsMutating(false);
    }
  };

  // Switch Link via Dropdown
  const handleLinkSwitch = (selectedId: string) => {
    if (selectedId === String(linkId)) return;
    router.push(`/social-bio-links/linkshort/${selectedId}/analytics`);
  };

  // Computed metrics
  const periodClicksSum = useMemo(() => {
    if (analytics?.period_clicks !== undefined) return analytics.period_clicks;
    if (!analytics?.daily_clicks?.length) return 0;
    return analytics.daily_clicks.reduce((sum, item) => sum + (item.clicks || 0), 0);
  }, [analytics]);

  const maxDailyClicks = useMemo(() => {
    if (!analytics?.daily_clicks?.length) return 1;
    return Math.max(1, ...analytics.daily_clicks.map((d) => d.clicks || 0));
  }, [analytics]);

  const activeDaysCount = useMemo(() => {
    const presetObj = presets.find((p) => p.id === datePreset);
    return presetObj?.days || 30;
  }, [datePreset]);

  const avgDailyClicks = useMemo(() => {
    if (activeDaysCount <= 0) return '0.0';
    return (periodClicksSum / activeDaysCount).toFixed(1);
  }, [periodClicksSum, activeDaysCount]);

  if (isLoading && !shortLink) {
    return <LinkShortAnalyticsSkeleton />;
  }

  if (error && !shortLink) {
    return (
      <div className="space-y-6">
        <Link
          href="/social-bio-links/linkshort"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Linkshort</span>
        </Link>
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-rose-600" />
            <div>
              <p className="font-black">Failed to load short link analytics</p>
              <p className="text-xs text-rose-700 font-medium">{error}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => loadData()}>
            <RefreshCw size={14} />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  if (!shortLink || !analytics) return null;

  const isScheduled = Boolean(shortLink.starts_at || shortLink.ends_at);
  const statusInfo = getShortLinkStatus(shortLink);

  return (
    <div className="space-y-6 pb-20">
      {/* Screen reader live announcement for copy action (LS-06) */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `Short URL for ${shortLink.title} copied to clipboard` : ''}
      </span>

      {/* 1. Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/social-bio-links/linkshort"
          className="inline-flex items-center gap-2 min-h-[44px] px-2 text-xs font-extrabold text-slate-500 hover:text-slate-900 transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none rounded-xl"
        >
          <ArrowLeft size={14} />
          <span>Back to All Short Links</span>
        </Link>

        {/* Short Link Switcher */}
        {allShortLinks.length > 1 && (
          <Dropdown>
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer shadow-2xs transition-all select-none"
              >
                <Layers size={13} className="text-slate-400 shrink-0" />
                <span className="truncate max-w-[140px]">{shortLink.title || 'Switch Link'}</span>
                <ChevronDown size={13} className="text-slate-400 shrink-0" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="right" width="w-64">
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {allShortLinks.map((l) => (
                  <Dropdown.Item
                    key={l.id}
                    selected={l.id === linkId}
                    onClick={() => router.push(`/social-bio-links/linkshort/${l.id}/analytics`)}
                  >
                    <div className="truncate">
                      <p className="font-bold text-xs truncate">{l.title}</p>
                      <p className="text-[10px] text-slate-400 truncate font-mono">/s/{l.code} • {l.clicks_count} clicks</p>
                    </div>
                  </Dropdown.Item>
                ))}
              </div>
            </Dropdown.Content>
          </Dropdown>
        )}
      </div>

      {/* 2. Short Link Hero Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity & URL */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {shortLink.title}
              </h1>
              <Badge
                variant={statusInfo.variant}
                size="sm"
              >
                {statusInfo.label}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold text-primary-700 bg-primary-50 px-2.5 py-2 rounded-xl border border-primary-200/60 min-h-[44px] inline-flex items-center">
                {shortLink.short_url}
              </span>

              <button
                type="button"
                onClick={handleCopyShortUrl}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                aria-label={`Copy short URL ${shortLink.short_url}`}
              >
                {copied ? <Check size={14} className="text-emerald-600 shrink-0" /> : <Copy size={14} className="shrink-0" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <a
                href={shortLink.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                title={`Test short link redirect for ${shortLink.short_url}`}
                aria-label={`Test short link redirect for ${shortLink.short_url}`}
              >
                <ExternalLink size={14} className="shrink-0" />
                <span>Test Link</span>
              </a>
            </div>
          </div>

          {/* Quick Actions & Date Preset Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle Status */}
            <Button
              variant={shortLink.is_active ? 'secondary' : 'primary'}
              size="sm"
              role="switch"
              aria-checked={shortLink.is_active}
              aria-label={shortLink.is_active ? `Pause short link ${shortLink.title}` : `Activate short link ${shortLink.title}`}
              onClick={handleToggleStatus}
              disabled={isMutating}
              className="gap-2 shadow-2xs text-xs font-bold min-h-[44px] px-4"
            >
              <Power size={13} className={shortLink.is_active ? 'text-emerald-600' : 'text-slate-400'} />
              <span>{shortLink.is_active ? 'Pause Link' : 'Activate'}</span>
            </Button>

            {/* Edit Link Modal Trigger */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="gap-2 shadow-2xs text-xs font-bold min-h-[44px] px-4"
            >
              <Edit3 size={13} />
              <span>Edit Details</span>
            </Button>

            {/* Date Preset Dropdown */}
            <Dropdown>
              <Dropdown.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer shadow-2xs transition-all select-none"
                >
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span>{presets.find((p) => p.id === datePreset)?.label || 'Last 30 Days'}</span>
                  <ChevronDown size={13} className="text-slate-400 shrink-0" />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content align="right" width="w-44">
                <div className="space-y-0.5">
                  {presets.map((preset) => (
                    <Dropdown.Item
                      key={preset.id}
                      selected={datePreset === preset.id}
                      onClick={() => handlePresetSelect(preset.id)}
                    >
                      {preset.label}
                    </Dropdown.Item>
                  ))}
                </div>
              </Dropdown.Content>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* 3. KPI Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clicks */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-primary-600 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Total Clicks
            </span>
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <MousePointerClick size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {analytics.total_clicks.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 font-bold mt-1">
            Lifetime clicks recorded
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Unique Visitors
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {analytics.unique_visitors.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 font-bold mt-1">
            Unique verified visitor IP hashes
          </p>
        </div>

        {/* Period Clicks */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-primary-600 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Period Clicks
            </span>
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {periodClicksSum.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 font-bold mt-1">
            Recorded in selected {activeDaysCount} days
          </p>
        </div>

        {/* Velocity / Conversion Depth */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-primary-600 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Avg Daily Velocity
            </span>
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {avgDailyClicks} <span className="text-xs font-bold text-slate-400">/ day</span>
          </p>
          <p className="text-[11px] text-slate-400 font-bold mt-1">
            Peak: {maxDailyClicks} clicks in a single day
          </p>
        </div>
      </div>

      {/* 4. Click Velocity Histogram */}
      <div className="p-6 sm:p-7 rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <BarChart2 size={16} className="text-primary-600" />
              <span>Daily Click Velocity</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Traffic distribution across the selected {activeDaysCount}-day timeline
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60">
              Peak: {maxDailyClicks} clicks
            </span>
            <span className="text-xs font-black text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-200/60">
              Total: {periodClicksSum} clicks
            </span>
          </div>
        </div>

        {analytics.daily_clicks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-bold">
            No click data logged during this period.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end gap-1 sm:gap-1.5 h-44 sm:h-52 pt-4 pb-1 border-b border-slate-100">
              {analytics.daily_clicks.map((day) => {
                const heightPercent =
                  maxDailyClicks > 0 ? (day.clicks / maxDailyClicks) * 100 : 0;
                const isPeak = day.clicks === maxDailyClicks && maxDailyClicks > 0;

                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isPeak
                          ? 'bg-primary-600 group-hover:bg-primary-700 shadow-xs'
                          : day.clicks > 0
                          ? 'bg-primary-400 group-hover:bg-primary-500'
                          : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}
                      style={{
                        height: `${Math.max(day.clicks > 0 ? 8 : 3, heightPercent)}%`,
                      }}
                    />

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-slate-900 text-white text-[11px] font-black px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                        <span className="block text-[10px] text-slate-400 font-bold">{day.date}</span>
                        <span>{day.clicks} clicks</span>
                      </div>
                      <div className="w-2 h-1 bg-slate-900 clip-triangle" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-1">
              <span>{analytics.daily_clicks[0]?.date}</span>
              <span className="hidden sm:inline">Timeline Progression</span>
              <span>{analytics.daily_clicks[analytics.daily_clicks.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Two-Column Analytics Grid: Top Referrers & Link Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Referrers Breakdown */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Globe size={16} className="text-primary-600" />
                <span>Top Referrers</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Origins sending traffic to this short link
              </p>
            </div>
            <span className="text-xs font-black text-slate-400">
              {analytics.top_referrers.length} sources
            </span>
          </div>

          {analytics.top_referrers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold">
              No referrers recorded yet for this short link.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.top_referrers.map((ref) => {
                const totalClicks = analytics.total_clicks || 1;
                const pct = Math.round((ref.clicks / totalClicks) * 100);

                return (
                  <div
                    key={ref.referrer}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-800 truncate" title={ref.referrer}>
                        {ref.referrer}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-slate-900">
                          {ref.clicks.toLocaleString()} clicks
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">({pct}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-600 transition-all duration-300"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Link Identity & Routing Destination */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ExternalLink size={16} className="text-primary-600" />
              <span>Destination & Properties</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Target configuration and scheduled availability
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Target Destination */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Destination Target URL
              </span>
              <div className="flex items-center justify-between gap-2">
                <a
                  href={shortLink.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-slate-800 hover:text-primary-600 transition truncate flex-1 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none rounded-lg"
                  title={shortLink.destination_url}
                >
                  {shortLink.destination_url}
                </a>
                <a
                  href={shortLink.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl p-2.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition shrink-0 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                  title="Open destination target URL"
                  aria-label="Open destination target URL in new tab"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>

            {/* Short Code & URL */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Public Short URL
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono font-bold text-primary-700 truncate min-h-[44px] flex items-center">
                  {shortLink.short_url}
                </code>
                <button
                  type="button"
                  onClick={handleCopyShortUrl}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl p-2.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition shrink-0 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                  title="Copy short URL"
                  aria-label="Copy short URL to clipboard"
                >
                  {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            {/* Description if present */}
            {shortLink.description && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Description / Internal Notes
                </span>
                <p className="font-medium text-slate-700">{shortLink.description}</p>
              </div>
            )}

            {/* Schedule Window if present */}
            {isScheduled && (
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-1 text-amber-900">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <CalendarClock size={12} />
                  <span>Scheduled Activation Window</span>
                </span>
                <p className="font-bold text-xs">
                  {shortLink.starts_at && shortLink.ends_at
                    ? `${new Date(shortLink.starts_at).toLocaleString()} – ${new Date(
                        shortLink.ends_at
                      ).toLocaleString()}`
                    : shortLink.starts_at
                    ? `From: ${new Date(shortLink.starts_at).toLocaleString()}`
                    : `Until: ${new Date(shortLink.ends_at!).toLocaleString()}`}
                </p>
              </div>
            )}

            {/* Creation Date */}
            <div className="flex items-center justify-between text-slate-500 pt-1">
              <span className="text-[11px] font-bold">Created On</span>
              <span className="text-xs font-bold text-slate-700">
                {shortLink.created_at ? new Date(shortLink.created_at).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Recent Visitor Activity Log (Last 15) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-slate-500" />
              <span>Recent Activity (Last 15 Clicks)</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live audit trail of visitor redirects
            </p>
          </div>
          <span className="text-xs font-black text-slate-400">
            {analytics.recent_clicks.length} logged
          </span>
        </div>

        {analytics.recent_clicks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold">
            No click interactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th scope="col" className="pb-3 pr-4">Timestamp</th>
                  <th scope="col" className="pb-3 pr-4">Referrer</th>
                  <th scope="col" className="pb-3">Client User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.recent_clicks.map((click, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 pr-4 whitespace-nowrap font-bold text-slate-700">
                      {click.clicked_at ? new Date(click.clicked_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-3 pr-4 font-bold text-slate-700 truncate max-w-[200px]" title={click.referrer || 'Direct'}>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200/60 inline-block">
                        {click.referrer || 'Direct'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 font-mono text-[11px] truncate max-w-[320px]" title={click.user_agent || 'Unknown'}>
                      {click.user_agent || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Edit Modal */}
      {isEditDialogOpen && (
        <LinkShortDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSubmit={handleUpdateLink}
          editingLink={shortLink}
          isSubmitting={isMutating}
        />
      )}
    </div>
  );
}

export default function LinkShortAnalyticsPage({ params }: LinkShortAnalyticsPageProps) {
  const unwrappedParams = use(params);
  const linkId = parseInt(unwrappedParams.id, 10);

  return (
    <Suspense fallback={<LinkShortAnalyticsSkeleton />}>
      <LinkShortAnalyticsContent linkId={linkId} />
    </Suspense>
  );
}
