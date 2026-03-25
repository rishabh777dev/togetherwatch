// OMDb API Configuration
const OMDB_API_KEY = '9bad6310';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

export interface Movie {
    id: number;
    imdbID: string;
    title: string;
    name?: string;
    poster_path: string;
    backdrop_path: string;
    overview: string;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: 'movie' | 'tv';
    genres?: { id: number; name: string }[];
    runtime?: number;
    seasons?: { id: number; season_number: number; name: string; episode_count: number }[];
}

export interface Episode {
    id: number;
    episode_number: number;
    name: string;
    overview: string;
    still_path: string;
    air_date: string;
    runtime: number;
}

interface OMDbResponse {
    Title: string;
    Year: string;
    Rated: string;
    Released: string;
    Runtime: string;
    Genre: string;
    Director: string;
    Writer: string;
    Actors: string;
    Plot: string;
    Language: string;
    Country: string;
    Awards: string;
    Poster: string;
    Ratings: { Source: string; Value: string }[];
    Metascore: string;
    imdbRating: string;
    imdbVotes: string;
    imdbID: string;
    Type: string;
    totalSeasons?: string;
    Response: string;
    Error?: string;
}

interface OMDbSearchResponse {
    Search: {
        Title: string;
        Year: string;
        imdbID: string;
        Type: string;
        Poster: string;
    }[];
    totalResults: string;
    Response: string;
}

// Trending/Latest IMDb IDs - Updated for 2025/2026 (for Hero Carousel)
const TRENDING_IMDB_IDS = [
    'tt16311594', // Superman (2025)
    'tt14513804', // Captain America: Brave New World (2025)
    'tt10676048', // Mickey 17 (2025)
    'tt1502397',  // F1 (2025) - Brad Pitt
    'tt9603212',  // Mission Impossible: The Final Reckoning (2025)
    'tt21361444', // Sinners (2025)
    'tt11866324', // Thunderbolts* (2025)
    'tt15710866', // The Fantastic Four: First Steps (2025)
];

// Latest Releases - Different 2024/2025 movies (no overlap with Trending)
const LATEST_RELEASES_IMDB_IDS = [
    'tt9218128',  // Gladiator II (2024)
    'tt6443346',  // Wicked (2024)
    'tt1684562',  // Moana 2 (2024)
    'tt6263850',  // Deadpool & Wolverine (2024)
    'tt22022452', // Inside Out 2 (2024)
    'tt14539740', // A Quiet Place: Day One (2024)
    'tt15239678', // Dune: Part Two (2024)
    'tt5433140',  // Fast X (2023)
];

// Popular Movies - Mix of 2023 hits and classics (no overlap)
const POPULAR_MOVIES_IMDB_IDS = [
    'tt15398776', // Oppenheimer (2023)
    'tt1517268',  // Barbie (2023)
    'tt9362722',  // Spider-Man: Across the Spider-Verse (2023)
    'tt10366206', // John Wick 4 (2023)
    'tt1745960',  // Top Gun: Maverick (2022)
    'tt0816692',  // Interstellar
    'tt1375666',  // Inception
    'tt0137523',  // Fight Club
];

// Popular TV Shows - Updated with current hits
const POPULAR_TV_IMDB_IDS = [
    'tt14688458', // Shogun (2024)
    'tt15384178', // Fallout (2024)
    'tt13406094', // The Last of Us
    'tt11198330', // House of the Dragon
    'tt13433812', // Wednesday
    'tt5180504',  // The Witcher
    'tt4574334',  // Stranger Things
    'tt7660850',  // Squid Game
];

// Top Rated - All-time classics (no overlap)
const TOP_RATED_IMDB_IDS = [
    'tt0111161', // Shawshank Redemption
    'tt0068646', // The Godfather
    'tt0071562', // Godfather Part II
    'tt0468569', // The Dark Knight
    'tt0050083', // 12 Angry Men
    'tt0108052', // Schindler's List
    'tt0167260', // LOTR Return of the King
    'tt0110912', // Pulp Fiction
];

