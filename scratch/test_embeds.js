const https = require('https');

const tmdbId = 13916; // Overflow
const season = 1;
const episode = 1;

const testSources = [
    { name: 'Vidbinge', url: `https://vidbinge.dev/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: 'VidSrc TO', url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: 'VidSrc ME', url: `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}` },
    { name: 'VidSrc CC', url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: 'VidSrc VIP', url: `https://vidsrc.vip/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: 'VidSrc IN', url: `https://vidsrc.in/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: 'VidSrc NET', url: `https://vidsrc.net/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: 'VidSrc XYZ', url: `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: '2Embed Skin', url: `https://www.2embed.skin/embedtv/${tmdbId}&s=${season}&e=${episode}` },
    { name: '2Embed Stream', url: `https://www.2embed.stream/embedtv/${tmdbId}&s=${season}&e=${episode}` },
    { name: 'Videasy', url: `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}` },
    { name: 'VidLink PRO', url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}` },
    { name: 'Embed.su', url: `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: 'AutoEmbed.co', url: `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}` },
    { name: 'SmashyStream', url: `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${season}&episode=${episode}` },
    { name: 'MultiEmbed', url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&s=${season}&e=${episode}` }
];

testSources.forEach(source => {
    https.get(source.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
        console.log(`[${res.statusCode}] ${source.name}: ${source.url} | X-Frame: ${res.headers['x-frame-options'] || 'NONE'}`);
    }).on('error', err => {
        console.error(`[ERR] ${source.name}: ${err.message}`);
    });
});
