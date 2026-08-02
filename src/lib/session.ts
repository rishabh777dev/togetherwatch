const USER_ID_KEY = 'tw_user_id';
const USER_NAME_KEY = 'tw_user_name';
const HOSTED_ROOMS_KEY = 'tw_hosted_rooms';

function createClientId(prefix: string): string {
    const cryptoApi = typeof crypto !== 'undefined' ? crypto : null;

    if (cryptoApi?.randomUUID) {
        return `${prefix}_${cryptoApi.randomUUID()}`;
    }

    if (cryptoApi?.getRandomValues) {
        const values = new Uint32Array(4);
        cryptoApi.getRandomValues(values);
        return `${prefix}_${Array.from(values).map(value => value.toString(36)).join('')}`;
    }

    return `${prefix}_${Date.now().toString(36)}`;
}

export function getOrCreateUserId(): string {
    if (typeof window === 'undefined') {
        return createClientId('user');
    }

    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = createClientId('user');
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

export function saveRoomMetadataLocal(roomCode: string, metadata: any) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`tw_room_metadata_${roomCode.toUpperCase()}`, JSON.stringify(metadata));
}

export function getRoomMetadataLocal(roomCode: string): any | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(`tw_room_metadata_${roomCode.toUpperCase()}`);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}
