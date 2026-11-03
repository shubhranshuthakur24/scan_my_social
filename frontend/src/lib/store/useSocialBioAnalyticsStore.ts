import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  BioCard,
  BioCardSummary,
  BioAnalyticsData,
  fetchSocialBioLinksAnalytics,
} from '@/lib/api/socialBioLinksService';
import {
  AggregateShortLinkAnalytics,
  fetchLinkShortAggregateAnalytics,
} from '@/lib/api/linkShortService';

export const CACHE_TTL_ANALYTICS = 3 * 60 * 1000; // 3 minutes

export type AnalyticsPreset = '7d' | '14d' | '30d' | '90d';

export interface BioAnalyticsPresetData {
  cards: BioCardSummary[];
  primaryCard: BioCard | null;
  combinedAnalytics: BioAnalyticsData | null;
  timestamp: number;
}

export interface LinkShortAnalyticsPresetData {
  analytics: AggregateShortLinkAnalytics;
  timestamp: number;
}

export interface SocialBioAnalyticsState {
  // SWR Caches indexed by preset
  bioAnalyticsByPreset: Record<string, BioAnalyticsPresetData>;
  linkShortAnalyticsByPreset: Record<string, LinkShortAnalyticsPresetData>;

  // Status flags
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;

  // Actions
  setHydrated: (hydrated: boolean) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;

  fetchBioAnalytics: (
    preset: AnalyticsPreset,
    force?: boolean
  ) => Promise<BioAnalyticsPresetData>;
  fetchLinkShortAnalytics: (
    preset: AnalyticsPreset,
    force?: boolean
  ) => Promise<LinkShortAnalyticsPresetData>;
}

export const useSocialBioAnalyticsStore = create<SocialBioAnalyticsState>()(
  persist(
    (set, get) => ({
      bioAnalyticsByPreset: {},
      linkShortAnalyticsByPreset: {},

      isLoading: false,
      error: null,
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setError: (error) => set({ error }),

      resetStore: () => {
        set({
          bioAnalyticsByPreset: {},
          linkShortAnalyticsByPreset: {},
          isLoading: false,
          error: null,
        });
      },

      fetchBioAnalytics: async (preset: AnalyticsPreset, force = false) => {
        const state = get();
        const now = Date.now();
        const cached = state.bioAnalyticsByPreset[preset];
        const isFresh = cached && now - cached.timestamp < CACHE_TTL_ANALYTICS;

        if (!force && isFresh && cached) {
          return cached;
        }

        if (!cached) {
          set({ isLoading: true, error: null });
        }

        try {
          const data = await fetchSocialBioLinksAnalytics(undefined, preset);
          const result: BioAnalyticsPresetData = {
            cards: data.cards || [],
            primaryCard: data.primary_card || null,
            combinedAnalytics: data.analytics?.combined || null,
            timestamp: now,
          };

          set((s) => ({
            bioAnalyticsByPreset: {
              ...s.bioAnalyticsByPreset,
              [preset]: result,
            },
            isLoading: false,
            error: null,
          }));

          return result;
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Failed to load link in bio analytics';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      fetchLinkShortAnalytics: async (preset: AnalyticsPreset, force = false) => {
        const state = get();
        const now = Date.now();
        const cached = state.linkShortAnalyticsByPreset[preset];
        const isFresh = cached && now - cached.timestamp < CACHE_TTL_ANALYTICS;

        if (!force && isFresh && cached) {
          return cached;
        }

        if (!cached) {
          set({ isLoading: true, error: null });
        }

        try {
          const res = await fetchLinkShortAggregateAnalytics(preset);
          const result: LinkShortAnalyticsPresetData = {
            analytics: res.analytics,
            timestamp: now,
          };

          set((s) => ({
            linkShortAnalyticsByPreset: {
              ...s.linkShortAnalyticsByPreset,
              [preset]: result,
            },
            isLoading: false,
            error: null,
          }));

          return result;
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Failed to load linkshort analytics';
          set({ error: message, isLoading: false });
          throw err;
        }
      },
    }),
    {
      name: 'viralyzer_social_bio_analytics_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bioAnalyticsByPreset: state.bioAnalyticsByPreset,
        linkShortAnalyticsByPreset: state.linkShortAnalyticsByPreset,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
