import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'TogetherWatch - Watch Together, Feel Together',
    description: 'The premium social watching experience. Watch movies, series, and live sports together with friends in perfect sync.',
    keywords: 'watch together, sync watch, movie night, streaming, social watching',
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/logo.svg', type: 'image/svg+xml' }
        ],
        shortcut: '/favicon.ico',
        apple: '/icon.png',
    },
    openGraph: {
        title: 'TogetherWatch - Watch Together, Feel Together',
        description: 'The premium social watching experience. Watch movies, series, and live sports together with friends in perfect sync.',
        type: 'website',
    },
}

import AuthProvider from '@/components/AuthProvider';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="min-h-screen bg-night-800 text-text-primary antialiased" suppressHydrationWarning>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
