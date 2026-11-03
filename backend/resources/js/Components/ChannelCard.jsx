import React from 'react';
import { PlatformIcon } from '@/Components/PlatformIcons';
import Tooltip from '@/Components/Tooltip';
import Icon from '@/Components/Icon';

// Note Bolt: Wrapped in React.memo to prevent unnecessary re-renders.
// This component is list-rendered on the Channels page, which polls every 10s.
// Without memoization, every card re-renders on each poll even if its props
// haven't changed   React.memo's shallow equality check skips those renders.
const ChannelCard = ({
    name,
    followers,
    imageUrl,
    platform = 'instagram',
    className = '',
    profileStatus = 'COMPLETED',
    postStatus = 'COMPLETED',
    isPrivate = false,
    postsCount = null,
    followingCount = null,
    isVerified = false,
    isBusiness = false,
    isEditing = false,
    isPendingRemoval = false,
    onRemove = null
}) => {
    const isSyncing = profileStatus === 'RUNNING' || postStatus === 'RUNNING';
    const isFailed = profileStatus === 'FAILED' || postStatus === 'FAILED';
    const isPending = !profileStatus || profileStatus === 'PENDING' || profileStatus === 'QUEUED' || postStatus === 'PENDING' || postStatus === 'QUEUED';

    const getTooltipText = () => {
        if (isPrivate) return "This is a private account. We cannot fetch posts or analytics for private profiles.";
        if (isSyncing) return "This may take a while. You can come back later.";
        if (isPending) return "Waiting in queue. Processing will start shortly!";
        if (isFailed) return "We couldn't find this account. Verify the handle and try again.";
        return null;
    };

    const tooltipText = getTooltipText();

    const cardContent = (
        <div className={`group relative flex h-[72px] w-full items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all hover:border-primary-200 hover:shadow-md ${className} ${isFailed || isPrivate ? 'opacity-75' : ''} ${isSyncing || isPrivate ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            {isPrivate && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px]">
                    <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 shadow-lg">
                        <Icon name="lock" className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Private</span>
                    </div>
                </div>
            )}

            {isSyncing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 p-4 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest animate-pulse">Syncing...</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 text-center leading-tight">
                            Processing updates...
                        </p>
                    </div>
                </div>
            )}

            {isFailed && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-danger-50/30 backdrop-blur-[0.5px]">
                    <div className="flex items-center gap-2 rounded-full border border-danger-500 bg-danger-600 px-3 py-1.5 shadow-md">
                        <Icon name="x" className="w-3 h-3 text-white" strokeWidth={3} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Invalid</span>
                    </div>
                </div>
            )}

            {isPending && !isSyncing && !isFailed && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/55 backdrop-blur-[0.5px]">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Queued</span>
                    </div>
                </div>
            )}

            <div className={`relative shrink-0 flex items-center justify-center ${isSyncing ? 'animate-pulse grayscale-[0.5]' : ''} ${isFailed ? 'grayscale' : ''}`}>
                <div className="w-12 h-12 overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200 rounded-full bg-slate-100 flex-shrink-0">
                    {imageUrl ? (
                        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-black uppercase text-xl">
                            {name?.charAt(0)}
                        </div>
                    )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 z-20">
                    <PlatformIcon
                        platform={platform}
                        size={16}
                        className="w-4 h-4"
                        padding="p-1"
                    />
                </div>
            </div>

            <div className={`flex-1 min-w-0 min-h-0 flex flex-col justify-center ${isFailed ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-1.5">
                    <h4 className="truncate text-sm font-black text-slate-900">{name}</h4>
                    {isBusiness && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded-md tracking-tighter shrink-0 border border-slate-200">Biz</span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-bold text-slate-400 capitalize">{platform}</span>
                    {isVerified && (
                        <Icon name="verified" className="w-3.5 h-3.5" />
                    )}
                    {isPrivate && (
                        <>
                            <div className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
                            <span className="text-[11px] font-bold text-amber-500">Private</span>
                        </>
                    )}
                </div>
            </div>

            {isEditing && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isPendingRemoval) return;
                        if (onRemove) onRemove();
                    }}
                    className={`absolute right-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300 focus-visible:ring-offset-2 ${isPendingRemoval
                        ? 'bg-slate-100 text-slate-600 opacity-100 hover:bg-slate-200'
                        : 'bg-danger-50 text-danger-600 opacity-100 hover:bg-danger-100'
                        }`}
                    disabled={isPendingRemoval}
                    aria-label={isPendingRemoval ? "Undo remove" : "Remove channel"}
                    title={isPendingRemoval ? "Undo remove" : "Remove channel"}
                >
                    {isPendingRemoval ? (
                        <Icon name="refresh" className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                    ) : (
                        <Icon name="trash" className="w-4 h-4" strokeWidth={2.5} />
                    )}
                </button>
            )}
        </div>
    );

    if (tooltipText) {
        return (
            <Tooltip text={tooltipText} className="!flex w-full h-full items-center">
                {cardContent}
            </Tooltip>
        );
    }

    return cardContent;
};

export default React.memo(ChannelCard);
