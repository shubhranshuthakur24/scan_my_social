'use client';

import React from 'react';
import { Link as LinkIcon, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

interface LinkShortEmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
  onCreateLink: () => void;
}

export default function LinkShortEmptyState({
  hasFilters,
  onClearFilters,
  onCreateLink,
}: LinkShortEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-2xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <LinkIcon size={22} />
        </div>
        <h3 className="mt-3 text-sm font-black text-slate-800">No matching short links</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          We couldn&apos;t find any short links matching your search or active filters.
        </p>
        {onClearFilters && (
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={onClearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-2xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <LinkIcon size={26} />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-900">No short links yet</h3>
      <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
        Create branded, trackable <code className="rounded bg-slate-100 px-1 py-0.5 font-bold text-slate-700">/s</code> links with custom aliases, scheduled availability, and privacy-preserving visitor telemetry.
      </p>
      <div className="mt-5">
        <Button variant="primary" onClick={onCreateLink} className="gap-2">
          <Plus size={16} />
          <span>Create Short Link</span>
        </Button>
      </div>
    </div>
  );
}
