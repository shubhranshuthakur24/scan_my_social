import InputError from '@/Components/InputError';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Keyboard, Mousewheel } from 'swiper/modules';
import 'swiper/css';

export default function SelectContentSection({ form, media, preview }) {
    const sectionCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
    const activeSourceIndex = Math.max(
        0,
        media.sourceOptions.findIndex((option) => option.value === media.contentSource)
    );
    const sourceOptionCount = Math.max(media.sourceOptions.length, 1);

    return (
        <div
            className={sectionCardClass}
            onClick={() => preview.setScene('content')}
            onFocusCapture={() => preview.setScene('content')}
        >
            <div className="flex w-full items-center justify-between gap-3 text-left">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">1. Select Content</h3>
            </div>

            <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-500">
                    {media.contentSource === 'story'
                        ? 'Choose the story to monitor for keyword-triggered story replies.'
                        : 'Choose the post or reel to monitor for keyword-triggered replies.'}
                </p>

                <div className="relative inline-grid min-w-[220px] grid-cols-2 rounded-xl border border-primary-200 bg-primary-50/70 p-1.5 shadow-inner ring-1 ring-primary-100/80">
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-lg bg-primary-600 shadow-sm ring-1 ring-primary-500/70 transition-transform duration-300 ease-out motion-reduce:transition-none"
                        style={{
                            width: `calc((100% - 0.75rem) / ${sourceOptionCount})`,
                            transform: `translateX(${activeSourceIndex * 100}%)`,
                        }}
                    />
                    {media.sourceOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => media.onContentSourceChange(option.value)}
                            className={`relative z-[1] min-w-[92px] rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 ${
                                media.contentSource === option.value
                                    ? 'text-white'
                                    : 'text-primary-700 hover:text-primary-800'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {media.loadingMedia ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 py-16 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600 motion-reduce:animate-none" />
                        <p className="text-sm text-slate-500">
                            {media.contentSource === 'story' ? 'Loading active stories...' : 'Loading recent media...'}
                        </p>
                    </div>
                ) : (
                    <>
                        {media.mediaError && (
                            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {media.mediaError}
                            </div>
                        )}

                        {media.mediaList.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center text-sm text-slate-500">
                                {media.contentSource === 'story' ? 'No active stories found.' : 'No recent media found.'}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent" />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" />
                                    <Swiper
                                        modules={[FreeMode, Keyboard, Mousewheel]}
                                        onSwiper={(swiper) => {
                                            media.mediaSwiperRef.current = swiper;
                                            media.syncMediaSwiperState(swiper);
                                        }}
                                        onSlideChange={media.syncMediaSwiperState}
                                        onResize={media.syncMediaSwiperState}
                                        onReachBeginning={media.syncMediaSwiperState}
                                        onReachEnd={media.syncMediaSwiperState}
                                        onFromEdge={media.syncMediaSwiperState}
                                        slidesPerView="auto"
                                        spaceBetween={12}
                                        freeMode={{
                                            enabled: true,
                                            momentum: true,
                                            sticky: false,
                                        }}
                                        keyboard={{ enabled: true }}
                                        mousewheel={{
                                            forceToAxis: true,
                                            releaseOnEdges: true,
                                        }}
                                        watchOverflow
                                        className="rounded-xl pb-2"
                                    >
                                        {media.mediaList.map((item) => (
                                            <SwiperSlide key={item.id} className="!w-36 sm:!w-40">
                                                <button
                                                    type="button"
                                                    onClick={() => media.handleMediaSelect(item)}
                                                    className={`relative h-36 w-full cursor-pointer overflow-hidden rounded-xl border-2 transition-all duration-200 motion-reduce:transition-none sm:h-40 ${
                                                        String(form.data.trigger_value) === String(item.id)
                                                            ? 'border-primary-500 ring-4 ring-primary-200/70'
                                                            : 'border-slate-200 hover:border-slate-400'
                                                        }`}
                                                >
                                                    <img
                                                        src={item.thumbnail_url || item.media_url}
                                                        alt={item.caption || 'Instagram media'}
                                                        className="h-full w-full object-cover"
                                                    />
                                                    {String(form.data.trigger_value) === String(item.id) && (
                                                        <div className="absolute right-2 top-2 rounded-full bg-primary-500 p-1 text-white">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                                        {item.autodm_media_label || (item.media_type === 'VIDEO' ? 'Reel' : 'Post')}
                                                    </div>
                                                </button>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Showing {Math.min(media.visibleStartIndex + 1, media.mediaList.length)}-{Math.min(media.visibleEndIndex + 1, media.mediaList.length)} of {media.mediaList.length}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => media.slideMedia('prev')}
                                            disabled={!media.canSlidePrev}
                                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                                            aria-label="Scroll media left"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => media.slideMedia('next')}
                                            disabled={!media.canSlideNext}
                                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                                            aria-label="Scroll media right"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(media.hasMoreMedia || media.loadingMoreMedia) && (
                            <div className="mt-4 flex justify-center">
                                <button
                                    type="button"
                                    onClick={media.loadMoreMedia}
                                    disabled={media.loadingMoreMedia || media.loadingMedia}
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                                >
                                    {media.loadingMoreMedia && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
                                    {media.loadingMoreMedia ? 'Loading more...' : (media.contentSource === 'story' ? 'Load more stories' : 'Load more content')}
                                </button>
                            </div>
                        )}
                    </>
                )}

                <InputError message={form.duplicateFlowError || form.errors.trigger_value} className="mt-2" />
            </div>
        </div>
    );
}
