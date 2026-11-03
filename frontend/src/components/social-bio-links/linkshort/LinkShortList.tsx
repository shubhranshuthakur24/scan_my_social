'use client';

import React from 'react';
import { ShortLink, ShortLinkPagination } from '@/lib/api/linkShortService';
import LinkShortCard from './LinkShortCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LinkShortListProps {
  shortLinks: ShortLink[];
  pagination: ShortLinkPagination;
  onPageChange: (page: number) => void;
  onEdit: (link: ShortLink) => void;
  onDelete: (link: ShortLink) => void;
  onToggle: (link: ShortLink) => void;
  isMutating?: boolean;
}

export default function LinkShortList({
  shortLinks,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onToggle,
  isMutating = false,
}: LinkShortListProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {shortLinks.map((link) => (
          <LinkShortCard
            key={link.id}
            shortLink={link}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            isMutating={isMutating}
          />
        ))}
      </div>

      {/* Pagination Footer */}
      {pagination.last_page > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs text-slate-500 font-bold">
            Showing Page <span className="text-slate-900 font-black">{pagination.current_page}</span> of{' '}
            <span className="text-slate-900 font-black">{pagination.last_page}</span> ({pagination.total} total links)
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(pagination.current_page - 1)}
              disabled={pagination.current_page <= 1}
              aria-label="Previous page"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <span
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3.5 py-1 rounded-xl bg-slate-100 text-xs font-black text-slate-700"
              aria-current="page"
            >
              {pagination.current_page}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(pagination.current_page + 1)}
              disabled={pagination.current_page >= pagination.last_page}
              aria-label="Next page"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
