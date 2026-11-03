'use client';

import React, { useState, useEffect, useCallback, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchSocialBioLinksAnalytics,
  BioCard,
  BioCardSummary,
  BioAnalyticsData,
} from '@/lib/api/socialBioLinksService';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import Dropdown from '@/components/ui/Dropdown';
import { buildPublicCardUrl } from '@/lib/utils/publicUrl';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  MousePointerClick,
  Users,
  Link as LinkIcon,
  TrendingUp,
  BarChart2,
  ExternalLink,
  Edit3,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  RefreshCw,
  PieChart,
  Layers,
} from 'lucide-react';

const presets = [
  { id: '7d', label: 'Last 7 Days', days: 7 },
  { id: '14d', label: 'Last 14 Days', days: 14 },
  { id: '30d', label: 'Last 30 Days', days: 30 },
  { id: '90d', label: 'Last 90 Days', days: 90 },
] as const;

type DatePreset = (typeof presets)[number]['id'];

interface CardAnalyticsPageProps {
  params: Promise<{ id: string }>;
}

function CardAnalyticsSkeleton() {
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
    </div>
  );
}

function CardAnalyticsContent({ cardId }: { cardId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPreset = (searchParams.get('preset') as DatePreset) || '30d';
  const resolvedPreset = presets.some((p) => p.id === initialPreset) ? initialPreset : '30d';
  const [datePreset, setDatePreset] = useState<DatePreset>(resolvedPreset);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [card, setCard] = useState<BioCard | null>(null);
  const [cards, setCards] = useState<BioCardSummary[]>([]);
  const [cardAnalytics, setCardAnalytics] = useState<BioAnalyticsData | null>(null);
  const [combinedAnalytics, setCombinedAnalytics] = useState<BioAnalyticsData | null>(null);

  const [copied, setCopied] = useState(false);
  const [copyAnnouncement, setCopyAnnouncement] = useState<{ message: string; type: 'polite' | 'assertive' } | null>(null);

  // Synchronize React state when URL searchParams change (Browser Back / Forward)
  useEffect(() => {
    const currentPresetParam = searchParams.get('preset') as DatePreset;
    const validPreset = presets.some((p) => p.id === currentPresetParam) ? currentPresetParam : '30d';
    if (datePreset !== validPreset) {
      setDatePreset(validPreset);
    }
  }, [searchParams, datePreset]);

  const loadData = useCallback(
    async (presetToLoad = datePreset) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetchSocialBioLinksAnalytics(cardId, presetToLoad);
        setCard(res.selected_card || null);
        setCards(res.cards || []);
        setCardAnalytics(res.analytics?.selected || null);
        setCombinedAnalytics(res.analytics?.combined || null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load card analytics';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [cardId, datePreset]
  );

  useEffect(() => {
    loadData(datePreset);
  }, [datePreset, loadData]);

  const handleSelectPreset = (preset: DatePreset) => {
    if (preset === datePreset) return;
    setDatePreset(preset);
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', preset);
    router.push(`/social-bio-links/${cardId}/analytics?${params.toString()}`, { scroll: false });
  };

  const handleCopyUrl = async () => {
    if (!card?.public_url) return;
    const cardTitle = card.display_name || 'bio card';
    try {
      const fullUrl = buildPublicCardUrl(card.public_url);
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setCopyAnnouncement({
        message: `Copied public link for ${cardTitle}`,
        type: 'polite',
      });
      setTimeout(() => {
        setCopied(false);
        setCopyAnnouncement(null);
      }, 2000);
    } catch {
      setCopied(false);
      setCopyAnnouncement({
        message: `Failed to copy public link for ${cardTitle}`,
        type: 'assertive',
      });
    }
  };

  const selectedPreset = presets.find((p) => p.id === datePreset) || presets[2];

  // Calculations
  const totalCardClicks = cardAnalytics?.total_clicks ?? 0;
  const uniqueVisitors = cardAnalytics?.unique_clicks ?? 0;
  const dailyClicks = cardAnalytics?.daily_clicks || [];
  const maxClicksInDay = Math.max(...dailyClicks.map((d) => d.clicks), 1);
  const periodClicks = dailyClicks.reduce((acc, d) => acc + d.clicks, 0);

  const activeLinks = card?.links?.filter((l) => l.is_active) || [];
  const totalAccountClicks = combinedAnalytics?.total_clicks || 0;
  const accountSharePercent =
    totalAccountClicks > 0 ? Math.round((totalCardClicks / totalAccountClicks) * 100) : 0;

  // Filter links on this card that have clicks, sorted by clicks descending
  const linksWithClicks = (cardAnalytics?.links || [])
    .filter((l) => (l.clicks || 0) > 0)
    .sort((a, b) => b.clicks - a.clicks);

  return (
    <div className="space-y-6 pb-16 overflow-x-clip">
      {/* 1. Header Toolbar & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1.5">
          <Link
            href="/social-bio-links"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Bio Cards</span>
          </Link>

          <div className="flex items-center gap-3">
            {card?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.avatar_url}
                alt={card.display_name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-black text-sm flex items-center justify-center border border-slate-200 shadow-2xs shrink-0">
                {(card?.display_name || 'C')[0].toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {card?.display_name || 'Bio Card Analytics'}
                </h1>
                {card?.is_primary && (
                  <Badge variant="solid" color="emerald" size="sm" icon={Sparkles}>
                    Primary
                  </Badge>
                )}
                <Badge
                  variant="subtle"
                  color={card?.is_published ? 'emerald' : 'slate'}
                  size="sm"
                >
                  {card?.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                @{card?.username}{card?.slug ? `/${card.slug}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions: Switch Card, Preset Dropdown, Edit Button */}
        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
          {/* Card Switcher Dropdown */}
          {cards.length > 1 && (
            <Dropdown>
              <Dropdown.Trigger asChild>
                <button
                  type="button"
                  aria-label="Switch active bio card"
                  className="inline-flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500/20 cursor-pointer shadow-2xs transition-all select-none"
                >
                  <Layers size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate max-w-[130px]">{card?.display_name || 'Switch Card'}</span>
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content align="right" width="w-56">
                <div className="space-y-0.5 max-h-64 overflow-y-auto">
                  {cards.map((c) => (
                    <Dropdown.Item
                      key={c.id}
                      selected={c.id === cardId}
                      onClick={() => router.push(`/social-bio-links/${c.id}/analytics?preset=${datePreset}`)}
                    >
                      <div className="truncate">
                        <p className="font-bold text-xs truncate">{c.display_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">@{c.username}{c.slug ? `/${c.slug}` : ''}</p>
                      </div>
                    </Dropdown.Item>
                  ))}
                </div>
              </Dropdown.Content>
            </Dropdown>
          )}

          {/* Date Preset Selector Dropdown */}
          <Dropdown>
            <Dropdown.Trigger asChild>
              <button
                type="button"
                aria-label={`Selected period: ${selectedPreset.label}. Click to change date range.`}
                className="inline-flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500/20 cursor-pointer shadow-2xs transition-all select-none"
              >
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span>{selectedPreset.label}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="right" width="w-44">
              <div className="space-y-0.5">
                {presets.map((preset) => (
                  <Dropdown.Item
                    key={preset.id}
                    selected={datePreset === preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                  >
                    {preset.label}
                  </Dropdown.Item>
                ))}
              </div>
            </Dropdown.Content>
          </Dropdown>

          {/* Copy URL button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyUrl}
            className="gap-1.5 shadow-2xs shrink-0 cursor-pointer min-h-[44px] px-3.5"
            title="Copy Public URL"
            aria-label={copied ? `Copied public link for ${card?.display_name || 'bio card'}` : `Copy public link for ${card?.display_name || 'bio card'}`}
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </Button>

          {/* Visit Live Page */}
          {card?.public_url && (
            <a
              href={buildPublicCardUrl(card.public_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
              title="Visit live page in new tab"
              aria-label={`Visit live page for ${card?.display_name || 'bio card'} in new tab`}
            >
              <ExternalLink size={14} />
              <span>Visit Page</span>
            </a>
          )}

          {/* Edit Card Button */}
          <Link
            href={`/social-bio-links/${cardId}/edit`}
            className="inline-flex items-center justify-center font-bold min-h-[44px] px-4 py-2.5 text-xs gap-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/20 border border-transparent hover:-translate-y-px transition-all duration-150 shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={`Edit bio card ${card?.display_name || ''}`}
          >
            <Edit3 size={14} />
            <span>Edit Card</span>
          </Link>
        </div>
      </div>

      {/* Accessible Live Regions for Copy Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {copyAnnouncement?.type === 'polite' ? copyAnnouncement.message : ''}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {copyAnnouncement?.type === 'assertive' ? copyAnnouncement.message : ''}
      </div>

      {error && !card ? (
        <div className="p-12 text-center bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4 max-w-lg mx-auto mt-8">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Card Not Found</h2>
            <p className="text-xs text-slate-500 mt-1">
              {error === 'Link card not found.'
                ? 'The requested bio card does not exist or you do not have permission to view its analytics.'
                : error}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/social-bio-links"
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              <span>Back to Bio Cards</span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(datePreset)}
              className="gap-1.5 min-h-[44px]"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      ) : error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(datePreset)}
            className="flex items-center gap-1 font-bold underline cursor-pointer min-h-[44px] px-2"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <CardAnalyticsSkeleton />
      ) : !card ? null : (
        <>
          {/* 2. KPI Metric Cards Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Card KPIs">
            {/* Card Total Clicks */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Card Total Clicks</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <MousePointerClick size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{totalCardClicks.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">All-time lifetime events</p>
            </div>

            {/* Unique Visitors */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Unique Visitors</span>
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{uniqueVisitors.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Pseudonymized unique IP clicks</p>
            </div>

            {/* Period Clicks */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Period Velocity</span>
                <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{periodClicks.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Clicks in {selectedPreset.label.toLowerCase()}</p>
            </div>

            {/* Active Links */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Active Links</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <LinkIcon size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{activeLinks.length}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Monitored buttons on this card</p>
            </div>
          </section>

          {/* 3. Full-Width Click Velocity Histogram */}
          <section className="p-6 rounded-3xl border border-slate-200/80 bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary-600" />
                  <span>Click Velocity ({selectedPreset.label})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily visitor click distribution recorded specifically on this card.
                </p>
              </div>
              <span className="text-xs font-bold text-primary-700 bg-primary-50 border border-primary-200/60 px-3 py-1 rounded-xl self-start sm:self-auto">
                {periodClicks.toLocaleString()} clicks in {selectedPreset.days} days
              </span>
            </div>

            {dailyClicks.length === 0 || periodClicks === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl">
                <BarChart2 size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">
                  No clicks recorded on this card in the {selectedPreset.label.toLowerCase()} yet
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Share your public card link to start receiving and analyzing live visitor traffic.
                </p>
              </div>
            ) : (() => {
              const totalDays = dailyClicks.length;
              const tickStep =
                totalDays > 45 ? Math.ceil(totalDays / 8) : totalDays > 15 ? Math.ceil(totalDays / 10) : 1;
              const containerGapClass =
                totalDays > 60 ? 'gap-0.5' : totalDays > 30 ? 'gap-1' : 'gap-1.5 sm:gap-2';
              const maxBarWidthClass =
                totalDays > 60 ? 'max-w-[8px]' : totalDays > 30 ? 'max-w-[14px]' : 'max-w-[28px]';

              return (
                <div className="space-y-2 pt-4">
                  {/* Accessible Screen-Reader Tabular Representation */}
                  <div className="sr-only">
                    <table>
                      <caption>Daily clicks on {card?.display_name || 'bio card'} for {selectedPreset.label}</caption>
                      <thead>
                        <tr><th>Date</th><th>Clicks</th></tr>
                      </thead>
                      <tbody>
                        {dailyClicks.map((d) => (
                          <tr key={d.date}><td>{d.date}</td><td>{d.clicks}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Horizontal scroll container on mobile for wide ranges (>30 days) to prevent cramped bars */}
                  <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
                    <div
                      role="region"
                      aria-label={`Daily clicks chart, ${selectedPreset.label}`}
                      className={`h-48 flex items-end justify-between ${containerGapClass} pt-6 px-1 border-b border-slate-100 ${
                        totalDays > 30 ? 'min-w-[600px] sm:min-w-full' : ''
                      }`}
                    >
                      {dailyClicks.map((d, i) => {
                        const isPeak = d.clicks > 0 && d.clicks === maxClicksInDay;
                        const heightPercent =
                          maxClicksInDay > 0 ? Math.max((d.clicks / maxClicksInDay) * 100, 0) : 0;
                        const isTickVisible = i === 0 || i === totalDays - 1 || i % tickStep === 0;
                        const isFirstTwo = i < 2;
                        const isLastTwo = i >= totalDays - 2;
                        const tooltipAlignClass = isFirstTwo
                          ? 'left-0 translate-x-0'
                          : isLastTwo
                          ? 'right-0 translate-x-0'
                          : 'left-1/2 -translate-x-1/2';

                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end relative"
                          >
                            {/* Tooltip on hover or keyboard focus-within */}
                            <div
                              role="tooltip"
                              className={`absolute -top-7 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10 shadow-lg ${tooltipAlignClass}`}
                            >
                              {d.date}: {d.clicks.toLocaleString()} clicks{isPeak ? ' (Peak)' : ''}
                            </div>

                            {/* Bar with solid token styling and keyboard accessibility */}
                            <div className={`w-full ${maxBarWidthClass} flex flex-col justify-end h-full`}>
                              {d.clicks > 0 ? (
                                <button
                                  type="button"
                                  style={{ height: `${heightPercent}%` }}
                                  aria-label={`${d.date}: ${d.clicks.toLocaleString()} clicks${isPeak ? ' (peak day)' : ''}`}
                                  className={`w-full rounded-t-sm sm:rounded-t-md transition-all duration-200 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${
                                    isPeak
                                      ? 'bg-primary-700 shadow-xs ring-1 ring-primary-800/20'
                                      : 'bg-primary-500 hover:bg-primary-600 focus:bg-primary-600'
                                  }`}
                                />
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`${d.date}: 0 clicks`}
                                  className="w-full h-1 bg-slate-100 rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 cursor-pointer"
                                />
                              )}
                            </div>

                            {/* Day Label */}
                            <div className="h-4 flex items-center justify-center">
                              {isTickVisible ? (
                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-700 group-focus-within:text-slate-700 whitespace-nowrap transition-colors">
                                  {d.date.slice(5)}
                                </span>
                              ) : (
                                <span className="text-[9px] text-transparent select-none">·</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* 4. Two-Column Breakdown: Per-Link Performance & Attribution Context */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Per-Link Performance Breakdown */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Per-Link Conversion Performance</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Clicks registered on button destinations on this card</p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {linksWithClicks.length} active {linksWithClicks.length === 1 ? 'link' : 'links'}
                </span>
              </div>

              {linksWithClicks.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs font-bold text-slate-600">No link click activity recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Clicks on individual buttons will populate here with conversion statistics.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {linksWithClicks.map((link, idx) => {
                    const share =
                      totalCardClicks > 0 ? Math.round((link.clicks / totalCardClicks) * 100) : 0;

                    return (
                      <div
                        key={link.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-slate-200/80 text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {link.title}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900">
                              {link.clicks.toLocaleString()} clicks
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 ml-1.5">
                              ({share}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-600 transition-all duration-300"
                            style={{
                              width: link.clicks > 0 ? `${Math.max(share, 2)}%` : '0%',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Account Share & Attribution Context */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Account Traffic Contribution</h2>
                  <p className="text-xs text-slate-500 mt-0.5">How this card performs relative to your full account</p>
                </div>
                <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                  <PieChart size={16} />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Total Account Bio Clicks</span>
                  <span className="text-xs font-black text-slate-900">
                    {totalAccountClicks.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">This Card Contribution</span>
                  <span className="text-xs font-black text-primary-700">
                    {totalCardClicks.toLocaleString()} ({accountSharePercent}% share)
                  </span>
                </div>

                {/* Contribution Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-600 transition-all duration-300"
                    style={{
                      width: totalCardClicks > 0 ? `${Math.max(accountSharePercent, 2)}%` : '0%',
                    }}
                  />
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Theme Preset: <strong className="text-slate-700 capitalize">{card?.theme || 'Sunrise'}</strong></span>
                  <Link
                    href="/social-bio-links/analytics?view=bio"
                    className="font-bold text-primary-600 hover:text-primary-700 underline"
                  >
                    View Overall Analytics →
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default function CardAnalyticsPage({ params }: CardAnalyticsPageProps) {
  const resolvedParams = use(params);
  const cardId = Number(resolvedParams.id);

  return (
    <Suspense fallback={<CardAnalyticsSkeleton />}>
      <CardAnalyticsContent cardId={cardId} />
    </Suspense>
  );
}
