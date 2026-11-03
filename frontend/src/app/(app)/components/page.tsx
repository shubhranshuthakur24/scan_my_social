'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import ModuleNav, { NavTabItem } from '@/components/ui/ModuleNav';
import Dropdown from '@/components/ui/Dropdown';
import ReelCard from '@/components/ui/ReelCard';
import ContentLibraryNav from '@/components/ContentLibraryNav';
import ContentLibraryCard from '@/components/content-library/ContentLibraryCard';
import ContentLibrarySkeleton from '@/components/content-library/ContentLibrarySkeleton';
import AddToProjectModal from '@/components/content-library/AddToProjectModal';
import SaveFilterModal from '@/components/content-library/SaveFilterModal';
import type {
  ContentPostItem,
  ChannelItem,
  WatchlistItem,
  ContentLibraryFilters,
  SavedFilterItem,
} from '@/types/contentLibrary';
import PhoneMockupFrame from '@/components/PhoneMockupFrame';
import {
  Boxes,
  Sparkles,
  Search,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Layers,
  SlidersHorizontal,
  Copy,
  Check,
  Zap,
  ArrowRight,
  Send,
  Eye,
  Trash2,
  Download,
  Share2,
  Calendar,
  MessageSquare,
  TrendingUp,
  User,
  Heart,
  Lock,
  Tv,
  Film,
  Star,
  Flame,
  FolderPlus,
  Plus,
  ExternalLink,
  Play,
  Bookmark,
  Smartphone,
  MessageCircle,
  Globe,
  Sliders,
} from 'lucide-react';

