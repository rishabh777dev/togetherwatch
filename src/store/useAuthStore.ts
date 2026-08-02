import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
    user: User | null;
    session: Session | null;
    isInitialized: boolean;
    setAuth: (session: Session | null) => void;
    clearAuth: () => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isInitialized: false,
    setAuth: (session) => set({ user: session?.user || null, session, isInitialized: true }),
    clearAuth: () => set({ user: null, session: null, isInitialized: true }),
    signOut: async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('SignOut error ignored:', err);
        } finally {
            set({ user: null, session: null, isInitialized: true });
        }
    },
}));
