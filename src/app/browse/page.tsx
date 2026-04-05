'use client';

import Navbar from '@/components/Navbar';
import { AnimeSearchResult, getTrendingAnime, searchAnime } from '@/lib/anilist';
import { getImageUrl, getPopularMovies, getPopularTV, getTrending, Movie, searchMulti } from '@/lib/tmdb';
import { ChevronDown, Film, Grid, List, Loader2, Play, Search, Sparkles, Tv, Users, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

type MediaType = 'all' | 'movie' | 'tv' | 'anime';
type ViewMode = 'grid' | 'list';

const GENRES = [
    { id: 'all', name: 'All Genres' },
    { id: 'action', name: 'Action' },
    { id: 'comedy', name: 'Comedy' },
    { id: 'drama', name: 'Drama' },
    { id: 'horror', name: 'Horror' },
    { id: 'romance', name: 'Romance' },
    { id: 'sci-fi', name: 'Sci-Fi' },
    { id: 'thriller', name: 'Thriller' },
];

function BrowseContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeFromUrl = searchParams.get('type') as MediaType | null;

    const [searchQuery, setSearchQuery] = useState('');
    const [mediaType, setMediaType] = useState<MediaType>(typeFromUrl || 'all');
    const [genre, setGenre] = useState('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [tvShows, setTvShows] = useState<Movie[]>([]);
    const [animeList, setAnimeList] = useState<AnimeSearchResult[]>([]);
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [animeSearchResults, setAnimeSearchResults] = useState<AnimeSearchResult[]>([]);

    // Update mediaType when URL changes
    useEffect(() => {
        if (typeFromUrl && (typeFromUrl === 'movie' || typeFromUrl === 'tv')) {
            setMediaType(typeFromUrl);
        }
    }, [typeFromUrl]);


    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [trending, popularMovies, popularTV, trendingAnime] = await Promise.all([
                    getTrending(),
                    getPopularMovies(),
                    getPopularTV(),
                    getTrendingAnime(),
                ]);
                const allMovies = [...trending, ...popularMovies];
                // Deduplicate by imdbID to avoid React key collisions
                const seen = new Set<string>();
                const uniqueMovies = allMovies.filter(m => {
                    const key = m.imdbID || String(m.id);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                setMovies(uniqueMovies);
                setTvShows(popularTV);
                setAnimeList(trendingAnime);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Search with debounce
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setAnimeSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            if (mediaType === 'anime') {
                const animeResults = await searchAnime(query);
                setAnimeSearchResults(animeResults);
            } else {
                const results = await searchMulti(query);
                setSearchResults(results);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    }, [mediaType]);

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    // Filter content based on type
    const getDisplayContent = (): Movie[] | AnimeSearchResult[] => {
        if (searchQuery.trim()) {
            if (mediaType === 'anime') {
                return animeSearchResults;
            }
            const filtered = searchResults.filter(item => {
                if (mediaType === 'all') return true;
                return item.media_type === mediaType;
            });
            return filtered;
        }

        if (mediaType === 'movie') return movies.filter(m => m.media_type !== 'tv');
        if (mediaType === 'tv') return tvShows;
        if (mediaType === 'anime') return animeList;
        return [...movies.slice(0, 10), ...tvShows.slice(0, 10)];
    };

    const displayContent = getDisplayContent();

    const handleWatchTogether = (e: React.MouseEvent, movie: Movie) => {
        e.preventDefault();
        e.stopPropagation();
        const id = movie.imdbID || movie.id;
        const type = movie.media_type || 'movie';
        router.push(`/room/create?type=${type}&id=${id}`);
    };

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navbar />

            <div className="pt-20 pb-12">
                {/* Hero Search Section */}
                <div className="relative py-12 px-4 bg-gradient-to-b from-accent/10 to-transparent">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Discover & Watch Together
                        </h1>
                        <p className="text-text-secondary mb-8">
                            Find movies, TV shows, and anime to enjoy with friends
                        </p>

                        {/* Search Bar */}
                        <div className="relative max-w-2xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search movies, TV shows, and anime..."
                                className="w-full pl-12 pr-12 py-4 bg-bg-secondary border border-border rounded-2xl 
                                         text-lg outline-none focus:border-accent transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-hover rounded-full"
                                >
                                    <X className="w-5 h-5 text-text-muted" />
                                </button>
                            )}
                            {isSearching && (
                                <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 text-accent animate-spin" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-4 py-6 border-b border-border">
                    <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {/* Type Filter */}
                            <div className="flex items-center bg-bg-secondary rounded-xl p-1">
                                <button
                                    onClick={() => setMediaType('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                              ${mediaType === 'all' ? 'bg-accent text-white' : 'hover:bg-bg-hover'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setMediaType('movie')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                                              ${mediaType === 'movie' ? 'bg-accent text-white' : 'hover:bg-bg-hover'}`}
                                >
                                    <Film className="w-4 h-4" />
                                    Movies
                                </button>
                                <button
                                    onClick={() => setMediaType('tv')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                                              ${mediaType === 'tv' ? 'bg-accent text-white' : 'hover:bg-bg-hover'}`}
                                >
                                    <Tv className="w-4 h-4" />
                                    TV Shows
                                </button>
                                <button
                                    onClick={() => setMediaType('anime')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                                              ${mediaType === 'anime' ? 'bg-accent text-white' : 'hover:bg-bg-hover'}`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Anime
                                </button>
                            </div>

                            {/* Genre Filter */}
                            <div className="relative">
                                <select
                                    value={genre}
                                    onChange={(e) => setGenre(e.target.value)}
                                    className="appearance-none px-4 py-2 pr-10 bg-bg-secondary border border-border rounded-xl 
                                             text-sm outline-none focus:border-accent cursor-pointer"
                                >
                                    {GENRES.map((g) => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-2 bg-bg-secondary rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-bg-hover' : ''}`}
                            >
                                <Grid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-bg-hover' : ''}`}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="px-4 py-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Results Count */}
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-text-secondary">
                                {searchQuery ? (
                                    <>Showing {displayContent.length} results for <span className="text-white">&quot;{searchQuery}&quot;</span></>
                                ) : (
                                    <>Showing {displayContent.length} titles</>
                                )}
                            </p>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-12 h-12 animate-spin text-accent" />
                            </div>
                        ) : displayContent.length === 0 ? (
                            <div className="text-center py-20">
                                <Film className="w-16 h-16 text-text-muted mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                                <p className="text-text-secondary">Try adjusting your search or filters</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* Grid View */
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {mediaType === 'anime' ? (
                                    /* Anime Cards */
                                    (displayContent as AnimeSearchResult[]).map((anime) => (
                                        <Link
                                            key={anime.id}
                                            href={`/watch/anime/${anime.id}`}
                                            className="group"
                                        >
                                            <div className="poster-card aspect-[2/3] relative">
                                                <Image
                                                    src={anime.coverImage.large}
                                                    alt={anime.title.english || anime.title.romaji}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, 300px"
                                                    className="object-cover"
                                                />

                                                {/* Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent 
                                                              opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="badge">
                                                                {anime.format || 'Anime'}
                                                            </span>
                                                            {anime.averageScore && (
                                                                <span className="text-xs text-yellow-400">
                                                                    Rating {(anime.averageScore / 10).toFixed(1)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="flex-1 bg-accent hover:bg-accent-light text-white text-xs 
                                                                           py-2 px-3 rounded-lg flex items-center justify-center gap-1">
                                                                <Play className="w-3 h-3" />
                                                                Watch
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <h3 className="mt-2 text-sm font-medium truncate">
                                                {anime.title.english || anime.title.romaji}
                                            </h3>
                                            <p className="text-xs text-text-muted">
                                                {anime.episodes ? `${anime.episodes} Episodes` : 'Ongoing'}
                                            </p>
                                        </Link>
                                    ))
                                ) : (
                                    /* Movie/TV Cards */
                                    (displayContent as Movie[]).map((item) => (
                                        <Link
                                            key={item.imdbID || item.id}
                                            href={`/watch/${item.media_type || 'movie'}/${item.imdbID || item.id}`}
                                            className="group"
                                        >
                                            <div className="poster-card aspect-[2/3] relative">
                                                <Image
                                                    src={getImageUrl(item.poster_path)}
                                                    alt={item.title || item.name || ''}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, 300px"
                                                    className="object-cover"
                                                />

                                                {/* Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent 
                                                              opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="badge">
                                                                {item.media_type === 'tv' ? 'TV' : 'Movie'}
                                                            </span>
                                                            {item.vote_average > 0 && (
                                                                <span className="text-xs text-yellow-400">
                                                                    Rating {item.vote_average.toFixed(1)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="flex-1 bg-accent hover:bg-accent-light text-white text-xs 
                                                                           py-2 px-3 rounded-lg flex items-center justify-center gap-1">
                                                                <Play className="w-3 h-3" />
                                                                Watch
                                                            </span>
                                                            <button
                                                                onClick={(e) => handleWatchTogether(e, item)}
                                                                className="bg-white/20 hover:bg-white/30 text-white text-xs 
                                                                         py-2 px-3 rounded-lg flex items-center gap-1">
                                                                <Users className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <h3 className="mt-2 text-sm font-medium truncate">
                                                {item.title || item.name}
                                            </h3>
                                            <p className="text-xs text-text-muted">
                                                {item.release_date ? new Date(item.release_date).getFullYear() : item.first_air_date ? new Date(item.first_air_date).getFullYear() : ''}
                                            </p>
                                        </Link>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* List View - Placeholder for now */
                            <div className="text-center py-20">
                                <p className="text-text-secondary">List view coming soon</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function BrowsePage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-bg-primary flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-accent" />
            </main>
        }>
            <BrowseContent />
        </Suspense>
    );
}
