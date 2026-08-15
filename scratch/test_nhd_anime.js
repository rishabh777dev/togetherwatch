const https = require('https');

const key = 'a577a492ba78cc40abab06b3e8be7b49ddd18056348fa897';
const tmdbId = 224483; // Sazanami Soushi ni Junketsu wo Sasagu

const testUrls = [
    `https://nhdapi.com/tv/${tmdbId}/1/1?key=${key}`,
    `https://nhdapi.com/embed/tv/${tmdbId}/1/1?key=${key}`,
    `https://nhdapi.com/v/${tmdbId}/1/1?key=${key}`,
    `https://nhdapi.com/api/v1/tv/${tmdbId}/1/1?key=${key}`
];

testUrls.forEach(url => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        console.log(`[${res.statusCode}] ${url}`);
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => console.log('Snippet:', body.slice(0, 150)));
    }).on('error', err => console.error('ERR', url, err.message));
});
