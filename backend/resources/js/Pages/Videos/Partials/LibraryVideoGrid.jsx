import React from 'react';
import ContentCard from '@/Components/ContentCard';
import ContentCardSkeleton from '@/Components/ContentCardSkeleton';
import EmptyState from '@/Components/EmptyState';
import Icon from '@/Components/Icon';
import InsightsStrip from '@/Components/Library/InsightsStrip';
import OnboardingChecklist from '@/Components/Library/OnboardingChecklist';

function VideosEmptyIcon({ className = '' }) {
    return <Icon name="videos" className={className} />;
}

/**
 * Renders the library video grid, including:
 * – Loading skeleton state
 * – Onboarding checklist (zero channels)
 * – Empty state (channels exist but no posts match filters)
 * – InsightsStrip KPI bar
 * – Paginated video card grid
 * – Load More button
 *
 * @param {{
 *   loading: boolean,
 *   loadingMore: boolean,
 *   channelsCount: number,
 *   posts: object[],
 *   hasMore: boolean,
 *   selectedChannels: string[],
 *   selectedVideoSet: Set<number>,
 *   processingId: number|null,
 *   onToggleSelect: (id: number) => void,
 *   onApplyPreset: (preset: object) => void,
 *   onLoadMore: () => void,
 * }} props
 */
export default function LibraryVideoGrid({
    loading,
    loadingMore,
    channelsCount,
    posts = [],
    hasMore,
    selectedChannels = [],
    selectedVideoSet,
    processingId,
    onToggleSelect,
    onApplyPreset,
    onLoadMore,
}) {
    if (loading) {
        return (
            <div className="space-y-12 p-2 pt-4">
                <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {[...Array(5)].map((_, i) => (
                        <ContentCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 p-2 pt-4">
            {channelsCount === 0 ? (
                <OnboardingChecklist
                    channelsCount={channelsCount}
                    postsCount={posts.length}
                />
            ) : posts.length === 0 ? (
                <EmptyState
                    className="mt-8 xl:py-14"
                    title="No videos found"
                    description={
                        selectedChannels.length > 0
                            ? `We haven't saved any videos for ${
                                  selectedChannels.length === 1
                                      ? `@${selectedChannels[0]}`
                                      : 'these channels'
                              } yet.`
                            : 'Try adjusting your filters or search terms to find more content. Make sure you have added channels to track.'
                    }
                    icon={VideosEmptyIcon}
                    iconContainerClassName="rounded-3xl border-accent-100 bg-accent-50 shadow-inner"
                    iconClassName="h-12 w-12 text-accent-500 xl:h-10 xl:w-10"
                    titleClassName="text-xl font-bold tracking-tight text-slate-800 xl:text-lg"
                    descriptionClassName="mx-auto max-w-sm text-sm leading-relaxed text-slate-700"
                />
            ) : (
                <>
                    <InsightsStrip
                        posts={posts}
                        onApplyPreset={onApplyPreset}
                    />
                    <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className={
                                    processingId === post.id
                                        ? 'pointer-events-none opacity-70'
                                        : ''
                                }
                            >
                                <ContentCard
                                    post={post}
                                    selectable={true}
                                    isSelected={selectedVideoSet.has(post.id)}
                                    onSelectToggle={onToggleSelect}
                                />
                            </div>
                        ))}
                    </div>
                    {hasMore && (
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={onLoadMore}
                                disabled={loadingMore}
                                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-3 text-sm font-bold text-slate-900 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-slate-900"></div>
                                ) : (
                                    <svg
                                        className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-900"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2.5"
                                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                        />
                                    </svg>
                                )}
                                {loadingMore ? 'Loading more...' : 'Load more videos'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
