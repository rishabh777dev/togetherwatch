import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import PWAProvider from '@/components/PWAProvider';
import InstallAppButton from '@/components/InstallAppButton';

export const viewport: Viewport = {
    themeColor: '#E50914',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export const metadata: Metadata = {
    title: 'TogetherWatch - Watch Together, Feel Together',
    description: 'The premium social watching experience. Watch movies, series, and live sports together with friends in perfect sync.',
    keywords: 'watch together, sync watch, movie night, streaming, social watching, pwa',
    manifest: '/manifest.json',
    applicationName: 'TogetherWatch',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'TogetherWatch',
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { url: '/logo.svg', type: 'image/svg+xml' }
        ],
        shortcut: '/favicon.ico',
        apple: [
            { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ],
    },
    openGraph: {
        title: 'TogetherWatch - Watch Together, Feel Together',
        description: 'The premium social watching experience. Watch movies, series, and live sports together with friends in perfect sync.',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="TogetherWatch" />
                <meta name="msapplication-TileColor" content="#0a0a0c" />
                <meta name="msapplication-TileImage" content="/icon-512.png" />
            </head>
            <body className="min-h-screen bg-night-800 text-text-primary antialiased" suppressHydrationWarning>
                <AuthProvider>
                    <PWAProvider>
                        {children}
                        <InstallAppButton variant="floating" />
                    </PWAProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
