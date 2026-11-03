'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BioCardSummary,
} from '@/lib/api/socialBioLinksService';
import {
  useSocialBioStore,
  selectPrimaryCard,
} from '@/lib/store/useSocialBioStore';
import { buildPublicCardUrl } from '@/lib/utils/publicUrl';
import SocialBioLinksNav from '@/components/social-bio-links/SocialBioLinksNav';
import BioDeviceMockup from '@/components/social-bio-links/preview/BioDeviceMockup';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Skeleton from '@/components/ui/Skeleton';
import {
  Link as LinkIcon,
  MousePointerClick,
  Plus,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Trash2,
  Star,
  Layers,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function SocialBioLinksDashboardPage() {
  const router = useRouter();
  const [isLocalMutating, setIsLocalMutating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Zustand Store Subscriptions
  const cards = useSocialBioStore((s) => s.cardSummaries);
  const primaryCard = useSocialBioStore(selectPrimaryCard);
  const isLoadingDashboard = useSocialBioStore((s) => s.isLoadingDashboard);
  const storeError = useSocialBioStore((s) => s.error);

  // Zustand Store Actions
  const fetchDashboard = useSocialBioStore((s) => s.fetchDashboard);
  const setPrimaryCardAction = useSocialBioStore((s) => s.setPrimaryCard);
  const deleteCardAction = useSocialBioStore((s) => s.deleteCard);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [cardToDelete, setCardToDelete] = useState<BioCardSummary | null>(null);
  const [disabledDeleteWarningId, setDisabledDeleteWarningId] = useState<number | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const isMutating = isLocalMutating;
  const error = localError || storeError;
  // Instant visual feedback: zero skeleton delay if cached cards exist
  const isLoading = cards.length === 0 && isLoadingDashboard;

  // Background SWR Revalidation (5-minute TTL)
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-clear disabled delete warning popup after 3.5s
  useEffect(() => {
    if (disabledDeleteWarningId !== null) {
      const timer = setTimeout(() => {
        setDisabledDeleteWarningId(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [disabledDeleteWarningId]);

  // Copy Public URL
  const handleCopyUrl = async (card: BioCardSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const fullUrl = buildPublicCardUrl(card.public_url);
      if (!fullUrl) return;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(card.id);
      const cardTitle = card.display_name || card.username || 'Bio card';
      setLiveAnnouncement(`Copied link for ${cardTitle} to clipboard.`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Set Primary Card
  const handleSetPrimary = async (card: BioCardSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLocalMutating(true);
    setLocalError(null);
    try {
      await setPrimaryCardAction(card.id);
      const cardTitle = card.display_name || card.username || 'Bio card';
      setLiveAnnouncement(`${cardTitle} is now your primary bio link.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update primary card';
      setLocalError(message);
      setLiveAnnouncement(`Failed to update primary card: ${message}`);
    } finally {
      setIsLocalMutating(false);
    }
  };

  // Delete Card
  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    setIsLocalMutating(true);
    setLocalError(null);
    try {
      await deleteCardAction(cardToDelete.id);
      setCardToDelete(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete card';
      setLocalError(message);
    } finally {
      setIsLocalMutating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SocialBioLinksNav activeTab="bio" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs h-64 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-12 h-12" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton variant="text" className="h-4 w-32" />
                  <Skeleton variant="text" className="h-3 w-24" />
                </div>
              </div>
              <Skeleton variant="rectangular" className="h-20 w-full rounded-2xl" />
              <div className="flex gap-2 pt-2">
                <Skeleton variant="rectangular" className="h-9 flex-1 rounded-xl" />
                <Skeleton variant="rectangular" className="h-9 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-6 pb-16 overflow-x-clip">
      {/* 1. Primary Navigation with Create Action & Combined Analytics */}
      <SocialBioLinksNav
        activeTab="bio"
        rightElement={
          <Link href="/social-bio-links/create">
            <Button variant="primary" size="sm" className="gap-2 shadow-xs shrink-0">
              <Plus size={15} />
              <span>Create Bio Card</span>
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            className="flex items-center gap-1 font-bold underline cursor-pointer"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}



      {/* 3. Bio Cards Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-slate-900">Your Bio Cards</h2>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {cards.length}
          </span>
        </div>

        {/* Cards Tiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 min-[1680px]:grid-cols-4 gap-8 justify-items-center">
          {cards.map((card, index) => {
            const isCopied = copiedId === card.id;

            return (
              <div key={card.id} className="relative flex flex-col items-center justify-center w-full">
                <div className="group relative flex flex-col items-center justify-center select-none transition-transform duration-300 hover:scale-[1.02]">
                  {/* Floating Status Pill Above Phone */}
                  <div className="h-9 mb-5 relative z-20 flex items-center justify-center">
                  {card.is_primary ? (
                    <Badge
                      variant="solid"
                      color="emerald"
                      size="md"
                      icon={Sparkles}
                      className="shadow-md shadow-emerald-500/25 ring-2 ring-white font-black tracking-wide"
                    >
                      Primary Link
                    </Badge>
                  ) : (
                    <Badge
                      variant="subtle"
                      color="slate"
                      size="sm"
                      className="opacity-60 group-hover:opacity-100 transition-opacity font-semibold"
                    >
                      Secondary
                    </Badge>
                  )}
                </div>

                <div className={`relative transition-all duration-300 ${card.is_primary ? 'scale-[1.02] -translate-y-1' : ''}`}>
                  {/* High-Definition Brand Container for Phone */}
                  <div
                    className={
                      card.is_primary
                        ? 'rounded-[3.2rem] ring-2 ring-primary-500/30 shadow-xl shadow-primary-500/10 transition-all'
                        : ''
                    }
                  >
                    <BioDeviceMockup
                      card={card}
                      showTitle={false}
                      className="static"
                      actionOverlay={
                        <div className="flex flex-col justify-between w-full h-full text-white">
                          {/* Top row inside phone overlay */}
                          <div className="w-full flex items-center justify-between px-3.5 pt-11 z-10">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black shadow-md backdrop-blur-xs ${
                                  card.is_published
                                    ? 'bg-emerald-500/90 text-white'
                                    : 'bg-slate-700/80 text-slate-300'
                                }`}
                              >
                                {card.is_published ? 'Live' : 'Draft'}
                              </span>
                              <span className="text-[10px] font-bold text-white/75 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
                                {card.links_count} links
                              </span>
                            </div>

                            <div>
                              {!card.is_primary ? (
                                <button
                                  type="button"
                                  disabled={isMutating}
                                  onClick={(e) => handleSetPrimary(card, e)}
                                  className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-primary-600/90 hover:bg-primary-600 px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs transition cursor-pointer hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                  title="Set as Primary Bio Link"
                                  aria-label={`Set ${card.display_name || card.username || 'bio card'} as primary bio link`}
                                  aria-pressed={false}
                                >
                                  <Star size={10} className="fill-white" />
                                  <span>Make Primary</span>
                                </button>
                              ) : (
                                <span
                                  role="status"
                                  aria-label={`Primary bio link: ${card.display_name || card.username || 'bio card'}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 text-white px-2.5 py-0.5 text-[10px] font-black shadow-md backdrop-blur-xs"
                                >
                                  <Sparkles size={10} /> Primary
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Center Spacer / Live Page Preview */}
                          <div className="flex-1 flex items-center justify-center pointer-events-none" />

                          {/* Native-Style Phone Bottom Nav Bar with 5 Actions (Minimum 44x44px touch targets) */}
                          <div className="w-full bg-slate-950/92 backdrop-blur-xl border-t border-white/10 pt-2 pb-3.5 px-1 shadow-2xl z-20">
                            <div className="grid grid-cols-5 items-center gap-0.5">
                              {/* 1. Edit */}
                              <Link
                                href={`/social-bio-links/${card.id}/edit`}
                                className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-slate-300 hover:text-white transition group/nav active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-xl"
                                title="Edit Bio Card"
                                aria-label={`Edit ${card.display_name || card.username || 'bio card'}`}
                              >
                                <div className="p-1 rounded-lg group-hover/nav:bg-white/10 transition">
                                  <Edit3 size={17} className="group-hover/nav:text-primary-400 transition-colors" />
                                </div>
                                <span className="text-[10px] font-bold tracking-tight">Edit</span>
                              </Link>

                              {/* 2. Analytics */}
                              <Link
                                href={`/social-bio-links/${card.id}/analytics`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-slate-300 hover:text-white transition group/nav active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-xl"
                                title="View Card Analytics"
                                aria-label={`View analytics for ${card.display_name || card.username || 'bio card'}`}
                              >
                                <div className="p-1 rounded-lg group-hover/nav:bg-white/10 transition">
                                  <BarChart2 size={17} className="group-hover/nav:text-primary-400 transition-colors" />
                                </div>
                                <span className="text-[10px] font-bold tracking-tight">Stats</span>
                              </Link>

                              {/* 3. Visit */}
                              {card.public_url ? (
                                <a
                                  href={buildPublicCardUrl(card.public_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-slate-300 hover:text-white transition group/nav active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-xl"
                                  title="Visit Public Page"
                                  aria-label={`Visit public page for ${card.display_name || card.username || 'bio card'}`}
                                >
                                  <div className="p-1 rounded-lg group-hover/nav:bg-white/10 transition">
                                    <ExternalLink size={17} className="group-hover/nav:text-primary-400 transition-colors" />
                                  </div>
                                  <span className="text-[10px] font-bold tracking-tight">Visit</span>
                                </a>
                              ) : (
                                <div
                                  className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-slate-600 opacity-40 cursor-not-allowed"
                                  aria-disabled="true"
                                  aria-label="Visit public page (disabled: no public link available)"
                                >
                                  <div className="p-1">
                                    <ExternalLink size={17} />
                                  </div>
                                  <span className="text-[10px] font-bold tracking-tight">Visit</span>
                                </div>
                              )}

                              {/* 4. Copy */}
                              <button
                                type="button"
                                onClick={(e) => handleCopyUrl(card, e)}
                                className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-slate-300 hover:text-white transition group/nav active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-xl"
                                title="Copy Bio Link URL"
                                aria-label={`Copy link for ${card.display_name || card.username || 'bio card'}`}
                              >
                                <div className="p-1 rounded-lg group-hover/nav:bg-white/10 transition">
                                  {isCopied ? (
                                    <Check size={17} className="text-emerald-400" />
                                  ) : (
                                    <Copy size={17} className="group-hover/nav:text-primary-400 transition-colors" />
                                  )}
                                </div>
                                <span
                                  className={`text-[10px] font-bold tracking-tight ${
                                    isCopied ? 'text-emerald-400 font-extrabold' : ''
                                  }`}
                                >
                                  {isCopied ? 'Copied' : 'Copy'}
                                </span>
                              </button>

                              {/* 5. Delete */}
                              {cards.length > 1 ? (
                                <button
                                  type="button"
                                  disabled={isMutating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardToDelete(card);
                                  }}
                                  className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-slate-300 hover:text-rose-400 transition group/nav active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-xl"
                                  title="Delete Bio Card"
                                  aria-label={`Delete ${card.display_name || card.username || 'bio card'}`}
                                >
                                  <div className="p-1 rounded-lg group-hover/nav:bg-rose-500/15 transition">
                                    <Trash2 size={17} className="group-hover/nav:text-rose-400 transition-colors" />
                                  </div>
                                  <span className="text-[10px] font-bold tracking-tight group-hover/nav:text-rose-400">
                                    Delete
                                  </span>
                                </button>
                              ) : (
                                <div className="relative flex flex-col items-center justify-center w-full">
                                  <button
                                    type="button"
                                    aria-disabled="true"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDisabledDeleteWarningId(card.id);
                                      setLiveAnnouncement(
                                        'You must have at least one bio link card. Create a replacement card before deleting this one.'
                                      );
                                    }}
                                    className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-slate-500 hover:text-slate-400 transition group/nav active:scale-95 cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-xl"
                                    title="You must have at least one bio link card. Create a replacement card before deleting this one."
                                    aria-label="Cannot delete: You must have at least one bio link card. Create a replacement card before deleting this one."
                                  >
                                    <div className="p-1 opacity-50">
                                      <Trash2 size={17} />
                                    </div>
                                    <span className="text-[10px] font-bold tracking-tight opacity-50">Delete</span>
                                  </button>
                                  {disabledDeleteWarningId === card.id && (
                                    <div
                                      role="alert"
                                      className="absolute bottom-14 right-0 w-48 p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-[11px] font-medium text-slate-200 shadow-2xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-150 text-left"
                                    >
                                      <p className="leading-snug">
                                        You must have at least one bio link card. Create a replacement card before deleting this one.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* iOS Home Indicator Bar indicator */}
                            <div className="w-20 h-1 rounded-full bg-white/30 mx-auto mt-2 pointer-events-none" />
                          </div>
                        </div>
                      }
                />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </section>

      {/* Screen Reader Live Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(cardToDelete)}
        onClose={() => setCardToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Bio Card?"
        description={`This will permanently delete "${cardToDelete?.display_name || 'this bio card'}" along with all of its links and click tracking history. This action cannot be undone.`}
        confirmText="Delete Bio Card"
        variant="danger"
        isLoading={isMutating}
      />
    </div>
  );
}
