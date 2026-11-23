'use client';

import Navbar from '@/components/Navbar';
import ActorsRow from '@/components/ActorsRow';
import RecommendationsGrid from '@/components/RecommendationsGrid';
import { getEpisodesForSeason, getImageUrl, getMovieDetails, getTVDetails, Movie, Episode } from '@/lib/tmdb';
import { getEmbedUrl, videoSources } from '@/lib/videoSources';
import { 
    getPreferredServer, 
    savePreferredServer, 
    getContinueWatchingItem, 
    saveContinueWatchingItem 
} from '@/lib/watchProgress';
import { Calendar, ChevronDown, Clock, Play, Star, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

export default function WatchPage() {
    const params = useParams();
    const type = params.type as 'movie' | 'tv';
    const idParam = params.id as string;

    const [media, setMedia] = useState<Movie | null>(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSource, setSelectedSource] = useState('vidlink'); // Defaults to VidLink PRO
    const [isServerListExpanded, setIsServerListExpanded] = useState(false);
    const [startProgress, setStartProgress] = useState<number>(0);
    const lastSavedTime = useRef<number>(0);
    const { user } = useAuthStore();

    // Remember last used server from localStorage
    useEffect(() => {
        const savedServer = getPreferredServer();
        if (savedServer && videoSources.some(s => s.id === savedServer)) {
            setSelectedSource(savedServer);
        }
    }, []);

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
        const embedId = media?.imdbID || idParam;

        const loadProgress = async () => {
            // 1. Check local storage first (instant for guests and authenticated users)
            const localItem = getContinueWatchingItem(String(embedId), type);
            if (localItem && localItem.timestamp > 10) {
                setStartProgress(Math.floor(localItem.timestamp));
            }

            // 2. Also check Supabase if signed in
            if (user) {
                const { data, error } = await supabase
                    .from('watch_progress')
                    .select('timestamp')
                    .eq('user_id', user.id)
                    .eq('media_id', String(embedId))
                    .eq('media_type', type)
                    .eq('season', selectedSeason || 0)
                    .eq('episode', selectedEpisode || 0)
                    .single();
                
                if (!error && data && data.timestamp > 0) {
                    setStartProgress(Math.floor(data.timestamp));
                }
            }

            // 3. Immediately register in Continue Watching list
            saveContinueWatchingItem({
                id: `${type}:${embedId}${type === 'tv' ? `:s${selectedSeason}:e${selectedEpisode}` : ''}`,
                media_id: String(embedId),
                media_type: type,
                title: media.title || media.name || 'Untitled',
                poster_path: media.poster_path,
                backdrop_path: media.backdrop_path,
                season: selectedSeason || 1,
                episode: selectedEpisode || 1,
                progress: localItem?.progress || 0,
                timestamp: localItem?.timestamp || 0,
                duration: localItem?.duration || 0,
                updated_at: new Date().toISOString()
            });
        };
        
        loadProgress();
    }, [user, media, idParam, type, selectedSeason, selectedEpisode]);

    useEffect(() => {
        if (!media) return;
        const embedId = media?.imdbID || idParam;

        const handleMessage = async (event: MessageEvent) => {
            try {
                let data = event.data;
                if (typeof data === 'string') data = JSON.parse(data);

                if (data && data.type === 'PLAYER_EVENT' && data.data?.event === 'timeupdate') {
                    const currentTime = data.data.position || data.data.currentTime;
                    const duration = data.data.duration;
                    
                    if (currentTime && duration && Math.abs(currentTime - lastSavedTime.current) > 5) {
                        lastSavedTime.current = currentTime;
                        const progressPercent = Math.min((currentTime / duration) * 100, 100);
                        
                        // 1. Save locally (persists for everyone!)
                        saveContinueWatchingItem({
                            id: `${type}:${embedId}${type === 'tv' ? `:s${selectedSeason}:e${selectedEpisode}` : ''}`,
                            media_id: String(embedId),
                            media_type: type,
                            title: media.title || media.name || 'Untitled',
                            poster_path: media.poster_path,
                            backdrop_path: media.backdrop_path,
                            season: selectedSeason || 1,
                            episode: selectedEpisode || 1,
                            progress: progressPercent,
                            timestamp: currentTime,
                            duration: duration,
                            updated_at: new Date().toISOString()
                        });

                        // 2. Also save to Supabase if user is logged in
                        if (user) {
                            const payload = {
                                user_id: user.id,
                                media_id: String(embedId),
                                media_type: type,
                                season: selectedSeason || 0,
                                episode: selectedEpisode || 0,
                                progress: progressPercent,
                                timestamp: currentTime,
                                duration: duration,
                                updated_at: new Date().toISOString()
                            };

                            const { data: existing } = await supabase
                                .from('watch_progress')
                                .select('id')
                                .eq('user_id', user.id)
                                .eq('media_id', String(embedId))
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
    }, [user, media, idParam, type, selectedSeason, selectedEpisode]);

    const tmdbId = media ? String(media.id) : idParam;
    const imdbId = media?.imdbID || undefined;
    const roomMediaId = tmdbId;
    let baseEmbedUrl = type === 'movie'
        ? getEmbedUrl(selectedSource, 'movie', tmdbId, imdbId)
        : getEmbedUrl(selectedSource, 'tv', tmdbId, imdbId, selectedSeason, selectedEpisode);

    if (startProgress > 10) {
        baseEmbedUrl += `${baseEmbedUrl.includes('?') ? '&' : '?'}t=${startProgress}&progress=${startProgress}`;
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
                        className="absolute inset-0 bg-cover bg-center scale-110 opacity-[0.24] filter blur-[100px] saturate-[1.4]"
                        style={{ backgroundImage: `url(${getImageUrl(media.backdrop_path, 'original')})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/75 to-[#0b0b0b]" />
                </div>
            )}

            {/* Main Cinema Player Container */}
            <div className="pt-20 sm:pt-24 px-3 sm:px-6 lg:px-10 max-w-[1700px] mx-auto relative z-10">
                
                {/* 1. Large Cinema Video Player */}
                <div className="w-full aspect-video bg-black/90 backdrop-blur-md relative border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden z-10">
                    <iframe
                        key={`${selectedSource}-${tmdbId}-${selectedSeason}-${selectedEpisode}`}
                        src={embedUrl}
                        className="w-full h-full border-0"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                </div>

                {/* 2. Media Title, Quick Details, Actions & Expandable Server Selector */}
                <div className="mt-4 sm:mt-6 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl">
                    
                    {/* Top Row: Title, Metadata & Watch Together CTA */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-white/10">
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

                        {/* Watch Together Party CTA */}
                        <div className="flex items-center gap-3 shrink-0">
                            <Link
                                href={`/room/create?type=${type}&id=${roomMediaId}${type === 'tv' ? `&s=${selectedSeason}&e=${selectedEpisode}` : ''}`}
                                className="w-full sm:w-auto bg-accent hover:bg-accent-light text-white flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-[0.16em] transition-all shadow-lg shadow-accent/25 border border-accent/30 hover:scale-[1.02]"
                            >
                                <Users className="w-4 h-4" />
                                <span>Watch Together</span>
                            </Link>
                        </div>
                    </div>

                    {/* Server Strip / Selector: "Choose Server" (Expandable & Collapsible) */}
                    <div className="pt-4 sm:pt-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                    Choose Server
                                </h3>
                                {videoSources.find(s => s.id === selectedSource) && (
                                    <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-0.5 rounded-full border border-accent/25">
                                        Current: {videoSources.find(s => s.id === selectedSource)?.name}
                                    </span>
                                )}
                            </div>

                            {/* Expand / Collapse Button */}
                            <button
                                onClick={() => setIsServerListExpanded(!isServerListExpanded)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70 hover:text-white transition-all border border-white/10"
                            >
                                <span>{isServerListExpanded ? 'Collapse' : 'All Servers (10)'}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isServerListExpanded ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Collapsed view: Horizontal scrolling server bar (MultiMovies style) */}
                        {!isServerListExpanded ? (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
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
                                <p className="text-xs font-medium text-white/50 mt-1">
                                    Season {selectedSeason} • {episodes.length} Episodes available
                                </p>
                            </div>

                            {/* Season Selector Tabs */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {media.seasons.map((season) => {
                                    const isSeasonSelected = selectedSeason === season.season_number;
                                    return (
                                        <button
                                            key={season.id}
                                            onClick={() => {
                                                setSelectedSeason(season.season_number);
                                                setSelectedEpisode(1);
                                            }}
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
                                Loading episodes for Season {selectedSeason}...
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4">
                                {episodes.map((ep) => {
                                    const isSelected = selectedEpisode === ep.episode_number;
                                    return (
                                        <div
                                            key={ep.id}
                                            onClick={() => setSelectedEpisode(ep.episode_number)}
                                            className={`group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 border p-2 sm:p-3 flex flex-row md:flex-col items-center md:items-stretch gap-3 ${
                                                isSelected
                                                    ? 'bg-accent/15 border-accent shadow-xl shadow-accent/20 ring-1 ring-accent scale-[1.01]'
                                                    : 'bg-white/[0.02] hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            {/* Thumbnail on left for mobile, top for desktop */}
                                            <div className="w-28 sm:w-36 md:w-full aspect-video relative shrink-0 rounded-xl overflow-hidden bg-black/80">
                                                {ep.still_path ? (
                                                    <Image
                                                        src={getImageUrl(ep.still_path, 'w500')}
                                                        alt={ep.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
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
