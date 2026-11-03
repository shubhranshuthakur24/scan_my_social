import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarToolbarProps {
  calendarHeaderTitle: string;
  viewMode: 'month' | 'week' | 'day';
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  calendarHeaderTitle,
  viewMode,
  setViewMode,
  onPrev,
  onNext,
  onToday,
}) => {
  return (
    <div className="p-3.5 sm:p-4 border-b border-slate-100">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Grouped Arrows [<] [>] + [Today] button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl border border-slate-300 bg-white shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={onPrev}
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-r border-slate-200 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={onToday}
            className="h-9 px-4 rounded-xl bg-primary-600 text-white text-xs font-black shadow-xs hover:bg-primary-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title="Jump to Today"
          >
            Today
          </button>
        </div>

        {/* Center: Title */}
        <div className="text-center">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {calendarHeaderTitle}
          </h2>
        </div>

        {/* Right: Segmented [Month | Week | Day] Switch */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden p-0.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              viewMode === 'month'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              viewMode === 'week'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              viewMode === 'day'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Day
          </button>
        </div>
      </div>
    </div>
  );
};
