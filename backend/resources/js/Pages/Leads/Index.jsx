import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ActiveFilterChips from '@/Components/common/ActiveFilterChips';
import DropdownSelect from '@/Components/common/DropdownSelect';
import PageBanner from '@/Components/common/PageBanner';
import Button from '@/Components/Button';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarClock, ChevronLeft, ChevronRight, Inbox, Mail, Phone, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import KpiCard from '@/Components/common/KpiCard';

const sourceLabels = {
    lead_form_submission: 'Lead Form',
    appointment_booking: 'Appointment',
};

const statusClasses = {
    new: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    booked: 'bg-sky-50 text-sky-700 border-sky-100',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-100',
    archived: 'bg-slate-100 text-slate-600 border-slate-200',
};

const formatDate = (isoString) => {
    if (!isoString) {
        return '-';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(isoString));
};

export default function Index({
    auth,
    filters = {},
    leads,
    source_type_options = [],
    status_options = [],
    summary = {},
}) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [sourceType, setSourceType] = useState(filters.source_type || '');
    const [status, setStatus] = useState(filters.status || '');

    const hasActiveFilters = useMemo(() => (
        searchQuery.trim() !== '' || sourceType !== '' || status !== ''
    ), [searchQuery, sourceType, status]);

    const filtersChanged = useMemo(() => (
        searchQuery !== (filters.search || '') ||
        sourceType !== (filters.source_type || '') ||
        status !== (filters.status || '')
    ), [searchQuery, sourceType, status, filters]);

    const activeFilterChips = useMemo(() => {
        const chips = [];

        if (searchQuery.trim() !== '') {
            chips.push({ key: 'search', label: `Search: ${searchQuery.trim()}` });
        }

        if (sourceType !== '') {
            chips.push({
                key: 'source_type',
                label: source_type_options.find((option) => option.value === sourceType)?.label || sourceType,
                tone: 'info',
            });
        }

        if (status !== '') {
            chips.push({
                key: 'status',
                label: status_options.find((option) => option.value === status)?.label || status,
                tone: 'primary',
            });
        }

        return chips;
    }, [searchQuery, sourceType, source_type_options, status, status_options]);

    const sourceFilterOptions = useMemo(() => [
        { value: '', label: 'All sources' },
        ...source_type_options,
    ], [source_type_options]);

    const statusFilterOptions = useMemo(() => [
        { value: '', label: 'All statuses' },
        ...status_options,
    ], [status_options]);

    const applyFilters = (overrides = {}) => {
        const nextSearch = overrides.search ?? searchQuery;
        const nextSourceType = overrides.sourceType ?? sourceType;
        const nextStatus = overrides.status ?? status;

        router.get(route('crm.index'), {
            ...(nextSearch.trim() !== '' ? { search: nextSearch.trim() } : {}),
            ...(nextSourceType !== '' ? { source_type: nextSourceType } : {}),
            ...(nextStatus !== '' ? { status: nextStatus } : {}),
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setSearchQuery('');
        setSourceType('');
        setStatus('');
        router.get(route('crm.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}
         topbarTitle={"Leads"}
            topbarDescription={"Unified inbox for form submissions and appointments."}
            >
            <Head title="Leads" />

            <div className="space-y-6">
               
                <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                        ['Total', summary.total ?? 0 , 'primary'],
                        ['New', summary.new ?? 0, 'info'],
                        ['Booked', summary.booked ?? 0, 'success'],
                        ['Cancelled', summary.cancelled ?? 0, 'danger'],
                    ].map(([label, value, variant]) => (
                        <KpiCard
                            label={label}
                            value={value}
                            icon={Inbox}
                            helper="Leads"
                            size="compact"
                            variant={variant}
                        />
                    ))}  
                </section>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_auto_auto]">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search name, email, phone, or source"
                                className="h-11 w-full rounded-xl border-slate-200 pl-10 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary-500 focus:ring-primary-500/20"
                            />
                        </label>

                        <DropdownSelect
                            value={sourceType}
                            onChange={setSourceType}
                            options={sourceFilterOptions}
                            ariaLabel="Filter leads by source"
                            buttonClassName="h-11 text-sm font-bold shadow-sm"
                        />

                        <DropdownSelect
                            value={status}
                            onChange={setStatus}
                            options={statusFilterOptions}
                            ariaLabel="Filter leads by status"
                            buttonClassName="h-11 text-sm font-bold shadow-sm"
                        />

                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => applyFilters()}
                            disabled={!filtersChanged}
                            className="h-11 gap-2 rounded-xl px-4"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Apply
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={resetFilters}
                            disabled={!hasActiveFilters}
                            className="h-11 gap-2 rounded-xl px-4"
                        >
                            <X className="h-4 w-4" />
                            Reset
                        </Button>
                    </div>

                    <ActiveFilterChips
                        chips={activeFilterChips}
                        className="mt-3 border-t border-slate-100 pt-3"
                    />
                </div>

                <div className="space-y-3">
                    {leads.data.length === 0 ? (
                        <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                            <Inbox className="h-12 w-12 text-slate-300" />
                            <h2 className="mt-4 text-xl font-black text-slate-950">No leads found</h2>
                            <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">New public form submissions and appointment bookings will appear here.</p>
                        </div>
                    ) : leads.data.map((lead) => (
                        <article key={lead.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500">
                                            {sourceLabels[lead.source_type] || lead.source_type}
                                        </span>
                                        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${statusClasses[lead.status] || statusClasses.archived}`}>
                                            {lead.status}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">#{lead.source_id}</span>
                                    </div>

                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                        <div className="min-w-0">
                                            <h2 className="truncate text-lg font-black text-slate-950">
                                                {lead.name || 'Unnamed lead'}
                                            </h2>
                                            <p className="truncate text-sm font-semibold text-slate-500">
                                                {lead.source_label || 'No source label'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-3 lg:min-w-[34rem]">
                                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                                        <span className="truncate">{lead.email || '-'}</span>
                                    </div>
                                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                        <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                                        <span className="truncate">{lead.phone || '-'}</span>
                                    </div>
                                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                        <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
                                        <span className="truncate">{formatDate(lead.captured_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {leads.links && leads.links.length > 3 && (
                    <nav className="flex items-center justify-center gap-2">
                        {leads.links.map((link, index) => {
                            const label = link.label.replace('&laquo; Previous', '').replace('Next &raquo;', '').trim();
                            const isPrevious = link.label.includes('Previous');
                            const isNext = link.label.includes('Next');

                            return (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url || '#'}
                                    preserveScroll
                                    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-black transition ${link.active
                                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                >
                                    {isPrevious ? <ChevronLeft className="h-4 w-4" /> : isNext ? <ChevronRight className="h-4 w-4" /> : label}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
