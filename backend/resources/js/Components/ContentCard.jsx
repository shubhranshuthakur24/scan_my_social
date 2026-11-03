import React from 'react';
import { Link } from '@inertiajs/react';
import Icon from './Icon';
import Tooltip from './Tooltip';
import { getPerformanceLabelIcon } from '@/constants/performanceLabels';

function formatNumber(num) {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function timeAgo(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
    return `${Math.floor(diff / 2592000)}mo ago`;
}

export default React.memo(function ContentCard({ post, selectable = false, isSelected = false, onSelectToggle, isEditing = false, isPendingRemoval = false, onRemove = null }) {
    const platform = post.platform || 'instagram';

    const platformIcons = {
        instagram: (
            <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full border-2 border-white shadow-md">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
            </div>
        ),
        linkedin: (
            <div className="w-8 h-8 flex items-center justify-center bg-[#0077B5] rounded-full border-2 border-white shadow-md">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
            </div>
        ),
        youtube: (
            <div className="w-8 h-8 flex items-center justify-center bg-red-600 rounded-full border-2 border-white shadow-md">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            </div>
        ),
    };

    const views = post.video_play_count || post.video_view_count || 0;
    const likes = post.likes_count || 0;
    const comments = post.comments_count || 0;

    // Calculate real engagement rate
    const engagementRateVal = views > 0 ? ((likes + comments) / views * 100) : 0;
    const engagementRate = engagementRateVal < 0.1 && engagementRateVal > 0 ? '<0.1%' : engagementRateVal.toFixed(1) + '%';

    // Use stored breakout_multiplier (set by OutlierDetectionService)
    // Fall back to computing from channel median_views for unprocessed posts
    const storedMultiplier = post.breakout_multiplier ?? null;
    const computedMultiplier = (() => {
        const postViews = Math.max(post.video_play_count || 0, post.video_view_count || 0);
        const medianViews = post.channel?.median_views || 0;
        return medianViews > 0 ? postViews / medianViews : null;
    })();
    const parsedOutlier = storedMultiplier ?? computedMultiplier;
    const outlierScore = parsedOutlier !== null ? `${Number(parsedOutlier).toFixed(1)}x` : '-';

    // Use stored breakout_label if available, otherwise derive from multiplier
    const labelColors = {
        'Explosive': {
            bg: 'bg-white/95 backdrop-blur-md shadow-sm border border-red-100',
            text: 'text-red-500',
            pill: 'bg-red-50 border-red-100/30 text-red-500',
            icon: getPerformanceLabelIcon('Explosive')
        },
        'Breakout': {
            bg: 'bg-white/95 backdrop-blur-md shadow-sm border border-accent-100',
            text: 'text-accent-600',
            pill: 'bg-accent-50 border-accent-100/30 text-accent-600',
            icon: getPerformanceLabelIcon('Breakout')
        },
        'Outlier': {
            bg: 'bg-white/95 backdrop-blur-md shadow-sm border border-primary-100',
            text: 'text-primary-600',
            pill: 'bg-primary-50 border-primary-100/30 text-primary-600',
            icon: getPerformanceLabelIcon('Outlier')
        },
        'Strong': {
            bg: 'bg-white/95 backdrop-blur-md shadow-sm border border-emerald-100',
            text: 'text-emerald-600',
            pill: 'bg-emerald-50 border-emerald-100/30 text-emerald-600',
            icon: getPerformanceLabelIcon('Strong')
        },
        'Normal': {
            bg: 'bg-white/90 backdrop-blur-md shadow-sm border border-slate-200/50',
            text: 'text-slate-600',
            pill: 'bg-emerald-50 border-emerald-100/30 text-emerald-600',
            icon: null
        },
        'Insufficient Data': {
            bg: 'bg-white/80 backdrop-blur-md shadow-sm border border-slate-200/50',
            text: 'text-slate-400',
            pill: 'bg-slate-50 border-slate-100/30 text-slate-400',
            icon: null
        },
    };
    const storedLabel = post.breakout_label;
    const outlierLabel = storedLabel && storedLabel !== 'Insufficient Data' && storedLabel !== 'Normal'
        ? { label: storedLabel, ...labelColors[storedLabel] }
        : null;
    const pillColor = (storedLabel && labelColors[storedLabel]?.pill) || 'bg-emerald-50 border-emerald-100/30 text-emerald-600';

    return (
        <div className={`flex flex-col gap-3 group rounded-xl ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : 'hover:bg-gray-200 pb-2'} ${isPendingRemoval ? 'opacity-50 grayscale transition-all' : 'transition-all'}`}>
            {/* Visual Container */}
            <Link
                href={`/Library/${post.id}`}
                aria-disabled={isEditing}
                onClick={(event) => {
                    if (isEditing) {
                        event.preventDefault();
                    }
                }}
                className={`relative aspect-[9/16] rounded-3xl overflow-hidden bg-slate-100 shadow-lg block ${isEditing ? 'cursor-default' : 'cursor-pointer'}`}
            >
                <img
                    src={post.display_url}
                    alt={post.caption}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />


                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Platform icon   top left */}
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
                    {platformIcons[platform]}
                    {post.projects && post.projects.length > 0 && (
                        <Tooltip
                            text={
                                <div className="flex flex-wrap items-center justify-center gap-1 z-50">
                                    <span>In</span>
                                    <span className="text-yellow-300 font-extrabold">
                                        {post.projects.length > 2
                                            ? `${post.projects.slice(0, 2).map(p => p.name).join(', ')} and ${post.projects.length - 2} more`
                                            : post.projects.map(p => p.name).join(', ')}
                                    </span>
                                    <span>Project{post.projects.length > 1 ? 's' : ''}</span>
                                </div>
                            }
                            position="bottom"
                            delay={300}
                        >
                            <div className="w-5 h-5 rounded-md bg-primary-600 flex items-center justify-center text-white shadow-lg border border-primary-400 group/project transition-all duration-300 hover:scale-110">
                                <Icon name="projects" size={12} strokeWidth={2.5} />
                            </div>
                        </Tooltip>
                    )}
                </div>

                {outlierLabel && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 transition-all duration-300 hover:scale-105">
                        <span className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full whitespace-nowrap ${outlierLabel.bg} ${outlierLabel.text}`}>
                            {outlierLabel.icon && <span className="text-[12px] leading-none">{outlierLabel.icon}</span>}
                            <span className="tracking-widest uppercase">{outlierLabel.label}</span>
                        </span>
                    </div>
                )}

                {/* Remove Button Overlay for Editing Mode */}
                {isEditing && (
                    <div className="absolute top-2 right-2 z-20">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onRemove) onRemove();
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl backdrop-blur-md border-2 ${isPendingRemoval
                                ? 'bg-slate-100 text-slate-600 border-slate-200 opacity-100 hover:bg-slate-200'
                                : 'bg-red-50 text-red-600 border-red-200 opacity-100 hover:bg-red-100'
                                }`}
                            title={isPendingRemoval ? "Undo remove" : "Remove video"}
                        >
                            {isPendingRemoval ? (
                                <Icon name="undo" size={16} strokeWidth={2.5} />
                            ) : (
                                <Icon name="trash" size={16} strokeWidth={2.5} />
                            )}
                        </button>
                    </div>
                )}

                {/* Selection Checkbox Overlay */}
                {selectable && !isEditing && (
                    <div className="absolute top-2 right-2 z-20">
                        <Tooltip text={isSelected ? "Deselect Video" : "Select Video"} position="left" delay={300}>
                            <div
                                className="cursor-pointer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (onSelectToggle) onSelectToggle(post.id);
                                }}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl backdrop-blur-md border-2 ${isSelected
                                    ? 'bg-primary-600 text-white border-primary-400 scale-110 shadow-primary-500/40'
                                    : 'bg-black/30 text-white border-white/40 hover:bg-black/50 hover:border-white/80 hover:scale-110'
                                    }`}>
                                    {isSelected ? (
                                        <Icon name="check" size={16} strokeWidth={2.5} className="animate-in zoom-in-50 duration-200" />
                                    ) : (
                                        <Icon name="plus" size={16} strokeWidth={2.5} />
                                    )}
                                </div>
                            </div>
                        </Tooltip>
                    </div>
                )}


                {/* Bottom Center Controls  */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <Tooltip text="Open Original Post" position="top">
                        <div
                            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 hover:bg-white/40 transition-all hover:scale-110 cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(post.url, '_blank', 'noopener,noreferrer');
                            }}
                        >
                            <Icon name="play" size={18} fill="currentColor" />
                        </div>
                    </Tooltip>
                </div>
            </Link>

            {/* Info Section */}
            <div className="px-1 space-y-1.5">
                <p className="text-[15px] font-bold text-slate-700 truncate leading-tight tracking-tight">
                    {post.caption || 'No caption'}
                </p>
                <div className="flex items-center justify-between text-[13px] mb-1">
                    <span className="text-slate-400 font-medium tracking-tight truncate mr-2">@{post.owner_username || post.channel?.handle}</span>
                    <span className="text-slate-400 text-[11px] font-medium whitespace-nowrap">{timeAgo(post.taken_at || post.created_at)}</span>
                </div>

                {/* Metric Pills */}
                <div className="flex items-center gap-1.5 pt-1">
                    <div className={`flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border shadow-sm ${pillColor}`}>
                        <Icon name="trendingUp" className="mb-0.5" />
                        <span className="text-[13px] font-black leading-none">{outlierScore}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg bg-primary-50 border border-primary-100/30 text-primary-600 shadow-sm">
                        <Icon name="eye" className="mb-0.5" />
                        <span className="text-[13px] font-black leading-none">{formatNumber(views)}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg bg-accent-50 border border-accent-100/30 text-accent-600 shadow-sm">
                        <Icon name="engagement" className="mb-0.5" />
                        <span className="text-[13px] font-black leading-none">{engagementRate}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
