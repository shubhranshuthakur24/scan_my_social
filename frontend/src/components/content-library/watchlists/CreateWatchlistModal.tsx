'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export interface CreateWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<void>;
}

export default function CreateWatchlistModal({
  isOpen,
  onClose,
  onCreate,
}: CreateWatchlistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setModalError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setModalError(null);

    try {
      await onCreate(name.trim(), description.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create watchlist.';
      setModalError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Watchlist">
      <form onSubmit={handleSubmit} className="space-y-4">
        {modalError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {modalError}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Watchlist Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AI SaaS Competitors"
            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 focus:border-primary-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Top creators posting AI automation workflows"
            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 focus:border-primary-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create Watchlist'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
