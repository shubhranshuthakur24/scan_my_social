'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import DataTable, { DataTableColumn } from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import { AutoDmCampaignItem } from '@/lib/api/instagramService';
import { formatNumber } from '@/lib/format';
import {
  MessageSquare,
  Plus,
  Pencil,
  Copy,
  Trash2,
  Clock,
  Film,
} from 'lucide-react';

export interface AutoDmDataTableProps {
  campaigns: AutoDmCampaignItem[];
  paginatedCampaigns: AutoDmCampaignItem[];
  accounts?: { id: string; username: string; avatar: string | null }[];
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  searchQuery?: string;
  onPageChange: (page: number) => void;
  onPerPageChange?: (size: number) => void;
  perPageOptions?: number[];
  onToggleStatus: (camp: AutoDmCampaignItem) => void;
  onDuplicate: (camp: { id: string; name: string }) => void;
  onDelete: (camp: { id: string; name: string }) => void;
  className?: string;
}

function CampaignThumbnail({
  camp,
  accounts = [],
}: {
  camp: AutoDmCampaignItem;
  accounts?: { id: string; username: string; avatar: string | null }[];
}) {
  const [hasError, setHasError] = React.useState(false);
  const mediaUrl = camp.thumbnailUrl;

  const isVideo = Boolean(
    mediaUrl && (
      mediaUrl.includes('.mp4') ||
      mediaUrl.includes('video_dashinit') ||
      mediaUrl.includes('/o1/v/')
    )
  );

  if (mediaUrl && !hasError) {
    if (isVideo) {
      return (
        <video
          src={mediaUrl}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover pointer-events-none"
          preload="metadata"
          muted
          playsInline
        />
      );
    }

    return (
      <img
        src={mediaUrl}
        alt={camp.keyword || camp.name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
      />
    );
  }

  const isStory = (camp.triggerType || '').toLowerCase() === 'story';
  const isReel = (camp.triggerType || '').toLowerCase() === 'reel';

  return (
    <div
      className={`w-full h-full flex items-center justify-center text-white font-bold text-xs shadow-2xs ${
        isStory
          ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600'
          : isReel
          ? 'bg-gradient-to-br from-purple-600 to-indigo-600'
          : 'bg-gradient-to-br from-primary-500 to-blue-600'
      }`}
    >
      {isStory ? <Clock size={18} /> : isReel ? <Film size={18} /> : <MessageSquare size={18} />}
    </div>
  );
}

export default function AutoDmDataTable({
  campaigns,
  paginatedCampaigns,
  accounts = [],
  isLoading = false,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  searchQuery = '',
  onPageChange,
  onPerPageChange,
  perPageOptions,
  onToggleStatus,
  onDuplicate,
  onDelete,
  className = '',
}: AutoDmDataTableProps) {
  const campaignColumns = useMemo<DataTableColumn<AutoDmCampaignItem>[]>(
    () => [
      {
        key: 'keyword',
        header: 'Keyword',
        render: (camp) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
              <CampaignThumbnail camp={camp} accounts={accounts} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-900 text-xs uppercase tracking-wide">
                {camp.keyword || camp.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                {camp.name}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'trigger',
        header: 'Trigger',
        render: (camp) => (
          <span className="text-slate-700 font-semibold">
            {camp.triggerType || 'Post'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (camp) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={camp.status.toLowerCase() === 'active'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(camp);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/20 select-none ${
                camp.status.toLowerCase() === 'active'
                  ? 'bg-emerald-500'
                  : 'bg-slate-300'
              }`}
              title={
                camp.status.toLowerCase() === 'active'
                  ? 'Click to pause funnel'
                  : 'Click to activate funnel'
              }
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  camp.status.toLowerCase() === 'active'
                    ? 'translate-x-4'
                    : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-xs font-bold capitalize select-none ${
                camp.status.toLowerCase() === 'active'
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              }`}
            >
              {camp.status}
            </span>
          </div>
        ),
      },
      {
        key: 'dmsSent',
        header: 'DMs Sent',
        render: (camp) => (
          <span className="font-bold text-slate-900">
            {formatNumber(camp.dmsSent || 0)}
          </span>
        ),
      },
      {
        key: 'ctr',
        header: 'CTR',
        render: (camp) => (
          <span className="font-bold text-slate-900">
            {camp.conversionRate ? `${camp.conversionRate}%` : '0%'}
          </span>
        ),
      },
      {
        key: 'reminders',
        header: 'Reminders',
        render: (camp) =>
          camp.hasReminders ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 whitespace-nowrap">
              <Clock size={10} /> {camp.reminderDelayHours || 2}h Follow-up
            </span>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          ),
      },
      {
        key: 'created',
        header: 'Created',
        render: (camp) => (
          <span className="text-slate-500 text-xs whitespace-nowrap">
            {camp.createdAt ? camp.createdAt.split('T')[0] : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (camp) => (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <Link
              href={`/instagram/autodm/create?edit=${camp.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-primary-600 hover:border-primary-300 transition-colors shadow-2xs cursor-pointer"
              title="Edit Automation"
            >
              <Pencil size={14} />
            </Link>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate({
                  id: camp.id,
                  name: camp.name || camp.keyword,
                });
              }}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-2xs cursor-pointer"
              title="Duplicate Automation"
            >
              <Copy size={14} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete({
                  id: camp.id,
                  name: camp.name || camp.keyword,
                });
              }}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-100 transition-colors shadow-2xs cursor-pointer"
              title="Delete Automation"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [accounts, onToggleStatus, onDuplicate, onDelete]
  );

  return (
    <DataTable<AutoDmCampaignItem>
      columns={campaignColumns}
      data={paginatedCampaigns}
      loading={isLoading}
      loadingMessage="Loading AutoDM campaigns..."
      loadingVariant="skeleton"
      className={className}
      pagination={
        totalItems > 0
          ? {
              currentPage,
              totalPages,
              totalItems,
              perPage: pageSize,
              onPageChange,
              onPerPageChange,
              perPageOptions,
            }
          : undefined
      }
      emptyState={
        <div className="py-14 text-center text-slate-500">
          <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center">
              <MessageSquare size={22} />
            </div>
            <p className="text-base font-black text-slate-900">
              {campaigns.length === 0
                ? 'No AutoDM Campaigns Yet'
                : 'No Campaigns Match Your Filters'}
            </p>
            <p className="text-xs text-slate-500 text-center">
              {campaigns.length === 0
                ? 'Set up keyword triggers to automatically send direct messages and capture leads from your Instagram comments.'
                : `No campaigns found matching "${searchQuery || 'selected filters'}". Try resetting filters.`}
            </p>
            {campaigns.length === 0 && (
              <Link href="/instagram/autodm/create">
                <Button variant="primary" size="sm" icon={Plus}>
                  Create Your First Automation
                </Button>
              </Link>
            )}
          </div>
        </div>
      }
    />
  );
}
