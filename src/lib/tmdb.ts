// TMDB API Configuration
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'd480cb264b821fe21b77926d531f0969';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface Movie {
    id: number;
    imdbID?: string;
    title?: string;
    name?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    overview: string;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: 'movie' | 'tv';
    genres?: { id: number; name: string }[];
    runtime?: number;
    seasons?: { id: number; season_number: number; name: string; episode_count: number }[];
    credits?: {
        cast: { id: number; name: string; character: string; profile_path: string | null }[];
    };
    recommendations?: {
        results: Movie[];
    };
}

export interface Episode {
    id: number;
    episode_number: number;
    name: string;
    overview: string;
    still_path: string | null;
    air_date: string;
    runtime: number;
}

// Fetch helper
async function fetchTMDB(endpoint: string, params: Record<string, string> = {}) {
    const isServer = typeof window === 'undefined';
    
    const queryParams = new URLSearchParams({
        api_key: TMDB_API_KEY,
        ...params
    });

    const url = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;
    
    try {
        const res = await fetch(url, isServer ? { next: { revalidate: 3600 } } : undefined);
        if (!res.ok) {
            console.error(`TMDB error fetching ${endpoint}:`, res.statusText);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.error('Fetch error:', e);
        return null;
    }
}

// Image URL helper
export const getImageUrl = (path: string | null, size: string = 'original') => {
    if (!path) {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23141414'/%3E%3Crect x='150' y='230' width='100' height='80' rx='8' fill='%236B6B6B'/%3E%3Ctext x='200' y='360' font-family='Arial' font-size='16' fill='%236B6B6B' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E`;
    }
    // Size examples: 'w342', 'w500', 'w780', 'original'
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

// Data fetching functions
export async function getTrending(): Promise<Movie[]> {
    const data = await fetchTMDB('/trending/all/day');
    return data?.results || [];
}

export async function getPopularMovies(): Promise<Movie[]> {
    const data = await fetchTMDB('/movie/popular');
    return (data?.results || []).map((m: any) => ({ ...m, media_type: 'movie' }));
}

export async function getPopularTV(): Promise<Movie[]> {
    const data = await fetchTMDB('/tv/popular');
    return (data?.results || []).map((m: any) => ({ ...m, media_type: 'tv' }));
}

export async function getTopRatedMovies(): Promise<Movie[]> {
    const data = await fetchTMDB('/movie/top_rated');
    return (data?.results || []).map((m: any) => ({ ...m, media_type: 'movie' }));
}

export async function getLatestReleases(): Promise<Movie[]> {
    const data = await fetchTMDB('/movie/now_playing');
    return (data?.results || []).map((m: any) => ({ ...m, media_type: 'movie' }));
}

export async function getNetflixOriginals(): Promise<Movie[]> {
    const data = await fetchTMDB('/discover/tv', { with_networks: '213' });
    return (data?.results || []).map((m: any) => ({ ...m, media_type: 'tv' }));
}

export async function getMovieDetails(id: number | string): Promise<Movie | null> {
    const data = await fetchTMDB(`/movie/${id}`, { append_to_response: 'credits,recommendations' });
    if (!data) return null;
    return { ...data, media_type: 'movie', imdbID: data.imdb_id };
}

export async function getTVDetails(id: number | string): Promise<Movie | null> {
    const data = await fetchTMDB(`/tv/${id}`, { append_to_response: 'credits,recommendations,external_ids' });
    if (!data) return null;
    return { ...data, media_type: 'tv', imdbID: data.external_ids?.imdb_id };
}

export async function getEpisodesForSeason(tvId: number | string, seasonNumber: number): Promise<Episode[]> {
    const data = await fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`);
    if (!data || !data.episodes) return [];
    return data.episodes.map((ep: any) => ({
        id: ep.id,
        episode_number: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        still_path: ep.still_path,
        air_date: ep.air_date,
        runtime: ep.runtime || 0,
    }));
}

export async function searchMulti(query: string): Promise<Movie[]> {
    const data = await fetchTMDB('/search/multi', { query });
    if (!data || !data.results) return [];
    // Filter out people, only keep movies and tv
    return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
}
