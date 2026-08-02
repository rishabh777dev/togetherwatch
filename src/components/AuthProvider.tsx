'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useWatchlistStore } from '@/lib/store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setAuth } = useAuthStore();
    const initializeWatchlist = useWatchlistStore((state) => state.initialize);

    useEffect(() => {
        // Initialize Watchlist
        initializeWatchlist();

        // Get initial session
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setAuth(session || null);
            })
            .catch(() => {
                setAuth(null);
            });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setAuth(session || null);
        });

        return () => subscription.unsubscribe();
    }, [setAuth, initializeWatchlist]);

    return <>{children}</>;
}
