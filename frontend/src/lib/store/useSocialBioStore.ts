import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  BioCard,
  BioCardSummary,
  BioLink,
  BioThemeSettings,
  BioThemePreset,
  BioAnalyticsData,
  SocialBioLinksIndexResponse,
  fetchSocialBioLinks,
  createBioCard,
  updateBioCard,
  setPrimaryBioCard,
  deleteBioCard,
  uploadBioAvatar,
  removeBioAvatar,
  uploadBioBanner,
  removeBioBanner,
  createBioLink,
  createBatchBioLinks,
  updateBioLink,
  deleteBioLink,
  reorderBioLinks,
} from '@/lib/api/socialBioLinksService';

// Cache TTL configuration
export const CACHE_TTL = {
  CARD: 5 * 60 * 1000, // 5 minutes
  DASHBOARD: 5 * 60 * 1000, // 5 minutes
  ANALYTICS: 2 * 60 * 1000, // 2 minutes
} as const;

export interface BioDraftState {
  display_name: string;
  slug: string;
  bio: string;
  theme: string;
  theme_settings: BioThemeSettings;
  is_published: boolean;
}

export interface SocialBioState {
  // Normalized Server Cache
  cardsById: Record<number, BioCard>;
  cardSummaries: BioCardSummary[];
  primaryCardId: number | null;
  themePresets: Record<string, BioThemePreset>;
  analyticsByCardId: Record<
    number,
    {
      selected: BioAnalyticsData;
      combined: BioAnalyticsData;
    }
  >;
  cacheTimestamps: {
    dashboard: number;
    cardsById: Record<number, number>;
    analyticsById: Record<number, number>;
  };

  // Drafts & Local Editor State (per cardId)
  draftsByCardId: Record<number, BioDraftState>;

  // Multi-Tab Conflict Tracking
  conflictsByCardId: Record<number, { remoteCard?: BioCard; timestamp: number } | undefined>;

  // Convenience UI context (Route param remains authoritative!)
  activeCardId: number | null;

  // Status flags
  isHydrated: boolean;
  isLoadingDashboard: boolean;
  loadingCards: Record<number, boolean>;
  savingCards: Record<number, boolean>;
  error: string | null;

  // Actions
  setHydrated: (hydrated: boolean) => void;
  setActiveCardId: (id: number | null) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;
  dismissConflict: (cardId: number) => void;
  resolveConflictReloadRemote: (cardId: number) => Promise<void>;

  // Data Fetching & SWR Cache
  fetchDashboard: (force?: boolean) => Promise<void>;
  fetchCard: (cardId: number, force?: boolean) => Promise<BioCard | null>;
  setCard: (card: BioCard) => void;
  setDashboardData: (data: SocialBioLinksIndexResponse) => void;

  // Draft Management
  initDraft: (cardId: number, card?: BioCard) => void;
  updateDraft: (cardId: number, updates: Partial<BioDraftState>) => void;
  discardDraft: (cardId: number) => void;
  saveCardDraft: (cardId: number) => Promise<BioCard>;

  // Card Mutations
  createCard: (payload: {
    display_name: string;
    slug?: string;
    theme?: string;
  }) => Promise<BioCard>;
  setPrimaryCard: (cardId: number) => Promise<void>;
  deleteCard: (cardId: number) => Promise<void>;
  uploadAvatar: (cardId: number, file: File) => Promise<string>;
  removeAvatar: (cardId: number) => Promise<void>;
  uploadBanner: (cardId: number, file: File) => Promise<string>;
  removeBanner: (cardId: number) => Promise<void>;

  // Link Mutations (Optimistic with rollback)
  addLink: (
    cardId: number,
    payload: {
      title: string;
      url: string;
      description?: string | null;
      icon?: string | null;
      is_active: boolean;
      starts_at?: string | null;
      ends_at?: string | null;
    }
  ) => Promise<BioLink>;
  addBatchLinks: (
    cardId: number,
    payloads: Array<{
      title: string;
      url: string;
      description?: string | null;
      icon?: string | null;
      is_active?: boolean;
      starts_at?: string | null;
      ends_at?: string | null;
    }>
  ) => Promise<BioLink[]>;
  updateLink: (
    cardId: number,
    linkId: number,
    payload: {
      title: string;
      url: string;
      description?: string | null;
      icon?: string | null;
      is_active: boolean;
      starts_at?: string | null;
      ends_at?: string | null;
    }
  ) => Promise<BioLink>;
  deleteLink: (cardId: number, linkId: number) => Promise<void>;
  reorderLinks: (cardId: number, linkIds: number[]) => Promise<void>;
}

