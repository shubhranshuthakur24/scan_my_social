import React from 'react';
import { Link } from '@inertiajs/react';
import Tooltip from '@/Components/Tooltip';
import Icon from '@/Components/Icon';
import SearchInput from '@/Components/SearchInput';
import Button from '@/Components/Button';

export default function ChannelsHeaderActions({
    availableChannels,
    searchRef,
    search,
    setSearch,
    searchLoading,
    showSearchDropdown,
    setShowSearchDropdown,
    searchResults,
    setSearchResults,
    normalizedSearchQuery,
    openChannelDetails,
    addToast,
    showFilter,
    setShowFilter,
    filterRef,
    selectedPlatforms,
    onRequestTrackChannel,
    onRequestUntrackChannel,
    isChannelActionLoading,
    channelActionChannelId,
    untrackLimit = 5,
    untrackRemaining = 5,
    recentlyTrackedIds = [],
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="order-2 sm:order-1 min-w-0 flex-1 relative z-[60]" ref={searchRef}>
                <div className="relative">
                    <SearchInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onClear={() => {
                            setSearch('');
                            setShowSearchDropdown(false);
                        }}

                        placeholder="Search channels... (e.g. @username or channel URL)"
                        aria-label="Search channels"
                        autoFocus
                        onEscape={() => setShowSearchDropdown(false)}
                        rightAdornment={
                            searchLoading ? (
                                <Icon name="refresh" className="w-4 h-4 text-slate-400 animate-spin" />
                            ) : null
                        }
                    />

                    {showSearchDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                            {searchResults.length > 0 ? (
                                <ul>
                                    {searchResults.map((c) => {
                                        const isActionInProgress = isChannelActionLoading && channelActionChannelId === c.id;
                                        const canShowUntrack = c.is_mine
                                            && Number(untrackRemaining) > 0
                                            && !recentlyTrackedIds.includes(c.id);

                                        return (
                                            <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                                    {c.profile_image_url ? (
                                                        <img src={c.profile_image_url} alt={c.handle} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <Icon name="user" className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    className="flex-1 min-w-0 text-left"
                                                    onClick={() => {
                                                        if (c.is_mine) {
                                                            setSearch('');
                                                            setShowSearchDropdown(false);
                                                            openChannelDetails(c);
                                                        }
                                                    }}
                                                    disabled={!c.is_mine}
                                                >
                                                    <p className="text-sm font-bold text-slate-800 truncate">@{c.handle}</p>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        {(c.followers_count || 0).toLocaleString()} followers | {c.platform}
                                                    </p>
                                                </button>

                                                {c.is_mine ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                                                            <Icon name="check" className="w-3 h-3" strokeWidth={3} />
                                                            Tracking
                                                        </span>
                                                        {canShowUntrack && (
                                                            <button
                                                                className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors ${isActionInProgress
                                                                        ? 'bg-warning-300 text-white cursor-not-allowed'
                                                                        : 'bg-warning-500 text-white hover:bg-warning-600'
                                                                    }`}
                                                                onClick={() => onRequestUntrackChannel?.(c)}
                                                                disabled={isActionInProgress}
                                                            >
                                                                {isActionInProgress ? (
                                                                    <>
                                                                        <Icon name="refresh" className="w-3 h-3 animate-spin" />
                                                                        Untracking...
                                                                    </>
                                                                ) : (
                                                                    'Untrack'
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors ${isActionInProgress
                                                                ? 'bg-primary-400 text-white cursor-not-allowed'
                                                                : 'bg-primary-500 text-white hover:bg-primary-600'
                                                            }`}
                                                        disabled={isActionInProgress}
                                                        onClick={() => onRequestTrackChannel?.(c)}
                                                    >
                                                        {isActionInProgress ? (
                                                            <>
                                                                <Icon name="refresh" className="w-3 h-3 animate-spin" />
                                                                Tracking...
                                                            </>
                                                        ) : (
                                                            '+ Track'
                                                        )}
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="px-4 py-4">
                                    <div className="rounded-2xl border border-slate-200 bg-linear-to-b from-slate-50 to-white p-5 text-center">
                                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                                            <Icon name="search" className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">
                                            No channels found for{' '}
                                            <span className="font-bold text-slate-900">"{normalizedSearchQuery || search.trim()}"</span>
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-slate-500">
                                            Add this creator to your tracked channels to start monitoring posts and performance.
                                        </p>

                                        <div className="mt-4 flex items-center justify-center gap-2">
                                            <Button
                                                icon={<Icon name="plus" />}
                                                size="sm"
                                                href={route('channels.create')}
                                                onClick={() => setShowSearchDropdown(false)}
                                            >
                                                Add channel
                                            </Button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearch('');
                                                    setShowSearchDropdown(false);
                                                }}
                                                className="inline-flex items-center justify-center rounded-brand-sm border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                            >
                                                Clear search
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Actions & Filters */}
            <div className="order-1 sm:order-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning-50 border border-warning-100/50">
                    <Icon name="info" className="w-3.5 h-3.5 text-warning-500" />
                    <p className="text-[11px] font-bold text-warning-700">
                        Untracks left: {untrackRemaining}/{untrackLimit}
                    </p>
                </div>



                <div className="relative" ref={filterRef}>
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className={`flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 transition-all ${showFilter ? 'border-primary-200 bg-slate-50 ring-2 ring-primary-500 shadow-inner' : 'shadow-sm hover:bg-slate-50'}`}
                        aria-label="Filter by platform"
                        aria-expanded={showFilter}
                    >
                        <div className="hidden items-center -space-x-1.5 overflow-hidden pr-1 sm:flex">
                            {['youtube', 'linkedin', 'instagram'].sort((a, b) => {
                                const aActive = selectedPlatforms.includes(a);
                                const bActive = selectedPlatforms.includes(b);
                                if (aActive && !bActive) return -1;
                                if (!aActive && bActive) return 1;
                                return 0;
                            }).map((p) => (
                                selectedPlatforms.includes(p) && (
                                    <div key={p} className="rounded-full bg-white flex items-center justify-center p-1 ring-2 ring-white z-10 border border-slate-100 shadow-sm transition-transform active:scale-95">
                                        {p === 'youtube' && <Icon name="youtube" size={6} />}
                                        {p === 'linkedin' && <Icon name="linkedin" size={6} />}
                                        {p === 'instagram' && <Icon name="instagram" size={6} />}
                                    </div>
                                )
                            ))}
                        </div>
                        <div className="flex items-center justify-center rounded-full border border-slate-100 bg-white p-1 shadow-sm sm:hidden">
                            <Icon name="instagram" size={8} />
                        </div>
                        <div className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${showFilter ? 'bg-primary-100 text-primary-600' : 'text-slate-400'}`}>
                            <Icon name="filter" className="w-4 h-4" strokeWidth={2.5} />
                        </div>
                    </button>

                    {showFilter && (
                        <div className="absolute right-0 top-full z-[100] mt-3 w-[min(22rem,calc(100vw-1.5rem))] rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-2xl ring-1 ring-slate-200 animate-in fade-in slide-in-from-top-2 duration-200 sm:w-[360px]">
                            <div className="mb-1">
                                <h3 className="text-base font-bold text-slate-900">Platform</h3>
                            </div>
                            <p className="text-sm text-slate-400 font-medium mb-6">Select which platforms to search</p>

                            <div className="flex flex-wrap gap-2.5">
                                {[
                                    { key: 'youtube', label: 'YouTube' },
                                    { key: 'linkedin', label: 'LinkedIn' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="relative">
                                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-dashed border-slate-200 bg-slate-50 text-slate-300 opacity-60 cursor-not-allowed select-none">
                                            <Icon name={key} size={20} />
                                            <span className="text-sm font-bold">{label}</span>
                                        </div>
                                        <span className="absolute -top-2 -right-1 text-[9px] font-bold tracking-wide uppercase bg-slate-100 text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">
                                            Soon
                                        </span>
                                    </div>
                                ))}

                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border bg-accent-50 border-accent-100 text-accent-600 shadow-sm cursor-default select-none">
                                    <Icon name="instagram" size={20} />
                                    <span className="text-sm font-bold">Instagram</span>
                                    <Icon name="check" className="w-3.5 h-3.5 ml-0.5" strokeWidth={3} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
