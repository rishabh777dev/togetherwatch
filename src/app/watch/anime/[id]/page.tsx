'use client';

import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import { getAnimeDetails } from '@/lib/anilist';
import { 
    getPreferredServer, 
    savePreferredServer, 
    saveContinueWatchingItem, 
    getContinueWatchingItem,
    getAutoPlayNext,
    saveAutoPlayNext
} from '@/lib/watchProgress';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Play, Sparkles, X } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';

interface AnimeDetails {
    id: number;
    title: {
        romaji: string;
        english: string | null;
    };
    description: string;
    coverImage: {
        large: string;
    };
    episodes: number | null;
    format: string;
}

function sanitizeHtml(html: string): string {
    return html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '');
}

/**
 * Universal parser for cross-origin player events (VidLink, VidRift, HTML5, Video.js, etc.)
 */
function parsePlaybackEvent(eventData: any) {
    let data = eventData;
    if (typeof data === 'string') {
        try { 
            data = JSON.parse(data); 
        } catch { 
            const str = String(data).trim().toLowerCase();
            if (str === 'ended' || str === 'vidrift:ended' || str === 'player:ended') {
                return { isEnded: true, currentTime: null, duration: null };
            }
            return null; 
        }
    }
    if (!data || typeof data !== 'object') return null;

    const typeStr = String(data.type || data.event || data.action || data.status || '').toLowerCase();
    const subEvent = String(data.data?.event || data.data?.type || '').toLowerCase();

    const isEnded = 
        typeStr === 'ended' ||
        typeStr === 'player:ended' ||
        typeStr === 'vidrift:ended' ||
        typeStr.endsWith(':ended') ||
        typeStr.includes('playbackended') ||
        subEvent === 'ended' ||
        subEvent === 'player:ended' ||
        subEvent.endsWith(':ended') ||
        subEvent.includes('playbackended') ||
        data.ended === true ||
        data.data?.ended === true;

    const payload = (data.type === 'PLAYER_EVENT' && data.data) ? data.data : data;
    const currentTime = Number(
        payload.currentTime ?? payload.position ?? payload.time ?? payload.current_time ?? payload.seconds
    );
    const duration = Number(
        payload.duration ?? payload.totalTime ?? payload.total_time ?? payload.length
    );

    return {
        isEnded,
        currentTime: !isNaN(currentTime) && currentTime > 0 ? currentTime : null,
        duration: !isNaN(duration) && duration > 0 ? duration : null
    };
}

function AnimeWatchContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const animeId = params.id as string;

    const urlEp = searchParams.get('e') || searchParams.get('ep');

    const [anime, setAnime] = useState<AnimeDetails | null>(null);

    // Synchronous initial episode from URL param OR saved progress
    const [currentEpisode, setCurrentEpisode] = useState<number>(() => {
        if (urlEp && !isNaN(Number(urlEp))) return Number(urlEp);
        if (typeof window !== 'undefined') {
            const saved = getContinueWatchingItem(animeId, 'tv');
            if (saved?.episode) return saved.episode;
        }
        return 1;
    });

    const [selectedSource, setSelectedSource] = useState('vidrift');
    const [loading, setLoading] = useState(true);

    // Auto-Play Next Episode State & Refs
    const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => getAutoPlayNext());
    const autoPlayNextRef = useRef<boolean>(autoPlayNext);
    useEffect(() => {
        autoPlayNextRef.current = autoPlayNext;
    }, [autoPlayNext]);

    const [countdownActive, setCountdownActive] = useState<boolean>(false);
    const [countdownSeconds, setCountdownSeconds] = useState<number>(5);
    const lastHandledEpisodeKey = useRef<string>('');

    // Sync episode if URL changes
    useEffect(() => {
        if (urlEp && !isNaN(Number(urlEp))) {
            const ep = Number(urlEp);
            setCurrentEpisode(prev => (prev !== ep ? ep : prev));
        }
    }, [urlEp]);

    // Keep URL in sync on mount so refresh never loses episode
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentE = searchParams.get('e') || searchParams.get('ep');
            if (!currentE) {
                window.history.replaceState(null, '', `/watch/anime/${animeId}?e=${currentEpisode}`);
            }
        }
    }, [animeId, currentEpisode, searchParams]);

    useEffect(() => {
        const saved = getPreferredServer();
        if (saved) {
            setSelectedSource(saved);
        }
    }, []);

    const cancelCountdown = useCallback(() => {
        setCountdownActive(false);
    }, []);

    const handleEpisodeChange = useCallback((epNum: number) => {
        cancelCountdown();
        setCurrentEpisode(epNum);
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `/watch/anime/${animeId}?e=${epNum}`);
        }
    }, [cancelCountdown, animeId]);

    const startAutoPlayCountdown = useCallback(() => {
        if (!autoPlayNextRef.current || !anime) return;
        const total = anime.episodes || 12;
        if (currentEpisode >= total) return;

        const epKey = `ep:${currentEpisode}`;
        if (lastHandledEpisodeKey.current === epKey) return; // Prevent duplicate trigger
        if (countdownActive) return;

        lastHandledEpisodeKey.current = epKey;
        setCountdownSeconds(5);
        setCountdownActive(true);
    }, [anime, currentEpisode, countdownActive]);

    const triggerNextEpisodeNow = useCallback(() => {
        cancelCountdown();
        const total = anime?.episodes || 12;
        if (currentEpisode < total) {
            handleEpisodeChange(currentEpisode + 1);
        }
    }, [cancelCountdown, anime, currentEpisode, handleEpisodeChange]);

    // Clean React countdown ticker
    useEffect(() => {
        if (!countdownActive) return;

        if (countdownSeconds <= 0) {
            setCountdownActive(false);
            const total = anime?.episodes || 12;
            if (currentEpisode < total) {
                handleEpisodeChange(currentEpisode + 1);
            }
            return;
        }

        const timer = setTimeout(() => {
            setCountdownSeconds(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdownActive, countdownSeconds, anime, currentEpisode, handleEpisodeChange]);

    // Handle postMessage events from iframe for end-of-episode detection
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            try {
                const parsed = parsePlaybackEvent(event.data);
                if (!parsed) return;

                if (parsed.isEnded) {
                    if (autoPlayNextRef.current) {
                        startAutoPlayCountdown();
                    }
                }

                if (parsed.currentTime !== null) {
                    const currentTime = parsed.currentTime;
                    const duration = parsed.duration ?? 0;

                    if (duration > 60) {
                        const progressPercent = (currentTime / duration) * 100;
                        if (autoPlayNextRef.current && (currentTime >= duration - 4 || progressPercent >= 98)) {
                            startAutoPlayCountdown();
                        }
                    }
                }
            } catch {
                // Ignore parsing errors
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [startAutoPlayCountdown]);

    useEffect(() => {
        if (!anime) return;
        saveContinueWatchingItem({
            id: `anime:${animeId}:ep${currentEpisode}`,
            media_id: animeId,
            media_type: 'tv',
            title: anime.title.english || anime.title.romaji || 'Anime',
            poster_path: anime.coverImage?.large,
            backdrop_path: anime.coverImage?.large,
            season: 1,
            episode: currentEpisode,
            progress: 0,
            timestamp: 0,
            duration: 0,
            updated_at: new Date().toISOString()
        });
    }, [anime, currentEpisode, animeId]);

    useEffect(() => {
        async function loadAnime() {
            try {
                const data = await getAnimeDetails(parseInt(animeId));
                setAnime(data);
            } catch (error) {
                console.error('Error loading anime:', error);
            } finally {
                setLoading(false);
            }
        }
        loadAnime();
    }, [animeId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!anime) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Anime Not Found</h2>
                    <p className="text-text-secondary">Could not find the requested anime.</p>
                </div>
            </div>
        );
    }

    const totalEpisodes = anime.episodes || 12;

    let embedUrl = '';
    const apParam = autoPlayNext ? '?autoplay=1' : '?autoplay=0';
    if (selectedSource === 'vidrift') {
        embedUrl = `https://embed.vidrift.net/embed/anilist/${animeId}/${currentEpisode}${apParam}`;
    } else if (selectedSource === 'autoembed') {
        embedUrl = `https://player.autoembed.cc/embed/tv/${animeId}/1/${currentEpisode}${apParam}`;
    } else if (selectedSource === 'vidbolt') {
        embedUrl = `https://vidbolt.xyz/tv/${animeId}/1/${currentEpisode}${apParam}`;
    } else if (selectedSource === 'vidlink') {
        embedUrl = `https://vidlink.pro/tv/${animeId}/1/${currentEpisode}?primaryColor=E50914&autoplay=${autoPlayNext ? 'true' : 'false'}&nextbutton=true`;
    } else if (selectedSource === 'vidout') {
        embedUrl = `https://vidout.pages.dev/tv/${animeId}/1/${currentEpisode}${apParam}`;
    } else {
        embedUrl = `https://embed.vidrift.net/embed/anilist/${animeId}/${currentEpisode}${apParam}`;
    }

    const sources = [
        { id: 'vidrift', name: 'Vidrift Anime', icon: '🌸', desc: 'Recommended (HLS & Auto-Next)' },
        { id: 'autoembed', name: 'AutoEmbed Anime', icon: '⚡', desc: 'Fast HD Mirror' },
        { id: 'vidbolt', name: 'VidBolt Anime', icon: '🍡', desc: 'Ultra HD' },
        { id: 'vidlink', name: 'VidLink PRO', icon: '🚀', desc: 'Ad-Free HD' },
        { id: 'vidout', name: 'VIDOUT', icon: '🎌', desc: 'Multi-Audio' },
    ];

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navbar />

            <div className="pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Anime Info Header */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                                {anime.title.english || anime.title.romaji}
                            </h1>
                            <div className="flex flex-wrap gap-2.5 text-text-secondary">
                                <span className="px-3 py-1 bg-bg-card rounded-lg text-xs font-semibold">{anime.format}</span>
                                <span className="px-3 py-1 bg-bg-card rounded-lg text-xs font-semibold">{totalEpisodes} Episodes</span>
                                <span className="px-3 py-1 bg-accent/20 text-accent rounded-lg text-xs font-bold">
                                    Episode {currentEpisode}
                                </span>
                            </div>
                        </div>

                        {/* Auto-Play Next Toggle Switch in header */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const nextVal = !autoPlayNext;
                                    setAutoPlayNext(nextVal);
                                    saveAutoPlayNext(nextVal);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                    autoPlayNext 
                                        ? 'bg-accent/15 border-accent text-accent shadow-sm' 
                                        : 'bg-bg-card border-white/10 text-white/50 hover:text-white'
                                }`}
                                title="Toggle Auto-Play Next Episode on finish"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Auto-Play Next:</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${autoPlayNext ? 'bg-accent text-white' : 'bg-white/10 text-white/40'}`}>
                                    {autoPlayNext ? 'ON' : 'OFF'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Video Player */}
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-6 shadow-2xl group">
                        <iframe
                            key={`${selectedSource}-${animeId}-ep-${currentEpisode}`}
                            src={embedUrl}
                            className="w-full h-full border-0"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />

                        {/* Netflix-style Floating Next Episode Countdown Overlay */}
                        {countdownActive && currentEpisode < totalEpisodes && (
                            <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 max-w-sm w-[calc(100%-2rem)] sm:w-auto bg-black/95 backdrop-blur-2xl border border-white/20 p-4 rounded-2xl shadow-2xl animate-fade-in pointer-events-auto">
                                <div className="flex items-start justify-between gap-3 mb-2.5">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-black text-accent">{countdownSeconds}</span>
                                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                                <circle
                                                    cx="16"
                                                    cy="16"
                                                    r="13"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    className="text-white/10 fill-none"
                                                />
                                                <circle
                                                    cx="16"
                                                    cy="16"
                                                    r="13"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    className="text-accent fill-none transition-all duration-1000"
                                                    strokeDasharray={81.68}
                                                    strokeDashoffset={81.68 * (1 - countdownSeconds / 5)}
                                                />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/50">
                                                Up Next in {countdownSeconds}s
                                            </p>
                                            <h4 className="text-xs font-bold text-white truncate max-w-[210px]">
                                                Episode {currentEpisode + 1}
                                            </h4>
                                        </div>
                                    </div>
                                    <button
                                        onClick={cancelCountdown}
                                        className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                                        title="Cancel Auto-Play"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        onClick={triggerNextEpisodeNow}
                                        className="flex-1 bg-accent hover:bg-accent-light text-white text-xs font-black uppercase tracking-wider py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-accent/30 hover:scale-[1.02]"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-white" />
                                        Play Now
                                    </button>
                                    <button
                                        onClick={cancelCountdown}
                                        className="bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider py-2 px-3 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Source Selector */}
                    <div className="bg-bg-card rounded-xl p-4 mb-6">
                        <h3 className="text-sm font-semibold mb-3 text-text-secondary">📡 Video Source</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {sources.map((source) => (
                                <button
                                    key={source.id}
                                    onClick={() => {
                                        setSelectedSource(source.id);
                                        savePreferredServer(source.id);
                                    }}
                                    className={`
                                        p-3 rounded-lg text-left transition-all border
                                        ${selectedSource === source.id
                                            ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                                            : 'bg-bg-primary hover:bg-bg-hover text-text-primary border-white/5'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{source.icon}</span>
                                        <span className="font-semibold text-sm">{source.name}</span>
                                    </div>
                                    <p className="text-xs opacity-75">{source.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Navigation */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <button
                            onClick={() => handleEpisodeChange(Math.max(1, currentEpisode - 1))}
                            disabled={currentEpisode === 1}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-bg-card hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border border-white/5"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </button>

                        <a
                            href={`https://anilist.co/anime/${animeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-2.5 bg-bg-card hover:bg-bg-hover rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 border border-white/5 text-text-secondary hover:text-white"
                        >
                            <ExternalLink className="w-4 h-4" />
                            AniList
                        </a>

                        <button
                            onClick={() => handleEpisodeChange(Math.min(totalEpisodes, currentEpisode + 1))}
                            disabled={currentEpisode === totalEpisodes}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ml-auto shadow-md shadow-accent/20"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Episode Grid */}
                    <div className="bg-bg-card rounded-xl p-6 mb-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Play className="w-5 h-5 text-accent" />
                            Episodes
                        </h2>
                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-2">
                            {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                                <button
                                    key={ep}
                                    onClick={() => handleEpisodeChange(ep)}
                                    className={`
                                        py-3 px-2 rounded-lg font-semibold transition-all transform hover:scale-105
                                        ${currentEpisode === ep
                                            ? 'bg-accent text-white shadow-lg shadow-accent/50'
                                            : 'bg-bg-primary hover:bg-bg-hover text-text-primary'
                                        }
                                    `}
                                >
                                    {ep}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Anime Description */}
                    <div className="bg-bg-card rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-3">Synopsis</h2>
                        <div
                            className="text-text-secondary leading-relaxed"
                            dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(anime.description || 'No description available')
                            }}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function AnimeWatchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        }>
            <AnimeWatchContent />
        </Suspense>
    );
}
