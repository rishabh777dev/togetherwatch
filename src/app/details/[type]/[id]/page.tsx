'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import WatchlistButton from '@/components/WatchlistButton';
import { 
    Movie, 
    Episode, 
    getImageUrl, 
    getMovieDetails, 
    getTVDetails, 
    getEpisodesForSeason 
} from '@/lib/tmdb';
import { 
    Play, 
    Users, 
    Star, 
    Clock, 
    Calendar, 
    Film, 
    Tv, 
    ChevronRight, 
    ChevronDown, 
    ExternalLink, 
    MessageSquare, 
    Share2, 
    Check, 
    Sparkles, 
    X,
    Info,
    ArrowLeft
} from 'lucide-react';

interface OmdbData {
    imdbRating?: string;
    imdbVotes?: string;
    Rated?: string;
    Director?: string;
    Writer?: string;
    BoxOffice?: string;
}

export default function DetailsPage() {
    return (
        <Suspense fallback={<DetailsSkeleton />}>
            <DetailsContent />
        </Suspense>
    );
}

function DetailsContent() {
    const params = useParams();
    const router = useRouter();
    const type = params.type as 'movie' | 'tv';
    const idParam = params.id as string;

    const [media, setMedia] = useState<Movie | null>(null);
    const [omdb, setOmdb] = useState<OmdbData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Trailer modal state
    const [showTrailerModal, setShowTrailerModal] = useState(false);

    // TV Season state
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);

    // Fetch primary media details
    useEffect(() => {
        let isMounted = true;
        async function fetchDetails() {
            setLoading(true);
            setError(null);
            try {
                const data = type === 'tv' 
                    ? await getTVDetails(idParam) 
                    : await getMovieDetails(idParam);

                if (!data) {
                    if (isMounted) setError('Could not find details for this title.');
                    return;
                }

                if (isMounted) {
                    setMedia(data);
                    // If TV series, pick the first regular season
                    if (type === 'tv' && data.seasons && data.seasons.length > 0) {
                        const regularSeason = data.seasons.find(s => s.season_number > 0) || data.seasons[0];
                        setSelectedSeason(regularSeason.season_number);
                    }
                }

                // If IMDb ID exists, query OMDb proxy for ratings and certificate
                const imdbId = data.imdbID || data.external_ids?.imdb_id;
                if (imdbId) {
                    fetch(`/api/omdb?i=${imdbId}`)
                        .then(r => r.json())
                        .then(res => {
                            if (isMounted && res && res.Response !== 'False') {
                                setOmdb(res);
                            }
                        })
                        .catch(() => {});
                }
            } catch (err) {
                console.error('Error fetching details:', err);
                if (isMounted) setError('An error occurred while loading title details.');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchDetails();
        return () => { isMounted = false; };
    }, [type, idParam]);

    // Fetch episodes when selected season changes
    useEffect(() => {
        if (type !== 'tv' || !media) return;
        let isMounted = true;
        async function fetchSeasonEpisodes() {
            setLoadingEpisodes(true);
            try {
                const eps = await getEpisodesForSeason(idParam, selectedSeason);
                if (isMounted) setEpisodes(eps);
            } catch (err) {
                console.error('Failed to load season episodes:', err);
            } finally {
                if (isMounted) setLoadingEpisodes(false);
            }
        }
        fetchSeasonEpisodes();
        return () => { isMounted = false; };
    }, [type, idParam, selectedSeason, media]);

    // Derived fields
    const title = media?.title || media?.name || 'Untitled';
    const releaseYear = (media?.release_date || media?.first_air_date)?.split('-')[0] || '';
    const formattedReleaseDate = useMemo(() => {
        const rawDate = media?.release_date || media?.first_air_date;
        if (!rawDate) return 'N/A';
        try {
            return new Date(rawDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return rawDate;
        }
    }, [media]);

    // Runtime formatting
    const formattedRuntime = useMemo(() => {
        if (media?.runtime && media.runtime > 0) {
            const hrs = Math.floor(media.runtime / 60);
            const mins = media.runtime % 60;
            return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }
        if (type === 'tv' && media?.number_of_seasons) {
            return `${media.number_of_seasons} Season${media.number_of_seasons > 1 ? 's' : ''}`;
        }
        return 'N/A';
    }, [media, type]);

    // Language full name
    const formattedLanguage = useMemo(() => {
        if (!media?.original_language) return 'English';
        try {
            const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
            return languageNames.of(media.original_language) || media.original_language.toUpperCase();
        } catch {
            return media.original_language.toUpperCase();
        }
    }, [media]);

    // Extract Director or Creator
    const directorName = useMemo(() => {
        if (omdb?.Director && omdb.Director !== 'N/A') return omdb.Director;
        if (type === 'movie' && media?.credits?.crew) {
            const dir = media.credits.crew.find(c => c.job === 'Director');
            if (dir) return dir.name;
        }
        if (type === 'tv' && media?.created_by && media.created_by.length > 0) {
            return media.created_by.map(c => c.name).join(', ');
        }
        return 'Not specified';
    }, [omdb, type, media]);

    // Extract official trailer
    const trailerVideo = useMemo(() => {
        if (!media?.videos?.results || media.videos.results.length === 0) return null;
        return (
            media.videos.results.find(
                v => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube'
            ) || media.videos.results[0]
        );
    }, [media]);

    // Top cast members
    const castMembers = useMemo(() => {
        return (media?.credits?.cast || []).slice(0, 14);
    }, [media]);

    // Recommended titles
    const recommendations = useMemo(() => {
        return (media?.recommendations?.results || []).filter(r => r.poster_path || r.backdrop_path).slice(0, 10);
    }, [media]);

    // Reviews list
    const reviews = useMemo(() => {
        return (media?.reviews?.results || []).slice(0, 4);
    }, [media]);

    if (loading) {
        return <DetailsSkeleton />;
    }

    if (error || !media) {
        return (
            <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4 text-accent">
                        <Info className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black mb-2">Title Not Found</h1>
                    <p className="text-white/60 mb-6 max-w-md">{error || 'The requested movie or series could not be retrieved.'}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2.5 rounded-full bg-white text-black font-bold hover:bg-white/90 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Play target URL (for TV, picks season 1 episode 1 or current selected)
    const playUrl = type === 'tv' 
        ? `/watch/tv/${media.id}?s=${selectedSeason}&e=1` 
        : `/watch/movie/${media.id}`;

    const watchTogetherUrl = `/room/create?type=${type}&id=${media.id}`;

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col selection:bg-accent selection:text-white">
            <Navbar />

            {/* HERO SECTION WITH BACKDROP */}
            <div className="relative w-full min-h-[85vh] lg:min-h-[90vh] flex items-end overflow-hidden pb-12 pt-28">
                {/* Backdrop Image */}
                <div className="absolute inset-0 z-0">
                    {media.backdrop_path ? (
                        <Image
                            src={getImageUrl(media.backdrop_path, 'original')}
                            alt={title}
                            fill
                            priority
                            sizes="100vw"
                            className="object-cover object-top filter brightness-[0.75] contrast-[1.05]"
                        />
                    ) : (
                        <div className="w-full h-full bg-[#111]" />
                    )}

                    {/* Multi-layered cinematic vignette & gradients matching user screenshot */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0b] via-[#0b0b0b]/80 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/50 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
                </div>

                {/* Hero Content Container */}
                <div className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
                        
                        {/* LEFT COLUMN: Title, Actions, Badges, Synopsis */}
                        <div className="lg:col-span-8 flex flex-col">
                            {/* Genres Row */}
                            {media.genres && media.genres.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    {media.genres.map((genre, idx) => (
                                        <span 
                                            key={genre.id} 
                                            className="text-xs sm:text-sm font-semibold text-white/70 tracking-wide uppercase hover:text-white transition-colors"
                                        >
                                            {genre.name}
                                            {idx < media.genres!.length - 1 && <span className="mx-2 text-white/30">•</span>}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Main Title */}
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] mb-4">
                                {title}
                            </h1>

                            {/* Tagline */}
                            {media.tagline && (
                                <p className="text-base sm:text-lg italic text-white/60 font-medium mb-5">
                                    &ldquo;{media.tagline}&rdquo;
                                </p>
                            )}

                            {/* Action Buttons Bar */}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
                                {/* Play Primary Button */}
                                <Link
                                    href={playUrl}
                                    className="flex items-center gap-2.5 bg-white text-black px-7 sm:px-9 py-3 sm:py-3.5 rounded-full font-extrabold hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/60 text-sm sm:text-base group"
                                >
                                    <Play className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" />
                                    <span>Play</span>
                                </Link>

                                {/* Watchlist Toggle Button */}
                                <div className="flex items-center">
                                    <WatchlistButton item={media} variant="full" />
                                </div>

                                {/* Watch Together Button */}
                                <Link
                                    href={watchTogetherUrl}
                                    className="flex items-center gap-2 bg-accent/90 hover:bg-accent text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20 text-sm sm:text-base"
                                    title="Host a synchronized watch party"
                                >
                                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span>Watch Together</span>
                                </Link>

                                {/* Trailer Action (if trailer exists) */}
                                {trailerVideo && (
                                    <button
                                        onClick={() => setShowTrailerModal(true)}
                                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 px-5 sm:px-6 py-3 sm:py-3.5 rounded-full font-bold backdrop-blur-md hover:scale-105 active:scale-95 transition-all text-sm sm:text-base"
                                    >
                                        <Film className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                                        <span>Trailer</span>
                                    </button>
                                )}
                            </div>

                            {/* Metadata Badges Line */}
                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-6 text-xs sm:text-sm font-bold">
                                {/* Year */}
                                {releaseYear && (
                                    <span className="px-3 py-1 rounded-xl bg-white/10 text-white/90 border border-white/10">
                                        {releaseYear}
                                    </span>
                                )}

                                {/* Runtime */}
                                <span className="px-3 py-1 rounded-xl bg-white/10 text-white/90 border border-white/10 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-white/60" />
                                    {formattedRuntime}
                                </span>

                                {/* Quality Badge */}
                                <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black tracking-wider">
                                    1080p
                                </span>

                                {/* Content Rating Certificate (from OMDb or fallback) */}
                                {omdb?.Rated && omdb.Rated !== 'N/A' && (
                                    <span className="px-2.5 py-1 rounded-xl bg-white/10 text-white/80 border border-white/10 uppercase">
                                        {omdb.Rated}
                                    </span>
                                )}

                                {/* Authentic IMDb Badge */}
                                {(omdb?.imdbRating && omdb.imdbRating !== 'N/A') ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#f5c518] text-black font-black shadow-md">
                                        <span>IMDb</span>
                                        <span>{omdb.imdbRating}</span>
                                        {omdb.imdbVotes && omdb.imdbVotes !== 'N/A' && (
                                            <span className="text-black/70 text-[11px] font-semibold">({omdb.imdbVotes})</span>
                                        )}
                                    </div>
                                ) : (
                                    media.vote_average > 0 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#f5c518]/20 text-[#f5c518] border border-[#f5c518]/30 font-black">
                                            <span>IMDb</span>
                                            <span>{media.vote_average.toFixed(1)}</span>
                                        </div>
                                    )
                                )}

                                {/* TMDB Star Badge */}
                                {media.vote_average > 0 && (
                                    <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/10 text-yellow-400 border border-white/10">
                                        <Star className="w-3.5 h-3.5 fill-yellow-400" />
                                        <span className="text-white font-black">{media.vote_average.toFixed(1)}</span>
                                        <span className="text-white/40 text-[11px]">TMDB</span>
                                    </div>
                                )}
                            </div>

                            {/* Synopsis / Overview */}
                            <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-3xl font-medium mb-2">
                                {media.overview || 'No synopsis available for this title.'}
                            </p>
                        </div>

                        {/* RIGHT COLUMN: Floating Glassmorphic Info Card (As in user screenshot) */}
                        <div className="lg:col-span-4 w-full">
                            <div className="relative rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-6 sm:p-7 shadow-2xl shadow-black/80">
                                <div className="space-y-4 text-sm font-semibold">
                                    {/* Runtime */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <span className="text-white/50">Runtime</span>
                                        <span className="text-white">{formattedRuntime}</span>
                                    </div>

                                    {/* Language */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <span className="text-white/50">Language</span>
                                        <span className="text-white">{formattedLanguage}</span>
                                    </div>

                                    {/* Release Date */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <span className="text-white/50">Release Date</span>
                                        <span className="text-white">{formattedReleaseDate}</span>
                                    </div>

                                    {/* Quality */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <span className="text-white/50">Quality</span>
                                        <span className="text-white font-bold text-accent">1080p FHD</span>
                                    </div>

                                    {/* Director / Creator */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <span className="text-white/50">{type === 'tv' ? 'Creator' : 'Director'}</span>
                                        <span className="text-white text-right max-w-[60%] truncate font-medium">
                                            {directorName}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    {media.status && (
                                        <div className="flex items-center justify-between py-2 border-b border-white/5">
                                            <span className="text-white/50">Status</span>
                                            <span className="text-white">{media.status}</span>
                                        </div>
                                    )}

                                    {/* Production Company */}
                                    {media.production_companies && media.production_companies.length > 0 && (
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-white/50">Studio</span>
                                            <span className="text-white text-right max-w-[60%] truncate font-medium">
                                                {media.production_companies[0].name}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* MAIN DETAILS BODY CONTENT */}
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 w-full py-10 space-y-12">

                {/* 1. CAST SECTION (Circle Avatars linking to Actor Filmography) */}
                {castMembers.length > 0 && (
                    <section className="w-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-[3px] h-6 bg-accent rounded-full" />
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Cast</h2>
                            </div>
                            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                                Click an actor to view their filmography
                            </span>
                        </div>

                        {/* Circular Cast Scroller */}
                        <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none scroll-smooth">
                            {castMembers.map((actor) => (
                                <Link
                                    key={actor.id}
                                    href={`/person/${actor.id}`}
                                    className="group flex flex-col items-center flex-shrink-0 w-24 sm:w-28 text-center"
                                    title={`View all movies & shows with ${actor.name}`}
                                >
                                    {/* Circular Photo */}
                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white/5 border-2 border-white/10 group-hover:border-accent transition-all duration-300 shadow-lg group-hover:scale-105 mb-3">
                                        {actor.profile_path ? (
                                            <Image
                                                src={getImageUrl(actor.profile_path, 'w185')}
                                                alt={actor.name}
                                                fill
                                                sizes="96px"
                                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold text-white/30 text-sm">
                                                {actor.name.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actor Name */}
                                    <span className="text-xs sm:text-sm font-bold text-white group-hover:text-accent transition-colors line-clamp-1 w-full">
                                        {actor.name}
                                    </span>
                                    {/* Character Name */}
                                    <span className="text-[11px] text-white/50 line-clamp-1 w-full mt-0.5">
                                        {actor.character || 'Cast'}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* 2. TV SHOW EPISODE SELECTOR (When type is TV) */}
                {type === 'tv' && media.seasons && media.seasons.length > 0 && (
                    <section className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-[3px] h-6 bg-accent rounded-full" />
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Episodes</h2>
                            </div>

                            {/* Season Selector Dropdown */}
                            <div className="relative inline-block">
                                <select
                                    value={selectedSeason}
                                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                                    className="appearance-none bg-white/10 hover:bg-white/15 text-white font-bold text-sm px-5 py-2.5 pr-10 rounded-2xl border border-white/15 focus:outline-none focus:border-accent transition-all cursor-pointer"
                                >
                                    {media.seasons
                                        .filter(s => s.season_number > 0)
                                        .map(s => (
                                            <option key={s.id} value={s.season_number} className="bg-[#141414] text-white">
                                                {s.name || `Season ${s.season_number}`} ({s.episode_count} Episodes)
                                            </option>
                                        ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-white/60 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Episode Cards Grid */}
                        {loadingEpisodes ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(n => (
                                    <div key={n} className="h-44 bg-white/5 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : episodes.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {episodes.map((ep) => (
                                    <Link
                                        key={ep.id}
                                        href={`/watch/tv/${media.id}?s=${selectedSeason}&e=${ep.episode_number}`}
                                        className="group relative flex flex-col bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-accent/40 rounded-2xl overflow-hidden p-3 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-xl hover:shadow-accent/10"
                                    >
                                        {/* Episode Still / Thumbnail */}
                                        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40 mb-3">
                                            {ep.still_path ? (
                                                <Image
                                                    src={getImageUrl(ep.still_path, 'w500')}
                                                    alt={ep.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, 300px"
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                                                    No Preview
                                                </div>
                                            )}

                                            {/* Hover Play Icon Overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-lg">
                                                    <Play className="w-4 h-4 fill-white ml-0.5" />
                                                </div>
                                            </div>

                                            {/* Episode Badge */}
                                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-black text-white border border-white/10">
                                                EP {ep.episode_number}
                                            </span>

                                            {ep.runtime > 0 && (
                                                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-white/80">
                                                    {ep.runtime}m
                                                </span>
                                            )}
                                        </div>

                                        {/* Episode Title & Overview */}
                                        <h3 className="text-sm font-bold text-white group-hover:text-accent transition-colors line-clamp-1 mb-1">
                                            {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                                        </h3>
                                        <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                                            {ep.overview || 'No description available for this episode.'}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/40 text-sm py-4">No episodes found for this season.</p>
                        )}
                    </section>
                )}

                {/* 3. OFFICIAL TRAILER EMBED / PREVIEW CARD (Matching user screenshot) */}
                {trailerVideo && (
                    <section className="w-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-[3px] h-6 bg-accent rounded-full" />
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Trailer</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-white/[0.03] border border-white/5 rounded-3xl p-5 sm:p-7 backdrop-blur-xl">
                            {/* Trailer Preview Frame */}
                            <div 
                                onClick={() => setShowTrailerModal(true)}
                                className="lg:col-span-6 relative aspect-video rounded-2xl overflow-hidden cursor-pointer group shadow-xl border border-white/10"
                            >
                                <Image
                                    src={`https://img.youtube.com/vi/${trailerVideo.key}/maxresdefault.jpg`}
                                    alt={trailerVideo.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center shadow-[0_0_30px_rgba(229,9,20,0.7)] group-hover:scale-110 transition-transform">
                                        <Play className="w-7 h-7 fill-white ml-1" />
                                    </div>
                                </div>
                                <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-xs font-bold text-white border border-white/10">
                                    YouTube
                                </span>
                            </div>

                            {/* Trailer Text & Details */}
                            <div className="lg:col-span-6 flex flex-col justify-center space-y-4">
                                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                                    Official Trailer
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                                    {trailerVideo.name || `Trailer: ${title}`}
                                </h3>
                                <p className="text-sm text-white/60 leading-relaxed">
                                    Get an exclusive preview of {title}. Watch the full official teaser, high-definition scenes, and sound before streaming.
                                </p>
                                <div className="flex items-center gap-4 pt-2">
                                    <button
                                        onClick={() => setShowTrailerModal(true)}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black font-extrabold hover:bg-white/90 transition-all text-sm shadow-md"
                                    >
                                        <Play className="w-4 h-4 fill-black" />
                                        Watch Trailer
                                    </button>
                                    <a
                                        href={`https://www.youtube.com/watch?v=${trailerVideo.key}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white transition-colors"
                                    >
                                        <span>Watch on YouTube</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* 4. REVIEWS SECTION */}
                {reviews.length > 0 && (
                    <section className="w-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-[3px] h-6 bg-accent rounded-full" />
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Audience & Critic Reviews</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {reviews.map((rev) => (
                                <div 
                                    key={rev.id} 
                                    className="flex flex-col bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 text-accent font-black flex items-center justify-center text-sm">
                                                {rev.author.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white">{rev.author}</span>
                                                <span className="text-[11px] text-white/40">
                                                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified Reviewer'}
                                                </span>
                                            </div>
                                        </div>
                                        {rev.author_details?.rating && (
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-400/10 text-yellow-400 font-bold text-xs border border-yellow-400/20">
                                                <Star className="w-3 h-3 fill-yellow-400" />
                                                <span>{rev.author_details.rating}/10</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-white/70 line-clamp-4 leading-relaxed italic">
                                        &ldquo;{rev.content}&rdquo;
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 5. "YOU MIGHT ALSO LIKE" (Recommendations Grid) */}
                {recommendations.length > 0 && (
                    <section className="w-full pt-4">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-[3px] h-6 bg-accent rounded-full" />
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">You Might Also Like</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                            {recommendations.map((rec) => {
                                const recTitle = rec.title || rec.name || '';
                                const recType = rec.media_type || type;
                                const recYear = (rec.release_date || rec.first_air_date)?.split('-')[0];
                                const recImage = rec.poster_path || rec.backdrop_path;

                                return (
                                    <Link
                                        key={rec.id}
                                        href={`/details/${recType}/${rec.id}`}
                                        className="group flex flex-col cursor-pointer select-none"
                                    >
                                        <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#141414] border border-white/5 shadow-md transition-all duration-300 group-hover:scale-[1.04] group-hover:border-accent/40 group-hover:shadow-[0_12px_30px_rgba(229,9,20,0.2)]">
                                            {recImage ? (
                                                <Image
                                                    src={getImageUrl(recImage, 'w500')}
                                                    alt={recTitle}
                                                    fill
                                                    sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 250px"
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                                                    No Poster
                                                </div>
                                            )}

                                            {/* Rating pill */}
                                            {rec.vote_average > 0 && (
                                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-black/70 backdrop-blur-md text-white border border-white/10">
                                                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                                    <span>{rec.vote_average.toFixed(1)}</span>
                                                </div>
                                            )}

                                            {/* Center play icon on hover */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                                                    <Play className="w-4 h-4 fill-white ml-0.5" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2.5 px-0.5">
                                            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-accent transition-colors truncate">
                                                {recTitle}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/40 mt-0.5">
                                                {recYear && <span>{recYear}</span>}
                                                {recYear && <span>•</span>}
                                                <span className="capitalize">{recType === 'movie' ? 'Movie' : 'Series'}</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

            </div>

            {/* TRAILER POPUP MODAL */}
            {showTrailerModal && trailerVideo && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in"
                    onClick={() => setShowTrailerModal(false)}
                >
                    <div 
                        className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden bg-black border border-white/15 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowTrailerModal(false)}
                            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/70 hover:bg-white text-white hover:text-black transition-all border border-white/20"
                            aria-label="Close trailer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <iframe
                            src={`https://www.youtube.com/embed/${trailerVideo.key}?autoplay=1&rel=0`}
                            title={trailerVideo.name}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailsSkeleton() {
    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col">
            <Navbar />
            <div className="relative w-full min-h-[85vh] bg-[#111] animate-pulse flex items-end p-6 sm:p-12">
                <div className="max-w-[1800px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-4">
                        <div className="h-4 w-40 bg-white/10 rounded-full" />
                        <div className="h-14 w-3/4 bg-white/10 rounded-2xl" />
                        <div className="flex gap-4">
                            <div className="h-12 w-32 bg-white/10 rounded-full" />
                            <div className="h-12 w-40 bg-white/10 rounded-full" />
                        </div>
                        <div className="h-20 w-full bg-white/10 rounded-2xl" />
                    </div>
                    <div className="lg:col-span-4 h-64 bg-white/5 rounded-3xl" />
                </div>
            </div>
        </div>
    );
}
