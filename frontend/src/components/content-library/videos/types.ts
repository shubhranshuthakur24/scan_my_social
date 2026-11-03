import type {
  ChannelItem,
  WatchlistItem,
  ProjectItem,
  SavedFilterItem,
} from '@/types/contentLibrary';
import type { QuickFilterPreset } from './constants';

export interface ActiveVideoFilters {
  search: string;
  selectedPlatform: string;
  selectedCreators: string[];
  selectedLabels: string[];
  minOutlier?: number;
  viewsMin?: number;
  engagementMin?: number;
  dateValue?: number;
  dateUnit: 'Days' | 'Weeks' | 'Months' | 'Years';
  selectedWatchlistId?: number;
  selectedProjectId?: number;
  sortBy: 'outlier_score' | 'views' | 'engagement_rate' | 'posted_date';
  sortDir: 'asc' | 'desc';
}

export interface VideoFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  sortBy: ActiveVideoFilters['sortBy'];
  sortDir: ActiveVideoFilters['sortDir'];
  onSortChange: (sortBy: ActiveVideoFilters['sortBy'], sortDir: ActiveVideoFilters['sortDir']) => void;
  isFilterOpen: boolean;
  onToggleFilterOpen: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onOpenSaveModal: () => void;
  activePresetKey: string;
  onApplyQuickPreset: (preset: QuickFilterPreset) => void;
}

export interface VideoFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ActiveVideoFilters;
  onFilterChange: <K extends keyof ActiveVideoFilters>(key: K, value: ActiveVideoFilters[K]) => void;
  channels: ChannelItem[];
  watchlists: WatchlistItem[];
  projects: ProjectItem[];
  onResetFilters: () => void;
}

export interface ActiveFilterChipsProps {
  filters: ActiveVideoFilters;
  totalPosts: number;
  hasActiveFilters: boolean;
  onRemoveSearch: () => void;
  onRemoveCreator: (creator: string) => void;
  onRemoveLabel: (label: string) => void;
  onRemoveOutlier: () => void;
  onRemoveViews: () => void;
  onRemoveEngagement: () => void;
  onRemoveDate: () => void;
  onRemovePlatform: () => void;
  onResetAll: () => void;
}

export interface SavedFilterPresetsProps {
  presets: SavedFilterItem[];
  onApplyPreset: (preset: SavedFilterItem) => void;
  onDeletePreset: (id: number, e: React.MouseEvent) => void;
}

export interface VideoEmptyStateProps {
  channelsCount: number;
  syncingChannelsCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export interface VideoPaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
}
