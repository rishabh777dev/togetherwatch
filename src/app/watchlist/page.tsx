'use client';

import Navbar from '@/components/Navbar';
import WatchlistButton from '@/components/WatchlistButton';
import { useWatchlistStore } from '@/lib/store';
import { getImageUrl } from '@/lib/tmdb';
import { Bookmark, Film, Play, Star, Trash2, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function WatchlistPage() {
    const router = useRouter();
    const { items, clearWatchlist } = useWatchlistStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleWatchTogether = (e: React.MouseEvent, id: string, type: string) => {
        e.preventDefault();
        router.push(`/room/create?type=${type}&id=${id}`);
    };

    if (!mounted) {
        return (
            <main className="min-h-screen bg-bg-primary">
                <Navbar />
                <div className="pt-20 flex items-center justify-center h-[60vh]">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navbar />

            <div className="pt-20 pb-12">
                {/* Header */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <Bookmark className="w-8 h-8 text-accent" />
                                My Watchlist
                            </h1>
                            <p className="text-text-secondary mt-2">
                                {items.length} {items.length === 1 ? 'item' : 'items'} saved
                            </p>
                        </div>

                        {items.length > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm('Clear your entire watchlist?')) {
                                        clearWatchlist();
                                    }
                                }}
                                className="btn-ghost text-red-400 hover:text-red-300 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Empty State */}
                    {items.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-24 h-24 mx-auto mb-6 bg-bg-card rounded-full flex items-center justify-center">
                                <Film className="w-12 h-12 text-text-muted" />
                            </div>
                            <h2 className="text-2xl font-semibold mb-3">Your watchlist is empty</h2>
                            <p className="text-text-secondary mb-6 max-w-md mx-auto">
                                Start adding movies and TV shows to keep track of what you want to watch next.
                            </p>
                            <Link href="/browse" className="btn-primary inline-flex items-center gap-2">
                                Browse Content
                            </Link>
                        </div>
                    ) : (
                        /* Watchlist Grid */
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {items.map((item) => (
                                <div key={item.id} className="group">
                                    <Link href={`/watch/${item.media_type}/${item.id}`}>
                                        <div className="poster-card aspect-[2/3] relative">
                                            <Image
                                                src={getImageUrl(item.poster_path)}
                                                alt={item.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 300px"
                                                className="object-cover"
                                            />

                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent 
                                                          opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="badge">
                                                            {item.media_type === 'tv' ? 'TV' : 'Movie'}
                                                        </span>
                                                        {item.vote_average > 0 && (
                                                            <span className="flex items-center gap-1 text-xs text-yellow-400">
                                                                <Star className="w-3 h-3 fill-yellow-400" />
                                                                {item.vote_average.toFixed(1)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className="flex-1 bg-accent hover:bg-accent-light text-white text-xs 
                                                                       py-2 px-3 rounded-lg flex items-center justify-center gap-1">
                                                            <Play className="w-3 h-3" />
                                                            Watch
                                                        </span>
                                                        <button
                                                            onClick={(e) => handleWatchTogether(e, item.id, item.media_type)}
                                                            className="bg-white/20 hover:bg-white/30 text-white text-xs 
                                                                     py-2 px-3 rounded-lg flex items-center gap-1"
                                                        >
                                                            <Users className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Remove Button */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <WatchlistButton
                                                    item={{
                                                        id: item.id,
                                                        imdbID: item.imdbID,
                                                        title: item.title,
                                                        poster_path: item.poster_path,
                                                        media_type: item.media_type,
                                                        vote_average: item.vote_average,
                                                        release_date: item.release_date,
                                                    }}
                                                    variant="icon"
                                                />
                                            </div>
                                        </div>
                                    </Link>
                                    <h3 className="mt-2 text-sm font-medium truncate">{item.title}</h3>
                                    <p className="text-xs text-text-muted">
                                        {item.release_date?.split('-')[0] || 'N/A'}
                                        <span className="mx-1">•</span>
                                        Added {new Date(item.addedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
