import React, { useMemo } from 'react';
import { QUICK_FILTER_PRESETS } from '@/constants/quickFilterPresets';

/**
 * Derives the active preset key by comparing current filter state
 * against each preset's filter snapshot.
 *
 * @param {object} currentFilters - The live filter state from buildCurrentFiltersPayload().
 * @returns {string|null} The matching preset key, or null if no preset matches.
 */
function deriveActivePresetKey(currentFilters) {
    if (!currentFilters) return 'all';

    // Check if all filters are at their defaults (matches "All Videos")
    const isDefault =
        !currentFilters.search &&
        (!currentFilters.platform || currentFilters.platform.length === 0) &&
        (!currentFilters.creator || currentFilters.creator.length === 0) &&
        (!currentFilters.watchlist || currentFilters.watchlist.length === 0) &&
        (!currentFilters.label || currentFilters.label.length === 0) &&
        !currentFilters.engagement_min &&
        !currentFilters.engagement_max &&
        !currentFilters.views_min &&
        !currentFilters.views_max &&
        !currentFilters.outlier_min &&
        !currentFilters.outlier_max &&
        (currentFilters.date_value === '0' || currentFilters.date_value === 0 || !currentFilters.date_value);

    if (isDefault) return 'all';

    // Match against each named preset
    for (const preset of QUICK_FILTER_PRESETS) {
        if (!preset.filters) continue;

        const pf = preset.filters;
        const cf = currentFilters;

        const matches =
            (cf.outlier_min ?? '') === (pf.outlier_min ?? '') &&
            (cf.outlier_max ?? '') === (pf.outlier_max ?? '') &&
            (cf.engagement_min ?? '') === (pf.engagement_min ?? '') &&
            (cf.engagement_max ?? '') === (pf.engagement_max ?? '') &&
            (cf.views_min ?? '') === (pf.views_min ?? '') &&
            (cf.views_max ?? '') === (pf.views_max ?? '') &&
            String(cf.date_value ?? '0') === String(pf.date_value ?? '0') &&
            (cf.date_unit ?? 'Months') === (pf.date_unit ?? 'Months') &&
            (cf.search ?? '') === (pf.search ?? '') &&
            (cf.sort_by ?? 'posted_date') === (pf.sort_by ?? 'posted_date') &&
            (cf.sort_dir ?? 'desc') === (pf.sort_dir ?? 'desc') &&
            JSON.stringify([...(cf.platform ?? [])].sort()) === JSON.stringify([...(pf.platform ?? [])].sort()) &&
            JSON.stringify([...(cf.creator ?? [])].sort()) === JSON.stringify([...(pf.creator ?? [])].sort()) &&
            JSON.stringify([...(cf.watchlist ?? [])].sort()) === JSON.stringify([...(pf.watchlist ?? [])].sort()) &&
            JSON.stringify([...(cf.label ?? [])].sort()) === JSON.stringify([...(pf.label ?? [])].sort());

        if (matches) return preset.key;
    }

    return null;
}

/**
 * @param {{
 *   currentFilters: object,
 *   onApplyPreset: (preset: import('@/constants/quickFilterPresets').QuickFilterPreset) => void,
 *   onClear: () => void,
 * }} props
 */
export default function QuickFilterPills({ currentFilters, onApplyPreset, onClear }) {
    const activeKey = useMemo(
        () => deriveActivePresetKey(currentFilters),
        [currentFilters],
    );

    return (
        <div
            className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Quick filter presets"
        >
            {QUICK_FILTER_PRESETS.map((preset) => {
                const isActive = activeKey === preset.key;
                const colorClass = isActive
                    ? preset.colorScheme.pillActive
                    : preset.colorScheme.pill;

                return (
                    <button
                        key={preset.key}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                            if (preset.filters === null) {
                                onClear();
                            } else {
                                onApplyPreset(preset);
                            }
                        }}
                        className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-bold shadow-sm transition-all duration-150 active:scale-95 ${colorClass}`}
                    >
                        {preset.emoji && (
                            <span className="text-sm leading-none" aria-hidden="true">
                                {preset.emoji}
                            </span>
                        )}
                        {preset.label}
                        {isActive && preset.key !== 'all' && (
                            <span className="ml-0.5 flex h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
