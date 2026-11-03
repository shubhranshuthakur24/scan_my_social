'use client';

import React, { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { formatNumber } from '@/lib/format';
import { normalizeChannelInput } from '@/lib/channelUtils';
import { searchChannels } from '@/lib/api/contentLibraryService';
import type { ChannelItem, ChannelDiscoveryDropdownState } from '@/types/contentLibrary';
import {
  Search,
  Plus,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';

export interface ChannelSearchDropdownProps {
  search: string;
  onSearchChange: (val: string) => void;
  onTrackChannel: (handle: string, channelId?: number) => Promise<void>;
  onUntrackChannel: (channel: ChannelItem) => Promise<void>;
  actionLoadingKey?: string | number | null;
}

export default function ChannelSearchDropdown({
  search,
  onSearchChange,
  onTrackChannel,
  onUntrackChannel,
  actionLoadingKey,
}: ChannelSearchDropdownProps) {
  const [dropdownState, setDropdownState] = useState<ChannelDiscoveryDropdownState>('idle');
  const [globalResults, setGlobalResults] = useState<ChannelItem[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setDropdownState('idle');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe global discovery lifecycle with Stale-Request Guard
  useEffect(() => {
    const { normalizedQuery, isInvalidUrl } = normalizeChannelInput(search);

    if (isInvalidUrl) {
      setDropdownState('invalid_url');
      setGlobalResults([]);
      return;
    }

    if (!normalizedQuery || normalizedQuery.length < 2) {
      setDropdownState('idle');
      setGlobalResults([]);
      return;
    }

    setDropdownState('loading');
    const requestId = ++activeRequestIdRef.current;

    const t = setTimeout(async () => {
      try {
        const results = await searchChannels(normalizedQuery);
        // Stale-request check: discard late results if a newer request was made
        if (requestId !== activeRequestIdRef.current) return;

        if (results.length > 0) {
          setGlobalResults(results);
          setDropdownState('results');
        } else {
          setGlobalResults([]);
          setDropdownState('zero_results');
        }
      } catch {
        if (requestId !== activeRequestIdRef.current) return;
        setGlobalResults([]);
        setDropdownState('api_error');
      }
    }, 300);

    return () => clearTimeout(t);
  }, [search]);

  const handleInputFocus = () => {
    const { normalizedQuery, isInvalidUrl } = normalizeChannelInput(search);
    if (isInvalidUrl) {
      setDropdownState('invalid_url');
    } else if (normalizedQuery.length >= 2) {
      if (globalResults.length > 0) {
        setDropdownState('results');
      } else {
        setDropdownState('loading');
        const requestId = ++activeRequestIdRef.current;
        searchChannels(normalizedQuery)
          .then((results) => {
            if (requestId !== activeRequestIdRef.current) return;
            if (results.length > 0) {
              setGlobalResults(results);
              setDropdownState('results');
            } else {
              setGlobalResults([]);
              setDropdownState('zero_results');
            }
          })
          .catch(() => {
            if (requestId !== activeRequestIdRef.current) return;
            setGlobalResults([]);
            setDropdownState('api_error');
          });
      }
    }
  };

  const { normalizedQuery: currentNormalizedQuery } = normalizeChannelInput(search);

  const handleTrackFromDropdown = async (handle: string, channelId?: number) => {
    await onTrackChannel(handle, channelId);
    // Optimistically update the dropdown row so it immediately reflects active tracking
    setGlobalResults((prev) =>
      prev.map((c) =>
        c.handle.toLowerCase() === handle.toLowerCase() || (channelId && c.id === channelId)
          ? { ...c, is_mine: true }
          : c
      )
    );
  };

  const handleUntrackFromDropdown = async (channel: ChannelItem) => {
    await onUntrackChannel(channel);
    setGlobalResults((prev) =>
      prev.map((c) => (c.id === channel.id ? { ...c, is_mine: false } : c))
    );
  };

  return (
    <div
      ref={searchContainerRef}
      className={`relative flex-1 max-w-md ${dropdownState !== 'idle' ? 'z-30' : ''}`}
    >
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={handleInputFocus}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setDropdownState('idle');
        }}
        placeholder="Search tracked channels or paste creator URL..."
        className="w-full rounded-xl border border-slate-200 pl-10 pr-9 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-hidden"
      />
      {dropdownState === 'loading' ? (
        <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-600 animate-spin" />
      ) : search ? (
        <button
          type="button"
          onClick={() => {
            onSearchChange('');
            setDropdownState('idle');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
        >
          <X size={14} />
        </button>
      ) : null}

      {/* Popover Floating Dropdown */}
      {dropdownState !== 'idle' && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
          {dropdownState === 'invalid_url' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-center space-y-1">
              <p className="text-xs font-bold text-amber-900">Non-profile URL detected</p>
              <p className="text-[11px] text-amber-700 font-medium">
                Please enter an Instagram creator profile link or handle, not a post or reel link.
              </p>
            </div>
          )}

          {dropdownState === 'loading' && (
            <div className="p-4 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-primary-600" />
              <span>Searching global creator catalog...</span>
            </div>
          )}

          {dropdownState === 'api_error' && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center space-y-1">
              <p className="text-xs font-bold text-rose-800">Search request failed</p>
              <p className="text-[11px] text-rose-600 font-medium">
                Unable to reach creator catalog. You can still track manually using the button.
              </p>
            </div>
          )}

          {dropdownState === 'zero_results' && (
            <div className="p-4 text-center space-y-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900">
                  No indexed creator found for <span className="text-primary-600 font-mono">@{currentNormalizedQuery}</span>
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Track this handle to index their profile, posts, and outlier engagement automatically.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => handleTrackFromDropdown(currentNormalizedQuery)}
                disabled={actionLoadingKey === currentNormalizedQuery}
              >
                {actionLoadingKey === currentNormalizedQuery ? (
                  <>
                    <RefreshCw size={12} className="animate-spin mr-1" />
                    Tracking @{currentNormalizedQuery}...
                  </>
                ) : (
                  `Track @${currentNormalizedQuery}`
                )}
              </Button>
            </div>
          )}

          {dropdownState === 'results' && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1">
                <span>Global Creator Discovery</span>
                <span>{globalResults.length} {globalResults.length === 1 ? 'Match' : 'Matches'}</span>
              </div>

              <ul className="divide-y divide-slate-100">
                {globalResults.map((item) => {
                  const isLoadingAction = actionLoadingKey === item.id || actionLoadingKey === item.handle;

                  return (
                    <li
                      key={item.id || item.handle}
                      className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.profile_image_url ? (
                          <img
                            src={item.profile_image_url}
                            alt={item.handle}
                            className="h-9 w-9 rounded-xl object-cover ring-1 ring-primary-100 shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">
                            @{item.handle.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.name || `@${item.handle}`}
                            </p>
                            <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.2 rounded-md">
                              @{item.handle}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {formatNumber(item.followers_count || 0)} followers • <span className="capitalize">{item.platform || 'Instagram'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {item.is_mine ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                              <CheckCircle2 size={12} />
                              <span>Tracking</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUntrackFromDropdown(item)}
                              disabled={isLoadingAction}
                              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:underline px-1 cursor-pointer"
                            >
                              {isLoadingAction ? 'Untracking...' : 'Untrack'}
                            </button>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => handleTrackFromDropdown(item.handle, item.id)}
                            disabled={isLoadingAction}
                          >
                            {isLoadingAction ? (
                              <>
                                <RefreshCw size={10} className="animate-spin mr-1" />
                                Tracking...
                              </>
                            ) : (
                              '+ Track'
                            )}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
