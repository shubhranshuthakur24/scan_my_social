import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import EmptyState from '@/Components/EmptyState';
import Icon from '@/Components/Icon';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import { Head, Link } from '@inertiajs/react';

export default function Index({ auth, watchlists = [] }) {
    const safeWatchlists = Array.isArray(watchlists) ? watchlists : [];

    return (
        <AuthenticatedLayout user={auth.user}
            topbarTitle={"Content Library"}
            topbarDescription={"Open, manage, and explore your saved competitor groups."}
            
        >
            <Head title="Watchlists" />

            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">
               

                {safeWatchlists.length === 0 ? (
                    <EmptyState
                        className="xl:py-14"
                        title="No watchlists yet"
                        description="Create your first watchlist from the Channels page to organize competitors."
                        icon={() => <Icon name="watchlist" className="h-10 w-10 text-slate-400" />}
                        action={(
                            <Link
                                href={route('channels')}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-primary-700"
                            >
                                <Icon name="plus" size={4} className="text-white" />
                                Go to Channels
                            </Link>
                        )}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {safeWatchlists.map((watchlist) => (
                            <Link
                                key={watchlist.id}
                                href={route('watchlists.show', { id: watchlist.id })}
                                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <h2 className="line-clamp-1 text-lg font-black text-slate-900 transition-colors group-hover:text-primary-700">
                                        {watchlist.name}
                                    </h2>
                                    {Boolean(watchlist.is_favorite) && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                            <Icon name="star" size={3.5} className="text-amber-500" />
                                            Favorite
                                        </span>
                                    )}
                                </div>

                                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
                                    {watchlist.description || 'No description added.'}
                                </p>

                                <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
                                    <span>{watchlist.channels_count || 0} channels</span>
                                    <span>Open</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
