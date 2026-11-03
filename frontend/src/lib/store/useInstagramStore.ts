import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getInstagramProfile, ConnectedAccountItem } from '@/lib/api/instagramService';

interface InstagramState {
  accounts: ConnectedAccountItem[];
  selectedAccountId: string;
  isHydrated: boolean;
  isLoading: boolean;
  setHydrated: (hydrated: boolean) => void;
  fetchAccounts: () => Promise<void>;
  setSelectedAccountId: (id: string) => void;
}

export const useInstagramStore = create<InstagramState>()(
  persist(
    (set, get) => ({
      accounts: [],
      selectedAccountId: '',
      isHydrated: false,
      isLoading: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      fetchAccounts: async () => {
        if (get().accounts.length === 0) {
          set({ isLoading: true });
        }
        try {
          // Pass undefined so backend returns user account list without defaulting profile stats
          const data = await getInstagramProfile();
          if (data.accounts && data.accounts.length > 0) {
            const currentSelected = get().selectedAccountId;
            const isValidCurrent = Boolean(
              currentSelected && data.accounts.some((a) => String(a.id) === String(currentSelected))
            );
            // Invariant: If user has a valid selected account, keep it! Only fallback if selection is invalid/empty.
            const activeSelectedId = isValidCurrent ? currentSelected : String(data.accounts[0].id);
            set({ accounts: data.accounts, selectedAccountId: activeSelectedId });
          }
        } catch (err) {
          console.error('Failed to fetch Instagram accounts in Zustand store:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      setSelectedAccountId: (id) => set({ selectedAccountId: String(id) }),
    }),
    {
      name: 'viralyzer_instagram_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ selectedAccountId: state.selectedAccountId }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
