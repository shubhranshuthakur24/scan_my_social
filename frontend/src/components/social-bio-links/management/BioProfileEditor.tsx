'use client';

import React, { useState } from 'react';
import { BioCard } from '@/lib/api/socialBioLinksService';
import {
  Upload,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  User,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import BioImageCropModal from '@/components/social-bio-links/BioImageCropModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { buildPublicCardUrl } from '@/lib/utils/publicUrl';

interface BioProfileEditorProps {
  card: BioCard;
  draft: {
    display_name: string;
    slug: string;
    bio: string;
    is_published: boolean;
  };
  onDraftChange: (
    updates: Partial<{
      display_name: string;
      slug: string;
      bio: string;
      is_published: boolean;
    }>
  ) => void;
  onSaveProfile: () => Promise<void>;
  onUploadAvatar: (cardId: number, file: File) => Promise<void>;
  onRemoveAvatar: (cardId: number) => Promise<void>;
  onUploadBanner: (cardId: number, file: File) => Promise<void>;
  onRemoveBanner: (cardId: number) => Promise<void>;
  isMutating: boolean;
  isDirty: boolean;
}

export default function BioProfileEditor({
  card,
  draft,
  onDraftChange,
  onSaveProfile,
  onUploadAvatar,
  onRemoveAvatar,
  onUploadBanner,
  onRemoveBanner,
  isMutating,
  isDirty,
}: BioProfileEditorProps) {
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);

  React.useEffect(() => {
    setAvatarLoadFailed(false);
  }, [card.avatar_url]);

  React.useEffect(() => {
    setBannerLoadFailed(false);
  }, [card.banner_url]);

  // Image Cropping Modal State (Avatar 1:1, Banner 3:1)
  const [cropModalState, setCropModalState] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    fileName: string;
    type: 'avatar' | 'banner';
  }>({
    isOpen: false,
    imageUrl: null,
    fileName: '',
    type: 'avatar',
  });

  // Confirmation Modal State (Remove Banner / Reset Avatar)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'remove_banner' | 'reset_avatar';
    title: string;
    description: string;
    confirmText: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await onSaveProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save card settings';
      setSaveError(message);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveError('Please select a valid image file (JPG, PNG, or WebP).');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSaveError('Avatar image file size must be under 10 MB.');
      e.target.value = '';
      return;
    }

    setSaveError(null);
    const objectUrl = URL.createObjectURL(file);
    setCropModalState({
      isOpen: true,
      imageUrl: objectUrl,
      fileName: file.name,
      type: 'avatar',
    });
    e.target.value = '';
  };

  const handleOpenResetAvatarConfirm = () => {
    setConfirmModal({
      isOpen: true,
      type: 'reset_avatar',
      title: 'Reset Card Avatar?',
      description: 'Are you sure you want to remove the custom avatar for this card? It will immediately revert to your global account profile picture.',
      confirmText: 'Reset Avatar',
    });
  };

  const handleOpenRemoveBannerConfirm = () => {
    setConfirmModal({
      isOpen: true,
      type: 'remove_banner',
      title: 'Remove Header Banner?',
      description: 'Are you sure you want to remove the header banner? Visitors will see a clean profile header without a banner image.',
      confirmText: 'Remove Banner',
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setIsRemoving(true);
    setSaveError(null);
    try {
      if (confirmModal.type === 'remove_banner') {
        await onRemoveBanner(card.id);
      } else {
        await onRemoveAvatar(card.id);
      }
      setConfirmModal(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      setSaveError(message);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveError('Please select a valid image file (JPG, PNG, or WebP).');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSaveError('Banner image file size must be under 10 MB.');
      e.target.value = '';
      return;
    }

    setSaveError(null);
    const objectUrl = URL.createObjectURL(file);
    setCropModalState({
      isOpen: true,
      imageUrl: objectUrl,
      fileName: file.name,
      type: 'banner',
    });
    e.target.value = '';
  };

  const handleCropComplete = async (croppedFile: File) => {
    if (cropModalState.type === 'avatar') {
      try {
        setAvatarUploading(true);
        setSaveError(null);
        await onUploadAvatar(card.id, croppedFile);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Avatar upload failed';
        setSaveError(message);
      } finally {
        setAvatarUploading(false);
      }
    } else {
      try {
        setBannerUploading(true);
        setSaveError(null);
        await onUploadBanner(card.id, croppedFile);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Banner upload failed';
        setSaveError(message);
      } finally {
        setBannerUploading(false);
      }
    }
  };

  const handleCloseCropModal = () => {
    if (cropModalState.imageUrl) {
      URL.revokeObjectURL(cropModalState.imageUrl);
    }
    setCropModalState((prev) => ({ ...prev, isOpen: false, imageUrl: null }));
  };

  const handleCopyUrl = () => {
    const fullUrl = buildPublicCardUrl(card.public_url);
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-sm font-black text-slate-900">Card Header & Profile Identity</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure how your card appears to visitors, upload custom avatars and banners, and set page visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copied ? 'Copied URL!' : 'Copy Bio URL'}</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check size={15} className="shrink-0 text-emerald-600" />
          <span>Card header and profile changes saved successfully.</span>
        </div>
      )}

      {/* Media Management Grid: Avatar and Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60">
        {/* Card Avatar Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User size={14} className="text-primary-600" />
              <span>Card Avatar</span>
            </label>
            {card.custom_avatar_url ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-700 bg-primary-50 border border-primary-200/60 px-2 py-0.5 rounded-full">
                <Sparkles size={10} /> Custom Avatar
              </span>
            ) : (
              <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                Global Account Default
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200/80">
            <div className="relative shrink-0">
              {card.avatar_url && !avatarLoadFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.avatar_url}
                  alt={draft.display_name}
                  onError={() => setAvatarLoadFailed(true)}
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 shadow-2xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 font-black text-lg flex items-center justify-center border-2 border-slate-200">
                  {(draft.display_name || 'A')[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
              <p className="text-[11px] text-slate-500">
                {card.custom_avatar_url
                  ? 'Custom logo/image active for this card.'
                  : 'Currently inheriting your main profile picture.'}
              </p>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="bio-avatar-input"
                  className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  {avatarUploading ? (
                    <RefreshCw size={11} className="animate-spin text-primary-600" />
                  ) : (
                    <Upload size={11} />
                  )}
                  <span>{avatarUploading ? 'Uploading...' : card.custom_avatar_url ? 'Replace' : 'Upload Custom'}</span>
                  <input
                    id="bio-avatar-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    aria-label="Upload custom avatar image"
                    onChange={handleAvatarFileChange}
                    disabled={avatarUploading || isMutating}
                  />
                </label>

                {card.custom_avatar_url && (
                  <button
                    type="button"
                    onClick={handleOpenResetAvatarConfirm}
                    disabled={isMutating || isRemoving}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card Banner Section */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ImageIcon size={14} className="text-primary-600" />
            <span>Card Header Banner</span>
          </label>

          {card.banner_url && !bannerLoadFailed ? (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[3/1] max-h-24 bg-slate-100 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.banner_url}
                  alt="Card Banner"
                  onError={() => setBannerLoadFailed(true)}
                  className="w-full h-full object-cover"
                />
                {/* Desktop hover quick actions */}
                <div className="hidden sm:flex absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition items-center justify-center gap-2">
                  <label
                    htmlFor="bio-banner-input-hover"
                    className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    {bannerUploading ? (
                      <RefreshCw size={11} className="animate-spin text-primary-600" />
                    ) : (
                      <Upload size={11} />
                    )}
                    <span>{bannerUploading ? 'Uploading...' : 'Replace'}</span>
                    <input
                      id="bio-banner-input-hover"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      aria-label="Upload header banner image"
                      onChange={handleBannerFileChange}
                      disabled={bannerUploading || isMutating}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenRemoveBannerConfirm}
                    disabled={isMutating || isRemoving || bannerUploading}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-rose-700 transition cursor-pointer"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </div>

              {/* Action buttons (always visible on mobile & touch, and explicit beneath) */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="bio-banner-input-replace"
                  className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  {bannerUploading ? (
                    <RefreshCw size={11} className="animate-spin text-primary-600" />
                  ) : (
                    <Upload size={11} />
                  )}
                  <span>{bannerUploading ? 'Uploading...' : 'Replace'}</span>
                  <input
                    id="bio-banner-input-replace"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    aria-label="Upload header banner image"
                    onChange={handleBannerFileChange}
                    disabled={bannerUploading || isMutating}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleOpenRemoveBannerConfirm}
                  disabled={isMutating || isRemoving || bannerUploading}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  <Trash2 size={11} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="bio-banner-input-empty"
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-3.5 text-center hover:border-primary-400 hover:bg-white transition cursor-pointer"
            >
              <Upload size={16} className="text-slate-400 mb-1" />
              <span className="text-[11px] font-bold text-slate-700">Upload header banner (Optional)</span>
              <span className="text-[10px] text-slate-400">JPG, PNG or WEBP up to 5MB (3:1 ratio)</span>
              <input
                id="bio-banner-input-empty"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-label="Upload header banner image"
                onChange={handleBannerFileChange}
                disabled={bannerUploading || isMutating}
              />
            </label>
          )}
        </div>
      </div>

      {/* Form Fields: Display Name & Slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bio-display-name" className="block text-xs font-bold text-slate-700 mb-1">Display Title / Name</label>
          <input
            id="bio-display-name"
            type="text"
            required
            value={draft.display_name}
            onChange={(e) => onDraftChange({ display_name: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label htmlFor="bio-slug" className="block text-xs font-bold text-slate-700 mb-1">
            Card Handle / Slug {card.is_primary && '(Primary Default)'}
          </label>
          <div className="flex items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-slate-50 focus-within:bg-white focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
            <span className="text-slate-400 font-mono">/@{card.username}/</span>
            <input
              id="bio-slug"
              type="text"
              disabled={card.is_primary}
              value={draft.slug}
              onChange={(e) => onDraftChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
              className="w-full bg-transparent text-slate-900 font-mono focus:outline-hidden pl-1 disabled:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Bio / Description Field (UX-05) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="bio-description" className="block text-xs font-bold text-slate-700">Card Bio / Description (Optional)</label>
          <span className={`text-[10px] font-mono ${draft.bio.length > 450 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
            {draft.bio.length}/500
          </span>
        </div>
        <textarea
          id="bio-description"
          rows={3}
          maxLength={500}
          value={draft.bio}
          onChange={(e) => onDraftChange({ bio: e.target.value })}
          placeholder="Add a custom bio description for this card. If left blank, it will automatically fall back to your main account bio..."
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-hidden resize-none"
        />
        <p className="text-[11px] text-slate-400">
          This description appears directly beneath your name on the card.
        </p>
      </div>

      {/* Publishing Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Publish to Public Web</span>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                draft.is_published
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {draft.is_published ? 'Live & Public' : 'Draft / Unpublished'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            When published, anyone navigating to {card.public_url} will see this active card and links.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={draft.is_published}
          aria-label="Publish to Public Web"
          onClick={() => onDraftChange({ is_published: !draft.is_published })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
            draft.is_published ? 'bg-primary-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              draft.is_published ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Image Crop Modal for Avatar & Banner */}
      <BioImageCropModal
        isOpen={cropModalState.isOpen}
        onClose={handleCloseCropModal}
        imageUrl={cropModalState.imageUrl}
        fileName={cropModalState.fileName}
        type={cropModalState.type}
        onCropComplete={handleCropComplete}
      />

      {/* Confirmation Modal for Reset Avatar & Remove Banner */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => {
            if (!isRemoving) setConfirmModal(null);
          }}
          onConfirm={handleConfirmAction}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText={confirmModal.confirmText}
          cancelText="Keep"
          variant="danger"
          isLoading={isRemoving}
        />
      )}
    </div>
  );
}
