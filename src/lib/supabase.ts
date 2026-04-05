import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
});

// --- RESTORED WATCH PARTY ROOM LOGIC ---

export interface Room {
    id?: string;
    code: string;
    name: string;
    host_id: string;
    media_id: string;
    media_type: 'movie' | 'tv';
    media_title: string | null;
    selected_source: string; // Video source ID (vidsrc, vidking, etc.)
    created_at: string;
    // New Public Directory Fields
    is_public: boolean;
    host_name: string;
    host_avatar: string | null;
    started_at: string;
}

// Create a new room
export async function createRoom(data: {
    code: string; // User-defined code/password
    name: string;
    hostId: string;
    hostName: string;
    hostAvatar?: string | null;
    mediaId: string;
    mediaType: 'movie' | 'tv';
    mediaTitle?: string;
    isPublic: boolean;
}): Promise<{ room: Room | null; error: string | null }> {
    
    // Check if the custom code is already taken by a live room
    const { data: existingRoom } = await supabase
        .from('rooms')
        .select('code')
        .eq('code', data.code.toUpperCase())
        .single();

    if (existingRoom) {
        return { room: null, error: 'Room Code is already taken. Choose another one.' };
    }

    const { data: room, error } = await supabase
        .from('rooms')
        .insert({
            code: data.code.toUpperCase(),
            name: data.name,
            host_id: data.hostId,
            host_name: data.hostName,
            host_avatar: data.hostAvatar || null,
            media_id: data.mediaId,
            media_type: data.mediaType,
            media_title: data.mediaTitle || null,
            is_public: data.isPublic,
            started_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating room:', error);
        return { room: null, error: error.message };
    }

    return { room, error: null };
}

// Get room by code
export async function getRoomByCode(code: string): Promise<{ room: Room | null; error: string | null }> {
    const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return { room: null, error: 'Room not found' };
        }
        console.error('Error fetching room:', error);
        return { room: null, error: error.message };
    }

    return { room, error: null };
}

// Get room by ID
export async function getRoomById(id: string): Promise<{ room: Room | null; error: string | null }> {
    const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching room:', error);
        return { room: null, error: error.message };
    }

    return { room, error: null };
}

// Subscribe to room updates (for real-time sync)
export function subscribeToRoom(roomId: string, callback: (room: Room) => void) {
    return supabase
        .channel(`room:${roomId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'rooms',
                filter: `id=eq.${roomId}`,
            },
            (payload) => {
                callback(payload.new as Room);
            }
        )
        .subscribe();
}

// ============================================
// CHAT MESSAGES
// ============================================

export interface ChatMessage {
    id: string;
    room_code: string;
    user_id: string;
    user_name: string;
    content: string;
    message_type: 'message' | 'reaction' | 'system';
    created_at: string;
}

// Send a message to a room
export async function sendMessage(data: {
    roomCode: string;
    userId: string;
    userName: string;
    content: string;
    messageType?: 'message' | 'reaction' | 'system';
}): Promise<{ message: ChatMessage | null; error: string | null }> {
    const { data: message, error } = await supabase
        .from('messages')
        .insert({
            room_code: data.roomCode,
            user_id: data.userId,
            user_name: data.userName,
            content: data.content,
            message_type: data.messageType || 'message',
        })
        .select()
        .single();

    if (error) {
        console.error('Error sending message:', error);
        return { message: null, error: error.message };
    }

    return { message, error: null };
}

// Get messages for a room
export async function getMessages(roomCode: string, limit: number = 50): Promise<ChatMessage[]> {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_code', roomCode)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }

    return messages || [];
}

// Subscribe to new messages in a room (real-time)
export function subscribeToMessages(
    roomCode: string,
    onNewMessage: (message: ChatMessage) => void
) {
    const channel = supabase
        .channel(`messages:${roomCode}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `room_code=eq.${roomCode}`,
            },
            (payload) => {
                console.log('[Realtime] New message received:', payload.new);
                onNewMessage(payload.new as ChatMessage);
            }
        )
        .subscribe((status, err) => {
            console.log('[Realtime] Subscription status:', status);
            if (err) {
                console.error('[Realtime] Subscription error:', err);
            }
            if (status === 'SUBSCRIBED') {
                console.log('[Realtime] ✅ Successfully subscribed to messages for room:', roomCode);
            }
        });

    return channel;
}

// Update room's selected video source
export async function updateRoomSource(
    roomCode: string,
    sourceId: string
): Promise<{ success: boolean; error: string | null }> {
    const { error } = await supabase
        .from('rooms')
        .update({ selected_source: sourceId })
        .eq('code', roomCode.toUpperCase());

    if (error) {
        console.error('Error updating room source:', error);
        return { success: false, error: error.message };
    }

    console.log('[Source] Updated room source to:', sourceId);
    return { success: true, error: null };
}

// Subscribe to room source changes (real-time)
export function subscribeToRoomSource(
    roomCode: string,
    onSourceChange: (sourceId: string) => void
) {
    return supabase
        .channel(`room_source:${roomCode}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'rooms',
                filter: `code=eq.${roomCode.toUpperCase()}`,
            },
            (payload) => {
                const newSource = (payload.new as Room).selected_source;
                console.log('[Source] Room source changed to:', newSource);
                onSourceChange(newSource);
            }
        )
        .subscribe((status, err) => {
            console.log('[Source] Subscription status:', status);
            if (err) {
                console.error('[Source] Subscription error:', err);
            }
        });
}

// Get active public rooms
export async function getPublicRooms(): Promise<{ rooms: Room[] | null; error: string | null }> {
    const { data: rooms, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_public', true)
        .order('started_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching public rooms:', error);
        return { rooms: null, error: error.message };
    }

    return { rooms, error: null };
}

// Get user watch progress tracking (to use as recent sessions on dashboard)
export async function getUserSessions(userId: string) {
    const { data: sessions, error } = await supabase
        .from('watch_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching user sessions:', error);
        return { sessions: [], error: error.message };
    }

    return { sessions, error: null };
}