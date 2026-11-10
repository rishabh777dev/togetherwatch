// Video Source Configuration
// Defines verified, working streaming sources with active embed permissions

export interface VideoSource {
    id: string;
    name: string;
    description: string;
    features: string[];
    icon: string; // Emoji icon
    isAnime?: boolean;
    getEmbedUrl: (
        mediaType: 'movie' | 'tv',
        tmdbId: string,
        imdbId?: string,
        season?: number,
        episode?: number
    ) => string;
}

const GD_KEY = process.env.NEXT_PUBLIC_GD_KEY || 'e11a7debaaa4f5d25b671706ffe4d2acb56efbd4';

export const videoSources: VideoSource[] = [
    {
        id: 'vidlink',
        name: 'VidLink PRO',
        description: 'Premium auto-syncing player with high speed streams',
        features: ['Auto-Sync', 'HD', 'Fast'],
        icon: '⚡',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=E50914&autoplay=false`
                : `https://vidlink.pro/movie/${tmdbId}?primaryColor=E50914&autoplay=false`;
        }
    },
    {
        id: 'vidrift',
        name: 'Vidrift',
        description: 'Adaptive HLS player with subtitles and anime support',
        features: ['Anime/HD', 'Subtitles', 'HLS'],
        icon: '🌊',
        isAnime: true,
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://embed.vidrift.net/embed/tv/${tmdbId}/${season}/${episode}`
                : `https://embed.vidrift.net/embed/movie/${tmdbId}`;
        }
    },
    {
        id: 'vidout',
        name: 'VIDOUT (Multi)',
        description: 'Multi-Audio cloud player hosted on high-speed CDN',
        features: ['Multi-Audio', 'Cloudflare', 'HD'],
        icon: '🎧',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidout.pages.dev/tv/${tmdbId}/${season}/${episode}`
                : `https://vidout.pages.dev/movie/${imdbId || tmdbId}`;
        }
    },
    {
        id: 'autoembed',
        name: 'AutoEmbed',
        description: 'Verified high-speed player supporting Anime, Movies & Series',
        features: ['Anime/HD', 'Subtitles', 'Fast'],
        icon: '🌸',
        isAnime: true,
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}`
                : `https://autoembed.co/movie/tmdb/${tmdbId}`;
        }
    },
    {
        id: 'twoembedskin',
        name: '2Embed Skin',
        description: 'Verified fast player with complete anime & TV episode mirrors',
        features: ['Anime/HD', 'Clean', 'Fast'],
        icon: '📺',
        isAnime: true,
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://www.2embed.skin/embedtv/${tmdbId}&s=${season}&e=${episode}`
                : `https://www.2embed.skin/embed/${tmdbId}`;
        }
    },
    {
        id: 'vidbolt',
        name: 'VidBolt',
        description: 'Clean, lightweight player with instant bufferless playback',
        features: ['Ultra-Fast', 'HD', 'Clean'],
        icon: '⚡',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidbolt.xyz/tv/${tmdbId}/${season}/${episode}`
                : `https://vidbolt.xyz/movie/${tmdbId}`;
        }
    },
    {
        id: 'filmu',
        name: 'Filmu (Vidly)',
        description: 'Stable player engine with multiple fallback mirrors',
        features: ['Multi-mirrors', 'HD', 'Subs'],
        icon: '🎬',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidly.pro/tv/${tmdbId}/${season}/${episode}`
                : `https://vidly.pro/movie/${tmdbId}`;
        }
    },
    {
        id: 'gdmirror',
        name: 'GD Mirror (G-Drive)',
        description: 'Google Drive cloud mirror featuring high speeds and dual audio',
        features: ['G-Drive', 'Hindi/Multi', 'Fast'],
        icon: '📂',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://streams.iqsmartgames.com/embed/tv/${tmdbId}/${season}/${episode}?key=${GD_KEY}`
                : `https://streams.iqsmartgames.com/embed/movie/${imdbId || tmdbId}?key=${GD_KEY}`;
        }
    },
    {
        id: 'cineverse',
        name: 'Cineverse',
        description: 'Multi-source stream engine with subtitles',
        features: ['Multi-Source', 'HD', 'Subs'],
        icon: '🍿',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://rozgarlelo.modiplay.xyz/embed/tmdb/tv?id=${tmdbId}&s=${season}&e=${episode}`
                : `https://rozgarlelo.modiplay.xyz/embed/tmdb/movie?id=${tmdbId}`;
        }
    },
    {
        id: 'vidsrcpm',
        name: 'VidSrc (PM)',
        description: 'Active, unblocked VidSrc high-speed mirror',
        features: ['VidSrc Mirror', 'HD', 'Fast'],
        icon: '🚀',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            const idParam = imdbId || tmdbId;
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidsrc.pm/embed/tv/${idParam}/${season}/${episode}`
                : `https://vidsrc.pm/embed/movie/${idParam}`;
        }
    }
];

// Get source by ID
export function getSourceById(id: string): VideoSource | undefined {
    return videoSources.find(source => source.id === id);
}

// Get default source
export function getDefaultSource(): VideoSource {
    return videoSources.find(s => s.id === 'vidlink') || videoSources[0];
}

// Get embed URL for a source
export function getEmbedUrl(
    sourceId: string,
    mediaType: 'movie' | 'tv',
    tmdbId: string | number,
    imdbId?: string,
    season?: number,
    episode?: number
): string {
    const source = getSourceById(sourceId) || getDefaultSource();
    return source.getEmbedUrl(mediaType, String(tmdbId), imdbId, season, episode);
}