// Convert OMDb response to our Movie format
function omdbToMovie(data: OMDbResponse, index: number): Movie {
    const rating = parseFloat(data.imdbRating) || 0;
    const isTV = data.Type === 'series';

    // Parse genres
    const genreNames = data.Genre ? data.Genre.split(', ') : [];
    const genres = genreNames.map((name, i) => ({ id: i + 1, name }));

    // Parse runtime
    const runtimeMatch = data.Runtime?.match(/(\d+)/);
    const runtime = runtimeMatch ? parseInt(runtimeMatch[1]) : 0;

    // Parse seasons for TV shows
    const totalSeasons = data.totalSeasons ? parseInt(data.totalSeasons) : 0;
    const seasons = Array.from({ length: totalSeasons }, (_, i) => ({
        id: i + 1,
        season_number: i + 1,
        name: `Season ${i + 1}`,
        episode_count: 10,
    }));

    return {
        id: index + 1,
        imdbID: data.imdbID,
        title: data.Title,
        name: data.Title,
        poster_path: data.Poster !== 'N/A' ? data.Poster : '',
        backdrop_path: data.Poster !== 'N/A' ? data.Poster : '',
        overview: data.Plot !== 'N/A' ? data.Plot : 'No description available.',
        vote_average: rating,
        release_date: data.Released !== 'N/A' ? data.Released : data.Year,
        first_air_date: isTV ? (data.Released !== 'N/A' ? data.Released : data.Year) : undefined,
        media_type: isTV ? 'tv' : 'movie',
        genres,
        runtime,
        seasons: isTV ? seasons : undefined,
    };
}

