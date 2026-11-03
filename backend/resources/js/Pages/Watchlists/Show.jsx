import React, { Fragment, useCallback, useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import ChannelCard from '@/Components/ChannelCard';
import Button from '@/Components/Button';
import EmptyState from '@/Components/EmptyState';
import WatchlistEditModal from '@/Components/WatchlistEditModal';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import Icon from '@/Components/Icon';
import { useToast } from '@/Contexts/ToastContext';
import { Menu, Transition } from '@headlessui/react';

const MOCK_WATCHLIST_CHANNELS = [
    {
        id: 1,
        name: 'instagram',
        followers: '699M',
        views: '44B',
        platform: 'instagram',
        imageUrl: 'https://i.pravatar.cc/150?u=instagram',
        description: 'Entertainment channel creating amusing, inspiring videos for a broad audience seeking a fun and engaging experience',
        topics: ['ur_smartmaker', 'niharshembekar', 'ktx.maiskates', 'ktxallison_', 'tarek.obh', 'The Hit Crew', 'Catman', 'Spirographshr', 'Deepak Swami']
    },
    {
        id: 5,
        name: 'kyliejenner',
        followers: '392M',
        views: '8.1B',
        platform: 'instagram',
        imageUrl: 'https://i.pravatar.cc/150?u=kylie',
        description: 'Entertainment and beauty content for those looking to stay connected with the creator while staying current on the latest trends and product releases',
        topics: ['Kylie Cosmetics', 'thacarterb', 'Ulta Beauty', 'Stas Karanikolaou', 'Victoria Villarroel', 'Mercedes', 'makeupbyariel', 'Ariel', 'Greece', 'Kylie']
    }
];

const menuItemClasses = (active, tone = 'default') => {
    const baseClasses = 'group flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';
    const toneClasses = tone === 'danger'
        ? active
            ? 'bg-danger-50 text-danger-700 focus-visible:ring-danger-300'
            : 'text-danger-600 focus-visible:ring-danger-300'
        : active
            ? 'bg-slate-100 text-slate-950 focus-visible:ring-primary-300'
            : 'text-slate-700 focus-visible:ring-primary-300';

    return `${baseClasses} ${toneClasses}`;
};

export default function WatchlistShow({ id }) {
    const [watchlist, setWatchlist] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isFallbackData, setIsFallbackData] = useState(false);
    const [isEditingChannels, setIsEditingChannels] = useState(false);
    const [pendingRemovedChannels, setPendingRemovedChannels] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Toast state management
    const { addToast } = useToast();

    const fetchWatchlist = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/api/watchlists/${id}`);
            setWatchlist(response.data);
            setIsFavorite(response.data.is_favorite || false);
            setIsFallbackData(false);
        } catch (error) {
            console.error('Error fetching watchlist:', error);
            setIsFallbackData(true);
            setIsFavorite(false);
            setWatchlist({
                id: Number(id),
                name: 'Fallback Watchlist',
                channels: MOCK_WATCHLIST_CHANNELS.map((channel) => ({
                    id: channel.id,
                    handle: channel.name,
                    name: channel.name,
                    followers_count: channel.followers,
                    platform: channel.platform,
                    profile_image_url: channel.imageUrl,
                    bio: channel.description,
                    topics: channel.topics || [],
                })),
            });
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchWatchlist();
    }, [fetchWatchlist]);

    const handleRename = async (id, newName) => {
        try {
            await axios.put(`/api/watchlists/${id}`, { name: newName });
            setWatchlist(prev => ({ ...prev, name: newName }));
            addToast(`Watchlist renamed to "${newName}"`, 'success');
        } catch (error) {
            console.error('Error renaming watchlist:', error);
            addToast('Failed to rename watchlist', 'error');
        }
    };

    const handleToggleFavorite = async () => {
        try {
            await axios.post(`/api/watchlists/${id}/favorite`);
            const newlyFavorited = !isFavorite;
            setIsFavorite(newlyFavorited);
            addToast(newlyFavorited ? 'Added to favorites' : 'Removed from favorites', 'info');
        } catch (error) {
            console.error('Error toggling favorite:', error);
            addToast('Failed to update favorites', 'error');
        }
    };

    const handleQueueRemove = (channelId) => {
        setPendingRemovedChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelId)) {
                newSet.delete(channelId);
            } else {
                newSet.add(channelId);
            }
            return newSet;
        });
    };

    const handleSaveEditing = async () => {
        if (pendingRemovedChannels.size === 0) {
            setIsEditingChannels(false);
            return;
        }

        setIsSaving(true);
        try {
            // Remove all pending channels sequentially
            for (const channelId of pendingRemovedChannels) {
                await axios.delete(`/api/watchlists/${id}/channels/${channelId}`);
            }

            const removedCount = pendingRemovedChannels.size;

            setWatchlist(prev => ({
                ...prev,
                channels: prev.channels.filter(c => !pendingRemovedChannels.has(c.id))
            }));

            setPendingRemovedChannels(new Set());
            setIsEditingChannels(false);
            addToast(`Successfully removed ${removedCount} ${removedCount === 1 ? 'channel' : 'channels'}`, 'success');
        } catch (error) {
            console.error('Error removing channels:', error);
            addToast('Failed to remove some channels', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEditing = () => {
        setPendingRemovedChannels(new Set());
        setIsEditingChannels(false);
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/watchlists/${id}`);
            // Note: Since we're redirecting immediately, the user won't see a toast here
            // To show a toast after redirect, you'd need to use inertia session flash data
            router.visit(route('channels'));
        } catch (error) {
            console.error('Error deleting watchlist:', error);
            addToast('Failed to delete watchlist', 'error');
        }
    };

    const channelCount = (watchlist?.channels || []).length;
    const pendingRemovalCount = pendingRemovedChannels.size;
    const watchlistTitle = watchlist?.name || 'Watchlist details';
    const channelCountLabel = isLoading
        ? 'Loading channels...'
        : `${channelCount} ${channelCount === 1 ? 'channel' : 'channels'}`;
    const bannerDescription = isLoading
        ? 'Loading watchlist channels...'
        : `${channelCountLabel} saved for competitor tracking and video discovery.`;

    return (
        <AuthenticatedLayout
            
            topbarTitle={"Content Library"}
            topbarDescription={isLoading ? 'Loading watchlist...' : `Watchlist: ${watchlistTitle} — ${bannerDescription}`}
             moduleTabsAction={(
                <button
                    type="button"
                    variant="secondary"
                    onClick={() => router.visit(route('channels', { filter_watchlist: id }))}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary-300 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                >
                        <Icon name="arrowLeft" size={4} />
                        Back to channels
                </button>
                )}
          

        >
            <Head title={watchlist?.name || 'Watchlist'} />

            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">
              

                {isFallbackData && (
                    <div className="flex items-start gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-800">
                        <Icon name="warning" size={4} className="mt-0.5 shrink-0 text-warning-600" />
                        <span className="min-w-0 break-words">Showing fallback data because watchlist API fetch failed.</span>
                    </div>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
                                    <Icon name="users" size={3.5} />
                                    {channelCountLabel}
                                </span>
                                {isEditingChannels && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-danger-200 bg-danger-50 px-2.5 py-1 text-xs font-bold text-danger-700">
                                        <Icon name="trash" size={3.5} />
                                        {pendingRemovalCount} selected
                                    </span>
                                )}
                            </div>
                            {isEditingChannels ? (
                                <div>
                                    <h2 className="text-base font-black tracking-tight text-slate-950">Edit watchlist channels</h2>
                                    <p className="mt-1 text-sm font-medium text-slate-500">
                                        {pendingRemovalCount > 0
                                            ? 'Review the channels marked for removal, then save changes.'
                                            : 'Select channels to remove from this watchlist.'}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <h2 className="text-base font-black tracking-tight text-slate-950">Watchlist workbench</h2>
                                    <p className="mt-1 text-sm font-medium text-slate-500">
                                        Explore videos from this group or manage the saved channels.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                            {isEditingChannels ? (
                                <>
                                    <Button
                                        className="w-full sm:w-auto"
                                        onClick={handleSaveEditing}
                                        disabled={isSaving}
                                        icon={<Icon name="check" />}
                                    >
                                        {isSaving ? 'Saving...' : 'Save changes'}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="w-full sm:w-auto"
                                        onClick={handleCancelEditing}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        className="w-full sm:w-auto"
                                        icon={<Icon name="play" />}
                                        onClick={() => router.visit(route('videos', { filter_watchlist: id }))}
                                    >
                                        Explore Watchlist Videos
                                    </Button>

                                    <Menu as="div" className="relative inline-block w-full text-left sm:w-auto">
                                        {({ open }) => (
                                            <>
                                                <Menu.Button
                                                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 sm:w-auto"
                                                    aria-label="Open watchlist actions"
                                                    aria-expanded={open}
                                                >
                                                    Actions
                                                    <Icon name="chevronDown" size={4} className="text-slate-400" strokeWidth={2.5} />
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
                                                    <Menu.Items className="absolute left-0 right-0 z-[180] mt-2 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 focus:outline-none sm:left-auto sm:w-64">
                                                        {watchlist?.channels?.length > 0 && (
                                                            <div className="pb-1">
                                                                <Menu.Item>
                                                                    {({ active }) => (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setIsEditingChannels(true)}
                                                                            className={menuItemClasses(active)}
                                                                        >
                                                                            <Icon name="users" size={4} className="text-slate-400 group-hover:text-slate-600" />
                                                                            Edit channels
                                                                        </button>
                                                                    )}
                                                                </Menu.Item>
                                                            </div>
                                                        )}
                                                        <div className="border-t border-slate-100 py-1">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleToggleFavorite}
                                                                        className={menuItemClasses(active)}
                                                                    >
                                                                        <Icon name="star" size={4} className={isFavorite ? 'fill-current text-amber-500' : 'text-slate-400 group-hover:text-slate-600'} />
                                                                        {isFavorite ? 'Remove from favorites' : 'Set as favorite'}
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIsEditModalOpen(true)}
                                                                        className={menuItemClasses(active)}
                                                                    >
                                                                        <Icon name="edit" size={4} className="text-slate-400 group-hover:text-slate-600" />
                                                                        Rename watchlist
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                        <div className="border-t border-slate-100 pt-1">
                                                            <Menu.Item>
                                                                {({ active }) => (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setShowDeleteConfirm(true);
                                                                        }}
                                                                        className={menuItemClasses(active, 'danger')}
                                                                    >
                                                                        <Icon name="trash" size={4} />
                                                                        Delete watchlist
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                    </Menu.Items>
                                                </Transition>
                                            </>
                                        )}
                                    </Menu>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                    {isLoading && (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-hidden="true">
                                <div className="flex animate-pulse items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-slate-200" />
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="h-3.5 w-2/3 rounded bg-slate-200" />
                                        <div className="h-3 w-1/3 rounded bg-slate-100" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {!isLoading && (watchlist?.channels || []).map((channel) => (
                        <div
                            key={channel.id}
                            className={pendingRemovedChannels.has(channel.id)
                                ? 'relative rounded-2xl opacity-60 grayscale ring-2 ring-danger-200 ring-offset-2 ring-offset-white transition-all'
                                : 'relative rounded-2xl transition-all'}
                        >
                            <ChannelCard
                                id={channel.id}
                                name={channel.handle || channel.name}
                                followers={channel.followers_count ? channel.followers_count.toLocaleString() : '0'}
                                platform={channel.platform}
                                imageUrl={channel.profile_image_url}
                                profileStatus={channel.apify_profile_run_status}
                                postStatus={channel.apify_post_run_status}
                                isPrivate={channel.is_private}
                                postsCount={channel.posts_count}
                                followingCount={channel.follows_count}
                                isVerified={channel.is_verified}
                                isBusiness={channel.is_business}
                                isEditing={isEditingChannels}
                                isPendingRemoval={pendingRemovedChannels.has(channel.id)}
                                onRemove={() => handleQueueRemove(channel.id)}
                            />
                        </div>
                    ))}

                    {!isLoading && channelCount === 0 && (
                        <EmptyState
                            className="col-span-full rounded-2xl xl:py-14"
                            title="No channels in this watchlist yet"
                            description="Add channels from the Channels page, then return here to compare them in one place."
                            icon={() => <Icon name="watchlist" className="h-7 w-7 text-primary-500" />}
                            action={(
                                <Button href={route('channels')} size="sm" icon={<Icon name="plus" />}>
                                    Add channels to watchlist
                                </Button>
                            )}
                        />
                    )}
                </div>
            </div>

            {watchlist && (
                <WatchlistEditModal
                    show={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onEdit={handleRename}
                    watchlist={watchlist}
                />
            )}

            <ConfirmDialog
                show={showDeleteConfirm}
                title="Delete Watchlist"
                message="Are you sure you want to delete this watchlist? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { handleDelete(); setShowDeleteConfirm(false); }}
                onCancel={() => setShowDeleteConfirm(false)}
            />

        </AuthenticatedLayout>
    );
}
