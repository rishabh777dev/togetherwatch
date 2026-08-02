'use client';

import Navbar from '@/components/Navbar';
import ActorsRow from '@/components/ActorsRow';
import RecommendationsGrid from '@/components/RecommendationsGrid';
import { getEpisodesForSeason, getImageUrl, getMovieDetails, getTVDetails, Movie, Episode } from '@/lib/tmdb';
import { getEmbedUrl, videoSources } from '@/lib/videoSources';
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
    const [selectedSource, setSelectedSource] = useState('videasy'); // Defaults to Videasy (Cineby)
    const [isServerListExpanded, setIsServerListExpanded] = useState(false);
    const [startProgress, setStartProgress] = useState<number>(0);
    const lastSavedTime = useRef<number>(0);
    const { user } = useAuthStore();

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
        if (!user || !media) return;
        const embedId = media?.imdbID || idParam;

        const loadProgress = async () => {
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
        };
        
        loadProgress();
    }, [user, media, idParam, type, selectedSeason, selectedEpisode]);

    useEffect(() => {
        if (!user || !media) return;
        const embedId = media?.imdbID || idParam;

        const handleMessage = async (event: MessageEvent) => {
            try {
                let data = event.data;
                if (typeof data === 'string') data = JSON.parse(data);

                if (data && data.type === 'PLAYER_EVENT' && data.data?.event === 'timeupdate') {
                    const currentTime = data.data.position || data.data.currentTime;
                    const duration = data.data.duration;
                    
                    if (currentTime && duration && Math.abs(currentTime - lastSavedTime.current) > 10) {
                        lastSavedTime.current = currentTime;
                        const progressPercent = (currentTime / duration) * 100;
                        
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

            {/* Player Container */}
            <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-100px)] overflow-y-auto lg:overflow-hidden relative z-10">
                
                {/* Left Side: Video Player Container */}
                <div className="flex-1 min-w-0 flex flex-col gap-4 h-full">
                    <div className="w-full aspect-video bg-black/80 backdrop-blur-md relative border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden z-10 flex-1">
                        <iframe
                            key={`${selectedSource}-${tmdbId}-${selectedSeason}-${selectedEpisode}`}
                            src={embedUrl}
                            className="w-full h-full"
                            frameBorder="0"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    </div>
                    
                    {/* Title & Metadata under player */}
                    <div className="hidden lg:block">
                        <h1 className="text-3xl font-black uppercase text-white tracking-tight truncate drop-shadow-md">
                            {title} {type === 'tv' && `• S${selectedSeason} E${selectedEpisode}`}
                        </h1>
                        <div className="flex items-center gap-4 text-xs font-bold text-white/50 mt-1.5 uppercase tracking-wider">
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
                        </div>
                    </div>
                </div>

                {/* Right Side: Streaming Info & Server Card */}
                <div className="w-full lg:w-[420px] shrink-0 bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar h-auto lg:h-full pb-10 shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
                    
                    {/* Mobile Title */}
                    <div className="lg:hidden flex flex-col mb-2">
                        <h1 className="text-2xl font-black uppercase text-white tracking-tight leading-none mb-1">
                            {title} {type === 'tv' && `• S${selectedSeason} E${selectedEpisode}`}
                        </h1>
                        <div className="flex items-center gap-3 text-xs font-bold text-white/50">
                            {media.vote_average > 0 && <span className="text-yellow-500">{media.vote_average.toFixed(1)} ★</span>}
                            {releaseYear && <span>{releaseYear}</span>}
                        </div>
                    </div>

                    {/* Server Selector Area - Collapsible Accordion on Mobile */}
                    <div>
                        <button
                            onClick={() => setIsServerListExpanded(!isServerListExpanded)}
                            className="w-full flex items-center justify-between py-1 mb-2 text-left group"
                        >
                            <div className="flex items-center gap-2">
                                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/45 group-hover:text-white transition-colors">
                                    Streaming Servers
                                </h3>
                                {videoSources.find(s => s.id === selectedSource) && (
                                    <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                                        {videoSources.find(s => s.id === selectedSource)?.name}
                                    </span>
                                )}
                            </div>
                            <div className="p-1 rounded-lg bg-white/5 text-white/50 group-hover:text-white transition-colors">
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isServerListExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </button>

                        <div className={`transition-all duration-300 overflow-hidden ${isServerListExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 lg:max-h-[500px] lg:opacity-100'}`}>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-1.5 sm:gap-2 pt-1">
                                {videoSources.map(source => (
                                    <button
                                        key={source.id}
                                        onClick={() => {
                                            setSelectedSource(source.id);
                                            setIsServerListExpanded(false);
                                        }}
                                        className={`flex items-center gap-1.5 px-2.5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-300 border text-left
                                            ${selectedSource === source.id 
                                            ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.25)] scale-[1.02]' 
                                            : 'bg-white/[0.02] backdrop-blur-md text-white/60 hover:bg-white/[0.08] hover:text-white border-white/[0.05]'}`}
                                    >
                                        <span className="text-xs sm:text-sm shrink-0">{source.icon}</span>
                                        <span className="truncate">{source.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                        <Link
                            href={`/room/create?type=${type}&id=${roomMediaId}${type === 'tv' ? `&s=${selectedSeason}&e=${selectedEpisode}` : ''}`}
                            className="bg-accent hover:bg-accent-light text-white flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.18em] transition-all shadow-lg shadow-accent/20 border border-accent/25"
                        >
                            <Users className="w-4 h-4" />
                            Watch Together
                        </Link>
                    </div>

                    {/* Genres */}
                    {media.genres && media.genres.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/45 mb-2.5">Genres</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {media.genres.map((genre) => (
                                    <span
                                        key={genre.id}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase text-white/70 bg-white/5 border border-white/5 backdrop-blur-md"
                                    >
                                        {genre.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Synopsis */}
                    <div>
                        <h4 className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/45 mb-2">Synopsis</h4>
                        <p className="text-white/60 text-xs leading-relaxed font-medium line-clamp-4 hover:line-clamp-none transition-all">
                            {media.overview}
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Content Area: TV Show Seasons & Episode List directly ABOVE Actors section */}
            <div className="px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto py-8 sm:py-10 mt-6 border-t border-white/10 relative z-10 bg-[#0b0b0b]/40 backdrop-blur-md rounded-t-3xl">
                
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
