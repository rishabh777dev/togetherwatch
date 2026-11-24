'use client';

import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import { getAnimeDetails } from '@/lib/anilist';
import { getPreferredServer, savePreferredServer, saveContinueWatchingItem, getContinueWatchingItem } from '@/lib/watchProgress';
import { ExternalLink, Loader2, Play } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
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

function AnimeWatchContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const animeId = params.id as string;

    const urlEp = searchParams.get('e') || searchParams.get('ep');

    const [anime, setAnime] = useState<AnimeDetails | null>(null);

    // Synchronous initial episode from URL param OR saved progress
    const [currentEpisode, setCurrentEpisode] = useState<number>(() => {
        if (urlEp && !isNaN(Number(urlEp))) return Number(urlEp);
        if (typeof window !== 'undefined') {
            const saved = getContinueWatchingItem(animeId, 'tv');
            if (saved?.episode) return saved.episode;
        }
        return 1;
    });

    const [selectedSource, setSelectedSource] = useState('vidrift');
    const [loading, setLoading] = useState(true);

    // Sync episode if URL changes
    useEffect(() => {
        if (urlEp && !isNaN(Number(urlEp))) {
            const ep = Number(urlEp);
            setCurrentEpisode(prev => (prev !== ep ? ep : prev));
        }
    }, [urlEp]);

    // Keep URL in sync on mount so refresh never loses episode
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentE = searchParams.get('e') || searchParams.get('ep');
            if (!currentE) {
                window.history.replaceState(null, '', `/watch/anime/${animeId}?e=${currentEpisode}`);
            }
        }
    }, [animeId, currentEpisode, searchParams]);

    useEffect(() => {
        const saved = getPreferredServer();
        if (saved) {
            setSelectedSource(saved);
        }
    }, []);

    const handleEpisodeChange = (epNum: number) => {
        setCurrentEpisode(epNum);
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `/watch/anime/${animeId}?e=${epNum}`);
        }
    };

    useEffect(() => {
        if (!anime) return;
        saveContinueWatchingItem({
            id: `anime:${animeId}:ep${currentEpisode}`,
            media_id: animeId,
            media_type: 'tv',
            title: anime.title.english || anime.title.romaji || 'Anime',
            poster_path: anime.coverImage?.large,
            backdrop_path: anime.coverImage?.large,
            season: 1,
            episode: currentEpisode,
            progress: 0,
            timestamp: 0,
            duration: 0,
            updated_at: new Date().toISOString()
        });
    }, [anime, currentEpisode, animeId]);

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
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!anime) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Anime Not Found</h2>
                    <p className="text-text-secondary">Could not find the requested anime.</p>
                </div>
            </div>
        );
    }

    const totalEpisodes = anime.episodes || 12;

    let embedUrl = '';
    if (selectedSource === 'vidrift') {
        embedUrl = `https://embed.vidrift.net/embed/anilist/${animeId}/${currentEpisode}`;
    } else if (selectedSource === 'autoembed') {
        embedUrl = `https://player.autoembed.cc/embed/tv/${animeId}/1/${currentEpisode}`;
    } else if (selectedSource === 'vidbolt') {
        embedUrl = `https://vidbolt.xyz/tv/${animeId}/1/${currentEpisode}`;
    } else if (selectedSource === 'vidlink') {
        embedUrl = `https://vidlink.pro/tv/${animeId}/1/${currentEpisode}`;
    } else if (selectedSource === 'vidout') {
        embedUrl = `https://vidout.pages.dev/tv/${animeId}/1/${currentEpisode}`;
    } else {
        embedUrl = `https://embed.vidrift.net/embed/anilist/${animeId}/${currentEpisode}`;
    }

    const sources = [
        { id: 'vidrift', name: 'Vidrift Anime', icon: '🌸', desc: 'Recommended (HLS & Auto-Next)' },
        { id: 'autoembed', name: 'AutoEmbed Anime', icon: '⚡', desc: 'Fast HD Mirror' },
        { id: 'vidbolt', name: 'VidBolt Anime', icon: '🍡', desc: 'Ultra HD' },
        { id: 'vidlink', name: 'VidLink PRO', icon: '🚀', desc: 'Ad-Free HD' },
        { id: 'vidout', name: 'VIDOUT', icon: '🎌', desc: 'Multi-Audio' },
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
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    </div>

                    {/* Source Selector */}
                    <div className="bg-bg-card rounded-xl p-4 mb-6">
                        <h3 className="text-sm font-semibold mb-3 text-text-secondary">📡 Video Source</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {sources.map((source) => (
                                <button
                                    key={source.id}
                                    onClick={() => {
                                        setSelectedSource(source.id);
                                        savePreferredServer(source.id);
                                    }}
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
                            onClick={() => handleEpisodeChange(Math.max(1, currentEpisode - 1))}
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
                            onClick={() => handleEpisodeChange(Math.min(totalEpisodes, currentEpisode + 1))}
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
                                    onClick={() => handleEpisodeChange(ep)}
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

export default function AnimeWatchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        }>
            <AnimeWatchContent />
        </Suspense>
    );
}
