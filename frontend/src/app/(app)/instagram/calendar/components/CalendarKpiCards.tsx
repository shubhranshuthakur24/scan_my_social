import React from 'react';
import { Clock3, LoaderCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CalendarKpiCardsProps {
  statusCounts: {
    scheduled: number;
    publishing: number;
    published: number;
    failed: number;
  };
}

export const CalendarKpiCards: React.FC<CalendarKpiCardsProps> = ({ statusCounts }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Scheduled Card */}
      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Scheduled Posts</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{statusCounts.scheduled}</h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 mt-1">
            <Clock3 size={12} /> Ready for queue
          </span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
          <Clock3 size={24} />
        </div>
      </div>

      {/* In Queue Card */}
      <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">In Queue / Publishing</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{statusCounts.publishing}</h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 mt-1">
            <LoaderCircle size={12} className="animate-spin" /> Processing via Meta API
          </span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <LoaderCircle size={24} />
        </div>
      </div>

      {/* Published Card */}
      <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Published Posts</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{statusCounts.published}</h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <CheckCircle2 size={12} /> Live on Instagram
          </span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 size={24} />
        </div>
      </div>

      {/* Failed Card */}
      <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Failed / Errors</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{statusCounts.failed}</h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 mt-1">
            {statusCounts.failed === 0 ? 'Zero delivery issues' : 'Needs attention'}
          </span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertTriangle size={24} />
        </div>
      </div>
    </div>
  );
};
