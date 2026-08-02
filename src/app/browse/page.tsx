'use client';

import Navbar from '@/components/Navbar';
import { AnimeSearchResult, getTrendingAnime, searchAnime } from '@/lib/anilist';
import { getImageUrl, getPopularMovies, getPopularTV, getTrending, Movie, searchMulti, discoverMedia } from '@/lib/tmdb';
import { Film, Grid, List, Loader2, Play, Search, Sparkles, Tv, Users, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

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
    { id: 'animation', name: 'Animation' },
    { id: 'family', name: 'Family' },
    { id: 'mystery', name: 'Mystery' },
];

const TMDB_GENRES: Record<string, { movie: string; tv: string }> = {
    action: { movie: '28', tv: '10759' },
    comedy: { movie: '35', tv: '35' },
    drama: { movie: '18', tv: '18' },
    horror: { movie: '27', tv: '27' },
    romance: { movie: '10749', tv: '10749' },
    'sci-fi': { movie: '878', tv: '10765' },
    thriller: { movie: '53', tv: '80' },
    animation: { movie: '16', tv: '16' },
    family: { movie: '10751', tv: '10751' },
    mystery: { movie: '9648', tv: '9648' },
};

const TMDB_PROVIDERS: Record<string, string> = {
    netflix: '8',
    'amazon-prime': '9',
    'disney-plus': '337',
    'apple-tv': '350',
    'jio-cinema': '220',
};

const mediaKey = (item: Movie) => `${item.media_type || 'movie'}:${item.imdbID || item.id}`;

