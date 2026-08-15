const https = require('https');

const tmdbId = 13916; // Overflow
const season = 1;
const episode = 1;

const sources = [
    { id: 'autoembedco', name: 'AutoEmbed.co', url: `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}` },
    { id: 'twoembedskin', name: '2Embed Skin', url: `https://www.2embed.skin/embedtv/${tmdbId}&s=${season}&e=${episode}` },
    { id: 'videasy', name: 'Videasy (Cineby)', url: `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}` },
    { id: 'vidlink', name: 'VidLink PRO', url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}` },
    { id: 'vidsrcto', name: 'VidSrc TO', url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}` },
    { id: 'vidsrcme', name: 'VidSrc ME', url: `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}` },
    { id: 'vidsrccc', name: 'VidSrc CC', url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}` },
    { id: 'vidsrcxyz', name: 'VidSrc XYZ', url: `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}` },
    { id: 'nhdapi', name: 'NHDAPI (Multi)', url: `https://nhdapi.com/embed/tv/${tmdbId}/${season}/${episode}` },
    { id: 'screenscape', name: 'Screenscape', url: `https://screenscape.me/embed?tmdb=${tmdbId}&s=${season}&e=${episode}` }
];

sources.forEach(s => {
    https.get(s.url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        console.log(`[${res.statusCode}] ${s.name}: ${s.url}`);
    }).on('error', err => {
        console.error(`[ERR] ${s.name}: ${err.message}`);
    });
});
