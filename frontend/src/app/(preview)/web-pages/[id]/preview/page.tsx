'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { WebPage, getWebPage } from '@/lib/api/webPagesService';
import WebPageCanvas from '@/components/web-pages/WebPageCanvas';
import WebPagesSkeleton from '@/components/web-pages/WebPagesSkeleton';
import {
  ArrowLeft,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default function WebPagePrivatePreviewPage({ params }: PreviewPageProps) {
  const resolvedParams = use(params);
  const pageId = parseInt(resolvedParams.id, 10);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webPage, setWebPage] = useState<WebPage | null>(null);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const loadPageData = useCallback(() => {
    setIsLoading(true);
    setError(null);

    getWebPage(pageId)
      .then((res) => {
        setWebPage(res.web_page);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load preview');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pageId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center">
        <div className="w-full max-w-4xl opacity-60">
          <WebPagesSkeleton />
        </div>
      </div>
    );
  }

  if (error || !webPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center max-w-md w-full shadow-2xl space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-white">Preview Unavailable</h2>
            <p className="text-xs text-slate-400 font-medium">
              {error || 'Could not load page preview.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => loadPageData()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl transition min-h-[44px] sm:min-h-[38px]"
            >
              <RefreshCw size={14} />
              <span>Try Again</span>
            </button>
            <Link
              href="/web-pages"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-4 py-2.5 rounded-xl transition min-h-[44px] sm:min-h-[38px]"
            >
              <ArrowLeft size={14} />
              <span>Back to Web Pages</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Floating Preview Control Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href={`/web-pages/${webPage.id}/edit`}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0 shrink-0"
            aria-label="Back to Editor"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back to Editor</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-black truncate max-w-[140px] sm:max-w-xs md:max-w-md">
              {webPage.title}
            </span>
            <Badge variant={webPage.is_published ? 'success' : 'subtle'} className="text-[10px] shrink-0">
              {webPage.is_published ? 'Published' : 'Draft Preview'}
            </Badge>
          </div>
        </div>

        {/* Device Switcher */}
        <div
          className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0"
          role="group"
          aria-label="Device preview switcher"
        >
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            aria-label="Preview on desktop"
            aria-pressed={device === 'desktop'}
            className={`min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center rounded-lg transition ${
              device === 'desktop' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Desktop (100%)"
          >
            <Monitor size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            aria-label="Preview on tablet"
            aria-pressed={device === 'tablet'}
            className={`min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center rounded-lg transition ${
              device === 'tablet' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Tablet (768px)"
          >
            <Tablet size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            aria-label="Preview on mobile"
            aria-pressed={device === 'mobile'}
            className={`min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center rounded-lg transition ${
              device === 'mobile' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile (375px)"
          >
            <Smartphone size={16} />
          </button>
        </div>

        {/* Public Link (if published) */}
        <div className="shrink-0 flex items-center">
          {webPage.public_url && webPage.is_published ? (
            <a
              href={webPage.public_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View live public page"
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary-400 hover:text-primary-300 transition min-h-[44px] sm:min-h-[36px] px-2"
            >
              <span>View Live</span>
              <ExternalLink size={13} />
            </a>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
              Draft mode (interactions sandboxed)
            </span>
          )}
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <div className="flex-1 flex justify-center p-4 sm:p-8 overflow-auto bg-slate-950/60">
        <div
          className={`transition-all duration-300 shadow-2xl overflow-hidden rounded-2xl ${
            device === 'mobile'
              ? 'w-[375px] border-8 border-slate-800'
              : device === 'tablet'
              ? 'w-[768px] max-w-full border-8 border-slate-800'
              : 'w-full max-w-6xl'
          }`}
        >
          <WebPageCanvas webPage={webPage} mode="preview" />
        </div>
      </div>
    </div>
  );
}
