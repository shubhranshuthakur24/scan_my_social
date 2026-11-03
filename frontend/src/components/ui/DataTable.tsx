'use client';

import React from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Skeleton from './Skeleton';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  accessor?: keyof T;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

export interface DataTablePagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  perPageOptions?: number[];
  onPerPageChange?: (perPage: number) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  loading?: boolean;
  loadingMessage?: string;
  loadingVariant?: 'skeleton' | 'spinner';
  emptyState?: React.ReactNode;
  pagination?: DataTablePagination;
  rowClassName?: string | ((item: T, index: number) => string);
  className?: string;
  tableClassName?: string;
  minWidth?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  loadingMessage = 'Loading records...',
  loadingVariant = 'skeleton',
  emptyState,
  pagination,
  rowClassName,
  className = '',
  tableClassName = '',
  minWidth,
}: DataTableProps<T>) {
  // Key resolver: keyExtractor -> item.id -> array index
  const resolveRowKey = (item: T, index: number): string | number => {
    if (keyExtractor) {
      return keyExtractor(item, index);
    }
    if (item && typeof item === 'object' && 'id' in item) {
      const idVal = (item as Record<string, unknown>).id;
      if (typeof idVal === 'string' || typeof idVal === 'number') {
        return idVal;
      }
    }
    return index;
  };

  // Alignment helpers
  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  // Pagination calculation
  const startItem = pagination
    ? pagination.totalItems === 0
      ? 0
      : (pagination.currentPage - 1) * pagination.perPage + 1
    : 0;
  const endItem = pagination
    ? Math.min(pagination.currentPage * pagination.perPage, pagination.totalItems)
    : 0;

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table
          className={cn('w-full text-left border-collapse', tableClassName)}
          style={minWidth ? { minWidth } : undefined}
        >
          {/* Table Header */}
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'py-3.5 px-4 sm:px-6',
                    getAlignmentClass(col.align),
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
            {loading ? (
              loadingVariant === 'spinner' ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
                      <p className="text-xs text-slate-500 font-medium">{loadingMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                /* Skeleton Loading: 5 realistic placeholder rows */
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`skeleton-row-${rowIndex}`} className="animate-pulse">
                    {columns.map((col, colIndex) => (
                      <td
                        key={`skeleton-cell-${col.key}-${colIndex}`}
                        className={cn(
                          'py-3.5 px-4 sm:px-6',
                          getAlignmentClass(col.align)
                        )}
                      >
                        <Skeleton
                          variant="text"
                          className={cn(
                            'h-4 bg-slate-200/60',
                            col.align === 'right'
                              ? 'ml-auto w-16'
                              : col.align === 'center'
                                ? 'mx-auto w-20'
                                : colIndex === 0
                                  ? 'w-3/4'
                                  : 'w-1/2'
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState ?? (
                    <div className="py-16 px-6 text-center">
                      <p className="text-sm font-bold text-slate-800">No records found</p>
                      <p className="text-xs text-slate-400 mt-1">There is no data to display.</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const rowKey = resolveRowKey(item, index);
                const customRowClass =
                  typeof rowClassName === 'function'
                    ? rowClassName(item, index)
                    : rowClassName;

                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      'hover:bg-slate-50/70 transition-colors',
                      customRowClass
                    )}
                  >
                    {columns.map((col) => {
                      const renderedContent = col.render
                        ? col.render(item, index)
                        : col.accessor && item && typeof item === 'object'
                          ? String((item as Record<string, unknown>)[col.accessor as string] ?? '—')
                          : null;

                      return (
                        <td
                          key={`${String(rowKey)}-${col.key}`}
                          className={cn(
                            'py-3.5 px-4 sm:px-6',
                            getAlignmentClass(col.align),
                            col.className
                          )}
                        >
                          {renderedContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && pagination && pagination.totalPages > 0 && (
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white select-none">
          {/* Left: Summary & Per-Page Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Showing <span className="font-bold text-slate-700">{startItem}</span> to{' '}
              <span className="font-bold text-slate-700">{endItem}</span> of{' '}
              <span className="font-bold text-slate-700">{pagination.totalItems}</span> records
            </span>

            {pagination.onPerPageChange && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 text-xs">
                <span className="text-slate-400 font-medium">Rows:</span>
                <select
                  value={pagination.perPage}
                  onChange={(e) => pagination.onPerPageChange!(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-colors"
                  aria-label="Rows per page"
                >
                  {(pagination.perPageOptions ?? [10, 15, 25, 50, 100]).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right: Previous, Numbered Pages, Next */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs mr-1"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Desktop: Numbered page pills */}
            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers(pagination.currentPage, pagination.totalPages).map((p, idx) =>
                p === '...' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 font-bold select-none text-xs"
                  >
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={`page-${p}`}
                    onClick={() => pagination.onPageChange(p)}
                    className={cn(
                      'min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      p === pagination.currentPage
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                    aria-current={p === pagination.currentPage ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            {/* Mobile: Compact page indicator */}
            <span className="sm:hidden px-2 text-xs font-bold text-slate-700">
              {pagination.currentPage} / {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs ml-1"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
