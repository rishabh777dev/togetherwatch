export interface ParsedRoomMedia {
    mediaId: string;
    season?: number;
    episode?: number;
}

export function encodeRoomMediaId(
    mediaId: string | number,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number
) {
    const normalizedMediaId = String(mediaId);

    if (mediaType !== 'tv') {
        return normalizedMediaId;
    }

    const safeSeason = season && season > 0 ? season : 1;
    const safeEpisode = episode && episode > 0 ? episode : 1;
    return `${normalizedMediaId}|${safeSeason}|${safeEpisode}`;
}

export function parseRoomMediaId(
    rawMediaId: string,
    mediaType: 'movie' | 'tv'
): ParsedRoomMedia {
    if (mediaType !== 'tv') {
        return { mediaId: rawMediaId };
    }

    const [mediaId, seasonValue, episodeValue] = rawMediaId.split('|');
    const season = Number(seasonValue);
    const episode = Number(episodeValue);

    return {
        mediaId,
        season: Number.isFinite(season) && season > 0 ? season : 1,
        episode: Number.isFinite(episode) && episode > 0 ? episode : 1,
    };
}
