'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import DataTable, { DataTableColumn } from '@/components/ui/DataTable';
import { LeadForm, Pagination } from '@/lib/api/leadFormsService';
import { formatNumber } from '@/lib/format';
import {
  FormInput,
  Plus,
  Copy,
  Check,
  FileEdit,
  Trash2,
  Loader2,
  Clock,
} from 'lucide-react';

export interface LeadFormsDataTableProps {
  forms: LeadForm[];
  pagination: Pagination | null;
  isLoading?: boolean;
  searchTerm?: string;
  statusFilter?: string;
  copiedId: string | null;
  togglingId: string | number | null;
  onCopyLink: (publicId: string, formId: string | number) => void;
  onTogglePublish: (form: LeadForm) => void;
  onDeleteForm: (form: LeadForm) => void;
  onCreateForm: () => void;
  onPageChange: (page: number) => void;
  onPerPageChange?: (size: number) => void;
  perPageOptions?: number[];
  className?: string;
}

export default function LeadFormsDataTable({
  forms,
  pagination,
  isLoading = false,
  searchTerm = '',
  statusFilter = 'all',
  copiedId,
  togglingId,
  onCopyLink,
  onTogglePublish,
  onDeleteForm,
  onCreateForm,
  onPageChange,
  onPerPageChange,
  perPageOptions,
  className = '',
}: LeadFormsDataTableProps) {
  const columns = useMemo<DataTableColumn<LeadForm>[]>(
    () => [
      {
        key: 'form',
        header: 'Form Name & Slug',
        render: (form) => (
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50 p-2 text-primary-600 shrink-0">
              <FormInput className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/lead-forms/${form.id}`}
                className="font-bold text-slate-900 text-xs hover:text-primary-600 transition-colors block truncate max-w-xs"
              >
                {form.title}
              </Link>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                  /f/{form.public_id}
                </span>
                {form.description && (
                  <span className="truncate max-w-[200px] text-slate-400">
                    • {form.description}
                  </span>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (form) =>
          form.status === 'published' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Published
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 border border-amber-200/80 whitespace-nowrap">
              <Clock className="w-3 h-3" />
              Draft
            </span>
          ),
      },
      {
        key: 'submissions',
        header: 'Submissions',
        render: (form) => (
          <span className="font-black text-slate-900 text-sm whitespace-nowrap">
            {formatNumber(form.submissions_count || 0)}
          </span>
        ),
      },
      {
        key: 'fields',
        header: 'Fields',
        render: (form) => (
          <span className="text-slate-600 font-medium whitespace-nowrap">
            {form.fields?.length || 0} fields
          </span>
        ),
      },
      {
        key: 'updated_at',
        header: 'Last Activity',
        render: (form) => (
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            {form.updated_at
              ? new Date(form.updated_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (form) => (
          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
            {form.status === 'published' && (
              <button
                type="button"
                onClick={() => onCopyLink(form.public_id, form.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                title="Copy Public Link"
              >
                {copiedId === String(form.id) ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="button"
              disabled={togglingId === form.id}
              onClick={() => onTogglePublish(form)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              title={form.status === 'published' ? 'Switch to Draft' : 'Publish Form'}
            >
              {togglingId === form.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : form.status === 'published' ? (
                'Unpublish'
              ) : (
                'Publish'
              )}
            </button>

            <Link
              href={`/lead-forms/${form.id}`}
              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Open Form Builder"
            >
              <FileEdit className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => onDeleteForm(form)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete Form"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    [copiedId, togglingId, onCopyLink, onTogglePublish, onDeleteForm]
  );

  return (
    <DataTable<LeadForm>
      columns={columns}
      data={forms}
      loading={isLoading}
      loadingMessage="Loading lead forms..."
      loadingVariant="skeleton"
      className={className}
      pagination={
        pagination && pagination.total > 0
          ? {
              currentPage: pagination.current_page,
              totalPages: pagination.last_page,
              totalItems: pagination.total,
              perPage: pagination.per_page,
              onPageChange,
              onPerPageChange,
              perPageOptions,
            }
          : undefined
      }
      emptyState={
        <div className="py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <FormInput className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Lead Forms Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'No forms match your current search or filter criteria. Try clearing filters.'
              : 'Create your first lead capture form to gather contact information from social channels and AutoDM.'}
          </p>
          <button
            type="button"
            onClick={onCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Form</span>
          </button>
        </div>
      }
    />
  );
}
