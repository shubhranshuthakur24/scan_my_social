import EmptyState from '@/Components/EmptyState';
import { Activity, AlertTriangle, BarChart3, CloudSyncIcon, Globe, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatNumber, formatPercent, toChartDateLabel } from './helpers';

// ─── Constants ────────────────────────────────────────────────────────────────
const metricOptions = [
    { value: 'reach', label: 'Reach' },
    { value: 'impressions', label: 'Impressions' },
    { value: 'engagement', label: 'Engagement' },
];

const CHART_W = 800;
const CHART_H = 220;
const AXIS_LEFT = 52;   // space for Y-axis labels
const AXIS_BOTTOM = 28;   // space for X-axis labels
const INNER_W = CHART_W - AXIS_LEFT - 8;
const INNER_H = CHART_H - AXIS_BOTTOM;
const Y_TICKS = 5;
const BAR_RADIUS = 5;
const ANIM_BASE_MS = 350;
const ANIM_STAGGER = 10;   // ms per bar

const CONTINENT_COLORS = [
    '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#f43f5e', '#6366f1', '#ec4899',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const labelStep = (count) => {
    if (count > 60) return 10;
    if (count > 30) return 5;
    if (count > 14) return 3;
    return 1;
};

const niceMax = (rawMax) => {
    if (rawMax <= 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const normalized = rawMax / magnitude;
    const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return nice * magnitude;
};

const formatAxisValue = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
    return String(v);
};

// ─── ContinentDrawer (unchanged) ─────────────────────────────────────────────
function ContinentDrawer({ isOpen, onClose, dateLabel, metricLabel, metricValue, continentRows, metricKey }) {
    const drawerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen && drawerRef.current) drawerRef.current.focus();
    }, [isOpen]);

    const maxValue = Math.max(1, ...continentRows.map((r) => Number(r?.[metricKey] || 0)));

    return (
        <>
            <div
                className={`fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={drawerRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Continent breakdown"
                className={`fixed right-0 top-0 z-[201] flex h-full w-full max-w-sm flex-col bg-white shadow-2xl outline-none transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-linear-to-b from-slate-50 to-white px-5 py-4">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                            <Globe className="h-[18px] w-[18px]" />
                        </span>
                        <div>
                            <h2 className="text-sm font-black text-slate-900">Continent Breakdown</h2>
                            <p className="text-[11px] font-semibold text-slate-400">{dateLabel}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-0.5 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                        aria-label="Close drawer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Metric total */}
                <div className="mx-5 mt-4 mb-2 flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metricLabel} Total</p>
                        <p className="mt-0.5 text-3xl font-black tracking-tight text-slate-900">{formatNumber(metricValue)}</p>
                    </div>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                        <BarChart3 className="h-5 w-5" />
                    </span>
                </div>

                {continentRows.length > 0 && (
                    <p className="px-5 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">By continent</p>
                )}

                <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2.5">
                    {continentRows.length === 0 ? (
                        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 mb-4">
                                <Globe className="h-5 w-5 text-slate-300" strokeWidth={1.5} />
                            </span>
                            <p className="text-sm font-black text-slate-700">No geographic data yet</p>
                            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-400 max-w-[15rem]">
                                Instagram provides continent-level breakdowns once analytics are synced. Press <span className="font-black text-slate-500">Sync Now</span> in the topbar to fetch data for this date.
                            </p>
                            <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                <p className="text-[11px] font-semibold text-slate-500">Data may take a few minutes after sync</p>
                            </div>
                        </div>
                    ) : continentRows.map((row, i) => {
                        const val = Number(row?.[metricKey] || 0);
                        const barPct = Math.min(100, Math.max(0, (val / maxValue) * 100));
                        const color = CONTINENT_COLORS[i % CONTINENT_COLORS.length];
                        return (
                            <div key={row.continent} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="text-sm font-bold text-slate-700">{row.continent}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-900">{formatNumber(val)}</span>
                                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black" style={{ backgroundColor: color + '22', color }}>
                                            {formatPercent(row.share_percent, 0)}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: color }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// ─── Main chart ───────────────────────────────────────────────────────────────
export default function DailyReachChart({
    dailyMetrics = [],
    dailyMetricDetails = {},
    metric = 'reach',
    onMetricChange = () => { },
    isLoading = false,
    errorMessage = '',
    hasData = false,
    onSyncNow = null,
    lastSyncedAt = null,
}) {
    const safeRows = useMemo(
        () => (Array.isArray(dailyMetrics) ? dailyMetrics : []),
        [dailyMetrics],
    );
    const safeDetails = useMemo(
        () => (dailyMetricDetails && typeof dailyMetricDetails === 'object' && !Array.isArray(dailyMetricDetails) ? dailyMetricDetails : {}),
        [dailyMetricDetails],
    );

    const metricKey = ['reach', 'impressions', 'engagement'].includes(metric) ? metric : 'reach';
    const metricLabel = metricOptions.find((o) => o.value === metricKey)?.label || 'Metric';

    const [selectedDate, setSelectedDate] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Cursor-following tooltip state
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const svgWrapRef = useRef(null);

    // ── Derived values ────────────────────────────────────────────────────────
    const values = useMemo(() => safeRows.map((r) => Number(r?.[metricKey] || 0)), [safeRows, metricKey]);
    const rawMax = Math.max(0, ...values);
    const axisMax = niceMax(rawMax);
    const avgValue = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const peakIdx = values.indexOf(Math.max(...values));
    const totalVal = values.reduce((s, v) => s + v, 0);
    const every = labelStep(safeRows.length);

    // Y-axis ticks
    const yTicks = useMemo(() => {
        return Array.from({ length: Y_TICKS + 1 }, (_, i) => {
            const fraction = i / Y_TICKS;
            return { value: Math.round(axisMax * fraction), y: INNER_H - INNER_H * fraction };
        });
    }, [axisMax]);

    // Bar layout
    const barLayout = useMemo(() => {
        const count = safeRows.length;
        if (!count) return [];
        const gap = Math.max(1, Math.min(4, Math.floor(INNER_W / count * 0.15)));
        const barW = Math.max(4, (INNER_W - gap * (count - 1)) / count);
        return safeRows.map((row, i) => {
            const val = Number(row?.[metricKey] || 0);
            const barH = axisMax > 0 ? (val / axisMax) * INNER_H : 0;
            const x = AXIS_LEFT + i * (barW + gap);
            const y = INNER_H - barH;
            return { x, y, barW, barH, val, date: String(row?.date || '') };
        });
    }, [safeRows, metricKey, axisMax]);

    // Average Y coordinate
    const avgY = axisMax > 0 ? INNER_H - (avgValue / axisMax) * INNER_H : INNER_H;

    // ── Auto-select best day ──────────────────────────────────────────────────
    useEffect(() => {
        if (!safeRows.length) { setSelectedDate(null); return; }
        if (selectedDate && safeRows.some((r) => String(r?.date || '') === selectedDate)) return;
        const best = safeRows.reduce((b, r) => {
            if (!b) return r;
            return Number(r?.[metricKey] || 0) > Number(b?.[metricKey] || 0) ? r : b;
        }, null);
        setSelectedDate(String(best?.date || safeRows[safeRows.length - 1]?.date || ''));
    }, [metricKey, safeRows, selectedDate]);

    const selectedRow = useMemo(() => safeRows.find((r) => String(r?.date || '') === selectedDate) || null, [safeRows, selectedDate]);
    const selectedMetricValue = Number(selectedRow?.[metricKey] || 0);

    const selectedDayContinentRows = useMemo(() => {
        if (!selectedDate) return [];
        const rows = safeDetails?.[selectedDate]?.continents;
        return Array.isArray(rows)
            ? rows.filter((r) => r && typeof r === 'object').map((r) => ({
                continent: String(r?.continent || 'Unknown'),
                reach: Number(r?.reach || 0),
                impressions: Number(r?.impressions || 0),
                engagement: Number(r?.engagement || 0),
                share_percent: Number(r?.share_percent || 0),
            }))
            : [];
    }, [safeDetails, selectedDate]);

    const selectedDateLabel = useMemo(() => {
        const raw = String(selectedRow?.date || selectedDate || '').trim();
        if (!raw) return 'Unknown date';
        const d = new Date(`${raw}T00:00:00`);
        if (Number.isNaN(d.getTime())) return raw;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }, [selectedDate, selectedRow?.date]);

    const hoveredBar = hoveredIndex !== null ? barLayout[hoveredIndex] : null;
    const hoveredRow = hoveredIndex !== null ? safeRows[hoveredIndex] : null;

    const lastSyncedText = lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : null;

    // ── Mouse tracking on the SVG wrapper ────────────────────────────────────
    const handleSvgMouseMove = useCallback((e) => {
        const rect = svgWrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }, []);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

                {/* ── Card header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                            <BarChart3 className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-base font-black text-slate-900">Daily Metrics</h2>
                            <p className="text-xs font-semibold text-slate-500">
                                Track trendlines by day for the selected date range.
                            </p>
                        </div>
                    </div>

                    {/* Metric toggle */}
                    <div
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
                        role="tablist"
                        aria-label="Chart metric toggle"
                    >
                        {metricOptions.map((opt) => {
                            const active = opt.value === metricKey;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => onMetricChange(opt.value)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Loading skeleton ── */}
                {isLoading && (
                    <div className="mt-5 space-y-3">
                        <div className="flex gap-3">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100" />
                            ))}
                        </div>
                        <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
                    </div>
                )}

                {/* ── Error ── */}
                {!isLoading && errorMessage && (
                    <div className="mt-6">
                        <EmptyState className="py-10" title="Chart unavailable" description={errorMessage} icon={AlertTriangle} />
                    </div>
                )}

                {/* ── Empty / no-data state ── */}
                {!isLoading && !errorMessage && !hasData && (
                    <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
                        <div className="flex flex-col items-center text-center">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 mb-4">
                                <Activity className="h-6 w-6 text-primary-400" strokeWidth={1.5} />
                            </span>
                            <p className="text-sm font-black text-slate-800">No analytics snapshots yet</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500 max-w-[22rem]">
                                Sync your account to start seeing daily reach, impressions and engagement data for this date range.
                            </p>
                            <ol className="mt-5 w-full max-w-xs space-y-2 text-left">
                                {[
                                    { n: 1, label: 'Select an Instagram account above' },
                                    { n: 2, label: 'Pick a date range with the date picker' },
                                    { n: 3, label: 'Press Sync Now to pull data from Instagram' },
                                ].map(({ n, label }) => (
                                    <li key={n} className="flex items-center gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-black text-primary-700">{n}</span>
                                        <span className="text-xs font-semibold text-slate-600">{label}</span>
                                    </li>
                                ))}
                            </ol>
                            {onSyncNow && (
                                <button
                                    type="button"
                                    onClick={onSyncNow}
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700"
                                >
                                    <CloudSyncIcon className="h-4 w-4" />
                                    Sync now
                                </button>
                            )}
                            {lastSyncedText && (
                                <p className="mt-3 text-[11px] font-semibold text-slate-400">{lastSyncedText}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Chart (has data) ── */}
                {!isLoading && !errorMessage && hasData && (
                    <div className="mt-5">

                        {/* Summary stat strip */}
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            {[
                                { label: `Total ${metricLabel}`, value: formatNumber(totalVal) },
                                { label: 'Peak day', value: formatNumber(Math.max(0, ...values)) },
                                { label: 'Daily avg', value: formatNumber(Math.round(avgValue)) },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</span>
                                    <span className="text-sm font-black text-slate-800">{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* SVG chart */}
                        <div
                            ref={svgWrapRef}
                            className="relative w-full"
                            onMouseMove={handleSvgMouseMove}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <svg
                                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                                width="100%"
                                preserveAspectRatio="none"
                                aria-label={`${metricLabel} daily bar chart`}
                                style={{ display: 'block', overflow: 'visible' }}
                            >
                                <defs>
                                    <linearGradient id="barGradSelected" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c3aed" />
                                        <stop offset="100%" stopColor="#a78bfa" />
                                    </linearGradient>
                                    <linearGradient id="barGradNormal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#a78bfa" />
                                        <stop offset="100%" stopColor="#c4b5fd" />
                                    </linearGradient>
                                    <linearGradient id="barGradPeak" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c3aed" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                    <style>{`
                                        @keyframes growBar {
                                            from { transform: scaleY(0); }
                                            to   { transform: scaleY(1); }
                                        }
                                        .chart-bar {
                                            transform-origin: bottom;
                                            transform-box: fill-box;
                                            animation: growBar ${ANIM_BASE_MS}ms cubic-bezier(0.34,1.56,0.64,1) both;
                                        }
                                    `}</style>
                                </defs>

                                {/* Y-axis grid lines + labels */}
                                {yTicks.map(({ value, y }) => (
                                    <g key={value}>
                                        <line
                                            x1={AXIS_LEFT}
                                            y1={y}
                                            x2={CHART_W - 4}
                                            y2={y}
                                            stroke="#e2e8f0"
                                            strokeWidth="1"
                                            strokeDasharray={y === INNER_H ? '0' : '4 3'}
                                        />
                                        <text
                                            x={AXIS_LEFT - 6}
                                            y={y + 4}
                                            textAnchor="end"
                                            fontSize="10"
                                            fontWeight="700"
                                            fill="#94a3b8"
                                            fontFamily="inherit"
                                        >
                                            {formatAxisValue(value)}
                                        </text>
                                    </g>
                                ))}

                                {/* Average dashed line */}
                                {avgValue > 0 && (
                                    <g>
                                        <line
                                            x1={AXIS_LEFT}
                                            y1={avgY}
                                            x2={CHART_W - 4}
                                            y2={avgY}
                                            stroke="#f59e0b"
                                            strokeWidth="1.5"
                                            strokeDasharray="5 4"
                                            opacity="0.7"
                                        />
                                        <rect
                                            x={CHART_W - 38}
                                            y={avgY - 9}
                                            width={34}
                                            height={14}
                                            rx="4"
                                            fill="#fef3c7"
                                            stroke="#f59e0b"
                                            strokeWidth="0.8"
                                        />
                                        <text
                                            x={CHART_W - 21}
                                            y={avgY + 1.5}
                                            textAnchor="middle"
                                            fontSize="9"
                                            fontWeight="800"
                                            fill="#d97706"
                                            fontFamily="inherit"
                                        >
                                            AVG
                                        </text>
                                    </g>
                                )}

                                {/* Bars — keyed on metricKey so animation replays on switch */}
                                <g key={metricKey}>
                                    {barLayout.map((bar, i) => {
                                        const isSelected = bar.date === selectedDate;
                                        const isPeak = i === peakIdx && bar.val > 0;
                                        const isHovered = hoveredIndex === i;
                                        const fill = isSelected
                                            ? 'url(#barGradSelected)'
                                            : isPeak
                                                ? 'url(#barGradPeak)'
                                                : 'url(#barGradNormal)';
                                        const opacity = isHovered ? 1 : hoveredIndex !== null ? 0.55 : 1;
                                        const showLabel = i % every === 0 || i === barLayout.length - 1;

                                        return (
                                            <g key={bar.date || i}>
                                                {/* Bar */}
                                                {bar.barH > 0 && (
                                                    <rect
                                                        className="chart-bar"
                                                        x={bar.x}
                                                        y={bar.y}
                                                        width={bar.barW}
                                                        height={bar.barH}
                                                        rx={Math.min(BAR_RADIUS, bar.barW / 2)}
                                                        fill={fill}
                                                        opacity={opacity}
                                                        style={{
                                                            animationDelay: `${i * ANIM_STAGGER}ms`,
                                                            cursor: 'pointer',
                                                            transition: 'opacity 0.15s ease',
                                                        }}
                                                        onClick={() => {
                                                            setSelectedDate(bar.date);
                                                            setDrawerOpen(true);
                                                        }}
                                                        onMouseEnter={() => setHoveredIndex(i)}
                                                        aria-label={`${metricLabel} ${formatNumber(bar.val)} on ${bar.date}`}
                                                    />
                                                )}

                                                {/* Peak crown */}
                                                {isPeak && bar.barH > 0 && (
                                                    <text
                                                        x={bar.x + bar.barW / 2}
                                                        y={bar.y - 4}
                                                        textAnchor="middle"
                                                        fontSize="11"
                                                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                                                    >
                                                        👑
                                                    </text>
                                                )}

                                                {/* X-axis date label */}
                                                {showLabel && (
                                                    <text
                                                        x={bar.x + bar.barW / 2}
                                                        y={INNER_H + 18}
                                                        textAnchor="middle"
                                                        fontSize="9.5"
                                                        fontWeight={isSelected ? '800' : '600'}
                                                        fill={isSelected ? '#7c3aed' : '#94a3b8'}
                                                        fontFamily="inherit"
                                                        style={{ pointerEvents: 'none' }}
                                                    >
                                                        {toChartDateLabel(bar.date, barLayout.length)}
                                                    </text>
                                                )}

                                                {/* Invisible wider hit area for easy hovering */}
                                                <rect
                                                    x={bar.x}
                                                    y={0}
                                                    width={bar.barW}
                                                    height={INNER_H}
                                                    fill="transparent"
                                                    style={{ cursor: 'pointer' }}
                                                    onMouseEnter={() => setHoveredIndex(i)}
                                                    onClick={() => {
                                                        setSelectedDate(bar.date);
                                                        setDrawerOpen(true);
                                                    }}
                                                />
                                            </g>
                                        );
                                    })}
                                </g>
                            </svg>

                            {/* Cursor-following tooltip */}
                            {hoveredBar && hoveredRow && (
                                <div
                                    className="pointer-events-none absolute z-10 min-w-[160px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur-sm"
                                    style={{
                                        left: tooltipPos.x + 14,
                                        top: tooltipPos.y - 56,
                                        transform: tooltipPos.x > (svgWrapRef.current?.offsetWidth ?? 0) - 200
                                            ? 'translateX(-110%)'
                                            : 'none',
                                    }}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                        {(() => {
                                            const d = new Date(`${hoveredBar.date}T00:00:00`);
                                            return Number.isNaN(d.getTime())
                                                ? hoveredBar.date
                                                : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                        })()}
                                    </p>
                                    <p className="mt-0.5 text-lg font-black text-slate-900">
                                        {formatNumber(hoveredBar.val)}
                                    </p>
                                    <p className="text-[10px] font-semibold text-slate-400">{metricLabel}</p>
                                    <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-primary-500">
                                        <span>Click for continent details</span>
                                        <span aria-hidden="true">→</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer hint */}
                        <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">
                            Click any bar to see the continent breakdown for that day
                        </p>
                    </div>
                )}
            </div>

            {/* Slide-in continent drawer */}
            <ContinentDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                dateLabel={selectedDateLabel}
                metricLabel={metricLabel}
                metricValue={selectedMetricValue}
                continentRows={selectedDayContinentRows}
                metricKey={metricKey}
            />
        </>
    );
}
