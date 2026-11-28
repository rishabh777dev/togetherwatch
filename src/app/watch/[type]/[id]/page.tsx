'use client';

import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import ActorsRow from '@/components/ActorsRow';
import RecommendationsGrid from '@/components/RecommendationsGrid';
import { getEpisodesForSeason, getImageUrl, getMovieDetails, getTVDetails, Movie, Episode } from '@/lib/tmdb';
import { getEmbedUrl, videoSources } from '@/lib/videoSources';
import { 
    getPreferredServer, 
    savePreferredServer, 
    getContinueWatchingItem, 
    saveContinueWatchingItem,
    getAutoPlayNext,
    saveAutoPlayNext
} from '@/lib/watchProgress';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, Play, SkipForward, Sparkles, Star, Users, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

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

    // Detect completion events across multiple providers
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

    // Extract time data (supports VidLink, VidRift, and generic players)
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

function WatchPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const type = params.type as 'movie' | 'tv';
    const idParam = params.id as string;

    const urlSeason = searchParams.get('s');
    const urlEpisode = searchParams.get('e');

    const [media, setMedia] = useState<Movie | null>(null);

    // 1. Synchronously initialize season & episode from query params OR localStorage saved progress
    const [selectedSeason, setSelectedSeason] = useState<number>(() => {
        if (urlSeason && !isNaN(Number(urlSeason))) return Number(urlSeason);
        if (typeof window !== 'undefined') {
            const saved = getContinueWatchingItem(idParam, type);
            if (saved?.season) return saved.season;
        }
        return 1;
    });

    const [selectedEpisode, setSelectedEpisode] = useState<number>(() => {
        if (urlEpisode && !isNaN(Number(urlEpisode))) return Number(urlEpisode);
        if (typeof window !== 'undefined') {
            const saved = getContinueWatchingItem(idParam, type);
            if (saved?.episode) return saved.episode;
        }
        return 1;
    });

    // 2. Synchronously initialize startProgress timestamp if resuming the saved episode/movie
    const [startProgress, setStartProgress] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = getContinueWatchingItem(idParam, type);
            const targetSeason = urlSeason ? Number(urlSeason) : saved?.season || 1;
            const targetEpisode = urlEpisode ? Number(urlEpisode) : saved?.episode || 1;
            if (saved && (type === 'movie' || (saved.season === targetSeason && saved.episode === targetEpisode))) {
                if (saved.timestamp && saved.timestamp > 5) {
                    return Math.floor(saved.timestamp);
                }
            }
        }
        return 0;
    });

    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSource, setSelectedSource] = useState('vidlink'); // Defaults to VidLink PRO
    const [isServerListExpanded, setIsServerListExpanded] = useState(false);
    const lastSavedTime = useRef<number>(0);
    const { user } = useAuthStore();

    // Auto-Play Next Episode State & Refs
    const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
        return getAutoPlayNext();
    });
    const autoPlayNextRef = useRef<boolean>(autoPlayNext);
    useEffect(() => {
        autoPlayNextRef.current = autoPlayNext;
    }, [autoPlayNext]);

    const [countdownActive, setCountdownActive] = useState<boolean>(false);
    const [countdownSeconds, setCountdownSeconds] = useState<number>(5);
    const lastHandledEpisodeKey = useRef<string>('');

    // Sync state when URL searchParams change
    useEffect(() => {
        if (urlSeason && !isNaN(Number(urlSeason))) {
            const s = Number(urlSeason);
            setSelectedSeason(prev => (prev !== s ? s : prev));
        }
        if (urlEpisode && !isNaN(Number(urlEpisode))) {
            const e = Number(urlEpisode);
            setSelectedEpisode(prev => (prev !== e ? e : prev));
        }
    }, [urlSeason, urlEpisode]);

    // Keep URL in sync on initial mount for series so refresh never loses season/episode
    useEffect(() => {
        if (type === 'tv' && typeof window !== 'undefined') {
            const currentS = searchParams.get('s');
            const currentE = searchParams.get('e');
            if (!currentS || !currentE) {
                const newUrl = `/watch/${type}/${idParam}?s=${selectedSeason}&e=${selectedEpisode}`;
                window.history.replaceState(null, '', newUrl);
            }
        }
    }, [type, idParam, selectedSeason, selectedEpisode, searchParams]);

    // Remember last used server from localStorage
    useEffect(() => {
        const savedServer = getPreferredServer();
        if (savedServer && videoSources.some(s => s.id === savedServer)) {
            setSelectedSource(savedServer);
        }
    }, []);

    // Helper to calculate Next and Previous episode
    const getNextEpisode = useCallback(() => {
        if (type !== 'tv' || !media) return null;
        
        // 1. Check if next episode exists in current episodes list
        const nextEpInList = episodes.find(e => e.episode_number === selectedEpisode + 1);
        if (nextEpInList) {
            return {
                season: selectedSeason,
                episode: nextEpInList.episode_number,
                name: nextEpInList.name || `Episode ${nextEpInList.episode_number}`,
                isNewSeason: false
            };
        }

        // 2. Fallback: Check current season's episode count from TMDB metadata
        const currentSeasonObj = media.seasons?.find(s => s.season_number === selectedSeason);
        const totalEpsInSeason = currentSeasonObj?.episode_count || (episodes.length > 0 ? Math.max(...episodes.map(e => e.episode_number), episodes.length) : 0);

        if (totalEpsInSeason > 0 && selectedEpisode < totalEpsInSeason) {
            return {
                season: selectedSeason,
                episode: selectedEpisode + 1,
                name: `Episode ${selectedEpisode + 1}`,
                isNewSeason: false
            };
        }

        // 3. Season rollover: Check if next season exists
        if (media.seasons && media.seasons.length > 0) {
            const nextSeasonObj = media.seasons.find(s => s.season_number === selectedSeason + 1);
            if (nextSeasonObj && nextSeasonObj.season_number > 0) {
                return {
                    season: nextSeasonObj.season_number,
                    episode: 1,
                    name: `Season ${nextSeasonObj.season_number} Premiere`,
                    isNewSeason: true
                };
            }
        }
        
        return null;
    }, [type, media, episodes, selectedSeason, selectedEpisode]);

    const getPrevEpisode = useCallback(() => {
        if (type !== 'tv' || !media) return null;
        if (selectedEpisode > 1) {
            return {
                season: selectedSeason,
                episode: selectedEpisode - 1
            };
        }
        if (selectedSeason > 1 && media.seasons) {
            const prevSeasonObj = media.seasons.find(s => s.season_number === selectedSeason - 1);
            if (prevSeasonObj && prevSeasonObj.season_number > 0) {
                return {
                    season: prevSeasonObj.season_number,
                    episode: prevSeasonObj.episode_count || 1
                };
            }
        }
        return null;
    }, [type, media, selectedSeason, selectedEpisode]);

    const cancelCountdown = useCallback(() => {
        setCountdownActive(false);
    }, []);

    // Switch episode & update URL smoothly
    const playEpisode = useCallback((seasonNumber: number, episodeNumber: number) => {
        cancelCountdown();
        lastSavedTime.current = 0;

        if (seasonNumber !== selectedSeason) {
            setSelectedSeason(seasonNumber);
            setSelectedEpisode(episodeNumber);
            setStartProgress(0);
            const newUrl = `/watch/${type}/${idParam}?s=${seasonNumber}&e=${episodeNumber}`;
            window.history.replaceState(null, '', newUrl);
        } else {
            setSelectedEpisode(episodeNumber);
            const canonicalId = String(media?.id || idParam);
            const saved = getContinueWatchingItem(canonicalId, type, media?.imdbID);
            if (saved && saved.season === selectedSeason && saved.episode === episodeNumber && saved.timestamp > 5) {
                setStartProgress(Math.floor(saved.timestamp));
            } else {
                setStartProgress(0);
            }
            const newUrl = `/watch/${type}/${idParam}?s=${selectedSeason}&e=${episodeNumber}`;
            window.history.replaceState(null, '', newUrl);
        }
    }, [cancelCountdown, selectedSeason, type, idParam, media]);

    const startAutoPlayCountdown = useCallback(() => {
        if (!autoPlayNextRef.current || type !== 'tv') return;
        const currentEpKey = `${selectedSeason}:${selectedEpisode}`;
        if (lastHandledEpisodeKey.current === currentEpKey) return; // Prevent duplicate trigger

        const nextEp = getNextEpisode();
        if (!nextEp) return;
        if (countdownActive) return;

        lastHandledEpisodeKey.current = currentEpKey;
        setCountdownSeconds(5);
        setCountdownActive(true);
    }, [type, selectedSeason, selectedEpisode, getNextEpisode, countdownActive]);

    const triggerNextEpisodeNow = useCallback(() => {
        const nextEp = getNextEpisode();
        cancelCountdown();
        if (nextEp) {
            playEpisode(nextEp.season, nextEp.episode);
        }
    }, [getNextEpisode, cancelCountdown, playEpisode]);

    // Clean React countdown timer
    useEffect(() => {
        if (!countdownActive) return;

        if (countdownSeconds <= 0) {
            setCountdownActive(false);
            const nextEp = getNextEpisode();
            if (nextEp) {
                playEpisode(nextEp.season, nextEp.episode);
            }
            return;
        }

        const timer = setTimeout(() => {
            setCountdownSeconds(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdownActive, countdownSeconds, getNextEpisode, playEpisode]);

    // Handlers for switching season & episode
    const handleSelectSeason = (seasonNumber: number) => {
        cancelCountdown();
        setSelectedSeason(seasonNumber);
        setSelectedEpisode(1);
        setStartProgress(0);
        lastSavedTime.current = 0;
        const newUrl = `/watch/${type}/${idParam}?s=${seasonNumber}&e=1`;
        window.history.replaceState(null, '', newUrl);
    };

    const handleSelectEpisode = (episodeNumber: number) => {
        cancelCountdown();
        setSelectedEpisode(episodeNumber);
        lastSavedTime.current = 0;

        // Check if there is existing progress for this exact episode
        const canonicalId = String(media?.id || idParam);
        const saved = getContinueWatchingItem(canonicalId, type, media?.imdbID);
        if (saved && saved.season === selectedSeason && saved.episode === episodeNumber && saved.timestamp > 5) {
            setStartProgress(Math.floor(saved.timestamp));
        } else {
            setStartProgress(0);
        }

        const newUrl = `/watch/${type}/${idParam}?s=${selectedSeason}&e=${episodeNumber}`;
        window.history.replaceState(null, '', newUrl);
    };

    useEffect(() => {
        if (!idParam) return;

        const isImdb = idParam.startsWith('tt');
        const resolvedId = isImdb ? idParam : Number(idParam);

        const fetchData = async () => {
            try {
                const data = type === 'movie'
                    ? await getMovieDetails(resolvedId)
                    : await getTVDetails(resolvedId);
                setMedia(data);

                // Auto-switch to dedicated anime server if media is animation/anime
                if (data?.genres?.some(g => g.name.toLowerCase().includes('animation') || g.name.toLowerCase().includes('anime'))) {
                    setSelectedSource('vidrift');
                }

                if (type === 'tv' && data?.seasons && data.seasons.length > 0) {
                    const tvIdForEpisodes = typeof resolvedId === 'number' ? resolvedId : data.id;
                    const eps = await getEpisodesForSeason(tvIdForEpisodes, selectedSeason);
                    setEpisodes(eps);
                }
            } catch (error) {
                console.error('Error fetching media:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [idParam, type, selectedSeason]);

    useEffect(() => {
        if (!media) return;
        const canonicalId = String(media.id || idParam);
        const imdbId = media.imdbID;

        const loadProgress = async () => {
            // 1. Check local storage
            const localItem = getContinueWatchingItem(canonicalId, type, imdbId) || getContinueWatchingItem(idParam, type);
            const isTargetEpisode = type === 'movie' || (localItem && localItem.season === selectedSeason && localItem.episode === selectedEpisode);

            if (isTargetEpisode && localItem && localItem.timestamp > 5) {
                setStartProgress(Math.floor(localItem.timestamp));
            }

            // 2. Also check Supabase if signed in
            if (user) {
                const { data, error } = await supabase
                    .from('watch_progress')
                    .select('timestamp, progress, season, episode')
                    .eq('user_id', user.id)
                    .eq('media_id', canonicalId)
                    .eq('media_type', type)
                    .eq('season', selectedSeason || 0)
                    .eq('episode', selectedEpisode || 0)
                    .single();
                
                if (!error && data && data.timestamp > 5) {
                    setStartProgress(Math.floor(data.timestamp));
                }
            }

            // 3. Register in Continue Watching with preserved progress if on same episode
            saveContinueWatchingItem({
                id: `${type}:${canonicalId}${type === 'tv' ? `:s${selectedSeason}:e${selectedEpisode}` : ''}`,
                media_id: canonicalId,
                media_type: type,
                title: media.title || media.name || 'Untitled',
                poster_path: media.poster_path,
                backdrop_path: media.backdrop_path,
                season: selectedSeason || 1,
                episode: selectedEpisode || 1,
                progress: isTargetEpisode ? (localItem?.progress || 0) : 0,
                timestamp: isTargetEpisode ? (localItem?.timestamp || 0) : 0,
                duration: isTargetEpisode ? (localItem?.duration || 0) : 0,
                updated_at: new Date().toISOString()
            }, imdbId);
        };
        
        loadProgress();
    }, [user, media, idParam, type, selectedSeason, selectedEpisode]);

    useEffect(() => {
        if (!media) return;
        const canonicalId = String(media.id || idParam);
        const imdbId = media.imdbID;

        const handleMessage = async (event: MessageEvent) => {
            try {
                const parsed = parsePlaybackEvent(event.data);
                if (!parsed) return;

                // 1. Completion event detection (VidLink, VidRift, HTML5)
                if (parsed.isEnded) {
                    if (type === 'tv' && autoPlayNextRef.current) {
                        startAutoPlayCountdown();
                    }
                }

                // 2. TimeUpdate / Progress tracking
                if (parsed.currentTime !== null) {
                    const currentTime = parsed.currentTime;
                    const duration = parsed.duration ?? 0;
                    const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

                    // Fallback completion trigger when video reaches end (within 4s or >= 98% on videos > 60s)
                    if (type === 'tv' && autoPlayNextRef.current && duration > 60 && (currentTime >= duration - 4 || progressPercent >= 98)) {
                        startAutoPlayCountdown();
                    }

                    if (Math.abs(currentTime - lastSavedTime.current) > 3) {
                        lastSavedTime.current = currentTime;

                        // Save locally
                        saveContinueWatchingItem({
                            id: `${type}:${canonicalId}${type === 'tv' ? `:s${selectedSeason}:e${selectedEpisode}` : ''}`,
                            media_id: canonicalId,
                            media_type: type,
                            title: media.title || media.name || 'Untitled',
                            poster_path: media.poster_path,
                            backdrop_path: media.backdrop_path,
                            season: selectedSeason || 1,
                            episode: selectedEpisode || 1,
                            progress: progressPercent,
                            timestamp: Math.floor(currentTime),
                            duration: Math.floor(duration),
                            updated_at: new Date().toISOString()
                        }, imdbId);

                        // Also save to Supabase if user is logged in
                        if (user) {
                            const payload = {
                                user_id: user.id,
                                media_id: canonicalId,
                                media_type: type,
                                season: selectedSeason || 0,
                                episode: selectedEpisode || 0,
                                progress: progressPercent,
                                timestamp: Math.floor(currentTime),
                                duration: Math.floor(duration),
                                updated_at: new Date().toISOString()
                            };

                            const { data: existing } = await supabase
                                .from('watch_progress')
                                .select('id')
                                .eq('user_id', user.id)
                                .eq('media_id', canonicalId)
                                .eq('media_type', type)
                                .eq('season', selectedSeason || 0)
                                .eq('episode', selectedEpisode || 0)
                                .single();

                            if (existing) {
                                await supabase.from('watch_progress').update(payload).eq('id', existing.id);
                            } else {
                                await supabase.from('watch_progress').insert(payload);
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing errors
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user, media, idParam, type, selectedSeason, selectedEpisode, startAutoPlayCountdown]);

    const tmdbId = media ? String(media.id) : idParam;
    const imdbId = media?.imdbID || undefined;
    const roomMediaId = tmdbId;

    // Build embed URL, passing autoPlayNext so player automatically plays on episode advance
    let baseEmbedUrl = type === 'movie'
        ? getEmbedUrl(selectedSource, 'movie', tmdbId, imdbId, undefined, undefined, false)
        : getEmbedUrl(selectedSource, 'tv', tmdbId, imdbId, selectedSeason, selectedEpisode, autoPlayNext);

    if (startProgress > 5) {
        const sep = baseEmbedUrl.includes('?') ? '&' : '?';
        baseEmbedUrl += `${sep}startAt=${startProgress}&t=${startProgress}&progress=${startProgress}`;
    }
    const embedUrl = baseEmbedUrl;

    if (isLoading) {
        return (
            <main className="min-h-screen bg-[#0b0b0b]">
                <Navbar />
                <div className="pt-20 flex items-center justify-center h-[80vh]">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            </main>
        );
    }

    if (!media) {
        return (
            <main className="min-h-screen bg-[#0b0b0b]">
                <Navbar />
                <div className="pt-20 flex items-center justify-center h-[80vh] text-white/50 text-xl font-medium">
                    Content not found
                </div>
            </main>
        );
    }

    const title = media.title || media.name;
    const releaseYear = media.release_date
        ? new Date(media.release_date).getFullYear()
        : media.first_air_date
            ? new Date(media.first_air_date).getFullYear()
            : '';

    return (
        <main className="min-h-screen bg-[#0b0b0b] text-text-primary selection:bg-accent/30 selection:text-white relative overflow-x-hidden">
            <Navbar />

            {/* Dynamic Blurred Artwork Background */}
            {media.backdrop_path && (
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none transition-all duration-1000">
                    <div 
                        className="absolute inset-0 bg-cover bg-center scale-110 filter blur-[90px] opacity-25 brightness-50"
                        style={{ backgroundImage: `url(${getImageUrl(media.backdrop_path, 'original')})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b0b]/80 via-[#0b0b0b]/95 to-[#0b0b0b]" />
                </div>
            )}

            {/* Main Stage: Theater Mode Cinema Player & Integrated Meta Bar */}
            <div className="relative z-10 pt-16 sm:pt-20 px-2 sm:px-4 md:px-6 lg:px-8 max-w-[1700px] mx-auto">
                
                {/* 1. Large Cinema Video Player */}
                <div className="w-full aspect-video bg-black/90 backdrop-blur-md relative border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden z-10 group">
                    <iframe
                        key={`${selectedSource}-${tmdbId}-${selectedSeason}-${selectedEpisode}-${startProgress > 5 ? startProgress : 0}`}
                        src={embedUrl}
                        className="w-full h-full border-0"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />

                    {/* Netflix-style Floating Next Episode Countdown Overlay */}
                    {type === 'tv' && countdownActive && getNextEpisode() && (
                        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 max-w-sm w-[calc(100%-2rem)] sm:w-auto bg-black/95 backdrop-blur-2xl border border-white/20 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] animate-fade-in pointer-events-auto">
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
                                            {getNextEpisode()?.isNewSeason 
                                                ? `Season ${getNextEpisode()?.season} • Episode 1`
                                                : `S${getNextEpisode()?.season} E${getNextEpisode()?.episode} • ${getNextEpisode()?.name}`}
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

                {/* 2. Media Title, Quick Details, Actions & Expandable Server Selector */}
                <div className="mt-4 sm:mt-6 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl">
                    
                    {/* Top Row: Title, Metadata, Episode Navigation & CTAs */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-white/10">
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-white tracking-tight drop-shadow-md truncate">
                                {title} {type === 'tv' && `• S${selectedSeason} E${selectedEpisode}`}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-bold text-white/50 mt-1.5 uppercase tracking-wider">
                                {media.vote_average > 0 && (
                                    <span className="flex items-center gap-1.5 text-yellow-500">
                                        <Star className="w-4 h-4 fill-yellow-500" />
                                        {media.vote_average.toFixed(1)} Rating
                                    </span>
                                )}
                                {releaseYear && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                        <span>{releaseYear}</span>
                                    </>
                                )}
                                {media.runtime && media.runtime > 0 && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                        <span>
                                            {media.runtime >= 60 ? `${Math.floor(media.runtime / 60)}h ${media.runtime % 60}m` : `${media.runtime}m`}
                                        </span>
                                    </>
                                )}
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="text-white/70 px-2 py-0.5 rounded bg-white/10 text-[10px] tracking-widest font-black">
                                    {type === 'tv' ? 'TV SERIES' : 'MOVIE'}
                                </span>
                            </div>
                        </div>

                        {/* Actions Row: Prev/Next Episode + Auto-Play Toggle + Watch Together */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                            {type === 'tv' && (
                                <>
                                    {/* Previous Episode */}
                                    <button
                                        onClick={() => {
                                            const prev = getPrevEpisode();
                                            if (prev) playEpisode(prev.season, prev.episode);
                                        }}
                                        disabled={!getPrevEpisode()}
                                        className="flex items-center gap-1 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                                        title="Previous Episode"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="hidden sm:inline">Prev</span>
                                    </button>

                                    {/* Next Episode */}
                                    <button
                                        onClick={() => {
                                            const next = getNextEpisode();
                                            if (next) playEpisode(next.season, next.episode);
                                        }}
                                        disabled={!getNextEpisode()}
                                        className="flex items-center gap-1 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                                        title="Next Episode"
                                    >
                                        <span className="hidden sm:inline">Next</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>

                                    {/* Auto-Play Next Toggle Switch */}
                                    <button
                                        onClick={() => {
                                            const nextVal = !autoPlayNext;
                                            setAutoPlayNext(nextVal);
                                            saveAutoPlayNext(nextVal);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border shadow-sm ${
                                            autoPlayNext
                                                ? 'bg-accent/15 border-accent text-accent shadow-accent/10'
                                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                                        }`}
                                        title="Toggle Auto-Play Next Episode on finish"
                                    >
                                        <div className={`w-2 h-2 rounded-full ${autoPlayNext ? 'bg-accent animate-pulse' : 'bg-white/30'}`} />
                                        <span className="hidden sm:inline">Auto-Play</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${autoPlayNext ? 'bg-accent text-white' : 'bg-white/10 text-white/40'}`}>
                                            {autoPlayNext ? 'ON' : 'OFF'}
                                        </span>
                                    </button>
                                </>
                            )}

                            {/* Watch Together Party CTA */}
                            <Link
                                href={`/room/create?type=${type}&id=${roomMediaId}${type === 'tv' ? `&s=${selectedSeason}&e=${selectedEpisode}` : ''}`}
                                className="w-full sm:w-auto bg-accent hover:bg-accent-light text-white flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.16em] transition-all shadow-lg shadow-accent/25 border border-accent/30 hover:scale-[1.02]"
                            >
                                <Users className="w-4 h-4" />
                                <span>Watch Together</span>
                            </Link>
                        </div>
                    </div>

                    {/* Server Strip / Selector: "Choose Server" (Expandable & Collapsible) */}
                    <div className="pt-4 sm:pt-5">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-white/80">Streaming Servers</span>
                                <span className="text-[11px] font-bold text-accent px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
                                    {videoSources.find(s => s.id === selectedSource)?.name || selectedSource}
                                </span>
                            </div>

                            {/* Toggle Expand / Collapse all servers */}
                            <button
                                onClick={() => setIsServerListExpanded(prev => !prev)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                            >
                                <span>{isServerListExpanded ? 'Compact View' : 'Show All Servers'}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isServerListExpanded ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Collapsed view: Horizontal scrollable server pills */}
                        {!isServerListExpanded ? (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                                {videoSources.map(source => {
                                    const isSelected = selectedSource === source.id;
                                    return (
                                        <button
                                            key={source.id}
                                            onClick={() => {
                                                setSelectedSource(source.id);
                                                savePreferredServer(source.id);
                                            }}
                                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border shrink-0
                                                ${isSelected 
                                                    ? 'bg-accent text-white border-accent shadow-lg shadow-accent/30 scale-[1.02]' 
                                                    : 'bg-black/40 text-white/70 hover:bg-white/10 hover:text-white border-white/10'}`}
                                        >
                                            <span className="text-sm shrink-0">{source.icon}</span>
                                            <span>{source.name}</span>
                                            {source.isAnime && (
                                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${isSelected ? 'bg-black/20 text-white' : 'bg-pink-500/20 text-pink-300'}`}>
                                                    ANIME
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Expanded view: Clean grid of all servers */
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-1 animate-fade-in">
                                {videoSources.map(source => {
                                    const isSelected = selectedSource === source.id;
                                    return (
                                        <button
                                            key={source.id}
                                            onClick={() => {
                                                setSelectedSource(source.id);
                                                savePreferredServer(source.id);
                                            }}
                                            className={`flex items-center justify-between p-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border text-left
                                                ${isSelected 
                                                    ? 'bg-accent text-white border-accent shadow-lg shadow-accent/30 scale-[1.02]' 
                                                    : 'bg-black/40 text-white/70 hover:bg-white/10 hover:text-white border-white/10'}`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-base shrink-0">{source.icon}</span>
                                                <span className="truncate">{source.name}</span>
                                            </div>
                                            {source.isAnime && (
                                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${isSelected ? 'bg-black/20 text-white' : 'bg-pink-500/20 text-pink-300'}`}>
                                                    ANIME
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Genres & Synopsis info row */}
                        <div className="mt-5 pt-4 border-t border-white/10 grid md:grid-cols-3 gap-4">
                            {/* Genres */}
                            {media.genres && media.genres.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40 mb-2">Genres</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {media.genres.map((genre) => (
                                            <span
                                                key={genre.id}
                                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase text-white/70 bg-white/5 border border-white/10"
                                            >
                                                {genre.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Synopsis */}
                            <div className={media.genres && media.genres.length > 0 ? "md:col-span-2" : "md:col-span-3"}>
                                <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40 mb-1.5">Synopsis</h4>
                                <p className="text-white/60 text-xs sm:text-sm leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                                    {media.overview || 'No synopsis available.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Content Area: TV Show Seasons & Episode List directly ABOVE Actors section */}
            <div className="px-3 sm:px-6 lg:px-10 max-w-[1700px] mx-auto py-8 sm:py-10 mt-6 border-t border-white/10 relative z-10 bg-[#0b0b0b]/40 backdrop-blur-md rounded-t-3xl">
                
                {/* TV Show Seasons & Episode Selector Section */}
                {type === 'tv' && media.seasons && media.seasons.length > 0 && (
                    <div className="mb-12 p-4 sm:p-8 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-black uppercase text-white tracking-tight flex items-center gap-2">
                                    <span className="w-1.5 h-5 sm:h-6 bg-accent rounded-full"></span>
                                    Seasons & Episodes
                                </h2>
                                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                    <p className="text-xs font-medium text-white/50">
                                        Season {selectedSeason} • {episodes.length} Episodes available
                                    </p>
                                    <button
                                        onClick={() => {
                                            const nextVal = !autoPlayNext;
                                            setAutoPlayNext(nextVal);
                                            saveAutoPlayNext(nextVal);
                                        }}
                                        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${
                                            autoPlayNext 
                                                ? 'bg-accent/20 border-accent/40 text-accent' 
                                                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                                        }`}
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Auto-Play Next:</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${autoPlayNext ? 'bg-accent text-white' : 'bg-white/10 text-white/40'}`}>
                                            {autoPlayNext ? 'ON' : 'OFF'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Season Selector Tabs */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {media.seasons.map((season) => {
                                    const isSeasonSelected = selectedSeason === season.season_number;
                                    return (
                                        <button
                                            key={season.id}
                                            onClick={() => handleSelectSeason(season.season_number)}
                                            className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                                                isSeasonSelected
                                                    ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25 scale-[1.02]'
                                                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            {season.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Episode List (Compact Horizontal List on Mobile, Grid on Desktop) */}
                        {episodes.length === 0 ? (
                            <div className="py-12 text-center text-white/40 font-bold uppercase tracking-widest text-xs animate-pulse">
                                Loading episodes...
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
                                {episodes.map((ep) => {
                                    const isSelected = selectedEpisode === ep.episode_number;
                                    return (
                                        <div
                                            key={ep.id}
                                            onClick={() => handleSelectEpisode(ep.episode_number)}
                                            className={`group relative flex md:flex-col gap-3 p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all border duration-300 ${
                                                isSelected
                                                    ? 'bg-accent/15 border-accent shadow-xl shadow-accent/20 scale-[1.01]'
                                                    : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.06]'
                                            }`}
                                        >
                                            {/* Episode Thumbnail */}
                                            <div className="relative w-28 sm:w-32 md:w-full aspect-video rounded-xl overflow-hidden bg-black/50 shrink-0">
                                                {ep.still_path ? (
                                                    <Image
                                                        src={getImageUrl(ep.still_path, 'w500')}
                                                        alt={ep.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                        sizes="(max-width: 768px) 140px, 280px"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/30 font-bold text-[10px]">
                                                        No Image
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                                
                                                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-black/75 backdrop-blur-md text-white border border-white/10">
                                                    EP {ep.episode_number}
                                                </div>

                                                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg transition-transform ${isSelected ? 'bg-accent text-white scale-110' : 'bg-accent/90 text-white group-hover:scale-105'}`}>
                                                        <Play className="w-4 h-4 md:w-5 md:h-5 fill-white ml-0.5" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Episode Info on right for mobile, bottom for desktop */}
                                            <div className="flex-1 min-w-0 md:p-1">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className={`text-[10px] font-bold tracking-wider uppercase ${isSelected ? 'text-accent' : 'text-white/40'}`}>
                                                        Episode {ep.episode_number}
                                                    </span>
                                                    {ep.air_date && (
                                                        <span className="text-[10px] font-medium text-white/40">
                                                            {new Date(ep.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className={`text-xs font-bold uppercase truncate tracking-wide ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                                    {ep.name}
                                                </h4>
                                                {ep.overview && (
                                                    <p className="text-[11px] text-white/50 line-clamp-2 mt-1 leading-relaxed">
                                                        {ep.overview}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Actors Section */}
                <ActorsRow cast={media.credits?.cast} />
                
                {/* Recommendations */}
                <div className="mt-10">
                    <RecommendationsGrid recommendations={media.recommendations?.results} currentType={type} />
                </div>
            </div>
        </main>
    );
}

export default function WatchPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-[#0b0b0b]">
                <Navbar />
                <div className="pt-20 flex items-center justify-center h-[80vh]">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            </main>
        }>
            <WatchPageContent />
        </Suspense>
    );
}
