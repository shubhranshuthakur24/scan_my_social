'use client';

import React, { useEffect, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { formatNumber } from '@/lib/format';
import { searchChannels } from '@/lib/api/contentLibraryService';
import type { ChannelItem } from '@/types/contentLibrary';
import { ChevronDown } from 'lucide-react';

const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
];

export interface TrackChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrack: (platform: string, handle: string) => Promise<void>;
}

export default function TrackChannelModal({
  isOpen,
  onClose,
  onTrack,
}: TrackChannelModalProps) {
  const [newHandle, setNewHandle] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Autocomplete suggestions
  const [searchResults, setSearchResults] = useState<ChannelItem[]>([]);
  const [, setIsSearchingGlobal] = useState(false);
  const activeRequestIdRef = useRef(0);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setNewHandle('');
      setModalError(null);
      setSearchResults([]);
    }
  }, [isOpen]);

  // Debounced autocomplete suggestions with Stale-Request Guard
  useEffect(() => {
    if (!newHandle.trim() || newHandle.length < 2) {
      setSearchResults([]);
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    const t = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const results = await searchChannels(newHandle.trim());
        if (requestId !== activeRequestIdRef.current) return;
        setSearchResults(results.slice(0, 5));
      } catch {
        if (requestId !== activeRequestIdRef.current) return;
        setSearchResults([]);
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsSearchingGlobal(false);
        }
      }
    }, 350);

    return () => clearTimeout(t);
  }, [newHandle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle.trim()) return;

    setTrackingLoading(true);
    setModalError(null);

    try {
      await onTrack(selectedPlatform, newHandle.trim());
      onClose();
      setNewHandle('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to track competitor channel.';
      setModalError(msg);
    } finally {
      setTrackingLoading(false);
    }
  };

  const selectedPlatformLabel =
    PLATFORM_OPTIONS.find((p) => p.id === selectedPlatform)?.label || selectedPlatform;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Track New Competitor Channel">
      <form onSubmit={handleSubmit} className="space-y-4">
        {modalError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {modalError}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Platform</label>
          <Dropdown className="w-full">
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-primary-500 focus:outline-hidden transition-colors cursor-pointer text-left"
              >
                <span className="capitalize">{selectedPlatformLabel}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="left" width="w-full">
              {PLATFORM_OPTIONS.map((p) => (
                <Dropdown.Item
                  key={p.id}
                  selected={selectedPlatform === p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                >
                  {p.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Creator @handle or Profile Link
          </label>
          <input
            type="text"
            required
            value={newHandle}
            onChange={(e) => setNewHandle(e.target.value)}
            placeholder="e.g. @tech_creators or instagram.com/tech_creators"
            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 focus:border-primary-500 focus:outline-hidden"
          />
        </div>

        {/* Autocomplete Suggestions from Global Channels */}
        {searchResults.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Matching Database Profiles
            </span>
            {searchResults.map((res) => (
              <div
                key={res.id}
                onClick={() => setNewHandle(res.handle)}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:border-primary-400 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  {res.profile_image_url ? (
                    <img
                      src={res.profile_image_url}
                      alt={res.handle}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-[10px]">
                      @{res.handle.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-800">@{res.handle}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {formatNumber(res.followers_count || 0)} followers
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={trackingLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={trackingLoading}>
            {trackingLoading ? 'Starting Tracker...' : 'Track Competitor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
