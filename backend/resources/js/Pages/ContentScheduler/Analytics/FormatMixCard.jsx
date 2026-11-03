import { useMemo, useState } from 'react';
import { formatNumber, formatPercent } from './helpers';

const FORMAT_COLORS = {
    reel:     { fill: '#8b5cf6', light: '#ede9fe' },
    story:    { fill: '#0ea5e9', light: '#e0f2fe' },
    carousel: { fill: '#f59e0b', light: '#fef3c7' },
    image:    { fill: '#10b981', light: '#d1fae5' },
    video:    { fill: '#f43f5e', light: '#ffe4e6' },
};
const FALLBACK_COLORS = [
    { fill: '#6366f1', light: '#e0e7ff' },
    { fill: '#ec4899', light: '#fce7f3' },
    { fill: '#14b8a6', light: '#ccfbf1' },
];

const labelMap = {
    reel: 'Reel', story: 'Story', carousel: 'Carousel', image: 'Image', video: 'Video',
};

const CX = 80;
const CY = 80;
const R  = 62;
const INNER_R = 40;
const GAP_DEG = 2;

function polarToXY(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, outerR, innerR, startDeg, endDeg) {
    const o1 = polarToXY(cx, cy, outerR, startDeg);
    const o2 = polarToXY(cx, cy, outerR, endDeg);
    const i1 = polarToXY(cx, cy, innerR, endDeg);
    const i2 = polarToXY(cx, cy, innerR, startDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return [
        `M ${o1.x} ${o1.y}`,
        `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
        `L ${i1.x} ${i1.y}`,
        `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
        'Z',
    ].join(' ');
}

export default function FormatMixCard({ formatBreakdown = [] }) {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const rows = Array.isArray(formatBreakdown) ? formatBreakdown : [];
    const hasData = rows.some((r) => Number(r?.count || 0) > 0);

    const slices = useMemo(() => {
        const total = rows.reduce((s, r) => s + Number(r?.count || 0), 0) || 1;
        let cursor = 0;
        return rows
            .filter((r) => Number(r?.count || 0) > 0)
            .sort((a, b) => Number(b.count) - Number(a.count))
            .map((r, i) => {
                const fk    = String(r?.format || '').toLowerCase();
                const share = (Number(r.count) / total) * 100;
                const sweep = (share / 100) * (360 - GAP_DEG * rows.length);
                const startDeg = cursor;
                cursor += sweep + GAP_DEG;
                const color = FORMAT_COLORS[fk] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
                return {
                    key:        fk || String(i),
                    label:      r?.label || labelMap[fk] || 'Other',
                    count:      Number(r.count),
                    share,
                    startDeg,
                    endDeg:     cursor - GAP_DEG,
                    color,
                };
            });
    }, [rows]);

    const hoveredSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-slate-900">Format Mix</h2>
            <p className="text-xs font-semibold text-slate-500">Post distribution by content type</p>

            {!hasData ? (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                    No Instagram media in this range.
                </p>
            ) : (
                <div className="mt-4 flex flex-col items-center gap-5">
                    {/* Donut */}
                    <div className="relative">
                        <svg
                            width={160}
                            height={160}
                            viewBox="0 0 160 160"
                            aria-label="Format distribution donut chart"
                        >
                            {slices.map((slice, i) => {
                                const isHovered = hoveredIndex === i;
                                const outerR = isHovered ? R + 5 : R;
                                return (
                                    <path
                                        key={slice.key}
                                        d={describeArc(CX, CY, outerR, INNER_R, slice.startDeg, slice.endDeg)}
                                        fill={slice.color.fill}
                                        opacity={hoveredIndex !== null && !isHovered ? 0.45 : 1}
                                        style={{ transition: 'all 0.18s ease', cursor: 'pointer' }}
                                        onMouseEnter={() => setHoveredIndex(i)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        aria-label={`${slice.label}: ${formatPercent(slice.share)}`}
                                    />
                                );
                            })}
                        </svg>

                        {/* Centre label */}
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                            {hoveredSlice ? (
                                <>
                                    <span className="text-lg font-black text-slate-900">
                                        {formatPercent(hoveredSlice.share, 0)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        {hoveredSlice.label}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-lg font-black text-slate-900">
                                        {formatNumber(rows.reduce((s, r) => s + Number(r?.count || 0), 0))}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        Posts
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="w-full space-y-2">
                        {slices.map((slice, i) => (
                            <div
                                key={slice.key}
                                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition"
                                style={{
                                    backgroundColor: hoveredIndex === i
                                        ? slice.color.light
                                        : hoveredIndex !== null ? 'transparent' : slice.color.light + '80',
                                    cursor: 'default',
                                }}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: slice.color.fill }}
                                    />
                                    <span className="text-sm font-bold text-slate-700">{slice.label}</span>
                                </div>
                                <div className="flex items-center gap-2 text-right">
                                    <span className="text-xs font-semibold text-slate-500">{formatNumber(slice.count)}</span>
                                    <span
                                        className="min-w-[3rem] rounded-full px-2 py-0.5 text-xs font-black"
                                        style={{ backgroundColor: slice.color.fill + '22', color: slice.color.fill }}
                                    >
                                        {formatPercent(slice.share, 0)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
