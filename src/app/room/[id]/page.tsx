'use client';

import ChatPanel from '@/components/room/ChatPanel';
import SourceSelector from '@/components/room/SourceSelector';
import { getStoredUserName, isHostedRoom, saveUserName } from '@/lib/session';
import { useRoomStore } from '@/lib/store';
import { getRoomByCode, Room, subscribeToRoomSource, supabase, updateRoomSource } from '@/lib/supabase';
import { getEmbedUrl } from '@/lib/videoSources';
import { ChevronLeft, Loader2, MessageCircle, Settings, X, User } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomCodeParam = params.id as string;
    const { user } = useAuthStore();

    const { setRoomId, setRoomName, setIsHost, setMedia } = useRoomStore();

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [roomData, setRoomData] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState('vidsrcme');
    
    // Auth and Display Name
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [userName, setUserName] = useState('');

    // Sync Engine State
    const [guestTimestamp, setGuestTimestamp] = useState<number>(0);
    const [syncKey, setSyncKey] = useState(0); 
    const [viewerCount, setViewerCount] = useState(1);
    
    // Cinematic Engine
    const [syncLaunchTime, setSyncLaunchTime] = useState<number | null>(null);
    const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
    const [showPlayBang, setShowPlayBang] = useState(false);

    const lastHostEmit = useRef<number>(0);
    const currentLocalTime = useRef<number>(0);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    const isHost = user && roomData && user.id === roomData.host_id;

    // Load User and Room
    useEffect(() => {
        const fetchRoom = async () => {
            const { room, error } = await getRoomByCode(roomCodeParam);

            if (error || !room) {
                setError('Room not found. Please check your room code.');
                setIsLoading(false);
                return;
            }

            setRoomData(room);
            setRoomId(room.code);
            setRoomName(room.name);
            setSelectedSource(room.selected_source || 'vidsrcme');
            setMedia('', room.media_type, parseInt(room.media_id) || 0);

            setIsLoading(false);

            if (!user && !getStoredUserName()) {
                setShowNamePrompt(true);
            }
        };

        fetchRoom();

        const sourceChannel = subscribeToRoomSource(roomCodeParam, (newSourceId) => {
            const resolvedSource = newSourceId || 'vidsrcme';
            setSelectedSource((prev) => {
                if (prev !== resolvedSource) {
                    setSyncKey(k => k + 1);
                    return resolvedSource;
                }
                return prev;
            });
        });

        return () => { sourceChannel.unsubscribe(); };
    }, [roomCodeParam, setRoomId, setRoomName, setIsHost, setMedia, user]);

    // Presence & Sync Engine
    useEffect(() => {
        if (!roomData) return;

        // Presence Channel explicitly for Live Viewer Count
        const presenceChannel = supabase.channel(`presence:${roomData.code}`, {
            config: { presence: { key: user?.id || getStoredUserName() || 'anonymous' } }
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

        // Listen for Party Sync Launches (Both Host AND Guest)
        syncChannel.on('broadcast', { event: 'sync_launch' }, (payload) => {
            console.log('[Sync] Received Sync Launch Command:', payload);
            const launchConfig = payload.payload;
            if (launchConfig && launchConfig.executeAt) {
                setSyncLaunchTime(launchConfig.executeAt);
            }
        });

        if (!isHost) {
            // Guest logs on to Sync Broadcasts
            syncChannel.on('broadcast', { event: 'playback' }, (payload) => {
                const hostTime = payload.payload.time;
                const isPlaying = payload.payload.playing;
                currentLocalTime.current = hostTime;

                // Native Sub-second Iframe Sync for Vidlink!
                if (iframeRef.current && typeof window !== 'undefined') {
                    // Send sync commands
                    iframeRef.current.contentWindow?.postMessage({ action: 'seek', type: 'seek', time: hostTime }, '*');
                    if (isPlaying) {
                        iframeRef.current.contentWindow?.postMessage({ action: 'play', type: 'play' }, '*');
                    }
                }
            }).subscribe();
        } else {
            // Host listens to Local Video and Broadcasts
            const handleMessage = (e: MessageEvent) => {
                try {
                    let eventData = e.data;
                    if (typeof eventData === 'string') eventData = JSON.parse(eventData);

                    let time = null;
                    let playing = true;

                    // Parse VidLink, JWPlayer, etc.
                    if (eventData?.type === 'vidpro-progress') {
                         time = eventData.state?.currentTime || eventData.time;
                         playing = eventData.state?.playing ?? true;
                    } else if (eventData?.type === 'PLAYER_EVENT' && eventData.data?.event === 'timeupdate') {
                         time = eventData.data.position || eventData.data.currentTime;
                    } else if (eventData?.type === 'video.timeupdate') {
                         time = eventData.time;
                    }

                    if (time !== null && !isNaN(time)) {
                        currentLocalTime.current = time;
                        // Throttle Emit to every 2 seconds to keep tight sync
                        if (Math.abs(time - lastHostEmit.current) > 2) {
                            lastHostEmit.current = time;
                            syncChannel.send({
                                type: 'broadcast',
                                event: 'playback',
                                payload: { time, playing }
                            });
                        }
                    }
                } catch { /* ignore non-player messages */ }
            };

            window.addEventListener('message', handleMessage);
            syncChannel.subscribe();

            return () => {
                window.removeEventListener('message', handleMessage);
                if (syncChannel) supabase.removeChannel(syncChannel);
            };
        }

        return () => {
            if (presenceChannel) supabase.removeChannel(presenceChannel);
            if (syncChannel) supabase.removeChannel(syncChannel);
        };
    }, [roomData, isHost, user]);

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

    if (error || !roomData) {
        return (
            <main className="h-screen flex items-center justify-center bg-[#0b0b0b]">
                <div className="text-center max-w-md px-4">
                    <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2 text-white">Access Denied</h1>
                    <p className="text-white/50 mb-6">{error}</p>
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

    let baseEmbedUrl = getEmbedUrl(selectedSource, roomData.media_type, roomData.media_id);
    // If guest was forced to update time by host
    if (!isHost && guestTimestamp > 1) {
        baseEmbedUrl += `${baseEmbedUrl.includes('?') ? '&' : '?'}t=${guestTimestamp}&progress=${guestTimestamp}`;
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
                        {roomData.media_title || roomData.name}
                    </h1>
                    <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest">{roomData.name}</p>
                    
                    {isHost && (
                        <button 
                            onClick={() => {
                                const executeAt = Date.now() + 5000;
                                setSyncLaunchTime(executeAt);
                                supabase.channel(`sync:${roomData.code}`).send({
                                    type: 'broadcast',
                                    event: 'sync_launch',
                                    payload: { executeAt }
                                });
                            }}
                            className="mt-1.5 px-4 py-1.5 bg-accent hover:bg-accent/80 text-[10px] md:text-xs text-white font-bold tracking-widest uppercase rounded-full shadow-[0_0_15px_rgba(224,31,61,0.5)] transition-all flex items-center gap-2"
                        >
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Launch Sync (5s)
                        </button>
                    )}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3 pointer-events-auto">
                     {isHost && (
                        <div className="mr-2 hidden md:block">
                             <SourceSelector
                                currentSourceId={selectedSource}
                                onSourceChange={async (id) => {
                                    await updateRoomSource(roomData.code, id);
                                    setSelectedSource(id);
                                    setSyncKey(prev => prev + 1);
                                }}
                                disabled={false}
                            />
                        </div>
                    )}
                    
                    <button onClick={() => setIsChatOpen(!isChatOpen)} className="p-2.5 bg-black/50 hover:bg-white/10 backdrop-blur-md rounded-full transition-colors relative">
                        <MessageCircle className="w-5 h-5 text-white" />
                    </button>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10 cursor-default">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />
                        <span className="text-white text-xs font-bold tracking-widest">{viewerCount}</span>
                    </div>
                </div>
            </div>

            {/* Main Video Background (Cineby Edge-to-Edge) */}
            <div className="absolute inset-0 z-0">
                <iframe
                    ref={iframeRef}
                    key={`${selectedSource}-${syncKey}`}
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
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
                          <ChatPanel roomCode={roomData.code} isOpen={isChatOpen} />
                      </div>
                 </div>
            </div>

            {/* Always-Visible Minimized Chat Toggle/Input Preview (If you want the Cineby look where it's just an input box initially) */}
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
