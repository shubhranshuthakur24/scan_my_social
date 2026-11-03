'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BioCard,
  BioThemeSettings,
  BioThemePreset,
} from '@/lib/api/socialBioLinksService';
import { useSocialBioStore } from '@/lib/store/useSocialBioStore';
import BioDeviceMockup from '@/components/social-bio-links/preview/BioDeviceMockup';
import BioTemplatePicker from '@/components/social-bio-links/management/BioTemplatePicker';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Sparkles,
  Palette,
  Check,
  AlertCircle,
  Globe,
  Layers,
  HelpCircle,
} from 'lucide-react';

const DEFAULT_THEME_SETTINGS: BioThemeSettings = {
  background_color: '#f8fafc',
  text_color: '#0f172a',
  button_background_color: '#ffffff',
  button_text_color: '#0f172a',
  button_style: 'rounded',
};

export default function CreateBioCardPage() {
  const router = useRouter();
  const createCard = useSocialBioStore((s) => s.createCard);
  const fetchDashboard = useSocialBioStore((s) => s.fetchDashboard);
  const storeThemePresets = useSocialBioStore((s) => s.themePresets);
  const primaryCard = useSocialBioStore((s) => s.primaryCardId ? s.cardsById[s.primaryCardId] : undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState(primaryCard?.username || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(primaryCard?.avatar_url || null);
  const [themePresets, setThemePresets] = useState<Record<string, BioThemePreset>>(storeThemePresets);

  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('sunrise');

  useEffect(() => {
    let active = true;

    // Check if store already has theme presets & primary card cached
    const currentStore = useSocialBioStore.getState();
    if (Object.keys(currentStore.themePresets).length > 0) {
      if (active) {
        setThemePresets(currentStore.themePresets);
        const firstTheme = Object.keys(currentStore.themePresets)[0];
        setSelectedTheme(firstTheme);
        const pCard = currentStore.primaryCardId ? currentStore.cardsById[currentStore.primaryCardId] : null;
        if (pCard) {
          setUsername(pCard.username || '');
          setAvatarUrl(pCard.avatar_url || null);
        }
        setIsLoading(false);
      }
      return;
    }

    fetchDashboard()
      .then(() => {
        if (!active) return;
        const fresh = useSocialBioStore.getState();
        const pCard = fresh.primaryCardId ? fresh.cardsById[fresh.primaryCardId] : null;
        setUsername(pCard?.username || '');
        setAvatarUrl(pCard?.avatar_url || null);
        setThemePresets(fresh.themePresets || {});
        if (fresh.themePresets && Object.keys(fresh.themePresets).length > 0) {
          const firstTheme = Object.keys(fresh.themePresets)[0];
          setSelectedTheme(firstTheme);
        }
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load theme presets';
        setError(msg);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchDashboard]);

  const activeThemeSettings =
    themePresets[selectedTheme]?.settings || DEFAULT_THEME_SETTINGS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter a display name for this bio card.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const card = await createCard({
        display_name: displayName.trim(),
        slug: slug.trim() || undefined,
        theme: selectedTheme,
      });

      // Hand off smoothly via Zustand store cardsById with 0 duplicate API calls
      router.push(`/social-bio-links/${card.id}/edit`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create bio card.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const previewCard: BioCard = {
    id: 0,
    slug: slug.trim() || 'custom-slug',
    is_primary: false,
    display_name: displayName.trim() || 'My New Bio Card',
    username: username || 'username',
    bio: 'Welcome to my social bio! Tap any link below to explore my content and offers.',
    avatar_url: avatarUrl,
    banner_url: null,
    theme: selectedTheme,
    theme_settings: activeThemeSettings,
    is_published: false,
    public_url: '#',
    links: [
      { id: 1, title: '🚀 My Latest Product Launch', url: '#', is_active: true, sort_order: 1, icon: 'zap' },
      { id: 2, title: '📹 Watch Top Reel / Video', url: '#', is_active: true, sort_order: 2, icon: 'youtube' },
      { id: 3, title: '📬 Join 10k+ Creators Newsletter', url: '#', is_active: true, sort_order: 3, icon: 'mail' },
    ],
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse w-full">
        <div className="h-10 bg-slate-200 rounded-xl w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 xl:col-span-8 h-96 bg-white rounded-3xl border border-slate-200" />
          <div className="lg:col-span-5 xl:col-span-4 h-[620px] bg-slate-100 rounded-[3rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Action Bar (Matching AutoDM design) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/social-bio-links">
          <Button variant="secondary" size="sm" icon={ArrowLeft}>
            Back to Bio Cards
          </Button>
        </Link>

        <div className="flex items-center gap-2.5">
          <Link href="/social-bio-links">
            <Button type="button" variant="secondary" size="sm">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="create-bio-form"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="gap-1.5 shadow-xs"
          >
            {isSubmitting ? (
              <span>Creating Card...</span>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Create & Add Links</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Split Layout: Form on Left, Live Mockup on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Theme Preset Picker */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <form id="create-bio-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Card Information */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center gap-2 text-slate-900 font-bold pb-2 border-b border-slate-100">
                <Globe size={18} className="text-primary-600" />
                <span className="text-sm font-black">Card Details</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Masterclass Event / Merch Shop"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Shown as the title of this bio card to visitors.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Custom Slug <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-600 transition">
                  <span className="bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-500 border-r border-slate-200 select-none">
                    /@{username || 'username'}/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="custom-slug"
                    className="flex-1 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank to auto-generate a slug from the display name.
                </p>
              </div>
            </div>

            {/* Template Selection */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <Palette size={18} className="text-primary-600" />
                  <span className="text-sm font-black">Choose a Template</span>
                </div>
                <span className="text-xs text-slate-400">Can be fully customized later</span>
              </div>

              <BioTemplatePicker
                presets={themePresets}
                selectedTheme={selectedTheme}
                onSelect={setSelectedTheme}
                displayName={displayName || 'My New Bio Card'}
                username={username || 'username'}
              />
            </div>
          </form>
        </div>

        {/* Right Column: Live Mockup Simulator (Sticky on scroll) */}
        <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:sticky lg:top-20 h-fit self-start">
          <BioDeviceMockup card={previewCard} />
        </div>
      </div>
    </div>
  );
}
