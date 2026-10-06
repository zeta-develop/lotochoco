import { archivePendingSale, recoverPendingSale, clearPendingSaleRecovery } from './pending-sale-recovery';
import { useSalesStore } from '../features/sales/store/sales.store';
import { resetAccountStores } from './reset-account-stores';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  selectedCompanyId: string | null;
  setCompanyId: (companyId: string | null) => void;
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      selectedCompanyId: null,
      setCompanyId: (selectedCompanyId) => {
        if (get().selectedCompanyId !== selectedCompanyId) {
          if (useSalesStore.getState().pendingSale) return;
          resetAccountStores();
        }
        set({ selectedCompanyId });
      },
      user: null,
      session: null,
      isAuthenticated: false,
      setUser: (user) => {
        const changed = get().user?.id !== user?.id;
        if (changed) { archivePendingSale(get().user?.id); resetAccountStores(); }
        set({ user, isAuthenticated: !!user, ...(changed ? { selectedCompanyId: null } : {}) });
      },
      setSession: (session) => {
        const user = session?.user ?? null;
        const changed = get().user?.id !== user?.id;
        if (changed) { archivePendingSale(get().user?.id); resetAccountStores(); }
        set({ session, user, isAuthenticated: !!user, ...(changed ? { selectedCompanyId: null } : {}) });
        if (changed && user) {
          const recovery = recoverPendingSale(user.id);
          if (recovery?.pendingSale) {
            set({ selectedCompanyId: recovery.pendingSale.companyId });
            useSalesStore.setState({ ...recovery, isLocked: true });
            clearPendingSaleRecovery(user.id);
          }
        }
      },
      signOut: () => {
        archivePendingSale(get().user?.id);
        resetAccountStores();
        set({ user: null, session: null, isAuthenticated: false, selectedCompanyId: null });
      },
    }),
    {
      name: 'lotochoco-auth-storage',
      partialize: (state) => ({
        selectedCompanyId: state.selectedCompanyId,
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
