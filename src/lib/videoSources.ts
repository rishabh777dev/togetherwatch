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
        mediaId: string,
        season?: number,
        episode?: number
    ) => string;
}

export const videoSources: VideoSource[] = [

    {
        id: 'vidlink',
        name: 'VidLink PRO',
        description: 'Premium auto-syncing player',
        features: ['Auto-Sync', 'HD', 'Fast'],
        icon: '⚡',
        getEmbedUrl: (mediaType, mediaId, season, episode) => {
            const idParam = String(mediaId);
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidlink.pro/tv/${idParam}/${season}/${episode}?primaryColor=E50914&autoplay=false`
                : `https://vidlink.pro/movie/${idParam}?primaryColor=E50914&autoplay=false`;
        }
    },
    {
        id: 'vidsrcme',
        name: 'VidSrc ME',
        description: 'VidSrc mirror (often bypasses blocks)',
        features: ['Backup', 'Alternative', 'HD'],
        icon: '🎬',
        getEmbedUrl: (mediaType, mediaId, season, episode) => {
            const isImdb = String(mediaId).startsWith('tt');
            const idParam = isImdb ? `imdb=${mediaId}` : `tmdb=${mediaId}`;
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
        icon: '🌍',
        getEmbedUrl: (mediaType, mediaId, season, episode) => {
            return mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidsrc.cc/v2/embed/tv/${mediaId}/${season}/${episode}`
                : `https://vidsrc.cc/v2/embed/${mediaType}/${mediaId}`;
        }
    },
    {
        id: 'superembed',
        name: 'SuperEmbed',
        description: 'Popular alternative with good quality',
        features: ['Fast', 'HD', 'Reliable'],
        icon: '🔄',
        getEmbedUrl: (mediaType, mediaId, season = 1, episode = 1) =>
            mediaType === 'movie'
                ? `https://multiembed.mov/directstream.php?video_id=${mediaId}`
                : `https://multiembed.mov/directstream.php?video_id=${mediaId}&s=${season}&e=${episode}`
    }
];

// Get source by ID
export function getSourceById(id: string): VideoSource | undefined {
    return videoSources.find(source => source.id === id);
}

// Get default source
export function getDefaultSource(): VideoSource {
    return videoSources.find(s => s.id === 'vidsrcme') || videoSources[0];
}

// Get embed URL for a source
export function getEmbedUrl(
    sourceId: string,
    mediaType: 'movie' | 'tv',
    mediaId: string,
    season?: number,
    episode?: number
): string {
    const source = getSourceById(sourceId) || getDefaultSource();
    return source.getEmbedUrl(mediaType, mediaId, season, episode);
}
