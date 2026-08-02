'use client';

import { useWatchlistStore } from '@/lib/store';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WatchlistButtonProps {
    item: {
        id: string | number;
        imdbID?: string;
        title?: string;
        name?: string;
        poster_path: string | null;
        media_type?: 'movie' | 'tv';
        vote_average: number;
        release_date?: string;
        first_air_date?: string;
    };
    variant?: 'icon' | 'full';
    className?: string;
}

export default function WatchlistButton({ item, variant = 'icon', className = '' }: WatchlistButtonProps) {
    const { addToWatchlist, removeFromWatchlist, items } = useWatchlistStore();
    const [mounted, setMounted] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const itemId = String(item.imdbID || item.id);
    const isInWatchlist = items.some(i => i.id === itemId);

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);

        if (isInWatchlist) {
            removeFromWatchlist(itemId);
        } else {
            addToWatchlist({
                id: itemId,
                imdbID: item.imdbID,
                title: item.title || item.name || 'Untitled',
                poster_path: item.poster_path || '',
                media_type: item.media_type || 'movie',
                vote_average: item.vote_average || 0,
                release_date: item.release_date || item.first_air_date,
            });
        }
    };

    // Show loading until mounted (avoids hydration mismatch)
    if (!mounted) {
        return variant === 'icon' ? (
            <button className={`p-2 rounded-lg bg-bg-hover ${className}`} disabled>
                <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            </button>
        ) : (
            <button className={`btn-ghost flex items-center gap-2 ${className}`} disabled>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
            </button>
        );
    }

    if (variant === 'icon') {
        return (
            <button
                onClick={handleToggle}
                className={`p-2 rounded-lg transition-all ${isInWatchlist
                        ? 'bg-accent text-white'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    } ${isAnimating ? 'scale-125' : ''} ${className}`}
                title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
                {isInWatchlist ? (
                    <BookmarkCheck className="w-5 h-5" />
                ) : (
                    <Bookmark className="w-5 h-5" />
                )}
            </button>
        );
    }

    return (
        <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isInWatchlist
                    ? 'bg-accent text-white'
                    : 'btn-ghost'
                } ${isAnimating ? 'scale-105' : ''} ${className}`}
        >
            {isInWatchlist ? (
                <>
                    <BookmarkCheck className="w-5 h-5" />
                    <span>In Watchlist</span>
                </>
            ) : (
                <>
                    <Bookmark className="w-5 h-5" />
                    <span>Add to Watchlist</span>
                </>
            )}
        </button>
    );
}
