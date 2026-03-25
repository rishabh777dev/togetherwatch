'use client';

import {
    Maximize,
    Pause,
    Play,
    RefreshCw,
    Users,
    Volume2, VolumeX
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
    src?: string;
    type?: 'movie' | 'tv';
    id?: number;
    season?: number;
    episode?: number;
    isHost?: boolean;
}

export default function VideoPlayer({
    src,
    type = 'movie',
    id,
    season = 1,
    episode = 1,
    isHost = false
}: VideoPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Generate embed URL for VidKing
    const embedUrl = id
        ? type === 'movie'
            ? `https://www.vidking.net/movie/${id}`
            : `https://www.vidking.net/tv/${id}/${season}/${episode}`
        : src;

    // Participants (mock)
    const participants = [
        { id: '1', name: 'You', isHost: true },
        { id: '2', name: 'Alex' },
        { id: '3', name: 'Sam' },
    ];

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            className="relative w-full h-full bg-black rounded-xl overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Video Embed */}
            {embedUrl && (
                <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            )}

            {/* Controls Overlay */}
            <div
                className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40
                    transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
                    {/* Sync Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                         ${syncStatus === 'synced' ? 'bg-green-500/20 text-green-400' :
                            syncStatus === 'syncing' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-400 animate-pulse' :
                                syncStatus === 'syncing' ? 'bg-yellow-400' :
                                    'bg-red-400'
                            }`} />
                        {syncStatus === 'synced' ? 'All Synced' :
                            syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
                    </div>

                    {/* Participants */}
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {participants.slice(0, 4).map((p) => (
                                <div
                                    key={p.id}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                            border-2 border-black ${p.isHost
                                            ? 'bg-accent'
                                            : 'bg-bg-hover'}`}
                                    title={p.name}
                                >
                                    {p.name[0]}
                                </div>
                            ))}
                        </div>
                        <span className="flex items-center gap-1 text-sm text-text-secondary">
                            <Users className="w-4 h-4" />
                            {participants.length}
                        </span>
                    </div>
                </div>

                {/* Center Play Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {!isPlaying && (
                        <button
                            onClick={() => setIsPlaying(true)}
                            className="w-20 h-20 rounded-full bg-accent/80 hover:bg-accent 
                       flex items-center justify-center transition-all pointer-events-auto
                       hover:scale-110 shadow-glow"
                        >
                            <Play className="w-8 h-8 fill-white ml-1" />
                        </button>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    {/* Progress Bar */}
                    <div className="mb-4 relative group cursor-pointer">
                        <div className="h-1 bg-white/20 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
                            <div className="h-full w-1/3 bg-accent rounded-full" />
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                            </button>

                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                            </button>

                            <span className="text-sm font-mono ml-2">0:00 / 0:00</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {isHost && (
                                <button
                                    onClick={() => setSyncStatus('syncing')}
                                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-sm"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Sync All
                                </button>
                            )}

                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <Maximize className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
