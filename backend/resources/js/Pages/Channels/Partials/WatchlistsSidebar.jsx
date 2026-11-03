import React, { Fragment } from 'react';
import { Link } from '@inertiajs/react';
import Button from '@/Components/Button';
import Icon from '@/Components/Icon';
import { Heading } from '@/Components/Typography';
import WatchlistSkeleton from '@/Components/Skeleton/WatchlistSkeleton';
import { Menu, Transition } from '@headlessui/react';

export default React.memo(function WatchlistsSidebar({
    isLoading,
    watchlists,
    setIsCreateModalOpen,
    openEditWatchlist,
    handleDeleteWatchlist,
}) {
    const watchlistCount = watchlists.length;

    return (
        <div className="w-full shrink-0 lg:sticky lg:top-28 lg:w-80 lg:self-start space-y-6">
            <aside className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:max-h-[calc(100vh-140px)] lg:overflow-visible">
                <div className="mb-4 shrink-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Heading level={4} className="text-base">Your Watchlists</Heading>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                                {isLoading
                                    ? 'Loading watchlists...'
                                    : `${watchlistCount} ${watchlistCount === 1 ? 'list' : 'lists'}`}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        className="mt-3 w-full border-primary-100 bg-primary-50 text-primary-700 hover:bg-primary-100"
                        onClick={() => setIsCreateModalOpen(true)}
                        aria-label="Create new watchlist"
                        title="Create new watchlist"
                        icon={<Icon name="plus" className="h-4 w-4" />}
                    >
                        Create watchlist
                    </Button>
                </div>

                {isLoading ? (
                    <div className="scrollbar-custom flex-1 space-y-3 overflow-y-auto pr-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <WatchlistSkeleton key={i} />
                        ))}
                    </div>
                ) : watchlistCount > 0 ? (
                    <div className="scrollbar-custom pt-2 flex-1 overflow-y-auto pr-1 lg:overflow-x-visible">
                        <div className="space-y-3">
                            {watchlists.map((w) => {
                                const channelsCount = w.channels_count || 0;
                                const hasMoreChannels = channelsCount > 5;
                                const visibleChannels = (w.channels || []).slice(0, 5);

                                return (
                                    <div
                                        key={w.id}
                                        className={`group relative rounded-2xl border bg-white p-4 shadow-sm transition-all hover:z-20 hover:-translate-y-0.5 hover:shadow-md ${w.is_favorite ? 'border-warning-300 bg-warning-50/80' : 'border-slate-200'
                                            }`}
                                    >

                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={route('watchlists.show', { id: w.id })}
                                                        className="truncate rounded-lg text-sm font-bold tracking-tight text-slate-900 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                                    >
                                                        {w.name}
                                                    </Link>
                                                    {!!w.is_favorite && (
                                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning-100 text-warning-600 ring-1 ring-warning-200">
                                                            <Icon name="star" className="h-3 w-3 fill-current" />
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                    <Icon name="users" className="h-3 w-3" />
                                                    {channelsCount} {channelsCount === 1 ? 'channel' : 'channels'}
                                                </span>
                                            </div>

                                            <Menu as="div" className="relative z-30 inline-block text-left">
                                                <Menu.Button
                                                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                    aria-label="Watchlist options"
                                                    title="Watchlist options"
                                                >
                                                    <Icon name="moreHorizontal" className="h-4 w-4" />
                                                </Menu.Button>
                                                <Transition
                                                    as={Fragment}
                                                    enter="transition ease-out duration-100"
                                                    enterFrom="transform opacity-0 scale-95"
                                                    enterTo="transform opacity-100 scale-100"
                                                    leave="transition ease-in duration-75"
                                                    leaveFrom="transform opacity-100 scale-100"
                                                    leaveTo="transform opacity-0 scale-95"
                                                >
                                                    <Menu.Items className="absolute right-full top-0 z-[260] mr-2 w-36 origin-top-right divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white p-1 shadow-xl focus:outline-none">
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        openEditWatchlist(e, w);
                                                                    }}
                                                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${active ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
                                                                        }`}
                                                                >
                                                                    <Icon name="edit" className="h-3.5 w-3.5" />
                                                                    Rename
                                                                </button>
                                                            )}
                                                        </Menu.Item>
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleDeleteWatchlist(w.id);
                                                                    }}
                                                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300 ${active ? 'bg-danger-50 text-danger-700' : 'text-danger-600'
                                                                        }`}
                                                                >
                                                                    <Icon name="trash" className="h-3.5 w-3.5" />
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </Menu.Item>
                                                    </Menu.Items>
                                                </Transition>
                                            </Menu>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                {visibleChannels.map((channel) => (
                                                    <div
                                                        key={channel.id}
                                                        className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-white shadow-sm"
                                                    >
                                                        {channel.profile_image_url ? (
                                                            <img src={channel.profile_image_url} className="h-full w-full object-cover" alt="" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-400">
                                                                @
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/5" />
                                                    </div>
                                                ))}
                                                {hasMoreChannels && (
                                                    <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-50 text-[10px] font-bold text-slate-500 shadow-sm">
                                                        +{channelsCount - 5}
                                                    </div>
                                                )}
                                            </div>

                                            <Link
                                                href={route('watchlists.show', { id: w.id })}
                                                className="inline-flex items-center gap-1 rounded-lg text-xs font-bold text-primary-600 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                            >
                                                Open
                                                <Icon name="chevronRight" className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 px-5 py-10 text-center">
                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
                            <Icon name="watchlist" size={42} className="text-slate-300" />
                        </div>
                        <p className="text-base font-black tracking-tight text-slate-900">
                            Build your first watchlist
                        </p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                            Group related channels so comparisons and trend tracking stay focused.
                        </p>
                        <Button icon={<Icon name="plus" />} size="sm" className="mt-5 w-full" onClick={() => setIsCreateModalOpen(true)}>
                            Create watchlist
                        </Button>
                    </div>
                )}
            </aside>
        </div>
    );
});
