'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { getImageUrl, getPersonDetails, getPersonCredits, PersonDetails, PersonCredit } from '@/lib/tmdb';
import { Calendar, Film, Heart, Loader2, MapPin, Play, Sparkles, Star, TrendingUp, Tv, User, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

type FilterTab = 'all' | 'movie' | 'tv';
type SortOption = 'popularity' | 'latest' | 'rating';

function PersonPageContent() {
    const params = useParams();
    const router = useRouter();
    const personId = params.id as string;

    const [person, setPerson] = useState<PersonDetails | null>(null);
    const [castCredits, setCastCredits] = useState<PersonCredit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [sortBy, setSortBy] = useState<SortOption>('popularity');
    const [isBioExpanded, setIsBioExpanded] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (!personId) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [personData, creditsData] = await Promise.all([
                    getPersonDetails(personId),
                    getPersonCredits(personId)
                ]);

                setPerson(personData);

                if (creditsData?.cast) {
                    // Deduplicate credits by id and media_type
                    const seen = new Set<string>();
                    const uniqueCast = creditsData.cast.filter(item => {
                        const mType = item.media_type || (item.title ? 'movie' : 'tv');
                        const key = `${mType}:${item.id}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    setCastCredits(uniqueCast);
                }
            } catch (error) {
                console.error('Error fetching person details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [personId]);

    // Calculate background artwork from their most popular title with a backdrop
    const heroBackdrop = useMemo(() => {
        const withBackdrop = castCredits.find(c => c.backdrop_path);
        return withBackdrop?.backdrop_path || null;
    }, [castCredits]);

    // Filter and sort the filmography
    const filteredCredits = useMemo(() => {
        let list = [...castCredits];

        // 1. Filter by tab
        if (activeTab === 'movie') {
            list = list.filter(item => item.media_type === 'movie' || (!item.media_type && item.title));
        } else if (activeTab === 'tv') {
            list = list.filter(item => item.media_type === 'tv' || (!item.media_type && item.name));
        }

        // 2. Sort
        if (sortBy === 'popularity') {
            list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        } else if (sortBy === 'latest') {
            list.sort((a, b) => {
                const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01').getTime();
                const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01').getTime();
                return dateB - dateA;
            });
        } else if (sortBy === 'rating') {
            list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        }

        return list;
    }, [castCredits, activeTab, sortBy]);

    // Counts
    const counts = useMemo(() => {
        const moviesCount = castCredits.filter(item => item.media_type === 'movie' || (!item.media_type && item.title)).length;
        const tvCount = castCredits.filter(item => item.media_type === 'tv' || (!item.media_type && item.name)).length;
        return {
            all: castCredits.length,
            movies: moviesCount,
            tv: tvCount
        };
    }, [castCredits]);

    // Age calculation
    const ageString = useMemo(() => {
        if (!person?.birthday) return null;
        const birthDate = new Date(person.birthday);
        const endDate = person.deathday ? new Date(person.deathday) : new Date();
        let age = endDate.getFullYear() - birthDate.getFullYear();
        const m = endDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
            age--;
        }
        const birthFormatted = birthDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return person.deathday ? `${birthFormatted} (Died at age ${age})` : `${birthFormatted} (Age ${age})`;
    }, [person]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-[#0b0b0b]">
                <Navbar />
                <div className="pt-24 flex items-center justify-center h-[75vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-white/60 text-xs font-bold uppercase tracking-widest animate-pulse">
                            Loading Actor Profile...
                        </span>
                    </div>
                </div>
            </main>
        );
    }

    if (!person) {
        return (
            <main className="min-h-screen bg-[#0b0b0b]">
                <Navbar />
                <div className="pt-24 flex flex-col items-center justify-center h-[70vh] text-center px-4">
                    <User className="w-16 h-16 text-white/30 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Actor Not Found</h2>
                    <p className="text-white/50 text-sm mb-6">Could not locate details for this actor or person.</p>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>
            </main>
        );
    }

    const initials = person.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0])
        .join('')
        .toUpperCase();

    const bioNeedsTruncate = person.biography && person.biography.length > 360;
    const displayedBio = isBioExpanded || !bioNeedsTruncate
        ? person.biography
        : person.biography.slice(0, 360) + '...';

    return (
        <main className="min-h-screen bg-[#0b0b0b] text-text-primary selection:bg-accent/30 selection:text-white relative overflow-x-hidden">
            <Navbar />

            {/* Dynamic Backdrop Background */}
            {heroBackdrop && (
                <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none transition-all duration-1000">
                    <div 
                        className="absolute inset-0 bg-cover bg-center scale-110 filter blur-[100px] opacity-20 brightness-50"
                        style={{ backgroundImage: `url(${getImageUrl(heroBackdrop, 'original')})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b0b]/80 via-[#0b0b0b]/95 to-[#0b0b0b]" />
                </div>
            )}

            {/* Content Container */}
            <div className="relative z-10 pt-20 sm:pt-24 px-4 sm:px-6 lg:px-12 max-w-[1700px] mx-auto pb-16">
                
                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                </button>

                {/* Actor Profile Hero Card */}
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-8 lg:p-10 shadow-2xl mb-10">
                    <div className="flex flex-col md:flex-row gap-6 lg:gap-10 items-start">
                        
                        {/* Profile Image */}
                        <div className="relative w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-2xl sm:rounded-3xl overflow-hidden shrink-0 bg-white/5 border border-white/15 shadow-2xl mx-auto md:mx-0">
                            {person.profile_path && !imageError ? (
                                <Image
                                    src={getImageUrl(person.profile_path, 'h632')}
                                    alt={person.name}
                                    fill
                                    priority
                                    sizes="(max-width: 640px) 150px, (max-width: 1024px) 180px, 220px"
                                    className="object-cover"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-black text-white/40 bg-black/50">
                                    {initials || '?'}
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5 mb-2">
                                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-accent text-white shadow-sm shadow-accent/30">
                                    {person.known_for_department || 'Actor'}
                                </span>
                                {person.popularity > 0 && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider text-yellow-400 bg-yellow-400/10 border border-yellow-400/20">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        Popularity: {person.popularity.toFixed(1)}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase text-white tracking-tight drop-shadow-md mb-3">
                                {person.name}
                            </h1>

                            {/* Birth & Origin Metadata */}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-white/60 mb-4 font-semibold uppercase tracking-wider">
                                {ageString && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-accent" />
                                        {ageString}
                                    </span>
                                )}
                                {person.place_of_birth && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-accent" />
                                        {person.place_of_birth}
                                    </span>
                                )}
                            </div>

                            {/* Biography */}
                            {person.biography ? (
                                <div className="mt-3">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40 mb-1.5">
                                        Biography
                                    </h4>
                                    <p className="text-white/70 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                                        {displayedBio}
                                    </p>
                                    {bioNeedsTruncate && (
                                        <button
                                            onClick={() => setIsBioExpanded(!isBioExpanded)}
                                            className="mt-2 text-xs font-bold text-accent hover:text-accent-light uppercase tracking-wider transition-colors"
                                        >
                                            {isBioExpanded ? 'Show Less' : 'Read Full Bio'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-white/40 text-xs italic mt-2">No biography available for this actor.</p>
                            )}

                            {/* Quick Stats Summary */}
                            <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-white/10">
                                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                                    <span className="text-xs font-bold text-white">{counts.all} Total Credits</span>
                                </div>
                                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <Film className="w-3.5 h-3.5 text-accent" />
                                    <span className="text-xs font-bold text-white">{counts.movies} Movies</span>
                                </div>
                                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <Tv className="w-3.5 h-3.5 text-accent" />
                                    <span className="text-xs font-bold text-white">{counts.tv} TV Shows</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filmography Section */}
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl">
                    
                    {/* Controls Bar: Category Tabs & Sort Filter */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight flex items-center gap-2.5">
                                <span className="w-1.5 h-6 bg-accent rounded-full"></span>
                                Filmography & Appearances
                            </h2>
                            <p className="text-xs font-medium text-white/50 mt-1">
                                Showing {filteredCredits.length} titles starring {person.name}
                            </p>
                        </div>

                        {/* Category Filter Tabs & Sort Picker */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Filter Tabs */}
                            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        activeTab === 'all'
                                            ? 'bg-accent text-white shadow-md shadow-accent/25'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    All ({counts.all})
                                </button>
                                <button
                                    onClick={() => setActiveTab('movie')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        activeTab === 'movie'
                                            ? 'bg-accent text-white shadow-md shadow-accent/25'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    Movies ({counts.movies})
                                </button>
                                <button
                                    onClick={() => setActiveTab('tv')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        activeTab === 'tv'
                                            ? 'bg-accent text-white shadow-md shadow-accent/25'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    TV ({counts.tv})
                                </button>
                            </div>

                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-white/80">
                                <span className="text-white/40 text-[10px]">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="bg-transparent text-white outline-none cursor-pointer font-bold text-xs"
                                >
                                    <option value="popularity" className="bg-[#111] text-white">Popularity</option>
                                    <option value="latest" className="bg-[#111] text-white">Latest Release</option>
                                    <option value="rating" className="bg-[#111] text-white">Top Rated</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Media Cards Grid */}
                    {filteredCredits.length === 0 ? (
                        <div className="py-16 text-center">
                            <Film className="w-12 h-12 text-white/20 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-white mb-1">No Titles Found</h3>
                            <p className="text-xs text-white/50">There are no records in this category for {person.name}.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
                            {filteredCredits.map((item, index) => {
                                const title = item.title || item.name || 'Untitled';
                                const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
                                const releaseDate = item.release_date || item.first_air_date;
                                const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;
                                const rating = item.vote_average && item.vote_average > 0 ? item.vote_average.toFixed(1) : null;

                                return (
                                    <Link
                                        key={`${mediaType}:${item.id}:${index}`}
                                        href={`/details/${mediaType}/${item.id}`}
                                        className="group flex flex-col cursor-pointer"
                                    >
                                        {/* Poster Image Container */}
                                        <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-accent/50 transition-all duration-300 shadow-lg group-hover:shadow-2xl group-hover:shadow-accent/20 group-hover:scale-[1.03]">
                                            {item.poster_path ? (
                                                <Image
                                                    src={getImageUrl(item.poster_path, 'w500')}
                                                    alt={title}
                                                    fill
                                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-black/60 text-white/40">
                                                    <Film className="w-8 h-8 mb-2 opacity-40" />
                                                    <span className="text-[10px] font-bold line-clamp-2">{title}</span>
                                                </div>
                                            )}

                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                                            {/* Top Badges */}
                                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-black/80 backdrop-blur-md text-white/90 border border-white/10">
                                                    {mediaType === 'tv' ? 'TV' : 'MOVIE'}
                                                </span>
                                            </div>

                                            {rating && (
                                                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-black/80 backdrop-blur-md text-yellow-400 border border-white/10">
                                                    <Star className="w-3 h-3 fill-yellow-400" />
                                                    {rating}
                                                </div>
                                            )}

                                            {/* Hover Play Button */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-[2px]">
                                                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white shadow-xl shadow-accent/50 group-hover:scale-110 transition-transform">
                                                    <Play className="w-5 h-5 fill-white ml-0.5" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Title, Year & Character info */}
                                        <div className="pt-2.5 px-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 text-[11px] text-white/40 mb-0.5 font-semibold">
                                                <span>{releaseYear || 'TBA'}</span>
                                            </div>
                                            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-accent transition-colors truncate">
                                                {title}
                                            </h3>
                                            {item.character && (
                                                <p className="text-[11px] text-white/50 truncate mt-0.5 font-medium">
                                                    as {item.character}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function PersonPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-[#0b0b0b]">
                <Navbar />
                <div className="pt-24 flex items-center justify-center h-[75vh]">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            </main>
        }>
            <PersonPageContent />
        </Suspense>
    );
}
