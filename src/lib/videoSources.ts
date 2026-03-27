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
        id: 'vidking',
        name: 'VidKing',
        description: 'Endless content video player',
        features: ['AutoPlay', 'Next Episode', 'Episode Selection'],
        icon: '👑',
        getEmbedUrl: (mediaType, mediaId, season, episode) =>
            mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://www.vidking.net/embed/tv/${mediaId}/${season}/${episode}?color=0dcaf0&autoPlay=true&nextEpisode=true&episodeSelector=true`
                : `https://www.vidking.net/embed/${mediaType}/${mediaId}?color=0dcaf0&autoPlay=true`
    },
    {
        id: 'vidsrc',
        name: 'VidSrc TO',
        description: 'Default server - Reliable English content',
        features: ['English', 'Subtitles', 'HD'],
        icon: '⭐',
        getEmbedUrl: (mediaType, mediaId, season, episode) =>
            mediaType === 'tv' && season !== undefined && episode !== undefined
                ? `https://vidsrc.to/embed/tv/${mediaId}/${season}/${episode}`
                : `https://vidsrc.to/embed/${mediaType}/${mediaId}`
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
    return videoSources[0]; // vidsrc
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
