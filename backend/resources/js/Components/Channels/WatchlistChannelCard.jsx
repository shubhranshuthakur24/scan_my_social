import React from 'react';
import { PlatformIcon } from '@/Components/PlatformIcons';
import Icon from '@/Components/Icon';

export default function WatchlistChannelCard({ name, followers, views, imageUrl, description, platform = 'instagram', topics = [], isEditing = false, onRemove = null }) {
    return (
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md sm:p-6">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Section */}
                <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-sm ring-1 ring-slate-200">
                        {imageUrl ? (
                            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold uppercase text-2xl">
                                {name?.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                        <PlatformIcon
                            platform={platform}
                            className="w-5 h-5"
                            padding="p-1.5 border-2 border-white shadow-sm"
                        />
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="break-words text-xl font-black leading-tight text-slate-900">{name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                <span>{followers} {platform === 'youtube' ? 'subscribers' : 'followers'}</span>
                                {views && <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
                                {views && <span>{views} views</span>}
                            </div>
                        </div>
                        {isEditing && (
                            <button
                                onClick={onRemove}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-50 text-danger-600 transition-colors hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300 focus-visible:ring-offset-2"
                                aria-label="Remove channel"
                                title="Remove channel"
                                type="button"
                            >
                                <Icon name="trash" className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    <p className="max-w-4xl break-words text-sm font-medium leading-relaxed text-slate-500">
                        {description || "No description available for this channel."}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Popular topics:</span>
                        {topics.map((topic, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50/50 border border-primary-100/50 text-primary-600 text-xs font-bold hover:bg-primary-50 transition-colors cursor-default"
                            >
                                <Icon name="trendingUp" className="h-3 w-3" strokeWidth={2.5} />
                                <span className="break-words">{topic}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
