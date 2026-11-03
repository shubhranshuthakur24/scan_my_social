'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ShortLink } from '@/lib/api/linkShortService';
import { buildPublicCardUrl } from '@/lib/utils/publicUrl';
import { getShortLinkStatus } from '@/lib/utils/linkShortStatus';
import Badge from '@/components/ui/Badge';
import {
  Copy,
  Check,
  ExternalLink,
  BarChart2,
  Edit2,
  Trash2,
  Power,
  CalendarClock,
  Globe,
} from 'lucide-react';

interface LinkShortCardProps {
  shortLink: ShortLink;
  onEdit: (link: ShortLink) => void;
  onDelete: (link: ShortLink) => void;
  onToggle: (link: ShortLink) => void;
  isMutating?: boolean;
}

export default function LinkShortCard({
  shortLink,
  onEdit,
  onDelete,
  onToggle,
  isMutating = false,
}: LinkShortCardProps) {
  const [copied, setCopied] = useState(false);

  // Canonical short URL: resolves against localhost in dev, enforces http://scanmysocial.com in production
  const resolvedShortUrl = useMemo(() => {
    return buildPublicCardUrl(`/s/${shortLink.code}`);
  }, [shortLink.code]);

  // Derive temporal and operational status (LS-05)
  const statusInfo = useMemo(() => {
    return getShortLinkStatus(shortLink);
  }, [shortLink]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resolvedShortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition group">
      {/* Screen reader live announcement for copy action (LS-06) */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `Short URL for ${shortLink.title} copied to clipboard` : ''}
      </span>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* 1. Link Metadata & URL Info */}
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 group-hover:text-primary-700 transition truncate">
              {shortLink.title}
            </h3>

            <Badge variant={statusInfo.variant} size="sm">
              {statusInfo.label}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate max-w-xl" title={shortLink.destination_url}>
            <Globe size={13} className="shrink-0 text-slate-400" />
            <span className="truncate">{shortLink.destination_url}</span>
          </div>

          {/* Short URL & Copy Action */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <code className="px-2.5 py-1 rounded-lg bg-slate-100/90 text-slate-800 text-xs font-mono font-bold border border-slate-200/60">
              {resolvedShortUrl}
            </code>

            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              aria-label={`Copy short URL for ${shortLink.title}`}
            >
              {copied ? <Check size={14} className="text-emerald-600 shrink-0" /> : <Copy size={14} className="shrink-0" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <a
              href={resolvedShortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              title={`Test open short link for ${shortLink.title}`}
              aria-label={`Test open short link for ${shortLink.title}`}
            >
              <ExternalLink size={14} className="shrink-0" />
              <span>Test</span>
            </a>

            {statusInfo.scheduleText && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                <CalendarClock size={12} className="text-slate-500" />
                <span>{statusInfo.scheduleText}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Clicks Metric & Actions (LS-07: clean wrap without gradients) */}
        <div className="flex items-center justify-between sm:justify-end flex-wrap gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-center min-h-[44px] flex flex-col justify-center">
            <span className="text-xs font-black text-slate-900 leading-none">{shortLink.clicks_count.toLocaleString()}</span>
            <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider mt-0.5">clicks</span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Link
              href={`/social-bio-links/linkshort/${shortLink.id}/analytics`}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200/50 hover:bg-primary-100 transition shadow-2xs focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              title={`View analytics for ${shortLink.title}`}
              aria-label={`View analytics for ${shortLink.title}`}
            >
              <BarChart2 size={14} className="text-primary-600 shrink-0" />
              <span>Analytics</span>
            </Link>

            <button
              type="button"
              onClick={() => onEdit(shortLink)}
              disabled={isMutating}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              title={`Edit short link: ${shortLink.title}`}
              aria-label={`Edit short link: ${shortLink.title}`}
            >
              <Edit2 size={14} className="shrink-0" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={shortLink.is_active}
              onClick={() => onToggle(shortLink)}
              disabled={isMutating}
              className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border transition shadow-2xs disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                shortLink.is_active
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              title={shortLink.is_active ? `Deactivate short link: ${shortLink.title}` : `Activate short link: ${shortLink.title}`}
              aria-label={shortLink.is_active ? `Deactivate short link: ${shortLink.title}` : `Activate short link: ${shortLink.title}`}
            >
              <Power size={15} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(shortLink)}
              disabled={isMutating}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50 text-rose-600 hover:bg-rose-100 transition shadow-2xs disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              title={`Delete short link: ${shortLink.title}`}
              aria-label={`Delete short link: ${shortLink.title}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
