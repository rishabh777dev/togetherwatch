// Consumet API Integration for Anime Streaming
// Consumet provides direct streaming links from multiple anime sources

const CONSUMET_API = 'https://api.consumet.org';

export interface AnimeStreamingSource {
    url: string;
    quality: string;
    isM3U8: boolean;
}

export interface AnimeStreamingData {
    headers?: {
        Referer?: string;
    };
    sources: AnimeStreamingSource[];
    download?: string;
}

export interface AnimeEpisode {
    id: string;
    number: number;
    title: string;
    image?: string;
    description?: string;
}

export interface AnimeInfo {
    id: string;
    title: string;
    episodes: AnimeEpisode[];
    totalEpisodes: number;
}

/**
 * Get anime info and episodes from Consumet using AniList ID
 * Uses Next.js API route to avoid CORS issues
 */
export async function getAnimeInfo(anilistId: number): Promise<AnimeInfo | null> {
    try {
        const response = await fetch(
            `/api/anime/info/${anilistId}`
        );

        if (!response.ok) {
            console.error('Failed to fetch anime info from API');
            return null;
        }

        const data = await response.json();
        return {
            id: data.id,
            title: data.title?.english || data.title?.romaji || '',
            episodes: data.episodes || [],
            totalEpisodes: data.totalEpisodes || data.episodes?.length || 0
        };
    } catch (error) {
        console.error('Error fetching anime info:', error);
        return null;
    }
}

/**
 * Get streaming links for a specific episode
 * Uses Next.js API route to avoid CORS issues
 */
export async function getAnimeStreamingLinks(episodeId: string): Promise<AnimeStreamingData | null> {
    try {
        const response = await fetch(
            `/api/anime/watch/${encodeURIComponent(episodeId)}`
        );

        if (!response.ok) {
            console.error('Failed to fetch streaming links from API');
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching streaming links:', error);
        return null;
    }
}

/**
 * Search anime using Consumet (GogoAnime provider)
 */
export async function searchAnimeConsume(query: string): Promise<any[]> {
    try {
        const response = await fetch(
            `${CONSUMET_API}/meta/anilist/${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error searching anime via Consumet:', error);
        return [];
    }
}