// Cross-tab broadcast channel for safe synchronization
const BROADCAST_CHANNEL_NAME = 'viralyzer_social_bio_channel';
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported or failed to initialize:', e);
  }
}

function broadcastEvent(event: { type: string; [key: string]: unknown }) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(event);
    } catch {
      // Ignore broadcast errors
    }
  }
}

export const useSocialBioStore = create<SocialBioState>()(
  persist(
    (set, get) => ({
      // Normalized Server Cache
      cardsById: {},
      cardSummaries: [],
      primaryCardId: null,
      themePresets: {},
      analyticsByCardId: {},
      cacheTimestamps: {
        dashboard: 0,
        cardsById: {},
        analyticsById: {},
      },

      // Drafts
      draftsByCardId: {},

      // Multi-Tab Conflict Tracking
      conflictsByCardId: {},

      // UI Context
      activeCardId: null,

      // Status
      isHydrated: false,
      isLoadingDashboard: false,
      loadingCards: {},
      savingCards: {},
      error: null,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setActiveCardId: (id) => set({ activeCardId: id }),
      setError: (error) => set({ error }),

      resetStore: () => {
        set({
          cardsById: {},
          cardSummaries: [],
          primaryCardId: null,
          themePresets: {},
          analyticsByCardId: {},
          cacheTimestamps: {
            dashboard: 0,
            cardsById: {},
            analyticsById: {},
          },
          draftsByCardId: {},
          conflictsByCardId: {},
          activeCardId: null,
          error: null,
        });
        broadcastEvent({ type: 'STORE_RESET' });
      },

      dismissConflict: (cardId: number) => {
        set((s) => {
          const next = { ...s.conflictsByCardId };
          delete next[cardId];
          return { conflictsByCardId: next };
        });
      },

      resolveConflictReloadRemote: async (cardId: number) => {
        const state = get();
        const conflict = state.conflictsByCardId[cardId];
        const remoteCard = conflict?.remoteCard;

        if (remoteCard) {
          set((s) => {
            const nextCards = { ...s.cardsById, [cardId]: remoteCard };
            const nextDrafts = {
              ...s.draftsByCardId,
              [cardId]: {
                display_name: remoteCard.display_name || '',
                slug: remoteCard.slug || '',
                bio: remoteCard.custom_bio || remoteCard.bio || '',
                theme: remoteCard.theme || 'sunrise',
                theme_settings: remoteCard.theme_settings,
                is_published: remoteCard.is_published,
              },
            };
            const nextConflicts = { ...s.conflictsByCardId };
            delete nextConflicts[cardId];
            return {
              cardsById: nextCards,
              draftsByCardId: nextDrafts,
              conflictsByCardId: nextConflicts,
              cacheTimestamps: {
                ...s.cacheTimestamps,
                cardsById: { ...s.cacheTimestamps.cardsById, [cardId]: Date.now() },
              },
            };
          });
        } else {
          set((s) => {
            const nextConflicts = { ...s.conflictsByCardId };
            delete nextConflicts[cardId];
            return { conflictsByCardId: nextConflicts };
          });
          await get().fetchCard(cardId, true);
          get().discardDraft(cardId);
        }
      },

      // Fetch Dashboard Data with SWR
      fetchDashboard: async (force = false) => {
        const state = get();
        const now = Date.now();
        const isFresh = now - state.cacheTimestamps.dashboard < CACHE_TTL.DASHBOARD;

        if (!force && isFresh && state.cardSummaries.length > 0) {
          return;
        }

        // Only show full loading if we have zero data in cache
        if (state.cardSummaries.length === 0) {
          set({ isLoadingDashboard: true, error: null });
        }

        try {
          const res = await fetchSocialBioLinks();
          const cardsMap = { ...get().cardsById };
          const cardTimestamps = { ...get().cacheTimestamps.cardsById };

          if (res.primary_card) {
            cardsMap[res.primary_card.id] = res.primary_card;
            cardTimestamps[res.primary_card.id] = now;
          }
          if (res.selected_card) {
            cardsMap[res.selected_card.id] = res.selected_card;
            cardTimestamps[res.selected_card.id] = now;
          }

          set({
            cardsById: cardsMap,
            cardSummaries: res.cards,
            primaryCardId: res.primary_card?.id || null,
            themePresets: res.theme_presets,
            cacheTimestamps: {
              dashboard: now,
              cardsById: cardTimestamps,
              analyticsById: get().cacheTimestamps.analyticsById,
            },
            isLoadingDashboard: false,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to load social bio links';
          set({ error: msg, isLoadingDashboard: false });
        }
      },

      // Fetch Single Card with SWR
      fetchCard: async (cardId: number, force = false) => {
        const state = get();
        const now = Date.now();
        const cardTimestamp = state.cacheTimestamps.cardsById[cardId] || 0;
        const isFresh = now - cardTimestamp < CACHE_TTL.CARD;
        const cachedCard = state.cardsById[cardId];

        // Return immediately if cached and fresh
        if (!force && isFresh && cachedCard) {
          // Initialize draft if none exists yet (Rule: never overwrite existing draft)
          get().initDraft(cardId, cachedCard);
          return cachedCard;
        }

        // Mark loading state for this card
        set((s) => ({
          loadingCards: { ...s.loadingCards, [cardId]: !cachedCard },
          error: null,
        }));

        try {
          const res = await fetchSocialBioLinks(cardId);
          const targetCard =
            res.selected_card?.id === cardId
              ? res.selected_card
              : (res.cards.find((c) => c.id === cardId) as unknown as BioCard) || res.selected_card;

          if (targetCard) {
            set((s) => ({
              cardsById: { ...s.cardsById, [targetCard.id]: targetCard },
              themePresets: res.theme_presets || s.themePresets,
              cacheTimestamps: {
                ...s.cacheTimestamps,
                cardsById: { ...s.cacheTimestamps.cardsById, [targetCard.id]: Date.now() },
              },
              loadingCards: { ...s.loadingCards, [cardId]: false },
            }));

            // Draft Initialization Rule:
            // If draft already exists, preserve untouched!
            // If draft does not exist, create from server card.
            get().initDraft(cardId, targetCard);

            return targetCard;
          }

          set((s) => ({
            loadingCards: { ...s.loadingCards, [cardId]: false },
          }));
          return null;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch card';
          set((s) => ({
            loadingCards: { ...s.loadingCards, [cardId]: false },
            error: s.cardsById[cardId] ? null : msg,
          }));
          return cachedCard || null;
        }
      },

      setCard: (card: BioCard) => {
        set((s) => ({
          cardsById: { ...s.cardsById, [card.id]: card },
          cacheTimestamps: {
            ...s.cacheTimestamps,
            cardsById: { ...s.cacheTimestamps.cardsById, [card.id]: Date.now() },
          },
        }));
      },

      setDashboardData: (data: SocialBioLinksIndexResponse) => {
        const now = Date.now();
        const cardsMap = { ...get().cardsById };
        const cardTimestamps = { ...get().cacheTimestamps.cardsById };

        if (data.primary_card) {
          cardsMap[data.primary_card.id] = data.primary_card;
          cardTimestamps[data.primary_card.id] = now;
        }
        if (data.selected_card) {
          cardsMap[data.selected_card.id] = data.selected_card;
          cardTimestamps[data.selected_card.id] = now;
        }

        set({
          cardsById: cardsMap,
          cardSummaries: data.cards,
          primaryCardId: data.primary_card?.id || null,
          themePresets: data.theme_presets,
          cacheTimestamps: {
            dashboard: now,
            cardsById: cardTimestamps,
            analyticsById: get().cacheTimestamps.analyticsById,
          },
        });
      },

      // Draft Initialization: Server card exists -> Does draft exist? No -> create, Yes -> preserve untouched.
      initDraft: (cardId: number, card?: BioCard) => {
        const existingDraft = get().draftsByCardId[cardId];
        if (existingDraft) {
          // Invariant: Preserve draft untouched if it already exists
          return;
        }

        const targetCard = card || get().cardsById[cardId];
        if (!targetCard) return;

        set((s) => ({
          draftsByCardId: {
            ...s.draftsByCardId,
            [cardId]: {
              display_name: targetCard.display_name || '',
              slug: targetCard.slug || '',
              bio: targetCard.custom_bio || targetCard.bio || '',
              theme: targetCard.theme || 'sunrise',
              theme_settings: targetCard.theme_settings,
              is_published: targetCard.is_published,
            },
          },
        }));
      },

      updateDraft: (cardId: number, updates: Partial<BioDraftState>) => {
        set((s) => {
          const currentDraft = s.draftsByCardId[cardId];
          const baseCard = s.cardsById[cardId];
          const draftToUpdate: BioDraftState = currentDraft || {
            display_name: baseCard?.display_name || '',
            slug: baseCard?.slug || '',
            bio: baseCard?.custom_bio || baseCard?.bio || '',
            theme: baseCard?.theme || 'sunrise',
            theme_settings: baseCard?.theme_settings || {
              background_color: '#f8fafc',
              text_color: '#0f172a',
              button_background_color: '#ffffff',
              button_text_color: '#0f172a',
              button_style: 'rounded',
            },
            is_published: baseCard?.is_published ?? false,
          };

          return {
            draftsByCardId: {
              ...s.draftsByCardId,
              [cardId]: {
                ...draftToUpdate,
                ...updates,
              },
            },
          };
        });
      },

      discardDraft: (cardId: number) => {
        const baseCard = get().cardsById[cardId];
        if (!baseCard) {
          set((s) => {
            const nextDrafts = { ...s.draftsByCardId };
            delete nextDrafts[cardId];
            return { draftsByCardId: nextDrafts };
          });
          return;
        }

        // Reset draft back to server card state
        set((s) => ({
          draftsByCardId: {
            ...s.draftsByCardId,
            [cardId]: {
              display_name: baseCard.display_name || '',
              slug: baseCard.slug || '',
              bio: baseCard.custom_bio || baseCard.bio || '',
              theme: baseCard.theme || 'sunrise',
              theme_settings: baseCard.theme_settings,
              is_published: baseCard.is_published,
            },
          },
        }));
      },

      saveCardDraft: async (cardId: number) => {
        const draft = get().draftsByCardId[cardId];
        if (!draft) throw new Error('No draft found to save');

        set((s) => ({
          savingCards: { ...s.savingCards, [cardId]: true },
        }));

        try {
          const res = await updateBioCard(cardId, {
            display_name: draft.display_name,
            slug: draft.slug || undefined,
            bio: draft.bio || null,
            theme: draft.theme,
            theme_settings: draft.theme_settings,
            is_published: draft.is_published,
          });

          const updatedCard = res.card;

          set((s) => {
            // Update cardsById
            const nextCardsById = { ...s.cardsById, [cardId]: updatedCard };

            // Update cardSummaries if present
            const nextSummaries = s.cardSummaries.map((summary) =>
              summary.id === cardId
                ? {
                    ...summary,
                    display_name: updatedCard.display_name,
                    slug: updatedCard.slug,
                    bio: updatedCard.bio,
                    custom_bio: updatedCard.custom_bio,
                    theme: updatedCard.theme,
                    theme_settings: updatedCard.theme_settings,
                    is_published: updatedCard.is_published,
                    public_url: updatedCard.public_url,
                  }
                : summary
            );

            // Re-align draft with saved server state
            const nextDrafts = {
              ...s.draftsByCardId,
              [cardId]: {
                display_name: updatedCard.display_name || '',
                slug: updatedCard.slug || '',
                bio: updatedCard.custom_bio || updatedCard.bio || '',
                theme: updatedCard.theme || 'sunrise',
                theme_settings: updatedCard.theme_settings,
                is_published: updatedCard.is_published,
              },
            };

            return {
              cardsById: nextCardsById,
              cardSummaries: nextSummaries,
              draftsByCardId: nextDrafts,
              savingCards: { ...s.savingCards, [cardId]: false },
              cacheTimestamps: {
                ...s.cacheTimestamps,
                cardsById: { ...s.cacheTimestamps.cardsById, [cardId]: Date.now() },
              },
            };
          });

          broadcastEvent({
            type: 'CARD_UPDATED',
            cardId,
            card: updatedCard,
            timestamp: Date.now(),
          });

          return updatedCard;
        } catch (err: unknown) {
          set((s) => ({
            savingCards: { ...s.savingCards, [cardId]: false },
          }));
          throw err;
        }
      },

      // Card Creation -> Populates cardsById & cardSummaries with zero-fetch handoff
      createCard: async (payload) => {
        const res = await createBioCard(payload);
        const card = res.card;
        const now = Date.now();

        const summary: BioCardSummary = {
          ...card,
          links_count: 0,
          clicks_count: 0,
          links: [],
        };

        set((s) => ({
          cardsById: { ...s.cardsById, [card.id]: card },
          cardSummaries: [summary, ...s.cardSummaries],
          cacheTimestamps: {
            ...s.cacheTimestamps,
            cardsById: { ...s.cacheTimestamps.cardsById, [card.id]: now },
            dashboard: now,
          },
          // Pre-initialize draft for immediate edit
          draftsByCardId: {
            ...s.draftsByCardId,
            [card.id]: {
              display_name: card.display_name || '',
              slug: card.slug || '',
              bio: card.custom_bio || card.bio || '',
              theme: card.theme || 'sunrise',
              theme_settings: card.theme_settings,
              is_published: card.is_published,
            },
          },
        }));

        broadcastEvent({ type: 'CARD_CREATED', cardId: card.id });
        return card;
      },

      setPrimaryCard: async (cardId: number) => {
        await setPrimaryBioCard(cardId);
        set((s) => {
          const nextCards = { ...s.cardsById };
          Object.keys(nextCards).forEach((key) => {
            const id = Number(key);
            nextCards[id] = { ...nextCards[id], is_primary: id === cardId };
          });

          const nextSummaries = s.cardSummaries.map((c) => ({
            ...c,
            is_primary: c.id === cardId,
          }));

          return {
            cardsById: nextCards,
            cardSummaries: nextSummaries,
            primaryCardId: cardId,
          };
        });
        broadcastEvent({ type: 'CARD_PRIMARY_SET', cardId });
      },

      deleteCard: async (cardId: number) => {
        await deleteBioCard(cardId);
        set((s) => {
          const nextCards = { ...s.cardsById };
          delete nextCards[cardId];

          const nextSummaries = s.cardSummaries.filter((c) => c.id !== cardId);
          const nextDrafts = { ...s.draftsByCardId };
          delete nextDrafts[cardId];

          return {
            cardsById: nextCards,
            cardSummaries: nextSummaries,
            draftsByCardId: nextDrafts,
            primaryCardId: s.primaryCardId === cardId ? null : s.primaryCardId,
          };
        });
        broadcastEvent({ type: 'CARD_DELETED', cardId });
      },

      uploadAvatar: async (cardId: number, file: File) => {
        const res = await uploadBioAvatar(cardId, file);
        set((s) => {
          const currentCard = s.cardsById[cardId];
          if (!currentCard) return s;

          const updatedCard = {
            ...currentCard,
            custom_avatar_url: res.avatar_url,
            avatar_url: res.avatar_url,
          };

          const nextSummaries = s.cardSummaries.map((c) =>
            c.id === cardId
              ? { ...c, custom_avatar_url: res.avatar_url, avatar_url: res.avatar_url }
              : c
          );

          return {
            cardsById: { ...s.cardsById, [cardId]: updatedCard },
            cardSummaries: nextSummaries,
          };
        });
        return res.avatar_url;
      },

      removeAvatar: async (cardId: number) => {
        const res = await removeBioAvatar(cardId);
        set((s) => {
          const currentCard = s.cardsById[cardId];
          if (!currentCard) return s;

          const updatedCard = {
            ...currentCard,
            custom_avatar_url: null,
            avatar_url: res.avatar_url,
          };

          const nextSummaries = s.cardSummaries.map((c) =>
            c.id === cardId
              ? { ...c, custom_avatar_url: null, avatar_url: res.avatar_url }
              : c
          );

          return {
            cardsById: { ...s.cardsById, [cardId]: updatedCard },
            cardSummaries: nextSummaries,
          };
        });
      },

      uploadBanner: async (cardId: number, file: File) => {
        const res = await uploadBioBanner(cardId, file);
        set((s) => {
          const currentCard = s.cardsById[cardId];
          if (!currentCard) return s;

          const updatedCard = { ...currentCard, banner_url: res.banner_url };
          const nextSummaries = s.cardSummaries.map((c) =>
            c.id === cardId ? { ...c, banner_url: res.banner_url } : c
          );

          return {
            cardsById: { ...s.cardsById, [cardId]: updatedCard },
            cardSummaries: nextSummaries,
          };
        });
        return res.banner_url;
      },

      removeBanner: async (cardId: number) => {
        await removeBioBanner(cardId);
        set((s) => {
          const currentCard = s.cardsById[cardId];
          if (!currentCard) return s;

          const updatedCard = { ...currentCard, banner_url: null };
          const nextSummaries = s.cardSummaries.map((c) =>
            c.id === cardId ? { ...c, banner_url: null } : c
          );

          return {
            cardsById: { ...s.cardsById, [cardId]: updatedCard },
            cardSummaries: nextSummaries,
          };
        });
      },

      // Link Mutations (Optimistic with rollback)
      addLink: async (cardId, payload) => {
        const tempId = -Date.now();
        const optimisticLink: BioLink = {
          id: tempId,
          title: payload.title,
          url: payload.url,
          description: payload.description || null,
          icon: payload.icon || 'globe',
          sort_order: get().cardsById[cardId]?.links.length || 0,
          is_active: payload.is_active,
          starts_at: payload.starts_at || null,
          ends_at: payload.ends_at || null,
          clicks_count: 0,
        };

        const prevCard = get().cardsById[cardId];

        // Apply optimistic link
        if (prevCard) {
          set((s) => ({
            cardsById: {
              ...s.cardsById,
              [cardId]: {
                ...prevCard,
                links: [...prevCard.links, optimisticLink],
              },
            },
          }));
        }

        try {
          const res = await createBioLink(cardId, payload);
          // Replace tempLink with server link
          set((s) => {
            const current = s.cardsById[cardId];
            if (!current) return s;
            return {
              cardsById: {
                ...s.cardsById,
                [cardId]: {
                  ...current,
                  links: current.links.map((l) => (l.id === tempId ? res.link : l)),
                },
              },
            };
          });
          return res.link;
        } catch (err) {
          // Rollback on error
          if (prevCard) {
            set((s) => ({
              cardsById: { ...s.cardsById, [cardId]: prevCard },
            }));
          }
          throw err;
        }
      },

      addBatchLinks: async (cardId, payloads) => {
        const prevCard = get().cardsById[cardId];
        const baseSort = prevCard?.links.length || 0;

        const tempLinks: BioLink[] = payloads.map((p, idx) => ({
          id: -(Date.now() + idx),
          title: p.title,
          url: p.url,
          description: p.description || null,
          icon: p.icon || 'globe',
          sort_order: baseSort + idx,
          is_active: p.is_active ?? true,
          starts_at: p.starts_at || null,
          ends_at: p.ends_at || null,
          clicks_count: 0,
        }));

        if (prevCard) {
          set((s) => ({
            cardsById: {
              ...s.cardsById,
              [cardId]: {
                ...prevCard,
                links: [...prevCard.links, ...tempLinks],
              },
            },
          }));
        }

        try {
          const res = await createBatchBioLinks(cardId, payloads);
          set((s) => {
            const current = s.cardsById[cardId];
            if (!current) return s;
            const existingNonTemp = current.links.filter((l) => l.id > 0);
            return {
              cardsById: {
                ...s.cardsById,
                [cardId]: {
                  ...current,
                  links: [...existingNonTemp, ...res.links],
                },
              },
            };
          });
          return res.links;
        } catch (err) {
          if (prevCard) {
            set((s) => ({
              cardsById: { ...s.cardsById, [cardId]: prevCard },
            }));
          }
          throw err;
        }
      },

      updateLink: async (cardId, linkId, payload) => {
        const prevCard = get().cardsById[cardId];
        if (prevCard) {
          set((s) => ({
            cardsById: {
              ...s.cardsById,
              [cardId]: {
                ...prevCard,
                links: prevCard.links.map((l) =>
                  l.id === linkId ? { ...l, ...payload } : l
                ),
              },
            },
          }));
        }

        try {
          const res = await updateBioLink(linkId, payload);
          set((s) => {
            const current = s.cardsById[cardId];
            if (!current) return s;
            return {
              cardsById: {
                ...s.cardsById,
                [cardId]: {
                  ...current,
                  links: current.links.map((l) => (l.id === linkId ? res.link : l)),
                },
              },
            };
          });
          return res.link;
        } catch (err) {
          if (prevCard) {
            set((s) => ({
              cardsById: { ...s.cardsById, [cardId]: prevCard },
            }));
          }
          throw err;
        }
      },

      deleteLink: async (cardId, linkId) => {
        const prevCard = get().cardsById[cardId];
        if (prevCard) {
          set((s) => ({
            cardsById: {
              ...s.cardsById,
              [cardId]: {
                ...prevCard,
                links: prevCard.links.filter((l) => l.id !== linkId),
              },
            },
          }));
        }

        try {
          await deleteBioLink(linkId);
        } catch (err) {
          if (prevCard) {
            set((s) => ({
              cardsById: { ...s.cardsById, [cardId]: prevCard },
            }));
          }
          throw err;
        }
      },

      reorderLinks: async (cardId, linkIds) => {
        const prevCard = get().cardsById[cardId];
        if (prevCard) {
          const reordered = linkIds
            .map((id) => prevCard.links.find((l) => l.id === id))
            .filter((l): l is BioLink => Boolean(l));

          set((s) => ({
            cardsById: {
              ...s.cardsById,
              [cardId]: {
                ...prevCard,
                links: reordered,
              },
            },
          }));
        }

        try {
          await reorderBioLinks(cardId, linkIds);
        } catch (err) {
          if (prevCard) {
            set((s) => ({
              cardsById: { ...s.cardsById, [cardId]: prevCard },
            }));
          }
          throw err;
        }
      },
    }),
    {
      name: 'viralyzer_social_bio_store',
      storage: createJSONStorage(() => localStorage),
      // Tab-Safe Persistence Boundary:
      // Persist server cache, timestamps, and active drafts so F5 reload recovers state.
      // Do NOT persist activeCardId to avoid overriding route parameters.
      partialize: (state) => ({
        cardsById: state.cardsById,
        cardSummaries: state.cardSummaries,
        primaryCardId: state.primaryCardId,
        themePresets: state.themePresets,
        cacheTimestamps: state.cacheTimestamps,
        draftsByCardId: state.draftsByCardId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

// Safe cross-tab message listener (only handles explicit invalidations, never wipes local drafts)
if (typeof window !== 'undefined' && broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'STORE_RESET') {
      useSocialBioStore.getState().resetStore();
    } else if (data.type === 'CARD_DELETED' && typeof data.cardId === 'number') {
      const cardId = data.cardId;
      useSocialBioStore.setState((s) => {
        const nextCards = { ...s.cardsById };
        delete nextCards[cardId];
        const nextSummaries = s.cardSummaries.filter((c) => c.id !== cardId);
        return { cardsById: nextCards, cardSummaries: nextSummaries };
      });
    } else if (data.type === 'CARD_UPDATED' && typeof data.cardId === 'number') {
      const cardId = data.cardId;
      const remoteCard = data.card as BioCard | undefined;
      const currentStore = useSocialBioStore.getState();
      const isDirty = selectIsDirty(currentStore, cardId);

      if (isDirty) {
        // Multi-Tab Conflict Detected: User in this tab has unsaved modifications!
        useSocialBioStore.setState((s) => ({
          conflictsByCardId: {
            ...s.conflictsByCardId,
            [cardId]: {
              remoteCard,
              timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
            },
          },
        }));
      } else if (remoteCard) {
        // Clean state: Seamlessly synchronize server card and draft with the remote version
        useSocialBioStore.setState((s) => {
          const nextCards = { ...s.cardsById, [cardId]: remoteCard };
          const nextSummaries = s.cardSummaries.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  display_name: remoteCard.display_name,
                  slug: remoteCard.slug,
                  bio: remoteCard.bio,
                  custom_bio: remoteCard.custom_bio,
                  theme: remoteCard.theme,
                  theme_settings: remoteCard.theme_settings,
                  is_published: remoteCard.is_published,
                  public_url: remoteCard.public_url,
                }
              : c
          );
          const nextDrafts = {
            ...s.draftsByCardId,
            [cardId]: {
              display_name: remoteCard.display_name || '',
              slug: remoteCard.slug || '',
              bio: remoteCard.custom_bio || remoteCard.bio || '',
              theme: remoteCard.theme || 'sunrise',
              theme_settings: remoteCard.theme_settings,
              is_published: remoteCard.is_published,
            },
          };
          return {
            cardsById: nextCards,
            cardSummaries: nextSummaries,
            draftsByCardId: nextDrafts,
            cacheTimestamps: {
              ...s.cacheTimestamps,
              cardsById: { ...s.cacheTimestamps.cardsById, [cardId]: Date.now() },
            },
          };
        });
      }
    }
  };
}

// ---------------------------------------------------------
// SELECTORS
// ---------------------------------------------------------

export const selectCard = (state: SocialBioState, cardId: number): BioCard | undefined => {
  return state.cardsById[cardId];
};

export const selectDraft = (state: SocialBioState, cardId: number): BioDraftState | undefined => {
  return state.draftsByCardId[cardId];
};

const effectiveCardCache = new WeakMap<BioCard, WeakMap<BioDraftState, BioCard>>();

export const selectEffectiveCard = (
  state: SocialBioState,
  cardId: number
): BioCard | undefined => {
  const card = state.cardsById[cardId];
  if (!card) return undefined;

  const draft = state.draftsByCardId[cardId];
  if (!draft) return card;

  let draftMap = effectiveCardCache.get(card);
  if (!draftMap) {
    draftMap = new WeakMap();
    effectiveCardCache.set(card, draftMap);
  }

  let cached = draftMap.get(draft);
  if (!cached) {
    cached = {
      ...card,
      display_name: draft.display_name,
      slug: draft.slug,
      bio: draft.bio || card.bio,
      custom_bio: draft.bio,
      theme: draft.theme,
      theme_settings: draft.theme_settings,
      is_published: draft.is_published,
    };
    draftMap.set(draft, cached);
  }

  return cached;
};

export const selectIsDirty = (state: SocialBioState, cardId: number): boolean => {
  const card = state.cardsById[cardId];
  const draft = state.draftsByCardId[cardId];
  if (!card || !draft) return false;

  const cardBio = card.custom_bio || card.bio || '';
  const draftBio = draft.bio || '';

  return (
    draft.display_name !== card.display_name ||
    draft.slug !== card.slug ||
    draftBio !== cardBio ||
    draft.theme !== card.theme ||
    draft.is_published !== card.is_published ||
    JSON.stringify(draft.theme_settings) !== JSON.stringify(card.theme_settings)
  );
};

export const selectCardSummaries = (state: SocialBioState): BioCardSummary[] => {
  return state.cardSummaries;
};

export const selectPrimaryCard = (state: SocialBioState): BioCard | undefined => {
  if (state.primaryCardId && state.cardsById[state.primaryCardId]) {
    return state.cardsById[state.primaryCardId];
  }
  return state.cardSummaries.find((c) => c.is_primary) as unknown as BioCard | undefined;
};
