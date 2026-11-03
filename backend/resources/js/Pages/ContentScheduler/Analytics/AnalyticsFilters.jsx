import { Popover, Transition } from '@headlessui/react';
import { format as formatDate } from 'date-fns';
import { CalendarRange } from 'lucide-react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './AnalyticsDateRange.css';
import { resolvePresetRange, toLocalDateValue } from './helpers';

const presets = [
    { value: 'all_time', label: 'All time' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'this_month', label: 'This month' },
];

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());

const parseIsoDate = (value) => {
    if (!isIsoDate(value)) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
};

const formatDateLabel = (value) => {
    const parsed = parseIsoDate(value);
    if (!parsed) return '';
    return formatDate(parsed, 'dd MMM yyyy');
};

const resolvePresetFromRange = (start, end) => {
    for (const preset of presets) {
        const range = resolvePresetRange(preset.value);
        if (range && range.start === start && range.end === end) {
            return preset.value;
        }
    }
    return 'custom';
};

export default function AnalyticsFilters({
    dateRange = {},
    onApply = () => {},
}) {
    const currentStart = String(dateRange?.start || '');
    const currentEnd = String(dateRange?.end || '');
    const currentPreset = String(dateRange?.preset || 'custom');

    const [dateDraft, setDateDraft] = useState({ start: currentStart, end: currentEnd, preset: currentPreset });

    const currentDateRangeLabel = useMemo(() => {
        if (currentPreset === 'all_time') return 'All time';
        const s = formatDateLabel(currentStart);
        const e = formatDateLabel(currentEnd);
        if (s && e) return `${s} – ${e}`;
        return s || e || 'Select range';
    }, [currentStart, currentEnd, currentPreset]);

    const draftDateRangeLabel = useMemo(() => {
        if (dateDraft.preset === 'all_time') return 'All time';
        const s = formatDateLabel(dateDraft.start);
        const e = formatDateLabel(dateDraft.end);
        if (s && e) return `${s} – ${e}`;
        return s || e || 'Select range';
    }, [dateDraft.start, dateDraft.end, dateDraft.preset]);

    const initDraft = useCallback(() => {
        setDateDraft({ start: currentStart, end: currentEnd, preset: currentPreset });
    }, [currentStart, currentEnd, currentPreset]);

    const handlePresetSelect = useCallback((presetValue) => {
        if (presetValue === 'all_time') {
            setDateDraft({ start: '', end: '', preset: 'all_time' });
            return;
        }

        const range = resolvePresetRange(presetValue);
        if (!range) return;
        setDateDraft({ start: range.start, end: range.end, preset: presetValue });
    }, []);

    const handleCalendarChange = useCallback((ranges) => {
        const selection = ranges?.selection;
        if (!selection?.startDate || !selection?.endDate) return;
        const nextStart = toLocalDateValue(selection.startDate);
        const nextEnd = toLocalDateValue(selection.endDate);
        setDateDraft({ start: nextStart, end: nextEnd, preset: resolvePresetFromRange(nextStart, nextEnd) });
    }, []);

    const applyDraft = useCallback((close) => {
        onApply(dateDraft.start, dateDraft.end);
        close();
    }, [dateDraft, onApply]);

    const pickerStartDate = useMemo(() => {
        return parseIsoDate(dateDraft.start) || parseIsoDate(currentStart) || (() => {
            const d = new Date();
            d.setDate(d.getDate() - 29);
            return d;
        })();
    }, [dateDraft.start, currentStart]);

    const pickerEndDate = useMemo(() => {
        return parseIsoDate(dateDraft.end) || parseIsoDate(currentEnd) || new Date();
    }, [dateDraft.end, currentEnd]);

    return (
        <section>
            <Popover className="relative">
                {({ close }) => (
                    <>
                        <Popover.Button
                            onClick={initDraft}
                            className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            aria-label="Open date range picker"
                        >
                            <span className="truncate">{currentDateRangeLabel}</span>
                            <CalendarRange className="h-4 w-4 shrink-0 text-slate-500" />
                        </Popover.Button>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-150"
                            enterFrom="opacity-0 translate-y-1"
                            enterTo="opacity-100 translate-y-0"
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100 translate-y-0"
                            leaveTo="opacity-0 translate-y-1"
                        >
                            <Popover.Panel className="absolute right-0 z-[120] mt-2 w-[min(94vw,796px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10">
                                <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                                    {/* Presets */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                            Presets
                                        </p>
                                        <div className="space-y-1">
                                            {presets.map((preset) => (
                                                <button
                                                    key={preset.value}
                                                    type="button"
                                                    onClick={() => handlePresetSelect(preset.value)}
                                                    aria-pressed={dateDraft.preset === preset.value}
                                                    className={`flex w-full items-center justify-start rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 ${
                                                        dateDraft.preset === preset.value
                                                            ? 'border-primary-200 bg-primary-50 text-primary-700'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Calendar */}
                                    <div className="space-y-3">
                                        <div className="analytics-date-range-calendar overflow-hidden rounded-xl border border-slate-200 p-2">
                                            <DateRange
                                                ranges={
                                                    dateDraft.preset === 'all_time'
                                                        ? []
                                                        : [{
                                                              startDate: pickerStartDate,
                                                              endDate: pickerEndDate,
                                                              key: 'selection',
                                                          }]
                                                }
                                                onChange={handleCalendarChange}
                                                months={2}
                                                direction="horizontal"
                                                showDateDisplay={false}
                                                moveRangeOnFirstSelection={false}
                                                editableDateInputs={false}
                                                rangeColors={['#a78bfa']}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-xs font-semibold text-slate-600">
                                                {draftDateRangeLabel}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => close()}
                                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyDraft(close)}
                                                    className="inline-flex h-9 items-center justify-center rounded-lg bg-primary-600 px-3 text-sm font-bold text-white transition hover:bg-primary-700"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Popover.Panel>
                        </Transition>
                    </>
                )}
            </Popover>
        </section>
    );
}
