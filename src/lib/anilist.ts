// AniList GraphQL API Client
// Free anime metadata API with 500K+ anime entries

const ANILIST_API = 'https://graphql.anilist.co';

export interface Anime {
    id: number;
    title: {
        romaji: string;
        english: string | null;
        native: string;
    };
    coverImage: {
        large: string;
        medium: string;
        color: string | null;
    };
    bannerImage: string | null;
    description: string;
    genres: string[];
    averageScore: number | null;
    episodes: number | null;
    status: string;
    seasonYear: number | null;
    format: string;
}

export interface AnimeSearchResult {
    id: number;
    title: {
        romaji: string;
        english: string | null;
    };
    coverImage: {
        large: string;
        medium: string;
    };
    averageScore: number | null;
    episodes: number | null;
    format: string;
}

// Search anime by title
export async function searchAnime(query: string, page: number = 1, perPage: number = 20): Promise<AnimeSearchResult[]> {
    const graphqlQuery = `
        query ($search: String, $page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                    id
                    title {
                        romaji
                        english
                    }
                    coverImage {
                        large
                        medium
                    }
                    averageScore
                    episodes
                    format
                }
            }
        }
    `;

    const variables = {
        search: query,
        page,
        perPage
    };

    const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: graphqlQuery,
            variables
        })
    });

    const data = await response.json();
    return data.data.Page.media;
}

// Get popular/trending anime
export async function getTrendingAnime(page: number = 1, perPage: number = 20): Promise<AnimeSearchResult[]> {
    const graphqlQuery = `
        query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(type: ANIME, sort: TRENDING_DESC) {
                    id
                    title {
                        romaji
                        english
                    }
                    coverImage {
                        large
                        medium
                    }
                    averageScore
                    episodes
                    format
                }
            }
        }
    `;

    const variables = { page, perPage };

    const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: graphqlQuery,
            variables
        })
    });

    const data = await response.json();
    return data.data.Page.media;
}

// Get detailed anime information
export async function getAnimeDetails(id: number): Promise<Anime> {
    const graphqlQuery = `
        query ($id: Int) {
            Media(id: $id, type: ANIME) {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    large
                    medium
                    color
                }
                bannerImage
                description
                genres
                averageScore
                episodes
                status
                seasonYear
                format
            }
        }
    `;

    const variables = { id };

    const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: graphqlQuery,
            variables
        })
    });

    const data = await response.json();
    return data.data.Media;
}

// Get popular anime by season
export async function getSeasonalAnime(season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL', year: number, page: number = 1): Promise<AnimeSearchResult[]> {
    const graphqlQuery = `
        query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
                    id
                    title {
                        romaji
                        english
                    }
                    coverImage {
                        large
                        medium
                    }
                    averageScore
                    episodes
                    format
                }
            }
        }
    `;

    const variables = {
        season,
        year,
        page,
        perPage: 20
    };

    const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: graphqlQuery,
            variables
        })
    });

    const data = await response.json();
    return data.data.Page.media;
}
