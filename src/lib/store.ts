import { create } from 'zustand';

// User State
interface User {
    id: string;
    name: string;
    avatar?: string;
}

interface UserState {
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
    logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    isAuthenticated: false,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    logout: () => set({ user: null, isAuthenticated: false }),
}));

// Room State
interface Participant {
    id: string;
    name: string;
    avatar?: string;
    isHost?: boolean;
}

interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: number;
    type: 'message' | 'reaction' | 'system';
}

interface Reaction {
    id: string;
    userId: string;
    emoji: string;
    timestamp: number;
}

interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    serverTime: number;
    lastSyncTime: number;
}

interface RoomState {
    roomId: string | null;
    roomName: string;
    isHost: boolean;
    participants: Participant[];
    messages: ChatMessage[];
    reactions: Reaction[];
    playbackState: PlaybackState;
    syncStatus: 'synced' | 'syncing' | 'out-of-sync';
    mediaUrl: string;
    mediaType: 'movie' | 'tv';
    mediaId: number | null;
    season?: number;
    episode?: number;

    // Actions
    setRoomId: (id: string | null) => void;
    setRoomName: (name: string) => void;
    setIsHost: (isHost: boolean) => void;
    setParticipants: (participants: Participant[]) => void;
    addParticipant: (participant: Participant) => void;
    removeParticipant: (id: string) => void;
    addMessage: (message: ChatMessage) => void;
    addReaction: (reaction: Reaction) => void;
    removeReaction: (id: string) => void;
    setPlaybackState: (state: Partial<PlaybackState>) => void;
    setSyncStatus: (status: 'synced' | 'syncing' | 'out-of-sync') => void;
    setMedia: (url: string, type: 'movie' | 'tv', id: number, season?: number, episode?: number) => void;
    reset: () => void;
}

const initialPlaybackState: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    serverTime: 0,
    lastSyncTime: Date.now(),
};

export const useRoomStore = create<RoomState>((set) => ({
    roomId: null,
    roomName: '',
    isHost: false,
    participants: [],
    messages: [],
    reactions: [],
    playbackState: initialPlaybackState,
    syncStatus: 'synced',
    mediaUrl: '',
    mediaType: 'movie',
    mediaId: null,
    season: undefined,
    episode: undefined,

    setRoomId: (id) => set({ roomId: id }),
    setRoomName: (name) => set({ roomName: name }),
    setIsHost: (isHost) => set({ isHost }),
    setParticipants: (participants) => set({ participants }),
    addParticipant: (participant) => set((state) => ({
        participants: [...state.participants, participant]
    })),
    removeParticipant: (id) => set((state) => ({
        participants: state.participants.filter(p => p.id !== id)
    })),
    addMessage: (message) => set((state) => ({
        messages: [...state.messages.slice(-100), message] // Keep last 100 messages
    })),
    addReaction: (reaction) => set((state) => ({
        reactions: [...state.reactions, reaction]
    })),
    removeReaction: (id) => set((state) => ({
        reactions: state.reactions.filter(r => r.id !== id)
    })),
    setPlaybackState: (newState) => set((state) => ({
        playbackState: { ...state.playbackState, ...newState }
    })),
    setSyncStatus: (status) => set({ syncStatus: status }),
    setMedia: (url, type, id, season, episode) => set({
        mediaUrl: url,
        mediaType: type,
        mediaId: id,
        season,
        episode
    }),
    reset: () => set({
        roomId: null,
        roomName: '',
        isHost: false,
        participants: [],
        messages: [],
        reactions: [],
        playbackState: initialPlaybackState,
        syncStatus: 'synced',
        mediaUrl: '',
        mediaType: 'movie',
        mediaId: null,
        season: undefined,
        episode: undefined,
    }),
}));

// UI State
interface UIState {
    isChatOpen: boolean;
    isFullscreen: boolean;
    showReactions: boolean;
    searchQuery: string;
    toggleChat: () => void;
    toggleFullscreen: () => void;
    setShowReactions: (show: boolean) => void;
    setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isChatOpen: true,
    isFullscreen: false,
    showReactions: true,
    searchQuery: '',
    toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
    toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
    setShowReactions: (show) => set({ showReactions: show }),
    setSearchQuery: (query) => set({ searchQuery: query }),
}));

// Watchlist State
interface WatchlistItem {
    id: string; // IMDb ID or internal ID
    imdbID?: string;
    title: string;
    poster_path: string;
    media_type: 'movie' | 'tv';
    vote_average: number;
    release_date?: string;
    addedAt: number;
}

interface WatchlistState {
    items: WatchlistItem[];
    addToWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
    removeFromWatchlist: (id: string) => void;
    isInWatchlist: (id: string) => boolean;
    clearWatchlist: () => void;
}

// Load watchlist from localStorage
const loadWatchlist = (): WatchlistItem[] => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem('togetherwatch_watchlist');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Save watchlist to localStorage
const saveWatchlist = (items: WatchlistItem[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('togetherwatch_watchlist', JSON.stringify(items));
    } catch {
        console.error('Failed to save watchlist');
    }
};

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
    items: [],

    addToWatchlist: (item) => {
        const newItem: WatchlistItem = {
            ...item,
            addedAt: Date.now(),
        };
        set((state) => {
            // Check if already exists
            if (state.items.some(i => i.id === item.id)) {
                return state;
            }
            const newItems = [newItem, ...state.items];
            saveWatchlist(newItems);
            return { items: newItems };
        });
    },

    removeFromWatchlist: (id) => {
        set((state) => {
            const newItems = state.items.filter(i => i.id !== id);
            saveWatchlist(newItems);
            return { items: newItems };
        });
    },

    isInWatchlist: (id) => {
        return get().items.some(i => i.id === id);
    },

    clearWatchlist: () => {
        saveWatchlist([]);
        set({ items: [] });
    },
}));

// Initialize watchlist from localStorage on client side
if (typeof window !== 'undefined') {
    const stored = loadWatchlist();
    if (stored.length > 0) {
        useWatchlistStore.setState({ items: stored });
    }
}
