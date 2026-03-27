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
}

// Generate a unique 6-character room code
function generateRoomCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing chars like 0, O, I, 1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

// Create a new room
export async function createRoom(data: {
    name: string;
    hostId: string;
    mediaId: string;
    mediaType: 'movie' | 'tv';
    mediaTitle?: string;
}): Promise<{ room: Room | null; error: string | null }> {
    // Generate unique code (with retry logic)
    let code = generateRoomCode();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        const { data: existingRoom } = await supabase
            .from('rooms')
            .select('code')
            .eq('code', code)
            .single();

        if (!existingRoom) break;
        code = generateRoomCode();
        attempts++;
    }

    const { data: room, error } = await supabase
        .from('rooms')
        .insert({
            code,
            name: data.name,
            host_id: data.hostId,
            media_id: data.mediaId,
            media_type: data.mediaType,
            media_title: data.mediaTitle || null,
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