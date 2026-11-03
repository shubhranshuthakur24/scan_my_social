import { Link } from '@inertiajs/react';
import { BarChart3 } from 'lucide-react';
import { formatDate, formatNumber } from './formatters';

export default function InstagramAnalyticsSection({ overview = {} }) {
    const hasAccount = Boolean(overview?.has_account);
    const topPosts = Array.isArray(overview?.top_posts) ? overview.top_posts : [];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <BarChart3 className="h-4.5 w-4.5" />
                    </span>
                    <div>
                        <h2 className="text-base font-black text-slate-900">Instagram Analytics</h2>
                        <p className="text-xs font-semibold text-slate-500">Last 30-day snapshot for your selected active account.</p>
                    </div>
                </div>

                <Link
                    href={route().has('instagram.analytics') ? route('instagram.analytics') : '/instagram/analytics'}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                >
                    Open Analytics
                </Link>
            </div>

            {!hasAccount ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
                    Connect an active Instagram account to view performance metrics.
                </p>
            ) : (
                <>
                    <div className="rounded-xl border border-slate-200">
                        <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-400 sm:grid-cols-4">
                            <div className="px-3 py-2">Posts</div>
                            <div className="px-3 py-2">Reach</div>
                            <div className="px-3 py-2">Impressions</div>
                            <div className="px-3 py-2">Engagement</div>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-slate-200 text-sm font-black text-slate-900 sm:grid-cols-4">
                            <div className="px-3 py-3">{formatNumber(overview?.posts || 0)}</div>
                            <div className="px-3 py-3">{formatNumber(overview?.reach || 0)}</div>
                            <div className="px-3 py-3">{formatNumber(overview?.impressions || 0)}</div>
                            <div className="px-3 py-3">{formatNumber(overview?.engagement || 0)}</div>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                        <span>Account: @{overview?.account?.username || 'unknown'}</span>
                        <span>Followers: {formatNumber(overview?.followers || 0)}</span>
                        <span>Last synced: {overview?.last_synced_at ? formatDate(overview.last_synced_at) : 'Not synced yet'}</span>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Top Posts By Reach</h3>
                        {topPosts.length === 0 ? (
                            <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 text-xs font-semibold text-slate-500">
                                No post-level analytics found in this period.
                            </p>
                        ) : (
                            <div className="mt-2 space-y-2">
                                {topPosts.map((post) => (
                                    <div key={post.id} className="rounded-lg border border-slate-200 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="line-clamp-2 text-sm font-semibold text-slate-700">
                                                {post?.caption?.trim() ? post.caption : 'Untitled Instagram post'}
                                            </p>
                                            <span className="shrink-0 text-xs font-black text-primary-600">
                                                {formatNumber(post.reach)} reach
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                                            <span>{formatNumber(post.impressions)} impressions</span>
                                            <span>{formatNumber(post.engagement)} engagement</span>
                                            <span>{post.posted_at ? formatDate(post.posted_at) : 'Unknown date'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