function uniqueMedia(items: Movie[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = mediaKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function BrowseContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeFromUrl = searchParams.get('type') as MediaType | null;
    const genreFromUrl = searchParams.get('genre');
    const providerFromUrl = searchParams.get('provider');
    const queryFromUrl = searchParams.get('q');

    const [searchQuery, setSearchQuery] = useState(queryFromUrl || '');
    const [mediaType, setMediaType] = useState<MediaType>(typeFromUrl || 'all');
    const [genre, setGenre] = useState(genreFromUrl || 'all');
    const [provider, setProvider] = useState(providerFromUrl || 'all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    const [movies, setMovies] = useState<Movie[]>([]);
    const [tvShows, setTvShows] = useState<Movie[]>([]);
    const [animeList, setAnimeList] = useState<AnimeSearchResult[]>([]);
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [animeSearchResults, setAnimeSearchResults] = useState<AnimeSearchResult[]>([]);

    const observerTargetRef = useRef<HTMLDivElement>(null);

    // Sync state variables when search query parameters change
    useEffect(() => {
        setMediaType(typeFromUrl || 'all');
        setGenre(genreFromUrl || 'all');
        setProvider(providerFromUrl || 'all');
        setSearchQuery(queryFromUrl || '');
    }, [typeFromUrl, genreFromUrl, providerFromUrl, queryFromUrl]);

    // Load initial data based on current active filters
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            setIsLoading(true);
            setPage(1);
            setHasMore(true);

            try {
                if (genre !== 'all' || provider !== 'all') {
                    const paramsMovie: Record<string, string> = { page: '1' };
                    const paramsTV: Record<string, string> = { page: '1' };

                    if (provider !== 'all') {
                        const providerId = TMDB_PROVIDERS[provider];
                        if (providerId) {
                            paramsMovie.with_watch_providers = providerId;
                            paramsMovie.watch_region = 'US';
                            paramsTV.with_watch_providers = providerId;
                            paramsTV.watch_region = 'US';
                        }
                    }

                    if (genre !== 'all') {
                        const genreIds = TMDB_GENRES[genre];
                        if (genreIds) {
                            paramsMovie.with_genres = genreIds.movie;
                            paramsTV.with_genres = genreIds.tv;
                        }
                    }

                    const [discoveredMovies, discoveredTV] = await Promise.all([
                        discoverMedia('movie', paramsMovie),
                        discoverMedia('tv', paramsTV),
                    ]);

                    if (isMounted) {
                        setMovies(uniqueMedia(discoveredMovies));
                        setTvShows(uniqueMedia(discoveredTV));
                        setAnimeList([]);
                    }
                } else {
                    const [trending, popularMovies, popularTV, trendingAnime] = await Promise.all([
                        getTrending(1),
                        getPopularMovies(1),
                        getPopularTV(1),
                        getTrendingAnime(1),
                    ]);

                    if (isMounted) {
                        setMovies(uniqueMedia([...trending, ...popularMovies]));
                        setTvShows(uniqueMedia(popularTV));
                        setAnimeList(trendingAnime);
                    }
                }
            } catch (error) {
                console.error('Error loading browse data:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [genre, provider]);

    // Infinite Scroll: Load Next Page
    const loadMore = useCallback(async () => {
        if (isLoading || isLoadingMore || !hasMore || searchQuery.trim()) return;

        setIsLoadingMore(true);
        const nextPage = page + 1;

        try {
            if (genre !== 'all' || provider !== 'all') {
                const paramsMovie: Record<string, string> = { page: String(nextPage) };
                const paramsTV: Record<string, string> = { page: String(nextPage) };

                if (provider !== 'all') {
                    const providerId = TMDB_PROVIDERS[provider];
                    if (providerId) {
                        paramsMovie.with_watch_providers = providerId;
                        paramsMovie.watch_region = 'US';
                        paramsTV.with_watch_providers = providerId;
                        paramsTV.watch_region = 'US';
                    }
                }

                if (genre !== 'all') {
                    const genreIds = TMDB_GENRES[genre];
                    if (genreIds) {
                        paramsMovie.with_genres = genreIds.movie;
                        paramsTV.with_genres = genreIds.tv;
                    }
                }

                const [discoveredMovies, discoveredTV] = await Promise.all([
                    discoverMedia('movie', paramsMovie),
                    discoverMedia('tv', paramsTV),
                ]);

                const newMovies = discoveredMovies || [];
                const newTV = discoveredTV || [];

                if (newMovies.length === 0 && newTV.length === 0) {
                    setHasMore(false);
                } else {
                    setMovies((prev) => uniqueMedia([...prev, ...newMovies]));
                    setTvShows((prev) => uniqueMedia([...prev, ...newTV]));
                    setPage(nextPage);
                }
            } else {
                const [popularMovies, popularTV, trendingAnime] = await Promise.all([
                    getPopularMovies(nextPage),
                    getPopularTV(nextPage),
                    getTrendingAnime(nextPage),
                ]);

                const newMovies = popularMovies || [];
                const newTV = popularTV || [];
                const newAnime = trendingAnime || [];

                if (newMovies.length === 0 && newTV.length === 0 && newAnime.length === 0) {
                    setHasMore(false);
                } else {
                    setMovies((prev) => uniqueMedia([...prev, ...newMovies]));
                    setTvShows((prev) => uniqueMedia([...prev, ...newTV]));
                    setAnimeList((prev) => [...prev, ...newAnime]);
                    setPage(nextPage);
                }
            }
        } catch (error) {
            console.error('Error loading more items:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoading, isLoadingMore, hasMore, searchQuery, page, genre, provider]);

    // Attach IntersectionObserver for Endless Scroll
    useEffect(() => {
        const target = observerTargetRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoading && !isLoadingMore && hasMore && !searchQuery.trim()) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '300px' }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [isLoading, isLoadingMore, hasMore, searchQuery, loadMore]);

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
            return uniqueMedia(filtered);
        }

        if (mediaType === 'movie') return uniqueMedia(movies.filter(m => m.media_type !== 'tv'));
        if (mediaType === 'tv') return uniqueMedia(tvShows);
        if (mediaType === 'anime') return animeList;
        return uniqueMedia([...movies, ...tvShows]);
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
                                    onChange={(e) => {
                                        const newGenre = e.target.value;
                                        const params = new URLSearchParams(searchParams.toString());
                                        if (newGenre === 'all') {
                                            params.delete('genre');
                                        } else {
                                            params.set('genre', newGenre);
                                        }
                                        router.push(`/browse?${params.toString()}`);
                                    }}
                                    className="appearance-none px-4 py-2 pr-10 bg-bg-secondary border border-border rounded-xl 
                                             text-sm outline-none focus:border-accent cursor-pointer"
                                >
                                    {GENRES.map((g) => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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
                            <p className="text-text-secondary font-medium">
                                {searchQuery ? (
                                    <>Showing {displayContent.length} results for <span className="text-white">&quot;{searchQuery}&quot;</span></>
                                ) : (
                                    <>
                                        Showing {displayContent.length} titles
                                        {(genre !== 'all' || provider !== 'all') && (
                                            <>
                                                {' '}in{' '}
                                                <span className="text-accent capitalize font-semibold">
                                                    {[
                                                        genre !== 'all' ? `${genre}` : null,
                                                        provider !== 'all' ? `${provider.replace('-', ' ')}` : null
                                                    ].filter(Boolean).join(' on ')}
                                                </span>
                                            </>
                                        )}
                                    </>
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
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {mediaType === 'anime' ? (
                                        /* Anime Cards */
                                        (displayContent as AnimeSearchResult[]).map((anime, index) => (
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
                                                        priority={index < 6}
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
                                        (displayContent as Movie[]).map((item, index) => (
                                            <Link
                                                key={mediaKey(item)}
                                                href={`/watch/${item.media_type || 'movie'}/${item.imdbID || item.id}`}
                                                className="group"
                                            >
                                                <div className="poster-card aspect-[2/3] relative">
                                                    <Image
                                                        src={getImageUrl(item.poster_path)}
                                                        alt={item.title || item.name || ''}
                                                        fill
                                                        priority={index < 6}
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

                                {/* Infinite Scroll Loader Sentinel */}
                                <div ref={observerTargetRef} className="py-12 flex flex-col items-center justify-center min-h-[100px]">
                                    {isLoadingMore && (
                                        <div className="flex items-center gap-3 text-accent font-medium bg-bg-secondary px-6 py-3 rounded-full border border-border shadow-lg animate-pulse">
                                            <Loader2 className="w-5 h-5 animate-spin text-accent" />
                                            <span className="text-sm">Loading more titles...</span>
                                        </div>
                                    )}
                                </div>
                            </>
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
