'use client';

import ChatPanel from '@/components/room/ChatPanel';
import SourceSelector from '@/components/room/SourceSelector';
import { parseRoomMediaId } from '@/lib/roomMedia';
import { getOrCreateUserId, getStoredUserName, isHostedRoom, saveUserName, getRoomMetadataLocal } from '@/lib/session';
import { useRoomStore } from '@/lib/store';
import { getRoomByCode, Room, subscribeToRoomSource, supabase, updateRoomSource } from '@/lib/supabase';
import { getEmbedUrl } from '@/lib/videoSources';
import {
    ChevronLeft,
    Loader2,
    MessageCircle,
    Pause,
    Play,
    RotateCcw,
    ScreenShare,
    SkipBack,
    SkipForward,
    User,
    Users,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRoomSync } from './hooks/useRoomSync';

type PlaybackAction = 'play' | 'pause' | 'seek' | 'resync';
type RemotePlaybackState = {
    action: PlaybackAction;
    time: number;
    playing: boolean;
};

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function appendEmbedParams(url: string, params: Record<string, string | number | boolean | undefined>) {
    try {
        const parsedUrl = new URL(url);

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                parsedUrl.searchParams.set(key, String(value));
            }
        });

        return parsedUrl.toString();
    } catch {
        const nextParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                nextParams.set(key, String(value));
            }
        });
        return `${url}${url.includes('?') ? '&' : '?'}${nextParams.toString()}`;
    }
}

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomCodeParam = params.id as string;
    const { user } = useAuthStore();

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isHostParam = searchParams?.get('host') === 'true';

    const { setRoomId, setRoomName, setIsHost, setMedia } = useRoomStore();

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [roomData, setRoomData] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState('vidlink');
    const [isWaitingForP2P, setIsWaitingForP2P] = useState(false);
    
    // Auth and Display Name
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [userName, setUserName] = useState('');

    const localUserId = useRef<string>('');
    const initialIframeTimeRef = useRef<number>(0);

    if (!localUserId.current) {
        localUserId.current = getOrCreateUserId();
    }

    const isHost = isHostParam || isHostedRoom(roomCodeParam) || (!!roomData && (
        (user?.id === roomData.host_id) ||
        localUserId.current === roomData.host_id
    ));
    const senderKey = user?.id || localUserId.current;
    const parsedRoomMedia = roomData
        ? parseRoomMediaId(roomData.media_id, roomData.media_type)
        : { mediaId: '', season: undefined, episode: undefined };

    const {
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
        isP2PConnected,
        p2pActive,
        p2pError,
        commitSeek,
        jumpBy,
        runHostControl,
        activateGuestPlayback,
        startGuestPlayerDirectly,
        finishGuestPlayerStart,
        triggerSyncCountdown,
        handleIframeLoad,
    } = useRoomSync({
        roomCodeParam,
        roomData,
        isHost,
        senderKey,
        selectedSource,
        setSelectedSource,
        onRoomDataReceived: (remoteRoom: Room) => {
            setRoomData(remoteRoom);
            setRoomId(remoteRoom.code);
            setRoomName(remoteRoom.name);
            setSelectedSource(remoteRoom.selected_source || 'vidlink');
            const parsedMedia = parseRoomMediaId(remoteRoom.media_id, remoteRoom.media_type);
            setMedia(
                '',
                remoteRoom.media_type,
                parseInt(parsedMedia.mediaId) || 0,
                parsedMedia.season,
                parsedMedia.episode
            );
            setIsWaitingForP2P(false);
        }
    });

    // Capture stable initial timestamp for iframe URL
    useEffect(() => {
        if (currentTime > 2 && initialIframeTimeRef.current === 0) {
            initialIframeTimeRef.current = Math.floor(currentTime);
        }
    }, [currentTime]);

    useEffect(() => {
        initialIframeTimeRef.current = currentTime > 2 ? Math.floor(currentTime) : 0;
    }, [selectedSource]);

    const nameParam = searchParams?.get('name');
    const mediaIdParam = searchParams?.get('mediaId');
    const mediaTypeParam = searchParams?.get('mediaType');
    const mediaTitleParam = searchParams?.get('title');

    // Load User and Room
    useEffect(() => {
        const fetchRoom = async () => {
            // Check if initializing database-free Host room via URL params
            if (isHostParam && nameParam && mediaIdParam && mediaTypeParam) {
                const mockRoom: Room = {
                    code: roomCodeParam,
                    name: nameParam,
                    host_id: senderKey,
                    media_id: mediaIdParam,
                    media_type: mediaTypeParam as 'movie' | 'tv',
                    media_title: mediaTitleParam || 'Watch Party',
                    selected_source: 'vidlink',
                    created_at: new Date().toISOString(),
                    is_public: false,
                    host_name: 'Host',
                    host_avatar: 'H',
                    started_at: new Date().toISOString()
                };
                setRoomData(mockRoom);
                setRoomId(mockRoom.code);
                setRoomName(mockRoom.name);
                setIsHost(true);
                setSelectedSource('vidlink');
                const parsedMedia = parseRoomMediaId(mockRoom.media_id, mockRoom.media_type);
                setMedia(
                    '',
                    mockRoom.media_type,
                    parseInt(parsedMedia.mediaId) || 0,
                    parsedMedia.season,
                    parsedMedia.episode
                );
                setIsLoading(false);
                return;
            }

            // Check if we have local metadata cached for this room (in case Host refreshed the page database-free)
            const localMeta = getRoomMetadataLocal(roomCodeParam);
            if (isHostedRoom(roomCodeParam) && localMeta) {
                console.log('[Room] Loading Host room metadata from local cache:', localMeta);
                setRoomData(localMeta);
                setRoomId(localMeta.code);
                setRoomName(localMeta.name);
                setIsHost(true);
                setSelectedSource(localMeta.selected_source || 'vidlink');
                const parsedMedia = parseRoomMediaId(localMeta.media_id, localMeta.media_type);
                setMedia(
                    '',
                    localMeta.media_type,
                    parseInt(parsedMedia.mediaId) || 0,
                    parsedMedia.season,
                    parsedMedia.episode
                );
                setIsLoading(false);
                return;
            }

            const { room, error } = await getRoomByCode(roomCodeParam);

            if (error || !room) {
                console.warn('Supabase room fetch failed, waiting for P2P connection handshake:', error);
                setIsWaitingForP2P(true);
                setIsLoading(false);
                return;
            }

            setRoomData(room);
            setRoomId(room.code);
            setRoomName(room.name);
            setIsHost(
                (user?.id === room.host_id) ||
                localUserId.current === room.host_id ||
                isHostedRoom(room.code)
            );
            setSelectedSource(room.selected_source || 'vidlink');
            const parsedMedia = parseRoomMediaId(room.media_id, room.media_type);
            setMedia(
                '',
                room.media_type,
                parseInt(parsedMedia.mediaId) || 0,
                parsedMedia.season,
                parsedMedia.episode
            );

            setIsLoading(false);

            if (!user && !getStoredUserName()) {
                setShowNamePrompt(true);
            }
        };

        fetchRoom();

        const sourceChannel = subscribeToRoomSource(roomCodeParam, (newSourceId) => {
            const resolvedSource = newSourceId || 'vidlink';
            setSelectedSource((prev) => {
                if (prev !== resolvedSource) {
                    setIsIframeReady(false);
                    setSyncKey(k => k + 1);
                    return resolvedSource;
                }
                return prev;
            });
        });

        return () => { sourceChannel.unsubscribe(); };
    }, [roomCodeParam, setRoomId, setRoomName, setIsHost, setMedia, user]);

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = userName.trim();
        if (trimmed.length >= 2) {
            saveUserName(trimmed);
            setShowNamePrompt(false);
        }
    };

    if (isLoading) {
        return <main className="h-screen bg-black flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-white" /></main>;
    }

    if (isWaitingForP2P && !roomData) {
        return (
            <main className="h-screen flex flex-col items-center justify-center bg-[#070707] px-4 font-sans">
                {!isP2PConnected && !p2pActive ? (
                    <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#0d0d0d] p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.65)]">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                            <X className="h-7 w-7 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Connection Failed</h3>
                        <p className="text-sm text-white/60 mt-3 leading-6">
                            Could not connect to the watch party host. The room code might be invalid, or the host is offline.
                        </p>
                        {p2pError && (
                            <p className="text-[11px] text-red-400/80 font-mono mt-3 p-2 bg-red-500/10 rounded border border-red-500/20 max-h-20 overflow-y-auto break-all">
                                Error details: {p2pError}
                            </p>
                        )}
                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => window.location.reload()}
                                className="flex-1 rounded-full bg-accent px-5 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-accent-light"
                            >
                                Retry
                            </button>
                            <button 
                                onClick={() => router.push('/')}
                                className="flex-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#0d0d0d] p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.65)]">
                        <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Connecting to Host</h3>
                        <p className="text-sm text-white/60 mt-3 leading-6">
                            Searching for host P2P connection. Make sure the host has opened the room and shared the correct link.
                        </p>
                        <button 
                            onClick={() => router.push('/')}
                            className="mt-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all w-full"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </main>
        );
    }

    if ((error || !roomData) && !isWaitingForP2P) {
        return (
            <main className="h-screen flex items-center justify-center bg-[#0b0b0b]">
                <div className="text-center max-w-md px-4">
                    <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2 text-white">Access Denied</h1>
                    <p className="text-white/50 mb-6">{error || 'Room not found.'}</p>
                    <Link href="/dashboard" className="w-full block py-3 bg-white text-black font-bold rounded-xl">Back to Dashboard</Link>
                </div>
            </main>
        );
    }

    if (showNamePrompt) {
        return (
            <main className="h-screen flex items-center justify-center bg-[#0b0b0b]">
                <div className="w-full max-w-md px-4">
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
                        <User className="w-16 h-16 text-accent mx-auto mb-6 bg-accent/10 p-4 rounded-full" />
                        <h1 className="text-2xl font-bold mb-2 text-white">Join Watch Party</h1>
                        <p className="text-white/50 mb-8 font-medium">Enter a display name so friends can recognize you.</p>
                        <form onSubmit={handleNameSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Display Name"
                                maxLength={20}
                                autoFocus
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent text-center text-lg font-bold"
                            />
                            <button type="submit" disabled={userName.trim().length < 2} className="w-full py-4 bg-accent hover:bg-accent-light text-white font-bold rounded-xl disabled:opacity-50">
                                Enter Room
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        );
    }

    const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
    const timeLabel = formatTime(currentTime);
    const durationLabel = duration > 0 ? formatTime(duration) : 'Live Source';
    const shouldPromptGuestToJoin = !isHost && isPlaying && !guestPlaybackActivated;

    let baseEmbedUrl = roomData ? getEmbedUrl(
        selectedSource,
        roomData.media_type,
        parsedRoomMedia.mediaId,
        undefined,
        parsedRoomMedia.season,
        parsedRoomMedia.episode
    ) : '';

    if (baseEmbedUrl) {
        const timeToSeek = initialIframeTimeRef.current > 2 
            ? initialIframeTimeRef.current 
            : (currentTime > 2 ? Math.floor(currentTime) : undefined);
            
        if (timeToSeek) {
            baseEmbedUrl = appendEmbedParams(baseEmbedUrl, {
                t: timeToSeek,
                progress: timeToSeek,
            });
        }
    }
    const embedUrl = baseEmbedUrl;

    return (
        <main className="h-screen w-screen flex flex-col bg-black overflow-hidden relative">
            
            {/* Top Bar - Floating Overlay Style */}
            <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                
                {/* Left controls */}
                <div className="flex items-center gap-4 pointer-events-auto">
                    <button onClick={() => router.push('/dashboard')} className="p-2 bg-black/50 hover:bg-white/10 backdrop-blur-md rounded-full transition-colors group">
                        <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                </div>

                {/* Center Title */}
                <div className="flex flex-col items-center pointer-events-auto">
                    <h1 className="font-bold text-white tracking-widest uppercase truncate max-w-sm text-sm">
                        {roomData?.media_title || roomData?.name || 'Watch Party'}
                    </h1>
                    <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest">{roomData?.name || ''}</p>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    <button onClick={() => setIsChatOpen(!isChatOpen)} className="p-2.5 bg-black/50 hover:bg-white/10 backdrop-blur-md rounded-full transition-colors relative">
                        <MessageCircle className="w-5 h-5 text-white" />
                    </button>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10 cursor-default">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />
                        <span className="text-white text-xs font-bold tracking-widest">{viewerCount}</span>
                    </div>
                </div>
            </div>

            {/* Main Video Background */}
            <div className="absolute inset-0 z-0">
                <iframe
                    ref={iframeRef}
                    key={`${selectedSource}-${syncKey}`}
                    src={embedUrl}
                    onLoad={handleIframeLoad}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            </div>

            {!isIframeReady && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-sm pointer-events-none">
                    <div className="rounded-2xl border border-white/10 bg-black/70 px-6 py-5 text-center">
                        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-white" />
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/75">
                            Loading Watch Stream
                        </p>
                    </div>
                </div>
            )}

            {shouldPromptGuestToJoin && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-black/85 p-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.65)]">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/15">
                            <ScreenShare className="h-7 w-7 text-accent" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-wide text-white">
                            Join Synced Stream
                        </h2>
                        <p className="mt-3 text-sm font-medium leading-6 text-white/60">
                            The host is playing at {timeLabel}. Start the player locally to follow the room.
                        </p>
                        <button
                            onClick={activateGuestPlayback}
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-light"
                        >
                            <Play className="h-4 w-4 fill-white" />
                            Join Now
                        </button>
                    </div>
                </div>
            )}

            {guestPlayerFocusMode && (
                <div className="absolute inset-x-0 top-20 z-40 flex justify-center px-4 pointer-events-none">
                    <div className="max-w-xl rounded-full border border-white/10 bg-black/80 px-5 py-3 text-center shadow-2xl backdrop-blur-xl">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-white">
                            Tap the video player, then sync back
                        </p>
                    </div>
                </div>
            )}

            {guestPlayerFocusMode && (
                <div className="absolute bottom-6 right-6 z-50 flex gap-2">
                    <button
                        onClick={finishGuestPlayerStart}
                        className="rounded-full bg-accent px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-2xl transition-colors hover:bg-accent-light"
                    >
                        Sync Back
                    </button>
                </div>
            )}

            {/* Control Band */}
            <div className={`absolute inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6 lg:px-8 transition-opacity ${guestPlayerFocusMode ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
                <div className="mx-auto max-w-6xl rounded-[28px] border border-white/10 bg-black/70 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
                    <div className="border-b border-white/10 px-5 py-3 sm:px-6">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/45">Watch Band</p>
                                <div className="mt-1 flex items-center gap-3">
                                    <p className="truncate text-sm font-semibold uppercase tracking-wide text-white">
                                        {roomData?.media_title || roomData?.name || 'Watch Party'}
                                    </p>
                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${
                                        syncStatus === 'resyncing'
                                            ? 'bg-accent/20 text-accent'
                                            : syncStatus === 'live'
                                                ? 'bg-green-500/15 text-green-400'
                                                : 'bg-white/10 text-white/55'
                                    }`}>
                                        {syncStatus === 'resyncing' ? 'Re-syncing' : syncStatus === 'live' ? 'Live Sync' : 'Standby'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/60">
                                <span className={`rounded-full border px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                                    p2pActive && isP2PConnected 
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                        : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${p2pActive && isP2PConnected ? 'bg-blue-400 animate-pulse' : 'bg-orange-400'}`} />
                                    {p2pActive && isP2PConnected ? 'P2P Synced' : 'Cloud Fallback'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    {isHost ? 'Host controls active' : 'Following host'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    <Users className="mr-1 inline h-3.5 w-3.5" />
                                    {viewerCount} watching
                                </span>
                                {lastSyncAt && (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                        Updated {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-5 py-4 sm:px-6">
                        <div className="mb-3 flex items-center justify-between gap-4">
                            <div className="text-sm font-mono text-white/80">{timeLabel}</div>
                            <div className="flex-1">
                                <div className="h-1.5 rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-accent to-orange-500 transition-[width] duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                            <div className="text-sm font-mono text-white/50">{durationLabel}</div>
                        </div>

                        <input
                            type="range"
                            min={0}
                            max={duration > 0 ? duration : Math.max(100, pendingSeek || currentTime || 100)}
                            step={1}
                            value={duration > 0 ? pendingSeek : currentTime}
                            onChange={(e) => setPendingSeek(Number(e.target.value))}
                            onMouseUp={(e) => isHost && commitSeek(Number((e.target as HTMLInputElement).value))}
                            onTouchEnd={(e) => isHost && commitSeek(Number((e.target as HTMLInputElement).value))}
                            disabled={!isHost}
                            className="h-2 w-full cursor-pointer accent-[#e01f3d] disabled:cursor-not-allowed disabled:opacity-40"
                        />

                        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                {isHost ? (
                                    <>
                                        <button
                                            onClick={() => jumpBy(-10)}
                                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                        >
                                            <SkipBack className="h-4 w-4" />
                                            10s
                                        </button>
                                        <button
                                            onClick={() => runHostControl(isPlaying ? 'pause' : 'play')}
                                            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-light"
                                        >
                                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            {isPlaying ? 'Pause Room' : 'Play Room'}
                                        </button>
                                        <button
                                            onClick={() => jumpBy(10)}
                                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                        >
                                            <SkipForward className="h-4 w-4" />
                                            10s
                                        </button>
                                        <button
                                            onClick={() => runHostControl('resync', currentTime)}
                                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Re-sync All
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={startGuestPlayerDirectly}
                                            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-light"
                                        >
                                            <Play className="h-4 w-4 fill-white" />
                                            Start Player
                                        </button>
                                        <button
                                            onClick={finishGuestPlayerStart}
                                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Sync Me
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {isHost && (
                                    <>
                                        <button
                                            onClick={triggerSyncCountdown}
                                            className="rounded-full border border-accent/30 bg-accent/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-accent transition-colors hover:bg-accent/25"
                                        >
                                            Launch Sync Countdown
                                        </button>
                                        <div className="hidden md:block">
                                            <SourceSelector
                                                currentSourceId={selectedSource}
                                                onSourceChange={async (id) => {
                                                    if (roomData) {
                                                        await updateRoomSource(roomData.code, id);
                                                    }
                                                    setSelectedSource(id);
                                                    setSyncKey(prev => prev + 1);
                                                    setSyncStatus('resyncing');
                                                }}
                                                disabled={false}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
 
            {/* Cinematic Sync Overlay */}
            {(countdownDisplay !== null || showPlayBang) && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-lg transition-opacity" />
                    
                    {countdownDisplay !== null && countdownDisplay > 0 && (
                        <div key={`cd-${countdownDisplay}`} className="z-10 text-[15rem] md:text-[20rem] font-black text-white tracking-tighter drop-shadow-[0_0_80px_rgba(224,31,61,0.8)] animate-pulse">
                            {countdownDisplay}
                        </div>
                    )}
 
                    {showPlayBang && (
                        <div className="z-10 flex flex-col items-center">
                            <h2 className="text-[6rem] md:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-orange-500 drop-shadow-[0_0_80px_rgba(224,31,61,1)] animate-bounce text-center leading-none">
                                PLAY!
                            </h2>
                            <p className="text-xl md:text-3xl text-white font-black uppercase tracking-[0.5em] mt-8 bg-black/50 border border-white/20 px-8 py-4 rounded-full backdrop-blur-md shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                                CLICK THE PLAYER NOW
                            </p>
                        </div>
                    )}
                </div>
            )}
 
            {/* Chat Overlay Panel */}
            <div className={`absolute bottom-6 right-6 z-40 w-80 lg:w-96 rounded-2xl overflow-hidden transition-all duration-300 transform origin-bottom-right shadow-2xl ${isChatOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
                 <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl h-[500px] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                          <h3 className="font-bold text-white uppercase tracking-widest text-sm">Room Chat</h3>
                          <button onClick={() => setIsChatOpen(false)} className="text-white/40 hover:text-white">
                              <X className="w-4 h-4" />
                          </button>
                      </div>
                      <div className="flex-1 overflow-hidden relative">
                          <ChatPanel roomCode={roomData?.code || roomCodeParam} isOpen={isChatOpen} />
                      </div>
                 </div>
            </div>

            {/* Always-Visible Minimized Chat Toggle */}
            {!isChatOpen && (
                 <div className="absolute bottom-6 right-6 z-40">
                     <button onClick={() => setIsChatOpen(true)} className="flex items-center gap-3 px-6 py-4 bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/10 rounded-full transition-all group shadow-2xl">
                          <span className="text-sm font-medium text-white/50 group-hover:text-white/80 transition-colors">Type a message...</span>
                          <MessageCircle className="w-5 h-5 text-white/40 group-hover:text-white" />
                     </button>
                 </div>
            )}
        </main>
    );
}
