import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'TogetherWatch - Watch Together, Feel Together',
    description: 'The premium social watching experience. Watch movies, series, and live sports together with friends in perfect sync.',
    keywords: 'watch together, sync watch, movie night, streaming, social watching',
    openGraph: {
        title: 'TogetherWatch - Watch Together, Feel Together',
        description: 'The premium social watching experience. Watch movies, series, and live sports together with friends in perfect sync.',
        type: 'website',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="min-h-screen bg-night-800 text-text-primary antialiased" suppressHydrationWarning>
                {children}
            </body>
        </html>
    )
}
