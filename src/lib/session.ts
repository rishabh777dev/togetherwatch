const USER_ID_KEY = 'tw_user_id';
const USER_NAME_KEY = 'tw_user_name';
const HOSTED_ROOMS_KEY = 'tw_hosted_rooms';

export function getOrCreateUserId(): string {
    if (typeof window === 'undefined') {
        return `user_${Math.random().toString(36).substring(2, 8)}`;
    }

    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = `user_${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem(USER_ID_KEY, userId);
    }

    return userId;
}

export function getStoredUserName(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(USER_NAME_KEY);
}

export function saveUserName(name: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_NAME_KEY, name);
}

export function markRoomAsHosted(roomCode: string) {
    if (typeof window === 'undefined') return;

    const existing = getHostedRooms();
    if (!existing.includes(roomCode)) {
        localStorage.setItem(HOSTED_ROOMS_KEY, JSON.stringify([...existing, roomCode]));
    }
}

export function isHostedRoom(roomCode: string): boolean {
    if (typeof window === 'undefined') return false;
    return getHostedRooms().includes(roomCode);
}

function getHostedRooms(): string[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(HOSTED_ROOMS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}
