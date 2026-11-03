import { Link } from '@inertiajs/react';
import { Users } from 'lucide-react';
import { formatDateTime, formatNumber, formatPercent } from './formatters';

const statusToneMap = {
    new: 'bg-sky-100 text-sky-700 border-sky-200',
    booked: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
    archived: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function CrmFunnelSection({ funnel = {} }) {
    const recentLeads = Array.isArray(funnel?.recent_leads) ? funnel.recent_leads : [];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <Users className="h-4.5 w-4.5" />
                    </span>
                    <div>
                        <h2 className="text-base font-black text-slate-900">CRM Funnel</h2>
                        <p className="text-xs font-semibold text-slate-500">Lead status distribution with recent captures.</p>
                    </div>
                </div>

                <Link
                    href={route().has('crm.index') ? route('crm.index') : '/crm'}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                >
                    Open CRM
                </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatNumber(funnel?.total || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">New</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatNumber(funnel?.new || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Booked</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatNumber(funnel?.booked || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Cancelled</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatNumber(funnel?.cancelled || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Booked Rate</p>
                    <p className="mt-1 text-lg font-black text-emerald-600">{formatPercent(funnel?.booked_rate_percent || 0)}</p>
                </div>
            </div>

            <div className="mt-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Leads</h3>
                {recentLeads.length === 0 ? (
                    <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 text-xs font-semibold text-slate-500">
                        No leads captured yet.
                    </p>
                ) : (
                    <div className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
                        {recentLeads.map((lead) => (
                            <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800">{lead.name || 'Unnamed lead'}</p>
                                    <p className="truncate text-xs font-semibold text-slate-500">
                                        {lead.email || 'No email'} {lead.source_label ? `• ${lead.source_label}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusToneMap[lead.status] || statusToneMap.archived}`}>
                                        {lead.status || 'unknown'}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500">{formatDateTime(lead.captured_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
