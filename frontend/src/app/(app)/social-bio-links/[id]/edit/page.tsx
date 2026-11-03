'use client';

import React, { useState, useEffect, useCallback, use, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BioCard,
  BioThemeSettings,
  BioThemePreset,
  BioLink,
  BioAnalyticsData,
} from '@/lib/api/socialBioLinksService';
import {
  useSocialBioStore,
  selectEffectiveCard,
  selectIsDirty,
  BioDraftState,
} from '@/lib/store/useSocialBioStore';
import { buildPublicCardUrl } from '@/lib/utils/publicUrl';
import BioDeviceMockup from '@/components/social-bio-links/preview/BioDeviceMockup';
import BioProfileEditor from '@/components/social-bio-links/management/BioProfileEditor';
import BioLinksManager, { BioLinksManagerHandle } from '@/components/social-bio-links/management/BioLinksManager';
import BioThemePicker from '@/components/social-bio-links/management/BioThemePicker';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  ArrowLeft,
  Link as LinkIcon,
  Palette,
  User,
  BarChart2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Save,
  Clock,
  CheckCircle2,
  Layout,
  Eye,
} from 'lucide-react';

interface EditBioCardPageProps {
  params: Promise<{ id: string }>;
}

export default function EditBioCardPage({ params }: EditBioCardPageProps) {
  const resolvedParams = use(params);
  // Route param is 100% authoritative!
  const cardId = Number(resolvedParams.id);
  const router = useRouter();

  // Store Subscriptions
  const card = useSocialBioStore((s) => s.cardsById[cardId]);
  const draft = useSocialBioStore((s) => s.draftsByCardId[cardId]);
  const themePresets = useSocialBioStore((s) => s.themePresets);
  const analytics = useSocialBioStore((s) => s.analyticsByCardId[cardId] || null);
  const conflict = useSocialBioStore((s) => s.conflictsByCardId[cardId]);
  const isCardLoading = useSocialBioStore((s) => Boolean(s.loadingCards[cardId]));
  const isCardSaving = useSocialBioStore((s) => Boolean(s.savingCards[cardId]));
  const storeError = useSocialBioStore((s) => s.error);

  // Store Actions
  const fetchCard = useSocialBioStore((s) => s.fetchCard);
  const updateDraft = useSocialBioStore((s) => s.updateDraft);
  const discardDraft = useSocialBioStore((s) => s.discardDraft);
  const saveCardDraft = useSocialBioStore((s) => s.saveCardDraft);
  const dismissConflict = useSocialBioStore((s) => s.dismissConflict);
  const resolveConflictReloadRemote = useSocialBioStore((s) => s.resolveConflictReloadRemote);
  const uploadAvatar = useSocialBioStore((s) => s.uploadAvatar);
  const removeAvatar = useSocialBioStore((s) => s.removeAvatar);
  const uploadBanner = useSocialBioStore((s) => s.uploadBanner);
  const removeBanner = useSocialBioStore((s) => s.removeBanner);
  const addLink = useSocialBioStore((s) => s.addLink);
  const addBatchLinks = useSocialBioStore((s) => s.addBatchLinks);
  const updateLink = useSocialBioStore((s) => s.updateLink);
  const deleteLink = useSocialBioStore((s) => s.deleteLink);
  const reorderLinks = useSocialBioStore((s) => s.reorderLinks);

  const [isLocalMutating, setIsLocalMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'links' | 'theme' | 'profile'>('links');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [copied, setCopied] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLinksDirty, setIsLinksDirty] = useState(false);
  const [showSavedFlash, setShowSavedFlash] = useState(false);
  const savedFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const linksManagerRef = useRef<BioLinksManagerHandle | null>(null);

  const isMutating = isLocalMutating || isCardSaving;
  const isLoading = !card && isCardLoading;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const triggerSavedFlash = useCallback(() => {
    if (savedFlashTimeoutRef.current) clearTimeout(savedFlashTimeoutRef.current);
    setShowSavedFlash(true);
    savedFlashTimeoutRef.current = setTimeout(() => {
      setShowSavedFlash(false);
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (savedFlashTimeoutRef.current) clearTimeout(savedFlashTimeoutRef.current);
    };
  }, []);

  // Fetch card via SWR cache (0 duplicate API call if fresh or just created)
  useEffect(() => {
    fetchCard(cardId);
  }, [cardId, fetchCard]);

  // Dirty State Evaluation
  const isDraftDirty = useMemo(() => {
    if (!card || !draft) return false;
    const cardBio = card.custom_bio || card.bio || '';
    const draftBio = draft.bio || '';
    return (
      draft.display_name !== card.display_name ||
      draft.slug !== card.slug ||
      draftBio !== cardBio ||
      draft.theme !== card.theme ||
      draft.is_published !== card.is_published ||
      JSON.stringify(draft.theme_settings) !== JSON.stringify(card.theme_settings)
    );
  }, [card, draft]);

  const isDirty = isDraftDirty || isLinksDirty;

  // Effective Preview Model for Live Preview
  const effectiveCard = useMemo(() => {
    if (!card) return null;
    if (!draft) return card;
    return {
      ...card,
      display_name: draft.display_name,
      slug: draft.slug,
      bio: draft.bio || card.bio,
      custom_bio: draft.bio,
      theme: draft.theme,
      theme_settings: draft.theme_settings,
      is_published: draft.is_published,
    };
  }, [card, draft]);

  // Browser-level protection against accidental reload or navigation when dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Copy Public URL
  const handleCopyUrl = async () => {
    if (!card) return;
    try {
      const fullUrl = buildPublicCardUrl(card.public_url);
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // In-app Navigation with Unsaved Changes Guard (UX-02 & VBE-08)
  const handleNavigateWithGuard = (url: string) => {
    if (isDirty) {
      setPendingNavigationUrl(url);
      setShowUnsavedModal(true);
    } else {
      router.push(url);
    }
  };

  const handleBackClick = () => {
    handleNavigateWithGuard('/social-bio-links');
  };

  const handleAnalyticsClick = () => {
    handleNavigateWithGuard(`/social-bio-links/${cardId}/analytics`);
  };

  const handleConfirmDiscard = () => {
    discardDraft(cardId);
    setShowUnsavedModal(false);
    const dest = pendingNavigationUrl || '/social-bio-links';
    setPendingNavigationUrl(null);
    router.push(dest);
  };

  // Unified Draft Updates
  const handleDraftChange = (updates: Partial<BioDraftState>) => {
    updateDraft(cardId, updates);
  };

  // Unified Save Operation for Card Configuration and Pending Link Edits
  const handleSaveDraft = async () => {
    if (!card) return;
    setError(null);
    setIsLocalMutating(true);
    let draftError: Error | null = null;
    let linksError: Error | null = null;

    try {
      if (isDraftDirty && draft) {
        try {
          await saveCardDraft(cardId);
        } catch (err) {
          draftError = err instanceof Error ? err : new Error(String(err));
        }
      }

      if (linksManagerRef.current?.hasDirtyLinks()) {
        try {
          await linksManagerRef.current.saveAllDirtyLinks();
        } catch (err) {
          linksError = err instanceof Error ? err : new Error(String(err));
        }
      }

      if (draftError || linksError) {
        const errorMsg = [
          draftError ? `Card settings: ${draftError.message}` : null,
          linksError ? `Links: ${linksError.message}` : null,
        ]
          .filter(Boolean)
          .join('; ');
        setError(errorMsg || 'Failed to save changes');
        throw new Error(errorMsg || 'Failed to save changes');
      }

      triggerToast('All changes saved successfully.');
      triggerSavedFlash();
    } finally {
      setIsLocalMutating(false);
    }
  };

  // Instant 1-Click Publishing / Unpublishing Toggle
  const handleTogglePublish = async (nextPublished: boolean) => {
    if (!card || !draft || isMutating || draft.is_published === nextPublished) return;
    setIsLocalMutating(true);
    setError(null);
    try {
      updateDraft(cardId, { is_published: nextPublished });
      await saveCardDraft(cardId);
      triggerToast(
        nextPublished
          ? '🎉 Bio Card is now Live & Public!'
          : 'Bio Card reverted to Draft. Public link is temporarily disabled.'
      );
      triggerSavedFlash();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update publishing status';
      setError(message);
    } finally {
      setIsLocalMutating(false);
    }
  };

  // Multi-Tab Conflict Resolution Handlers
  const handleResolveConflictKeepLocal = () => {
    dismissConflict(cardId);
    triggerToast('Remote changes ignored. Your local edits are retained.');
  };

  const handleResolveConflictReloadRemote = async () => {
    setIsLocalMutating(true);
    try {
      await resolveConflictReloadRemote(cardId);
      triggerToast('Local draft discarded. Remote card version loaded.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reload remote version';
      setError(message);
    } finally {
      setIsLocalMutating(false);
    }
  };

  // Avatar Handlers
  const handleUploadAvatar = async (targetCardId: number, file: File) => {
    setIsLocalMutating(true);
    try {
      await uploadAvatar(targetCardId, file);
      triggerToast('Card avatar updated successfully!');
    } finally {
      setIsLocalMutating(false);
    }
  };

  const handleRemoveAvatar = async (targetCardId: number) => {
    setIsLocalMutating(true);
    try {
      await removeAvatar(targetCardId);
      triggerToast('Card avatar reset to default profile picture.');
    } finally {
      setIsLocalMutating(false);
    }
  };

  // Banner Handlers
  const handleUploadBanner = async (targetCardId: number, file: File) => {
    setIsLocalMutating(true);
    try {
      await uploadBanner(targetCardId, file);
      triggerToast('Header banner uploaded successfully!');
    } finally {
      setIsLocalMutating(false);
    }
  };

  const handleRemoveBanner = async (targetCardId: number) => {
    setIsLocalMutating(true);
    try {
      await removeBanner(targetCardId);
      triggerToast('Header banner removed.');
    } finally {
      setIsLocalMutating(false);
    }
  };

  // Discrete Link Collection Mutations (Optimistic with rollback in store)
  const handleAddLink = async (payload: Partial<BioLink>) => {
    setIsLocalMutating(true);
    try {
      await addLink(cardId, {
        title: payload.title || 'My Link',
        url: payload.url || 'https://',
        description: payload.description,
        icon: payload.icon,
        is_active: payload.is_active ?? true,
        starts_at: payload.starts_at,
        ends_at: payload.ends_at,
      });
    } finally {
      setIsLocalMutating(false);
    }
  };

  const handleAddBatchLinks = async (payloads: Array<Partial<BioLink>>) => {
    setIsLocalMutating(true);
    try {
      await addBatchLinks(
        cardId,
        payloads as Array<{
          title: string;
          url: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
        }>
      );
    } finally {
      setIsLocalMutating(false);
    }
  };

  const handleUpdateLink = async (linkId: number, payload: Partial<BioLink>) => {
    setIsLocalMutating(true);
    try {
      await updateLink(cardId, linkId, payload as {
        title: string;
        url: string;
        description?: string | null;
        icon?: string | null;
        is_active: boolean;
        starts_at?: string | null;
        ends_at?: string | null;
      });
    } finally {
      setIsLocalMutating(false);
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    setIsLocalMutating(true);
    try {
      await deleteLink(cardId, linkId);
    } finally {
      setIsLocalMutating(false);
    }
  };

  const handleReorderLinks = async (linkIds: number[]) => {
    await reorderLinks(cardId, linkIds);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse w-full">
        <div className="h-10 bg-slate-200 rounded-xl w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 xl:col-span-8 h-96 bg-white rounded-3xl border border-slate-200" />
          <div className="lg:col-span-5 xl:col-span-4 h-[620px] bg-slate-100 rounded-[3rem]" />
        </div>
      </div>
    );
  }

  if (!card || !draft) {
    if (storeError || error) {
      return (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-xl mx-auto space-y-4 my-12 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-900">Failed to Load Bio Card</h2>
          <p className="text-xs text-slate-500">
            We were unable to load your bio card due to a network or server issue. Please try again.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                fetchCard(cardId, true);
              }}
              disabled={isCardLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw size={13} className={isCardLoading ? 'animate-spin' : ''} />
              <span>{isCardLoading ? 'Retrying...' : 'Try Again'}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/social-bio-links')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              Return to Bio Links
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-xl mx-auto space-y-4 my-12 animate-in fade-in duration-200">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-lg font-black text-slate-900">Bio Card Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested bio card could not be located or you do not have permission to view it.
        </p>
        <button
          type="button"
          onClick={() => router.push('/social-bio-links')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition shadow-xs cursor-pointer"
        >
          Return to Bio Links
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Action Controls Bar (Matching AutoDM design) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={ArrowLeft}
            onClick={handleBackClick}
          >
            Back to Bio Cards
          </Button>

          {/* Interactive Status Segmented Toggle (Matching AutoDM design) */}
          <div role="group" aria-label="Publishing status" className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              role="button"
              aria-pressed={draft.is_published}
              disabled={isMutating}
              onClick={() => handleTogglePublish(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
                draft.is_published
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Publish card to make it live and public"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  draft.is_published ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              Published
            </button>
            <button
              type="button"
              role="button"
              aria-pressed={!draft.is_published}
              disabled={isMutating}
              onClick={() => handleTogglePublish(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
                !draft.is_published
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Set card to draft mode"
            >
              Draft
            </button>
          </div>
        </div>

        {/* Global Save Indicator & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Editor-level Save Status Indicator */}
          <div className="flex items-center mr-1">
            {isMutating ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 animate-in fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-ping" />
                Saving...
              </span>
            ) : isDirty ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/60 animate-in fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </span>
            ) : showSavedFlash ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/50 animate-in fade-in duration-200">
                <Check size={12} className="text-emerald-600" />
                All changes saved
              </span>
            ) : null}
          </div>

          {/* Explicit Save Button when Dirty */}
          {isDirty && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Save}
              onClick={handleSaveDraft}
              disabled={isMutating}
            >
              {isMutating ? 'Saving...' : 'Save Changes'}
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={BarChart2}
            onClick={handleAnalyticsClick}
            className="gap-1.5 shadow-2xs shrink-0 cursor-pointer text-slate-700 hover:text-primary-700"
            title="View full-width card analytics"
          >
            <span>View Analytics</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={copied ? Check : Copy}
            onClick={handleCopyUrl}
          >
            {copied ? 'Copied Bio URL!' : 'Copy URL'}
          </Button>

          {draft.is_published ? (
            <a
              href={buildPublicCardUrl(card.public_url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="primary" size="sm" icon={ExternalLink}>
                Visit Live Page
              </Button>
            </a>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={ExternalLink}
              onClick={() =>
                triggerToast('Card is currently in Draft mode. Click "Published" in the top bar to make it live!')
              }
              className="opacity-70 cursor-pointer text-slate-600"
              title="Card is in Draft mode. Click Published to make live page viewable."
            >
              Visit Live Page
            </Button>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchCard(cardId, true)}
            className="flex items-center gap-1 font-bold underline"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Multi-Tab Conflict Alert Banner */}
      {conflict && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 text-xs shadow-xs flex items-center justify-between gap-4 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="font-black text-amber-950 text-xs">
                Concurrent Modification: This bio card was updated in another window
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                You have unsaved local edits in this tab. Choose whether to keep your edits or reload the latest version from the server.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isMutating}
              onClick={handleResolveConflictKeepLocal}
              className="px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-200 text-amber-900 font-bold transition cursor-pointer border border-amber-300/50"
            >
              Keep My Edits
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={handleResolveConflictReloadRemote}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={isMutating ? 'animate-spin' : ''} /> Discard & Load Remote
            </button>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Segmented View Switcher (< 1024px) (VBE-03) */}
      <div
        role="tablist"
        aria-label="Editor view mode"
        className="flex lg:hidden items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 mb-6"
      >
        <button
          type="button"
          role="tab"
          id="tab-editor"
          aria-selected={mobileView === 'editor'}
          aria-controls="panel-editor"
          tabIndex={mobileView === 'editor' ? 0 : -1}
          onClick={() => setMobileView('editor')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 min-h-[44px] rounded-xl text-xs font-bold transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer ${
            mobileView === 'editor'
              ? 'bg-white text-primary-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layout size={15} />
          <span>Editor</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-preview"
          aria-selected={mobileView === 'preview'}
          aria-controls="panel-preview"
          tabIndex={mobileView === 'preview' ? 0 : -1}
          onClick={() => setMobileView('preview')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 min-h-[44px] rounded-xl text-xs font-bold transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer ${
            mobileView === 'preview'
              ? 'bg-white text-primary-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye size={15} />
          <span>Live Preview</span>
        </button>
      </div>

      {/* Main Split View: Left Management Tabs, Right Live Phone Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Editor Tabs */}
        <div
          role="tabpanel"
          id="panel-editor"
          aria-labelledby="tab-editor"
          className={`lg:col-span-7 xl:col-span-8 space-y-6 ${
            mobileView === 'editor' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Tab Selector Buttons */}
          <div
            role="tablist"
            aria-label="Editor sections"
            className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-x-auto"
          >
            <button
              type="button"
              role="tab"
              id="tab-links"
              aria-selected={activeTab === 'links'}
              aria-controls="subpanel-links"
              tabIndex={activeTab === 'links' ? 0 : -1}
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeTab === 'links'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <LinkIcon size={14} />
              <span>Links</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === 'links' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {card.links?.length || 0}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-theme"
              aria-selected={activeTab === 'theme'}
              aria-controls="subpanel-theme"
              tabIndex={activeTab === 'theme' ? 0 : -1}
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeTab === 'theme'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Palette size={14} />
              <span>Design & Theme</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-profile"
              aria-selected={activeTab === 'profile'}
              aria-controls="subpanel-profile"
              tabIndex={activeTab === 'profile' ? 0 : -1}
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeTab === 'profile'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <User size={14} />
              <span>Profile & Settings</span>
            </button>
          </div>

          {/* Active Tab Content (Draft state preserved across switches) */}
          <div className="transition-all duration-150">
            <div
              id="subpanel-links"
              role="tabpanel"
              aria-labelledby="tab-links"
              className={activeTab === 'links' ? 'block' : 'hidden'}
            >
              <BioLinksManager
                ref={linksManagerRef}
                card={effectiveCard || card}
                onAddLink={handleAddLink}
                onAddBatchLinks={handleAddBatchLinks}
                onUpdateLink={handleUpdateLink}
                onDeleteLink={handleDeleteLink}
                onReorderLinks={handleReorderLinks}
                isMutating={isMutating}
                onDirtyChange={setIsLinksDirty}
              />
            </div>

            {activeTab === 'theme' && (
              <div id="subpanel-theme" role="tabpanel" aria-labelledby="tab-theme">
                <BioThemePicker
                  card={card}
                  theme={draft.theme}
                  themeSettings={draft.theme_settings}
                  themePresets={themePresets}
                  onDraftThemeChange={(newTheme, newSettings) =>
                    handleDraftChange({ theme: newTheme, theme_settings: newSettings })
                  }
                  onSaveTheme={handleSaveDraft}
                  isMutating={isMutating}
                  isDirty={isDirty}
                />
              </div>
            )}

            {activeTab === 'profile' && (
              <div id="subpanel-profile" role="tabpanel" aria-labelledby="tab-profile">
                <BioProfileEditor
                  card={card}
                  draft={draft}
                  onDraftChange={handleDraftChange}
                  onSaveProfile={handleSaveDraft}
                  onUploadAvatar={handleUploadAvatar}
                  onRemoveAvatar={handleRemoveAvatar}
                  onUploadBanner={handleUploadBanner}
                  onRemoveBanner={handleRemoveBanner}
                  isMutating={isMutating}
                  isDirty={isDirty}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Live Phone Mockup fed by effectiveCard for TRUE real-time reactivity */}
        <div
          role="tabpanel"
          id="panel-preview"
          aria-labelledby="tab-preview"
          className={`lg:col-span-5 xl:col-span-4 ${
            mobileView === 'preview' ? 'flex' : 'hidden lg:flex'
          } justify-center lg:sticky lg:top-20 h-fit self-start`}
        >
          <BioDeviceMockup cardId={cardId} card={effectiveCard || card} />
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal (UX-02) */}
      <ConfirmModal
        isOpen={showUnsavedModal}
        onClose={() => {
          setShowUnsavedModal(false);
          setPendingNavigationUrl(null);
        }}
        onConfirm={handleConfirmDiscard}
        title="Discard Unsaved Changes?"
        description="You have uncommitted modifications to your bio card theme, links, or profile. Navigating away will discard these changes. Are you sure you want to leave?"
        confirmText="Discard & Leave"
        cancelText="Keep Editing"
        variant="warning"
      />
    </div>
  );
}
