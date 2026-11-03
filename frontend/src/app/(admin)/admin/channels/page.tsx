'use client';

import React, { useState } from 'react';
import {
  Tv,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Play
} from 'lucide-react';

interface ScrapeJob {
  id: string;
  username: string;
  workerType: 'Profile Scrape' | 'Post Scrape' | 'Media Downloader';
  status: 'Completed' | 'Failed' | 'In Progress';
  errorMessage?: string;
  attemptCount: number;
  timestamp: string;
}

const mockJobs: ScrapeJob[] = [
  {
    id: 'job-1',
    username: 'growth_secrets_daily',
    workerType: 'Profile Scrape',
    status: 'Failed',
    errorMessage: 'Apify Actor Timeout: Request rate limit exceeded',
    attemptCount: 3,
    timestamp: '10 mins ago',
  },
  {
    id: 'job-2',
    username: 'tech_creators',
    workerType: 'Post Scrape',
    status: 'Completed',
    attemptCount: 1,
    timestamp: '25 mins ago',
  },
  {
    id: 'job-3',
    username: 'design_daily',
    workerType: 'Media Downloader',
    status: 'In Progress',
    attemptCount: 1,
    timestamp: 'Just now',
  },
];

export default function AdminChannelsPage() {
  const [jobs, setJobs] = useState<ScrapeJob[]>(mockJobs);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = (id: string) => {
    setRetryingId(id);
    setTimeout(() => {
      setJobs(
        jobs.map((j) => (j.id === id ? { ...j, status: 'In Progress', errorMessage: undefined } : j))
      );
      setRetryingId(null);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Admin Channels & Scraping Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor Apify background worker health, investigate scraping exceptions, and trigger manual retries.
          </p>
        </div>

        <button
          onClick={() => { }}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-md"
        >
          <RefreshCw size={14} /> Retry All Failed Jobs
        </button>
      </div>

      {/* Queue Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Instagram Channel</th>
                <th className="px-6 py-3.5">Worker Task</th>
                <th className="px-6 py-3.5">Job Status</th>
                <th className="px-6 py-3.5">Attempts</th>
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-primary-600">@{job.username}</span>
                  </td>

                  <td className="px-6 py-4 font-semibold text-slate-800">{job.workerType}</td>

                  <td className="px-6 py-4">
                    {job.status === 'Completed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={10} /> Completed
                      </span>
                    ) : job.status === 'Failed' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          <AlertCircle size={10} /> Failed
                        </span>
                        {job.errorMessage && (
                          <p className="text-[10px] text-rose-600 mt-1 font-mono">{job.errorMessage}</p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                        <RefreshCw size={10} className="animate-spin" /> In Progress
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 font-mono font-bold text-slate-700">{job.attemptCount}</td>

                  <td className="px-6 py-4 text-slate-400 text-[11px]">{job.timestamp}</td>

                  <td className="px-6 py-4 text-right">
                    {job.status === 'Failed' && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={retryingId === job.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <RefreshCw size={12} className={retryingId === job.id ? 'animate-spin' : ''} />
                        {retryingId === job.id ? 'Queuing...' : 'Retry'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
