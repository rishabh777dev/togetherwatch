'use client';

import ChatPanel from '@/components/room/ChatPanel';
import ReactionBar from '@/components/room/ReactionBar';
import SourceSelector from '@/components/room/SourceSelector';
import { getStoredUserName, isHostedRoom, saveUserName } from '@/lib/session';
import { useRoomStore } from '@/lib/store';
import { getRoomByCode, Room, subscribeToRoomSource, updateRoomSource } from '@/lib/supabase';
import { getEmbedUrl } from '@/lib/videoSources';
import { Check, ChevronLeft, Copy, Loader2, LogOut, MessageCircle, Settings, Share2, User, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;

    const { setRoomId, setRoomName, setIsHost, setMedia, reset } = useRoomStore();

    const [isChatOpen, setIsChatOpen] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [roomData, setRoomData] = useState<Room | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [syncKey, setSyncKey] = useState(0); // For iframe reload on sync
    const [selectedSource, setSelectedSource] = useState('vidsrc'); // Current video source

    // Name entry state
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [userName, setUserName] = useState('');
    // Store page URL client-side only to avoid SSR/hydration mismatch
    const [pageUrl, setPageUrl] = useState('');

    // Check for stored name on mount and capture page URL
    useEffect(() => {
        const storedName = getStoredUserName();
        if (storedName) {
            setUserName(storedName);
        }
        setPageUrl(window.location.href);
    }, []);

    // Load room data from Supabase
    useEffect(() => {
        const fetchRoom = async () => {
            // Room ID is the room code
            const { room, error } = await getRoomByCode(roomId);

            if (error || !room) {
                setError('Room not found. It may have expired or the code is incorrect.');
                setIsLoading(false);
                return;
            }

            setRoomData(room);
            setRoomId(room.code);
            setRoomName(room.name);
            setIsHost(isHostedRoom(room.code));

            // Set initial source from room data
            setSelectedSource(room.selected_source || 'vidsrc');

            setMedia('', room.media_type, parseInt(room.media_id) || 0);

            setIsLoading(false);

            // If no stored name, show prompt
            if (!getStoredUserName()) {
                setShowNamePrompt(true);
            }
        };

        fetchRoom();

        // Subscribe to source changes
        const sourceChannel = subscribeToRoomSource(roomId, (newSourceId) => {
            console.log('[Room] Source changed, reloading video...');
            setSelectedSource(newSourceId);
            setSyncKey(prev => prev + 1); // Force iframe reload
        });

        return () => {
            sourceChannel.unsubscribe();
        };
    }, [roomId, setRoomId, setRoomName, setIsHost, setMedia]);

    // Handle name submission
    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = userName.trim();
        if (trimmedName.length >= 2) {
            saveUserName(trimmedName);
            setShowNamePrompt(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleLeaveRoom = () => {
        reset();
        router.push('/dashboard');
    };

    const handleSync = () => {
        // Force iframe reload to resync video
        setSyncKey(prev => prev + 1);
    };

    const handleSourceChange = async (sourceId: string) => {
        if (!isHostedRoom(roomId)) return;
        const { success } = await updateRoomSource(roomId, sourceId);
        if (success) {
            setSelectedSource(sourceId);
            setSyncKey(prev => prev + 1); // Force reload with new source
        }
    };

    if (isLoading) {
        return (
            <main className="h-screen flex items-center justify-center bg-bg-primary">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
                    <p className="text-text-secondary">Loading room...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="h-screen flex items-center justify-center bg-bg-primary">
                <div className="text-center max-w-md px-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Room Not Found</h1>
                    <p className="text-text-secondary mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <Link href="/watch-together" className="btn-primary">
                            Join Another Room
                        </Link>
                        <Link href="/browse" className="btn-ghost">
                            Browse Content
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const roomCode = `TW-${roomId.toUpperCase().slice(0, 6)}`;

    // Show name prompt modal if needed
    if (showNamePrompt) {
        return (
            <main className="h-screen flex items-center justify-center bg-bg-primary">
                <div className="w-full max-w-md px-4">
                    <div className="bg-bg-card border border-border rounded-2xl p-8 text-center">
                        {/* Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent to-accent-light rounded-full flex items-center justify-center">
                            <User className="w-10 h-10 text-white" />
                        </div>

                        <h1 className="text-2xl font-bold mb-2">What&apos;s your name?</h1>
                        <p className="text-text-secondary mb-6">
                            Enter a display name so others can identify you in the chat
                        </p>

                        <form onSubmit={handleNameSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Enter your name..."
                                maxLength={20}
                                autoFocus
                                className="input-primary w-full text-center text-lg"
                            />

                            <button
                                type="submit"
                                disabled={userName.trim().length < 2}
                                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Join Room
                            </button>

                            <p className="text-xs text-text-muted">
                                Min 2 characters. This will be saved for future rooms.
                            </p>
                        </form>

                        {/* Room info */}
                        <div className="mt-6 pt-6 border-t border-border">
                            <p className="text-sm text-text-secondary">
                                Joining: <span className="text-white font-medium">{roomData?.name || 'Watch Party'}</span>
                            </p>
                            {roomData?.media_title && (
                                <p className="text-xs text-text-muted mt-1">
                                    Now playing: {roomData.media_title}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // Calculate embed URL based on selected source
    const embedUrl = roomData
        ? getEmbedUrl(selectedSource, roomData.media_type, roomData.media_id)
        : '';

    return (
        <main className="h-screen flex flex-col bg-bg-primary overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back</span>
                    </Link>

                    <div className="h-6 w-px bg-border hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">T</span>
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm">{roomData?.name || roomCode}</h1>
                            <p className="text-xs text-text-muted">Room: {roomCode}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-hover rounded-lg transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-green-400" />
                                <span className="hidden sm:inline text-green-400">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Share2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Invite</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`p-2 rounded-lg transition-colors ${isChatOpen ? 'bg-accent' : 'hover:bg-bg-hover'}`}
                    >
                        <MessageCircle className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleLeaveRoom}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video Area */}
                <div className={`flex-1 flex flex-col ${isChatOpen ? 'lg:mr-0' : ''}`}>
                    {/* Video Player */}
                    <div className="flex-1 relative bg-black">
                        <iframe
                            key={syncKey}
                            src={embedUrl}
                            className="absolute inset-0 w-full h-full"
                            frameBorder="0"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />

                        {/* Sync Status & Controls */}
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-2 bg-black/70 rounded-full text-sm">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-green-400">In Sync</span>
                            </div>
                            <button
                                onClick={handleSync}
                                className="px-3 py-2 bg-accent hover:bg-accent-light rounded-full text-sm font-medium transition-colors"
                                title="Resync video"
                            >
                                Sync
                            </button>
                            <SourceSelector
                                currentSourceId={selectedSource}
                                onSourceChange={handleSourceChange}
                                disabled={!isHostedRoom(roomId)}
                            />
                        </div>
                    </div>

                    {/* Reaction Bar */}
                    <ReactionBar roomId={roomId} />
                </div>

                {/* Chat Panel */}
                {isChatOpen && (
                    <div className="hidden lg:flex w-80 flex-shrink-0">
                        <ChatPanel roomCode={roomId} isOpen={true} />
                    </div>
                )}
            </div>

            {/* Mobile Chat (overlay) */}
            {isChatOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsChatOpen(false)}>
                    <div
                        className="absolute right-0 top-0 bottom-0 w-80 max-w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ChatPanel roomCode={roomId} isOpen={true} />
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowSettings(false)}>
                    <div
                        className="bg-bg-secondary border border-border rounded-2xl p-6 w-full max-w-md mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Room Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-bg-hover rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-text-secondary mb-2">Room Link</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={pageUrl}
                                        readOnly
                                        className="input font-mono text-sm flex-1"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className="btn-ghost p-3"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-text-secondary mb-2">Room Code</label>
                                <input
                                    type="text"
                                    value={roomCode}
                                    readOnly
                                    className="input font-mono"
                                />
                            </div>

                            {roomData?.media_title && (
                                <div>
                                    <label className="block text-sm text-text-secondary mb-2">Now Playing</label>
                                    <p className="text-white">{roomData.media_title}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm text-text-secondary mb-2">Settings</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg cursor-pointer">
                                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-accent" />
                                        <span className="text-sm">Show reactions overlay</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg cursor-pointer">
                                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-accent" />
                                        <span className="text-sm">Chat notifications</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button onClick={() => setShowSettings(false)} className="btn-primary w-full">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
