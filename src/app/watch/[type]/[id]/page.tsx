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
    const [selectedSource, setSelectedSource] = useState('vidsrcme');
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

    const embedId = media?.imdbID || idParam;
    let baseEmbedUrl = type === 'movie'
        ? getEmbedUrl(selectedSource, 'movie', String(embedId))
        : getEmbedUrl(selectedSource, 'tv', String(embedId), selectedSeason, selectedEpisode);

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
        <main className="min-h-screen bg-[#0b0b0b] text-text-primary selection:bg-accent/30 selection:text-white">
            <Navbar />

            {/* Premium Edge-to-Edge Player Section with matching background */}
            <div className="pt-16 max-w-[1800px] mx-auto w-full relative">
                <div className="w-full aspect-video bg-black relative border-b border-white/5 shadow-2xl overflow-hidden z-10">
                    <iframe
                        key={`${selectedSource}-${embedId}-${selectedSeason}-${selectedEpisode}`}
                        src={embedUrl}
                        className="w-full h-full"
                        frameBorder="0"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                </div>

                {/* Server Selector Area */}
                <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 lg:px-12 py-5 bg-[#111] border-b border-white/5 relative z-20">
                    <span className="text-sm font-bold text-white/40 uppercase tracking-[0.2em] mr-2">Servers</span>
                    {videoSources.map(source => (
                        <button
                            key={source.id}
                            onClick={() => setSelectedSource(source.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300
                                ${selectedSource === source.id 
                                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105' 
                                : 'bg-[#1a1a1a] text-white/60 hover:bg-white/10 hover:text-white border border-white/5'}`}
                        >
                            <span>{source.icon}</span>
                            {source.name}
                        </button>
                    ))}
                    <div className="ml-auto">
                        <Link
                            href={`/room/create?type=${type}&id=${embedId}${type === 'tv' ? `&s=${selectedSeason}&e=${selectedEpisode}` : ''}`}
                            className="bg-accent/20 text-accent hover:bg-accent/30 flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border border-accent/20"
                        >
                            <Users className="w-4 h-4" />
                            Watch Together
                        </Link>
                    </div>
                </div>

                {/* Split Context Section (Info + Episodes Sidebar) */}
                <div className="px-4 sm:px-6 lg:px-12 py-10 flex flex-col xl:flex-row gap-12 max-w-[1800px] mx-auto">
                    
                    {/* Left side: Info, Genres, Actors, Recommendations */}
                    <div className="flex-1 min-w-0">
                        {/* Title & Meta */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 text-white tracking-tight uppercase drop-shadow-lg">
                            {title}
                        </h1>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-white/70 mb-8">
                            {media.vote_average > 0 && (
                                <span className="flex items-center gap-1.5 text-yellow-500">
                                    <Star className="w-4 h-4 fill-yellow-500" />
                                    {media.vote_average.toFixed(1)}
                                </span>
                            )}
                            {releaseYear && (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                    <span>{releaseYear}</span>
                                </>
                            )}
                            {media.runtime && media.runtime > 0 && (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                    <span>
                                        {media.runtime >= 60 ? `${Math.floor(media.runtime / 60)}h ${media.runtime % 60}m` : `${media.runtime}m`}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Genres */}
                        {media.genres && media.genres.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-8">
                                {media.genres.map((genre) => (
                                    <span
                                        key={genre.id}
                                        className="px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase text-white/80 bg-white/10 border border-white/5 backdrop-blur-sm"
                                    >
                                        {genre.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <p className="text-white/60 leading-relaxed text-lg max-w-4xl mb-12 font-medium">
                            {media.overview}
                        </p>

                        {/* Injected Actors Component */}
                        <ActorsRow cast={media.credits?.cast} />

                        {/* Injected Recommendations Component */}
                        <RecommendationsGrid recommendations={media.recommendations?.results} currentType={type} />
                    </div>

                    {/* Right side: Modern Cineby Episode Sidebar */}
                    {type === 'tv' && media.seasons && media.seasons.length > 0 && (
                        <div className="w-full xl:w-[450px] shrink-0 xl:sticky xl:top-[100px] xl:h-[calc(100vh-120px)] overflow-y-auto no-scrollbar pb-10">
                            <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#0b0b0b]/95 backdrop-blur-xl py-4 z-10 border-b border-white/5">
                                <h3 className="text-xl font-bold tracking-widest uppercase text-white">Episodes</h3>
                                <div className="relative">
                                    <select
                                        value={selectedSeason}
                                        onChange={(e) => {
                                            setSelectedSeason(Number(e.target.value));
                                            setSelectedEpisode(1);
                                        }}
                                        className="appearance-none px-4 py-2 pr-10 bg-[#1a1a1a] border border-white/10 text-white rounded-lg cursor-pointer outline-none focus:border-white/40 transition-all font-bold text-sm tracking-wider uppercase"
                                    >
                                        {media.seasons.map((season) => (
                                            <option key={season.id} value={season.season_number}>
                                                {season.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {episodes.length === 0 ? (
                                    <div className="py-12 text-center text-white/40 font-bold uppercase tracking-widest text-sm">
                                        Loading...
                                    </div>
                                ) : (
                                    episodes.map((ep) => {
                                        const isSelected = selectedEpisode === ep.episode_number;
                                        return (
                                            <button
                                                key={ep.id}
                                                onClick={() => setSelectedEpisode(ep.episode_number)}
                                                className={`relative w-full aspect-[21/9] rounded-xl overflow-hidden group transition-all duration-300 text-left cursor-pointer border ${
                                                    isSelected ? 'border-white ring-2 ring-white/20 scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'border-transparent hover:border-white/20'
                                                }`}
                                            >
                                                {/* Background Thumbnail */}
                                                <div className="absolute inset-0 z-0">
                                                    {ep.still_path ? (
                                                        <Image src={getImageUrl(ep.still_path, 'w300')} alt={ep.name} fill sizes="(max-width: 768px) 100vw, 300px" className={`object-cover transition-transform duration-700 ${isSelected ? 'scale-105' : 'group-hover:scale-105 opacity-60'}`} />
                                                    ) : (
                                                        <div className="w-full h-full bg-[#111]" />
                                                    )}
                                                    {/* Cineby specific transparent fade */}
                                                    <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity ${isSelected ? 'opacity-90' : 'opacity-80'}`} />
                                                </div>

                                                {/* Content overlays the thumbnail */}
                                                <div className="relative z-10 w-full h-full p-4 flex flex-col justify-end">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isSelected && <span className="px-1.5 py-0.5 bg-accent text-white rounded text-[9px] font-black uppercase tracking-wider">Watching</span>}
                                                        <span className={`text-xs font-bold uppercase tracking-widest ${isSelected ? 'text-white' : 'text-white/60'}`}>
                                                            {ep.episode_number}.
                                                        </span>
                                                        <h4 className={`text-sm md:text-base font-bold uppercase tracking-wide truncate ${isSelected ? 'text-white' : 'text-white/90 group-hover:text-white'}`}>
                                                            {ep.name}
                                                        </h4>
                                                    </div>
                                                    
                                                    {ep.runtime > 0 && (
                                                        <span className="text-[10px] font-bold text-white/50 mb-1 tracking-widest uppercase">
                                                            {ep.runtime} min
                                                        </span>
                                                    )}
                                                    
                                                    <p className="text-xs text-white/60 line-clamp-2 md:line-clamp-1 font-medium leading-relaxed max-w-[90%]">
                                                        {ep.overview || "No description available."}
                                                    </p>
                                                </div>

                                                {/* Dim overlay if not selected */}
                                                {!isSelected && (
                                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-20" />
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
