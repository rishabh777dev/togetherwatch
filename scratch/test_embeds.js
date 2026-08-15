const https = require('https');
const http = require('http');

const urls = [
    'https://autoembed.co/tv/tmdb/13916-1-1',
    'https://player.autoembed.cc/embed/tv/13916/1/1',
    'https://vidsrc.icu/embed/tv/13916/1/1',
    'https://vidsrc.pro/embed/tv/13916/1/1',
    'https://embed.smashystream.com/playere.php?tmdb=13916&season=1&episode=1',
    'https://rivestream.live/embed?type=tv&id=13916&s=1&e=1',
    'https://www.2embed.cc/embedtv/13916&s=1&e=1'
];

urls.forEach(url => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        console.log(res.statusCode, url, res.headers['x-frame-options'] || 'No X-Frame-Options');
    });
    req.on('error', err => console.error('Error', url, err.message));
});
