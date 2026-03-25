'use client';

import Navbar from '@/components/Navbar';
import { getEpisodesForSeason, getImageUrl, getMovieDetails, getTVDetails, Movie } from '@/lib/tmdb';
import { getEmbedUrl, videoSources } from '@/lib/videoSources';
import { Calendar, ChevronDown, Clock, Play, Star, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Episode {
    id: number;
    episode_number: number;
    name: string;
    overview: string;
    still_path: string;
    air_date: string;
    runtime: number;
    imdbRating?: number;
}

export default function WatchPage() {
    const params = useParams();
    const type = params.type as 'movie' | 'tv';
    const idParam = params.id as string;

    const [media, setMedia] = useState<Movie | null>(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSource, setSelectedSource] = useState('vidking');

    useEffect(() => {
        if (!idParam) return;

        // Compute id inside the effect to avoid dependency array size changes
        const isImdb = idParam.startsWith('tt');
        const resolvedId = isImdb ? idParam : Number(idParam);

        const fetchData = async () => {
            try {
                const data = type === 'movie'
                    ? await getMovieDetails(resolvedId)
                    : await getTVDetails(resolvedId);
                setMedia(data);

                if (type === 'tv' && data?.seasons && data.seasons.length > 0) {
                    // Pass IMDb ID if available to OMDb
                    const tvIdForEpisodes = data.imdbID || (typeof resolvedId === 'number' ? resolvedId : idParam);
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

    // VidKing can handle IMDb IDs, restoring the correct ID mapping
    const embedId = media?.imdbID || idParam;
    const embedUrl = type === 'movie'
        ? getEmbedUrl(selectedSource, 'movie', String(embedId))
        : getEmbedUrl(selectedSource, 'tv', String(embedId), selectedSeason, selectedEpisode);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-[#0a0a0a]">
                <Navbar />
                <div className="pt-20 flex items-center justify-center h-[80vh]">
                    <div className="w-12 h-12 border-4 border-[#0dcaf0] border-t-transparent rounded-full animate-spin" />
                </div>
            </main>
        );
    }

    if (!media) {
        return (
            <main className="min-h-screen bg-[#0a0a0a]">
                <Navbar />
                <div className="pt-20 flex items-center justify-center h-[80vh]">
                    <p className="text-gray-500">Content not found</p>
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
        <main className="min-h-screen bg-[#0a0a0a] text-gray-200 selection:bg-[#0dcaf0]/30 selection:text-white">
            <Navbar />

            <div className="pt-16 max-w-[1800px] mx-auto">
                {/* Premium Edge-to-Edge Player Section (Cineby style) */}
                <div className="w-full aspect-video bg-black relative border-b border-white/5 shadow-2xl overflow-hidden">
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
                <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 lg:px-12 py-4 bg-[#0d0d0d] border-b border-white/5">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest mr-2">Servers</span>
                    {videoSources.map(source => (
                        <button
                            key={source.id}
                            onClick={() => setSelectedSource(source.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200
                                ${selectedSource === source.id 
                                ? 'bg-[#0dcaf0]/15 text-[#0dcaf0] ring-1 ring-[#0dcaf0]/50 shadow-[0_0_15px_rgba(13,202,240,0.15)]' 
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white ring-1 ring-white/5 shadow-sm'}`}
                        >
                            <span>{source.icon}</span>
                            {source.name}
                        </button>
                    ))}
                </div>

                {/* Content Section below player */}
                <div className="px-4 sm:px-6 lg:px-12 py-10 flex flex-col lg:flex-row gap-12">
                    {/* Left side: Poster (optional in cineby, but sleek) */}
                    <div className="hidden lg:block w-[280px] shrink-0">
                         <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
                            {media.poster_path ? (
                                <Image
                                    src={getImageUrl(media.poster_path)}
                                    alt={title || ''}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    sizes="280px"
                                />
                            ) : (
                                <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-gray-600">No Image</div>
                            )}
                         </div>
                         <Link
                             href={`/room/create?type=${type}&id=${embedId}${type === 'tv' ? `&s=${selectedSeason}&e=${selectedEpisode}` : ''}`}
                             className="mt-6 w-full py-4 bg-[#0dcaf0]/10 text-[#0dcaf0] hover:bg-[#0dcaf0]/20 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border border-[#0dcaf0]/20 shadow-[0_0_20px_rgba(13,202,240,0.1)] hover:shadow-[0_0_30px_rgba(13,202,240,0.2)]"
                         >
                             <Users className="w-5 h-5" />
                             Watch Together
                         </Link>
                    </div>

                    {/* Right side: Info and Episodes */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white tracking-tight leading-tight">
                            {title}
                        </h1>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-8 font-medium">
                            {media.vote_average > 0 && (
                                <span className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-full ring-1 ring-yellow-500/20">
                                    <Star className="w-4 h-4 fill-yellow-500" />
                                    {media.vote_average.toFixed(1)}
                                </span>
                            )}
                            {releaseYear && (
                                <span className="flex items-center gap-1.5 px-4 py-1.5 bg-white/5 rounded-full ring-1 ring-white/10 text-gray-300">
                                    <Calendar className="w-4 h-4" />
                                    {releaseYear}
                                </span>
                            )}
                            {media.runtime && media.runtime > 0 && (
                                <span className="flex items-center gap-1.5 px-4 py-1.5 bg-white/5 rounded-full ring-1 ring-white/10 text-gray-300">
                                    <Clock className="w-4 h-4" />
                                    {media.runtime >= 60
                                        ? `${Math.floor(media.runtime / 60)}h ${media.runtime % 60}m`
                                        : `${media.runtime}m`
                                    }
                                </span>
                            )}
                        </div>

                        {/* Genres */}
                        {media.genres && media.genres.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-8">
                                {media.genres.map((genre) => (
                                    <span
                                        key={genre.id}
                                        className="px-4 py-1.5 border border-white/10 rounded-full text-sm text-gray-300 bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-default"
                                    >
                                        {genre.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <p className="text-gray-400 leading-relaxed text-lg max-w-4xl mb-12">
                            {media.overview}
                        </p>

                        {/* TV Show Episodes */}
                        {type === 'tv' && media.seasons && media.seasons.length > 0 && (
                            <div className="mt-8">
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">Episodes</h3>
                                    <div className="relative">
                                        <select
                                            value={selectedSeason}
                                            onChange={(e) => {
                                                setSelectedSeason(Number(e.target.value));
                                                setSelectedEpisode(1);
                                            }}
                                            className="appearance-none px-5 py-2.5 pr-12 bg-[#111] border border-white/10 text-white rounded-xl cursor-pointer outline-none focus:border-[#0dcaf0] focus:ring-1 focus:ring-[#0dcaf0] transition-all font-medium min-w-[180px]"
                                        >
                                            {media.seasons.map((season) => (
                                                <option key={season.id} value={season.season_number}>
                                                    {season.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {episodes.length === 0 ? (
                                        <div className="col-span-full py-12 text-gray-600 font-medium">
                                            Loading episodes...
                                        </div>
                                    ) : (
                                        episodes.map((ep) => (
                                            <button
                                                key={ep.id}
                                                onClick={() => setSelectedEpisode(ep.episode_number)}
                                                className={`flex items-center gap-4 p-3 rounded-xl transition-all text-left group
                                                    ${selectedEpisode === ep.episode_number
                                                    ? 'bg-[#0dcaf0]/10 border border-[#0dcaf0]/30 shadow-[0_4px_20px_rgba(13,202,240,0.15)] ring-1 ring-[#0dcaf0]/50'
                                                    : 'bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-white/10'
                                                    }`}
                                            >
                                                <div className="w-14 h-14 shrink-0 rounded-lg bg-[#1a1a1a] flex items-center justify-center font-bold text-gray-400 group-hover:text-white transition-colors relative overflow-hidden ring-1 ring-white/5">
                                                    <span className={selectedEpisode === ep.episode_number ? 'opacity-0' : 'opacity-100'}>
                                                        {ep.episode_number}
                                                    </span>
                                                    {(selectedEpisode === ep.episode_number || true) && (
                                                        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300
                                                            ${selectedEpisode === ep.episode_number ? 'opacity-100 bg-[#0dcaf0]' : 'opacity-0 group-hover:opacity-100 bg-white/10'}`}>
                                                            <Play className={`w-5 h-5 ${selectedEpisode === ep.episode_number ? 'fill-black text-black' : 'fill-white text-white translate-x-0.5'}`} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`font-medium truncate transition-colors ${selectedEpisode === ep.episode_number ? 'text-[#0dcaf0]' : 'text-gray-200 group-hover:text-white'}`}>
                                                        {ep.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1 font-medium">
                                                        {ep.air_date ? new Date(ep.air_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : `Episode ${ep.episode_number}`}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="lg:hidden mt-10">
                             <Link
                                 href={`/room/create?type=${type}&id=${embedId}${type === 'tv' ? `&s=${selectedSeason}&e=${selectedEpisode}` : ''}`}
                                 className="w-full py-4 bg-[#0dcaf0]/10 text-[#0dcaf0] hover:bg-[#0dcaf0]/20 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border border-[#0dcaf0]/20 shadow-[0_0_20px_rgba(13,202,240,0.1)]"
                             >
                                 <Users className="w-5 h-5" />
                                 Watch Together
                             </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
