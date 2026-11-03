import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const CREATION_STATE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface WebPageCreationState {
  selectedTemplateKey: string | null;
  selectedThemeKey: string | null;
  currentStep: 1 | 2;
  updatedAt: number;
  isHydrated: boolean;

  setHydrated: (hydrated: boolean) => void;
  setSelectedTemplateKey: (key: string | null) => void;
  setSelectedThemeKey: (key: string | null) => void;
  setCurrentStep: (step: 1 | 2) => void;
  resetCreationState: () => void;
  isExpired: () => boolean;
}

const initialState = {
  selectedTemplateKey: null,
  selectedThemeKey: null,
  currentStep: 1 as const,
  updatedAt: 0,
};

export const useWebPageCreationStore = create<WebPageCreationState>()(
  persist(
    (set, get) => ({
      ...initialState,
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      setSelectedTemplateKey: (key) =>
        set({ selectedTemplateKey: key, updatedAt: Date.now() }),

      setSelectedThemeKey: (key) =>
        set({ selectedThemeKey: key, updatedAt: Date.now() }),

      setCurrentStep: (step) =>
        set({ currentStep: step, updatedAt: Date.now() }),

      resetCreationState: () =>
        set({
          ...initialState,
          updatedAt: Date.now(),
        }),

      isExpired: () => {
        const { updatedAt } = get();
        if (!updatedAt) return false;
        return Date.now() - updatedAt > CREATION_STATE_TTL_MS;
      },
    }),
    {
      name: 'scanmysocial:web-page-creation',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedTemplateKey: state.selectedTemplateKey,
        selectedThemeKey: state.selectedThemeKey,
        currentStep: state.currentStep,
        updatedAt: state.updatedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.updatedAt && Date.now() - state.updatedAt > CREATION_STATE_TTL_MS) {
            state.resetCreationState();
          }
          state.setHydrated(true);
        }
      },
    }
  )
);
