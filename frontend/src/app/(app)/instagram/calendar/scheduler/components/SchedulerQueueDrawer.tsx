'use client';

import React from 'react';
import { ScheduledQueueItem, QueueTab } from '../types';
import { Clock, CheckCircle2, Trash2, ExternalLink } from 'lucide-react';

export interface SchedulerQueueDrawerProps {
  queue: ScheduledQueueItem[];
  queueTab: QueueTab;
  setQueueTab: (tab: QueueTab) => void;
  onDeleteQueueItem: (id: string) => void;
  className?: string;
}

export default function SchedulerQueueDrawer({
  queue,
  queueTab,
  setQueueTab,
  onDeleteQueueItem,
  className = '',
}: SchedulerQueueDrawerProps) {
  const upcomingQueue = queue.filter((item) => item.status !== 'published');
  const publishedQueue = queue.filter((item) => item.status === 'published');
  const displayedQueue = queueTab === 'upcoming' ? upcomingQueue : publishedQueue;

  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            {queueTab === 'upcoming' ? 'Upcoming Content Queue' : 'Recently Published Content'}
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold">
            {queueTab === 'upcoming'
              ? `${upcomingQueue.length} ${upcomingQueue.length === 1 ? 'post' : 'posts'} pending dispatch`
              : `${publishedQueue.length} ${publishedQueue.length === 1 ? 'post' : 'posts'} live on Instagram`}
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setQueueTab('upcoming')}
            className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
              queueTab === 'upcoming'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({upcomingQueue.length})
          </button>
          <button
            type="button"
            onClick={() => setQueueTab('published')}
            className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
              queueTab === 'published'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live ({publishedQueue.length})
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {displayedQueue.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4">
            <p className="text-xs font-bold text-slate-600">
              {queueTab === 'upcoming'
                ? 'No posts currently pending dispatch.'
                : 'No published posts in this queue yet.'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {queueTab === 'upcoming'
                ? 'Compose a post on the left to add it to the schedule.'
                : 'Posts dispatched to Instagram will appear here once live.'}
            </p>
          </div>
        ) : (
          displayedQueue.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-primary-200 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-14 rounded-xl overflow-hidden bg-slate-950 shrink-0 relative flex items-center justify-center">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary-900/40 text-primary-300 flex items-center justify-center text-[9px] font-black uppercase">
                      {item.type}
                    </div>
                  )}
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 py-0.2 text-[7px] font-black text-white uppercase">
                    {item.type}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-black text-slate-900 truncate">{item.title}</p>
                    {item.status === 'published' && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[8px] font-bold text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 size={8} /> Live
                      </span>
                    )}
                    {item.status === 'publishing' && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.2 text-[8px] font-bold text-amber-700 border border-amber-200/60 animate-pulse">
                        Publishing...
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.2 text-[8px] font-bold text-rose-700 border border-rose-200/60">
                        Failed
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-700 mt-0.5">
                    <Clock size={10} />{' '}
                    {item.status === 'published' && item.publishedAt
                      ? `Published ${item.publishedAt}`
                      : item.scheduledTime}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {item.status === 'published' && (item.permalink || item.metaMediaId) && (
                  <a
                    href={item.permalink || `https://www.instagram.com/p/${item.metaMediaId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="View on Instagram"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                {item.status !== 'published' && (
                  <button
                    type="button"
                    onClick={() => onDeleteQueueItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="Remove from queue"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
