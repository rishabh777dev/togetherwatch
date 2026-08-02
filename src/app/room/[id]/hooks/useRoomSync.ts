'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase, Room } from '@/lib/supabase';

export type PlaybackAction = 'play' | 'pause' | 'seek' | 'resync';
export type RemotePlaybackState = {
    action: PlaybackAction;
    time: number;
    playing: boolean;
};

interface UseRoomSyncProps {
    roomCodeParam: string;
    roomData: Room | null;
    isHost: boolean;
    senderKey: string;
    selectedSource: string;
    setSelectedSource: React.Dispatch<React.SetStateAction<string>>;
    onRoomDataReceived?: (room: Room) => void;
}

export function useRoomSync({
    roomCodeParam,
    roomData,
    isHost,
    senderKey,
    selectedSource,
    setSelectedSource,
    onRoomDataReceived,
}: UseRoomSyncProps) {
    // Sync Engine State
    const [syncKey, setSyncKey] = useState(0);
    const [viewerCount, setViewerCount] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'live' | 'resyncing'>('idle');
    const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
    const [pendingSeek, setPendingSeek] = useState(0);
    const [isIframeReady, setIsIframeReady] = useState(false);
    const [guestPlaybackActivated, setGuestPlaybackActivated] = useState(false);
    const [guestPlayerFocusMode, setGuestPlayerFocusMode] = useState(false);

    // Hybrid P2P / Supabase Sync State
    const [isP2PConnected, setIsP2PConnected] = useState(false);
    const [p2pActive, setP2PActive] = useState(false);
    const [p2pError, setP2PError] = useState<string | null>(null);
    const supabaseOnlineRef = useRef<boolean>(true);

    const peerRef = useRef<any>(null);
    const peerConnectionsRef = useRef<any[]>([]);
    const hostConnectionRef = useRef<any>(null);

    // Cinematic Engine
    const [syncLaunchTime, setSyncLaunchTime] = useState<number | null>(null);
    const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
    const [showPlayBang, setShowPlayBang] = useState(false);

    const lastHostEmit = useRef<number>(0);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const localPresenceKey = useRef<string>(`${senderKey}:${crypto.randomUUID()}`);
    const syncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const playbackStateRef = useRef({
        currentTime: 0,
        duration: 0,
        isPlaying: false,
    });
    const pendingRemoteSyncRef = useRef<RemotePlaybackState | null>(null);

    const applyPlayerCommand = useCallback((action: PlaybackAction, targetTime?: number) => {
        if (!iframeRef.current) return;

        const targetOrigin = new URL(iframeRef.current.src).origin;
        const message =
            action === 'seek' || action === 'resync'
                ? { action: 'seek', type: 'seek', time: targetTime ?? playbackStateRef.current.currentTime }
                : { action, type: action };

        iframeRef.current.contentWindow?.postMessage(message, targetOrigin);

        if (action === 'play') {
            iframeRef.current.contentWindow?.postMessage({ action: 'play', type: 'play' }, targetOrigin);
        }

        if (action === 'pause') {
            iframeRef.current.contentWindow?.postMessage({ action: 'pause', type: 'pause' }, targetOrigin);
        }
    }, []);

    const applyRemotePlaybackState = useCallback((state: RemotePlaybackState) => {
        applyPlayerCommand('seek', state.time);
        applyPlayerCommand(state.playing ? 'play' : 'pause', state.time);
    }, [applyPlayerCommand]);

    // Helper to send messages over PeerJS WebRTC
    const sendP2PBroadcast = useCallback((event: string, payload: any) => {
        const message = { event, payload };
        console.debug(`[P2P] Send event: ${event}`, payload);
        if (isHost) {
            peerConnectionsRef.current.forEach((conn) => {
                if (conn.open) {
                    conn.send(message);
                }
            });
        } else {
            if (hostConnectionRef.current?.open) {
                hostConnectionRef.current.send(message);
            }
        }
    }, [isHost]);

    // Helper to select between P2P or Supabase Broadcast
    const sendHybridBroadcast = useCallback((event: string, payload: any) => {
        if (p2pActive && isP2PConnected) {
            console.debug(`[Sync] Sending via P2P: ${event}`);
            sendP2PBroadcast(event, payload);
        } else if (supabaseOnlineRef.current) {
            console.debug(`[Sync] Sending via Supabase Fallback: ${event}`);
            try {
                syncChannelRef.current?.send({
                    type: 'broadcast',
                    event: event,
                    payload: payload
                });
            } catch (err) {
                console.warn('[Sync] Supabase broadcast send failed:', err);
                supabaseOnlineRef.current = false;
            }
        } else {
            console.debug(`[Sync] Supabase offline and P2P not active. Event dropped: ${event}`);
        }
    }, [p2pActive, isP2PConnected, sendP2PBroadcast]);

    // Parse P2P packet data identical to Supabase format
    const handleIncomingP2PData = useCallback((data: any, conn: any) => {
        const { event, payload } = data;
        if (!event) return;

        console.debug(`[P2P] Received event: ${event}`, payload);

        if (event === 'playback') {
            const nextTime = Number(payload?.time || 0);
            const nextPlaying = Boolean(payload?.playing);
            const nextDuration = Number(payload?.duration || 0);
            const nextSenderKey = payload?.senderKey;

            setCurrentTime(nextTime);
            setPendingSeek(nextTime);
            setIsPlaying(nextPlaying);
            if (nextDuration > 0) setDuration(nextDuration);
            setLastSyncAt(Date.now());
            setSyncStatus('live');
            setIsIframeReady(true);

            if (!isHost && nextSenderKey !== senderKey) {
                const remoteState: RemotePlaybackState = {
                    action: 'seek',
                    time: nextTime,
                    playing: nextPlaying,
                };
                pendingRemoteSyncRef.current = remoteState;
                if (isIframeReady) {
                    applyRemotePlaybackState(remoteState);
                }
            }
        } else if (event === 'control') {
            const action = payload?.action as PlaybackAction | undefined;
            const nextTime = Number(payload?.time || 0);
            const nextPlaying = Boolean(payload?.playing);
            const nextDuration = Number(payload?.duration || 0);
            const nextSenderKey = payload?.senderKey;

            if (!action) return;

            setCurrentTime(nextTime);
            setPendingSeek(nextTime);
            setIsPlaying(nextPlaying);
            if (nextDuration > 0) setDuration(nextDuration);
            setLastSyncAt(Date.now());
            setSyncStatus(action === 'resync' ? 'resyncing' : 'live');
            setIsIframeReady(true);

            if (!isHost && nextSenderKey !== senderKey) {
                const remoteState: RemotePlaybackState = {
                    action,
                    time: nextTime,
                    playing: nextPlaying,
                };
                pendingRemoteSyncRef.current = remoteState;
                if (isIframeReady) {
                    if (action === 'seek' || action === 'resync') {
                        applyRemotePlaybackState(remoteState);
                    } else {
                        applyPlayerCommand(action, nextTime);
                    }
                }
            }
        } else if (event === 'source_ready_check') {
            const nextSenderKey = payload?.senderKey;
            if (!isHost && nextSenderKey !== senderKey && isIframeReady) {
                const remoteState: RemotePlaybackState = {
                    action: 'resync',
                    time: playbackStateRef.current.currentTime,
                    playing: playbackStateRef.current.isPlaying,
                };
                pendingRemoteSyncRef.current = remoteState;
                applyRemotePlaybackState(remoteState);
            }
        } else if (event === 'request_resync') {
            const nextSenderKey = payload?.senderKey;
            if (isHost && nextSenderKey !== senderKey) {
                sendP2PBroadcast('playback', {
                    time: playbackStateRef.current.currentTime,
                    playing: playbackStateRef.current.isPlaying,
                    duration: playbackStateRef.current.duration,
                    senderKey,
                });
            }
        } else if (event === 'room_metadata') {
            const remoteRoomData = payload?.roomData;
            if (remoteRoomData && onRoomDataReceived) {
                onRoomDataReceived(remoteRoomData);
            }
        } else if (event === 'chat_message') {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('tw-receive-chat-message', {
                    detail: payload
                }));
            }
        }

        // Host relays packets to all other guests (star topology)
        if (isHost && conn) {
            peerConnectionsRef.current.forEach((guestConn) => {
                if (guestConn.peer !== conn.peer && guestConn.open) {
                    guestConn.send(data);
                }
            });
        }
    }, [isHost, senderKey, isIframeReady, applyPlayerCommand, applyRemotePlaybackState, sendP2PBroadcast, onRoomDataReceived]);

    const roomDataRef = useRef<Room | null>(null);
    useEffect(() => {
        roomDataRef.current = roomData;
    }, [roomData]);

    const selectedSourceRef = useRef<string>(selectedSource);
    useEffect(() => {
        selectedSourceRef.current = selectedSource;
    }, [selectedSource]);

    const handleIncomingP2PDataRef = useRef(handleIncomingP2PData);
    useEffect(() => {
        handleIncomingP2PDataRef.current = handleIncomingP2PData;
    }, [handleIncomingP2PData]);

    const hasInitializedPeer = useRef(false);

    // PeerJS Connection Lifecycle Management
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isHost && !roomData) return;
        if (!roomCodeParam) return;
        if (hasInitializedPeer.current) return;

        hasInitializedPeer.current = true;
        let activePeer: any = null;

        const connectToHost = (peerInstance: any) => {
            const hostPeerId = `togetherwatch-room-${roomCodeParam}-host`;
            console.log(`[P2P] Connecting to host: ${hostPeerId}`);
            
            const conn = peerInstance.connect(hostPeerId, {
                reliable: true
            });
            
            hostConnectionRef.current = conn;

            // Connection Timeout (4 seconds) fallback
            const timeout = setTimeout(() => {
                if (conn.open) return;
                console.log('[P2P] Connection timed out. Using Supabase fallback.');
                setIsP2PConnected(false);
                setP2PActive(false);
                setP2PError('Connection handshake timed out (4s)');
            }, 4000);

            conn.on('open', () => {
                clearTimeout(timeout);
                console.log('[P2P] Connected to host!');
                setIsP2PConnected(true);
                setP2PActive(true);
                setP2PError(null);
            });

            conn.on('data', (data: any) => {
                handleIncomingP2PDataRef.current(data, conn);
            });

            conn.on('close', () => {
                console.log('[P2P] Host disconnected. Using Supabase fallback.');
                setIsP2PConnected(false);
                setP2PActive(false);
                hostConnectionRef.current = null;
            });

            conn.on('error', (err: any) => {
                console.warn('[P2P] Host connection error:', err);
                setIsP2PConnected(false);
                setP2PActive(false);
                hostConnectionRef.current = null;
                setP2PError(err?.message || String(err));
            });
        };

        // Dynamically import PeerJS to prevent server-side rendering crashes
        import('peerjs').then(({ default: Peer }) => {
            const peerId = isHost 
                ? `togetherwatch-room-${roomCodeParam}-host` 
                : undefined;

            const peer = new Peer(peerId || '', {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                    ]
                }
            });

            activePeer = peer;
            peerRef.current = peer;

            peer.on('open', (id) => {
                console.log(`[P2P] Peer registered with ID: ${id}`);
                setP2PError(null);
                if (!isHost) {
                    connectToHost(peer);
                }
            });

            peer.on('error', (err: any) => {
                console.warn('[P2P] PeerJS instance error detailed:', err?.type, err?.message, err);
                setIsP2PConnected(false);
                setP2PActive(false);
                setP2PError(err?.type || err?.message || String(err));
            });

            if (isHost) {
                peer.on('connection', (conn) => {
                    console.log('[P2P] Guest connected:', conn.peer);
                    
                    const handleOpen = () => {
                        if (peerConnectionsRef.current.some(c => c.peer === conn.peer)) return;
                        peerConnectionsRef.current.push(conn);
                        setIsP2PConnected(true);
                        setP2PActive(true);

                        // Broadcast room metadata so guest can initialize roomData!
                        const currentRoom = roomDataRef.current;
                        if (currentRoom) {
                            conn.send({
                                event: 'room_metadata',
                                payload: {
                                    roomData: {
                                        code: currentRoom.code,
                                        name: currentRoom.name,
                                        host_id: currentRoom.host_id,
                                        media_id: currentRoom.media_id,
                                        media_type: currentRoom.media_type,
                                        media_title: currentRoom.media_title,
                                        selected_source: currentRoom.selected_source || selectedSourceRef.current
                                    }
                                }
                            });
                        }

                        // Broadcast current state to new guest
                        conn.send({
                            event: 'playback',
                            payload: {
                                time: playbackStateRef.current.currentTime,
                                playing: playbackStateRef.current.isPlaying,
                                duration: playbackStateRef.current.duration,
                                senderKey,
                            }
                        });
                    };

                    if (conn.open) {
                        handleOpen();
                    } else {
                        conn.on('open', handleOpen);
                    }

                    conn.on('data', (data: any) => {
                        handleIncomingP2PDataRef.current(data, conn);
                    });

                    conn.on('close', () => {
                        peerConnectionsRef.current = peerConnectionsRef.current.filter(c => c !== conn);
                        if (peerConnectionsRef.current.length === 0) {
                            setIsP2PConnected(false);
                        }
                    });
                });
            }
        });

        return () => {
            if (activePeer) {
                activePeer.destroy();
            }
            peerRef.current = null;
            peerConnectionsRef.current = [];
            hostConnectionRef.current = null;
            setIsP2PConnected(false);
            setP2PActive(false);
            hasInitializedPeer.current = false;
        };
    }, [!!roomData, roomCodeParam, isHost]);

    const broadcastPlayback = useCallback((time: number, playing: boolean, durationValue: number) => {
        sendHybridBroadcast('playback', {
            time,
            playing,
            duration: durationValue,
            senderKey,
        });
        setLastSyncAt(Date.now());
        setSyncStatus('live');
    }, [senderKey, sendHybridBroadcast]);

    const broadcastControl = useCallback((action: PlaybackAction, time: number, playing: boolean, durationValue: number) => {
        sendHybridBroadcast('control', {
            action,
            time,
            playing,
            duration: durationValue,
            senderKey,
        });
        setLastSyncAt(Date.now());
        setSyncStatus(action === 'resync' ? 'resyncing' : 'live');
    }, [senderKey, sendHybridBroadcast]);

    const runHostControl = useCallback((action: PlaybackAction, overrideTime?: number) => {
        if (!isHost) return;

        const nextTime = overrideTime ?? currentTime;
        const nextPlaying = action === 'pause' ? false : action === 'play' ? true : isPlaying;

        if (action === 'seek' || action === 'resync') {
            applyPlayerCommand('seek', nextTime);
        } else {
            applyPlayerCommand(action);
        }

        setCurrentTime(nextTime);
        setPendingSeek(nextTime);
        setIsPlaying(nextPlaying);

        if (action === 'resync') {
            broadcastPlayback(nextTime, nextPlaying, duration);
        }
        broadcastControl(action, nextTime, nextPlaying, duration);
    }, [applyPlayerCommand, broadcastControl, broadcastPlayback, currentTime, duration, isHost, isPlaying]);

    useEffect(() => {
        playbackStateRef.current = {
            currentTime,
            duration,
            isPlaying,
        };
    }, [currentTime, duration, isPlaying]);

    // Track when source or sync key changes to reset iframe loading
    useEffect(() => {
        if (!roomData) return;

        setIsIframeReady(false);

        const fallbackReady = window.setTimeout(() => {
            setIsIframeReady(true);
        }, 7000);

        return () => window.clearTimeout(fallbackReady);
    }, [roomData, selectedSource, syncKey]);

    useEffect(() => {
        if (!roomData || isHost) return;
        setGuestPlaybackActivated(false);
        setGuestPlayerFocusMode(false);
    }, [roomData, selectedSource, isHost]);

    // Presence & Sync Engine subscription
    useEffect(() => {
        if (!roomData) return;

        // Presence Channel explicitly for Live Viewer Count
        const presenceChannel = supabase.channel(`presence:${roomData.code}`, {
            config: { presence: { key: localPresenceKey.current } }
        });

        presenceChannel.on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            setViewerCount(Object.keys(state).length);
        }).subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({ online_at: new Date().toISOString() });
            }
        });

        // Sync Broadcast Channel
        const syncChannel = supabase.channel(`sync:${roomData.code}`);
        syncChannelRef.current = syncChannel;

        // Listen for Party Sync Launches (Both Host AND Guest)
        syncChannel.on('broadcast', { event: 'sync_launch' }, (payload) => {
            const launchConfig = payload.payload;
            if (launchConfig && launchConfig.executeAt) {
                setSyncLaunchTime(launchConfig.executeAt);
            }
        });

        syncChannel.on('broadcast', { event: 'playback' }, (payload) => {
            const nextTime = Number(payload.payload?.time || 0);
            const nextPlaying = Boolean(payload.payload?.playing);
            const nextDuration = Number(payload.payload?.duration || 0);
            const nextSenderKey = payload.payload?.senderKey;

            setCurrentTime(nextTime);
            setPendingSeek(nextTime);
            setIsPlaying(nextPlaying);
            if (nextDuration > 0) setDuration(nextDuration);
            setLastSyncAt(Date.now());
            setSyncStatus('live');
            setIsIframeReady(true);

            if (!isHost && nextSenderKey !== senderKey) {
                const remoteState: RemotePlaybackState = {
                    action: 'seek',
                    time: nextTime,
                    playing: nextPlaying,
                };
                pendingRemoteSyncRef.current = remoteState;
                if (isIframeReady) {
                    applyRemotePlaybackState(remoteState);
                }
            }
        });

        syncChannel.on('broadcast', { event: 'control' }, (payload) => {
            const action = payload.payload?.action as PlaybackAction | undefined;
            const nextTime = Number(payload.payload?.time || 0);
            const nextPlaying = Boolean(payload.payload?.playing);
            const nextDuration = Number(payload.payload?.duration || 0);
            const nextSenderKey = payload.payload?.senderKey;

            if (!action) return;

            setCurrentTime(nextTime);
            setPendingSeek(nextTime);
            setIsPlaying(nextPlaying);
            if (nextDuration > 0) setDuration(nextDuration);
            setLastSyncAt(Date.now());
            setSyncStatus(action === 'resync' ? 'resyncing' : 'live');
            setIsIframeReady(true);

            if (!isHost && nextSenderKey !== senderKey) {
                const remoteState: RemotePlaybackState = {
                    action,
                    time: nextTime,
                    playing: nextPlaying,
                };
                pendingRemoteSyncRef.current = remoteState;
                if (isIframeReady) {
                    if (action === 'seek' || action === 'resync') {
                        applyRemotePlaybackState(remoteState);
                    } else {
                        applyPlayerCommand(action, nextTime);
                    }
                }
            }
        });

        syncChannel.on('broadcast', { event: 'source_ready_check' }, (payload) => {
            const nextSenderKey = payload.payload?.senderKey;
            if (!isHost && nextSenderKey !== senderKey && isIframeReady) {
                const remoteState: RemotePlaybackState = {
                    action: 'resync',
                    time: playbackStateRef.current.currentTime,
                    playing: playbackStateRef.current.isPlaying,
                };
                pendingRemoteSyncRef.current = remoteState;
                applyRemotePlaybackState(remoteState);
            }
        });

        syncChannel.on('broadcast', { event: 'request_resync' }, (payload) => {
            const nextSenderKey = payload.payload?.senderKey;
            if (isHost && nextSenderKey !== senderKey) {
                broadcastPlayback(
                    playbackStateRef.current.currentTime,
                    playbackStateRef.current.isPlaying,
                    playbackStateRef.current.duration
                );
            }
        });

        const handleMessage = (e: MessageEvent) => {
            try {
                let eventData = e.data;
                if (typeof eventData === 'string') eventData = JSON.parse(eventData);

                let nextTime: number | null = null;
                let nextPlaying = playbackStateRef.current.isPlaying;
                let nextDuration = playbackStateRef.current.duration;

                if (eventData?.type === 'vidpro-progress') {
                    nextTime = eventData.state?.currentTime || eventData.time || null;
                    nextPlaying = eventData.state?.playing ?? nextPlaying;
                    nextDuration = eventData.state?.duration || eventData.duration || nextDuration;
                } else if (eventData?.type === 'PLAYER_EVENT') {
                    const playerEvent = eventData.data?.event;
                    nextTime = eventData.data?.position || eventData.data?.currentTime || null;
                    nextDuration = eventData.data?.duration || nextDuration;
                    if (playerEvent === 'play') nextPlaying = true;
                    if (playerEvent === 'pause') nextPlaying = false;
                } else if (eventData?.type === 'video.timeupdate') {
                    nextTime = eventData.time;
                    nextDuration = eventData.duration || nextDuration;
                } else {
                    return;
                }

                if (nextTime !== null && !Number.isNaN(nextTime)) {
                    // Prevent un-seeked local iframe 0s updates from overwriting live room timestamp for joining guests
                    if (!isHost && !guestPlaybackActivated && playbackStateRef.current.currentTime > 2 && nextTime < 2) {
                        return;
                    }

                    setCurrentTime(nextTime);
                    setPendingSeek(nextTime);
                    setDuration((prev) => nextDuration || prev);
                    setIsPlaying(nextPlaying);
                    setIsIframeReady(true);
                    if (isHost && Math.abs(nextTime - lastHostEmit.current) > 2) {
                        lastHostEmit.current = nextTime;
                        broadcastPlayback(nextTime, nextPlaying, nextDuration || playbackStateRef.current.duration);
                    }
                }
            } catch {
                // Ignore messages from unrelated iframes/extensions
            }
        };

        window.addEventListener('message', handleMessage);
        
        syncChannel.subscribe((status) => {
            console.log(`[Sync] Channel status for sync:${roomData.code}: ${status}`);
            if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                supabaseOnlineRef.current = false;
            } else if (status === 'SUBSCRIBED') {
                supabaseOnlineRef.current = true;
            }
        });

        return () => {
            window.removeEventListener('message', handleMessage);
            if (presenceChannel) supabase.removeChannel(presenceChannel);
            if (syncChannel) supabase.removeChannel(syncChannel);
            if (syncChannelRef.current === syncChannel) {
                syncChannelRef.current = null;
            }
        };
    }, [roomData, isHost, senderKey, applyPlayerCommand, applyRemotePlaybackState, broadcastPlayback, isIframeReady]);

    // Event listener for sending chat messages over PeerJS P2P
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleSendChatEvent = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { userId, userName, content, messageType } = customEvent.detail;

            // Broadcast to other peers over P2P
            sendP2PBroadcast('chat_message', {
                id: 'p2p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                room_code: roomCodeParam,
                user_id: userId,
                user_name: userName,
                content,
                message_type: messageType,
                created_at: new Date().toISOString()
            });
        };

        window.addEventListener('tw-send-chat-message', handleSendChatEvent);
        return () => {
            window.removeEventListener('tw-send-chat-message', handleSendChatEvent);
        };
    }, [roomCodeParam, sendP2PBroadcast]);

    // Cinematic Countdown Engine Loop
    useEffect(() => {
        if (!syncLaunchTime) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = syncLaunchTime - now;

            if (diff <= 0) {
                // Time's up! Show the PLAY explosion
                setCountdownDisplay(0);
                setShowPlayBang(true);
                setSyncLaunchTime(null);

                // Keep the PLAY BANNER up for 3 seconds then hide
                setTimeout(() => setShowPlayBang(false), 3000);
                clearInterval(interval);
            } else {
                setCountdownDisplay(Math.ceil(diff / 1000));
            }
        }, 100);

        return () => clearInterval(interval);
    }, [syncLaunchTime]);

    useEffect(() => {
        setPendingSeek(currentTime);
    }, [currentTime]);

    useEffect(() => {
        if (syncStatus !== 'resyncing') return;
        const timeout = setTimeout(() => setSyncStatus('live'), 1600);
        return () => clearTimeout(timeout);
    }, [syncStatus]);

    const commitSeek = (value: number) => {
        const safeValue = Math.max(0, Math.min(value, duration || value));
        setPendingSeek(safeValue);
        runHostControl('seek', safeValue);
    };

    const jumpBy = (delta: number) => {
        commitSeek((duration > 0 ? pendingSeek : currentTime) + delta);
    };

    const activateGuestPlayback = () => {
        const remoteState: RemotePlaybackState = {
            action: 'resync',
            time: currentTime,
            playing: isPlaying,
        };

        pendingRemoteSyncRef.current = remoteState;
        setGuestPlaybackActivated(true);
        setIsIframeReady(true);

        applyRemotePlaybackState(remoteState);
        sendHybridBroadcast('request_resync', { senderKey });
    };

    const startGuestPlayerDirectly = () => {
        setGuestPlaybackActivated(true);
        setGuestPlayerFocusMode(true);

        pendingRemoteSyncRef.current = {
            action: 'resync',
            time: currentTime,
            playing: isPlaying,
        };

        applyRemotePlaybackState(pendingRemoteSyncRef.current);
    };

    const finishGuestPlayerStart = () => {
        setGuestPlayerFocusMode(false);

        const remoteState: RemotePlaybackState = {
            action: 'resync',
            time: currentTime,
            playing: isPlaying,
        };

        pendingRemoteSyncRef.current = remoteState;
        applyRemotePlaybackState(remoteState);
        sendHybridBroadcast('request_resync', { senderKey });
    };

    const triggerSyncCountdown = () => {
        const executeAt = Date.now() + 5000;
        setSyncLaunchTime(executeAt);
        sendHybridBroadcast('sync_launch', { executeAt });
    };

    const handleIframeLoad = () => {
        setIsIframeReady(true);

        if (isHost) {
            setTimeout(() => {
                broadcastPlayback(
                    playbackStateRef.current.currentTime,
                    playbackStateRef.current.isPlaying,
                    playbackStateRef.current.duration
                );
                sendHybridBroadcast('source_ready_check', { senderKey });
            }, 1200);
            return;
        }

        const latestRemoteState = pendingRemoteSyncRef.current;
        if (latestRemoteState) {
            setTimeout(() => applyRemotePlaybackState(latestRemoteState), 1200);
        } else {
            sendHybridBroadcast('request_resync', { senderKey });
        }
    };

    return {
        // State
        syncKey,
        setSyncKey,
        viewerCount,
        currentTime,
        duration,
        isPlaying,
        syncStatus,
        setSyncStatus,
        lastSyncAt,
        pendingSeek,
        setPendingSeek,
        isIframeReady,
        setIsIframeReady,
        guestPlaybackActivated,
        guestPlayerFocusMode,
        countdownDisplay,
        showPlayBang,
        iframeRef,
        syncChannelRef,
        isP2PConnected,
        p2pActive,
        p2pError,

        // Actions
        commitSeek,
        jumpBy,
        runHostControl,
        activateGuestPlayback,
        startGuestPlayerDirectly,
        finishGuestPlayerStart,
        triggerSyncCountdown,
        handleIframeLoad,
        applyRemotePlaybackState,
        broadcastPlayback,
    };
}
