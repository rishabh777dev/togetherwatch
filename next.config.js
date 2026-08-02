/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // TMDB/CDN assets should load directly in the browser. In local dev,
        // the Next image optimizer can be blocked from outbound fetches.
        unoptimized: true,
        dangerouslyAllowSVG: false,
        contentDispositionType: 'attachment',
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'm.media-amazon.com',
            },
            {
                protocol: 'https',
                hostname: 'ia.media-imdb.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'image.tmdb.org',
            },
            {
                protocol: 'https',
                hostname: 's4.anilist.co',
            },
            {
                protocol: 'https',
                hostname: '*.anilist.co',
            },
        ],
    },
    async headers() {
        const securityHeaders = [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
            {
                key: 'Content-Security-Policy',
                value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: blob: https://image.tmdb.org https://m.media-amazon.com https://ia.media-imdb.com https://picsum.photos https://s4.anilist.co https://*.anilist.co",
                    "font-src 'self' data:",
                    "connect-src 'self' https://api.themoviedb.org https://www.omdbapi.com https://*.supabase.co wss://*.supabase.co https://api.consumet.org https://graphql.anilist.co",
                    "frame-src 'self' https://player.videasy.net https://*.videasy.net https://api.videasy.to https://*.videasy.to https://peachify.pro https://*.peachify.pro https://nhdapi.com https://*.nhdapi.com https://databasegdriveplayer.co https://*.databasegdriveplayer.co https://screenscape.me https://*.screenscape.me https://vidlink.pro https://*.vidlink.pro https://vidsrc.me https://*.vidsrc.me https://vidsrc.to https://*.vidsrc.to https://vidsrc.cc https://*.vidsrc.cc https://embed.su https://*.embed.su https://multiembed.mov https://*.multiembed.mov",
                    "media-src 'self' blob: https:",
                    "object-src 'none'",
                    "base-uri 'self'",
                    "form-action 'self'",
                    "frame-ancestors 'self'",
                ].join('; '),
            },
        ];

        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
        ];
    },
};

module.exports = nextConfig;
