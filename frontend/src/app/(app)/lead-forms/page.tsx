'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatNumber } from '@/lib/format';
import {
  getLeadForms,
  createLeadForm,
  deleteLeadForm,
  togglePublishForm,
  LeadForm,
  Pagination,
} from '@/lib/api/leadFormsService';
import LeadFormsKpiCards from './components/LeadFormsKpiCards';
import LeadFormsDataTable from './components/LeadFormsDataTable';
import {
  FormInput,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function LeadFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Action State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [formToDelete, setFormToDelete] = useState<LeadForm | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await getLeadForms({
          q: searchTerm.trim() || undefined,
          status: statusFilter,
          page,
          per_page: perPage,
        });
        if (!ignore) {
          setForms(data.forms);
          setPagination(data.pagination);
          setIsLoading(false);
          setHasLoadedInitial(true);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load forms:', err);
          setIsLoading(false);
          setHasLoadedInitial(true);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [searchTerm, statusFilter, page, perPage]);

  const handleCopyLink = (publicId: string, formId: string | number) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/f/${publicId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedId(String(formId));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsCreating(true);
      setCreateError(null);
      const newForm = await createLeadForm({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      router.push(`/lead-forms/${newForm.id}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create form');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTogglePublish = async (form: LeadForm) => {
    try {
      setTogglingId(form.id);
      const res = await togglePublishForm(form.id);
      setForms((prev) =>
        prev.map((f) =>
          f.id === form.id ? { ...f, status: res.status, published_at: res.published_at } : f
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to toggle status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return;
    try {
      setDeletingId(formToDelete.id);
      await deleteLeadForm(formToDelete.id);
      setForms((prev) => prev.filter((f) => f.id !== formToDelete.id));
      setFormToDelete(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete form');
    } finally {
      setDeletingId(null);
    }
  };

  // Aggregated Stats
  const totalFormsCount = pagination?.total ?? forms.length;
  const totalSubmissions = forms.reduce((acc, f) => acc + (f.submissions_count || 0), 0);
  const totalPublished = forms.filter((f) => f.status === 'published').length;
  const totalDrafts = Math.max(0, totalFormsCount - totalPublished);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <FormInput className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Lead Capture Forms</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build high-converting opt-in funnels, connect with Instagram AutoDM, and automatically route inbound leads into your CRM.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-700 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Form</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <LeadFormsKpiCards
        totalForms={totalFormsCount}
        totalPublished={totalPublished}
        totalDrafts={totalDrafts}
        totalSubmissions={totalSubmissions}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by form title..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto self-start sm:self-auto">
          {(['all', 'published', 'draft'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {st === 'all' ? 'All Forms' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Forms Data Table */}
      <LeadFormsDataTable
        forms={forms}
        pagination={pagination}
        isLoading={isLoading && !hasLoadedInitial}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        copiedId={copiedId}
        togglingId={togglingId}
        onCopyLink={handleCopyLink}
        onTogglePublish={handleTogglePublish}
        onDeleteForm={(form) => setFormToDelete(form)}
        onCreateForm={() => setIsCreateModalOpen(true)}
        onPageChange={(p) => setPage(p)}
        onPerPageChange={(size) => {
          setPerPage(size);
          setPage(1);
        }}
        perPageOptions={[10, 15, 25, 50]}
      />

      {/* Create Form Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Create Lead Capture Form</h2>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Draft
              </span>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Form Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. VIP Creator Intake & Launch Waitlist"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Instructions or subheader for respondents..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create & Launch Builder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {formToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200/80 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Lead Form?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-900">{formToDelete.title}</span>?
                All associated submissions ({formToDelete.submissions_count || 0}) will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === formToDelete.id}
                onClick={handleDeleteConfirm}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {deletingId === formToDelete.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
