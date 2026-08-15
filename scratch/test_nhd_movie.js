const https = require('https');

const key = 'a577a492ba78cc40abab06b3e8be7b49ddd18056348fa897';
const url = `https://nhdapi.com/movie/550?key=${key}`;

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    console.log(`[${res.statusCode}] NHD Movie URL: ${url}`);
}).on('error', err => console.error(err));
