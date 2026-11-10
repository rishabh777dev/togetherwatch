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
export function saveContinueWatchingItem(item: ContinueWatchingItem): void {
    if (typeof window === 'undefined' || !item || !item.media_id) return;
    try {
        const list = getContinueWatchingList();
        // Remove existing item with same media_id and media_type
        const filtered = list.filter(
            i => !(String(i.media_id) === String(item.media_id) && i.media_type === item.media_type)
        );
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
export function removeContinueWatchingItem(mediaId: string, mediaType: 'movie' | 'tv'): void {
    if (typeof window === 'undefined') return;
    try {
        const list = getContinueWatchingList();
        const filtered = list.filter(
            i => !(String(i.media_id) === String(mediaId) && i.media_type === mediaType)
        );
        localStorage.setItem(CONTINUE_WATCHING_STORAGE_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new Event('togetherwatch:continue_watching_updated'));
    } catch {
        // Ignore localStorage errors
    }
}

/**
 * Look up a specific Continue Watching item by mediaId and type
 */
export function getContinueWatchingItem(mediaId: string, mediaType: 'movie' | 'tv'): ContinueWatchingItem | undefined {
    const list = getContinueWatchingList();
    return list.find(i => String(i.media_id) === String(mediaId) && i.media_type === mediaType);
}