export default function ComponentsShowcasePage() {
  const [activeTab, setActiveTab] = useState<
    'all' | 'content-library' | 'buttons' | 'inputs' | 'badges' | 'cards' | 'modals' | 'navigation' | 'mockups'
  >('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Button interactive states
  const [isBtnLoading, setIsBtnLoading] = useState(false);
  const [isBtnDisabled, setIsBtnDisabled] = useState(false);

  // Input interactive states
  const [demoInputValue, setDemoInputValue] = useState('viralyzer-ai-creator');
  const [demoPasswordValue, setDemoPasswordValue] = useState('supersecret123');
  const [demoToggleState, setDemoToggleState] = useState(true);
  const [demoCheckboxState, setDemoCheckboxState] = useState(true);
  const [demoFrequency, setDemoFrequency] = useState('Every 6 Hours (Fast Track)');

  // Modal demo
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Content Library Demos State
  const [isAddToProjectOpen, setIsAddToProjectOpen] = useState(false);
  const [isSaveFilterOpen, setIsSaveFilterOpen] = useState(false);
  const [activeProjectPost, setActiveProjectPost] = useState<ContentPostItem | null>(null);
  const [showSkeletonDemo, setShowSkeletonDemo] = useState(false);

  // PhoneMockupFrame Interactive Demo State
  const [mockupTime, setMockupTime] = useState('9:41');
  const [mockupShowStatusBar, setMockupShowStatusBar] = useState(true);
  const [mockupShowDynamicIsland, setMockupShowDynamicIsland] = useState(true);
  const [mockupShowHomeIndicator, setMockupShowHomeIndicator] = useState(true);
  const [mockupScreenMode, setMockupScreenMode] = useState<'reel' | 'dm' | 'biolink'>('reel');

  // Sample Content Library Data
  const sampleContentPosts: ContentPostItem[] = [
    {
      id: 101,
      channel_id: 1,
      platform: 'instagram',
      type: 'reel',
      caption: '5 AI agent workflows clients are happily paying $2,500 for in 2026. Full n8n JSON schema breakdown...',
      owner_username: 'alexgrowth.ai',
      url: 'https://instagram.com',
      video_url: null,
      video_play_count: 482000,
      video_view_count: 482000,
      likes_count: 38400,
      comments_count: 2940,
      engagement_rate: 0.086,
      post_timestamp: '2026-09-15T12:00:00Z',
      breakout_multiplier: 4.2,
      breakout_label: 'Viral Outlier',
      display_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      projects: [{ id: 1, name: 'AI Viral Hooks' }],
    },
    {
      id: 102,
      channel_id: 2,
      platform: 'instagram',
      type: 'reel',
      caption: 'Why 90% of creators fail hook retention in the first 2 seconds. The 2.5-second visual rule explained...',
      owner_username: 'contentcoach',
      url: 'https://instagram.com',
      video_url: null,
      video_play_count: 215000,
      video_view_count: 215000,
      likes_count: 19800,
      comments_count: 1420,
      engagement_rate: 0.098,
      post_timestamp: '2026-09-12T10:00:00Z',
      breakout_multiplier: 2.8,
      breakout_label: 'Breakout',
      display_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
      projects: [],
    },
    {
      id: 103,
      channel_id: 3,
      platform: 'instagram',
      type: 'reel',
      caption: 'Stop editing Reels manually. How we use headless workers and AI prompts to scale to 10 posts a day...',
      owner_username: 'automationmastery',
      url: 'https://instagram.com',
      video_url: null,
      video_play_count: 142000,
      video_view_count: 142000,
      likes_count: 12400,
      comments_count: 890,
      engagement_rate: 0.093,
      post_timestamp: '2026-09-08T15:00:00Z',
      breakout_multiplier: null,
      breakout_label: null,
      display_url: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=600&auto=format&fit=crop&q=80',
      projects: [],
    },
  ];

  const sampleChannels: ChannelItem[] = [
    {
      id: 1,
      handle: 'coach.ravikant',
      name: 'Ravikant Rathor',
      platform: 'instagram',
      followers_count: 185000,
      posts_count: 42,
      is_verified: true,
      apify_profile_run_status: 'COMPLETED',
      profile_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 2,
      handle: 'creatorautomation',
      name: 'Creator Automation Systems',
      platform: 'instagram',
      followers_count: 94200,
      posts_count: 28,
      is_verified: false,
      apify_profile_run_status: 'RUNNING',
      profile_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const [demoWatchlists, setDemoWatchlists] = useState<WatchlistItem[]>([
    {
      id: 1,
      name: 'AI & Automation Creators',
      description: 'Top solopreneurs and AI automation engineers posting daily workflows.',
      channels_count: 12,
      is_favorite: true,
    },
    {
      id: 2,
      name: 'B2B SaaS Growth Lead Gen',
      description: 'Founders using short-form video to drive organic demo bookings.',
      channels_count: 8,
      is_favorite: false,
    },
  ]);

  // Toast demo
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copySnippet = (key: string, snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedKey(key);
    triggerToast('Code snippet copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const categories = [
    { id: 'all', name: 'All Components', icon: Boxes },
    { id: 'content-library', name: 'Content Library', icon: Film },
    { id: 'buttons', name: 'Buttons & Actions', icon: Zap },
    { id: 'inputs', name: 'Inputs & Forms', icon: SlidersHorizontal },
    { id: 'badges', name: 'Badges & Indicators', icon: Sparkles },
    { id: 'cards', name: 'Cards & Containers', icon: Layers },
    { id: 'modals', name: 'Overlays & Modals', icon: Eye },
    { id: 'navigation', name: 'Navigation & Tabs', icon: Layers },
    { id: 'mockups', name: 'Device Mockups', icon: Smartphone },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl animate-in slide-in-from-bottom-5 border border-slate-800">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-xs font-bold">{toastMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-400/30">
                <Boxes size={12} /> Design System & UI Kit
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
                v1.0 Production
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Reusable Component Library
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
              Interactive playground and living style guide for all buttons, form controls, badges, cards, feedback alerts, and modal dialogs used across Viralyzer.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="gradient"
              size="md"
              icon={Sparkles}
              onClick={() => triggerToast('Design token specs synchronized!')}
            >
              Sync Tokens
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={Download}
              onClick={() => copySnippet('all-tokens', '/* Viralyzer Global Design Tokens */')}
            >
              Export Tokens
            </Button>
          </div>
        </div>

        {/* Decorative Background Glows */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl" />
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-150 shrink-0 cursor-pointer ${isActive
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <Icon size={15} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION: CONTENT LIBRARY & COMPETITOR INTELLIGENCE */}
      {(activeTab === 'all' || activeTab === 'content-library') && (
        <div className="space-y-8 rounded-3xl bg-white p-6 md:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Film className="text-primary-600" size={18} /> Content Library & Viral Intelligence Suite
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Core UI components powering competitor reel discovery, creator channel indexing, watchlist curation, and research project boards.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                icon={Bookmark}
                onClick={() => setIsSaveFilterOpen(true)}
              >
                Save Filter Modal
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={FolderPlus}
                onClick={() => {
                  setActiveProjectPost(sampleContentPosts[0]);
                  setIsAddToProjectOpen(true);
                }}
              >
                Add to Board Modal
              </Button>
            </div>
          </div>

          {/* 1. ContentLibraryNav (Notched Pill Nav) */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">1. ContentLibraryNav (Fluid Notched Tab Navigation)</p>
              <p className="text-[11px] text-slate-500">Sliding tab indicator with concave flares, smooth SVG tangent curves, and module-scoped memory.</p>
            </div>
            <ContentLibraryNav />
          </div>

          {/* 2. ContentLibraryCard (Outliers, Breakouts & Standard Posts) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">2. ContentLibraryCard (aspect-[4/5] Portrait Cards)</p>
                <p className="text-[11px] text-slate-500">Features outlier multiplier badges, engagement velocity, hover play button, and board bookmarking.</p>
              </div>
              <Badge variant="subtle" color="slate" size="sm">
                3 Variants Shown
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {sampleContentPosts.map((post) => (
                <ContentLibraryCard
                  key={post.id}
                  post={post}
                  onAddToProject={(p) => {
                    setActiveProjectPost(p);
                    setIsAddToProjectOpen(true);
                  }}
                />
              ))}
            </div>
          </div>

          {/* 3. Competitor Channels Cards */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">3. Competitor Channel Tracking Cards</p>
                <p className="text-[11px] text-slate-500">Displays tracked creator profiles, follower metrics, background scraping sync status, and direct reel inspection.</p>
              </div>
              <Badge variant="subtle" color="slate" size="sm">
                2 Creators Demo
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sampleChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-primary-600 p-0.5 shadow-2xs">
                          <img
                            src={channel.profile_image_url || '/images/logo.webp'}
                            alt={channel.name}
                            className="w-full h-full object-cover rounded-2xl bg-white"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-900 truncate">@{channel.handle}</h4>
                          {channel.is_verified && (
                            <CheckCircle2 size={13} className="text-blue-500 fill-blue-50 shrink-0" />
                          )}
                        </div>
                        <a
                          href={`https://instagram.com/${channel.handle}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-primary-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <span>{channel.name}</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>

                    <Badge
                      variant="subtle"
                      color={channel.apify_profile_run_status === 'COMPLETED' ? 'emerald' : 'amber'}
                      dot
                      pulse={channel.apify_profile_run_status !== 'COMPLETED'}
                      size="sm"
                    >
                      {channel.apify_profile_run_status === 'COMPLETED' ? 'Active' : 'Syncing'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Followers</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">{channel.followers_count.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indexed Posts</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">{channel.posts_count}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => triggerToast(`Navigating to reels for @${channel.handle}`)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Outliers</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerToast(`Untrack requested for @${channel.handle}`)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Untrack channel"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Watchlist Curation Cards */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">4. Monitored Watchlist Cards</p>
                <p className="text-[11px] text-slate-500">Grouping competitor channels into focused niche feeds with one-click favorite toggling.</p>
              </div>
              <Badge variant="subtle" color="slate" size="sm">
                Interactive Star
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {demoWatchlists.map((wl) => (
                <div
                  key={wl.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 border border-primary-200/60 flex items-center justify-center shrink-0">
                        <Film size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{wl.name}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{wl.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDemoWatchlists((prev) =>
                          prev.map((item) =>
                            item.id === wl.id ? { ...item, is_favorite: !item.is_favorite } : item
                          )
                        );
                        triggerToast(
                          wl.is_favorite ? 'Removed from favorites' : 'Marked watchlist as favorite!'
                        );
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
                      title={wl.is_favorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star
                        size={16}
                        className={wl.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-slate-500">
                      <strong className="text-slate-900 font-bold">{wl.channels_count}</strong> tracked creators
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerToast(`Filtering video feed by watchlist: ${wl.name}`)}
                      className="font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Filter Feed</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. ContentLibrarySkeleton (Loading State Preview) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">5. ContentLibrarySkeleton (Responsive Shimmer Grid)</p>
                <p className="text-[11px] text-slate-500">Full-width pulse loading skeleton matching the 4:5 portrait card geometry during async data fetching.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSkeletonDemo(!showSkeletonDemo)}
              >
                {showSkeletonDemo ? 'Hide Skeleton Preview' : 'Show Skeleton Preview'}
              </Button>
            </div>

            {showSkeletonDemo && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 animate-in fade-in duration-200">
                <ContentLibrarySkeleton />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: BUTTONS & ACTIONS */}
      {(activeTab === 'all' || activeTab === 'buttons') && (
        <div className="space-y-5 rounded-3xl bg-white p-6 md:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Zap className="text-primary-600" size={18} /> Buttons & Action Variants
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Standard interactive buttons with preset visual styles, states, and icon configurations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBtnLoading}
                  onChange={(e) => setIsBtnLoading(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-purple-500"
                />
                Toggle Loading
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBtnDisabled}
                  onChange={(e) => setIsBtnDisabled(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-purple-500"
                />
                Toggle Disabled
              </label>
            </div>
          </div>

          {/* Variants Grid */}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">1. Visual Variants</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="gradient"
                loading={isBtnLoading}
                disabled={isBtnDisabled}
                icon={Sparkles}
                onClick={() => triggerToast('Clicked Gradient Button')}
              >
                Gradient Action
              </Button>

              <Button
                variant="primary"
                loading={isBtnLoading}
                disabled={isBtnDisabled}
                icon={Send}
                onClick={() => triggerToast('Clicked Primary Button')}
              >
                Primary Brand
              </Button>

              <Button
                variant="secondary"
                loading={isBtnLoading}
                disabled={isBtnDisabled}
                icon={Copy}
                onClick={() => triggerToast('Clicked Secondary Button')}
              >
                Secondary
              </Button>

              <Button
                variant="outline"
                loading={isBtnLoading}
                disabled={isBtnDisabled}
                icon={Share2}
                onClick={() => triggerToast('Clicked Outline Button')}
              >
                Outline
              </Button>

              <Button
                variant="ghost"
                loading={isBtnLoading}
                disabled={isBtnDisabled}
                icon={ArrowRight}
                iconPosition="right"
                onClick={() => triggerToast('Clicked Ghost Button')}
              >
                Ghost Action
              </Button>

              <Button
                variant="danger"
                loading={isBtnLoading}
                disabled={isBtnDisabled}
                icon={Trash2}
                onClick={() => triggerToast('Clicked Danger Button')}
              >
                Danger
              </Button>
            </div>
          </div>

          {/* Sizes Grid */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">2. Size Scale</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs" variant="primary">Extra Small (xs)</Button>
              <Button size="sm" variant="primary">Small (sm)</Button>
              <Button size="md" variant="primary">Medium (md - default)</Button>
              <Button size="lg" variant="primary">Large (lg)</Button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: INPUTS & FORM CONTROLS */}
      {(activeTab === 'all' || activeTab === 'inputs') && (
        <div className="space-y-5 rounded-3xl bg-white p-6 md:p-8 border border-slate-200/80 shadow-xs">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="text-primary-600" size={18} /> Inputs & Form Controls
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              High-fidelity inputs, search boxes, password toggles, switches, and validation states.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Standard Text Input with Icon */}
            <Input
              label="Channel Handle or Username"
              requiredIndicator
              leftIcon={User}
              clearable
              value={demoInputValue}
              onChange={(e) => setDemoInputValue(e.target.value)}
              onClear={() => setDemoInputValue('')}
              helperText="Enter Instagram handle without @"
            />

            {/* Password with Eye Toggle */}
            <Input
              label="Account Password / API Token"
              type="password"
              leftIcon={Lock}
              value={demoPasswordValue}
              onChange={(e) => setDemoPasswordValue(e.target.value)}
              helperText="Click eye icon to reveal secrets"
            />

            {/* Error State */}
            <Input
              label="Webhook URL"
              leftIcon={AlertTriangle}
              defaultValue="invalid-url-schema"
              error="Please provide a valid https:// webhook endpoint"
            />
          </div>

          {/* Toggles, Checkboxes & Select */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Switch Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">AutoDM Automation</p>
                <p className="text-[11px] text-slate-400">Trigger on new post comment</p>
              </div>
              <button
                type="button"
                onClick={() => setDemoToggleState(!demoToggleState)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${demoToggleState ? 'bg-purple-600' : 'bg-slate-300'
                  }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${demoToggleState ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            {/* Custom Checkbox */}
            <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
              <input
                type="checkbox"
                checked={demoCheckboxState}
                onChange={(e) => setDemoCheckboxState(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-purple-500 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">Daily Digest Email</p>
                <p className="text-[11px] text-slate-400">Receive competitor alerts</p>
              </div>
            </label>

            {/* Reusable Dropdown Select */}
            <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <label className="text-xs font-bold text-slate-800">Refresh Frequency</label>
              <Dropdown className="w-full">
                <Dropdown.Trigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-800 outline-none hover:bg-slate-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all cursor-pointer shadow-2xs text-left"
                  >
                    <span>{demoFrequency}</span>
                    <ChevronDown size={14} className="text-slate-400 shrink-0" />
                  </button>
                </Dropdown.Trigger>
                <Dropdown.Content align="left" width="w-full">
                  {[
                    'Every 6 Hours (Fast Track)',
                    'Every 12 Hours',
                    'Daily at 08:00 AM',
                  ].map((option) => (
                    <Dropdown.Item
                      key={option}
                      selected={demoFrequency === option}
                      onClick={() => setDemoFrequency(option)}
                    >
                      {option}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Content>
              </Dropdown>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: BADGES & STATUS INDICATORS */}
      {(activeTab === 'all' || activeTab === 'badges') && (
        <div className="space-y-5 rounded-3xl bg-white p-6 md:p-8 border border-slate-200/80 shadow-xs">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="text-primary-600" size={18} /> Badges, Pills & Indicators
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Status tags with subtle borders, pulsing live signals, solid variants, and metric labels.
            </p>
          </div>

          {/* Status with Pulsing Dots */}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">1. Live Status Indicators (Pulsing)</p>
            <div className="flex flex-wrap items-center gap-3">
              <Badge color="emerald" dot pulse>Scraper Active</Badge>
              <Badge color="purple" dot pulse>AI Generating</Badge>
              <Badge color="amber" dot pulse>Sync Pending</Badge>
              <Badge color="rose" dot pulse>Scrape Failed</Badge>
              <Badge color="blue" dot pulse>Worker Processing</Badge>
              <Badge color="slate" dot>Offline</Badge>
            </div>
          </div>

          {/* Subtle vs Solid vs Outline */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">2. Variant Styles</p>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="subtle" color="purple" icon={Sparkles}>Subtle Purple</Badge>
              <Badge variant="solid" color="purple" icon={Sparkles}>Solid Purple</Badge>
              <Badge variant="outline" color="purple" icon={Sparkles}>Outline Purple</Badge>
              <Badge variant="subtle" color="emerald" icon={CheckCircle2}>Verified Partner</Badge>
              <Badge variant="solid" color="emerald" icon={CheckCircle2}>Active Pro</Badge>
              <Badge variant="subtle" color="rose" icon={Heart}>12.4k Likes</Badge>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: CARDS & CONTAINERS */}
      {(activeTab === 'all' || activeTab === 'cards') && (
        <div className="space-y-5 rounded-3xl bg-white p-6 md:p-8 border border-slate-200/80 shadow-xs">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="text-primary-600" size={18} /> Cards, KPI Tiles & Alert Callouts
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Data display surfaces, KPI stat cards, glassmorphic containers, and informative banners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* KPI Metric Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-purple-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Reach</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <TrendingUp size={11} /> +24.8%
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">1,842,900</p>
              <p className="mt-1 text-xs text-slate-400">Compared to last 30 days</p>
            </div>

            {/* Glassmorphic Gradient Card */}
            <div className="rounded-2xl bg-linear-to-br from-purple-600 to-indigo-700 p-5 text-white shadow-md shadow-purple-500/20">
              <div className="flex items-center justify-between">
                <Badge variant="solid" color="purple" size="sm">Pro Plan</Badge>
                <Sparkles size={16} className="text-purple-200" />
              </div>
              <p className="mt-3 text-lg font-black">AI Script Intelligence</p>
              <p className="mt-1 text-xs text-purple-100">Unlock viral reel framework breakdowns and automatic hook generators.</p>
            </div>

            {/* Spotlight Slate Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-lg">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Apify Worker Pool</span>
              <p className="mt-2 text-2xl font-black text-emerald-400">99.8% Uptime</p>
              <p className="mt-1 text-xs text-slate-400">8 active background scraping clusters</p>
            </div>
          </div>

          {/* Standard PageHeader Component Demo */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Standard PageHeader Component</p>
            <PageHeader
              title="Instagram Content Scheduler"
              description="Plan, schedule, and auto-publish Instagram Reels, Carousels, and Posts ahead of time."
              icon={Calendar}
              badge={<Badge color="purple" dot pulse size="sm">Active Pro</Badge>}
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => triggerToast('PageHeader Action Triggered!')}
                >
                  Schedule Post
                </Button>
              }
            />
          </div>

          {/* Vertical ReelCard (aspect-[9/16], 4-in-a-row) */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Vertical ReelCard (aspect-[9/16], 4-in-a-Row)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              <ReelCard
                thumbnail="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80"
                caption="5 AI prompts to automate your short-form video scripts in under 60 seconds..."
                views={185000}
                likes={14200}
                comments={640}
                shares={3100}
                outlierMultiplier={4.2}
                publishedAt="3 days ago"
                instagramUrl="https://instagram.com"
                hasAutodm={true}
                isAutodmPaused={false}
                onViewAutodm={() => triggerToast('Opening active AutoDM workflow')}
              />
              <ReelCard
                thumbnail="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80"
                caption="The Viral Hook Architecture: Why 90% of viewers scroll in the first 2 seconds"
                views={94000}
                likes={8900}
                comments={420}
                shares={2450}
                outlierMultiplier={2.8}
                publishedAt="1 week ago"
                instagramUrl="https://instagram.com"
                hasAutodm={false}
                onSetupAutodm={() => triggerToast('Configuring new AutoDM for this reel')}
              />
              <ReelCard
                thumbnail="https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=400&auto=format&fit=crop&q=80"
                caption="Stop editing your Reels manually. Here is my automated workflow for 2026"
                views={72000}
                likes={6100}
                comments={310}
                shares={1200}
                publishedAt="2 weeks ago"
                instagramUrl="https://instagram.com"
                hasAutodm={false}
                onSetupAutodm={() => triggerToast('Configuring new AutoDM for this reel')}
              />
              <ReelCard
                thumbnail="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80"
                caption="How we generated $24,000 in digital course sales using Instagram AutoDM..."
                views={142000}
                likes={11400}
                comments={980}
                shares={4100}
                outlierMultiplier={3.5}
                publishedAt="3 weeks ago"
                instagramUrl="https://instagram.com"
                hasAutodm={true}
                isAutodmPaused={true}
                onViewAutodm={() => triggerToast('Opening active AutoDM workflow')}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: MODALS & OVERLAYS */}
      {(activeTab === 'all' || activeTab === 'modals') && (
        <div className="space-y-5 rounded-3xl bg-white p-6 md:p-8 border border-slate-200/80 shadow-xs">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Eye className="text-primary-600" size={18} /> Modals, Toasts & Skeleton Shimmers
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Accessible overlay dialogs with backdrop blur, keyboard dismissal, and content loading skeletons.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interactive Modal Trigger */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Modal Dialog</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Includes backdrop blur, transition animations, header title, body slot, footer actions, and ESC key listener.
                </p>
              </div>

              <Button
                variant="primary"
                icon={Eye}
                onClick={() => setIsModalOpen(true)}
              >
                Open Demo Modal
              </Button>
            </div>

            {/* Skeleton Shimmer Preview */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Skeleton Shimmers</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Graceful placeholders during async fetching to prevent layout shifts.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-1/3 bg-slate-200 rounded animate-pulse" />
                    <div className="h-2.5 w-1/2 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-16 w-full bg-slate-200 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: NAVIGATION & TABS */}
      {(activeTab === 'all' || activeTab === 'navigation') && (
        <div className="space-y-5 rounded-3xl bg-white p-6 md:p-8 border border-slate-200/80 shadow-xs">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="text-primary-600" size={18} /> ModuleNav (Pill Tab Strip)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Reusable sub-navigation bar powering both the Content Library Suite and Instagram Growth Suite with active route synchronization.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Live Component Preview</p>

            {/* Live ModuleNav Demo */}
            <ModuleNav
              tabs={[
                { name: 'Scraped Reels & Media', href: '/videos', icon: Film, exact: true },
                { name: 'Channels & Competitors', href: '/channels', icon: Tv },
                { name: 'Monitored Watchlists', href: '/watchlists', icon: Eye },
              ]}
              className="border-none pb-0 mb-0"
            />

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800">Standard Usage Pattern:</p>
              <pre className="p-3 bg-slate-900 text-purple-300 rounded-xl font-mono text-[11px] overflow-x-auto">
                {`<ModuleNav
  tabs={[
    { name: 'My Profile', href: '/instagram/profile', icon: Grid2x2, exact: true },
    { name: 'Content Scheduler', href: '/instagram/calendar', icon: CalendarRange },
    { name: 'AutoDM', href: '/instagram/autodm', icon: Send },
    { name: 'Analytics', href: '/instagram/analytics', icon: BarChart3 },
  ]}
/>`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: DEVICE MOCKUPS (PhoneMockupFrame) */}
      {(activeTab === 'all' || activeTab === 'mockups') && (
        <div className="space-y-6 rounded-3xl bg-white p-6 md:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Smartphone className="text-primary-600" size={18} /> PhoneMockupFrame (iOS Simulator)
                </h2>
                <Badge variant="subtle" color="purple" size="sm">Physical Bezel</Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Precision iPhone frame with physical side buttons, dynamic island, status bar, and home indicator. Used in Content Scheduler and AutoDM previewers.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={copiedKey === 'mockup-code' ? Check : Copy}
              onClick={() =>
                copySnippet(
                  'mockup-code',
                  `<PhoneMockupFrame\n  time="${mockupTime}"\n  showStatusBar={${mockupShowStatusBar}}\n  showDynamicIsland={${mockupShowDynamicIsland}}\n  showHomeIndicator={${mockupShowHomeIndicator}}\n>\n  <div className="p-4 text-white">\n    Screen Content\n  </div>\n</PhoneMockupFrame>`
                )
              }
            >
              {copiedKey === 'mockup-code' ? 'Copied' : 'Copy JSX'}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Controls & Configuration */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-6">
              {/* Scene Switcher */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">1. Screen Scene Preset</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMockupScreenMode('reel')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      mockupScreenMode === 'reel'
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Film size={14} />
                    <span>Instagram Reel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMockupScreenMode('dm')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      mockupScreenMode === 'dm'
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Send size={14} />
                    <span>AutoDM Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMockupScreenMode('biolink')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      mockupScreenMode === 'biolink'
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Globe size={14} />
                    <span>Social Bio Links</span>
                  </button>
                </div>
              </div>

              {/* Hardware Frame Toggles */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-2xs">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">2. Frame Hardware Controls</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center justify-between sm:justify-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={mockupShowStatusBar}
                      onChange={(e) => setMockupShowStatusBar(e.target.checked)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Status Bar</span>
                  </label>

                  <label className="flex items-center justify-between sm:justify-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={mockupShowDynamicIsland}
                      onChange={(e) => setMockupShowDynamicIsland(e.target.checked)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Dynamic Island</span>
                  </label>

                  <label className="flex items-center justify-between sm:justify-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={mockupShowHomeIndicator}
                      onChange={(e) => setMockupShowHomeIndicator(e.target.checked)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Home Indicator</span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-600 shrink-0">Status Bar Clock Time:</span>
                  <div className="flex items-center gap-2">
                    {['9:41', '12:00', '16:20'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMockupTime(preset)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                          mockupTime === preset
                            ? 'bg-primary-50 border-primary-300 text-primary-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    <input
                      type="text"
                      value={mockupTime}
                      onChange={(e) => setMockupTime(e.target.value)}
                      placeholder="e.g. 9:41"
                      className="w-20 px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Props Specification Table */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">3. Component API Props</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold">
                        <th className="pb-2">Prop</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Default</th>
                        <th className="pb-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="py-2 font-mono font-bold text-primary-700">children</td>
                        <td className="py-2 text-slate-500 font-mono text-[11px]">ReactNode</td>
                        <td className="py-2 text-slate-400">required</td>
                        <td className="py-2">Interactive screen content rendered in 300x620px viewport</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-bold text-primary-700">time</td>
                        <td className="py-2 text-slate-500 font-mono text-[11px]">string</td>
                        <td className="py-2 font-mono text-[11px]">'9:41'</td>
                        <td className="py-2">iOS status bar clock label</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-bold text-primary-700">showStatusBar</td>
                        <td className="py-2 text-slate-500 font-mono text-[11px]">boolean</td>
                        <td className="py-2 font-mono text-[11px]">true</td>
                        <td className="py-2">Renders iOS clock, Signal, Wi-Fi, and Battery indicators</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-bold text-primary-700">showDynamicIsland</td>
                        <td className="py-2 text-slate-500 font-mono text-[11px]">boolean</td>
                        <td className="py-2 font-mono text-[11px]">true</td>
                        <td className="py-2">Pill notch sensor cutout centered at top of viewport</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-bold text-primary-700">showHomeIndicator</td>
                        <td className="py-2 text-slate-500 font-mono text-[11px]">boolean</td>
                        <td className="py-2 font-mono text-[11px]">true</td>
                        <td className="py-2">Bottom gesture pill swipe line</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-bold text-primary-700">className</td>
                        <td className="py-2 text-slate-500 font-mono text-[11px]">string</td>
                        <td className="py-2 font-mono text-[11px]">''</td>
                        <td className="py-2">Outer wrapper container class override</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-bold text-primary-700">screenClassName</td>
                        <td className="py-2 text-slate-500 font-mono text-[11px]">string</td>
                        <td className="py-2 font-mono text-[11px]">''</td>
                        <td className="py-2">Inner screen viewport container class override</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Live Phone Mockup Frame */}
            <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-100/90 to-slate-200/50 border border-slate-200/60">
              <div className="mb-4 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 text-white px-3 py-1 text-[11px] font-bold shadow-xs">
                  <Smartphone size={12} className="text-primary-400" />
                  Live Preview: {mockupScreenMode === 'reel' ? 'Instagram Reel' : mockupScreenMode === 'dm' ? 'AutoDM Chat' : 'Social Bio Links'}
                </span>
              </div>

              <PhoneMockupFrame
                time={mockupTime}
                showStatusBar={mockupShowStatusBar}
                showDynamicIsland={mockupShowDynamicIsland}
                showHomeIndicator={mockupShowHomeIndicator}
              >
                {/* 1. INSTAGRAM REEL PREVIEW */}
                {mockupScreenMode === 'reel' && (
                  <div className="relative flex-1 overflow-hidden flex flex-col justify-between p-3.5 pb-6">
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"
                      alt="Reel Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85 pointer-events-none" />

                    <div className="relative z-10 flex items-center justify-between text-white pt-2 text-xs font-bold">
                      <span className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[10px]">Reels</span>
                      <Sparkles size={14} className="text-amber-400" />
                    </div>

                    <div className="relative z-10 flex items-end justify-between gap-3">
                      <div className="space-y-2 max-w-[200px] text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-linear-to-tr from-amber-400 via-rose-500 to-purple-600 p-[1.5px]">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] font-black">
                              A
                            </div>
                          </div>
                          <span className="text-xs font-black tracking-tight drop-shadow-xs">alexgrowth.ai</span>
                          <span className="rounded-full bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold">Follow</span>
                        </div>
                        <p className="text-[11px] leading-tight text-white/95 line-clamp-2 drop-shadow-xs">
                          5 AI agent workflows clients are paying $2,500/mo for in 2026 🚀 Comment "BLUEPRINT" below!
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/80 bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-full w-fit">
                          <Film size={10} />
                          <span className="truncate max-w-[130px]">alexgrowth.ai • Original audio</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-3 text-white">
                        <button type="button" className="flex flex-col items-center gap-0.5">
                          <Heart size={20} className="fill-rose-500 text-rose-500" />
                          <span className="text-[10px] font-bold">14.2K</span>
                        </button>
                        <button type="button" className="flex flex-col items-center gap-0.5">
                          <MessageCircle size={20} />
                          <span className="text-[10px] font-bold">482</span>
                        </button>
                        <button type="button" className="flex flex-col items-center gap-0.5">
                          <Share2 size={20} />
                          <span className="text-[10px] font-bold">1.2K</span>
                        </button>
                        <button type="button" className="flex flex-col items-center gap-0.5">
                          <Bookmark size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. AUTODM DIRECT MESSAGE CHAT */}
                {mockupScreenMode === 'dm' && (
                  <div className="flex-1 flex flex-col justify-between bg-slate-950 p-3 pt-2 text-slate-100">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-[10px] font-black text-white">
                          A
                        </div>
                        <div>
                          <p className="text-xs font-black leading-none">alexgrowth.ai</p>
                          <p className="text-[9px] text-emerald-400 font-bold mt-0.5">AutoDM Active</p>
                        </div>
                      </div>
                      <Badge variant="subtle" color="purple" size="sm">Bot</Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto py-3 space-y-3">
                      <div className="flex justify-end">
                        <div className="rounded-2xl rounded-br-sm bg-primary-600 px-3 py-2 text-[11px] text-white max-w-[210px] shadow-xs">
                          BLUEPRINT
                        </div>
                      </div>

                      <div className="flex justify-start">
                        <div className="space-y-2 rounded-2xl rounded-bl-sm bg-slate-900 border border-slate-800 p-3 text-[11px] text-slate-200 max-w-[230px] shadow-xs">
                          <p>Hey there! Here is your instant download link to the 2026 AI Agent blueprint breakdown:</p>
                          <div className="rounded-xl bg-slate-800/90 p-2.5 border border-slate-700/60 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">PDF Guide & Schema</span>
                            <p className="text-xs font-black text-white">Viral AI Agent Funnels</p>
                            <a
                              href="#mockup"
                              onClick={(e) => {
                                e.preventDefault();
                                triggerToast('AutoDM CTA link clicked in simulator!');
                              }}
                              className="mt-1 flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-primary-700 transition-colors"
                            >
                              <span>Download PDF</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 text-[11px] text-slate-400">
                        Message...
                      </div>
                      <button type="button" className="p-1.5 rounded-full bg-primary-600 text-white">
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. SOCIAL BIO LINKS PREVIEW */}
                {mockupScreenMode === 'biolink' && (
                  <div className="flex-1 flex flex-col items-center bg-linear-to-b from-slate-900 via-indigo-950 to-slate-950 p-4 text-white overflow-y-auto scrollbar-none">
                    <div className="w-16 h-16 rounded-full p-[2px] bg-linear-to-tr from-primary-400 to-pink-500 mb-2 mt-1">
                      <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-sm font-black">
                        AR
                      </div>
                    </div>
                    <h3 className="text-sm font-black">Alex Rivera</h3>
                    <p className="text-[10px] font-semibold text-primary-300">@alexgrowth.ai</p>
                    <p className="text-[11px] text-slate-300 text-center mt-1 leading-snug max-w-[220px]">
                      Building viral AI workflows & growth engines for creators ⚡ 500k+ community
                    </p>

                    <div className="w-full space-y-2 mt-4">
                      {[
                        { title: '🚀 AI Creator Blueprint OS', subtitle: 'Step-by-step systems' },
                        { title: '📹 Viral Hook Breakdown Video', subtitle: 'Free 25 min masterclass' },
                        { title: '📬 Weekly Growth Newsletter', subtitle: 'Join 42,000+ founders' },
                        { title: '💬 Private Discord Community', subtitle: 'Collab & script feedback' },
                      ].map((link, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => triggerToast(`Clicked: ${link.title}`)}
                          className="w-full p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-all text-left flex items-center justify-between group cursor-pointer"
                        >
                          <div>
                            <p className="text-[11px] font-bold text-white group-hover:text-primary-300 transition-colors">
                              {link.title}
                            </p>
                            <p className="text-[9px] text-slate-300">{link.subtitle}</p>
                          </div>
                          <ArrowRight size={12} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </PhoneMockupFrame>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Modal Instance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Competitor Channel"
        description="Enter the public Instagram handle to start background reel scraping."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              size="sm"
              icon={Sparkles}
              onClick={() => {
                setIsModalOpen(false);
                triggerToast('Competitor channel queued for scraping!');
              }}
            >
              Start Scraping
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Instagram Username"
            placeholder="e.g. hubabori"
            leftIcon={Tv}
            requiredIndicator
          />
          <div className="rounded-xl bg-purple-50 p-3 text-xs text-purple-700 border border-purple-100 flex items-start gap-2">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>Our Apify actor will extract the latest 50 reels and analyze their viral hooks within 60 seconds.</p>
          </div>
        </div>
      </Modal>

      {/* Content Library Modals Demo */}
      <AddToProjectModal
        isOpen={isAddToProjectOpen}
        onClose={() => setIsAddToProjectOpen(false)}
        post={activeProjectPost}
        onSuccess={() => {
          setIsAddToProjectOpen(false);
          triggerToast('Video successfully added to board!');
        }}
      />

      <SaveFilterModal
        isOpen={isSaveFilterOpen}
        onClose={() => setIsSaveFilterOpen(false)}
        filters={{
          outlier_min: 2.0,
          platform: ['instagram'],
          sort_by: 'outlier_score',
        }}
        onSaved={(saved) => {
          setIsSaveFilterOpen(false);
          triggerToast(`Saved filter preset: "${saved.name}"`);
        }}
      />
    </div>
  );
}
