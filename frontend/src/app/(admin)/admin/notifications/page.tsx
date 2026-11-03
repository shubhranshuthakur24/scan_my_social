'use client';

import React, { useState } from 'react';
import {
  Bell,
  Send,
  CheckCircle2,
  Users,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  targetAudience: string;
  deliveredCount: number;
  sentAt: string;
}

const mockLogs: NotificationLog[] = [
  {
    id: 'n-1',
    title: '🚀 New Feature: Instagram AutoDM Webhooks are Live',
    body: 'You can now trigger automated direct messages directly from Instagram Reels comments in seconds.',
    targetAudience: 'All Users',
    deliveredCount: 1420,
    sentAt: 'Yesterday at 3:00 PM',
  },
  {
    id: 'n-2',
    title: '⚡ Cloudflare R2 Media Downloader Maintenance Complete',
    body: 'Scraping speeds have been enhanced by 300%. All queued media exports are now processing.',
    targetAudience: 'PRO Tier Users',
    deliveredCount: 420,
    sentAt: 'Sep 10, 2026',
  },
];

export default function AdminNotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>(mockLogs);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState('All Users');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const newLog: NotificationLog = {
      id: `n-${Date.now()}`,
      title,
      body,
      targetAudience,
      deliveredCount: 1540,
      sentAt: 'Just now',
    };

    setLogs([newLog, ...logs]);
    setTitle('');
    setBody('');
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Push Notifications Broadcaster</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast real-time web socket and in-app banner announcements to active platform users.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
            <Radio size={14} className="animate-pulse" /> Pusher WebSockets Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Composer (Left 5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-900">Compose Broadcast Announcement</h2>

          {sentSuccess && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 size={16} /> Notification broadcasted successfully!
            </div>
          )}

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-purple-500 focus:outline-hidden"
              >
                <option value="All Users">All Registered Users</option>
                <option value="PRO Tier Users">PRO Tier Users Only</option>
                <option value="Affiliate Partners">Affiliate Partners Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🚀 Scheduled Platform Upgrade"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notification Body</label>
              <textarea
                required
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Brief announcement details..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20"
            >
              <Send size={14} /> Send Broadcast Now
            </button>
          </form>
        </div>

        {/* History Log (Right 7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-sm font-black text-slate-900">Broadcast History ({logs.length})</h2>

          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-purple-50 px-2 py-0.5 rounded-md">
                    {log.targetAudience}
                  </span>
                  <h3 className="font-extrabold text-xs text-slate-900 mt-1">{log.title}</h3>
                </div>

                <span className="text-[11px] text-slate-400 shrink-0">{log.sentAt}</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{log.body}</p>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                Delivered to <strong className="text-slate-700">{log.deliveredCount}</strong> active devices
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
