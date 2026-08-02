// Video Source Configuration
// Defines available streaming sources for multi-language and quality options

export interface VideoSource {
    id: string;
    name: string;
    description: string;
    features: string[];
    icon: string; // Emoji icon
    getEmbedUrl: (
        mediaType: 'movie' | 'tv',
        tmdbId: string,
        imdbId?: string,
        season?: number,
        episode?: number
    ) => string;
}

export const videoSources: VideoSource[] = [
    {
        id: 'videasy',
        name: 'Videasy (Cineby)',
        description: 'Cineby premium engine with multiple mirrors (Yoru, Neon, Sage, Jett)',
        features: ['4K/HD', 'Subtitles', 'Multi-audio'],
        icon: '🍿',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            // Videasy uses strictly TMDB IDs
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`
                : `https://player.videasy.net/movie/${tmdbId}`;
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
                ? `https://databasegdriveplayer.co/player.php?type=series&tmdb=${tmdbId}&season=${season}&episode=${episode}`
                : `https://databasegdriveplayer.co/player.php?tmdb=${tmdbId}`;
        }
    },
    {
        id: 'screenscape',
        name: 'Screenscape',
        description: 'Hindi dubbed streams with clean ad-free playback options',
        features: ['Hindi Dub', 'HD', 'No-Ads'],
        icon: '🇮🇳',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://screenscape.me/embed?tmdb=${tmdbId}&s=${season}&e=${episode}`
                : `https://screenscape.me/embed?tmdb=${tmdbId}`;
        }
    },
    {
        id: 'peachify',
        name: 'Peachify (Hindi)',
        description: 'Dedicated server for Indian content and Hindi dubbed releases',
        features: ['Hindi Dub', 'Fast', 'HD'],
        icon: '🍑',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://peachify.pro/embed/tv/${tmdbId}/${season}/${episode}`
                : `https://peachify.pro/embed/movie/${tmdbId}`;
        }
    },
    {
        id: 'nhdapi',
        name: 'NHDAPI (Multi)',
        description: 'Universal streaming API with dual audio and subtitle options',
        features: ['Hindi Dub', 'Ad-Free', 'Subs'],
        icon: '🌍',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://nhdapi.com/embed/tv/${tmdbId}/${season}/${episode}`
                : `https://nhdapi.com/embed/movie/${tmdbId}`;
        }
    },
    {
        id: 'vidsrcto',
        name: 'VidSrc TO',
        description: 'Highly stable primary streaming server',
        features: ['Stable', 'HD', 'Fast'],
        icon: '🚀',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            const idParam = imdbId || tmdbId;
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidsrc.to/embed/tv/${idParam}/${season}/${episode}`
                : `https://vidsrc.to/embed/movie/${idParam}`;
        }
    },
    {
        id: 'vidlink',
        name: 'VidLink PRO',
        description: 'Premium auto-syncing player',
        features: ['Auto-Sync', 'HD', 'Fast'],
        icon: '⚡',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            // VidLink works strictly with TMDB IDs
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=E50914&autoplay=false`
                : `https://vidlink.pro/movie/${tmdbId}?primaryColor=E50914&autoplay=false`;
        }
    },
    {
        id: 'embedsu',
        name: 'Embed.su',
        description: 'Fast alternative with multiple mirrors',
        features: ['Clean', 'Multi-mirrors', 'HD'],
        icon: '💎',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            // Embed.su works best with TMDB ID
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
                : `https://embed.su/embed/movie/${tmdbId}`;
        }
    },
    {
        id: 'vidsrcme',
        name: 'VidSrc ME',
        description: 'VidSrc mirror (often bypasses blocks)',
        features: ['Backup', 'Alternative', 'HD'],
        icon: '🎬',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            const idParam = imdbId ? `imdb=${imdbId}` : `tmdb=${tmdbId}`;
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidsrc.me/embed/tv?${idParam}&season=${season}&episode=${episode}`
                : `https://vidsrc.me/embed/${mediaType}?${idParam}`;
        }
    },
    {
        id: 'vidsrccc',
        name: 'VidSrc CC',
        description: 'VidSrc with more language options',
        features: ['Hindi Dub', 'Multi-lang', 'Subs'],
        icon: '🔗',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season, episode) => {
            const idParam = imdbId || tmdbId;
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidsrc.cc/v2/embed/tv/${idParam}/${season}/${episode}`
                : `https://vidsrc.cc/v2/embed/${mediaType}/${idParam}`;
        }
    },
    {
        id: 'superembed',
        name: 'SuperEmbed',
        description: 'Popular alternative with good quality',
        features: ['Fast', 'HD', 'Reliable'],
        icon: '🔄',
        getEmbedUrl: (mediaType, tmdbId, imdbId, season = 1, episode = 1) =>
            mediaType === 'movie'
                ? `https://multiembed.mov/directstream.php?video_id=${tmdbId}`
                : `https://multiembed.mov/directstream.php?video_id=${tmdbId}&s=${season}&e=${episode}`
    }
];

// Get source by ID
export function getSourceById(id: string): VideoSource | undefined {
    return videoSources.find(source => source.id === id);
}

// Get default source
export function getDefaultSource(): VideoSource {
    return videoSources.find(s => s.id === 'videasy') || videoSources[0];
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
