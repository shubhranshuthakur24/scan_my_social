import React from 'react';
import ChannelCard from '@/Components/ChannelCard';
import ChannelCardSkeleton from '@/Components/Skeletons/ChannelCardSkeleton';
import Button from '@/Components/Button';
import Icon from '@/Components/Icon';
import EmptyState from '@/Components/EmptyState';

function ChannelsEmptyIcon({ className = '' }) {
    return <Icon name="channel" className={className} />;
}

export default React.memo(function ChannelsGrid({
    gridRef,
    isLoading,
    filteredChannels,
    virtualizer,
    columnCount,
    rows,
    nextPageUrl,
    isLoadingMore,
    setIsLoadingMore,
    fetchChannels,
    openChannelDetails,
    onRequestUntrackChannel,
    isChannelActionLoading,
    channelActionChannelId,
    untrackRemaining = 0,
}) {
    const safeFilteredChannels = Array.isArray(filteredChannels) ? filteredChannels : [];
    const safeRows = Array.isArray(rows) ? rows : [];

    return (
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                    <ChannelCardSkeleton key={i} />
                ))
            ) : safeFilteredChannels.length > 0 ? (
                <>
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                            gridColumn: '1 / -1',
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualRow) => (
                            <div
                                key={virtualRow.key}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                                }}
                                className={`grid gap-5 ${columnCount === 3 ? 'grid-cols-3' : columnCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
                            >
                                {(safeRows[virtualRow.index] ?? []).map((channel) => {
                                    const isSyncing = channel.apify_profile_run_status === 'RUNNING' || channel.apify_post_run_status === 'RUNNING';

                                    return (
                                        <button
                                            key={channel.id}
                                            onClick={() => !isSyncing && !channel.is_private && openChannelDetails(channel)}
                                            className={`group/channelButton block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${isSyncing || channel.is_private ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                            disabled={isSyncing || channel.is_private}
                                            type="button"
                                        >
                                            <ChannelCard
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
                                                isEditing={!isSyncing && !channel.is_private && Number(untrackRemaining) > 0}
                                                onRemove={() => onRequestUntrackChannel?.(channel)}
                                                isPendingRemoval={isChannelActionLoading && channelActionChannelId === channel.id}
                                                className="group-focus-visible/channelButton:ring-2 group-focus-visible/channelButton:ring-primary-300 group-focus-visible/channelButton:ring-offset-2"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {nextPageUrl && (
                        <div className="col-span-full flex justify-center mt-6">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsLoadingMore(true);
                                    fetchChannels(nextPageUrl, true).finally(() => setIsLoadingMore(false));
                                }}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? 'Loading...' : 'Load More Channels'}
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <EmptyState
                    className="col-span-full animate-in fade-in duration-500 xl:py-14"
                    title="No channels found"
                    description="Add your first channel to start tracking performance. You can build watchlists after channels are added."
                    icon={ChannelsEmptyIcon}
                    iconContainerClassName="rounded-2xl border-accent-100 bg-accent-50 shadow-inner"
                    iconClassName="h-12 w-12 text-accent-500 xl:h-10 xl:w-10"
                    titleClassName="text-xl font-bold tracking-tight text-slate-800 xl:text-lg"
                    descriptionClassName="mx-auto mb-8 max-w-md font-medium text-slate-500"
                    action={(
                        <Button icon={<Icon name="plus" />} href={route('channels.create')}>
                            Add Your First Channel
                        </Button>
                    )}
                />
            )}
        </div>
    );
});
