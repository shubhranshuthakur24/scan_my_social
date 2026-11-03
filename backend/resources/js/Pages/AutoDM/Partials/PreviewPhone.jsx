import {
    BatteryFull,
    Bookmark,
    ChevronLeft,
    Flame,
    Heart,
    Laugh,
    MessageSquare,
    MoreHorizontal,
    Send,
    Signal,
    Star,
    ThumbsUp,
    User,
    Wifi,
    Zap,
} from 'lucide-react';

export default function PreviewPhone({ preview }) {
    const accountProfileImageUrl = String(preview.accountProfileImageUrl || '').trim();
    const playback = preview.simulation?.playback || {};
    const timelineSteps = Array.isArray(playback.timelineSteps) ? playback.timelineSteps : [];
    const hasTimeline = timelineSteps.length > 0;
    const gateByTimeline = hasTimeline && Boolean(playback.isRunning);
    const hasStepReached = (type) => timelineSteps.some((step) =>
        step.type === type && (step.status === 'active' || step.status === 'done' || step.status === 'skipped')
    );
    const simulatedCtaResponseText = String(preview.simulation?.result?.ctaResponseText || '').trim();
    const ctaEchoText = simulatedCtaResponseText || preview.ctaLabel;
    const showOpeningMessageInDm = preview.openingEnabled && (!gateByTimeline || hasStepReached('opening_message'));
    const showCtaEchoInDm = Boolean(ctaEchoText) && (!gateByTimeline || hasStepReached('cta_response'));
    const showAskToFollowInDm = preview.askToFollowEnabled && (!gateByTimeline || hasStepReached('ask_to_follow'));
    const showReplyImageInDm = preview.replyMedia && (!gateByTimeline || hasStepReached('reply_image'));
    const showReplyTextInDm = !preview.replyMedia
        && (preview.replyBody || preview.replyLink)
        && (!gateByTimeline || hasStepReached('reply_text'));
    const showReplyBodyInMediaCard = preview.replyBody && (!gateByTimeline || hasStepReached('reply_text'));
    const showReplyLinkInMediaCard = preview.replyLink && (!gateByTimeline || hasStepReached('reply_text'));
    const showReplyLinkInTextCard = preview.replyLink && (!gateByTimeline || hasStepReached('reply_text'));
    const showPublicReplyInThread = preview.showPublicReplyInPreview && (!gateByTimeline || hasStepReached('public_reply'));
    const isStoryTrigger = preview.triggerType === 'story';
    return (
        <aside className="order-2 xl:order-1 h-fit xl:sticky xl:top-24 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-700">Preview</h4>
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    {preview.sceneLabel}
                </span>
            </div>

            <div className="mx-auto w-full max-w-85">
                <div className="relative mx-auto w-[300px]">
                    <div className="absolute -left-1 top-16 h-8 w-[3px] rounded-full bg-[#1f1f1f]/95" />
                    <div className="absolute -left-1 top-28 h-12 w-[3px] rounded-full bg-[#1f1f1f]/95" />
                    <div className="absolute -left-1 top-44 h-16 w-[3px] rounded-full bg-[#1f1f1f]/95" />
                    <div className="absolute -right-[4px] top-44 h-20 w-[3px] rounded-full bg-[#1f1f1f]/95" />

                    <div className="rounded-[3.1rem] bg-linear-to-b from-[#0f0f0f] via-[#050505] to-[#1a1a1a] p-[3px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
                        <div className="rounded-[2.9rem] bg-linear-to-b from-[#141414] to-[#030303] p-[7px]">
                            <div className="relative h-[620px] overflow-hidden rounded-[2.45rem] border   bg-black">
                                <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-black px-5 py-1">
                                    <div className="h-1.5 w-20 rounded-full bg-slate-900/80" />
                                </div>

                                <div className="flex items-center justify-between px-4 pt-4 text-[10px] font-semibold text-slate-300">
                                    <span>9:41</span>
                                    <span className="inline-flex items-center gap-1">
                                        <Signal className="h-3 w-3" />
                                        <Wifi className="h-3 w-3" />
                                        <BatteryFull className="h-3 w-3" />
                                    </span>
                                </div>
                                <div className="px-3 pb-3 pt-2">
                                    {preview.scene === 'dm' ? (
                                        <>
                                            <div className="flex items-center justify-between pb-3 text-slate-200">
                                                <ChevronLeft className="h-4 w-4" />
                                                <div className="min-w-0 text-center">
                                                    <p className="truncate text-[11px] font-semibold text-slate-100">@{preview.handle}</p>
                                                </div>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </div>

                                            <div className="flex h-[520px] flex-col rounded-xl border border-slate-800 bg-black/80 p-2.5">
                                                <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
                                                    <div className="flex min-h-full flex-col justify-end space-y-2 text-[11px]">
                                                        {showAskToFollowInDm && (
                                                            <div className="max-w-[90%] rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
                                                                <p className="whitespace-pre-wrap break-words">
                                                                    {preview.askToFollowMessage || 'Please follow to unlock the DM.'}
                                                                </p>
                                                                <div className="mt-2 space-y-1">
                                                                    <button
                                                                        type="button"
                                                                        className="w-full rounded-full bg-slate-700 px-3 py-1.5 text-center text-[10px] font-semibold text-slate-200"
                                                                    >
                                                                        {preview.askToFollowProfileButton || 'Visit Profile'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="w-full rounded-full bg-primary-600 px-3 py-1.5 text-center text-[10px] font-semibold text-white"
                                                                    >
                                                                        {preview.askToFollowConfirmButton || 'Yes, I follow'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {showOpeningMessageInDm && (
                                                            <div className="max-w-[90%] rounded-2xl bg-slate-800 px-3 py-2 text-slate-100">
                                                                <p className="whitespace-pre-wrap break-words">{preview.openingMessage}</p>
                                                                {preview.ctaLabel && (
                                                                    <button
                                                                        type="button"
                                                                        className="mt-2 w-full rounded-full bg-slate-700 px-3 py-1.5 text-center text-[10px] font-semibold text-slate-200"
                                                                    >
                                                                        {preview.ctaLabel}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {showCtaEchoInDm && (
                                                            <div className="ml-auto max-w-[70%] rounded-2xl bg-primary-600 px-3 py-2 text-right text-white">
                                                                {ctaEchoText}
                                                            </div>
                                                        )}

                                                        {showReplyImageInDm && (
                                                            <div className="max-w-[90%] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                                                                <img
                                                                    src={preview.replyMedia}
                                                                    alt="AutoDm preview media"
                                                                    className="h-40 w-full object-cover"
                                                                />
                                                                {(showReplyBodyInMediaCard || showReplyLinkInMediaCard) && (
                                                                    <div className="space-y-1 px-3 py-2 text-slate-100">
                                                                        {showReplyBodyInMediaCard && (
                                                                            <p className="whitespace-pre-wrap break-words">{preview.replyBody}</p>
                                                                        )}
                                                                        {showReplyLinkInMediaCard && (
                                                                            <button
                                                                                type="button"
                                                                                className="mt-1 w-full rounded-full bg-slate-700 px-3 py-1.5 text-center text-[10px] font-semibold text-slate-200"
                                                                            >
                                                                                {preview.replyLinkLabel || 'Open this link'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {showReplyTextInDm && (
                                                            <div className="max-w-[90%] rounded-2xl bg-slate-800 px-3 py-2 text-slate-100">
                                                                {preview.replyBody && (
                                                                    <p className="whitespace-pre-wrap break-words">{preview.replyBody}</p>
                                                                )}
                                                                {showReplyLinkInTextCard && (
                                                                    <button
                                                                        type="button"
                                                                        className="mt-2 w-full rounded-full bg-slate-700 px-3 py-1.5 text-center text-[10px] font-semibold text-slate-200"
                                                                    >
                                                                        {preview.replyLinkLabel || 'Open this link'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {!showReplyImageInDm && !showReplyTextInDm && !showOpeningMessageInDm && (
                                                            <div className="max-w-[90%] rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400">
                                                                Add message text in Send AutoDm to preview your DM response.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex items-center gap-2 px-1">
                                                    {accountProfileImageUrl ? (
                                                        <img
                                                            src={accountProfileImageUrl}
                                                            alt="Account profile"
                                                            className="h-5 w-5 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                                                            <User className="h-3 w-3" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] text-slate-500">
                                                        Message...
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between pb-3 text-slate-200">
                                                <ChevronLeft className="h-4 w-4" />
                                                <p className="text-xs font-semibold tracking-wide">{isStoryTrigger ? 'STORIES' : 'POSTS'}</p>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </div>

                                            <div className="flex items-center gap-2 pb-3">
                                                {accountProfileImageUrl ? (
                                                    <img
                                                        src={accountProfileImageUrl}
                                                        alt="Account profile"
                                                        className="h-6 w-6 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                                                        <User className="h-3.5 w-3.5" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="truncate text-[11px] font-semibold text-slate-100">
                                                        @{preview.handle}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">AutoDM trigger preview</p>
                                                </div>
                                            </div>

                                            <div className="relative h-[350px] overflow-hidden rounded-md border border-slate-700 bg-slate-900">
                                                {preview.selectedMedia ? (
                                                    <img
                                                        src={preview.selectedMedia.thumbnail_url || preview.selectedMedia.media_url}
                                                        alt={preview.selectedMedia.caption || 'Selected media'}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-slate-800 px-6 text-center">
                                                        <p className="text-xs text-slate-400">
                                                            {isStoryTrigger
                                                                ? 'Select a story to render preview'
                                                                : 'Select a post or reel to render preview'}
                                                        </p>
                                                    </div>
                                                )}
                                                <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                                    {preview.mediaTypeLabel}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 text-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <Heart className="h-4 w-4" />
                                                    <MessageSquare className="h-4 w-4" />
                                                    <Send className="h-4 w-4" />
                                                </div>
                                                <Bookmark className="h-4 w-4" />
                                            </div>

                                            <div className="relative pt-3 h-[120px]">
                                                <div className="rounded-md border border-slate-700 bg-slate-950/90 p-2">
                                                    <p className="line-clamp-5 text-[11px] leading-5 text-slate-200">
                                                        <span className="font-semibold text-slate-100">@{preview.handle}</span>{' '}
                                                        <span className="text-slate-300">{preview.caption}</span>
                                                    </p>
                                                </div>

                                                <div
                                                    className={`absolute inset-x-0 bottom-0 transition-all duration-300 ease-out motion-reduce:transition-none ${preview.showCommentPreview
                                                        ? 'translate-y-0 opacity-100'
                                                        : 'translate-y-full opacity-0 pointer-events-none'
                                                        }`}
                                                >
                                                    <div className="flex h-[310px] flex-col overflow-hidden rounded-2xl border border-slate-600 bg-[#2f3136]">
                                                        <div className="flex justify-center pb-1 pt-2">
                                                            <span className="h-1 w-12 rounded-full bg-slate-400/80" />
                                                        </div>

                                                        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-sm font-semibold text-slate-100">Comments</p>
                                                                <Send className="h-3.5 w-3.5 text-slate-300" />
                                                            </div>

                                                            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto no-scrollbar pr-1">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex min-w-0 flex-1 items-start gap-2">
                                                                            <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                                                                                <User className="h-4 w-4" />
                                                                            </div>
                                                                            <div className="min-w-0 space-y-0.5">
                                                                                <p className="text-[10px] font-semibold leading-tight text-slate-100">User</p>
                                                                                <p className="text-[10px] font-semibold leading-tight text-slate-200">{preview.keyword}</p>
                                                                                <p className="text-[9px] leading-tight text-slate-400">Reply</p>
                                                                            </div>
                                                                        </div>
                                                                        <Heart className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                                    </div>

                                                                    {showPublicReplyInThread ? (
                                                                        <div className="ml-7">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <div className="flex min-w-0 flex-1 items-start gap-2">
                                                                                    {accountProfileImageUrl ? (
                                                                                        <img
                                                                                            src={accountProfileImageUrl}
                                                                                            alt="Account profile"
                                                                                            className="mt-0.5 h-4 w-4 rounded-full object-cover"
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                                                                                            <User className="h-2.5 w-2.5" />
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="min-w-0 space-y-0.5">
                                                                                        <p className="truncate text-[10px] font-semibold leading-tight text-slate-100">{preview.handle}</p>
                                                                                        <p className="whitespace-pre-wrap break-words text-[10px] font-semibold leading-tight text-slate-200">{preview.publicReplyMessage}</p>
                                                                                        <p className="text-[9px] leading-tight text-slate-400">Reply</p>
                                                                                    </div>
                                                                                </div>
                                                                                <Heart className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="ml-7 text-[10px] text-slate-400">
                                                                            Keyword match preview. Open Public Reply To Comments to preview your public response.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex items-center justify-between px-1 text-base">
                                                                <button type="button" className="rounded p-1 text-slate-300 transition-colors duration-200 hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none" aria-label="Like reaction">
                                                                    <ThumbsUp className="h-4 w-4" />
                                                                </button>
                                                                <button type="button" className="rounded p-1 text-slate-300 transition-colors duration-200 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none" aria-label="Flame reaction">
                                                                    <Flame className="h-4 w-4" />
                                                                </button>
                                                                <button type="button" className="rounded p-1 text-slate-300 transition-colors duration-200 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none" aria-label="Heart reaction">
                                                                    <Heart className="h-4 w-4" />
                                                                </button>
                                                                <button type="button" className="rounded p-1 text-slate-300 transition-colors duration-200 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none" aria-label="Spark reaction">
                                                                    <Zap className="h-4 w-4" />
                                                                </button>
                                                                <button type="button" className="rounded p-1 text-slate-300 transition-colors duration-200 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none" aria-label="Star reaction">
                                                                    <Star className="h-4 w-4" />
                                                                </button>
                                                                <button type="button" className="rounded p-1 text-slate-300 transition-colors duration-200 hover:text-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none" aria-label="Comment reaction">
                                                                    <MessageSquare className="h-4 w-4" />
                                                                </button>
                                                                <button type="button" className="rounded p-1 text-slate-300 transition-colors duration-200 hover:text-accent-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none" aria-label="Laugh reaction">
                                                                    <Laugh className="h-4 w-4" />
                                                                </button>
                                                                <button type="button" className="rounded p-1 text-slate-300 transition-colors duration-200 hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none" aria-label="Send reaction">
                                                                    <Send className="h-4 w-4" />
                                                                </button>
                                                            </div>

                                                            <div className="mt-3 flex items-center gap-2 px-1">

                                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                                                                    <User className="h-5 w-5" />
                                                                </div>

                                                                <div className="flex-1 rounded-full border border-slate-500 bg-slate-700 px-3 py-1.5 text-[10px] text-slate-300">
                                                                    Add a comment...
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
