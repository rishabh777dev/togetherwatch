'use client';

import Navbar from '@/components/Navbar';
import { getAnimeDetails } from '@/lib/anilist';
import { ExternalLink, Loader2, Play } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AnimeDetails {
    id: number;
    title: {
        romaji: string;
        english: string | null;
    };
    description: string;
    coverImage: {
        large: string;
    };
    episodes: number | null;
    format: string;
}

function sanitizeHtml(html: string): string {
    return html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '');
}

export default function AnimeWatchPage() {
    const params = useParams();
    const animeId = params.id as string;

    const [anime, setAnime] = useState<AnimeDetails | null>(null);
    const [currentEpisode, setCurrentEpisode] = useState(1);
    const [selectedSource, setSelectedSource] = useState('vidsrc');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadAnime() {
            try {
                const data = await getAnimeDetails(parseInt(animeId));
                setAnime(data);
            } catch (error) {
                console.error('Error loading anime:', error);
            } finally {
                setLoading(false);
            }
        }
        loadAnime();
    }, [animeId]);

    if (loading) {
        return (
            <main className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
                    <p className="text-text-secondary">Loading anime...</p>
                </div>
            </main>
        );
    }

    if (!anime) {
        return (
            <main className="min-h-screen bg-bg-primary">
                <Navbar />
                <div className="pt-20 text-center">
                    <h1 className="text-2xl font-bold">Anime not found</h1>
                </div>
            </main>
        );
    }

    const totalEpisodes = anime.episodes || 12;

    // Generate embed URL based on selected source
    let embedUrl = '';

    if (selectedSource === 'vidsrc') {
        embedUrl = `https://vidsrc.xyz/embed/anime/${animeId}/${currentEpisode}`;
    } else if (selectedSource === 'vidsrc-pro') {
        embedUrl = `https://vidsrc.pro/embed/anime/${animeId}/${currentEpisode}`;
    } else if (selectedSource === 'vidlink') {
        embedUrl = `https://vidlink.pro/anime/${animeId}?episode=${currentEpisode}`;
    } else if (selectedSource === '2anime') {
        const animeSlug = anime.title.romaji
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        embedUrl = `https://2anime.xyz/embed/${animeSlug}-episode-${currentEpisode}`;
    }

    const sources = [
        { id: 'vidsrc', name: 'VidSrc', icon: '⭐', desc: 'Recommended' },
        { id: 'vidsrc-pro', name: 'VidSrc Pro', icon: '🎬', desc: 'Alternative' },
        { id: 'vidlink', name: 'VidLink', icon: '🔗', desc: 'Backup' },
        { id: '2anime', name: '2Anime', icon: '🎌', desc: 'Direct' },
    ];

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navbar />

            <div className="pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Anime Info Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold mb-2">
                            {anime.title.english || anime.title.romaji}
                        </h1>
                        <div className="flex flex-wrap gap-3 text-text-secondary">
                            <span className="px-3 py-1 bg-bg-card rounded-lg text-sm">{anime.format}</span>
                            <span className="px-3 py-1 bg-bg-card rounded-lg text-sm">{totalEpisodes} Episodes</span>
                            <span className="px-3 py-1 bg-accent/20 text-accent rounded-lg text-sm font-semibold">
                                Episode {currentEpisode}
                            </span>
                        </div>
                    </div>

                    {/* Video Player */}
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-6 shadow-2xl">
                        <iframe
                            key={`${selectedSource}-${animeId}-ep-${currentEpisode}`}
                            src={embedUrl}
                            className="w-full h-full border-0"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        />
                    </div>

                    {/* Source Selector */}
                    <div className="bg-bg-card rounded-xl p-4 mb-6">
                        <h3 className="text-sm font-semibold mb-3 text-text-secondary">📡 Video Source</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {sources.map((source) => (
                                <button
                                    key={source.id}
                                    onClick={() => setSelectedSource(source.id)}
                                    className={`
                                        p-3 rounded-lg transition-all text-left
                                        ${selectedSource === source.id
                                            ? 'bg-accent text-white shadow-lg'
                                            : 'bg-bg-primary hover:bg-bg-hover'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{source.icon}</span>
                                        <span className="font-semibold text-sm">{source.name}</span>
                                    </div>
                                    <p className="text-xs opacity-75">{source.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Navigation */}
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={() => setCurrentEpisode(Math.max(1, currentEpisode - 1))}
                            disabled={currentEpisode === 1}
                            className="px-6 py-3 bg-bg-card hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                        >
                            ← Previous
                        </button>

                        <a
                            href={`https://anilist.co/anime/${animeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-bg-card hover:bg-bg-hover rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            AniList
                        </a>

                        <button
                            onClick={() => setCurrentEpisode(Math.min(totalEpisodes, currentEpisode + 1))}
                            disabled={currentEpisode === totalEpisodes}
                            className="px-6 py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors ml-auto"
                        >
                            Next →
                        </button>
                    </div>

                    {/* Episode Grid */}
                    <div className="bg-bg-card rounded-xl p-6 mb-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Play className="w-5 h-5 text-accent" />
                            Episodes
                        </h2>
                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-2">
                            {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                                <button
                                    key={ep}
                                    onClick={() => setCurrentEpisode(ep)}
                                    className={`
                                        py-3 px-2 rounded-lg font-semibold transition-all transform hover:scale-105
                                        ${currentEpisode === ep
                                            ? 'bg-accent text-white shadow-lg shadow-accent/50'
                                            : 'bg-bg-primary hover:bg-bg-hover text-text-primary'
                                        }
                                    `}
                                >
                                    {ep}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Anime Description */}
                    <div className="bg-bg-card rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-3">Synopsis</h2>
                        <div
                            className="text-text-secondary leading-relaxed"
                            dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(anime.description || 'No description available')
                            }}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
