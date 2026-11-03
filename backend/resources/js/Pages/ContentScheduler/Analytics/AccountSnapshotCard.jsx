import { Send } from 'lucide-react';
import { formatNumber } from './helpers';

export default function AccountSnapshotCard({ overview = {} }) {
    const totals = [
        ['Posts', Number(overview?.posts ?? overview?.total_posts ?? 0)],
        ['Reach', Number(overview?.reach || 0)],
        ['Engagement', Number(overview?.engagement || 0)],
    ];

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <Send className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-base font-black text-slate-900">Account Snapshot</h2>
                    <p className="text-xs font-semibold text-slate-500">
                        Totals for the selected account and range.
                    </p>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {totals.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xl font-black text-slate-900">{formatNumber(value)}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
