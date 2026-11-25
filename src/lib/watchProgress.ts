// Watch Progress & Server Preference Store
// Provides persistent localStorage caching for both guests and authenticated users

export interface ContinueWatchingItem {
    id: string;
    media_id: string;
    media_type: 'movie' | 'tv';
    title: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    season: number;
    episode: number;
    progress: number; // 0 - 100 percentage
    timestamp: number; // in seconds
    duration: number; // in seconds
    updated_at: string;
}

export const PREFERRED_SERVER_STORAGE_KEY = 'togetherwatch_preferred_source';
export const CONTINUE_WATCHING_STORAGE_KEY = 'togetherwatch_continue_watching';
export const AUTOPLAY_NEXT_STORAGE_KEY = 'togetherwatch_autoplay_next';

/**
 * Get user's auto-play next episode preference (defaults to true)
 */
export function getAutoPlayNext(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        const val = localStorage.getItem(AUTOPLAY_NEXT_STORAGE_KEY);
        return val === null ? true : val === 'true';
    } catch {
        return true;
    }
}

/**
 * Save user's auto-play next episode preference
 */
export function saveAutoPlayNext(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(AUTOPLAY_NEXT_STORAGE_KEY, String(enabled));
        window.dispatchEvent(new CustomEvent('togetherwatch:autoplay_changed', { detail: enabled }));
    } catch {
        // Ignore localStorage errors
    }
}

/**
 * Get user's preferred streaming server from localStorage
 */
export function getPreferredServer(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(PREFERRED_SERVER_STORAGE_KEY);
    } catch {
        return null;
    }
}

/**
 * Save user's preferred streaming server to localStorage
 */
export function savePreferredServer(serverId: string): void {
    if (typeof window === 'undefined' || !serverId) return;
    try {
        localStorage.setItem(PREFERRED_SERVER_STORAGE_KEY, serverId);
        window.dispatchEvent(new CustomEvent('togetherwatch:server_changed', { detail: serverId }));
    } catch {
        // Ignore localStorage errors
    }
}

/**
 * Get all Continue Watching items stored locally
 */
export function getContinueWatchingList(): ContinueWatchingItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(CONTINUE_WATCHING_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Save or update a single Continue Watching item in localStorage
 */
export function saveContinueWatchingItem(item: ContinueWatchingItem, alternateId?: string | null): void {
    if (typeof window === 'undefined' || !item || !item.media_id) return;
    try {
        const list = getContinueWatchingList();
        const cleanId = String(item.media_id).trim();
        const cleanAlt = alternateId ? String(alternateId).trim() : null;

        // Remove existing item with same media_id or alternateId and media_type
        const filtered = list.filter(i => {
            if (i.media_type !== item.media_type) return true;
            const existingId = String(i.media_id).trim();
            if (existingId === cleanId) return false;
            if (cleanAlt && existingId === cleanAlt) return false;
            return true;
        });

        // Put updated/new item at the top, cap to latest 20 items
        const updated = [item, ...filtered].slice(0, 20);
        localStorage.setItem(CONTINUE_WATCHING_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('togetherwatch:continue_watching_updated'));
    } catch {
        // Ignore localStorage errors
    }
}

/**
 * Remove an item from Continue Watching list in localStorage
 */
export function removeContinueWatchingItem(mediaId: string, mediaType: 'movie' | 'tv', alternateId?: string | null): void {
    if (typeof window === 'undefined' || !mediaId) return;
    try {
        const list = getContinueWatchingList();
        const cleanId = String(mediaId).trim();
        const cleanAlt = alternateId ? String(alternateId).trim() : null;

        const filtered = list.filter(i => {
            if (i.media_type !== mediaType) return true;
            const existingId = String(i.media_id).trim();
            if (existingId === cleanId) return false;
            if (cleanAlt && existingId === cleanAlt) return false;
            return true;
        });
        localStorage.setItem(CONTINUE_WATCHING_STORAGE_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new Event('togetherwatch:continue_watching_updated'));
    } catch {
        // Ignore localStorage errors
    }
}

/**
 * Look up a specific Continue Watching item by mediaId and type (with optional alternateId)
 */
export function getContinueWatchingItem(
    mediaId: string, 
    mediaType: 'movie' | 'tv', 
    alternateId?: string | null
): ContinueWatchingItem | undefined {
    if (typeof window === 'undefined' || !mediaId) return undefined;
    const list = getContinueWatchingList();
    const cleanId = String(mediaId).trim();
    const cleanAlt = alternateId ? String(alternateId).trim() : null;

    return list.find(i => {
        if (i.media_type !== mediaType) return false;
        const existingId = String(i.media_id).trim();
        return existingId === cleanId || (cleanAlt && existingId === cleanAlt);
    });
}
