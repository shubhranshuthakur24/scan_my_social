'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { saveVideoFilter } from '@/lib/api/contentLibraryService';
import type { ContentLibraryFilters, SavedFilterItem } from '@/types/contentLibrary';

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ContentLibraryFilters;
  onSaved: (savedFilter: SavedFilterItem) => void;
}

export default function SaveFilterModal({
  isOpen,
  onClose,
  filters,
  onSaved,
}: SaveFilterModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this filter preset.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // Strip pagination fields from saved preset
      const cleanFilters: ContentLibraryFilters = { ...filters };
      delete cleanFilters.page;
      delete cleanFilters.per_page;

      const item = await saveVideoFilter(name.trim(), cleanFilters);
      onSaved(item);
      setName('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save filter preset.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Current Filter Preset">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Preset Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Breakout Reels (>2x views)"
            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 focus:border-primary-500 focus:outline-hidden"
          />
          <p className="mt-1.5 text-[11px] font-medium text-slate-400">
            This will save your current keyword search, outlier threshold, date range, and sort preferences.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Preset'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
