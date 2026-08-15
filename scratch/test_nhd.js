const https = require('https');

const key = 'a577a492ba78cc40abab06b3e8be7b49ddd18056348fa897';
const tmdbId = 13916;
const season = 1;
const episode = 1;

const testUrls = [
    `https://nhdapi.com/embed/${key}/tv/${tmdbId}/${season}/${episode}`,
    `https://nhdapi.com/v/${key}/tv/${tmdbId}/${season}/${episode}`,
    `https://nhdapi.com/api/${key}/tv/${tmdbId}/${season}/${episode}`,
    `https://nhdapi.com/e/${key}/tv/${tmdbId}/${season}/${episode}`,
    `https://nhdapi.com/tv/${tmdbId}/${season}/${episode}?key=${key}`,
    `https://nhdapi.com/embed/tv/${tmdbId}/${season}/${episode}?key=${key}`,
    `https://nhdapi.com/embed/tv/${tmdbId}/${season}/${episode}?api_key=${key}`,
    `https://nhdapi.com/embed/tv/${tmdbId}/${season}/${episode}?token=${key}`
];

testUrls.forEach(url => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        console.log(`[${res.statusCode}] ${url}`);
    }).on('error', err => console.error('ERR', url, err.message));
});