// Fetch single movie/TV from OMDb
async function fetchOMDb(imdbId: string): Promise<OMDbResponse | null> {
    try {
        const isServer = typeof window === 'undefined';
        const url = isServer
            ? `${OMDB_BASE_URL}/?i=${imdbId}&apikey=${OMDB_API_KEY}&plot=full`
            : `/api/omdb?i=${imdbId}&plot=full`;
        const res = await fetch(
            url,
            isServer ? { next: { revalidate: 86400 } } : undefined
        );
        const data = await res.json();
        if (data.Response === 'False') {
            console.error('OMDb error:', data.Error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

// Search OMDb
async function searchOMDb(query: string, type?: 'movie' | 'series'): Promise<OMDbSearchResponse | null> {
    try {
        const isServer = typeof window === 'undefined';
        const typeParam = type ? `&type=${type}` : '';
        const url = isServer
            ? `${OMDB_BASE_URL}/?s=${encodeURIComponent(query)}&apikey=${OMDB_API_KEY}${typeParam}`
            : `/api/omdb?s=${encodeURIComponent(query)}${typeParam}`;
        const res = await fetch(
            url,
            isServer ? { next: { revalidate: 3600 } } : undefined
        );
        const data = await res.json();
        if (data.Response === 'False') {
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

// Fetch multiple movies by IMDb IDs
async function fetchMultipleOMDb(imdbIds: string[]): Promise<Movie[]> {
    const promises = imdbIds.map(id => fetchOMDb(id));
    const results = await Promise.all(promises);
    return results
        .filter((r): r is OMDbResponse => r !== null)
        .map((data, index) => omdbToMovie(data, index));
}

// Helper to get image URLs
export const getImageUrl = (path: string | null, size?: string) => {
    if (!path || path === 'N/A') {
        // Inline SVG fallback - no network request needed
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23141414'/%3E%3Crect x='150' y='230' width='100' height='80' rx='8' fill='%236B6B6B'/%3E%3Ctext x='200' y='360' font-family='Arial' font-size='16' fill='%236B6B6B' text-anchor='middle'%3ENo Poster%3C/text%3E%3C/svg%3E`;
    }
    return path;
};

// Data fetching functions
export async function getTrending(): Promise<Movie[]> {
    return fetchMultipleOMDb(TRENDING_IMDB_IDS);
}

export async function getPopularMovies(): Promise<Movie[]> {
    return fetchMultipleOMDb(POPULAR_MOVIES_IMDB_IDS);
}

export async function getPopularTV(): Promise<Movie[]> {
    return fetchMultipleOMDb(POPULAR_TV_IMDB_IDS);
}

export async function getTopRatedMovies(): Promise<Movie[]> {
    return fetchMultipleOMDb(TOP_RATED_IMDB_IDS);
}

export async function getLatestReleases(): Promise<Movie[]> {
    return fetchMultipleOMDb(LATEST_RELEASES_IMDB_IDS);
}

export async function getMovieDetails(id: number | string): Promise<Movie | null> {
    // If it's an IMDb ID
    if (typeof id === 'string' && id.startsWith('tt')) {
        const data = await fetchOMDb(id);
        return data ? omdbToMovie(data, 0) : null;
    }

    // If it's our internal ID, search in known lists
    const allIds = [...TRENDING_IMDB_IDS, ...POPULAR_MOVIES_IMDB_IDS, ...TOP_RATED_IMDB_IDS];
    if (typeof id === 'number' && id <= allIds.length) {
        const imdbId = allIds[id - 1];
        const data = await fetchOMDb(imdbId);
        return data ? omdbToMovie(data, id - 1) : null;
    }

    return null;
}

export async function getTVDetails(id: number | string): Promise<Movie | null> {
    if (typeof id === 'string' && id.startsWith('tt')) {
        const data = await fetchOMDb(id);
        return data ? omdbToMovie(data, 0) : null;
    }

    if (typeof id === 'number' && id <= POPULAR_TV_IMDB_IDS.length) {
        const imdbId = POPULAR_TV_IMDB_IDS[id - 1];
        const data = await fetchOMDb(imdbId);
        return data ? omdbToMovie(data, id - 1) : null;
    }

    return null;
}

export async function getEpisodesForSeason(tvId: number | string, seasonNumber: number): Promise<Episode[]> {
    // Get the IMDb ID first
    let imdbId: string;

    if (typeof tvId === 'string' && tvId.startsWith('tt')) {
        imdbId = tvId;
    } else if (typeof tvId === 'number' && tvId <= POPULAR_TV_IMDB_IDS.length) {
        imdbId = POPULAR_TV_IMDB_IDS[tvId - 1];
    } else {
        // Return mock data as fallback
        return generateMockEpisodes(10);
    }

    try {
        // OMDb season endpoint: /?i=IMDB_ID&Season=N
        const isServer = typeof window === 'undefined';
        const url = isServer
            ? `${OMDB_BASE_URL}/?i=${imdbId}&Season=${seasonNumber}&apikey=${OMDB_API_KEY}`
            : `/api/omdb?i=${imdbId}&Season=${seasonNumber}`;
        const res = await fetch(
            url,
            isServer ? { next: { revalidate: 86400 } } : undefined
        );
        const data = await res.json();

        if (data.Response === 'False' || !data.Episodes) {
            return generateMockEpisodes(10);
        }

        // Map OMDb episode data to our format
        return data.Episodes.map((ep: {
            Title: string;
            Released: string;
            Episode: string;
            imdbRating: string;
            imdbID: string;
        }, index: number) => ({
            id: index + 1,
            episode_number: parseInt(ep.Episode) || index + 1,
            name: ep.Title || `Episode ${index + 1}`,
            overview: `Episode ${ep.Episode} of Season ${seasonNumber}`,
            still_path: '',
            air_date: ep.Released !== 'N/A' ? ep.Released : '',
            runtime: 45, // OMDb doesn't provide runtime per episode
            imdbRating: ep.imdbRating !== 'N/A' ? parseFloat(ep.imdbRating) : 0,
        }));
    } catch (error) {
        console.error('Error fetching episodes:', error);
        return generateMockEpisodes(10);
    }
}

// Helper to generate mock episodes as fallback
function generateMockEpisodes(count: number): Episode[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        episode_number: i + 1,
        name: `Episode ${i + 1}`,
        overview: 'Episode description coming soon...',
        still_path: '',
        air_date: '',
        runtime: 45,
    }));
}

export async function searchMulti(query: string): Promise<Movie[]> {
    const searchResult = await searchOMDb(query);
    if (!searchResult?.Search) return [];

    // Fetch full details for search results
    const imdbIds = searchResult.Search.slice(0, 8).map(r => r.imdbID);
    return fetchMultipleOMDb(imdbIds);
}

// vidsrc.to embed URL generator (supports both IMDb and TMDB IDs)
export const getEmbedUrl = (
    type: 'movie' | 'tv',
    id: number | string,
    season?: number,
    episode?: number
): string => {
    const baseUrl = 'https://vidsrc.to/embed';

    if (type === 'movie') {
        return `${baseUrl}/movie/${id}`;
    } else {
        if (season !== undefined && episode !== undefined) {
            return `${baseUrl}/tv/${id}/${season}/${episode}`;
        }
        return `${baseUrl}/tv/${id}`;
    }
};
