'use client';

import React, { useState } from 'react';
import { BioLink } from '@/lib/api/socialBioLinksService';
import { Clock, AlertCircle, Check, Plus, Globe } from 'lucide-react';
import { AVAILABLE_BIO_ICONS } from '@/components/social-bio-links/BioIcons';
import {
  SOCIAL_PLATFORMS,
  isPlatformAlreadyAdded,
  SocialPlatformConfig,
} from '@/components/social-bio-links/socialPlatforms';

interface BioLinkDialogProps {
  isOpen: boolean;
  link: BioLink | null;
  existingLinks?: BioLink[];
  defaultUsername?: string;
  onSave: (payload: {
    title: string;
    url: string;
    description?: string | null;
    icon?: string | null;
    is_active: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  }) => Promise<void>;
  onSaveBatch?: (payloads: Array<{
    title: string;
    url: string;
    description?: string | null;
    icon?: string | null;
    is_active: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  }>) => Promise<void>;
  onClose: () => void;
}

export default function BioLinkDialog({
  isOpen,
  link,
  existingLinks = [],
  defaultUsername = '',
  onSave,
  onSaveBatch,
  onClose,
}: BioLinkDialogProps) {
  // Mode: Social Links (default for new) or Custom Link
  const [mode, setMode] = useState<'social' | 'custom'>(link ? 'custom' : 'social');

  // Social Links Mode state (multi-select + optional shared handle)
  const [selectedPlatformKeys, setSelectedPlatformKeys] = useState<string[]>([]);
  const [socialHandle, setSocialHandle] = useState(defaultUsername || '');

  // Custom Link Mode state (when editing existing or custom creation)
  const [title, setTitle] = useState(link?.title || '');
  const [url, setUrl] = useState(link?.url || '');
  const [description, setDescription] = useState(link?.description || '');
  const [icon, setIcon] = useState<string | null>(link?.icon || 'globe');
  const [isActive, setIsActive] = useState(link?.is_active ?? true);
  const [startsAt, setStartsAt] = useState(link?.starts_at || '');
  const [endsAt, setEndsAt] = useState(link?.ends_at || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Toggle platform selection in pure selector mode
  const handleTogglePlatform = (platformKey: string) => {
    setError(null);
    setSelectedPlatformKeys((prev) => {
      if (prev.includes(platformKey)) {
        return prev.filter((k) => k !== platformKey);
      }
      return [...prev, platformKey];
    });
  };

  // Submit Social Links Mode (Batch creates links with configured handle)
  const handleSocialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedPlatformKeys.length === 0) {
      setError('Please select at least one social platform.');
      return;
    }

    const selectedConfigs: SocialPlatformConfig[] = [];
    for (const key of selectedPlatformKeys) {
      const config = SOCIAL_PLATFORMS.find((p) => p.key === key);
      if (config) selectedConfigs.push(config);
    }

    // Build URL using user-provided handle, fallback to defaultUsername or 'username'
    const effectiveHandle = (socialHandle || defaultUsername || 'username').trim();
    const payloads = selectedConfigs.map((config) => {
      const generatedUrl = config.buildUrl(effectiveHandle);

      return {
        title: config.name,
        url: generatedUrl,
        description: null,
        icon: config.icon,
        is_active: true,
        starts_at: null,
        ends_at: null,
      };
    });

    try {
      setIsSubmitting(true);
      if (onSaveBatch) {
        await onSaveBatch(payloads);
      } else {
        for (const item of payloads) {
          await onSave(item);
        }
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add social links';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Add empty custom link
  const handleQuickAddCustom = async () => {
    try {
      setIsSubmitting(true);
      await onSave({
        title: 'New Link',
        url: 'https://',
        description: null,
        icon: 'globe',
        is_active: true,
        starts_at: null,
        ends_at: null,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add custom link';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Custom Link Edit Mode
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Destination URL must start with http:// or https://');
      return;
    }

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setError('Schedule end time must be after start time.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        url: url.trim(),
        description: description.trim() || null,
        icon: icon || null,
        is_active: isActive,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save link';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = selectedPlatformKeys.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {link ? 'Advanced Link Settings' : 'Add Links'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {link
                ? 'Configure button details, custom icon, subtitle, and campaign scheduling.'
                : 'Select the social profiles or custom links you want to add to your card.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector (Only when creating new links) */}
        {!link && (
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('social');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                mode === 'social'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Social Links
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('custom');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                mode === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Link
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* MODE 1: SOCIAL LINKS SELECTOR WITH OPTIONAL UNIFIED HANDLE */}
        {mode === 'social' && !link && (
          <form onSubmit={handleSocialSubmit} className="space-y-4">
            {/* Unified Handle Input */}
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-700">
                Your Handle / Username (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs select-none">
                  @
                </span>
                <input
                  type="text"
                  value={socialHandle}
                  onChange={(e) => setSocialHandle(e.target.value.replace(/^@+/, ''))}
                  placeholder={defaultUsername || 'yourhandle'}
                  className="w-full pl-8 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                This handle automatically formats destination URLs for all selected platforms.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Platforms to Add
                </label>
                <span className="text-[11px] text-slate-400">
                  {selectedCount} of {SOCIAL_PLATFORMS.length} selected
                </span>
              </div>

              {/* Platform Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const alreadyAdded = isPlatformAlreadyAdded(platform, existingLinks);
                  const isSelected = selectedPlatformKeys.includes(platform.key);
                  const Icon = platform.IconComponent;

                  return (
                    <button
                      key={platform.key}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleTogglePlatform(platform.key)}
                      className={`relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition ${
                        alreadyAdded
                          ? 'border-slate-200 bg-slate-50/80 opacity-55 cursor-not-allowed text-slate-400'
                          : isSelected
                          ? 'border-primary-600 bg-primary-50/80 text-primary-900 ring-2 ring-primary-600 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          alreadyAdded
                            ? 'bg-slate-200/60 text-slate-400'
                            : isSelected
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate leading-tight">{platform.name}</p>
                        {alreadyAdded ? (
                          <span className="text-[10px] text-slate-400 font-medium">Already added</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {platform.prefix}
                          </span>
                        )}
                      </div>

                      {isSelected && !alreadyAdded && (
                        <div className="w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Generated URL Preview (if platforms selected) */}
            {selectedCount > 0 && (
              <div className="p-3 rounded-xl bg-primary-50/60 border border-primary-100 text-xs space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary-900">
                    Generated URLs Preview:
                  </span>
                  <span className="text-[10px] text-primary-700 font-medium">
                    {selectedCount} link{selectedCount > 1 ? 's' : ''} ready to add
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPlatformKeys.map((key) => {
                    const cfg = SOCIAL_PLATFORMS.find((p) => p.key === key);
                    if (!cfg) return null;
                    const previewUrl = cfg.buildUrl((socialHandle || defaultUsername || 'username').trim());
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-primary-200/80 text-[10px] text-primary-900 font-mono"
                      >
                        <span className="font-bold text-slate-600 font-sans">{cfg.name}:</span>
                        <span className="truncate max-w-[160px]">{previewUrl.replace(/^https?:\/\//, '')}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedCount === 0}
                className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition disabled:opacity-50 shadow-xs"
              >
                {isSubmitting
                  ? 'Adding...'
                  : selectedCount === 0
                  ? 'Select Platforms'
                  : selectedCount === 1
                  ? 'Add Social Link'
                  : `Add ${selectedCount} Social Links`}
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: CUSTOM LINK (CREATION SELECTOR OR FULL EDIT) */}
        {mode === 'custom' && !link && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Globe size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Custom Destination Link</h4>
                  <p className="text-[11px] text-slate-500">
                    Add a generic link button for your store, landing page, portfolio, or newsletter.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickAddCustom}
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition disabled:opacity-50 shadow-xs"
              >
                <Plus size={14} />
                <span>{isSubmitting ? 'Adding...' : 'Add Custom Link Button'}</span>
              </button>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* FULL EDIT MODE (Only when editing an existing link) */}
        {Boolean(link) && (
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div>
              <label htmlFor="link-title" className="block text-xs font-bold text-slate-700 mb-1">Button Title *</label>
              <input
                id="link-title"
                type="text"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🚀 Download 2026 AI Growth Playbook"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="link-url" className="block text-xs font-bold text-slate-700 mb-1">Destination URL *</label>
              <input
                id="link-url"
                type="url"
                required
                maxLength={2048}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/playbook"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="link-description" className="block text-xs font-bold text-slate-700 mb-1">
                Subtitle / Description (Optional)
              </label>
              <input
                id="link-description"
                type="text"
                maxLength={240}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Free 45-page breakdown with prompt templates"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-hidden"
              />
            </div>

            {/* Icon Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Button Icon</label>
              <div className="grid grid-cols-7 gap-2">
                {AVAILABLE_BIO_ICONS.map(({ key, label, Icon }) => {
                  const isSelected = icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setIcon(isSelected ? null : key)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50 text-primary-600 ring-1 ring-primary-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule Section */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Clock size={14} className="text-slate-500" />
                <span>Link Scheduling (Optional)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Only display this link on your public bio during a specific campaign window.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="link-starts-at" className="block text-[11px] font-bold text-slate-600 mb-1">Starts At</label>
                  <input
                    id="link-starts-at"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label htmlFor="link-ends-at" className="block text-[11px] font-bold text-slate-600 mb-1">Ends At</label>
                  <input
                    id="link-ends-at"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <div>
                <span className="text-xs font-bold text-slate-900">Active Link</span>
                <p className="text-[11px] text-slate-500">Enable or disable without deleting.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                aria-label="Active Link"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  isActive ? 'bg-primary-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !url.trim()}
                className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
