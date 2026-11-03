import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ShortLink,
  ShortLinkSummary,
  ShortLinkPagination,
  FetchShortLinksParams,
  CreateShortLinkPayload,
  UpdateShortLinkPayload,
  fetchShortLinks,
  createShortLink,
  updateShortLink,
  toggleShortLink,
  deleteShortLink,
} from '@/lib/api/linkShortService';

export const CACHE_TTL_LINKSHORT = 2 * 60 * 1000; // 2 minutes

export interface LinkShortState {
  // Cached State
  shortLinks: ShortLink[];
  summary: ShortLinkSummary;
  pagination: ShortLinkPagination;
  cacheTimestamp: number;
  lastParams: FetchShortLinksParams | null;

  // Status flags
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  isHydrated: boolean;

  // Actions
  setHydrated: (hydrated: boolean) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;

  // Data operations
  fetchShortLinks: (params?: FetchShortLinksParams, force?: boolean) => Promise<void>;
  createShortLink: (payload: CreateShortLinkPayload, refreshParams?: FetchShortLinksParams) => Promise<ShortLink>;
  updateShortLink: (id: number, payload: UpdateShortLinkPayload) => Promise<ShortLink>;
  toggleShortLink: (id: number) => Promise<boolean>;
  deleteShortLink: (id: number, refreshParams?: FetchShortLinksParams) => Promise<void>;
}

const initialSummary: ShortLinkSummary = {
  total_links: 0,
  active_links: 0,
  total_clicks: 0,
};

const initialPagination: ShortLinkPagination = {
  current_page: 1,
  per_page: 25,
  total: 0,
  last_page: 1,
};

export const useLinkShortStore = create<LinkShortState>()(
  persist(
    (set, get) => ({
      // Cached State
      shortLinks: [],
      summary: initialSummary,
      pagination: initialPagination,
      cacheTimestamp: 0,
      lastParams: null,

      // Status
      isLoading: false,
      isMutating: false,
      error: null,
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setError: (error) => set({ error }),

      resetStore: () => {
        set({
          shortLinks: [],
          summary: initialSummary,
          pagination: initialPagination,
          cacheTimestamp: 0,
          lastParams: null,
          isLoading: false,
          isMutating: false,
          error: null,
        });
      },

      fetchShortLinks: async (params?: FetchShortLinksParams, force = false) => {
        const state = get();
        const now = Date.now();
        const isFresh = now - state.cacheTimestamp < CACHE_TTL_LINKSHORT;
        const isSameParams = JSON.stringify(params || {}) === JSON.stringify(state.lastParams || {});

        // SWR Cache hit: return early if fresh with matching params, unless forced
        if (!force && isFresh && isSameParams && state.shortLinks.length > 0) {
          return;
        }

        // Only show skeleton/loading if we have no cached links or params changed
        if (state.shortLinks.length === 0 || !isSameParams) {
          set({ isLoading: true, error: null });
        }

        try {
          const res = await fetchShortLinks(params);
          set({
            shortLinks: res.short_links || [],
            summary: res.summary || initialSummary,
            pagination: res.pagination || initialPagination,
            cacheTimestamp: now,
            lastParams: params || null,
            isLoading: false,
            error: null,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to load short links';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      createShortLink: async (payload: CreateShortLinkPayload, refreshParams?: FetchShortLinksParams) => {
        set({ isMutating: true, error: null });
        try {
          const res = await createShortLink(payload);
          const newLink = res.short_link;

          if (refreshParams) {
            const refreshed = await fetchShortLinks(refreshParams);
            set({
              shortLinks: refreshed.short_links || [],
              summary: refreshed.summary || initialSummary,
              pagination: refreshed.pagination || initialPagination,
              cacheTimestamp: Date.now(),
              lastParams: refreshParams,
              isMutating: false,
            });
          } else {
            set((s) => ({
              shortLinks: [newLink, ...s.shortLinks.slice(0, Math.max((s.pagination.per_page || 25) - 1, 0))],
              summary: {
                ...s.summary,
                total_links: s.summary.total_links + 1,
                active_links: newLink.is_active ? s.summary.active_links + 1 : s.summary.active_links,
              },
              pagination: {
                ...s.pagination,
                total: s.pagination.total + 1,
              },
              cacheTimestamp: Date.now(),
              isMutating: false,
            }));
          }

          return newLink;
        } catch (err: unknown) {
          set({ isMutating: false });
          throw err;
        }
      },

      updateShortLink: async (id: number, payload: UpdateShortLinkPayload) => {
        set({ isMutating: true, error: null });
        try {
          const res = await updateShortLink(id, payload);
          const updated = res.short_link;

          set((s) => ({
            shortLinks: s.shortLinks.map((l) => (l.id === id ? updated : l)),
            cacheTimestamp: Date.now(),
            isMutating: false,
          }));

          return updated;
        } catch (err: unknown) {
          set({ isMutating: false });
          throw err;
        }
      },

      toggleShortLink: async (id: number) => {
        const state = get();
        const prev = state.shortLinks.find((l) => l.id === id);
        if (!prev) return false;

        const nextActive = !prev.is_active;

        // Optimistic UI update
        set((s) => ({
          isMutating: true,
          shortLinks: s.shortLinks.map((l) => (l.id === id ? { ...l, is_active: nextActive } : l)),
          summary: {
            ...s.summary,
            active_links: nextActive ? s.summary.active_links + 1 : Math.max(s.summary.active_links - 1, 0),
          },
        }));

        try {
          const res = await toggleShortLink(id);
          set((s) => ({
            shortLinks: s.shortLinks.map((l) => (l.id === id ? { ...l, is_active: res.is_active } : l)),
            isMutating: false,
          }));
          return res.is_active;
        } catch (err: unknown) {
          // Rollback on error
          set((s) => ({
            shortLinks: s.shortLinks.map((l) => (l.id === id ? { ...l, is_active: prev.is_active } : l)),
            summary: {
              ...s.summary,
              active_links: prev.is_active ? s.summary.active_links + 1 : Math.max(s.summary.active_links - 1, 0),
            },
            isMutating: false,
          }));
          throw err;
        }
      },

      deleteShortLink: async (id: number, refreshParams?: FetchShortLinksParams) => {
        const state = get();
        const prev = state.shortLinks.find((l) => l.id === id);
        if (!prev) return;

        set({ isMutating: true });
        try {
          await deleteShortLink(id);

          if (refreshParams) {
            const refreshed = await fetchShortLinks(refreshParams);
            set({
              shortLinks: refreshed.short_links || [],
              summary: refreshed.summary || initialSummary,
              pagination: refreshed.pagination || initialPagination,
              cacheTimestamp: Date.now(),
              lastParams: refreshParams,
              isMutating: false,
            });
          } else {
            set((s) => ({
              shortLinks: s.shortLinks.filter((l) => l.id !== id),
              summary: {
                ...s.summary,
                total_links: Math.max(s.summary.total_links - 1, 0),
                active_links: prev.is_active ? Math.max(s.summary.active_links - 1, 0) : s.summary.active_links,
                total_clicks: Math.max(s.summary.total_clicks - (prev.clicks_count || 0), 0),
              },
              pagination: {
                ...s.pagination,
                total: Math.max(s.pagination.total - 1, 0),
              },
              cacheTimestamp: Date.now(),
              isMutating: false,
            }));
          }
        } catch (err: unknown) {
          set({ isMutating: false });
          throw err;
        }
      },
    }),
    {
      name: 'viralyzer_linkshort_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        shortLinks: state.shortLinks,
        summary: state.summary,
        pagination: state.pagination,
        cacheTimestamp: state.cacheTimestamp,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
