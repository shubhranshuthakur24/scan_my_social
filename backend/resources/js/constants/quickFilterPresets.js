/**
 * Quick-filter preset definitions for the Content Library.
 *
 * Each preset maps to a partial filter-state snapshot that will be merged
 * into the existing filter state via applyFiltersFromSnapshot().
 *
 * @typedef {{ key: string, label: string, emoji: string, colorScheme: QuickFilterColorScheme, filters: object }} QuickFilterPreset
 * @typedef {{ pill: string, pillActive: string }} QuickFilterColorScheme
 */

export const QUICK_FILTER_PRESETS = [
    {
        key: 'all',
        label: 'All Videos',
        emoji: null,
        colorScheme: {
            pill: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            pillActive: 'border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200',
        },
        /** Signals a full clear — handled specially in the consumer. */
        filters: null,
    },
    {
        key: 'explosive',
        label: 'Explosive',
        emoji: '🔥',
        colorScheme: {
            pill: 'border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-50',
            pillActive: 'border-rose-400 bg-rose-100 text-rose-800 ring-1 ring-rose-300',
        },
        filters: {
            outlier_min: '5',
            outlier_max: '',
            engagement_min: '',
            engagement_max: '',
            views_min: '',
            views_max: '',
            date_value: '0',
            date_unit: 'Months',
            search: '',
            platform: [],
            creator: [],
            watchlist: [],
            label: [],
            sort_by: 'outlier_score',
            sort_dir: 'desc',
        },
    },
    {
        key: 'breakouts',
        label: 'Breakouts',
        emoji: '⚡',
        colorScheme: {
            pill: 'border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-50',
            pillActive: 'border-amber-400 bg-amber-100 text-amber-800 ring-1 ring-amber-300',
        },
        filters: {
            outlier_min: '3',
            outlier_max: '',
            engagement_min: '',
            engagement_max: '',
            views_min: '',
            views_max: '',
            date_value: '0',
            date_unit: 'Months',
            search: '',
            platform: [],
            creator: [],
            watchlist: [],
            label: [],
            sort_by: 'outlier_score',
            sort_dir: 'desc',
        },
    },
    {
        key: 'last_48h',
        label: 'Last 48 Hours',
        emoji: '📅',
        colorScheme: {
            pill: 'border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-50',
            pillActive: 'border-blue-400 bg-blue-100 text-blue-800 ring-1 ring-blue-300',
        },
        filters: {
            outlier_min: '',
            outlier_max: '',
            engagement_min: '',
            engagement_max: '',
            views_min: '',
            views_max: '',
            date_value: '2',
            date_unit: 'Days',
            search: '',
            platform: [],
            creator: [],
            watchlist: [],
            label: [],
            sort_by: 'posted_date',
            sort_dir: 'desc',
        },
    },
    {
        key: 'high_engagement',
        label: 'High Engagement',
        emoji: '🎯',
        colorScheme: {
            pill: 'border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-50',
            pillActive: 'border-emerald-400 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
        },
        filters: {
            outlier_min: '',
            outlier_max: '',
            engagement_min: '5',
            engagement_max: '',
            views_min: '',
            views_max: '',
            date_value: '0',
            date_unit: 'Months',
            search: '',
            platform: [],
            creator: [],
            watchlist: [],
            label: [],
            sort_by: 'engagement_rate',
            sort_dir: 'desc',
        },
    },
];
