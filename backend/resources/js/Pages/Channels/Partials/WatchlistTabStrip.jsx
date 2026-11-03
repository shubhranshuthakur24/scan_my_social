import React from 'react';
import { BookMarked, Plus } from 'lucide-react';

/**
 * Mobile-only horizontal watchlist tab strip.
 * On desktop (lg+) the sidebar handles watchlist navigation — this is hidden via CSS.
 *
 * @param {{
 *   watchlists: object[],
 *   activeWatchlistId: number|null,
 *   onSelectWatchlist: (id: number|null) => void,
 *   onCreateWatchlist: () => void,
 * }} props
 */
export default function WatchlistTabStrip({
    watchlists = [],
    activeWatchlistId,
    onSelectWatchlist,
    onCreateWatchlist,
}) {
    if (watchlists.length === 0) return null;

    return (
        <div className="lg:hidden">
            <div
                className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label="Filter channels by watchlist"
            >
                {/* "All Channels" pill */}
                <button
                    type="button"
                    aria-pressed={activeWatchlistId === null}
                    onClick={() => onSelectWatchlist(null)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-bold shadow-sm transition-all duration-150 active:scale-95 ${
                        activeWatchlistId === null
                            ? 'border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    All Channels
                </button>

                {/* Individual watchlist pills */}
                {watchlists.map((wl) => {
                    const isActive = activeWatchlistId === wl.id;
                    return (
                        <button
                            key={wl.id}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => onSelectWatchlist(wl.id)}
                            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-bold shadow-sm transition-all duration-150 active:scale-95 ${
                                isActive
                                    ? 'border-accent-300 bg-accent-50 text-accent-700 ring-1 ring-accent-200'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <BookMarked className="h-3 w-3" strokeWidth={2.5} />
                            {wl.name}
                        </button>
                    );
                })}

                {/* New Watchlist pill */}
                <button
                    type="button"
                    onClick={onCreateWatchlist}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-slate-300 bg-white px-3.5 py-1.5 text-[12px] font-bold text-slate-500 shadow-sm transition-all duration-150 hover:border-primary-300 hover:text-primary-600 active:scale-95"
                >
                    <Plus className="h-3 w-3" strokeWidth={2.5} />
                    New Watchlist
                </button>
            </div>
        </div>
    );
}
