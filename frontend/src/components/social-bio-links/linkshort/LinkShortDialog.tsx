'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ShortLink } from '@/lib/api/linkShortService';
import { AlertTriangle, Unlock, Sparkles } from 'lucide-react';

interface LinkShortDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    destination_url: string;
    code?: string | null;
    description?: string | null;
    is_active?: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  }) => Promise<void>;
  editingLink?: ShortLink | null;
  isSubmitting: boolean;
}

interface LinkShortDialogFormProps {
  editingLink?: ShortLink | null;
  onSubmit: LinkShortDialogProps['onSubmit'];
  onClose: () => void;
  isSubmitting: boolean;
}

function LinkShortDialogForm({
  editingLink,
  onSubmit,
  onClose,
  isSubmitting,
}: LinkShortDialogFormProps) {
  const isEditMode = Boolean(editingLink);

  const [title, setTitle] = useState(editingLink?.title || '');
  const [destinationUrl, setDestinationUrl] = useState(editingLink?.destination_url || '');
  const [code, setCode] = useState(editingLink?.code || '');
  const [allowCodeChange, setAllowCodeChange] = useState(!editingLink);
  const [description, setDescription] = useState(editingLink?.description || '');
  const [isActive, setIsActive] = useState(editingLink ? editingLink.is_active : true);
  const [startsAt, setStartsAt] = useState(editingLink?.starts_at || '');
  const [endsAt, setEndsAt] = useState(editingLink?.ends_at || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side quick validations
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (!destinationUrl.trim()) {
      setError('Destination URL is required.');
      return;
    }

    if (!/^https?:\/\//i.test(destinationUrl.trim())) {
      setError('Destination URL must start with http:// or https://');
      return;
    }

    if (isEditMode && allowCodeChange && code.trim()) {
      if (!/^[a-z0-9-]+$/i.test(code.trim())) {
        setError('Alias can only contain letters, numbers, and dashes.');
        return;
      }
    } else if (!isEditMode && code.trim()) {
      if (!/^[a-z0-9-]+$/i.test(code.trim())) {
        setError('Alias can only contain letters, numbers, and dashes.');
        return;
      }
    }

    try {
      await onSubmit({
        title: title.trim(),
        destination_url: destinationUrl.trim(),
        code: !isEditMode || allowCodeChange ? (code.trim() ? code.trim().toLowerCase() : null) : undefined,
        description: description.trim() || null,
        is_active: isActive,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while saving the short link.';
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
        >
          <AlertTriangle size={15} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Title */}
      <div>
        <label htmlFor="shortlink-title" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 cursor-pointer">
          Title <span className="text-rose-500">*</span>
        </label>
        <input
          id="shortlink-title"
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Summer Course Launch"
          className="w-full px-3.5 py-2.5 min-h-[44px] text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 text-slate-800 transition"
        />
      </div>

      {/* 2. Destination URL */}
      <div>
        <label htmlFor="shortlink-destination-url" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 cursor-pointer">
          Destination URL <span className="text-rose-500">*</span>
        </label>
        <input
          id="shortlink-destination-url"
          type="url"
          required
          maxLength={2048}
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="https://example.com/special-offer"
          className="w-full px-3.5 py-2.5 min-h-[44px] text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 text-slate-800 transition"
        />
        <p className="mt-1 text-[11px] text-slate-400">Must start with http:// or https://</p>
      </div>

      {/* 3. Short Code / Alias */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="shortlink-code" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer">
            Short Link Alias
          </label>
          {isEditMode && !allowCodeChange && (
            <button
              type="button"
              onClick={() => setAllowCodeChange(true)}
              aria-label="Unlock alias to edit"
              className="min-h-[44px] inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold text-amber-600 hover:text-amber-700 transition focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none rounded-lg"
            >
              <Unlock size={12} />
              <span>Change Alias</span>
            </button>
          )}
        </div>

        <div className="relative flex items-center">
          <span className="absolute left-3 text-xs font-bold text-slate-400 select-none">/s/</span>
          <input
            id="shortlink-code"
            type="text"
            maxLength={80}
            disabled={isEditMode && !allowCodeChange}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={isEditMode ? editingLink?.code : 'custom-alias (optional)'}
            className={`w-full pl-9 pr-3.5 py-2.5 min-h-[44px] text-xs rounded-xl border transition ${
              isEditMode && !allowCodeChange
                ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-white border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 text-slate-800'
            }`}
          />
        </div>

        {!isEditMode && (
          <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles size={11} className="text-primary-500" />
            <span>Leave blank to automatically generate a unique 7-character code.</span>
          </p>
        )}

        {isEditMode && allowCodeChange && (
          <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p>Warning: Changing this alias will permanently break any links that have already been shared, printed, or sent in campaigns.</p>
              {code && (
                <p className="mt-1 font-mono text-[10px] text-amber-900 font-black">
                  New URL Preview: /s/{code.toLowerCase()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Scheduling: Starts At & Ends At */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label htmlFor="shortlink-starts-at" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 cursor-pointer">
            Starts At (Optional)
          </label>
          <input
            id="shortlink-starts-at"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full px-3.5 py-2.5 min-h-[44px] text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 text-slate-800 transition"
          />
        </div>

        <div>
          <label htmlFor="shortlink-ends-at" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 cursor-pointer">
            Ends At (Optional)
          </label>
          <input
            id="shortlink-ends-at"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full px-3.5 py-2.5 min-h-[44px] text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 text-slate-800 transition"
          />
        </div>
      </div>

      {/* 5. Internal Description */}
      <div>
        <label htmlFor="shortlink-description" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 cursor-pointer">
          Internal Note / Description
        </label>
        <textarea
          id="shortlink-description"
          rows={2}
          maxLength={240}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add an internal note about this campaign or placement..."
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 text-slate-800 transition"
        />
      </div>

      {/* 6. Active Toggle */}
      <label htmlFor="shortlink-is-active" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50 cursor-pointer min-h-[44px]">
        <input
          id="shortlink-is-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-5 w-5 cursor-pointer"
        />
        <div>
          <span className="text-xs font-bold text-slate-800 block">Link is Active</span>
          <span className="text-[11px] text-slate-500 block">
            When disabled, visitors will receive a 404 and will not be redirected.
          </span>
        </div>
      </label>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting} className="min-h-[44px] px-4 font-bold">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="min-h-[44px] px-4 font-bold">
          {isSubmitting ? (isEditMode ? 'Saving...' : 'Creating...') : isEditMode ? 'Save Changes' : 'Create Link'}
        </Button>
      </div>
    </form>
  );
}

export default function LinkShortDialog({
  isOpen,
  onClose,
  onSubmit,
  editingLink,
  isSubmitting,
}: LinkShortDialogProps) {
  const isEditMode = Boolean(editingLink);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Short Link' : 'Create Short Link'}
      description={
        isEditMode
          ? 'Update the destination URL, internal description, or scheduled window.'
          : 'Generate a trackable /s short link with optional custom alias.'
      }
      maxWidth="lg"
    >
      <LinkShortDialogForm
        key={editingLink ? editingLink.id : 'new'}
        editingLink={editingLink}
        onSubmit={onSubmit}
        onClose={onClose}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
}
