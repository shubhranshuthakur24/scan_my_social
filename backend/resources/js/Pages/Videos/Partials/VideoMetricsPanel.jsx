import React from 'react';
import Icon from '@/Components/Icon';
import SectionHeader from './components/SectionHeader';

export default function VideoMetricsPanel({
    post,
    views,
    engagementRate,
    breakoutLabel,
    outlierScore,
}) {
    const likes = post.likes_count ?? 0;
    const comments = post.comments_count ?? 0;
    const followers = post.channel?.followers_count ?? 0;

    // Parse ER as a numeric percentage value
    const erVal = parseFloat(engagementRate) || 0;

    // ER Standard Scale
    // Low: < 2%, Avg: 2-4%, High: 4-6%, Viral: >= 6%
    const erScale = (() => {
        if (erVal >= 6) return { label: 'Viral 🔥', color: 'bg-red-500', text: 'text-red-600', fill: 'w-[100%]' };
        if (erVal >= 4) return { label: 'High ⚡', color: 'bg-amber-500', text: 'text-amber-600', fill: 'w-[75%]' };
        if (erVal >= 2) return { label: 'Average 👍', color: 'bg-primary-500', text: 'text-primary-600', fill: 'w-[45%]' };
        return { label: 'Low 📉', color: 'bg-slate-400', text: 'text-slate-500', fill: 'w-[15%]' };
    })();

    return (
        <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader icon={<Icon name="barChart" />} title="Performance Snapshot" subtitle="High-signal metrics for quick decisions." />

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
                {/* Breakout Card */}
                {(() => {
                    const labelText = breakoutLabel && breakoutLabel !== 'Insufficient Data' ? breakoutLabel : 'Normal';
                    const score = typeof outlierScore === 'number' ? outlierScore.toFixed(1) : outlierScore;

                    return (
                        <div className="rounded-2xl border border-success-200/50 bg-linear-to-br from-success-50/70 to-white p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <span className="text-[10px] uppercase tracking-widest font-black text-success-600">Breakout Score</span>
                            <div className="flex flex-wrap items-baseline gap-1 mt-2">
                                <span className="text-2xl font-black text-success-950">{score}x</span>
                                <span className="text-[10px] font-bold text-success-700">({labelText})</span>
                            </div>
                            <div className="absolute top-3 right-3 text-success-500/20 group-hover:text-success-500/30 transition-colors">
                                <Icon name="trendingUp" size={24} />
                            </div>
                        </div>
                    );
                })()}

                {/* Views Card */}
                <div className="rounded-2xl border border-primary-200/50 bg-linear-to-br from-primary-50/60 to-white p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <span className="text-[10px] uppercase tracking-widest font-black text-primary-600">Views</span>
                    <div className="text-2xl font-black text-primary-950 mt-2">{views}</div>
                    <div className="absolute top-3 right-3 text-primary-500/20 group-hover:text-primary-500/30 transition-colors">
                        <Icon name="eye" size={24} />
                    </div>
                </div>

                {/* Followers Card */}
                <div className="rounded-2xl border border-info-200/50 bg-linear-to-br from-info-50/60 to-white p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <span className="text-[10px] uppercase tracking-widest font-black text-info-600">Followers</span>
                    <div className="text-2xl font-black text-info-950 mt-2">{followers.toLocaleString()}</div>
                    <div className="absolute top-3 right-3 text-info-500/20 group-hover:text-info-500/30 transition-colors">
                        <Icon name="users" size={24} />
                    </div>
                </div>

                {/* Likes Card */}
                <div className="rounded-2xl border border-rose-200/50 bg-linear-to-br from-rose-50/60 to-white p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <span className="text-[10px] uppercase tracking-widest font-black text-rose-600">Likes</span>
                    <div className="text-2xl font-black text-rose-950 mt-2">{likes.toLocaleString()}</div>
                    <div className="absolute top-3 right-3 text-rose-500/20 group-hover:text-rose-500/30 transition-colors">
                        <Icon name="thumbsUp" size={24} />
                    </div>
                </div>

                {/* Comments Card */}
                <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-500">Comments</span>
                    <div className="text-2xl font-black text-slate-900 mt-2">{comments.toLocaleString()}</div>
                    <div className="absolute top-3 right-3 text-slate-400/20 group-hover:text-slate-400/30 transition-colors">
                        <Icon name="messageSquare" size={24} />
                    </div>
                </div>

                {/* ER Ratio Ratio */}
                {post.engagement_ratio != null && (
                    <div className="rounded-2xl border border-warning-200/50 bg-linear-to-br from-warning-50/60 to-white p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <span className="text-[10px] uppercase tracking-widest font-black text-warning-600">ER Ratio</span>
                        <div className="text-2xl font-black text-warning-950 mt-2">{(post.engagement_ratio * 100).toFixed(0)}%</div>
                        <div className="absolute top-3 right-3 text-warning-500/20 group-hover:text-warning-500/30 transition-colors">
                            <Icon name="barChart" size={24} />
                        </div>
                    </div>
                )}
            </div>

            {/* Engagement Rate Bar Section */}
            <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Engagement Rate</span>
                        <p className="text-2xl font-black text-slate-800 leading-none">{engagementRate}</p>
                    </div>
                    <span className={`rounded-xl px-2.5 py-1 text-xs font-black bg-slate-100 border border-slate-200/40 ${erScale.text}`}>
                        {erScale.label}
                    </span>
                </div>
                <div className="mt-3.5">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${erScale.color} ${erScale.fill} transition-all duration-500`} />
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400 mt-2">
                        <span>Low (&lt;2%)</span>
                        <span>Avg (2-4%)</span>
                        <span>High (4-6%)</span>
                        <span>Viral (&gt;6%)</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
