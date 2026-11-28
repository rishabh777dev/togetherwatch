'use client';

import { Suspense, useEffect, useState, useMemo, useRef } from 'react';
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

    // Interactive Liquid Glass Spotlight on floating info slate
    const panelRef = useRef<HTMLDivElement>(null);
    const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50, active: false });

    const handlePanelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!panelRef.current) return;
        const rect = panelRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setSpotlightPos({ x, y, active: true });
    };

    const handlePanelMouseLeave = () => {
        setSpotlightPos(prev => ({ ...prev, active: false }));
    };

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
                    if (type === 'tv' && data.seasons && data.seasons.length > 0) {
                        const regularSeason = data.seasons.find(s => s.season_number > 0) || data.seasons[0];
                        setSelectedSeason(regularSeason.season_number);
                    }
                }

                // If IMDb ID exists, query OMDb proxy for authentic rating and age certification
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
            <div className="min-h-screen bg-[#060608] text-white flex flex-col relative overflow-hidden">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
                    <div className="w-16 h-16 rounded-full liquid-glass-pill flex items-center justify-center mb-4 text-accent">
                        <Info className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black mb-2">Title Not Found</h1>
                    <p className="text-white/60 mb-6 max-w-md">{error || 'The requested movie or series could not be retrieved.'}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2.5 rounded-full liquid-btn-primary text-black font-extrabold flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const playUrl = type === 'tv' 
        ? `/watch/tv/${media.id}?s=${selectedSeason}&e=1` 
        : `/watch/movie/${media.id}`;

    const watchTogetherUrl = `/room/create?type=${type}&id=${media.id}`;

    return (
        <div className="min-h-screen bg-[#070709] text-white flex flex-col selection:bg-accent selection:text-white relative overflow-x-hidden">
            <Navbar />

            {/* AMBIENT LIQUID REFRACTION LIGHT BLOBS (Physics Refraction Layer) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Crimson liquid light blob */}
                <div className="absolute top-[10%] left-[5%] w-[550px] h-[550px] rounded-full bg-accent/25 filter blur-[130px] animate-liquid-blob-1 opacity-70" />
                {/* Cyan liquid light blob (generates chromatic edge dispersion) */}
                <div className="absolute top-[25%] right-[10%] w-[500px] h-[500px] rounded-full bg-cyan-500/20 filter blur-[140px] animate-liquid-blob-2 opacity-60" />
                {/* Amber golden glass glow blob */}
                <div className="absolute bottom-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-amber-500/15 filter blur-[150px] opacity-40" />
            </div>

            {/* HERO SECTION WITH BACKDROP & LIQUID VIGNETTE */}
            <div className="relative w-full min-h-[85vh] lg:min-h-[92vh] flex items-end overflow-hidden pb-12 pt-28">
                {/* Backdrop Image */}
                <div className="absolute inset-0 z-0">
                    {media.backdrop_path ? (
                        <Image
                            src={getImageUrl(media.backdrop_path, 'original')}
                            alt={title}
                            fill
                            priority
                            sizes="100vw"
                            className="object-cover object-top filter brightness-[0.72] contrast-[1.08] saturate-[110%]"
                        />
                    ) : (
                        <div className="w-full h-full bg-[#0a0a0e]" />
                    )}

                    {/* Multi-layered liquid gradients for seamless glass fusion */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#070709]/95 via-[#070709]/75 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/55 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#070709] to-transparent" />
                </div>

                {/* Hero Content Container */}
                <div className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
                        
                        {/* LEFT COLUMN: Title, Badges, Actions, Synopsis */}
                        <div className="lg:col-span-8 flex flex-col">
                            
                            {/* Liquid Genre Droplet Pills */}
                            {media.genres && media.genres.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 mb-3.5">
                                    {media.genres.map((genre) => (
                                        <span 
                                            key={genre.id} 
                                            className="liquid-glass-pill px-3 py-1 rounded-full text-xs font-bold text-white/90 tracking-wide uppercase shadow-sm cursor-default"
                                        >
                                            {genre.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Main Title */}
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05] drop-shadow-[0_4px_35px_rgba(0,0,0,0.95)] mb-3">
                                {title}
                            </h1>

                            {/* Tagline */}
                            {media.tagline && (
                                <p className="text-base sm:text-lg italic text-white/70 font-medium mb-5 drop-shadow-sm">
                                    &ldquo;{media.tagline}&rdquo;
                                </p>
                            )}

                            {/* Action Buttons Bar with Liquid Pearl & Crimson Styling */}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
                                {/* Liquid Primary Play Button */}
                                <Link
                                    href={playUrl}
                                    className="liquid-btn-primary flex items-center gap-2.5 px-8 sm:px-10 py-3.5 rounded-full font-black text-black text-sm sm:text-base group"
                                >
                                    <Play className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" />
                                    <span>Play</span>
                                </Link>

                                {/* Watchlist Liquid Toggle */}
                                <div className="flex items-center">
                                    <WatchlistButton item={media} variant="full" />
                                </div>

                                {/* Liquid Watch Together Button */}
                                <Link
                                    href={watchTogetherUrl}
                                    className="liquid-btn-accent flex items-center gap-2 text-white px-6 sm:px-8 py-3.5 rounded-full font-bold text-sm sm:text-base"
                                    title="Host a synchronized watch party"
                                >
                                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span>Watch Together</span>
                                </Link>

                                {/* Liquid Trailer Button */}
                                {trailerVideo && (
                                    <button
                                        onClick={() => setShowTrailerModal(true)}
                                        className="liquid-glass-pill flex items-center gap-2 text-white px-5 sm:px-6 py-3.5 rounded-full font-bold text-sm sm:text-base cursor-pointer"
                                    >
                                        <Film className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                                        <span>Trailer</span>
                                    </button>
                                )}
                            </div>

                            {/* Liquid Glass Metadata Badges Row */}
                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-6 text-xs sm:text-sm font-bold">
                                {/* Year */}
                                {releaseYear && (
                                    <span className="liquid-glass-pill px-3 py-1 rounded-xl text-white/90">
                                        {releaseYear}
                                    </span>
                                )}

                                {/* Runtime */}
                                <span className="liquid-glass-pill px-3 py-1 rounded-xl text-white/90 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-white/60" />
                                    {formattedRuntime}
                                </span>

                                {/* Quality Liquid Badge */}
                                <span className="liquid-glass-pill px-3 py-1 rounded-xl text-cyan-300 font-black tracking-wider border-cyan-400/30">
                                    1080p FHD
                                </span>

                                {/* Content Rating Certificate */}
                                {omdb?.Rated && omdb.Rated !== 'N/A' && (
                                    <span className="liquid-glass-pill px-2.5 py-1 rounded-xl text-white/90 uppercase">
                                        {omdb.Rated}
                                    </span>
                                )}

                                {/* Authentic IMDb Liquid Capsule */}
                                {(omdb?.imdbRating && omdb.imdbRating !== 'N/A') ? (
                                    <div className="liquid-glass-pill px-3 py-1 rounded-xl bg-gradient-to-r from-[#f5c518]/30 to-[#f5c518]/15 text-[#f5c518] border-[#f5c518]/40 font-black flex items-center gap-1.5 shadow-sm">
                                        <span className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded text-[10px] font-black">IMDb</span>
                                        <span>{omdb.imdbRating}</span>
                                        {omdb.imdbVotes && omdb.imdbVotes !== 'N/A' && (
                                            <span className="text-white/60 text-[11px] font-medium">({omdb.imdbVotes})</span>
                                        )}
                                    </div>
                                ) : (
                                    media.vote_average > 0 && (
                                        <div className="liquid-glass-pill px-3 py-1 rounded-xl text-[#f5c518] border-[#f5c518]/40 font-black flex items-center gap-1.5">
                                            <span className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded text-[10px] font-black">IMDb</span>
                                            <span>{media.vote_average.toFixed(1)}</span>
                                        </div>
                                    )
                                )}

                                {/* TMDB Star Liquid Capsule */}
                                {media.vote_average > 0 && (
                                    <div className="liquid-glass-pill px-3 py-1 rounded-xl text-yellow-400 flex items-center gap-1.5">
                                        <Star className="w-3.5 h-3.5 fill-yellow-400" />
                                        <span className="text-white font-black">{media.vote_average.toFixed(1)}</span>
                                        <span className="text-white/40 text-[11px] font-semibold">TMDB</span>
                                    </div>
                                )}
                            </div>

                            {/* Synopsis / Overview */}
                            <p className="text-white/85 text-sm sm:text-base leading-relaxed max-w-3xl font-medium mb-2 drop-shadow-sm">
                                {media.overview || 'No synopsis available for this title.'}
                            </p>
                        </div>

                        {/* RIGHT COLUMN: PURE LIQUID GLASS INFO SLATE (Matches user screenshot) */}
                        <div className="lg:col-span-4 w-full">
                            <div 
                                ref={panelRef}
                                onMouseMove={handlePanelMouseMove}
                                onMouseLeave={handlePanelMouseLeave}
                                className="liquid-glass-panel rounded-[2rem] p-6 sm:p-7 overflow-hidden transition-all duration-300"
                            >
                                {/* Dynamic Interactive Specular Spotlight tracking mouse */}
                                {spotlightPos.active && (
                                    <div 
                                        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                                        style={{
                                            background: `radial-gradient(350px circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(255, 255, 255, 0.18), transparent 70%)`
                                        }}
                                    />
                                )}

                                {/* Subtle Prismatic Rim Indicator */}
                                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-cyan-400 to-accent animate-pulse" />
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                                        Media Overview
                                    </span>
                                </div>

                                <div className="space-y-3.5 text-sm font-semibold relative z-10">
                                    {/* Runtime */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/[0.07]">
                                        <span className="text-white/50">Runtime</span>
                                        <span className="text-white font-bold">{formattedRuntime}</span>
                                    </div>

                                    {/* Language */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/[0.07]">
                                        <span className="text-white/50">Language</span>
                                        <span className="text-white">{formattedLanguage}</span>
                                    </div>

                                    {/* Release Date */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/[0.07]">
                                        <span className="text-white/50">Release Date</span>
                                        <span className="text-white">{formattedReleaseDate}</span>
                                    </div>

                                    {/* Quality */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/[0.07]">
                                        <span className="text-white/50">Quality</span>
                                        <span className="text-cyan-400 font-extrabold tracking-wide drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                                            1080p FHD
                                        </span>
                                    </div>

                                    {/* Director / Creator */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/[0.07]">
                                        <span className="text-white/50">{type === 'tv' ? 'Creator' : 'Director'}</span>
                                        <span className="text-white text-right max-w-[60%] truncate font-medium">
                                            {directorName}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    {media.status && (
                                        <div className="flex items-center justify-between py-2 border-b border-white/[0.07]">
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
            <div className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 w-full py-12 space-y-14">

                {/* 1. CAST SECTION (Liquid Glass Droplet Lenses) */}
                {castMembers.length > 0 && (
                    <section className="w-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-[3px] h-6 bg-accent rounded-full shadow-[0_0_12px_rgba(229,9,20,0.8)]" />
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Cast & Stars</h2>
                            </div>
                            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                                Click an actor to explore filmography
                            </span>
                        </div>

                        {/* Circular Cast Scroller with Liquid Lens Avatars */}
                        <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none scroll-smooth">
                            {castMembers.map((actor) => (
                                <Link
                                    key={actor.id}
                                    href={`/person/${actor.id}`}
                                    className="group flex flex-col items-center flex-shrink-0 w-24 sm:w-28 text-center"
                                    title={`View all movies & shows with ${actor.name}`}
                                >
                                    {/* Liquid Glass Droplet Lens Avatar */}
                                    <div className="liquid-lens-avatar relative w-20 h-20 sm:w-24 sm:h-24 bg-white/5 mb-3 cursor-pointer">
                                        {actor.profile_path ? (
                                            <Image
                                                src={getImageUrl(actor.profile_path, 'w185')}
                                                alt={actor.name}
                                                fill
                                                sizes="96px"
                                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold text-white/40 text-sm bg-black/60">
                                                {actor.name.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actor Name */}
                                    <span className="text-xs sm:text-sm font-bold text-white group-hover:text-accent transition-colors line-clamp-1 w-full">
                                        {actor.name}
                                    </span>
                                    {/* Character Tag */}
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
                    <section className="w-full liquid-glass-panel rounded-[2rem] p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-[3px] h-6 bg-accent rounded-full shadow-[0_0_12px_rgba(229,9,20,0.8)]" />
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Episodes</h2>
                            </div>

                            {/* Liquid Glass Season Selector */}
                            <div className="relative inline-block">
                                <select
                                    value={selectedSeason}
                                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                                    className="liquid-glass-pill appearance-none text-white font-bold text-sm px-5 py-2.5 pr-10 rounded-2xl focus:outline-none focus:border-accent cursor-pointer"
                                >
                                    {media.seasons
                                        .filter(s => s.season_number > 0)
                                        .map(s => (
                                            <option key={s.id} value={s.season_number} className="bg-[#101014] text-white">
                                                {s.name || `Season ${s.season_number}`} ({s.episode_count} Episodes)
                                            </option>
                                        ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-white/60 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Liquid Episode Cards Grid */}
                        {loadingEpisodes ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(n => (
                                    <div key={n} className="h-48 rounded-2xl liquid-glass-card animate-pulse" />
                                ))}
                            </div>
                        ) : episodes.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {episodes.map((ep) => (
                                    <Link
                                        key={ep.id}
                                        href={`/watch/tv/${media.id}?s=${selectedSeason}&e=${ep.episode_number}`}
                                        className="liquid-glass-card group relative flex flex-col rounded-2xl overflow-hidden p-3.5"
                                    >
                                        {/* Episode Still / Thumbnail */}
                                        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/50 mb-3 shadow-inner">
                                            {ep.still_path ? (
                                                <Image
                                                    src={getImageUrl(ep.still_path, 'w500')}
                                                    alt={ep.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, 300px"
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                                                    No Preview
                                                </div>
                                            )}

                                            {/* Hover Play Icon Overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-11 h-11 rounded-full liquid-btn-accent text-white flex items-center justify-center shadow-lg">
                                                    <Play className="w-4 h-4 fill-white ml-0.5" />
                                                </div>
                                            </div>

                                            {/* Episode Badge */}
                                            <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-lg liquid-glass-pill text-[11px] font-black text-white">
                                                EP {ep.episode_number}
                                            </span>

                                            {ep.runtime > 0 && (
                                                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg liquid-glass-pill text-[10px] font-bold text-white/80">
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

                {/* 3. OFFICIAL TRAILER EMBED / PREVIEW CARD (Liquid Glass Slab) */}
                {trailerVideo && (
                    <section className="w-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-[3px] h-6 bg-accent rounded-full shadow-[0_0_12px_rgba(229,9,20,0.8)]" />
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Official Trailer</h2>
                        </div>

                        <div className="liquid-glass-panel rounded-[2rem] p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                            {/* Trailer Preview Frame */}
                            <div 
                                onClick={() => setShowTrailerModal(true)}
                                className="lg:col-span-6 relative aspect-video rounded-2xl overflow-hidden cursor-pointer group shadow-2xl border border-white/20"
                            >
                                <Image
                                    src={`https://img.youtube.com/vi/${trailerVideo.key}/maxresdefault.jpg`}
                                    alt={trailerVideo.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full liquid-btn-accent text-white flex items-center justify-center shadow-[0_0_35px_rgba(229,9,20,0.8)] group-hover:scale-110 transition-transform">
                                        <Play className="w-7 h-7 fill-white ml-1" />
                                    </div>
                                </div>
                                <span className="absolute bottom-3 right-3 px-3 py-1 rounded-xl liquid-glass-pill text-xs font-bold text-white">
                                    YouTube
                                </span>
                            </div>

                            {/* Trailer Text & Details */}
                            <div className="lg:col-span-6 flex flex-col justify-center space-y-4">
                                <span className="text-xs font-black text-accent uppercase tracking-widest">
                                    Preview Trailer
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                                    {trailerVideo.name || `Trailer: ${title}`}
                                </h3>
                                <p className="text-sm text-white/70 leading-relaxed font-medium">
                                    Watch the high-definition trailer, audio score, and scene previews for {title} before diving into the complete title.
                                </p>
                                <div className="flex items-center gap-4 pt-2">
                                    <button
                                        onClick={() => setShowTrailerModal(true)}
                                        className="liquid-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-black text-sm cursor-pointer"
                                    >
                                        <Play className="w-4 h-4 fill-black" />
                                        Watch Trailer
                                    </button>
                                    <a
                                        href={`https://www.youtube.com/watch?v=${trailerVideo.key}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white transition-colors"
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
                            <div className="w-[3px] h-6 bg-accent rounded-full shadow-[0_0_12px_rgba(229,9,20,0.8)]" />
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Community & Critic Reviews</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {reviews.map((rev) => (
                                <div 
                                    key={rev.id} 
                                    className="liquid-glass-card rounded-2xl p-5 flex flex-col"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full liquid-glass-pill text-accent font-black flex items-center justify-center text-sm border-accent/40">
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
                                            <div className="liquid-glass-pill flex items-center gap-1 px-2.5 py-1 rounded-xl text-yellow-400 font-bold text-xs border-yellow-400/30">
                                                <Star className="w-3 h-3 fill-yellow-400" />
                                                <span>{rev.author_details.rating}/10</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-white/75 line-clamp-4 leading-relaxed italic">
                                        &ldquo;{rev.content}&rdquo;
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 5. "YOU MIGHT ALSO LIKE" (Liquid Glass Grid) */}
                {recommendations.length > 0 && (
                    <section className="w-full pt-4">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-[3px] h-6 bg-accent rounded-full shadow-[0_0_12px_rgba(229,9,20,0.8)]" />
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">You Might Also Like</h2>
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
                                        <div className="liquid-glass-card relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#101014] shadow-md group-hover:scale-[1.04]">
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
                                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg liquid-glass-pill text-[10px] font-black text-white">
                                                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                                    <span>{rec.vote_average.toFixed(1)}</span>
                                                </div>
                                            )}

                                            {/* Center play icon on hover */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full liquid-btn-accent text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
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

            {/* TRAILER POPUP MODAL (Liquid Glass Window) */}
            {showTrailerModal && trailerVideo && (
                <div 
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-fade-in"
                    onClick={() => setShowTrailerModal(false)}
                >
                    <div 
                        className="liquid-glass-panel relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowTrailerModal(false)}
                            className="absolute top-4 right-4 z-10 p-2.5 rounded-full liquid-glass-pill text-white hover:text-white transition-all cursor-pointer"
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
        <div className="min-h-screen bg-[#070709] text-white flex flex-col">
            <Navbar />
            <div className="relative w-full min-h-[85vh] bg-[#0c0c10] animate-pulse flex items-end p-6 sm:p-12">
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
