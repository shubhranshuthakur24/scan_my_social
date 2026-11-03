import React from 'react';
import {
  Clock,
  Flame,
  Eye,
  Percent,
  Rocket,
  Sparkles,
  TrendingUp,
  Activity,
} from 'lucide-react';
import type { ContentLibraryFilters } from '@/types/contentLibrary';

export interface SortOption {
  id: string;
  field: 'outlier_score' | 'views' | 'engagement_rate' | 'posted_date';
  dir: 'asc' | 'desc';
  label: string;
  icon: React.ElementType;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: 'posted_date-desc', field: 'posted_date', dir: 'desc', label: 'Newest First', icon: Clock },
  { id: 'outlier_score-desc', field: 'outlier_score', dir: 'desc', label: 'Highest Outlier (Score)', icon: Flame },
  { id: 'views-desc', field: 'views', dir: 'desc', label: 'Most Views', icon: Eye },
  { id: 'engagement_rate-desc', field: 'engagement_rate', dir: 'desc', label: 'Highest Engagement', icon: Percent },
  { id: 'posted_date-asc', field: 'posted_date', dir: 'asc', label: 'Oldest First', icon: Clock },
];

export interface DateRangeOption {
  id: string;
  value?: number;
  unit: 'Days' | 'Weeks' | 'Months' | 'Years';
  label: string;
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { id: 'all', label: 'All Time', unit: 'Days' },
  { id: '2-Days', value: 2, unit: 'Days', label: 'Past 48 Hours' },
  { id: '7-Days', value: 7, unit: 'Days', label: 'Past 7 Days' },
  { id: '30-Days', value: 30, unit: 'Days', label: 'Past 30 Days' },
  { id: '3-Months', value: 3, unit: 'Months', label: 'Past 3 Months' },
  { id: '1-Years', value: 1, unit: 'Years', label: 'Past Year' },
];

export const PLATFORM_OPTIONS = [
  { id: 'all', label: 'All Platforms' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
];

export interface PerformanceOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  badgeClass: string;
}

export const PERFORMANCE_OPTIONS: PerformanceOption[] = [
  { id: 'Explosive', label: 'Explosive', desc: '≥ 75x multiplier', icon: Flame, badgeClass: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'Breakout', label: 'Breakout', desc: '≥ 25x multiplier', icon: Rocket, badgeClass: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'Outlier', label: 'Outlier', desc: '≥ 10x multiplier', icon: Sparkles, badgeClass: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'Strong', label: 'Strong', desc: '≥ 5x multiplier', icon: TrendingUp, badgeClass: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'Normal', label: 'Normal', desc: 'Standard', icon: Activity, badgeClass: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export interface QuickFilterPreset {
  key: string;
  label: string;
  emoji?: string;
  activeClass: string;
  filters: Partial<ContentLibraryFilters> | null;
}

export const QUICK_FILTER_PRESETS: QuickFilterPreset[] = [
  {
    key: 'all',
    label: 'All Videos',
    activeClass: 'border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200',
    filters: null,
  },
  {
    key: 'explosive',
    label: 'Explosive',
    emoji: '🔥',
    activeClass: 'border-rose-400 bg-rose-100 text-rose-800 ring-1 ring-rose-300',
    filters: {
      outlier_min: 5,
      sort_by: 'outlier_score',
      sort_dir: 'desc',
    },
  },
  {
    key: 'breakouts',
    label: 'Breakouts',
    emoji: '⚡',
    activeClass: 'border-amber-400 bg-amber-100 text-amber-800 ring-1 ring-amber-300',
    filters: {
      outlier_min: 3,
      sort_by: 'outlier_score',
      sort_dir: 'desc',
    },
  },
  {
    key: 'last_48h',
    label: 'Last 48 Hours',
    emoji: '📅',
    activeClass: 'border-blue-400 bg-blue-100 text-blue-800 ring-1 ring-blue-300',
    filters: {
      date_value: 2,
      date_unit: 'Days',
      sort_by: 'posted_date',
      sort_dir: 'desc',
    },
  },
  {
    key: 'high_engagement',
    label: 'High Engagement',
    emoji: '🎯',
    activeClass: 'border-emerald-400 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
    filters: {
      engagement_min: 5,
      sort_by: 'engagement_rate',
      sort_dir: 'desc',
    },
  },
];
