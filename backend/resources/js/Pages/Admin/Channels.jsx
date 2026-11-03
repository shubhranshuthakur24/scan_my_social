import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';

const STATUS_STYLES = {
    IDLE: 'bg-slate-100 text-slate-600 border-slate-200',
    QUEUED: 'bg-amber-50 text-amber-700 border-amber-200',
    RUNNING: 'bg-blue-50 text-blue-700 border-blue-200',
    SUCCEEDED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
    ABORTED: 'bg-orange-50 text-orange-700 border-orange-200',
    'TIMED-OUT': 'bg-orange-50 text-orange-700 border-orange-200',
};

function getStatusStyle(status) {
    return STATUS_STYLES[status] || STATUS_STYLES.IDLE;
}

function formatDate(value) {
    if (!value) {
        return 'Never';
    }

    return new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-IN');
}

export default function Channels({ channels, stats, filters, statusOptions, platformOptions }) {
    const { flash } = usePage().props;

    const [search, setSearch] = useState(filters.search || '');
    const [platform, setPlatform] = useState(filters.platform || 'all');
    const [profileStatus, setProfileStatus] = useState(filters.profile_status || 'ALL');
    const [postStatus, setPostStatus] = useState(filters.post_status || 'ALL');

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(route('admin.channels.index'), {
            search,
            platform,
            profile_status: profileStatus,
            post_status: postStatus,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSearch('');
        setPlatform('all');
        setProfileStatus('ALL');
        setPostStatus('ALL');

        router.get(route('admin.channels.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const retryProfile = (channelId) => {
        router.post(route('admin.channels.retry-profile', channelId), {}, {
            preserveScroll: true,
        });
    };

    const retryPost = (channelId) => {
        router.post(route('admin.channels.retry-post', channelId), {}, {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Admin - Channels" />

            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                <Icon name="channel" size={20} />
                            </div>
                            Channels Console
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Monitor channel scrape states and manually retry profile/post runs.
                        </p>
                    </div>
                </div>

                {flash?.success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                        {flash.success}
                    </div>
                )}

                {flash?.error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                        {flash.error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Total</p>
                        <p className="text-2xl font-black text-slate-900">{formatNumber(stats.total_channels)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Profile Running</p>
                        <p className="text-2xl font-black text-blue-700">{formatNumber(stats.profile_running)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Post Running</p>
                        <p className="text-2xl font-black text-blue-700">{formatNumber(stats.post_running)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Profile Failed</p>
                        <p className="text-2xl font-black text-rose-700">{formatNumber(stats.profile_failed)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Post Failed</p>
                        <p className="text-2xl font-black text-rose-700">{formatNumber(stats.post_failed)}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-white">
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Ready For Post</p>
                        <p className="text-2xl font-black">{formatNumber(stats.ready_for_post_scrape)}</p>
                    </div>
                </div>

                <form onSubmit={applyFilters} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by handle or name"
                            className="lg:col-span-2 w-full rounded-xl border-slate-200 bg-slate-50 text-sm font-medium focus:border-slate-900 focus:ring-slate-900"
                        />
                        <select
                            value={platform}
                            onChange={(event) => setPlatform(event.target.value)}
                            className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm font-bold focus:border-slate-900 focus:ring-slate-900"
                        >
                            {platformOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option === 'all' ? 'All Platforms' : option}
                                </option>
                            ))}
                        </select>
                        <select
                            value={profileStatus}
                            onChange={(event) => setProfileStatus(event.target.value)}
                            className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm font-bold focus:border-slate-900 focus:ring-slate-900"
                        >
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    Profile: {status}
                                </option>
                            ))}
                        </select>
                        <select
                            value={postStatus}
                            onChange={(event) => setPostStatus(event.target.value)}
                            className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm font-bold focus:border-slate-900 focus:ring-slate-900"
                        >
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    Post: {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-slate-800"
                        >
                            <Icon name="filter" size={14} />
                            Apply Filters
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 text-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-slate-200"
                        >
                            <Icon name="x" size={14} />
                            Reset
                        </button>
                    </div>
                </form>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">Channel</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">Audience</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">Tracking</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">Profile Run</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">Post Run</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {channels.data.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-5 py-12 text-center text-slate-400 font-medium">
                                            No channels found for the selected filters.
                                        </td>
                                    </tr>
                                )}

                                {channels.data.map((channel) => {
                                    const profileRunning = channel.profile_status === 'RUNNING';
                                    const postRunning = channel.post_status === 'RUNNING';
                                    const postBlocked = channel.is_private || channel.profile_status !== 'SUCCEEDED';

                                    return (
                                        <tr key={channel.id} className="hover:bg-slate-50/60">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Icon name={channel.platform} size={18} />
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">
                                                            @{channel.handle}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            {channel.name || 'No profile name'} {channel.is_verified ? ' - Verified' : ''}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                                                            Last refresh: {formatDate(channel.last_refreshed_data_on)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-black text-slate-900">{formatNumber(channel.followers_count)}</p>
                                                <p className="text-xs text-slate-500 font-medium">Followers</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-black text-slate-900">{formatNumber(channel.tracked_by_users_count)}</p>
                                                <p className="text-xs text-slate-500 font-medium">Users tracking</p>
                                                <p className="text-xs text-slate-400 font-medium mt-1">
                                                    {formatNumber(channel.stored_posts_count)} posts stored
                                                </p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${getStatusStyle(channel.profile_status)}`}>
                                                    {channel.profile_status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${getStatusStyle(channel.post_status)}`}>
                                                    {channel.post_status}
                                                </span>
                                                {channel.is_private && (
                                                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-1">
                                                        Private account
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => retryProfile(channel.id)}
                                                        disabled={profileRunning}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Icon name="refresh" size={12} />
                                                        Profile
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => retryPost(channel.id)}
                                                        disabled={postRunning || postBlocked}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Icon name="upload" size={12} />
                                                        Post
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {channels.last_page > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/40">
                            <p className="text-xs text-slate-500 font-medium">
                                Showing {channels.from} to {channels.to} of {channels.total} channels
                            </p>
                            <div className="flex items-center gap-2">
                                {channels.prev_page_url ? (
                                    <Link href={channels.prev_page_url} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50">
                                        Previous
                                    </Link>
                                ) : (
                                    <span className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-100 text-xs font-bold text-slate-400">
                                        Previous
                                    </span>
                                )}
                                <span className="text-xs font-black text-slate-600 px-2">
                                    Page {channels.current_page} / {channels.last_page}
                                </span>
                                {channels.next_page_url ? (
                                    <Link href={channels.next_page_url} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50">
                                        Next
                                    </Link>
                                ) : (
                                    <span className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-100 text-xs font-bold text-slate-400">
                                        Next
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
