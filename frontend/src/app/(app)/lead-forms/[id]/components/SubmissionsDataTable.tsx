'use client';

import React, { useMemo } from 'react';
import DataTable, { DataTableColumn } from '@/components/ui/DataTable';
import { LeadFormSubmission, LeadFormField, Pagination } from '@/lib/api/leadFormsService';
import { Users, Download, Loader2 } from 'lucide-react';

export interface SubmissionsDataTableProps {
  submissions: LeadFormSubmission[];
  fields: LeadFormField[];
  pagination: Pagination | null;
  isLoading?: boolean;
  isExporting?: boolean;
  onExportCsv: () => void;
  onPageChange: (page: number) => void;
  onPerPageChange?: (size: number) => void;
  perPageOptions?: number[];
  className?: string;
}

export default function SubmissionsDataTable({
  submissions,
  fields,
  pagination,
  isLoading = false,
  isExporting = false,
  onExportCsv,
  onPageChange,
  onPerPageChange,
  perPageOptions,
  className = '',
}: SubmissionsDataTableProps) {
  const submissionColumns = useMemo<DataTableColumn<LeadFormSubmission>[]>(() => {
    const cols: DataTableColumn<LeadFormSubmission>[] = [
      {
        key: 'id',
        header: 'ID',
        render: (sub) => (
          <span className="font-mono text-slate-400 text-[11px]">#{sub.id}</span>
        ),
      },
      {
        key: 'submitted_at',
        header: 'Submitted Date',
        render: (sub) => (
          <span className="whitespace-nowrap text-slate-700 font-medium">
            {new Date(sub.submitted_at).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        key: 'ip',
        header: 'IP',
        render: (sub) => (
          <span className="font-mono text-[11px] text-slate-400">{sub.ip || '—'}</span>
        ),
      },
    ];

    fields.forEach((f) => {
      cols.push({
        key: f.key,
        header: f.label,
        render: (sub) => {
          const val = sub.data?.[f.key];
          return (
            <span
              className="max-w-xs truncate block text-slate-900 font-medium"
              title={String(val ?? '')}
            >
              {Array.isArray(val)
                ? val.join(', ')
                : typeof val === 'object' && val !== null
                  ? JSON.stringify(val)
                  : String(val ?? '—')}
            </span>
          );
        },
      });
    });

    return cols;
  }, [fields]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Submissions Action Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Respondent Submissions
          </h2>
          <p className="text-xs text-slate-500">
            View and export form responses captured across your campaigns.
          </p>
        </div>

        <button
          type="button"
          disabled={isExporting || submissions.length === 0}
          onClick={onExportCsv}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>Export CSV</span>
        </button>
      </div>

      {/* Reusable Data Table */}
      <DataTable<LeadFormSubmission>
        columns={submissionColumns}
        data={submissions}
        loading={isLoading}
        loadingMessage="Loading submission records..."
        loadingVariant="skeleton"
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
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Submissions Recorded</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Share your form public link or connect with AutoDM to start collecting leads.
            </p>
          </div>
        }
      />
    </div>
  );
}
